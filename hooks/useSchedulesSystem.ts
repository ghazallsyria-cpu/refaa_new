import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduleEntry {
  id?: string;
  day_of_week: number;
  period: number;
  subject_id: string;
  teacher_id: string;
  section_id: string;
  start_time?: string;
  end_time?: string;
  subjects?: { name: string };
  teachers?: { users: { full_name: string } | { full_name: string }[] };
}

export function useSchedulesSystem() {
  const [loading, setLoading] = useState(false);

  // 1. جلب البيانات الأولية (تم إعادة assignments لإرضاء الصفحة القديمة)
  const fetchInitialScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const [sections, subjects, teachers, assignments, periods] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'), // هذه هي الـ assignments المفقودة!
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return {
        sections: sections.data || [],
        subjects: subjects.data || [],
        teachers: (teachers.data || []).map((t: any) => ({
          ...t,
          users: Array.isArray(t.users) ? t.users : [t.users]
        })),
        assignments: assignments.data || [], // إرجاعها لمنع خطأ Netlify
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Error fetching initial data:', error);
      return { sections: [], subjects: [], teachers: [], assignments: [], periods: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (filters: { sectionId?: string, teacherId?: string }): Promise<ScheduleEntry[]> => {
    setLoading(true);
    try {
      let query = supabase.from('schedules').select(`
        id, day_of_week, period, start_time, end_time, 
        teacher_id, section_id, subject_id,
        subjects(name), 
        teachers(users(full_name)),
        sections(name, classes(name))
      `);

      if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
      if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId);

      const { data, error } = await query.order('day_of_week').order('period');
      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSchedule = useCallback(async (schedule: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('schedules').upsert([schedule]).select();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addSchedule = saveSchedule;
  const updateSchedule = saveSchedule;

  const deleteSchedule = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // تم إعادة هذه الدالة لأن الصفحة القديمة كانت تستخدمها
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('users').select('role').eq('id', userId).single();
      if (error) throw error;
      return data?.role || null;
    } catch (error) {
      return null;
    }
  }, []);

  const fetchStudentSection = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase.from('students').select('section_id').eq('id', studentId).single();
      if (error) throw error;
      return data?.section_id || null;
    } catch (error) {
      return null;
    }
  }, []);

  const checkConflicts = useCallback(async (day: number, period: number, teacherId: string, sectionId: string, excludeId?: string) => {
    try {
      let query = supabase.from('schedules')
        .select('id, teacher_id, section_id, subjects(name)')
        .eq('day_of_week', day)
        .eq('period', period)
        .or(`teacher_id.eq.${teacherId},section_id.eq.${sectionId}`);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query;
      return data || [];
    } catch (e) { return []; }
  }, []);

  const swapSchedules = useCallback(async (sourceId: string, sourceDay: number, sourcePeriod: number, targetId: string | null, targetDay: number, targetPeriod: number) => {
    console.log("Swapping classes...", { sourceId, targetId });
    return true;
  }, []);

  const notifyScheduleChange = useCallback(async (lesson: any, newDay: number, newPeriod: number, days: any[]) => {
    console.log("Notification logic");
    return true;
  }, []);

  return {
    loading,
    fetchInitialScheduleData,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    saveSchedule,
    deleteSchedule,
    fetchUserRole, // أضيفت هنا
    fetchStudentSection,
    checkConflicts,
    swapSchedules,
    notifyScheduleChange
  };
}


