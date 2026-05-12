'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Calendar, ArrowRight, BellRing, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface AnnouncementsWidgetProps {
  authRole: string; 
}

export default function AnnouncementsWidget({ authRole }: AnnouncementsWidgetProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const fetchWidgetAnnouncements = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('announcements')
          .select('id, title, content, target_role, created_at')
          .order('created_at', { ascending: false })
          .limit(4);

        if (authRole !== 'admin' && authRole !== 'management') {
          query = query.in('target_role', [authRole, 'all']);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements widget:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgetAnnouncements();
  }, [authRole]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden border-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.05)] flex flex-col h-full group/widget"
      dir="rtl"
    >
      {/* 💡 تأثير الإضاءة الخلفية الكونية */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -ml-20 -mt-20 mix-blend-screen transition-opacity duration-1000 group-hover/widget:opacity-100 opacity-60"></div>

      {/* 👑 هيدر المربع */}
      <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-transparent relative z-10 gap-4">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-3 drop-shadow-md">
          <div className="p-2 sm:p-2.5 bg-indigo-500/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-indigo-500/20 shadow-inner relative group-hover/widget:scale-105 transition-transform duration-500">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 drop-shadow-md" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#02040a] animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]"></div>
          </div>
          لوحة الإعلانات
        </h2>
        <Link 
          href="/announcements" 
          className="text-[10px] sm:text-xs font-bold text-indigo-300 hover:text-white flex items-center justify-center gap-1 bg-white/5 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-white/10 transition-colors shadow-inner border border-white/10 active:scale-95 shrink-0"
        >
          عرض الكل <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 -rotate-180" />
        </Link>
      </div>

      {/* 📜 منطقة عرض المحتوى */}
      <div className="flex-1 flex flex-col bg-transparent relative z-10 p-2 sm:p-3 min-h-[250px]">
        
        <AnimatePresence mode="wait">
          {/* ⏳ الحالة الأولى: جاري التحميل (Skeleton Loading) */}
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-2 sm:gap-3 p-2">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-[1.25rem] bg-white/5 animate-pulse border border-white/5">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl shrink-0"></div>
                   <div className="flex-1 space-y-3 py-1">
                     <div className="h-4 bg-white/10 rounded-full w-3/4"></div>
                     <div className="h-3 bg-white/10 rounded-full w-1/2"></div>
                   </div>
                 </div>
               ))}
            </motion.div>
          ) 
          
          /* 📝 الحالة الثانية: تم جلب الإعلانات بنجاح */
          : announcements.length > 0 ? (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 sm:space-y-3">
              {announcements.map((announcement, idx) => (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} key={announcement.id}>
                  <Link 
                    href="/announcements"
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-[1.25rem] sm:rounded-[1.5rem] bg-[#02040a]/40 backdrop-blur-md hover:bg-indigo-900/10 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 shadow-inner active:scale-[0.98] overflow-hidden relative"
                  >
                    {/* لمعة زجاجية عند الهوفر */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                    <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1 relative z-10">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 text-slate-500 group-hover:text-indigo-400 transition-all shadow-inner">
                        <BellRing className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-sm sm:text-base text-slate-200 group-hover:text-white transition-colors truncate drop-shadow-md mb-1">
                          {announcement.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-500 line-clamp-1 group-hover:text-slate-300 transition-colors drop-shadow-sm">
                          {announcement.content}
                        </p>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end sm:flex-col sm:items-end gap-2 border-t border-white/5 pt-3 sm:border-0 sm:pt-0 mt-1 sm:mt-0 relative z-10">
                      <span className="text-[9px] sm:text-[10px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 shadow-inner backdrop-blur-sm">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
                        {format(new Date(announcement.created_at), 'd MMM', { locale: arSA })}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) 
          
          /* 📭 الحالة الثالثة: لا توجد إعلانات */
          : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center py-10 sm:py-12 bg-[#02040a]/30 backdrop-blur-sm rounded-[1.5rem] border border-dashed border-white/10 shadow-inner m-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-3 border border-white/5 shadow-inner">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600 drop-shadow-md" />
              </div>
              <h3 className="font-black text-slate-300 text-sm sm:text-base drop-shadow-sm mb-1">لا توجد إعلانات جديدة</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 max-w-[200px]">لم يتم نشر أي إعلانات أو تعاميم تخصك في الوقت الحالي.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <style jsx global>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </motion.div>
  );
}
