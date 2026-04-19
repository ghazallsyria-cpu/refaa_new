/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { School, Lock, User, ShieldCheck, X, Sparkles, MailQuestion, Loader2, Fingerprint } from 'lucide-react';
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

  // 🚀 الضربة الوقائية: مسح كاش Supabase القديم المتعارض
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (err) {
      console.error('Error clearing old cache:', err);
    }
  }, []);

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

      // 🚀 إرسال الإشارة للرادار فوراً ليعرف المدير بمحاولة الدخول
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#02040a] font-cairo" dir="rtl">
      
      {/* 🚀 Background Layers */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
          alt="School Background"
          fill
          className="object-cover opacity-20 object-center scale-105"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02040a] via-transparent to-[#02040a]" />
        <div className="absolute inset-0 bg-[#02040a]/40 backdrop-blur-[2px]" />
      </div>

      {/* 🚀 Moving Glow Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[30rem] px-4 sm:px-6"
      >
        <div className="relative glass-panel p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-[#0f172a]/40 backdrop-blur-3xl overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-10 relative z-10">
            <div className="relative mx-auto mb-6 w-24 h-24 sm:w-28 sm:h-28">
               <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] blur-xl animate-pulse"></div>
               <div className="relative h-full w-full rounded-[1.8rem] bg-white shadow-2xl border-4 border-[#02040a]/80 flex items-center justify-center overflow-hidden z-10 p-2 shadow-indigo-500/10">
                 {schoolData.logo_url ? (
                   <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-3" />
                 ) : (
                   <School className="h-12 w-12 text-indigo-600" />
                 )}
               </div>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 drop-shadow-md truncate px-2">
              {schoolData.name}
            </h2>
            <div className="inline-flex items-center gap-2 bg-[#02040a]/60 border border-white/10 px-4 py-1.5 rounded-full shadow-inner">
               <ShieldCheck className="w-4 h-4 text-emerald-400" />
               <p className="text-slate-300 font-black text-[10px] sm:text-xs tracking-widest uppercase">
                 بوابة التعليم الرقمي الموحدة
               </p>
            </div>
          </div>

          <form className="space-y-6 relative z-10" onSubmit={handleLogin}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3 shadow-inner"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-bold text-rose-200 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="civilId" className="block text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">
                الرقم المدني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <input
                  id="civilId"
                  type="text"
                  required
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="block w-full bg-[#02040a]/60 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-inner text-sm sm:text-base"
                  placeholder="أدخل الرقم المدني المكون من 12 رقم"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest">
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
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-[#02040a]/60 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 outline-none tracking-widest transition-all shadow-inner text-sm sm:text-base"
                  placeholder="••••••••"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 py-4.5 text-base font-black text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 mt-4 flex items-center justify-center border border-indigo-400/50 group"
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

          <p className="mt-8 text-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] relative z-10">
            Powered by Rafaa Model School &copy; 2026
          </p>
        </div>
      </motion.div>

      {/* 🚀 Forgot Password Modal (Royal Style) */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-[#02040a]/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-indigo-500/10 border border-indigo-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <MailQuestion className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 drop-shadow-md" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-black text-white mb-4 drop-shadow-sm">استعادة كلمة المرور</h3>
              
              <div className="bg-[#02040a]/60 border border-white/5 p-5 rounded-2xl mb-8 shadow-inner">
                <p className="text-slate-400 font-bold text-sm leading-relaxed">
                  يرجى مراجعة إدارة المنصة ممثلة بـ
                  <span className="block text-indigo-400 font-black text-base sm:text-lg mt-3 mb-3 bg-indigo-500/10 py-2 rounded-xl border border-indigo-500/30 shadow-sm">
                    الأستاذ إيهاب جمال غزال
                  </span>
                  لتصفير أو تحديث بيانات الدخول الخاصة بحسابك.
                </p>
              </div>

              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-full bg-white text-[#02040a] font-black py-4 rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 text-sm sm:text-base"
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
