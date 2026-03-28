import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- جميع التعريفات المطلوبة لنجاح الـ Build في Netlify ---

export interface AdminDashboardData {
  studentsCount: number;
  teachersCount: number;
  sectionsCount: number;
  attendanceRate: number;
}

export interface StudentDashboardData {
  student: any;
  assignments: any[];
  exams: any[];
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  partialCount: number;
  incompleteCount: number;
  grades: any[];
  todaysSchedule: any[];
  periods: any[];
}

export interface ParentDashboardData {
  children: any[];
  notifications: any[];
}

export interface StudentScheduleData {
  student: any;
  schedule: any[];
  periods: any[];
}

export interface TeacherDashboardData {
  teacher: any;
  sections: any[];
  recentExams: any[];
  recentAssignments: any[];
  schedule: any[];
  periods: any[];
  messages: any[];
  stats: {
    totalStudents: number;
    totalExams: number;
    totalAssignments: number;
  };
}

export function useDashboardSystem() {
  const { user } = useAuth();

  // --- 1. المسؤول (Admin) ---
  const fetchAdminDashboardStats = useCallback(async (): Promise<AdminDashboardData> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [{ count: sC }, { count: tC }, { count: secC }, attRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('date', today)
      ]);
      const attData = (attRes.data || []) as { daily_status: string }[];
      const present = attData.filter(a => a.daily_status === 'present').length;
      return {
        studentsCount: sC || 0,
        teachersCount: tC || 0,
        sectionsCount: secC || 0,
        attendanceRate: attData.length > 0 ? Math.round((present / attData.length) * 100) : 0
      };
    } catch (e) { return { studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }; }
  }, []);

  const fetchAdminRecentActivities = useCallback(async (): Promise<any[]> => {
    try {
      const [{ data: s }, { data: e }] = await Promise.all([
        supabase.from('students').select('users(full_name), created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2)
      ]);
      const act = [
        ...(s || []).map((i: any) => ({ title: `انضمام طالب: ${i.users?.full_name}`, time: i.created_at, color: 'bg-indigo-100 text-indigo-600' })),
        ...(e || []).map((i: any) => ({ title: `اختبار جديد: ${i.title}`, time: i.created_at, color: 'bg-amber-100 text-amber-600' }))
      ];
      return act.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    } catch (e) { return []; }
  }, []);

  // --- 2. الطالب (Student) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase.from('students').select('*, sections(name, classes(name))').eq('id', user.id).single();
      if (!student) return null;
      const [{ data: aSec }, { data: eSec }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id)
      ]);
      const [assignments, exams, attendance, grades, schedule, periods] = await Promise.all([
        supabase.from('assignments').select('*, subject:subjects(name)').in('id', (aSec || []).map(a => (a as any).assignment_id)).limit(3),
        supabase.from('exams').select('*, subject:subjects(name)').in('id', (eSec || []).map(e => (e as any).exam_id)).limit(3),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', new Date().getDay() + 1),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      const attD = (attendance.data || []) as { daily_status: string }[];
      return {
        student,
        assignments: assignments.data || [],
        exams: exams.data || [],
        attendanceRate: attD.length > 0 ? Math.round((attD.filter(a => a.daily_status === 'present').length / attD.length) * 100) : 100,
        presentCount: attD.filter(a => a.daily_status === 'present').length,
        absentCount: attD.filter(a => a.daily_status === 'absent').length,
        partialCount: attD.filter(a => a.daily_status === 'late').length,
        incompleteCount: attD.filter(a => a.daily_status === 'incomplete').length,
        grades: grades.data || [],
        todaysSchedule: schedule.data || [],
        periods: periods.data || []
      };
    } catch (e) { return null; }
  }, [user]);

  const fetchStudentSchedule = useCallback(async (): Promise<StudentScheduleData | null> => {
    if (!user) return null;
    try {
      const { data: st } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).single();
      if (!st) return null;
      const [ { data: sch }, { data: per } ] = await Promise.all([
        supabase.from('schedules').select('*, subjects(name), teachers(zoom_link, users:teacher_id(full_name))').eq('section_id', st.section_id).order('day_of_week').order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      return { student: st, schedule: sch || [], periods: per || [] };
    } catch (e) { return null; }
  }, [user]);

  // --- 3. ولي الأمر (Parent) ---
  const fetchParentDashboardData = useCallback(async (): Promise<ParentDashboardData | null> => {
    if (!user) return null;
    try {
      const [ { data: c }, { data: n } ] = await Promise.all([
        supabase.from('students').select('*, users(full_name), sections(name, classes(name))').eq('parent_id', user.id),
        supabase.from('notifications').select('*').eq('type', 'announcement').order('created_at', { ascending: false }).limit(5)
      ]);
      return { children: c || [], notifications: n || [] };
    } catch (e) { return { children: [], notifications: [] }; }
  }, [user]);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities,
    fetchStudentDashboardData,
    fetchStudentSchedule,
    fetchParentDashboardData,
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, [])
  };
}

