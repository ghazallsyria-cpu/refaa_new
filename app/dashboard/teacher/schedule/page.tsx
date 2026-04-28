/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, BookOpen, Users, Zap, ArrowRight, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { useAuth } from '@/context/auth-context';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function TeacherSchedulePage() {
  const { authRole, isChecking } = useAuth() as any; 

  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { fetchTeacherSchedule: fetchScheduleData } = useDashboardSystem();

  // 🚀 الحارس المنیع (Guard) لمنع إرهاق السيرفر بالطلبات المتكررة
  const isFetchedRef = useRef(false);

  const fetchTeacherSchedule = useCallback(async () => {
    if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') return;
    if (isFetchedRef.current) return; // إغلاق الباب بعد أول دخول

    isFetchedRef.current = true;
    setLoading(true);
    try {
      const data = await fetchScheduleData();
      if (data) {
        setSchedule(data.schedule);
        setPeriods(data.periods);
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      isFetchedRef.current = false; // افتح الباب مجدداً في حال الفشل
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData, authRole]);

  useEffect(() => {
    if (!isChecking) {
      fetchTeacherSchedule();
    }
  }, [fetchTeacherSchedule, isChecking]);

  // 🚀 ساعة تحديث الوقت منفصلة تماماً لحماية الريندر
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // 🚀 شاشات الحماية والتحميل (الثيم الملكي)
  if (isChecking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)] bg-[#131836]/60 backdrop-blur-md">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل الجدول الأسبوعي...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6 relative z-10 min-h-[100dvh] bg-[#090b14]"
      dir="rtl"
    >
      {/* 🚀 زر العودة المضيء */}
      <div className="mb-2">
        <Link href="/dashboard/teacher" className="flex items-center gap-2 text-slate-400 hover:text-amber-400 font-bold bg-[#131836]/60 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl transition-all w-fit group text-sm sm:text-base active:scale-95 shadow-sm hover:border-amber-500/30">
          <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة المعلم
        </Link>
      </div>

      {/* 🚀 هيدر الصفحة (البانر الملكي) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
        <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 sm:p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-inner shrink-0">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">جدولي الدراسي الأسبوعي</h1>
            <p className="text-slate-400 mt-1 font-bold text-xs sm:text-sm">عرض كامل للحصص الدراسية المسندة إليك خلال الأسبوع</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#02040a]/60 p-2 sm:p-3 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto relative z-10">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0 border border-amber-300/50">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] text-amber-500/80 font-black uppercase tracking-widest">الوقت الحالي</div>
            <div className="text-base sm:text-lg font-black text-white drop-shadow-sm" dir="ltr">{format(currentTime, 'hh:mm a', { locale: arSA })}</div>
          </div>
        </div>
      </div>

      {/* 🚀 حالة عدم وجود جدول */}
      {periods.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-[#131836]/40 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4">
           <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-[#02040a]/80 rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 border border-white/5 shadow-inner">
             <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500" />
           </div>
           <h3 className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-sm">الجدول غير متاح</h3>
           <p className="text-slate-400 font-bold text-sm sm:text-base max-w-sm mx-auto">لم تقم الإدارة برفع أوقات الحصص أو إسناد جدول لك حتى الآن.</p>
        </div>
      ) : (
        /* 🚀 الجدول (Timetable) */
        <div className="bg-[#131836]/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
              <thead className="bg-[#02040a]/80 border-b border-white/10">
                <tr>
                  <th className="py-5 sm:py-6 px-4 text-center text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest border-l border-white/5 w-24 sm:w-32 bg-[#0f1423]/50">اليوم / الحصة</th>
                  {periods.map(period => (
                    <th key={period.id} className="py-4 sm:py-5 px-3 sm:px-4 text-center border-l border-white/5 w-36 sm:w-44 bg-[#02040a]/40">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-amber-400 font-black text-xs sm:text-sm drop-shadow-sm">الحصة {period.period_number}</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-[#0f1423] px-2.5 py-1 rounded-md border border-white/5 shadow-inner" dir="ltr">
                          {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {DAYS.map((day) => (
                  <tr key={day.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 sm:py-6 px-3 sm:px-4 text-xs sm:text-sm font-black text-slate-300 border-l border-white/5 text-center bg-[#0f1423]/30">{day.name}</td>
                    {periods.map(period => {
                      const cellData = getCellData(day.id, period.period_number);
                      const isCurrent = isCurrentClass(day.id, period);
                      const isNext = isNextClass(day.id, period);

                      return (
                        <td key={`${day.id}-${period.id}`} className="p-2 sm:p-3 border-l border-white/5 h-32 sm:h-36 align-top min-w-[150px] sm:min-w-[170px]">
                          {cellData ? (
                            <motion.div 
                              whileHover={{ scale: 1.02 }}
                              className={`h-full flex flex-col justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 shadow-inner relative overflow-hidden border ${
                                isCurrent 
                                  ? 'bg-[#0f1423]/90 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50' 
                                  : isNext
                                    ? 'bg-blue-500/5 border-blue-500/30'
                                    : 'bg-[#02040a]/60 border-white/5 hover:border-amber-500/30 hover:bg-[#0f1423]'
                              }`}
                            >
                              {isCurrent && (
                                <div className="absolute top-0 right-0 p-1 sm:p-1.5 bg-amber-500/20 rounded-bl-xl backdrop-blur-sm border-b border-l border-amber-500/30">
                                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400 animate-pulse" />
                                </div>
                              )}
                              <div className="space-y-1 relative z-10">
                                <div className={`flex items-center gap-1.5 mb-1.5 ${isCurrent ? 'text-amber-200' : isNext ? 'text-blue-300' : 'text-slate-400'}`}>
                                  <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-80" />
                                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">المادة</span>
                                </div>
                                <div className={`font-black text-xs sm:text-sm leading-snug truncate drop-shadow-sm ${isCurrent ? 'text-amber-400' : isNext ? 'text-blue-400' : 'text-slate-200'}`}>
                                  {cellData.subjects?.name}
                                </div>
                              </div>
                              <div className={`mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex flex-col gap-1.5 sm:gap-2 relative z-10 ${isCurrent ? 'border-amber-500/20' : isNext ? 'border-blue-500/20' : 'border-white/5'}`}>
                                <div className={`flex items-center gap-1.5 ${isCurrent ? 'text-amber-100/70' : isNext ? 'text-blue-200/70' : 'text-slate-500'}`}>
                                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                  <div className="text-[10px] sm:text-[11px] font-bold truncate">
                                    {cellData.sections?.classes?.name} - {cellData.sections?.name}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {isCurrent && (
                                    <div className="mt-0.5 inline-flex items-center justify-center py-0.5 sm:py-1 px-1.5 sm:px-2 bg-amber-500/20 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black text-amber-400 shadow-inner border border-amber-500/30 w-fit">
                                      <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 ml-1 sm:ml-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-amber-500"></span>
                                      </span>
                                      جارية الآن
                                    </div>
                                  )}
                                  {isNext && !isCurrent && (
                                    <div className="mt-0.5 inline-flex items-center justify-center py-0.5 sm:py-1 px-1.5 sm:px-2 bg-blue-500/10 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black text-blue-400 border border-blue-500/20 shadow-inner w-fit">
                                      الحصة القادمة
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-600 bg-[#02040a]/40 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 border-dashed shadow-inner">
                              <span className="text-lg sm:text-xl font-black opacity-30">-</span>
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
      
      {/* 🚀 ستايل الـ Scrollbar المطابق للثيم الداكن الفخم */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
      `}} />
    </motion.div>
  );
}
