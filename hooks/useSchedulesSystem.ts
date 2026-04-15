import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduleInitialData {
  sections: any[];
  subjects: any[];
  teachers: any[];
  assignments: any[];
  periods: any[];
}

export interface Schedule {
  id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
  subjects?: { name: string };
  teachers?: { zoom_link?: string, users: { full_name: string } };
  sections?: { name: string, classes: { name: string } };
}

export interface ScheduleConflict {
  id: string;
  teacher_id: string;
  section_id: string;
  day_of_week: number;
  period: number;
  subjects?: { name: string };
  sections?: { name: string, classes: { name: string } };
  teachers?: { users: { full_name: string } };
}

export function useSchedulesSystem() {
  const [loading, setLoading] = useState(false);

  const fetchInitialScheduleData = useCallback(async (): Promise<ScheduleInitialData> => {
    setLoading(true);
    try {
      const [sections, subjects, teachers, assignments, periods] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return {
        sections: sections.data || [],
        subjects: subjects.data || [],
        teachers: teachers.data || [],
        assignments: assignments.data || [],
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Error fetching initial schedule data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (filters: { sectionId?: string, teacherId?: string }): Promise<Schedule[]> => {
    setLoading(true);
    try {
      let query = supabase.from('schedules').select(`
        id, 
        day_of_week, 
        period, 
        teacher_id,
        section_id,
        subject_id,
        subjects(name), 
        teachers(zoom_link, users(full_name)), 
        sections(name, classes(name))
      `);

      if (filters.sectionId) {
        query = query.eq('section_id', filters.sectionId);
      }
      if (filters.teacherId) {
        query = query.eq('teacher_id', filters.teacherId);
      }

      const { data, error } = await query.order('day_of_week').order('period');
      if (error) throw error;
      return (data as any[] || []).map(d => ({
        ...d,
        subjects: Array.isArray(d.subjects) ? d.subjects[0] : d.subjects,
        teachers: Array.isArray(d.teachers) ? d.teachers[0] : d.teachers,
        sections: Array.isArray(d.sections) ? d.sections[0] : d.sections
      })) as Schedule[];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addSchedule = useCallback(async (schedule: Partial<Schedule>): Promise<any> => {
    setLoading(true);
    try {
      const response = await fetch('/api/schedules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add schedule');
      return data;
    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchedule = useCallback(async (id: string, updates: Partial<Schedule>): Promise<any> => {
    setLoading(true);
    try {
      const response = await fetch('/api/schedules/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update schedule');
      return data;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/schedules/delete?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete schedule');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserRole = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('users').select('role').eq('id', userId).single();
      if (error) throw error;
      return data?.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      throw error;
    }
  }, []);

  const fetchStudentSection = useCallback(async (studentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from('students').select('section_id').eq('id', studentId).single();
      if (error) throw error;
      return data?.section_id || null;
    } catch (error) {
      console.error('Error fetching student section:', error);
      throw error;
    }
  }, []);

  const checkConflicts = useCallback(async (day: number, period: number, teacherId: string, sectionId: string, excludeId?: string): Promise<ScheduleConflict[]> => {
    try {
      let query = supabase
        .from('schedules')
        .select('id, teacher_id, section_id, day_of_week, period, subjects(name), sections(name, classes(name)), teachers(users!teachers_id_fkey(full_name))')
        .eq('day_of_week', day)
        .eq('period', period)
        .or(`teacher_id.eq.${teacherId},section_id.eq.${sectionId}`);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[] || []).map(d => ({
        ...d,
        subjects: Array.isArray(d.subjects) ? d.subjects[0] : d.subjects,
        sections: Array.isArray(d.sections) ? d.sections[0] : d.sections,
        teachers: Array.isArray(d.teachers) ? d.teachers[0] : d.teachers
      })) as ScheduleConflict[];
    } catch (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    }
  }, []);

  const swapSchedules = useCallback(async (sourceId: string, sourceDay: number, sourcePeriod: number, targetId: string | null, targetDay: number, targetPeriod: number): Promise<void> => {
    try {
      const response = await fetch('/api/schedules/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          sourceDay,
          sourcePeriod,
          targetId,
          targetDay,
          targetPeriod
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to swap schedules');
    } catch (error) {
      console.error('Error swapping schedules:', error);
      throw error;
    }
  }, []);

  const notifyScheduleChange = useCallback(async (lesson: Schedule, newDay: number, newPeriod: number, days: any[]): Promise<void> => {
    try {
      const dayName = days.find(d => d.id === newDay)?.name || '';
      const msg = `تم تغيير موعد حصة ${lesson.subjects?.name} إلى يوم ${dayName} الحصة ${newPeriod}`;
      
      const notifications: any[] = [];

      // Add teacher notification
      notifications.push({
        user_id: lesson.teacher_id,
        title: 'تحديث الجدول الدراسي',
        content: msg,
        type: 'system'
      });

      // Fetch students in the section
      const { data: students } = await supabase.from('students').select('id').eq('section_id', lesson.section_id);
      if (students) {
        students.forEach(s => {
          notifications.push({
            user_id: s.id,
            title: 'تحديث الجدول الدراسي',
            content: msg,
            type: 'system'
          });
        });
      }

      if (notifications.length > 0) {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifications),
        });
      }
    } catch (error) {
      console.error('Error notifying schedule change:', error);
    }
  }, []);

  return {
    loading,
    fetchInitialScheduleData,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    fetchUserRole,
    fetchStudentSection,
    checkConflicts,
    swapSchedules,
    notifyScheduleChange
  };
}
