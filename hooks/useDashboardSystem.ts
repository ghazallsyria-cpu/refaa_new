import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchTeacherDashboardData = useCallback(async (forceRefresh = true) => { 
    if (!user) return null;
    try {
      // 🚀 التصحيح: استخدام fk_teachers_users (الاسم الموجود فعلياً في قاعدتك)
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

      // جلب بقية البيانات (الجدول والواجبات والمراسلات)
      const [ { data: schedule }, { data: recentExams }, { data: recentAssignments } ] = await Promise.all([
        supabase.from('schedules').select('*, sections(name, classes(name)), subjects(name)').eq('teacher_id', teacher.id).order('day_of_week').order('period'),
        supabase.from('exams').select('*, subjects(name)').eq('teacher_id', teacher.id).limit(5),
        supabase.from('assignments').select('*, subjects(name)').eq('teacher_id', teacher.id).limit(5), 
        // ✅ هذا الجديد
  supabase.from('sections')
    .select('id, name, classes(name)')
      ]);

      return { teacher, schedule: schedule || [], recentExams: recentExams || [], recentAssignments: recentAssignments || [] };
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
      return null;
    }
  }, [user]);

  return { fetchTeacherDashboardData };
}
