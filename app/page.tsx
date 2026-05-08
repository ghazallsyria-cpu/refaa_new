'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Play, ImageIcon, BookOpen, Sparkles, 
  ArrowLeft, Star, Users, Crown, Compass, Newspaper, Video, ChevronLeft, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

// ==========================================
// 🏛️ الحرم الرقمي الماسي لمدرسة الرفعة (Premium Digital Campus)
// ==========================================
export default function DigitalCampusPage() {
  const { user, authRole, isChecking } = useAuth() as any;
  const { scrollYProgress } = useScroll();
  
  // ⚡ تأثيرات التمرير العميق (Parallax Depth)
  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 0.4], [1, 0.95]);

  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // 📡 جلب البيانات
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

  // 🧭 نظام التوجيه
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
      text: authRole === 'student' ? 'انطلق لحقيبتك الدراسية' : authRole === 'teacher' ? 'الدخول لقاعة المعلمين' : 'مركز القيادة العليا', 
      icon: authRole === 'admin' ? Crown : ArrowLeft 
    };
  };

  const portal = getPortalLink();

  // 🛡️ شاشة تحميل ملكية
  if (isChecking || fetching) {
    return (
      <div className="h-screen bg-[#02040a] flex items-center justify-center overflow-hidden relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
         <motion.div animate={{ scale: [1, 1.1, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }} transition={{ repeat: Infinity, duration: 2.5 }} className="relative z-10 flex flex-col items-center">
            <div className="absolute inset-0 bg-amber-500/20 blur-[50px] rounded-full"></div>
            <Compass className="w-24 h-24 text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] relative z-10" />
         </motion.div>
      </div>
    );
  }

  const pinnedArticle = magazineItems.find(item => item.is_pinned) || magazineItems[0];
  const sideArticles = magazineItems.filter(item => item.id !== pinnedArticle?.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-cairo overflow-x-hidden selection:bg-amber-500 selection:text-slate-900" dir="rtl">
      
      {/* ========================================== */}
      {/* 🌌 1. قسم البداية (The Hyper-Cinematic Hero) */}
      {/* ========================================== */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* خلفية تفاعلية ثلاثية الأبعاد */}
        <motion.div style={{ y: yBackground }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen"></div>
          
          {/* كرات مضيئة متحركة (Floating Orbs) */}
          <motion.div animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} className="absolute top-[10%] right-[15%] w-[45vw] h-[45vw] bg-indigo-600/15 rounded-full blur-[140px] mix-blend-screen"></motion.div>
          <motion.div animate={{ y: [20, -20, 20], x: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }} className="absolute bottom-[5%] left-[10%] w-[35vw] h-[35vw] bg-amber-500/15 rounded-full blur-[120px] mix-blend-screen"></motion.div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02040a]/60 to-[#02040a]"></div>
        </motion.div>

        <motion.div style={{ opacity: opacityHero, scale: scaleHero }} className="relative z-10 text-center max-w-5xl px-6 flex flex-col items-center">
          
          {/* أيقونة التاج/البوصلة مع تأثير الوهج المحيطي */}
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 20, duration: 1.2 }} className="relative mb-10 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-yellow-200 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full"></div>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2.5rem] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
              <Compass className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] relative z-10" />
            </div>
          </motion.div>

          {/* نصوص الدخول بتأثير مسرحي (Staggered Reveal) */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-100/80 font-bold tracking-[0.2em] uppercase text-xs">صرح تعليمي ينبض بالحياة</span>
            </div>
            
            <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-black tracking-tight leading-none mb-6 relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                الـرفــعــة
              </span>
            </h1>
            
            <p className="text-slate-400/90 text-lg sm:text-2xl font-bold max-w-2xl mx-auto leading-relaxed mb-12">
              تجاوز حدود التعليم التقليدي. مرحباً بك في تجربة <span className="text-white">الحرم المدرسي الرقمي</span> الأكثر تطوراً.
            </p>
          </motion.div>

          {/* زر الانطلاق (Magnetic Call to Action) */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <Link href={portal.href} className="group relative inline-flex items-center justify-center gap-4 px-12 py-6 bg-white text-[#02040a] rounded-full font-black text-xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] border border-white/20">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-200 via-white to-amber-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <portal.icon className="w-6 h-6 relative z-10 group-hover:-translate-x-2 transition-transform duration-500" />
              <span className="relative z-10">{portal.text}</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* مؤشر التمرير السلس */}
        <motion.div animate={{ y: [0, 15, 0], opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">استكشف</span>
          <div className="w-px h-16 bg-gradient-to-b from-slate-500 to-transparent"></div>
        </motion.div>
      </section>

      {/* ========================================== */}
      {/* 🎬 2. استوديو الرفعة (The Glass Gallery) */}
      {/* ========================================== */}
      {studioItems.length > 0 && (
        <section className="py-32 relative z-10 bg-[#02040a] border-t border-white/5">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black tracking-widest mb-4">
                <Video className="w-4 h-4" /> المكتبة البصرية
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">عدسة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-300">الرفعة</span></h2>
            </div>
            
            <div className="hidden sm:flex gap-4">
              <button className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md active:scale-95"><ChevronLeft className="w-7 h-7 rotate-180" /></button>
              <button className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md active:scale-95"><ChevronLeft className="w-7 h-7" /></button>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-8 px-4 sm:px-6 lg:px-8 pb-16 snap-x snap-mandatory hide-scrollbar" dir="rtl">
            {studioItems.map((media, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }} whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ delay: index * 0.1, duration: 0.6 }}
                key={media.id} 
                className="relative shrink-0 w-[85vw] sm:w-[600px] h-[400px] sm:h-[500px] rounded-[3rem] overflow-hidden snap-center group cursor-pointer border border-white/10 bg-[#0f1423] shadow-2xl"
                onClick={() => media.media_type === 'video' && setActiveVideo(media.media_url)}
              >
                <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-1000 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {media.media_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
                      <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white group-hover:text-indigo-600 ml-2 drop-shadow-md transition-colors" fill="currentColor" />
                    </div>
                  </div>
                )}

                <div className="absolute top-8 left-8 z-10 px-5 py-2.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 text-white text-xs font-black flex items-center gap-2 shadow-xl">
                  {media.media_type === 'video' ? <Video className="w-4 h-4 text-amber-400" /> : <ImageIcon className="w-4 h-4 text-indigo-400" />}
                  {media.media_type === 'video' ? 'فيديو' : 'لقطة'}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 sm:p-12 z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-2xl sm:text-4xl font-black text-white drop-shadow-2xl leading-tight mb-2">{media.title}</h3>
                  <div className="w-20 h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 📰 3. مجلة المعرفة (The Premium Bento Grid) */}
      {/* ========================================== */}
      {magazineItems.length > 0 && (
        <section className="py-32 relative z-10 bg-[#02040a] border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/5 to-transparent"></div>
          
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex items-center gap-6 mb-20 border-b border-white/5 pb-10">
              <div className="p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                <Newspaper className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <div>
                <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">المركز <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-teal-200">الإخباري</span></h2>
                <p className="text-slate-400 font-bold text-sm sm:text-lg mt-2">مقالات حصرية، تغطيات شاملة، وإبداعات من قلب الحرم.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              
              {/* 👑 المقال الرئيسي */}
              {pinnedArticle && (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-8 group cursor-pointer relative h-[500px] sm:h-[650px] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-slate-900">
                  <img src={pinnedArticle.cover_image} alt={pinnedArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-[#02040a]/80 to-transparent"></div>
                  
                  <div className="absolute inset-0 p-8 sm:p-14 flex flex-col justify-end z-10">
                    <div className="flex items-center gap-4 mb-6">
                      {pinnedArticle.is_pinned && <span className="px-5 py-2 bg-white text-black text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" fill="currentColor" /> خبر هام</span>}
                      <span className="text-slate-300 text-xs font-black flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10"><Users className="w-4 h-4 text-emerald-400" /> {pinnedArticle.author_name}</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 group-hover:text-emerald-300 transition-colors drop-shadow-xl">{pinnedArticle.title}</h3>
                    <p className="text-slate-300/90 font-bold text-sm sm:text-xl max-w-3xl line-clamp-2 sm:line-clamp-3 leading-relaxed">{pinnedArticle.excerpt}</p>
                    
                    <div className="mt-8 flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                      <span className="border-b border-emerald-400 pb-1">اقرأ التفاصيل</span> <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 📰 المقالات الجانبية */}
              <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
                {sideArticles.map((article, idx) => (
                  <motion.div key={article.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (idx * 0.1) }} className="flex-1 group cursor-pointer relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl bg-[#0f1423] min-h-[250px] sm:min-h-0 hover:border-white/20 transition-colors">
                    <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-1000 ease-out mix-blend-luminosity" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-end z-10 bg-gradient-to-t from-[#02040a] via-[#02040a]/90 to-transparent">
                      <span className="text-emerald-400/80 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> {article.author_name}</span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-snug group-hover:text-emerald-300 transition-colors">{article.title}</h3>
                    </div>
                  </motion.div>
                ))}

                {/* 📚 بطاقة الأرشيف الختامية */}
                {sideArticles.length < 2 && (
                  <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="flex-1 bg-gradient-to-br from-white/5 to-transparent p-10 rounded-[2.5rem] border border-white/10 flex flex-col justify-center text-center group hover:bg-white/10 transition-colors shadow-inner backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                       <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight">أرشيف المعرفة</h3>
                    <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">استكشف المئات من المقالات الأكاديمية وأخبار المدرسة السابقة.</p>
                    <button className="w-full py-4.5 rounded-2xl bg-white text-[#02040a] hover:bg-amber-400 font-black text-base transition-all active:scale-95 shadow-xl">الدخول للمكتبة</button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* 🚀 4. الخاتمة والدعوة للانضمام (The Final Call) */}
      {/* ========================================== */}
      <section className="py-32 relative z-10 bg-[#02040a] border-t border-white/5 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
           <Compass className="w-16 h-16 text-amber-500 mx-auto mb-8 opacity-80" />
           <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tight mb-8">مستعد للبدء؟</h2>
           <p className="text-xl text-slate-400 font-bold mb-12">انضم الآن إلى أكثر من 2000 طالب ومعلم في منصة التعليم الرقمي الأقوى.</p>
           <Link href={portal.href} className="inline-flex items-center justify-center gap-3 px-14 py-6 bg-gradient-to-r from-amber-500 to-amber-300 text-black rounded-full font-black text-xl hover:scale-105 transition-transform shadow-[0_0_50px_rgba(245,158,11,0.3)]">
             <span>{user ? 'العودة للوحة القيادة' : 'تسجيل الدخول للمنصة'}</span>
             <ArrowLeft className="w-6 h-6" />
           </Link>
        </div>
      </section>

      {/* ========================================== */}
      {/* 📺 مشغل الفيديو المنبثق */}
      {/* ========================================== */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(20px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-10" onClick={() => setActiveVideo(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl aspect-video bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)] relative border border-white/10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveVideo(null)} className="absolute top-6 left-6 z-20 w-14 h-14 bg-black/40 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20 shadow-2xl">✕</button>
              <video src={activeVideo} controls autoPlay className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
}
