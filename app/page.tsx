'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, 
  ArrowLeft, Star, Users, Crown, Compass, Newspaper, Video, ChevronLeft, BellRing, Megaphone, ArrowUpRight, GraduationCap, Quote, Trophy
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

// ==========================================
// 🗺️ خريطة الأيقونات الديناميكية للسلايدر
// ==========================================
const ICON_MAP: Record<string, any> = {
  'Sparkles': Sparkles,
  'Trophy': Trophy,
  'Quote': Quote,
  'Image': ImageIcon
};

const DEFAULT_SLIDE = {
  id: 'default',
  icon_name: 'Sparkles',
  badge_text: 'نظام إدارة التعلم الذكي 2026',
  title: 'مدرسة الرفعة',
  description: 'بيئة تعليمية متكاملة تجمع بين أصالة التربية وحداثة التكنولوجيا. تواصل، تعلم، واكتشف إمكانياتك في حرمنا الرقمي.',
  color_gradient: 'from-indigo-400 via-blue-400 to-emerald-400',
  type: 'welcome'
};

// ==========================================
// 🏛️ الحرم الرقمي الماسي لمدرسة الرفعة (Premium Digital Campus)
// ==========================================
export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  
  // 🗃️ مساحات تخزين البيانات الحقيقية
  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  
  // 🎭 حالة الـ Hero Slider الديناميكي
  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [fetching, setFetching] = useState(true);

  // 📡 جلب البيانات الديناميكية من لوحة تحكم المدير
  useEffect(() => {
    const fetchCampusContent = async () => {
      try {
        const [studioRes, magazineRes, annRes, tickerRes, heroRes] = await Promise.all([
          supabase.from('school_studio').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
          supabase.from('school_magazine').select('*').order('created_at', { ascending: false }).limit(4),
          supabase.from('school_announcements').select('*').order('created_at', { ascending: false }).limit(3),
          supabase.from('school_ticker').select('*').order('created_at', { ascending: false }).limit(5),
          // 🚀 جلب بيانات الهيدر الديناميكي الخاص بالمنتديات وعرضه هنا
          supabase.from('forum_hero_slides').select('*').eq('is_active', true).order('sort_order', { ascending: false }).order('created_at', { ascending: false })
        ]);
        
        if (studioRes.data) setStudioItems(studioRes.data);
        if (magazineRes.data) setMagazineItems(magazineRes.data);
        if (annRes.data) setAnnouncements(annRes.data);
        if (tickerRes.data) setTickers(tickerRes.data);
        if (heroRes.data && heroRes.data.length > 0) setHeroSlides(heroRes.data);
      } catch (e) {
        console.error("Content fetch failed", e);
      } finally {
        setFetching(false);
      }
    };
    fetchCampusContent();
  }, []);

  // 🔄 تحريك السلايدر التلقائي
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 7000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // 🚨 تجميع شريط الأخبار العاجلة الحقيقي
  const breakingNews = tickers.length > 0 
    ? tickers.map(t => `✨ ${t.content}`).join('   |   ')
    : "مرحباً بكم في منصة الرفعة الرقمية، حيث نصنع المستقبل معاً...";

  const getPortalLink = () => {
    if (!user) return { href: '/login', text: 'تسجيل الدخول للمنصة', icon: ArrowLeft };
    const routes = { admin: '/dashboard', management: '/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', parent: '/dashboard/parent' };
    return { 
      href: routes[authRole as keyof typeof routes] || '/dashboard', 
      text: authRole === 'student' ? 'الدخول لحقيبتي' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', 
      icon: authRole === 'admin' ? Crown : ArrowLeft 
    };
  };

  const portal = getPortalLink();
  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  // 🛡️ شاشة التحميل (أنيقة وسريعة)
  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
         <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold tracking-widest text-sm">جاري تهيئة الحرم...</p>
         </motion.div>
      </div>
    );
  }

  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30 selection:text-white" dir="rtl">
      
      {/* ========================================== */}
      {/* 🌟 1. الواجهة الترحيبية الديناميكية (Dynamic Hero Section) */}
      {/* ========================================== */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-32">
        {/* خلفية Obsidian ناعمة مع إضاءة خفيفة */}
        <motion.div style={{ y: yBackground }} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </motion.div>

        <motion.div style={{ opacity: opacityHero }} className="relative z-10 text-center max-w-5xl px-6 w-full flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlideData.id}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center text-center w-full"
            >
              
              {/* الشارة العلوية (Badge) */}
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-sm mb-8">
                  <SlideIcon className="w-5 h-5 text-indigo-400" />
                  <span className="text-slate-300 font-bold tracking-wide text-sm">{currentSlideData.badge_text}</span>
                </div>
              )}
              
              {/* العنوان الرئيسي بألوان ديناميكية */}
              <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.1] mb-8 text-transparent bg-clip-text bg-gradient-to-r ${currentSlideData.color_gradient || 'from-indigo-400 via-blue-400 to-emerald-400'}`}>
                {currentSlideData.title}
              </h1>
              
              {/* الوصف */}
              {currentSlideData.description && (
                <p className="text-slate-400 text-lg sm:text-xl font-medium max-w-3xl mx-auto leading-relaxed mb-10">
                  {currentSlideData.description}
                </p>
              )}

              {/* بطاقات الطلاب الأوائل (إن وجدت في إعدادات السلايدر) */}
              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-10">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-3 pr-4 shadow-xl">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-400 drop-shadow-md z-10 rotate-12" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={student.img} alt={student.name} className="w-12 h-12 rounded-full border-2 border-white/50 shadow-inner bg-white/50 object-cover" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{student.name}</p>
                        <p className="text-[10px] font-bold text-slate-300">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* الوسائط (صورة ترحيبية إن وجدت) */}
              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="mb-10 w-full max-w-2xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentSlideData.media_url} alt="Media" className="w-full h-auto max-h-80 object-cover" />
                 </motion.div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* الأزرار الثابتة للانطلاق */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="flex flex-col sm:flex-row items-center gap-4 relative z-20">
            <Link href={portal.href} className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-[#050505] rounded-2xl font-black text-lg overflow-hidden transition-all hover:bg-slate-100 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <portal.icon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>{portal.text}</span>
            </Link>
            <a href="#explore" className="px-10 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-white font-bold text-lg hover:bg-white/10 transition-all">
              استكشف الحرم
            </a>
          </motion.div>
        </motion.div>

        {/* مؤشرات التبديل السفلية للسلايدر */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {heroSlides.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-8 bg-indigo-500' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* شريط الأخبار الأنيق */}
      {tickers.length > 0 && (
        <div className="w-full bg-[#0a0a0a] border-y border-white/5 flex items-center relative z-20">
           <div className="bg-indigo-600 text-white px-6 py-3 font-black text-sm flex items-center gap-2 shrink-0 z-10 shadow-lg">
             <BellRing className="w-4 h-4 animate-pulse" /> الأخبار
           </div>
           <div className="flex-1 overflow-hidden">
             <div className="marquee-content whitespace-nowrap text-slate-300 font-bold text-sm tracking-wide py-3 flex gap-12">
                <span>{breakingNews}</span>
                <span>{breakingNews}</span>
             </div>
           </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 📣 2. لوحة الإعلانات (Clean Cards) */}
      {/* ========================================== */}
      <div id="explore" className="pt-20"></div>
      {announcements.length > 0 && (
        <section className="py-12 relative z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {announcements.map((ann, i) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} key={ann.id} className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all hover:-translate-y-1 shadow-lg group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">{ann.tag || 'إعلان'}</span>
                    <span className="text-xs font-bold text-slate-500">{new Date(ann.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-200 leading-relaxed relative z-10">{ann.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 🎬 3. الاستوديو البصري (Apple-like Gallery) */}
      {/* ========================================== */}
      {studioItems.length > 0 && (
        <section className="py-20 relative z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex items-end justify-between">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">المكتبة <span className="text-indigo-400">البصرية</span></h2>
              <p className="text-slate-400 font-medium">نظرة حية من داخل أسوار مدرستنا وفعالياتها.</p>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-6 px-4 sm:px-6 lg:px-8 pb-12 snap-x snap-mandatory hide-scrollbar" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1 }}
                key={media.id} 
                className="relative shrink-0 w-[85vw] sm:w-[450px] aspect-[4/3] rounded-3xl overflow-hidden snap-center group bg-[#0a0a0a] border border-white/5 shadow-xl"
              >
                {playingVideoId === media.id ? (
                  <div className="absolute inset-0 z-40 bg-black rounded-3xl overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); setPlayingVideoId(null); }} className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors">✕</button>
                    <video src={media.media_url} controls autoPlay className="w-full h-full object-cover" onClick={(e) => e.stopPropagation()} />
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full cursor-pointer" onClick={() => { if (media.media_type === 'video') setPlayingVideoId(media.id); }}>
                    <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80"></div>
                    
                    {media.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:scale-110 transition-all duration-300">
                          <Play className="w-6 h-6 text-white ml-1" fill="currentColor" />
                        </div>
                      </div>
                    )}

                    <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/10">
                      {media.media_type === 'video' ? <Video className="w-3 h-3 text-indigo-300" /> : <ImageIcon className="w-3 h-3 text-emerald-300" />}
                      {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6 z-10">
                      <h3 className="text-xl font-bold text-white leading-snug drop-shadow-md">{media.title}</h3>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 📰 4. المركز الإخباري (Clean Bento Grid) */}
      {/* ========================================== */}
      {magazineItems.length > 0 && (
        <section className="py-20 relative z-10 bg-[#0a0a0a] border-y border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-12">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">المركز <span className="text-emerald-400">الإخباري</span></h2>
              <p className="text-slate-400 font-medium">تغطية شاملة وإضاءات على منجزات مدرستنا.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {pinnedArticle && (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative h-[450px] sm:h-[550px] rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#050505]">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent"></div>
                  
                  <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end z-10">
                    <div className="flex items-center gap-3 mb-5">
                      {pinnedArticle.is_pinned && <span className="px-3 py-1 bg-amber-500 text-[#050505] text-[10px] font-black rounded-lg">خبر رئيسي</span>}
                      <span className="text-slate-200 text-xs font-bold flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10"><Users className="w-3 h-3 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4 group-hover:text-emerald-400 transition-colors">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-medium text-sm sm:text-base max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed mb-6">{pinnedArticle.excerpt}</p>
                    
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      المزيد <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="lg:col-span-4 flex flex-col gap-6">
                {sideArticles.map((article, idx) => (
                  <motion.div key={article.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-1 group cursor-pointer relative rounded-[2rem] overflow-hidden border border-white/5 bg-[#050505] min-h-[220px]">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-out mix-blend-luminosity" />
                    <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent">
                      <span className="text-emerald-400/80 text-[10px] font-bold mb-2 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> {article.author_name}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}

                {sideArticles.length < 2 && (
                  <div className="flex-1 bg-white/5 p-8 rounded-[2rem] border border-white/5 flex flex-col justify-center text-center group hover:bg-white/10 transition-colors">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-4 group-hover:text-white transition-colors" />
                    <h3 className="text-xl font-bold text-white mb-2">أرشيف الأخبار</h3>
                    <p className="text-xs text-slate-400 mb-6">استكشف جميع المقالات السابقة.</p>
                    <button className="px-6 py-2.5 rounded-xl bg-white text-[#050505] font-bold text-sm hover:scale-105 transition-transform">تصفح الأرشيف</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 🚀 5. الخاتمة الهادئة */}
      {/* ========================================== */}
      <section className="py-24 relative z-10 bg-[#050505]">
        <div className="max-w-3xl mx-auto px-6 text-center">
           <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
              <Compass className="w-8 h-8 text-indigo-400" />
           </div>
           <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">جاهز للبدء؟</h2>
           <p className="text-slate-400 font-medium mb-10">سجل دخولك الآن للوصول إلى لوحة التحكم الخاصة بك والموارد التعليمية.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
             <span>{user ? 'الذهاب للوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-5 h-5" />
           </Link>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .marquee-content { display: inline-block; animation: marquee 40s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}} />
    </div>
  );
}
