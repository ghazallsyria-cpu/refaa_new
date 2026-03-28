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
      let query = supabase.from('exams').select(`*, subject:subjects(name), teacher:teachers(users(full_name)), exam_attempts(score, status, student_id), questions(id)`).order('created_at', { ascending: false });

      if (userRole === 'student') {
        const { data: profile } = await supabase.from('students').select('section_id').eq('id', user.id).maybeSingle();
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

  const fetchExamResults = useCallback(async (examId: string) => {
    try {
      const { data: exam } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).maybeSingle();
      const { data: attempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId);
      
      const { data: sections } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
      const sectionIds = sections?.map(s => s.section_id) || [];
      const attemptStudentIds = attempts?.map(a => a.student_id) || [];
      
      let studentsQuery = supabase.from('students').select(`id, users(full_name, email), section:sections(id, name, classes(name))`);
      
      if (sectionIds.length > 0) {
        studentsQuery = studentsQuery.in('section_id', sectionIds);
      } else if (attemptStudentIds.length > 0) {
        studentsQuery = studentsQuery.in('id', attemptStudentIds);
      }

      const { data: st } = await studentsQuery;
      // تصحيح الخطأ هنا: إعطاء rawStudents النوع any[] صراحةً لمنع تعارض TypeScript
      let rawStudents: any[] = st || [];

      const fetchedStudentIds = new Set(rawStudents.map((s: any) => s.id));
      const missingStudentIds = attemptStudentIds.filter(id => !fetchedStudentIds.has(id));
      
      if (missingStudentIds.length > 0) {
         // تصحيح الخطأ هنا: توحيد الاستعلام ليكون مطابقاً تماماً للاستعلام الأول بإضافة classes(name)
         const { data: missingSt } = await supabase.from('students').select(`id, users(full_name, email), section:sections(id, name, classes(name))`).in('id', missingStudentIds);
         rawStudents = [...rawStudents, ...(missingSt || [])];
      }

      const idsNeedNames = rawStudents.filter((s: any) => !s.users).map((s: any) => s.id);
      let manualUsers: any[] = [];
      if (idsNeedNames.length > 0) {
         const { data: mu } = await supabase.from('users').select('id, full_name, email').in('id', idsNeedNames);
         manualUsers = mu || [];
      }

      const finalStudentsData = rawStudents.map((s: any) => {
        let fName = 'طالب غير معروف';
        let eMail = '';
        
        if (s.users) {
          fName = Array.isArray(s.users) ? s.users[0]?.full_name : s.users?.full_name;
          eMail = Array.isArray(s.users) ? s.users[0]?.email : s.users?.email;
        } else {
          const manual = manualUsers.find(u => u.id === s.id);
          if (manual) {
             fName = manual.full_name;
             eMail = manual.email;
          }
        }

        // معالجة اسم الصف (في حال كان هناك اسم فصل من جدول classes)
        let finalSectionName = s.section?.name || 'غير محدد';
        const className = Array.isArray(s.section?.classes) ? s.section?.classes[0]?.name : s.section?.classes?.name;
        if (className && s.section?.name) {
            finalSectionName = `${className} - ${s.section.name}`;
        }

        return {
          id: s.id,
          full_name: fName || 'طالب غير معروف',
          email: eMail || '',
          section_name: finalSectionName
        };
      });

      const { data: qs } = await supabase.from('questions').select('*').eq('exam_id', examId);
      const { data: ans } = await supabase.from('student_answers').select('*').in('attempt_id', attempts?.map(a=>a.id) || []);

      return { 
        exam: { ...exam, subject_name: exam?.subject?.name }, 
        students: finalStudentsData, 
        attempts: attempts || [], 
        questions: qs || [], 
        answers: ans || [] 
      };
    } catch (err) {
      console.error(err);
      return { exam: null, students: [], attempts: [], questions: [], answers: [] };
    }
  }, []);

  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    const res = await fetch('/api/exams/save', { method: 'POST', body: JSON.stringify({ examData, questions, isNew, userId: user?.id }) });
    if (!res.ok) throw new Error('Save failed');
    await fetchExams();
  }, [user, fetchExams]);

  const fetchExamDetails = useCallback(async (id: string) => {
    const { data: ex } = await supabase.from('exams').select('*').eq('id', id).maybeSingle();
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

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    const [eRes, sRes, aRes] = await Promise.all([
      supabase.from('exams').select('*').eq('id', examId).maybeSingle(),
      supabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle(),
      supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).maybeSingle()
    ]);
    
    let subjectName = 'مادة عامة';
    if (eRes.data?.subject_id) {
       const { data: subj } = await supabase.from('subjects').select('name').eq('id', eRes.data.subject_id).maybeSingle();
       if (subj) subjectName = subj.name;
    }
    
    let answers = [];
    if (aRes.data?.id) {
      const { data: ans } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', aRes.data.id);
      answers = ans || [];
    }
    
    let fullName = Array.isArray(sRes.data?.users) ? sRes.data?.users[0]?.full_name : sRes.data?.users?.full_name;

    if (!fullName) {
      const { data: uRes } = await supabase.from('users').select('full_name').eq('id', studentId).maybeSingle();
      fullName = uRes?.full_name;
    }

    return { 
      exam: { ...eRes.data, subject_name: subjectName }, 
      student: { ...sRes.data, full_name: fullName || 'طالب غير معروف' }, 
      attempt: aRes.data, 
      answers 
    };
  }, []);

  return {
    data, loading, error, refetch: fetchExams, saveExam, fetchExamDetails, deleteExamWithMedia, deleteAttempt, fetchExamResults, fetchStudentExamResult,
    fetchExamForStudent: async (id: string) => {
      const { data: ex } = await supabase.from('exams').select(`*, subject:subjects(name)`).eq('id', id).maybeSingle();
      const { data: qs } = await supabase.from('questions').select(`*, options:question_options(*)`).eq('exam_id', id).order('order_index');
      return { exam: { ...ex, subject_name: ex?.subject?.name }, questions: qs || [] };
    },
    submitExam: async (eid: string, ans: any, score: string | number, status: string, time: number) => {
      await fetch('/api/exams/submit-exam', { method: 'POST', body: JSON.stringify({ examId: eid, answers: ans, score, status, timeSpent: time, userId: user?.id }) });
      await fetchExams();
    }
  };
}


