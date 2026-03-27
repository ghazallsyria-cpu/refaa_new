import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    try {
      // استعلام مبسط وأكثر أماناً
      let query = supabase.from('exams').select('*, exam_attempts(score, status, student_id), questions(id)').order('created_at', { ascending: false });

      if (userRole === 'student') {
        const { data: profile } = await supabase.from('students').select('section_id').eq('id', user.id).single();
        if (profile?.section_id) {
          const { data: assigned } = await supabase.from('exam_sections').select('exam_id').eq('section_id', profile.section_id);
          const ids = assigned?.map(a => a.exam_id) || [];
          if (ids.length > 0) query = query.in('id', ids).eq('status', 'published');
          else { setData([]); setLoading(false); return; }
        } else {
          setData([]); setLoading(false); return;
        }
      }

      const { data: res, error: err } = await query;
      if (err) throw err;

      // جلب أسماء المواد بشكل منفصل لتجنب أخطاء الـ Joins المعقدة
      const { data: subjects } = await supabase.from('subjects').select('id, name');
      
      const mappedData = (res || []).map((e: any) => {
        const subj = subjects?.find(s => s.id === e.subject_id);
        const attempts = Array.isArray(e.exam_attempts) ? e.exam_attempts : [];
        const studentAttempt = attempts.find((a: any) => a.student_id === user.id);
        
        return {
          ...e,
          subject_name: subj?.name || 'مادة عامة',
          submission_count: attempts.length,
          avg_score: attempts.length > 0 ? Math.round(attempts.reduce((a:any, c:any)=>a+(c.score||0), 0)/attempts.length) : 0,
          question_count: Array.isArray(e.questions) ? e.questions.length : 0,
          score: studentAttempt?.score,
          submission_status: studentAttempt ? 'submitted' : 'pending'
        };
      });
      
      setData(mappedData);
    } catch (e: any) { 
      console.error("CRITICAL ERROR in fetchExams:", e);
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  }, [user, userRole]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const fetchExamDetails = useCallback(async (id: string) => {
    try {
      const { data: ex, error: exErr } = await supabase.from('exams').select('*').eq('id', id).single();
      if (exErr) throw exErr;

      const { data: sec } = await supabase.from('exam_sections').select('section_id').eq('exam_id', id);
      const { data: qs } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', id).order('order_index');
      
      return { 
        exam: { ...ex, section_ids: sec?.map(s=>s.section_id) || [] }, 
        questions: qs || [] 
      };
    } catch (err) {
      console.error("CRITICAL ERROR in fetchExamDetails:", err);
      throw err;
    }
  }, []);

  const fetchExamResults = useCallback(async (examId: string) => {
    try {
      const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
      
      // جلب المواد بشكل آمن
      const { data: subject } = await supabase.from('subjects').select('name').eq('id', exam?.subject_id).single();
      
      const { data: attempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId);
      
      // جلب الطلاب بشكل مسطح لتجنب أخطاء Joins
      const { data: assignedSections } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
      const sectionIds = assignedSections?.map(s => s.section_id) || [];
      
      let studentsData: any[] = [];
      if (sectionIds.length > 0) {
        const { data: students } = await supabase.from('students').select('id, section_id').in('section_id', sectionIds);
        
        // جلب الأسماء بشكل منفصل
        const studentIds = students?.map(s => s.id) || [];
        if (studentIds.length > 0) {
           const { data: usersData } = await supabase.from('users').select('id, full_name, email').in('id', studentIds);
           const { data: sectionsData } = await supabase.from('sections').select('id, name');
           
           studentsData = students?.map(s => {
             const userDetail = usersData?.find(u => u.id === s.id);
             const sectionDetail = sectionsData?.find(sec => sec.id === s.section_id);
             return {
               id: s.id,
               full_name: userDetail?.full_name || 'غير معروف',
               email: userDetail?.email || '',
               section_name: sectionDetail?.name || 'غير محدد'
             }
           }) || [];
        }
      }

      const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId);
      const { data: ans } = await supabase.from('student_answers').select('*').in('attempt_id', attempts?.map(a=>a.id) || []);

      return { 
        exam: { ...exam, subject: { name: subject?.name || 'غير محدد' } }, 
        students: studentsData, 
        attempts: attempts || [], 
        questions: qs || [], 
        answers: ans || [] 
      };
    } catch (err) {
      console.error("CRITICAL ERROR in fetchExamResults:", err);
      throw err;
    }
  }, []);

  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    try {
      const res = await fetch('/api/exams/save', { method: 'POST', body: JSON.stringify({ examData, questions, isNew, userId: user?.id }) });
      if (!res.ok) throw new Error('API Save Failed');
      await fetchExams();
    } catch (err) {
      console.error("CRITICAL ERROR in saveExam:", err);
      throw err;
    }
  }, [user, fetchExams]);

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

  const fetchExamForStudent = useCallback(async (id: string) => {
    const { data: ex } = await supabase.from('exams').select('*').eq('id', id).single();
    const { data: subj } = await supabase.from('subjects').select('name').eq('id', ex?.subject_id).single();
    const { data: qs } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', id).order('order_index');
    return { exam: { ...ex, subject: { name: subj?.name } }, questions: qs || [] };
  }, []);

  const submitExam = useCallback(async (eid: string, ans: any, score: number, status: string, time: number) => {
    await fetch('/api/exams/submit-exam', { method: 'POST', body: JSON.stringify({ examId: eid, answers: ans, score, status, timeSpent: time, userId: user?.id }) });
    await fetchExams();
  }, [user, fetchExams]);

  return {
    data, loading, error, refetch: fetchExams, saveExam, fetchExamDetails, deleteExamWithMedia, deleteAttempt, fetchExamResults, fetchExamForStudent, submitExam,
    fetchStudentExamResult: async (eid: string, sid: string) => {
      const { data: e } = await supabase.from('exams').select('*').eq('id', eid).single();
      const { data: subj } = await supabase.from('subjects').select('name').eq('id', e?.subject_id).single();
      const { data: u } = await supabase.from('users').select('full_name, email').eq('id', sid).single();
      const { data: a } = await supabase.from('exam_attempts').select('*').eq('exam_id', eid).eq('student_id', sid).maybeSingle();
      let ans: any[] = [];
      if (a?.id) {
         const { data: res } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', a.id);
         ans = res || [];
      }
      return { exam: { ...e, subject_name: subj?.name }, student: { id: sid, full_name: u?.full_name || 'غير معروف' }, attempt: a, answers: ans };
    }
  };
}


