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

// 📜 المصفوفة الذهبية لترتيب المواد (تمت إضافة أسماء مواد المتوسطة)
const OFFICIAL_SUBJECT_ORDER = [
  'القرآن الكريم',
  'قرآن كريم',
  'التربية الإسلامية',
  'تربيه اسلاميه',
  'اللغة العربية',
  'لغه عربيه',
  'اللغة الإنجليزية',
  'لغه انجليزيه',
  'اللغة الفرنسية',
  'الرياضيات',
  'رياضيات',
  'الرياضيات والاحصاء',
  'الرياضيات والإحصاء',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'علوم', // 🚀 مادة العلوم للمتوسطة
  'الجيولوجيا',
  'تاريخ الكويت',
  'الاجتماعيات',
  'اجتماعيات', // 🚀 اجتماعيات للمتوسطة
  'التاريخ',
  'الجغرافيا',
  'علم النفس',
  'الفلسفة',
  'قضايا البيئة والتنمية المعاصرة',
  'الدستور',
  'الدستور وحقوق الإنسان',
  'الحاسوب',
  'حاسب آلي', // 🚀 حاسب آلي للمتوسطة
  'المعلوماتية',
  'المعلوماتية وطرق البحث',
  'التربية البدنية',
  'تربيه بدنيه',
  'الاختيار الحر 1',
  'اختياري حر 1',
  'الاختيار الحر 2',
  'اختياري حر 2'
];

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  // 🚀 الاستعلام المدرع للتعرف على المرحلة (يدعم الآن المتوسط والثانوي معاً)
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
      
      const sec = Array.isArray(rawData?.sections) ? rawData.sections[0] : rawData?.sections;
      const cls = Array.isArray(sec?.classes) ? sec?.classes[0] : sec?.classes;

      const levelNum = cls?.level || '';
      const className = cls?.name || '';
      const sectionName = sec?.name || '';
      const track = rawData?.next_year_track || '';

      const searchString = `${levelNum} ${className} ${sectionName} ${track}`.toLowerCase();

      let stage = '12_scientific'; // الافتراضي للحماية

      // 4. 🚀 البحث الشامل والذكي (متوسط + ثانوي)
      if (searchString.includes('6') || searchString.includes('سادس')) stage = '6';
      else if (searchString.includes('7') || searchString.includes('سابع')) stage = '7';
      else if (searchString.includes('8') || searchString.includes('ثامن')) stage = '8';
      else if (searchString.includes('9') || searchString.includes('تاسع')) stage = '9';
      else if (searchString.includes('10') || searchString.includes('عاشر')) stage = '10';
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

      generated.sort((a, b) => {
        let indexA = OFFICIAL_SUBJECT_ORDER.indexOf(a.subject_name.trim());
        let indexB = OFFICIAL_SUBJECT_ORDER.indexOf(b.subject_name.trim());

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
