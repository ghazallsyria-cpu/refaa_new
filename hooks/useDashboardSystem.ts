import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

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
  lateCount: number;
  partialCount: number;
  grades: any[];
  todaysSchedule: any[];
  periods: any[];
}

export interface ParentDashboardData {
  children: any[];
  notifications: any[];
}

export interface StudentScheduleData {
  student: any;
  schedule: any[];
  periods: any[];
}

export interface TeacherScheduleData {
  schedule: any[];
  periods: any[];
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
    avgAttendance: number;
    absenceRate: number;
  };
}

export function useDashboardSystem() {
  const { user } = useAuth();

  // الحصول على اليوم الحالي (إذا كان جمعة أو سبت، يعرض جدول الأحد)
  const getCurrentSchoolDay = () => {
    let day = new Date().getDay() + 1;
    if (day > 5) day = 1; 
    return day;
  };

  // --- 1. الطالب (Student) ---
  const fetchStudentDashboardData = useCallback(async (): Promise<StudentDashboardData | null> => {
    if (!user) return null;
    try {
      // 1. جلب بيانات الطالب بأمان
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('*, sections(id, name, classes(name)), users(full_name)')
        .eq('id', user.id)
        .single();
      
      if (studentErr || !student) {
        console.error("Student fetch error:", studentErr);
        return null;
      }

      // 2. جلب الحضور (معالجة الأخطاء بصمت لكي لا تتوقف الصفحة)
      const { data: att } = await supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id);
      
      const stats = {
        present: att?.filter(a => a.daily_status === 'present').length || 0,
        absent: att?.filter(a => a.daily_status === 'absent').length || 0,
        late: att?.filter(a => a.daily_status === 'late').length || 0,
        partial: att?.filter(a => a.daily_status === 'partial').length || 0,
      };

      const totalDays = att?.length || 0;
      const rate = totalDays > 0 ? Math.round(((stats.present + (stats.late * 0.5)) / totalDays) * 100) : 100;

      // 3. جلب معرفات الواجبات والاختبارات
      const { data: aSec } = await supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id);
      const { data: eSec } = await supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id);

      const assignmentIds = (aSec || []).map(a => a.assignment_id);
      const examIds = (eSec || []).map(e => e.exam_id);

      // 4. جلب التفاصيل خطوة بخطوة لمنع الانهيار الشامل
      let assignments = { data: [] };
      if (assignmentIds.length > 0) {
        assignments = await supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).limit(5);
      }

      let exams = { data: [] };
      if (examIds.length > 0) {
        exams = await supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).eq('status', 'published').limit(5);
      }

      const { data: grades } = await supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, subject:subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5);
      
      const currentDay = getCurrentSchoolDay();
      const { data: schedule } = await supabase.from('schedules').select('*, subjects(name), teachers(users(full_name))').eq('section_id', student.section_id).eq('day_of_week', currentDay).order('period');
      const { data: periods } = await supabase.from('class_periods').select('*').order('period_number');

      return {
        student: student,
        assignments: assignments.data || [],
        exams: exams.data || [],
        attendanceRate: rate,
        presentCount: stats.present,
        absentCount: stats.absent,
        lateCount: stats.late,
        partialCount: stats.partial,
        grades: grades || [],
        todaysSchedule: schedule || [],
        periods: periods || []
      };
    } catch (e) {
      console.error("Fatal Student Dashboard Error:", e);
      return null;
    }
  }, [user]);

  // --- 2. المعلم (Teacher) ---
  const fetchTeacherDashboardData = useCallback(async (): Promise<TeacherDashboardData | null> => {
    if (!user) return null;
    try {
      const { data: t, error: tErr } = await supabase.from('teachers').select('*, users(*)').eq('id', user.id).single();
      if (tErr || !t) {
        console.error("Teacher fetch error:", tErr);
        return null;
      }

      // الجلب الذكي للفصول
      const { data: ts } = await supabase.from('teacher_sections').select('section_id, sections(id, name, classes(id, name))').eq('teacher_id', user.id);
      
      // Supabase أحياناً يرجعها كـ section أو sections
      const sections = (ts || []).map((x: any) => x.sections || x.section).filter(Boolean);
      const sIds = sections.map((s: any) => s.id);

      let exams = { data: [] };
      let assignments = { data: [] };
      let studentsCount = { count: 0 };

      if (sIds.length > 0) {
        exams = await supabase.from('exams').select('*, subject:subjects(name)').in('section_id', sIds).limit(5);
        assignments = await supabase.from('assignments').select('*, subjects(name), sections(name, classes(name))').in('section_id', sIds).limit(5);
        studentsCount = await supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sIds);
      }

      const { data: sch } = await supabase.from('schedules').select('*, subjects(name), sections(name, classes(name))').eq('teacher_id', user.id);
      const { data: per } = await supabase.from('class_periods').select('*').order('period_number');

      return {
        teacher: t,
        sections: sections,
        recentExams: exams.data || [],
        recentAssignments: assignments.data || [],
        schedule: sch || [],
        periods: per || [],
        messages: [],
        stats: {
          totalStudents: studentsCount.count || 0,
          totalExams: (exams.data || []).length,
          totalAssignments: (assignments.data || []).length,
          avgAttendance: 95, 
          absenceRate: 5
        }
      };
    } catch (e) {
      console.error("Fatal Teacher Dashboard Error:", e);
      return null;
    }
  }, [user]);

  // --- دوال الجداول الأساسية المساعدة ---
  const fetchStudentSchedule = useCallback(async (): Promise<StudentScheduleData | null> => {
    if (!user) return null;
    try {
      const { data: st } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).single();
      if (!st) return null;
      const [ { data: sch }, { data: per } ] = await Promise.all([
        supabase.from('schedules').select('*, subjects(name), teachers(zoom_link, users:teacher_id(full_name))').eq('section_id', st.section_id).order('day_of_week').order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      return { student: st, schedule: sch || [], periods: per || [] };
    } catch (e) { return null; }
  }, [user]);

  const fetchTeacherSchedule = useCallback(async (): Promise<TeacherScheduleData | null> => {
    if (!user) return null;
    try {
      const [ { data: sch }, { data: per } ] = await Promise.all([
        supabase.from('schedules').select('*, subjects(name), sections(id, name, classes(name))').eq('teacher_id', user.id).order('day_of_week').order('period'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);
      return { schedule: sch || [], periods: per || [] };
    } catch (e) { return null; }
  }, [user]);

  return {
    fetchStudentDashboardData,
    fetchTeacherDashboardData,
    fetchStudentSchedule,
    fetchTeacherSchedule,
    fetchAdminDashboardStats: useCallback(async () => ({ studentsCount: 0, teachersCount: 0, sectionsCount: 0, attendanceRate: 0 }), []),
    fetchAdminRecentActivities: useCallback(async () => [], []),
    fetchParentDashboardData: useCallback(async () => null, [])
  };
}


