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

export interface SectionData {
  id: string;
  name: string;
  classes: { name: string };
  subject_id?: string;
  subject_name?: string;
}

export interface StudentData {
  id: string;
  users: { full_name: string };
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
      
      const schedule = data || [];
      setDaySchedule(schedule);
      return schedule;
    } catch (err) {
      console.error('Error fetching day schedule:', err);
      return [];
    }
  }, [user, authRole]);

  const fetchSections = useCallback(async (targetDate: string, targetPeriod: number): Promise<SectionData[]> => {
    if (!user) return [];
    try {
      let sectionsData: SectionData[] = [];
      const isTeacher = authRole === 'teacher' || (typeof authRole === 'string' && authRole.includes('teacher'));
      const isAdmin = authRole === 'admin' || (typeof authRole === 'string' && authRole.includes('admin'));

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
        
        sectionsData = (scheduledClasses?.map(sc => {
          const section = Array.isArray(sc.section) ? sc.section[0] : sc.section;
          const subject = Array.isArray(sc.subject) ? sc.subject[0] : sc.subject;
          return {
            ...section,
            subject_id: sc.subject_id,
            subject_name: subject?.name
          };
        }) || []) as SectionData[];
      } else if (isAdmin) {
        const { data: allSections } = await supabase
          .from('sections')
          .select('id, name, classes(name)');
        sectionsData = (allSections || []) as SectionData[];
      }
      
      setSections(sectionsData);
      return sectionsData;
    } catch (err) {
      console.error('Error fetching sections:', err);
      return [];
    }
  }, [user, authRole]);

  const fetchStudentsAndAttendance = useCallback(async (selectedSection: string, selectedSubject: string, date: string, period: number) => {
    if (!user || !selectedSection) return null;
    setLoading(true);
    setError(null);

    try {
      // Fetch students for the section
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, users(full_name)')
        .eq('section_id', selectedSection);

      if (studentsError) throw studentsError;

      // Fetch existing session
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id, status')
        .eq('teacher_id', user.id)
        .eq('section_id', selectedSection)
        .eq('subject_id', selectedSubject)
        .eq('date', date)
        .eq('period_number', period)
        .maybeSingle();

      if (sessionError) throw sessionError;

      const newAttendance: Record<string, AttendanceStatus> = {};
      (studentsData as any[] || [])?.forEach(s => {
        newAttendance[s.id] = 'present';
      });

      if (sessionData) {
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .eq('session_id', sessionData.id);

        if (recordsError) throw recordsError;

        recordsData?.forEach(r => {
          newAttendance[r.student_id] = r.status as AttendanceStatus;
        });
      }

      // Fetch daily stats
      const { data: dailyStats, error: statsError } = await supabase
        .from('daily_attendance_summary')
        .select('*')
        .eq('date', date);

      let stats: AttendanceStats | null = null;
      if (!statsError && dailyStats) {
        stats = {
          daily: { present: 0, absent: 0, partial: 0, incomplete: 0, total: 0, rate: 0 },
          weekly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
          monthly: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
          students: {}
        };

        dailyStats.forEach(s => {
          if (s.daily_status === 'present') stats!.daily.present++;
          else if (s.daily_status === 'full_absent') stats!.daily.absent++;
          else if (s.daily_status === 'partial_absent') stats!.daily.partial++;
          else if (s.daily_status === 'incomplete') stats!.daily.incomplete++;
          stats!.daily.total++;
        });

        if (stats.daily.total > 0) {
          stats.daily.rate = Math.round((stats.daily.present / stats.daily.total) * 100);
        }
      }

      return { 
        students: (studentsData as any[] || []) as StudentData[], 
        attendance: newAttendance, 
        stats 
      };
    } catch (err: any) {
      console.error('Error fetching students and attendance:', err);
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
    if (!user) throw new Error('User not found');
    
    try {
      const response = await fetch('/api/attendance/save', {
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

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save attendance');
    } catch (err) {
      console.error('Error saving attendance:', err);
      throw err;
    }
  }, [user]);

  const fetchStudentAttendance = useCallback(async () => {
    if (!user || authRole !== 'student') return null;
    try {
      const { data: summaryData, error: summaryError } = await supabase
        .from('daily_attendance_summary')
        .select('*')
        .eq('student_id', user.id)
        .order('date', { ascending: false });

      if (summaryError) throw summaryError;
      
      const stats = { present: 0, absent: 0, partial: 0, incomplete: 0 };
      summaryData?.forEach(s => {
        if (s.daily_status === 'present') stats.present++;
        else if (s.daily_status === 'full_absent') stats.absent++;
        else if (s.daily_status === 'partial_absent') stats.partial++;
        else if (s.daily_status === 'incomplete') stats.incomplete++;
      });
      
      return { studentAttendance: summaryData || [], studentStats: stats };
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      return null;
    }
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
