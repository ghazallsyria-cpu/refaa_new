'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion'; // 🚀 تم إصلاح مسار الاستيراد
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale'; // 🚀 استيراد اللغة العربية لتنسيق الوقت
import Link from 'next/link';

// 🚀 استخدام المسارات النسبية لتجنب أخطاء البناء
import { useDashboardSystem } from '../../../hooks/useDashboardSystem';
import { useAuth } from '../../../context/auth-context';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function StudentSchedulePage() {
  const { authRole, isChecking } = useAuth() as any; // 🚀 تفعيل الحماية

  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { fetchStudentSchedule: fetchScheduleData } = useDashboardSystem();

  const fetchStudentSchedule = useCallback(async () => {
    // 🚀 لا نطلب البيانات إلا بعد التأكد من أن المستخدم طالب
    if (authRole !== 'student') return;

    setLoading(true);
    try {
      const data = await fetchScheduleData();
      if (data) {
        setStudentInfo(data.student);
        setSchedule(data.schedule);
        setPeriods(data.periods);
      }
    } catch (error) {
      console.error('Error fetching student schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData, authRole]);

  useEffect(() => {
    if (!isChecking) {
      fetchStudentSchedule();
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [fetchStudentSchedule, isChecking]);

  const getCellData = useCallback((day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  }, [schedule]);

  const isCurrentClass = useCallback((day: number, period: any) => {
    if (!period?.start_time || !period?.end_time) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1; // 1 is Sunday
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const [endH, endM] = period.end_time.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endH, endM, 0);

    return now >= startTime && now <= endTime;
  }, [currentTime]);

  const isNextClass = useCallback((day: number, period: any) => {
    if (!period?.start_time) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1;
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0);

    // Next class is the one starting after now, but within the next 2 hours
    return startTime > now && (startTime.getTime() - now.getTime()) < 120 * 60000;
  }, [currentTime]);

  // 🚀 شاشة التحميل وحماية الوصول (Security Guard)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚀 منع المتطفلين من رؤية الجدول
  if (authRole !== 'student') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة للطلاب فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل الجدول الأسبوعي...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6"
      dir="rtl"
    >
      {/* 🚀 زر العودة */}
      <div className="mb-2">
        <Link href="/dashboard/student" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-200 transition-all w-fit group">
          <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الطالب
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-inner">
            <Calendar className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">جدولي الدراسي الأسبوعي</h1>
            <p className="text-slate-500 mt-1 font-bold">
              عرض الحصص الدراسية لصفك: <span className="text-indigo-600 font-black">{studentInfo?.sections?.classes?.name} - {studentInfo?.sections?.name}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">الوقت الحالي</div>
            <div className="text-lg font-black text-slate-700" dir="ltr">{format(currentTime, 'hh:mm a', { locale: arSA })}</div>
          </div>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300 shadow-sm">
           <div className="mx-auto h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
             <AlertCircle className="h-10 w-10 text-slate-300" />
           </div>
           <h3 className="text-2xl font-black text-slate-800 mb-2">الجدول غير متاح</h3>
           <p className="text-slate-500 font-bold">لم تقم الإدارة برفع أوقات الحصص أو إسناد جدول لفصلك حتى الآن.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-6 px-4 text-center text-sm font-black text-slate-500 uppercase tracking-widest border-l border-slate-200 w-32 bg-slate-100/50">اليوم / الحصة</th>
                  {periods.map(period => (
                    <th key={period.id} className="py-5 px-4 text-center border-l border-slate-200 w-44">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-indigo-600 font-black text-sm">الحصة {period.period_number}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm" dir="ltr">
                          {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {DAYS.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-6 px-4 text-sm font-black text-slate-700 border-l border-slate-100 text-center bg-slate-50/50">{day.name}</td>
                    {periods.map(period => {
                      const cellData = getCellData(day.id, period.period_number);
                      const isCurrent = isCurrentClass(day.id, period);
                      const isNext = isNextClass(day.id, period);

                      return (
                        <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-100 h-36 align-top min-w-[170px]">
                          {cellData ? (
                            <motion.div 
                              whileHover={{ scale: 1.02 }}
                              className={`h-full flex flex-col justify-between rounded-2xl p-4 transition-all duration-300 shadow-sm relative overflow-hidden ${
                                isCurrent 
                                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent ring-4 ring-indigo-100 shadow-lg shadow-indigo-500/30' 
                                  : isNext
                                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                    : 'bg-slate-50/50 border border-slate-200 text-slate-900 hover:border-indigo-200 hover:bg-white hover:shadow-md'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className={`flex items-center gap-1.5 mb-1.5 ${isCurrent ? 'text-indigo-100' : 'text-slate-400'}`}>
                                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">المادة</span>
                                </div>
                                <div className={`font-black text-sm leading-snug truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                                  {cellData.subjects?.name}
                                </div>
                              </div>
                              <div className={`mt-3 pt-3 border-t flex flex-col gap-1.5 ${isCurrent ? 'border-white/20' : 'border-slate-200'}`}>
                                <div className={`flex items-center gap-1.5 ${isCurrent ? 'text-indigo-100' : 'text-slate-600'}`}>
                                  <User className="h-3.5 w-3.5 shrink-0" />
                                  <div className="text-[11px] font-bold truncate">
                                    أ. {cellData.teachers?.users?.full_name || 'غير محدد'}
                                  </div>
                                </div>
                                {isCurrent && (
                                  <div className="mt-1 inline-flex items-center justify-center py-1 px-2 bg-white/20 rounded-lg text-[10px] font-black text-white backdrop-blur-sm shadow-inner">
                                    <span className="relative flex h-2 w-2 ml-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    الحصة جارية الآن
                                  </div>
                                )}
                                {isNext && !isCurrent && (
                                  <div className="mt-1 inline-flex items-center justify-center py-1 px-2 bg-amber-100/80 rounded-lg text-[10px] font-black text-amber-700 border border-amber-200">
                                    الحصة القادمة
                                  </div>
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

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 mt-6">
        <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 text-lg">تنبيه الحصص</h4>
          <p className="text-sm text-amber-700 font-bold mt-1">يرجى الالتزام بمواعيد الحصص الدراسية والتواجد في الفصل قبل بدء الحصة بـ 5 دقائق تجنباً لتسجيلك كمتأخر أو غائب.</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </motion.div>
  );
}
