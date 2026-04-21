'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion'; // تأكد من استخدام framer-motion

export default function ResetPasswordPage() {
  const { user, isChecking, resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isChecking && !user) {
      router.push('/login');
    }
  }, [user, isChecking, router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      await resetPassword(password);
      setSuccess(true);
      setTimeout(() => {
        // 🚀 الحل السحري: استخدام Hard Redirect لمسح الكاش القديم وتحديث حالة المصادقة
        window.location.href = '/'; 
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50 font-cairo" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="sm:mx-auto sm:w-full sm:max-w-sm bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 border border-slate-100"
        >
          <div className="inline-flex p-5 rounded-full bg-emerald-50 text-emerald-500 shadow-inner">
            <CheckCircle2 className="h-14 w-14" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">تم تغيير كلمة المرور بنجاح!</h2>
          <p className="text-slate-500 font-bold">جاري توجيهك للصفحة الرئيسية والنظام الآمن...</p>
          <div className="pt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
               <motion.div initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-full bg-emerald-500 rounded-full" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-slate-50 font-cairo" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-indigo-600 shadow-xl shadow-indigo-200">
            <Lock className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-black leading-9 tracking-tight text-slate-900">
          تأمين الحساب
        </h2>
        <p className="mt-2 text-center text-sm font-bold text-slate-500">
          للحفاظ على أمانك، يرجى تعيين كلمة مرور جديدة خاصة بك.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6 bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100" onSubmit={handleReset}>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-rose-50 p-4 flex items-start gap-3 border border-rose-100">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <h3 className="text-sm font-black text-rose-800">{error}</h3>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-black leading-6 text-slate-900">
              كلمة المرور الجديدة
            </label>
            <div className="mt-2">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border-0 py-3.5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-bold px-4 text-center tracking-[0.3em] transition-all outline-none"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black leading-6 text-slate-900">
              تأكيد كلمة المرور
            </label>
            <div className="mt-2">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-2xl border-0 py-3.5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm font-bold px-4 text-center tracking-[0.3em] transition-all outline-none"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-4 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'اعتماد كلمة المرور والدخول'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
