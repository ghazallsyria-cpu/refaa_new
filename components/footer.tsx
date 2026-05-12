'use client';

import { Code2, ShieldCheck, Cpu, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// ==========================================
// 🏛️ مكون التذييل (Footer) - البصمة الهندسية (Gemini Style)
// ==========================================
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    // 🚀 إلغاء الخلفيات المصمتة وجعله جزءاً شفافاً من الفضاء المحيط
    <footer className="mt-auto relative print:hidden overflow-hidden border-t border-white/5 bg-transparent" dir="rtl">
      
      {/* ==========================================
          🎨 التأثيرات البصرية والخلفية (Alive Glows)
          ========================================== */}
      {/* 🌌 تأثير زجاجي خفيف جداً للحفاظ على مقروئية النصوص */}
      <div className="absolute inset-0 bg-[#02040a]/20 backdrop-blur-md -z-10" />
      
      {/* ✨ توهج ذهبي/عنبري خلف اسمك كمطور */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-[60px] -z-10 mix-blend-screen pointer-events-none" />
      
      {/* 🔮 توهج نيلي في جهة الحقوق */}
      <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-indigo-500/10 rounded-full blur-[80px] -z-10 mix-blend-screen pointer-events-none" />

      {/* 〽️ خط فاصل علوي يشع ببطء */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-50" />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* ==========================================
              👨‍💻 القسم الأيمن: بصمة المطور (Holographic Card)
              ========================================== */}
          <Link 
            href="/teachers/d93abbce-acec-49e5-a6bc-07f059e0a9c0" 
            className="flex items-center gap-4 group focus:outline-none rounded-2xl pr-2 relative"
            title="زيارة الملف الشخصي"
          >
            {/* 🎯 أيقونة المطور بتأثير زجاجي متطور */}
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center relative z-10 overflow-hidden shadow-inner group-hover:border-amber-500/30 transition-all duration-500 backdrop-blur-md shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Code2 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 group-hover:text-amber-400 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] relative z-10" />
            </div>
            
            {/* 📝 نصوص التعريف */}
            <div className="flex flex-col">
              <h3 className="text-white font-black text-lg sm:text-2xl tracking-tight flex items-center gap-2 drop-shadow-md group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-amber-200 group-hover:to-amber-500 transition-all duration-500">
                إيهاب جمال غزال
                {/* شرارة ذهبية تلمع عند المرور */}
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 group-hover:animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              </h3>
              <p className="text-slate-400 font-bold text-xs sm:text-sm mt-0.5 group-hover:text-amber-100/80 transition-colors duration-300 flex items-center gap-1.5 drop-shadow-sm">
                الهندسة وتطوير النظم البرمجية
                {/* 🚀 أيقونة السهم الخارجي */}
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-amber-400" />
              </p>
            </div>
          </Link>

          {/* ==========================================
              🛡️ القسم الأيسر: حقوق النشر وشارة النظام
              ========================================== */}
          <div className="flex flex-col items-center md:items-end gap-3 z-10">
            
            {/* 🔒 شارة حقوق النشر (Glass Badge) */}
            <div className="flex items-center gap-2 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 shadow-inner backdrop-blur-md hover:bg-white/10 hover:border-amber-500/30 transition-all duration-500 cursor-default">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-white font-black text-xs sm:text-sm drop-shadow-sm">
                جميع الحقوق محفوظة © {currentYear}
              </span>
            </div>
            
            {/* 🏷️ الشعار التقني والفلسفي لبناء النظام */}
            <p className="text-slate-500 font-black text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default drop-shadow-sm">
              <Cpu className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> ARCHITECTED FOR THE FUTURE
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
