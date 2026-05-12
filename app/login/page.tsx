/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { School, Lock, ShieldCheck, X, Sparkles, MailQuestion, Loader2, Fingerprint, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { systemLogger } from '@/lib/logger';

export default function LoginPage() {
  const [civilId, setCivilId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const [schoolData, setSchoolData] = useState({ name: 'مدرسة الرفعة النموذجية', logo_url: '' });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) {
          setSchoolData({
            name: data.school_name || 'مدرسة الرفعة النموذجية',
            logo_url: data.logo_url || ''
          });
        }
      } catch (err) {
        console.error('Error fetching school data:', err);
      }
    };
    fetchSchoolData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(civilId, password);
    } catch (err: any) {
      let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      let errorType = 'AUTH_UNKNOWN_ERROR';

      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'بيانات الدخول غير صحيحة، تأكد من الرقم المدني وكلمة المرور.';
        errorType = 'AUTH_INVALID_CREDENTIALS';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً.';
        errorType = 'AUTH_EMAIL_UNCONFIRMED';
      } else if (err.message?.includes('FetchError') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'يبدو أن هناك مشكلة في الاتصال بالإنترنت.';
        errorType = 'AUTH_NETWORK_ERROR';
      }

      setError(errorMessage);

      systemLogger.log(
        `محاولة دخول فاشلة للرقم المدني: ${civilId} - السبب: ${errorMessage}`, 
        'warning', 
        errorType
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent font-cairo" dir="rtl">
      
      {/* 🚀 إخفاء صورة الخلفية القديمة للاعتماد على الخلفية الكونية في layout.tsx */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#02040a]/40 backdrop-blur-sm" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[28rem] px-4 sm:px-6"
      >
        {/* 🚀 استخدام glass-panel للفورم */}
        <div className="relative glass-panel p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden">
          
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none mix-blend-screen"></div>

          <div className="text-center mb-10 relative z-10">
            <div className="relative mx-auto mb-6 w-24 h-24 sm:w-28 sm:h-28">
               <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] blur-2xl animate-pulse"></div>
               {/* 🚀 الشعار داخل إطار زجاجي فخم */}
               <div className="relative h-full w-full rounded-[1.8rem] bg-[#02040a]/50 backdrop-blur-md border-2 border-white/10 flex items-center justify-center overflow-hidden z-10 p-3 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                 {schoolData.logo_url ? (
                   <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                 ) : (
                   <School className="h-12 w-12 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                 )}
               </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3 drop-shadow-lg truncate px-2">
              {schoolData.name}
            </h2>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full shadow-inner">
               <ShieldCheck className="w-4 h-4 text-indigo-400" />
               <p className="text-indigo-100 font-bold text-[10px] sm:text-xs tracking-widest uppercase opacity-80">
                 بوابة التعليم الرقمي الموحدة
               </p>
            </div>
          </div>

          <form className="space-y-5 relative z-10" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3 shadow-inner overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-bold text-rose-200 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="civilId" className="block text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">
                الرقم المدني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Fingerprint className="h-5 w-5" />
                </div>
                {/* 🚀 استخدام glass-input */}
                <input
                  id="civilId"
                  type="text"
                  required
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="glass-input w-full py-4 pr-12 pl-4 text-sm sm:text-base"
                  placeholder="أدخل الرقم المدني المكون من 12 رقم"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <label htmlFor="password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  كلمة المرور
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                {/* 🚀 استخدام glass-input */}
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full py-4 pr-12 pl-4 text-sm sm:text-base tracking-widest"
                  placeholder="••••••••"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600/80 backdrop-blur-md py-4 text-sm sm:text-base font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50 mt-6 flex items-center justify-center border border-indigo-400/50 group"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   <span>دخول للمنصة</span>
                   <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] relative z-10 opacity-60">
            Powered by Refaa Module School &copy; 2026
          </p>
        </div>
      </motion.div>

      {/* 🚀 Forgot Password Modal (Glass Style) */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-panel p-8 sm:p-10 rounded-[2.5rem] text-center overflow-hidden z-10"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <MailQuestion className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 drop-shadow-md" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-white mb-4 drop-shadow-sm">استعادة كلمة المرور</h3>
              
              <div className="bg-[#02040a]/40 border border-white/5 p-5 rounded-2xl mb-8 shadow-inner">
                <p className="text-slate-400 font-bold text-xs sm:text-sm leading-relaxed">
                  يرجى مراجعة إدارة المنصة ممثلة بـ
                  <span className="block text-indigo-300 font-black text-sm sm:text-base mt-3 mb-3 bg-indigo-500/10 py-2 rounded-xl border border-indigo-500/20 shadow-sm">
                    الأستاذ إهاب جمال غزال
                  </span>
                  لتصفير أو تحديث بيانات الدخول الخاصة بحسابك.
                </p>
              </div>

              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 font-black py-3.5 rounded-xl transition-all shadow-lg active:scale-95 text-sm"
              >
                حسناً، فهمت
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
