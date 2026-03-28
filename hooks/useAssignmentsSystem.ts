import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  subject_id: string;
  teacher_id: string;
  file_url?: string;
  status?: string;
  created_at: string;
  subject_name?: string;
  teacher_name?: string;
  assignment_sections?: any[];
  submission_count?: number;
  graded_count?: number;
}

export function useAssignmentsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, any>>({});

  const fetchAssignments = useCallback(async () => {
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
          // If student has no section, return empty
          setData([]);
          setLoading(false);
          return;
        }
      } else if (userRole === 'teacher') {
        // Teacher sees assignments they created OR assignments for their sections
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

      // Map data to match UI expectations
      const mappedData = (assignmentsData || []).map((a: any) => ({
        ...a,
        subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
        teacher_name: Array.isArray(a.teacher?.users) ? a.teacher.users[0]?.full_name : a.teacher?.users?.full_name,
      }));

      setData(mappedData);

      // 2. Fetch submissions if student
      if (userRole === 'student') {
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, grade')
          .eq('student_id', user.id);
        
        if (subError) throw subError;
        
        const submissionMap: Record<string, any> = {};
        (subData || []).forEach(s => {
          submissionMap[s.assignment_id] = s;
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

    } catch (err: any) {
      console.error("Error fetching assignments:", err);
      setError(err.message || 'Failed to load assignments');
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
    payload: any, 
    assignmentId: string | null, 
    questions: Question[], 
    sectionIds: string[],
    subjects: Subject[]
  ) => {
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

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    const response = await fetch(`/api/assignments/delete?id=${assignmentId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string) => {
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

      let submissionData = null;
      let answersData = [];
      let allSubmissionsData = [];

      if (userRole === 'student' && user) {
        const { data: subData, error: subError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .single();

        if (subData) {
          submissionData = subData;
          const { data: aData } = await supabase
            .from('assignment_answers')
            .select('*')
            .eq('submission_id', subData.id);
          answersData = aData || [];
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
          allSubmissionsData = subsData;
        }
      }

      return {
        assignment: assignmentData,
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

  const submitAssignment = useCallback(async (assignmentId: string, answersPayload: any[], submissionId?: string) => {
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
        submission: submissionData,
        assignment: assignmentData,
        questions: (qData || []).map(q => normalizeQuestion({
          id: q.id,
          content: q.question_text,
          type: q.question_type,
          options: q.options,
          points: q.points,
          isRequired: q.is_required
        })),
        answers: answersData || []
      };
    } catch (err) {
      console.error('Error fetching submission details:', err);
      throw err;
    }
  }, []);

  const updateSubmissionGrade = useCallback(async (submissionId: string, grade: number, feedback: string, studentId: string, assignmentTitle: string) => {
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
