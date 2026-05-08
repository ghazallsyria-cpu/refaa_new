'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, 
  ArrowLeft, Star, Users, Crown, Compass, Newspaper, Video, ChevronLeft, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

// ==========================================
// 🏛️ الحرم الرقمي لمدرسة الرفعة (The Digital Campus Hub)
// المسار: app/page.tsx
// ==========================================
export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  // ⚡ تأثيرات الحركة المتقدمة (Parallax)
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // 🗃️ حالات البيانات القادمة من قاعدة البيانات
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // ==========================================
  // 📡 جلب بيانات الحرم (Studio & Magazine)
  // يتم استدعاؤها لتعرض ما أدخله المدير في لوحة التحكم
  // ==========================================
  useEffect(() => {
    const fetchCampusContent = async () => {
      try {
        const [studioRes, magazineRes] = await Promise.all([
          supabase.from('school_studio').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(8),
          supabase.from('school_magazine').select('*').order('created_at', { ascending: false }).limit(4)
        ]);
        if (studioRes.data) setStudioItems(studioRes.data);
        if (magazineRes.data) setMagazineItems(magazineRes.data);
      } catch (e) {
        console.error("Content fetch failed", e);
      } finally {
        setFetching(false);
      }
    };
    fetchCampusContent();
  }, []);

  // ==========================================
  // 🧭 نظام التوجيه الذكي (Smart Routing Engine)
  // يتعرف على المستخدم ويوجهه لمملكته الخاصة
  // ==========================================
  const getPortalLink = () => {
    if (!user) return { href: '/login', text: 'بوابة تسجيل الدخول', icon: ArrowLeft };
    const routes = {
      admin: '/dashboard',
      management: '/dashboard',
      teacher: '/dashboard/teacher',
      student: '/dashboard/student',
      parent: '/dashboard/parent'
    };
    return { 
      href: routes[authRole as keyof typeof routes] || '/dashboard', 
      text: authRole === 'student' ? 'حقيبتي الدراسية' : authRole === 'teacher' ? 'قاعة المعلمين' : 'مركز القيادة', 
      icon: authRole === 'admin' ? Crown : ArrowLeft 
    };
  };

  const portal = getPortalLink();

  // 🛡️ شاشة تحميل مبدئية أنيقة أثناء فحص الجلسة
  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-[#02040a] flex items-center justify-center">
         <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="relative">
            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
            <Compass className="w-20 h-20 text-amber-500 drop-shadow-2xl relative z-10" />
         </motion.div>
      </div>
    );
  }

  // فصل المقال المميز (Pinned) عن باقي المقالات لعرضه بشكل ضخم
  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-cairo overflow-x-hidden selection:bg-amber-500 selection:text-slate-900" dir="rtl">
      
      {/* ========================================== */}
      {/* 🌌 1. قسم البداية (The Cinematic Hero Section) */}
      {/* ========================================== */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: yBackground }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.15] mix-blend-overlay"></div>
          <div className="absolute top-1/4 right-1/4 w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-[30vw] h-[30vw] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02040a]/50 to-[#02040a]"></div>
        </motion.div>

        <motion.div style={{ opacity: opacityHero }} className="relative z-10 text-center max-w-5xl px-6 flex flex-col items-center">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 15, duration: 1.5 }} className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex items-center justify-center mb-8 relative">
            <Compass className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
            <div className="absolute inset-0 rounded-[2.5rem] border border-amber-400/20 animate-[spin_10s_linear_infinite]"></div>
          </motion.div>

          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <h2 className="text-amber-500 font-black tracking-[0.3em] uppercase text-xs sm:text-sm mb-4 flex items-center justify-center gap-2 drop-shadow-md">
              <Sparkles className="w-4 h-4" /> صرح تعليمي ينبض بالحياة
            </h2>
            <h1 className="text-6xl sm:text-7xl md:text-9xl font-black text-white tracking-tight leading-none mb-6 drop-shadow-2xl">
              الـرفــعــة
            </h1>
            <p className="text-slate-400 text-lg sm:text-2xl font-bold max-w-2xl mx-auto leading-relaxed mb-12 opacity-90">
              أكثر من مجرد منصة... إنه حرمك المدرسي الرقمي. تواصل، تعلم، وكن جزءاً من المستقبل اليوم.
            </p>
          </motion.div>

          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}>
            <Link href={portal.href} className="group relative inline-flex items-center justify-center gap-3 px-10 sm:px-14 py-5 sm:py-6 bg-white text-[#02040a] rounded-[2rem] font-black text-lg sm:text-xl overflow-hidden transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:-translate-y-1">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <portal.icon className="w-6 h-6 sm:w-7 sm:h-7 relative z-10 group-hover:-translate-x-1 transition-transform" />
              <span className="relative z-10">{portal.text}</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* مؤشر النزول للأسفل */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-500 flex flex-col items-center gap-2 opacity-50">
          <span className="text-[10px] font-black uppercase tracking-widest">اكتشف الحرم</span>
          <div className="w-0.5 h-12 bg-gradient-to-b from-slate-500 to-transparent rounded-full"></div>
        </motion.div>
      </section>

      {/* ========================================== */}
      {/* 🎬 2. استوديو الرفعة (Cinematic Studio Slider) */}
      {/* ========================================== */}
      {studioItems.length > 0 && (
        <section className="py-24 relative z-10 bg-[#050814] border-t border-white/5">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-widest mb-4 shadow-inner">
                <Video className="w-4 h-4" /> استوديو المدرسة
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white">عدسة <span className="text-indigo-400 drop-shadow-[0_0_15px_rgba(79,70,229,0.5)]">الرفعة</span></h2>
            </div>
            <div className="hidden sm:flex gap-3">
              <button className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg active:scale-95"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
              <button className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-6 px-4 sm:px-6 lg:px-8 pb-12 snap-x snap-mandatory hide-scrollbar" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1 }}
                key={media.id} 
                className="relative shrink-0 w-[85vw] sm:w-[600px] h-[350px] sm:h-[450px] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden snap-center group cursor-pointer border border-white/10 bg-slate-900 shadow-2xl"
                onClick={() => media.media_type === 'video' && setActiveVideo(media.media_url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {media.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-2 drop-shadow-md" fill="currentColor" />
                    </div>
                  </div>
                )}

                <div className="absolute top-6 left-6 z-10 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-black flex items-center gap-2 shadow-lg">
                  {media.media_type === 'video' ? <Video className="w-4 h-4 text-amber-400" /> : <ImageIcon className="w-4 h-4 text-indigo-400" />}
                  {media.media_type === 'video' ? 'فيديو' : 'لقطة'}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 sm:p-10 z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg line-clamp-2 leading-tight">{media.title}</h3>
                  <div className="w-16 h-1.5 bg-indigo-500 mt-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 shadow-[0_0_10px_rgba(79,70,229,0.8)]"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 📰 3. المجلة الأكاديمية (The Bento Magazine) */}
      {/* ========================================== */}
      {magazineItems.length > 0 && (
        <section className="py-32 relative z-10 bg-[#02040a]">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
          
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-6 shadow-inner">
                <Newspaper className="w-10 h-10 text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">مجلة <span className="text-emerald-400">المعرفة</span></h2>
              <p className="text-slate-400 font-bold text-base sm:text-lg leading-relaxed">نافذتك على آخر الأخبار، المقالات التعليمية، وإبداعات مجتمع الرفعة المدرسي.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              
              {/* المقال الرئيسي (Pinned or Latest) */}
              {pinnedArticle && (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative h-[450px] sm:h-[600px] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/60 to-transparent opacity-95"></div>
                  
                  <div className="absolute inset-0 p-8 sm:p-14 flex flex-col justify-end z-10">
                    <div className="flex items-center gap-3 mb-6">
                      {pinnedArticle.is_pinned && <span className="px-4 py-1.5 bg-amber-500 text-black text-xs font-black rounded-xl shadow-lg flex items-center gap-1"><Star className="w-3 h-3" fill="currentColor" /> خبر هام</span>}
                      <span className="text-slate-300 text-xs font-black flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10"><Users className="w-3 h-3 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-5 group-hover:text-emerald-400 transition-colors drop-shadow-md">{pinnedArticle.title}</h3>
                    <p className="text-slate-300 font-bold text-sm sm:text-lg max-w-2xl line-clamp-2 sm:line-clamp-3 leading-relaxed opacity-90">{pinnedArticle.excerpt}</p>
                    <div className="mt-8 flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                      اقرأ التفاصيل <ArrowLeft className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* المقالات الجانبية (Side Articles) */}
              <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div key={article.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (idx * 0.1) }} className="flex-1 group cursor-pointer relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl bg-[#0f1423] min-h-[250px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700 ease-out mix-blend-luminosity" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end z-10 bg-gradient-to-t from-[#02040a] via-[#02040a]/80 to-transparent">
                      <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> {article.author_name}</span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-snug group-hover:text-indigo-300 transition-colors drop-shadow-md">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}

                {/* بطاقة المكتبة أو الأرشيف (تكملة مساحة الـ Bento Grid) */}
                {sideArticles.length < 2 && (
                  <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex-1 glass-panel p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center text-center group hover:bg-white/5 transition-colors shadow-inner">
                    <BookOpen className="w-12 h-12 text-amber-500 mx-auto mb-5 group-hover:rotate-12 transition-transform drop-shadow-md" />
                    <h3 className="text-2xl font-black text-white mb-3">تصفح الأرشيف</h3>
                    <p className="text-xs font-bold text-slate-400 mb-8 leading-relaxed">مئات المقالات العلمية والأخبار المدرسية بانتظارك في مكتبتنا الرقمية.</p>
                    <button className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white text-white hover:text-[#02040a] font-black text-sm transition-all border border-white/20 active:scale-95 shadow-md">الدخول للمكتبة</button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 📺 مشغل الفيديو المنبثق (Video Modal Overlay) */}
      {/* يعزل المستخدم عن الصفحة ليركز على الفعاليات */}
      {/* ========================================== */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-10"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-6xl aspect-video bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.3)] relative border border-white/10"
              onClick={e => e.stopPropagation()} // منع الإغلاق عند النقر على الفيديو
            >
              <button 
                onClick={() => setActiveVideo(null)} 
                className="absolute top-6 left-6 z-20 w-12 h-12 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/10 shadow-lg"
              >
                ✕
              </button>
              <video src={activeVideo} controls autoPlay className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
