import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { Subject, Section, Teacher, Assignment, AssignmentSubmission, AssignmentAnswer, RawAssignmentAnswer, AssignmentWithMeta, SubmissionWithStudent } from '@/types';
import { Question, normalizeQuestion } from '@/types/question';

export interface AssignmentDetails {
  assignment: AssignmentWithMeta;
  questions: Question[];
  submission: AssignmentSubmission | null;
  answers: AssignmentAnswer[];
  allSubmissions: SubmissionWithStudent[];
}

export function useAssignmentsSystem() {
  const { user, authRole, userRole } = useAuth() as { user: { id: string, user_metadata?: any } | null, authRole: string | null, userRole: string | null };
  const currentRole = authRole || userRole;
  
  const [data, setData] = useState<AssignmentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, AssignmentSubmission>>({});

  const fetchAssignments = useCallback(async (): Promise<void> => {
    if (!user?.id || !currentRole) return;
    setLoading(true);
    setError(null);

    try {
      // 🚀 1. جلب الواجبات بشكل مبسط بدون (!inner) المزعجة لتجنب الفشل الصامت
      const { data: assignmentsData, error: fetchErr } = await supabase
        .from('assignments')
        .select(`
          *,
          subject:subjects(name),
          teacher:teachers(users(full_name)),
          assignment_sections(section_id, sections(name, classes(name)))
        `)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      let rawData = assignmentsData || [];

      // 🚀 2. الفلترة الفولاذية داخل المتصفح (In-Memory Filter)
      if (currentRole === 'teacher') {
        const { data: tProfile } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        const tId = tProfile?.id || user.id;
        
        rawData = rawData.filter((a: any) => 
           String(a.teacher_id) === String(tId) || String(a.teacher_id) === String(user.id)
        );
      } else if (currentRole === 'student') {
        const { data: sProfile } = await supabase.from('students').select('section_id').eq('user_id', user.id).maybeSingle();
        const sSectionId = sProfile?.section_id;

        if (sSectionId) {
          rawData = rawData.filter((a: any) => {
            if (a.status !== 'published') return false; // الطالب يرى المنشور فقط
            
            // التحقق من المصفوفة المباشرة (section_ids) أو الجدول المرتبط
            const inArray = Array.isArray(a.section_ids) && a.section_ids.includes(sSectionId);
            const inRel = Array.isArray(a.assignment_sections) && a.assignment_sections.some((rel: any) => String(rel.section_id) === String(sSectionId));
            
            return inArray || inRel;
          });
        } else {
          rawData = [];
        }
      }

      // 3. تنسيق البيانات (تجنب أخطاء المصفوفات في Supabase Joins)
      const mappedData: AssignmentWithMeta[] = rawData.map((a: any) => {
        const safeSubj = Array.isArray(a.subject) ? a.subject[0] : a.subject;
        const safeTeacher = Array.isArray(a.teacher?.users) ? a.teacher.users[0] : a.teacher?.users;

        let sectionName = 'غير محدد';
        if (a.assignment_sections && a.assignment_sections.length > 0) {
           sectionName = a.assignment_sections.map((es: any) => {
             const sec = Array.isArray(es.sections) ? es.sections[0] : es.sections;
             const cls = Array.isArray(sec?.classes) ? sec.classes[0] : sec?.classes;
             return sec ? `${cls?.name || ''} - ${sec.name}` : '';
           }).filter(Boolean).join('، ');
        }

        return {
          ...a,
          created_at: a.created_at || new Date().toISOString(),
          subject_name: safeSubj?.name || 'مادة غير محددة',
          teacher_name: safeTeacher?.full_name || 'معلم غير محدد',
          section_name: sectionName,
        };
      });

      // 4. حساب التسليمات
      if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const { data: countsData } = await supabase.from('assignment_submissions').select('assignment_id, status');
        if (countsData) {
          const updatedData = mappedData.map(a => {
            const subs = countsData.filter(s => String(s.assignment_id) === String(a.id));
            return { ...a, submission_count: subs.length, graded_count: subs.filter(s => s.status === 'graded').length };
          });
          setData(updatedData);
        } else {
          setData(mappedData);
        }
      } else {
        setData(mappedData);
      }

      // 5. جلب تسليمات الطالب
      if (currentRole === 'student') {
        const { data: subData } = await supabase.from('assignment_submissions').select('assignment_id, status, grade, id, student_id, submitted_at').eq('student_id', user.id);
        const subMap: Record<string, AssignmentSubmission> = {};
        (subData || []).forEach((s: any) => { subMap[s.assignment_id] = s; });
        setStudentSubmissions(subMap);
      }

    } catch (err: any) {
      console.error("Fetch Assignments Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const fetchAssignmentQuestions = useCallback(async (assignmentId: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      if (error) throw error;
      return (data || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required }));
    } catch (err) { return []; }
  }, []);

  const saveAssignment = useCallback(async (payload: Partial<Assignment>, assignmentId: string | null, questions: Question[], sectionIds: string[], subjects: Subject[]): Promise<string> => {
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
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to delete assignment');
    await fetchAssignments();
  }, [fetchAssignments]);

  const fetchAssignmentDetails = useCallback(async (assignmentId: string): Promise<AssignmentDetails> => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase.from('assignments').select(`*, subject:subjects(name), teacher:teachers(users(full_name)), assignment_sections(section_id, sections(name, classes(name)))`).eq('id', assignmentId).single();
      if (assignmentError) throw assignmentError;

      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');
      let submissionData: AssignmentSubmission | null = null;
      let answersData: AssignmentAnswer[] = [];
      let allSubmissionsData: SubmissionWithStudent[] = [];

      if (currentRole === 'student' && user) {
        const { data: subData } = await supabase.from('assignment_submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', user.id).maybeSingle();
        if (subData) {
          submissionData = subData as AssignmentSubmission;
          const { data: aData } = await supabase.from('assignment_answers').select('*').eq('submission_id', subData.id);
          answersData = (aData as AssignmentAnswer[]) || [];
        }
      } else if (['teacher', 'admin', 'management'].includes(currentRole || '')) {
        const { data: subsData } = await supabase.from('assignment_submissions').select(`*, student:students(users(full_name, email), sections(name, classes(name)))`).eq('assignment_id', assignmentId).order('submitted_at', { ascending: false });
        if (subsData) allSubmissionsData = subsData as unknown as SubmissionWithStudent[];
      }

      return {
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required })),
        submission: submissionData,
        answers: answersData,
        allSubmissions: allSubmissionsData
      };
    } catch (err) { throw err; }
  }, [user, currentRole]);

  // 🚀 إرسال النص والملف إلى السيرفر بنجاح
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
      const { data: submissionData, error: subError } = await supabase.from('assignment_submissions').select(`*, student:students(users(full_name, email), sections(name, classes(name)))`).eq('id', submissionId).single();
      if (subError) throw subError;
      
      const { data: assignmentData } = await supabase.from('assignments').select('*, subject:subjects(name)').eq('id', (submissionData as any).assignment_id).single();
      const { data: qData } = await supabase.from('assignment_questions').select('*').eq('assignment_id', (submissionData as any).assignment_id).order('order');
      const { data: answersData } = await supabase.from('assignment_answers').select('*').eq('submission_id', submissionId);

      return {
        submission: submissionData as unknown as SubmissionWithStudent,
        assignment: assignmentData as AssignmentWithMeta,
        questions: (qData || []).map((q: any) => normalizeQuestion({ id: q.id, content: q.question_text, type: q.question_type, options: q.options, points: q.points, isRequired: q.is_required })),
        answers: (answersData as AssignmentAnswer[]) || []
      };
    } catch (err) { throw err; }
  }, []);

  const updateSubmissionGrade = useCallback(async (submissionId: string, grade: number, feedback: string, studentId: string, assignmentTitle: string): Promise<void> => {
    const response = await fetch('/api/assignments/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback, studentId, assignmentTitle }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update grade');
  }, []);

  return { data, loading, error, studentSubmissions, refetch: fetchAssignments, fetchAssignmentQuestions, saveAssignment, deleteAssignment, fetchAssignmentDetails, submitAssignment, fetchSubmissionDetails, updateSubmissionGrade };
}
