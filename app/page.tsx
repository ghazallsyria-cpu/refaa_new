// @ts-nocheck
/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Gemini Style Edition - Bento Grid Layout)
 * ============================================================================
 * @file        app/page.tsx
 * @version     6.0.0 (Alive UI - Holographic Bento Campus)
 * @description الواجهة الرئيسية للحرم الرقمي مع واجهات زجاجية وتصميم شبكي.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
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
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا. تواصل، تعلم، واكتشف إمكانياتك في حرمنا الرقمي المتقدم.',
  color_gradient: 'from-indigo-300 via-white to-blue-300',
  type: 'welcome'
};

const shieldThemes = {
  gold: { border: 'from-amber-400/40 via-amber-500/20 to-amber-700/40', glow: 'bg-amber-500/10', textPrimary: 'text-amber-300', textSecondary: 'text-amber-400/70', icon: <Award className="w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" /> },
  silver: { border: 'from-slate-300/40 via-slate-100/20 to-slate-400/40', glow: 'bg-slate-400/10', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400/70', icon: <Shield className="w-8 h-8 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)]" /> },
  diamond: { border: 'from-cyan-400/40 via-blue-500/20 to-indigo-600/40', glow: 'bg-cyan-500/10', textPrimary: 'text-cyan-300', textSecondary: 'text-cyan-400/70', icon: <Sparkles className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" /> },
  royal: { border: 'from-amber-600/40 via-yellow-500/20 to-yellow-700/40', glow: 'bg-amber-900/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-500/60', icon: <Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" /> },
};

export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
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

  useEffect(() => {
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
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

  const displayedMemorials = activeMemorialTab === 'students' ? studentMemorials : teacherMemorials;

  if (isChecking || fetching) {
    return (
      <div className="h-[100dvh] bg-[#02040a] flex items-center justify-center relative overflow-hidden">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_40px_rgba(99,102,241,0.5)]"></div>
            <p className="text-indigo-400 font-black tracking-widest text-sm uppercase drop-shadow-md">تهيئة الحرم الرقمي...</p>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-slate-200 font-sans overflow-x-hidden selection:bg-indigo-500/30 relative pb-20 sm:pb-32 pt-2 sm:pt-6" dir="rtl">
      
      {/* 🌌 الإضاءة الخلفية المحيطية (Gemini Ambiance) */}
      <div className="fixed top-[-10%] right-[-5%] w-[50vw] h-[50vw] min-w-[300px] min-h-[300px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0 animate-[pulse_12s_ease-in-out_infinite]"></div>
      <div className="fixed bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] min-w-[200px] min-h-[200px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen z-0 animate-[pulse_10s_ease-in-out_infinite_alternate]"></div>
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.5 }}
          whileHover={{ rotate: [-1, 1, -0.5, 0.5, 0], scale: 1.02 }}
          className="absolute top-0 left-4 sm:left-16 lg:left-24 z-[60] w-12 sm:w-24 md:w-32 lg:w-44 h-[180px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري (Holographic News Ticker) */}
      {breakingNews && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 pointer-events-none">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="w-full bg-[#02040a]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-full flex items-center overflow-hidden pointer-events-auto p-1.5">
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
           
           {/* بطاقة الترحيب (Hero Card) */}
           <motion.div style={{ opacity: opacityHero }} className="lg:col-span-8 xl:col-span-9 glass-panel rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.15)] relative overflow-hidden flex flex-col justify-center group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen transition-transform duration-1000 group-hover:scale-125"></div>
              
              <AnimatePresence mode="wait">
                <motion.div key={currentSlideData.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="relative z-10">
                  {currentSlideData.badge_text && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] sm:text-sm font-black mb-6 sm:mb-8 shadow-inner backdrop-blur-md">
                      <SlideIcon className="w-4 h-4 text-emerald-400 drop-shadow-sm" /> {currentSlideData.badge_text}
                    </div>
                  )}
                  
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-[6rem] font-black tracking-tighter mb-4 sm:mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-300 via-white to-blue-300'} drop-shadow-lg`}>
                    {currentSlideData.title}
                  </h1>
                  
                  {currentSlideData.description && (
                    <p className="text-slate-300 text-sm sm:text-lg md:text-xl font-bold max-w-3xl leading-relaxed sm:leading-loose mb-8 sm:mb-10 drop-shadow-sm opacity-90">
                      {currentSlideData.description}
                    </p>
                  )}

                  {/* أزرار الإجراءات */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Link href={portal.href} className="group/btn relative inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600/90 backdrop-blur-md text-white border border-indigo-400/50 rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all hover:bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] active:scale-95">
                       <span>{portal.text}</span>
                       <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 text-white rounded-xl flex items-center justify-center group-hover/btn:-translate-x-1 transition-transform shadow-inner">
                         <portal.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180 drop-shadow-sm" />
                       </div>
                    </Link>
                    {!user && (
                      <Link href="/about" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 backdrop-blur-md text-slate-300 border border-white/10 rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-sm transition-all hover:bg-white/10 hover:text-white shadow-inner active:scale-95">
                        <Compass className="w-4 h-4 opacity-70" /> استكشف المنصة
                      </Link>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* مؤشرات السلايدر */}
              {heroSlides.length > 1 && (
                <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 flex gap-2 z-30">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 shadow-inner ${currentSlide === i ? 'w-6 sm:w-8 bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
                  ))}
                </div>
              )}
           </motion.div>

           {/* بطاقات الإحصائيات الجانبية (Bento Stats) */}
           <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5 sm:gap-6">
              <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-blue-500/20 shadow-inner flex-1 relative overflow-hidden group flex flex-col justify-center">
                 <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-[1rem] sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner mb-4 relative z-10"><Activity className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm"/></div>
                 <div className="relative z-10">
                   <div className="text-3xl sm:text-4xl font-black text-white leading-none mb-1 drop-shadow-md">منصة حية</div>
                   <div className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 leading-relaxed opacity-90">آلاف التفاعلات اليومية بين المعلمين والطلاب في بيئة رقمية آمنة.</div>
                 </div>
              </motion.div>

              <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-emerald-500/20 shadow-inner flex-1 relative overflow-hidden group flex flex-col justify-center">
                 <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none group-hover:scale-150 transition-transform"></div>
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-[1rem] sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner mb-4 relative z-10"><Target className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-sm"/></div>
                 <div className="relative z-10">
                   <div className="text-3xl sm:text-4xl font-black text-white leading-none mb-1 drop-shadow-md">تقييم ذكي</div>
                   <div className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2 leading-relaxed opacity-90">نظام اختبارات متقدم يوفر تغذية راجعة فورية لتعزيز الفهم السريع.</div>
                 </div>
              </motion.div>
           </div>
        </div>

        {/* 📣 2. الإعلانات السريعة (Holographic Banner) */}
        {announcements.length > 0 && (
          <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-rose-500/20 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10 border-b border-white/5 pb-5 mb-5">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="p-2 sm:p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl sm:rounded-2xl shadow-inner"><Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 drop-shadow-sm" /></div>
                 <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md tracking-tight">إعلانات <span className="text-rose-400">الإدارة</span></h2>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-[#02040a]/40 backdrop-blur-md p-5 sm:p-6 rounded-2xl sm:rounded-[1.5rem] border border-white/5 hover:border-rose-500/30 transition-colors shadow-inner flex flex-col justify-between group cursor-default">
                  <div>
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <span className="text-[9px] sm:text-[10px] font-black text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-md border border-rose-500/30 shadow-inner">{ann.tag || 'إعلان'}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3 opacity-70" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white leading-relaxed drop-shadow-sm group-hover:text-rose-100 transition-colors">{ann.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🎬 3. الاستوديو البصري (Bento Gallery) */}
        {studioItems.length > 0 && (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
               <div className="flex items-center gap-3 sm:gap-4">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/10 border border-indigo-500/20 shadow-inner rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md"><Video className="w-6 h-6 text-indigo-400 drop-shadow-sm" /></div>
                 <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">المكتبة البصرية</h2>
                   <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1">نظرة حية من داخل أسوار الرفعة.</p>
                 </div>
               </div>
               <Link href="/archive/gallery" className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs sm:text-sm hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-inner backdrop-blur-sm w-fit">
                 الأرشيف المرئي <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
               </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {studioItems.slice(0, 3).map((media, index) => (
                 <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} key={media.id} className={`relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden group glass-panel p-1.5 cursor-pointer shadow-lg border-white/10 ${index === 0 ? 'sm:col-span-2 lg:col-span-2 aspect-[16/9] sm:aspect-[21/9]' : 'aspect-[16/9] sm:aspect-auto'}`} onClick={() => setActiveMedia(media)}>
                   <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden">
                      <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700 mix-blend-luminosity hover:mix-blend-normal" />
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent z-10"></div>
                      
                      {media.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-indigo-600/80 backdrop-blur-md border border-indigo-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-1 sm:ml-1.5 drop-shadow-sm" fill="currentColor" />
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

        {/* 📰 4. المركز الإخباري (Bento Articles) */}
        {magazineItems.length > 0 && (
          <div className="space-y-5 sm:space-y-6 pt-10 sm:pt-14 border-t border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/10 border border-emerald-500/20 shadow-inner rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md"><Newspaper className="w-6 h-6 text-emerald-400 drop-shadow-sm" /></div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1 sm:mb-2 drop-shadow-md">المركز الإخباري</h2>
                  <p className="text-slate-400 font-bold text-xs sm:text-sm">تغطية معمارية لأهم المنجزات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs sm:text-sm hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 active:scale-95 shadow-inner backdrop-blur-sm w-fit">
                الأرشيف الصحفي <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              {/* الخبر الرئيسي */}
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative min-h-[350px] sm:min-h-[450px] lg:min-h-[500px] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden glass-panel p-1.5 flex flex-col shadow-lg border-white/10">
                  <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[2.25rem] overflow-hidden bg-[#0f1423]">
                     <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-1000 mix-blend-luminosity hover:mix-blend-normal" />
                     <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent z-10"></div>
                     
                     <div className="relative z-20 p-6 sm:p-8 lg:p-10 flex flex-col justify-end h-full w-full">
                       <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                         {pinnedArticle.is_pinned && <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-black rounded-lg flex items-center gap-1.5 shadow-inner backdrop-blur-sm"><Star className="w-3 h-3" /> رئيسي</span>}
                         <span className="text-slate-300 text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-[#02040a]/60 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner backdrop-blur-sm"><User className="w-3 h-3 text-emerald-400 opacity-70" /> {pinnedArticle.author_name}</span>
                       </div>
                       <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight sm:leading-tight mb-3 sm:mb-4 drop-shadow-md">{pinnedArticle.title}</h3>
                       <p className="text-slate-300 font-bold text-xs sm:text-sm lg:text-base max-w-2xl line-clamp-2 mb-5 sm:mb-6 leading-relaxed opacity-90 drop-shadow-sm">{pinnedArticle.excerpt}</p>
                       
                       <div className="inline-flex items-center justify-center gap-2 text-white font-black text-xs sm:text-sm bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all w-max px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl shadow-inner active:scale-95">
                         اقرأ التفاصيل <ArrowUpRight className="w-4 h-4" />
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {/* الأخبار الجانبية العمودية */}
              <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden glass-panel p-1.5 min-h-[160px] sm:min-h-[200px] flex flex-col shadow-md border-white/10">
                     <div className="relative w-full h-full rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden bg-[#0f1423]">
                        <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-700 mix-blend-luminosity hover:mix-blend-normal" />
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#02040a]/90 via-[#02040a]/40 to-transparent"></div>
                        <div className="relative z-20 p-5 sm:p-6 flex flex-col justify-end h-full">
                          <span className="text-emerald-400 text-[9px] sm:text-[10px] font-black mb-2 flex items-center gap-1.5 drop-shadow-md bg-[#02040a]/40 w-fit px-2 py-1 rounded-md border border-white/5 backdrop-blur-sm"><User className="w-3 h-3 opacity-70" /> {article.author_name}</span>
                          <h3 className="text-sm sm:text-base lg:text-lg font-black text-white leading-snug drop-shadow-md line-clamp-3">{article.title}</h3>
                        </div>
                     </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🏆 5. معرض الدروع الشرفية (Holographic Memorials) */}
        {(studentMemorials.length > 0 || teacherMemorials.length > 0) && (
          <div className="py-10 sm:py-16 relative z-10 border-t border-white/5 bg-transparent overflow-hidden mt-10">
             <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 glass-panel border-amber-500/30 rounded-xl mb-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-500/5">
                   <Trophy className="w-4 h-4 text-amber-400 drop-shadow-sm" />
                   <span className="text-amber-300 font-black text-[10px] sm:text-xs uppercase tracking-widest">لوحة شرف مدرسة الرفعة</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">معرض التتويج <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-200 to-amber-500">والتميز</span></h2>
             </div>

             <div className="flex justify-center relative z-20 mb-8 sm:mb-10">
                <div className="flex glass-panel p-1.5 rounded-2xl border-white/10 shadow-inner bg-[#02040a]/40 backdrop-blur-md">
                   <button onClick={() => setActiveMemorialTab('students')} className={cn("px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95", activeMemorialTab === 'students' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-inner' : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5')}>
                      <GraduationCap className="w-4 h-4 opacity-80"/> شرف الطلاب
                   </button>
                   <button onClick={() => setActiveMemorialTab('teachers')} className={cn("px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95", activeMemorialTab === 'teachers' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-inner' : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5')}>
                      <UserCircle className="w-4 h-4 opacity-80"/> شرف المعلمين
                   </button>
                </div>
             </div>

             <div className="w-full overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-r from-[#090b14] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-24 bg-gradient-to-l from-[#090b14] to-transparent z-10 pointer-events-none"></div>
                
                <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-[10vw] pb-10 pt-4 snap-x snap-mandatory custom-scrollbar min-h-[350px]">
                   {displayedMemorials.length > 0 ? displayedMemorials.map((memorial, i) => {
                      const theme = shieldThemes[memorial.shield_type as keyof typeof shieldThemes] || shieldThemes.gold;
                      const isExternal = !!memorial.external_shield_url;

                      return (
                        <motion.div key={memorial.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="snap-center shrink-0 w-[220px] sm:w-[260px] group cursor-pointer relative z-0 hover:z-20">
                           {isExternal ? (
                              <div className="relative rounded-[2rem] overflow-hidden glass-panel border-white/10 shadow-lg transition-transform duration-500 group-hover:-translate-y-4 p-2 bg-[#02040a]/40">
                                 <img src={memorial.external_shield_url} crossOrigin="anonymous" className="w-full h-auto rounded-[1.5rem] object-contain mix-blend-luminosity hover:mix-blend-normal transition-all" alt="Shield" />
                              </div>
                           ) : (
                              <div className={cn("relative p-[2px] rounded-t-full rounded-b-[2.5rem] sm:rounded-b-[3rem] shadow-2xl overflow-hidden bg-gradient-to-br transition-all duration-500 group-hover:-translate-y-4", theme.border)}>
                                 <div className={cn("absolute inset-0 blur-2xl opacity-60", theme.glow)}></div>
                                 <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 rounded-t-full rounded-b-[2.5rem] pointer-events-none"></div>
                                 
                                 <div className="relative h-full w-full bg-[#02040a]/90 backdrop-blur-xl border border-white/10 rounded-t-full rounded-b-[2.4rem] p-5 sm:p-6 flex flex-col items-center text-center overflow-hidden z-10 shadow-inner">
                                    <div className="mt-4 mb-4 p-2.5 sm:p-3 rounded-full bg-white/5 border border-white/10 shadow-inner flex items-center justify-center backdrop-blur-sm">
                                       {memorial.custom_logo_url ? <img src={memorial.custom_logo_url} crossOrigin="anonymous" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md" /> : theme.icon}
                                    </div>
                                    <h3 className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 border-b border-white/10 pb-1.5 w-full">الرفعة النموذجية</h3>
                                    <h2 className={cn("text-base sm:text-lg font-black leading-tight mb-4 drop-shadow-md min-h-[40px] flex items-center justify-center", theme.textPrimary)}>{memorial.title}</h2>
                                    <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 shadow-inner mx-auto mb-3", theme.border)}>
                                       {memorial.avatar ? <img src={memorial.avatar} crossOrigin="anonymous" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all"/> : <UserCircle className="w-full h-full text-slate-600 p-1 bg-[#0f1423]"/>}
                                    </div>
                                    <p className={cn("text-sm sm:text-base font-black truncate w-full drop-shadow-sm", theme.textPrimary)}>{memorial.personName}</p>
                                    <p className={cn("text-[9px] sm:text-[10px] font-bold mt-1.5 px-2 py-1 rounded-md border border-white/10 bg-white/5 shadow-inner", theme.textSecondary)}>{memorial.info}</p>
                                 </div>
                              </div>
                           )}
                        </motion.div>
                      );
                   }) : (
                      <div className="w-full text-center py-16 flex flex-col items-center justify-center glass-panel rounded-3xl border-white/5 shadow-inner bg-[#02040a]/40 backdrop-blur-sm">
                         <Award className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mb-4 opacity-50 drop-shadow-sm" />
                         <p className="text-slate-400 font-bold text-xs sm:text-sm">لم يتم إصدار أي دروع في هذه الفئة بعد.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* 🚀 6. الخاتمة والدعوة (Call to Action) */}
        <div className="py-20 sm:py-32 relative z-10 text-center border-t border-white/5 mt-10">
           <div className="w-16 h-16 sm:w-24 sm:h-24 glass-panel border-indigo-500/30 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_0_40px_rgba(99,102,241,0.2)] bg-indigo-500/10 backdrop-blur-md">
             <Compass className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-400 drop-shadow-md" />
           </div>
           <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-white mb-4 sm:mb-6 tracking-tight drop-shadow-lg">جاهز للانطلاق؟</h2>
           <p className="text-slate-400 font-bold text-xs sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 drop-shadow-sm">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً على مستوى البلاد.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-2 sm:gap-3 px-8 py-3.5 sm:px-12 sm:py-5 bg-indigo-600/90 backdrop-blur-md border border-indigo-400/50 text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
             <span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" />
           </Link>
        </div>

      </div>

      {/* 🖼️ النوافذ المنبثقة (Glass Modals) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-3xl p-2 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl glass-panel rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] border-white/10 relative flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl flex items-center justify-center backdrop-blur-md transition-colors border border-white/10 shadow-inner active:scale-90"><X className="w-5 h-5" /></button>
              <div className="relative w-full flex-1 bg-[#0f1423]/60 flex items-center justify-center min-h-[40vh] max-h-[70vh] sm:max-h-[85vh] p-2 sm:p-4 shadow-inner">
                {activeMedia.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain rounded-[1.5rem] sm:rounded-[2.5rem] shadow-md border border-white/5" />) : (<img src={activeMedia.media_url} alt={activeMedia.title} className="w-full h-full object-contain rounded-[1.5rem] sm:rounded-[2.5rem] shadow-md border border-white/5" />)}
              </div>
              <div className="p-5 sm:p-6 bg-[#02040a]/80 backdrop-blur-md border-t border-white/5 relative z-10"><h3 className="text-white font-black text-base sm:text-2xl drop-shadow-md text-center sm:text-right">{activeMedia.title}</h3></div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 backdrop-blur-3xl p-2 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-4xl glass-panel rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] border-white/10 relative flex flex-col max-h-[95vh] sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
              
              <div className="relative h-48 sm:h-[350px] shrink-0 bg-[#0f1423] rounded-t-[2rem] sm:rounded-t-[2.5rem] overflow-hidden m-1.5 sm:m-2">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 sm:top-5 sm:left-5 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-[#02040a]/60 hover:bg-rose-500/80 text-slate-300 hover:text-white rounded-xl flex items-center justify-center backdrop-blur-md transition-colors border border-white/10 shadow-inner active:scale-90"><X className="w-5 h-5" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover rounded-[1.25rem] sm:rounded-[2rem] mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent pointer-events-none"></div>
              </div>
              
              <div className="px-5 sm:px-10 pb-10 sm:pb-12 pt-4 sm:pt-6 overflow-y-auto custom-scrollbar relative z-10 bg-transparent flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5 sm:mb-8 border-b border-white/5 pb-4 sm:pb-5">
                  <span className="text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner flex items-center gap-1.5 text-[10px] sm:text-xs font-black drop-shadow-sm"><Calendar className="w-3.5 h-3.5 opacity-70" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-inner flex items-center gap-1.5 text-[10px] sm:text-xs font-black drop-shadow-sm"><User className="w-3.5 h-3.5 opacity-70" /> {activeArticle.author_name}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-6 sm:mb-8 leading-tight sm:leading-tight tracking-tight drop-shadow-lg">{activeArticle.title}</h2>
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-300 font-bold leading-relaxed">
                  <div className="text-sm sm:text-base lg:text-lg text-indigo-100 font-black mb-6 sm:mb-8 p-5 sm:p-6 bg-indigo-500/10 rounded-2xl sm:rounded-3xl border border-indigo-500/20 border-r-4 border-r-indigo-500 shadow-inner drop-shadow-md leading-relaxed">{activeArticle.excerpt}</div>
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
        .marquee-content { display: inline-block; animation: marquee 90s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(-100vw); } 100% { transform: translateX(100%); } }
      `}} />
    </div>
  );
}
