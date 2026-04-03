'use client';

import { Heart, Code, ShieldCheck } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto py-8 px-4 sm:px-6 lg:px-8 bg-slate-50/50 backdrop-blur-sm print:hidden relative overflow-hidden border-t border-slate-200">
      {/* 🚀 خط متدرج علوي أنيق */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-black text-base sm:text-lg">
            <Code className="h-5 w-5 text-indigo-600" />
            <span>الهندسة والبرمجة : إيهاب جمال غزال</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs sm:text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>جميع الحقوق محفوظة © {currentYear}</span>
          </div>
          <p className="text-slate-400 text-[10px] sm:text-xs flex items-center gap-1.5 font-bold bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100">
            صُنع بكل <Heart className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" /> لخدمة مستقبل التعليم الرقمي
          </p>
        </div>
      </div>
    </footer>
  );
}
