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
  settings?: any;
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
          exam_attempts(score, status, student_id),
          questions(id)
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'student') {
        const { data: profile } = await supabase.from('students').select('section_id').eq('id', user.id).single();
        if (profile?.section_id) {
          const { data: assigned } = await supabase.from('exam_sections').select('exam_id').eq('section_id', profile.section_id);
          const examIds = assigned?.map(a => a.exam_id) || [];
          if (examIds.length > 0) {
            query = query.in('id', examIds).eq('status', 'published');
          } else {
            setData([]); setLoading(false); return;
          }
        }
      }

      const { data: examsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mappedData = (examsData || []).map((e: any) => {
        const attempts = e.exam_attempts || [];
        const studentAttempt = attempts.find((a: any) => a.student_id === user.id);
        return {
          ...e,
          subject_name: e.subject?.name || 'مادة عامة',
          teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name || 'معلم غير معروف',
          submission_count: attempts.length,
          avg_score: attempts.length > 0 ? Math.round(attempts.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / attempts.length) : 0,
          question_count: e.questions?.length || 0,
          score: studentAttempt?.score,
          submission_status: studentAttempt ? 'submitted' : 'pending'
        };
      });

      setData(mappedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const fetchExamDetails = useCallback(async (examId: string) => {
    const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (examError) throw examError;
    const [secRes, qRes] = await Promise.all([
      supabase.from('exam_sections').select('section_id').eq('exam_id', examId),
      supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', examId).order('order_index')
    ]);
    return {
      exam: { ...examData, section_ids: secRes.data?.map(s => s.section_id) || [] },
      questions: qRes.data || []
    };
  }, []);

  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    const res = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examData, questions, isNew, userId: user?.id }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    fetchExams();
    return result.examId;
  }, [user, fetchExams]);

  const fetchExamForStudent = useCallback(async (examId: string) => {
    const { data: exam } = await supabase.from('exams').select(`*, subject:subjects(name)`).eq('id', examId).single();
    const { data: questions } = await supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', examId).order('order_index');
    return { exam, questions: questions || [] };
  }, []);

  const submitExam = useCallback(async (examId: string, answers: any, score: number, status: string, timeSpent: number) => {
    await fetch('/api/exams/submit-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, answers, score, status, timeSpent, userId: user?.id }),
    });
    fetchExams();
  }, [user, fetchExams]);

  const deleteExamWithMedia = useCallback(async (examId: string) => {
    const { data: qs } = await supabase.from('questions').select('media_url').eq('exam_id', examId);
    if (qs) for (const q of qs) if (q.media_url) await deleteFromCloudinary(q.media_url);
    await supabase.from('exams').delete().eq('id', examId);
    fetchExams();
  }, [fetchExams]);

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    const [eRes, sRes, aRes] = await Promise.all([
      supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single(),
      supabase.from('students').select('*, users:id(full_name)').eq('id', studentId).single(),
      supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).maybeSingle()
    ]);
    let answers = [];
    if (aRes.data) {
      const { data } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', aRes.data.id);
      answers = data || [];
    }
    const fullName = Array.isArray(sRes.data?.users) ? sRes.data.users[0]?.full_name : sRes.data?.users?.full_name;
    return { exam: { ...eRes.data, subject_name: eRes.data?.subject?.name }, student: { ...sRes.data, full_name: fullName }, attempt: aRes.data, answers };
  }, []);

  const fetchExamResults = useCallback(async (examId: string) => {
    const { data: exam } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
    const { data: attempts } = await supabase.from('exam_attempts').select(`*, student:students(id, users(full_name), section:sections(name))`).eq('exam_id', examId);
    return { exam, attempts: attempts || [], questions: [], answers: [] };
  }, []);

  const deleteAttempt = useCallback(async (id: string) => {
    await fetch('/api/exams/delete-attempt', { method: 'POST', body: JSON.stringify({ attemptId: id, userId: user?.id }) });
    fetchExams();
  }, [user, fetchExams]);

  return { data, loading, error, refetch: fetchExams, fetchExamDetails, saveExam, fetchExamForStudent, submitExam, deleteExamWithMedia, fetchStudentExamResult, fetchExamResults, deleteAttempt };
}

