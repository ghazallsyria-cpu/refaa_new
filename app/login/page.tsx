'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { School, Lock, User, ShieldCheck, X, Sparkles, MailQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function LoginPage() {
  const [civilId, setCivilId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  // مكان مخصص لشعار المدرسة
  const schoolLogoUrl: string | null = null; 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(civilId, password);
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة، تأكد من الرقم المدني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020817] selection:bg-indigo-500/30 font-cairo" dir="rtl">
      
      {/* 🚀 Background - Optimized (Removed heavy continuous animations) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
          alt="School Background"
          fill
          className="object-cover opacity-15 object-center"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/95 via-[#020817]/70 to-[#020817]/95" />
      </div>

      {/* Static Glow Effects (Lightweight) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[100px]" />
      </div>

      {/* 🚀 Main Login Card - Optimized Glassmorphism */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[28rem] px-4 sm:px-6"
      >
        <div className="relative bg-slate-900/60 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] border border-white/10 shadow-2xl">
          
          <div className="text-center mb-8">
            <div className="relative mx-auto mb-5 w-20 h-20 sm:w-24 sm:h-24">
               <div className="absolute inset-0 bg-indigo-500/30 rounded-2xl blur-lg"></div>
               <div className="relative h-full w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl border border-white/10 flex items-center justify-center overflow-hidden z-10">
                 {schoolLogoUrl ? (
                   <Image src={schoolLogoUrl} alt="Logo" fill className="object-contain p-2" />
                 ) : (
                   <School className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                 )}
               </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              مدرسة الرفعة النموذجية
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
               <p className="text-slate-300 font-bold text-xs tracking-wide">
                 بوابة التعليم الرقمي
               </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 flex items-start gap-2.5 overflow-hidden"
                >
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-rose-200 leading-snug">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label htmlFor="civilId" className="block text-sm font-black text-slate-300 mr-1">
                الرقم المدني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                {/* Optimized Input (Removed heavy shadows and focus-within transitions) */}
                <input
                  id="civilId"
                  type="text"
                  required
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="block w-full bg-slate-950/80 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
                  placeholder="أدخل الرقم المدني الخاص بك"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1 mb-1">
                <label htmlFor="password" className="block text-sm font-black text-slate-300">
                  كلمة المرور
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-slate-950/80 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none tracking-widest transition-colors"
                  placeholder="••••••••"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-black text-white hover:bg-indigo-500 transition-colors active:scale-[0.98] disabled:opacity-70 mt-2 flex items-center justify-center shadow-lg shadow-indigo-600/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                'تسجيل الدخول للنظام'
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {/* 🚀 Modal - Optimized */}
      <AnimatePresence>
        {showForgotModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowForgotModal(false)}
              className="fixed inset-0 z-40 bg-[#020817]/80 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm bg-slate-900 border border-slate-700 p-6 sm:p-8 rounded-[2rem] shadow-2xl text-center pointer-events-auto relative overflow-hidden"
              >
                <div className="w-16 h-16 mx-auto bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5">
                  <MailQuestion className="w-8 h-8 text-indigo-400" />
                </div>
                
                <h3 className="text-xl font-black text-white mb-3">استعادة كلمة المرور</h3>
                
                <div className="bg-slate-950/50 border border-white/5 p-4 rounded-xl mb-6">
                  <p className="text-slate-300 font-bold text-sm leading-relaxed">
                    يرجى مراجعة إدارة المنصة ممثلة بـ
                    <span className="block text-indigo-400 font-black text-base mt-2 mb-2 bg-indigo-500/10 py-1.5 rounded-lg border border-indigo-500/20">
                      الأستاذ إيهاب جمال غزال
                    </span>
                    لاستعادة أو تصفير كلمة المرور الخاصة بحسابك.
                  </p>
                </div>

                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="w-full bg-white text-slate-900 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors shadow-sm active:scale-95"
                >
                  حسناً، فهمت
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
