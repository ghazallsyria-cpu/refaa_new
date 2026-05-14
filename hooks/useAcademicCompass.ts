import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubjectAnalysis {
  subject_name: string;
  coursework_max: number;
  exam_max: number;
  total_max: number;
  passing_mark: number;
  student_coursework: number;
  needed_for_passing: number;
  status: 'PASSED' | 'SAFE' | 'WARNING' | 'DANGER' | 'IMPOSSIBLE';
  message: string;
}

export function useAcademicCompass() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SubjectAnalysis[]>([]);

  const calculateCompass = useCallback(async (studentId: string, academicStage: string) => {
    setLoading(true);
    try {
      // 1. جلب اللوائح (يجب أن يعمل بعد تفعيل الـ RLS)
      const { data: rules, error: rulesError } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', academicStage);

      if (rulesError) {
        console.error("Rules Fetch Error:", rulesError);
        throw rulesError;
      }

      // 2. جلب الدرجات (تم إزالة شرط type لضمان عدم انهيار الاستعلام)
      const { data: studentGrades, error: gradesError } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId);

      // إذا حدث خطأ في الدرجات، لا توقف الكود، بل اطبع تحذيراً واعتبرها أصفاراً
      if (gradesError) {
        console.warn("⚠️ لم نتمكن من جلب الدرجات (ربما الجدول يحتاج لتحديث):", gradesError);
      }

      const gradesMap = new Map<string, number>();
      if (studentGrades && !gradesError) {
        studentGrades.forEach(g => {
          const subjectData = g.subjects as any;
          if (subjectData && typeof subjectData.name === 'string') {
            gradesMap.set(subjectData.name, g.score || 0);
          }
        });
      }

      // 3. توليد التحليل
      const generatedAnalysis: SubjectAnalysis[] = (rules || []).map(rule => {
        const studentScore = gradesMap.get(rule.subject_name) || 0;
        const needed = rule.passing_mark - studentScore;
        
        let status: SubjectAnalysis['status'] = 'SAFE';
        let message = '';

        if (needed <= 0) {
          status = 'PASSED';
          message = 'أنت ناجح بالفعل في هذه المادة من خلال أعمال السنة!';
        } else if (needed > rule.exam_max) {
          status = 'IMPOSSIBLE';
          message = `تحتاج ${needed} درجة، والاختبار من ${rule.exam_max}. لا يمكن النجاح في الدور الأول، استعد للدور الثاني.`;
        } else if (needed > (rule.exam_max * 0.8)) {
          status = 'DANGER';
          message = `خطر! تحتاج ${needed} من أصل ${rule.exam_max} في الفاينل لتنجح. كثّف دراستك فوراً!`;
        } else if (needed > (rule.exam_max * 0.4)) {
          status = 'WARNING';
          message = `احذر. تحتاج ${needed} من ${rule.exam_max} لتتجاوز المادة.`;
        } else {
          status = 'SAFE';
          message = `وضعك آمن. تحتاج فقط ${needed} من ${rule.exam_max} للنجاح.`;
        }

        return {
          subject_name: rule.subject_name,
          coursework_max: rule.coursework_max,
          exam_max: rule.exam_max,
          total_max: rule.total_max,
          passing_mark: rule.passing_mark,
          student_coursework: studentScore,
          needed_for_passing: needed,
          status,
          message
        };
      });

      setAnalysis(generatedAnalysis);
      return generatedAnalysis;

    } catch (error) {
      console.error('Error generating academic compass:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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
      return acc + s.student_coursework + pred;
    }, 0);
    
    const g12Average = totalMax > 0 ? (predictedTotal / totalMax) * 100 : 0;
    const finalCumulative = (g10 * 0.10) + (g11 * 0.20) + (g12Average * 0.70);

    return {
      g12Average: g12Average.toFixed(2),
      finalCumulative: finalCumulative.toFixed(2)
    };
  }, []);

  return { calculateCompass, calculatePredictedGPA, analysis, loading };
}
