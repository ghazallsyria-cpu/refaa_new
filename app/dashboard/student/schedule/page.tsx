/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, ArrowRight, Loader2, AlertCircle, Sparkles, Play, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale'; 
import Link from 'next/link';

// 🚀 مسارات دقيقة للاتصال المباشر بقاعدة البيانات
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/auth-context';
import { cn } from '../../../../lib/utils';

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

  // 🚀 الاستعلام القناص: يجلب بيانات الطالب الحالية وجدوله المخصص فقط!
  const fetchStrictSchedule = useCallback(async () => {
    if (authRole !== 'student' || !user?.id) return;

    setLoading(true);
    try {
      // 1. تحديد شعبة الطالب بدقة (Section ID)
      const { data: studentDataRaw, error: stuErr } = await supabase
        .from('students')
        .select('id, section_id, sections(id, name, classes(name))')
        .eq('id', user.id)
        .maybeSingle();

      if (stuErr || !studentDataRaw) throw new Error("لم يتم العثور على بيانات الطالب");
      
      const studentData: any = studentDataRaw;
      const actualSectionId = studentData.section_id || (Array.isArray(studentData.sections) ? studentData.sections[0]?.id : studentData.sections?.id);
      setStudentInfo(studentData);

      // 2. جلب الحصص التي تتطابق 100% مع رقم الشعبة فقط
      if (actualSectionId) {
        const { data: strictSchedule } = await supabase
          .from('schedules')
          .select(`
            id, day_of_week, period, section_id,
            subjects(name),
            teachers(users(full_name), zoom_link)
          `)
          .eq('section_id', actualSectionId); // 🔒 القفل السري لمنع التداخل!
        
        setSchedule(strictSchedule || []);
      }

      // 3. جلب أوقات الحصص
      const { data: periodsData } = await supabase
        .from('periods')
        .select('*')
        .order('period_number', { ascending: true });

      setPeriods(periodsData || []);

    } catch (error) {
      console.error('Error fetching strict schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [authRole, user]);

  useEffect(() => {
    if (!isChecking) fetchStrictSchedule();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [fetchStrictSchedule, isChecking]);

  // البحث في المصفوفة أصبح آمناً لأن المصفوفة لا تحتوي إلا على جداول هذا الطالب
  const getCellData = useCallback((day: number, period: number) => {
    return schedule.find(s => 
      Number(s.day_of_week) === Number(day) && 
      Number(s.period) === Number(period)
    );
  }, [schedule]);

  const isCurrentClass = useCallback((day: number, period: any) => {
    if (!period?.start_time || !period?.end_time) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1; 
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const [endH, endM] = period.end_time.split(':').map(Number);
    
    const startTime = new Date(now); startTime.setHours(startH, startM, 0);
    const endTime = new Date(now); endTime.setHours(endH, endM, 0);

    return now >= startTime && now <= endTime;
  }, [currentTime]);

  const isNextClass = useCallback((day: number, period: any) => {
    if (!period?.start_time) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1;
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const startTime = new Date(now); startTime.setHours(startH, startM, 0);

    return startTime > now && (startTime.getTime() - now.getTime()) < 120 * 60000;
  }, [currentTime]);

  // 🚀 شاشات التحميل والحماية
  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] font-cairo text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'student') {
    return <div className="p-10 text-center font-black text-rose-500 min-h-[80vh] flex items-center justify-center bg-[#090b14] font-cairo">هذه الصفحة مخصصة للطلاب فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] font-cairo text-slate-200 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري سحب جدولك المخصص...</p>
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
      className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo"
      dir="rtl"
    >
      {/* 🚀 الخلفية الزجاجية المضيئة */}
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-8 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* زر العودة */}
        <div className="flex justify-start">
          <Link href="/dashboard/student" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 font-bold bg-[#131836]/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/5 transition-all w-fit group text-sm sm:text-base shadow-lg">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> العودة للوحة الطالب
          </Link>
        </div>

        {/* 🚀 الهيدر الفخم المخصص */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#131836] via-[#1a2044] to-[#0f142b] border border-white/10 p-8 sm:p-12 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-4 text-center lg:text-right w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-black text-indigo-400 uppercase tracking-widest backdrop-blur-sm shadow-sm mx-auto lg:mx-0">
                <Sparkles className="w-4 h-4" /> الجدول الأسبوعي الدقيق
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md text-white">
                جدولي الدراسي
              </h1>
              <p className="text-slate-400 text-sm sm:text-base font-bold max-w-2xl leading-relaxed mx-auto lg:mx-0">
                عرض الحصص الدراسية المخصصة حصرياً لصفك: <span className="text-emerald-400 font-black px-1">{fullSectionName}</span>
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4 bg-[#090b14]/50 p-4 rounded-[2rem] border border-white/5 shrink-0 w-full lg:w-auto shadow-inner">
              <div className="h-14 w-14 rounded-[1.5rem] bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Clock className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">الوقت الحالي</div>
                <div className="text-xl font-black text-white tracking-widest" dir="ltr">{format(currentTime, 'hh:mm a', { locale: arSA })}</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        </div>

        {periods.length === 0 ? (
          <div className="text-center py-20 bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] border border-white/5 border-dashed shadow-2xl">
             <div className="mx-auto h-24 w-24 bg-[#090b14]/50 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10">
               <AlertCircle className="h-12 w-12 text-rose-500/70" />
             </div>
             <h3 className="text-2xl font-black text-white mb-2">الجدول غير متاح</h3>
             <p className="text-slate-400 font-bold">لم تقم الإدارة برفع أوقات الحصص أو إسناد جدول لصفك حتى الآن.</p>
          </div>
        ) : (
          <>
            {/* 🚀 عرض الموبايل (أفقي) */}
            <div className="lg:hidden">
              <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide snap-x">
                {DAYS.map((day) => (
                  <button key={day.id} onClick={() => setActiveDayTab(day.id)} className={`snap-center shrink-0 px-6 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeDayTab === day.id ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'bg-[#131836]/60 text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white'}`}>
                    {activeDayTab === day.id && <Calendar className="w-4 h-4" />} {day.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4 mt-2">
                <AnimatePresence mode="wait">
                  <motion.div key={activeDayTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    {periods.map(p => {
                      const slot = getCellData(activeDayTab, p.period_number);
                      if (!slot) return null;
                      
                      const isCurrent = isCurrentClass(activeDayTab, p);
                      const isNext = isNextClass(activeDayTab, p);

                      return (
                        <div key={p.id} className={`bg-[#131836]/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border flex flex-col gap-4 relative overflow-hidden group transition-all ${isCurrent ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
                          <div className={`absolute top-0 right-0 w-1.5 h-full ${isCurrent ? 'bg-emerald-400' : 'bg-gradient-to-b from-indigo-500 to-purple-600'}`}></div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mb-2 ${isCurrent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                                <Clock className="w-3 h-3" /> الحصة {p.period_number}
                              </span>
                              <h3 className="text-xl font-black text-white">{slot.subjects?.name}</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-[#090b14]/50 px-3 py-1.5 rounded-xl border border-white/5" dir="ltr">
                              {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 border border-white/10 shrink-0"><User className="w-4 h-4" /></div>
                              <span className="text-sm font-bold text-slate-300 truncate">أ. {slot.teachers?.users?.full_name}</span>
                            </div>
                            {slot.teachers?.zoom_link && (
                              <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-slate-900 transition-all border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
                                <Video className="w-4 h-4 animate-pulse" /> دخول البث
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {periods.every(p => !getCellData(activeDayTab, p.period_number)) && (
                      <div className="text-center py-16 bg-[#131836]/40 backdrop-blur-xl rounded-[2rem] border border-white/5 border-dashed">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="font-bold text-slate-400 text-lg">يوم إجازة أو لا توجد حصص مجدولة!</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* 🚀 عرض الكمبيوتر (شبكة) */}
            <div className="hidden lg:block bg-[#131836]/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar p-6 sm:p-8">
                <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="py-6 px-4 text-center text-sm font-black text-emerald-400 uppercase tracking-widest border-l border-white/5 w-32 bg-[#090b14]/50 rounded-tr-3xl">اليوم / الحصة</th>
                      {periods.map((period, idx) => (
                        <th key={period.id} className={`py-5 px-4 text-center border-l border-white/5 w-48 bg-[#090b14]/30 ${idx === periods.length - 1 ? 'rounded-tl-3xl' : ''}`}>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-white font-black text-sm">الحصة {period.period_number}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-[#1a2044] px-3 py-1 rounded-lg border border-white/5 shadow-inner" dir="ltr">
                              {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {DAYS.map((day) => (
                      <tr key={day.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-6 px-4 text-sm font-black text-slate-300 border-l border-white/5 text-center bg-[#090b14]/50 group-hover:text-emerald-400 transition-colors">{day.name}</td>
                        {periods.map(period => {
                          const cellData = getCellData(day.id, period.period_number);
                          const isCurrent = isCurrentClass(day.id, period);
                          const isNext = isNextClass(day.id, period);

                          return (
                            <td key={`${day.id}-${period.id}`} className="p-3 border-l border-white/5 h-40 align-top min-w-[180px]">
                              {cellData ? (
                                <motion.div 
                                  whileHover={{ scale: 1.03 }}
                                  className={`h-full flex flex-col justify-between rounded-[1.5rem] p-4 transition-all duration-300 relative overflow-hidden ${
                                    isCurrent 
                                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400' 
                                      : isNext
                                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                        : 'bg-[#090b14]/60 border border-white/5 text-white hover:border-white/20 hover:bg-[#1a2044] shadow-inner'
                                  }`}
                                >
                                  {isCurrent && <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>}
                                  
                                  <div className="space-y-2 relative z-10">
                                    <div className={`flex items-center gap-1.5 ${isCurrent ? 'text-emerald-900/70' : 'text-slate-500'}`}>
                                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                      <span className="text-[10px] font-black uppercase tracking-wider">المادة</span>
                                    </div>
                                    <div className={`font-black text-base leading-snug truncate ${isCurrent ? 'text-slate-900' : 'text-white'}`}>
                                      {cellData.subjects?.name}
                                    </div>
                                  </div>
                                  <div className={`mt-3 pt-3 border-t flex flex-col gap-2 relative z-10 ${isCurrent ? 'border-slate-900/10' : 'border-white/5'}`}>
                                    <div className={`flex items-center gap-2 ${isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>
                                      <User className="h-4 w-4 shrink-0" />
                                      <div className="text-xs font-bold truncate">
                                        أ. {cellData.teachers?.users?.full_name || 'غير محدد'}
                                      </div>
                                    </div>
                                    {cellData.teachers?.zoom_link && (
                                      <a href={normalizeUrl(cellData.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black transition-colors ${isCurrent ? 'bg-[#090b14]/80 text-emerald-400 hover:bg-[#090b14]' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 border border-emerald-500/30'}`}>
                                        <Video className="w-3.5 h-3.5" /> دخول البث
                                      </a>
                                    )}
                                    {isCurrent && !cellData.teachers?.zoom_link && (
                                      <div className="inline-flex items-center justify-center py-1.5 px-3 bg-slate-900 rounded-xl text-[10px] font-black text-emerald-400 shadow-md w-full">
                                        <span className="relative flex h-2 w-2 ml-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        الحصة جارية
                                      </div>
                                    )}
                                    {isNext && !isCurrent && (
                                      <div className="inline-flex items-center justify-center py-1.5 px-3 bg-amber-500/30 rounded-xl text-[10px] font-black text-amber-300 border border-amber-500/50 w-full">
                                        الحصة القادمة
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-700 bg-[#090b14]/30 rounded-[1.5rem] border border-white/5 border-dashed">
                                  <span className="text-xl font-black opacity-30">-</span>
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

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex items-start gap-4 mt-6 backdrop-blur-md shadow-lg">
          <div className="p-3 bg-amber-500/20 rounded-2xl shrink-0 border border-amber-500/30">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h4 className="font-black text-amber-400 text-lg">تنبيه الحصص</h4>
            <p className="text-sm text-slate-300 font-bold mt-1.5 leading-relaxed">يرجى الالتزام بمواعيد الحصص الدراسية والتواجد في الفصل قبل بدء الحصة بـ 5 دقائق تجنباً لتسجيلك كمتأخر أو غائب في الرصد الآلي.</p>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #090b14; border-radius: 12px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 2px solid #090b14; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        `}} />
      </div>
    </motion.div>
  );
}
