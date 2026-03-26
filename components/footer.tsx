'use client';

import { Heart, Code2, ShieldCheck, Sparkles } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto relative overflow-hidden border-t border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10 sm:px-6 lg:px-8 print:hidden">
      
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-400 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl text-center">
        
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1 text-xs font-medium text-slate-600 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          نظام إدارة التعليم الرقمي
        </div>

        <div className="mt-6 flex flex-col items-center gap-5">
          
          <div className="flex items-center gap-3 text-slate-900 font-semibold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Code2 className="h-5 w-5" />
            </div>
            <span>برمجة وتطوير: إيهاب جمال غزال</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>جميع الحقوق محفوظة © {currentYear}</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-slate-500">
            <span>صُنع بكل</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>لخدمة التعليم الرقمي</span>
          </div>

        </div>
      </div>
    </footer>
  );
}
