'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type EducationalContentType = 'exam' | 'assignment';

export interface EducationalContent {
  id: string;
  type: EducationalContentType;
  title: string;
  description?: string;
  subject_id: string;
  subject_name?: string;
  teacher_id: string;
  teacher_name?: string;
  start_time?: string; // For exams
  end_time?: string;   // For exams
  exam_date?: string;  // For exams
  duration?: number;   // For exams
  due_date?: string;   // For assignments
  status: 'draft' | 'published' | 'archived';
  section_id?: string;
  section_name?: string; // For exams
  created_at: string;
  file_url?: string;
  // Student specific
  submission_status?: 'pending' | 'submitted' | 'graded';
  score?: number;
  total_points?: number;
  // Teacher/Admin specific
  submission_count?: number;
  graded_count?: number;
  avg_score?: number; // For exams
  question_count?: number; // For exams
  assignment_sections?: any[];
}

export function useEducationalContent(contentType?: EducationalContentType) {
  const { user, userRole: role } = useAuth();
  const [content, setContent] = useState<EducationalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    if (!user || !role) return;

    try {
      setLoading(true);
      setError(null);

      let examsData: any[] = [];
      let assignmentsData: any[] = [];

      const fetchAssignmentsWithCounts = async (query: any) => {
        const { data, error } = await query;
        if (error) throw error;
        
        // Fetch counts for each assignment
        const assignmentsWithCounts = await Promise.all((data || []).map(async (a: any) => {
          const [subRes, gradedRes, sectionsRes] = await Promise.all([
            supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id),
            supabase.from('assignment_submissions').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id).eq('status', 'graded'),
            supabase.from('assignment_sections').select('section_id, sections(name, classes(name))').eq('assignment_id', a.id)
          ]);
          return {
            ...a,
            submission_count: subRes.count || 0,
            graded_count: gradedRes.count || 0,
            assignment_sections: sectionsRes.data || []
          };
        }));
        return assignmentsWithCounts;
      };

      const fetchExamsWithStats = async (query: any) => {
        const { data, error } = await query;
        if (error) throw error;
        
        const examsWithStats = await Promise.all((data || []).map(async (e: any) => {
          const [attemptsRes, questionsRes] = await Promise.all([
            supabase.from('exam_attempts').select('score,status').eq('exam_id', e.id),
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', e.id)
          ]);
          
          const attempts = attemptsRes.data || [];
          const avgScore = attempts.length > 0 
            ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length) 
            : 0;
            
          return {
            ...e,
            submission_count: attempts.length,
            graded_count: attempts.filter(a => a.status === 'graded' || a.status === 'completed').length,
            avg_score: avgScore,
            question_count: questionsRes.count || 0
          };
        }));
        return examsWithStats;
      };

      if (role === 'teacher') {
        if (!contentType || contentType === 'exam') {
          examsData = await fetchExamsWithStats(
            supabase
              .from('exams')
              .select('*, subject:subjects(name), teacher:teachers(users(full_name)), section:sections(name)')
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
          );
        }

        if (!contentType || contentType === 'assignment') {
          assignmentsData = await fetchAssignmentsWithCounts(
            supabase
              .from('assignments')
              .select('*, subject:subjects(name), teacher:teachers(users(full_name))')
              .eq('teacher_id', user.id)
              .order('created_at', { ascending: false })
          );
        }
      } else if (role === 'student') {
        const { data: studentProfile } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();

        if (studentProfile?.section_id) {
          const sectionId = studentProfile.section_id;

          const { data: assignmentSections } = await supabase
            .from('assignment_sections')
            .select('assignment_id')
            .eq('section_id', sectionId);
          
          const sectionAssignmentIds = assignmentSections?.map(as => as.assignment_id) || [];

          if (!contentType || contentType === 'exam') {
            const [examsRes, examAttemptsRes] = await Promise.all([
              supabase
                .from('exams')
                .select('*, subject:subjects(name), teacher:teachers(users(full_name))')
                .eq('section_id', sectionId)
                .eq('status', 'published'),
              supabase
                .from('exam_attempts')
                .select('exam_id, score, status')
                .eq('student_id', user.id)
            ]);
            if (examsRes.error) throw examsRes.error;
            examsData = (examsRes.data || []).map(exam => {
              const attempt = examAttemptsRes.data?.find(a => a.exam_id === exam.id);
              return {
                ...exam,
                submission_status: attempt ? (attempt.status === 'completed' || attempt.status === 'graded' ? 'submitted' : 'pending') : 'pending',
                score: attempt?.score
              };
            });
          }

          if (!contentType || contentType === 'assignment') {
            const [assignmentsRes, assignmentSubmissionsRes] = await Promise.all([
              supabase
                .from('assignments')
                .select('*, subject:subjects(name), teacher:teachers(users(full_name)), assignment_sections(section_id, sections(name, classes(name)))')
                .or(`section_id.eq.${sectionId}${sectionAssignmentIds.length > 0 ? `,id.in.(${sectionAssignmentIds.join(',')})` : ''}`)
                .eq('status', 'published'),
              supabase
                .from('assignment_submissions')
                .select('assignment_id, score, status')
                .eq('student_id', user.id)
            ]);
            if (assignmentsRes.error) throw assignmentsRes.error;
            assignmentsData = (assignmentsRes.data || []).map(assignment => {
              const submission = assignmentSubmissionsRes.data?.find(s => s.assignment_id === assignment.id);
              return {
                ...assignment,
                submission_status: submission ? (submission.status === 'graded' ? 'graded' : 'submitted') : 'pending',
                score: submission?.score
              };
            });
          }
        }
      } else if (role === 'admin' || role === 'management') {
        if (!contentType || contentType === 'exam') {
          examsData = await fetchExamsWithStats(
            supabase
              .from('exams')
              .select('*, subject:subjects(name), teacher:teachers(users(full_name)), section:sections(name)')
              .order('created_at', { ascending: false })
          );
        }

        if (!contentType || contentType === 'assignment') {
          assignmentsData = await fetchAssignmentsWithCounts(
            supabase
              .from('assignments')
              .select('*, subject:subjects(name), teacher:teachers(users(full_name))')
              .order('created_at', { ascending: false })
          );
        }
      }

      const combined: EducationalContent[] = [
        ...examsData.map(e => ({
          id: e.id,
          type: 'exam' as const,
          title: e.title,
          description: e.description,
          subject_id: e.subject_id,
          subject_name: e.subject?.name,
          teacher_id: e.teacher_id,
          teacher_name: e.teacher?.users?.full_name,
          start_time: e.start_time,
          end_time: e.end_time,
          exam_date: e.exam_date,
          duration: e.duration,
          status: e.status,
          section_id: e.section_id,
          section_name: e.section?.name,
          created_at: e.created_at,
          submission_status: e.submission_status,
          score: e.score,
          submission_count: e.submission_count,
          graded_count: e.graded_count,
          avg_score: e.avg_score,
          question_count: e.question_count
        })),
        ...assignmentsData.map(a => ({
          id: a.id,
          type: 'assignment' as const,
          title: a.title,
          description: a.description,
          subject_id: a.subject_id,
          subject_name: a.subject?.name,
          teacher_id: a.teacher_id,
          teacher_name: a.teacher?.users?.full_name,
          due_date: a.due_date,
          status: a.status,
          section_id: a.section_id,
          created_at: a.created_at,
          file_url: a.file_url,
          submission_status: a.submission_status,
          score: a.score,
          submission_count: a.submission_count,
          graded_count: a.graded_count,
          assignment_sections: a.assignment_sections
        }))
      ];

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContent(combined);
    } catch (err: any) {
      console.error('Error fetching educational content:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, role, contentType]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return { content, loading, error, refresh: fetchContent };
}
