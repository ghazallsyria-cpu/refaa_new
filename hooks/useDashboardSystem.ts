import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface StudentQueryResult {
  created_at: string;
  users: { full_name: string } | { full_name: string }[] | null;
}

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
  }, []);

  const fetchStudentDashboardData = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: student } = await supabase
        .from('students')
        .select('*, users(full_name), sections(name, classes(name))')
        .eq('user_id', user.id)
        .single();
      
      if (!student) return null;

      const [
        { data: assignmentSections },
        { data: examSections }
      ] = await Promise.all([
        supabase.from('assignment_sections').select('assignment_id').eq('section_id', (student as any).section_id),
        supabase.from('exam_sections').select('exam_id').eq('section_id', (student as any).section_id)
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
        supabase
          .from('schedules')
          .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users(full_name))')
          .eq('section_id', (student as any).section_id)
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
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;
      if (!student) return null;

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
  }, [user]);

  const fetchParentDashboardData = useCallback(async () => {
    if (!user) return null;
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
  }, [user]);

  const fetchTeacherDashboardData = useCallback(async () => {
    if (!user) return null;
    try {
      let { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('*, users(*)')
        .eq('user_id', user.id)
        .single();
      
      if ((teacherError || !teacher) && user.user_metadata?.role === 'teacher') {
        const { data: newUser, error: userFetchError } = await supabase.from('users').select('full_name, role').eq('id', user.id).single();
        if (!userFetchError && newUser?.role === 'teacher') {
          const { data: newTeacher, error: createError } = await supabase.from('teachers').insert({
              user_id: user.id,
              national_id: 'TEMP_' + user.id.substring(0, 8),
              specialization: 'غير محدد'
            }).select('*, users(*)').single();
          if (!createError && newTeacher) { teacher = newTeacher; teacherError = null; }
        }
      }

      if (teacherError || !teacher) return null;

      // جلب فصول المعلم مع أعداد الطلاب
      const { data: teacherSections } = await supabase
        .from('teacher_sections')
        .select('section_id, section:sections(id, name, class_id, classes(id, name), students(count))')
        .eq('teacher_id', teacher.id);
      
      const sections = teacherSections?.map(ts => ts.section) || [];
      const sectionIds = sections.map((s: any) => s.id);

      // 🚀 جلب الواجبات والاختبارات المرتبطة بالمعلم بطريقة صحيحة ودقيقة
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
        // 🚀 تم إضافة is_read و avatar_url لاستخراج الرسائل بشكل دقيق
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

      // تنسيق الاختبارات
      const exams = (recentExams || []).map((e: any) => {
        const sec = e.exam_sections?.[0]?.section;
        return {
          ...e,
          subject_name: Array.isArray(e.subject) ? e.subject[0]?.name : e.subject?.name || 'غير محدد',
          section_name: sec ? `${sec.classes?.name || ''} - ${sec.name}` : 'غير محدد'
        };
      });

      // تنسيق الواجبات
      const assignments = (recentAssignments || []).map((a: any) => {
        const sec = a.assignment_sections?.[0]?.section;
        return {
          ...a,
          subject_name: Array.isArray(a.subject) ? a.subject[0]?.name : a.subject?.name || 'غير محدد',
          section_name: sec ? `${sec.classes?.name || ''} - ${sec.name}` : 'غير محدد'
        };
      });

      // 🚀 حساب إحصائيات الإنجاز الحقيقية لكل فصل
      const recentAssIds = assignments.map(a => a.id);
      let submissionsData: any[] = [];
      if (recentAssIds.length > 0) {
         const { data: subs } = await supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', recentAssIds);
         submissionsData = subs || [];
      }

      const assignmentStats = sections.map(section => {
        // البحث عن الواجبات المسندة لهذا الفصل من ضمن الواجبات النشطة
        const secAssignments = assignments.filter(a => a.assignment_sections?.some((as: any) => as.section_id === section[0]?.id));
        
        // حساب عدد الطلاب الفعلي في الفصل
const studentCount = Array.isArray(section.students)  ? section.students[0]?.count || 0  : section.students?.count || 0;
        if (secAssignments.length === 0 || studentCount === 0) return null;

        let expectedSubmissions = 0;
        let actualSubmissions = 0;

        secAssignments.forEach(a => {
            expectedSubmissions += studentCount;
            actualSubmissions += submissionsData.filter(sub => sub.assignment_id === a.id).length;
        });

        const percentage = expectedSubmissions > 0 ? Math.min(Math.round((actualSubmissions / expectedSubmissions) * 100), 100) : 0;

        return {
            title: 'إنجاز الواجبات النشطة',
            className: `${section.classes?.name} - ${section.name}`,
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
        assignmentStats, // 🚀 الإحصائيات الحقيقية
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
      const { data: teacherProfile } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
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
  }, [user]);

  const updateStudentTrack = useCallback(async (track: 'scientific' | 'literary') => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ 
          next_year_track: track,
          track_selection_date: new Date().toISOString()
        })
        .eq('user_id', user.id) // استخدام user_id بدلاً من id
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating student track:', error);
      throw error;
    }
  }, [user]);

  const fetchTrackSelectionStats = useCallback(async (classId?: string) => {
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

      const stats = {
        scientific: data.filter(s => s.next_year_track === 'scientific').length,
        literary: data.filter(s => s.next_year_track === 'literary').length,
        total: data.length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching track selection stats:', error);
      throw error;
    }
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
    fetchTrackSelectionStats
  };
}
