import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🛡️ أمان سيبراني: تحديد الحقول المسموحة فقط (بدون أرقام مدنية أو هواتف)
      const [adminsRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role, email').in('role', ['admin', 'management']),
        supabase.from('academic_departments').select('*').order('name'),
        supabase.from('teachers').select(`
          id, 
          custom_titles, 
          specialization, 
          department_id,
          users!teachers_id_fkey(id, full_name, avatar_url, email, role), 
          teacher_sections(section_id, sections(classes(name)))
        `)
      ]);

      const admins = adminsRes.data || [];
      const departments = deptsRes.data || [];
      const teachers = teachersRes.data || [];

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

      const processedDepartments = departments.map((dept: any) => {
        const hod = processedTeachers.find(t => t.id === dept.head_id);
        const members = processedTeachers.filter(t => t.department_id === dept.id && t.id !== dept.head_id);
        return { ...dept, hod, members };
      }).filter(dept => dept.hod || dept.members.length > 0); 

      return { admins, departments: processedDepartments, supervisors: processedTeachers.filter(t => t?.custom_titles && t.custom_titles.length > 0) };

    } catch (error) {
      console.error('Hierarchy Error:', error);
      return { admins: [], departments: [], supervisors: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchHierarchyData };
}
