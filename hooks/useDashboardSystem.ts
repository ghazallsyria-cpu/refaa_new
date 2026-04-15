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
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
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

  // ==========================================
  // 1. ADMIN DASHBOARD FUNCTIONS
  // ==========================================
  const fetchAdminDashboardStats = useCallback(async (forceRefresh = false) => {
    return withCache('admin_stats', async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [ { count: studentsCount }, { count: teachersCount }, { count: sectionsCount }, attendanceRes ] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('sections').select('id', { count: 'exact', head: true }),
          supabase.from('daily_attendance_summary').select('daily_status').eq('date', today)
        ]);
        const totalAttendanceCount = attendanceRes.data?.length || 0;
        const presentAttendanceCount = attendanceRes.data?.filter(a => a.daily_status === 'present').length || 0;
        return {
          studentsCount: studentsCount || 0, teachersCount: teachersCount || 0, sectionsCount: sectionsCount || 0,
          attendanceRate: totalAttendanceCount > 0 ? Math.round((presentAttendanceCount / totalAttendanceCount) * 100) : 0
        };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);

  const fetchAdminRecentActivities = useCallback(async (forceRefresh = false) => {
    return withCache('admin_activities', async () => {
      try {
        const [ { data: recentStudents }, { data: recentDocs }, { data: recentExams }, { data: recentNotifs } ] = await Promise.all([
          supabase.from('students').select('users!students_id_fkey(full_name), created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('notifications').select('title, created_at').eq('type', 'announcement').order('created_at', { ascending: false }).limit(2)
        ]);

        const activities = [
          ...((recentStudents as unknown as StudentQueryResult[]) || []).map(s => {
            const userData = s.users;
            const fullName = Array.isArray(userData) ? userData[0]?.full_name : userData?.full_name;
            return { title: `إضافة الطالب ${fullName || 'غير معروف'}`, time: s.created_at, type: 'students', color: 'bg-indigo-100 text-indigo-600' };
          }),
          ...(recentDocs || []).map(d => ({ title: `مستند جديد: ${d.title}`, time: d.created_at, type: 'documents', color: 'bg-emerald-100 text-emerald-600' })),
          ...(recentExams || []).map(e => ({ title: `اختبار جديد: ${e.title}`, time: e.created_at, type: 'exams', color: 'bg-amber-100 text-amber-600' })),
          ...(recentNotifs || []).map(n => ({ title: `إعلان جديد: ${n.title}`, time: n.created_at, type: 'notifications', color: 'bg-sky-100 text-sky-600' }))
        ];
        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);

  const fetchTrackSelectionStats = useCallback(async (classId?: string, forceRefresh = false) => {
    return withCache(`track_stats_${classId || 'all'}`, async () => {
      try {
        let query = supabase.from('students').select('next_year_track, sections!inner(class_id)').not('next_year_track', 'is', null).limit(5000);
        if (classId) { query = query.eq('sections.class_id', classId); }
        const { data, error } = await query;
        if (error) throw error;
        return { scientific: data.filter(s => s.next_year_track === 'scientific').length, literary: data.filter(s => s.next_year_track === 'literary').length, total: data.length };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);


  // ==========================================
  // 2. STUDENT & PARENT FUNCTIONS
  // ==========================================
  const fetchStudentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`student_dashboard_${user.id}`, async () => {
      try {
        const { data: student } = await supabase.from('students').select('*, users!students_id_fkey(full_name, avatar_url), sections(id, name, classes(name))').eq('id', user.id).maybeSingle();
        if (!student) return { student: { id: user.id, users: { full_name: 'حساب طالب غير مكتمل' } }, assignments: [], exams: [], attendanceRate: 0, grades: [], todaysSchedule: [], periods: [] };
        
        const sectionId = (student as any).section_id;
        const [ { data: assignmentSections }, { data: examSections } ] = await Promise.all([
          sectionId ? supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId).limit(5000) : Promise.resolve({ data: [] }),
          sectionId ? supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId).limit(5000) : Promise.resolve({ data: [] })
        ]);

        const assignmentIds = assignmentSections?.map(a => a.assignment_id) || [];
        const examIds = examSections?.map(e => e.exam_id) || [];

        const [ { data: assignments }, { data: exams }, { data: attendance }, { data: grades }, { data: todaysSchedule }, { data: periods } ] = await Promise.all([
          assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(3) : Promise.resolve({ data: [] }),
          examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).order('start_time', { ascending: true }).limit(3) : Promise.resolve({ data: [] }),
          supabase.from('daily_attendance_summary').select('daily_status').eq('student_id', student.id).limit(5000),
          supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, total_points, subjects(name))').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
          sectionId ? supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users!teachers_id_fkey(full_name))').eq('section_id', sectionId).eq('day_of_week', new Date().getDay() + 1).order('period').limit(100) : Promise.resolve({ data: [] }),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);

        const totalDays = attendance?.length || 0;
        const presentDays = attendance?.filter(a => a.daily_status === 'present').length || 0;
        return { student, assignments: assignments || [], exams: exams || [], attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100, grades: grades || [], todaysSchedule: todaysSchedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user]);

  const updateStudentTrack = useCallback(async (track: 'scientific' | 'literary') => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from('students').update({ next_year_track: track, track_selection_date: new Date().toISOString() }).eq('id', user.id).select().maybeSingle();
      if (error) throw error;
      globalCache.delete(`student_dashboard_${user.id}`);
      globalCache.delete(`track_stats_all`);
      return data;
    } catch (error) { throw error; }
  }, [user]);

  const fetchStudentSchedule = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`student_schedule_${user.id}`, async () => {
      try {
        const { data: student } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
        if (!student || !(student as any).section_id) return null;
        const [ { data: schedule }, { data: periods } ] = await Promise.all([
          supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users!teachers_id_fkey(full_name))').eq('section_id', (student as any).section_id).order('day_of_week').order('period').limit(5000),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);
        return { student, schedule: schedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user]);

  const fetchParentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`parent_dashboard_${user.id}`, async () => {
      try {
        const { data: parentProfile } = await supabase.from('parents').select('id').eq('id', user.id).single();
        if (!parentProfile) return null;
        const [ { data: children }, { data: notifications } ] = await Promise.all([
          supabase.from('students').select('*, users!students_id_fkey(full_name), sections(name, classes(name))').eq('parent_id', parentProfile.id).limit(1000),
          supabase.from('notifications').select('*').eq('type', 'announcement').order('created_at', { ascending: false }).limit(5)
        ]);
        return { children: children || [], notifications: notifications || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user]);


  // ==========================================
  // 3. TEACHER FUNCTIONS (The Perfected Version)
  // ==========================================
  const fetchTeacherDashboardData = useCallback(async (forceRefresh = true) => { 
    if (!user) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        const { data: teacher, error: teacherErr } = await supabase.from('teachers').select('*, users!teachers_id_fkey(*)').eq('id', user.id).maybeSingle();

        if (teacherErr || !teacher) {
            return { teacher: { id: user.id, users: { full_name: 'أستاذ' } }, sections: [], recentExams: [], recentAssignments: [], schedule: [], periods: [], messages: [], assignmentStats: [], stats: { totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 100, absenceRate: 0 } };
        }

        if (teacher.users && Array.isArray(teacher.users)) teacher.users = teacher.users[0] || {};

        const { data: teacherSections } = await supabase.from('teacher_sections').select('section_id, section:sections(id, name, classes(name), students(count))').eq('teacher_id', teacher.id);
        
        const sections = (teacherSections?.map(ts => {
           const s = Array.isArray(ts.section) ? ts.section[0] : ts.section;
           return s;
        }) || []).filter(Boolean);

        const sectionIds = sections.map((s: any) => s.id);

        const [
          { data: recentExams }, { data: recentAssignments }, { data: schedule }, { data: periods }, { data: messages },
          { count: studentsCount }, { data: attendanceRecords }
        ] = await Promise.all([
          supabase.from('exams').select(`id, title, created_at, start_time, subject:subjects(name), exam_sections(section_id)`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('assignments').select(`id, title, due_date, subject:subjects(name), assignment_sections(section_id)`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('schedules').select('*, sections(name, classes(name)), subjects(name)').eq('teacher_id', teacher.id).order('day_of_week').order('period'),
          supabase.from('class_periods').select('*').order('period_number'),
          supabase.from('messages').select('*, sender:sender_id(full_name, avatar_url)').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5),
          sectionIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sectionIds) : Promise.resolve({ count: 0 }),
          supabase.from('attendance_records').select('status').eq('teacher_id', teacher.id)
        ]);

        const totalAttendance = attendanceRecords?.length || 0;
        const presentCount = attendanceRecords?.filter(a => a.status === 'present').length || 0;
        const avgAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
        const absenceRate = totalAttendance > 0 ? (100 - avgAttendance) : 0;

        const recentAssIds = (recentAssignments || []).map(a => a.id);
        let submissionsData: any[] = [];
        if (recentAssIds.length > 0) {
           const { data: subs } = await supabase.from('assignment_submissions').select('assignment_id, student:students(section_id)').in('assignment_id', recentAssIds);
           submissionsData = subs || [];
        }

        const assignmentStats = sections.map((section: any) => {
          const secAssignments = (recentAssignments || []).filter((a: any) => a.assignment_sections?.some((as: any) => as.section_id === section.id));
          const studentCount = Array.isArray(section.students) ? section.students[0]?.count || 0 : section.students?.count || 0;
          
          if (secAssignments.length === 0 || studentCount === 0) return null;

          let expectedSubmissions = secAssignments.length * studentCount;
          let actualSubmissions = submissionsData.filter(sub => sub.student?.section_id === section.id && secAssignments.some((a: any) => a.id === sub.assignment_id)).length;

          const percentage = expectedSubmissions > 0 ? Math.min(Math.round((actualSubmissions / expectedSubmissions) * 100), 100) : 0;
          const classObj = Array.isArray(section.classes) ? section.classes[0] : section.classes;
          
          return { title: 'إنجاز الواجبات', className: `${classObj?.name || ''} - ${section.name}`, percentage, submissionCount: actualSubmissions, totalStudents: expectedSubmissions };
        }).filter(Boolean);

        return { 
          teacher, sections, schedule: schedule || [], periods: periods || [], messages: messages || [], assignmentStats,
          // 🚀 تم إصلاح خطأ TypeScript هنا بالتعامل مع المصفوفات بأمان
          recentExams: (recentExams || []).map((e: any) => ({
            ...e, 
            subject_name: (Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name) || 'مادة'
          })),
          recentAssignments: (recentAssignments || []).map((a: any) => ({
            ...a, 
            subject_name: (Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name) || 'مادة'
          })),
          stats: { totalStudents: studentsCount || 0, totalExams: recentExams?.length || 0, totalAssignments: recentAssignments?.length || 0, avgAttendance, absenceRate }
        };
      } catch (error) { console.error('Final Dashboard Error:', error); return null; }
    }, forceRefresh); 
  }, [user]);

  const fetchTeacherSchedule = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`teacher_schedule_${user.id}`, async () => {
      try {
        const { data: teacherProfile } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
        if (!teacherProfile) return null;
        const [ { data: schedule }, { data: periods } ] = await Promise.all([
          supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), sections(id, name, classes(name))').eq('teacher_id', teacherProfile.id).order('day_of_week').order('period').limit(5000),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);
        return { schedule: schedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user]);

  return { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchStudentDashboardData, fetchStudentSchedule, fetchParentDashboardData, fetchTeacherDashboardData, fetchTeacherSchedule, updateStudentTrack, fetchTrackSelectionStats, clearDashboardCache };
}
