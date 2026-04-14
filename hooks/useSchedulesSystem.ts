import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

export function useSchedulesSystem() {
  const [loading, setLoading] = useState(false);

  const fetchInitialScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionsRes, subjectsRes, teachersRes, assignmentsRes, periodsRes] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        // 🚀 استخدام الجسر الصريح fk_teachers_to_users لمنع خطأ PGRST201
        supabase.from('teachers').select('id, specialization, users!fk_teachers_to_users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      // ✅ تسطيح البيانات (Flattening) لضمان قبول TypeScript ونيتلفاي للكود
      const mappedSections = (sectionsRes.data || []).map((s: any) => ({
        ...s,
        classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
      }));

      const mappedTeachers = (teachersRes.data || []).map((t: any) => ({
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
      console.error('Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (filters: { sectionId?: string, teacherId?: string }): Promise<Schedule[]> => {
    setLoading(true);
    try {
      // 🚀 دمج الجسور الصريحة مع الاستعلام
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

      // ✅ التنظيف النهائي للمصفوفات لضمان عدم وجود أخطاء في واجهة المستخدم
      return (data as any[] || []).map(d => ({
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
      })) as Schedule[];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // بقية الدوال (add, update, delete, etc.) تبقى كما هي في نسختك القديمة
  return { loading, fetchInitialScheduleData, fetchSchedules };
}
