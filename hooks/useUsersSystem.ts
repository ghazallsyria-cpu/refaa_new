import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TeacherMonitorData {
  teachersData: {
    id: string;
    specialization: string;
    users: { full_name: string } | { full_name: string }[];
    academic_departments?: { id: string, name: string } | null;
  }[];
  allSchedules: {
    teacher_id: string;
    section_id: string;
    period: number;
  }[];
  allAttendance: {
    teacher_id: string;
    section_id: string;
    period_number: number;
    date: string;
  }[];
  allAssignments: {
    teacher_id: string;
  }[];
  allExams: {
    teacher_id: string;
  }[];
}

export interface TeacherReportResult {
  teacher: {
    id: string;
    specialization: string;
    users: { full_name: string } | { full_name: string }[];
    academic_departments?: { id: string, name: string } | null;
    isHeadOfDepartment?: boolean;
  };
  scheduleData: {
    section_id: string;
    day_of_week: number;
    period: number;
  }[];
  attendanceData: {
    date: string;
    section_id: string;
    period_number: number;
  }[];
}

export function useTeachersSystem() {
  const [loading, setLoading] = useState(false);

  // ============================================================================
  // 🚀 1. جلب بيانات المراقبة اليومية (محسّن ضد أخطاء TypeScript)
  // ============================================================================
  const fetchTeachersMonitorData = useCallback(async (todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherMonitorData> => {
    setLoading(true);
    try {
      const [
        { data: teachersData, error: teachersError },
        { data: allSchedules, error: schedulesError },
        { data: allAttendance, error: attendanceError },
        { data: allAssignments, error: assignmentsError },
        { data: allExams, error: examsError }
      ] = await Promise.all([
        supabase.from("teachers").select("id, specialization, users!teachers_id_fkey(full_name), academic_departments(id, name)"),
        supabase.from("schedules").select("teacher_id, section_id, period").eq("day_of_week", dbDay),
        supabase.from("attendance_sessions").select("teacher_id, section_id, period_number, date").eq("date", todayStr),
        supabase.from("assignments").select("teacher_id").gte("created_at", weekAgoStr),
        supabase.from("exams").select("teacher_id").gte("created_at", weekAgoStr)
      ]);

      if (teachersError) throw teachersError;
      if (schedulesError) throw schedulesError;
      if (attendanceError) throw attendanceError;
      if (assignmentsError) throw assignmentsError;
      if (examsError) throw examsError;

      // 🛡️ تصحيح التوافق مع TypeScript (حل مشكلة المصفوفة vs الكائن)
      const safeTeachersData = (teachersData || []).map((t: any) => ({
        id: t.id,
        specialization: t.specialization,
        users: t.users,
        academic_departments: Array.isArray(t.academic_departments) ? t.academic_departments[0] : t.academic_departments
      }));

      return {
        teachersData: safeTeachersData,
        allSchedules: allSchedules || [],
        allAttendance: allAttendance || [],
        allAssignments: allAssignments || [],
        allExams: allExams || []
      };
    } catch (error) {
      console.error('Error fetching teachers monitor data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // 🚀 2. جلب التقرير الشامل (مع حسابات ذكية)
  // ============================================================================
  const fetchTeachersReportData = useCallback(async (reportType: "day" | "week", todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherReportResult[]> => {
    setLoading(true);
    try {
      const fromDate = reportType === "day" ? todayStr : weekAgoStr;
      const daysFilter = reportType === "day" ? [dbDay] : [1, 2, 3, 4, 5]; 

      const { data: teachersData, error } = await supabase
        .from("teachers")
        .select(`
          id, 
          specialization, 
          users!teachers_id_fkey(full_name),
          academic_departments(id, name, head_id),
          schedules(section_id, day_of_week, period),
          attendance_sessions(date, section_id, period_number)
        `)
        .in('schedules.day_of_week', daysFilter)
        .gte('attendance_sessions.date', fromDate);

      if (error) throw error;

      const results: TeacherReportResult[] = (teachersData || []).map((t: any) => {
        const dept = Array.isArray(t.academic_departments) ? t.academic_departments[0] : t.academic_departments;
        return {
          teacher: {
            id: t.id,
            specialization: t.specialization,
            users: t.users,
            academic_departments: dept,
            isHeadOfDepartment: dept?.head_id === t.id 
          },
          scheduleData: t.schedules || [],
          attendanceData: t.attendance_sessions || []
        };
      });

      return results;
    } catch (error) {
      console.error('Error fetching teachers report data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // 🚀 3. إرسال تنبيه آلي للمعلم
  // ============================================================================
  const sendTeacherWarning = useCallback(async (teacherId: string): Promise<void> => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: teacherId,
          title: "تنبيه إداري ⚠️",
          content: "يرجى استكمال تسجيل الحضور والغياب للحصص الموكلة إليك اليوم.",
          type: "system"
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send warning');
    } catch (error) {
      console.error('Error sending teacher warning:', error);
      throw error;
    }
  }, []);

  return {
    loading,
    fetchTeachersMonitorData,
    fetchTeachersReportData,
    sendTeacherWarning
  };
}
