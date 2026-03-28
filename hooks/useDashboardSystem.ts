import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تعريف الأنواع لضمان نجاح الـ Build في Netlify ---

export type AdminDashboardData = {
  studentsCount: number;
  teachersCount: number;
  sectionsCount: number;
  attendanceRate: number;
};

export type StudentDashboardData = {
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
};

export type TeacherDashboardData = {
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
};

export function useDashboardSystem() {
  const { user } = useAuth();

  // --- 1. دالة المدير (Admin) - تم استعادتها وتصحيحها ---
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

      const attendanceRate = totalAttendanceCount > 0
        ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100)
        : 0;

      return {
        studentsCount: studentsCount || 0,
        teachersCount: teachersCount || 0,
        sectionsCount: sectionsCount || 0,
        attendanceRate
      };
    } catch (error) {
      console.error('Admin Stats Error:', error);
      return { studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 };
    }
  }, []);

  // --- 2. دالة الطالب (Student) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, sections(name, classes(name))')
        .eq('id', user.id)
        .single();
      
      if (!student) return null;

      const [{ data: assignmentSecs }, { data: examSecs }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id)
      ]);

      const assignmentIds = (assignmentSecs || []).map(a => (a as any).assignment_id);
      const examIds = (examSecs || []).map(e => (e as any).exam_id);

      const [
        { data: assignments },
        { data: exams },
        { data: attendance },
        { data: grades },
        { data: todaysSchedule },
        { data: periods }
      ] = await Promise.all([
        assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).limit(3) : Promise.resolve({ data: [] }),
        examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).limit(3) : Promise.resolve({ data: [] }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).limit(5),
        supabase.from('schedules').select('id, period, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', new Date().getDay() + 1),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      const attData = (attendance || []) as { daily_status: string }[];
      const presentCount = attData.filter(a => a.daily_status === 'present').length;
      const totalDays = attData.length;

      return {
        student,
        assignments: assignments || [],
        exams: exams || [],
        attendanceRate: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100,
        presentCount,
        absentCount: attData.filter(a => a.daily_status === 'absent').length,
        partialCount: attData.filter(a => a.daily_status === 'late').length,
        incompleteCount: attData.filter(a => a.daily_status === 'incomplete').length,
        grades: grades || [],
        todaysSchedule: todaysSchedule || [],
        periods: periods || []
      };
    } catch (error) {
      console.error('Student Dashboard Error:', error);
      throw error;
    }
  }, [user]);

  // --- 3. دالة المعلم (Teacher) ---
  const fetchTeacherDashboardData = useCallback(async (): Promise<TeacherDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: teacher } = await supabase.from('teachers').select('*, users(*)').eq('id', user.id).single();
      const { data: tSecs } = await supabase.from('teacher_sections').select('section_id, section:sections(id, name, classes(name))').eq('teacher_id', user.id);
      
      const sections = (tSecs || []).map(ts => ts.section).filter(Boolean);
      const sectionIds = sections.map(s => s.id);

      const [exams, assignments, schedule, periods, stats] = await Promise.all([
        sectionIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('section_id', sectionIds).limit(5) : Promise.resolve({ data: [] }),
        sectionIds.length > 0 ? supabase.from('assignments').select('*, subjects(name)').in('section_id', sectionIds).limit(5) : Promise.resolve({ data: [] }),
        supabase.from('schedules').select('*, subjects(name), sections(name, classes(name))').eq('teacher_id', user.id),
        supabase.from('class_periods').select('*').order('period_number'),
        sectionIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sectionIds) : Promise.resolve({ count: 0 })
      ]);

      return {
        teacher,
        sections,
        recentExams: exams.data || [],
        recentAssignments: assignments.data || [],
        schedule: schedule.data || [],
        periods: periods.data || [],
        messages: [],
        stats: {
          totalStudents: stats.count || 0,
          totalExams: (exams.data || []).length,
          totalAssignments: (assignments.data || []).length
        }
      };
    } catch (error) {
      console.error('Teacher Dashboard Error:', error);
      throw error;
    }
  }, [user]);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchStudentDashboardData,
    fetchStudentSchedule: useCallback(async () => null, []),
    fetchParentDashboardData: useCallback(async () => null, []),
    fetchTeacherDashboardData,
    fetchTeacherSchedule: useCallback(async () => null, [])
  };
}

