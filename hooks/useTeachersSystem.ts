import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TeacherMonitorData {
  teachersData: {
    id: string;
    specialization: string;
    users: { full_name: string } | { full_name: string }[];
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

  const fetchTeachersMonitorData = useCallback(async (todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherMonitorData> => {
    setLoading(true);
    try {
      // 1. Fetch all teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, specialization, users(full_name)");

      if (teachersError) throw teachersError;

      // 2. Fetch all schedules for today
      const { data: allSchedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("teacher_id, section_id, period")
        .eq("day_of_week", dbDay);

      if (schedulesError) throw schedulesError;

      // 3. Fetch all attendance for today
      const { data: allAttendance, error: attendanceError } = await supabase
        .from("attendance_sessions")
        .select("teacher_id, section_id, period_number, date")
        .eq("date", todayStr);

      if (attendanceError) throw attendanceError;

      // 4. Fetch assignments count for the week
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("teacher_id")
        .gte("created_at", weekAgoStr);

      if (assignmentsError) throw assignmentsError;

      // 5. Fetch exams count for the week
      const { data: allExams, error: examsError } = await supabase
        .from("exams")
        .select("teacher_id")
        .gte("created_at", weekAgoStr);

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

  const fetchTeachersReportData = useCallback(async (reportType: "day" | "week", todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherReportResult[]> => {
    setLoading(true);
    try {
      const fromDate = reportType === "day" ? todayStr : weekAgoStr;
      const daysFilter = reportType === "day" ? [dbDay] : [1, 2, 3, 4, 5];

      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, specialization, users(full_name)");

      if (teachersError) throw teachersError;

      const results = await Promise.all(
        (teachersData || []).map(async (teacher: any) => {
          const { data: scheduleData, error: scheduleError } = await supabase
            .from("schedules")
            .select("section_id, day_of_week, period")
            .eq("teacher_id", teacher.id)
            .in("day_of_week", daysFilter);

          if (scheduleError) throw scheduleError;

          const { data: attendanceData, error: attendanceError } = await supabase
            .from("attendance_sessions")
            .select("date, section_id, period_number")
            .eq("teacher_id", teacher.id)
            .gte("date", fromDate);

          if (attendanceError) throw attendanceError;

          return {
            teacher,
            scheduleData: scheduleData || [],
            attendanceData: attendanceData || []
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Error fetching teachers report data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTeacherWarning = useCallback(async (teacherId: string): Promise<void> => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: teacherId,
          title: "تنبيه إداري",
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
