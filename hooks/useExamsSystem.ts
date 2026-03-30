import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { ExamWithMeta, ExamDetails, ExamResults, Exam, ExamAttempt } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface ExamForStudent {
  exam: ExamWithMeta;
  questions: Question[];
}

export interface StudentExamResult {
  exam: Exam;
  student: { id: string, users: { full_name: string } };
  attempt: ExamAttempt | null;
  answers: any[];
}

export function useExamsSystem() {
  const { user, authRole } = useAuth();
  const [data, setData] = useState<ExamWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async (): Promise<void> => {
    if (!user || !authRole) return;
    setLoading(true);
    setError(null);
    try {
      const selectQuery = authRole === 'student' 
        ? `
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          exam_sections!inner(
            section_id,
            sections(name, classes(name))
          )
        `
        : `
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          exam_sections(
            section_id,
            sections(name, classes(name))
          )
        `;

      let query = supabase
        .from('exams')
        .select(selectQuery)
        .order('created_at', { ascending: false });

      // If student, we only want published exams for their section
      if (authRole === 'student') {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();

        if (studentProfile?.section_id) {
          query = query
            .eq('exam_sections.section_id', studentProfile.section_id)
            .eq('status', 'published');
        } else {
          setData([]);
          setLoading(false);
          return;
        }
      } else if (authRole === 'teacher') {
        console.log('Fetching exams for teacher:', user.id);
        
        let { data: teacherProfile, error: profileError } = await supabase
          .from('teachers')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if ((profileError || !teacherProfile) && user.user_metadata?.role === 'teacher') {
          console.log('Teacher profile missing, self-healing...');
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
            teacherProfile = newTeacher;
            profileError = null;
          }
        }

        if (teacherProfile) {
          // ✅ الإصلاح السحري هنا: نجلب الاختبارات التي تخص هذا المعلم مباشرة (بدون استعلامات OR المكسورة)
          query = query.eq('teacher_id', teacherProfile.id);
        } else {
          console.error('Teacher profile not found for user:', user.id, profileError);
          setData([]);
          setLoading(false);
          return;
        }
      }

      const { data: examsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mappedData: ExamWithMeta[] = (examsData || []).map((e: any) => ({
        ...e,
        total_marks: e.total_marks || e.max_score || 0,
        subject_name: Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name,
        teacher_name: Array.isArray(e.teacher?.users) ? e.teacher.users[0]?.full_name : e.teacher?.users?.full_name,
        section_name: e.exam_sections && e.exam_sections.length > 0 ? e.exam_sections.map((es: any) => es.sections?.name).join(', ') : 'غير محدد',
      }));

      // Fetch stats for teacher/admin
      if (['teacher', 'admin', 'management'].includes(authRole || '')) {
        const examsWithStats = await Promise.all(mappedData.map(async (e) => {
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
      if (authRole === 'student') {
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
    } catch (err: unknown) {
      console.error("Error fetching exams:", err);
      setError(err instanceof Error ? err.message : 'Error fetching exams');
    } finally {
      setLoading(false);
    }
  }, [user, authRole]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const fetchExamDetails = useCallback(async (examId: string): Promise<ExamDetails> => {
    try {
      const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (examError) throw examError;

      const { data: examSectionsData, error: examSectionsError } = await supabase.from('exam_sections').select('section_id').eq('exam_id', examId);
      if (examSectionsError) throw examSectionsError;

      const { data: questionsData, error: questionsError } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');
      if (questionsError) throw questionsError;

      return {
        exam: { ...examData, section_ids: examSectionsData ? examSectionsData.map(es => es.section_id) : [] },
        questions: (questionsData || []).map(normalizeQuestion)
      };
    } catch (err) {
      console.error('Error fetching exam details:', err);
      throw err;
    }
  }, []);

  const saveExam = useCallback(async (examData: Partial<Exam> & { section_ids?: string[] }, questions: Question[], isNew: boolean): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examData, questions, isNew, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save exam');
      await fetchExams();
      return result.examId;
    } catch (err) {
      console.error('Error saving exam:', err);
      throw err;
    }
  }, [user, fetchExams]);

  const fetchExamForStudent = useCallback(async (examId: string): Promise<ExamForStudent> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data: studentProfile } = await supabase.from('students').select('section_id').eq('id', user.id).single();
      if (!studentProfile) throw new Error('Student profile not found');

      const { data: examSection, error: sectionError } = await supabase.from('exam_sections').select('id').eq('exam_id', examId).eq('section_id', studentProfile.section_id).maybeSingle();
      if (sectionError || !examSection) throw new Error('Exam not assigned to your section');

      const { data: examData, error: examError } = await supabase.from('exams').select('*, subject:subjects(name), teacher:teachers(users(full_name))').eq('id', examId).single();
      if (examError) throw examError;

      const { data: questionsData, error: questionsError } = await supabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');
      if (questionsError) throw questionsError;

      return {
        exam: {
          ...examData,
          subject_name: Array.isArray(examData.subject) ? examData.subject[0]?.name : examData.subject?.name,
          teacher_name: Array.isArray(examData.teacher?.users) ? examData.teacher.users[0]?.full_name : examData.teacher?.users?.full_name,
        },
        questions: (questionsData || []).map(normalizeQuestion)
      };
    } catch (err) {
      console.error('Error fetching exam for student:', err);
      throw err;
    }
  }, [user]);

  const submitExam = useCallback(async (examId: string, answers: Record<string, any>, score: number, status: string, timeSpent: number): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, answers, score, status, timeSpent, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit exam');
      await fetchExams();
      return result.attemptId;
    } catch (err) {
      console.error('Error submitting exam:', err);
      throw err;
    }
  }, [user, fetchExams]);

  const deleteExam = useCallback(async (examId: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete exam');
      await fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  }, [user, fetchExams]);

  const deleteExamWithMedia = useCallback(async (examId: string): Promise<{ success: boolean }> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const { data: questions, error: qError } = await supabase.from('questions').select('media_url').eq('exam_id', examId);
      if (qError) throw qError;
      if (questions && questions.length > 0) {
        for (const q of questions) {
          if (q.media_url) {
            try { await deleteFromCloudinary(q.media_url); } catch (e) { console.error('Error deleting media:', e); }
          }
        }
      }
      const response = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete exam');
      await fetchExams();
      return { success: true };
    } catch (err: unknown) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  }, [user, fetchExams]);

  const fetchExamResults = useCallback(async (examId: string): Promise<ExamResults> => {
    try {
      const { data: examData, error: examError } = await supabase.from('exams').select('*, subject:subjects(name)').eq('id', examId).single();
      if (examError) throw examError;

      let studentsData: { id: string, full_name: string, email: string, section_name: string }[] = [];
      if (examData?.section_ids && examData.section_ids.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select(`id, users(full_name, email), section:sections(name, classes(name))`)
          .in('section_id', examData.section_ids);
        
        if (!studentsError && students) {
          studentsData = (students as any[]).map(s => {
            const sectionData = s.section;
            const className = Array.isArray(sectionData?.classes) ? sectionData?.classes[0]?.name : sectionData?.classes?.name;
            const sectionName = sectionData?.name ? `${className ? className + ' - ' : ''}${sectionData.name}` : 'غير محدد';
            return {
              id: s.id,
              full_name: s.users?.full_name || 'طالب غير معروف',
              email: s.users?.email || '',
              section_name: sectionName
            };
          });
        }
      }

      const { data: attemptsData, error: attemptsError } = await supabase.from('exam_attempts').select(`*, student:students(id, users(full_name), section:sections(name, classes(name)))`).eq('exam_id', examId);
      if (attemptsError) throw attemptsError;

      const { data: qData, error: qError } = await supabase.from('questions').select('*').eq('exam_id', examId);
      if (qError) throw qError;

      let aData: any[] = [];
      if (attemptsData && attemptsData.length > 0) {
        const attemptIds = attemptsData.map(a => a.id);
        const { data: answers, error: aError } = await supabase.from('student_answers').select('*').in('attempt_id', attemptIds);
        if (!aError && answers) aData = answers;
      }

      return {
        exam: examData as Exam,
        students: studentsData,
        attempts: (attemptsData || []) as ExamAttempt[],
        questions: (qData || []).map((q: any) => normalizeQuestion(q)),
        answers: aData || []
      };
    } catch (err) {
      console.error('Error fetching exam results:', err);
      throw err;
    }
  }, []);

  const deleteAttempt = useCallback(async (attemptId: string): Promise<{ success: boolean }> => {
    if (!user) throw new Error('User not authenticated');
    try {
      const response = await fetch('/api/exams/delete-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete attempt');
      return { success: true };
    } catch (err) {
      console.error('Error deleting attempt:', err);
      throw err;
    }
  }, [user]);

  const fetchStudentExamResult = useCallback(async (examId: string, studentId: string): Promise<StudentExamResult> => {
    try {
      const { data: examData, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (examError) throw examError;

      const { data: studentData, error: studentError } = await supabase.from('students').select('*, users(full_name)').eq('id', studentId).single();
      if (studentError) throw studentError;

      const { data: attemptData, error: attemptError } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single();
      if (attemptError && attemptError.code !== 'PGRST116') throw attemptError;

      let answersData: any[] = [];
      if (attemptData) {
        const { data: answers, error: answersError } = await supabase.from('student_answers').select('*, question:questions(*, options:question_options(*))').eq('attempt_id', attemptData.id);
        if (answersError) throw answersError;
        answersData = (answers || []).map(a => ({ ...a, question: a.question ? normalizeQuestion(a.question) : null }));
      }

      return {
        exam: examData as Exam,
        student: studentData as { id: string, users: { full_name: string } },
        attempt: (attemptData || null) as ExamAttempt | null,
        answers: answersData
      };
    } catch (err) {
      console.error('Error fetching student exam result:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchExams, deleteExam, deleteExamWithMedia, fetchExamDetails, saveExam, fetchExamForStudent, submitExam, fetchExamResults, deleteAttempt, fetchStudentExamResult };
}


