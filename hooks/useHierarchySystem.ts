import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 1. جلب شؤون الإدارة والقيادة العليا والأقسام والمعلمين دفعة واحدة
      const [adminsRes, supervisorsRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('school_staff').select('*, users!school_staff_id_fkey(id, full_name, avatar_url, role)').in('job_category', ['قيادة عليا', 'إدارة ومالية']),
        supabase.from('academic_departments').select('id, name, head_id, image_url').order('name'),
        supabase.from('teachers').select(`
          id, custom_titles, specialization, department_id,
          users!teachers_id_fkey(id, full_name, avatar_url, role), 
          teacher_sections(section_id, sections(classes(name)))
        `)
      ]);

      const admins = adminsRes.data || [];
      const supervisors = supervisorsRes.data || [];
      const departments = deptsRes.data || [];
      const teachers = teachersRes.data || [];

      // معالجة بيانات المعلمين وتحديد المرحلة
      const getTeacherStage = (teacher: any) => {
        let hasMiddle = false; let hasHigh = false;
        (teacher?.teacher_sections || []).forEach((ts: any) => {
          const className = ts?.sections?.classes?.name || '';
          if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) hasMiddle = true;
          if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) hasHigh = true;
        });
        if (hasMiddle && hasHigh) return 'مشترك';
        if (hasMiddle) return 'متوسط';
        if (hasHigh) return 'ثانوي';
        return 'غير محدد';
      };

      const processedTeachers = teachers.map((t: any) => {
        const userData = Array.isArray(t.users) ? t.users[0] : t.users;
        return { ...t, users: userData, stage: getTeacherStage(t) };
      });

      // 🚀 2. معالجة الأقسام الأكاديمية (إصلاح الخلل: إرجاع كل الأقسام سواء كانت فارغة أم لا)
      const processedDepartments = departments.map((dept: any) => {
        const hod = processedTeachers.find(t => t.id === dept.head_id);
        const members = processedTeachers.filter(t => t.department_id === dept.id && t.id !== dept.head_id);
        return { ...dept, hod, members };
      }); // تمت إزالة .filter() الذي كان يخفي الأقسام الفارغة لضمان ظهورها للمدير

      // 🚀 3. دمج شؤون الإدارة مع القيادة العليا
      const combinedLeadership = [
        ...admins.map(a => ({ ...a, job_title: 'شؤون الإدارة' })),
        ...supervisors.map((s: any) => ({
          ...s.users, 
          job_title: s.job_title || 'إشراف إداري'
        }))
      ];

      return { 
        leadership: combinedLeadership, 
        departments: processedDepartments // الأقسام الآن جاهزة ومضمونة 100%
      };

    } catch (error) {
      console.error('Hierarchy Error:', error);
      return { leadership: [], departments: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchHierarchyData };
}
