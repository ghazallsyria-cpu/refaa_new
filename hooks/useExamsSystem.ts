import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subject_id: string;
  subject_name?: string;
  teacher_id: string;
  teacher_name?: string;
  start_time?: string;
  end_time?: string;
  exam_date?: string;
  duration?: number;
  status: 'draft' | 'published' | 'archived';
  section_id?: string;
  section_name?: string;
  created_at: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  score?: number;
  submission_count?: number;
  graded_count?: number;
  avg_score?: number;
  question_count?: number;
}

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!user || !userRole) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          section:sections(name)
        `)
        .order('created_at', { ascending: false });

      // If student, we only want published exams for their section
      if (userRole === 'student') {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();

        if (studentProfile?.section_id) {
          query = query
            .eq('section_id', studentProfile.section_id)
            .eq('status', 'published');
        } else {
          // Student has no section, return empty
          setData([]);
          setLoading(false);
          return;
        }
      }

      const { data: examsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mappedData = (examsData || []).map((e: any) => ({
        ...e,
        subject_name: Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name,
        teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name,
        section_name: Array.isArray(e.section) ? e.section[0]?.name : e.section?.name,
      }));

      // Fetch stats for teacher/admin
      if (['teacher', 'admin', 'management'].includes(userRole)) {
        const examsWithStats = await Promise.all(mappedData.map(async (e: any) => {
          const [attemptsRes, questionsRes] = await Promise.all([
            supabase.from('exam_attempts').select('score, status').eq('exam_id', e.id),
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', e.id)
          ]);
          
          const attempts = attemptsRes.data || [];
          const avgScore = attempts.length > 0 
            ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length) 
            : 0;
            
          return {
            ...e,
            submission_count: attempts.length,
            graded_count: attempts.filter(a => a.status === 'graded' || a.status === 'completed').length,
            avg_score: avgScore,
            question_count: questionsRes.count || 0
          };
        }));
        mappedData = examsWithStats;
      }

      // Fetch submission status for student
      if (userRole === 'student') {
        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('exam_id, score, status')
          .eq('student_id', user.id);

        mappedData = mappedData.map(exam => {
          const attempt = attemptsData?.find(a => a.exam_id === exam.id);
          return {
            ...exam,
            submission_status: attempt ? (attempt.status === 'completed' || attempt.status === 'graded' ? 'submitted' : 'pending') : 'pending',
            score: attempt?.score
          };
        });
      }

      setData(mappedData);
    } catch (err: any) {
      console.error("Error fetching exams:", err);
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchExamDetails = async (examId: string) => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      const { data: examSectionsData, error: examSectionsError } = await supabase
        .from('exam_sections')
        .select('section_id')
        .eq('exam_id', examId);
      
      if (examSectionsError) throw examSectionsError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          options:question_options(*)
        `)
        .eq('exam_id', examId)
        .order('order_index');

      if (questionsError) throw questionsError;

      return {
        exam: {
          ...examData,
          section_ids: examSectionsData ? examSectionsData.map(es => es.section_id) : []
        },
        questions: questionsData || []
      };
    } catch (err) {
      console.error('Error fetching exam details:', err);
      throw err;
    }
  };

  const saveExam = async (examData: any, questions: any[], isNew: boolean) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examData,
          questions,
          isNew,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save exam');

      await fetchExams();
      return result.examId;
    } catch (err) {
      console.error('Error saving exam:', err);
      throw err;
    }
  };

  const fetchExamForStudent = async (examId: string) => {
    try {
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name))
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          options:question_options(*)
        `)
        .eq('exam_id', examId)
        .order('order_index');

      if (questionsError) throw questionsError;

      return {
        exam: {
          ...examData,
          subject_name: Array.isArray(examData.subject) ? examData.subject[0]?.name : examData.subject?.name,
          teacher_name: Array.isArray(examData.teacher?.users) ? examData.teacher.users[0]?.full_name : examData.teacher?.users?.full_name,
        },
        questions: questionsData || []
      };
    } catch (err) {
      console.error('Error fetching exam for student:', err);
      throw err;
    }
  };

  const submitExam = async (examId: string, answers: any, score: number, status: string, timeSpent: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/exams/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          answers,
          score,
          status,
          timeSpent,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit exam');

      await fetchExams();
      return result.attemptId;
    } catch (err) {
      console.error('Error submitting exam:', err);
      throw err;
    }
  };
  const deleteExam = async (examId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete exam');

      await fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  };

  const deleteExamWithMedia = async (examId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // 1. Fetch all questions for this exam to get their media_urls
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('media_url')
        .eq('exam_id', examId);
      
      if (qError) throw qError;

      // 2. Delete all question images from Cloudinary
      if (questions && questions.length > 0) {
        for (const q of questions) {
          if (q.media_url) {
            try {
              await deleteFromCloudinary(q.media_url);
            } catch (e) {
              console.error('Error deleting media:', e);
            }
          }
        }
      }

      const response = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete exam');

      await fetchExams();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  };

  const fetchExamResults = useCallback(async (examId: string) => {
    try {
      // 1. Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // 2. Fetch all students in the assigned sections
      let studentsData: any[] = [];
      if (examData?.section_ids && examData.section_ids.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            users(full_name, email),
            section:sections(name, classes(name))
          `)
          .in('section_id', examData.section_ids);
        
        if (!studentsError && students) {
          studentsData = students.map(s => {
            const sectionData = s.section as any;
            const className = Array.isArray(sectionData?.classes) ? sectionData?.classes[0]?.name : sectionData?.classes?.name;
            const sectionName = sectionData?.name ? `${className ? className + ' - ' : ''}${sectionData.name}` : 'غير محدد';
            
            return {
              id: s.id,
              full_name: (s.users as any)?.full_name || 'طالب غير معروف',
              email: (s.users as any)?.email || '',
              section_name: sectionName
            };
          });
        }
      }

      // 3. Fetch attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          student:students(
            id, 
            users(full_name),
            section:sections(name, classes(name))
          )
        `)
        .eq('exam_id', examId);

      if (attemptsError) throw attemptsError;

      // 4. Fetch questions
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId);

      if (qError) throw qError;

      // 5. Fetch answers
      let aData = [];
      if (attemptsData && attemptsData.length > 0) {
        const attemptIds = attemptsData.map(a => a.id);
        const { data: answers, error: aError } = await supabase
          .from('student_answers')
          .select('*')
          .in('attempt_id', attemptIds);
          
        if (!aError && answers) {
          aData = answers;
        }
      }

      return {
        exam: examData,
        students: studentsData,
        attempts: attemptsData || [],
        questions: qData || [],
        answers: aData || []
      };
    } catch (err) {
      console.error('Error fetching exam results:', err);
      throw err;
    }
  }, []);

  const deleteAttempt = useCallback(async (attemptId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch('/api/exams/delete-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete attempt');

      return { success: true };
    } catch (err) {
      console.error('Error deleting attempt:', err);
      throw err;
    }
  }, [user]);

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string) => {
    try {
      // 1. Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // 2. Fetch student details
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, users(full_name)')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // 3. Fetch attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // It's possible the student hasn't attempted the exam yet
      if (attemptError && attemptError.code !== 'PGRST116') {
        throw attemptError;
      }

      // 4. Fetch answers if attempt exists
      let answersData = [];
      if (attemptData) {
        const { data: answers, error: answersError } = await supabase
          .from('student_answers')
          .select('*, question:questions(*, options:question_options(*))')
          .eq('attempt_id', attemptData.id);

        if (answersError) throw answersError;
        answersData = answers || [];
      }

      return {
        exam: examData,
        student: studentData,
        attempt: attemptData || null,
        answers: answersData
      };
    } catch (err) {
      console.error('Error fetching student exam result:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchExams, deleteExam, deleteExamWithMedia, fetchExamDetails, saveExam, fetchExamForStudent, submitExam, fetchExamResults, deleteAttempt, fetchStudentExamResult };
}
