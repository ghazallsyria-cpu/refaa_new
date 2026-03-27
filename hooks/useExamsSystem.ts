import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  subject_name?: string;
  teacher_id: string;
  teacher_name?: string;
  start_time?: string;
  end_time?: string;
  exam_date?: string;
  duration?: number;
  passing_score?: number;
  status: 'draft' | 'published' | 'archived';
  section_id?: string;
  section_name?: string;
  created_at: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  score?: number;
  submission_count?: number;
  graded_count?: number;
  avg_score?: number;
  question_count?: number;
  section_ids?: string[];
}

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    try {
      let query = supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          section:sections(name),
          exam_attempts(score, status, student_id),
          questions(id)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'student') {
        const { data: profile } = await supabase.from('students').select('section_id').eq('id', user.id).single();
        if (profile?.section_id) {
          query = query.eq('section_id', profile.section_id).eq('status', 'published');
        } else {
          setData([]); setLoading(false); return;
        }
      }

      const { data: examsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mappedData = (examsData || []).map((e: any) => {
        const attempts = e.exam_attempts || [];
        const avgScore = attempts.length > 0 
          ? Math.round(attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / attempts.length) 
          : 0;

        return {
          ...e,
          subject_name: e.subject?.name || 'مادة عامة',
          teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name || 'معلم غير معروف',
          section_name: e.section?.name || 'غير محدد',
          submission_count: attempts.length,
          avg_score: avgScore,
          question_count: e.questions?.length || 0,
          submission_status: userRole === 'student' 
            ? (attempts.some((a: any) => a.student_id === user.id && (a.status === 'completed' || a.status === 'graded')) ? 'submitted' : 'pending')
            : undefined
        };
      });

      setData(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchExamDetails = useCallback(async (examId: string) => {
    const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (examError) throw examError;

    const [sectionsRes, questionsRes] = await Promise.all([
      supabase.from('exam_sections').select('section_id').eq('exam_id', examId),
      supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', examId).order('order_index')
    ]);

    return {
      exam: { ...examData, section_ids: sectionsRes.data?.map(es => es.section_id) || [] },
      questions: questionsRes.data || []
    };
  }, []);

  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examData, questions, isNew, userId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save');
    fetchExams();
    return result.examId;
  }, [user, fetchExams]);

  const fetchExamForStudent = useCallback(async (examId: string) => {
    const { data: exam, error } = await supabase.from('exams').select(`*, subject:subjects(name), teacher:teachers(users(full_name))`).eq('id', examId).single();
    if (error) throw error;
    const { data: questions } = await supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', examId).order('order_index');
    return { exam: { ...exam, subject_name: exam.subject?.name, teacher_name: exam.teacher?.users?.full_name }, questions: questions || [] };
  }, []);

  const submitExam = useCallback(async (examId: string, answers: any, score: number, status: string, timeSpent: number) => {
    const res = await fetch('/api/exams/submit-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, answers, score, status, timeSpent, userId: user?.id }),
    });
    if (!res.ok) throw new Error('Submit failed');
    fetchExams();
  }, [user, fetchExams]);

  const deleteExamWithMedia = useCallback(async (examId: string) => {
    const { data: qData } = await supabase.from('questions').select('media_url').eq('exam_id', examId);
    if (qData) {
      for (const q of qData) if (q.media_url) await deleteFromCloudinary(q.media_url);
    }
    await supabase.from('exams').delete().eq('id', examId);
    fetchExams();
  }, [fetchExams]);

  const fetchExamResults = useCallback(async (examId: string) => {
    const { data: examData } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
    const { data: attemptsData } = await supabase.from('exam_attempts').select(`*, student:students(id, users(full_name), section:sections(name))`).eq('exam_id', examId);
    const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
    let aData: any[] = [];
    if (attemptsData && attemptsData.length > 0) {
      const { data: answers } = await supabase.from('student_answers').select('*').in('attempt_id', attemptsData.map(a => a.id));
      aData = answers || [];
    }
    return { exam: examData, students: [], attempts: attemptsData || [], questions: qData || [], answers: aData };
  }, []);

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    // جلب البيانات مع الانتباه لعلاقة المستخدم (users)
    const [examRes, studentRes, attemptRes] = await Promise.all([
      supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single(),
      supabase.from('students').select('*, users:id(full_name)').eq('id', studentId).single(),
      supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).maybeSingle()
    ]);

    let answers = [];
    if (attemptRes.data) {
      const { data } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', attemptRes.data.id);
      answers = data || [];
    }

    const studentData = studentRes.data;
    const fullName = Array.isArray(studentData?.users) ? studentData.users[0]?.full_name : studentData?.users?.full_name;

    return {
      exam: { ...examRes.data, subject_name: examRes.data?.subject?.name },
      student: { ...studentData, full_name: fullName || 'طالب غير معروف' },
      attempt: attemptRes.data,
      answers
    };
  }, []);

  const deleteAttempt = useCallback(async (attemptId: string) => {
    const res = await fetch('/api/exams/delete-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, userId: user?.id }),
    });
    if (res.ok) fetchExams();
    return res.ok;
  }, [user, fetchExams]);

  return {
    data, loading, error, refetch: fetchExams,
    deleteExamWithMedia, fetchExamDetails, saveExam,
    fetchExamForStudent, submitExam, fetchExamResults,
    deleteAttempt, fetchStudentExamResult
  };
}

