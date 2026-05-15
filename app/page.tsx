// @ts-nocheck
/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Gemini Style Edition - Ultra Fast Performance)
 * ============================================================================
 * @file        app/page.tsx
 * @version     8.6.0 (Added Academic Compass Banner)
 * @description الواجهة الرئيسية خالية من الكونسول ومحسنة لتجربة سلسة جداً.
 * ============================================================================
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, Image as ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
  Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, 
  X, Calendar, User, Shield, Award, GraduationCap, UserCircle, Activity, Target
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
  gold: { border: 'border-amber-500/50', glow: 'bg-amber-500/10', textPrimary: 'text-amber-300', textSecondary: 'text-amber-400/70', icon: <Award className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 drop-shadow-md" /> },
  silver: { border: 'border-slate-300/50', glow: 'bg-slate-400/10', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400/70', icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 drop-shadow-md" /> },
  diamond: { border: 'border-cyan-400/50', glow: 'bg-cyan-500/10', textPrimary: 'text-cyan-300', textSecondary: 'text-cyan-400/70', icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 drop-shadow-md" /> },
  royal: { border: 'border-amber-600/50', glow: 'bg-amber-900/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-500/60', icon: <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 drop-shadow-md" /> },
};

// إعدادات الحركة الموحدة والخفيفة
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'tween', duration: 0.3 } } };

