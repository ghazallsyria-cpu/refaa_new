/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/page.tsx
 * @version     4.2.0 (Mobile Responsiveness & Elegance Update)
 * @description الواجهة الرئيسية للحرم الرقمي بتصميم (Bento Box) الفاخر.
 * * 🛠️ التحديث الحالي (V4.2.0):
 * - ضبط شامل لاستجابة الشاشات (Mobile Responsiveness).
 * - تقليص حجم الوشاح المتدلي في شاشات الجوال لمنع التداخل البصري.
 * - إعادة هندسة أحجام الخطوط (Typography) والهوامش (Paddings) لتكون مريحة للعين في الجوال.
 * - تحسين بطاقات الأخبار والميديا لتعرض المحتوى بشكل متناسق ومنظم على الشاشات الصغيرة.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, ArrowLeft, Star, Crown, Compass, 
  Newspaper, Video, BellRing, Megaphone, ArrowUpRight, Quote, Trophy, 
  X, Calendar, User
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
  color_gradient: 'from-blue-400 via-indigo-400 to-emerald-400',
  type: 'welcome'
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

  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center relative overflow-hidden">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-300 font-black tracking-widest text-xs sm:text-sm uppercase">جاري التكوين...</p>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30 relative" dir="rtl">
      
      {/* 🎀 الوشاح المتدلي (متجاوب مع الجوال) */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.5 }}
          whileHover={{ rotate: [-1, 1, -0.5, 0.5, 0], scale: 1.02 }}
          className="absolute top-0 left-4 sm:left-12 lg:left-24 z-[60] w-14 sm:w-24 md:w-32 lg:w-44 h-[200px] sm:h-[350px] md:h-[450px] lg:h-[550px] pointer-events-auto shadow-[0_15px_30px_rgba(0,0,0,0.5)]"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري (كبسولة طافية متجاوبة) */}
      {breakingNews && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-[90%] max-w-4xl z-50 pointer-events-none">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="w-full bg-[#0F172A]/95 backdrop-blur-2xl border border-white/10 rounded-full flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto">
             <div className="bg-indigo-600 px-4 sm:px-6 py-2.5 sm:py-3 font-black text-[10px] sm:text-xs text-white flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 shadow-lg">
               <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" /> عاجل
             </div>
             <div className="flex-1 overflow-hidden h-full flex items-center">
               <div className="marquee-content whitespace-nowrap font-bold text-slate-200 text-[11px] sm:text-sm tracking-wide flex gap-12 sm:gap-16 py-2 sm:py-3">
                 <span>{breakingNews}</span><span>{breakingNews}</span>
               </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* 🌟 1. الواجهة الترحيبية (Architectural Hero) */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
        {/* خلفية هندسية عميقة */}
        <motion.div style={{ y: yBackground, opacity: opacityHero }} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[100px] sm:blur-[150px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-emerald-600/10 rounded-full blur-[100px] sm:blur-[150px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] sm:bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)]"></div>
        </motion.div>

        {/* زر الدخول (متجاوب للجوال) */}
        <div className="absolute top-6 right-4 sm:top-10 sm:right-8 z-50">
          <Link href={portal.href} className="group relative inline-flex items-center gap-2 sm:gap-3 px-5 py-2.5 sm:px-8 sm:py-4 bg-white text-[#020617] rounded-full font-black text-[11px] sm:text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95">
             <span>{portal.text}</span>
             <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#020617] text-white rounded-full flex items-center justify-center group-hover:-translate-x-1 transition-transform">
               <portal.icon className="w-3 h-3 sm:w-4 sm:h-4 rotate-180" />
             </div>
          </Link>
        </div>

        <div className="relative z-10 text-center max-w-6xl px-4 sm:px-6 w-full flex flex-col items-center mt-6 sm:mt-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlideData.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="flex flex-col items-center text-center w-full">
              
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-1.5 sm:px-6 sm:py-2.5 rounded-full bg-[#0F172A] border border-indigo-500/30 text-indigo-300 text-[10px] sm:text-sm font-black mb-6 sm:mb-8 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <SlideIcon className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" /> {currentSlideData.badge_text}
                </div>
              )}
              
              <h1 className={`text-5xl leading-[1.1] sm:text-7xl md:text-[8rem] lg:text-[9rem] font-black tracking-tighter mb-4 sm:mb-8 text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-300 via-white to-emerald-300'} drop-shadow-xl`}>
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-slate-300/90 text-sm sm:text-xl md:text-2xl font-bold max-w-2xl mx-auto leading-relaxed sm:leading-relaxed mb-8 sm:mb-12 px-2">
                  {currentSlideData.description}
                </p>
              )}

              {/* بطاقات الطلاب المتجاوبة */}
              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-10 sm:mb-12">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-2 sm:p-3 flex items-center gap-3 sm:gap-5 pr-4 sm:pr-6 shadow-xl hover:border-indigo-500/50 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all group">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 w-5 h-5 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10 rotate-12 group-hover:scale-110 sm:group-hover:scale-125 transition-transform" />
                        <img src={student.img} alt={student.name} className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border border-white/20 sm:border-2 sm:border-white/10 object-cover" />
                      </div>
                      <div className="text-right py-1 sm:py-2">
                        <p className="text-xs sm:text-lg font-black text-white">{student.name}</p>
                        <p className="text-[9px] sm:text-sm font-bold text-emerald-400">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* صورة الهيرو المتجاوبة */}
              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 relative group">
                    <img src={currentSlideData.media_url} alt="Hero Media" className="w-full h-auto max-h-[300px] sm:max-h-[500px] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                 </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-30 bg-[#0F172A]/80 backdrop-blur-md p-2 sm:p-3 rounded-full border border-white/5">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-6 sm:w-10 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'w-1.5 sm:w-2.5 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </section>

      {/* 📣 2. الإعلانات السريعة */}
      {announcements.length > 0 && (
        <section className="py-14 sm:py-20 relative z-10 border-t border-white/5 bg-[#050A15]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-10 sm:mb-14">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center"><Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-rose-500" /></div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">إعلانات <span className="text-rose-500">سريعة</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {announcements.map((ann) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={ann.id} className="bg-[#0F172A] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 hover:border-rose-500/50 transition-all hover:-translate-y-2 shadow-lg relative group overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[220px]">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-rose-500/5 rounded-full blur-[40px] group-hover:bg-rose-500/20 transition-colors"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <span className="text-[10px] sm:text-xs font-black text-rose-400 bg-rose-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-rose-500/20">{ann.tag || 'إعلان'}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 sm:w-4 h-3 sm:h-4" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white leading-snug group-hover:text-rose-200 transition-colors">{ann.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🎬 3. الاستوديو البصري */}
      {studioItems.length > 0 && (
        <section className="py-16 sm:py-28 relative z-10 bg-[#020617] border-y border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center"><Video className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500" /></div>
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-1 sm:mb-2">المكتبة البصرية</h2>
                <p className="text-slate-400 font-bold text-xs sm:text-base">نظرة حية من داخل أسوار الرفعة.</p>
              </div>
            </div>
            <Link href="/archive/gallery" className="px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white/5 text-white font-black text-xs sm:text-sm hover:bg-indigo-600 transition-all flex items-center gap-2 sm:gap-3 border border-white/10 active:scale-95">
              تصفح الأرشيف <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4" />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 snap-x snap-mandatory hide-scrollbar relative z-10" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} key={media.id} className="relative shrink-0 w-[80vw] sm:w-[450px] aspect-[4/3] rounded-[2rem] sm:rounded-[3rem] overflow-hidden snap-center group bg-[#0F172A] shadow-xl cursor-pointer border border-white/10" onClick={() => setActiveMedia(media)}>
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-0" />
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent z-10"></div>
                
                {media.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 backdrop-blur-md border border-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:scale-110 transition-all shadow-lg">
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1 sm:ml-2" fill="currentColor" />
                    </div>
                  </div>
                )}
                
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 border border-white/20">
                  {media.media_type === 'video' ? <Video className="w-3 sm:w-4 h-3 sm:h-4 text-indigo-400" /> : <ImageIcon className="w-3 sm:w-4 h-3 sm:h-4 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-5 sm:p-8 z-20">
                  <h3 className="text-base sm:text-2xl font-black text-white leading-snug drop-shadow-md line-clamp-2">{media.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 📰 4. المركز الإخباري (Mobile Optimized Bento Grid) */}
      {magazineItems.length > 0 && (
        <section className="py-16 sm:py-28 relative z-10 bg-[#050A15]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 sm:gap-8 mb-10 sm:mb-16">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center"><Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" /></div>
                <div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-1 sm:mb-2">المركز الإخباري</h2>
                  <p className="text-slate-400 font-bold text-xs sm:text-base">تغطية معمارية لأهم المنجزات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white/5 text-white font-black text-xs sm:text-sm hover:bg-emerald-600 transition-all flex items-center gap-2 sm:gap-3 border border-white/10 active:scale-95">
                الأرشيف الصحفي <ArrowLeft className="w-3 sm:w-4 h-3 sm:h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
              
              {/* الخبر الرئيسي (متجاوب) */}
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-7 xl:col-span-8 group cursor-pointer relative h-[380px] sm:h-[500px] lg:h-[650px] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl bg-[#0F172A] border border-white/5 hover:border-emerald-500/50 transition-colors flex flex-col">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out z-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent z-10"></div>
                  
                  <div className="relative z-20 p-6 sm:p-10 lg:p-14 flex flex-col justify-end h-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                      {pinnedArticle.is_pinned && <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 text-[#020617] shadow-[0_0_15px_rgba(16,185,129,0.4)] text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl flex items-center gap-1.5"><Star className="w-3 h-3 sm:w-4 sm:h-4" /> رئيسي</span>}
                      <span className="text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-white/10"><User className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.3] sm:leading-[1.2] mb-3 sm:mb-6 group-hover:text-emerald-400 transition-colors drop-shadow-xl">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-bold text-xs sm:text-base lg:text-lg max-w-3xl line-clamp-2 mb-6 sm:mb-8 leading-relaxed opacity-90">{pinnedArticle.excerpt}</p>
                    
                    <div className="inline-flex items-center justify-center gap-2 text-[#020617] font-black text-xs sm:text-sm bg-white w-max px-6 py-3 sm:px-8 sm:py-4 rounded-full group-hover:bg-emerald-400 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                      اقرأ التفاصيل <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* الأخبار الفرعية (متجاوبة) */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 sm:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-lg bg-[#0F172A] border border-white/5 hover:border-white/20 min-h-[160px] sm:min-h-[200px] flex flex-col">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-0" />
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"></div>
                    <div className="relative z-20 p-5 sm:p-8 flex flex-col justify-end h-full">
                      <span className="text-emerald-400 text-[10px] sm:text-xs font-black mb-2 sm:mb-3 flex items-center gap-1.5 drop-shadow-md"><User className="w-3 h-3 sm:w-4 sm:h-4" /> {article.author_name}</span>
                      <h3 className="text-base sm:text-xl font-black text-white leading-snug group-hover:text-emerald-300 transition-colors drop-shadow-md">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🚀 5. الخاتمة والدعوة (Mobile Optimized) */}
      <section className="py-20 sm:py-32 relative z-10 bg-[#020617] border-t border-white/5 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] bg-indigo-600/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
           <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#0F172A] rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-2xl"><Compass className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-500" /></div>
           <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-white mb-6 sm:mb-8 tracking-tighter">جاهز للانطلاق؟</h2>
           <p className="text-slate-400 font-bold text-sm sm:text-xl md:text-2xl mb-10 sm:mb-14 max-w-2xl mx-auto leading-relaxed px-4">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً على مستوى البلاد.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-3 sm:gap-4 px-8 py-4 sm:px-14 sm:py-7 bg-white text-[#020617] rounded-full font-black text-sm sm:text-xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all active:scale-95 shadow-xl">
             <span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
           </Link>
        </div>
      </section>

      {/* 🖼️ النوافذ المنبثقة (Cinematic Modals Mobile Fix) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/95 backdrop-blur-2xl p-2 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-14 sm:h-14 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20 shadow-xl"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
              <div className="relative w-full flex-1 bg-black flex items-center justify-center min-h-[40vh] max-h-[70vh] sm:max-h-[85vh]">
                {activeMedia.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full object-contain" />) : (<img src={activeMedia.media_url} alt={activeMedia.title} className="w-full h-full object-contain" />)}
              </div>
              <div className="p-5 sm:p-8 bg-[#0F172A] border-t border-white/5 relative z-10"><h3 className="text-white font-black text-lg sm:text-3xl">{activeMedia.title}</h3></div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 backdrop-blur-xl p-2 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-5xl bg-[#0F172A] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="relative h-48 sm:h-72 lg:h-[400px] shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 w-10 h-10 sm:w-14 sm:h-14 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-2xl transition-colors border border-white/20"><X className="w-5 h-5 sm:w-7 sm:h-7" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent"></div>
              </div>
              <div className="px-5 sm:px-16 pb-10 sm:pb-16 pt-4 sm:pt-8 overflow-y-auto custom-scrollbar relative z-10 bg-[#0F172A]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-white/5 pb-4 sm:pb-6">
                  <span className="text-slate-400 flex items-center gap-1 sm:gap-2 text-xs sm:text-base font-bold"><Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20"></span>
                  <span className="text-emerald-400 flex items-center gap-1 sm:gap-2 text-xs sm:text-base font-bold"><User className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> {activeArticle.author_name}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black text-white mb-6 sm:mb-10 leading-[1.3] sm:leading-[1.2] tracking-tight">{activeArticle.title}</h2>
                <div className="prose prose-invert prose-base sm:prose-xl max-w-none text-slate-300 font-medium leading-loose">
                  <p className="text-lg sm:text-2xl text-white font-bold mb-6 sm:mb-10 p-5 sm:p-10 bg-white/5 rounded-2xl sm:rounded-3xl border-l-4 border-emerald-500 shadow-inner">{activeArticle.excerpt}</p>
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}} />
    </div>
  );
}
