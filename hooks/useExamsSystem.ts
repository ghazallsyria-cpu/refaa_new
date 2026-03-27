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

  // 1. جلب قائمة الاختبارات
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
          section:sections(name)
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

      let mappedData = (examsData || []).map((e: any) => ({
        ...e,
        subject_name: e.subject?.name || 'مادة عامة',
        teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name || 'معلم غير معروف',
        section_name: e.section?.name || 'غير محدد',
      }));

      if (['teacher', 'admin', 'management'].includes(userRole)) {
        const examsWithStats = await Promise.all(mappedData.map(async (e: any) => {
          const [attemptsRes, questionsRes] = await Promise.all([
            supabase.from('exam_attempts').select('score, status').eq('exam_id', e.id),
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', e.id)
          ]);
          
          const attempts = attemptsRes.data || [];
          const avgScore = attempts.length > 0 
            ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length) 
            : 0;
            
          return {
            ...e,
            submission_count: attempts.length,
            graded_count: attempts.filter(a => a.status === 'graded' || a.status === 'completed').length,
            avg_score: avgScore,
            question_count: questionsRes.count || 0
          };
        }));
        mappedData = examsWithStats;
      }

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

  // 2. جلب تفاصيل الاختبار (للـ Builder)
  const fetchExamDetails = async (examId: string) => {
    const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (examError) throw examError;

    const { data: examSectionsData } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
    
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select(`*, options:question_options(*)`)
      .eq('exam_id', examId)
      .order('order_index');

    if (questionsError) throw questionsError;

    return {
      exam: {
        ...examData,
        section_ids: examSectionsData ? examSectionsData.map(es => es.section_id) : []
      },
      questions: questionsData || []
    };
  };

  // 3. حفظ الاختبار
  const saveExam = async (examData: any, questions: any[], isNew: boolean) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examData, questions, isNew, userId: user.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save exam');
    await fetchExams();
    return result.examId;
  };

  // 4. جلب اختبار للطالب
  const fetchExamForStudent = async (examId: string) => {
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select(`*, subject:subjects(name), teacher:teachers(users(full_name))`)
      .eq('id', examId)
      .single();

    if (examError) throw examError;

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select(`*, options:question_options(*)`)
      .eq('exam_id', examId)
      .order('order_index');

    if (questionsError) throw questionsError;

    return {
      exam: {
        ...examData,
        subject_name: examData.subject?.name,
        teacher_name: Array.isArray(examData.teacher?.users) ? examData.teacher.users[0]?.full_name : examData.teacher?.users?.full_name,
      },
      questions: questionsData || []
    };
  };

  // 5. تسليم الاختبار
  const submitExam = async (examId: string, answers: any, score: number, status: string, timeSpent: number) => {
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
  };

  // 6. حذف الاختبار
  const deleteExam = async (examId: string) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch('/api/exams/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, userId: user.id }),
    });
    if (!response.ok) throw new Error('Failed to delete exam');
    await fetchExams();
  };

  // 7. حذف الاختبار مع الميديا
  const deleteExamWithMedia = async (examId: string) => {
    try {
      const { data: qData } = await supabase.from('questions').select('media_url').eq('exam_id', examId);
      if (qData) {
        for (const q of qData) {
          if (q.media_url) await deleteFromCloudinary(q.media_url);
        }
      }
      await deleteExam(examId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // 8. جلب نتائج اختبار كاملة
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

  // 9. حذف محاولة
  const deleteAttempt = useCallback(async (attemptId: string) => {
    const response = await fetch('/api/exams/delete-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, userId: user?.id }),
    });
    return response.ok;
  }, [user]);

  // 10. جلب نتيجة طالب (مُحدثة لجلب اسم المادة واسم الطالب)
  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    // جلب الاختبار مع المادة
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*, subject:subjects(name)')
      .eq('id', examId)
      .single();

    if (examError) throw examError;

    // جلب الطالب مع الاسم
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*, users:id(full_name)')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // جلب المحاولة
    const { data: attemptData } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle();

    // جلب الإجابات
    let answersData = [];
    if (attemptData) {
      const { data: answers } = await supabase
        .from('student_answers')
        .select('*, question:questions(*, options:question_options(*))')
        .eq('attempt_id', attemptData.id);
      answersData = answers || [];
    }

    return {
      exam: { ...examData, subject_name: examData.subject?.name || 'مادة عامة' },
      student: { 
        ...studentData, 
        full_name: Array.isArray(studentData.users) ? studentData.users[0]?.full_name : studentData.users?.full_name 
      },
      attempt: attemptData,
      answers: answersData
    };
  }, []);

  // المخرجات النهائية (تم الربط بالدوال الحقيقية لمنع خطأ الـ Build)
  return {
    data, loading, error, 
    refetch: fetchExams,
    deleteExam, 
    deleteExamWithMedia, 
    fetchExamDetails, 
    saveExam,
    fetchExamForStudent, 
    submitExam, 
    fetchExamResults,
    deleteAttempt, 
    fetchStudentExamResult 
  };
}

