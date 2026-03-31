import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: Question[];
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as { user: { id: string, user_metadata?: any } | null, authRole: string | null, userRole: string | null };
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user?.id || !currentRole) return;
    setLoading(true);
    setError(null);
    try {
      const selectQuery = currentRole === 'student' 
        ? `*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections!inner(section_id, section:sections(name, class:classes(name)))`
        : `*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections(section_id, section:sections(name, class:classes(name)))`;

      let query = supabase.from('assignments').select(selectQuery).order('due_date', { ascending: true });

      if (currentRole === 'student') {
        const { data: stProfile } = await supabase.from('students').select('section_id').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
        if (stProfile?.section_id) {
           query = query.eq('assignment_sections.section_id', stProfile.section_id);
        } else {
           setData([]); setLoading(false); return;
        }
      } else if (currentRole === 'teacher') {
        const { data: tProfile } = await supabase.from('teachers').select('id').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
        if (tProfile?.id) {
           query = query.eq('teacher_id', tProfile.id);
        } else {
           setData([]); setLoading(false); return;
        }
      }

      const { data: assignmentsData, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const mappedData: AssignmentWithMeta[] = (assignmentsData || []).map((a: unknown) => {
        const assignment = a as any;
        return {
          ...assignment,
          created_at: assignment.created_at || new Date().toISOString(),
          subject_name: Array.isArray(assignment.subject) ? assignment.subject[0]?.name : assignment.subject?.name,
          teacher_name: Array.isArray(assignment.teacher?.user) ? assignment.teacher.user[0]?.full_name : assignment.teacher?.user?.full_name,
        };
      });

      setData(mappedData);

      if (currentRole === 'student') {
        const { data: subData } = await supabase.from('assignment_submissions').select('assignment_id, status, grade, id, student_id, submitted_at').eq('student_id', user.id);
        const subMap: Record<string, AssignmentSubmission> = {};
        (subData || []).forEach((s: unknown) => { 
            const submission = s as AssignmentSubmission;
            subMap[submission.assignment_id] = submission; 
        });
        setStudentSubmissions(subMap);
      }

      if (['teacher', 'admin', 'management'].includes(currentRole)) {
        const { data: countsData } = await supabase.from('assignment_submissions').select('assignment_id, status');
        if (countsData) {
          const updatedData = mappedData.map(a => {
            const subs = countsData.filter((s: { assignment_id: string, status: string }) => s.assignment_id === a.id);
            return { ...a, submission_count: subs.length, graded_count: subs.filter((s: { status: string }) => s.status === 'graded').length };
          });
          setData(updatedData);
        }
      }
    } catch (err: unknown) {
      console.error("Fetch Assignments Error:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      if (error) throw error;
      return (data || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required }));
    } catch (err) { return []; }
  }, []);

  const saveAssignment = useCallback(async (payload: Partial<Assignment>, assignmentId: string | null, questions: Question[], sectionIds: string[], subjects: Subject[]): Promise<string> => {
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
      const { data: assignmentData, error: assignmentError } = await supabase.from('assignments').select(`*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections(section_id, section:sections(name, class:classes(name)))`).eq('id', assignmentId).single();
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
        const { data: subsData } = await supabase.from('assignment_submissions').select(`*, student:students(user:users(full_name, email), section:sections(name, class:classes(name)))`).eq('assignment_id', assignmentId).order('submitted_at', { ascending: false });
        if (subsData) allSubmissionsData = subsData as unknown as SubmissionWithStudent[];
      }

      return {
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required })),
        submission: submissionData,
        answers: answersData,
        allSubmissions: allSubmissionsData
      };
    } catch (err) { throw err; }
  }, [user, currentRole]);

  // 🚀 إرسال النص والملف إلى السيرفر بنجاح
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
      const { data: submissionData, error: subError } = await supabase.from('assignment_submissions').select(`*, student:students(user:users(full_name, email), section:sections(name, class:classes(name)))`).eq('id', submissionId).single();
      if (subError) throw subError;
      const { data: assignmentData } = await supabase.from('assignments').select('*, subject:subjects(name)').eq('id', (submissionData as any).assignment_id).single();
      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', (submissionData as any).assignment_id).order('order');
      const { data: answersData } = await supabase.from('assignment_answers').select('*').eq('submission_id', submissionId);

      return {
        submission: submissionData as unknown as SubmissionWithStudent,
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required })),
        answers: (answersData as AssignmentAnswer[]) || []
      };
    } catch (err) { throw err; }
  }, []);

  const updateSubmissionGrade = useCallback(async (submissionId: string, grade: number, feedback: string, studentId: string, assignmentTitle: string): Promise<void> => {
    const response = await fetch('/api/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback, studentId, assignmentTitle }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update grade');
  }, []);

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade };
}


