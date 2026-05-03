'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Wand2, CalendarDays, Loader2, ServerCog } from 'lucide-react';

export default function ScheduleSystemToggle() {
  // الحالة الافتراضية: نفترض أن النظام اليدوي هو الفعال حتى نقرأ من القاعدة
  const [activeSystem, setActiveSystem] = useState<'manual' | 'auto'>('manual');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🚀 استدعاء الحالة الحالية للنظام من قاعدة البيانات عند فتح الصفحة
  useEffect(() => {
    fetchCurrentSystem();
  }, []);

  const fetchCurrentSystem = async () => {
    setIsLoading(true);
    try {
      // ⚠️ ملاحظة: استبدل 'school_settings' باسم جدول الإعدادات الفعلي لديك
      const { data, error } = await supabase
        .from('school_settings')
        .select('active_schedule_system')
        .eq('id', 1) // بافتراض أن لديك صف واحد للإعدادات العامة
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.active_schedule_system) {
        setActiveSystem(data.active_schedule_system);
      }
    } catch (error) {
      console.error('Error fetching system setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (system: 'manual' | 'auto') => {
    if (system === activeSystem || isUpdating) return;
    
    setIsUpdating(true);
    try {
      // ⚠️ ملاحظة: تحديث قاعدة البيانات
      const { error } = await supabase
        .from('school_settings')
        .update({ active_schedule_system: system })
        .eq('id', 1);

      if (error) throw error;

      setActiveSystem(system);
    } catch (error) {
      console.error('Error updating system:', error);
      alert('حدث خطأ أثناء تبديل النظام!');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-slate-900 rounded-3xl w-full max-w-md mx-auto border border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0a0f1d] p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-slate-800 w-full max-w-lg mx-auto relative overflow-hidden" dir="rtl">
      {/* تأثيرات الإضاءة في الخلفية */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-all duration-700 ${activeSystem === 'auto' ? 'bg-indigo-600/20' : 'bg-emerald-600/20'}`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
            <ServerCog className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">التبديل المركزي للجداول</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">اختر النظام الذي سيظهر لجميع طلاب ومعلمي مدرسة الرفعة</p>
          </div>
        </div>

        {/* 🚀 المفتاح التفاعلي (Toggle Switch) */}
        <div className="relative flex items-center bg-slate-950 p-2 rounded-2xl border border-slate-800/80 shadow-inner">
          
          {/* الزر الأول: النظام اليدوي/القديم */}
          <button
            onClick={() => handleToggle('manual')}
            disabled={isUpdating}
            className={`relative flex-1 py-4 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${
              activeSystem === 'manual' ? 'text-emerald-50' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeSystem === 'manual' && (
              <motion.div
                layoutId="active-system-bg"
                className="absolute inset-0 bg-emerald-600 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.4)] border border-emerald-400"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20"><CalendarDays className={`w-6 h-6 ${activeSystem === 'manual' ? 'text-emerald-100' : 'text-slate-600'}`} /></span>
            <span className="relative z-20 text-sm font-black">النظام اليدوي</span>
          </button>

          {/* الزر الثاني: النظام الآلي الذكي */}
          <button
            onClick={() => handleToggle('auto')}
            disabled={isUpdating}
            className={`relative flex-1 py-4 px-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300 z-10 ${
              activeSystem === 'auto' ? 'text-indigo-50' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeSystem === 'auto' && (
              <motion.div
                layoutId="active-system-bg"
                className="absolute inset-0 bg-indigo-600 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20"><Wand2 className={`w-6 h-6 ${activeSystem === 'auto' ? 'text-indigo-100' : 'text-slate-600'}`} /></span>
            <span className="relative z-20 text-sm font-black">الذكاء الاصطناعي</span>
          </button>

          {/* تأثير التحميل أثناء تبديل النظام */}
          {isUpdating && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl z-30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow-md" />
            </div>
          )}
        </div>

        <div className="mt-5 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-slate-300 leading-relaxed">
            الحالة الحالية: <span className={`font-black px-2 py-0.5 rounded ${activeSystem === 'auto' ? 'text-indigo-300 bg-indigo-500/20' : 'text-emerald-300 bg-emerald-500/20'}`}>
              {activeSystem === 'auto' ? 'الجداول الذكية مفعلة' : 'الجداول اليدوية مفعلة'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
