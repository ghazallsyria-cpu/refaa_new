/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🧠 القاموس الذكي لتداخل الأقسام وتفرعاتها
export const DEPARTMENT_MAPPINGS: Record<string, string[]> = {
  'العلوم': ['العلوم', 'الفيزياء', 'الكيمياء', 'الأحياء', 'الجيولوجيا', 'علم الأرض'],
  'الاجتماعيات': ['الدراسات الاجتماعية', 'الاجتماعيات', 'التاريخ', 'الجغرافيا', 'الفلسفة', 'علم النفس', 'علم الاجتماع', 'دستور', 'التربية الوطنية', 'الدستور'],
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

// 🚀 الخوارزمية الذكية لجمع المعلمين تحت رئيس القسم (محصنة بالكامل)
export const getTeachersUnderHOD = (hod: any, allTeachers: any[]) => {
  if (!hod || !allTeachers) return [];
  
  const hodSubjectName = hod.subject?.name || '';
  const subSubjects = DEPARTMENT_MAPPINGS[hodSubjectName] || [hodSubjectName];

  return allTeachers.filter(teacher => {
    // 1. استبعاد رئيس القسم نفسه من قائمة المعلمين التابعين
    if (teacher.id === hod.teacher_id) return false;
    
    // 2. التحقق من تطابق المرحلة (متوسط / ثانوي / الكل)
    const matchStage = hod.stage_name === 'الكل' || teacher.stage === hod.stage_name || teacher.stage === 'مشترك';
    
    // 3. التحقق من الارتباط الفعلي بالمادة بأمان
    const hasDirectSubject = teacher.teacher_subjects?.some((ts: any) => ts?.subject_id === hod.subject_id) || false;
    const hasSectionSubject = teacher.teacher_sections?.some((ts: any) => ts?.subject_id === hod.subject_id) || false;
    
    // 4. التحقق الاحتياطي (عبر القاموس النصي للتخصص)
    const matchDict = subSubjects.includes(teacher.specialization) || (teacher.specialization && teacher.specialization.includes(hodSubjectName));

    return (hasDirectSubject || hasSectionSubject || matchDict) && matchStage;
  });
};

export function useHierarchySystem() {
  const [loading, setLoading] = useState(false);

  const fetchHierarchyData = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 تسريع السيرفر: تشغيل جميع الاستعلامات في نفس اللحظة (Parallel Fetching)
      const [adminsRes, hodsRes, teachersRes] = await Promise.all([
        supabase.from('users').select('id, full_name, avatar_url, role').eq('role', 'management'),
        supabase.from('department_heads').select('*, teacher:teachers(id, users!teachers_id_fkey(full_name, avatar_url, email)), subject:subjects(id, name)'),
        supabase.from('teachers').select(`
          id, 
          custom_titles, 
          specialization, 
          users!teachers_id_fkey(full_name, avatar_url, email), 
          teacher_sections(subject_id, section:sections(classes(name))),
          teacher_subjects(subject_id)
        `)
      ]);

      const admins = adminsRes.data || [];
      const departmentHeads = hodsRes.data || [];
      const teachers = teachersRes.data || [];

      // خوارزمية تحديد المرحلة (محصنة ضد البيانات المفقودة)
      const getTeacherStage = (teacher: any) => {
        let hasMiddle = false;
        let hasHigh = false;
        
        (teacher?.teacher_sections || []).forEach((ts: any) => {
          const className = ts?.section?.classes?.name || '';
          if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) hasMiddle = true;
          if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) hasHigh = true;
        });

        if (hasMiddle && hasHigh) return 'مشترك';
        if (hasMiddle) return 'متوسط';
        if (hasHigh) return 'ثانوي';
        return 'غير محدد';
      };

      // معالجة بيانات المعلمين
      const processedTeachers = teachers.map((t: any) => ({
        ...t,
        stage: getTeacherStage(t),
        parentDepartment: getParentDepartment(t.specialization)
      }));

      return {
        admins,
        departmentHeads,
        teachers: processedTeachers,
        supervisors: processedTeachers.filter(t => t?.custom_titles && t.custom_titles.length > 0)
      };

    } catch (error) {
      console.error('Hierarchy Error:', error);
      // إرجاع كائن فارغ في حال الفشل لتجنب تحطم الصفحة الأمامية
      return { admins: [], departmentHeads: [], teachers: [], supervisors: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, fetchHierarchyData };
}
