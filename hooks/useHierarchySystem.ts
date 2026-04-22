import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Management, Staff, Departments, and Teachers
      const [adminsRes, staffRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('school_staff').select('*, users!school_staff_id_fkey(id, full_name, avatar_url, role)'),
        supabase.from('academic_departments').select('id, name, head_id, image_url').order('name'),
        supabase.from('teachers').select(`
          id, custom_titles, specialization, department_id,
          users!teachers_id_fkey(id, full_name, avatar_url, role), 
          teacher_sections(section_id, sections(classes(name)))
        `)
      ]);

      const admins = adminsRes.data || [];
      const staffRecords = staffRes.data || [];
      const departments = deptsRes.data || [];
      const teachers = teachersRes.data || [];

      // Determine stage for teachers based on their assigned sections
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

      // 2. Process Departments (keep all departments, even empty ones)
      const processedDepartments = departments.map((dept: any) => {
        const hod = processedTeachers.find(t => t.id === dept.head_id);
        const members = processedTeachers.filter(t => t.department_id === dept.id && t.id !== dept.head_id);
        return { ...dept, hod, members };
      });

      // 3. Process Leadership (Combine Management users and School Staff)
      const formattedAdmins = admins.map(a => ({
        ...a,
        job_title: 'شؤون الإدارة',
        is_management: true
      }));

      const formattedStaff = staffRecords.map((s: any) => {
        const userData = Array.isArray(s.users) ? s.users[0] : s.users;
        return {
          ...userData,
          job_title: s.job_title || 'إشراف إداري',
          is_management: s.job_category === 'قيادة عليا' || s.job_category === 'إدارة ومالية'
        };
      });

      const combinedLeadership = [...formattedAdmins, ...formattedStaff];

      return { 
        leadership: combinedLeadership, 
        departments: processedDepartments 
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
