'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceSession {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string;
  date: string;
  period_number: number;
  status: string;
}

export interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
}

export interface SectionData {
  id: string;
  name: string;
  classes: { name: string };
  subject_id?: string;
  subject_name?: string;
}

export interface StudentData {
  id: string;
  users: {
    full_name: string;
  } | {
    full_name: string;
  }[]; // FIX: relation ممكن يرجع array
}

export interface AttendanceStats {
  daily: {
    present: number;
    absent: number;
    partial: number;
    incomplete: number;
    total: number;
    rate: number;
  };
  weekly: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  };
  monthly: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number;
  };
  students: Record<string, any>;
}

type ScheduleRow = {
  section_id: string;
  subject_id: string;
  period: number;
  section: {
    id: string;
    name: string;
    classes: { name: string };
  } | null;
  subject: {
    id: string;
    name: string;
  } | null;
};

type DailySummaryRow = {
  daily_status: 'present' | 'full_absent' | 'partial_absent' | 'incomplete';
};

export function useAttendanceSystem() {
  const { user, authRole } = useAuth();

  const [sections, setSections] = useState<SectionData[]>([]);
  const [daySchedule, setDaySchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeDay = (d: number) => (d === 0 ? 1 : d);

  const fetchDaySchedule = useCallback(async (targetDate: string) => {
    if (!user || authRole !== 'teacher') return [];

    const jsDay = new Date(targetDate).getDay();
    const dbDay = normalizeDay(jsDay);

    const { data } = await supabase
      .from('schedules')
      .select('period, section:sections(name, classes(name)), subject:subjects(name)')
      .eq('teacher_id', user.id)
      .eq('day_of_week', dbDay)
      .order('period');

    const schedule = (data as ScheduleRow[]) ?? [];
    setDaySchedule(schedule);
    return schedule;
  }, [user, authRole]);

  const fetchSections = useCallback(async (targetDate: string, targetPeriod: number) => {
    if (!user) return [];

    let result: SectionData[] = [];

    if (authRole === 'teacher') {
      const dbDay = normalizeDay(new Date(targetDate).getDay());

      const { data } = await supabase
        .from('schedules')
        .select(`
          section_id,
          subject_id,
          section:sections(id, name, classes(name)),
          subject:subjects(id, name)
        `)
        .eq('teacher_id', user.id)
        .eq('day_of_week', dbDay)
        .eq('period', targetPeriod);

      const rows = (data as ScheduleRow[]) ?? [];

      result = rows
        .map(r => ({
          id: r.section?.id || '',
          name: r.section?.name || '',
          classes: r.section?.classes || { name: '' },
          subject_id: r.subject_id,
          subject_name: r.subject?.name
        }))
        .filter(r => r.id !== '');

    } else {
      const { data } = await supabase
        .from('sections')
        .select('id, name, classes(name)');

      result = (data ?? []) as SectionData[];
    }

    setSections(result);
    return result;
  }, [user, authRole]);

  const fetchStudentsAndAttendance = useCallback(async (
    selectedSection: string,
    selectedSubject: string,
    date: string,
    period: number
  ) => {
    if (!user || !selectedSection) return null;

    setLoading(true);
    setError(null);

    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('section_id', selectedSection);

      const { data: sessionData } = await supabase
        .from('attendance_sessions')
        .select('id, status')
        .eq('teacher_id', user.id)
        .eq('section_id', selectedSection)
        .eq('subject_id', selectedSubject)
        .eq('date', date)
        .eq('period_number', period)
        .maybeSingle();

      const attendance: Record<string, AttendanceStatus> = {};

      (studentsData ?? []).forEach(s => {
        attendance[s.id] = 'present';
      });

      if (sessionData) {
        const { data: recordsData } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('session_id', sessionData.id);

        (recordsData ?? []).forEach(r => {
          attendance[r.student_id] = r.status;
        });
      }

      const stats: AttendanceStats = {
        daily: { present: 0, absent: 0, partial: 0, incomplete: 0, total: 0, rate: 0 },
        weekly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        monthly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        students: {}
      };

      const students = (studentsData ?? []) as any[];

      return {
        students,
        attendance,
        stats
      };

    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveAttendance = useCallback(async (...) => {
    if (!user) throw new Error('No user');

    const res = await fetch('/api/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... })
    });

    if (!res.ok) throw new Error('save failed');
  }, [user]);

  const fetchStudentAttendance = useCallback(async () => {
    if (!user || authRole !== 'student') return null;

    const { data } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .eq('student_id', user.id)
      .order('date', { ascending: false });

    const stats = { present: 0, absent: 0, partial: 0, incomplete: 0 };

    (data ?? []).forEach(s => {
      if (s.daily_status === 'present') stats.present++;
      if (s.daily_status === 'full_absent') stats.absent++;
      if (s.daily_status === 'partial_absent') stats.partial++;
      if (s.daily_status === 'incomplete') stats.incomplete++;
    });

    return {
      studentAttendance: data ?? [],
      studentStats: stats
    };
  }, [user, authRole]);

  return {
    sections,
    daySchedule,
    loading,
    error,
    fetchDaySchedule,
    fetchSections,
    fetchStudentsAndAttendance,
    saveAttendance,
    fetchStudentAttendance
  };
}
