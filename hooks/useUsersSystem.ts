
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

// 🚀 دالة مساعدة لفك التغليف الآمن واستخراج الاسم للترتيب
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
          id,
          national_id,
          gender,
          parent_id,
          section_id,
          next_year_track,
          track_selection_date,
          users (full_name, email, phone, avatar_url),
          sections (id, name, classes (id, name, level)),
          parents (users (full_name))
        `)
        .limit(5000); // 🚀 السحر هنا: كسر حاجز الـ 1000 طالب الافتراضي وإحضار الجميع

      if (error) throw error;
      
      // 🚀 الفرز الأبجدي العربي لجميع الطلاب في الموقع
      const sortedData = (data as any[] || []).sort((a, b) => {
        return extractName(a).localeCompare(extractName(b), 'ar');
      });

      setStudents((sortedData as unknown) as Student[]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الطلاب';
      console.error('Error fetching students:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          specialization,
          zoom_link,
          users (full_name, email, phone, avatar_url),
          teacher_sections (
            section_id,
            subject_id,
            sections (name, classes (name)),
            subjects (name)
          )
        `)
        .limit(5000); // 🚀 كسر حاجز الـ 1000 للمعلمين أيضاً

      if (error) throw error;

      // 🚀 فرز المعلمين أبجدياً
      const sortedData = (data as any[] || []).sort((a, b) => {
        return extractName(a).localeCompare(extractName(b), 'ar');
      });

      setTeachers((sortedData as unknown) as Teacher[]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب المعلمين';
      console.error('Error fetching teachers:', err);
      setError(errorMessage);
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
        .select(`
          id,
          national_id,
          job_title,
          workplace,
          address,
          users (full_name, email, phone, avatar_url)
        `)
        .limit(5000); // 🚀 كسر حاجز الـ 1000 لأولياء الأمور

      if (error) throw error;

      // 🚀 فرز أولياء الأمور أبجدياً
      const sortedData = (data as any[] || []).sort((a, b) => {
        return extractName(a).localeCompare(extractName(b), 'ar');
      });

      setParents((sortedData as unknown) as Parent[]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء جلب أولياء الأمور';
      console.error('Error fetching parents:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, classes(name, level)')
        .limit(5000); // للحماية المستقبلية
      
      if (error) throw error;

      const sortedData = (data as any[] || []).sort((a, b) => {
        const classA = Array.isArray(a.classes) ? a.classes[0]?.name : a.classes?.name;
        const classB = Array.isArray(b.classes) ? b.classes[0]?.name : b.classes?.name;
        const nameA = `${classA || ''} ${a.name || ''}`;
        const nameB = `${classB || ''} ${b.name || ''}`;
        return nameA.localeCompare(nameB, 'ar', { numeric: true });
      });

      setSections((sortedData as unknown) as Section[]);
    } catch (err: unknown) {
      console.error('Error fetching sections:', err);
    }
  }, []);

  const fetchSubjects = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .limit(1000);
      
      if (error) throw error;

      const sortedData = (data as any[] || []).sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });

      setSubjects((sortedData as unknown) as Subject[]);
    } catch (err: unknown) {
      console.error('Error fetching subjects:', err);
    }
  }, []);

  const addStudent = useCallback(async (studentData: Partial<Student & { email: string, full_name: string, phone: string, parent_id?: string | null }>): Promise<{ success: boolean }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // الضمان الأمني: فرض الإيميل القياسي إذا لم يتم تقديم إيميل
      const safeEmail = studentData.email || `${studentData.national_id}@alrefaa.edu`;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: safeEmail,
          password: '123456', // ضمان أن كلمة المرور هي 123456 دائماً
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
    } catch (err: unknown) {
      console.error('Error adding student:', err);
      throw err;
    }
  }, [fetchStudents]);

  const updateStudent = useCallback(async (studentId: string, oldNationalId: string, updateData: Partial<Student & { email: string }>): Promise<{ success: boolean }> => {
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
    } catch (err: unknown) {
      console.error('Error updating student:', err);
      throw err;
    }
  }, [fetchStudents]);

  const addTeacher = useCallback(async (teacherData: Partial<Teacher & { email: string, full_name: string, phone: string, zoom_link?: string, specialization?: string }>): Promise<{ success: boolean, password?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      }

      const safeEmail = teacherData.email || `${teacherData.national_id}@alrefaa.edu`;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: safeEmail,
          password: '123456', 
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
    } catch (err: unknown) {
      console.error('Error adding teacher:', err);
      throw err;
    }
  }, [fetchTeachers]);

  const updateTeacher = useCallback(async (teacherId: string, oldNationalId: string, updateData: Partial<Teacher & { email: string, zoom_link?: string, specialization?: string }>): Promise<{ success: boolean }> => {
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
    } catch (err: unknown) {
      console.error('Error updating teacher:', err);
      throw err;
    }
  }, [fetchTeachers]);

  const addParent = useCallback(async (parentData: Partial<Parent & { email: string, full_name: string, phone: string, job_title?: string, workplace?: string, student_ids?: string[] }>): Promise<{ success: boolean, password?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      }

      const safeEmail = parentData.email || `${parentData.national_id}@alrefaa.edu`;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: safeEmail,
          password: '123456', 
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
    } catch (err: unknown) {
      console.error('Error adding parent:', err);
      throw err;
    }
  }, [fetchParents]);

  const updateParent = useCallback(async (parentId: string, oldNationalId: string, updateData: Partial<Parent & { email: string }>): Promise<{ success: boolean }> => {
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
    } catch (err: unknown) {
      console.error('Error updating parent:', err);
      throw err;
    }
  }, [fetchParents]);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean }> => {
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
    } catch (err: unknown) {
      console.error('Error deleting user:', err);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword?: string): Promise<{ success: boolean, newPassword?: string }> => {
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
    } catch (err: unknown) {
      console.error('Error resetting password:', err);
      throw err;
    }
  }, []);

  const fetchStudentProfile = useCallback(async (studentId: string): Promise<{ student: Student, attendanceStats: any, absentDates: string[], recentGrades: any[] }> => {
    try {
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
        student: student as unknown as Student,
        attendanceStats,
        absentDates,
        recentGrades
      };
    } catch (err: unknown) {
      console.error('Error fetching student profile:', err);
      throw err;
    }
  }, []);

  const selectTrack = useCallback(async (studentId: string, track: 'scientific' | 'literary'): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          next_year_track: track,
          track_selection_date: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) throw error;
      
      await fetchStudents();
      return { success: true };
    } catch (err: unknown) {
      console.error('Error selecting track:', err);
      throw err;
    }
  }, [fetchStudents]);

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
    selectTrack,
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


