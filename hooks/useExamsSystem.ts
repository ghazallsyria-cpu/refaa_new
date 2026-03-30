import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useExamsSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!user || !currentRole) return;
    setLoading(true);
    try {
      let query = supabase.from('exams').select('*, subject:subjects(name)').order('created_at', { ascending: false });

      if (currentRole === 'teacher') {
        // جلب الاختبارات باستخدام المعرفين (الدخول والملف الشخصي) لضمان عدم ضياع أي اختبار
        const { data: tProfile } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        const tId = tProfile ? tProfile.id : user.id;
        query = query.or(`teacher_id.eq.${user.id},teacher_id.eq.${tId}`);
      } 
      else if (currentRole === 'student') {
         query = query.eq('status', 'published'); // للطالب، نجلب المنشور فقط مبدئياً
      }

      const { data: examsData, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      let mapped = (examsData || []).map((e: any) => ({
        ...e,
        subject_name: Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name,
      }));

      setData(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const saveExam = useCallback(async (examData: any, questions: any[], isNew: boolean) => {
    const response = await fetch('/api/exams/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examData, questions, isNew, userId: user?.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل الحفظ');
    await fetchExams();
    return result.examId;
  }, [user, fetchExams]);

  const submitExam = useCallback(async (examId: string, answers: any, score: number, status: string) => {
    const response = await fetch('/api/exams/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, answers, score, status, userId: user?.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل التسليم'); // ستعرض الخطأ الحقيقي الآن!
    return result.attemptId;
  }, [user]);

  // دوال فارغة مؤقتاً لتجنب أخطاء الواجهة أثناء هذا الاختبار الحرج
  const deleteExamWithMedia = async () => {};
  const deleteExam = async () => {};
  const fetchExamDetails = async () => ({ exam: {}, questions: [] } as any);
  const fetchExamForStudent = async () => ({ exam: {}, questions: [] } as any);
  const fetchExamResults = async () => ({ exam: {}, students: [], attempts: [], questions: [], answers: [] } as any);

  return { data, loading, error, refetch: fetchExams, saveExam, submitExam, deleteExamWithMedia, deleteExam, fetchExamDetails, fetchExamForStudent, fetchExamResults };
}


