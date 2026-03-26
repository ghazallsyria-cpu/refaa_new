'use client';

import { Heart, Code, ShieldCheck } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-200 bg-white shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <Code className="h-5 w-5 text-indigo-600" />
            <span>برمجة وتطوير : ايهاب جمال غزال</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>جميع الحقوق محفوظة © {currentYear}</span>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-1">
            صنع بكل <Heart className="h-3 w-3 text-red-500 fill-red-500" /> لخدمة التعليم الرقمي
          </p>
        </div>
      </div>
    </footer>
  );
}
