import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. جلب الاختبارات (للقائمة الرئيسية)
  const fetchExams = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    try {
      let query = supabase.from('exams').select(`*, subject:subjects(name), teacher:teachers(users(full_name)), exam_attempts(score, status, student_id), questions(id)`).order('created_at', { ascending: false });

      if (userRole === 'student') {
        const { data: profile } = await supabase.from('students').select('section_id').eq('id', user.id).single();
        if (profile?.section_id) {
          const { data: assigned } = await supabase.from('exam_sections').select('exam_id').eq('section_id', profile.section_id);
          const ids = assigned?.map(a => a.exam_id) || [];
          if (ids.length > 0) query = query.in('id', ids).eq('status', 'published');
          else { setData([]); setLoading(false); return; }
        }
      }

      const { data: res, error: err } = await query;
      if (err) throw err;

      setData((res || []).map((e: any) => ({
        ...e,
        subject_name: e.subject?.name || 'مادة عامة',
        teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name,
        submission_count: e.exam_attempts?.length || 0,
        avg_score: e.exam_attempts?.length > 0 ? Math.round(e.exam_attempts.reduce((a:any,c:any)=>a+(c.score||0),0)/e.exam_attempts.length) : 0,
        question_count: e.questions?.length || 0,
        submission_status: e.exam_attempts?.some((a:any)=>a.student_id === user.id) ? 'submitted' : 'pending'
      })));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [user, userRole]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  // 2. جلب نتائج الاختبار (هذه الدالة التي تخدم صفحتك المذكورة)
  const fetchExamResults = useCallback(async (examId: string) => {
    // جلب بيانات الاختبار والمادة
    const { data: exam } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
    
    // جلب المحاولات مع بيانات الطالب (متوافقة مع كود صفحتك)
    const { data: attempts } = await supabase.from('exam_attempts')
      .select(`*, student:students(id, users:id(full_name, email), section:sections(id, name, classes(name)))`)
      .eq('exam_id', examId);

    // جلب الطلاب المسجلين في الصفوف المسند لها الاختبار
    const { data: sections } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
    const sectionIds = sections?.map(s => s.section_id) || [];
    
    let studentsData: any[] = [];
    if (sectionIds.length > 0) {
      const { data: st } = await supabase.from('students')
        .select(`id, users:id(full_name, email), section:sections(id, name, classes(name))`)
        .in('section_id', sectionIds);
      
      studentsData = st?.map((s: any) => ({
        id: s.id,
        full_name: Array.isArray(s.users) ? s.users[0]?.full_name : s.users?.full_name,
        email: Array.isArray(s.users) ? s.users[0]?.email : s.users?.email,
        section_name: s.section?.name || 'غير محدد'
      })) || [];
    }

    const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId);
    const { data: ans } = await supabase.from('student_answers').select('*').in('attempt_id', attempts?.map(a=>a.id) || []);

    return { 
      exam: { ...exam, subject_name: exam?.subject?.name }, 
      students: studentsData, 
      attempts: attempts || [], 
      questions: qs || [], 
      answers: ans || [] 
    };
  }, []);

  // 3. باقي الدوال الأساسية
  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    const res = await fetch('/api/exams/save', { method: 'POST', body: JSON.stringify({ examData, questions, isNew, userId: user?.id }) });
    if (!res.ok) throw new Error('Save failed');
    await fetchExams();
  }, [user, fetchExams]);

  const fetchExamDetails = useCallback(async (id: string) => {
    const { data: ex } = await supabase.from('exams').select('*').eq('id', id).single();
    const [sec, qs] = await Promise.all([
      supabase.from('exam_sections').select('section_id').eq('exam_id', id),
      supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', id).order('order_index')
    ]);
    return { exam: { ...ex, section_ids: sec.data?.map(s=>s.section_id) || [] }, questions: qs.data || [] };
  }, []);

  const deleteExamWithMedia = useCallback(async (id: string) => {
    const { data: qs } = await supabase.from('questions').select('media_url').eq('exam_id', id);
    if (qs) for (const q of qs) if (q.media_url) await deleteFromCloudinary(q.media_url);
    await supabase.from('exams').delete().eq('id', id);
    await fetchExams();
  }, [fetchExams]);

  const deleteAttempt = useCallback(async (id: string) => {
    await fetch('/api/exams/delete-attempt', { method: 'POST', body: JSON.stringify({ attemptId: id, userId: user?.id }) });
    await fetchExams();
  }, [user, fetchExams]);

  return {
    data, loading, error, refetch: fetchExams, saveExam, fetchExamDetails, deleteExamWithMedia, deleteAttempt, fetchExamResults,
    fetchExamForStudent: async (id: string) => {
      const { data: ex } = await supabase.from('exams').select(`*, subject:subjects(name)`).eq('id', id).single();
      const { data: qs } = await supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', id).order('order_index');
      return { exam: ex, questions: qs || [] };
    },
    submitExam: async (eid: string, ans: any, score: number, status: string, time: number) => {
      await fetch('/api/exams/submit-exam', { method: 'POST', body: JSON.stringify({ examId: eid, answers: ans, score, status, timeSpent: time, userId: user?.id }) });
      await fetchExams();
    },
    fetchStudentExamResult: async (eid: string, sid: string) => {
      const [e, s, a] = await Promise.all([
        supabase.from('exams').select('*, subject:subjects(name)').eq('id', eid).single(),
        supabase.from('students').select('*, users:id(full_name)').eq('id', sid).single(),
        supabase.from('exam_attempts').select('*').eq('exam_id', eid).eq('student_id', sid).maybeSingle()
      ]);
      const { data: ans } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', a.data?.id);
      return { exam: { ...e.data, subject_name: e.data?.subject?.name }, student: { ...s.data, full_name: s.data?.users?.full_name || s.data?.users?.[0]?.full_name }, attempt: a.data, answers: ans || [] };
    }
  };
}

