import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchTeacherDashboardData = useCallback(async (forceRefresh = true) => { 
    if (!user) return null;

    try {
      // ✅ جلب بيانات المدرس
      const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .select('*, users!fk_teachers_users(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (teacherErr) {
        console.error("🚨 Supabase Error (Teacher):", teacherErr);
        throw teacherErr;
      }

      if (!teacher) return null;

      // ✅ جلب كل البيانات + sections
      const [
        { data: schedule },
        { data: recentExams },
        { data: recentAssignments },
        { data: sections }
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select('*, sections(id, name, classes(name)), subjects(name)')
          .eq('teacher_id', teacher.id)
          .order('day_of_week')
          .order('period'),

        supabase
          .from('exams')
          .select('*, subjects(name)')
          .eq('teacher_id', teacher.id)
          .limit(5),

        supabase
          .from('assignments')
          .select('*, subjects(name)')
          .eq('teacher_id', teacher.id)
          .limit(5),

        // ✅ هذا أهم جزء (sections)
        supabase
          .from('sections')
          .select('id, name, classes(name)')
      ]);

      // ✅ رجّع كل البيانات (بما فيها sections)
      return { 
        teacher, 
        schedule: schedule || [], 
        recentExams: recentExams || [], 
        recentAssignments: recentAssignments || [],
        sections: sections || [] // 🔥 هذا اللي كان ناقص
      };

    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
      return null;
    }
  }, [user]);

  return { fetchTeacherDashboardData };
}
