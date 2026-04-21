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
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select(`
          id, 
          specialization, 
          department_id,
          users(full_name, avatar_url),
          academic_departments(id, name),
          department_heads(id)
        `);

      if (teachersError) throw teachersError;

      const { data: tsData } = await supabase
        .from("teacher_sections")
        .select("teacher_id, sections(classes(name))");

      const teachersWithSections = (teachersData || []).map(t => {
        return {
          ...t,
          teacher_sections: (tsData || []).filter(ts => String(ts.teacher_id) === String(t.id))
        };
      });

      const { data: allSchedules } = await supabase.from("schedules").select("teacher_id, section_id, period").eq("day_of_week", dbDay);
      
      // 🚀 التصليح هنا: جلب البيانات من جدول attendance_records وبحقل period ليتطابق مع رصد المعلمين الحقيقي
      const { data: allAttendance } = await supabase.from("attendance_records").select("teacher_id, section_id, period, date").eq("date", todayStr);
      
      const { data: allAssignments } = await supabase.from("assignments").select("teacher_id").gte("created_at", weekAgoStr);
      const { data: allExams } = await supabase.from("exams").select("teacher_id").gte("created_at", weekAgoStr);

      return {
        teachersData: teachersWithSections,
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
