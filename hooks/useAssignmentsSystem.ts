import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, any>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user || !currentRole) return;
    setLoading(true);
    try {
      let query = supabase.from('assignments').select('*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections(section_id, section:sections(name, class:classes(name)))').order('due_date', { ascending: true });

      if (currentRole === 'student') {
        const { data: stProfile } = await supabase.from('students').select('section_id').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
        if (stProfile?.section_id) {
           query = query.eq('assignment_sections.section_id', stProfile.section_id);
        } else {
           setData([]); setLoading(false); return;
        }
      } else if (currentRole === 'teacher') {
        const { data: tProfile } = await supabase.from('teachers').select('id').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
        if (tProfile) {
           query = query.eq('teacher_id', tProfile.id);
        } else {
           setData([]); setLoading(false); return;
        }
      }

      const { data: assignmentsData, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const mappedData = (assignmentsData || []).map((a: any) => ({
        ...a,
        subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.user) ? a.teacher.user[0]?.full_name : a.teacher?.user?.full_name,
      }));

      setData(mappedData);

      if (currentRole === 'student') {
        const { data: subData } = await supabase.from('assignment_submissions').select('assignment_id, status, grade, id').eq('student_id', user.id);
        const subMap: any = {};
        (subData || []).forEach((s: any) => { subMap[s.assignment_id] = s; });
        setStudentSubmissions(subMap);
      }

    } catch (err: any) {
      console.error("Fetch Assignments Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const saveAssignment = useCallback(async (payload: any, assignmentId: string | null, questions: any[], sectionIds: string[], subjects: any[]): Promise<string> => {
    const response = await fetch('/api/assignments/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, assignmentId, questions, sectionIds, subjects, userId: user?.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل حفظ الواجب'); // سيظهر الخطأ الدقيق بالإنجليزية هنا!
    await fetchAssignments();
    return result.id;
  }, [user, fetchAssignments]);

  const deleteAssignment = async (id: string) => {
     await fetch(`/api/assignments/delete?id=${id}`, { method: 'DELETE' });
     await fetchAssignments();
  };

  // دوال فارغة أو مبسطة لمنع أخطاء الواجهة
  const fetchAssignmentQuestions = async () => [];
  const fetchAssignmentDetails = async () => ({ assignment: {}, questions: [], submission: null, answers: [], allSubmissions: [] } as any);
  const submitAssignment = async () => "";
  const fetchSubmissionDetails = async () => ({ submission: {}, assignment: {}, questions: [], answers: [] } as any);
  const updateSubmissionGrade = async () => {};

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade };
}


