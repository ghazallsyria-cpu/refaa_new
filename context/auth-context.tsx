'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '@/types';

import { Settings, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

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
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('platformClosed');
    }
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isPublicPage = isLoginPage || isResetPasswordPage;

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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToTry,
          password: password,
        });

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
    
    if (authResult.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, must_reset_password, full_name')
        .eq('id', authResult.user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        throw new Error(`تم تسجيل الدخول، ولكن لم نجد بياناتك في النظام. يرجى مراجعة الإدارة.`);
      }

      const name = userData.full_name || authResult.user.email?.split('@')[0] || '';
      setUser(authResult.user);
      setAuthRole(userData.role as UserRole);
      setUserName(name);
      setIsChecking(false);
      
      sessionStorage.setItem('authRole', userData.role);
      sessionStorage.setItem('userName', name);

      router.refresh(); 

      // 🚀 Ehab -->>> redirection by role to dashboard 
      if (userData.must_reset_password) {
        setMustResetPassword(true);
        router.push('/reset-password');
      } else {
        if (userData.role === 'admin' || userData.role === 'management') {
          router.push('/admin/dashboard');
        } else if (userData.role === 'teacher') {
          router.push('/dashboard/teacher');
        } else if (userData.role === 'student') {
          router.push('/dashboard/student');
        } else if (userData.role === 'staff') {
          router.push('/dashboard/staff'); // 👈 توجيه الموظف الجديد
        } else {
          router.push('/'); 
        }
      }
    } // 👈 هذا القوس المهم الذي كان مفقوداً لإغلاق if (authResult.user)
  }; // 👈 وهذا القوس المهم لإغلاق دالة signIn بالكامل

  const requestPasswordReset = async (civilId: string) => {
    const { data: userData } = await supabase.from('users').select('email').eq('national_id', civilId).maybeSingle();
    if (!userData?.email) throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم المدني');

    const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
      redirectTo: `${window.location.origin}/login/update-password`,
    });
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

    // 🚀 التوجيه الذكي التلقائي بمجرد نجاح تغيير كلمة المرور
    if (authRole === 'admin' || authRole === 'management') {
      router.push('/admin/dashboard');
    } else if (authRole === 'teacher') {
      router.push('/dashboard/teacher');
    } else if (authRole === 'student') {
      router.push('/dashboard/student');
    } else if (authRole === 'staff') {
      router.push('/dashboard/staff'); // 👈 سيأخذه لغرفته فوراً
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsChecking(true);
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser(); 
        
        if (supabaseUser) {
          setUser(supabaseUser);
        } else {
          setUser(null);
          sessionStorage.clear();
          localStorage.clear();
          if (!isPublicPage) router.push('/login');
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setIsChecking(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthRole(null);
        sessionStorage.clear();
        localStorage.clear();
        if (!isPublicPage) router.push('/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) setUser(session.user);
        if (event === 'SIGNED_IN' && isLoginPage) router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [isPublicPage, isLoginPage, router]);

  useEffect(() => {
    if (!user) {
      setAuthRole(null);
      return;
    }

    const fetchUserData = async () => {
      setIsChecking(true);
      try {
        const [userRes, settingsRes] = await Promise.all([
          supabase.from('users').select('role, full_name, must_reset_password').eq('id', user.id).maybeSingle(),
          !isPublicPage ? supabase.from('platform_settings').select('*').limit(1).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);

        if (!userRes.data && !userRes.error && !isPublicPage) {
          console.warn("Ghost account detected! Initiating deep mobile clear...");
          await supabase.auth.signOut();
          
          localStorage.clear();
          sessionStorage.clear();
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) await reg.unregister();
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            for (let key of keys) await caches.delete(key);
          }
          
          window.location.replace('/login?cleared=ghost_session');
          return;
        }

        let role = userRes.data?.role;
        const settings = settingsRes.data;
        const settingsError = settingsRes.error;

        if (userRes.data) {
          const name = userRes.data.full_name || user.email?.split('@')[0] || '';
          setUserName(name);
          setAuthRole(role as UserRole);
          setMustResetPassword(userRes.data.must_reset_password || false);
          
          sessionStorage.setItem('authRole', role || '');
          sessionStorage.setItem('userName', name);
        }

        if (!isPublicPage && !settingsError && settings) {
          setRawSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsChecking(false); 
      }
    };

    fetchUserData();
  }, [user, isPublicPage, isLoginPage, authRole, userName]);

  useEffect(() => {
    if (!rawSettings) return;
    const evaluatePlatformStatus = () => {
      let isOpen = rawSettings.is_open === true || rawSettings.is_open === 'true';
      if (!isOpen && authRole !== 'admin' && authRole !== 'management') {
        setPlatformClosed(true);
        setCloseMessage(rawSettings.message || '<div class="text-center text-white">المنصة مغلقة للصيانة</div>');
      } else {
        setPlatformClosed(false);
      }
    };

    evaluatePlatformStatus(); 
    const interval = setInterval(evaluatePlatformStatus, 5000); 
    return () => clearInterval(interval);
  }, [rawSettings, authRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthRole(null);
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login?cleared=' + new Date().getTime();
  };

  if (platformClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-cairo" dir="rtl">
        {/* مؤثرات بصرية خلفية مذهلة (خارجية فقط) */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-3xl w-full p-4"
        >
          <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] p-8 sm:p-12 border border-white/10 shadow-2xl shadow-black/50 text-center">
            
            <div className="flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
              <div className="h-24 w-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] border border-white/20 flex items-center justify-center shadow-inner relative z-10 animate-bounce">
                <Settings className="h-10 w-10 text-white animate-spin-slow" style={{ animationDuration: '4s' }} />
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-8 leading-tight">
              المنصة في وضع <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 to-emerald-400">التطوير والصيانة</span>
            </h1>
            
            {/* 🚀 السحر يبدأ هنا: هذا السطر سيقوم بتشغيل أكواد الـ HTML التي يكتبها الإدمن! */}
            <div 
              className="w-full relative z-10 text-right"
              dangerouslySetInnerHTML={{ __html: closeMessage }} 
            />
            
            <button onClick={signOut} className="block w-full mt-10 text-sm font-bold text-slate-400 hover:text-white transition-colors underline decoration-dotted">تسجيل الخروج والعودة للرئيسية</button>
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
