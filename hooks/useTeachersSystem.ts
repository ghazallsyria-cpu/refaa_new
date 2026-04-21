import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TeacherMonitorData {
  teachersData: any[];
  allSchedules: any[];
  allAttendance: any[];
  allAssignments: any[];
  allExams: any[];
}

export function useTeachersSystem() {
  const [loading, setLoading] = useState(false);

  const fetchTeachersMonitorData = useCallback(async (todayStr: string, dbDay: number, weekAgoStr: string): Promise<TeacherMonitorData> => {
    setLoading(true);
    try {
      // 🚀 التحسين: جلب القسم والمرحلة بشكل إجباري وقاطع
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select(`
          id, 
          specialization, 
          department_id,
          users(full_name),
          academic_departments(id, name, head_id),
          teacher_sections(section_id, sections(classes(name)))
        `);

      if (teachersError) throw teachersError;

      const { data: allSchedules } = await supabase.from("schedules").select("teacher_id, section_id, period").eq("day_of_week", dbDay);
      const { data: allAttendance } = await supabase.from("attendance_sessions").select("teacher_id, section_id, period_number, date").eq("date", todayStr);
      const { data: allAssignments } = await supabase.from("assignments").select("teacher_id").gte("created_at", weekAgoStr);
      const { data: allExams } = await supabase.from("exams").select("teacher_id").gte("created_at", weekAgoStr);

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

  const sendTeacherWarning = useCallback(async (teacherId: string): Promise<void> => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: teacherId, title: "تنبيه إداري", content: "يرجى استكمال تسجيل الحضور والغياب للحصص الموكلة إليك اليوم.", type: "system" }),
      });
      if (!response.ok) throw new Error('Failed to send warning');
    } catch (error) {
      console.error('Error sending warning:', error);
      throw error;
    }
  }, []);

  return { loading, fetchTeachersMonitorData, sendTeacherWarning };
}
