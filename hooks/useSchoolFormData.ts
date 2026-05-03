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
          supabase.from('sections').select('*, classes(name)').order('name'),
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
          .eq('id', user.id)
          .single();

        if (!teacherProfile) return { subjects: [], sections: [], teachers: [] };

        // 🚀 قراءة المفتاح المركزي لتوجيه البوصلة
        const { data: settings } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
        const activeSystem = settings?.active_schedule_system || 'manual';

        // 🚀 جلب بيانات المواد والفصول الأساسية
        const subjectsPromise = supabase.from('subjects').select('*').order('name');
        const sectionsPromise = supabase.from('sections').select('*, classes(name)').order('name');
        const teacherSectionsPromise = supabase.from('teacher_sections').select('section_id').eq('teacher_id', teacherProfile.id);

        let schedulesData: any[] = [];

        // 🚀 توجيه ذكي لجلب الجدول
        if (activeSystem === 'auto') {
           const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
           if (planData) {
               const { data } = await supabase.from('auto_schedules').select('subject_id, section_id').eq('plan_id', planData.id).eq('teacher_id', teacherProfile.id);
               schedulesData = data || [];
           }
        } else {
           const { data } = await supabase.from('schedules').select('subject_id, section_id').eq('teacher_id', teacherProfile.id);
           schedulesData = data || [];
        }

        const [subjectsRes, sectionsRes, teacherSectionsRes] = await Promise.all([
          subjectsPromise, 
          sectionsPromise, 
          teacherSectionsPromise
        ]);

        // 🚀 دمج الفصول المربوطة يدوياً بالمعلم مع الفصول المكتشفة من جدوله
        const tsIds = teacherSectionsRes.data?.map(ts => ts.section_id) || [];
        const schedSecIds = schedulesData.map(s => s.section_id).filter(Boolean);
        const assignedSectionIds = Array.from(new Set([...tsIds, ...schedSecIds]));

        const assignedSections = (sectionsRes.data || [])
          .filter(s => assignedSectionIds.includes(s.id))
          .map((s: any) => ({
            ...s,
            classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
          }));

        // 🚀 استخراج المواد التي يدرسها المعلم من الجدول الفعال
        const assignedSubjectIds = Array.from(new Set(schedulesData.map(s => s.subject_id).filter(Boolean)));
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
