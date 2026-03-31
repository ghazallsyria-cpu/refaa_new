import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import {
  Subject,
  Section,
  Teacher,
  Assignment,
  AssignmentSubmission,
  AssignmentAnswer,
  RawAssignmentAnswer,
  AssignmentWithMeta,
  SubmissionWithStudent
} from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: Question[];
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as {
    user: { id: string; user_metadata?: any } | null;
    authRole: string | null;
    userRole: string | null;
  };

  const currentRole = authRole || userRole;

  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] =
    useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user?.id || !currentRole) return;

    setLoading(true);
    setError(null);

    try {
      const selectQuery =
        `*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections(section_id, section:sections(name, class:classes(name)))`;

      const { data: assignmentsData, error: fetchErr } = await supabase
        .from('assignments')
        .select(selectQuery)
        .order('due_date', { ascending: true });

      if (fetchErr) throw fetchErr;

      const raw = (assignmentsData || []) as any[];

      const { data: stProfile } = await supabase
        .from('students')
        .select('section_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      const { data: tProfile } = await supabase
        .from('teachers')
        .select('id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      let filtered = raw;

      if (currentRole === 'student') {
        if (!stProfile?.section_id) {
          setData([]);
          setLoading(false);
          return;
        }

        const sid = stProfile.section_id;

        filtered = raw.filter((a: any) =>
          a.assignment_sections?.some((s: any) => s.section_id === sid)
        );
      }

      if (currentRole === 'teacher') {
        if (!tProfile?.id) {
          setData([]);
          setLoading(false);
          return;
        }

        filtered = raw.filter((a: any) => a.teacher_id === tProfile.id);
      }

      const mappedData: AssignmentWithMeta[] = filtered.map((a: any) => ({
        ...a,
        created_at: a.created_at || new Date().toISOString(),
        subject_name: Array.isArray(a.subject)
          ? a.subject[0]?.name
          : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.user)
          ? a.teacher.user[0]?.full_name
          : a.teacher?.user?.full_name
      }));

      setData(mappedData);

      if (currentRole === 'student') {
        const { data: subData } = await supabase
          .from('assignment_submissions')
          .select(
            'assignment_id, status, grade, id, student_id, submitted_at'
          )
          .eq('student_id', user.id);

        const subMap: Record<string, AssignmentSubmission> = {};

        (subData || []).forEach((s: any) => {
          subMap[s.assignment_id] = s;
        });

        setStudentSubmissions(subMap);
      }

      if (['teacher', 'admin', 'management'].includes(currentRole)) {
        const { data: countsData } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status');

        if (countsData) {
          const updated = mappedData.map((a) => {
            const subs = countsData.filter(
              (s: any) => s.assignment_id === a.id
            );

            return {
              ...a,
              submission_count: subs.length,
              graded_count: subs.filter(
                (s: any) => s.status === 'graded'
              ).length
            };
          });

          setData(updated);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string) => {
    const { data } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('order');

    return (data || []).map((q: any) =>
      normalizeQuestion({
        id: q.id,
        content: q.question_text,
        type: q.question_type,
        options: q.options,
        points: q.points,
        isRequired: q.is_required
      })
    );
  }, []);

  const saveAssignment = useCallback(
    async (
      payload: Partial<Assignment>,
      assignmentId: string | null,
      questions: Question[],
      sectionIds: string[],
      subjects: Subject[]
    ): Promise<string> => {
      const res = await fetch('/api/assignments/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          assignmentId,
          questions,
          sectionIds,
          subjects,
          userId: user?.id
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل حفظ الواجب');

      await fetchAssignments();
      return result.id;
    },
    [user, fetchAssignments]
  );

  const deleteAssignment = useCallback(
    async (assignmentId: string): Promise<void> => {
      const res = await fetch(
        `/api/assignments/delete?id=${assignmentId}`,
        { method: 'DELETE' }
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || 'Failed to delete assignment');

      await fetchAssignments();
    },
    [fetchAssignments]
  );

  const fetchAssignmentDetails = useCallback(
    async (assignmentId: string): Promise<AssignmentDetails> => {
      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .select(
          `*, subject:subjects(name), teacher:teachers(user:users(full_name)), assignment_sections(section_id, section:sections(name, class:classes(name)))`
        )
        .eq('id', assignmentId)
        .single();

      if (error) throw error;

      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');

      let submissionData: AssignmentSubmission | null = null;
      let answersData: AssignmentAnswer[] = [];
      let allSubmissionsData: SubmissionWithStudent[] = [];

      if (currentRole === 'student' && user) {
        const { data: subData } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .maybeSingle();

        if (subData) {
          submissionData = subData as AssignmentSubmission;

          const { data: aData } = await supabase
            .from('assignment_answers')
            .select('*')
            .eq('submission_id', subData.id);

          answersData = (aData as AssignmentAnswer[]) || [];
        }
      } else if (
        ['teacher', 'admin', 'management'].includes(currentRole || '')
      ) {
        const { data: subsData } = await supabase
          .from('assignment_submissions')
          .select(
            `*, student:students(user:users(full_name, email), section:sections(name, class:classes(name)))`
          )
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });

        if (subsData)
          allSubmissionsData =
            subsData as unknown as SubmissionWithStudent[];
      }

      return {
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) =>
          normalizeQuestion({
            id: q.id,
            content: q.question_text,
            type: q.question_type,
            options: q.options,
            points: q.points,
            isRequired: q.is_required
          })
        ),
        submission: submissionData,
        answers: answersData,
        allSubmissions: allSubmissionsData
      };
    },
    [user, currentRole]
  );

  const submitAssignment = useCallback(
    async (
      assignmentId: string,
      answers: RawAssignmentAnswer[],
      submissionId?: string,
      content?: string,
      fileUrl?: string
    ): Promise<string> => {
      const studentName =
        user?.user_metadata?.full_name || 'طالب';

      const res = await fetch('/api/assignments/submit', {
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
        })
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || 'Failed to submit');

      return result.id;
    },
    [user]
  );

  const fetchSubmissionDetails = useCallback(async (submissionId: string) => {
    const { data: submissionData } = await supabase
      .from('assignment_submissions')
      .select(
        `*, student:students(user:users(full_name, email), section:sections(name, class:classes(name)))`
      )
      .eq('id', submissionId)
      .single();

    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('*, subject:subjects(name)')
      .eq('id', (submissionData as any).assignment_id)
      .single();

    const { data: qData } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', (submissionData as any).assignment_id)
      .order('order');

    const { data: answersData } = await supabase
      .from('assignment_answers')
      .select('*')
      .eq('submission_id', submissionId);

    return {
      submission: submissionData as SubmissionWithStudent,
      assignment: assignmentData as AssignmentWithMeta,
      questions: (qData || []).map((q: any) =>
        normalizeQuestion({
          id: q.id,
          content: q.question_text,
          type: q.question_type,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })
      ),
      answers: (answersData as AssignmentAnswer[]) || []
    };
  }, []);

  const updateSubmissionGrade = useCallback(
    async (
      submissionId: string,
      grade: number,
      feedback: string,
      studentId: string,
      assignmentTitle: string
    ): Promise<void> => {
      const res = await fetch('/api/assignments/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          grade,
          feedback,
          studentId,
          assignmentTitle
        })
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || 'Failed to update grade');
    },
    []
  );

  return {
    data,
    loading,
    error,
    studentSubmissions,
    refetch: fetchAssignments,
    fetchAssignmentQuestions,
    saveAssignment,
    deleteAssignment,
    fetchAssignmentDetails,
    submitAssignment,
    fetchSubmissionDetails,
    updateSubmissionGrade
  };
}
