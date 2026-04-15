import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

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

export function useDashboardSystem() {
  const { user } = useAuth();

  const fetchTeacherDashboardData = useCallback(async (forceRefresh = true) => { 
    if (!user) return null;
    return withCache(`teacher_dashboard_${user.id}`, async () => {
      try {
        // 🚀 1. استخدام الجسر الرسمي teachers_id_fkey لضمان ظهور البيانات
        const { data: teacher, error: teacherErr } = await supabase
          .from('teachers')
          .select('*, users!teachers_id_fkey(*)')
          .eq('id', user.id)
          .maybeSingle();

        if (teacherErr || !teacher) {
            console.error("Teacher fetch error:", teacherErr);
            return { teacher: { id: user.id, users: { full_name: 'أستاذ' } }, sections: [], recentExams: [], recentAssignments: [], schedule: [], periods: [], messages: [], assignmentStats: [], stats: { totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 100, absenceRate: 0 } };
        }

        if (teacher.users && Array.isArray(teacher.users)) teacher.users = teacher.users[0] || {};

        // 🚀 2. جلب الفصول مع عدد الطلاب الحقيقي لكل فصل
        const { data: teacherSections } = await supabase
          .from('teacher_sections')
          .select('section_id, section:sections(id, name, classes(name), students(count))')
          .eq('teacher_id', teacher.id);
        
        const sections = (teacherSections?.map(ts => {
           const s = Array.isArray(ts.section) ? ts.section[0] : ts.section;
           return s;
        }) || []).filter(Boolean);

        const sectionIds = sections.map((s: any) => s.id);

        // 🚀 3. جلب البيانات المتعددة (بما فيها سجلات الحضور لحساب النسبة)
        const [
          { data: recentExams }, { data: recentAssignments }, { data: schedule }, { data: periods }, { data: messages },
          { count: studentsCount },
          { data: attendanceRecords }
        ] = await Promise.all([
          supabase.from('exams').select(`id, title, created_at, start_time, subject:subjects(name), exam_sections(section_id)`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('assignments').select(`id, title, due_date, subject:subjects(name), assignment_sections(section_id)`).eq('teacher_id', teacher.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('schedules').select('*, sections(name, classes(name)), subjects(name)').eq('teacher_id', teacher.id).order('day_of_week').order('period'),
          supabase.from('class_periods').select('*').order('period_number'),
          supabase.from('messages').select('*, sender:sender_id(full_name, avatar_url)').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(5),
          sectionIds.length > 0 ? supabase.from('students').select('id', { count: 'exact', head: true }).in('section_id', sectionIds) : Promise.resolve({ count: 0 }),
          supabase.from('attendance_records').select('status').eq('teacher_id', teacher.id)
        ]);

        // 🚀 4. حساب نسب الحضور والغياب (التي كانت تظهر صفر)
        const totalAttendance = attendanceRecords?.length || 0;
        const presentCount = attendanceRecords?.filter(a => a.status === 'present').length || 0;
        const avgAttendance = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
        const absenceRate = totalAttendance > 0 ? (100 - avgAttendance) : 0;

        // 🚀 5. جلب تسليمات الواجبات مع ربطها ببيانات الطالب (لنعرف فصل كل طالب)
        const recentAssIds = (recentAssignments || []).map(a => a.id);
        let submissionsData: any[] = [];
        if (recentAssIds.length > 0) {
           const { data: subs } = await supabase
            .from('assignment_submissions')
            .select('assignment_id, student:students(section_id)')
            .in('assignment_id', recentAssIds);
           submissionsData = subs || [];
        }

        // 🚀 6. حساب إحصائيات الواجبات "بدقة" لكل فصل على حدة (إصلاح مشكلة الـ 100/100)
        const assignmentStats = sections.map((section: any) => {
          const secAssignments = (recentAssignments || []).filter((a: any) => 
            a.assignment_sections?.some((as: any) => as.section_id === section.id)
          );
          
          const studentCount = Array.isArray(section.students) ? section.students[0]?.count || 0 : section.students?.count || 0;
          if (secAssignments.length === 0 || studentCount === 0) return null;

          let expectedSubmissions = secAssignments.length * studentCount;
          
          // الفلترة هنا هي السر: نحسب فقط التسليمات التي تخص طلاب هذا الفصل لهذا الواجب
          let actualSubmissions = submissionsData.filter(sub => 
            sub.student?.section_id === section.id && 
            secAssignments.some((a: any) => a.id === sub.assignment_id)
          ).length;

          const percentage = expectedSubmissions > 0 ? Math.min(Math.round((actualSubmissions / expectedSubmissions) * 100), 100) : 0;
          const classObj = Array.isArray(section.classes) ? section.classes[0] : section.classes;
          
          return { 
            title: 'إنجاز الواجبات', 
            className: `${classObj?.name || ''} - ${section.name}`, 
            percentage, 
            submissionCount: actualSubmissions, 
            totalStudents: expectedSubmissions 
          };
        }).filter(Boolean);

        return { 
          teacher, sections, schedule: schedule || [], periods: periods || [], messages: messages || [], assignmentStats,
          recentExams: (recentExams || []).map(e => ({...e, subject_name: e.subject?.name || 'مادة'})),
          recentAssignments: (recentAssignments || []).map(a => ({...a, subject_name: a.subject?.name || 'مادة'})),
          stats: { totalStudents: studentsCount || 0, totalExams: recentExams?.length || 0, totalAssignments: recentAssignments?.length || 0, avgAttendance, absenceRate }
        };
      } catch (error) {
        console.error('Final Dashboard Error:', error);
        return null;
      }
    }, forceRefresh); 
  }, [user]);

  return { fetchTeacherDashboardData, clearDashboardCache };
}
