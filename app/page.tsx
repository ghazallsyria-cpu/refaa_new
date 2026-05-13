// @ts-nocheck
/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Gemini Style Edition - Mobile GPU Optimized)
 * ============================================================================
 * @file        app/page.tsx
 * @version     7.5.0 (Alive UI - Crash Free & High Performance)
 * @description الواجهة الرئيسية للحرم الرقمي، محسنة بالكامل للأداء على الموبايل.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, Image as ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
  Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, 
  X, Calendar, User, Shield, Award, GraduationCap, UserCircle, Activity, Target, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils'; 

const ICON_MAP: Record<string, any> = { 'Sparkles': Sparkles, 'Trophy': Trophy, 'Quote': Quote, 'Image': ImageIcon };

const DEFAULT_SLIDE = {
  id: 'default',
  icon_name: 'Sparkles',
  badge_text: 'نظام إدارة التعلم الذكي 2026',
  title: 'مدرسة الرفعة',
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا.',
  color_gradient: 'from-indigo-300 via-white to-blue-300',
  type: 'welcome'
};

const shieldThemes = {
  gold: { border: 'from-amber-400/40 via-amber-500/20 to-amber-700/40', glow: 'bg-amber-500/10', textPrimary: 'text-amber-300', textSecondary: 'text-amber-400/70', icon: <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 drop-shadow-md" /> },
  silver: { border: 'from-slate-300/40 via-slate-100/20 to-slate-400/40', glow: 'bg-slate-400/10', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400/70', icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 drop-shadow-md" /> },
  diamond: { border: 'from-cyan-400/40 via-blue-500/20 to-indigo-600/40', glow: 'bg-cyan-500/10', textPrimary: 'text-cyan-300', textSecondary: 'text-cyan-400/70', icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 drop-shadow-md" /> },
  royal: { border: 'from-amber-600/40 via-yellow-500/20 to-yellow-700/40', glow: 'bg-amber-900/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-500/60', icon: <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 drop-shadow-md" /> },
};

export default function DigitalCampusPage() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [hasCrashed, setHasCrashed] = useState(false);

  // حماية جلب بيانات المصادقة بأمان
  const authContext = useAuth() || {};
  const { user, authRole, isChecking } = authContext as any;
  
  const { scrollYProgress } = useScroll();
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0.2]);

  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  const [hangingRibbonUrl, setHangingRibbonUrl] = useState<string | null>(null);
  
  const [studentMemorials, setStudentMemorials] = useState<any[]>([]);
  const [teacherMemorials, setTeacherMemorials] = useState<any[]>([]);
  const [activeMemorialTab, setActiveMemorialTab] = useState<'students' | 'teachers'>('students');

  const [currentSlide, setCurrentSlide] = useState(0);
  const [fetching, setFetching] = useState(true);

  const [activeMedia, setActiveMedia] = useState<any | null>(null); 
  const [activeArticle, setActiveArticle] = useState<any | null>(null); 

  // نظام الكونسول العائم
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      setHasCrashed(true); setLogs(prev => [`❌ CRASH: ${event.message}`, ...prev]);
    };
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      setHasCrashed(true); setLogs(prev => [`⚠️ PROMISE: ${event.reason?.message || 'Error'}`, ...prev]);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  useEffect(() => {
    setMounted(true); 
    const fetchCampusContent = async () => {
      try {
        const [studioRes, magazineRes, annRes, tickerRes, heroRes, ribbonRes] = await Promise.all([
          supabase.from('school_studio').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
          supabase.from('school_magazine').select('*').order('created_at', { ascending: false }).limit(4),
          supabase.from('school_announcements').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('school_ticker').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('forum_hero_slides').select('*').eq('is_active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('school_ribbon').select('image_url').eq('id', 1).maybeSingle()
        ]);

        const { data: stdShields } = await supabase.from('student_memorials').select('id, shield_type, title, message, created_at, custom_logo_url, external_shield_url, students(users(full_name, avatar_url), sections(name, classes(name)))').order('created_at', { ascending: false }).limit(4);
        const { data: tchShields } = await supabase.from('teacher_memorials').select('id, shield_type, title, message, created_at, custom_logo_url, external_shield_url, teachers(users(full_name, avatar_url), teacher_subjects(subjects(name)))').order('created_at', { ascending: false }).limit(4);

        if (stdShields && Array.isArray(stdShields)) {
           setStudentMemorials(stdShields.map(s => {
              const studentObj = Array.isArray(s?.students) ? s?.students[0] : s?.students;
              const u = Array.isArray(studentObj?.users) ? studentObj?.users[0] : studentObj?.users;
              const sec = Array.isArray(studentObj?.sections) ? studentObj?.sections[0] : studentObj?.sections;
              const cName = Array.isArray(sec?.classes) ? sec?.classes[0]?.name : sec?.classes?.name;
              return { ...s, role: 'student', personName: u?.full_name || 'طالب', avatar: u?.avatar_url, info: `${cName || ''} - ${sec?.name || ''}` };
           }));
        }
        
        if (tchShields && Array.isArray(tchShields)) {
           setTeacherMemorials(tchShields.map(t => {
              const teacherObj = Array.isArray(t?.teachers) ? t?.teachers[0] : t?.teachers;
              const u = Array.isArray(teacherObj?.users) ? teacherObj?.users[0] : teacherObj?.users;
              const subjArray = teacherObj?.teacher_subjects;
              const subj = Array.isArray(subjArray) ? subjArray.map((ts:any)=>ts?.subjects?.name).join('، ') : '';
              return { ...t, role: 'teacher', personName: u?.full_name || 'معلم', avatar: u?.avatar_url, info: subj || 'الهيئة التعليمية' };
           }));
        }

        if (studioRes?.data) setStudioItems(studioRes.data);
        if (magazineRes?.data) setMagazineItems(magazineRes.data);
        if (annRes?.data) setAnnouncements(annRes.data);
        if (tickerRes?.data) setTickers(tickerRes.data);
        if (heroRes?.data && heroRes.data.length > 0) setHeroSlides(heroRes.data);
        if (ribbonRes?.data?.image_url) setHangingRibbonUrl(ribbonRes.data.image_url);
        
      } catch (e: any) { 
         setHasCrashed(true);
         setLogs(prev => [`❌ FETCH ERROR: ${e.message}`, ...prev]);
      } 
      finally { 
         setFetching(false); 
      }
    };
    fetchCampusContent();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 8000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const breakingNews = (tickers && tickers.length > 0) ? tickers.map(t => `✨ ${t?.content || ''}`).join('   |   ') : null;

  const portal = (() => {
    const defaultPortal = { href: '/login', text: 'الدخول للمنصة', icon: ArrowLeft };
    if (!user) return defaultPortal;
    const routes: any = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { href: routes[authRole] || '/dashboard', text: authRole === 'student' ? 'الدخول لحقيبتي' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', icon: ArrowLeft };
  })();

  const PortalIcon = portal?.icon || ArrowLeft;
  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData?.icon_name] || Sparkles;

  const pinnedArticle = magazineItems.length > 0 ? (magazineItems.find(item => item?.is_pinned) || magazineItems[0]) : null;
  const sideArticles = magazineItems.length > 0 ? magazineItems.filter(item => item?.id !== pinnedArticle?.id).slice(0, 3) : [];

  const displayedMemorials = activeMemorialTab === 'students' ? studentMemorials : teacherMemorials;

  // 🚀 إيقاف الريندر حتى يكتمل المتصفح ويتم الجلب (يمنع Hydration Crash)
  if (!mounted || isChecking || fetching) {
    return (
      <div className="h-[100dvh] bg-[#02040a] flex items-center justify-center relative overflow-hidden">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-lg"></div>
            <p className="text-indigo-400 font-black tracking-widest text-sm uppercase drop-shadow-md">تهيئة الحرم الرقمي...</p>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#02040a] text-slate-200 font-sans overflow-x-hidden relative pb-20 sm:pb-32 pt-2 sm:pt-6" dir="rtl">
      
      {/* 🚀 وحدة الكونسول الطافية تظهر فقط في حالة الانهيار */}
      {hasCrashed && (
        <div className="fixed top-0 left-0 w-full h-[50vh] bg-black/95 z-[999999] border-b-4 border-rose-600 p-4 overflow-y-auto flex flex-col shadow-2xl" dir="ltr">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2 shrink-0">
            <span className="text-rose-500 font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> SYSTEM CRASH LOG</span>
            <button onClick={() => setHasCrashed(false)} className="bg-white/20 px-3 py-1 rounded text-white text-xs">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto text-[11px] font-mono text-emerald-400 space-y-2">
            {logs.length === 0 ? <p className="text-slate-500">Waiting for error details...</p> : logs.map((log, i) => (
              <div key={i} className="bg-white/5 p-2 rounded break-words whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* 🌌 الإضاءة الخلفية المحيطية (آمنة للجوال - بدون Blur ضخم مدمر) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[60px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-blue-600/20 rounded-full blur-[50px] animate-pulse"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen"></div>
      </div>
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.5 }}
          className="absolute top-0 left-4 sm:left-16 lg:left-24 z-[60] w-14 sm:w-24 md:w-32 lg:w-44 h-[200px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-auto drop-shadow-2xl"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري */}
      {breakingNews && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 pointer-events-none">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="w-full bg-[#02040a]/80 backdrop-blur-md border border-white/10 shadow-lg rounded-full flex items-center overflow-hidden pointer-events-auto p-1.5">
             <div className="bg-indigo-600/90 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-[10px] sm:text-xs text-white flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 shadow-inner border border-indigo-400/50">
               <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse drop-shadow-md" /> عاجل
             </div>
             <div className="flex-1 overflow-hidden h-full flex items-center">
               <div className="marquee-content whitespace-nowrap font-bold text-indigo-100 text-[11px] sm:text-sm tracking-wide flex gap-12 sm:gap-16 py-2 sm:py-3 drop-shadow-md opacity-90">
                 <span>{breakingNews}</span><span>{breakingNews}</span>
               </div>
             </div>
          </motion.div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
        
        {/* 🌟 1. الواجهة الترحيبية والبطاقة الرئيسية (Hero Bento) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-h-[60vh] sm:min-h-[70vh]">
           
           <motion.div style={{ opacity: opacityHero }} className="lg:col-span-8 xl:col-span-9 bg-white/5 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 border border-indigo-500/20 shadow-lg relative overflow-hidden flex flex-col justify-center group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-125"></div>
              
              <AnimatePresence mode="wait">
                <motion.div key={currentSlideData?.id || 'default'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="relative z-10">
                  {currentSlideData?.badge_text && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[10px] sm:text-sm font-black mb-6 sm:mb-8 shadow-inner backdrop-blur-sm">
                      <SlideIcon className="w-4 h-4 text-emerald-400 drop-shadow-sm" /> {currentSlideData.badge_text}
                    </div>
                  )}
                  
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-[6rem] font-black tracking-tighter mb-4 sm:mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData?.color_gradient || 'from-indigo-300 via-white to-blue-300'} drop-shadow-lg`}>
                    {currentSlideData?.title || 'مدرسة الرفعة'}
                  </h1>
                  
                  {currentSlideData?.description && (
                    <p className="text-slate-300 text-sm sm:text-lg md:text-xl font-bold max-w-3xl leading-relaxed sm:leading-loose mb-8 sm:mb-10 drop-shadow-sm opacity-90">
                      {currentSlideData.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Link href={portal?.href || '/login'} className="group/btn relative inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 border border-indigo-400/50 text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all hover:bg-indigo-500 shadow-md active:scale-95">
                       <span>{portal?.text || 'الدخول للمنصة'}</span>
                       <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 text-white rounded-xl flex items-center justify-center group-hover/btn:-translate-x-1 transition-transform shadow-inner">
                         <PortalIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180 drop-shadow-sm" />
                       </div>
                    </Link>
                    {!user && (
                      <Link href="/about" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 backdrop-blur-md text-slate-200 border border-white/20 rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all hover:bg-white/20 hover:text-white shadow-inner active:scale-95">
                        <Compass className="w-4 h-4 opacity-70" /> استكشف المنصة
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {heroSlides && heroSlides.length > 1 && (
                <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 flex gap-2 z-30">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 shadow-inner ${currentSlide === i ? 'w-6 sm:w-8 bg-indigo-400' : 'w-2 bg-white/30 hover:bg-white/50'}`} />
                  ))}
                </div>
              )}
           </motion.div>

           {/* بطاقات الإحصائيات الجانبية */}
           <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5 sm:gap-6">
              <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-blue-500/20 shadow-inner flex-1 relative overflow-hidden group flex flex-col justify-center">
                 <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/20 blur-[30px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-[1rem] sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner mb-4 relative z-10"><Activity className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm"/></div>
                 <div className="relative z-10">
                   <div className="text-3xl sm:text-4xl font-black text-white leading-none mb-1 drop-shadow-md">منصة حية</div>
                   <div className="text-[10px] sm:text-xs font-bold text-slate-300 mt-2 leading-relaxed opacity-90">آلاف التفاعلات اليومية بين المعلمين والطلاب في بيئة رقمية آمنة.</div>
                 </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-emerald-500/20 shadow-inner flex-1 relative overflow-hidden group flex flex-col justify-center">
                 <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/20 blur-[30px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-[1rem] sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner mb-4 relative z-10"><Target className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm"/></div>
                 <div className="relative z-10">
                   <div className="text-3xl sm:text-4xl font-black text-white leading-none mb-1 drop-shadow-md">تقييم ذكي</div>
                   <div className="text-[10px] sm:text-xs font-bold text-slate-300 mt-2 leading-relaxed opacity-90">نظام اختبارات متقدم يوفر تغذية راجعة فورية لتعزيز الفهم السريع.</div>
                 </div>
              </motion.div>
           </div>
        </div>

        {/* 📣 2. الإعلانات السريعة */}
        {announcements && announcements.length > 0 && (
          <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-rose-500/20 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10 border-b border-white/10 pb-5 mb-5">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="p-2 sm:p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl sm:rounded-2xl shadow-inner"><Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300 drop-shadow-sm" /></div>
                 <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md tracking-tight">إعلانات <span className="text-rose-400">الإدارة</span></h2>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-[#0f1423]/60 p-5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border border-white/5 hover:border-rose-500/40 transition-colors shadow-inner flex flex-col justify-between group cursor-default">
                  <div>
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <span className="text-[9px] sm:text-[10px] font-black text-rose-200 bg-rose-500/30 px-2.5 py-1 rounded-md border border-rose-500/40 shadow-inner">{ann.tag || 'إعلان'}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3 opacity-70" /> {ann.created_at ? new Date(ann.created_at).toLocaleDateString('ar-SA') : ''}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white leading-relaxed drop-shadow-sm group-hover:text-rose-200 transition-colors">{ann.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🎬 3. الاستوديو البصري */}
        {studioItems && studioItems.length > 0 && (
          <div className="space-y-5 sm:space-y-6 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/20 border border-indigo-500/40 shadow-inner rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md"><Video className="w-6 h-6 text-indigo-300 drop-shadow-sm" /></div>
                 <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">المكتبة البصرية</h2>
                   <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1">نظرة حية من داخل أسوار الرفعة.</p>
                 </div>
               </div>
               <Link href="/archive/gallery" className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-white font-black text-xs sm:text-sm hover:bg-white/20 transition-all flex items-center gap-2 active:scale-95 shadow-inner backdrop-blur-sm w-fit">
                 الأرشيف المرئي <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
               </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {studioItems.slice(0, 3).map((media, index) => (
                 <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} key={media.id} className={`relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden group bg-white/5 p-1.5 cursor-pointer shadow-lg border border-white/10 ${index === 0 ? 'sm:col-span-2 lg:col-span-2 aspect-[16/9] sm:aspect-[21/9]' : 'aspect-[16/9] sm:aspect-auto'}`} onClick={() => setActiveMedia(media)}>
                   <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden bg-[#0f1423]">
                      <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700 mix-blend-luminosity hover:mix-blend-normal" />
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent z-10"></div>
                      
                      {media.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-600/80 backdrop-blur-md border border-indigo-400/50 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-1 drop-shadow-sm" fill="currentColor" />
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 px-3 py-1.5 rounded-lg bg-[#02040a]/60 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-black flex items-center gap-1.5 border border-white/10 shadow-inner">
                        {media.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-5 sm:p-6 z-20">
                        <h3 className="text-sm sm:text-lg lg:text-xl font-black text-white leading-snug drop-shadow-md line-clamp-2">{media.title}</h3>
                      </div>
                   </div>
                 </motion.div>
               ))}
            </div>
          </div>
        )}

        {/* 📰 4. المركز الإخباري */}
        {magazineItems && magazineItems.length > 0 && (
          <div className="space-y-5 sm:space-y-6 pt-10 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/20 border border-emerald-500/40 shadow-inner rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md"><Newspaper className="w-6 h-6 text-emerald-300 drop-shadow-sm" /></div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1 sm:mb-2 drop-shadow-md">المركز الإخباري</h2>
                  <p className="text-slate-400 font-bold text-xs sm:text-sm">تغطية معمارية لأهم المنجزات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 text-white font-black text-xs sm:text-sm hover:bg-white/20 transition-all flex items-center gap-2 active:scale-95 shadow-inner backdrop-blur-sm w-fit">
                الأرشيف الصحفي <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative min-h-[350px] sm:min-h-[450px] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-white/5 p-1.5 flex flex-col shadow-lg border border-white/10">
                  <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[2.25rem] overflow-hidden bg-[#0f1423]">
                     <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-1000 mix-blend-luminosity hover:mix-blend-normal" />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent z-10"></div>
                     
                     <div className="relative z-20 p-6 sm:p-8 lg:p-10 flex flex-col justify-end h-full w-full">
                       <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                         {pinnedArticle.is_pinned && <span className="px-3 py-1.5 bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 text-[9px] sm:text-[10px] font-black rounded-lg flex items-center gap-1.5 shadow-inner backdrop-blur-sm"><Star className="w-3 h-3" /> رئيسي</span>}
                         <span className="text-slate-300 text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-[#02040a]/60 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner backdrop-blur-sm"><User className="w-3 h-3 text-emerald-400 opacity-70" /> {pinnedArticle.author_name}</span>
                       </div>
                       <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight sm:leading-tight mb-3 sm:mb-4 drop-shadow-md">{pinnedArticle.title}</h3>
                       <p className="text-slate-300 font-bold text-xs sm:text-sm lg:text-base max-w-2xl line-clamp-2 mb-5 sm:mb-6 leading-relaxed opacity-90 drop-shadow-sm">{pinnedArticle.excerpt}</p>
                       
                       <div className="inline-flex items-center justify-center gap-2 text-white font-black text-xs sm:text-sm bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-white/30 transition-all w-max px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl shadow-inner active:scale-95">
                         اقرأ التفاصيل <ArrowUpRight className="w-4 h-4" />
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {sideArticles && sideArticles.length > 0 && (
                <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                  {sideArticles.map((article, idx) => (
                    <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-white/5 p-1.5 min-h-[160px] sm:min-h-[200px] flex flex-col shadow-md border border-white/10">
                       <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden bg-[#0f1423]">
                          <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700 mix-blend-luminosity hover:mix-blend-normal" />
                          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#02040a]/90 via-[#02040a]/40 to-transparent"></div>
                          <div className="relative z-20 p-5 sm:p-6 flex flex-col justify-end h-full">
                            <span className="text-emerald-300 text-[9px] sm:text-[10px] font-black mb-2 flex items-center gap-1.5 drop-shadow-md bg-[#02040a]/60 w-fit px-2 py-1 rounded-md border border-white/10 backdrop-blur-sm"><User className="w-3 h-3 opacity-70" /> {article.author_name}</span>
                            <h3 className="text-sm sm:text-base lg:text-lg font-black text-white leading-snug drop-shadow-md line-clamp-3">{article.title}</h3>
                          </div>
                       </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🏆 5. معرض الدروع الشرفية */}
        {(studentMemorials.length > 0 || teacherMemorials.length > 0) && (
          <div className="py-10 sm:py-16 relative z-10 border-t border-white/10 bg-transparent overflow-hidden mt-10">
             <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 shadow-inner">
                   <Trophy className="w-4 h-4 text-amber-400 drop-shadow-sm" />
                   <span className="text-amber-300 font-black text-[10px] sm:text-xs uppercase tracking-widest">لوحة شرف مدرسة الرفعة</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">معرض التتويج <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-300 to-amber-500">والتميز</span></h2>
             </div>

             <div className="flex justify-center relative z-20 mb-8 sm:mb-10">
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner backdrop-blur-md">
                   <button onClick={() => setActiveMemorialTab('students')} className={cn("px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95", activeMemorialTab === 'students' ? 'bg-amber-500/30 border border-amber-500/50 text-amber-200 shadow-inner' : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/10')}>
                      <GraduationCap className="w-4 h-4 opacity-80"/> شرف الطلاب
                   </button>
                   <button onClick={() => setActiveMemorialTab('teachers')} className={cn("px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95", activeMemorialTab === 'teachers' ? 'bg-amber-500/30 border border-amber-500/50 text-amber-200 shadow-inner' : 'text-slate-300 hover:text-white border border-transparent hover:bg-white/10')}>
                      <UserCircle className="w-4 h-4 opacity-80"/> شرف المعلمين
                   </button>
                </div>
             </div>

             <div className="w-full overflow-hidden relative">
                <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-[10vw] pb-10 pt-4 snap-x snap-mandatory custom-scrollbar min-h-[350px]">
                   {displayedMemorials && displayedMemorials.length > 0 ? displayedMemorials.map((memorial, i) => {
                      const theme = shieldThemes[memorial?.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
                      const isExternal = !!memorial?.external_shield_url;

                      return (
                        <motion.div key={memorial?.id || i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="snap-center shrink-0 w-[220px] sm:w-[260px] group cursor-pointer relative z-0 hover:z-20">
                           {isExternal ? (
                              <div className="relative rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 shadow-lg transition-transform duration-500 group-hover:-translate-y-4 p-2 backdrop-blur-md">
                                 <img src={memorial.external_shield_url} crossOrigin="anonymous" className="w-full h-auto rounded-[1.5rem] object-contain mix-blend-luminosity hover:mix-blend-normal transition-all" alt="Shield" />
                              </div>
                           ) : (
                              <div className={cn("relative p-[2px] rounded-t-full rounded-b-[2.5rem] shadow-2xl overflow-hidden bg-gradient-to-br transition-all duration-500 group-hover:-translate-y-4", theme.border)}>
                                 <div className={cn("absolute inset-0 blur-xl opacity-80", theme.glow)}></div>
                                 <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-t-full rounded-b-[2.5rem] pointer-events-none"></div>
                                 
                                 <div className="relative h-full w-full bg-[#02040a]/90 backdrop-blur-2xl border border-white/10 rounded-t-full rounded-b-[2.4rem] p-5 sm:p-6 flex flex-col items-center text-center overflow-hidden z-10 shadow-inner">
                                    <div className="mt-4 mb-4 p-2.5 sm:p-3 rounded-full bg-white/10 border border-white/20 shadow-inner flex items-center justify-center backdrop-blur-md">
                                       {memorial?.custom_logo_url ? <img src={memorial.custom_logo_url} crossOrigin="anonymous" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" /> : theme.icon}
                                    </div>
                                    <h3 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-white/20 pb-1.5 w-full">الرفعة النموذجية</h3>
                                    <h2 className={cn("text-base sm:text-lg font-black leading-tight mb-4 drop-shadow-md min-h-[40px] flex items-center justify-center", theme.textPrimary)}>{memorial?.title}</h2>
                                    <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 shadow-inner mx-auto mb-3", theme.border)}>
                                       {memorial?.avatar ? <img src={memorial.avatar} crossOrigin="anonymous" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all"/> : <UserCircle className="w-full h-full text-slate-500 p-1 bg-[#0f1423]"/>}
                                    </div>
                                    <p className={cn("text-sm sm:text-base font-black truncate w-full drop-shadow-sm", theme.textPrimary)}>{memorial?.personName}</p>
                                    <p className={cn("text-[9px] sm:text-[10px] font-bold mt-1.5 px-2 py-1 rounded-md border border-white/20 bg-white/10 shadow-inner", theme.textSecondary)}>{memorial?.info}</p>
                                 </div>
                              </div>
                           )}
                        </motion.div>
                      );
                   }) : (
                      <div className="w-full text-center py-16 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/10 shadow-inner backdrop-blur-md">
                         <Award className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mb-4 opacity-60 drop-shadow-sm" />
                         <p className="text-slate-300 font-bold text-xs sm:text-sm">لم يتم إصدار أي دروع في هذه الفئة بعد.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* 🚀 6. الخاتمة والدعوة (Call to Action) */}
        <div className="py-20 sm:py-32 relative z-10 text-center border-t border-white/10 mt-10">
           <div className="w-16 h-16 sm:w-24 sm:h-24 bg-indigo-500/20 border border-indigo-500/40 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_0_40px_rgba(99,102,241,0.3)] backdrop-blur-md">
             <Compass className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-300 drop-shadow-md" />
           </div>
           <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-white mb-4 sm:mb-6 tracking-tight drop-shadow-lg">جاهز للانطلاق؟</h2>
           <p className="text-slate-300 font-bold text-xs sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 drop-shadow-sm">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً على مستوى البلاد.</p>
           <Link href={portal?.href || '/login'} className="inline-flex items-center justify-center gap-2 sm:gap-3 px-8 py-3.5 sm:px-12 sm:py-5 bg-indigo-600/90 backdrop-blur-md border border-indigo-400/50 text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
             <span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" />
           </Link>
        </div>

      </div>

      {/* 🖼️ النوافذ المنبثقة (Glass Modals) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-3xl p-2 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl bg-white/5 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/20 relative flex flex-col backdrop-blur-md" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-rose-500/80 text-white rounded-xl flex items-center justify-center backdrop-blur-md transition-colors border border-white/20 shadow-inner active:scale-90"><X className="w-5 h-5" /></button>
              <div className="relative w-full flex-1 bg-[#02040a]/80 flex items-center justify-center min-h-[40vh] max-h-[70vh] sm:max-h-[85vh] p-2 sm:p-4 shadow-inner">
                {activeMedia?.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain rounded-[1.5rem] sm:rounded-[2.5rem] shadow-md border border-white/10" />) : (<img src={activeMedia?.media_url} alt={activeMedia?.title} className="w-full h-full object-contain rounded-[1.5rem] sm:rounded-[2.5rem] shadow-md border border-white/10" />)}
              </div>
              <div className="p-5 sm:p-6 bg-[#0f1423]/90 backdrop-blur-md border-t border-white/10 relative z-10"><h3 className="text-white font-black text-base sm:text-2xl drop-shadow-md text-center sm:text-right">{activeMedia?.title}</h3></div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-3xl p-2 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-4xl bg-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-white/20 relative flex flex-col max-h-[95vh] sm:max-h-[90vh] backdrop-blur-md" onClick={e => e.stopPropagation()}>
              
              <div className="relative h-48 sm:h-[350px] shrink-0 bg-[#02040a] rounded-t-[2rem] sm:rounded-t-[2.5rem] overflow-hidden m-1.5 sm:m-2">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 sm:top-5 sm:left-5 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-rose-500/80 text-white rounded-xl flex items-center justify-center backdrop-blur-md transition-colors border border-white/20 shadow-inner active:scale-90"><X className="w-5 h-5" /></button>
                <img src={activeArticle?.cover_image} alt={activeArticle?.title} className="absolute inset-0 w-full h-full object-cover rounded-[1.25rem] sm:rounded-[2rem] mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/40 to-transparent pointer-events-none"></div>
              </div>
              
              <div className="px-5 sm:px-10 pb-10 sm:pb-12 pt-4 sm:pt-6 overflow-y-auto custom-scrollbar relative z-10 bg-transparent flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5 sm:mb-8 border-b border-white/10 pb-4 sm:pb-5">
                  <span className="text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 shadow-inner flex items-center gap-1.5 text-[10px] sm:text-xs font-black drop-shadow-sm"><Calendar className="w-3.5 h-3.5 opacity-80" /> {activeArticle?.created_at ? new Date(activeArticle.created_at).toLocaleDateString('ar-SA') : ''}</span>
                  <span className="text-emerald-300 bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow-inner flex items-center gap-1.5 text-[10px] sm:text-xs font-black drop-shadow-sm"><User className="w-3.5 h-3.5 opacity-80" /> {activeArticle?.author_name}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-6 sm:mb-8 leading-tight sm:leading-tight tracking-tight drop-shadow-lg">{activeArticle?.title}</h2>
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-200 font-bold leading-relaxed">
                  <div className="text-sm sm:text-base lg:text-lg text-indigo-200 font-black mb-6 sm:mb-8 p-5 sm:p-6 bg-indigo-500/20 rounded-2xl sm:rounded-3xl border border-indigo-500/30 border-r-4 border-r-indigo-400 shadow-inner drop-shadow-md leading-relaxed">{activeArticle?.excerpt}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.6); }
        .marquee-content { display: inline-block; animation: marquee 90s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100%); } }
      `}} />
    </div>
  );
}
