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

// 🚀 دالة مساعدة لمعرفة النظام الفعال حالياً (يدوي أو آلي)
const getActiveSystem = async () => {
  try {
    const { data } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    return data?.active_schedule_system || 'manual';
  } catch {
    return 'manual';
  }
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

  // 🚀 [هوك الطالب المُدرّع والداعم للأوقات الذكية حسب المرحلة]
  const fetchStudentDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    
    return withCache(`student_dashboard_${user.id}`, async () => {
      try {
        const activeSystem = await getActiveSystem();
        let allAutoPeriods: any[] = [];
        let classPeriods: any[] = [];

        // 🚀 جلب كافة الأوقات مسبقاً لتغذية الجدول بالأوقات الصحيحة
        if (activeSystem === 'auto') {
            const { data } = await supabase.from('auto_class_periods').select('*');
            allAutoPeriods = data || [];
        } else {
            const { data } = await supabase.from('class_periods').select('*').order('period_number');
            classPeriods = data || [];
        }

        const { data: studentCore, error: studentError } = await supabase
          .from('students')
          .select('*, sections(id, name, classes(name))')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        const { data: userData } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (studentError || !studentCore) {
           return { student: { id: user.id, users: userData || { full_name: 'طالب' } }, assignments: [], exams: [], attendanceRate: 0, grades: [], todaysSchedule: [], periods: [] };
        }
        
        const student = { ...studentCore, users: userData || { full_name: 'طالب' } };
        const sectionId = studentCore.section_id;

        // 🚀 تحديد مرحلة الطالب بدقة لتوجيه الأوقات
        let stage: 'middle' | 'high' = 'high';
        const classNameObj = Array.isArray(studentCore.sections?.classes) ? studentCore.sections?.classes[0] : studentCore.sections?.classes;
        const classNameStr = classNameObj?.name || '';
        if (classNameStr && /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(classNameStr)) {
            stage = 'middle';
        }

        let periods = activeSystem === 'auto' 
            ? allAutoPeriods.filter(p => p.stage === stage).sort((a,b) => a.period_number - b.period_number)
            : classPeriods;

        let assignments: any[] = [];
        let exams: any[] = [];
        let attendance: any[] = [];
        let grades: any[] = [];
        let todaysSchedule: any[] = [];

        try {
           const [gradesRes, attendanceRes] = await Promise.all([
              supabase.from('exam_attempts').select('score, completed_at, exam:exams(title, total_points, subjects(name))').eq('student_id', studentCore.id).order('completed_at', { ascending: false }).limit(5),
              supabase.from('attendance_records').select('status').eq('student_id', studentCore.id).limit(5000)
           ]);
           if (gradesRes.data) grades = gradesRes.data;
           if (attendanceRes.data) attendance = attendanceRes.data;
        } catch (e) {
           console.error("Error fetching general student info:", e);
        }

        if (sectionId) {
            try {
                const todayDbDay = new Date().getDay() + 1;

                if (activeSystem === 'auto') {
                   const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
                   if (planData) {
                      const { data: autoScheds } = await supabase.from('auto_schedules')
                         .select('*')
                         .eq('plan_id', planData.id)
                         .eq('section_id', sectionId)
                         .eq('day_of_week', todayDbDay)
                         .order('period_number')
                         .limit(100);

                      if (autoScheds && autoScheds.length > 0) {
                         const subjIds = [...new Set(autoScheds.map(s => s.subject_id))];
                         const teachIds = [...new Set(autoScheds.map(s => s.teacher_id))];

                         const [subjRes, teachRes] = await Promise.all([
                            supabase.from('subjects').select('id, name').in('id', subjIds),
                            supabase.from('users').select('id, full_name').in('id', teachIds)
                         ]);

                         todaysSchedule = autoScheds.map(s => {
                            const subj = subjRes.data?.find(x => x.id === s.subject_id);
                            const teach = teachRes.data?.find(x => x.id === s.teacher_id);
                            
                            // 🚀 حقن الوقت الدقيق
                            let startTime = s.start_time;
                            let endTime = s.end_time;
                            const pTime = allAutoPeriods.find(p => p.period_number === s.period_number && p.stage === stage);
                            if (pTime) {
                                startTime = pTime.start_time;
                                endTime = pTime.end_time;
                            }

                            return {
                               id: s.id,
                               day_of_week: s.day_of_week,
                               period: s.period_number,
                               start_time: startTime,
                               end_time: endTime,
                               subjects: { name: subj?.name },
                               teachers: { users: { full_name: teach?.full_name } }
                            };
                         });
                      }
                   }
                } else {
                   const { data: scheduleData } = await supabase
                     .from('schedules')
                     .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(users(full_name))') 
                     .eq('section_id', sectionId)
                     .eq('day_of_week', todayDbDay)
                     .order('period')
                     .limit(100);
                     
                   if (scheduleData) todaysSchedule = scheduleData;
                }

                const [assignmentSections, examSections] = await Promise.all([
                  supabase.from('assignment_sections').select('assignment_id').eq('section_id', sectionId),
                  supabase.from('exam_sections').select('exam_id').eq('section_id', sectionId)
                ]);

                const assignmentIds = (assignmentSections.data || []).map((a: any) => a.assignment_id);
                const examIds = (examSections.data || []).map((e: any) => e.exam_id);

                if (assignmentIds.length > 0) {
                   const [{ data: v1 }, { data: v2 }] = await Promise.all([
                     supabase.from('assignments').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(5),
                     supabase.from('assignments_v2').select('*, subject:subjects(name)').in('id', assignmentIds).order('due_date', { ascending: true }).limit(5)
                   ]);
                   assignments = [...(v1 || []), ...(v2 || [])].slice(0, 5);
                }

                if (examIds.length > 0) {
                   const { data: examsData } = await supabase.from('exams').select('*, subject:subjects(name)').in('id', examIds).order('start_time', { ascending: true }).limit(3);
                   if (examsData) exams = examsData;
                }

            } catch(e) {
                console.error("Error fetching section-related data:", e);
            }
        }

        const totalDays = attendance.length;
        const presentDays = attendance.filter((a: any) => a.status === 'present').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
        
        return { 
          student, 
          assignments, 
          exams, 
          attendanceRate, 
          grades, 
          todaysSchedule, 
          periods 
        };
      } catch (error) { 
          console.error("CRITICAL Student Dashboard Error:", error);
          throw error; 
      }
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

  // 🚀 [جدول الطالب الكامل - مدعوم بالأوقات الذكية]
  const fetchStudentSchedule = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`student_schedule_${user.id}`, async () => {
      try {
        const activeSystem = await getActiveSystem();
        let allAutoPeriods: any[] = [];
        let classPeriods: any[] = [];

        if (activeSystem === 'auto') {
            const { data } = await supabase.from('auto_class_periods').select('*');
            allAutoPeriods = data || [];
        } else {
            const { data } = await supabase.from('class_periods').select('*').order('period_number');
            classPeriods = data || [];
        }

        const { data: student } = await supabase.from('students').select('section_id, sections(name, classes(name))').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle();
        if (!student || !student.section_id) return null;

        let scheduleData: any[] = [];
        
        // 🚀 تحديد المرحلة
        let stage: 'middle' | 'high' = 'high';
        const classNameObj = Array.isArray(student?.sections?.classes) ? student.sections.classes[0] : student?.sections?.classes;
        const classNameStr = classNameObj?.name || '';
        if (classNameStr && /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(classNameStr)) {
            stage = 'middle';
        }

        let periods = activeSystem === 'auto' 
            ? allAutoPeriods.filter(p => p.stage === stage).sort((a,b) => a.period_number - b.period_number)
            : classPeriods;

        if (activeSystem === 'auto') {
            const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (planData) {
                const { data: raw } = await supabase.from('auto_schedules').select('*').eq('plan_id', planData.id).eq('section_id', student.section_id).order('day_of_week').order('period_number').limit(5000);
                if (raw && raw.length > 0) {
                    const subjIds = [...new Set(raw.map(s => s.subject_id))];
                    const teachIds = [...new Set(raw.map(s => s.teacher_id))];

                    const [subjRes, teachRes] = await Promise.all([
                        supabase.from('subjects').select('id, name').in('id', subjIds),
                        supabase.from('teachers').select('id, zoom_link').in('id', teachIds)
                    ]);

                    scheduleData = raw.map(s => {
                        const subj = subjRes.data?.find(x => x.id === s.subject_id);
                        const teach = teachRes.data?.find(x => x.id === s.teacher_id);
                        
                        // 🚀 حقن الوقت الدقيق
                        let startTime = s.start_time;
                        let endTime = s.end_time;
                        const pTime = allAutoPeriods.find(p => p.period_number === s.period_number && p.stage === stage);
                        if (pTime) {
                            startTime = pTime.start_time;
                            endTime = pTime.end_time;
                        }

                        return {
                            id: s.id,
                            day_of_week: s.day_of_week,
                            period: s.period_number,
                            start_time: startTime,
                            end_time: endTime,
                            subjects: { name: subj?.name },
                            teachers: { zoom_link: teach?.zoom_link }
                        };
                    });
                }
            }
        } else {
            const { data } = await supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link)').eq('section_id', student.section_id).order('day_of_week').order('period').limit(5000);
            scheduleData = data || [];
        }

        return { student, schedule: scheduleData, periods: periods };
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
      const activeSystem = await getActiveSystem();
      let allAutoPeriods: any[] = [];
      let classPeriods: any[] = [];

      if (activeSystem === 'auto') {
          const { data } = await supabase.from('auto_class_periods').select('*');
          allAutoPeriods = data || [];
      } else {
          const { data } = await supabase.from('class_periods').select('*').order('period_number');
          classPeriods = data || [];
      }

      // جلب مرحلة الابن لتحديد الأوقات بدقة
      const { data: childData } = await supabase.from('students').select('sections(classes(name))').eq('id', childId).maybeSingle();
      let stage: 'middle' | 'high' = 'high';
      const classNameObj = Array.isArray(childData?.sections?.classes) ? childData?.sections?.classes[0] : childData?.sections?.classes;
      if (classNameObj?.name && /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(classNameObj.name)) {
          stage = 'middle';
      }

      let periods = activeSystem === 'auto' 
          ? allAutoPeriods.filter(p => p.stage === stage).sort((a,b) => a.period_number - b.period_number)
          : classPeriods;

      const todayDbDay = new Date().getDay() + 1; 
      let scheduleData: any[] = [];
      
      if (sectionId) {
          if (activeSystem === 'auto') {
              const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
              if (planData) {
                  const { data: raw } = await supabase.from('auto_schedules').select('*').eq('plan_id', planData.id).eq('section_id', sectionId).eq('day_of_week', todayDbDay).order('period_number').limit(100);
                  if (raw && raw.length > 0) {
                      const subjIds = [...new Set(raw.map(s => s.subject_id))];
                      const { data: subjRes } = await supabase.from('subjects').select('id, name').in('id', subjIds);
                      scheduleData = raw.map(s => {
                          let startTime = s.start_time;
                          let endTime = s.end_time;
                          const pNum = s.period_number || s.period;
                          const pTime = allAutoPeriods.find(p => p.period_number === pNum && p.stage === stage);
                          if (pTime) {
                              startTime = pTime.start_time;
                              endTime = pTime.end_time;
                          }

                          return {
                              ...s,
                              period: s.period_number,
                              start_time: startTime,
                              end_time: endTime,
                              subjects: { id: s.subject_id, name: subjRes?.find((x: any) => x.id === s.subject_id)?.name },
                              teachers: { id: s.teacher_id }
                          }
                      });
                  }
              }
          } else {
              const { data } = await supabase.from('schedules').select('*, subjects(id, name), teachers(id)').eq('section_id', sectionId).eq('day_of_week', todayDbDay).order('period', { ascending: true });
              scheduleData = data || [];
          }
      }

      const [ { data: attendance }, { data: badges }, { data: exams }, { data: assignments } ] = await Promise.all([
        supabase.from('attendance_records').select('*, subjects(name)').eq('student_id', childId).order('date', { ascending: false }),
        supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', childId).order('granted_at', { ascending: false }),
        supabase.from('exam_attempts').select('id, score, status, completed_at, exams(title, total_marks, max_score, subjects(id, name))').eq('student_id', childId),
        supabase.from('assignment_submissions').select('id, grade, status, submitted_at, feedback, assignments(title, total_marks, subjects(id, name))').eq('student_id', childId)
      ]);

      return { attendance: attendance || [], badges: badges || [], periods: periods, schedule: scheduleData, exams: exams || [], assignments: assignments || [] };
    } catch (error) { throw error; }
  }, []);

  // 🚀 [هوك المعلم المُدرّع بالكامل مع حقن التواقيت الذكية]
  const fetchTeacherDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        const activeSystem = await getActiveSystem();
        let allAutoPeriods: any[] = [];
        let classPeriods: any[] = [];

        // 🚀 جلب كل الأوقات لضمان التوافق المطلق
        if (activeSystem === 'auto') {
            const { data } = await supabase.from('auto_class_periods').select('*');
            allAutoPeriods = data || [];
        } else {
            const { data } = await supabase.from('class_periods').select('*').order('period_number');
            classPeriods = data || [];
        }

        const { data: userData } = await supabase.from('users').select('full_name, avatar_url').eq('id', user.id).maybeSingle();

        let teacherId = user.id; 
        const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        
        if (tByUserId?.id) {
            teacherId = tByUserId.id;
        } else {
            const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
            if (tById?.id) teacherId = tById.id;
        }

        const teacher = { id: teacherId, users: userData || { full_name: 'معلم' } };
        
        let scheduleData: any[] = [];
        let teacherSchedules: any[] = [];

        // 1. جلب الجدول لمعرفة الفصول التي يدرسها المعلم
        if (activeSystem === 'auto') {
            const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (planData) {
                const { data: raw } = await supabase.from('auto_schedules').select('*').eq('plan_id', planData.id).eq('teacher_id', teacherId).order('day_of_week').order('period_number');
                if (raw && raw.length > 0) {
                    teacherSchedules = raw;
                    const secIds = [...new Set(raw.map(s => s.section_id))];
                    const subjIds = [...new Set(raw.map(s => s.subject_id))];

                    const [secRes, subjRes] = await Promise.all([
                        supabase.from('sections').select('id, name, classes(name)').in('id', secIds),
                        supabase.from('subjects').select('id, name').in('id', subjIds)
                    ]);

                    scheduleData = raw.map(s => {
                        const sec = secRes.data?.find((x: any) => x.id === s.section_id);
                        const subj = subjRes.data?.find((x: any) => x.id === s.subject_id);
                        
                        // 🚀 التعرف على المرحلة لهذه البطاقة بالذات لتحديد وقتها المخصص
                        let itemStage = 'high';
                        const cName = sec?.classes?.name || sec?.name || '';
                        if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(cName)) itemStage = 'middle';

                        let startTime = s.start_time;
                        let endTime = s.end_time;
                        const pTime = allAutoPeriods.find(p => p.period_number === s.period_number && p.stage === itemStage);
                        if (pTime) {
                            startTime = pTime.start_time;
                            endTime = pTime.end_time;
                        }

                        return {
                            ...s,
                            period: s.period_number,
                            start_time: startTime, // حقن الوقت الدقيق
                            end_time: endTime,     // حقن الوقت الدقيق
                            sections: { name: sec?.name, classes: sec?.classes },
                            subjects: { name: subj?.name }
                        };
                    });
                }
            }
        } else {
            const { data: raw } = await supabase.from('schedules').select('*, sections(name, classes(name)), subjects(name)').eq('teacher_id', teacherId).order('day_of_week').order('period');
            scheduleData = raw || [];
            teacherSchedules = scheduleData;
        }
        
        // 2. 🚀 [تحديد المرحلة الأساسية للمعلم لرسم خط الزمن الخارجي للوحة]
        let midCount = 0; let highCount = 0;
        scheduleData.forEach(s => {
            const classObj = Array.isArray(s.sections?.classes) ? s.sections?.classes[0] : s.sections?.classes;
            const cName = classObj?.name || s.sections?.name || s.section_name || '';
            if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(cName)) midCount++;
            else if (cName) highCount++;
        });
        const teacherPrimaryStage = midCount > highCount ? 'middle' : 'high';

        let periods = activeSystem === 'auto' 
            ? allAutoPeriods.filter(p => p.stage === teacherPrimaryStage).sort((a,b) => a.period_number - b.period_number)
            : classPeriods;

        let sectionIds = Array.from(new Set((teacherSchedules || []).map(ts => ts.section_id).filter(Boolean)));
        
        if (sectionIds.length === 0) {
           const { data: teacherSectionsFallback } = await supabase.from('teacher_sections').select('section_id').eq('teacher_id', teacherId);
           sectionIds = Array.from(new Set((teacherSectionsFallback || []).map(ts => ts.section_id).filter(Boolean)));
        }
        
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

        const [{ data: v1Assigns }, { data: v2Assigns }] = await Promise.all([
           supabase.from('assignments').select(`id, title, due_date, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(3),
           supabase.from('assignments_v2').select(`id, title, due_date, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(3)
        ]);
        const recentAssignments = [...(v2Assigns || []), ...(v1Assigns || [])].slice(0, 5);

        const v1Ids = (v1Assigns || []).map(a => a.id);
        const v2Ids = (v2Assigns || []).map(a => a.id);
        
        const [{ data: v1Subs }, { data: v2Subs }] = await Promise.all([
            v1Ids.length > 0 ? supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', v1Ids) : Promise.resolve({ data: [] }),
            v2Ids.length > 0 ? supabase.from('student_progress_v2').select('assignment_id').in('assignment_id', v2Ids).eq('is_completed', true) : Promise.resolve({ data: [] })
        ]);
        const allSubmissions = [...(v1Subs || []), ...(v2Subs || [])];

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

        const todayStr = new Date().toISOString().split('T')[0];
        
        const [
          { data: recentExams }, 
          { data: messages },
          { data: attendanceRecords }
        ] = await Promise.all([
          supabase.from('exams').select(`id, title, created_at, start_time, subjects(name)`).eq('teacher_id', teacherId).order('created_at', { ascending: false }).limit(5),
          supabase.from('messages').select('*, sender:sender_id(full_name, avatar_url)').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('attendance_records').select('status').eq('teacher_id', teacherId).eq('date', todayStr)
        ]);

        const totalAttendance = attendanceRecords?.length || 0;
        const presentCount = (attendanceRecords || []).filter(a => a.status === 'present').length || 0;
        const avgAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
        const absenceRate = totalAttendance > 0 ? (100 - avgAttendance) : 0;

        return { 
          teacher, 
          sections, 
          schedule: scheduleData, 
          periods: periods, 
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

  // 🚀 [جدول المعلم الكامل الأسبوعي - مدعوم بالتعرف الذكي على المرحلة وحقن التواقيت]
  const fetchTeacherSchedule = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return null;
    return withCache(`teacher_schedule_${user.id}`, async () => {
      try {
        const activeSystem = await getActiveSystem();
        let allAutoPeriods: any[] = [];
        let classPeriods: any[] = [];

        if (activeSystem === 'auto') {
            const { data } = await supabase.from('auto_class_periods').select('*');
            allAutoPeriods = data || [];
        } else {
            const { data } = await supabase.from('class_periods').select('*').order('period_number');
            classPeriods = data || [];
        }

        let teacherId = user.id; 
        const { data: tByUserId } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (tByUserId?.id) {
            teacherId = tByUserId.id;
        } else {
            const { data: tById } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
            if (tById?.id) teacherId = tById.id;
        }
        
        let scheduleData: any[] = [];

        if (activeSystem === 'auto') {
            const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (planData) {
                const { data: raw } = await supabase.from('auto_schedules').select('*').eq('plan_id', planData.id).eq('teacher_id', teacherId).order('day_of_week').order('period_number').limit(5000);
                if (raw && raw.length > 0) {
                    const subjIds = [...new Set(raw.map(s => s.subject_id))];
                    const secIds = [...new Set(raw.map(s => s.section_id))];

                    const [subjRes, secRes] = await Promise.all([
                        supabase.from('subjects').select('id, name').in('id', subjIds),
                        supabase.from('sections').select('id, name, classes(name)').in('id', secIds)
                    ]);

                    scheduleData = raw.map(s => {
                        const subj = subjRes.data?.find((x: any) => x.id === s.subject_id);
                        const sec = secRes.data?.find((x: any) => x.id === s.section_id);
                        
                        // 🚀 التعرف الذكي على المرحلة وحقن الوقت هنا
                        let itemStage = 'high';
                        const cName = sec?.classes?.name || sec?.name || '';
                        if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(cName)) itemStage = 'middle';

                        let startTime = s.start_time;
                        let endTime = s.end_time;
                        const pTime = allAutoPeriods.find(p => p.period_number === s.period_number && p.stage === itemStage);
                        if (pTime) {
                            startTime = pTime.start_time;
                            endTime = pTime.end_time;
                        }

                        return {
                            id: s.id,
                            day_of_week: s.day_of_week,
                            period: s.period_number,
                            start_time: startTime,
                            end_time: endTime,
                            subjects: { name: subj?.name },
                            sections: { id: sec?.id, name: sec?.name, classes: sec?.classes }
                        };
                    });
                }
            }
        } else {
            const { data } = await supabase.from('schedules').select('id, day_of_week, period, start_time, end_time, subjects(name), sections(id, name, classes(name))').eq('teacher_id', teacherId).order('day_of_week').order('period').limit(5000);
            scheduleData = data || [];
        }

        // 🚀 تحديد المرحلة الأساسية للمعلم لمعايرة خط الزمن (Timeline) الأيسر
        let midCount = 0; let highCount = 0;
        scheduleData.forEach(s => {
            const classObj = Array.isArray(s.sections?.classes) ? s.sections?.classes[0] : s.sections?.classes;
            const cName = classObj?.name || s.sections?.name || s.section_name || '';
            if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(cName)) midCount++;
            else if (cName) highCount++;
        });
        const teacherPrimaryStage = midCount > highCount ? 'middle' : 'high';

        let periods = activeSystem === 'auto' 
            ? allAutoPeriods.filter(p => p.stage === teacherPrimaryStage).sort((a,b) => a.period_number - b.period_number)
            : classPeriods;

        return { schedule: scheduleData, periods: periods };
      } catch (error) { throw error; }
    }, forceRefresh);
  }, [user?.id]);

  return { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchStudentDashboardData, fetchStudentSchedule, fetchParentDashboardData, fetchParentChildDetails, fetchTeacherDashboardData, fetchTeacherSchedule, updateStudentTrack, fetchTrackSelectionStats, clearDashboardCache };
}
