import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تعريف الأنواع (Interfaces) لضمان نجاح الـ Build في Netlify ---

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
      const [
        { count: studentsCount },
        { count: teachersCount },
        { count: sectionsCount },
        attendanceRes
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('date', today)
      ]);

      const attendanceData = (attendanceRes.data || []) as { daily_status: string }[];
      const totalAttendanceCount = attendanceData.length;
      const presentAttendanceCount = attendanceData.filter(a => a.daily_status === 'present').length;

      return {
        studentsCount: studentsCount || 0,
        teachersCount: teachersCount || 0,
        sectionsCount: sectionsCount || 0,
        attendanceRate: totalAttendanceCount > 0 ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100) : 0
      };
    } catch (error) {
      console.error('Admin Stats Error:', error);
      return { studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 };
    }
  }, []);

  const fetchAdminRecentActivities = useCallback(async (): Promise<any[]> => {
    try {
      const [{ data: students }, { data: exams }] = await Promise.all([
        supabase.from('students').select('users(full_name), created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2)
      ]);

      const activities = [
        ...(students || []).map((s: any) => ({
          title: `انضمام طالب جديد: ${s.users?.full_name || 'طالب'}`,
          time: s.created_at,
          color: 'bg-indigo-100 text-indigo-600'
        })),
        ...(exams || []).map((e: any) => ({
          title: `نشر اختبار جديد: ${e.title}`,
          time: e.created_at,
          color: 'bg-amber-100 text-amber-600'
        }))
      ];
      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    } catch (e) { return []; }
  }, []);

  // --- 2. الطالب (Student) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase.from('students').select('*, sections(name, classes(name))').eq('id', user.id).single();
      if (!student) return null;

      const [{ data: assignmentSecs }, { data: examSecs }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id)
      ]);

      const assignmentIds = (assignmentSecs || []).map(a => (a as any).assignment_id);
      const examIds = (examSecs || []).map(e => (e as any).exam_id);

      const [assignments, exams, attendance, grades, schedule, periods] = await Promise.all([
        assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).limit(3) : Promise.resolve({ data: [] }),
        examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).limit(3) : Promise.resolve({ data: [] }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', new Date().getDay() + 1),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      const attData = (attendance.data || []) as { daily_status: string }[];
      const presentCount = attData.filter(a => a.daily_status === 'present').length;

      return {
        student,
        assignments: assignments.data || [],
        exams: exams.data || [],
        attendanceRate: attData.length > 0 ? Math.round((presentCount / attData.length) * 100) : 100,
        presentCount,
        absentCount: attData.filter(a => a.daily_status === 'absent').length,
        partialCount: attData.filter(a => a.daily_status === 'late').length,
        incompleteCount: attData.filter(a => a.daily_status === 'incomplete').length,
        grades: grades.data || [],
        todaysSchedule: schedule.data || [],
        periods: periods.data || []
      };
    } catch (e) { console.error(e); throw e; }
  }, [user]);

  // --- 3. ولي الأمر (Parent) - تم إصلاح الأنواع هنا ---
  const fetchParentDashboardData = useCallback(async (): Promise<ParentDashboardData | null> => {
    if (!user) return null;
    try {
      const [ { data: children }, { data: notifications } ] = await Promise.all([
        supabase.from('students').select('*, users(full_name), sections(name, classes(name))').eq('parent_id', user.id),
        supabase.from('notifications').select('*').eq('type', 'announcement').order('created_at', { ascending: false }).limit(5)
      ]);
      return { 
        children: children || [], 
        notifications: notifications || [] 
      };
    } catch (error) {
      console.error('Error fetching parent dashboard data:', error);
      throw error;
    }
  }, [user]);

  // --- 4. المعلم (Teacher) ---
  const fetchTeacherDashboardData = useCallback(async (): Promise<TeacherDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: teacher } = await supabase.from('teachers').select('*, users(*)').eq('id', user.id).single();
      const { data: tSecs } = await supabase.from('teacher_sections').select('section_id, section:sections(id, name, classes(name))').eq('teacher_id', user.id);
      const sectionIds = (tSecs || []).map(ts => ts.section_id);

      const [exams, assignments, stats] = await Promise.all([
        sectionIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('section_id', sectionIds).limit(5) : Promise.resolve({ data: [] }),
        sectionIds.length > 0 ? supabase.from('assignments').select('*, subjects(name)').in('section_id', sectionIds).limit(5) : Promise.resolve({ data: [] }),
        sectionIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sectionIds) : Promise.resolve({ count: 0 })
      ]);

      return {
        teacher,
        sections: (tSecs || []).map(ts => ts.section),
        recentExams: exams.data || [],
        recentAssignments: assignments.data || [],
        schedule: [], periods: [], messages: [],
        stats: { totalStudents: stats.count || 0, totalExams: (exams.data || []).length, totalAssignments: (assignments.data || []).length }
      };
    } catch (e) { throw e; }
  }, [user]);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities,
    fetchStudentDashboardData,
    fetchParentDashboardData,
    fetchTeacherDashboardData,
    fetchStudentSchedule: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, [])
  };
}

