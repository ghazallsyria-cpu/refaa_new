// @ts-nocheck
/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Gemini Style Edition)
 * ============================================================================
 * @file        app/page.tsx
 * @version     5.0.0 (Alive UI - Holographic Campus)
 * @description الواجهة الرئيسية للحرم الرقمي مع واجهات زجاجية وشفافية مطلقة.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
  Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, 
  X, Calendar, User, Shield, Award, GraduationCap, UserCircle
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
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا. تواصل، تعلم، واكتشف إمكانياتك في حرمنا الرقمي.',
  color_gradient: 'from-indigo-300 via-white to-emerald-300',
  type: 'welcome'
};

const shieldThemes = {
  gold: { border: 'from-amber-300 via-yellow-500 to-amber-700', glow: 'bg-amber-500/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-200/70', icon: <Award className="w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" /> },
  silver: { border: 'from-slate-300 via-slate-100 to-slate-400', glow: 'bg-slate-400/20', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400', icon: <Shield className="w-8 h-8 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)]" /> },
  diamond: { border: 'from-cyan-300 via-blue-500 to-indigo-600', glow: 'bg-cyan-500/20', textPrimary: 'text-cyan-400', textSecondary: 'text-cyan-200/70', icon: <Sparkles className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" /> },
  royal: { border: 'from-amber-600 via-yellow-500 to-yellow-700', glow: 'bg-amber-900/30', textPrimary: 'text-amber-500', textSecondary: 'text-amber-500/60', icon: <Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" /> },
};

export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

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
    const fetchCampusContent = async () => {
      try {
        const [studioRes, magazineRes, annRes, tickerRes, heroRes, ribbonRes] = await Promise.all([
          supabase.from('school_studio').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
          supabase.from('school_magazine').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('school_announcements').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('school_ticker').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('forum_hero_slides').select('*').eq('is_active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('school_ribbon').select('image_url').eq('id', 1).maybeSingle()
        ]);

        const { data: stdShields } = await supabase.from('student_memorials').select('id, shield_type, title, message, created_at, custom_logo_url, external_shield_url, students(users(full_name, avatar_url), sections(name, classes(name)))').order('created_at', { ascending: false }).limit(6);
        const { data: tchShields } = await supabase.from('teacher_memorials').select('id, shield_type, title, message, created_at, custom_logo_url, external_shield_url, teachers(users(full_name, avatar_url), teacher_subjects(subjects(name)))').order('created_at', { ascending: false }).limit(6);

        if (stdShields) {
           setStudentMemorials(stdShields.map(s => {
              const u = Array.isArray(s.students?.users) ? s.students.users[0] : s.students?.users;
              const sec = s.students?.sections;
              const cName = Array.isArray(sec?.classes) ? sec.classes[0]?.name : sec?.classes?.name;
              return { ...s, role: 'student', personName: u?.full_name || 'طالب', avatar: u?.avatar_url, info: `${cName || ''} - ${sec?.name || ''}` };
           }));
        }
        
        if (tchShields) {
           setTeacherMemorials(tchShields.map(t => {
              const u = Array.isArray(t.teachers?.users) ? t.teachers.users[0] : t.teachers?.users;
              const subjArray = t.teachers?.teacher_subjects;
              const subj = Array.isArray(subjArray) ? subjArray.map((ts:any)=>ts.subjects?.name).join('، ') : '';
              return { ...t, role: 'teacher', personName: u?.full_name || 'معلم', avatar: u?.avatar_url, info: subj || 'الهيئة التعليمية' };
           }));
        }

        if (studioRes.data) setStudioItems(studioRes.data);
        if (magazineRes.data) setMagazineItems(magazineRes.data);
        if (annRes.data) setAnnouncements(annRes.data);
        if (tickerRes.data) setTickers(tickerRes.data);
        if (heroRes.data && heroRes.data.length > 0) setHeroSlides(heroRes.data);
        if (ribbonRes.data?.image_url) setHangingRibbonUrl(ribbonRes.data.image_url);
      } catch (e) { console.error("Content fetch failed", e); } 
      finally { setFetching(false); }
    };
    fetchCampusContent();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 8000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const breakingNews = tickers.length > 0 ? tickers.map(t => `✨ ${t.content}`).join('   |   ') : null;

  const portal = (() => {
    if (!user) return { href: '/login', text: 'الدخول للمنصة', icon: ArrowLeft };
    const routes: any = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { href: routes[authRole] || '/dashboard', text: authRole === 'student' ? 'الدخول لحقيبتي' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', icon: ArrowLeft };
  })();

  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 4);

  const displayedMemorials = activeMemorialTab === 'students' ? studentMemorials : teacherMemorials;

  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-transparent flex items-center justify-center relative overflow-hidden">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
            <p className="text-indigo-300 font-black tracking-widest text-xs sm:text-sm uppercase drop-shadow-md">تهيئة الحرم الرقمي...</p>
         </motion.div>
      </div>
    );
  }

  return (
    // 🚀 التعديل الأهم: bg-transparent لكي تظهر الأجرام السماوية في layout.tsx
    <div className="min-h-screen bg-transparent text-slate-200 font-sans overflow-x-hidden selection:bg-indigo-500/30 relative pb-20 sm:pb-0" dir="rtl">
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.5 }}
          whileHover={{ rotate: [-1, 1, -0.5, 0.5, 0], scale: 1.02 }}
          className="absolute top-0 left-4 sm:left-16 lg:left-24 z-[60] w-12 sm:w-24 md:w-32 lg:w-44 h-[180px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-auto drop-shadow-[0_15px_20px_rgba(0,0,0,0.8)]"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري (زجاجي) */}
      {breakingNews && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-[90%] max-w-4xl z-50 pointer-events-none">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="w-full glass-panel rounded-full flex items-center overflow-hidden pointer-events-auto border-white/10 p-1">
             <div className="bg-indigo-600/80 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-[10px] sm:text-xs text-white flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 shadow-lg border border-indigo-400/30">
               <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> عاجل
             </div>
             <div className="flex-1 overflow-hidden h-full flex items-center">
               <div className="marquee-content whitespace-nowrap font-bold text-slate-200 text-[11px] sm:text-sm tracking-wide flex gap-12 sm:gap-16 py-2 sm:py-3 drop-shadow-md">
                 <span>{breakingNews}</span><span>{breakingNews}</span>
               </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* 🌟 1. الواجهة الترحيبية */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
        <motion.div style={{ y: yBackground, opacity: opacityHero }} className="absolute inset-0 z-0 pointer-events-none">
          {/* شبكة خفيفة جداً لتعزيز العمق */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)]"></div>
        </motion.div>

        <div className="absolute top-6 right-4 sm:top-10 sm:right-8 z-50">
          <Link href={portal.href} className="group relative inline-flex items-center gap-2 sm:gap-3 px-5 py-2.5 sm:px-8 sm:py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full font-black text-[11px] sm:text-sm transition-all hover:bg-white hover:text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95">
             <span>{portal.text}</span>
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white text-black group-hover:bg-black group-hover:text-white rounded-full flex items-center justify-center group-hover:-translate-x-1 transition-all">
               <portal.icon className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
             </div>
          </Link>
        </div>

        <div className="relative z-10 text-center max-w-6xl px-4 sm:px-6 w-full flex flex-col items-center mt-6 sm:mt-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlideData.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center w-full">
              
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-full glass-panel border-indigo-500/30 text-indigo-300 text-[10px] sm:text-sm font-black mb-6 sm:mb-8 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <SlideIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" /> {currentSlideData.badge_text}
                </div>
              )}
              
              <h1 className={`text-5xl leading-[1.1] sm:text-7xl md:text-[8rem] lg:text-[9rem] font-black tracking-tighter mb-4 sm:mb-8 text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-300 via-white to-emerald-300'} drop-shadow-2xl`}>
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-slate-300 text-sm sm:text-xl md:text-2xl font-bold max-w-2xl mx-auto leading-relaxed sm:leading-relaxed mb-8 sm:mb-12 px-2 drop-shadow-md">
                  {currentSlideData.description}
                </p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-10 sm:mb-12">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="glass-panel rounded-[1.5rem] sm:rounded-[2.5rem] p-2 sm:p-3 flex items-center gap-3 sm:gap-5 pr-4 sm:pr-6 group">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 w-5 h-5 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] z-10 rotate-12" />
                        <img src={student.img} alt={student.name} className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border border-white/20 sm:border-2 sm:border-white/10 object-cover shadow-lg" />
                      </div>
                      <div className="text-right py-1 sm:py-2">
                        <p className="text-xs sm:text-lg font-black text-white drop-shadow-sm">{student.name}</p>
                        <p className="text-[9px] sm:text-sm font-bold text-emerald-400">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 relative group glass-panel p-2">
                    <img src={currentSlideData.media_url} alt="Hero Media" className="w-full h-auto rounded-[1.5rem] sm:rounded-[2.5rem] max-h-[300px] sm:max-h-[500px] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                 </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-30 glass-panel p-2 sm:p-3 rounded-full">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-6 sm:w-10 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'w-1.5 sm:w-2.5 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </section>

      {/* 🏆 2. معرض الدروع الشرفية (زجاجي بالكامل) */}
      {(studentMemorials.length > 0 || teacherMemorials.length > 0) && (
        <section className="py-14 sm:py-20 relative z-10 border-t border-white/5 bg-transparent overflow-hidden">
           
           <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
              <div className="flex flex-col items-center text-center mb-6">
                 <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel border-amber-500/30 rounded-full mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-black text-xs uppercase tracking-widest">لوحة شرف مدرسة الرفعة</span>
                 </div>
                 <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">معرض التتويج <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-200 to-amber-500">والتميز</span></h2>
              </div>

              {/* 🚀 التبويبات الفاصلة (Tabs) */}
              <div className="flex justify-center relative z-20">
                 <div className="flex glass-panel p-1.5 rounded-2xl">
                    <button onClick={() => setActiveMemorialTab('students')} className={cn("px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2", activeMemorialTab === 'students' ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-400 hover:text-slate-200 border border-transparent')}>
                       <GraduationCap className="w-4 h-4"/> شرف الطلاب
                    </button>
                    <button onClick={() => setActiveMemorialTab('teachers')} className={cn("px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2", activeMemorialTab === 'teachers' ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-slate-400 hover:text-slate-200 border border-transparent')}>
                       <UserCircle className="w-4 h-4"/> شرف المعلمين
                    </button>
                 </div>
              </div>
           </div>

           <div className="w-full overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-r from-[#02040a] to-transparent z-10 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-l from-[#02040a] to-transparent z-10 pointer-events-none"></div>
              
              <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-[10vw] pb-10 pt-4 snap-x snap-mandatory hide-scrollbar min-h-[400px]">
                 {displayedMemorials.length > 0 ? displayedMemorials.map((memorial, i) => {
                    const theme = shieldThemes[memorial.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
                    const isExternal = !!memorial.external_shield_url;

                    return (
                      <motion.div key={memorial.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="snap-center shrink-0 w-[240px] sm:w-[280px] group cursor-pointer relative z-0 hover:z-20">
                         {isExternal ? (
                            <div className="relative rounded-[2rem] overflow-hidden glass-panel transition-transform duration-500 group-hover:-translate-y-4 p-2">
                               <img src={memorial.external_shield_url} crossOrigin="anonymous" className="w-full h-auto rounded-[1.5rem] object-contain" alt="Shield" />
                            </div>
                         ) : (
                            <div className={cn("relative p-[2px] rounded-t-full rounded-b-[3rem] shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden bg-gradient-to-br transition-transform duration-500 group-hover:-translate-y-4 group-hover:shadow-[0_30px_60px_rgba(245,158,11,0.2)]", theme.border)}>
                               <div className={cn("absolute inset-0 blur-3xl opacity-60", theme.glow)}></div>
                               <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 rounded-t-full rounded-b-[3rem] pointer-events-none"></div>
                               {/* 🚀 البطاقة الزجاجية الداخلية للدرع */}
                               <div className="relative h-full w-full bg-[#02040a]/80 backdrop-blur-xl border border-white/5 rounded-t-full rounded-b-[2.8rem] p-6 flex flex-col items-center text-center overflow-hidden z-10">
                                  <div className="mt-4 mb-4 p-3 rounded-full bg-white/5 border border-white/10 shadow-inner flex items-center justify-center">
                                     {memorial.custom_logo_url ? <img src={memorial.custom_logo_url} crossOrigin="anonymous" className="w-10 h-10 object-contain drop-shadow-lg" /> : theme.icon}
                                  </div>
                                  <h3 className="text-[8px] font-black uppercase tracking-widest text-white/50 mb-2 border-b border-white/10 pb-1 w-full">الرفعة النموذجية</h3>
                                  <h2 className={cn("text-lg font-black leading-tight mb-4 drop-shadow-xl min-h-[50px] flex items-center justify-center", theme.textPrimary)}>{memorial.title}</h2>
                                  <div className={cn("w-14 h-14 rounded-full overflow-hidden border-2 shadow-xl mx-auto mb-3", theme.border)}>
                                     {memorial.avatar ? <img src={memorial.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <UserCircle className="w-full h-full text-white/20 p-1 bg-[#111]"/>}
                                  </div>
                                  <p className={cn("text-base font-black truncate w-full drop-shadow-md", theme.textPrimary)}>{memorial.personName}</p>
                                  <p className={cn("text-[9px] font-bold mt-1 px-2 py-0.5 rounded-md border border-white/10 bg-white/5", theme.textSecondary)}>{memorial.info}</p>
                               </div>
                            </div>
                         )}
                      </motion.div>
                    );
                 }) : (
                    <div className="w-full text-center py-16 flex flex-col items-center justify-center glass-panel rounded-3xl">
                       <Award className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                       <p className="text-slate-400 font-bold">لم يتم إصدار أي دروع في هذه الفئة بعد.</p>
                    </div>
                 )}
              </div>
           </div>
        </section>
      )}

      {/* 📣 3. الإعلانات السريعة (زجاجية) */}
      {announcements.length > 0 && (
        <section className="py-14 sm:py-20 relative z-10 border-t border-white/5 bg-transparent">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-10 sm:mb-14">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-500/20 border border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.3)] rounded-2xl sm:rounded-[2rem] flex items-center justify-center backdrop-blur-md"><Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400" /></div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">إعلانات <span className="text-transparent bg-clip-text bg-gradient-to-l from-rose-400 to-rose-600">سريعة</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {announcements.map((ann) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={ann.id} className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative group overflow-hidden flex flex-col justify-between min-h-[160px] sm:min-h-[220px]">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <span className="text-[10px] sm:text-xs font-black text-rose-300 bg-rose-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-rose-500/30 shadow-inner">{ann.tag || 'إعلان'}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5"><Calendar className="w-3 sm:w-4 h-3 sm:h-4" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white leading-snug drop-shadow-md">{ann.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🎬 4. الاستوديو البصري (كروت زجاجية) */}
      {studioItems.length > 0 && (
        <section className="py-16 sm:py-28 relative z-10 bg-transparent border-y border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.3)] rounded-2xl sm:rounded-[2rem] flex items-center justify-center backdrop-blur-md"><Video className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" /></div>
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-1 sm:mb-2 drop-shadow-md">المكتبة البصرية</h2>
                <p className="text-slate-300 font-bold text-xs sm:text-base">نظرة حية من داخل أسوار الرفعة.</p>
              </div>
            </div>
            <Link href="/archive/gallery" className="px-6 sm:px-8 py-3 sm:py-4 rounded-full glass-panel text-white font-black text-xs sm:text-sm hover:bg-white/10 transition-all flex items-center gap-2 sm:gap-3 active:scale-95">
              تصفح الأرشيف <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4" />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 snap-x snap-mandatory hide-scrollbar relative z-10" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} key={media.id} className="relative shrink-0 w-[80vw] sm:w-[450px] aspect-[4/3] rounded-[2rem] sm:rounded-[3rem] overflow-hidden snap-center group glass-panel p-2 cursor-pointer" onClick={() => setActiveMedia(media)}>
                <div className="relative w-full h-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
                   <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700" />
                   <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#02040a]/90 via-[#02040a]/50 to-transparent z-10"></div>
                   
                   {media.media_type === 'video' && (
                     <div className="absolute inset-0 flex items-center justify-center z-20">
                       <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-indigo-600/80 backdrop-blur-md border border-indigo-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
                         <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1 sm:ml-2" fill="currentColor" />
                       </div>
                     </div>
                   )}
                   
                   <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 border border-white/10 shadow-inner">
                     {media.media_type === 'video' ? <Video className="w-3 sm:w-4 h-3 sm:h-4 text-indigo-400" /> : <ImageIcon className="w-3 sm:w-4 h-3 sm:h-4 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                   </div>

                   <div className="absolute bottom-0 left-0 w-full p-5 sm:p-8 z-20">
                     <h3 className="text-base sm:text-2xl font-black text-white leading-snug drop-shadow-lg line-clamp-2">{media.title}</h3>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 📰 5. المركز الإخباري (زجاجي) */}
      {magazineItems.length > 0 && (
        <section className="py-16 sm:py-28 relative z-10 bg-transparent">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8 mb-10 sm:mb-16">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-2xl sm:rounded-[2rem] flex items-center justify-center backdrop-blur-md"><Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" /></div>
                <div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-1 sm:mb-2 drop-shadow-md">المركز الإخباري</h2>
                  <p className="text-slate-300 font-bold text-xs sm:text-base">تغطية معمارية لأهم المنجزات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-6 sm:px-8 py-3 sm:py-4 rounded-full glass-panel text-white font-black text-xs sm:text-sm hover:bg-white/10 transition-all flex items-center gap-2 sm:gap-3 active:scale-95">
                الأرشيف الصحفي <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
              
              {/* الخبر الرئيسي */}
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-7 xl:col-span-8 group cursor-pointer relative h-[380px] sm:h-[500px] lg:h-[650px] rounded-[2rem] sm:rounded-[3rem] overflow-hidden glass-panel p-2 flex flex-col">
                  <div className="relative w-full h-full rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
                     <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-1000" />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent z-10"></div>
                     
                     <div className="relative z-20 p-6 sm:p-10 lg:p-14 flex flex-col justify-end h-full">
                       <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                         {pinnedArticle.is_pinned && <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500/90 backdrop-blur-md text-[#020617] shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400 text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl flex items-center gap-1.5"><Star className="w-3 h-3 sm:w-4 sm:h-4" /> رئيسي</span>}
                         <span className="text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-white/10 shadow-inner"><User className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" /> {pinnedArticle.author_name}</span>
                       </div>
                       <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.3] sm:leading-[1.2] mb-3 sm:mb-6 drop-shadow-2xl">{pinnedArticle.title}</h3>
                       <p className="text-slate-200 font-bold text-xs sm:text-base lg:text-lg max-w-3xl line-clamp-2 mb-6 sm:mb-8 leading-relaxed opacity-90 drop-shadow-md">{pinnedArticle.excerpt}</p>
                       
                       <div className="inline-flex items-center justify-center gap-2 text-white font-black text-xs sm:text-sm bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white hover:text-black transition-all w-max px-6 py-3 sm:px-8 sm:py-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                         اقرأ التفاصيل <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {/* الأخبار الفرعية */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sm:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden glass-panel p-1.5 min-h-[160px] sm:min-h-[200px] flex flex-col">
                     <div className="relative w-full h-full rounded-[1.2rem] sm:rounded-[2.2rem] overflow-hidden">
                        <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#02040a]/90 via-[#02040a]/40 to-transparent"></div>
                        <div className="relative z-20 p-5 sm:p-8 flex flex-col justify-end h-full">
                          <span className="text-emerald-400 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 flex items-center gap-1.5 drop-shadow-lg"><User className="w-3 h-3 sm:w-4 sm:h-4" /> {article.author_name}</span>
                          <h3 className="text-base sm:text-xl font-black text-white leading-snug drop-shadow-xl">{article.title}</h3>
                        </div>
                     </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🚀 6. الخاتمة والدعوة (زجاجية ومضيئة) */}
      <section className="py-20 sm:py-32 pb-32 sm:pb-40 relative z-10 bg-transparent border-t border-white/5 overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
           <div className="w-20 h-20 sm:w-28 sm:h-28 glass-panel rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
             <Compass className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-400 drop-shadow-lg" />
           </div>
           <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-white mb-6 sm:mb-8 tracking-tighter drop-shadow-2xl">جاهز للانطلاق؟</h2>
           <p className="text-slate-300 font-bold text-sm sm:text-xl md:text-2xl mb-10 sm:mb-14 max-w-2xl mx-auto leading-relaxed px-4 drop-shadow-md">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً على مستوى البلاد.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-3 sm:gap-4 px-8 py-4 sm:px-14 sm:py-7 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-black text-sm sm:text-xl hover:bg-white hover:text-black transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
             <span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
           </Link>
        </div>
      </section>

      {/* 🖼️ النوافذ المنبثقة (Glass Modals) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-2xl p-2 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl glass-panel rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-14 sm:h-14 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20 shadow-xl"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              <div className="relative w-full flex-1 bg-black/50 flex items-center justify-center min-h-[40vh] max-h-[70vh] sm:max-h-[85vh] p-2">
                {activeMedia.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain rounded-[1.5rem]" />) : (<img src={activeMedia.media_url} alt={activeMedia.title} className="w-full h-full object-contain rounded-[1.5rem]" />)}
              </div>
              <div className="p-5 sm:p-8 bg-transparent border-t border-white/5 relative z-10"><h3 className="text-white font-black text-lg sm:text-3xl drop-shadow-md">{activeMedia.title}</h3></div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-2xl p-2 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-5xl glass-panel rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
              
              <div className="relative h-56 sm:h-[400px] shrink-0 bg-black/50 rounded-t-[2rem] sm:rounded-t-[3rem] overflow-hidden m-2">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-14 sm:h-14 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-2xl transition-colors border border-white/20 shadow-xl"><X className="w-5 h-5 sm:w-7 sm:h-7" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover rounded-t-[1.5rem]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent"></div>
              </div>
              
              <div className="px-5 sm:px-16 pb-10 sm:pb-16 pt-4 sm:pt-8 overflow-y-auto custom-scrollbar relative z-10 bg-transparent">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-white/5 pb-4 sm:pb-6">
                  <span className="text-slate-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-base font-bold"><Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20"></span>
                  <span className="text-emerald-400 flex items-center gap-1 sm:gap-2 text-xs sm:text-base font-bold drop-shadow-md"><User className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> {activeArticle.author_name}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-10 leading-[1.3] sm:leading-[1.2] tracking-tight drop-shadow-xl">{activeArticle.title}</h2>
                <div className="prose prose-invert prose-base sm:prose-xl max-w-none text-slate-200 font-medium leading-loose">
                  <p className="text-lg sm:text-2xl text-white font-bold mb-6 sm:mb-10 p-5 sm:p-10 glass-panel rounded-2xl sm:rounded-3xl border-r-4 border-r-emerald-500/50 border-l-4 border-l-emerald-500 shadow-inner drop-shadow-md">{activeArticle.excerpt}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .marquee-content { display: inline-block; animation: marquee 90s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100%); } }
      `}} />
    </div>
  );
}
