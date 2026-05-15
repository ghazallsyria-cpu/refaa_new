import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubjectAnalysis {
  subject_name: string;
  coursework_max: number;
  exam_max: number;
  total_max: number;
  passing_mark: number;
  real_coursework: number;
  predicted_coursework: number;
  predicted_exam: number;
  status: string;
  message: string;
}

// 📜 المصفوفة الذهبية لترتيب المواد مطابقة للشهادة الأصلية لوزارة التربية
const OFFICIAL_SUBJECT_ORDER = [
  'القرآن الكريم',
  'التربية الإسلامية',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'اللغة الفرنسية',
  'الرياضيات',
  'الرياضيات والاحصاء',
  'الرياضيات والإحصاء',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'الجيولوجيا',
  'تاريخ الكويت',
  'الاجتماعيات',
  'التاريخ',
  'الجغرافيا',
  'علم النفس',
  'الفلسفة',
  'قضايا البيئة والتنمية المعاصرة',
  'الدستور',
  'الدستور وحقوق الإنسان',
  'الحاسوب',
  'المعلوماتية',
  'المعلوماتية وطرق البحث',
  'التربية البدنية',
  'الاختيار الحر 1',
  'اختياري حر 1',
  'الاختيار الحر 2',
  'اختياري حر 2'
];

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  // 🚀 الاستعلام المدرع للتعرف على المرحلة (Ultimate Fuzzy Search)
  const fetchStudentStage = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          next_year_track,
          sections (
            name,
            classes ( name, level )
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;

      const rawData = data as any;
      
      // 1. استخراج الكائنات بأمان تام لتجنب أخطاء المصفوفات
      const sec = Array.isArray(rawData?.sections) ? rawData.sections[0] : rawData?.sections;
      const cls = Array.isArray(sec?.classes) ? sec?.classes[0] : sec?.classes;

      // 2. تجميع كل الأدلة الممكنة من قاعدة البيانات
      const levelNum = cls?.level || '';
      const className = cls?.name || '';
      const sectionName = sec?.name || '';
      const track = rawData?.next_year_track || '';

      // 3. دمج كل البيانات في "بصمة نصية" واحدة وتوحيد حالة الأحرف
      const searchString = `${levelNum} ${className} ${sectionName} ${track}`.toLowerCase();

      let stage = '12_scientific'; // الافتراضي للحماية

      // 4. البحث الشامل والذكي داخل البصمة النصية
      if (searchString.includes('10') || searchString.includes('عاشر')) {
        stage = '10';
      } 
      else if (searchString.includes('11') || searchString.includes('حادي')) {
        stage = (searchString.includes('lit') || searchString.includes('أدبي')) ? '11_literary' : '11_scientific';
      } 
      else if (searchString.includes('12') || searchString.includes('ثاني')) {
        stage = (searchString.includes('lit') || searchString.includes('أدبي')) ? '12_literary' : '12_scientific';
      }

      setStudentStage(stage);
      return stage;
      
    } catch (err) {
      console.error("Error fetching stage:", err);
      return '12_scientific'; 
    }
  }, []);

  const calculateCompass = useCallback(async (studentId: string, manualStage?: string) => {
    setLoading(true);
    try {
      const targetStage = manualStage || await fetchStudentStage(studentId);
      setStudentStage(targetStage); 

      // جلب اللوائح بدون ترتيب من قاعدة البيانات، لأننا سنرتبها برمجياً
      const { data: rules } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', targetStage);

      const { data: grades } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId);

      const gradesMap = new Map<string, number>();
      if (grades) {
        grades.forEach(g => {
          const subjectData = g.subjects as any;
          if (subjectData && typeof subjectData.name === 'string') {
            gradesMap.set(subjectData.name, g.score || 0);
          }
        });
      }

      const generated: SubjectAnalysis[] = (rules || []).map(rule => {
        const realScore = gradesMap.get(rule.subject_name) || 0;
        return {
          subject_name: rule.subject_name,
          coursework_max: rule.coursework_max,
          exam_max: rule.exam_max,
          total_max: rule.total_max,
          passing_mark: rule.passing_mark,
          real_coursework: realScore,
          predicted_coursework: realScore,
          predicted_exam: 0,
          status: 'SAFE',
          message: ''
        };
      });

      // 🌟 الفرز الذكي (Smart Sorting) لمطابقة الشهادة الأصلية
      generated.sort((a, b) => {
        let indexA = OFFICIAL_SUBJECT_ORDER.indexOf(a.subject_name.trim());
        let indexB = OFFICIAL_SUBJECT_ORDER.indexOf(b.subject_name.trim());

        // في حال إضافة مادة غير موجودة في القائمة، ستظهر في الأسفل
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        return indexA - indexB;
      });

      setAnalysis(generated);
      return { generated, targetStage };
      
    } finally {
      setLoading(false);
    }
  }, [fetchStudentStage]);

  return { calculateCompass, analysis, loading, studentStage };
}
