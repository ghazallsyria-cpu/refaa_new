import { useState, useCallback } from 'react';
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
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          sections (name, classes (name))
        `)
        .eq('id', user.id)
        .single();
      
      if (studentError) throw studentError;

      // Fetch exam attempts
      const { data: attempts, error: attemptsError } = await supabase
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
      const { data: submissions, error: submissionsError } = await supabase
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

      // Calculate stats
      const gradedExams = (attempts || []).filter(a => a.status === 'graded' || a.status === 'completed');
      const avgExam = gradedExams.length > 0 
        ? gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedExams.length 
        : 0;

      const gradedAssignments = (submissions || []).filter(s => s.status === 'graded');
      const avgAssignment = gradedAssignments.length > 0
        ? gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedAssignments.length
        : 0;

      return {
       student: student as any,
        examAttempts: attempts as any || [],
        assignmentSubmissions: submissions as any || [],
        stats: {
          avgExamScore: Math.round(avgExam),
          avgAssignmentScore: Math.round(avgAssignment),
          completedExams: attempts?.length || 0,
          completedAssignments: submissions?.length || 0
        }
      };
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
