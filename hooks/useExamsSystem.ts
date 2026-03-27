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

  // 1. دالة جلب قائمة الاختبارات (محسنة السرعة)
  const fetchExams = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    setError(null);
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
        const { data: studentProfile } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();

        if (studentProfile?.section_id) {
          query = query.eq('section_id', studentProfile.section_id).eq('status', 'published');
        } else {
          setData([]);
          setLoading(false);
          return;
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
          graded_count: attempts.filter((a: any) => a.status === 'graded' || a.status === 'completed').length,
          avg_score: avgScore,
          question_count: e.questions?.length || 0,
          submission_status: userRole === 'student' 
            ? (attempts.some((a: any) => a.student_id === user.id && (a.status === 'completed' || a.status === 'graded')) ? 'submitted' : 'pending')
            : undefined
        };
      });

      setData(mappedData);
    } catch (err: any) {
      console.error("Error fetching exams:", err);
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // 2. دالة جلب تفاصيل الاختبار (للمحرر - Builder)
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

  // 3. دالة حفظ الاختبار
  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examData, questions, isNew, userId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save exam');
    
    await fetchExams(); // تحديث القائمة
    return result.examId;
  }, [user, fetchExams]);

  // 4. دالة جلب الاختبار للطالب (بدء الاختبار)
  const fetchExamForStudent = useCallback(async (examId: string) => {
    const { data: exam, error: eErr } = await supabase
      .from('exams')
      .select(`*, subject:subjects(name), teacher:teachers(users(full_name))`)
      .eq('id', examId)
      .single();
    
    if (eErr) throw eErr;

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select(`*, options:question_options(*)`)
      .eq('exam_id', examId)
      .order('order_index');

    if (qErr) throw qErr;

    return {
      exam: {
        ...exam,
        subject_name: exam.subject?.name,
        teacher_name: Array.isArray(exam.teacher?.users) ? exam.teacher.users[0]?.full_name : exam.teacher?.users?.full_name,
      },
      questions: questions || []
    };
  }, []);

  // 5. دالة تسليم الإجابات
  const submitExam = useCallback(async (examId: string, answers: any, score: number, status: string, timeSpent: number) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/exams/submit-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, answers, score, status, timeSpent, userId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit exam');
    
    await fetchExams();
    return result.attemptId;
  }, [user, fetchExams]);

  // 6. دالة الحذف الذكي (تحذف من Cloudinary ثم من Supabase)
  const deleteExamWithMedia = useCallback(async (examId: string) => {
    if (!user) throw new Error('User not authenticated');
    try {
      // جلب روابط الصور لكل الأسئلة في هذا الاختبار
      const { data: questions } = await supabase.from('questions').select('media_url').eq('exam_id', examId);

      // مسح الصور من Cloudinary
      if (questions) {
        for (const q of questions) {
          if (q.media_url) {
            await deleteFromCloudinary(q.media_url);
          }
        }
      }

      // حذف الاختبار من قاعدة البيانات
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;

      await fetchExams();
      return { success: true };
    } catch (err: any) {
      console.error('Error in deleteExamWithMedia:', err);
      throw err;
    }
  }, [user, fetchExams]);

  // 7. دالة جلب نتائج الاختبار للمعلم (التحليلات)
  const fetchExamResults = useCallback(async (examId: string) => {
    const { data: examData } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
    
    // جلب كل المحاولات مع بيانات الطلاب والفصول
    const { data: attemptsData } = await supabase
      .from('exam_attempts')
      .select(`*, student:students(id, users(full_name), section:sections(name))`)
      .eq('exam_id', examId);

    const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);

    let aData: any[] = [];
    if (attemptsData && attemptsData.length > 0) {
      const { data: answers } = await supabase.from('student_answers').select('*').in('attempt_id', attemptsData.map(a => a.id));
      aData = answers || [];
    }

    return { 
      exam: examData, 
      students: [], // سيتم معالجتها في الصفحة بناءً على الفصول
      attempts: attemptsData || [], 
      questions: qData || [], 
      answers: aData 
    };
  }, []);

  // 8. حذف محاولة محددة
  const deleteAttempt = useCallback(async (attemptId: string) => {
    if (!user) return false;
    const response = await fetch('/api/exams/delete-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, userId: user.id }),
    });
    if (response.ok) {
      await fetchExams();
      return true;
    }
    return false;
  }, [user, fetchExams]);

  // 9. دالة جلب نتيجة تفصيلية لطالب محدد (للمراجعة)
  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    // جلب الاختبار والمادة والطالب في طلب واحد
    const [examRes, studentRes, attemptRes] = await Promise.all([
      supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single(),
      supabase.from('students').select('*, users:id(full_name, email)').eq('id', studentId).single(),
      supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).maybeSingle()
    ]);

    if (examRes.error) throw examRes.error;
    if (studentRes.error) throw studentRes.error;

    let answersData = [];
    if (attemptRes.data) {
      const { data: answers } = await supabase
        .from('student_answers')
        .select('*, question:questions(*, options:question_options(*))')
        .eq('attempt_id', attemptRes.data.id);
      answersData = answers || [];
    }

    return {
      exam: { ...examRes.data, subject_name: examRes.data?.subject?.name },
      student: { 
        ...studentRes.data, 
        full_name: Array.isArray(studentRes.data.users) ? studentRes.data.users[0]?.full_name : studentRes.data.users?.full_name 
      },
      attempt: attemptRes.data,
      answers: answersData
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchExams,
    fetchExamDetails,
    saveExam,
    fetchExamForStudent,
    submitExam,
    deleteExamWithMedia,
    fetchExamResults,
    deleteAttempt,
    fetchStudentExamResult
  };
}

