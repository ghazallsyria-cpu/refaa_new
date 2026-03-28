import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useUsersSystem() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          national_id,
          gender,
          parent_id,
          users (full_name, email, phone),
          sections (name, classes (name)),
          parents (users (full_name))
        `);

      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الطلاب');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          specialization,
          users (full_name, email, phone)
        `);

      if (error) throw error;
      setTeachers(data || []);
    } catch (err: any) {
      console.error('Error fetching teachers:', err);
      setError(err.message || 'حدث خطأ أثناء جلب المعلمين');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('parents')
        .select(`
          id,
          users (full_name, email, phone)
        `);

      if (error) throw error;
      setParents(data || []);
    } catch (err: any) {
      console.error('Error fetching parents:', err);
      setError(err.message || 'حدث خطأ أثناء جلب أولياء الأمور');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, classes(name)');
      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      console.error('Error fetching sections:', err);
    }
  }, []);

  const [subjects, setSubjects] = useState<any[]>([]);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      console.error('Error fetching subjects:', err);
    }
  }, []);

  const addStudent = useCallback(async (studentData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: studentData.email || null,
          full_name: studentData.full_name,
          national_id: studentData.national_id,
          phone: studentData.phone,
          role: 'student',
          section_id: studentData.section_id || null,
          parent_id: studentData.parent_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب الطالب');
      }

      await fetchStudents();
      return { success: true };
    } catch (err: any) {
      console.error('Error adding student:', err);
      throw err;
    }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (studentId: string, oldNationalId: string, updateData: any) => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;

      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: studentId,
            newNationalId: updateData.national_id,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني في المصادقة');
        newEmail = result.newEmail;
      }

      const response = await fetch('/api/users/update-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          updateData,
          newEmail
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update student');

      await fetchStudents();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating student:', err);
      throw err;
    }
  }, [fetchStudents]);

  const addTeacher = useCallback(async (teacherData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: teacherData.email || null,
          full_name: teacherData.full_name,
          national_id: teacherData.national_id,
          phone: teacherData.phone,
          role: 'teacher',
          specialization: teacherData.specialization,
          zoom_link: teacherData.zoom_link,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب المعلم');
      }

      await fetchTeachers();
      return { success: true, password: data.password };
    } catch (err: any) {
      console.error('Error adding teacher:', err);
      throw err;
    }
  }, [fetchTeachers]);

  const updateTeacher = useCallback(async (teacherId: string, oldNationalId: string, updateData: any) => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;

      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: teacherId,
            newNationalId: updateData.national_id,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني في المصادقة');
        newEmail = result.newEmail;
      }

      const response = await fetch('/api/users/update-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          updateData,
          newEmail
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update teacher');

      await fetchTeachers();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      throw err;
    }
  }, [fetchTeachers]);

  const addParent = useCallback(async (parentData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: parentData.email || null,
          full_name: parentData.full_name,
          national_id: parentData.national_id,
          phone: parentData.phone,
          role: 'parent',
          job_title: parentData.job_title,
          workplace: parentData.workplace,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء حساب ولي الأمر');
      }

      if (parentData.student_ids && parentData.student_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('students')
          .update({ parent_id: data.user.id })
          .in('id', parentData.student_ids);
        
        if (linkError) {
          console.error('Error linking students:', linkError);
        }
      }

      await fetchParents();
      return { success: true, password: data.password };
    } catch (err: any) {
      console.error('Error adding parent:', err);
      throw err;
    }
  }, [fetchParents]);

  const updateParent = useCallback(async (parentId: string, oldNationalId: string, updateData: any) => {
    try {
      const nationalIdChanged = updateData.national_id !== (oldNationalId || '');
      let newEmail = updateData.email;

      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            userId: parentId,
            newNationalId: updateData.national_id,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني في المصادقة');
        newEmail = result.newEmail;
      }

      const response = await fetch('/api/users/update-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId,
          updateData,
          newEmail
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update parent');

      await fetchParents();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating parent:', err);
      throw err;
    }
  }, [fetchParents]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/users/delete?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل حذف المستخدم');
      }
      
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting user:', err);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId, newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');
      
      return { success: true, newPassword: data.newPassword || newPassword };
    } catch (err: any) {
      console.error('Error resetting password:', err);
      throw err;
    }
  }, []);

  const fetchStudentProfile = useCallback(async (studentId: string) => {
    try {
      // Fetch student profile
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*, users(*), sections(*, classes(*))')
        .eq('id', studentId)
        .single();
      
      if (studentError) throw studentError;

      let attendanceStats = null;
      let absentDates: string[] = [];
      let recentGrades: any[] = [];

      if (student) {
        // Fetch attendance stats
        const { data: attendance, error: attendanceError } = await supabase
          .from('daily_attendance_summary')
          .select('daily_status, date')
          .eq('student_id', student.id);
        
        if (attendanceError) throw attendanceError;

        if (attendance) {
          const total = attendance.length;
          const present = attendance.filter(a => a.daily_status === 'present').length;
          const partial = attendance.filter(a => a.daily_status === 'partial_absent').length;
          const absent = attendance.filter(a => a.daily_status === 'full_absent');
          
          attendanceStats = {
            total,
            present,
            partial,
            absent: absent.length,
            rate: total > 0 ? Math.round(((present + partial * 0.5) / total) * 100) : 100
          };
          absentDates = absent.map(a => a.date);
        }

        // Fetch recent grades
        const { data: grades, error: gradesError } = await supabase
          .from('exam_attempts')
          .select('*, exam:exams(title, subject:subjects(name))')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        if (gradesError) throw gradesError;
        recentGrades = grades || [];
      }

      return {
        student,
        attendanceStats,
        absentDates,
        recentGrades
      };
    } catch (err: any) {
      console.error('Error fetching student profile:', err);
      throw err;
    }
  }, []);

  return {
    students,
    teachers,
    parents,
    sections,
    subjects,
    loading,
    error,
    fetchStudents,
    fetchTeachers,
    fetchParents,
    fetchSections,
    fetchSubjects,
    fetchStudentProfile,
    addStudent,
    updateStudent,
    addTeacher,
    updateTeacher,
    addParent,
    updateParent,
    deleteUser,
    resetPassword
  };
}
