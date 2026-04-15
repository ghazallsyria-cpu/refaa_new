import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Student, Teacher, Parent, Section, Subject } from '@/types';

export interface StudentProfile {
  student: Student;
  attendanceStats: {
    total: number;
    present: number;
    partial: number;
    absent: number;
    rate: number;
  } | null;
  absentDates: string[];
  recentGrades: any[];
}

const extractName = (item: any): string => {
  if (!item || !item.users) return '';
  const userObj = Array.isArray(item.users) ? item.users[0] : item.users;
  return userObj?.full_name || '';
};

export function useUsersSystem() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, national_id, gender, parent_id, section_id, next_year_track, track_selection_date,
          users!students_id_fkey (full_name, email, phone, avatar_url),
          sections (id, name, classes (id, name, level)),
          parents (users!fk_parents_users (full_name))
        `)
        .limit(5000);

      if (error) throw error;
      const sortedData = (data as any[] || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar'));
      setStudents((sortedData as unknown) as Student[]);
    } catch (err: unknown) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // 🚀 الجسور الآمنة مضافة هنا لمنع اختفاء البيانات
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id, specialization, zoom_link, custom_titles,
          users!teachers_id_fkey (full_name, email, phone, avatar_url),
          department_heads (id, subject_id, stage_name, subjects(name)),
          teacher_sections (section_id, subject_id, sections (name, classes (name)), subjects (name))
        `)
        .limit(5000);

      if (error) throw error;
      const sortedData = (data as any[] || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar'));
      setTeachers((sortedData as unknown) as Teacher[]);
    } catch (err: unknown) {
      console.error('Error fetching teachers:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParents = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('id, national_id, job_title, workplace, address, users!fk_parents_users (full_name, email, phone, avatar_url)')
        .limit(5000);

      if (error) throw error;
      const sortedData = (data as any[] || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar'));
      setParents((sortedData as unknown) as Parent[]);
    } catch (err: unknown) {
      console.error('Error fetching parents:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('sections').select('id, name, classes(name, level)').limit(5000);
      if (error) throw error;
      const sortedData = (data as any[] || []).sort((a, b) => {
        const classA = Array.isArray(a.classes) ? a.classes[0]?.name : a.classes?.name;
        const classB = Array.isArray(b.classes) ? b.classes[0]?.name : b.classes?.name;
        return `${classA || ''} ${a.name || ''}`.localeCompare(`${classB || ''} ${b.name || ''}`, 'ar', { numeric: true });
      });
      setSections((sortedData as unknown) as Section[]);
    } catch (err: unknown) { console.error('Error fetching sections:', err); }
  }, []);

  const fetchSubjects = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('subjects').select('id, name').limit(1000);
      if (error) throw error;
      const sortedData = (data as any[] || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
      setSubjects((sortedData as unknown) as Subject[]);
    } catch (err: unknown) { console.error('Error fetching subjects:', err); }
  }, []);

  const addStudent = useCallback(async (studentData: any): Promise<{ success: boolean }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const safeEmail = studentData.email || `${studentData.national_id}@alrefaa.edu`;
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: safeEmail, password: '123456', full_name: studentData.full_name, national_id: studentData.national_id, phone: studentData.phone, role: 'student', section_id: studentData.section_id || null, parent_id: studentData.parent_id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل إنشاء حساب الطالب');
      await fetchStudents();
      return { success: true };
    } catch (err: unknown) { console.error('Error adding student:', err); throw err; }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (studentId: string, oldNationalId: string, updateData: any): Promise<{ success: boolean }> => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;
      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userId: studentId, newNationalId: updateData.national_id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني');
        newEmail = result.newEmail;
      }
      const response = await fetch('/api/users/update-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, updateData, newEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update student');
      await fetchStudents();
      return { success: true };
    } catch (err: unknown) { console.error('Error updating student:', err); throw err; }
  }, [fetchStudents]);

  const addTeacher = useCallback(async (teacherData: any): Promise<{ success: boolean, password?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const safeEmail = teacherData.email || `${teacherData.national_id}@alrefaa.edu`;
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: safeEmail, password: '123456', full_name: teacherData.full_name, national_id: teacherData.national_id, phone: teacherData.phone, role: 'teacher', specialization: teacherData.specialization, zoom_link: teacherData.zoom_link }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل إنشاء حساب المعلم');
      await fetchTeachers();
      return { success: true, password: data.password };
    } catch (err: unknown) { console.error('Error adding teacher:', err); throw err; }
  }, [fetchTeachers]);

  const updateTeacher = useCallback(async (
    teacherId: string, 
    oldNationalId: string, 
    updateData: any, 
    hodData?: { isHead: boolean, subject_id: string, stage_name: string }
  ): Promise<{ success: boolean }> => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;

      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userId: teacherId, newNationalId: updateData.national_id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني');
        newEmail = result.newEmail;
      }

      const response = await fetch('/api/users/update-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, updateData, newEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update teacher');

      if (updateData.custom_titles !== undefined) {
        await supabase.from('teachers').update({ custom_titles: updateData.custom_titles }).eq('id', teacherId);
      }

      if (hodData !== undefined) {
        await supabase.from('department_heads').delete().eq('teacher_id', teacherId);
        
        if (hodData.isHead && hodData.subject_id) {
          const { error: hodError } = await supabase.from('department_heads').insert({
            teacher_id: teacherId,
            subject_id: hodData.subject_id,
            stage_name: hodData.stage_name
          });
          if (hodError) console.error("Error assigning HOD:", hodError);
        }
      }

      await fetchTeachers();
      return { success: true };
    } catch (err: unknown) { console.error('Error updating teacher:', err); throw err; }
  }, [fetchTeachers]);

  const addParent = useCallback(async (parentData: any): Promise<{ success: boolean, password?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const safeEmail = parentData.email || `${parentData.national_id}@alrefaa.edu`;
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ email: safeEmail, password: '123456', full_name: parentData.full_name, national_id: parentData.national_id, phone: parentData.phone, role: 'parent', job_title: parentData.job_title, workplace: parentData.workplace }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل إنشاء حساب ولي الأمر');
      if (parentData.student_ids && parentData.student_ids.length > 0) {
        await supabase.from('students').update({ parent_id: data.user.id }).in('id', parentData.student_ids);
      }
      await fetchParents();
      return { success: true, password: data.password };
    } catch (err: unknown) { throw err; }
  }, [fetchParents]);

  const updateParent = useCallback(async (parentId: string, oldNationalId: string, updateData: any): Promise<{ success: boolean }> => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;
      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userId: parentId, newNationalId: updateData.national_id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل التحديث');
        newEmail = result.newEmail;
      }
      const response = await fetch('/api/users/update-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, updateData, newEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update parent');
      await fetchParents();
      return { success: true };
    } catch (err: unknown) { throw err; }
  }, [fetchParents]);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/users/delete?id=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!response.ok) throw new Error('فشل حذف المستخدم');
      return { success: true };
    } catch (err: unknown) { throw err; }
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword?: string): Promise<{ success: boolean, newPassword?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ userId, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل التغيير');
      return { success: true, newPassword: data.newPassword || newPassword };
    } catch (err: unknown) { throw err; }
  }, []);

  const fetchStudentProfile = useCallback(async (studentId: string): Promise<any> => {
    try {
      const { data: student, error } = await supabase.from('students').select('*, users!students_id_fkey(*), sections(*, classes(*))').eq('id', studentId).single();
      if (error) throw error;
      return { student, attendanceStats: null, absentDates: [], recentGrades: [] };
    } catch (err: unknown) { throw err; }
  }, []);

  const selectTrack = useCallback(async (studentId: string, track: 'scientific' | 'literary'): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase.from('students').update({ next_year_track: track, track_selection_date: new Date().toISOString() }).eq('id', studentId);
      if (error) throw error;
      await fetchStudents();
      return { success: true };
    } catch (err: unknown) { throw err; }
  }, [fetchStudents]);

  return {
    students, teachers, parents, sections, subjects, loading, error,
    fetchStudents, fetchTeachers, fetchParents, fetchSections, fetchSubjects, fetchStudentProfile,
    selectTrack, addStudent, updateStudent, addTeacher, updateTeacher, addParent, updateParent, deleteUser, resetPassword
  };
}
