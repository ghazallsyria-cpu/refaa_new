'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  School, 
  Clock, 
  Video, 
  User, 
  BookOpen, 
  Layout, 
  RefreshCw,
  AlertCircle,
  Coffee,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import Image from 'next/image';

const FIXED_SCHEDULE = [
  { period: 1, start: '07:30', end: '08:15', type: 'class', name: 'الحصة الأولى' },
  { period: 1.5, start: '08:15', end: '08:20', type: 'break', name: 'استراحة' },
  { period: 2, start: '08:20', end: '09:05', type: 'class', name: 'الحصة الثانية' },
  { period: 2.5, start: '09:05', end: '09:10', type: 'break', name: 'استراحة' },
  { period: 3, start: '09:10', end: '09:55', type: 'class', name: 'الحصة الثالثة' },
  { period: 3.5, start: '09:55', end: '10:15', type: 'break', name: 'استراحة الصلاة والافطار' },
  { period: 4, start: '10:15', end: '11:00', type: 'class', name: 'الحصة الرابعة' },
  { period: 4.5, start: '11:00', end: '11:05', type: 'break', name: 'استراحة' },
  { period: 5, start: '11:05', end: '11:50', type: 'class', name: 'الحصة الخامسة' },
  { period: 5.5, start: '11:50', end: '11:55', type: 'break', name: 'استراحة' },
  { period: 6, start: '11:55', end: '12:40', type: 'class', name: 'الحصة السادسة' },
  { period: 6.5, start: '12:40', end: '12:45', type: 'break', name: 'استراحة' },
  { period: 7, start: '12:45', end: '13:30', type: 'class', name: 'الحصة السابعة' },
];

