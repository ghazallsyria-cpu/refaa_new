import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface StudentQueryResult {
  created_at: string;
  users: { full_name: string, avatar_url?: string } | { full_name: string, avatar_url?: string }[] | null;
}

// ==========================================
// 🚀 محرك الكاش الذكي (In-Memory Cache Engine)
// ==========================================
const globalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // مدة حفظ الكاش: 5 دقائق

const withCache = async <T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T> => {
  // إذا لم يطلب المستخدم تحديثاً إجبارياً، والبيانات موجودة ولم تنتهِ صلاحيتها
  if (!forceRefresh && globalCache.has(key)) {
    const cached = globalCache.get(key)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data; // إرجاع البيانات فوراً من الذاكرة (0 ثانية)
    }
  }
  
  // جلب البيانات من السيرفر إذا لم تكن في الكاش أو انتهت صلاحيتها
  const data = await fetcher();
  globalCache.set(key, { data, timestamp: Date.now() }); // حفظ في الكاش
  return data;
};

// دالة عامة لتفريغ الكاش (إذا احتجنا لذلك مستقبلاً)
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
          supabase.from('students').select('users(full_name), created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('notifications').select('title, created_at').eq('type', 'announcement').order('created_at', { ascending: false }).limit(2)
        ]);

        const activities: { title: string; time: string; type: string; color: string }[] = [
          ...((recentStudents as unknown as StudentQueryResult[]) || []).map(s => {
            const userData = s.users;
            const fullName = Array.isArray(userData) 
              ? userData[0]?.full_name 
              : userData?.full_name;
              
            return { 
              title: `إضافة الطالب ${fullName || 'غير معروف'}`, 
              time: s.created_at, 
              type: 'students', 
              color: 'bg-indigo-100 text-indigo-600' 
            };
          }),
          ...(recentDocs || []).map(d => ({ title: `مستند جديد: ${d.title}`, time: d.created_at, type: 'documents', color: 'bg-emerald-100 text-emerald-600' })),
          ...(recentExams || []).map(e => ({ title: `اختبار جديد: ${e.title}`, time: e.created_at, type: 'exams', color: 'bg-amber-100 text-amber-600' })),
          ...(recentNotifs || []).map(n => ({ title: `إعلان جديد: ${n.title}`, time: n.created_at, type: 'notifications', color: 'bg-sky-100 text-sky-600' }))
        ];

        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
      } catch (error) {
        console.error('Error fetching admin recent activities:', error);
        throw error;
      }
    }, forceRefresh);
  }, []);

  const fetchStudentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`student_dashboard_${user.id}`, async () => {
      try {
        let { data: student } = await supabase
          .from('students')
          .select('*, users(full_name, avatar_url), sections(id, name, classes(name))')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!student) {
          const { data: fallbackStudent } = await supabase
            .from('students')
            .select('*, users(full_name, avatar_url), sections(id, name, classes(name))')
            .eq('id', user.id)
            .maybeSingle();
          student = fallbackStudent;
        }
        
        if (!student) return null;

        const sectionId = (student as any).section_id;

        const [
          { data: assignmentSections },
          { data: examSections }
        ] = await Promise.all([
          sectionId ? supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId) : Promise.resolve({ data: [] }),
          sectionId ? supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId) : Promise.resolve({ data: [] })
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
          assignmentIds.length > 0 ? supabase
            .from('assignments')
            .select('*, subject:subjects(name)')
            .in('id', assignmentIds)
            .order('due_date', { ascending: true })
            .limit(3) : Promise.resolve({ data: [] }),
          examIds.length > 0 ? supabase
            .from('exams')
            .select('*, subject:subjects(name)')
            .in('id', examIds)
            .order('start_time', { ascending: true })
            .limit(3) : Promise.resolve({ data: [] }),
          supabase
            .from('daily_attendance_summary')
            .select('daily_status')
            .eq('student_id', student.id),
          supabase
            .from('exam_attempts')
            .select('score, completed_at, exam:exams(title, total_points, subjects(name))')
            .eq('student_id', student.id)
            .order('completed_at', { ascending: false })
            .limit(5),
          sectionId ? supabase
            .from('schedules')
            .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users(full_name))')
            .eq('section_id', sectionId)
            .eq('day_of_week', new Date().getDay() + 1)
            .order('period') : Promise.resolve({ data: [] }),
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
    }, forceRefresh);
  }, [user]);

  const fetchTeacherDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        let { data: teacher } = await supabase
          .from('teachers')
          .select('*, users(*)')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!teacher) {
          const { data: fallbackTeacher } = await supabase
            .from('teachers')
            .select('*, users(*)')
            .eq('id', user.id)
            .maybeSingle();
          teacher = fallbackTeacher;
        }

        if (!teacher && user.user_metadata?.role === 'teacher') {
          const { data: newUser, error: userFetchError } = await supabase.from('users').select('full_name, role').eq('id', user.id).single();
          if (!userFetchError && newUser?.role === 'teacher') {
            const { data: newTeacher, error: createError } = await supabase.from('teachers').insert({
                user_id: user.id,
                national_id: 'TEMP_' + user.id.substring(0, 8),
                specialization: 'غير محدد'
              }).select('*, users(*)').single();
            if (!createError && newTeacher) { teacher = newTeacher; }
          }
        }

        if (!teacher) return null;

        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id, section:sections(id, name, class_id, classes(id, name), students(count))')
          .eq('teacher_id', teacher.id);
        
        const rawSections = (teacherSections?.map(ts => ts.section) || []).filter(Boolean);
        const sections = rawSections.map(s => Array.isArray(s) ? s[0] : s).filter(Boolean);
        
        sections.sort((a: any, b: any) => {
          const classA = Array.isArray(a.classes) ? a.classes[0]?.name : a.classes?.name;
          const classB = Array.isArray(b.classes) ? b.classes[0]?.name : b.classes?.name;
          const nameA = `${classA || ''} - ${a.name || ''}`;
          const nameB = `${classB || ''} - ${b.name || ''}`;
          return nameA.localeCompare(nameB, 'ar', { numeric: true });
        });

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
          supabase
            .from('exams')
            .select(`id, title, created_at, start_time, subject:subjects(name), exam_sections(section:sections(name, classes(name)))`)
            .eq('teacher_id', teacher.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assignments')
            .select(`id, title, due_date, subject:subjects(name), assignment_sections(section_id, section:sections(name, classes(name)))`)
            .eq('teacher_id', teacher.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('schedules')
            .select('id, day_of_week, period, start_time, end_time, subjects(name), sections(name, classes(name))')
            .eq('teacher_id', teacher.id)
            .order('day_of_week')
            .order('period'),
          supabase
            .from('class_periods')
            .select('*')
            .order('period_number'),
          supabase
            .from('messages')
            .select('id, subject, content, created_at, is_read, sender:sender_id(full_name, avatar_url)')
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          sectionIds.length > 0 ? supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .in('section_id', sectionIds) : Promise.resolve({ count: 0 }),
          supabase
            .from('exams')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', teacher.id),
          supabase
            .from('assignments')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', teacher.id)
        ]);

        const exams = (recentExams || []).map((e: any) => {
          const sec = Array.isArray(e.exam_sections) ? e.exam_sections[0]?.section : e.exam_sections?.section;
          const subj = Array.isArray(e.subject) ? e.subject[0] : e.subject;
          return {
            ...e,
            subject_name: subj?.name || 'غير محدد',
            section_name: sec ? `${Array.isArray(sec.classes) ? sec.classes[0]?.name : sec.classes?.name || ''} - ${sec.name}` : 'غير محدد'
          };
        });

        const assignments = (recentAssignments || []).map((a: any) => {
          const sec = Array.isArray(a.assignment_sections) ? a.assignment_sections[0]?.section : a.assignment_sections?.section;
          const subj = Array.isArray(a.subject) ? a.subject[0] : a.subject;
          return {
            ...a,
            subject_name: subj?.name || 'غير محدد',
            section_name: sec ? `${Array.isArray(sec.classes) ? sec.classes[0]?.name : sec.classes?.name || ''} - ${sec.name}` : 'غير محدد'
          };
        });

        const recentAssIds = assignments.map(a => a.id);
        let submissionsData: any[] = [];
        if (recentAssIds.length > 0) {
           const { data: subs } = await supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', recentAssIds);
           submissionsData = subs || [];
        }

        const assignmentStats = sections.map((section: any) => {
          const secAssignments = assignments.filter(a => a.assignment_sections?.some((as: any) => as.section_id === section.id));
          const studentCount = Array.isArray(section.students) ? section.students[0]?.count || 0 : section.students?.count || 0;

          if (secAssignments.length === 0 || studentCount === 0) return null;

          let expectedSubmissions = secAssignments.length * studentCount;
          let actualSubmissions = submissionsData.filter(sub => secAssignments.some(a => a.id === sub.assignment_id)).length;

          const percentage = expectedSubmissions > 0 ? Math.min(Math.round((actualSubmissions / expectedSubmissions) * 100), 100) : 0;
          const classObj = Array.isArray(section.classes) ? section.classes[0] : section.classes;

          return {
              title: 'إنجاز الواجبات النشطة',
              className: `${classObj?.name || ''} - ${section.name}`,
              percentage,
              submissionCount: actualSubmissions,
              totalStudents: expectedSubmissions
          };
        }).filter(Boolean);

        return {
          teacher,
          sections,
          recentExams: exams,
          recentAssignments: assignments,
          schedule: schedule || [],
          periods: periods || [],
          messages: messages || [],
          assignmentStats,
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
    }, forceRefresh);
  }, [user]);

  const updateStudentTrack = useCallback(async (track: 'scientific' | 'literary') => {
    if (!user) return null;
    try {
      let { data, error } = await supabase
        .from('students')
        .update({ 
          next_year_track: track,
          track_selection_date: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (!data) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('students')
          .update({ 
            next_year_track: track,
            track_selection_date: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .maybeSingle();
        data = fallbackData;
        error = fallbackError;
      }
      
      if (error) throw error;
      
      // 🚀 تفريغ الكاش الخاص بالطالب والمسارات ليرى التحديث فوراً
      globalCache.delete(`student_dashboard_${user.id}`);
      globalCache.delete(`track_stats_all`);

      return data;
    } catch (error) {
      console.error('Error updating student track:', error);
      throw error;
    }
  }, [user]);

  const fetchStudentSchedule = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`student_schedule_${user.id}`, async () => {
      try {
        let { data: student } = await supabase
          .from('students')
          .select('section_id, sections(name, classes(name))')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!student) {
          const { data: s2 } = await supabase.from('students').select('section_id, sections(name, classes(name))').eq('id', user.id).maybeSingle();
          student = s2;
        }

        if (!student || !(student as any).section_id) return null;

        const [
          { data: schedule },
          { data: periods }
        ] = await Promise.all([
          supabase
            .from('schedules')
            .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users:user_id(full_name))')
            .eq('section_id', (student as any).section_id)
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
    }, forceRefresh);
  }, [user]);

  const fetchTeacherSchedule = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`teacher_schedule_${user.id}`, async () => {
      try {
        let { data: teacherProfile } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (!teacherProfile) {
          const { data: t2 } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
          teacherProfile = t2;
        }
        
        if (!teacherProfile) return null;

        const [
          { data: schedule },
          { data: periods }
        ] = await Promise.all([
          supabase
            .from('schedules')
            .select('id, day_of_week, period, start_time, end_time, subjects(name), sections(id, name, classes(name))')
            .eq('teacher_id', teacherProfile.id)
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
    }, forceRefresh);
  }, [user]);

  const fetchParentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user) return null;
    return withCache(`parent_dashboard_${user.id}`, async () => {
      try {
        const { data: parentProfile } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!parentProfile) return null;

        const [
          { data: children },
          { data: notifications }
        ] = await Promise.all([
          supabase
            .from('students')
            .select('*, users(full_name), sections(name, classes(name))')
            .eq('parent_id', parentProfile.id),
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
    }, forceRefresh);
  }, [user]);

  const fetchTrackSelectionStats = useCallback(async (classId?: string, forceRefresh = false) => {
    return withCache(`track_stats_${classId || 'all'}`, async () => {
      try {
        let query = supabase
          .from('students')
          .select('next_year_track, sections!inner(class_id)')
          .not('next_year_track', 'is', null);
        
        if (classId) {
          query = query.eq('sections.class_id', classId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          scientific: data.filter(s => s.next_year_track === 'scientific').length,
          literary: data.filter(s => s.next_year_track === 'literary').length,
          total: data.length
        };
      } catch (error) {
        console.error('Error fetching track selection stats:', error);
        throw error;
      }
    }, forceRefresh);
  }, []);

  return {
    fetchAdminDashboardStats,
    fetchAdminRecentActivities,
    fetchStudentDashboardData,
    fetchStudentSchedule,
    fetchParentDashboardData, 
    fetchTeacherDashboardData,
    fetchTeacherSchedule,
    updateStudentTrack,
    fetchTrackSelectionStats,
    clearDashboardCache // 🚀 يمكن استخدامها لتفريغ الكاش يدوياً
  };
}
