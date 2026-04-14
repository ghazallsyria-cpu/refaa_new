import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface StudentQueryResult {
  created_at: string;
  users: { full_name: string, avatar_url?: string } | { full_name: string, avatar_url?: string }[] | null;
}

const globalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; 

const withCache = async <T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T> => {
  if (!forceRefresh && globalCache.has(key)) {
    const cached = globalCache.get(key)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }
  const data = await fetcher();
  globalCache.set(key, { data, timestamp: Date.now() }); 
  return data;
};

export const clearDashboardCache = () => {
  globalCache.clear();
};

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchAdminDashboardStats = useCallback(async (forceRefresh = false) => {
    return withCache('admin_stats', async () => {
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

        return {
          studentsCount: studentsCount || 0,
          teachersCount: teachersCount || 0,
          sectionsCount: sectionsCount || 0,
          attendanceRate: totalAttendanceCount > 0 ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100) : 0
        };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);

  const fetchAdminRecentActivities = useCallback(async (forceRefresh = false) => {
    return withCache('admin_activities', async () => {
      try {
        const [
          { data: recentStudents },
          { data: recentDocs },
          { data: recentExams },
          { data: recentNotifs }
        ] = await Promise.all([
          // 🚀 استخدام الجسر الجديد
          supabase.from('students').select('users!fk_students_to_users(full_name), created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('notifications').select('title, created_at').eq('type', 'announcement').order('created_at', { ascending: false }).limit(2)
        ]);

        const activities = [
          ...((recentStudents as any) || []).map((s: any) => ({ title: `إضافة الطالب ${s.users?.full_name || 'غير معروف'}`, time: s.created_at, type: 'students', color: 'bg-indigo-100 text-indigo-600' })),
          ...(recentDocs || []).map((d: any) => ({ title: `مستند جديد: ${d.title}`, time: d.created_at, type: 'documents', color: 'bg-emerald-100 text-emerald-600' })),
          ...(recentExams || []).map((e: any) => ({ title: `اختبار جديد: ${e.title}`, time: e.created_at, type: 'exams', color: 'bg-amber-100 text-amber-600' })),
          ...(recentNotifs || []).map((n: any) => ({ title: `إعلان جديد: ${n.title}`, time: n.created_at, type: 'notifications', color: 'bg-sky-100 text-sky-600' }))
        ];
        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);

  const fetchStudentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`student_dashboard_${user.id}`, async () => {
      try {
        // 🚀 استخدام الجسر الجديد
        const { data: student } = await supabase
          .from('students')
          .select('*, users!fk_students_to_users(full_name, avatar_url), sections(id, name, classes(name))')
          .eq('id', user.id)
          .maybeSingle();
        
        if (!student) return { student: { id: user.id, users: { full_name: 'طالب' } }, assignments: [], exams: [], attendanceRate: 100, grades: [], todaysSchedule: [], periods: [] };

        const sectionId = (student as any).section_id;
        const [ { data: assignmentSections }, { data: examSections } ] = await Promise.all([
          sectionId ? supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId) : Promise.resolve({ data: [] }),
          sectionId ? supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId) : Promise.resolve({ data: [] })
        ]);

        const assignmentIds = assignmentSections?.map(a => a.assignment_id) || [];
        const examIds = examSections?.map(e => e.exam_id) || [];

        const [ { data: assignments }, { data: exams }, { data: attendance }, { data: grades }, { data: todaysSchedule }, { data: periods } ] = await Promise.all([
          assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date').limit(3) : Promise.resolve({ data: [] }),
          examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).order('start_time').limit(3) : Promise.resolve({ data: [] }),
          supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id),
          supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, total_points, subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
          // 🚀 الحصص مع الجسر الجديد
          sectionId ? supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users!fk_teachers_to_users(full_name))').eq('section_id', sectionId).eq('day_of_week', new Date().getDay() + 1).order('period') : Promise.resolve({ data: [] }),
          supabase.from('class_periods').select('*').order('period_number')
        ]);

        return { student, assignments: assignments || [], exams: exams || [], attendanceRate: 100, grades: grades || [], todaysSchedule: todaysSchedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user]);

  const fetchTeacherDashboardData = useCallback(async (forceRefresh = true) => { 
    if (!user) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        // 🚀 الجسر الجديد للمعلمين
        const { data: teacher, error: teacherErr } = await supabase
          .from('teachers')
          .select('*, users!fk_teachers_to_users(*)')
          .eq('id', user.id)
          .maybeSingle();

        if (teacherErr) throw teacherErr;

        if (!teacher) return { teacher: { id: user.id, users: { full_name: 'أستاذ' } }, sections: [], recentExams: [], recentAssignments: [], schedule: [], periods: [], messages: [], assignmentStats: [], stats: { totalStudents: 0, totalExams: 0, totalAssignments: 0 } };

        const { data: teacherSections } = await supabase.from('teacher_sections').select('section_id, section:sections(id, name, classes(name), students(count))').eq('teacher_id', teacher.id);
        const sections = (teacherSections?.map(ts => ts.section) || []).filter(Boolean);
        const sectionIds = sections.map((s: any) => s.id);

        const [ { data: recentExams }, { data: recentAssignments }, { data: schedule }, { data: periods }, { data: messages } ] = await Promise.all([
          supabase.from('exams').select(`id, title, created_at, start_time, subject:subjects(name), exam_sections(section:sections(name, classes(name)))`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('assignments').select(`id, title, due_date, subject:subjects(name), assignment_sections(section_id, section:sections(name, classes(name)))`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), sections(name, classes(name))').eq('teacher_id', teacher.id).order('day_of_week').order('period'),
          supabase.from('class_periods').select('*').order('period_number'),
          supabase.from('messages').select('id, subject, content, created_at, is_read, sender:sender_id(full_name, avatar_url)').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5)
        ]);

        return { teacher, sections, recentExams: recentExams || [], recentAssignments: recentAssignments || [], schedule: schedule || [], periods: periods || [], messages: messages || [], assignmentStats: [], stats: { totalStudents: 0, totalExams: recentExams?.length || 0, totalAssignments: recentAssignments?.length || 0 } };
      } catch (error) { throw error; }
    }, forceRefresh); 
  }, [user]);

  // باقي الدوال يتم تحديثها بنفس الطريقة عند الحاجة...
  return { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchStudentDashboardData, fetchTeacherDashboardData, clearDashboardCache };
}