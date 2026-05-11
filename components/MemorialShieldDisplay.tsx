// @ts-nocheck
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Shield, Sparkles, Crown, DownloadCloud, X, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas-pro';

export default function MemorialShieldDisplay({ userId, role }: { userId: string, role: 'student' | 'teacher' }) {
  const [shieldData, setShieldData] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const shieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    fetchShield();
  }, [userId]);

  const fetchShield = async () => {
    try {
      const tableName = role === 'student' ? 'student_memorials' : 'teacher_memorials';
      const idColumn = role === 'student' ? 'student_id' : 'teacher_id';
      const relation = role === 'student' 
        ? 'students(users(full_name, avatar_url), sections(name, classes(name)))' 
        : 'teachers(users(full_name, avatar_url), teacher_subjects(subjects(name)))';

      const { data, error } = await supabase
        .from(tableName)
        .select(`*, ${relation}`)
        .eq(idColumn, userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      // تجهيز بيانات المستخدم
      const u = data[role === 'student' ? 'students' : 'teachers']?.users;
      const userObj = Array.isArray(u) ? u[0] : u;
      const name = userObj?.full_name || 'بدون اسم';
      const avatar = userObj?.avatar_url;
      let infoText = '';

      if (role === 'student') {
         const secObj = data.students?.sections;
         const cName = Array.isArray(secObj?.classes) ? secObj.classes[0]?.name : secObj?.classes?.name;
         infoText = `${cName || ''} - ${secObj?.name || ''}`;
      } else {
         const subjArray = data.teachers?.teacher_subjects;
         infoText = Array.isArray(subjArray) ? subjArray.map((ts:any)=>ts.subjects?.name).join('، ') : 'الهيئة التعليمية';
      }

      setUserInfo({ name, avatar, info: infoText });
      setShieldData(data);

      // إذا كانت هذه أول مرة يرى فيها الدرع، أطلق الاحتفال!
      if (!data.is_viewed) {
         setShowCelebration(true);
         // تحديث الحالة في قاعدة البيانات حتى لا يتكرر الاحتفال المزعج كل مرة
         await supabase.from(tableName).update({ is_viewed: true }).eq('id', data.id);
      }
    } catch (e) {
      console.error('Error fetching shield:', e);
    }
  };

  const downloadShield = async () => {
    if (!shieldRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(shieldRef.current, { scale: 3, backgroundColor: null, useCORS: true });
      const link = document.createElement('a');
      link.download = `درع_الرفعة_${userInfo.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert('حدث خطأ أثناء تحميل الدرع.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!shieldData) return null; // 🚀 إذا لم يكن لديه درع، يختفي المكون تماماً

  const shieldThemes = {
     gold: { border: 'from-amber-300 via-yellow-500 to-amber-700', glow: 'bg-amber-500/30', bgInner: 'bg-gradient-to-b from-[#1a150e] to-[#0a0805]', textPrimary: 'text-amber-400', textSecondary: 'text-amber-200/70', icon: <Award className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" /> },
     silver: { border: 'from-slate-300 via-slate-100 to-slate-400', glow: 'bg-slate-400/30', bgInner: 'bg-gradient-to-b from-[#1e222a] to-[#0f1115]', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400', icon: <Shield className="w-12 h-12 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]" /> },
     diamond: { border: 'from-cyan-300 via-blue-500 to-indigo-600', glow: 'bg-cyan-500/30', bgInner: 'bg-gradient-to-b from-[#0e1726] to-[#020617]', textPrimary: 'text-cyan-400', textSecondary: 'text-cyan-200/70', icon: <Sparkles className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" /> },
     royal: { border: 'from-amber-600 via-yellow-500 to-yellow-700', glow: 'bg-amber-900/40', bgInner: 'bg-[#050505]', textPrimary: 'text-amber-500', textSecondary: 'text-amber-500/60', icon: <Crown className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" /> },
  };
  
  const theme = shieldThemes[shieldData.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
  const isExternal = !!shieldData.external_shield_url;

  // 🖼️ مكون عرض الدرع الفعلي (يستخدم في البانر وفي الاحتفال)
  const ShieldRender = () => (
    <div ref={shieldRef} className={cn("relative w-[320px] aspect-[3/4] p-1 rounded-t-full rounded-b-[4rem] flex flex-col mx-auto", !isExternal && `bg-gradient-to-br ${theme.border} shadow-[0_20px_50px_rgba(0,0,0,0.5)]`)}>
       {isExternal ? (
          <img src={shieldData.external_shield_url} crossOrigin="anonymous" alt="Shield" className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
       ) : (
          <>
             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 rounded-t-full rounded-b-[4rem] pointer-events-none"></div>
             <div className={cn("relative rounded-t-[2.8rem] rounded-b-[4.8rem] h-full w-full p-8 flex flex-col items-center text-center overflow-hidden border-2 border-white/5", theme.bgInner)}>
                <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[2.8rem]"></div>
                
                <div className="mt-4 mb-6 relative w-20 h-20 flex items-center justify-center">
                   <div className={cn("absolute inset-0 blur-2xl rounded-full", theme.glow)}></div>
                   <div className="relative z-10 w-full h-full rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner flex items-center justify-center p-2 overflow-hidden">
                      {shieldData.custom_logo_url ? <img src={shieldData.custom_logo_url} crossOrigin="anonymous" className="w-full h-full object-contain drop-shadow-md" /> : theme.icon}
                   </div>
                </div>
                
                <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 border-b border-white/10 pb-2 px-6">مدرسة الرفعة النموذجية</h3>
                <h2 className={cn("text-2xl font-black leading-tight mb-6 drop-shadow-lg", theme.textPrimary)}>{shieldData.title}</h2>

                <div className={cn("w-20 h-20 rounded-full overflow-hidden border-2 p-0.5 shadow-[0_0_20px_rgba(0,0,0,0.5)] mx-auto mb-4 bg-gradient-to-br", theme.border)}>
                   <div className="w-full h-full rounded-full overflow-hidden bg-[#111]">
                      {userInfo.avatar ? <img src={userInfo.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-white/20 p-2"/>}
                   </div>
                </div>
                <p className={cn("text-xl font-black truncate w-full drop-shadow-md", theme.textPrimary)}>{userInfo.name}</p>
                <p className={cn("text-[11px] font-bold mt-1.5 px-3 py-1 rounded-md border border-white/10 bg-white/5 inline-block", theme.textSecondary)}>{userInfo.info}</p>

                <div className="mt-8 pt-5 w-full border-t border-white/10 relative z-10">
                   <p className={cn("text-xs font-bold leading-relaxed line-clamp-4", theme.textSecondary)}>{shieldData.message}</p>
                </div>
                
                <div className="mt-6 w-full flex justify-end">
                   <div className="text-left">
                      <p className="text-[8px] text-white/30 font-bold mb-1">إدارة المدرسة</p>
                      <p className={cn("text-[10px] font-black signature-font opacity-80", theme.textPrimary)}>أ. صالح مخلف المطيري</p>
                   </div>
                </div>
             </div>
          </>
       )}
    </div>
  );

  return (
    <>
      {/* 🎇 الاحتفال العظيم للمرة الأولى */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
             {/* ألعاب نارية وضوء خلفي */}
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-70 animate-pulse pointer-events-none"></div>
             
             <motion.div 
               initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
               animate={{ opacity: 1, scale: 1, rotateY: 0 }}
               exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
               transition={{ duration: 1.2, type: "spring", bounce: 0.5 }}
               className="relative z-10 flex flex-col items-center"
             >
                <div className="mb-8 text-center">
                   <motion.h1 
                     initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                     className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 drop-shadow-lg mb-2"
                   >
                     تهانينا يا بطل!
                   </motion.h1>
                   <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-amber-100/80 font-bold">هذا الدرع تتويج لتميزك وإبداعك.</motion.p>
                </div>

                <ShieldRender />

                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="mt-10 flex gap-4">
                   <button onClick={downloadShield} disabled={isDownloading} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-700 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform flex items-center gap-2">
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />} حفظ الدرع
                   </button>
                   <button onClick={() => setShowCelebration(false)} className="px-8 py-4 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-colors border border-white/20">
                      متابعة للمنصة
                   </button>
                </motion.div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏆 العرض الدائم في صفحة الطالب/المعلم (Banner) */}
      {!showCelebration && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-[#0a0a0c] border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 mb-8 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
           <div className={cn("absolute inset-0 opacity-20 pointer-events-none", theme.glow)}></div>
           <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.02\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30 pointer-events-none"></div>

           <div className="relative z-10 flex-1 text-center md:text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/10 rounded-full backdrop-blur-sm">
                 <Crown className="w-3.5 h-3.5" /> وسام شرف
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 drop-shadow-md">
                 أنت فخر الرفعة يا <span className={theme.textPrimary}>{userInfo.name.split(' ')[0]}</span>!
              </h2>
              <p className="text-slate-400 font-bold text-sm leading-relaxed max-w-lg mx-auto md:mx-0 mb-6">
                 لقد تم منحك هذا الدرع التذكاري من إدارة المدرسة تقديراً لجهودك. يمكنك تحميله بدقة عالية لمشاركته مع من تحب والافتخار به.
              </p>
              <button onClick={downloadShield} disabled={isDownloading} className={cn("px-6 py-3.5 text-white font-black rounded-xl transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2 mx-auto md:mx-0 w-full sm:w-auto bg-gradient-to-r", theme.border)}>
                 {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><DownloadCloud className="w-5 h-5" /> تحميل درع التميز</>}
              </button>
           </div>

           <div className="relative z-10 shrink-0 transform scale-75 sm:scale-90 origin-center md:origin-left">
              <ShieldRender />
           </div>
        </motion.div>
      )}
    </>
  );
}
