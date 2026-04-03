'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { School, Lock, ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { updatePassword } = useAuth();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 🚀 نظام الحماية والتحقق من المدخلات
    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل لضمان أمان حسابك.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة. يرجى التأكد من كتابتها بشكل متطابق.');
      setLoading(false);
      return;
    }

    if (password === '123456') {
      setError('عذراً، لا يمكنك استخدام كلمة المرور الافتراضية مجدداً. اختر كلمة مرور خاصة بك.');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(password);
      setSuccess(true);
      // تأخير بسيط لإظهار رسالة النجاح للمستخدم قبل تحويله
      setTimeout(() => {
        router.push('/dashboard'); // التحويل للوحة التحكم بعد النجاح
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور، يرجى المحاولة مرة أخرى.');
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020817] selection:bg-indigo-500/30 font-cairo" dir="rtl">
      
      {/* 🚀 Background - Consistent with Login Page */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
          alt="School Background"
          fill
          className="object-cover opacity-10 object-center blur-sm"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020817]/95 via-[#020817]/80 to-[#020817]/95" />
      </div>

      {/* Static Glow Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* 🚀 Main Security Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[32rem] px-4 sm:px-6"
      >
        <div className="relative bg-slate-900/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]">
          
          {/* Subtle top glare */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* 🚀 Success State */}
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-24 h-24 mx-auto bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">تم تأمين حسابك بنجاح!</h2>
                <p className="text-emerald-400 font-bold">جاري توجيهك إلى لوحة التحكم...</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center mb-8">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                     <div className="absolute inset-0 bg-amber-500/30 rounded-[1.5rem] blur-lg animate-pulse"></div>
                     <div className="relative h-full w-full rounded-[1.5rem] bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl border border-white/20 flex items-center justify-center z-10">
                       <ShieldAlert className="h-10 w-10 text-white" />
                     </div>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    تأمين الحساب إلزامي
                  </h2>
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-6">
                     <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                     <p className="text-amber-300 font-bold text-xs tracking-wide">
                       خطوة أمنية مطلوبة للمتابعة
                     </p>
                  </div>

                  {/* 🚀 الرسالة التوضيحية الأنيقة */}
                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-right">
                    <p className="text-sm font-bold text-slate-300 leading-relaxed">
                      أهلاً بك في منصة مدرسة الرفعة النموذجية. لقد اكتشف النظام أنك لا تزال تستخدم كلمة المرور الافتراضية. لحماية بياناتك وسجلاتك، <strong className="text-amber-400">يجب عليك تعيين كلمة مرور جديدة قوية</strong> خاصة بك فقط ليتم تفعيل حسابك بالكامل.
                    </p>
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleUpdate}>
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3 overflow-hidden"
                      >
                        <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-rose-200 leading-snug">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-black text-slate-300 mr-1">
                      كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <KeyRound className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full bg-slate-950/80 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none tracking-widest transition-colors"
                        placeholder="••••••••"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-black text-slate-300 mr-1">
                      تأكيد كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full bg-slate-950/80 border border-slate-700/50 rounded-xl py-3.5 pr-12 pl-4 text-white font-bold placeholder:text-slate-600 focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none tracking-widest transition-colors"
                        placeholder="••••••••"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || success}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-base font-black text-white hover:from-amber-400 hover:to-orange-500 transition-all active:scale-[0.98] disabled:opacity-70 mt-6 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري تأمين الحساب...</span>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 ml-2" />
                        حفظ ومتابعة الدخول
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
