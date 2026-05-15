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
  status: 'PASSED' | 'SAFE' | 'WARNING' | 'DANGER' | 'IMPOSSIBLE';
  message: string;
}

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);
  const [studentStage, setStudentStage] = useState<string>('');

  // 🚀 الدالة الذكية للتعرف على مرحلة الطالب (تم إصلاح استخراج البيانات)
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

      // 🛠️ الإصلاح الجذري لمشكلة TypeScript
      // نتعامل مع sections كـ Any لنتجاوز تعقيد المصفوفات في TypeScript
      const rawData = data as any;
      
      // نستخرج الـ level بأمان سواء كان sections مصفوفة أو كائن
      let rawLevel = null;
      
      if (Array.isArray(rawData?.sections) && rawData.sections.length > 0) {
        // إذا كان مصفوفة، نأخذ أول فصل مسجل فيه
        rawLevel = rawData.sections[0]?.classes?.level;
      } else if (rawData?.sections?.classes) {
        // إذا كان كائن مفرد
        rawLevel = rawData.sections.classes.level;
      }

      const level = rawLevel?.toString(); 
      const track = rawData?.next_year_track;

      let stage = '12_scientific'; // القيمة الافتراضية

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

  const calculatePredictedGPA = useCallback((
    subjects: SubjectAnalysis[], 
    predictions: Record<string, number>, 
    g10: number, 
    g11: number  
  ) => {
    if (!subjects || subjects.length === 0) return { g12Average: "0.00", finalCumulative: "0.00" };

    const totalMax = subjects.reduce((acc, s) => acc + s.total_max, 0);
    const predictedTotal = subjects.reduce((acc, s) => {
      const pred = predictions[s.subject_name] || 0;
      return acc + s.real_coursework + pred;
    }, 0);
    
    const g12Average = totalMax > 0 ? (predictedTotal / totalMax) * 100 : 0;
    const finalCumulative = (g10 * 0.10) + (g11 * 0.20) + (g12Average * 0.70);

    return {
      g12Average: g12Average.toFixed(2),
      finalCumulative: finalCumulative.toFixed(2)
    };
  }, []);

  return { calculateCompass, calculatePredictedGPA, analysis, loading, studentStage };
}
