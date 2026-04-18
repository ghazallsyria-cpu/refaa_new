import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useGradebook() {
  const [loading, setLoading] = useState(false);
  const [gradeData, setGradeData] = useState<{ students: any[], assessments: any[], scores: any[] }>({
    students: [], assessments: [], scores: []
  });

  const fetchGradebook = useCallback(async (sectionId: string, subjectId: string) => {
    if (!sectionId || !subjectId) return;
    setLoading(true);

    try {
      // 1. سحب الطلاب 
      const { data: studentsData, error: studentsErr } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('section_id', sectionId);

      if (studentsErr) throw studentsErr;

      // 2. سحب الاختبارات الخاصة بهذه المادة
      const { data: examsData, error: examsErr } = await supabase
        .from('exams')
        .select('id, title, max_score, status')
        .eq('subject_id', subjectId)
        .in('status', ['published', 'archived']);

      if (examsErr) throw examsErr;

      const studentIds = studentsData?.map(s => s.id) || [];
      const examIds = examsData?.map(e => e.id) || [];

      let attemptsData: any[] = [];
      let archivedGradesData: any[] = [];

      // 3. سحب الدرجات 
      if (studentIds.length > 0 && examIds.length > 0) {
        
        // سحب الدرجات الجارية 
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('student_id, exam_id, score')
          .in('exam_id', examIds)
          .in('student_id', studentIds)
          .in('status', ['completed', 'graded']);
        
        attemptsData = attempts || [];

        // سحب الدرجات المؤرشفة
        const { data: grades } = await supabase
          .from('grades')
          .select('student_id, exam_id, score')
          .in('exam_id', examIds)
          .in('student_id', studentIds)
          .eq('assessment_type', 'exam'); 
          
        archivedGradesData = grades || [];
      }

      // دمج الدرجات
      const mergedScores = [...attemptsData];
      archivedGradesData.forEach(ag => {
         const existingIdx = mergedScores.findIndex(m => String(m.student_id) === String(ag.student_id) && String(m.exam_id) === String(ag.exam_id));
         if (existingIdx >= 0) mergedScores[existingIdx] = ag;
         else mergedScores.push(ag);
      });

      // تهيئة أسماء الطلاب
      const formattedStudents = studentsData?.map(s => {
        let fullName = 'طالب غير معروف';
        if (Array.isArray(s.users) && s.users.length > 0) {
          fullName = s.users[0].full_name;
        } else if (s.users && !Array.isArray(s.users)) {
          fullName = (s.users as any).full_name;
        }
        
        return {
          id: s.id,
          name: fullName,
        };
      }) || [];

      // 🚀 اللمسة السحرية: ترتيب الطلاب أبجدياً باللغة العربية
      formattedStudents.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      setGradeData({
        students: formattedStudents,
        assessments: examsData || [],
        scores: mergedScores
      });

    } catch (error) {
      console.error('Error fetching gradebook:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchGradebook, loading, gradeData };
}
