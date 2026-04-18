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
      let query = supabase.from('schedules').select('period').eq('day_of_week', dayOfWeek).order('period', { ascending: true });
      if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const uniquePeriods = Array.from(new Set(data.map(s => s.period))).map(p => ({ period: p }));
        setDaySchedule(uniquePeriods);
        return uniquePeriods;
      }
      setDaySchedule([]); return [];
    } catch (error) { console.error('Error fetching schedule:', error); setDaySchedule([]); return []; } finally { setLoading(false); }
  }, [user, currentRole]);

  const fetchSections = useCallback(async (date: string, period: number) => {
    if (!user || !date) return [];
    setLoading(true);
    try {
      const dayOfWeek = getDayOfWeek(date);
      let query = supabase.from('schedules').select('section_id, subject_id, sections(id, name, classes(name)), subjects(name)').eq('day_of_week', dayOfWeek).eq('period', period);
      if (currentRole === 'teacher') query = query.eq('teacher_id', user.id);

      const { data: schedules, error } = await query;
      if (error) throw error;

      if (schedules && schedules.length > 0) {
        const uniqueSectionsMap = new Map();
        schedules.forEach((sched: any) => {
          const secObj = Array.isArray(sched.sections) ? sched.sections[0] : sched.sections;
          const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
          const subjObj = Array.isArray(sched.subjects) ? sched.subjects[0] : sched.subjects;

          const key = `${sched.section_id}-${sched.subject_id}`;
          if (!uniqueSectionsMap.has(key)) {
            uniqueSectionsMap.set(key, { id: sched.section_id, name: secObj?.name, classes: { name: classObj?.name }, subject_id: sched.subject_id, subject_name: subjObj?.name });
          }
        });
        const uniqueSections = Array.from(uniqueSectionsMap.values());
        setSections(uniqueSections); return uniqueSections;
      } 
      setSections([]); return [];
    } catch (error) { console.error('Error fetching sections:', error); return []; } finally { setLoading(false); }
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

  // 🚀 تحديث دالة الحفظ لتقبل عنوان الدرس وتخزنه
  const saveAttendance = useCallback(async (
    sectionId: string, subjectId: string, date: string, period: number, 
    attendanceData: Record<string, AttendanceStatus>, studentsList: any[], lessonTitle: string
  ) => {
    if (!user) throw new Error("جلسة المستخدم غير صالحة");
    if (!lessonTitle || lessonTitle.trim() === '') throw new Error("يجب إدخال عنوان الدرس أولاً!");
    
    try {
      let actualTeacherId = user.id;

      if (currentRole === 'admin' || currentRole === 'management') {
         const { data: sched } = await supabase.from('schedules').select('teacher_id').eq('section_id', sectionId).eq('day_of_week', getDayOfWeek(date)).eq('period', period).maybeSingle();
         if (sched && sched.teacher_id) actualTeacherId = sched.teacher_id;
      }

      let pCount = 0, aCount = 0, lCount = 0, eCount = 0;

      const recordsToInsert = studentsList.reduce((acc: any[], student) => {
        const status = attendanceData[student.id];
        if (status) {
          if (status === 'present') pCount++; else if (status === 'absent') aCount++; else if (status === 'late') lCount++; else if (status === 'excused') eCount++;
          acc.push({
            student_id: student.id, teacher_id: actualTeacherId, section_id: sectionId, subject_id: subjectId || null,
            date: date, period: period, status: status, lesson_title: lessonTitle // 🚀 إدراج عنوان الدرس
          });
        }
        return acc;
      }, []);

      if (recordsToInsert.length === 0) throw new Error("لم تقم بتحديد حالة الحضور لأي طالب!");

      const studentIds = recordsToInsert.map((r: any) => r.student_id);

      const { error: deleteError } = await supabase.from('attendance_records').delete().eq('section_id', sectionId).eq('date', date).eq('period', period).in('student_id', studentIds);
      if (deleteError) throw new Error("فشل في تنظيف السجلات السابقة: " + deleteError.message);

      const { error: insertError } = await supabase.from('attendance_records').insert(recordsToInsert);
      if (insertError) throw new Error("رفضت قاعدة البيانات الحفظ: " + insertError.message);
      
      // 🚀 حفظ اللقطة الإحصائية في الجدول الجديد للإدارة
      await supabase.from('daily_attendance_stats').upsert({
         date, period, section_id: sectionId, subject_id: subjectId || null, teacher_id: actualTeacherId,
         lesson_title: lessonTitle, total_students: studentsList.length, present_count: pCount, absent_count: aCount, late_count: lCount, excused_count: eCount
      }, { onConflict: 'date, period, section_id' });

      return true;
    } catch (error: any) { console.error('Error saving attendance:', error); throw new Error(error.message || 'حدث خطأ مجهول'); }
  }, [user, currentRole]);

  const fetchStudentAttendance = useCallback(async () => { return null; }, []);

  return { sections, daySchedule, loading, fetchDaySchedule, fetchSections, fetchStudentsAndAttendance, saveAttendance, fetchStudentAttendance };
}
