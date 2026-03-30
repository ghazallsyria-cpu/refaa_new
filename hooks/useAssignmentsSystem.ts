import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';
import { normalizePayload } from '@/lib/utils';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: Question[];
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

export function useAssignmentsSystem() {
  const { user, authRole } = useAuth();
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user || !authRole) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch assignments with joins
      let query = supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(user:users(full_name)),
          assignment_sections!inner(
            section_id,
            section:sections(
              name,
              class:classes(name)
            )
          )
        `)
        .order('due_date', { ascending: true });

      if (authRole === 'student') {
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
      } else if (authRole === 'teacher') {
        console.log('Fetching assignments for teacher:', user.id);
        
        let { data: teacherProfile, error: profileError } = await supabase
          .from('teachers')
          .select('id')
          .eq('id', user.id)
          .single();
          
        // Self-healing: If teacher record is missing but user is a teacher, create it
        if ((profileError || !teacherProfile) && user.user_metadata?.role === 'teacher') {
          console.log('Teacher profile missing in useAssignmentsSystem, attempting self-healing...');
          const { data: newTeacher, error: createError } = await supabase
            .from('teachers')
            .insert({
              id: user.id,
              national_id: 'TEMP_' + user.id.substring(0, 8),
              specialization: 'غير محدد'
            })
            .select('id')
            .single();
          
          if (!createError && newTeacher) {
            console.log('Teacher profile created successfully via self-healing in useAssignmentsSystem');
            teacherProfile = newTeacher;
            profileError = null;
          } else {
            console.error('Failed to self-heal teacher profile in useAssignmentsSystem:', createError);
          }
        }

        if (teacherProfile) {
          const { data: teacherSections } = await supabase
            .from('teacher_sections')
            .select('section_id')
            .eq('teacher_id', teacherProfile.id);
            
          const sectionIds = teacherSections?.map(ts => ts.section_id) || [];
          
          if (sectionIds.length > 0) {
            query = query.or(`teacher_id.eq.${teacherProfile.id},assignment_sections.section_id.in.(${sectionIds.join(',')})`);
          } else {
            query = query.eq('teacher_id', teacherProfile.id);
          }
        } else {
          console.error('Teacher profile not found for user:', user.id, profileError);
          setData([]);
          setLoading(false);
          return;
        }
      }

      const { data: assignmentsData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedData: AssignmentWithMeta[] = (assignmentsData || []).map((a: any) => ({
        ...a,
        created_at: a.created_at || new Date().toISOString(),
        subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.user) ? a.teacher.user[0]?.full_name : a.teacher?.user?.full_name,
      }));

      setData(mappedData);

      // 2. Fetch submissions if student
      if (authRole === 'student') {
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, grade, id, student_id, submitted_at')
          .eq('student_id', user.id);
        
        if (subError) throw subError;
        
        const submissionMap: Record<string, AssignmentSubmission> = {};
        (subData || []).forEach((s: any) => {
          submissionMap[s.assignment_id] = s as AssignmentSubmission;
        });
        setStudentSubmissions(submissionMap);
      }

      // 3. Fetch submission counts if teacher/admin
      if (['teacher', 'admin', 'management'].includes(authRole)) {
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
  }, [user, authRole]);

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
        subjects,
        userId: user.id
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
          teacher:teachers(user:users(full_name)),
          assignment_sections(
            section_id,
            section:sections(
              name,
              class:classes(name)
            )
          )
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
      let allSubmissionsData: SubmissionWithStudent[] = [];

      if (authRole === 'student' && user) {
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
      } else if (['teacher', 'admin', 'management'].includes(authRole || '')) {
        const { data: subsData, error: subsError } = await supabase
          .from('assignment_submissions')
          .select(`
            *,
            student:students(user:users(full_name, email), section:sections(name, class:classes(name)))
          `)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });

        if (!subsError && subsData) {
          allSubmissionsData = subsData as unknown as SubmissionWithStudent[];
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
  }, [user, authRole]);

  const submitAssignment = useCallback(async (assignmentId: string, answers: RawAssignmentAnswer[], submissionId?: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    const studentName = user.user_metadata?.full_name || 'طالب';

    const response = await fetch('/api/assignments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        studentId: user.id,
        studentName,
        answers,
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
          student:students(user:users(full_name, email), section:sections(name, class:classes(name)))
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
        submission: submissionData as unknown as SubmissionWithStudent,
        assignment: assignmentData as Assignment,
        questions: (qData || []).map((q: any) => normalizeQuestion({
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
