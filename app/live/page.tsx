'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Clock, ShieldCheck, Video, Users, 
  BookOpen, ChevronLeft, Send, Activity, GraduationCap
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';

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
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // إعدادات نافذة الضيوف (Gatekeeper Modal)
  const [selectedClass, setSelectedClass] = useState<ActiveClass | null>(null);
  const [visitorForm, setVisitorForm] = useState({ name: '', role: 'موجه فني' });
  const [isEntering, setIsEntering] = useState(false);

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch('/api/public/live-status', { cache: 'no-store' });
      const data = await res.json();
      setTimeStatus(data.status);
      setActiveClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch live status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    
    // تحديث التوقيت وجلب البيانات كل دقيقة
    const interval = setInterval(() => {
      fetchLiveStatus();
      const d = new Date();
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const kwt = new Date(utc + (3 * 3600000));
      setCurrentTime(kwt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleEnterClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.name.trim() || !selectedClass?.zoom_link) return;

    setIsEntering(true);
    try {
      // إرسال السجل للإدارة
      await fetch('/api/public/log-visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName: visitorForm.name,
          visitorRole: visitorForm.role,
          className: selectedClass.class_name,
          teacherName: selectedClass.teacher_name,
          subjectName: selectedClass.subject_name
        })
      });

      // توجيه الزائر للزووم
      window.location.href = selectedClass.zoom_link;
    } catch (error) {
      console.error(error);
      window.location.href = selectedClass!.zoom_link!;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
             <Radio className="w-16 h-16 text-indigo-500 animate-ping relative z-10" />
          </div>
          <p className="text-indigo-400 font-black tracking-widest text-sm animate-pulse">جاري الاتصال ببرج المراقبة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] font-cairo text-slate-200 selection:bg-indigo-500/30 overflow-hidden relative" dir="rtl">
      
      {/* 🌌 Architectural Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-violet-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* 🏛️ Header Section */}
      <header className="relative z-10 border-b border-white/5 bg-slate-900/50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 border border-white/10 relative overflow-hidden group">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 group-hover:scale-150 transition-transform duration-700"></div>
               <GraduationCap className="h-8 w-8 text-white relative z-10 drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-tight">مدرسة الرفعة النموذجية</h1>
              <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mt-1">بوابة التشريفات والحصص الحية</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-950/80 p-3 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex flex-col items-center px-4 border-l border-white/10 last:border-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">توقيت الكويت</span>
              <span className="text-xl font-black text-white font-mono tracking-wider">{currentTime || '--:--:--'}</span>
            </div>
            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">حالة المدرسة</span>
              {timeStatus?.type === 'class' ? (
                <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5"><Activity className="w-4 h-4 animate-pulse"/> الحصة {timeStatus.period} جارية</span>
              ) : timeStatus?.type === 'break' ? (
                <span className="text-sm font-black text-amber-400 flex items-center gap-1.5"><Clock className="w-4 h-4"/> {timeStatus.name}</span>
              ) : (
                <span className="text-sm font-black text-rose-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4"/> مغلقة حالياً</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 🚀 Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            مرحباً بالضيوف الكرام في <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">الحرم المدرسي الرقمي</span>
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            من هنا يمكنكم الاطلاع على سير العملية التعليمية والدخول المباشر للحصص الحالية. 
            تلتزم إدارة المدرسة بالشفافية المطلقة لضمان جودة التعليم.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {timeStatus?.type === 'class' ? (
            <motion.div 
              key="classes"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            >
              {activeClasses.length === 0 ? (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[3rem] p-16 text-center shadow-2xl">
                  <div className="mx-auto w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">لا توجد حصص مبثوثة حالياً</h3>
                  <p className="text-slate-400 font-medium">الوقت الحالي مخصص للحصة {timeStatus.period}، ولكن لا يبدو أن هناك دروساً مسجلة في هذا الوقت.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeClasses.map((cls, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                      key={cls.id} 
                      className="group bg-slate-900/60 backdrop-blur-xl border border-white/5 hover:border-indigo-500/50 rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col"
                    >
                      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">بث مباشر</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-white/5">الحصة {timeStatus.period}</span>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col justify-center">
                        <h4 className="text-2xl font-black text-white mb-2 group-hover:text-indigo-300 transition-colors leading-tight">{cls.subject_name}</h4>
                        <div className="space-y-3 mt-6">
                          <div className="flex items-center gap-3 text-slate-400">
                            <Users className="w-5 h-5 text-indigo-400" />
                            <span className="text-sm font-bold">{cls.class_name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400">
                            <div className="h-6 w-6 rounded-md bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-black text-slate-300">{cls.teacher_name.charAt(0)}</div>
                            <span className="text-sm font-bold">أ. {cls.teacher_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/50 mt-auto">
                        {cls.zoom_link ? (
                          <button 
                            onClick={() => setSelectedClass(cls)}
                            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20"
                          >
                            <Video className="w-5 h-5" /> دخول الفصل
                          </button>
                        ) : (
                          <button disabled className="w-full py-4 rounded-xl bg-slate-800 text-slate-500 font-black cursor-not-allowed flex items-center justify-center gap-2 border border-white/5">
                            <Video className="w-5 h-5 opacity-50" /> الرابط غير متوفر
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

          ) : timeStatus?.type === 'break' ? (
            
            <motion.div key="break" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 backdrop-blur-2xl border border-amber-500/20 rounded-[3rem] p-12 sm:p-20 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="relative z-10">
                <div className="mx-auto w-32 h-32 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                  <Clock className="w-14 h-14 text-amber-400 animate-pulse" />
                </div>
                <h3 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">{timeStatus.name}</h3>
                <p className="text-xl text-amber-200/80 font-bold mb-8">المدرسة الآن في وقت استراحة. ستستأنف الحصص في تمام الساعة <span className="font-black text-amber-400" dir="ltr">{timeStatus.end}</span>.</p>
                <div className="inline-flex flex-col items-center p-4 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md">
                   <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mb-2">الوقت المتبقي تقريباً</span>
                   <span className="text-2xl font-mono font-black text-white" dir="ltr">
                     {(() => {
                        const now = new Date();
                        const endParts = timeStatus.end!.split(':');
                        const endDate = new Date();
                        endDate.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0);
                        const diffMins = Math.ceil((endDate.getTime() - now.getTime()) / 60000);
                        return diffMins > 0 ? `${diffMins} Minutes` : 'اقتربنا...';
                     })()}
                   </span>
                </div>
              </div>
            </motion.div>

          ) : (
            
            <motion.div key="closed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[3rem] p-12 sm:p-20 text-center shadow-2xl">
              <div className="mx-auto w-32 h-32 bg-slate-800/50 border border-white/5 rounded-full flex items-center justify-center mb-8">
                <ShieldCheck className="w-14 h-14 text-slate-500" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">{timeStatus?.message || 'المدرسة مغلقة حالياً'}</h3>
              <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                انتهى الدوام المدرسي لهذا اليوم. تفتح أبواب الفصول الافتراضية يومياً من الأحد إلى الخميس في تمام الساعة 09:00 صباحاً بتوقيت الكويت.
              </p>
            </motion.div>

          )}
        </AnimatePresence>
      </main>

      {/* 🎩 The Gatekeeper Modal (نافذة التشريفات) */}
      <Dialog.Root open={!!selectedClass} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#020817]/80 backdrop-blur-md z-50 animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl z-50 outline-none animate-in zoom-in-95 duration-300" dir="rtl">
            
            <div className="text-center mb-8">
              <div className="mx-auto w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10 text-indigo-400" />
              </div>
              <Dialog.Title className="text-2xl font-black text-white tracking-tight mb-2">سجل التشريفات والزيارات</Dialog.Title>
              <p className="text-slate-400 text-sm font-bold leading-relaxed">
                يسعدنا تواجدكم في <span className="text-indigo-300 font-black">{selectedClass?.subject_name}</span>. يرجى التكرم بتسجيل بياناتكم الإدارية قبل الدخول لإشعار إدارة المدرسة.
              </p>
            </div>

            <form onSubmit={handleEnterClass} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الاسم الكريم</label>
                <input 
                  type="text" required autoFocus
                  value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})}
                  placeholder="الاسم الثلاثي..."
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الصفة الوظيفية</label>
                <select 
                  value={visitorForm.role} onChange={e => setVisitorForm({...visitorForm, role: e.target.value})}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-bold transition-all appearance-none cursor-pointer"
                >
                  <option value="موجه فني">موجه فني</option>
                  <option value="إدارة خارجية (الوزارة)">إدارة خارجية (الوزارة)</option>
                  <option value="ولي أمر">ولي أمر</option>
                  <option value="زائر / ضيف">زائر / ضيف</option>
                </select>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                <button type="button" onClick={() => setSelectedClass(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl transition-all">إلغاء</button>
                <button type="submit" disabled={isEntering} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isEntering ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Send className="w-4 h-4"/> اعتماد ودخول</>}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
