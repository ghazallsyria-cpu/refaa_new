import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب الإدارة العليا
      const { data: admins } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role')
        .in('role', ['admin', 'management']);

      // 2. جلب رؤساء الأقسام
      const { data: departmentHeads } = await supabase
        .from('department_heads')
        .select('*, teacher:teachers(id, users(full_name, avatar_url, email)), subject:subjects(id, name)');

      // 3. جلب جميع المعلمين مع تخصصاتهم وفصولهم (لمعرفة المرحلة)
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, custom_titles, specialization, users(full_name, avatar_url, email), teacher_sections(section:sections(classes(name)))');

      // 🧠 خوارزمية تحديد المرحلة (متوسط / ثانوي / مشترك)
      const getTeacherStage = (teacher: any) => {
        let hasMiddle = false;
        let hasHigh = false;
        (teacher.teacher_sections || []).forEach((ts: any) => {
          const className = ts.section?.classes?.name || '';
          if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) hasMiddle = true;
          if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) hasHigh = true;
        });
        if (hasMiddle && hasHigh) return 'مشترك';
        if (hasMiddle) return 'متوسط';
        if (hasHigh) return 'ثانوي';
        return 'غير محدد';
      };

      // فرز المعلمين
      const processedTeachers = (teachers || []).map((t: any) => ({
        ...t,
        stage: getTeacherStage(t)
      }));

      // استخراج المعلمين الذين لديهم مناصب إشرافية خاصة
      const supervisors = processedTeachers.filter(t => t.custom_titles && t.custom_titles.length > 0);

      return {
        admins: admins || [],
        departmentHeads: departmentHeads || [],
        teachers: processedTeachers,
        supervisors
      };

    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchHierarchyData };
}
