'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

// حصص افتراضية في حال كانت قاعدة البيانات لا تحتوي على إعدادات أوقات الحصص
const DEFAULT_PERIODS = [
  { id: 'p1', period_number: 1, start_time: '08:00', end_time: '08:45' },
  { id: 'p2', period_number: 2, start_time: '08:45', end_time: '09:30' },
  { id: 'p3', period_number: 3, start_time: '09:30', end_time: '10:15' },
  { id: 'p4', period_number: 4, start_time: '10:30', end_time: '11:15' },
  { id: 'p5', period_number: 5, start_time: '11:15', end_time: '12:00' },
  { id: 'p6', period_number: 6, start_time: '12:00', end_time: '12:45' },
  { id: 'p7', period_number: 7, start_time: '12:45', end_time: '13:30' },
];

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const { fetchStudentSchedule: fetchScheduleData } = useDashboardSystem();

  const fetchStudentSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchScheduleData();
      if (data) {
        setStudentInfo(data.student);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error('Error fetching student schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData]);

  useEffect(() => {
    fetchStudentSchedule();
  }, [fetchStudentSchedule]);

  // استخدام الحصص الافتراضية إذا كانت قاعدة البيانات فارغة لتجنب تشوه الجدول
  const displayPeriods = periods && periods.length > 0 ? periods : DEFAULT_PERIODS;

  // دالة مطابقة آمنة كنصوص
  const getCellData = (dayId: number, periodNum: number) => {
    if (!schedule || schedule.length === 0) return null;
    return schedule.find(s => 
      String(s.day_of_week) === String(dayId) && 
      String(s.period) === String(periodNum)
    );
  };

  const getSubjectName = (cell: any) => {
    if (!cell || !cell.subjects) return 'بدون مادة';
    const subj = Array.isArray(cell.subjects) ? cell.subjects[0] : cell.subjects;
    return subj?.name || 'بدون مادة';
  };

  const getTeacherData = (cell: any) => {
    if (!cell || !cell.teachers) return { name: 'غير محدد', zoom: '' };
    const teacher = Array.isArray(cell.teachers) ? cell.teachers[0] : cell.teachers;
    const user = Array.isArray(teacher?.users) ? teacher.users[0] : teacher?.users;
    return {
      name: user?.full_name || teacher?.users?.full_name || 'غير محدد',
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

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
          {/* تغيير هنا: min-w-max تضمن عدم انضغاط الجدول أبداً */}
          <table className="w-full min-w-max divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50 sticky right-0 z-10">
                  اليوم / الحصة
                </th>
                {displayPeriods.map(period => (
                  <th key={`period-header-${period.id || period.period_number}`} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 min-w-[160px]">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>الحصة {period.period_number}</span>
                      {period.start_time && period.end_time && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          {String(period.start_time).substring(0, 5)} - {String(period.end_time).substring(0, 5)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {DAYS.map((day) => (
                <tr key={`day-row-${day.id}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80 sticky right-0 z-10">
                    {day.name}
                  </td>
                  {displayPeriods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    const subjectName = getSubjectName(cellData);
                    const { name: teacherName, zoom: zoomLink } = getTeacherData(cellData);

                    return (
                      <td key={`cell-${day.id}-${period.period_number}`} className="p-3 border-l border-slate-200 h-36 align-top">
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
                                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 mt-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition-colors"
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


