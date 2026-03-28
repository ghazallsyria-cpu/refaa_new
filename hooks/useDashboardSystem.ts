import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تصدير كافة التعريفات المطلوبة لنجاح الـ Build في Netlify ---

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
  lateCount: number;
  partialCount: number;
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

  // --- دالة جلب بيانات الطالب (المحسنة بالحضور الحقيقي) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: st } = await supabase.from('students').select('*, sections(*, classes(*)), users(*)').eq('id', user.id).single();
      if (!st) return null;

      const { data: att } = await supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', st.id);
      
      const stats = {
        present: att?.filter(a => a.daily_status === 'present').length || 0,
        absent: att?.filter(a => a.daily_status === 'absent').length || 0,
        late: att?.filter(a => a.daily_status === 'late').length || 0,
        partial: att?.filter(a => a.daily_status === 'partial').length || 0,
      };

      const totalDays = att?.length || 0;
      const rate = totalDays > 0 ? Math.round(((stats.present + (stats.late * 0.5)) / totalDays) * 100) : 100;

      const [{ data: aSec }, { data: eSec }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', st.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', st.section_id)
      ]);

      const [assignments, exams, grades, schedule, periods] = await Promise.all([
        supabase.from('assignments').select('*, subject:subjects(name)').in('id', (aSec || []).map(a => a.assignment_id)).limit(5),
        supabase.from('exams').select('*, subject:subjects(name)').in('id', (eSec || []).map(e => e.exam_id)).eq('status', 'published').limit(5),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', st.id).order('completed_at', { ascending: false }).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', st.section_id).eq('day_of_week', new Date().getDay() + 1).order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return {
        student: st, assignments: assignments.data || [], exams: exams.data || [],
        attendanceRate: rate, presentCount: stats.present, absentCount: stats.absent,
        lateCount: stats.late, partialCount: stats.partial,
        grades: grades.data || [], todaysSchedule: schedule.data || [], periods: periods.data || []
      };
    } catch (e) { return null; }
  }, [user]);

  // --- دالة جدول الطالب ---
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

  return {
    fetchStudentDashboardData,
    fetchStudentSchedule,
    fetchAdminDashboardStats: useCallback(async () => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchParentDashboardData: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, [])
  };
}

