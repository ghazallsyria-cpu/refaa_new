/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/page.tsx
 * @version     3.4.0 (Aurora Glass Final Build Fix)
 * @description الواجهة الرئيسية للحرم الرقمي بنمط (Aurora Glass).
 * * 🛠️ التحديث الحالي (V3.4.0):
 * - إصلاح خطأ `pinnedArticle is not defined` الذي تسبب في فشل البناء (Build).
 * - استعادة كافة الأقسام (الوشاح الكامل، الاستوديو، الإعلانات، والخاتمة).
 * - تحسين اتجاه الشريط العاجل (من اليسار لليمين).
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

  // 🚀 هذه المتغيرات هي سبب انهيار البناء السابق، تمت إضافتها هنا بشكل صحيح
  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

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
      
      {/* 🎀 الوشاح المتدلي المطور */}
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

      {/* 🌟 1. الواجهة الترحيبية */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-12 pb-24 overflow-hidden border-b border-white/5">
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

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4">
            <a href="#explore" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
              استكشف الحرم <ArrowLeft className="w-4 h-4 animate-bounce-x" />
            </a>
          </motion.div>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-500 ${currentSlide === i ? 'w-12 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'w-2.5 bg-white/10 hover:bg-white/30'}`} />
            ))}
          </div>
        )}
      </section>

      {/* 📣 2. الإعلانات السريعة */}
      <div id="explore" className="pt-10"></div>
      {announcements.length > 0 && (
        <section className="py-20 relative z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Megaphone className="w-7 h-7 text-rose-400" /></div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">إعلانات <span className="text-transparent bg-clip-text bg-gradient-to-l from-rose-400 to-orange-300">سريعة</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {announcements.map((ann, i) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} key={ann.id} className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 hover:border-rose-400/50 hover:bg-white/10 transition-all hover:-translate-y-2 shadow-2xl relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[50px] group-hover:bg-rose-500/20 transition-colors"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="text-[11px] font-black text-rose-300 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">{ann.tag || 'إعلان'}</span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-200 leading-relaxed relative z-10 group-hover:text-white transition-colors">{ann.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🎬 3. الاستوديو البصري */}
      {studioItems.length > 0 && (
        <section className="py-24 relative z-10 bg-[#070b14] border-y border-white/5 shadow-[inset_0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute left-0 top-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Video className="w-7 h-7 text-indigo-400" /></div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">المكتبة البصرية</h2>
                <p className="text-indigo-200/60 font-bold text-sm">نظرة حية من داخل أسوار الرفعة.</p>
              </div>
            </div>
            <Link href="/archive/gallery" className="px-6 py-3.5 rounded-2xl bg-white/5 text-slate-300 font-bold text-sm hover:bg-white hover:text-black transition-all flex items-center gap-2 shadow-sm border border-white/10 hover:scale-105">
              الأرشيف الكامل <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-6 px-4 sm:px-6 lg:px-8 pb-12 snap-x snap-mandatory hide-scrollbar relative z-10" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1 }}
                key={media.id} 
                className="relative shrink-0 w-[85vw] sm:w-[500px] aspect-[4/3] rounded-[2.5rem] overflow-hidden snap-center group bg-[#0B1120] shadow-2xl cursor-pointer border border-white/10"
                onClick={() => setActiveMedia(media)} 
              >
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 group-hover:opacity-60 transition-all duration-700 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {media.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      <Play className="w-8 h-8 text-white ml-2 drop-shadow-md" fill="currentColor" />
                    </div>
                  </div>
                )}
                
                <div className="absolute top-6 right-6 z-10 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md text-white text-[11px] font-black flex items-center gap-2 border border-white/10 shadow-lg">
                  {media.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />} {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-snug drop-shadow-2xl line-clamp-2 mb-3">{media.title}</h3>
                  <div className="w-12 h-1 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 📰 4. المركز الإخباري */}
      {magazineItems.length > 0 && (
        <section className="py-24 relative z-10 bg-[#0B1120]">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner"><Newspaper className="w-7 h-7 text-emerald-400" /></div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">المركز الإخباري</h2>
                  <p className="text-emerald-200/60 font-bold text-sm">تغطية شاملة لأهم الأخبار والمقالات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-6 py-3.5 rounded-2xl bg-white/5 text-slate-300 font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 shadow-sm border border-white/10 hover:scale-105">
                جميع الأخبار <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative h-[500px] sm:h-[600px] rounded-[3rem] overflow-hidden shadow-2xl bg-black border border-white/10">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-40 transition-all duration-1000 ease-out mix-blend-luminosity group-hover:mix-blend-normal" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                  
                  <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end z-10">
                    <div className="flex items-center gap-3 mb-6">
                      {pinnedArticle.is_pinned && <span className="px-4 py-1.5 bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] text-[11px] font-black rounded-xl">رئيسي</span>}
                      <span className="text-slate-300 text-xs font-bold flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10"><User className="w-3.5 h-3.5 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-[1.2] mb-6 group-hover:text-emerald-300 transition-colors drop-shadow-xl">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-medium text-sm sm:text-lg max-w-3xl line-clamp-2 mb-8 leading-relaxed opacity-90">{pinnedArticle.excerpt}</p>
                    
                    <div className="inline-flex items-center gap-2 text-white font-black text-sm bg-white/10 w-max px-6 py-3.5 rounded-full backdrop-blur-md border border-white/20 group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-all shadow-lg">
                      اقرأ المقال كاملاً <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[2.5rem] overflow-hidden shadow-xl bg-black border border-white/10 min-h-[250px]">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 group-hover:opacity-60 transition-all duration-700 ease-out mix-blend-luminosity group-hover:mix-blend-normal" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end z-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <span className="text-emerald-400/90 text-[11px] font-bold mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {article.author_name}</span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-snug group-hover:text-emerald-300 transition-colors">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}

                {sideArticles.length < 2 && (
                  <Link href="/archive/news" className="flex-1 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col justify-center text-center group hover:bg-white/10 transition-all backdrop-blur-md shadow-inner">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                       <BookOpen className="w-8 h-8 text-slate-300 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">أرشيف الأخبار</h3>
                    <p className="text-xs text-slate-400 font-bold mb-6">استكشف جميع المقالات السابقة.</p>
                    <span className="text-emerald-400 font-black text-sm flex items-center justify-center gap-2">تصفح المكتبة <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /></span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🚀 5. الخاتمة والدعوة */}
      <section className="py-32 relative z-10 bg-[#070b14] border-t border-white/5 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
           <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center mx-auto mb-10 shadow-2xl backdrop-blur-xl">
              <Compass className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
           </div>
           <h2 className="text-5xl sm:text-7xl font-black text-white mb-8 tracking-tight">جاهز للانطلاق؟</h2>
           <p className="text-slate-400 font-bold text-xl mb-14 max-w-xl mx-auto leading-relaxed">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-4 px-12 py-6 bg-white text-[#0B1120] rounded-full font-black text-xl hover:bg-indigo-50 hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-95">
             <span>{user ? 'العودة للوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-6 h-6" />
           </Link>
        </div>
      </section>

      {/* 🖼️ المشغلات المنبثقة الذكية (Modals & Lightboxes) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1120]/95 backdrop-blur-2xl p-4 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-6 left-6 z-50 w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/20 shadow-xl"><X className="w-6 h-6" /></button>
              {activeMedia.media_type === 'video' ? (
                <video src={activeMedia.media_url} controls autoPlay className="w-full max-h-[85vh] object-contain bg-black" />
              ) : (
                <img src={activeMedia.media_url} alt={activeMedia.title} className="w-full max-h-[85vh] object-contain bg-black" />
              )}
              <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black to-transparent pointer-events-none">
                <h3 className="text-white font-black text-2xl drop-shadow-md">{activeMedia.title}</h3>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1120]/80 backdrop-blur-md p-4 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-4xl bg-[#0F172A] rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="relative h-72 sm:h-96 shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-6 left-6 z-50 w-12 h-12 bg-black/40 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20"><X className="w-6 h-6" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/20 to-transparent"></div>
                <div className="absolute bottom-6 right-8 z-10 flex gap-3">
                   {activeArticle.is_pinned && <span className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">خبر رئيسي</span>}
                </div>
              </div>
              <div className="px-8 sm:px-14 pb-14 pt-2 overflow-y-auto custom-scrollbar relative z-10">
                <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-6">
                  <span className="text-slate-400 flex items-center gap-1.5 text-sm font-bold"><Calendar className="w-4 h-4" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                  <span className="text-emerald-400 flex items-center gap-1.5 text-sm font-bold"><User className="w-4 h-4" /> بقلم: {activeArticle.author_name}</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white mb-8 leading-[1.3] tracking-tight">{activeArticle.title}</h2>
                <div className="prose prose-invert prose-lg max-w-none text-slate-300 font-medium leading-loose">
                  <p className="text-xl text-slate-200 font-bold mb-6 p-6 bg-white/5 rounded-2xl border-l-4 border-emerald-500">{activeArticle.excerpt}</p>
                  <p className="opacity-50">تفاصيل المقال الكاملة ستتاح قريباً مع محرر الإدارة المتقدم...</p>
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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
