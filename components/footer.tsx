'use client';

import { Code2, ShieldCheck, Cpu, Sparkles } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto relative print:hidden overflow-hidden border-t border-white/5" dir="rtl">
      
      <div className="absolute inset-0 bg-[#090b14]/50 backdrop-blur-2xl -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-emerald-500/5 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-32 bg-indigo-500/5 rounded-full blur-[80px] -z-10" />

      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 p-[1px] shadow-[0_0_15px_rgba(16,185,129,0.2)] relative group cursor-default">
              <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500 rounded-2xl" />
              <div className="w-full h-full bg-[#090b14] backdrop-blur-md rounded-2xl flex items-center justify-center relative z-10">
                <Code2 className="h-6 w-6 text-emerald-400 group-hover:text-white transition-colors duration-300" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 drop-shadow-sm">
                إيهاب جمال غزال
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </h3>
              <p className="text-slate-400 font-bold text-xs sm:text-sm mt-0.5">
                الهندسة وتطوير النظم البرمجية
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex items-center gap-2 bg-[#131836]/60 px-5 py-2.5 rounded-full border border-white/10 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="text-white font-black text-xs sm:text-sm">
                جميع الحقوق محفوظة © {currentYear}
              </span>
            </div>
            
            <p className="text-slate-500 font-black text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-1.5 opacity-80">
              <Cpu className="h-3.5 w-3.5" /> ARCHITECTED FOR THE FUTURE
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