export default function LiveMonitor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchLiveData = useCallback(async () => {
    try {
      const response = await fetch('/api/live');
      if (!response.ok) throw new Error('Failed to fetch live data');
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Error fetching live data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => {
      fetchLiveData();
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const schoolTime = new Date(utcTime + (3 * 3600000)); // UTC+3
      setCurrentTime(schoolTime);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-indigo-200 font-bold animate-pulse">جاري تحميل المراقب المباشر...</p>
        </div>
      </div>
    );
  }

  const currentPeriod = data?.currentPeriod;
  const isBreak = currentPeriod?.isBreak;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30" dir="rtl">
      {/* Distinguished Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#312e81,transparent_70%)] opacity-40" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <header className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
            <div className="flex items-center gap-6">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="h-20 w-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3"
              >
                <School className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <motion.h1 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2"
                >
                  مدرسة الرفعة النموذجية
                </motion.h1>
                <motion.p 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-xs"
                >
                  المراقب المباشر للحصص الدراسية
                </motion.p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
              <div className="text-right">
                <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">توقيت النظام</div>
                <div className="text-2xl font-black font-mono text-white tracking-tighter">
                  {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="h-10 w-[1px] bg-white/10" />
              <button 
                onClick={() => { setLoading(true); fetchLiveData(); }}
                className="h-12 w-12 rounded-2xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center group"
              >
                <RefreshCw className={`h-6 w-6 group-hover:rotate-180 transition-transform duration-700 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {isBreak ? (
                  <motion.div 
                    key="break"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-black">
                      <Coffee className="h-4 w-4" />
                      وقت الاستراحة الآن
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-white leading-tight">
                      {currentPeriod.breakName}
                    </h2>
                    <p className="text-xl text-slate-400 max-w-xl font-medium leading-relaxed">
                      نحن الآن في فترة استراحة. ستبدأ الحصة القادمة في تمام الساعة <span className="text-white font-bold">{currentPeriod.end_time}</span>. استمتع بوقتك!
                    </p>
                  </motion.div>
                ) : currentPeriod ? (
                  <motion.div 
                    key="class"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-black">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      بث مباشر للحصص
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-white leading-tight">
                      الحصة <span className="text-indigo-500">{currentPeriod.period_number}</span>
                    </h2>
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                        <Clock className="h-6 w-6 text-indigo-400" />
                        <span className="text-xl font-black text-white">{currentPeriod.start_time} - {currentPeriod.end_time}</span>
                      </div>
                      <div className="text-slate-500 font-bold text-lg">
                        {data.classes?.length || 0} فصول دراسية نشطة حالياً
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="no-class"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-500/10 border border-slate-500/20 rounded-full text-slate-400 text-sm font-black">
                      <Clock className="h-4 w-4" />
                      خارج أوقات الدوام
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-white leading-tight">
                      لا توجد حصص
                    </h2>
                    <p className="text-xl text-slate-400 max-w-xl font-medium leading-relaxed">
                      {data?.message || 'لا توجد حصص دراسية في هذا الوقت. يرجى مراجعة الجدول الزمني أدناه.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full opacity-50" />
                <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 shadow-2xl">
                  <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                    الجدول الزمني اليومي
                  </h3>
                  <div className="space-y-4">
                    {FIXED_SCHEDULE.map((item, idx) => {
                      const isActive = currentPeriod?.period_number === item.period;
                      return (
                        <div 
                          key={idx}
                          className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                            isActive 
                              ? 'bg-indigo-600 shadow-xl shadow-indigo-500/20 scale-105' 
                              : 'bg-white/5 border border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            isActive ? 'bg-white text-indigo-600' : 'bg-white/10 text-slate-400'
                          }`}>
                            {item.type === 'class' ? item.period : <Coffee className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-200'}`}>{item.name}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {item.start} - {item.end}
                            </div>
                          </div>
                          {isActive && (
                            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[3rem] text-center max-w-2xl mx-auto">
            <div className="bg-red-500/20 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">عذراً، حدث خطأ في الاتصال</h2>
            <p className="text-red-200/60 mb-8 text-lg font-medium">{error}</p>
            <button 
              onClick={fetchLiveData}
              className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-900/20"
            >
              إعادة المحاولة الآن
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-2">الفصول الدراسية النشطة</h2>
                <p className="text-slate-500 font-bold text-lg">قائمة بجميع الحصص المباشرة الجارية حالياً في المدرسة</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                تحديث تلقائي كل 60 ثانية
              </div>
            </div>

            {!data?.classes || data.classes.length === 0 ? (
              <div className="bg-white/5 border border-white/5 p-20 rounded-[4rem] text-center">
                <div className="bg-indigo-500/10 p-8 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-8">
                  <Clock className="h-14 w-14 text-indigo-400/50" />
                </div>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
                  {isBreak ? 'وقت استراحة ممتع!' : 'لا توجد حصص نشطة حالياً'}
                </h3>
                <p className="text-slate-500 text-xl font-medium max-w-lg mx-auto leading-relaxed">
                  {isBreak 
                    ? 'المعلمون والطلاب في فترة استراحة قصيرة. ستظهر الحصص هنا فور بدئها.' 
                    : 'يرجى مراجعة الجدول الزمني للتأكد من أوقات الحصص الدراسية.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {data.classes.map((cls: any, index: number) => (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.08] transition-all duration-500 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                              <Layout className="h-7 w-7" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white tracking-tight">{cls.sections?.classes?.name}</h3>
                              <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">{cls.sections?.name}</p>
                            </div>
                          </div>
                          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        </div>

                        <div className="space-y-6 flex-1">
                          <div className="flex items-center gap-4 group/item">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover/item:text-indigo-400 transition-colors">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">المادة الدراسية</div>
                              <div className="text-lg font-bold text-white">{cls.subjects?.name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 group/item">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover/item:text-indigo-400 transition-colors">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">المعلم المشرف</div>
                              <div className="text-lg font-bold text-white">{cls.teachers?.users?.full_name}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-10">
                          {cls.teachers?.zoom_link ? (
                            <a 
                              href={cls.teachers.zoom_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 group/btn"
                            >
                              <Video className="h-5 w-5 group-hover:scale-110 transition-transform" />
                              دخول الحصة المباشرة
                              <ArrowLeft className="h-4 w-4 mr-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </a>
                          ) : (
                            <div className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-slate-500 rounded-2xl font-bold text-sm cursor-not-allowed border border-white/5">
                              <Video className="h-5 w-5 opacity-30" />
                              رابط الزووم غير متوفر
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent w-full mb-12" />
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center">
            <School className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">
            © {new Date().getFullYear()} مدرسة الرفعة النموذجية. نظام الإدارة الذكي.
          </p>
        </div>
      </footer>
    </div>
  );
}
