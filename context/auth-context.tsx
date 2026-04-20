'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '@/types';

import { Settings, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

// 🚀 أداة الحماية من تجمد السيرفرات (تم إصلاح خطأ TypeScript لـ Netlify)
const withTimeout = <T,>(promise: any, ms: number, timeoutMessage: string): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise), // تحويل استعلام Supabase إلى Promise قياسي
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    )
  ]);
};

interface AuthContextType {
  user: SupabaseUser | null;
  authRole: UserRole | null;
  userRole: UserRole | null;
  userName: string;
  mustResetPassword: boolean;
  isChecking: boolean;
  isAdminByEmail: boolean;
  platformClosed: boolean;
  closeMessage: string;
  signOut: () => Promise<void>;
  signIn: (civilId: string, password: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  requestPasswordReset: (civilId: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [platformClosed, setPlatformClosed] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [rawSettings, setRawSettings] = useState<any>(null); 
  
  // 🚀 حالة زر الطوارئ
  const [showEmergencyBtn, setShowEmergencyBtn] = useState(false);
  
  const fetchedUserId = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isPublicPage = isLoginPage || isResetPasswordPage;

  // 🚀 إظهار زر الطوارئ إذا طال التحميل أكثر من 5 ثوانٍ
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isChecking && !authRole) {
      timer = setTimeout(() => setShowEmergencyBtn(true), 5000);
    } else {
      setShowEmergencyBtn(false);
    }
    return () => clearTimeout(timer);
  }, [isChecking, authRole]);

  const emergencyClear = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login?cleared=emergency');
  };

  const signIn = async (civilId: string, password: string) => {
    let authResult = null;
    let lastError = null;

    if (civilId.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: civilId, password });
      authResult = data;
      lastError = error;
    } else {
      const { data: userData } = await supabase.from('users').select('email').eq('national_id', civilId).maybeSingle();
      
      const possibleEmails = [];
      if (userData?.email) possibleEmails.push(userData.email);
      possibleEmails.push(`${civilId}@alrefaa.edu`);
      possibleEmails.push(`${civilId}@alrifaa.edu`);

      const uniqueEmails = [...new Set(possibleEmails)];

      for (const emailToTry of uniqueEmails) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailToTry, password });
        if (!error && data.user) {
          authResult = data;
          lastError = null;
          break; 
        } else {
          lastError = error; 
        }
      }
    }

    if (lastError || !authResult?.user) {
      throw lastError || new Error("بيانات الدخول غير صحيحة، تأكد من الرقم المدني وكلمة المرور.");
    }
    
    // جلب التفاصيل مع مهلة زمنية صارمة
    const { data: userData, error: userError } = await withTimeout(
      supabase.from('users').select('role, must_reset_password, full_name').eq('id', authResult.user.id).maybeSingle(),
      10000,
      "السيرفر لا يستجيب حالياً، يرجى المحاولة مجدداً."
    ) as any;

    if (userError) throw userError;
    if (!userData) throw new Error(`تم تسجيل الدخول، ولكن لم نجد بياناتك في النظام.`);

    const name = userData.full_name || authResult.user.email?.split('@')[0] || '';
    
    setUser(authResult.user);
    setAuthRole(userData.role as UserRole);
    setUserName(name);
    
    localStorage.setItem('cached_role', userData.role);
    localStorage.setItem('cached_name', name);
    sessionStorage.setItem('authRole', userData.role);
    sessionStorage.setItem('userName', name);

    setIsChecking(false);
    
    if (userData.must_reset_password) {
      setMustResetPassword(true);
      router.push('/reset-password');
    } else {
      if (userData.role === 'admin' || userData.role === 'management') router.push('/admin/dashboard');
      else if (userData.role === 'teacher') router.push('/dashboard/teacher');
      else if (userData.role === 'student') router.push('/dashboard/student');
      else if (userData.role === 'staff') router.push('/dashboard/staff'); 
      else router.push('/'); 
    }
  }; 

  const requestPasswordReset = async (civilId: string) => {
    const { data: userData } = await supabase.from('users').select('email').eq('national_id', civilId).maybeSingle();
    if (!userData?.email) throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم المدني');
    const { error } = await supabase.auth.resetPasswordForEmail(userData.email, { redirectTo: `${window.location.origin}/login/update-password` });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) throw error;
  };

  const resetPassword = async (password: string) => {
    if (!user) throw new Error('غير مصرح لك بإجراء هذا التغيير');
    const { error: updateError } = await supabase.auth.updateUser({ password: password });
    if (updateError) throw updateError;
    const { error: dbError } = await supabase.from('users').update({ must_reset_password: false }).eq('id', user.id);
    if (dbError) throw dbError;
    
    setMustResetPassword(false);
    if (authRole === 'admin' || authRole === 'management') router.push('/admin/dashboard');
    else if (authRole === 'teacher') router.push('/dashboard/teacher');
    else if (authRole === 'student') router.push('/dashboard/student');
    else if (authRole === 'staff') router.push('/dashboard/staff'); 
    else router.push('/');
  };

  const signOut = async () => {
    setUser(null);
    setAuthRole(null);
    fetchedUserId.current = null;
    localStorage.removeItem('cached_role');
    localStorage.removeItem('cached_name');
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // حماية جلب الجلسة بمؤقت زمني 10 ثوانٍ
        const sessionResult: any = await withTimeout(
          supabase.auth.getSession(),
          10000,
          "انتهى وقت طلب الجلسة"
        );
        
        const session = sessionResult.data?.session;
        const sessionError = sessionResult.error;

        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (mounted) {
            setUser(null);
            setAuthRole(null);
            localStorage.removeItem('cached_role');
            if (!isPublicPage) window.location.replace('/login');
            setIsChecking(false);
          }
          return;
        }

        const cachedRole = localStorage.getItem('cached_role');
        const cachedName = localStorage.getItem('cached_name');
        
        if (mounted) {
          setUser(session.user);
          if (cachedRole) {
             setAuthRole(cachedRole as UserRole);
             setIsChecking(false); // ✅ إنهاء التحميل فوراً إذا وجدنا الكاش
          }
          if (cachedName) setUserName(cachedName);
        }

        if (fetchedUserId.current !== session.user.id) {
           fetchedUserId.current = session.user.id;
           
           // حماية الاستعلامات الثقيلة بمؤقت 15 ثانية
           const [userRes, settingsRes] = await withTimeout(
             Promise.all([
               supabase.from('users').select('role, full_name, must_reset_password').eq('id', session.user.id).maybeSingle(),
               !isPublicPage ? supabase.from('platform_settings').select('*').limit(1).maybeSingle() : Promise.resolve({ data: null, error: null })
             ]),
             15000,
             "قاعدة البيانات بطيئة جداً ولا تستجيب"
           ) as any;

           if (mounted) {
             if (userRes.data) {
                const freshRole = userRes.data.role;
                const freshName = userRes.data.full_name || session.user.email?.split('@')[0] || '';
                
                setAuthRole(freshRole as UserRole);
                setUserName(freshName);
                setMustResetPassword(userRes.data.must_reset_password || false);
                
                localStorage.setItem('cached_role', freshRole);
                localStorage.setItem('cached_name', freshName);
             } else if (!userRes.error && !isPublicPage) {
                console.warn("Ghost account detected. Forcing clean sign out.");
                await signOut();
                return;
             }

             if (settingsRes.data && !settingsRes.error) {
               setRawSettings(settingsRes.data);
               localStorage.setItem('cached_settings', JSON.stringify(settingsRes.data));
             }
           }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    const cachedSettings = localStorage.getItem('cached_settings');
    if (cachedSettings) {
      try { setRawSettings(JSON.parse(cachedSettings)); } catch (e) {}
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setAuthRole(null);
          fetchedUserId.current = null;
          localStorage.removeItem('cached_role');
          if (!isPublicPage) window.location.replace('/login');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && fetchedUserId.current !== session.user.id) {
           initializeAuth();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isPublicPage]);

  useEffect(() => {
    if (!rawSettings) return;
    let isOpen = rawSettings.is_open === true || rawSettings.is_open === 'true';
    if (!isOpen && authRole !== 'admin' && authRole !== 'management') {
      setPlatformClosed(true);
      setCloseMessage(rawSettings.message || '<div class="text-center text-white">المنصة مغلقة للصيانة</div>');
    } else {
      setPlatformClosed(false);
    }
  }, [rawSettings, authRole]);

  // 🚀 شاشة التحميل الآمنة (مع زر الطوارئ)
  if (isChecking && !authRole) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#02040a] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تأمين الاتصال...</p>

          <AnimatePresence>
            {showEmergencyBtn && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center flex flex-col items-center gap-4">
                 <p className="text-rose-400 text-xs font-bold px-6">يبدو أن سيرفر قاعدة البيانات بطيء أو لا يستجيب حالياً.</p>
                 <button onClick={emergencyClear} className="px-6 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black hover:bg-rose-500 hover:text-white transition-all text-sm active:scale-95 shadow-inner">
                   إلغاء وإعادة تسجيل الدخول
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (platformClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden font-cairo" dir="rtl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-2xl w-full p-4">
          <div className="bg-[#0f1423]/80 backdrop-blur-2xl rounded-[3rem] p-8 sm:p-12 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
            <div className="flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
              <div className="h-24 w-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] border border-white/20 flex items-center justify-center shadow-inner relative z-10 animate-bounce">
                <Settings className="h-10 w-10 text-white animate-spin-slow" style={{ animationDuration: '4s' }} />
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-8 leading-tight drop-shadow-md">
              المنصة في وضع <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-emerald-400">التطوير والصيانة</span>
            </h1>
            
            <div className="w-full relative z-10 text-center bg-[#02040a]/60 p-6 rounded-3xl border border-white/5 shadow-inner" dangerouslySetInnerHTML={{ __html: closeMessage }} />
            
            <button onClick={signOut} className="block w-full mt-10 text-sm font-bold text-slate-400 hover:text-white transition-colors underline decoration-dotted active:scale-95">تسجيل الخروج والعودة للرئيسية</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, authRole, userRole: authRole, userName, mustResetPassword,
      isChecking, isAdminByEmail, platformClosed, closeMessage,
      signOut, signIn, resetPassword, requestPasswordReset, updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
