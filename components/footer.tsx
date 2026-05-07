'use client';

import { Code2, ShieldCheck, Cpu, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// ==========================================
// 🏛️ مكون التذييل (Footer) - البصمة الهندسية
// يظهر في أسفل جميع الصفحات لتوثيق حقوق الملكية الفكرية والوصول السريع لملف المطور
// ==========================================
export function Footer() {
  // 📅 جلب السنة الحالية ديناميكياً لتحديث حقوق النشر تلقائياً مع بداية كل عام جديد
  const currentYear = new Date().getFullYear();

  return (
    // الحاوية الرئيسية للتذييل
    // print:hidden تمنع طباعة الفوتر عند تصدير الصفحات كـ PDF (مثل جداول الدرجات والغياب)
    <footer className="mt-auto relative print:hidden overflow-hidden border-t border-white/5" dir="rtl">
      
      {/* ==========================================
          🎨 التأثيرات البصرية والخلفية (Glassmorphism & Glow)
          ========================================== */}
      {/* 🌌 خلفية داكنة جداً مع تأثير الزجاج المغشى (Blur) */}
      <div className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-2xl -z-10" />
      {/* ✨ توهج ذهبي في الأعلى يميناً */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/5 rounded-full blur-[80px] -z-10" />
      {/* 🔮 توهج نيلي في الأسفل يساراً */}
      <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-indigo-600/5 rounded-full blur-[80px] -z-10" />

      {/* 〽️ خط فاصل علوي يشع بالذهب الخافت بشكل متدرج */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* ==========================================
              👨‍💻 القسم الأيمن: البصمة الشخصية ورابط ملف المطور
              ========================================== */}
          {/* التوجيه المباشر لملف السيرة الذاتية (CV) عبر الـ ID الخاص بك */}
          <Link 
            href="/teachers/d93abbce-acec-49e5-a6bc-07f059e0a9c0" 
            className="flex items-center gap-4 group transition-all duration-300 hover:scale-[1.02] focus:outline-none rounded-2xl pr-2"
            title="زيارة الملف الشخصي"
          >
            {/* 🎯 أيقونة المطور بتصميم فخم (تدرج ذهبي وأسود) */}
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 p-[1px] shadow-[0_0_20px_rgba(245,158,11,0.2)] relative group-hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-shadow duration-500">
              {/* تأثير التوهج الداخلي عند مرور الماوس (Hover) */}
              <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-500 rounded-2xl" />
              <div className="w-full h-full bg-[#0f1423] backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10 overflow-hidden">
                <Code2 className="h-6 w-6 text-amber-500 group-hover:text-amber-300 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
              </div>
            </div>
            
            {/* 📝 نصوص التعريف */}
            <div className="flex flex-col">
              <h3 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 drop-shadow-md group-hover:text-amber-400 transition-colors duration-300">
                إيهاب جمال غزال
                {/* شرارة ذهبية تلمع عند المرور */}
                <Sparkles className="h-4 w-4 text-amber-500 group-hover:animate-pulse" />
              </h3>
              <p className="text-slate-400 font-bold text-xs sm:text-sm mt-0.5 group-hover:text-slate-300 transition-colors duration-300 flex items-center gap-1.5">
                الهندسة وتطوير النظم البرمجية
                {/* 🚀 أيقونة السهم الخارجي (تنزلق بنعومة للداخل عند الـ Hover) */}
                <ExternalLink className="h-3.5 w-3.5 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-amber-500" />
              </p>
            </div>
          </Link>

          {/* ==========================================
              🛡️ القسم الأيسر: حقوق النشر وشارة النظام
              ========================================== */}
          <div className="flex flex-col items-center md:items-end gap-3">
            
            {/* 🔒 شارة حقوق النشر بالزجاج المدخن */}
            <div className="flex items-center gap-2 bg-[#0f1423]/80 px-5 py-2.5 rounded-full border border-white/5 shadow-inner backdrop-blur-md hover:border-amber-500/30 transition-colors cursor-default">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <span className="text-white font-black text-xs sm:text-sm drop-shadow-sm">
                جميع الحقوق محفوظة © {currentYear}
              </span>
            </div>
            
            {/* 🏷️ الشعار التقني والفلسفي لبناء النظام */}
            <p className="text-slate-500 font-black text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-1.5 opacity-80 cursor-default">
              <Cpu className="h-3.5 w-3.5" /> ARCHITECTED FOR THE FUTURE
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
