import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 1. جلب البيانات بطريقة آمنة جداً (استخدام النجمة للابتعاد عن أخطاء الحقول المفقودة)
      const [adminsRes, supervisorsRes, deptsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('school_staff').select('*, users(id, full_name, avatar_url, role)').in('job_category', ['قيادة عليا', 'إدارة ومالية']),
        supabase.from('academic_departments').select('*').order('name'),
        supabase.from('teachers').select(`
          id, custom_titles, specialization, department_id,
          users(id, full_name, avatar_url, role), 
          teacher_sections(section_id, sections(classes(name)))
        `)
      ]);

      // فحص الأخطاء بصمت (تساعد في الـ Debugging إن لزم الأمر)
      if (deptsRes.error) console.error("Departments Fetch Error:", deptsRes.error);
      if (teachersRes.error) console.error("Teachers Fetch Error:", teachersRes.error);

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
        // دعم الصيغتين لضمان عدم حدوث خطأ
        const userData = Array.isArray(t.users) ? t.users[0] : (t.users || {});
        return { ...t, users: userData, stage: getTeacherStage(t) };
      });

      // 🚀 2. معالجة الأقسام الأكاديمية (نظام ذكي للبحث عن رئيس القسم)
      const processedDepartments = departments.map((dept: any) => {
        // البحث عن رئيس القسم باستخدام head_id (إذا كان متوفراً) أو بالبحث في الألقاب
        let hod = null;
        if (dept.head_id) {
          hod = processedTeachers.find(t => String(t.id) === String(dept.head_id));
        } else {
          hod = processedTeachers.find(t => t.department_id === dept.id && t.custom_titles && t.custom_titles.includes('رئيس قسم'));
        }

        // باقي المعلمين في نفس القسم
        const members = processedTeachers.filter(t => t.department_id === dept.id && t.id !== hod?.id);
        
        return { ...dept, hod, members };
      });

      // 🚀 3. دمج شؤون الإدارة مع القيادة العليا
      const combinedLeadership = [
        ...admins.map(a => ({ ...a, job_title: 'شؤون الإدارة' })),
        ...supervisors.map((s: any) => {
          const userData = Array.isArray(s.users) ? s.users[0] : (s.users || {});
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
