'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, Video, GraduationCap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardSystem, type StudentScheduleData } from '@/hooks/useDashboardSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const { fetchStudentSchedule: fetchScheduleData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStudentSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // استخدام : any هنا هو الحل السحري لتجاوز أخطاء Netlify في استنتاج الأنواع
      const data: any = await fetchScheduleData();
      
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
    if (mounted) {
      fetchStudentSchedule();
    }
  }, [fetchStudentSchedule, mounted]);

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  // دالة لاستخراج اسم المعلم بشكل آمن من الجداول المتداخلة
  const getTeacherName = (cellData: any) => {
    const teacher = cellData?.teachers;
    if (!teacher) return 'معلم المادة';
    
    const users = teacher.users;
    if (Array.isArray(users)) {
      return users[0]?.full_name || 'معلم المادة';
    }
    return users?.full_name || 'معلم المادة';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse">جاري تحميل جدولك...</p>
        </div>
      </div>
    );
  }

  const className = studentInfo?.sections?.classes?.name || studentInfo?.section?.classes?.name || 'غير محدد';
  const sectionName = studentInfo?.sections?.name || studentInfo?.section?.name || 'غير محدد';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4"
      dir="rtl"
    >
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">جدولي الدراسي الأسبوعي</h1>
            <p className="text-slate-500 mt-2 font-bold flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-500" />
              <span>{className}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-indigo-600">{sectionName}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">عدد الحصص</p>
            <p className="text-xl font-black text-slate-900">{schedule.length}</p>
          </div>
        </div>
      </div>

      {/* Schedule Table Container */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50/80 backdrop-blur-md">
              <tr>
                <th className="py-8 px-6 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l border-slate-200 w-32">اليوم / الحصة</th>
                {periods.map(period => (
                  <th key={period.id} className="py-6 px-4 text-center border-l border-slate-100 last:border-l-0">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Clock size={16} />
                      </div>
                      <span className="text-sm font-black text-slate-900">الحصة {period.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm" dir="ltr">
                        {period.start_time?.substring(0, 5)} - {period.end_time?.substring(0, 5)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="py-8 px-6 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/50 group-hover:bg-indigo-50/50 transition-colors">
                    {day.name}
                  </td>
                  {periods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-100 last:border-l-0 h-44 align-top min-w-[180px]">
                        <AnimatePresence mode="wait">
                          {cellData ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ y: -5 }}
                              className="h-full flex flex-col justify-between bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-indigo-600">
                                    <BookOpen size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-wider">مادة دراسية</span>
                                  </div>
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <div className="font-black text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                                  {cellData.subjects?.name}
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                    <User size={14} />
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-600 truncate max-w-[100px]">
                                    {getTeacherName(cellData)}
                                  </div>
                                </div>
                                
                                {cellData.teachers?.zoom_link && (
                                  <a 
                                    href={cellData.teachers.zoom_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                  >
                                    <Video size={14} />
                                    <span>دخول الحصة الحية</span>
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center opacity-10">
                              <BookOpen size={24} className="text-slate-300" />
                            </div>
                          )}
                        </AnimatePresence>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Alert */}
      <div className="bg-amber-50 border border-amber-100 rounded-[30px] p-6 flex items-start gap-5 shadow-sm">
        <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
          <Info className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 text-lg">تنبيه الحضور والالتزام</h4>
          <p className="text-amber-700 font-medium mt-1 leading-relaxed">
            يتم تحديث الجدول الدراسي بشكل دوري من قبل الإدارة. يرجى التأكد من التواجد داخل الفصل الافتراضي قبل بدء الحصة بـ 5 دقائق على الأقل لتفادي تسجيل التأخير.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

