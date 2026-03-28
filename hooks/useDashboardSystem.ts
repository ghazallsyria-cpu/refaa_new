import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تصدير كافة الواجهات لضمان نجاح الـ Build في Netlify ---

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

export interface TeacherScheduleData {
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
    avgAttendance: number;
    absenceRate: number;
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
      return {
        studentsCount: sC || 0,
        teachersCount: tC || 0,
        sectionsCount: secC || 0,
        attendanceRate: attData.length > 0 ? Math.round((attData.filter(a => a.daily_status === 'present').length / attData.length) * 100) : 0
      };
    } catch (e) { return { studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }; }
  }, []);

  const fetchAdminRecentActivities = useCallback(async (): Promise<any[]> => {
    try {
      const [{ data: s }, { data: e }] = await Promise.all([
        supabase.from('students').select('users(full_name), created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2)
      ]);
      return [
        ...(s || []).map((i: any) => ({ title: `انضمام: ${i.users?.full_name}`, time: i.created_at, color: 'bg-indigo-100 text-indigo-600' })),
        ...(e || []).map((i: any) => ({ title: `اختبار: ${i.title}`, time: i.created_at, color: 'bg-amber-100 text-amber-600' }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    } catch (e) { return []; }
  }, []);

  // --- 2. الطالب (Student) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: st } = await supabase.from('students').select('*, sections(name, classes(name))').eq('id', user.id).single();
      if (!st) return null;
      const [{ data: aS }, { data: eS }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', st.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', st.section_id)
      ]);
      const [assignments, exams, attendance, grades, schedule, periods] = await Promise.all([
        supabase.from('assignments').select('*, subject:subjects(name)').in('id', (aS || []).map(a => (a as any).assignment_id)).limit(3),
        supabase.from('exams').select('*, subject:subjects(name)').in('id', (eS || []).map(e => (e as any).exam_id)).limit(3),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', st.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', st.id).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', st.section_id).eq('day_of_week', new Date().getDay() + 1),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      const att = (attendance.data || []) as any[];
      return {
        student: st, assignments: assignments.data || [], exams: exams.data || [],
        attendanceRate: att.length > 0 ? Math.round((att.filter(a => a.daily_status === 'present').length / att.length) * 100) : 100,
        presentCount: att.filter(a => a.daily_status === 'present').length,
        absentCount: att.filter(a => a.daily_status === 'absent').length,
        partialCount: att.filter(a => a.daily_status === 'late').length,
        incompleteCount: att.filter(a => a.daily_status === 'incomplete').length,
        grades: grades.data || [], todaysSchedule: schedule.data || [], periods: periods.data || []
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

  // --- 3. المعلم (Teacher) ---
  const fetchTeacherDashboardData = useCallback(async (): Promise<TeacherDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: t } = await supabase.from('teachers').select('*, users(*)').eq('id', user.id).single();
      const { data: ts } = await supabase.from('teacher_sections').select('section_id, section:sections(id, name, classes(id, name), students(count))').eq('teacher_id', user.id);
      const sIds = (ts || []).map(x => x.section_id);
      const [ex, as, sch, per, sc] = await Promise.all([
        sIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('section_id', sIds).limit(5) : Promise.resolve({ data: [] }),
        sIds.length > 0 ? supabase.from('assignments').select('*, subjects(name), sections(name, classes(name))').in('section_id', sIds).limit(5) : Promise.resolve({ data: [] }),
        supabase.from('schedules').select('*, subjects(name), sections(name, classes(name))').eq('teacher_id', user.id),
        supabase.from('class_periods').select('*').order('period_number'),
        sIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sIds) : Promise.resolve({ count: 0 })
      ]);
      return {
        teacher: t, sections: (ts || []).map(x => x.section), recentExams: ex.data || [], recentAssignments: as.data || [],
        schedule: sch.data || [], periods: per.data || [], messages: [],
        stats: { totalStudents: sc.count || 0, totalExams: (ex.data || []).length, totalAssignments: (as.data || []).length, avgAttendance: 95, absenceRate: 5 }
      };
    } catch (e) { return null; }
  }, [user]);

  const fetchTeacherSchedule = useCallback(async (): Promise<TeacherScheduleData | null> => {
    if (!user) return null;
    try {
      const [ { data: sch }, { data: per } ] = await Promise.all([
        supabase.from('schedules').select('*, subjects(name), sections(id, name, classes(name))').eq('teacher_id', user.id).order('day_of_week').order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      return { schedule: sch || [], periods: per || [] };
    } catch (e) { return null; }
  }, [user]);

  // --- 4. ولي الأمر (Parent) ---
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
    fetchAdminDashboardStats, fetchAdminRecentActivities, fetchStudentDashboardData,
    fetchStudentSchedule, fetchParentDashboardData, fetchTeacherDashboardData, fetchTeacherSchedule
  };
}

