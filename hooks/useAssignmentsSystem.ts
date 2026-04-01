import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: any[];
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
    if (!user?.id || !currentRole) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/assignments/get-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: currentRole }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'فشل جلب الواجبات');

      setData(result.data || []);
      
      if (currentRole === 'student' && result.studentSubmissions) {
        const subMap: Record<string, AssignmentSubmission> = {};
        (result.studentSubmissions || []).forEach((s: any) => { subMap[s.assignment_id] = s; });
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

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<any[]> => {
    try {
      const response = await fetch('/api/assignments/get-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, userId: user?.id, role: currentRole }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return (result.questions || []).map((q: any) => {
        const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
        return { ...nq, media_url: q.media_url }; // 🚀 استخراج الصورة
      });
    } catch (err) { 
      return []; 
    }
  }, [user, currentRole]);

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
    if (!response.ok) throw new Error('Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string): Promise<AssignmentDetails> => {
    try {
      const response = await fetch('/api/assignments/get-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, userId: user?.id, role: currentRole }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      return {
        assignment: result.assignment,
        questions: result.questions.map((q: any) => {
           const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
           return { ...nq, media_url: q.media_url }; // 🚀 استخراج الصورة
        }),
        submission: result.submission,
        answers: result.answers,
        allSubmissions: result.allSubmissions
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
      const response = await fetch('/api/assignments/get-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      return {
        submission: result.submission,
        assignment: result.assignment,
        questions: (result.questions || []).map((q: any) => {
          const nq = normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required });
          return { ...nq, media_url: q.media_url }; // 🚀 استخراج الصورة
        }),
        answers: result.answers || []
      };
    } catch (err) { throw err; }
  }, []);

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
    if (!response.ok) throw new Error('Failed to update grade');
  }, []);

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade };
}
