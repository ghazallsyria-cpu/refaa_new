'use client';

import { Code2, ShieldCheck, Cpu, Sparkles } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto relative print:hidden overflow-hidden border-t border-white/60 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]" dir="rtl">
      
      {/* 🔮 تأثير الزجاج الفاخر (Glassmorphism) مع إضاءات خلفية مخفية */}
      <div className="absolute inset-0 bg-white/50 backdrop-blur-2xl -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-500/10 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-emerald-500/10 rounded-full blur-[80px] -z-10" />

      {/* 🚀 خط متدرج علوي أنيق جداً */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-600/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* الجانب الأيمن: الهوية والمبرمج */}
          <div className="flex items-center gap-4">
            {/* أيقونة المبرمج بتصميم 3D خفيف */}
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-800 p-[1.5px] shadow-lg shadow-indigo-600/20 relative group cursor-default">
              <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500 rounded-2xl" />
              <div className="w-full h-full bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                <Code2 className="h-6 w-6 text-indigo-400 group-hover:text-white transition-colors duration-300" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-slate-900 font-black text-lg sm:text-xl tracking-tight flex items-center gap-2">
                إيهاب جمال غزال
                <Sparkles className="h-4 w-4 text-amber-500" />
              </h3>
              <p className="text-slate-500 font-bold text-xs sm:text-sm mt-0.5">
                الهندسة وتطوير النظم البرمجية
              </p>
            </div>
          </div>

          {/* الجانب الأيسر: الحقوق والتقنية */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-2 bg-white/60 px-5 py-2.5 rounded-full border border-slate-200/60 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-slate-800 font-black text-xs sm:text-sm">
                جميع الحقوق محفوظة © {currentYear}
              </span>
            </div>
            
            <p className="text-slate-400 font-black text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-1.5 opacity-80">
              <Cpu className="h-3.5 w-3.5" /> ARCHITECTED FOR THE FUTURE
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}