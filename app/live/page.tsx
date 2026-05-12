// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Clock, ShieldCheck, Video, Users, 
  BookOpen, Send, Activity, GraduationCap, 
  MonitorPlay, ShieldAlert, Sparkles, Loader2, School
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface ActiveClass {
  id: string;
  subject_name: string;
  class_name: string;
  teacher_name: string;
  zoom_link: string | null;
}

interface TimeStatus {
  type: 'class' | 'break' | 'closed';
  period?: number;
  name?: string;
  start?: string;
  end?: string;
  message?: string;
}

export default function LiveClassesPublicPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const [selectedClass, setSelectedClass] = useState<ActiveClass | null>(null);
  const [visitorForm, setVisitorForm] = useState({ name: '', role: 'موجه فني' });
  const [isEntering, setIsEntering] = useState(false);

  const fetchLiveStatus = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const res = await fetch('/api/public/live-status', { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      setTimeStatus(data.status);
      setActiveClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch live status:', error);
      setTimeStatus({ type: 'closed', message: 'نظام البث غير متاح حالياً' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStatus(false);
    
    const clockInterval = setInterval(() => {
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const kwt = new Date(utc + (3 * 3600000));
      setCurrentTime(kwt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    const refreshInterval = setInterval(() => {
      fetchLiveStatus(true);
    }, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
    };
  }, [fetchLiveStatus]);

  const getRemainingTime = (endTimeStr?: string) => {
    if (!endTimeStr) return 'لحظات...';
    try {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const kwtNow = new Date(utc + (3 * 3600000)); 
      
      const [h, m] = endTimeStr.split(':').map(Number);
      const endDate = new Date(kwtNow);
      endDate.setHours(h, m, 0, 0);
      
      const diffMins = Math.ceil((endDate.getTime() - kwtNow.getTime()) / 60000);
      
      if (diffMins <= 0) return 'جاري بدء الحصة...';
      if (diffMins > 60) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours} ساعة و ${mins} دقيقة`;
      }
      return `${diffMins} دقيقة`;
    } catch (e) {
      return 'قريباً...';
    }
  };

  const handleEnterClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.name.trim() || !selectedClass?.zoom_link) return;

    setIsEntering(true);
    try {
      await fetch('/api/public/log-visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName: visitorForm.name.trim(),
          visitorRole: visitorForm.role,
          className: selectedClass.class_name,
          teacherName: selectedClass.teacher_name,
          subjectName: selectedClass.subject_name
        })
      });
      window.location.href = selectedClass.zoom_link;
    } catch (error) {
      window.location.href = selectedClass!.zoom_link!;
    }
  };

// 🚀 خوارزمية فرز هندسية تعتمد على رقم المستوى (Level) المجلوب من السيرفر
  const { middleClasses, highClasses, otherClasses } = useMemo(() => {
    // الترتيب التصاعدي أولاً
    const sorted = [...activeClasses].sort((a, b) => a.level - b.level || a.class_name.localeCompare(b.class_name));

    return {
      middleClasses: sorted.filter(c => c.level >= 6 && c.level <= 9),
      highClasses: sorted.filter(c => c.level >= 10 && c.level <= 12),
      otherClasses: sorted.filter(c => c.level < 6 || c.level > 12)
    };
  }, [activeClasses]);

  // 🃏 مكون فرعي لرسم بطاقة الحصة (لمنع تكرار الكود)
  const renderClassCard = (cls: any, idx: number) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: idx * 0.05, type: 'spring' }}
      key={cls.id} 
      className="group bg-[#0F172A]/80 backdrop-blur-xl border border-white/5 hover:border-indigo-500/50 rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)] hover:-translate-y-2 flex flex-col"
    >
      <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
          </span>
          <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-widest drop-shadow-sm">بث مباشر</span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 shadow-inner">الحصة {timeStatus?.period}</span>
      </div>
      
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
        <h4 className="text-lg sm:text-2xl font-black text-white mb-2 group-hover:text-indigo-400 transition-colors leading-tight drop-shadow-md truncate">{cls.subject_name}</h4>
        
        <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 relative z-10">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0"><Users className="w-4 h-4 text-emerald-400" /></div>
            <span className="text-xs sm:text-sm font-bold truncate">{cls.class_name}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] sm:text-xs font-black text-indigo-400 shrink-0">{cls.teacher_name.charAt(0)}</div>
            <span className="text-xs sm:text-sm font-bold truncate">أ. {cls.teacher_name}</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-black/40 mt-auto border-t border-white/5">
        {cls.zoom_link ? (
          <button 
            onClick={() => setSelectedClass(cls)}
            className="w-full py-3.5 sm:py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5" /> دخول قاعة الدرس
          </button>
        ) : (
          <button disabled className="w-full py-3.5 sm:py-4 rounded-xl bg-slate-800 text-slate-500 font-black text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-2 border border-white/5 shadow-inner">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" /> الرابط غير متوفر
          </button>
        )}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative flex items-center justify-center">
             <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
             <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
             <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 absolute animate-pulse" />
          </div>
          <p className="text-indigo-300 font-black tracking-widest text-sm sm:text-base animate-pulse drop-shadow-md">جاري مسح الحرم المدرسي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] font-cairo text-slate-200 selection:bg-indigo-500/30 overflow-hidden relative" dir="rtl">
      
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] rounded-full bg-indigo-900/10 blur-[100px] sm:blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] rounded-full bg-violet-900/10 blur-[100px] sm:blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      <header className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10 relative overflow-hidden group shrink-0">
               <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10 drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">مدرسة الرفعة النموذجية</h1>
              <p className="text-indigo-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">بوابة التشريفات والحصص الحية</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-slate-950/80 p-2 sm:p-3 rounded-2xl border border-white/5 shadow-inner w-full md:w-auto">
            <div className="flex flex-col items-center px-4 border-l border-white/10">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">توقيت الكويت</span>
              <span className="text-lg sm:text-xl font-black text-white font-mono tracking-wider" dir="ltr">{currentTime || '--:--:--'}</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">حالة المدرسة</span>
              {timeStatus?.type === 'class' ? (
                <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5"><Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse"/> الحصة {timeStatus.period} جارية</span>
              ) : timeStatus?.type === 'break' ? (
                <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center gap-1.5"><Clock className="w-3 h-3 sm:w-4 sm:h-4"/> {timeStatus.name}</span>
              ) : (
                <span className="text-xs sm:text-sm font-black text-rose-400 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4"/> مغلقة حالياً</span>
              )}
            </div>
            {isRefreshing && <Loader2 className="w-4 h-4 text-slate-500 animate-spin absolute top-2 right-2" />}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        
        <div className="mb-10 sm:mb-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 shadow-inner backdrop-blur-sm">
             <Sparkles className="w-4 h-4 text-indigo-400" />
             <span className="text-indigo-400 font-black text-[10px] sm:text-xs uppercase tracking-widest">بث حي ومباشر</span>
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            مرحباً بالضيوف الكرام في <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-emerald-400 drop-shadow-lg">الحرم المدرسي الرقمي</span>
          </h2>
          <p className="text-sm sm:text-lg text-slate-400 font-bold leading-relaxed px-4">
            من هنا يمكنكم الاطلاع على سير العملية التعليمية والدخول المباشر للحصص الحالية. 
            تلتزم إدارة مدرسة الرفعة بالشفافية المطلقة لضمان جودة التعليم ومتابعته.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {timeStatus?.type === 'class' ? (
            <motion.div key="classes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              {activeClasses.length === 0 ? (
                <div className="bg-[#0F172A]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-20 text-center shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="mx-auto w-20 h-20 sm:w-28 sm:h-28 bg-[#020617] rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 border border-white/10 shadow-inner">
                    <MonitorPlay className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-500/50" />
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white mb-3 drop-shadow-md">لا توجد حصص تبث حالياً!</h3>
                  <p className="text-xs sm:text-base text-slate-400 font-bold max-w-lg mx-auto leading-relaxed">
                    الوقت الحالي مخصص للحصة (<span className="text-indigo-400 font-black">{timeStatus.period}</span>)، ولكن لا يبدو أن هناك دروساً مسجلة للبدء في هذا الوقت ضمن الجدول. يرجى الانتظار، سيتم التحديث تلقائياً.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* 🏫 قسم المرحلة المتوسطة */}
                  {middleClasses.length > 0 && (
                    <div>
                       <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                             <School className="w-5 h-5 text-emerald-400" />
                          </div>
                          فصول المرحلة المتوسطة
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                          {middleClasses.map((cls, idx) => renderClassCard(cls, idx))}
                       </div>
                    </div>
                  )}

                  {/* 🎓 قسم المرحلة الثانوية */}
                  {highClasses.length > 0 && (
                    <div>
                       <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                             <GraduationCap className="w-5 h-5 text-indigo-400" />
                          </div>
                          فصول المرحلة الثانوية
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                          {highClasses.map((cls, idx) => renderClassCard(cls, idx))}
                       </div>
                    </div>
                  )}

                  {/* 📂 فصول أخرى (إن وجدت ولم يتم التعرف على مرحلتها) */}
                  {otherClasses.length > 0 && (
                    <div>
                       <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center border border-slate-500/20 shadow-inner">
                             <BookOpen className="w-5 h-5 text-slate-400" />
                          </div>
                          فصول دراسية أخرى
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                          {otherClasses.map((cls, idx) => renderClassCard(cls, idx))}
                       </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

          ) : timeStatus?.type === 'break' ? (
            
            <motion.div key="break" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 backdrop-blur-2xl border border-amber-500/20 rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-20 text-center shadow-[0_20px_50px_rgba(245,158,11,0.1)] relative overflow-hidden max-w-4xl mx-auto">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10">
                <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center mb-6 sm:mb-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                  <Clock className="w-10 h-10 sm:w-14 sm:h-14 text-amber-400 animate-pulse" />
                </div>
                <h3 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md">{timeStatus.name}</h3>
                <p className="text-sm sm:text-xl text-amber-200/80 font-bold mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
                  المدرسة الآن في وقت استراحة. ستستأنف الحصص في تمام الساعة <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md" dir="ltr">{timeStatus.end}</span>.
                </p>
                <div className="inline-flex flex-col items-center p-5 sm:p-6 bg-black/40 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-md shadow-inner min-w-[200px]">
                   <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-2 sm:mb-3">الوقت المتبقي تقريباً</span>
                   <span className="text-2xl sm:text-4xl font-mono font-black text-amber-400 drop-shadow-md" dir="rtl">
                     {getRemainingTime(timeStatus.end)}
                   </span>
                </div>
              </div>
            </motion.div>

          ) : (
            
            <motion.div key="closed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] sm:rounded-[3rem] p-10 sm:p-20 text-center shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/10 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10">
                 <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-[#020617] border border-white/5 rounded-full flex items-center justify-center mb-6 sm:mb-8 shadow-inner">
                   <ShieldAlert className="w-10 h-10 sm:w-14 sm:h-14 text-slate-500" />
                 </div>
                 <h3 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight drop-shadow-md">{timeStatus?.message || 'المدرسة مغلقة حالياً'}</h3>
                 <p className="text-sm sm:text-lg text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed">
                   انتهى الدوام المدرسي لهذا اليوم. تفتح أبواب الفصول الافتراضية يومياً من الأحد إلى الخميس في تمام الساعة <span className="text-white font-black bg-white/5 px-2 py-0.5 rounded-md" dir="ltr">09:00 AM</span> بتوقيت الكويت.
                 </p>
              </div>
            </motion.div>

          )}
        </AnimatePresence>
      </main>

      {/* 🎩 The Gatekeeper Modal (بوابة التشريفات) */}
      <Dialog.Root open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <AnimatePresence>
          {selectedClass && (
             <Dialog.Portal forceMount>
                <Dialog.Overlay asChild>
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-50" />
                </Dialog.Overlay>
                
                <Dialog.Content asChild>
                   <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#0F172A] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50 outline-none" dir="rtl">
                     
                     <div className="text-center mb-6 sm:mb-8">
                       <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center mb-4 shadow-inner">
                         <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                       </div>
                       <Dialog.Title className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 drop-shadow-sm">سجل التشريفات والزيارات</Dialog.Title>
                       <p className="text-slate-400 text-xs sm:text-sm font-bold leading-relaxed px-2">
                         يسعدنا تواجدكم في <span className="text-indigo-400 font-black">{selectedClass?.subject_name}</span>. يرجى التكرم بتسجيل بياناتكم للإشعار قبل الدخول.
                       </p>
                     </div>

                     <form onSubmit={handleEnterClass} className="space-y-4 sm:space-y-5">
                       <div className="space-y-2">
                         <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">الاسم الكريم</label>
                         <input 
                           type="text" required autoFocus
                           value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})}
                           placeholder="الاسم الثلاثي..."
                           className="w-full bg-[#020617] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-sm font-bold text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">الصفة الوظيفية</label>
                         <div className="relative">
                            <select 
                              value={visitorForm.role} onChange={e => setVisitorForm({...visitorForm, role: e.target.value})}
                              className="w-full bg-[#020617] border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 text-sm font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                            >
                              <option value="موجه فني">موجه فني / اختصاصي</option>
                              <option value="إدارة خارجية (الوزارة)">إدارة خارجية (الوزارة / المنطقة)</option>
                              <option value="ولي أمر">ولي أمر الطالب</option>
                              <option value="زائر / ضيف">زائر / ضيف شرف</option>
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                               <Radio className="w-4 h-4 text-slate-500" />
                            </div>
                         </div>
                       </div>

                       <div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-white/5 flex gap-3">
                         <button type="button" onClick={() => setSelectedClass(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl transition-all border border-white/10 active:scale-95">إلغاء</button>
                         <button type="submit" disabled={isEntering || !visitorForm.name.trim()} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                           {isEntering ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <><Send className="w-4 h-4"/> اعتماد ودخول للبث</>}
                         </button>
                       </div>
                     </form>
                   </motion.div>
                </Dialog.Content>
             </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

    </div>
  );
}
