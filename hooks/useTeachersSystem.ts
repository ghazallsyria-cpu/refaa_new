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
  // 🚀 1. جلب بيانات المراقبة اليومية (محسّن باستخدام Promise.all)
  // ============================================================================
  const fetchTeachersMonitorData = useCallback(async (todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherMonitorData> => {
    setLoading(true);
    try {
      // جلب جميع الجداول بشكل متوازي (Parallel Fetching)
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

      return {
        teachersData: teachersData || [],
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
  // 🚀 2. جلب التقرير الشامل (تم القضاء على قنبلة الـ N+1 Query)
  // ============================================================================
  const fetchTeachersReportData = useCallback(async (reportType: "day" | "week", todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherReportResult[]> => {
    setLoading(true);
    try {
      const fromDate = reportType === "day" ? todayStr : weekAgoStr;
      const daysFilter = reportType === "day" ? [dbDay] : [1, 2, 3, 4, 5]; // 1-5 يمثل أيام الدوام (الأحد للخميس)

      // بدلاً من عمل 200 طلب للسيرفر، نطلب المعلمين ونجلب جداولهم وغياباتهم كـ (Nested Array) في طلب واحد!
      const { data: teachersData, error } = await supabase
        .from("teachers")
        .select(`
          id, 
          specialization, 
          users!teachers_id_fkey(full_name),
          academic_departments(id, name),
          schedules(section_id, day_of_week, period),
          attendance_sessions(date, section_id, period_number)
        `)
        // فلترة הגداول المربوطة لتشمل الأيام المطلوبة والتواريخ المطلوبة فقط (باستخدام Postgrest Filtering)
        .in('schedules.day_of_week', daysFilter)
        .gte('attendance_sessions.date', fromDate);

      if (error) throw error;

      // تنسيق البيانات لتتطابق مع الـ Interface المطلوبة للصفحة
      const results: TeacherReportResult[] = (teachersData || []).map((t: any) => ({
        teacher: {
          id: t.id,
          specialization: t.specialization,
          users: t.users,
          academic_departments: t.academic_departments
        },
        // إذا كان هناك جداول أو غيابات، سيتم تضمينها هنا، وإلا نرجع مصفوفة فارغة
        scheduleData: t.schedules || [],
        attendanceData: t.attendance_sessions || []
      }));

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
