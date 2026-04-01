import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: any[]; // تم التعديل لدعم media_url
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user || !currentRole) return;
    setLoading(true);
    setError(null);
    try {
      // 🚀 1. العودة للاستعلام المباشر الناجح (بدون API إضافية)
      const selectQuery = currentRole === 'student' 
        ? `*, subject:subjects(name), teacher:teachers(users(full_name)), assignment_sections!inner(section_id, sections(name, classes(name)))`
        : `*, subject:subjects(name), teacher:teachers(users(full_name)), assignment_sections(section_id, sections(name, classes(name)))`;

      let query = supabase.from('assignments').select(selectQuery).order('created_at', { ascending: false });

      if (currentRole === 'student') {
        let studentProfile = null;
        const { data: sp1 } = await supabase.from('students').select('id, section_id').eq('user_id', user.id).maybeSingle();
        if (sp1) studentProfile = sp1;
        else {
          const { data: sp2 } = await supabase.from('students').select('id, section_id').eq('id', user.id).maybeSingle();
          if (sp2) studentProfile = sp2;
        }

        if (studentProfile?.section_id) {
          query = query.eq('assignment_sections.section_id', studentProfile.section_id).eq('status', 'published');
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
          
        if (teacherProfile) {
          query = query.eq('teacher_id', teacherProfile.id);
        } else {
          setData([]); setLoading(false); return;
        }
      }

      const { data: assignmentsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mappedData: AssignmentWithMeta[] = (assignmentsData || []).map((a: any) => ({
        ...a,
        subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.users) ? a.teacher.users[0]?.full_name : a.teacher?.users?.full_name,
        section_name: a.assignment_sections && a.assignment_sections.length > 0 
           ? a.assignment_sections.map((es: any) => es.sections?.name).join('، ') 
           : 'غير محدد',
      }));

      if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const assignmentsWithStats = await Promise.all(mappedData.map(async (a) => {
          const { data: attempts } = await supabase.from('assignment_submissions').select('status').eq('assignment_id', a.id);
          const subs = attempts || [];
          return {
            ...a,
            submission_count: subs.length,
            graded_count: subs.filter(s => s.status === 'graded').length,
          };
        }));
        mappedData = assignmentsWithStats;
      }

      if (currentRole === 'student') {
        const { data: subData } = await supabase.from('assignment_submissions').select('assignment_id, status, grade, id, student_id, submitted_at').eq('student_id', user.id);
        const subMap: Record<string, AssignmentSubmission> = {};
        (subData || []).forEach((s: any) => { subMap[s.assignment_id] = s; });
        setStudentSubmissions(subMap);
      }

      setData(mappedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching assignments');
      console.error("Hook Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      if (error) throw error;
      return (data || []).map((q: any) => {
        const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
        return { ...nq, media_url: q.media_url }; // 🚀 دعم الصورة للسؤال الفردي هنا
      });
    } catch (err) { return []; }
  }, []);

  const saveAssignment = useCallback(async (payload: Partial<Assignment>, assignmentId: string | null, questions: any[], sectionIds: string[], subjects: Subject[]): Promise<string> => {
    const response = await fetch('/api/assignments/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, assignmentId, questions, sectionIds, subjects, userId: user?.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل حفظ الواجب');
    await fetchAssignments();
    return result.id;
  }, [user, fetchAssignments]);

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    const response = await fetch(`/api/assignments/delete?id=${assignmentId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string): Promise<AssignmentDetails> => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase.from('assignments').select(`*, subject:subjects(name), teacher:teachers(users(full_name)), assignment_sections(section_id, sections(name, classes(name)))`).eq('id', assignmentId).single();
      if (assignmentError) throw assignmentError;

      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      let submissionData: AssignmentSubmission | null = null;
      let answersData: AssignmentAnswer[] = [];
      let allSubmissionsData: SubmissionWithStudent[] = [];

      if (currentRole === 'student' && user) {
        const { data: subData } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', user.id).maybeSingle();
        if (subData) {
          submissionData = subData as AssignmentSubmission;
          const { data: aData } = await supabase.from('assignment_answers').select('*').eq('submission_id', subData.id);
          answersData = (aData as AssignmentAnswer[]) || [];
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const { data: subsData } = await supabase.from('assignment_submissions').select(`*, student:students(users(full_name, email), sections(name, classes(name)))`).eq('assignment_id', assignmentId).order('submitted_at', { ascending: false });
        if (subsData) allSubmissionsData = subsData as unknown as SubmissionWithStudent[];
      }

      return {
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => {
           const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
           return { ...nq, media_url: q.media_url }; // 🚀 دعم الصورة هنا أيضاً
        }),
        submission: submissionData,
        answers: answersData,
        allSubmissions: allSubmissionsData
      };
    } catch (err) { throw err; }
  }, [user, currentRole]);

  const submitAssignment = useCallback(async (
    assignmentId: string, 
    answers: RawAssignmentAnswer[], 
    submissionId?: string,
    content?: string,
    fileUrl?: string
  ): Promise<string> => {
    const studentName = user?.user_metadata?.full_name || 'طالب';
    const response = await fetch('/api/assignments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assignmentId, 
        studentId: user?.id, 
        studentName, 
        answers, 
        submissionId,
        content,
        fileUrl
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit assignment');
    return result.id;
  }, [user]);

  const fetchSubmissionDetails = useCallback(async (submissionId: string) => {
    try {
      const { data: submissionData, error: subError } = await supabase.from('assignment_submissions').select(`*, student:students(users(full_name, email), sections(name, classes(name)))`).eq('id', submissionId).single();
      if (subError) throw subError;
      
      const { data: assignmentData } = await supabase.from('assignments').select('*, subject:subjects(name)').eq('id', (submissionData as any).assignment_id).single();
      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', (submissionData as any).assignment_id).order('order');
      const { data: answersData } = await supabase.from('assignment_answers').select('*').eq('submission_id', submissionId);

      return {
        submission: submissionData as unknown as SubmissionWithStudent,
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => {
          const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
          return { ...nq, media_url: q.media_url }; // 🚀 دعم الصورة هنا أيضاً
        }),
        answers: (answersData as AssignmentAnswer[]) || []
      };
    } catch (err) { throw err; }
  }, []);

  // 🚀 المحافظة على دالة التقييم الجديدة التي تدعم مراجعة الأسئلة الفردية
  const updateSubmissionGrade = useCallback(async (
    submissionId: string, 
    grade: number, 
    feedback: string, 
    studentId: string, 
    assignmentTitle: string,
    answersGrading?: any[]
  ): Promise<void> => {
    const response = await fetch('/api/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback, studentId, assignmentTitle, answersGrading }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update grade');
  }, []);

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade };
}
