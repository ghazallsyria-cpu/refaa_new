import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// تعريف الأنواع لضمان استقرار البناء
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

  // 1. جلب البيانات الأولية (الصفوف، المواد، المعلمين، الفترات)
  const fetchInitialScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const [sections, subjects, teachers, periods] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return {
        sections: sections.data || [],
        subjects: subjects.data || [],
        teachers: (teachers.data || []).map((t: any) => ({
          ...t,
          users: Array.isArray(t.users) ? t.users : [t.users]
        })),
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Error fetching initial data:', error);
      return { sections: [], subjects: [], teachers: [], periods: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. جلب الجداول حسب الفلتر
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

  // 3. إضافة وتحديث الحصص (تستخدم في صفحة الإدارة)
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

  // 4. الدوال المطلوبة لصفحة الطالب والجدول العام (لحل خطأ البناء)
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

  const fetchStudentSection = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase.from('students').select('section_id').eq('id', studentId).single();
      if (error) throw error;
      return data?.section_id || null;
    } catch (error) {
      console.error('Error fetching student section:', error);
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

  return {
    loading,
    fetchInitialScheduleData,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    saveSchedule,
    deleteSchedule,
    fetchStudentSection,
    checkConflicts
  };
}

