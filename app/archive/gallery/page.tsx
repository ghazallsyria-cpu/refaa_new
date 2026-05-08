/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/archive/gallery/page.tsx
 * @component   GalleryArchivePage
 * @description الأرشيف البصري الشامل للحرم الرقمي (مدرسة الرفعة).
 * يعرض جميع الصور والفيديوهات النشطة بتصميم (Aurora Glass) الفاخر.
 * * 🎯 الميزات المعمارية (Core Features):
 * 1. 🔍 محرك بحث حي: تصفية الوسائط فورياً عبر عنوان اللقطة.
 * 2. 🎛️ فلاتر سريعة: تصنيف المحتوى (الكل، صور، فيديو) بنقرة واحدة.
 * 3. 🎬 مشغل ميديا سينمائي (Lightbox): لعرض الصور والفيديوهات بحجم الشاشة الكاملة
 * دون مغادرة الصفحة وبأداء سلس مع تأثيرات Framer Motion.
 * 4. 📱 شبكة متجاوبة (Responsive Grid): تتكيف مع الجوال، التابلت، والشاشات العملاقة.
 * * @version     1.0.0 (Aurora Glass Edition)
 * @date        مايو 2026
 * @author      إدارة تطوير الرفعة
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, ImageIcon, Video, ArrowRight, X, Compass, Search, Filter, Loader2, LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function GalleryArchivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // حالات الفلترة والبحث
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // حالة المشغل المنبثق
  const [activeMedia, setActiveMedia] = useState<any | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await supabase
          .from('school_studio')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          setItems(data);
          setFilteredItems(data);
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGallery();
  }, []);

  // محرك الفلترة والبحث اللحظي
  useEffect(() => {
    let result = items;

    // 1. تطبيق الفلتر (صور/فيديو)
    if (activeFilter !== 'all') {
      result = result.filter(item => item.media_type === activeFilter);
    }

    // 2. تطبيق البحث
    if (searchQuery.trim() !== '') {
      result = result.filter(item => 
        item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(result);
  }, [items, activeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30 selection:text-white" dir="rtl">
      
      {/* 🌌 خلفية أورورا الزجاجية الساحرة */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/15 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </div>

      {/* 🧭 شريط التنقل العلوي */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5 shadow-sm transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">الأرشيف البصري</h1>
              <p className="text-[10px] sm:text-xs font-bold text-indigo-300/70 mt-1 uppercase tracking-widest">مكتبة الرفعة الرقمية</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-sm transition-all border border-white/10 hover:border-white/20 active:scale-95 shadow-sm">
            <span className="hidden sm:block">العودة للحرم</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* 🚀 المحتوى الرئيسي */}
      <main className="relative z-10 pt-32 pb-24 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 🎛️ شريط الأدوات (البحث والفلاتر) */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-12 bg-white/5 backdrop-blur-md p-4 rounded-[2rem] border border-white/5 shadow-lg">
          
          {/* حقل البحث */}
          <div className="relative w-full md:w-96 shrink-0">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث عن لقطة أو فيديو..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-full py-3.5 pr-14 pl-6 text-white font-bold text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all placeholder-slate-500"
            />
          </div>

          {/* أزرار الفلترة */}
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-full border border-white/5 w-full md:w-auto overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveFilter('all')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <LayoutGrid className="w-4 h-4" /> الكل
            </button>
            <button onClick={() => setActiveFilter('image')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeFilter === 'image' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <ImageIcon className="w-4 h-4" /> صور
            </button>
            <button onClick={() => setActiveFilter('video')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeFilter === 'video' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <Video className="w-4 h-4" /> فيديو
            </button>
          </div>
        </div>

        {/* 🖼️ شبكة العرض (Gallery Grid) */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold">جاري تحميل الأرشيف...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32 bg-white/5 border border-white/5 rounded-[3rem] backdrop-blur-sm">
            <Filter className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-2xl font-black text-white mb-2">لا توجد نتائج</h3>
            <p className="text-slate-400 font-bold">لم نعثر على وسائط تطابق بحثك الحالي.</p>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence>
              {filteredItems.map((media, index) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  key={media.id} 
                  className="relative aspect-square sm:aspect-[4/5] rounded-[2rem] overflow-hidden group bg-[#0B1120] shadow-xl cursor-pointer border border-white/10"
                  onClick={() => setActiveMedia(media)} 
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={media.media_type === 'video' ? media.thumbnail_url : media.media_url} alt={media.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 group-hover:opacity-50 transition-all duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {media.media_type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:scale-110 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <Play className="w-6 h-6 text-white ml-1 drop-shadow-md" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-black flex items-center gap-1.5 border border-white/10 shadow-lg">
                    {media.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />} 
                    {media.media_type === 'video' ? 'فيديو' : 'صورة'}
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-6 z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-sm sm:text-base font-black text-white leading-snug drop-shadow-md line-clamp-2">{media.title || 'لقطة بدون عنوان'}</h3>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ========================================== */}
      {/* 🎬 المشغل السينمائي المنبثق (Cinematic Lightbox) */}
      {/* ========================================== */}
      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1120]/95 backdrop-blur-2xl p-4 sm:p-10" onClick={() => setActiveMedia(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-6xl bg-black rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative border border-white/10 flex flex-col" onClick={e => e.stopPropagation()}>
              
              <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
                 <button onClick={() => setActiveMedia(null)} className="w-12 h-12 bg-white/10 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/20 shadow-xl"><X className="w-6 h-6" /></button>
              </div>

              <div className="relative w-full bg-black flex-1 flex items-center justify-center min-h-[50vh] max-h-[80vh]">
                {activeMedia.media_type === 'video' ? (
                  <video src={activeMedia.media_url} controls autoPlay className="w-full h-full max-h-[80vh] object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMedia.media_url} alt={activeMedia.title} className="w-full h-full max-h-[80vh] object-contain" />
                )}
              </div>
              
              <div className="p-6 sm:p-8 bg-gradient-to-t from-[#0F172A] to-black border-t border-white/5 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-white font-black text-2xl drop-shadow-md">{activeMedia.title || 'لقطة بدون عنوان'}</h3>
                  <span className="text-slate-400 font-bold text-sm bg-white/5 px-4 py-2 rounded-xl border border-white/5 w-max">
                    تم النشر: {new Date(activeMedia.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>

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
