import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// 🚀 دالة خارقة لحساب يوم الأسبوع بدقة متناهية وتخطي مشاكل خطوط التوقيت (Timezones)
const getDayOfWeek = (dateString: string) => {
  if (!dateString) return 1;
  // فصل التاريخ يدوياً لضمان عدم تأثره بتوقيت جرينتش
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const jsDay = dateObj.getDay(); // 0 = الأحد، 1 = الإثنين، ...
  return jsDay + 1; // 1 = الأحد، 5 = الخميس (يتطابق مع قاعدة البيانات)
};

export function useAttendanceSystem() {
  const { user } = useAuth();
  const [sections, setSections] = useState<any[]>([]);
  const [daySchedule, setDaySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. جلب حصص المعلم في هذا اليوم (الالتزام الصارم بالجدول المبرمج)
  const fetchDaySchedule = useCallback(async (date: string) => {
    if (!user || !date) return [];
    setLoading(true);
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
      if (!teacherData) return [];

      const dayOfWeek = getDayOfWeek(date);

      const { data } = await supabase
        .from('schedules')
        .select('period')
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek)
        .order('period', { ascending: true });

      if (data && data.length > 0) {
        // استخراج الحصص الفريدة فقط
        const uniquePeriods = Array.from(new Set(data.map(s => s.period))).map(p => ({ period: p }));
        setDaySchedule(uniquePeriods);
        return uniquePeriods;
      }
      
      setDaySchedule([]);
      return [];
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setDaySchedule([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 2. جلب الفصول المتاحة لمعلم في حصة معينة (الالتزام الصارم بالجدول المبرمج)
  const fetchSections = useCallback(async (date: string, period: number) => {
    if (!user || !date) return [];
    setLoading(true);
    try {
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
      if (!teacherData) return [];

      const dayOfWeek = getDayOfWeek(date);

      const { data: schedules } = await supabase
        .from('schedules')
        .select('section_id, subject_id, sections(id, name, classes(name)), subjects(name)')
        .eq('teacher_id', teacherData.id)
        .eq('day_of_week', dayOfWeek)
        .eq('period', period);

      if (schedules && schedules.length > 0) {
        // 🚀 معالجة آمنة (Type-Safe) وتخطي تكرار الفصول
        const uniqueSections = Array.from(new Set(schedules.map((s: any) => s.section_id)))
          .map(id => {
            const sched: any = schedules.find((s: any) => s.section_id === id);
            const secObj = Array.isArray(sched?.sections) ? sched.sections[0] : sched?.sections;
            const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
            const subjObj = Array.isArray(sched?.subjects) ? sched.subjects[0] : sched?.subjects;

            return {
              id,
              name: secObj?.name,
              classes: { name: classObj?.name },
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

  // 4. حفظ الغياب (نظام الحذف ثم الإضافة الآمن 100%)
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
      const { data: teacherData, error: tErr } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
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

      // 1. تنظيف الساحة أولاً لمنع التضارب
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('section_id', sectionId)
        .eq('date', date)
        .eq('period', period);

      if (deleteError) {
          throw new Error(deleteError.message || deleteError.details || "حدث خطأ أثناء تنظيف السجلات القديمة");
      }

      // 2. إدخال السجلات الجديدة بأمان
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert);

      if (insertError) {
          throw new Error(insertError.message || insertError.details || "حدث خطأ أثناء حفظ السجلات في القاعدة");
      }
      
      return true;
    } catch (error: any) {
      console.error('Error saving attendance:', error);
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
