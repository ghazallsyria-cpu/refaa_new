/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        app/archive/news/page.tsx
 * @version     1.1.0 (True Colors Update)
 * @description الأرشيف الإخباري الشامل للحرم الرقمي (مدرسة الرفعة).
 * * 🛠️ التحديث الحالي:
 * - إزالة فلاتر (mix-blend-luminosity) والشفافية المنخفضة لاستعادة الألوان الحقيقية للصور.
 * - تحسين التدرجات اللونية (Gradients) لتكون في الأسفل فقط خلف النصوص.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, ArrowRight, X, Compass, Search, Loader2, Calendar, User, Star, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function NewsArchivePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<any | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('school_magazine')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) { setArticles(data); setFilteredArticles(data); }
      } catch (error) { console.error('Error fetching news:', error); } 
      finally { setIsLoading(false); }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredArticles(articles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = articles.filter(article => 
        (article.title && article.title.toLowerCase().includes(query)) ||
        (article.excerpt && article.excerpt.toLowerCase().includes(query)) ||
        (article.author_name && article.author_name.toLowerCase().includes(query))
      );
      setFilteredArticles(filtered);
    }
  }, [searchQuery, articles]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-cairo overflow-x-hidden selection:bg-emerald-500/30 selection:text-white" dir="rtl">
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-500/15 rounded-full blur-[150px]"></div>
      </div>

      <nav className="fixed top-0 left-0 w-full z-40 bg-[#0B1120]/90 backdrop-blur-xl border-b border-white/5 shadow-sm transition-all">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <Newspaper className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">الأرشيف الإخباري</h1>
              <p className="text-[10px] sm:text-xs font-bold text-emerald-300/70 mt-1 uppercase tracking-widest">مكتبة الرفعة الرقمية</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-sm transition-all border border-white/10 hover:border-white/20 active:scale-95 shadow-sm">
            <span className="hidden sm:block">العودة للحرم</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-12 bg-white/5 backdrop-blur-md p-4 rounded-[2rem] border border-white/5 shadow-lg max-w-3xl mx-auto">
          <div className="relative w-full">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" placeholder="ابحث في العناوين، المقتطفات، أو بأسماء الكتاب..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-full py-4 pr-14 pl-6 text-white font-bold text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all placeholder-slate-500 shadow-inner"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400 font-bold">جاري تحميل السجلات الصحفية...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32 bg-white/5 border border-white/5 rounded-[3rem] backdrop-blur-sm max-w-2xl mx-auto text-center">
            <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-2xl font-black text-white mb-2">لا توجد أخبار</h3>
            <p className="text-slate-400 font-bold">لم نعثر على مقالات تطابق كلمة البحث الحالية.</p>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <AnimatePresence>
              {filteredArticles.map((article, index) => (
                <motion.div 
                  layout initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, delay: index * 0.05 }} key={article.id} 
                  className={`group cursor-pointer relative overflow-hidden shadow-xl bg-black border border-white/10 flex flex-col justify-end ${article.is_pinned ? 'md:col-span-2 lg:col-span-2 rounded-[3rem] min-h-[400px] sm:min-h-[500px]' : 'rounded-[2.5rem] min-h-[300px] sm:min-h-[350px]'}`}
                  onClick={() => setActiveArticle(article)} 
                >
                  {/* 🚀 إزالة التأثيرات الرمادية واستعادة الألوان الطبيعية */}
                  <img src={article.cover_image} alt={article.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100" />
                  
                  {/* 🚀 جعل التدرج الأسود فقط في الأسفل ليظهر جمال الصورة في الأعلى */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent opacity-90"></div>
                  
                  <div className={`relative z-10 flex flex-col justify-end ${article.is_pinned ? 'p-8 sm:p-12' : 'p-6 sm:p-8'}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {article.is_pinned && <span className="px-3 py-1 bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] text-[10px] font-black rounded-lg flex items-center gap-1"><Star className="w-3 h-3" /> رئيسي</span>}
                      <span className="text-slate-200 text-[11px] font-bold flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10"><User className="w-3 h-3 text-emerald-400" /> {article.author_name}</span>
                      <span className="text-slate-300 text-[10px] font-bold flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10"><Calendar className="w-3 h-3" /> {new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    
                    <h3 className={`font-black text-white leading-[1.3] group-hover:text-emerald-300 transition-colors drop-shadow-xl ${article.is_pinned ? 'text-3xl sm:text-4xl mb-4' : 'text-xl sm:text-2xl mb-2'}`}>
                      {article.title}
                    </h3>
                    
                    {article.is_pinned && (
                      <p className="text-slate-200 font-medium text-sm sm:text-base max-w-2xl line-clamp-2 leading-relaxed drop-shadow-md">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {activeArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1120]/90 backdrop-blur-md p-4 sm:p-6" onClick={() => setActiveArticle(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-4xl bg-[#0F172A] rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-white/10" onClick={e => e.stopPropagation()}>
              
              <div className="relative h-72 sm:h-96 shrink-0 bg-black">
                <button onClick={() => setActiveArticle(null)} className="absolute top-6 left-6 z-50 w-12 h-12 bg-black/40 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-colors border border-white/20 shadow-xl"><X className="w-6 h-6" /></button>
                {/* 🚀 استعادة ألوان الصورة في النافذة المنبثقة */}
                <img src={activeArticle.cover_image} alt={activeArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent"></div>
              </div>
              
              <div className="px-6 sm:px-14 pb-14 pt-6 overflow-y-auto custom-scrollbar relative z-10 bg-[#0F172A]">
                <div className="flex items-center flex-wrap gap-4 mb-8 border-b border-white/5 pb-6">
                  <span className="text-slate-400 flex items-center gap-1.5 text-sm font-bold"><Calendar className="w-4 h-4" /> {new Date(activeArticle.created_at).toLocaleDateString('ar-SA')}</span>
                  <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/20"></span>
                  <span className="text-emerald-400 flex items-center gap-1.5 text-sm font-bold"><User className="w-4 h-4" /> بقلم: {activeArticle.author_name}</span>
                </div>
                
                <h2 className="text-3xl sm:text-5xl font-black text-white mb-8 leading-[1.3] tracking-tight">{activeArticle.title}</h2>
                
                <div className="prose prose-invert prose-lg sm:prose-xl max-w-none text-slate-300 font-medium leading-loose">
                  <p className="text-xl sm:text-2xl text-slate-100 font-bold mb-8 p-6 sm:p-8 bg-white/5 rounded-3xl border-l-4 border-emerald-500 shadow-inner">
                    {activeArticle.excerpt}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
