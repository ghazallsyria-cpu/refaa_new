import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchAdminDashboardStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: studentsCount },
        { count: teachersCount },
        { count: sectionsCount },
        attendanceRes
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('daily_attendance_summary').select('daily_status').eq('date', today)
      ]);

      const totalAttendanceCount = attendanceRes.data?.length || 0;
      const presentAttendanceCount = attendanceRes.data?.filter(a => a.daily_status === 'present').length || 0;

      const attendanceRate = totalAttendanceCount > 0
        ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100)
        : 0;

      return {
        studentsCount: studentsCount || 0,
        teachersCount: teachersCount || 0,
        sectionsCount: sectionsCount || 0,
        attendanceRate
      };
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      throw error;
    }
  }, []);

  const fetchAdminRecentActivities = useCallback(async () => {
    try {
      const [
        { data: recentStudents },
        { data: recentDocs },
        { data: recentExams },
        { data: recentNotifs }
      ] = await Promise.all([
        supabase.from('students').select('users(full_name), created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2),
        supabase.from('notifications').select('title, created_at').eq('type', 'announcement').order('created_at', { ascending: false }).limit(2)
      ]);

      const activities: { title: string; time: string; type: string; color: string }[] = [
        ...(recentStudents || []).map(s => ({ title: `إضافة الطالب ${Array.isArray(s.users) ? s.users[0]?.full_name : s.users?.full_name}`, time: s.created_at, type: 'students', color: 'bg-indigo-100 text-indigo-600' })),
        ...(recentDocs || []).map(d => ({ title: `مستند جديد: ${d.title}`, time: d.created_at, type: 'documents', color: 'bg-emerald-100 text-emerald-600' })),
        ...(recentExams || []).map(e => ({ title: `اختبار جديد: ${e.title}`, time: e.created_at, type: 'exams', color: 'bg-amber-100 text-amber-600' })),
        ...(recentNotifs || []).map(n => ({ title: `إعلان جديد: ${n.title}`, time: n.created_at, type: 'notifications', color: 'bg-sky-100 text-sky-600' }))
      ];

      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    } catch (error) {
      console.error('Error fetching admin recent activities:', error);
      throw error;
    }
  }, []);

  const fetchStudentDashboardData = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, sections(name, classes(name))')
        .eq('id', user.id)
        .single();
      
      if (!student) return null;

      const [
        { data: assignmentSections },
        { data: examSections }
      ] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', student.section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', student.section_id)
      ]);

      const assignmentIds = assignmentSections?.map(a => a.assignment_id) || [];
      const examIds = examSections?.map(e => e.exam_id) || [];

      const [
        { data: assignments },
        { data: exams },
        { data: attendance },
        { data: grades },
        { data: todaysSchedule },
        { data: periods }
      ] = await Promise.all([
        supabase
          .from('assignments')
          .select('*, subject:subjects(name)')
          .in('id', assignmentIds)
          .order('due_date', { ascending: true })
          .limit(3),
        supabase
          .from('exams')
          .select('*, subject:subjects(name)')
          .in('id', examIds)
          .order('start_time', { ascending: true })
          .limit(3),
        supabase
          .from('daily_attendance_summary')
          .select('daily_status')
          .eq('student_id', student.id),
        supabase
          .from('exam_attempts')
          .select('score, exam:exams(title, total_points)')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false })
          .limit(5),
        supabase
          .from('schedules')
          .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users(full_name))')
          .eq('section_id', student.section_id)
          .eq('day_of_week', new Date().getDay() + 1)
          .order('period'),
        supabase
          .from('class_periods')
          .select('*')
          .order('period_number')
      ]);

      const totalDays = attendance?.length || 0;
      const presentDays = attendance?.filter(a => a.daily_status === 'present').length || 0;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

      return {
        student,
        assignments: assignments || [],
        exams: exams || [],
        attendanceRate,
        grades: grades || [],
        todaysSchedule: todaysSchedule || [],
        periods: periods || []
      };
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      throw error;
    }
  }, [user]);

  const fetchStudentSchedule = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id, sections(name, classes(name))')
        .eq('id', user.id)
        .single();

      if (studentError) throw studentError;
      if (!student) return null;

      const [
        { data: schedule },
        { data: periods }
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users(full_name))')
          .eq('section_id', student.section_id)
          .order('day_of_week')
          .order('period'),
        supabase
          .from('class_periods')
          .select('*')
          .order('period_number')
      ]);

      return {
        student,
        schedule: schedule || [],
        periods: periods || []
      };
    } catch (error) {
      console.error('Error fetching student schedule:', error);
      throw error;
    }
  }, [user]);

  const fetchParentDashboardData = useCallback(async () => {
    if (!user) return null;
    try {
      const [
        { data: children },
        { data: notifications }
      ] = await Promise.all([
        supabase
          .from('students')
          .select('*, users(full_name), sections(name, classes(name))')
          .eq('parent_id', user.id),
        supabase
          .from('notifications')
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
      console.error('Error fetching parent dashboard data:', error);
      throw error;
    }
  }, [user]);

  const fetchTeacherDashboardData = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*, users(*)')
        .eq('id', user.id)
        .single();
      
      if (!teacher) return null;

      const { data: teacherSections } = await supabase
        .from('teacher_sections')
        .select('section_id, section:sections(id, name, class_id, classes(id, name), students(count))')
        .eq('teacher_id', user.id);
      
      const sections = teacherSections?.map(ts => ts.section) || [];
      const sectionIds = sections.map((s: any) => s.id);

      const [
        { data: recentExams },
        { data: recentAssignments },
        { data: schedule },
        { data: periods },
        { data: messages },
        { count: studentsCount },
        { count: examsCount },
        { count: assignmentsCount }
      ] = await Promise.all([
        sectionIds.length > 0 ? supabase
          .from('exams')
          .select('id, title, created_at, start_time, subject:subjects(name), section:sections(name)')
          .in('section_id', sectionIds)
          .order('created_at', { ascending: false })
          .limit(5) : Promise.resolve({ data: [] }),
        sectionIds.length > 0 ? supabase
          .from('assignments')
          .select('id, title, section_id, due_date, subjects(name), sections(name, classes(name))')
          .in('section_id', sectionIds)
          .order('created_at', { ascending: false })
          .limit(5) : Promise.resolve({ data: [] }),
        supabase
          .from('schedules')
          .select('id, day_of_week, period, start_time, end_time, subjects(name), sections(name, classes(name))')
          .eq('teacher_id', user.id)
          .order('day_of_week')
          .order('period'),
        supabase
          .from('class_periods')
          .select('*')
          .order('period_number'),
        supabase
          .from('messages')
          .select('id, subject, content, created_at, sender:sender_id(full_name)')
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        sectionIds.length > 0 ? supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('section_id', sectionIds) : Promise.resolve({ count: 0 }),
        sectionIds.length > 0 ? supabase
          .from('exams')
          .select('id', { count: 'exact', head: true })
          .in('section_id', sectionIds) : Promise.resolve({ count: 0 }),
        sectionIds.length > 0 ? supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .in('section_id', sectionIds) : Promise.resolve({ count: 0 })
      ]);

      return {
        teacher,
        sections,
        recentExams: recentExams || [],
        recentAssignments: recentAssignments || [],
        schedule: schedule || [],
        periods: periods || [],
        messages: messages || [],
        stats: {
          totalStudents: studentsCount || 0,
          totalExams: examsCount || 0,
          totalAssignments: assignmentsCount || 0
        }
      };
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
      throw error;
    }
  }, [user]);

  const fetchTeacherSchedule = useCallback(async () => {
    if (!user) return null;
    try {
      const [
        { data: schedule },
        { data: periods }
      ] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, day_of_week, period, start_time, end_time, subjects(name), sections(id, name, classes(name))')
          .eq('teacher_id', user.id)
          .order('day_of_week')
          .order('period'),
        supabase
          .from('class_periods')
          .select('*')
          .order('period_number')
      ]);

      return {
        schedule: schedule || [],
        periods: periods || []
      };
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      throw error;
    }
  }, [user]);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities,
    fetchStudentDashboardData,
    fetchStudentSchedule,
    fetchParentDashboardData,
    fetchTeacherDashboardData,
    fetchTeacherSchedule
  };
}
