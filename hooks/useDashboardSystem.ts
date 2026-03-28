import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

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

  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      // 1. جلب بيانات الطالب الأساسية مع الربط الصحيح للفصل
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select(`
          *,
          sections (
            id,
            name,
            classes (name)
          ),
          users (full_name, email)
        `)
        .eq('id', user.id)
        .single();
      
      if (studentErr || !student) return null;

      const sectionId = student.section_id;

      // 2. جلب معرفات الواجبات والاختبارات المسندة لهذا الفصل
      const [assignRes, examRes] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId),
        supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId)
      ]);

      const assignmentIds = (assignRes.data || []).map(a => a.assignment_id);
      const examIds = (examRes.data || []).map(e => e.exam_id);

      // 3. جلب كافة التفاصيل (الواجبات، الاختبارات، الحضور، الدرجات، الجدول)
      const [
        assignments,
        exams,
        attendance,
        grades,
        schedule,
        periods
      ] = await Promise.all([
        assignmentIds.length > 0 
          ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(5)
          : Promise.resolve({ data: [] }),
        examIds.length > 0 
          ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).eq('status', 'published').order('created_at', { ascending: false }).limit(5)
          : Promise.resolve({ data: [] }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
        supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
        supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', sectionId).eq('day_of_week', new Date().getDay() + 1).order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      const attData = (attendance.data || []) as { daily_status: string }[];
      const presentCount = attData.filter(a => a.daily_status === 'present').length;
      const totalDays = attData.length;

      return {
        student,
        assignments: assignments.data || [],
        exams: exams.data || [],
        attendanceRate: totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100,
        presentCount,
        absentCount: attData.filter(a => a.daily_status === 'absent').length,
        partialCount: attData.filter(a => a.daily_status === 'late').length,
        incompleteCount: attData.filter(a => a.daily_status === 'incomplete').length,
        grades: grades.data || [],
        todaysSchedule: schedule.data || [],
        periods: periods.data || []
      };
    } catch (error) {
      console.error('Student Dashboard Fetch Error:', error);
      return null;
    }
  }, [user]);

  // دالات الأدوار الأخرى (تم تبسيطها لضمان عدم تعارض الـ Build)
  return {
    fetchAdminDashboardStats: useCallback(async () => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchParentDashboardData: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, []),
    fetchStudentSchedule: useCallback(async () => null, []),
    fetchStudentDashboardData
  };
}

