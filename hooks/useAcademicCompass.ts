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

  // 🚀 الاستعلام المدرع للتعرف على المرحلة
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

      if (error) throw error;

      const rawData = data as any;
      let extractedLevel: any = null;

      // 1. استخراج آمن للمستوى سواء كان sections مصفوفة أو كائن
      if (Array.isArray(rawData?.sections) && rawData.sections.length > 0) {
        extractedLevel = rawData.sections[0]?.classes?.level;
      } else if (rawData?.sections?.classes) {
        extractedLevel = rawData.sections.classes.level;
      }

      // 2. تحويل المستوى إلى نص لضمان نجاح المطابقة (String Matching)
      const levelStr = String(extractedLevel || '').trim(); 
      const track = rawData?.next_year_track; // 'scientific' أو 'literary'

      let stage = '12_scientific'; // افتراضي للحماية

      // 3. تحديد المرحلة بدقة تامة باستخدام النص
      if (levelStr === '10') {
        stage = '10';
      } else if (levelStr === '11') {
        stage = track === 'literary' ? '11_literary' : '11_scientific';
      } else if (levelStr === '12') {
        stage = track === 'literary' ? '12_literary' : '12_scientific';
      }

      setStudentStage(stage);
      return stage;
      
    } catch (err) {
      console.error("Error fetching stage:", err);
      return '12_scientific'; // الرجوع للافتراضي فقط عند فشل الاستعلام تماماً
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
        .eq('academic_stage', targetStage)
        .order('subject_name');

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

      setAnalysis(generated);
      return { generated, targetStage };
      
    } finally {
      setLoading(false);
    }
  }, [fetchStudentStage]);

  return { calculateCompass, analysis, loading, studentStage };
}
