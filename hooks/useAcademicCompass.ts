// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubjectAnalysis {
  subject_name: string;
  coursework_max: number;
  exam_max: number;
  total_max: number;
  passing_mark: number;
  real_coursework: number; // الدرجة الحقيقية في القاعدة
  predicted_coursework: number; // التوقع للأعمال
  predicted_exam: number; // التوقع للفاينل
  status: string;
  message: string;
}

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  const fetchStudentStage = useCallback(async (studentId: string) => {
    // جلب مرحلة الطالب من خلال ربط الجداول (Students -> Sections -> Classes)
    const { data, error } = await supabase
      .from('students')
      .select(`
        next_year_track,
        sections (
          classes ( name, level )
        )
      `)
      .eq('id', studentId)
      .single();

    if (data) {
      const level = data.sections?.classes?.level; // مثلاً 10، 11، 12
      const track = data.next_year_track === 'scientific' ? '_scientific' : (data.next_year_track === 'literary' ? '_literary' : '');
      const stage = `${level}${track}`;
      setStudentStage(stage);
      return stage;
    }
    return '12_scientific'; // افتراضي
  }, []);

  const calculateCompass = useCallback(async (studentId: string, manualStage?: string) => {
    setLoading(true);
    try {
      // إذا كان المدير يختبر، نستخدم المرحلة اليدوية، وإلا نجلب مرحلة الطالب
      const targetStage = manualStage || await fetchStudentStage(studentId);

      const { data: rules } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', targetStage);

      const { data: grades } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId)
        .eq('type', 'coursework');

      const gradesMap = new Map();
      grades?.forEach(g => gradesMap.set(g.subjects?.name, g.score || 0));

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
