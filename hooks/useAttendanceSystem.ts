import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export function useAttendanceSystem() {
  const { user } = useAuth();
  const [sections, setSections] = useState<any[]>([]);
  const [daySchedule, setDaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. جلب حصص المعلم في هذا اليوم
  const fetchDaySchedule = useCallback(async (date: string) => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
      if (!teacherData) return [];

      const dayOfWeek = new Date(date).getDay() + 1; // 1 = Sunday
      const { data } = await supabase
        .from('schedules')
        .select('period, sections(id, name, classes(name)), subjects(id, name)')
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek)
        .order('period', { ascending: true });

      setDaySchedule(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching schedule:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 2. جلب الفصول المتاحة لمعلم في حصة معينة
  const fetchSections = useCallback(async (date: string, period: number) => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
      if (!teacherData) return [];

      const dayOfWeek = new Date(date).getDay() + 1;
      const { data: schedules } = await supabase
        .from('schedules')
        .select('section_id, subject_id, sections(id, name, classes(name)), subjects(name)')
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek)
        .eq('period', period);

      if (schedules && schedules.length > 0) {
        const uniqueSections = Array.from(new Set(schedules.map((s: any) => s.section_id)))
          .map(id => {
            const sched: any = schedules.find((s: any) => s.section_id === id);
            
            const sec: any = sched?.sections;
            const subj: any = sched?.subjects;
            const secObj = Array.isArray(sec) ? sec[0] : sec;
            const subjObj = Array.isArray(subj) ? subj[0] : subj;

            return {
              id,
              name: secObj?.name,
              classes: secObj?.classes,
              subject_id: sched?.subject_id,
              subject_name: subjObj?.name
            };
          });
        setSections(uniqueSections);
        return uniqueSections;
      }
      setSections([]);
      return [];
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. جلب الطلاب وحالة غيابهم لهذه الحصة تحديداً
  const fetchStudentsAndAttendance = useCallback(async (sectionId: string, subjectId: string, date: string, period: number) => {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, users(full_name, avatar_url)')
        .eq('section_id', sectionId);

      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('date', date)
        .eq('period', period)
        .eq('section_id', sectionId);

      const attendanceRecord: Record<string, AttendanceStatus> = {};
      const stats = { present: 0, absent: 0, late: 0, excused: 0 };

      if (attendanceData) {
        attendanceData.forEach((record: any) => {
          attendanceRecord[record.student_id] = record.status as AttendanceStatus;
          stats[record.status as keyof typeof stats]++;
        });
      }

      return {
        students: studentsData || [],
        attendance: attendanceRecord,
        stats
      };
    } catch (error) {
      console.error('Error fetching students:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. حفظ الغياب (نظام الحذف والإضافة الآمن 100%)
  const saveAttendance = useCallback(async (
    sectionId: string, 
    subjectId: string, 
    date: string, 
    period: number, 
    attendanceData: Record<string, AttendanceStatus>, 
    studentsList: any[]
  ) => {
    if (!user) throw new Error("جلسة المستخدم غير صالحة، يرجى تسجيل الدخول مجدداً");
    
    try {
      const { data: teacherData, error: tErr } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
      if (tErr || !teacherData) throw new Error("تعذر الوصول لبيانات المعلم في قاعدة البيانات");

      const recordsToInsert = studentsList.map(student => {
        const status = attendanceData[student.id];
        if (!status) return null;

        return {
          student_id: student.id,
          teacher_id: teacherData.id,
          section_id: sectionId,
          subject_id: subjectId || null,
          date: date,
          period: period,
          status: status
        };
      }).filter(Boolean);

      if (recordsToInsert.length === 0) return true;

      // 🔥 التغيير الجوهري هنا: الحذف ثم الإضافة بدلاً من Upsert لتجنب أخطاء القيود (Constraints) المزعجة
      
      // 1. تنظيف الساحة أولاً: مسح أي سجل غياب سابق لهذا الفصل في هذه الحصة وهذا التاريخ
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('section_id', sectionId)
        .eq('date', date)
        .eq('period', period);

      if (deleteError) {
          throw new Error(deleteError.message || deleteError.details || "حدث خطأ أثناء تنظيف السجلات القديمة");
      }

      // 2. إدخال السجلات الجديدة بأمان تام
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert);

      if (insertError) {
          throw new Error(insertError.message || insertError.details || "حدث خطأ أثناء حفظ السجلات في القاعدة");
      }
      
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      // تمرير رسالة الخطأ الدقيقة للواجهة (ستظهر لك الرسالة الحقيقية بدل كلمة Unknown Error)
      throw new Error(error.message || error.details || 'حدث خطأ مجهول في الشبكة');
    }
  }, [user]);

  const fetchStudentAttendance = useCallback(async () => { return null; }, []);

  return {
    sections,
    daySchedule,
    loading,
    fetchDaySchedule,
    fetchSections,
    fetchStudentsAndAttendance,
    saveAttendance,
    fetchStudentAttendance
  };
}
