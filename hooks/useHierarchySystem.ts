import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🧠 القاموس الذكي لتداخل الأقسام وتفرعاتها
export const DEPARTMENT_MAPPINGS: Record<string, string[]> = {
  'العلوم': ['العلوم', 'الفيزياء', 'الكيمياء', 'الأحياء', 'الجيولوجيا', 'علم الأرض'],
  'الاجتماعيات': ['الدراسات الاجتماعية', 'الاجتماعيات', 'التاريخ', 'الجغرافيا', 'الفلسفة', 'علم النفس', 'علم الاجتماع', 'الدستور', 'التربية الوطنية'],
  'التربية الإسلامية': ['التربية الإسلامية', 'القرآن الكريم', 'التجويد', 'الفقه', 'الحديث', 'العقيدة'],
  'اللغة العربية': ['اللغة العربية', 'النحو', 'البلاغة', 'الأدب'],
  'الرياضيات': ['الرياضيات', 'الجبر', 'الهندسة', 'الإحصاء', 'التفاضل'],
  'اللغات الأجنبية': ['اللغة الإنجليزية', 'اللغة الفرنسية', 'إنجليزي', 'فرنسي'],
  'الحاسوب': ['الحاسوب', 'تقنية المعلومات', 'ICT'],
  'التربية البدنية': ['التربية البدنية', 'بدنية'],
  'التربية الفنية': ['التربية الفنية', 'فنية'],
  'الموسيقى': ['الموسيقى', 'موسيقى'],
};

// دالة لاستخراج القسم الرئيسي لأي تخصص
export const getParentDepartment = (specialization: string | null) => {
  if (!specialization) return 'عام';
  for (const [dept, specs] of Object.entries(DEPARTMENT_MAPPINGS)) {
    if (specs.includes(specialization) || specialization.includes(dept)) return dept;
  }
  return specialization; 
};

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب الإدارة المدرسية (استثناء الأدمن المبرمج)
      const { data: admins } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role')
        .eq('role', 'management');

      // 2. جلب رؤساء الأقسام مع الجسر الآمن
      const { data: departmentHeads } = await supabase
        .from('department_heads')
        .select('*, teacher:teachers(id, users!teachers_id_fkey(full_name, avatar_url, email)), subject:subjects(id, name)');

      // 3. جلب جميع المعلمين مع تخصصاتهم وفصولهم
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, custom_titles, specialization, users!teachers_id_fkey(full_name, avatar_url, email), teacher_sections(section:sections(classes(name)))');

      // خوارزمية تحديد المرحلة (متوسط/ثانوي)
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

      const processedTeachers = (teachers || []).map((t: any) => ({
        ...t,
        stage: getTeacherStage(t),
        parentDepartment: getParentDepartment(t.specialization)
      }));

      return {
        admins: admins || [],
        departmentHeads: departmentHeads || [],
        teachers: processedTeachers,
        supervisors: processedTeachers.filter(t => t.custom_titles && t.custom_titles.length > 0)
      };
    } catch (error) {
      console.error('Hierarchy Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchHierarchyData };
}
