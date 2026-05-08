/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/page.tsx
 * @version     3.2.0 (Ribbon Scale & Transparency Fix)
 * @description الواجهة الرئيسية للحرم الرقمي بنمط (Aurora Glass).
 * * 🛠️ التحديث الحالي (V3.2.0):
 * - تم تحرير الوشاح المتدلي من القيود الحجمية القديمة.
 * - زيادة الارتفاع (Height) والعرض (Width) بنسبة 40% لضمان ظهور التصميم كاملاً.
 * - إزالة أي حدود (Borders) أو خلفيات (Backgrounds) قد تسبب ظهور "صندوق" حول الوشاح.
 * - تحسين الـ Clip-path ليكون أكثر انسيابية مع التصاميم الطولية.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, 
  ArrowLeft, Star, Crown, Compass, Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, X, Calendar, User
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const ICON_MAP: Record<string, any> = { 'Sparkles': Sparkles, 'Trophy': Trophy, 'Quote': Quote, 'Image': ImageIcon };

const DEFAULT_SLIDE = {
  id: 'default',
  icon_name: 'Sparkles',
  badge_text: 'نظام إدارة التعلم الذكي 2026',
  title: 'مدرسة الرفعة',
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا. تواصل، تعلم، واكتشف إمكانياتك في حرمنا الرقمي.',
  color_gradient: 'from-indigo-400 via-purple-400 to-emerald-400',
  type: 'welcome'
};

export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);

  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  
  const [hangingRibbonUrl, setHangingRibbonUrl] = useState<string | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [fetching, setFetching] = useState(true);

  const [activeMedia, setActiveMedia] = useState<any | null>(null); 
  const [activeArticle, setActiveArticle] = useState<any | null>(null); 

  useEffect(() => {
    const fetchCampusContent = async () => {
      try {
        const [studioRes, magazineRes, annRes, tickerRes, heroRes, ribbonRes] = await Promise.all([
          supabase.from('school_studio').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
          supabase.from('school_magazine').select('*').order('created_at', { ascending: false }).limit(4),
          supabase.from('school_announcements').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('school_ticker').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('forum_hero_slides').select('*').eq('is_active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('school_ribbon').select('image_url').eq('id', 1).maybeSingle()
        ]);
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
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 7000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const breakingNews = tickers.length > 0 ? tickers.map(t => `✨ ${t.content}`).join('   |   ') : null;

  const portal = (() => {
    if (!user) return { href: '/login', text: 'تسجيل الدخول', icon: ArrowLeft };
    const routes: any = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { 
      href: routes[authRole] || '/dashboard', 
      text: authRole === 'student' ? 'الدخول لحقيبتي' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', 
      icon: ArrowLeft 
    };
  })();

  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-[#0B1120] flex items-center justify-center relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 flex flex-col items-center gap-4">
            <Compass className="w-16 h-16 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <p className="text-indigo-200 font-bold tracking-widest text-sm">جاري بناء العالم...</p>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30 selection:text-white relative" dir="rtl">
      
      {/* ========================================== */}
      {/* 🎀 الوشاح المتدلي المطور (The Grand Hanging Ribbon) */}
      {/* تم توسيعه وزيادة طوله ليتناسب مع التصاميم الاحترافية */}
      {/* ========================================== */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.8 }}
          whileHover={{ rotate: [-1, 1, -0.5, 0.5, 0], scale: 1.02 }}
          className="absolute top-0 left-6 sm:left-16 lg:left-24 z-[60] w-24 sm:w-36 md:w-44 lg:w-52 h-[350px] sm:h-[500px] md:h-[600px] pointer-events-auto"
          style={{ 
            transformOrigin: 'top center',
            filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))'
          }}
        >
          <div 
            className="w-full h-full relative"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 92%, 0 100%, 0 0)' }}
          >
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري العلوي */}
      {breakingNews && (
        <div className="w-full bg-indigo-600/90 backdrop-blur-md text-white flex items-center h-11 relative z-50 shadow-2xl border-b border-white/10">
           <div className="bg-indigo-800 px-6 h-full font-black text-xs flex items-center gap-2 shrink-0 z-10 shadow-[10px_0_20px_rgba(0,0,0,0.3)]">
             <BellRing className="w-4 h-4 animate-pulse" /> إعلان عاجل
           </div>
           <div className="flex-1 overflow-hidden h-full flex items-center">
             <div className="marquee-content whitespace-nowrap font-bold text-xs sm:text-sm tracking-wide flex gap-16">
                <span>{breakingNews}</span><span>{breakingNews}</span>
             </div>
           </div>
        </div>
      )}

      {/* 🌟 1. الواجهة الترحيبية (Aurora Glass Hero) */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-12 pb-24 overflow-hidden">
        <motion.div style={{ y: yBackground }} className="absolute inset-0 z-0 pointer-events-none opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[150px]"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/15 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-purple-600/15 rounded-full blur-[150px]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </motion.div>

        <div className="absolute top-16 right-8 z-20">
          <Link href={portal.href} className="px-7 py-3 bg-white/10 hover:bg-white text-white hover:text-[#0B1120] backdrop-blur-md rounded-2xl font-black text-sm flex items-center gap-3 transition-all shadow-2xl border border-white/20 hover:scale-105 active:scale-95">
             <portal.icon className="w-5 h-5 rotate-180" /> {portal.text}
          </Link>
        </div>

        <div className="relative z-10 text-center max-w-5xl px-6 w-full flex flex-col items-center mt-[-5vh]">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlideData.id}
              initial={{ opacity: 0, y: 30, filter: 'blur(15px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -30, filter: 'blur(15px)' }}
              transition={{ duration: 0.7, ease: "circOut" }}
              className="flex flex-col items-center text-center w-full"
            >
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-indigo-200 text-xs sm:text-sm font-bold mb-8 shadow-inner backdrop-blur-xl">
                  <SlideIcon className="w-4 h-4 text-emerald-400" /> {currentSlideData.badge_text}
                </div>
              )}
              
              <h1 className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-[1.1] mb-8 text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-300 via-white to-emerald-300'} drop-shadow-2xl`}>
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-slate-300/80 text-lg sm:text-2xl font-medium max-w-3xl mx-auto leading-relaxed mb-12">
                  {currentSlideData.description}
                </p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3.5 flex items-center gap-4 pr-6 shadow-2xl hover:bg-white/10 transition-all cursor-default group">
                      <div className="relative">
                        <Crown className="absolute -top-4 -right-3 w-7 h-7 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] z-10 rotate-12 group-hover:scale-110 transition-transform" />
                        <img src={student.img} alt={student.name} className="w-16 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/20 object-cover shadow-inner" />
                      </div>
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-black text-white">{student.name}</p>
                        <p className="text-xs font-bold text-emerald-400 tracking-wider">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 w-full max-w-4xl mx-auto rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/10 bg-black/40 backdrop-blur-md p-2.5">
                    <img src={currentSlideData.media_url} alt="Campus Event" className="w-full h-auto max-h-[450px] object-cover rounded-[2rem]" />
                 </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-12 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'w-2.5 bg-white/10 hover:bg-white/30'}`} />
            ))}
          </div>
        )}
      </section>

      {/* باقي الأقسام (الاستوديو، المجلة، الخ) بنفس الكود الفاخر السابق... */}
      {/* تم اختصارها هنا لسهولة النسخ، الكود الحقيقي يحتوي عليها كاملة */}
      {/* [INSERT ALL PREVIOUS SECTIONS HERE: Announcements, Gallery, Magazine, CTA] */}

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .marquee-content { display: inline-block; animation: marquee 45s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}
