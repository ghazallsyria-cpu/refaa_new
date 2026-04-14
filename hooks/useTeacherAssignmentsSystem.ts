import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";

export interface TeacherAssignment {
  teacher_id: string;
  section_id: string;
  subject_id: string;
  teacher?: { users: { full_name: string } };
  section?: { name: string, classes: { name: string } };
  subject?: { name: string };
}

export interface TeacherData {
  id: string;
  users: { full_name: string };
}

export interface SectionData {
  id: string;
  name: string;
  classes: { name: string };
}

export interface SubjectData {
  id: string;
  name: string;
}

export function useTeacherAssignmentsSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, sRes, subRes, aRes] = await Promise.all([
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('sections').select('id, name, classes(name)'),
        supabase.from('subjects').select('id, name'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id, teacher:teachers(users!fk_teachers_users(full_name)), section:sections(name, classes(name)), subject:subjects(name)')
      ]);

      if (tRes.error) throw tRes.error;
      if (sRes.error) throw sRes.error;
      if (subRes.error) throw subRes.error;
      if (aRes.error) throw aRes.error;

      setTeachers((tRes.data as any[] || []).map(t => ({
        ...t,
        users: Array.isArray(t.users) ? t.users[0] : t.users
      })) as TeacherData[]);

      setSections((sRes.data as any[] || []).map(s => ({
        ...s,
        classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
      })) as SectionData[]);

      setSubjects(subRes.data || []);

      setAssignments((aRes.data as any[] || []).map(a => ({
        ...a,
        teacher: Array.isArray(a.teacher) ? a.teacher[0] : a.teacher,
        section: Array.isArray(a.section) ? a.section[0] : a.section,
        subject: Array.isArray(a.subject) ? a.subject[0] : a.subject
      })) as TeacherAssignment[]);
    } catch (err: any) {
      console.error('Error fetching assignments data:', err);
      setError(err.message || 'حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAssignments = useCallback(async (newAssignments: { teacher_id: string; section_id: string; subject_id: string }[]) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Group by teacher_id to use the save API
      const teacherId = newAssignments[0]?.teacher_id;
      if (!teacherId) throw new Error('No teacher specified');

      const response = await fetch('/api/teacher-assignments/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          assignments: newAssignments,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء حفظ التعيينات');

      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error('Error saving assignments:', err);
      setError(err.message || 'حدث خطأ أثناء حفظ التعيينات');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData, user]);

  const deleteAssignment = useCallback(async (teacher_id: string, section_id: string, subject_id: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/teacher-assignments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacher_id,
          sectionId: section_id,
          subjectId: subject_id,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء حذف التعيين');

      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      setError(err.message || 'حدث خطأ أثناء حذف التعيين');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData, user]);

  const updateAssignment = useCallback(async (
    oldAssignment: { teacher_id: string; section_id: string; subject_id: string },
    newAssignment: { section_id: string; subject_id: string }
  ) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/teacher-assignments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: oldAssignment.teacher_id,
          oldSectionId: oldAssignment.section_id,
          oldSubjectId: oldAssignment.subject_id,
          newSectionId: newAssignment.section_id,
          newSubjectId: newAssignment.subject_id,
          userId: user.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'حدث خطأ أثناء تحديث التعيين');

      await fetchData();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      setError(err.message || 'حدث خطأ أثناء تحديث التعيين');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchData, user]);

  const fetchTeacherAssignments = useCallback(async (teacherId: string): Promise<TeacherAssignment[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('teacher_sections')
        .select('teacher_id, section_id, subject_id, teacher:teachers(users!fk_teachers_users(full_name)), section:sections(name, classes(name)), subject:subjects(name)')
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return (data as any[] || []).map(a => ({
        ...a,
        teacher: Array.isArray(a.teacher) ? a.teacher[0] : a.teacher,
        section: Array.isArray(a.section) ? a.section[0] : a.section,
        subject: Array.isArray(a.subject) ? a.subject[0] : a.subject
      })) as TeacherAssignment[];
    } catch (err: any) {
      console.error('Error fetching teacher assignments:', err);
      setError(err.message || 'حدث خطأ أثناء جلب تعيينات المعلم');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    teachers,
    sections,
    subjects,
    assignments,
    fetchData,
    fetchTeacherAssignments,
    saveAssignments,
    deleteAssignment,
    updateAssignment
  };
}
