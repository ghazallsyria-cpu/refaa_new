/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/page.tsx
 * @version     4.1.0 (TypeScript Fix)
 * @description الواجهة الرئيسية للحرم الرقمي بتصميم (Bento Box) الفاخر.
 * * 🛠️ التحديث الحالي (V4.1.0):
 * - إصلاح خطأ `Variants` الخاص بـ Framer Motion لتجاوز مشكلة البناء (Build Error).
 * - تبسيط استدعاء الحركات (Animations) في قسم الإعلانات.
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
    if (!user) return { href: '/login', text: 'تسجيل الدخول للمنصة', icon: ArrowLeft };
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
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-indigo-300 font-black tracking-widest text-sm uppercase">جاري التكوين...</p>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30 relative" dir="rtl">
      
      {/* 🎀 الوشاح المتدلي */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 15, stiffness: 50, delay: 0.5 }}
          whileHover={{ rotate: [-1, 1, -0.5, 0.5, 0], scale: 1.02 }}
          className="absolute top-0 left-6 sm:left-16 lg:left-24 z-[60] w-24 sm:w-36 md:w-44 lg:w-48 h-[350px] sm:h-[450px] md:h-[550px] pointer-events-auto shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          style={{ transformOrigin: 'top center' }}
        >
          <div className="w-full h-full relative" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
            <img src={hangingRibbonUrl} alt="School Ribbon" className="w-full h-full object-cover" />
          </div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري (كبسولة طافية) */}
      {breakingNews && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl z-50 pointer-events-none">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1, type: "spring" }} className="w-full bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 rounded-full flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto">
             <div className="bg-indigo-600 px-6 py-3 font-black text-xs sm:text-sm text-white flex items-center gap-2 shrink-0 z-10 shadow-lg"><BellRing className="w-4 h-4 animate-pulse" /> عاجل</div>
             <div className="flex-1 overflow-hidden h-full flex items-center"><div className="marquee-content whitespace-nowrap font-bold text-slate-200 text-xs sm:text-sm tracking-wide flex gap-16 py-3"><span>{breakingNews}</span><span>{breakingNews}</span></div></div>
          </motion.div>
        </div>
      )}

      {/* 🌟 1. الواجهة الترحيبية (Architectural Hero) */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-20 overflow-hidden border-b border-white/5">
        <motion.div style={{ y: yBackground, opacity: opacityHero }} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-emerald-600/10 rounded-full blur-[150px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)]"></div>
        </motion.div>

        <div className="absolute top-8 right-8 z-20">
          <Link href={portal.href} className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-[#020617] rounded-full font-black text-sm transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
             <span>{portal.text}</span>
             <div className="w-8 h-8 bg-[#020617] text-white rounded-full flex items-center justify-center group-hover:-translate-x-1 transition-transform"><portal.icon className="w-4 h-4 rotate-180" /></div>
          </Link>
        </div>

        <div className="relative z-10 text-center max-w-6xl px-6 w-full flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlideData.id} initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.98 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col items-center text-center w-full">
              
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0F172A] border border-indigo-500/30 text-indigo-300 text-sm font-black mb-8 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <SlideIcon className="w-4 h-4 text-emerald-400" /> {currentSlideData.badge_text}
                </div>
              )}
              
              <h1 className={`text-6xl sm:text-8xl md:text-[10rem] font-black tracking-tighter leading-[1] mb-8 text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-300 via-white to-emerald-300'} drop-shadow-2xl`}>
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-slate-300 text-lg sm:text-2xl font-bold max-w-3xl mx-auto leading-relaxed mb-12">{currentSlideData.description}</p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-6 mb-12">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-3 flex items-center gap-5 pr-6 shadow-2xl hover:border-indigo-500/50 hover:-translate-y-2 transition-all group">
                      <div className="relative"><Crown className="absolute -top-5 -right-4 w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] z-10 rotate-12 group-hover:scale-125 transition-transform" /><img src={student.img} alt={student.name} className="w-16 h-16 rounded-full border-2 border-white/10 object-cover" /></div>
                      <div className="text-right py-2"><p className="text-lg font-black text-white">{student.name}</p><p className="text-sm font-bold text-emerald-400">{student.grade}</p></div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 relative group">
                    <img src={currentSlideData.media_url} alt="Hero Media" className="w-full h-auto max-h-[500px] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                 </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-30 bg-[#0F172A]/80 backdrop-blur-md p-3 rounded-full border border-white/5">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-10 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]' : 'w-2.5 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </section>

      {/* 📣 2. الإعلانات السريعة (Floating Cards) */}
      {announcements.length > 0 && (
        <section className="py-20 relative z-10 bg-[#050A15]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-14">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center justify-center"><Megaphone className="w-8 h-8 text-rose-500" /></div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">إعلانات <span className="text-rose-500">سريعة</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {announcements.map((ann, i) => (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, type: "spring", damping: 20 }} viewport={{ once: true, margin: "-50px" }} key={ann.id} className="bg-[#0F172A] p-8 rounded-[2.5rem] border border-white/5 hover:border-rose-500/50 transition-all hover:-translate-y-3 shadow-xl hover:shadow-[0_20px_40px_rgba(225,29,72,0.15)] relative group overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[50px] group-hover:bg-rose-500/20 transition-colors"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6"><span className="text-xs font-black text-rose-400 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">{ann.tag || 'إعلان'}</span><span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span></div>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-snug group-hover:text-rose-200 transition-colors">{ann.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🎬 3. الاستوديو البصري */}
      {studioItems.length > 0 && (
        <section className="py-28 relative z-10 bg-[#020617] border-y border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-10">
            <div className="flex items-center gap-5"><div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex items-center justify-center"><Video className="w-8 h-8 text-indigo-500" /></div><div><h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">المكتبة البصرية</h2><p className="text-slate-400 font-bold text-base">نظرة حية، زاهية، ومباشرة من داخل أسوار الرفعة.</p></div></div>
            <Link href="/archive/gallery" className="px-8 py-4 rounded-full bg-white/5 text-white font-black text-sm hover:bg-indigo-600 transition-all flex items-center gap-3 border border-white/10 hover:scale-105">تصفح الأرشيف <ArrowLeft className="w-4 h-4" /></Link>
          </div>
          <div className="flex overflow-x-auto gap-8 px-4 sm:px-6 lg:px-8 pb-12 snap-x snap-mandatory hide-scrollbar relative z-10" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1, type: "spring", stiffness: 50 }} key={media.id} className="relative shrink-0 w-[85vw] sm:w-[450px] aspect-square sm:aspect-[4/3] rounded-[3rem] overflow-hidden snap-center group bg-[#0F172A] shadow-2xl cursor-pointer border border-white/10 hover:border-indigo-500/50 transition-colors" onClick={() => setActiveMedia(media)}>
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out z-0" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent z-10"></div>
                {media.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center z-20"><div className="w-20 h-20 rounded-full bg-indigo-600/90 backdrop-blur-md border border-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:scale-110 transition-all shadow-[0_0_30px_rgba(99,102,241,0.6)]"><Play className="w-8 h-8 text-white ml-2" fill="currentColor" /></div></div>}
                <div className="absolute top-6 right-6 z-20 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-black flex items-center gap-2 border border-white/20 shadow-lg">{media.media_type === 'video' ? <Video className="w-4 h-4 text-indigo-400" /> : <ImageIcon className="w-4 h-4 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}</div>
                <div className="absolute bottom-0 left-0 w-full p-8 z-20 translate-y-4 group-hover:translate-y-0 transition-transform duration-500"><h3 className="text-xl sm:text-2xl font-black text-white leading-snug drop-shadow-md line-clamp-2">{media.title}</h3></div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 📰 4. المركز الإخباري (Bento Grid Architecture) */}
      {magazineItems.length > 0 && (
        <section className="py-28 relative z-10 bg-[#050A15]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-16">
              <div className="flex items-center gap-5"><div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center"><Newspaper className="w-8 h-8 text-emerald-500" /></div><div><h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">المركز الإخباري</h2><p className="text-slate-400 font-bold text-base">تغطية معمارية لأهم المنجزات.</p></div></div>
              <Link href="/archive/news" className="px-8 py-4 rounded-full bg-white/5 text-white font-black text-sm hover:bg-emerald-600 transition-all flex items-center gap-3 border border-white/10 hover:scale-105">الأرشيف الصحفي <ArrowLeft className="w-4 h-4" /></Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-7 xl:col-span-8 group cursor-pointer relative h-[500px] sm:h-[650px] rounded-[3rem] overflow-hidden shadow-2xl bg-[#0F172A] border border-white/5 hover:border-emerald-500/50 transition-colors flex flex-col">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out z-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent z-10"></div>
                  <div className="relative z-20 p-8 sm:p-14 flex flex-col justify-end h-full">
                    <div className="flex flex-wrap items-center gap-3 mb-6">{pinnedArticle.is_pinned && <span className="px-4 py-2 bg-emerald-500 text-[#020617] shadow-[0_0_20px_rgba(16,185,129,0.4)] text-xs font-black rounded-xl flex items-center gap-1.5"><Star className="w-4 h-4" /> رئيسي</span>}<span className="text-white text-xs font-bold flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10"><User className="w-4 h-4 text-emerald-400" /> {pinnedArticle.author_name}</span></div>
                    <h3 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.2] mb-6 group-hover:text-emerald-400 transition-colors drop-shadow-xl">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-bold text-base sm:text-lg max-w-3xl line-clamp-2 mb-8 leading-relaxed">{pinnedArticle.excerpt}</p>
                    <div className="inline-flex items-center gap-2 text-[#020617] font-black text-sm bg-white w-max px-8 py-4 rounded-full group-hover:bg-emerald-400 transition-all shadow-[0_10px_20px_rgba(0,0,0,0.5)]">اقرأ التفاصيل <ArrowUpRight className="w-5 h-5" /></div>
                  </div>
                </motion.div>
              )}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 sm:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15, type: 'spring' }} className="flex-1 group cursor-pointer relative rounded-[2.5rem] overflow-hidden shadow-xl bg-[#0F172A] border border-white/5 hover:border-white/20 min-h-[200px] flex flex-col">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0" />
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"></div>
                    <div className="relative z-20 p-6 sm:p-8 flex flex-col justify-end h-full"><span className="text-emerald-400 text-xs font-black mb-3 flex items-center gap-2 drop-shadow-md"><User className="w-4 h-4" /> {article.author_name}</span><h3 className="text-xl sm:text-2xl font-black text-white leading-snug group-hover:text-emerald-300 transition-colors drop-shadow-md">{article.title}</h3></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🚀 5. الخاتمة والدعوة (Grand Footer CTA) */}
      <section className="py-32 relative z-10 bg-[#020617] border-t border-white/5 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
           <div className="w-28 h-28 bg-[#0F172A] rounded-[2.5rem] border border-white/10 flex items-center justify-center mx-auto mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"><Compass className="w-14 h-14 text-indigo-500" /></div>
           <h2 className="text-5xl sm:text-8xl font-black text-white mb-8 tracking-tighter">جاهز للانطلاق؟</h2>
           <p className="text-slate-400 font-bold text-xl sm:text-2xl mb-14 max-w-2xl mx-auto leading-relaxed">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً على مستوى البلاد.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-4 px-14 py-7 bg-white text-[#020617] rounded-full font-black text-xl hover:bg-indigo-600 hover:text-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"><span>{user ? 'دخول لوحة القيادة' : 'تسجيل الدخول للمنصة'}</span><ArrowLeft className="w-6 h-6" /></Link>
        </div>
      </section>

      {/* 🖼️ النوافذ المنبثقة (Cinematic Modals) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/95 backdrop-blur-2xl p-4 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl bg-black rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-6 left-6 z-50 w-14 h-14 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20 shadow-2xl"><X className="w-6 h-6" /></button>
              <div className="relative w-full flex-1 bg-black flex items-center justify-center min-h-[50vh] max-h-[85vh]">{activeMedia.media_type === 'video' ? (<video src={activeMedia.media_url} controls autoPlay className="w-full h-full max-h-[85vh] object-contain" />) : (<img src={activeMedia.media_url} alt={activeMedia.title} className="w-full h-full max-h-[85vh] object-contain" />)}</div>
              <div className="p-8 bg-[#0F172A] border-t border-white/5 relative z-10"><h3 className="text-white font-black text-3xl">{activeMedia.title}</h3></div>
            </motion.div>
          </motion.div>
        )}
        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 backdrop-blur-xl p-4 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 50 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-5xl bg-[#0F172A] rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[90vh] border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="relative h-72 sm:h-[400px] shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-6 left-6 z-50 w-14 h-14 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-2xl transition-colors border border-white/20"><X className="w-7 h-7" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent"></div>
              </div>
              <div className="px-8 sm:px-16 pb-16 pt-8 overflow-y-auto custom-scrollbar relative z-10 bg-[#0F172A]">
                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6"><span className="text-slate-400 flex items-center gap-2 text-base font-bold"><Calendar className="w-5 h-5" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span><span className="w-2 h-2 rounded-full bg-white/20"></span><span className="text-emerald-400 flex items-center gap-2 text-base font-bold"><User className="w-5 h-5" /> {activeArticle.author_name}</span></div>
                <h2 className="text-4xl sm:text-6xl font-black text-white mb-10 leading-[1.2] tracking-tight">{activeArticle.title}</h2>
                <div className="prose prose-invert prose-xl max-w-none text-slate-300 font-medium leading-loose"><p className="text-2xl text-white font-bold mb-10 p-8 sm:p-10 bg-white/5 rounded-3xl border-l-4 border-emerald-500 shadow-inner">{activeArticle.excerpt}</p></div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}} />
    </div>
  );
}
