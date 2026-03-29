import { useState, useEffect, useCallback } from 'react';
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

/* FIX: relations are arrays */
export interface SectionData {
  id: string;
  name: string;
  classes: { name: string }[];
  subject_id?: string;
  subject_name?: string;
}

/* FIX: same issue */
export interface StudentData {
  id: string;
  users: { full_name: string }[];
}

export interface AttendanceStats {
  daily: { present: number, absent: number, partial: number, incomplete: number, total: number, rate: number };
  weekly: { present: number, absent: number, late: number, excused: number, total: number, rate: number };
  monthly: { present: number, absent: number, late: number, excused: number, total: number, rate: number };
  students: Record<string, any>;
}

export function useAttendanceSystem() {
  const { user, authRole } = useAuth();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [daySchedule, setDaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDaySchedule = useCallback(async (targetDate: string) => {
    if (!user || authRole !== 'teacher') return [];
    try {
      const jsDay = new Date(targetDate).getDay();
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
        jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

      const { data } = await supabase
        .from('schedules')
        .select('period, section:sections(name, classes(name)), subject:subjects(name)')
        .eq('teacher_id', user.id)
        .eq('day_of_week', dbDay)
        .order('period');

      setDaySchedule(data || []);
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [user, authRole]);

  const fetchSections = useCallback(async (targetDate: string, targetPeriod: number): Promise<SectionData[]> => {
    if (!user) return [];

    try {
      let sectionsData: SectionData[] = [];

      const isTeacher = authRole === 'teacher' || authRole?.includes('teacher');
      const isAdmin = authRole === 'admin' || authRole?.includes('admin');

      if (isTeacher) {
        const jsDay = new Date(targetDate).getDay();
        const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
          jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

        const { data: scheduledClasses } = await supabase
          .from('schedules')
          .select('section_id, subject_id, section:sections(id, name, classes(name)), subject:subjects(id, name)')
          .eq('teacher_id', user.id)
          .eq('day_of_week', dbDay)
          .eq('period', targetPeriod);

        sectionsData = (scheduledClasses || []).map(sc => {
          const section = Array.isArray(sc.section) ? sc.section[0] : sc.section;
          const subject = Array.isArray(sc.subject) ? sc.subject[0] : sc.subject;

          return {
            id: section?.id,
            name: section?.name,
            classes: section?.classes || [],
            subject_id: sc.subject_id,
            subject_name: subject?.name
          };
        });
      }

      if (isAdmin) {
        const { data: allSections } = await supabase
          .from('sections')
          .select('id, name, classes(name)');

        sectionsData = (allSections || []).map(s => ({
          ...s,
          classes: Array.isArray(s.classes) ? s.classes : [s.classes]
        }));
      }

      setSections(sectionsData);
      return sectionsData;
    } catch (err) {
      console.error(err);
      return [];
    }
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
        .select('id')
        .eq('teacher_id', user.id)
        .eq('section_id', selectedSection)
        .eq('subject_id', selectedSubject)
        .eq('date', date)
        .eq('period_number', period)
        .maybeSingle();

      const attendance: Record<string, AttendanceStatus> = {};

      (studentsData || []).forEach(s => {
        attendance[s.id] = 'present';
      });

      if (sessionData) {
        const { data: recordsData } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('session_id', sessionData.id);

        recordsData?.forEach(r => {
          attendance[r.student_id] = r.status as AttendanceStatus;
        });
      }

      return {
        students: studentsData || [],
        attendance,
        stats: null
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveAttendance = useCallback(async (
    selectedSection: string,
    selectedSubject: string,
    date: string,
    period: number,
    attendance: Record<string, AttendanceStatus>,
    students: StudentData[]
  ) => {
    if (!user) throw new Error('No user');

    const res = await fetch('/api/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedSection,
        selectedSubject,
        date,
        period,
        attendance,
        students,
        userId: user.id
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Save failed');
    }
  }, [user]);

  const fetchStudentAttendance = useCallback(async () => {
    if (!user || authRole !== 'student') return null;

    const { data } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .eq('student_id', user.id);

    return {
      studentAttendance: data || []
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
