'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { School, Lock, User, ArrowLeft, ShieldCheck, Heart, Code } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

export default function LoginPage() {
  const [civilId, setCivilId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authEmail = civilId;
      
      if (!civilId.includes('@')) {
        const { data: studentData } = await supabase
          .from('students')
          .select('id, users!inner(email)')
          .eq('national_id', civilId)
          .maybeSingle();
          
        if (studentData && studentData.users) {
          authEmail = (studentData.users as any).email;
        } else {
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('id, users!inner(email)')
            .eq('national_id', civilId)
            .maybeSingle();
            
          if (teacherData && teacherData.users) {
            authEmail = (teacherData.users as any).email;
          } else {
            const { data: parentData } = await supabase
              .from('parents')
              .select('id, users!inner(email)')
              .eq('national_id', civilId)
              .maybeSingle();
              
            if (parentData && parentData.users) {
              authEmail = (parentData.users as any).email;
            } else {
              authEmail = `${civilId}@alrefaa.edu`;
            }
          }
        }
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInError) throw signInError;
      
      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, must_reset_password')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (userError) throw userError;

        if (!userData) {
          throw new Error(`تم تسجيل الدخول، ولكن لم نجد بياناتك في النظام. يرجى مراجعة الإدارة.`);
        }

        if (userData.must_reset_password) {
          router.push('/reset-password');
          return;
        }
      }
      
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول. تأكد من البيانات وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950" dir="rtl">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80"
          alt="School Background"
          fill
          className="object-contain opacity-40"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/80" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20 mb-6"
            >
              <School className="h-12 w-12 text-white" />
            </motion.div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              مدرسة الرفعة النموذجية
            </h2>
            <p className="text-slate-300 font-medium">
              بوابة التعليم الرقمي الذكي
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl bg-red-500/10 border border-red-500/20 p-4"
              >
                <p className="text-sm font-medium text-red-400 text-center">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="civilId" className="block text-sm font-bold text-slate-200 mr-1">
                الرقم المدني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  id="civilId"
                  type="text"
                  required
                  value={civilId}
                  onChange={(e) => setCivilId(e.target.value)}
                  className="block w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
                  placeholder="أدخل الرقم المدني"
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label htmlFor="password" className="block text-sm font-bold text-slate-200">
                  كلمة المرور
                </label>
                <a href="#" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                  نسيت كلمة المرور؟
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full group overflow-hidden rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'تسجيل الدخول للنظام'
                )}
              </span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

