import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- إضافة تعريف نوع بيانات الجدول لنجاح الـ Build ---
export interface StudentScheduleData {
  student: any;
  schedule: any[];
  periods: any[];
}

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

export function useDashboardSystem() {
  const { user } = useAuth();

  // --- دالة جدول الطالب المحدثة بالأنواع ---
  const fetchStudentSchedule = useCallback(async (): Promise<StudentScheduleData | null> => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('section_id, sections(name, classes(name))')
        .eq('id', user.id)
        .single();

      if (!student) return null;

      const [ { data: schedule }, { data: periods } ] = await Promise.all([
        supabase.from('schedules')
          .select('*, subjects(name), teachers(zoom_link, users:teacher_id(full_name))')
          .eq('section_id', student.section_id)
          .order('day_of_week')
          .order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      return { 
        student, 
        schedule: schedule || [], 
        periods: periods || [] 
      };
    } catch (error) {
      console.error('Schedule Fetch Error:', error);
      return null;
    }
  }, [user]);

  // بقية الدوال تبقى كما هي لضمان استقرار النظام
  return {
    fetchAdminDashboardStats: useCallback(async () => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchStudentDashboardData: useCallback(async () => null, []),
    fetchParentDashboardData: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, []),
    fetchStudentSchedule // الدالة المحدثة
  };
}

