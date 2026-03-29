'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // جلب البيانات مباشرة بنفس طريقة الداشبورد الناجحة
  const fetchDirectSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. جلب بيانات الطالب وشعبته
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id, sections(name, classes(name))')
        .eq('id', user.id)
        .single();

      if (studentError) throw studentError;
      if (!student || !student.section_id) {
        setLoading(false);
        return;
      }

      setStudentInfo(student);

      // 2. جلب جدول الحصص بناءً على الشعبة (باستخدام الاستعلام الصحيح)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('id, day_of_week, period, start_time, end_time, subjects(name), teachers(zoom_link, users(full_name))')
        .eq('section_id', student.section_id)
        .order('day_of_week')
        .order('period');

      if (scheduleError) throw scheduleError;
      
      setSchedule(scheduleData || []);

    } catch (error) {
      console.error('Error fetching direct schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDirectSchedule();
  }, [fetchDirectSchedule]);

  // تحديد عدد أعمدة الحصص (7 افتراضي أو أقصى حصة مسجلة)
  const maxPeriod = schedule.reduce((max, s) => Math.max(max, Number(s.period) || 0), 7);
  const periodColumns = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // استخراج أوقات الحصة
  const getPeriodTime = (periodNum: number) => {
    const session = schedule.find(s => Number(s.period) === periodNum && s.start_time);
    if (session && session.start_time && session.end_time) {
      return `${String(session.start_time).substring(0, 5)} - ${String(session.end_time).substring(0, 5)}`;
    }
    return null;
  };

  // مطابقة الخلية (اليوم + الحصة)
  const getCellData = (dayId: number, periodNum: number) => {
    return schedule.find(s => Number(s.day_of_week) === dayId && Number(s.period) === periodNum);
  };

  // استخراج اسم المادة
  const getSubjectName = (cell: any) => {
    if (!cell || !cell.subjects) return 'بدون مادة';
    const subj = Array.isArray(cell.subjects) ? cell.subjects[0] : cell.subjects;
    return subj?.name || 'بدون مادة';
  };

  // استخراج بيانات المعلم والزووم
  const getTeacherData = (cell: any) => {
    if (!cell || !cell.teachers) return { name: 'غير محدد', zoom: '' };
    const teacher = Array.isArray(cell.teachers) ? cell.teachers[0] : cell.teachers;
    const userObj = Array.isArray(teacher?.users) ? teacher.users[0] : teacher?.users;
    return {
      name: userObj?.full_name || 'غير محدد',
      zoom: teacher?.zoom_link || ''
    };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const sectionData = Array.isArray(studentInfo?.sections) ? studentInfo.sections[0] : studentInfo?.sections;
  const classData = Array.isArray(sectionData?.classes) ? sectionData.classes[0] : sectionData?.classes;
  const sectionName = sectionData?.name || 'غير محدد';
  const className = classData?.name || 'غير محدد';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto w-full"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
            جدولي الدراسي الأسبوعي
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            عرض الحصص الدراسية لصفك: <span className="text-indigo-600 font-bold">{className} - {sectionName}</span>
          </p>
        </div>
      </div>

      {schedule.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">لم يتم إضافة جدول دراسي بعد</h3>
          <p className="text-slate-500 mt-2">لا توجد حصص مرتبطة بشعبتك الدراسية في الوقت الحالي.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden w-full relative">
          <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
            <table className="w-full min-w-max divide-y divide-slate-200 border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50 sticky right-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    اليوم / الحصة
                  </th>
                  {periodColumns.map(periodNum => {
                    const timeString = getPeriodTime(periodNum);
                    return (
                      <th key={`header-${periodNum}`} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 min-w-[160px]">
                        <div className="flex flex-col items-center gap-1">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          <span>الحصة {periodNum}</span>
                          {timeString && (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {timeString}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {DAYS.map((day) => (
                  <tr key={`day-${day.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/90 sticky right-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {day.name}
                    </td>
                    {periodColumns.map(periodNum => {
                      const cellData = getCellData(day.id, periodNum);
                      const subjectName = getSubjectName(cellData);
                      const { name: teacherName, zoom: zoomLink } = getTeacherData(cellData);

                      return (
                        <td key={`cell-${day.id}-${periodNum}`} className="p-3 border-l border-slate-200 h-36 align-top bg-white">
                          {cellData ? (
                            <motion.div 
                              whileHover={{ scale: 1.02 }}
                              className="h-full flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-4 border border-indigo-100 shadow-sm"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span className="text-[11px] font-black uppercase tracking-wider">مادة</span>
                                </div>
                                <div className="font-black text-slate-900 text-base leading-tight break-words">{subjectName}</div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-indigo-100/50 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <User className="h-3.5 w-3.5" />
                                  <div className="text-xs font-bold truncate" title={teacherName}>{teacherName}</div>
                                </div>
                                {zoomLink && zoomLink.trim() !== '' && (
                                  <a 
                                    href={zoomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 mt-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                  >
                                    <span>دخول الحصة</span>
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-200">
                              <div className="h-1 w-6 bg-slate-100 rounded-full" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">تنبيه الحصص</h4>
          <p className="text-sm text-amber-700 font-medium mt-0.5">يرجى الالتزام بمواعيد الحصص الدراسية والتواجد في الفصل قبل بدء الحصة بـ 5 دقائق.</p>
        </div>
      </div>
    </motion.div>
  );
}


