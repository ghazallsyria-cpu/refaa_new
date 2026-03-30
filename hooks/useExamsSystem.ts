import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { ExamWithMeta, ExamDetails, ExamResults, Exam, ExamAttempt } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface ExamForStudent {
  exam: ExamWithMeta;
  questions: Question[];
}

export interface StudentExamResult {
  exam: Exam;
  student: { id: string, users: { full_name: string } };
  attempt: ExamAttempt | null;
  answers: any[];
}

const mapQuestionsWithMedia = (questionsData: any[] | null) => {
  return (questionsData || []).map((q: any) => {
    const normalized = normalizeQuestion(q) as any; 
    return {
      ...normalized,
      mediaUrl: q.media_url || q.mediaUrl || normalized.mediaUrl || normalized.media_url || null,
      media_url: q.media_url || q.mediaUrl || normalized.mediaUrl || normalized.media_url || null
    };
  });
};

export function useExamsSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<ExamWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async (): Promise<void> => {
    if (!user || !currentRole) return;
    setLoading(true);
    setError(null);
    try {
      const selectQuery = currentRole === 'student' 
        ? `*, subject:subjects(name), teacher:teachers(users(full_name)), exam_sections!inner(section_id, sections(name, classes(name)))`
        : `*, subject:subjects(name), teacher:teachers(users(full_name)), exam_sections(section_id, sections(name, classes(name)))`;

      let query = supabase.from('exams').select(selectQuery).order('created_at', { ascending: false });

      let currentStudentProfileId = null;

      if (currentRole === 'student') {
        let studentProfile = null;
        const { data: sp1 } = await supabase.from('students').select('id, section_id').eq('user_id', user.id).maybeSingle();
        if (sp1) studentProfile = sp1;
        else {
          const { data: sp2 } = await supabase.from('students').select('id, section_id').eq('id', user.id).maybeSingle();
          if (sp2) studentProfile = sp2;
        }

        if (studentProfile?.section_id) {
          currentStudentProfileId = studentProfile.id;
          query = query.eq('exam_sections.section_id', studentProfile.section_id).eq('status', 'published');
        } else {
          setData([]); setLoading(false); return;
        }
      } else if (currentRole === 'teacher') {
        let teacherProfile = null;
        const { data: tp1 } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (tp1) teacherProfile = tp1;
        else {
          const { data: tp2 } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
          if (tp2) teacherProfile = tp2;
        }
          
        if (!teacherProfile && user.user_metadata?.role === 'teacher') {
          const { data: newTeacher, error: createError } = await supabase.from('teachers').insert({
              user_id: user.id,
              national_id: 'TEMP_' + user.id.substring(0, 8),
              specialization: 'غير محدد'
            }).select('id').single();
          if (!createError && newTeacher) teacherProfile = newTeacher;
        }

        if (teacherProfile) {
          query = query.eq('teacher_id', teacherProfile.id);
        } else {
          setData([]); setLoading(false); return;
        }
      }

      const { data: examsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mappedData: ExamWithMeta[] = (examsData || []).map((e: any) => ({
        ...e,
        total_marks: e.total_marks || e.max_score || 0,
        subject_name: Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name,
        teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name,
        section_name: e.exam_sections && e.exam_sections.length > 0 ? e.exam_sections.map((es: any) => es.sections?.name).join(', ') : 'غير محدد',
      }));

      if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const examsWithStats = await Promise.all(mappedData.map(async (e) => {
          const [attemptsRes, questionsRes] = await Promise.all([
            supabase.from('exam_attempts').select('score, status').eq('exam_id', e.id),
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', e.id)
          ]);
          const attempts = attemptsRes.data || [];
          return {
            ...e,
            submission_count: attempts.length,
            graded_count: attempts.filter(a => a.status === 'graded' || a.status === 'completed').length,
            avg_score: attempts.length > 0 ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length) : 0,
            question_count: questionsRes.count || 0
          };
        }));
        mappedData = examsWithStats;
      }

      if (currentRole === 'student' && currentStudentProfileId) {
        const { data: attemptsData } = await supabase.from('exam_attempts').select('exam_id, score, status').eq('student_id', currentStudentProfileId);
        mappedData = mappedData.map(exam => {
          const attempt = attemptsData?.find(a => a.exam_id === exam.id);
          return {
            ...exam,
            submission_status: attempt ? (attempt.status === 'completed' || attempt.status === 'graded' ? 'submitted' : 'pending') : 'pending',
            score: attempt?.score
          };
        });
      }

      setData(mappedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching exams');
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const fetchExamDetails = useCallback(async (examId: string): Promise<ExamDetails> => {
    try {
      const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (examError) throw examError;
      const { data: examSectionsData } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
      const { data: questionsData } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');
      
      const result: any = { 
        exam: { ...examData, section_ids: examSectionsData ? examSectionsData.map((es: any) => es.section_id) : [] }, 
        questions: mapQuestionsWithMedia(questionsData || []) 
      };
      return result;
    } catch (err) { throw err; }
  }, []);

  const saveExam = useCallback(async (examData: Partial<Exam> & { section_ids?: string[] }, questions: Question[], isNew: boolean): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examData, questions, isNew, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save exam');
      await fetchExams();
      return result.examId;
    } catch (err) { throw err; }
  }, [user, fetchExams]);

  const fetchExamForStudent = useCallback(async (examId: string): Promise<ExamForStudent> => {
    if (!user) throw new Error('User not authenticated');
    try {
      if (currentRole === 'student') {
        let studentProfile = null;
        const { data: sp1 } = await supabase.from('students').select('section_id').eq('user_id', user.id).maybeSingle();
        if (sp1) studentProfile = sp1;
        else {
          const { data: sp2 } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
          if (sp2) studentProfile = sp2;
        }
        if (!studentProfile) throw new Error('حساب الطالب غير مكتمل');
      }

      const { data: examData, error: examError } = await supabase.from('exams').select('*, subject:subjects(name), teacher:teachers(users(full_name))').eq('id', examId).single();
      if (examError) throw examError;

      const { data: questionsData } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

      const result: any = {
        exam: {
          ...examData,
          subject_name: Array.isArray(examData.subject) ? examData.subject[0]?.name : examData.subject?.name,
          teacher_name: Array.isArray(examData.teacher?.users) ? examData.teacher.users[0]?.full_name : examData.teacher?.users?.full_name,
        },
        questions: mapQuestionsWithMedia(questionsData || [])
      };
      return result;
    } catch (err) { throw err; }
  }, [user, currentRole]);

  const submitExam = useCallback(async (examId: string, answers: Record<string, any>, score: number, status: string, timeSpent: number): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, answers, score, status, timeSpent, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit exam');
      await fetchExams();
      return result.attemptId;
    } catch (err: any) { throw err; }
  }, [user, fetchExams]);

  const deleteExam = useCallback(async (examId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId, userId: user.id }) });
      if (!response.ok) throw new Error('Failed to delete exam');
      await fetchExams();
    } catch (err) { throw err; }
  }, [user, fetchExams]);

  const deleteExamWithMedia = useCallback(async (examId: string): Promise<{ success: boolean }> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data: questions } = await supabase.from('questions').select('media_url').eq('exam_id', examId);
      if (questions && questions.length > 0) {
        for (const q of questions) {
          if (q.media_url) { try { await deleteFromCloudinary(q.media_url); } catch (e) {} }
        }
      }
      const response = await fetch('/api/exams/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId, userId: user.id }) });
      if (!response.ok) throw new Error('Failed to delete exam');
      await fetchExams();
      return { success: true };
    } catch (err: unknown) { throw err; }
  }, [user, fetchExams]);

  const fetchExamResults = useCallback(async (examId: string): Promise<ExamResults> => {
    try {
      const { data: examData, error: examError } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
      if (examError) throw examError;
      
      let studentsData: any[] = [];
      if (examData?.section_ids && examData.section_ids.length > 0) {
        const { data: students } = await supabase.from('students').select(`id, users(full_name, email), section:sections(name, classes(name))`).in('section_id', examData.section_ids);
        if (students) {
          studentsData = students.map((s: any) => ({
            id: s.id,
            full_name: s.users?.full_name || 'طالب غير معروف',
            email: s.users?.email || '',
            section_name: s.section?.name ? `${Array.isArray(s.section?.classes) ? s.section?.classes[0]?.name : s.section?.classes?.name} - ${s.section.name}` : 'غير محدد'
          }));
        }
      }

      const { data: attemptsData } = await supabase.from('exam_attempts').select(`*, student:students(id, users(full_name), section:sections(name, classes(name)))`).eq('exam_id', examId);
      const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
      
      let aData: any[] = [];
      if (attemptsData && attemptsData.length > 0) {
        const attemptIds = attemptsData.map((a: any) => a.id);
        const { data: answers } = await supabase.from('student_answers').select('*').in('attempt_id', attemptIds);
        if (answers) aData = answers;
      }

      const result: any = {
        exam: examData,
        students: studentsData,
        attempts: attemptsData || [],
        questions: mapQuestionsWithMedia(qData || []), 
        answers: aData || []
      };
      return result;
    } catch (err) { throw err; }
  }, []);

  const deleteAttempt = useCallback(async (attemptId: string): Promise<{ success: boolean }> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/delete-attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attemptId, userId: user.id }) });
      if (!response.ok) throw new Error('Failed to delete attempt');
      return { success: true };
    } catch (err) { throw err; }
  }, [user]);

  // ✅ استخدام حصري وأنيق للـ API الأصلي الذي بنيناه
  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string): Promise<StudentExamResult> => {
    try {
      const response = await fetch('/api/exams/student-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, studentId })
      });
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || 'فشل جلب النتيجة من السيرفر');

      const formattedAnswers = (result.answers || []).map((ans: any) => {
        if (ans.question) {
          const nq = normalizeQuestion(ans.question) as any;
          ans.question = { ...nq, mediaUrl: ans.question.media_url || ans.question.mediaUrl || nq.mediaUrl || nq.media_url || null, media_url: ans.question.media_url || ans.question.mediaUrl || nq.mediaUrl || nq.media_url || null };
        }
        return ans;
      });

      return {
        exam: result.exam,
        student: result.student || { id: studentId, users: { full_name: 'طالب' } },
        attempt: result.attempt || null,
        answers: formattedAnswers
      };
      
    } catch (err: any) { 
      throw err;
    }
  }, []);

  const gradeAnswer = useCallback(async (attemptId: string, questionId: string, pointsEarned: number): Promise<void> => {
    try {
      const response = await fetch('/api/exams/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, questionId, pointsEarned })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل تقييم الإجابة');
    } catch (err) { throw err; }
  }, []);

  return { data, loading, error, refetch: fetchExams, saveExam, submitExam, deleteExamWithMedia, deleteExam, fetchExamDetails, fetchExamForStudent, fetchExamResults, deleteAttempt, fetchStudentExamResult, gradeAnswer };
}


