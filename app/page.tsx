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
  color_gradient: 'from-indigo-600 to-blue-600',
  type: 'welcome'
};

export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  
  const [hangingRibbonUrl, setHangingRibbonUrl] = useState<string | null>(null); // 🎀 حالة الوشاح

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
          supabase.from('school_ribbon').select('image_url').eq('id', 1).maybeSingle() // 🎀 جلب الوشاح من الداتا بيز
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
      <div className="h-screen bg-slate-50 flex items-center justify-center">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg"></div>
            <p className="text-slate-500 font-black tracking-widest text-sm">جاري التحميل...</p>
         </motion.div>
      </div>
    );
  }

  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-cairo overflow-x-hidden selection:bg-indigo-500/30 relative" dir="rtl">
      
      {/* ========================================== */}
      {/* 🎀 الوشاح العمودي المتدلي (The Hanging Ribbon) */}
      {/* ========================================== */}
      {hangingRibbonUrl && (
        <motion.div 
          initial={{ y: '-100%' }} 
          animate={{ y: 0 }} 
          transition={{ type: 'spring', damping: 12, stiffness: 60, delay: 0.5 }}
          whileHover={{ rotate: [-2, 2, -1, 1, 0] }} // اهتزاز فيزيائي خفيف كالهواء
          className="absolute top-0 left-6 sm:left-16 lg:left-32 z-[60] w-20 sm:w-28 md:w-32 h-64 sm:h-80 shadow-2xl cursor-pointer"
          style={{ 
            transformOrigin: 'top center', // لكي يهتز من الأعلى كأنه معلق
            clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' // قص من الأسفل ليعطي شكل وسام
          }}
        >
          <img src={hangingRibbonUrl} alt="Hanging Ribbon" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 mix-blend-overlay"></div>
        </motion.div>
      )}

      {/* 🚨 الشريط الإخباري العلوي */}
      {breakingNews && (
        <div className="w-full bg-indigo-600 text-white flex items-center h-10 relative z-50 shadow-md">
           <div className="bg-indigo-800 px-4 h-full font-black text-xs flex items-center gap-2 shrink-0 z-10">
             <BellRing className="w-3.5 h-3.5 animate-pulse" /> إعلان
           </div>
           <div className="flex-1 overflow-hidden h-full flex items-center">
             <div className="marquee-content whitespace-nowrap font-bold text-xs tracking-wide flex gap-12">
                <span>{breakingNews}</span><span>{breakingNews}</span>
             </div>
           </div>
        </div>
      )}

      {/* 🌟 1. الواجهة الترحيبية (Clean, Airy Hero) */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-10 pb-20 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-indigo-100 rounded-full blur-[100px] pointer-events-none opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] bg-emerald-50 rounded-full blur-[100px] pointer-events-none opacity-60"></div>

        <div className="absolute top-8 right-8 z-20">
          <Link href={portal.href} className="px-6 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-full font-black text-sm flex items-center gap-2 transition-all shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
             <portal.icon className="w-4 h-4 rotate-180" /> {portal.text}
          </Link>
        </div>

        <div className="relative z-10 text-center max-w-5xl px-6 w-full flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlideData.id}
              initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(5px)' }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center w-full"
            >
              
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-black mb-8 shadow-sm">
                  <SlideIcon className="w-4 h-4" /> {currentSlideData.badge_text}
                </div>
              )}
              
              <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8 text-transparent bg-clip-text bg-gradient-to-l ${currentSlideData.color_gradient || 'from-indigo-600 to-blue-600'}`}>
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-slate-600 text-lg sm:text-xl font-bold max-w-3xl mx-auto leading-relaxed mb-10">
                  {currentSlideData.description}
                </p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-10">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 pr-4 shadow-xl shadow-slate-200/50">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-500 drop-shadow-md z-10 rotate-12" />
                        <img src={student.img} alt={student.name} className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{student.name}</p>
                        <p className="text-[10px] font-bold text-slate-500">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-10 w-full max-w-3xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100">
                    <img src={currentSlideData.media_url} alt="Media" className="w-full h-auto max-h-96 object-cover" />
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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
          </div>
        )}
      </section>

      {/* 📣 2. الإعلانات السريعة (Airy Cards) */}
      <div id="explore" className="pt-10"></div>
      {announcements.length > 0 && (
        <section className="py-16 relative z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center"><Megaphone className="w-6 h-6 text-rose-600" /></div>
              <h2 className="text-3xl font-black text-slate-800">إعلانات <span className="text-rose-600">هامة</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {announcements.map((ann, i) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} key={ann.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-rose-200 hover:shadow-2xl hover:shadow-rose-500/5 transition-all hover:-translate-y-1 relative group">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">{ann.tag || 'إعلان'}</span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 leading-relaxed">{ann.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🎬 3. الاستوديو البصري (Interactive Lightbox Gallery) */}
      {studioItems.length > 0 && (
        <section className="py-20 relative z-10 bg-white border-y border-slate-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner"><Video className="w-7 h-7 text-indigo-600" /></div>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1">المكتبة البصرية</h2>
                <p className="text-slate-500 font-bold text-sm">نظرة حية من داخل أسوار الرفعة.</p>
              </div>
            </div>
            <Link href="/archive/gallery" className="px-6 py-3 rounded-xl bg-slate-50 text-slate-700 font-black text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm border border-slate-200">
              الأرشيف الكامل <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-6 px-4 sm:px-6 lg:px-8 pb-12 snap-x snap-mandatory hide-scrollbar" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1 }}
                key={media.id} 
                className="relative shrink-0 w-[85vw] sm:w-[450px] aspect-[4/3] rounded-[2rem] overflow-hidden snap-center group bg-slate-100 shadow-lg cursor-pointer"
                onClick={() => setActiveMedia(media)} 
              >
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                
                {media.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                      <Play className="w-6 h-6 text-indigo-600 ml-1" fill="currentColor" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h3 className="text-lg font-black text-white leading-snug drop-shadow-md line-clamp-2">{media.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 📰 4. المركز الإخباري (Bento Grid + Reading Modal) */}
      {magazineItems.length > 0 && (
        <section className="py-24 relative z-10 bg-[#F8FAFC]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner"><Newspaper className="w-7 h-7 text-emerald-600" /></div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-1">المركز الإخباري</h2>
                  <p className="text-slate-500 font-bold text-sm">تغطية شاملة لأهم الأخبار والمقالات.</p>
                </div>
              </div>
              <Link href="/archive/news" className="px-6 py-3 rounded-xl bg-white text-slate-700 font-black text-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 shadow-sm border border-slate-200">
                جميع الأخبار <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {pinnedArticle && (
                <motion.div onClick={() => setActiveArticle(pinnedArticle)} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative h-[450px] sm:h-[550px] rounded-[2.5rem] overflow-hidden shadow-xl bg-slate-900">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90"></div>
                  
                  <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end z-10">
                    <div className="flex items-center gap-3 mb-5">
                      {pinnedArticle.is_pinned && <span className="px-3 py-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded-lg">رئيسي</span>}
                      <span className="text-slate-200 text-xs font-bold flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg"><User className="w-3 h-3 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4 group-hover:text-emerald-400 transition-colors">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-bold text-sm sm:text-base max-w-2xl line-clamp-2 mb-6">{pinnedArticle.excerpt}</p>
                    
                    <div className="inline-flex items-center gap-2 text-emerald-400 font-black text-sm bg-white/10 w-max px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      اقرأ المزيد <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="lg:col-span-4 flex flex-col gap-6">
                {sideArticles.map((article, idx) => (
                  <motion.div onClick={() => setActiveArticle(article)} key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[2rem] overflow-hidden shadow-md bg-slate-900 min-h-[220px]">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent">
                      <span className="text-emerald-300 text-[10px] font-bold mb-2 flex items-center gap-1.5"><User className="w-3 h-3" /> {article.author_name}</span>
                      <h3 className="text-lg sm:text-xl font-black text-white leading-snug group-hover:text-emerald-400 transition-colors">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}

                {sideArticles.length < 2 && (
                  <Link href="/archive/news" className="flex-1 bg-white p-8 rounded-[2rem] border border-slate-200 flex flex-col justify-center text-center group hover:border-emerald-300 hover:shadow-xl transition-all">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-4 group-hover:text-emerald-500 transition-colors" />
                    <h3 className="text-xl font-black text-slate-800 mb-2">أرشيف الأخبار</h3>
                    <p className="text-xs text-slate-500 font-bold mb-6">استكشف جميع المقالات السابقة.</p>
                    <span className="text-emerald-600 font-black text-sm flex items-center justify-center gap-2">تصفح <ArrowLeft className="w-4 h-4" /></span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 🚀 5. الخاتمة والدعوة */}
      <section className="py-24 relative z-10 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
           <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-indigo-100">
              <Compass className="w-10 h-10 text-indigo-600" />
           </div>
           <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-6 tracking-tight">مستعد للبدء؟</h2>
           <p className="text-slate-500 font-bold text-lg mb-12 max-w-xl mx-auto">انضم الآن إلى مجتمع مدرستك في منصة التعليم الرقمي الأقوى والأكثر تطوراً.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-full font-black text-lg hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1">
             <span>{user ? 'العودة للوحة القيادة' : 'تسجيل الدخول'}</span>
             <ArrowLeft className="w-5 h-5" />
           </Link>
        </div>
      </section>

      {/* 🖼️ المشغلات المنبثقة الذكية (Modals & Lightboxes) */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-5xl bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveMedia(null)} className="absolute top-4 left-4 z-50 w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/20"><X className="w-6 h-6" /></button>
              {activeMedia.media_type === 'video' ? (
                <video src={activeMedia.media_url} controls autoPlay className="w-full max-h-[80vh] object-contain bg-black" />
              ) : (
                <img src={activeMedia.media_url} alt={activeMedia.title} className="w-full max-h-[80vh] object-contain bg-black" />
              )}
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
                <h3 className="text-white font-black text-xl drop-shadow-md">{activeMedia.title}</h3>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-3xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="relative h-64 sm:h-80 shrink-0">
                <button onClick={() => setActiveArticle(null)} className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/40 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"><X className="w-5 h-5" /></button>
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              </div>
              <div className="px-8 sm:px-12 pb-12 pt-4 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-black border border-emerald-100">{new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="text-slate-500 text-xs font-bold flex items-center gap-1"><User className="w-3 h-3" /> {activeArticle.author_name}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-8 leading-tight">{activeArticle.title}</h2>
                <div className="prose prose-slate prose-lg max-w-none text-slate-600 font-medium leading-loose">
                  <p>{activeArticle.excerpt}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .marquee-content { display: inline-block; animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
        @keyframes bounce-x { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-25%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />
    </div>
  );
}
