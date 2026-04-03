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

  // 🚀 مكان مخصص لشعار المدرسة القادم من لوحة الإدارة
  // عندما يتم الربط، سنضع مسار الصورة هنا بدلاً من null
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
      
      {/* 🚀 Background Image with Deep Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
          alt="School Background"
          fill
          className="object-cover opacity-20 object-center scale-105"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/90 via-[#020817]/60 to-[#020817]/95 backdrop-blur-[2px]" />
        {/* Subtle Grid Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* 🚀 Cinematic Animated Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
            x: [0, 80, 0],
            y: [0, -50, 0],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/40 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.25, 0.1],
            x: [0, -60, 0],
            y: [0, 80, 0],
            rotate: [0, -45, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-violet-600/30 rounded-full blur-[120px]"
        />
      </div>

      {/* 🚀 Main Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="relative z-10 w-full max-w-[28rem] px-4 sm:px-6"
      >
        <div className="relative backdrop-blur-2xl bg-slate-900/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)]">
          
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

          <div className="text-center mb-10">
            {/* 🚀 Dynamic Logo Placeholder */}
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative mx-auto mb-6 group"
            >
              <div className="absolute inset-0 bg-indigo-500 rounded-[1.8rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse"></div>
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 mx-auto rounded-[1.8rem] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30 border-2 border-white/20 flex items-center justify-center overflow-hidden z-10">
                {schoolLogoUrl ? (
                  <Image src={schoolLogoUrl} alt="Logo" fill className="object-contain p-2" />
                ) : (
                  <School className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-md" />
                )}
              </div>
              {/* Sparkle decoration */}
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse z-20" />
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3 drop-shadow-sm">
              مدرسة الرفعة النموذجية
            </h2>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <p className="text-slate-300 font-bold text-sm tracking-wide">
                 بوابة التعليم الرقمي الآمن
               </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3"
                >
                  <div className="p-1 bg-rose-500/20 rounded-lg shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-sm font-bold text-rose-200 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="civilId" className="block text-sm font-black text-slate-300 mr-1">
                الرقم المدني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none transition-transform group-focus-within:scale-110">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  id="civilId"
                  type="text"
                  required
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="block w-full bg-slate-950/50 border border-white/10 rounded-[1.25rem] py-4 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-indigo-950/20 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all outline-none"
                  placeholder="أدخل الرقم المدني الخاص بك"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <label htmlFor="password" className="block text-sm font-black text-slate-300">
                  كلمة المرور
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-400/10 px-3 py-1 rounded-lg hover:bg-indigo-400/20"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none transition-transform group-focus-within:scale-110">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-slate-950/50 border border-white/10 rounded-[1.25rem] py-4 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-indigo-950/20 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all outline-none tracking-widest"
                  placeholder="••••••••"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full group overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-indigo-600 to-violet-600 py-4 sm:py-4.5 text-base font-black text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:from-indigo-500 hover:to-violet-500 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
            >
              {/* Button Glare Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0"></div>
              
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التحقق...</span>
                  </>
                ) : (
                  'تسجيل الدخول للنظام'
                )}
              </span>
            </button>
          </form>
        </div>
      </motion.div>

      {/* 🚀 Custom Forgot Password Modal (النافذة الإدارية) */}
      <AnimatePresence>
        {showForgotModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="fixed inset-0 z-40 bg-[#020817]/80 backdrop-blur-md"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 text-center pointer-events-auto relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>

                <div className="w-20 h-20 mx-auto bg-indigo-500/10 border border-indigo-500/20 rounded-[1.5rem] flex items-center justify-center mb-6">
                  <MailQuestion className="w-10 h-10 text-indigo-400" />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">استعادة كلمة المرور</h3>
                
                <div className="bg-slate-950/50 border border-white/5 p-4 rounded-2xl mb-8">
                  <p className="text-slate-300 font-bold text-sm leading-relaxed">
                    لدواعي أمنية، يرجى مراجعة إدارة المنصة ممثلة بـ
                    <span className="block text-indigo-400 font-black text-base mt-2 mb-2 bg-indigo-500/10 py-2 rounded-xl border border-indigo-500/20">
                      الأستاذ إيهاب جمال غزال
                    </span>
                    لاستعادة أو تصفير كلمة المرور الخاصة بحسابك بنجاح.
                  </p>
                </div>

                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="w-full bg-white text-slate-900 font-black py-3.5 rounded-[1.2rem] hover:bg-slate-200 transition-colors shadow-lg active:scale-95"
                >
                  حسناً، فهمت
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
