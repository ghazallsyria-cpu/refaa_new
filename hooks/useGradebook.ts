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
      const { data: studentsData } = await supabase.from('students').select('id, users(full_name)').eq('section_id', sectionId);
      const { data: examsData } = await supabase.from('exams').select('id, title, max_score, status').eq('subject_id', subjectId).in('status', ['published', 'archived']);
      const { data: customColsData } = await supabase.from('gradebook_columns').select('*').eq('section_id', sectionId).eq('subject_id', subjectId).order('created_at', { ascending: true });
      
      // 🚀 1. سحب الواجبات بأمان تام (استخدام * لتفادي خطأ الأعمدة المفقودة)
const { data: rawAssignments, error: assignErr } = await supabase
  .from('assignments')
  .select('*')
  .eq('subject_id', subjectId)
  .contains('section_ids', [sectionId])
  .eq('teacher_id', user.id);
      if (assignErr) console.error("Assignments Fetch Error:", assignErr);
      
      const assignmentsData = (rawAssignments || []).filter(a => {
         const stat = a.status || 'published';
         return ['published', 'archived', 'closed'].includes(stat);
      });

      const studentIds = studentsData?.map(s => s.id) || [];
      const examIds = examsData?.map(e => e.id) || [];
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      const columnIds = customColsData?.map(c => c.id) || [];

      let attemptsData: any[] = [];
      let archivedGradesData: any[] = [];
      let customScoresData: any[] = [];
      let assignmentSubmissionsData: any[] = [];

      if (studentIds.length > 0) {
        if (examIds.length > 0) {
          const { data: attempts } = await supabase.from('exam_attempts').select('student_id, exam_id, score').in('exam_id', examIds).in('student_id', studentIds).in('status', ['completed', 'graded']);
          attemptsData = attempts || [];
        }

        const { data: grades } = await supabase.from('grades').select('student_id, exam_id, score').in('student_id', studentIds).eq('subject_id', subjectId).eq('section_id', sectionId).eq('exam_type', 'exam');
        archivedGradesData = grades || [];

        // 🚀 2. سحب التسليمات بأمان تام
        if (assignmentIds.length > 0) {
           const { data: submissions, error: subErr } = await supabase.from('assignment_submissions').select('*').in('assignment_id', assignmentIds).in('student_id', studentIds);
           if (subErr) console.error("Submissions Fetch Error:", subErr);
           assignmentSubmissionsData = submissions || [];
        }

        if (columnIds.length > 0) {
            const { data: cScores } = await supabase.from('gradebook_scores').select('student_id, column_id, score').in('column_id', columnIds).in('student_id', studentIds);
            customScoresData = cScores || [];
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
      await supabase.from('gradebook_columns').insert([{ teacher_id: user.id, section_id: sectionId, subject_id: subjectId, title, max_score: maxScore }]);
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error adding column:', err); }
  };

  const editCustomColumn = async (sectionId: string, subjectId: string, columnId: string, title: string, maxScore: number) => {
    if (!user) return;
    try {
      await supabase.from('gradebook_columns').update({ title, max_score: maxScore }).eq('id', columnId);
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error editing column:', err); }
  };

  const deleteCustomColumn = async (sectionId: string, subjectId: string, columnId: string) => {
    if (!user) return;
    try {
      await supabase.from('gradebook_scores').delete().eq('column_id', columnId);
      await supabase.from('gradebook_columns').delete().eq('id', columnId);
      await fetchGradebook(sectionId, subjectId);
    } catch (err) { console.error('Error deleting column:', err); }
  };

  const saveCustomGradesBulk = async (sectionId: string, subjectId: string, gradesArray: any[]) => {
    if (!user || gradesArray.length === 0) return false;
    setSaving(true);
    try {
      const payload = gradesArray.map(g => ({
        student_id: g.student_id, column_id: g.column_id, score: g.score, recorded_by: user.id
      }));
      const { error } = await supabase.from('gradebook_scores').upsert(payload, { onConflict: 'student_id, column_id' });
      if (error) throw error; 
      await fetchGradebook(sectionId, subjectId);
      return true; 
    } catch (err: any) { 
      console.error('Error saving grades:', err); 
      throw err; 
    } finally { setSaving(false); }
  };

  return { fetchGradebook, loading, saving, gradeData, addCustomColumn, editCustomColumn, deleteCustomColumn, saveCustomGradesBulk };
}
