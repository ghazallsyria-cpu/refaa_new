import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduleInitialData {
  sections: any[];
  subjects: any[];
  teachers: any[];
  assignments: any[];
  periods: any[];
}

export function useSchedulesSystem() {
  const [loading, setLoading] = useState(false);

  const fetchInitialScheduleData = useCallback(async (): Promise<ScheduleInitialData> => {
    setLoading(true);
    try {
      const [sectionsRes, subjectsRes, teachersRes, assignmentsRes, periodsRes] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        // 🚀 استخدام الجسر الجديد fk_teachers_to_users
        supabase.from('teachers').select('id, specialization, users!fk_teachers_to_users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      // ✅ معالجة البيانات (Mapping) لمنع أخطاء TypeScript في الصفحات
      const mappedSections = (sectionsRes.data || []).map(sec => ({
        ...sec,
        // تأمين أن classes ليست مصفوفة عند الوصول إليها في الصفحة
        classes: Array.isArray(sec.classes) ? sec.classes[0] : sec.classes
      }));

      const mappedTeachers = (teachersRes.data || []).map(t => ({
        ...t,
        users: Array.isArray(t.users) ? t.users[0] : t.users
      }));

      return {
        sections: mappedSections,
        subjects: subjectsRes.data || [],
        teachers: mappedTeachers,
        assignments: assignmentsRes.data || [],
        periods: periodsRes.data || []
      };
    } catch (error) {
      console.error('Error fetching initial schedule data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (filters: { sectionId?: string, teacherId?: string }) => {
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
        teachers(zoom_link, users!fk_teachers_to_users(full_name)), 
        sections(name, classes(name))
      `);

      if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
      if (filters.teacherId) query = query.eq('teacher_id', filters.teacherId);

      const { data, error } = await query.order('day_of_week').order('period');
      if (error) throw error;

      // ✅ تنظيف البيانات الناتجة لضمان عدم وجود مصفوفات متداخلة
      return (data || []).map((d: any) => ({
        ...d,
        subjects: Array.isArray(d.subjects) ? d.subjects[0] : d.subjects,
        teachers: Array.isArray(d.teachers) ? d.teachers[0] : {
          ...d.teachers,
          users: Array.isArray(d.teachers?.users) ? d.teachers.users[0] : d.teachers?.users
        },
        sections: Array.isArray(d.sections) ? d.sections[0] : {
          ...d.sections,
          classes: Array.isArray(d.sections?.classes) ? d.sections.classes[0] : d.sections?.classes
        }
      }));
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // بقية الدوال (add, update, delete) تبقى كما هي لأنها لا تعتمد على الـ Select المعقد
  const addSchedule = useCallback(async (schedule: any) => { /* كودك الحالي */ }, []);
  const updateSchedule = useCallback(async (id: string, updates: any) => { /* كودك الحالي */ }, []);
  const deleteSchedule = useCallback(async (id: string) => { /* كودك الحالي */ }, []);

  return {
    loading,
    fetchInitialScheduleData,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule
  };
}
