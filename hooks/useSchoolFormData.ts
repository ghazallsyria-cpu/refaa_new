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
          supabase.from('sections').select('*, class:classes(name)').order('name'),
          supabase.from('teachers').select('id, user:users(full_name)')
        ]);
        
        return {
          subjects: subjectsRes.data || [],
          sections: (sectionsRes.data || []).map((s: any) => ({
            ...s,
            class: Array.isArray(s.class) ? s.class[0] : s.class
          })),
          teachers: (teachersRes.data || []).map((t: any) => ({
            id: t.id,
            user: Array.isArray(t.user) ? t.user[0] : t.user
          }))
        };
      } else if (authRole === 'teacher') {
        const [subjectsRes, sectionsRes, teacherSectionsRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name'),
          supabase.from('sections').select('*, class:classes(name)').order('name'),
          supabase.from('teacher_sections').select('section_id').eq('teacher_id', user.id)
        ]);

        const assignedSectionIds = teacherSectionsRes.data?.map(ts => ts.section_id) || [];
        const assignedSections = (sectionsRes.data || [])
          .filter(s => assignedSectionIds.includes(s.id))
          .map((s: any) => ({
            ...s,
            class: Array.isArray(s.class) ? s.class[0] : s.class
          }));

        return {
          subjects: subjectsRes.data || [],
          sections: assignedSections,
          teachers: [{ id: user.id, user: { full_name: user.user_metadata?.full_name || 'أنا' } }]
        };
      }
      
      return { subjects: [], sections: [], teachers: [] };
    },
    enabled: !!user && !!authRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
