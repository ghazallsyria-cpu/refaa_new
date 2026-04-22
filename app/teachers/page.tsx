import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 1. جلب البيانات دفعة واحدة (مع جلب جدول department_heads لمعرفة رئيس القسم)
      const [adminsRes, supervisorsRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('school_staff').select('*, users!school_staff_id_fkey(id, full_name, avatar_url, role)').in('job_category', ['قيادة عليا', 'إدارة ومالية']),
        supabase.from('academic_departments').select('*').order('name'), // جلب الأقسام بشكل آمن بدون حقول وهمية
        supabase.from('teachers').select(`
          id, custom_titles, specialization, department_id,
          users!teachers_id_fkey(id, full_name, avatar_url, role), 
          teacher_sections(section_id, sections(classes(name))),
          department_heads(id) 
        `) // 👈 السر هنا: جلبنا علاقة department_heads
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

      // 🚀 2. معالجة الأقسام الأكاديمية (البحث عن رئيس القسم في جدول department_heads)
      const processedDepartments = departments.map((dept: any) => {
        const deptTeachers = processedTeachers.filter(t => t.department_id === dept.id);
        
        // 👈 تحديد رئيس القسم بناءً على وجود سجل له في department_heads
        const hod = deptTeachers.find(t => t.department_heads && t.department_heads.length > 0);
        
        const members = deptTeachers.filter(t => t.id !== hod?.id);
        return { ...dept, hod, members };
      });

      // 🚀 3. دمج شؤون الإدارة مع القيادة العليا في مصفوفة واحدة
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