export default function DigitalCampusPage() {
  const [mounted, setMounted] = useState(false);
  const authContext = useAuth() || {};
  const { user, authRole, isChecking } = authContext as any;
  
  const { scrollYProgress } = useScroll();
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0.5]);

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
    const defaultPortal = { href: '/login', text: 'الدخول للمنصة', icon: ArrowLeft };
    if (!user) return defaultPortal;
    const routes: any = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { href: routes[authRole] || '/dashboard', text: authRole === 'student' ? 'الدخول لحقيبتي' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', icon: ArrowLeft };
  }, [user, authRole]);

  const PortalIcon = portal?.icon || ArrowLeft;
  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData?.icon_name] || Sparkles;

  const pinnedArticle = magazineItems.length > 0 ? (magazineItems.find(item => item?.is_pinned) || magazineItems[0]) : null;
  const sideArticles = magazineItems.length > 0 ? magazineItems.filter(item => item?.id !== pinnedArticle?.id).slice(0, 3) : [];

  const displayedMemorials = activeMemorialTab === 'students' ? studentMemorials : teacherMemorials;

  if (!mounted || isChecking || fetching) {
    return (
      <div className="h-[100dvh] bg-[#02040a] flex items-center justify-center relative">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-400 font-bold tracking-widest text-sm uppercase">تهيئة الحرم الرقمي...</p>
         </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-[100dvh] bg-[#02040a] text-slate-200 font-sans overflow-x-hidden relative pb-20 sm:pb-32 pt-2 sm:pt-6" dir="rtl">
      
      {/* 🌌 الإضاءة الخلفية المحيطية (آمنة وخفيفة) */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 to-transparent"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-transparent"></div>
      </div>
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <div className="absolute top-0 left-4 sm:left-16 lg:left-24 z-[60] w-14 sm:w-24 md:w-32 lg:w-44 h-[200px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-none drop-shadow-xl" style={{ transformOrigin: 'top center' }}>
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover opacity-90" />
          </div>
        </div>
      )}

      {/* 🚨 الشريط الإخباري الخفيف */}
      {breakingNews && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 pointer-events-none">
          <div className="w-full bg-[#0f1423]/95 border border-white/10 shadow-lg rounded-full flex items-center overflow-hidden pointer-events-auto p-1">
             <div className="bg-indigo-600 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[10px] sm:text-xs text-white flex items-center gap-1.5 shrink-0 z-10">
               <BellRing className="w-3.5 h-3.5 animate-pulse" /> عاجل
             </div>
             <div className="flex-1 overflow-hidden h-full flex items-center">
               <div className="marquee-content whitespace-nowrap font-bold text-indigo-100 text-[11px] sm:text-sm tracking-wide flex gap-10 sm:gap-16 py-2">
                 <span>{breakingNews}</span><span>{breakingNews}</span>
               </div>
             </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-10">
        
        {/* 🌟 1. الواجهة الترحيبية والبطاقة الرئيسية (Hero Bento) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-h-[50vh] sm:min-h-[60vh]">
            
           <motion.div style={{ opacity: opacityHero }} variants={itemVariants} className="lg:col-span-8 xl:col-span-9 bg-[#0f1423]/80 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-10 border border-white/10 shadow-md relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 to-transparent pointer-events-none"></div>
              
              <AnimatePresence mode="wait">
                <motion.div key={currentSlideData?.id || 'default'} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="relative z-10">
                  {currentSlideData?.badge_text && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] sm:text-sm font-bold mb-4 sm:mb-6">
                      <SlideIcon className="w-4 h-4 text-emerald-400" /> {currentSlideData.badge_text}
                    </div>
                  )}
                  
                  <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-4 leading-tight text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData?.color_gradient || 'from-indigo-300 to-blue-300'}`}>
                    {currentSlideData?.title || 'مدرسة الرفعة'}
                  </h1>
                  
                  {currentSlideData?.description && (
                    <p className="text-slate-300 text-sm sm:text-lg md:text-xl font-medium max-w-2xl leading-relaxed mb-6 sm:mb-8 opacity-90">
                      {currentSlideData.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={portal?.href || '/login'} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 border border-indigo-500 text-white rounded-xl font-bold text-sm transition-colors hover:bg-indigo-500 active:scale-95">
                       <span>{portal?.text || 'الدخول للمنصة'}</span>
                       <PortalIcon className="w-4 h-4 rotate-180" />
                    </Link>
                    {!user && (
                      <Link href="/about" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm transition-colors hover:bg-white/10 active:scale-95">
                        <Compass className="w-4 h-4" /> استكشف
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {heroSlides && heroSlides.length > 1 && (
                <div className="absolute bottom-4 sm:bottom-6 right-6 flex gap-2 z-30">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-6 bg-indigo-400' : 'w-2 bg-white/20'}`} />
                  ))}
                </div>
              )}
           </motion.div>

           {/* بطاقات الإحصائيات الجانبية */}
           <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 sm:gap-6">
              <motion.div variants={itemVariants} className="bg-[#0f1423]/80 p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-md flex-1 relative overflow-hidden flex flex-col justify-center">
                 <div className="w-12 h-12 bg-blue-500/20 text-blue-300 rounded-xl flex items-center justify-center mb-3 relative z-10"><Activity className="w-6 h-6"/></div>
                 <div className="relative z-10">
                   <div className="text-2xl sm:text-3xl font-black text-white mb-1">منصة حية</div>
                   <div className="text-xs font-medium text-slate-400 opacity-90">آلاف التفاعلات اليومية بين المعلمين والطلاب.</div>
                 </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-[#0f1423]/80 p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-md flex-1 relative overflow-hidden flex flex-col justify-center">
                 <div className="w-12 h-12 bg-emerald-500/20 text-emerald-300 rounded-xl flex items-center justify-center mb-3 relative z-10"><Target className="w-6 h-6"/></div>
                 <div className="relative z-10">
                   <div className="text-2xl sm:text-3xl font-black text-white mb-1">تقييم ذكي</div>
                   <div className="text-xs font-medium text-slate-400 opacity-90">نظام اختبارات متقدم بتغذية راجعة فورية.</div>
                 </div>
              </motion.div>
           </div>
        </div>

        {/* 🧭 1.5 إعلان البوصلة الذكية (New Feature Banner) */}
        <motion.div variants={itemVariants} className="relative w-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden border border-emerald-500/20 shadow-2xl group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-[#0f1423] to-indigo-900/40 opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
            <div className="flex items-center gap-6 sm:gap-8 w-full md:w-auto">
              <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 to-indigo-500 rounded-[1.5rem] p-[2px] shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-[#0f1423] rounded-[1.4rem] flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-emerald-400/20 animate-pulse"></div>
                   <Compass className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 drop-shadow-md relative z-10" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 uppercase tracking-widest border border-emerald-500/30">جديد وحصري</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">البوصلة الذكية <span className="text-emerald-400">للتفوق</span></h2>
                <p className="text-slate-400 text-xs sm:text-sm font-bold max-w-xl leading-relaxed">
                  ارسم طريق نجاحك بدقة متناهية. نظام محاكاة متطور يقرأ درجاتك، يتوقع معدلك التراكمي، ويخبرك بالضبط بما تحتاجه لتجاوز العام الدراسي بأعلى الدرجات!
                </p>
              </div>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              <Link href={user ? "/student/academic-compass" : "/login"} className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl font-black text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95">
                اكتشف بوصلتك الآن <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 📣 2. الإعلانات السريعة */}
        {announcements && announcements.length > 0 && (
          <motion.div variants={itemVariants} className="bg-[#0f1423]/80 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-md relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
               <div className="p-2 bg-rose-500/20 rounded-xl"><Megaphone className="w-5 h-5 text-rose-300" /></div>
               <h2 className="text-xl sm:text-2xl font-black text-white">إعلانات <span className="text-rose-400">الإدارة</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-[#02040a]/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-rose-200 bg-rose-500/30 px-2 py-0.5 rounded">{ann.tag || 'إعلان'}</span>
                    <span className="text-[10px] text-slate-400">{ann.created_at ? new Date(ann.created_at).toLocaleDateString('ar-SA') : ''}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-relaxed">{ann.title}</h3>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🎬 3. الاستوديو البصري */}
        {studioItems && studioItems.length > 0 && (
          <motion.div variants={itemVariants} className="pt-6">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center"><Video className="w-5 h-5 text-indigo-300" /></div>
                 <h2 className="text-xl sm:text-2xl font-black text-white">المكتبة البصرية</h2>
               </div>
               <Link href="/archive/gallery" className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">
                 الأرشيف <ArrowLeft className="w-3 h-3 inline-block" />
               </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {studioItems.slice(0, 3).map((media, index) => (
                 <div key={media.id} className={`relative rounded-[1.25rem] overflow-hidden bg-white/5 cursor-pointer shadow-md border border-white/10 ${index === 0 ? 'sm:col-span-2 aspect-[16/9]' : 'aspect-[16/9] sm:aspect-auto'}`} onClick={() => setActiveMedia(media)}>
                    <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] to-transparent"></div>
                    
                    {media.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-600/80 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-[10px] font-bold flex items-center gap-1">
                      {media.media_type === 'video' ? <Video className="w-3 h-3 text-indigo-400" /> : <ImageIcon className="w-3 h-3 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold text-white line-clamp-2">{media.title}</h3>
                    </div>
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {/* 📰 4. المركز الإخباري */}
        {magazineItems && magazineItems.length > 0 && (
          <motion.div variants={itemVariants} className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center"><Newspaper className="w-5 h-5 text-emerald-300" /></div>
                <h2 className="text-xl sm:text-2xl font-black text-white">المركز الإخباري</h2>
              </div>
              <Link href="/archive/news" className="px-4 py-2 rounded-lg bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">
                الأرشيف <ArrowLeft className="w-3 h-3 inline-block" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {pinnedArticle && (
                <div onClick={() => setActiveArticle(pinnedArticle)} className="lg:col-span-8 cursor-pointer relative min-h-[300px] rounded-[1.5rem] overflow-hidden bg-white/5 flex flex-col shadow-md border border-white/10">
                   <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent"></div>
                   
                   <div className="relative z-10 p-6 flex flex-col justify-end h-full w-full">
                     <div className="flex flex-wrap items-center gap-2 mb-3">
                       {pinnedArticle.is_pinned && <span className="px-2 py-1 bg-emerald-500/30 text-emerald-200 text-[10px] font-bold rounded flex items-center gap-1"><Star className="w-3 h-3" /> رئيسي</span>}
                       <span className="text-slate-300 text-[10px] font-bold flex items-center gap-1 bg-[#02040a]/80 px-2 py-1 rounded"><User className="w-3 h-3 text-emerald-400" /> {pinnedArticle.author_name}</span>
                     </div>
                     <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">{pinnedArticle.title}</h3>
                     <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 mb-4 opacity-90">{pinnedArticle.excerpt}</p>
                   </div>
                </div>
              )}

              {sideArticles && sideArticles.length > 0 && (
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {sideArticles.map((article, idx) => (
                    <div onClick={() => setActiveArticle(article)} key={article.id} className="flex-1 cursor-pointer relative rounded-[1.25rem] overflow-hidden bg-white/5 min-h-[120px] flex flex-col shadow border border-white/10">
                        <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] to-transparent"></div>
                        <div className="relative z-10 p-4 flex flex-col justify-end h-full">
                          <span className="text-emerald-300 text-[9px] font-bold mb-1 flex items-center gap-1 bg-[#02040a]/80 w-fit px-1.5 py-0.5 rounded"><User className="w-3 h-3" /> {article.author_name}</span>
                          <h3 className="text-sm font-bold text-white line-clamp-2">{article.title}</h3>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 🏆 5. معرض الدروع الشرفية */}
        {(studentMemorials.length > 0 || teacherMemorials.length > 0) && (
          <motion.div variants={itemVariants} className="pt-10">
             <div className="flex flex-col items-center text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
                   <Trophy className="w-4 h-4 text-amber-400" />
                   <span className="text-amber-300 font-bold text-[10px]">لوحة الشرف</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white">معرض <span className="text-amber-400">التميز</span></h2>
             </div>

             <div className="flex justify-center mb-6">
                <div className="flex bg-white/10 p-1 rounded-xl">
                   <button onClick={() => setActiveMemorialTab('students')} className={cn("px-4 py-2 rounded-lg font-bold text-xs transition-colors", activeMemorialTab === 'students' ? 'bg-amber-500/30 text-amber-200' : 'text-slate-300')}>الطلاب</button>
                   <button onClick={() => setActiveMemorialTab('teachers')} className={cn("px-4 py-2 rounded-lg font-bold text-xs transition-colors", activeMemorialTab === 'teachers' ? 'bg-amber-500/30 text-amber-200' : 'text-slate-300')}>المعلمون</button>
                </div>
             </div>

             <div className="w-full overflow-hidden">
                <div className="flex overflow-x-auto gap-4 pb-6 pt-2 snap-x snap-mandatory custom-scrollbar">
                   {displayedMemorials && displayedMemorials.length > 0 ? displayedMemorials.map((memorial, i) => {
                      const theme = shieldThemes[memorial?.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
                      const isExternal = !!memorial?.external_shield_url;

                      return (
                        <div key={memorial?.id || i} className="snap-center shrink-0 w-[200px] cursor-pointer relative">
                           {isExternal ? (
                              <div className="rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 p-2">
                                 <img src={memorial.external_shield_url} crossOrigin="anonymous" className="w-full h-auto rounded-xl object-contain" alt="Shield" />
                              </div>
                           ) : (
                              <div className={cn("p-[1px] rounded-t-full rounded-b-[2rem] bg-gradient-to-br", theme.border)}>
                                 <div className="h-full w-full bg-[#0f1423] border border-white/10 rounded-t-full rounded-b-[1.9rem] p-4 flex flex-col items-center text-center">
                                    <div className="mt-2 mb-3 p-2 rounded-full bg-white/5 border border-white/10">
                                       {memorial?.custom_logo_url ? <img src={memorial.custom_logo_url} crossOrigin="anonymous" className="w-8 h-8 object-contain" /> : theme.icon}
                                    </div>
                                    <h2 className={cn("text-sm font-black mb-3 min-h-[35px] flex items-center justify-center", theme.textPrimary)}>{memorial?.title}</h2>
                                    <div className={cn("w-12 h-12 rounded-full overflow-hidden border-2 mb-2", theme.border)}>
                                       {memorial?.avatar ? <img src={memorial.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-slate-500 p-1"/>}
                                    </div>
                                    <p className={cn("text-xs font-bold truncate w-full", theme.textPrimary)}>{memorial?.personName}</p>
                                    <p className={cn("text-[9px] mt-1 text-slate-400", theme.textSecondary)}>{memorial?.info}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                      );
                   }) : (
                      <div className="w-full text-center py-10 bg-white/5 rounded-2xl">
                         <p className="text-slate-400 font-bold text-xs">لا يوجد بيانات للعرض حالياً.</p>
                      </div>
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {/* 🚀 6. Call to Action */}
        <motion.div variants={itemVariants} className="py-16 text-center border-t border-white/10 mt-6">
           <div className="w-16 h-16 bg-indigo-500/20 rounded-[1.2rem] flex items-center justify-center mx-auto mb-4">
             <Compass className="w-8 h-8 text-indigo-400" />
           </div>
           <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">جاهز للانطلاق؟</h2>
           <p className="text-slate-400 font-medium text-xs sm:text-sm mb-6 max-w-lg mx-auto">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى.</p>
           <Link href={portal?.href || '/login'} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 border border-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-colors">
             <span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-4 h-4" />
           </Link>
        </motion.div>

      </div>

      {/* 🖼️ Modals */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/95 p-4" onClick={() => setActiveMedia(null)}>
            <div className="w-full max-w-4xl bg-[#0f1423] rounded-3xl overflow-hidden border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
              <div className="w-full flex-1 bg-black flex items-center justify-center min-h-[40vh] max-h-[70vh]">
                {activeMedia?.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain" />) : (<img src={activeMedia?.media_url} alt={activeMedia?.title} className="w-full h-full object-contain" />)}
              </div>
              <div className="p-4 bg-[#0f1423]"><h3 className="text-white font-bold text-sm sm:text-lg">{activeMedia?.title}</h3></div>
            </div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/95 p-4" onClick={() => setActiveArticle(null)}>
            <div className="w-full max-w-3xl bg-[#0f1423] rounded-3xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="relative h-48 sm:h-[250px] shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
                <img src={activeArticle?.cover_image} alt={activeArticle?.title} className="w-full h-full object-cover opacity-80" />
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex gap-3 mb-4">
                  <span className="text-slate-400 bg-white/10 px-2 py-1 rounded text-[10px] font-bold">{activeArticle?.created_at ? new Date(activeArticle.created_at).toLocaleDateString('ar-SA') : ''}</span>
                  <span className="text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">{activeArticle?.author_name}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mb-4">{activeArticle?.title}</h2>
                <div className="text-sm text-slate-300 leading-relaxed font-medium bg-white/5 p-4 rounded-xl border-r-2 border-emerald-500">{activeArticle?.excerpt}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .marquee-content { display: inline-block; animation: marquee 90s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100%); } }
      `}} />
    </motion.div>
  );
}
