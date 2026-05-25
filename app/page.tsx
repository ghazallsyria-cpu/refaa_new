// @ts-nocheck
/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Gemini Style Edition - Ultra Fast Performance)
 * ============================================================================
 * @file        app/page.tsx
 * @version     9.0.0 (The Revolution Edition - Nexus Hub Integration)
 * @description الواجهة الرئيسية الشاملة، تربط كل شرايين الموقع بتصميم زجاجي عميق.
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, Image as ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
  Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, 
  X, Calendar, User, Shield, Award, UserCircle, Activity, Target, BrainCircuit,
  Library, MessagesSquare, CalendarRange, Network, ChevronLeft, Zap
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
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا لمستقبل واعد.',
  color_gradient: 'from-indigo-300 via-white to-blue-300',
  type: 'welcome'
};

const shieldThemes = {
  gold: { border: 'border-amber-500/50', glow: 'bg-amber-500/10', textPrimary: 'text-amber-300', textSecondary: 'text-amber-400/70', icon: <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 drop-shadow-md" /> },
  silver: { border: 'border-slate-300/50', glow: 'bg-slate-400/10', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400/70', icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 drop-shadow-md" /> },
  diamond: { border: 'border-cyan-400/50', glow: 'bg-cyan-500/10', textPrimary: 'text-cyan-300', textSecondary: 'text-cyan-400/70', icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 drop-shadow-md" /> },
  royal: { border: 'border-amber-600/50', glow: 'bg-amber-900/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-500/60', icon: <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 drop-shadow-md" /> },
};

// 🌟 الخدمات الشاملة التي تربط الموقع (The Nexus Hub)
const PLATFORM_SERVICES = [
  { id: 1, title: 'منصة الاختبارات', desc: 'اختبارات دورية وتكوينية بتقييم فوري', icon: Target, color: 'emerald', link: '/exams' },
  { id: 2, title: 'الواجبات والتكليفات', desc: 'متابعة وتسليم الواجبات رقمياً', icon: BookOpen, color: 'blue', link: '/assignments' },
  { id: 3, title: 'المكتبة الرقمية', desc: 'ملازم، بنوك أسئلة، ومصادر تعليمية', icon: Library, color: 'indigo', link: '/digital-library' },
  { id: 4, title: 'المنتديات والنقاش', desc: 'مجتمع تفاعلي يجمع الطلاب بالمعلمين', icon: Network, color: 'purple', link: '/forums' },
  { id: 5, title: 'الجدول المدرسي', desc: 'متابعة الحصص والأوقات المباشرة', icon: CalendarRange, color: 'amber', link: '/schedule' },
  { id: 6, title: 'صندوق الرسائل', desc: 'تواصل آمن وفعال مع الإدارة والمعلمين', icon: MessagesSquare, color: 'rose', link: '/messages' },
];

export default function DigitalCampusPage() {
  const [mounted, setMounted] = useState(false);
  const authContext = useAuth() || {};
  const { user, authRole, isChecking } = authContext as any;
  
  const { scrollYProgress } = useScroll();
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

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

  useEffect(() => {
    setMounted(true); 
    let isSubscribed = true;

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

        if (!isSubscribed) return;

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
         console.error("Fetch Error:", e.message);
      } finally { 
         if (isSubscribed) setFetching(false); 
      }
    };
    
    fetchCampusContent();
    return () => { isSubscribed = false; };
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 6000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const breakingNews = useMemo(() => {
    return (tickers && tickers.length > 0) ? tickers.map(t => `✨ ${t?.content || ''}`).join('   |   ') : null;
  }, [tickers]);

  const portal = useMemo(() => {
    const defaultPortal = { href: '/login', text: 'تسجيل الدخول للمنصة', icon: ArrowLeft };
    if (!user) return defaultPortal;
    const routes: Record<string, string> = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { href: routes[authRole] || '/dashboard', text: authRole === 'student' ? 'الدخول لحقيبتي الذكية' : authRole === 'teacher' ? 'الدخول لقاعة المعلمين' : 'مركز القيادة والكنترول', icon: ArrowLeft };
  }, [user, authRole]);

  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData?.icon_name] || Sparkles;

  const pinnedArticle = magazineItems.length > 0 ? (magazineItems.find(item => item?.is_pinned) || magazineItems[0]) : null;
  const sideArticles = magazineItems.length > 0 ? magazineItems.filter(item => item?.id !== pinnedArticle?.id).slice(0, 3) : [];

  const displayedMemorials = activeMemorialTab === 'students' ? studentMemorials : teacherMemorials;

  if (!mounted || isChecking || fetching) {
    return (
      <div className="h-[100dvh] bg-[#02040a] flex items-center justify-center relative">
         <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-400 font-bold tracking-widest text-sm uppercase animate-pulse">تهيئة الحرم الرقمي للرفعة...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#02040a] text-slate-200 font-sans overflow-x-hidden relative pb-20 sm:pb-32 pt-2 sm:pt-6" dir="rtl">
      
      {/* 🌌 الإضاءة المحيطية العميقة */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] right-[-10%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#02040a]/0 to-transparent mix-blend-screen"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-emerald-900/10 via-[#02040a]/0 to-transparent mix-blend-screen"></div>
      </div>
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, type: 'spring' }} className="absolute top-0 left-4 sm:left-16 lg:left-24 z-[60] w-14 sm:w-24 md:w-32 lg:w-44 h-[200px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-none drop-shadow-2xl" style={{ transformOrigin: 'top center' }}>
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover opacity-95" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري */}
      <AnimatePresence>
        {breakingNews && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 pointer-events-none">
            <div className="w-full bg-[#0f1423]/90 backdrop-blur-xl border border-indigo-500/20 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.3)] rounded-full flex items-center overflow-hidden pointer-events-auto p-1">
               <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-black text-[10px] sm:text-xs text-white flex items-center gap-1.5 shrink-0 z-10 shadow-inner">
                 <BellRing className="w-3.5 h-3.5 animate-[swing_2s_ease-in-out_infinite]" /> عاجل
               </div>
               <div className="flex-1 overflow-hidden h-full flex items-center">
                 <div className="marquee-content whitespace-nowrap font-bold text-indigo-100 text-[11px] sm:text-sm tracking-wide flex gap-10 sm:gap-16 py-2">
                   <span>{breakingNews}</span><span>{breakingNews}</span>
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-20 pb-20">
        
        {/* 🌟 1. منصة القيادة والترحيب (Quantum Hero) */}
        <motion.div style={{ opacity: opacityHero, scale: scaleHero }} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-[50vh] sm:min-h-[65vh] pt-4">
            
           {/* الشاشة الترحيبية الديناميكية */}
           <div className="lg:col-span-8 xl:col-span-9 bg-[#0a0f1d]/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-center group">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-150"></div>
              
              <AnimatePresence mode="wait">
                <motion.div key={currentSlideData?.id || 'default'} initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }} transition={{ duration: 0.5, type: 'spring' }} className="relative z-10 w-full">
                  
                  {currentSlideData?.badge_text && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-black mb-6 shadow-inner backdrop-blur-md">
                      <SlideIcon className="w-4 h-4 text-emerald-400" /> {currentSlideData.badge_text}
                    </div>
                  )}
                  
                  <h1 className={`text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData?.color_gradient || 'from-indigo-200 via-white to-blue-300'} drop-shadow-lg`}>
                    {currentSlideData?.title || 'مدرسة الرفعة'}
                  </h1>
                  
                  {currentSlideData?.description && (
                    <p className="text-slate-300 text-base sm:text-lg md:text-xl font-bold max-w-2xl leading-relaxed mb-8 sm:mb-10 opacity-90 border-r-2 border-indigo-500/50 pr-4">
                      {currentSlideData.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <Link href={portal.href} className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] active:scale-95 border border-indigo-400/50">
                       <span>{portal.text}</span>
                       <portal.icon className="w-5 h-5 rotate-180" />
                    </Link>
                    {!user && (
                      <Link href="/about" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl font-black text-sm sm:text-base transition-all border border-white/10 active:scale-95 backdrop-blur-md shadow-inner">
                        <Compass className="w-5 h-5 text-emerald-400" /> استكشف المدرسة
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {heroSlides && heroSlides.length > 1 && (
                <div className="absolute bottom-6 sm:bottom-8 right-8 flex gap-2 z-30">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-8 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
                  ))}
                </div>
              )}
           </div>

           {/* بطاقات النبض والإحصائيات */}
           <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-indigo-900/40 to-[#0f1423]/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-indigo-500/20 shadow-lg flex-1 relative overflow-hidden flex flex-col justify-center group">
                 <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                 <div className="w-12 h-12 bg-indigo-500/20 text-indigo-300 rounded-2xl flex items-center justify-center mb-4 relative z-10 border border-indigo-500/30 group-hover:scale-110 transition-transform"><Activity className="w-6 h-6"/></div>
                 <div className="relative z-10">
                   <div className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">نبض حي</div>
                   <div className="text-xs sm:text-sm font-bold text-indigo-200/70 leading-relaxed">آلاف التفاعلات اليومية بين الهيئة التعليمية والطلاب عبر الشبكة المدرسية.</div>
                 </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/40 to-[#0f1423]/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-emerald-500/20 shadow-lg flex-1 relative overflow-hidden flex flex-col justify-center group">
                 <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                 <div className="w-12 h-12 bg-emerald-500/20 text-emerald-300 rounded-2xl flex items-center justify-center mb-4 relative z-10 border border-emerald-500/30 group-hover:scale-110 transition-transform"><Target className="w-6 h-6"/></div>
                 <div className="relative z-10">
                   <div className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">تقييم شامل</div>
                   <div className="text-xs sm:text-sm font-bold text-emerald-200/70 leading-relaxed">نظام اختبارات وواجبات متقدم مدعوم بتغذية راجعة وتحليل ذكي للأداء.</div>
                 </div>
              </div>
           </div>
        </motion.div>

        {/* 🧭 2. البوصلة الذكية (AI Feature Integration) */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="relative w-full rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-emerald-500/20 shadow-[0_20px_50px_-20px_rgba(16,185,129,0.2)] group cursor-pointer bg-[#0f1423]">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-indigo-900/20 opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

          <div className="relative z-10 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-right gap-6 sm:gap-8 w-full md:w-auto">
              <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400 to-indigo-500 rounded-[2rem] p-[3px] shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[1.8rem] flex items-center justify-center relative overflow-hidden group-hover:bg-transparent transition-colors duration-500">
                   <div className="absolute inset-0 bg-emerald-400/10 animate-pulse"></div>
                   <BrainCircuit className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-300 drop-shadow-lg relative z-10" />
                </div>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <span className="px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-widest border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5"><Zap className="w-3.5 h-3.5"/> حصري لمدرسة الرفعة النموذجية بنين (م-ث)</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">البوصلة الأكاديمية <span className="text-emerald-400 drop-shadow-md">للتفوق</span></h2>
                <p className="text-slate-300 text-sm sm:text-base font-bold max-w-2xl leading-relaxed opacity-90">
                  ارسم طريق نجاحك بدقة متناهية. نظام محاكاة متطور يقرأ درجاتك، يتوقع معدلك التراكمي، ويخبرك بالخطوات الدقيقة التي تحتاجها لتجاوز العام الدراسي بأعلى الدرجات وبأقل مجهود!
                </p>
              </div>
            </div>
            
            <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
              <Link href={user ? "/student/academic-compass" : "/login"} className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] active:scale-95 border border-emerald-300/50">
                اكتشف بوصلتك الآن <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 🌐 3. بوابة الخدمات الشاملة (The Nexus) */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="pt-8">
           <div className="flex flex-col items-center text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">بوابة <span className="text-indigo-400">الخدمات</span></h2>
              <p className="text-slate-400 font-bold text-sm max-w-lg">كل ما تحتاجه لإدارة مسيرتك التعليمية متوفر هنا بضغطة زر واحدة.</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {PLATFORM_SERVICES.map((service, index) => {
                 const ColorIcon = service.icon;
                 const colorClasses: Record<string, string> = {
                   'emerald': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20',
                   'blue': 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20',
                   'indigo': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/20',
                   'purple': 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20',
                   'amber': 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/20',
                   'rose': 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/20',
                 };
                 
                 return (
                   <Link href={user ? service.link : '/login'} key={index} className={`group bg-[#0a0f1d]/60 backdrop-blur-md p-6 rounded-[2rem] border transition-all duration-500 shadow-inner flex flex-col items-center text-center ${colorClasses[service.color]}`}>
                      <div className="w-16 h-16 rounded-2xl bg-white/5 shadow-inner border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-3">
                         <ColorIcon className="w-8 h-8 drop-shadow-md" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-2 drop-shadow-sm">{service.title}</h3>
                      <p className="text-xs sm:text-sm font-bold opacity-80 leading-relaxed px-4">{service.desc}</p>
                   </Link>
                 )
              })}
           </div>
        </motion.div>

        {/* 📣 4. الإعلانات الإدارية السريعة */}
        <AnimatePresence>
          {announcements && announcements.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-[#0a0f1d]/80 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-lg relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center gap-4 border-b border-white/10 pb-5 mb-6">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-inner"><Megaphone className="w-6 h-6 text-rose-400" /></div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">إعلانات <span className="text-rose-400">الإدارة</span></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-colors flex flex-col justify-between shadow-inner h-full">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black tracking-widest text-rose-200 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-lg">{ann.tag || 'إعلان'}</span>
                      <span className="text-[10px] text-slate-400 font-bold bg-[#02040a]/60 px-2 py-1 rounded-md">{ann.created_at ? new Date(ann.created_at).toLocaleDateString('ar-SA') : ''}</span>
                    </div>
                    <h3 className="text-sm font-black text-white leading-relaxed">{ann.title}</h3>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎬 5. الاستوديو البصري والمركز الإخباري */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 pt-6">
            
           {/* الاستوديو */}
           <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="xl:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Video className="w-6 h-6 text-indigo-400" /></div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">الاستوديو <span className="text-indigo-400">البصري</span></h2>
                </div>
                <Link href="/archive/gallery" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 transition-colors flex items-center gap-2">
                  الأرشيف <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
              
              {studioItems && studioItems.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {studioItems.slice(0, 4).map((media, index) => (
                      <div key={media.id} className={`relative rounded-[1.5rem] overflow-hidden bg-[#0a0f1d] cursor-pointer shadow-lg border border-white/5 group ${index === 0 ? 'sm:col-span-2 aspect-[16/9] sm:aspect-[21/9]' : 'aspect-[16/9]'}`} onClick={() => setActiveMedia(media)}>
                        <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent"></div>
                        
                        {media.media_type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-600/90 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:scale-110 transition-transform">
                              <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-black flex items-center gap-1.5">
                          {media.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-sm sm:text-base font-black text-white line-clamp-2 drop-shadow-md">{media.title}</h3>
                        </div>
                      </div>
                    ))}
                 </div>
              ) : (
                 <div className="w-full h-[300px] rounded-[2rem] border border-dashed border-white/10 flex items-center justify-center bg-white/5"><p className="text-slate-500 font-bold">لا توجد وسائط للعرض حالياً</p></div>
              )}
           </motion.div>

           {/* الأخبار */}
           <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="xl:col-span-5 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Newspaper className="w-6 h-6 text-emerald-400" /></div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">المركز <span className="text-emerald-400">الإخباري</span></h2>
                </div>
                <Link href="/archive/news" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs hover:bg-white/10 transition-colors flex items-center gap-2">
                  الأرشيف <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>

              {magazineItems && magazineItems.length > 0 ? (
                 <div className="flex flex-col gap-4 h-full">
                    {pinnedArticle && (
                      <div onClick={() => setActiveArticle(pinnedArticle)} className="cursor-pointer relative h-[250px] rounded-[1.5rem] overflow-hidden bg-[#0a0f1d] flex flex-col shadow-lg border border-white/5 group">
                        <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/40 to-transparent"></div>
                        <div className="relative z-10 p-6 flex flex-col justify-end h-full w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {pinnedArticle.is_pinned && <span className="px-2 py-1 bg-emerald-500/80 text-slate-900 text-[10px] font-black rounded-md flex items-center gap-1"><Star className="w-3 h-3" /> رئيسي</span>}
                            <span className="text-slate-200 text-[10px] font-bold flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10"><User className="w-3 h-3 text-emerald-400" /> {pinnedArticle.author_name}</span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-white leading-tight mb-2 drop-shadow-md">{pinnedArticle.title}</h3>
                          <p className="text-slate-300 text-xs line-clamp-2 opacity-90 drop-shadow-sm">{pinnedArticle.excerpt}</p>
                        </div>
                      </div>
                    )}
                    {sideArticles.slice(0, 2).map((article, idx) => (
                      <div onClick={() => setActiveArticle(article)} key={article.id} className="cursor-pointer relative rounded-[1.25rem] overflow-hidden bg-[#0a0f1d] h-[120px] flex shadow-md border border-white/5 group hover:border-emerald-500/30 transition-colors">
                        <div className="w-1/3 h-full relative overflow-hidden shrink-0">
                           <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-l from-[#02040a] to-transparent"></div>
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-center bg-[#0a0f1d]/60 backdrop-blur-sm z-10 -ml-2">
                           <span className="text-emerald-400 text-[9px] font-black mb-1.5 flex items-center gap-1"><User className="w-3 h-3" /> {article.author_name}</span>
                           <h3 className="text-xs sm:text-sm font-black text-white line-clamp-2 leading-relaxed">{article.title}</h3>
                        </div>
                      </div>
                    ))}
                 </div>
              ) : (
                 <div className="w-full h-[300px] rounded-[2rem] border border-dashed border-white/10 flex items-center justify-center bg-white/5"><p className="text-slate-500 font-bold">لا توجد أخبار للعرض حالياً</p></div>
              )}
           </motion.div>
        </div>

        {/* 🏆 6. معرض الدروع الشرفية (لوحة الشرف) */}
        {(studentMemorials.length > 0 || teacherMemorials.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="pt-16 pb-10">
             <div className="flex flex-col items-center text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 shadow-inner">
                   <Trophy className="w-5 h-5 text-amber-400" />
                   <span className="text-amber-300 font-black text-xs tracking-widest uppercase">لوحة الشرف والتميز</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white">فرسان <span className="text-amber-400">الرفعة</span></h2>
             </div>

             <div className="flex justify-center mb-8">
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                   <button onClick={() => setActiveMemorialTab('students')} className={cn("px-6 py-2.5 rounded-xl font-black text-sm transition-all", activeMemorialTab === 'students' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5')}>فرسان الطلاب</button>
                   <button onClick={() => setActiveMemorialTab('teachers')} className={cn("px-6 py-2.5 rounded-xl font-black text-sm transition-all", activeMemorialTab === 'teachers' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5')}>صناع الأجيال</button>
                </div>
             </div>

             <div className="w-full overflow-hidden px-2">
                <div className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory custom-scrollbar items-center">
                   {displayedMemorials && displayedMemorials.length > 0 ? displayedMemorials.map((memorial, i) => {
                      const theme = shieldThemes[memorial?.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
                      const isExternal = !!memorial?.external_shield_url;

                      return (
                        <div key={memorial?.id || i} className="snap-center shrink-0 w-[220px] sm:w-[260px] cursor-pointer relative group hover:-translate-y-2 transition-transform duration-300">
                           {isExternal ? (
                              <div className="rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 p-3 shadow-lg group-hover:border-amber-500/50 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all">
                                 <img src={memorial.external_shield_url} crossOrigin="anonymous" className="w-full h-auto rounded-2xl object-contain" alt="Shield" />
                              </div>
                           ) : (
                              <div className={cn("p-[2px] rounded-t-full rounded-b-[2.5rem] bg-gradient-to-br shadow-xl group-hover:shadow-[0_0_40px_rgba(245,158,11,0.2)] transition-all", theme.border)}>
                                 <div className="h-full w-full bg-[#0a0f1d] border border-white/5 rounded-t-full rounded-b-[2.4rem] p-6 flex flex-col items-center text-center relative overflow-hidden">
                                    <div className={cn("absolute inset-0 opacity-20 blur-2xl pointer-events-none mix-blend-screen", theme.glow)}></div>
                                    <div className="mt-4 mb-4 p-3 rounded-full bg-white/5 border border-white/10 shadow-inner relative z-10">
                                       {memorial?.custom_logo_url ? <img src={memorial.custom_logo_url} crossOrigin="anonymous" className="w-10 h-10 object-contain" /> : theme.icon}
                                    </div>
                                    <h2 className={cn("text-base font-black mb-4 min-h-[48px] flex items-center justify-center relative z-10", theme.textPrimary)}>{memorial?.title}</h2>
                                    <div className={cn("w-16 h-16 rounded-full overflow-hidden border-2 mb-3 shadow-md relative z-10", theme.border)}>
                                       {memorial?.avatar ? <img src={memorial.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-slate-500 p-2"/>}
                                    </div>
                                    <p className={cn("text-sm font-black truncate w-full relative z-10", theme.textPrimary)}>{memorial?.personName}</p>
                                    <p className={cn("text-[10px] font-bold mt-1.5 opacity-80 relative z-10", theme.textSecondary)}>{memorial?.info}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                      );
                   }) : (
                      <div className="w-full text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                         <p className="text-slate-400 font-bold text-sm">جاري التجهيز لإعلان لوحة الشرف القادمة...</p>
                      </div>
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {/* 🚀 7. Call to Action (نقطة الانطلاق) */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="py-20 text-center mt-10 relative">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-32 bg-indigo-500/10 blur-[100px] pointer-events-none mix-blend-screen"></div>
           <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3">
             <Compass className="w-10 h-10 text-indigo-400 drop-shadow-md" />
           </div>
           <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 drop-shadow-lg">مستعد للانطلاق؟</h2>
           <p className="text-slate-300 font-bold text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed opacity-90">انضم الآن إلى مجتمع مدرستك الرقمي. حيث كل شيء تحتاجه لتتفوق أصبح بين يديك، في منصة واحدة.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 border border-indigo-500 text-white rounded-2xl font-black text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-95">
             <span>{user ? 'العودة لمركز القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <portal.icon className="w-5 h-5 rotate-180" />
           </Link>
        </motion.div>

      </div>

      {/* 🖼️ Modals (الاستوديو والأخبار) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/95 p-4 backdrop-blur-sm" onClick={() => setActiveMedia(null)}>
            <div className="w-full max-w-5xl bg-[#0a0f1d] rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 z-50 w-12 h-12 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 hover:bg-rose-500/80 transition-colors"><X className="w-6 h-6" /></button>
              <div className="w-full flex-1 bg-black flex items-center justify-center min-h-[50vh] max-h-[80vh]">
                {activeMedia?.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain" />) : (<img src={activeMedia?.media_url} alt={activeMedia?.title} className="w-full h-full object-contain" />)}
              </div>
              <div className="p-6 bg-[#0a0f1d] border-t border-white/5"><h3 className="text-white font-black text-base sm:text-xl">{activeMedia?.title}</h3></div>
            </div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/95 p-4 backdrop-blur-sm" onClick={() => setActiveArticle(null)}>
            <div className="w-full max-w-4xl bg-[#0a0f1d] rounded-[2.5rem] overflow-hidden border border-white/10 flex flex-col max-h-[90vh] shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="relative h-56 sm:h-[350px] shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-6 left-6 z-50 w-12 h-12 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 hover:bg-rose-500/80 transition-colors"><X className="w-6 h-6" /></button>
                <img src={activeArticle?.cover_image} alt={activeArticle?.title} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-transparent"></div>
              </div>
              <div className="p-8 sm:p-10 overflow-y-auto custom-scrollbar flex-1 relative z-10 -mt-10 bg-[#0a0f1d] rounded-t-[2.5rem]">
                <div className="flex gap-3 mb-5">
                  <span className="text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg text-xs font-black tracking-widest border border-white/5">{activeArticle?.created_at ? new Date(activeArticle.created_at).toLocaleDateString('ar-SA') : ''}</span>
                  <span className="text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs font-black border border-emerald-500/20">{activeArticle?.author_name}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white mb-6 leading-tight">{activeArticle?.title}</h2>
                <div className="text-sm sm:text-base text-slate-300 leading-[1.8] font-bold bg-white/5 p-6 rounded-2xl border-r-4 border-emerald-500 shadow-inner whitespace-pre-wrap">{activeArticle?.excerpt}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
        .marquee-content { display: inline-block; animation: marquee 60s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100%); } }
      `}} />
    </div>
  );
}
