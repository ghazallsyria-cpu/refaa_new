import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 1. واجهة البيانات (Interfaces) لضمان قوة الكود (TypeScript)
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

  // 🚀 2. المحرك الأساسي: تحليل وضع الطالب بناءً على درجات أعمال السنة
  const calculateCompass = useCallback(async (studentId: string, academicStage: string) => {
    setLoading(true);
    try {
      // جلب لوائح الوزارة للمرحلة الحالية (مثال: 12_scientific)
      const { data: rules, error: rulesError } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', academicStage);

      if (rulesError) throw rulesError;

      // جلب درجات الطالب الحالية (نركز على أعمال السنة فقط)
      const { data: studentGrades, error: gradesError } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId)
        .eq('type', 'coursework'); 

      if (gradesError) throw gradesError;

      // تحويل الدرجات لقاموس (Map) لسرعة المطابقة
      const gradesMap = new Map<string, number>();
      if (studentGrades) {
        studentGrades.forEach(g => {
          // 🚀 الحل لخطأ Netlify و TypeScript: إجبار النوع والتأكد منه
          const subjectData = g.subjects as any;
          if (subjectData && typeof subjectData.name === 'string') {
            gradesMap.set(subjectData.name, g.score || 0);
          }
        });
      }

      // مطابقة اللوائح مع درجات الطالب وتوليد السيناريوهات
      const generatedAnalysis: SubjectAnalysis[] = (rules || []).map(rule => {
        const studentScore = gradesMap.get(rule.subject_name) || 0; // إذا لم تُرصد نعتبرها 0
        const needed = rule.passing_mark - studentScore;
        
        let status: SubjectAnalysis['status'] = 'SAFE';
        let message = '';

        // الخوارزمية الذكية لتحديد حالة المادة
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

  // 🚀 3. محرك المحاكاة: يحسب التوقعات بناءً على إدخال الطالب التخيلي
  const calculatePredictedGPA = useCallback((
    subjects: SubjectAnalysis[], 
    predictions: Record<string, number>, // الدرجات المتوقعة في الفاينل
    g10: number, // نسبة العاشر
    g11: number  // نسبة الحادي عشر
  ) => {
    if (!subjects || subjects.length === 0) return { g12Average: "0.00", finalCumulative: "0.00" };

    // حساب النهاية العظمى لجميع المواد
    const totalMax = subjects.reduce((acc, s) => acc + s.total_max, 0);
    
    // حساب المجموع المتوقع (الأعمال الحالية + الفاينل المتوقع)
    const predictedTotal = subjects.reduce((acc, s) => {
      const pred = predictions[s.subject_name] || 0;
      return acc + s.student_coursework + pred;
    }, 0);
    
    // حساب نسبة الثاني عشر
    const g12Average = totalMax > 0 ? (predictedTotal / totalMax) * 100 : 0;
    
    // الحسبة الكويتية الذهبية (10% + 20% + 70%)
    const finalCumulative = (g10 * 0.10) + (g11 * 0.20) + (g12Average * 0.70);

    return {
      g12Average: g12Average.toFixed(2),
      finalCumulative: finalCumulative.toFixed(2)
    };
  }, []);

  return { calculateCompass, calculatePredictedGPA, analysis, loading };
}
