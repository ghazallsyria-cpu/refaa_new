import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 1. جلب البيانات دفعة واحدة
      const [adminsRes, supervisorsRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('school_staff').select('*, users!school_staff_id_fkey(id, full_name, avatar_url, role)').in('job_category', ['قيادة عليا', 'إدارة ومالية']),
        supabase.from('academic_departments').select('*').order('name'),
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

      // 🚀 2. معالجة الأقسام الأكاديمية (الآن تبحث عن رئيس القسم من خلال الألقاب)
      const processedDepartments = departments.map((dept: any) => {
        // جلب جميع المعلمين التابعين لهذا القسم
        const deptTeachers = processedTeachers.filter(t => t.department_id === dept.id);
        
        // تحديد رئيس القسم (من لديه لقب "رئيس قسم" في custom_titles)
        const hod = deptTeachers.find(t => t.custom_titles && t.custom_titles.includes('رئيس قسم'));
        
        // باقي المعلمين هم أعضاء القسم
        const members = deptTeachers.filter(t => t.id !== hod?.id);
        
        return { ...dept, hod, members };
      });

      // 🚀 3. دمج شؤون الإدارة مع القيادة العليا
      const combinedLeadership = [
        ...admins.map(a => ({ ...a, job_title: 'شؤون الإدارة' })),
        ...supervisors.map((s: any) => {
          const userData = Array.isArray(s.users) ? s.users[0] : s.users;
          return {
            ...userData, 
            job_title: s.job_title || 'إشراف إداري',
            role: userData?.role || 'staff'
          };
        })
      ];

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
