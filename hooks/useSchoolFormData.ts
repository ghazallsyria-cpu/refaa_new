import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher } from '@/types';

export function useSchoolFormData() {
  const { user, authRole } = useAuth();

  return useQuery({
    queryKey: ['school-form-data', user?.id, authRole],
    queryFn: async () => {
      if (!user || !authRole) return { subjects: [], sections: [], teachers: [] };

      if (authRole === 'admin' || authRole === 'management') {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, classes:classes(name)').order('name'),
          supabase.from('teachers').select('id, user:users(full_name)')
        ]);
        
        return {
          subjects: subjectsRes.data || [],
          sections: (sectionsRes.data || []).map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          })),
          teachers: (teachersRes.data || []).map((t: any) => ({
            id: t.id,
            user: Array.isArray(t.user) ? t.user[0] : t.user
          }))
        };
      } else if (authRole === 'teacher') {
        // First get the teacher's profile ID
        const { data: teacherProfile } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!teacherProfile) return { subjects: [], sections: [], teachers: [] };

        const [subjectsRes, sectionsRes, teacherSectionsRes, schedulesRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, classes:classes(name)').order('name'),
          supabase.from('teacher_sections').select('section_id').eq('teacher_id', teacherProfile.id),
          supabase.from('schedules').select('subject_id').eq('teacher_id', teacherProfile.id)
        ]);

        const assignedSectionIds = teacherSectionsRes.data?.map(ts => ts.section_id) || [];
        const assignedSections = (sectionsRes.data || [])
          .filter(s => assignedSectionIds.includes(s.id))
          .map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          }));

        const assignedSubjectIds = Array.from(new Set(schedulesRes.data?.map(s => s.subject_id) || []));
        const assignedSubjects = (subjectsRes.data || []).filter(s => assignedSubjectIds.includes(s.id));

        return {
          subjects: assignedSubjects,
          sections: assignedSections,
          teachers: [{ id: teacherProfile.id, user: { full_name: user.user_metadata?.full_name || 'أنا' } }]
        };
      }
      
      return { subjects: [], sections: [], teachers: [] };
    },
    enabled: !!user && !!authRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
