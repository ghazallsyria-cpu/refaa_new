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

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  // 🚀 الدالة الذكية للتعرف على مرحلة الطالب
  const fetchStudentStage = useCallback(async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          next_year_track,
          sections (
            classes ( level )
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) {
         console.warn("لم نتمكن من جلب بيانات مرحلة الطالب، سنفترض 12 علمي:", error);
         return '12_scientific';
      }

      // تحليل المستوى (10, 11, 12) والمسار (علمي، أدبي)
      // ملاحظة: قمنا بتحويل level إلى نص احتياطاً
      const level = data?.sections?.classes?.level?.toString(); 
      const track = data?.next_year_track; // 'scientific' أو 'literary'

      let stage = '12_scientific'; // القيمة الافتراضية للنجاة من الأخطاء

      if (level === '10') {
        stage = '10';
      } else if (level === '11') {
        stage = track === 'literary' ? '11_literary' : '11_scientific';
      } else if (level === '12') {
        stage = track === 'literary' ? '12_literary' : '12_scientific';
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
      // 🚀 إذا مرر المدير مرحلة يدوية، استخدمها. وإلا، ابحث عن مرحلة الطالب الحقيقية
      const targetStage = manualStage || await fetchStudentStage(studentId);
      
      // تحديث الـ State لكي تعرف الواجهة ما هي المرحلة المحددة حالياً
      setStudentStage(targetStage); 

      const { data: rules } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', targetStage)
        .order('subject_name');

      const { data: grades } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId);

      const gradesMap = new Map();
      grades?.forEach(g => {
         const subjectData = g.subjects as any;
         if (subjectData && typeof subjectData.name === 'string') {
           gradesMap.set(subjectData.name, g.score || 0);
         }
      });

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
          predicted_exam: rule.passing_mark - realScore > 0 ? rule.passing_mark - realScore : 0,
          status: 'SAFE',
          message: ''
        };
      });

      setAnalysis(generated);
      return { generated, targetStage };
    } finally {
      setLoading(false);
    }
  }, [fetchStudentStage]);

  return { calculateCompass, analysis, loading, studentStage };
}
