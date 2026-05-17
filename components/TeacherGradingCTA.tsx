// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Star, Sparkles, Target, ArrowLeft, Trophy, BookOpenCheck, Megaphone } from 'lucide-react';

export default function TeacherGradingCTA() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCTASettings = async () => {
      try {
        const { data } = await supabase
          .from('school_settings')
          .select('grading_cta_visible, grading_cta_message, grading_cta_image_url')
          .single();
          
        if (data) {
          setIsVisible(data.grading_cta_visible);
          setMessage(data.grading_cta_message || '');
          setImageUrl(data.grading_cta_image_url || '');
        }
      } catch (error) {
        console.error("Failed to fetch CTA settings", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCTASettings();
  }, []);

  if (loading || !isVisible) return null;

  return (
    <div className="mt-6 space-y-4 w-full">
      {/* 🎨 المكون الرئيسي */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full overflow-hidden rounded-[2.5rem] p-8 sm:p-12 border border-white/10 shadow-2xl group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1423] to-[#02040a] z-0"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/20 blur-[80px] rounded-full z-0 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full z-0 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          
          <div className="flex-1 text-right space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black mb-2">
              <Sparkles className="w-4 h-4" />
              <span>بُناة الأجيال وصُنّاع الأثر</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
              درجات طُلابك هي <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">حصاد مثابرتهم</span>
            </h2>
            
            <p className="text-base md:text-lg text-slate-300 font-bold leading-relaxed max-w-2xl">
              أستاذنا الفاضل، نثمن جهودك العظيمة في مدرسة الرفعة النموذجية (بنين). 
              بوابتك الرقمية جاهزة الآن لتوثيق درجات الأعمال والاختبارات بكل دقة واحترافية.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button 
                onClick={() => router.push('/admin/manual-grading')}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95"
              >
                <BookOpenCheck className="w-6 h-6" />
                <span>البدء برصد الدرجات الآن</span>
                <ArrowLeft className="w-5 h-5 mr-2" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex shrink-0 relative w-48 h-48 md:w-64 md:h-64 items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-[2px] border-dashed border-white/10 rounded-full"></motion.div>
            <div className="absolute inset-4 bg-white/5 border border-white/10 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-amber-400 to-yellow-600 p-6 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-16 h-16 text-black" strokeWidth={1.5} />
              <div className="absolute -top-3 -right-3 bg-white p-2 rounded-xl shadow-lg rotate-12"><Star className="w-6 h-6 text-amber-500 fill-amber-500" /></div>
              <div className="absolute -bottom-3 -left-3 bg-[#0f1423] border border-white/10 p-2 rounded-xl shadow-lg -rotate-12"><Target className="w-6 h-6 text-indigo-400" /></div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 📢 رسالة الإدارة مع الصورة (تظهر فقط إذا كان هناك محتوى) */}
      <AnimatePresence>
        {(message || imageUrl) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start gap-4 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-lg backdrop-blur-md"
          >
            <div className="bg-indigo-500/20 p-3 rounded-xl shrink-0 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-indigo-400" />
            </div>
            
            <div className="flex-1 w-full space-y-3 pt-1">
              {message && (
                <div>
                  <h4 className="text-sm font-black text-indigo-300 mb-1">توجيه من إدارة المدرسة:</h4>
                  <p className="text-sm font-bold text-white leading-relaxed whitespace-pre-wrap">{message}</p>
                </div>
              )}
              
              {/* 🖼️ عرض الصورة المرفقة إذا وجدت بأسلوب فخم */}
              {imageUrl && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-indigo-500/30 max-w-2xl">
                  <img src={imageUrl} alt="توجيهات الإدارة" className="w-full h-auto object-cover max-h-80 rounded-xl" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
