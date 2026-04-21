/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const extractName = (item: any): string => {
  if (!item) return 'غير معروف';
  if (item.full_name) return item.full_name; 
  if (!item.users) return 'غير معروف';
  
  const userObj = Array.isArray(item.users) ? item.users[0] : item.users;
  return userObj?.full_name || 'غير معروف';
};

export function useUsersSystem() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error: err } = await supabase.from('academic_departments').select('*').order('name');
      if (err) throw err;
      setDepartments(data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchStudentsPaginated = useCallback(async (page = 1, limit = 12, searchTerm = '', sectionId = 'all', track = 'all') => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const fields = 'id, national_id, next_year_track, section_id, users(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users(full_name))';
      
      let query = supabase.from('students').select(fields, { count: 'exact' });
      
      if (sectionId !== 'all') query = query.eq('section_id', sectionId);
      if (track !== 'all') query = (track === 'none') ? query.is('next_year_track', null) : query.eq('next_year_track', track);
      if (searchTerm && !isNaN(Number(searchTerm))) query = query.like('national_id', `%${searchTerm}%`);
      
      const { data, count, error: err } = await query.range(from, to).order('created_at', { ascending: false });
      if (err) throw err;
      
      let finalData: any[] = data || [];
      
      if (searchTerm && isNaN(Number(searchTerm))) {
        const { data: sData } = await supabase
          .from('students')
          .select('id, national_id, next_year_track, section_id, users!inner(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users(full_name))')
          .ilike('users.full_name', `%${searchTerm}%`)
          .limit(50);
        finalData = sData || [];
      }
      return { data: finalData, totalCount: count || finalData.length };
    } catch (err) { console.error(err); return { data: [], totalCount: 0 }; }
    finally { setLoading(false); }
  }, []);

  const fetchTeachersPaginated = useCallback(async (page = 1, limit = 12, searchTerm = '', departmentId = 'all') => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      let query = supabase.from('teachers').select('id, specialization, national_id, department_id, custom_titles, zoom_link, users(full_name, email, phone, avatar_url), academic_departments(id, name, head_id), department_heads(id, subject_id, stage_name)', { count: 'exact' });
      
      if (departmentId !== 'all') query = query.eq('department_id', departmentId);
      if (searchTerm && !isNaN(Number(searchTerm))) query = query.like('national_id', `%${searchTerm}%`);
      
      let { data, count, error: err } = await query.range(from, to).order('created_at', { ascending: false });
      if (err) throw err;

      if (searchTerm && isNaN(Number(searchTerm))) {
        const { data: searchData, count: searchCount } = await supabase
          .from('teachers')
          .select('id, specialization, national_id, department_id, custom_titles, zoom_link, users!inner(full_name, email, phone, avatar_url), academic_departments(id, name, head_id), department_heads(id, subject_id, stage_name)', { count: 'exact' })
          .ilike('users.full_name', `%${searchTerm}%`)
          .range(from, to)
          .order('created_at', { ascending: false });
          
          data = searchData;
          count = searchCount;
      }
      
      const processed = (data || []).map((t: any) => ({ ...t, isHOD: t.academic_departments?.head_id === t.id || (t.department_heads && t.department_heads.length > 0) }));
      return { data: processed, totalCount: count || 0 };
    } catch (err) { console.error(err); return { data: [], totalCount: 0 }; }
    finally { setLoading(false); }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('students').select('*, users(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users(full_name))').limit(1000);
      if (err) throw err;
      setStudents((data || []).sort((a: any, b: any) => extractName(a).localeCompare(extractName(b), 'ar')));
    } finally { setLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('teachers').select('*, users(full_name, email, phone, avatar_url), department_heads(id, subject_id, subjects(name)), academic_departments(id, name)').limit(1000);
      if (err) throw err;
      setTeachers((data || []).sort((a: any, b: any) => extractName(a).localeCompare(extractName(b), 'ar')));
    } finally { setLoading(false); }
  }, []);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('parents').select('id, national_id, job_title, workplace, address, users(full_name, email, phone, avatar_url), students(id, users(full_name))').limit(5000);
      if (err) throw err;
      setParents(data || []);
    } finally { setLoading(false); }
  }, []);

  const fetchSections = useCallback(async () => {
    const { data } = await supabase.from('sections').select('id, name, classes(name, level)').order('name');
    setSections(data || []);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    setSubjects(data || []);
  }, []);

  const addStudent = useCallback(async (studentData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...studentData, email: studentData.email || `${studentData.national_id}@alrefaa.edu`, password: '123456', role: 'student' }) });
    return res.json();
  }, []);

  const updateStudent = useCallback(async (id: string, oldId: string, updateData: any) => {
    const res = await fetch('/api/users/update-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: id, updateData }) });
    return res.ok;
  }, []);

  const addTeacher = useCallback(async (teacherData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...teacherData, email: teacherData.email || `${teacherData.national_id}@alrefaa.edu`, password: '123456', role: 'teacher', department_id: teacherData.department_id }) });
    return res.json();
  }, []);

  // 🚀 الدالة التي أصلحناها لتخاطب الواجهة الخلفية وتتجاوز الحماية
  const updateTeacher = useCallback(async (teacherId: string, oldNationalId: string, payload: any, hodData?: any) => {
    try {
      const nationalIdChanged = payload.national_id !== (oldNationalId || '');
      let newEmail = payload.email;

      // 1. إذا تم تغيير الرقم المدني، نحدّث الإيميل في نظام المصادقة أولاً
      if (nationalIdChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/users/update-national-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userId: teacherId, newNationalId: payload.national_id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل تحديث الرقم المدني');
        newEmail = result.newEmail;
      }

      // 2. تحديث باقي البيانات من خلال الـ API (تجاوز الـ RLS)
      const response = await fetch('/api/users/update-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, updateData: payload, newEmail, hodData }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل التحديث من السيرفر');

      await fetchTeachers();
      return true;
    } catch (err: unknown) {
      console.error('Error updating teacher:', err);
      throw err;
    }
  }, [fetchTeachers]);

  const addParent = useCallback(async (parentData: any): Promise<{ success: boolean; password?: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...parentData, email: parentData.email || `${parentData.national_id}@alrefaa.edu`, password: '123456', role: 'parent' }) });
    const result = await res.json();
    if (parentData.student_ids && result.user) {
      await supabase.from('students').update({ parent_id: result.user.id }).in('id', parentData.student_ids);
    }
    return { success: true, password: result.password || '123456' };
  }, []);

  const updateParent = useCallback(async (parentId: string, oldNationalId: string, updateData: any) => {
    const { student_ids, ...pureData } = updateData;
    const res = await fetch('/api/users/update-parent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId, updateData: pureData }) });
    if (student_ids) {
      await supabase.from('students').update({ parent_id: null }).eq('parent_id', parentId);
      if (student_ids.length > 0) await supabase.from('students').update({ parent_id: parentId }).in('id', student_ids);
    }
    return res.ok;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/users/delete?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    return true;
  }, []);

  const resetPassword = useCallback(async (userId: string, newPassword?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ userId, newPassword: newPassword || '' }) });
    return await res.json();
  }, []);

  const fetchStudentProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: err } = await supabase.from('students').select('*, users(full_name, email, phone, avatar_url), sections(name, classes(name, level))').eq('id', userId).maybeSingle();
      if (err) throw err;
      return data;
    } catch (err) { console.error(err); return null; }
  }, []);

  const selectTrack = useCallback(async (studentId: string, track: 'scientific' | 'literary') => {
    try {
      const { error: err } = await supabase.from('students').update({ next_year_track: track, track_selection_date: new Date().toISOString() }).eq('id', studentId);
      if (err) throw err;
      return true;
    } catch (err) { console.error(err); throw err; }
  }, []);

  return {
    students, teachers, parents, sections, subjects, departments, loading, error,
    fetchStudents, fetchTeachers, fetchParents, fetchSections, fetchSubjects, fetchDepartments,
    fetchStudentsPaginated, fetchTeachersPaginated,
    addStudent, updateStudent, addTeacher, updateTeacher, 
    addParent, updateParent, deleteUser, resetPassword,
    fetchStudentProfile, selectTrack
  };
}
