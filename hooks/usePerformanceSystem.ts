import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function usePerformanceSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = useCallback(async () => {
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
      const gradedExams = attempts?.filter(a => a.status === 'graded' || a.status === 'completed') || [];
      const avgExam = gradedExams.length > 0 
        ? gradedExams.reduce((acc, curr) => acc + (curr.score || 0), 0) / gradedExams.length 
        : 0;

      const gradedAssignments = submissions?.filter(s => s.status === 'graded') || [];
      const avgAssignment = gradedAssignments.length > 0
        ? gradedAssignments.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedAssignments.length
        : 0;

      return {
        student,
        examAttempts: attempts || [],
        assignmentSubmissions: submissions || [],
        stats: {
          avgExamScore: Math.round(avgExam),
          avgAssignmentScore: Math.round(avgAssignment),
          completedExams: attempts?.length || 0,
          completedAssignments: submissions?.length || 0
        }
      };
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError(err.message);
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
