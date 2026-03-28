import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher, Assignment, AssignmentSubmission, AssignmentAnswer } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentWithMeta extends Assignment {
  subject_name?: string;
  teacher_name?: string;
  submission_count?: number;
  graded_count?: number;
}

export interface SubmissionWithMeta extends AssignmentSubmission {
  student?: {
    users: {
      full_name: string;
      email: string;
    };
    section: {
      name: string;
      classes: {
        name: string;
      };
    };
  };
}

export interface AssignmentDetails {
  assignment: Assignment;
  questions: Question[];
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithMeta[];
}

export function useAssignmentsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user || !userRole) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch assignments with joins
      let query = supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          assignment_sections!inner(
            section_id,
            sections(name, classes(name))
          )
        `)
        .order('due_date', { ascending: true });

      if (userRole === 'student') {
        // Fetch student's section
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();
        
        if (studentData?.section_id) {
          query = query.eq('assignment_sections.section_id', studentData.section_id);
        } else {
          setData([]);
          setLoading(false);
          return;
        }
      } else if (userRole === 'teacher') {
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id')
          .eq('teacher_id', user.id);
          
        const sectionIds = teacherSections?.map(ts => ts.section_id) || [];
        
        if (sectionIds.length > 0) {
          query = query.or(`teacher_id.eq.${user.id},assignment_sections.section_id.in.(${sectionIds.join(',')})`);
        } else {
          query = query.eq('teacher_id', user.id);
        }
      }

      const { data: assignmentsData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedData: AssignmentWithMeta[] = (assignmentsData as any[] || []).map((a) => ({
        ...a,
        subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.users) ? a.teacher.users[0]?.full_name : a.teacher?.users?.full_name,
      }));

      setData(mappedData);

      // 2. Fetch submissions if student
      if (userRole === 'student') {
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, grade, id, student_id, submitted_at')
          .eq('student_id', user.id);
        
        if (subError) throw subError;
        
        const submissionMap: Record<string, AssignmentSubmission> = {};
        (subData as any[] || []).forEach((s) => {
          submissionMap[s.assignment_id] = s as AssignmentSubmission;
        });
        setStudentSubmissions(submissionMap);
      }

      // 3. Fetch submission counts if teacher/admin
      if (['teacher', 'admin', 'management'].includes(userRole)) {
        const { data: countsData, error: countsError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status');
          
        if (!countsError && countsData) {
          const updatedData = mappedData.map(a => {
            const subs = countsData.filter(s => s.assignment_id === a.id);
            return {
              ...a,
              submission_count: subs.length,
              graded_count: subs.filter(s => s.status === 'graded').length
            };
          });
          setData(updatedData);
        }
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assignments';
      console.error("Error fetching assignments:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');
      
      if (error) throw error;
      
      return (data || []).map(q => normalizeQuestion({
        id: q.id,
        content: q.question_text,
        type: q.question_type,
        options: q.options,
        points: q.points,
        isRequired: q.is_required
      }));
    } catch (err) {
      console.error('Error fetching questions:', err);
      return [];
    }
  }, []);

  const saveAssignment = useCallback(async (
    payload: Partial<Assignment>, 
    assignmentId: string | null, 
    questions: Question[], 
    sectionIds: string[],
    subjects: Subject[]
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const response = await fetch('/api/assignments/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        assignmentId,
        questions,
        sectionIds,
        subjects
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to save assignment');

    await fetchAssignments();
    return result.id;
  }, [user, fetchAssignments]);

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    const response = await fetch(`/api/assignments/delete?id=${assignmentId}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string): Promise<AssignmentDetails> => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          assignment_sections(section_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      const { data: qData, error: qError } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');

      if (qError) throw qError;

      let submissionData: AssignmentSubmission | null = null;
      let answersData: AssignmentAnswer[] = [];
      let allSubmissionsData: SubmissionWithMeta[] = [];

      if (userRole === 'student' && user) {
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
      } else if (['teacher', 'admin', 'management'].includes(userRole || '')) {
        const { data: subsData, error: subsError } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            student:students(users(full_name, email), section:sections(name, classes(name)))
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });

        if (!subsError && subsData) {
          allSubmissionsData = subsData as unknown as SubmissionWithMeta[];
        }
      }

      return {
        assignment: assignmentData as Assignment,
        questions: (qData || []).map(q => normalizeQuestion({
          id: q.id,
          content: q.question_text,
          type: q.question_type,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })),
        submission: submissionData,
        answers: answersData,
        allSubmissions: allSubmissionsData
      };
    } catch (err) {
      console.error('Error fetching assignment details:', err);
      throw err;
    }
  }, [user, userRole]);

  const submitAssignment = useCallback(async (assignmentId: string, answersPayload: any[], submissionId?: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    const studentName = user.user_metadata?.full_name || 'طالب';

    const response = await fetch('/api/assignments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        studentId: user.id,
        studentName,
        answersPayload,
        submissionId
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to submit assignment');

    return result.id;
  }, [user]);

  const fetchSubmissionDetails = useCallback(async (submissionId: string) => {
    try {
      const { data: submissionData, error: subError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:students(users(full_name, email), section:sections(name, classes(name)))
        `)
        .eq('id', submissionId)
        .single();

      if (subError) throw subError;

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*, subject:subjects(name)')
        .eq('id', submissionData.assignment_id)
        .single();

      if (assignmentError) throw assignmentError;

      const { data: qData, error: qError } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', submissionData.assignment_id)
        .order('order');

      if (qError) throw qError;

      const { data: answersData, error: aError } = await supabase
        .from('assignment_answers')
        .select('*')
        .eq('submission_id', submissionId);

      if (aError) throw aError;

      return {
        submission: submissionData as unknown as SubmissionWithMeta,
        assignment: assignmentData as Assignment,
        questions: (qData || []).map(q => normalizeQuestion({
          id: q.id,
          content: q.question_text,
          type: q.question_type,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })),
        answers: (answersData as AssignmentAnswer[]) || []
      };
    } catch (err) {
      console.error('Error fetching submission details:', err);
      throw err;
    }
  }, []);

  const updateSubmissionGrade = useCallback(async (submissionId: string, grade: number, feedback: string, studentId: string, assignmentTitle: string): Promise<void> => {
    const response = await fetch('/api/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        grade,
        feedback,
        studentId,
        assignmentTitle
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update grade');
  }, []);

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
  } as const;
}
