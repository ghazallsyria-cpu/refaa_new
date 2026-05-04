import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const getDayOfWeek = (dateString: string) => {
  if (!dateString) return 1;
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getDay() + 1; 
};

// دالة مساعدة لمعرفة النظام الفعال حالياً
const getActiveSystem = async () => {
  try {
    const { data } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    return data?.active_schedule_system || 'manual';
  } catch {
    return 'manual';
  }
};

export function useAttendanceSystem() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const [sections, setSections] = useState<any[]>([]);
  const [daySchedule, setDaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDaySchedule = useCallback(async (date: string) => {
    if (!user || !date) return [];
    setLoading(true);
    try {
      const dayOfWeek = getDayOfWeek(date);
      const activeSystem = await getActiveSystem();
      let uniquePeriods: any[] = [];

      if (activeSystem === 'auto') {
        // 🚀 جلب الخطة الأحدث المعتمدة لتجنب التداخل
        const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
        
        if (planData) {
          let query = supabase.from('auto_schedules')
            .select('period_number')
            .eq('plan_id', planData.id)
            .eq('day_of_week', dayOfWeek)
            .order('period_number', { ascending: true });
            
          if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            uniquePeriods = Array.from(new Set(data.map(s => s.period_number))).map(p => ({ period: p }));
          }
        }
      } else {
        // النظام القديم
        let query = supabase.from('schedules').select('period').eq('day_of_week', dayOfWeek).order('period', { ascending: true });
        if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          uniquePeriods = Array.from(new Set(data.map(s => s.period))).map(p => ({ period: p }));
        }
      }

      setDaySchedule(uniquePeriods);
      return uniquePeriods;
    } catch (error) { 
      console.error('Error fetching schedule:', error); 
      setDaySchedule([]); 
      return []; 
    } finally { 
      setLoading(false); 
    }
  }, [user, currentRole]);

  const fetchSections = useCallback(async (date: string, period: number) => {
    if (!user || !date) return [];
    setLoading(true);
    try {
      const dayOfWeek = getDayOfWeek(date);
      const activeSystem = await getActiveSystem();
      const uniqueSectionsMap = new Map();

      if (activeSystem === 'auto') {
        // 🚀 جلب الخطة الأحدث المعتمدة
        const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
        
        if (planData) {
          // نجلب المعرفات فقط لأن الأعمدة النصية غير موجودة في قاعدة بيانات auto_schedules
          let query = supabase.from('auto_schedules')
            .select('section_id, subject_id')
            .eq('plan_id', planData.id)
            .eq('day_of_week', dayOfWeek)
            .eq('period_number', period);
            
          if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

          const { data: autoSchedules, error } = await query;
          if (error) throw error;

          if (autoSchedules && autoSchedules.length > 0) {
            // جلب الأسماء الحقيقية للفصول والمواد بضربة واحدة سريعة (Manual Join)
            const sectionIds = Array.from(new Set(autoSchedules.map(s => s.section_id)));
            const subjectIds = Array.from(new Set(autoSchedules.map(s => s.subject_id)));

            const [sectionsRes, subjectsRes] = await Promise.all([
              supabase.from('sections').select('id, name, classes(name)').in('id', sectionIds),
              supabase.from('subjects').select('id, name').in('id', subjectIds)
            ]);

            autoSchedules.forEach((sched: any) => {
              const secData = sectionsRes.data?.find((s: any) => s.id === sched.section_id);
              const classObj = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
              const subjData = subjectsRes.data?.find((s: any) => s.id === sched.subject_id);

              const key = `${sched.section_id}-${sched.subject_id}`;
              if (!uniqueSectionsMap.has(key)) {
                uniqueSectionsMap.set(key, { 
                  id: sched.section_id, 
                  name: secData?.name || 'شعبة غير محددة', 
                  classes: { name: classObj?.name || 'صف' }, 
                  subject_id: sched.subject_id, 
                  subject_name: subjData?.name || 'مادة غير محددة' 
                });
              }
            });
          }
        }
      } else {
        // النظام القديم
        let query = supabase.from('schedules').select('section_id, subject_id, sections(id, name, classes(name)), subjects(name)').eq('day_of_week', dayOfWeek).eq('period', period);
        if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

        const { data: schedules, error } = await query;
        if (error) throw error;

        if (schedules && schedules.length > 0) {
          schedules.forEach((sched: any) => {
            const secObj = Array.isArray(sched.sections) ? sched.sections[0] : sched.sections;
            const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
            const subjObj = Array.isArray(sched.subjects) ? sched.subjects[0] : sched.subjects;

            const key = `${sched.section_id}-${sched.subject_id}`;
            if (!uniqueSectionsMap.has(key)) {
              uniqueSectionsMap.set(key, { id: sched.section_id, name: secObj?.name, classes: { name: classObj?.name }, subject_id: sched.subject_id, subject_name: subjObj?.name });
            }
          });
        }
      }

      const uniqueSections = Array.from(uniqueSectionsMap.values());
      setSections(uniqueSections); 
      return uniqueSections;
    } catch (error) { 
      console.error('Error fetching sections:', error); 
      setSections([]);
      return []; 
    } finally { 
      setLoading(false); 
    }
  }, [user, currentRole]);

  const fetchStudentsAndAttendance = useCallback(async (sectionId: string, subjectId: string, date: string, period: number) => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase.from('students').select('id, users(full_name, avatar_url)').eq('section_id', sectionId);
      const { data: attendanceData } = await supabase.from('attendance_records').select('student_id, status, lesson_title').eq('date', date).eq('period', period).eq('section_id', sectionId);

      const attendanceRecord: Record<string, AttendanceStatus> = {};
      const stats = { present: 0, absent: 0, late: 0, excused: 0 };
      let savedLessonTitle = '';

      if (attendanceData) {
        attendanceData.forEach((record: any) => {
          attendanceRecord[record.student_id] = record.status as AttendanceStatus;
          stats[record.status as keyof typeof stats]++;
          if (record.lesson_title) savedLessonTitle = record.lesson_title;
        });
      }

      return { students: studentsData || [], attendance: attendanceRecord, stats, savedLessonTitle };
    } catch (error) { console.error('Error fetching students:', error); return null; } finally { setLoading(false); }
  }, []);

  const saveAttendance = useCallback(async (
    sectionId: string, subjectId: string, date: string, period: number, 
    attendanceData: Record<string, AttendanceStatus>, studentsList: any[], lessonTitle: string
  ) => {
    if (!user) throw new Error("جلسة المستخدم غير صالحة");
    if (!lessonTitle || lessonTitle.trim() === '') throw new Error("يجب إدخال عنوان الدرس أولاً!");
    
    try {
      let actualTeacherId = user.id;

      if (currentRole === 'admin' || currentRole === 'management') {
         const activeSystem = await getActiveSystem();
         
         if (activeSystem === 'auto') {
             // 🚀 جلب معرف المعلم من الخطة الحديثة للإدارة
             const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
             if (planData) {
               const { data: sched } = await supabase.from('auto_schedules').select('teacher_id').eq('plan_id', planData.id).eq('section_id', sectionId).eq('day_of_week', getDayOfWeek(date)).eq('period_number', period).maybeSingle();
               if (sched && sched.teacher_id) actualTeacherId = sched.teacher_id;
             }
         } else {
             const { data: sched } = await supabase.from('schedules').select('teacher_id').eq('section_id', sectionId).eq('day_of_week', getDayOfWeek(date)).eq('period', period).maybeSingle();
             if (sched && sched.teacher_id) actualTeacherId = sched.teacher_id;
         }
      }

      let pCount = 0, aCount = 0, lCount = 0, eCount = 0;

      // 🚀 البصمة الإلكترونية: نسجل بصمة ووقت المعلم أو الإداري الذي أخذ الغياب الفعلي.
      const electronicSignature = {
          submitted_by: user.id, // معرّف الحساب الفعلي الذي أرسل الطلب
          role: currentRole, // دوره الفعلي (معلم، إداري)
          timestamp: new Date().toISOString() // بصمة الوقت الدقيقة
      };

      const recordsToUpsert = studentsList.reduce((acc: any[], student) => {
        const status = attendanceData[student.id];
        if (status) {
          if (status === 'present') pCount++; else if (status === 'absent') aCount++; else if (status === 'late') lCount++; else if (status === 'excused') eCount++;
          acc.push({
            student_id: student.id, teacher_id: actualTeacherId, section_id: sectionId, subject_id: subjectId || null,
            date: date, period: period, status: status, lesson_title: lessonTitle
          });
        }
        return acc;
      }, []);

      if (recordsToUpsert.length === 0) throw new Error("لم تقم بتحديد حالة الحضور لأي طالب!");

      // 🚀 الاعتماد على UPSERT للغياب
      const { error: upsertError } = await supabase.from('attendance_records').upsert(recordsToUpsert, {
        onConflict: 'student_id, date, period', 
        ignoreDuplicates: false 
      });
      
      if (upsertError) throw new Error("رفضت قاعدة البيانات الحفظ: " + upsertError.message);
      
      // 🚀 إضافة بصمة المعلم في إحصائيات اليوم (signature)
      // إذا كان لديك عمود إضافي مخصص بالـ signature في `daily_attendance_stats` يمكنك إرساله.
      await supabase.from('daily_attendance_stats').upsert({
         date, period, section_id: sectionId, subject_id: subjectId || null, teacher_id: actualTeacherId,
         lesson_title: lessonTitle, total_students: studentsList.length, present_count: pCount, absent_count: aCount, late_count: lCount, excused_count: eCount,
         // إرسال بصمة التوثيق للوحة تحكم الإدارة (سيتم تجاهلها بصمت إذا لم يكن العمود موجودًا)
         metadata: electronicSignature 
      }, { onConflict: 'date, period, section_id' });

      return true;
    } catch (error: any) { console.error('Error saving attendance:', error); throw new Error(error.message || 'حدث خطأ مجهول'); }
  }, [user, currentRole]);

  const fetchStudentAttendance = useCallback(async () => { return null; }, []);

  return { sections, daySchedule, loading, fetchDaySchedule, fetchSections, fetchStudentsAndAttendance, saveAttendance, fetchStudentAttendance };
}
