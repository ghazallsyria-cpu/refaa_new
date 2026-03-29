import { useState, useCallback } from 'react'; // تم تصحيح حرف I
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export interface PerformanceData {
  student: {
    id: string;
    sections: { name: string, classes: { name: string } };
  };
  examAttempts: {
    id: string;
    score: number;
    status: string;
    completed_at: string;
    exams: { id: string, title: string, total_marks: number, max_score: number, subjects: { name: string } };
  }[];
  assignmentSubmissions: {
    id: string;
    grade: number;
    feedback: string;
    submitted_at: string;
    status: string;
    assignments: { title: string, total_marks: number, subjects: { name: string } };
  }[];
  stats: {
    avgExamScore: number;
    avgAssignmentScore: number;
    completedExams: number;
    completedAssignments: number;
  };
}

export function usePerformanceSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = useCallback(async (): Promise<PerformanceData | null> => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      // Fetch student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          sections (name, classes (name))
        `)
        .eq('id', user.id)
        .single();
      
      if (studentError) throw studentError;

      // Fetch exam attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          id,
          score,
          status,
          completed_at,
          exams!inner (id, title, total_marks, max_score, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Fetch assignment submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          grade,
          feedback,
          submitted_at,
          status,
          assignments!inner (title, total_marks, subjects!inner (name))
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // تنسيق بيانات الطالب (لتحويل المصفوفات العائدة من Supabase إلى كائنات مفردة)
      const rawStudent = studentData as any; // نستخدم any هنا داخلياً فقط لتسهيل التحويل اليدوي للـ Interface
      const section = Array.isArray(rawStudent.sections) ? rawStudent.sections[0] : rawStudent.sections;
      const className = Array.isArray(section?.classes) ? section.classes[0] : section?.classes;

      const formattedStudent = {
        id: rawStudent.id,
        sections: {
          name: section?.name || '',
          classes: { name: className?.name || '' }
        }
      };

      // تنسيق بيانات الاختبارات
      const formattedAttempts = (attemptsData || []).map(a => {
        const rawA = a as any;
        const exam = Array.isArray(rawA.exams) ? rawA.exams[0] : rawA.exams;
        const subject = Array.isArray(exam?.subjects) ? exam.subjects[0] : exam?.subjects;
        return {
          ...rawA,
          exams: { ...exam, subjects: subject }
        };
      });

      // تنسيق بيانات الواجبات
      const formattedSubmissions = (submissionsData || []).map(s => {
        const rawS = s as any;
        const assignment = Array.isArray(rawS.assignments) ? rawS.assignments[0] : rawS.assignments;
        const subject = Array.isArray(assignment?.subjects) ? assignment.subjects[0] : assignment?.subjects;
        return {
          ...rawS,
          assignments: { ...assignment, subjects: subject }
        };
      });

      // Calculate stats
      const gradedExams = formattedAttempts.filter(a => a.status === 'graded' || a.status === 'completed');
      const avgExam = gradedExams.length > 0 
        ? gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedExams.length 
        : 0;

      const gradedAssignments = formattedSubmissions.filter(s => s.status === 'graded');
      const avgAssignment = gradedAssignments.length > 0
        ? gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedAssignments.length
        : 0;

      return {
        student: formattedStudent,
        examAttempts: formattedAttempts,
        assignmentSubmissions: formattedSubmissions,
        stats: {
          avgExamScore: Math.round(avgExam),
          avgAssignmentScore: Math.round(avgAssignment),
          completedExams: attemptsData?.length || 0,
          completedAssignments: submissionsData?.length || 0
        }
      } as PerformanceData;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching performance data';
      console.error('Error fetching performance data:', err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    fetchPerformanceData
  };
}

