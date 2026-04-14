import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useSchedulesSystem() {
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async (filters: { sectionId?: string, teacherId?: string }) => {
    setLoading(true);
    try {
      // 🚀 التصحيح: استخدام fk_teachers_users في ربط المعلمين
      let query = supabase.from('schedules').select(`
        *,
        subjects(name), 
        teachers(zoom_link, users!fk_teachers_users(full_name)), 
        sections(name, classes(name))
      `);

      if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
      if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId);

      const { data, error } = await query.order('day_of_week').order('period');
      if (error) throw error;

      // تنظيف البيانات من المصفوفات المتداخلة
      return (data || []).map((d: any) => ({
        ...d,
        teachers: Array.isArray(d.teachers) ? d.teachers[0] : d.teachers,
        sections: Array.isArray(d.sections) ? d.sections[0] : d.sections
      }));
    } catch (error) {
      console.error('Schedule Fetch Error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchSchedules };
}
