/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Student, Teacher, Parent, Section, Subject } from '@/types';

// استخراج الاسم الرباعي من كائن المستخدم المربوط
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
  const [departments, setDepartments] = useState<any[]>([]); // 🏢 الأقسام الجديدة
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // 🏢 1. نظام الأقسام الأكاديمية (Academic Departments)
  // ============================================================================
  
  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('academic_departments')
        .select('*')
        .order('name');
      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  // ============================================================================
  // 👨‍🎓 2. إدارة الطلاب بنظام الصفحات والبحث (Students Pagination)
  // ============================================================================
  
  const fetchStudentsPaginated = useCallback(async (
    page: number = 1,
    limit: number = 12,
    searchTerm: string = '',
    sectionId: string = 'all',
    track: string = 'all'
  ): Promise<{ data: any[]; totalCount: number }> => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('students')
        .select(`
          id, national_id, gender, parent_id, section_id, next_year_track,
          users!students_id_fkey(full_name, email, phone, avatar_url),
          sections(id, name, classes(id, name, level)),
          parents(users!fk_parents_users(full_name))
        `, { count: 'exact' });

      if (sectionId !== 'all') query = query.eq('section_id', sectionId);
      if (track !== 'all') {
        if (track === 'none') query = query.is('next_year_track', null);
        else query = query.eq('next_year_track', track);
      }

      // البحث بالرقم المدني (رقمي)
      if (searchTerm && !isNaN(Number(searchTerm))) {
        query = query.like('national_id', `%${searchTerm}%`);
      }

      const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });
      if (error) throw error;

      let finalData = data || [];
      let finalCount = count || 0;

      // البحث بالاسم (نصي) - يتطلب استعلام منفصل بـ inner join للسرعة
      if (searchTerm && isNaN(Number(searchTerm))) {
        const { data: sData } = await supabase
          .from('students')
          .select(`id, national_id, users!students_id_fkey!inner(full_name, email), sections(name, classes(name))`)
          .ilike('users.full_name', `%${searchTerm}%`)
          .limit(50);
        finalData = sData || [];
        finalCount = finalData.length;
      }

      return { data: finalData, totalCount: finalCount };
    } catch (err) {
      console.error(err);
      return { data: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // 👨‍🏫 3. إدارة المعلمين بنظام الصفحات والأقسام (Teachers Pagination & HOD)
  // ============================================================================
  
  const fetchTeachersPaginated = useCallback(async (
    page: number = 1,
    limit: number = 12,
    searchTerm: string = '',
    departmentId: string = 'all'
  ): Promise<{ data: any[]; totalCount: number }> => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('teachers')
        .select(`
          id, specialization, custom_titles, national_id, department_id,
          users!teachers_id_fkey(full_name, email, phone, avatar_url),
          academic_departments(id, name, head_id),
          department_heads(id, subject_id, stage_name)
        `, { count: 'exact' });

      if (departmentId !== 'all') query = query.eq('department_id', departmentId);
      if (searchTerm && !isNaN(Number(searchTerm))) query = query.like('national_id', `%${searchTerm}%`);

      const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });
      if (error) throw error;

      // تحديد من هو رئيس القسم برمجياً بناءً على head_id
      const processed = (data || []).map(t => ({
        ...t,
        isHOD: t.academic_departments?.head_id === t.id || (t.department_heads && t.department_heads.length > 0)
      }));

      return { data: processed, totalCount: count || 0 };
    } catch (err) {
      console.error(err);
      return { data: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // 🔄 4. الدوال القديمة (للتوافق مع باقي النظام)
  // ============================================================================

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('students').select('*, users!students_id_fkey(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users!fk_parents_users(full_name))').limit(1000);
      if (error) throw error;
      const sorted = (data || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar'));
      setStudents(sorted as any);
    } finally { setLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('teachers').select('*, users!teachers_id_fkey(full_name, email, phone, avatar_url), department_heads(id, subject_id, subjects(name)), academic_departments(id, name)').limit(1000);
      if (error) throw error;
      const sorted = (data || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar'));
      setTeachers(sorted as any);
    } finally { setLoading(false); }
  }, []);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('parents').select('id, national_id, users!fk_parents_users(full_name, email, phone, avatar_url), students(id, users!students_id_fkey(full_name))').limit(5000);
      if (error) throw error;
      setParents(data as any);
    } finally { setLoading(false); }
  }, []);

  const fetchSections = useCallback(async () => {
    const { data } = await supabase.from('sections').select('id, name, classes(name, level)').order('name');
    setSections(data as any);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    setSubjects(data as any);
  }, []);

  // ============================================================================
  // ⚡ 5. العمليات التنفيذية (Add, Update, Delete, Reset)
  // ============================================================================

  const addStudent = useCallback(async (data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const email = data.email || `${data.national_id}@alrefaa.edu`;
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ ...data, email, password: '123456', role: 'student' }),
    });
    if (!res.ok) throw new Error('فشل الإضافة');
    return await res.json();
  }, []);

  const updateStudent = useCallback(async (id: string, oldId: string, data: any) => {
    const res = await fetch('/api/users/update-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, updateData: data }),
    });
    if (!res.ok) throw new Error('فشل التحديث');
    return true;
  }, []);

  const addTeacher = useCallback(async (data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const email = data.email || `${data.national_id}@alrefaa.edu`;
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ ...data, email, password: '123456', role: 'teacher' }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل إضافة المعلم');
    return result;
  }, []);

  const updateTeacher = async (id: string, oldId: string, payload: any, hodData?: any) => {
    // تحديث جدول المستخدمين العام
    await supabase.from('users').update({ full_name: payload.full_name, email: payload.email, phone: payload.phone }).eq('id', id);
    // تحديث جدول المعلمين (بما في ذلك القسم)
    await supabase.from('teachers').update({ specialization: payload.specialization, zoom_link: payload.zoom_link, custom_titles: payload.custom_titles, department_id: payload.department_id }).eq('id', id);
    
    // إدارة مناصب رئاسة الأقسام
    if (hodData) {
      await supabase.from('department_heads').delete().eq('teacher_id', id);
      if (hodData.isHead) {
        await supabase.from('department_heads').insert({ teacher_id: id, subject_id: hodData.subject_id, stage_name: hodData.stage_name });
        // تحديث الـ head_id في جدول الأقسام أيضاً لضمان الربط الثنائي
        await supabase.from('academic_departments').update({ head_id: id }).eq('id', payload.department_id);
      }
    }
    return true;
  };

  const deleteUser = useCallback(async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/users/delete?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    return true;
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ userId, newPassword: newPassword || '' })
    });
    return await res.json();
  }, []);

  return {
    students, teachers, parents, sections, subjects, departments, loading, error,
    fetchStudents, fetchTeachers, fetchParents, fetchSections, fetchSubjects, fetchDepartments,
    fetchStudentsPaginated, fetchTeachersPaginated,
    addStudent, updateStudent, addTeacher, updateTeacher, deleteUser, resetPassword
  };
}
