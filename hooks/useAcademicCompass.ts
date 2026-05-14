import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// تعريف أنواع البيانات
export interface SubjectAnalysis {
  subject_name: string;
  coursework_max: number;
  exam_max: number;
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
      // 1. جلب قواعد الدرجات للمرحلة الحالية (مثلاً 12_scientific)
      const { data: rules, error: rulesError } = await supabase
        .from('kuwait_grading_rules')
        .select('*')
        .eq('academic_stage', academicStage);

      if (rulesError) throw rulesError;

      // 2. جلب درجات الطالب الحالية (أعمال السنة) من جدول الدرجات
      // نفترض أن درجات أعمال السنة مسجلة بنوع "coursework"
      const { data: studentGrades, error: gradesError } = await supabase
        .from('grades')
        .select('score, subjects(name)')
        .eq('student_id', studentId)
        .eq('type', 'coursework'); // فلترة أعمال السنة فقط

      if (gradesError) throw gradesError;

      // تحويل درجات الطالب إلى قاموس (Map) لسهولة البحث
      const gradesMap = new Map();
      studentGrades?.forEach(g => {
        if (g.subjects?.name) {
          gradesMap.set(g.subjects.name, g.score);
        }
      });

      // 3. معالجة وتوليد سيناريوهات الإنقاذ لكل مادة
      const generatedAnalysis: SubjectAnalysis[] = (rules || []).map(rule => {
        const studentScore = gradesMap.get(rule.subject_name) || 0; // إذا لم تُرصد له درجة، نعتبرها 0
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
          // إذا كان يحتاج أكثر من 80% من درجة الفاينل للنجاح
          status = 'DANGER';
          message = `خطر! تحتاج ${needed} من أصل ${rule.exam_max} في الفاينل لتنجح. كثّف دراستك فوراً!`;
        } else if (needed > (rule.exam_max * 0.4)) {
           // يحتاج بين 40% و 80%
          status = 'WARNING';
          message = `احذر. تحتاج ${needed} من ${rule.exam_max} لتتجاوز المادة.`;
        } else {
          // يحتاج أقل من 40% من درجة الفاينل
          status = 'SAFE';
          message = `وضعك آمن. تحتاج فقط ${needed} من ${rule.exam_max} للنجاح.`;
        }

        return {
          subject_name: rule.subject_name,
          coursework_max: rule.coursework_max,
          exam_max: rule.exam_max,
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

  return { calculateCompass, analysis, loading };
}
