/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Student, Teacher, Parent, Section, Subject } from '@/types';

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
      let query = supabase.from('students').select('id, national_id, next_year_track, section_id, users!students_id_fkey(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users!fk_parents_users(full_name))', { count: 'exact' });
      if (sectionId !== 'all') query = query.eq('section_id', sectionId);
      if (track !== 'all') query = (track === 'none') ? query.is('next_year_track', null) : query.eq('next_year_track', track);
      if (searchTerm && !isNaN(Number(searchTerm))) query = query.like('national_id', `%${searchTerm}%`);
      const { data, count, error: err } = await query.range(from, to).order('created_at', { ascending: false });
      if (err) throw err;
      let finalData = data || [];
      if (searchTerm && isNaN(Number(searchTerm))) {
        const { data: sData } = await supabase.from('students').select('id, national_id, users!students_id_fkey!inner(full_name, email), sections(name, classes(name))').ilike('users.full_name', `%${searchTerm}%`).limit(50);
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
      let query = supabase.from('teachers').select('id, specialization, national_id, department_id, users!teachers_id_fkey(full_name, email, phone, avatar_url), academic_departments(id, name, head_id), department_heads(id, subject_id, stage_name)', { count: 'exact' });
      if (departmentId !== 'all') query = query.eq('department_id', departmentId);
      if (searchTerm && !isNaN(Number(searchTerm))) query = query.like('national_id', `%${searchTerm}%`);
      const { data, count, error: err } = await query.range(from, to).order('created_at', { ascending: false });
      if (err) throw err;
      const processed = (data || []).map(t => ({ ...t, isHOD: t.academic_departments?.head_id === t.id || (t.department_heads && t.department_heads.length > 0) }));
      return { data: processed, totalCount: count || 0 };
    } catch (err) { console.error(err); return { data: [], totalCount: 0 }; }
    finally { setLoading(false); }
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('students').select('*, users!students_id_fkey(full_name, email, phone, avatar_url), sections(id, name, classes(id, name, level)), parents(users!fk_parents_users(full_name))').limit(1000);
      if (err) throw err;
      setStudents((data || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar')) as any);
    } finally { setLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('teachers').select('*, users!teachers_id_fkey(full_name, email, phone, avatar_url), department_heads(id, subject_id, subjects(name)), academic_departments(id, name)').limit(1000);
      if (err) throw err;
      setTeachers((data || []).sort((a, b) => extractName(a).localeCompare(extractName(b), 'ar')) as any);
    } finally { setLoading(false); }
  }, []);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase.from('parents').select('id, national_id, users!fk_parents_users(full_name, email, phone, avatar_url), students(id, users!students_id_fkey(full_name))').limit(5000);
      if (err) throw err;
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
    const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...teacherData, email: teacherData.email || `${teacherData.national_id}@alrefaa.edu`, password: '123456', role: 'teacher' }) });
    return res.json();
  }, []);

  const updateTeacher = async (id: string, oldId: string, payload: any, hodData?: any) => {
    await supabase.from('users').update({ full_name: payload.full_name, email: payload.email, phone: payload.phone }).eq('id', id);
    await supabase.from('teachers').update({ specialization: payload.specialization, zoom_link: payload.zoom_link, custom_titles: payload.custom_titles, department_id: payload.department_id }).eq('id', id);
    if (hodData) {
      await supabase.from('department_heads').delete().eq('teacher_id', id);
      if (hodData.isHead) {
        await supabase.from('department_heads').insert({ teacher_id: id, subject_id: hodData.subject_id, stage_name: hodData.stage_name });
        await supabase.from('academic_departments').update({ head_id: id }).eq('id', payload.department_id);
      }
    }
    return true;
  };

  // 🚀 إضافة دوال أولياء الأمور المفقودة
  const addParent = useCallback(async (parentData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/users/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ ...parentData, email: parentData.email || `${parentData.national_id}@alrefaa.edu`, password: '123456', role: 'parent' }) });
    const result = await res.json();
    if (parentData.student_ids && result.user) {
      await supabase.from('students').update({ parent_id: result.user.id }).in('id', parentData.student_ids);
    }
    return result;
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

  return {
    students, teachers, parents, sections, subjects, departments, loading, error,
    fetchStudents, fetchTeachers, fetchParents, fetchSections, fetchSubjects, fetchDepartments,
    fetchStudentsPaginated, fetchTeachersPaginated,
    addStudent, updateStudent, addTeacher, updateTeacher, 
    addParent, updateParent, // 👈 تم إرجاعهما الآن لتعمل صفحة أولياء الأمور
    deleteUser, resetPassword
  };
}
