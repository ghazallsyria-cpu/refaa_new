import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تصدير الأنواع من هنا حصراً لضمان نجاح الـ Build ---
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

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, sections(name, classes(name))')
        .eq('id', user.id)
        .single();
      
      if (!student) return null;

      const [
        { data: assignmentSections },
        { data: examSections }
      ] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id)
      ]);

      const assignmentIds = (assignmentSections || []).map(a => (a as any).assignment_id);
      const examIds = (examSections || []).map(e => (e as any).exam_id);

      const [
        { data: assignments },
        { data: exams },
        { data: attendance },
        { data: grades },
        { data: todaysSchedule },
        { data: periods }
      ] = await Promise.all([
        assignmentIds.length > 0 
          ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(3)
          : Promise.resolve({ data: [] }),
        examIds.length > 0 
          ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).order('created_at', { ascending: false }).limit(3)
          : Promise.resolve({ data: [] }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
        supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', new Date().getDay() + 1).order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      const attendanceData = (attendance || []) as { daily_status: string }[];
      const totalDays = attendanceData.length;
      
      const presentCount = attendanceData.filter(a => a.daily_status === 'present').length;
      const absentCount = attendanceData.filter(a => a.daily_status === 'absent').length;
      const partialCount = attendanceData.filter(a => a.daily_status === 'late' || a.daily_status === 'partial').length;
      const incompleteCount = attendanceData.filter(a => !['present', 'absent', 'late', 'partial'].includes(a.daily_status)).length;

      const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;

      return {
        student,
        assignments: assignments || [],
        exams: exams || [],
        attendanceRate,
        presentCount,
        absentCount,
        partialCount,
        incompleteCount,
        grades: grades || [],
        todaysSchedule: todaysSchedule || [],
        periods: periods || []
      };
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      throw error;
    }
  }, [user]);

  // دالات الإدارة والمعلم والوالدين (يمكن إضافة المنطق الخاص بها لاحقاً)
  const fetchAdminDashboardStats = useCallback(async () => ({}), []);
  const fetchAdminRecentActivities = useCallback(async () => [], []);
  const fetchStudentSchedule = useCallback(async () => null, []);
  const fetchParentDashboardData = useCallback(async () => null, []);
  const fetchTeacherDashboardData = useCallback(async () => null, []);
  const fetchTeacherSchedule = useCallback(async () => null, []);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities,
    fetchStudentDashboardData,
    fetchStudentSchedule,
    fetchParentDashboardData,
    fetchTeacherDashboardData,
    fetchTeacherSchedule
  };
}

