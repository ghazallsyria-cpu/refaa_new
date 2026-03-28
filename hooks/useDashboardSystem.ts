import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// --- تعريف الأنواع لضمان نجاح الـ Build في Netlify ---

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

  // --- دالة ولي الأمر المحدثة بالأنواع الصريحة ---
  const fetchParentDashboardData = useCallback(async (): Promise<ParentDashboardData | null> => {
    if (!user) return null;
    try {
      const [ { data: children }, { data: notifications } ] = await Promise.all([
        supabase.from('students')
          .select('*, users(full_name), sections(name, classes(name))')
          .eq('parent_id', user.id),
        supabase.from('notifications')
          .select('*')
          .eq('type', 'announcement')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      return { 
        children: children || [], 
        notifications: notifications || [] 
      };
    } catch (error) {
      console.error('Parent Data Fetch Error:', error);
      return { children: [], notifications: [] };
    }
  }, [user]);

  // بقية الدوال كقوالب لضمان عدم تعطل الصفحات الأخرى أثناء الـ Build
  return {
    fetchAdminDashboardStats: useCallback(async (): Promise<AdminDashboardData> => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchStudentDashboardData: useCallback(async () => null, []),
    fetchStudentSchedule: useCallback(async () => null, []),
    fetchTeacherDashboardData: useCallback(async () => null, []),
    fetchTeacherSchedule: useCallback(async () => null, []),
    fetchParentDashboardData
  };
}

