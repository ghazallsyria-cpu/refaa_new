import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher } from '@/types';

export function useSchoolFormData() {
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: ['school-form-data', user?.id, userRole],
    queryFn: async () => {
      if (!user || !userRole) return { subjects: [], sections: [], teachers: [] };

      if (userRole === 'admin' || userRole === 'management') {
        const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, classes(name)').order('name'),
          supabase.from('teachers').select('id, users(full_name)')
        ]);
        
        return {
          subjects: subjectsRes.data || [],
          sections: (sectionsRes.data || []).map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          })),
          teachers: (teachersRes.data || []).map((t: any) => ({
            id: t.id,
            users: Array.isArray(t.users) ? t.users[0] : t.users
          }))
        };
      } else if (userRole === 'teacher') {
        const [subjectsRes, sectionsRes, teacherSectionsRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, classes(name)').order('name'),
          supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id)
        ]);

        const assignedSectionIds = teacherSectionsRes.data?.map(ts => ts.section_id) || [];
        const assignedSections = (sectionsRes.data || [])
          .filter(s => assignedSectionIds.includes(s.id))
          .map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          }));

        return {
          subjects: subjectsRes.data || [],
          sections: assignedSections,
          teachers: [{ id: user.id, users: { full_name: user.user_metadata?.full_name || 'أنا' } }]
        };
      }
      
      return { subjects: [], sections: [], teachers: [] };
    },
    enabled: !!user && !!userRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
