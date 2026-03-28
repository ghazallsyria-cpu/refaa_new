import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// تعريف الأنواع لضمان نجاح الـ Build
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
        teachers: teachers.data || [],
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Error fetching initial data:', error);
      return { sections: [], subjects: [], teachers: [], periods: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (sectionId: string): Promise<ScheduleEntry[]> => {
    if (!sectionId) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id, day_of_week, period, start_time, end_time, 
          teacher_id, section_id, subject_id,
          subjects(name), 
          teachers(users(full_name))
        `)
        .eq('section_id', sectionId)
        .order('day_of_week')
        .order('period');

      if (error) throw error;
      return (data || []) as any[];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSchedule = useCallback(async (entry: ScheduleEntry) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .upsert([entry])
        .select();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchInitialScheduleData,
    fetchSchedules,
    saveSchedule,
    deleteSchedule
  };
}

