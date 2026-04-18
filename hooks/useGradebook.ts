import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useGradebook() {
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [gradeData, setGradeData] = useState<{ 
    students: any[], assessments: any[], scores: any[], customColumns: any[], customScores: any[], assignments: any[], assignmentScores: any[]
  }>({
    students: [], assessments: [], scores: [], customColumns: [], customScores: [], assignments: [], assignmentScores: []
  });

  const fetchGradebook = useCallback(async (sectionId: string, subjectId: string) => {
    if (!sectionId || !subjectId) return;
    setLoading(true);

    try {
      const { data: studentsData, error: studentsErr } = await supabase.from('students').select('id, users(full_name)').eq('section_id', sectionId);
      if (studentsErr) throw studentsErr;

      const { data: examsData } = await supabase.from('exams').select('id, title, max_score, status').eq('subject_id', subjectId).in('status', ['published', 'archived']);
      
      const { data: customColsData } = await supabase.from('gradebook_columns').select('*').eq('section_id', sectionId).eq('subject_id', subjectId).order('created_at', { ascending: true });
      
      const { data: assignmentsData } = await supabase.from('assignments').select('id, title, total_marks, status').eq('subject_id', subjectId).in('status', ['published', 'archived', 'closed']);

      const studentIds = studentsData?.map(s => s.id) || [];
      const examIds = examsData?.map(e => e.id) || [];
      const assignmentIds = assignmentsData?.map(a => a.id) || [];

      let attemptsData: any[] = [];
      let archivedGradesData: any[] = [];
      let customScoresData: any[] = [];
      let assignmentSubmissionsData: any[] = [];

      if (studentIds.length > 0) {
        if (examIds.length > 0) {
          const { data: attempts } = await supabase.from('exam_attempts').select('student_id, exam_id, score').in('exam_id', examIds).in('student_id', studentIds).in('status', ['completed', 'graded']);
          attemptsData = attempts || [];
        }

        // 🚀 سحب الدرجات (تم إزالة column_id واستخدام exam_id الموجود أصلاً)
        const { data: grades } = await supabase.from('grades').select('id, student_id, exam_id, score, exam_type, title').in('student_id', studentIds).eq('subject_id', subjectId).eq('section_id', sectionId);
        
        archivedGradesData = grades?.filter(g => g.exam_type === 'exam') || [];
        customScoresData = grades?.filter(g => g.exam_type === 'custom') || [];

        if (assignmentIds.length > 0) {
           const { data: submissions } = await supabase.from('assignment_submissions').select('student_id, assignment_id, grade').in('assignment_id', assignmentIds).in('student_id', studentIds).not('grade', 'is', null);
           assignmentSubmissionsData = submissions || [];
        }
      }

      const mergedScores = [...attemptsData];
      archivedGradesData.forEach(ag => {
         const existingIdx = mergedScores.findIndex(m => String(m.student_id) === String(ag.student_id) && String(m.exam_id) === String(ag.exam_id));
         if (existingIdx >= 0) mergedScores[existingIdx] = ag;
         else mergedScores.push(ag);
      });

      const formattedStudents = studentsData?.map(s => {
        let fullName = 'طالب غير معروف';
        if (Array.isArray(s.users) && s.users.length > 0) fullName = s.users[0].full_name;
        else if (s.users && !Array.isArray(s.users)) fullName = (s.users as any).full_name;
        return { id: s.id, name: fullName };
      }) || [];
      formattedStudents.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      setGradeData({
        students: formattedStudents, assessments: examsData || [], scores: mergedScores, 
        customColumns: customColsData || [], customScores: customScoresData, assignments: assignmentsData || [], assignmentScores: assignmentSubmissionsData
      });

    } catch (error) { console.error('Error fetching gradebook:', error); } finally { setLoading(false); }
  }, []);

  const addCustomColumn = async (sectionId: string, subjectId: string, title: string, maxScore: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('gradebook_columns').insert([{ teacher_id: user.id, section_id: sectionId, subject_id: subjectId, title, max_score: maxScore }]);
      if (error) throw error;
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error adding column:', err); }
  };

  const editCustomColumn = async (sectionId: string, subjectId: string, columnId: string, title: string, maxScore: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('gradebook_columns').update({ title, max_score: maxScore }).eq('id', columnId);
      if (error) throw error;
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error editing column:', err); }
  };

  const deleteCustomColumn = async (sectionId: string, subjectId: string, columnId: string) => {
    if (!user) return;
    try {
      // حذف العمود
      await supabase.from('gradebook_columns').delete().eq('id', columnId);
      // حذف الدرجات المرتبطة به لكي لا تبقى معلقة
      await supabase.from('grades').delete().eq('exam_type', 'custom').eq('exam_id', columnId);
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error deleting column:', err); }
  };

  const saveCustomGradesBulk = async (sectionId: string, subjectId: string, gradesArray: any[]) => {
    if (!user || gradesArray.length === 0) return;
    setSaving(true);
    try {
      const payload = gradesArray.map(g => ({
        id: g.id || undefined, 
        student_id: g.student_id, 
        subject_id: subjectId, 
        section_id: sectionId,
        exam_type: 'custom', 
        title: g.title, 
        exam_id: g.column_id, // 🚀 خدعة سحرية: نخزن الـ column_id داخل exam_id ليتم الحفظ بدون تعديل قاعدة البيانات
        score: g.score, 
        max_score: g.max_score, 
        recorded_by: user.id
      }));
      const { error } = await supabase.from('grades').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error saving grades:', err); } finally { setSaving(false); }
  };

  return { fetchGradebook, loading, saving, gradeData, addCustomColumn, editCustomColumn, deleteCustomColumn, saveCustomGradesBulk };
}
