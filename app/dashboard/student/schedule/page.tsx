/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, BookOpen, User, ArrowRight, Loader2, AlertCircle, Sparkles, Play, Video, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale'; 
import Link from 'next/link';

// 🚀 مسارات دقيقة للاتصال المباشر بقاعدة البيانات
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { useDashboardSystem } from '@/hooks/useDashboardSystem'; // 🚀 استيراد المحرك الشامل

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

export default function StudentSchedulePage() {
  const { user, authRole, isChecking } = useAuth() as any; 

  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  // 🚀 الحارس (Guard) لمنع الطلبات المزدوجة والمكررة
  const isFetchedRef = useRef(false);
  const { fetchStudentSchedule } = useDashboardSystem(); // 🚀 استخدام الـ Hook الجديد

  // 🚀 الاستعلام القناص: يجلب بيانات الطالب الحالية وجدوله المخصص فقط مرة واحدة
  const fetchStrictSchedule = useCallback(async () => {
    if (authRole !== 'student' || !user?.id || isFetchedRef.current) return;

    isFetchedRef.current = true; // إغلاق الباب فوراً
    setLoading(true);

    try {
      // 🚀 الاعتماد على المحرك الشامل لجلب الجدول بناءً على النظام الفعال
      const data = await fetchStudentSchedule();
      
      if (data) {
          setStudentInfo(data.student);
          setSchedule(data.schedule || []);
          setPeriods(data.periods || []);
      }

    } catch (error) {
      console.error('Error fetching strict schedule:', error);
      // في حال الفشل نفتح الباب مجدداً لمحاولة أخرى
      isFetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [authRole, user?.id, fetchStudentSchedule]);

  useEffect(() => {
    if (!isChecking) fetchStrictSchedule();
  }, [fetchStrictSchedule, isChecking]);

  // 🚀 تحديث الوقت في UseEffect منفصل لحماية الـ Render
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getCellData = useCallback((day: number, period: number) => {
    return schedule.find(s => 
      Number(s.day_of_week) === Number(day) && 
      Number(s.period) === Number(period)
    );
  }, [schedule]);

  // 🚀 [تعديل جراحي] الاعتماد على الوقت المحقون
  const isCurrentClassLocal = useCallback((day: number, startTime?: string, endTime?: string) => {
    if (!currentTime || !startTime || !endTime) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1; 
    if (day !== currentDay) return false;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const start = new Date(now); start.setHours(startH, startM, 0);
    const end = new Date(now); end.setHours(endH, endM, 0);

    return now >= start && now <= end;
  }, [currentTime]);

  // 🚀 [تعديل جراحي] الاعتماد على الوقت المحقون
  const isNextClassLocal = useCallback((day: number, startTime?: string) => {
    if (!currentTime || !startTime) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1;
    if (day !== currentDay) return false;

    const [startH, startM] = startTime.split(':').map(Number);
    const start = new Date(now); start.setHours(startH, startM, 0);

    const diff = (start.getTime() - now.getTime()) / (1000 * 60);
    return diff > 0 && diff <= 60;
  }, [currentTime]);

  const isPastClassLocal = useCallback((day: number, endTime?: string) => {
      if (!currentTime || !endTime) return false;
      const now = currentTime;
      const currentDay = now.getDay() + 1;
      
      // إذا كان اليوم المطلوب قد مضى في هذا الأسبوع
      if (day < currentDay) return true;
      // إذا كان اليوم المطلوب لم يأتِ بعد
      if (day > currentDay) return false;

      // إذا كنا في نفس اليوم نقارن الساعات
      const [endH, endM] = endTime.split(':').map(Number);
      const end = new Date(now); end.setHours(endH, endM, 0);
      return now > end;
  }, [currentTime]);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'student') {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للطلاب فقط.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500/10 border-t-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري سحب جدولك المخصص...</p>
        </div>
      </div>
    );
  }

  const secObj = Array.isArray(studentInfo?.sections) ? studentInfo?.sections[0] : studentInfo?.sections;
  const className = Array.isArray(secObj?.classes) ? secObj?.classes[0]?.name : secObj?.classes?.name;
  const fullSectionName = className ? `${className} - ${secObj?.name}` : 'فصل غير محدد';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6"
      dir="rtl"
    >
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="flex justify-start">
          <Link href="/dashboard/student" className="flex items-center gap-2 text-slate-400 hover:text-blue-400 font-bold glass-panel px-5 py-2.5 rounded-2xl transition-all w-fit group text-sm sm:text-base active:scale-95 shadow-sm hover:border-blue-500/30">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> العودة للوحة الطالب
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] border border-white/10 p-6 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-4 text-center lg:text-right w-full">
              <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)] mx-auto lg:mx-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> الجدول الأسبوعي الدقيق
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                جدولي الدراسي
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm lg:text-base font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0 drop-shadow-sm">
                عرض الحصص الدراسية المخصصة حصرياً لصفك: <span className="text-emerald-400 font-black px-1.5 py-0.5 bg-[#02040a]/80 rounded-md shadow-inner border border-emerald-500/20">{fullSectionName}</span>
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4 bg-[#0f1423]/80 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shrink-0 w-full lg:w-auto shadow-inner">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-[1.5rem] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Clock className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="text-right">
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest">الوقت الحالي</div>
                <div className="text-lg sm:text-xl font-black text-white tracking-widest drop-shadow-sm" dir="ltr">{format(currentTime, 'hh:mm a', { locale: arSA })}</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none"></div>
          <div className="absolute left-0 top-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
        </div>

        {periods.length === 0 ? (
          <div className="text-center py-16 sm:py-20 glass-panel rounded-[2rem] sm:rounded-[3rem] border border-white/10 border-dashed px-4">
             <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-[#02040a]/80 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 border border-white/5 shadow-inner">
               <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500/80 drop-shadow-md" />
             </div>
             <h3 className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-sm">الجدول غير متاح</h3>
             <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">لم تقم الإدارة برفع أوقات الحصص أو إسناد جدول لصفك حتى الآن.</p>
          </div>
        ) : (
          <>
            {/* عرض الموبايل (أفقي - Tabs) */}
            <div className="lg:hidden">
              <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-4 custom-scrollbar snap-x px-1">
                {DAYS.map((day) => (
                  <button key={day.id} onClick={() => setActiveDayTab(day.id)} className={`snap-center shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 border ${activeDayTab === day.id ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border-blue-400 scale-[1.02]' : 'bg-[#0f1423]/80 text-slate-400 border-white/5 hover:border-white/20 hover:text-white shadow-inner'}`}>
                    {activeDayTab === day.id && <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 drop-shadow-sm" />} {day.name}
                  </button>
                ))}
              </div>

              <div className="space-y-3 sm:space-y-4 mt-2">
                <AnimatePresence mode="wait">
                  <motion.div key={activeDayTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 sm:space-y-4">
                    {periods.map(p => {
                      const slot = getCellData(activeDayTab, p.period_number);
                      if (!slot) return null;
                      
                      const isCurrent = isCurrentClassLocal(activeDayTab, slot.start_time, slot.end_time);
                      const isNext = isNextClassLocal(activeDayTab, slot.start_time);
                      const isPast = isPastClassLocal(activeDayTab, slot.end_time);

                      return (
                        <div key={p.id} className={cn("glass-panel p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col gap-3 sm:gap-4 relative overflow-hidden group transition-all duration-500 border", 
                            isCurrent ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-[#0f1423]/90 scale-[1.02]' : 
                            isPast ? 'bg-[#02040a]/40 border-white/5 opacity-50 grayscale' :
                            'border-white/5 hover:border-white/20'
                        )}>
                          
                          {isCurrent && (
                            <span className="absolute top-4 left-4 flex h-3.5 w-3.5 z-20">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                            </span>
                          )}

                          <div className={`absolute top-0 right-0 w-1.5 h-full ${
                              isCurrent ? 'bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 
                              isPast ? 'bg-slate-700' :
                              isNext ? 'bg-amber-400' : 
                              'bg-gradient-to-b from-blue-500 to-indigo-600'
                          }`}></div>
                          
                          <div className="flex justify-between items-start pl-2">
                            <div>
                              <span className={cn("text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-1 rounded-lg inline-flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-2.5 shadow-inner border", 
                                  isCurrent ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                  isPast ? 'bg-transparent text-slate-500 border-slate-700' :
                                  isNext ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              )}>
                                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> الحصة {p.period_number}
                              </span>
                              <h3 className={cn("text-lg sm:text-xl font-black drop-shadow-sm", 
                                  isCurrent ? 'text-blue-400' : 
                                  isPast ? 'text-slate-500' :
                                  'text-white'
                              )}>{slot.subjects?.name}</h3>
                            </div>
                            <span className={cn("text-[10px] sm:text-xs font-bold bg-[#02040a]/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border shadow-inner", 
                                isCurrent ? 'text-blue-200 border-blue-500/20' :
                                isPast ? 'text-slate-600 border-white/5' :
                                'text-slate-400 border-white/5'
                            )} dir="ltr">
                              {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                            </span>
                          </div>
                          
                          <div className={`flex items-center justify-between pt-3 sm:pt-4 border-t gap-3 relative z-10 ${
                              isCurrent ? 'border-blue-500/20' : 
                              isPast ? 'border-slate-800' :
                              'border-white/5'
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#02040a] flex items-center justify-center text-slate-500 border border-white/10 shrink-0 shadow-inner"><User className="w-3 h-3 sm:w-4 sm:h-4" /></div>
                              <span className={cn("text-xs sm:text-sm font-bold truncate", 
                                  isCurrent ? 'text-blue-200' : 
                                  isPast ? 'text-slate-600' :
                                  'text-slate-300'
                              )}>أ. {slot.teachers?.users?.full_name}</span>
                            </div>
                            {slot.teachers?.zoom_link && !isPast && (
                              <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black transition-all border shrink-0 ${isCurrent ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500 hover:text-slate-950 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'}`}>
                                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> دخول البث
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {periods.every(p => !getCellData(activeDayTab, p.period_number)) && (
                      <div className="text-center py-12 sm:py-16 glass-panel rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 border-dashed shadow-inner">
                        <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-2 sm:mb-3" />
                        <p className="font-bold text-slate-400 text-sm sm:text-lg">يوم إجازة أو لا توجد حصص مجدولة!</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* عرض الكمبيوتر (الشبكة الملكية) */}
            <div className="hidden lg:block glass-panel rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="overflow-x-auto custom-scrollbar p-6 sm:p-8">
                <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="py-5 sm:py-6 px-4 text-center text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest border-l border-white/5 w-32 bg-[#0f1423]/80 rounded-tr-[1.5rem]">اليوم / الحصة</th>
                      {periods.map((period, idx) => (
                        <th key={period.id} className={`py-4 sm:py-5 px-3 sm:px-4 text-center border-l border-white/5 w-44 sm:w-48 bg-[#02040a]/60 ${idx === periods.length - 1 ? 'rounded-tl-[1.5rem]' : ''}`}>
                          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                            <span className="text-white font-black text-xs sm:text-sm drop-shadow-sm">الحصة {period.period_number}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {DAYS.map((day) => (
                      <tr key={day.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 sm:py-6 px-3 sm:px-4 text-xs sm:text-sm font-black text-slate-300 border-l border-white/5 text-center bg-[#02040a]/40 group-hover:text-blue-400 transition-colors">{day.name}</td>
                        {periods.map(period => {
                          const cellData = getCellData(day.id, period.period_number);
                          
                          // تمرير الوقت المحقون بدلاً من البحث في periods العامة
                          const isCurrent = isCurrentClassLocal(day.id, cellData?.start_time, cellData?.end_time);
                          const isNext = isNextClassLocal(day.id, cellData?.start_time);
                          const isPast = isPastClassLocal(day.id, cellData?.end_time);

                          return (
                            <td key={`${day.id}-${period.id}`} className="p-2 sm:p-3 border-l border-white/5 h-36 sm:h-40 align-top min-w-[160px] sm:min-w-[180px]">
                              {cellData ? (
                                <motion.div 
                                  whileHover={!isPast ? { scale: 1.03 } : {}}
                                  className={cn("h-full flex flex-col justify-between rounded-[1rem] sm:rounded-[1.5rem] p-3 sm:p-4 transition-all duration-300 relative overflow-hidden shadow-inner border",
                                    isCurrent ? 'bg-[#0f1423]/90 border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/30 scale-[1.02]' : 
                                    isPast ? 'bg-[#02040a]/40 border-white/5 opacity-50 grayscale' :
                                    isNext ? 'bg-amber-500/10 border-amber-500/30 shadow-sm' : 
                                    'bg-[#02040a]/60 border-white/5 hover:border-blue-500/30 hover:bg-[#0f1423]'
                                  )}
                                >
                                  {isCurrent && (
                                    <>
                                      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                                      <span className="absolute top-2 left-2 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                                      </span>
                                    </>
                                  )}
                                  
                                  <div className="space-y-1.5 sm:space-y-2 relative z-10">
                                    <div className={cn("flex items-center gap-1 sm:gap-1.5", 
                                        isCurrent ? 'text-blue-400/80' : 
                                        isPast ? 'text-slate-600' :
                                        isNext ? 'text-amber-400/80' : 
                                        'text-slate-500'
                                    )}>
                                      <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate">
                                        {cellData.start_time?.slice(0, 5)} - {cellData.end_time?.slice(0, 5)}
                                      </span>
                                    </div>
                                    <div className={cn("font-black text-sm sm:text-base leading-snug truncate drop-shadow-sm", 
                                        isCurrent ? 'text-blue-400' : 
                                        isPast ? 'text-slate-500' :
                                        isNext ? 'text-amber-400' : 
                                        'text-white'
                                    )}>
                                      {cellData.subjects?.name}
                                    </div>
                                  </div>
                                  <div className={cn("mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex flex-col gap-1.5 sm:gap-2 relative z-10", 
                                      isCurrent ? 'border-blue-500/20' : 
                                      isPast ? 'border-slate-800' :
                                      isNext ? 'border-amber-500/20' : 
                                      'border-white/5'
                                  )}>
                                    <div className={cn("flex items-center gap-1.5 sm:gap-2", 
                                        isCurrent ? 'text-blue-200' : 
                                        isPast ? 'text-slate-600' :
                                        'text-slate-400'
                                    )}>
                                      <User className="h-3.5 w-3.5 sm:h-4 w-4 shrink-0 opacity-70" />
                                      <div className="text-[10px] sm:text-xs font-bold truncate">
                                        أ. {cellData.teachers?.users?.full_name || 'غير محدد'}
                                      </div>
                                    </div>
                                    {cellData.teachers?.zoom_link && !isPast && (
                                      <a href={normalizeUrl(cellData.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className={cn("w-full flex items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black transition-colors border", 
                                          isCurrent ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-slate-950 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 
                                          'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-slate-950 border-indigo-500/20'
                                      )}>
                                        <Video className="w-3 h-3 sm:w-3.5 h-3.5 animate-pulse" /> دخول البث
                                      </a>
                                    )}
                                    {isCurrent && !cellData.teachers?.zoom_link && (
                                      <div className="inline-flex items-center justify-center py-1 sm:py-1.5 px-2 sm:px-3 bg-[#02040a] rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black text-blue-400 shadow-inner w-full border border-blue-500/20">
                                        الحصة جارية
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-700 bg-[#02040a]/40 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 border-dashed shadow-inner">
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
          </>
        )}

        <div className="glass-panel border-blue-500/30 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 mt-4 sm:mt-6 shadow-[0_0_20px_rgba(59,130,246,0.1)] text-center sm:text-right">
          <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl sm:rounded-2xl shrink-0 border border-blue-500/20 shadow-inner">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 drop-shadow-md" />
          </div>
          <div>
            <h4 className="font-black text-blue-400 text-base sm:text-lg drop-shadow-sm">تنبيه الحصص</h4>
            <p className="text-xs sm:text-sm text-slate-300 font-bold mt-1 sm:mt-1.5 leading-relaxed max-w-2xl">يرجى الالتزام بمواعيد الحصص الدراسية والتواجد في الفصل قبل بدء الحصة بـ 5 دقائق تجنباً لتسجيلك كمتأخر أو غائب في الرصد الآلي.</p>
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
