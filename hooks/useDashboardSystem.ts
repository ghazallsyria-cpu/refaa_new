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
    const isDataEmpty = !cached.data || 
      (Array.isArray(cached.data) && cached.data.length === 0) ||
      (typeof cached.data === 'object' && Object.values(cached.data).every(v => v === 0 || (Array.isArray(v) && v.length === 0)));

    if (!isDataEmpty && Date.now() - cached.timestamp < CACHE_TTL) {
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
  const { user } = useAuth() as any;

  const fetchAdminDashboardStats = useCallback(async (forceRefresh = false) => {
    return withCache('admin_stats', async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [ { count: studentsCount }, { count: teachersCount }, { count: sectionsCount }, attendanceRes ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('sections').select('*', { count: 'exact', head: true }),
          supabase.from('attendance_records').select('status').eq('date', today)
        ]);

        const totalAttendanceCount = attendanceRes.data?.length || 0;
        const presentAttendanceCount = (attendanceRes.data || []).filter(a => a.status === 'present').length || 0;
        
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
        let query = supabase.from('students').select('next_year_track, section_id').not('next_year_track', 'is', null).limit(5000);
        const { data, error } = await query;
        if (error) throw error;
        const validData = data || [];
        return { scientific: validData.filter(s => s.next_year_track === 'scientific').length, literary: validData.filter(s => s.next_year_track === 'literary').length, total: validData.length };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, []);

  const fetchStudentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`student_dashboard_${user.id}`, async () => {
      try {
        const { data: studentCore } = await supabase.from('students').select('*, sections(id, name, classes(name))').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
        const { data: userData } = await supabase.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle();

        if (!studentCore) return { student: { id: user.id, users: userData || { full_name: 'طالب' } }, assignments: [], exams: [], attendanceRate: 0, grades: [], todaysSchedule: [], periods: [] };
        
        const student = { ...studentCore, users: userData || { full_name: 'طالب' } };
        const sectionId = studentCore.section_id;

        const [ { data: assignmentSections }, { data: examSections } ] = await Promise.all([
          sectionId ? supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId).limit(5000) : Promise.resolve({ data: [] }),
          sectionId ? supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId).limit(5000) : Promise.resolve({ data: [] })
        ]);

        const assignmentIds = (assignmentSections || []).map(a => a.assignment_id);
        const examIds = (examSections || []).map(e => e.exam_id);

        const [ { data: assignments }, { data: exams }, { data: attendance }, { data: grades }, { data: todaysSchedule }, { data: periods } ] = await Promise.all([
          assignmentIds.length > 0 ? supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(3) : Promise.resolve({ data: [] }),
          examIds.length > 0 ? supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).order('start_time', { ascending: true }).limit(3) : Promise.resolve({ data: [] }),
          supabase.from('attendance_records').select('status').eq('student_id', studentCore.id).limit(5000),
          supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, total_points, subjects(name))').eq('student_id', studentCore.id).order('completed_at', { ascending: false }).limit(5),
          sectionId ? supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link)').eq('section_id', sectionId).eq('day_of_week', new Date().getDay() + 1).order('period').limit(100) : Promise.resolve({ data: [] }),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);

        const totalDays = attendance?.length || 0;
        const presentDays = (attendance || []).filter(a => a.status === 'present').length || 0;
        
        return { 
          student, 
          assignments: assignments || [], 
          exams: exams || [], 
          attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100, 
          grades: grades || [], 
          todaysSchedule: todaysSchedule || [], 
          periods: periods || [] 
        };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user?.id]);

  const updateStudentTrack = useCallback(async (track: 'scientific' | 'literary') => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase.from('students').update({ next_year_track: track, track_selection_date: new Date().toISOString() }).eq('id', user.id).select().maybeSingle();
      if (error) throw error;
      globalCache.delete(`student_dashboard_${user.id}`);
      globalCache.delete(`track_stats_all`);
      return data;
    } catch (error) { throw error; }
  }, [user?.id]);

  const fetchStudentSchedule = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`student_schedule_${user.id}`, async () => {
      try {
        const { data: student } = await supabase.from('students').select('section_id, sections(name, classes(name))').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
        if (!student || !student.section_id) return null;
        const [ { data: schedule }, { data: periods } ] = await Promise.all([
          supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link)').eq('section_id', student.section_id).order('day_of_week').order('period').limit(5000),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);
        return { student, schedule: schedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user?.id]);

  const fetchParentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`parent_dashboard_main_${user.id}`, async () => {
      try {
        const { data: parentProfile } = await supabase.from('parents').select('id').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
        if (!parentProfile) return { children: [], notifications: [] };
        
        const [ { data: children }, { data: notifications } ] = await Promise.all([
          supabase.from('students').select('*, sections(name, classes(name))').eq('parent_id', parentProfile.id).limit(100),
          supabase.from('notifications').select('*').eq('type', 'announcement').order('created_at', { ascending: false }).limit(5)
        ]);
        return { children: children || [], notifications: notifications || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user?.id]);

  const fetchParentChildDetails = useCallback(async (childId: string, sectionId: string | null) => {
    try {
      const todayDbDay = new Date().getDay() + 1; 
      const [ { data: attendance }, { data: badges }, { data: periods }, { data: schedule }, { data: exams }, { data: assignments } ] = await Promise.all([
        supabase.from('attendance_records').select('*, subjects(name)').eq('student_id', childId).order('date', { ascending: false }),
        supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', childId).order('granted_at', { ascending: false }),
        supabase.from('class_periods').select('*').order('period_number', { ascending: true }),
        sectionId ? supabase.from('schedules').select('*, subjects(id, name), teachers(id)').eq('section_id', sectionId).eq('day_of_week', todayDbDay).order('period', { ascending: true }) : Promise.resolve({ data: [] }),
        supabase.from('exam_attempts').select('id, score, status, completed_at, exams(title, total_marks, max_score, subjects(id, name))').eq('student_id', childId),
        supabase.from('assignment_submissions').select('id, grade, status, submitted_at, feedback, assignments(title, total_marks, subjects(id, name))').eq('student_id', childId)
      ]);

      return { attendance: attendance || [], badges: badges || [], periods: periods || [], schedule: schedule || [], exams: exams || [], assignments: assignments || [] };
    } catch (error) { throw error; }
  }, []);

  // 🚀 [الحل النهائي والدرع الحصين للمعلم]
  const fetchTeacherDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        // 1. جلب بيانات المستخدم الأساسية بشكل مضمون
        const { data: userData } = await supabase.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle();

        // 2. البحث عن المعلم بأمان بالغ (نجرب user_id أولاً ثم id لتجنب أخطاء PostgREST)
        let teacherId = user.id; 
        const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        
        if (tByUserId?.id) {
            teacherId = tByUserId.id;
        } else {
            const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
            if (tById?.id) teacherId = tById.id;
        }

        const teacher = { id: teacherId, users: userData || { full_name: 'معلم' } };

        // 3. جلب الشعب الموكلة للمعلم بأمان (محصن ضد أخطاء العلاقات)
        const { data: teacherSections } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', teacherId);
        const sectionIds = (teacherSections || []).map(ts => ts.section_id).filter(Boolean);
        
        let sections: any[] = [];
        let studentsCount = 0;

        if (sectionIds.length > 0) {
            const { data: sectionsData } = await supabase.from('sections').select('id, name, classes(name)').in('id', sectionIds);
            const { data: studentsData } = await supabase.from('students').select('id, section_id').in('section_id', sectionIds);
            
            studentsCount = studentsData?.length || 0;
            sections = (sectionsData || []).map(sec => {
               const count = studentsData?.filter(s => s.section_id === sec.id).length || 0;
               return { ...sec, students: { count } };
            });
        }

        // 4. جلب الواجبات (V1 و V2)
        const [{ data: v1Assigns }, { data: v2Assigns }] = await Promise.all([
           supabase.from('assignments').select(`id, title, due_date, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(3),
           supabase.from('assignments_v2').select(`id, title, due_date, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(3)
        ]);
        const recentAssignments = [...(v2Assigns || []), ...(v1Assigns || [])].slice(0, 5);

        // 5. جلب التسليمات
        const v1Ids = (v1Assigns || []).map(a => a.id);
        const v2Ids = (v2Assigns || []).map(a => a.id);
        
        const [{ data: v1Subs }, { data: v2Subs }] = await Promise.all([
            v1Ids.length > 0 ? supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', v1Ids) : Promise.resolve({ data: [] }),
            v2Ids.length > 0 ? supabase.from('student_progress_v2').select('assignment_id').in('assignment_id', v2Ids).eq('is_completed', true) : Promise.resolve({ data: [] })
        ]);
        const allSubmissions = [...(v1Subs || []), ...(v2Subs || [])];

        // 6. بناء إحصائيات الواجبات
        const assignmentStats = recentAssignments.map((assignment: any) => {
          const submissionCount = allSubmissions.filter(s => s.assignment_id === assignment.id).length;
          const expected = studentsCount > 0 ? studentsCount : 0; 
          const percentage = expected > 0 ? Math.min(Math.round((submissionCount / expected) * 100), 100) : 0;
          
          return { 
            title: assignment.title, 
            className: (Array.isArray(assignment.subjects) ? assignment.subjects[0]?.name : assignment.subjects?.name) || 'مادة عامة', 
            percentage, 
            submissionCount, 
            totalStudents: expected 
          };
        });

        // 7. جلب الاختبارات والجدول والغياب بشكل مستقل
        const [
          { data: recentExams }, 
          { data: schedule }, 
          { data: periods }, 
          { data: messages },
          { data: attendanceRecords }
        ] = await Promise.all([
          supabase.from('exams').select(`id, title, created_at, start_time, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(5),
          supabase.from('schedules').select('*, sections(name, classes(name)), subjects(name)').eq('teacher_id', teacherId).order('day_of_week').order('period'),
          supabase.from('class_periods').select('*').order('period_number'),
          supabase.from('messages').select('*, sender:sender_id(full_name, avatar_url)').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('attendance_records').select('status').eq('teacher_id', teacherId)
        ]);

        const totalAttendance = attendanceRecords?.length || 0;
        const presentCount = (attendanceRecords || []).filter(a => a.status === 'present').length || 0;
        const avgAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
        const absenceRate = totalAttendance > 0 ? (100 - avgAttendance) : 0;

        return { 
          teacher, 
          sections, 
          schedule: schedule || [], 
          periods: periods || [], 
          messages: messages || [], 
          assignmentStats,
          recentExams: (recentExams || []).map((e: any) => ({
            ...e, 
            subject_name: (Array.isArray(e.subjects) ? e.subjects[0]?.name : e.subjects?.name) || 'مادة غير محددة'
          })),
          recentAssignments: recentAssignments.map((a: any) => ({
            ...a, 
            subject_name: (Array.isArray(a.subjects) ? a.subjects[0]?.name : a.subjects?.name) || 'مادة غير محددة'
          })),
          stats: { 
            totalStudents: studentsCount || 0, 
            totalExams: recentExams?.length || 0, 
            totalAssignments: recentAssignments?.length || 0, 
            avgAttendance, 
            absenceRate 
          }
        };
      } catch (error) { 
        console.error('Final Dashboard Error:', error); 
        return null; 
      }
    }, forceRefresh); 
  }, [user?.id]);

  const fetchTeacherSchedule = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`teacher_schedule_${user.id}`, async () => {
      try {
        let teacherId = user.id; 
        const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (tByUserId?.id) {
            teacherId = tByUserId.id;
        } else {
            const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
            if (tById?.id) teacherId = tById.id;
        }
        
        const [ { data: schedule }, { data: periods } ] = await Promise.all([
          supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), sections(id, name, classes(name))').eq('teacher_id', teacherId).order('day_of_week').order('period').limit(5000),
          supabase.from('class_periods').select('*').order('period_number').limit(100)
        ]);
        return { schedule: schedule || [], periods: periods || [] };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user?.id]);

  return { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchStudentDashboardData, fetchStudentSchedule, fetchParentDashboardData, fetchParentChildDetails, fetchTeacherDashboardData, fetchTeacherSchedule, updateStudentTrack, fetchTrackSelectionStats, clearDashboardCache };
}
