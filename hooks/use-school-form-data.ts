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
        // Teacher specific logic...
        // For now, let's keep it simple or implement the complex logic here.
        // The complex logic is already in page.tsx, I should move it here.
        return { subjects: [], sections: [], teachers: [] }; // Placeholder
      }
      
      return { subjects: [], sections: [], teachers: [] };
    },
    enabled: !!user && !!userRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
