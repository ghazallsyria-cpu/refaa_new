import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

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

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      // 1. جلب بيانات الطالب الأساسية
      const { data: student } = await supabase
        .from('students')
        .select('*, sections(*, classes(*)), users(*)')
        .eq('id', user.id)
        .single();
      
      if (!student) return null;

      const sectionId = student.section_id;

      // 2. جلب الحضور الحقيقي وتصنيفه
      const { data: attendanceData } = await supabase
        .from('daily_attendance_summary')
        .select('daily_status')
        .eq('student_id', student.id);

      const stats = {
        present: attendanceData?.filter(a => a.daily_status === 'present').length || 0,
        absent: attendanceData?.filter(a => a.daily_status === 'absent').length || 0,
        late: attendanceData?.filter(a => a.daily_status === 'late').length || 0,
        partial: attendanceData?.filter(a => a.daily_status === 'partial').length || 0,
      };

      const totalDays = (attendanceData?.length || 0);
      const attendanceRate = totalDays > 0 
        ? Math.round(((stats.present + (stats.late * 0.5)) / totalDays) * 100) 
        : 100;

      // 3. جلب المهام المرتبطة بالفصل (الواجبات والاختبارات)
      const [{ data: aSec }, { data: eSec }] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId),
        supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId)
      ]);

      const [assignments, exams, grades, schedule, periods] = await Promise.all([
        supabase.from('assignments').select('*, subject:subjects(name)').in('id', (aSec || []).map(a => a.assignment_id)).order('due_date', { ascending: true }).limit(5),
        supabase.from('exams').select('*, subject:subjects(name)').in('id', (eSec || []).map(e => e.exam_id)).eq('status', 'published').limit(5),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', sectionId).eq('day_of_week', new Date().getDay() + 1).order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return {
        student,
        assignments: assignments.data || [],
        exams: exams.data || [],
        attendanceRate,
        presentCount: stats.present,
        absentCount: stats.absent,
        lateCount: stats.late,
        partialCount: stats.partial,
        grades: grades.data || [],
        todaysSchedule: schedule.data || [],
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }, [user]);

  return {
    fetchStudentDashboardData,
    // الدوال الأخرى تبقى كقوالب لضمان نجاح الـ Build
    fetchAdminDashboardStats: useCallback(async () => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchParentDashboardData: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, []),
    fetchStudentSchedule: useCallback(async () => null, [])
  };
}

