import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تعريف الأنواع (Interfaces) لضمان نجاح الـ Build ---

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

export function useDashboardSystem() {
  const { user } = useAuth();

  // --- 1. الطالب (Student) - تم التأكيد على الأنواع لمنع خطأ never ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, sections(name, classes(name))')
        .eq('id', user.id)
        .single();
      
      if (!student) return null;

      const [ { data: assignmentSecs }, { data: examSecs } ] = await Promise.all([
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
        { data: schedule },
        { data: periods }
      ] = await Promise.all([
        assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).limit(3) : Promise.resolve({ data: [] }),
        examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).limit(3) : Promise.resolve({ data: [] }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', new Date().getDay() + 1),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      const attData = (attendance || []) as { daily_status: string }[];
      const presentCount = attData.filter(a => a.daily_status === 'present').length;

      return {
        student,
        assignments: assignments || [],
        exams: exams || [],
        attendanceRate: attData.length > 0 ? Math.round((presentCount / attData.length) * 100) : 100,
        presentCount,
        absentCount: attData.filter(a => a.daily_status === 'absent').length,
        partialCount: attData.filter(a => a.daily_status === 'late').length,
        incompleteCount: attData.filter(a => a.daily_status === 'incomplete').length,
        grades: grades || [],
        todaysSchedule: schedule || [],
        periods: periods || []
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [user]);

  // دالات الإدارة وأولياء الأمور
  const fetchAdminDashboardStats = useCallback(async (): Promise<AdminDashboardData> => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []);
  const fetchParentDashboardData = useCallback(async (): Promise<ParentDashboardData | null> => null, []);

  return {
    fetchAdminDashboardStats,
    fetchStudentDashboardData,
    fetchParentDashboardData,
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchStudentSchedule: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, [])
  };
}

