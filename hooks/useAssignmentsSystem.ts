import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: any[]; 
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

const formatAssignmentQuestion = (q: any) => {
  let cleanOptions: string[] = [];
  if (Array.isArray(q.options)) {
    cleanOptions = q.options.map((opt: any) => {
      if (typeof opt === 'string') return opt;
      if (typeof opt === 'object' && opt !== null) {
        return opt.content || opt.text || opt.id || String(opt);
      }
      return String(opt);
    });
  }

  return {
    id: q.id || crypto.randomUUID(),
    content: q.question_text || q.content || '',
    type: q.question_type || q.type || 'text',
    options: cleanOptions,
    points: q.points || 0,
    isRequired: q.is_required ?? true,
    media_url: q.media_url || q.mediaUrl || null
  };
};

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user || !currentRole) return;
    setLoading(true);
    setError(null);
    try {
      const selectQuery = currentRole === 'student' 
        ? `*, subject:subjects(name), teacher:teachers(users!fk_teachers_id(full_name)), assignment_sections!inner(section_id, sections(name, classes(name)))`
        : `*, subject:subjects(name), teacher:teachers(users!fk_teachers_id(full_name)), assignment_sections(section_id, sections(name, classes(name)))`;

      let query = supabase.from('assignments').select(selectQuery).order('created_at', { ascending: false });

      if (currentRole === 'student') {
        let studentProfile = null;
        // 🚀 الإصلاح: البحث الآمن عن الطالب باستخدام الـ id فقط
        const { data: sp } = await supabase.from('students').select('id, section_id').eq('id', user.id).maybeSingle();
        if (sp) studentProfile = sp;

        if (studentProfile?.section_id) {
          query = query.eq('assignment_sections.section_id', studentProfile.section_id).eq('status', 'published');
        } else {
          setData([]); setLoading(false); return;
        }
      } else if (currentRole === 'teacher') {
        let teacherProfile = null;
        // 🚀 الإصلاح הגذري: البحث الآمن عن المعلم باستخدام الـ id فقط وإزالة البحث المعطوب
        const { data: tp } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
        if (tp) teacherProfile = tp;
          
        if (teacherProfile) {
          query = query.eq('teacher_id', teacherProfile.id);
        } else {
          setData([]); setLoading(false); return;
        }
      }

      const { data: assignmentsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let mappedData: AssignmentWithMeta[] = (assignmentsData || []).map((a: any) => {
        const aSections = a.assignment_sections || [];
        const sectionNames = aSections.map((es: any) => {
            const s = es.sections;
            if (!s) return 'غير محدد';
            const cName = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name;
            return cName ? `${cName} - ${s.name}` : s.name;
        }).join('، ');

        return {
          ...a,
          subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name,
          teacher_name: Array.isArray(a.teacher?.users) ? a.teacher.users[0]?.full_name : a.teacher?.users?.full_name,
          section_name: sectionNames || 'غير محدد',
        };
      });

      if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        // 🚀 إنقاذ السيرفر: بدلاً من 100 طلب، نقوم بطلب واحد فقط (دمج الطلبات)
        if (mappedData.length > 0) {
          const assignmentIds = mappedData.map(a => a.id);
          
          const { data: allAttempts, error: attemptsError } = await supabase
            .from('assignment_submissions')
            .select('assignment_id, status')
            .in('assignment_id', assignmentIds);

          if (!attemptsError && allAttempts) {
            // توزيع البيانات في الذاكرة لتسريع الأداء
            const attemptsMap = allAttempts.reduce((acc: any, curr: any) => {
              if (!acc[curr.assignment_id]) acc[curr.assignment_id] = [];
              acc[curr.assignment_id].push(curr);
              return acc;
            }, {});

            mappedData = mappedData.map(a => {
              const subs = attemptsMap[a.id] || [];
              return {
                ...a,
                submission_count: subs.length,
                graded_count: subs.filter((s: any) => s.status === 'graded').length,
              };
            });
          }
        }
      }

      if (currentRole === 'student') {
        const { data: subData } = await supabase.from('assignment_submissions').select('assignment_id, status, grade, id, student_id, submitted_at').eq('student_id', user.id);
        const subMap: Record<string, AssignmentSubmission> = {};
        (subData || []).forEach((s: any) => { subMap[s.assignment_id] = s; });
        setStudentSubmissions(subMap);
      }

      setData(mappedData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching assignments');
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      if (error) throw error;
      return (data || []).map(formatAssignmentQuestion);
    } catch (err) { return []; }
  }, []);

  const saveAssignment = useCallback(async (payload: Partial<Assignment>, assignmentId: string | null, questions: any[], sectionIds: string[], subjects: Subject[]): Promise<string> => {
    const response = await fetch('/api/assignments/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, assignmentId, questions, sectionIds, subjects, userId: user?.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل حفظ الواجب');
    await fetchAssignments();
    return result.id;
  }, [user, fetchAssignments]);

  const deleteAssignment = useCallback(async (assignmentId: string): Promise<void> => {
    const response = await fetch(`/api/assignments/delete?id=${assignmentId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string): Promise<AssignmentDetails> => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`*, subject:subjects(name), teacher:teachers(users!fk_teachers_id(full_name)), assignment_sections(section_id, sections(name, classes(name)))`)
        .eq('id', assignmentId)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignmentData) throw new Error('الواجب غير موجود أو لا تملك صلاحية الوصول إليه');

      const { data: qData } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order');

      let submissionData = null;
      let answersData: any[] = [];
      let allSubmissionsData: any[] = [];

      if (currentRole === 'student' && user) {
        let studentProfile = null;
        // 🚀 الإصلاح: البحث الآمن
        const { data: sp } = await supabase.from('students').select('id').eq('id', user.id).maybeSingle();
        if (sp) studentProfile = sp;

        if (studentProfile) {
          const { data: subData } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('student_id', studentProfile.id)
            .maybeSingle();
          
          if (subData) {
            submissionData = subData;
            const { data: aData } = await supabase.from('assignment_answers').select('*').eq('submission_id', subData.id);
            answersData = aData || [];
          }
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const { data: subsData } = await supabase
          .from('assignment_submissions')
          .select(`*, student:students(users!fk_students_users(full_name, email), sections(id, name, classes(id, name)))`)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        
        if (subsData) allSubmissionsData = subsData;
      }

      return {
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map(formatAssignmentQuestion),
        submission: submissionData as any,
        answers: answersData as any,
        allSubmissions: allSubmissionsData as any
      };
    } catch (err) { 
      console.error("fetchAssignmentDetails Error:", err);
      throw err; 
    }
  }, [user, currentRole]);

  const submitAssignment = useCallback(async (
    assignmentId: string, 
    answers: RawAssignmentAnswer[], 
    submissionId?: string,
    content?: string,
    fileUrl?: string
  ): Promise<string> => {
    const studentName = user?.user_metadata?.full_name || 'طالب';
    const response = await fetch('/api/assignments/submit', {
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
        .select(`*, student:students(users!fk_students_users(full_name, email), sections(name, classes(name)))`)
        .eq('id', submissionId)
        .maybeSingle();
        
      if (subError) throw subError;
      if (!submissionData) throw new Error('التسليم غير موجود');
      
      const { data: assignmentData } = await supabase.from('assignments').select('*, subject:subjects(name)').eq('id', submissionData.assignment_id).maybeSingle();
      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', submissionData.assignment_id).order('order');
      const { data: answersData } = await supabase.from('assignment_answers').select('*').eq('submission_id', submissionId);

      return {
        submission: submissionData as any,
        assignment: assignmentData as any,
        questions: (qData || []).map(formatAssignmentQuestion),
        answers: answersData || []
      };
    } catch (err) { 
      console.error("fetchSubmissionDetails Error:", err);
      throw err; 
    }
  }, []);

  const updateSubmissionGrade = useCallback(async (
    submissionId: string, 
    grade: number, 
    feedback: string, 
    studentId: string, 
    assignmentTitle: string,
    answersGrading?: any[]
  ): Promise<void> => {
    const response = await fetch('/api/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback, studentId, assignmentTitle, answersGrading }),
    });
    
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update grade');
  }, []);

  const deleteSubmission = useCallback(async (submissionId: string): Promise<void> => {
    const response = await fetch('/api/assignments/delete-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'فشل حذف التسليم');
  }, []);

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade, deleteSubmission };
}
