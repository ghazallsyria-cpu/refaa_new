'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '@/types';

import { Settings, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🚀 إبقاء الـ Timeout لحماية النظام من تعليق السيرفر
const withTimeout = <T,>(promise: any, ms: number = 15000, timeoutMessage: string = "السيرفر يستغرق وقتاً أطول من المعتاد"): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
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

// 🚀 دالة المتتبع الصامت (Silent Tracker)
const recordDailyPresence = async (currentUser: SupabaseUser, role: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    
    // 🛡️ صمام الأمان: منع إرسال الطلبات المتكررة (كل 15 دقيقة كحد أقصى)
    const lastUpdate = localStorage.getItem('last_presence_update');
    if (lastUpdate && (now - parseInt(lastUpdate)) < 15 * 60 * 1000) {
      return; 
    }

    const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'مستخدم مجهول';

    const { error } = await supabase
      .from('daily_presence')
      .upsert({
        user_id: currentUser.id,
        record_date: today,
        full_name: fullName,
        role: role,
        last_seen: new Date().toISOString()
      }, { 
        onConflict: 'user_id, record_date' 
      });

    if (error) {
       console.error("Presence recording error:", error);
    } else {
       localStorage.setItem('last_presence_update', now.toString());
    }
  } catch (err) {
    console.error("Silent Tracker Error:", err);
  }
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 🚀 حارس الإصدار لتنظيف مخلفات التحديثات القديمة
  const APP_VERSION = '1.1.0';

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  
  // 🚀 isChecking هو الحارس المطلق: لن يتم عرض أي شيء حتى يصبح false
  const [isChecking, setIsChecking] = useState(true);
  
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [platformClosed, setPlatformClosed] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [rawSettings, setRawSettings] = useState<any>(null); 
  const [isControlTeamMember, setIsControlTeamMember] = useState(false);
  const [showEmergencyBtn, setShowEmergencyBtn] = useState(false);
  
  const fetchedUserId = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const router = useRouter();
  const pathname = usePathname();
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isHomePage = pathname === '/'; 
  const isPublicPage = isLoginPage || isResetPasswordPage || isHomePage;
  
  // ظهور زر الطوارئ إذا تأخر السيرفر
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isChecking && !authRole) {
      timer = setTimeout(() => setShowEmergencyBtn(true), 12000); 
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
    setIsChecking(true);
    let authResult = null;
    let lastError = null;

    if (civilId.includes('@')) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: civilId, password });
      authResult = data;
      lastError = error;
    } else {
      const { data: userData } = await supabase.from('users').select('email').eq('national_id', civilId).maybeSingle();
      const possibleEmails = [userData?.email, `${civilId}@alrefaa.edu`, `${civilId}@alrifaa.edu`].filter(Boolean);
      const uniqueEmails = [...new Set(possibleEmails)];

      for (const emailToTry of uniqueEmails) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailToTry as string, password });
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
      setIsChecking(false);
      throw lastError || new Error("بيانات الدخول غير صحيحة.");
    }
    
    // جلب الصلاحيات الكاملة مع تسجيل الدخول
    const [userRes, controlRes] = await Promise.all([
      supabase.from('users').select('role, must_reset_password, full_name').eq('id', authResult.user.id).maybeSingle(),
      supabase.from('exam_control_team').select('id').eq('user_id', authResult.user.id).eq('academic_year', '2025-2026').maybeSingle()
    ]);

    if (userRes.error || !userRes.data) {
      setIsChecking(false);
      throw userRes.error || new Error("لم نجد بياناتك.");
    }

    if (controlRes.data) setIsControlTeamMember(true);

    const name = userRes.data.full_name || authResult.user.email?.split('@')[0] || '';
    setUser(authResult.user);
    setAuthRole(userRes.data.role as UserRole);
    setUserName(name);
    
    localStorage.setItem('cached_role', userRes.data.role);
    localStorage.setItem('cached_name', name);

    // 🚀 تسجيل الحضور فوراً بعد تسجيل الدخول الناجح
    recordDailyPresence(authResult.user, userRes.data.role);

    setIsChecking(false);
    
    if (userRes.data.must_reset_password) {
      setMustResetPassword(true);
      router.push('/reset-password');
    } else {
      const paths: any = { admin: '/admin/dashboard', management: '/admin/dashboard', teacher: '/dashboard/teacher', student: '/dashboard/student', staff: '/dashboard/staff' };
      router.push(paths[userRes.data.role] || '/');
    }
  }; 

  const signOut = async () => {
    setUser(null);
    setAuthRole(null);
    setIsControlTeamMember(false);
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const storedVersion = localStorage.getItem('app_version');
        if (storedVersion !== APP_VERSION) {
          console.warn(`Version updated. Clearing old caches...`);
          localStorage.removeItem('cached_role');
          localStorage.removeItem('cached_name');
          localStorage.removeItem('school_settings'); 
          localStorage.removeItem('last_presence_update'); // 🚀 تصفير كاش الحضور مع التحديث
          
          for (let i = 0; i < localStorage.length; i++) {
             const key = localStorage.key(i);
             if (key?.startsWith('arena_save_')) localStorage.removeItem(key);
          }
          localStorage.setItem('app_version', APP_VERSION);
        }

        // جلب الـ Session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // جلب إعدادات المنصة للزوار لمعرفة حالة الإغلاق
          const { data: guestSettings } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
          if (guestSettings && mounted) setRawSettings(guestSettings);

          if (mounted) {
            setUser(null);
            setAuthRole(null);
            setIsControlTeamMember(false);
            localStorage.removeItem('cached_role');
            localStorage.removeItem('cached_name');
            
            if (!isPublicPage) window.location.replace('/login');
            setIsChecking(false);
          }
          return;
        }

        if (mounted) setUser(session.user);

        // جلب التفاصيل من السيرفر
        if (fetchedUserId.current !== session.user.id) {
           fetchedUserId.current = session.user.id;

           const [userRes, settingsRes, controlRes] = await Promise.all([
             supabase.from('users').select('role, full_name, must_reset_password').eq('id', session.user.id).maybeSingle(),
             supabase.from('platform_settings').select('*').limit(1).maybeSingle(),
             supabase.from('exam_control_team').select('id').eq('user_id', session.user.id).eq('academic_year', '2025-2026').maybeSingle()
           ]);

           if (mounted) {
             if (controlRes?.data) setIsControlTeamMember(true);

             if (userRes?.data) {
                setAuthRole(userRes.data.role);
                setUserName(userRes.data.full_name || '');
                setMustResetPassword(userRes.data.must_reset_password || false);
                localStorage.setItem('cached_role', userRes.data.role);
                localStorage.setItem('cached_name', userRes.data.full_name || '');
                
                // 🚀 تسجيل الحضور عند إعادة تحميل الصفحة أو التنقل
                recordDailyPresence(session.user, userRes.data.role);
             }
             if (settingsRes?.data) {
               setRawSettings(settingsRes.data);
             }
             setIsChecking(false);
           }
        } else {
           if (mounted) {
              setIsChecking(false);
              // 🚀 تسجيل الحضور حتى لو كان المستخدم موجوداً مسبقاً (سيتم صده إذا لم تمر 15 دقيقة)
              if (authRole) recordDailyPresence(session.user, authRole);
           }
        }
      } catch (err) {
        console.error("Auth init exception:", err);
      } finally {
        if (mounted) setIsChecking(false);
        isFetchingRef.current = false; 
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) { 
          setUser(null); 
          setAuthRole(null); 
          setIsControlTeamMember(false);
          localStorage.removeItem('cached_role');
          localStorage.removeItem('cached_name');
          if (!isPublicPage) window.location.replace('/login'); 
        }
      } 
      else if (event === 'SIGNED_IN') {
        if (session?.user && fetchedUserId.current !== session.user.id) {
          initializeAuth();
        }
      }
    });

    return () => { 
      mounted = false; 
      subscription.unsubscribe(); 
    };
  }, [isPublicPage, authRole]); // 🚀 أضفنا authRole هنا لضمان عمل المتتبع

  // 🚀 منطق إغلاق المنصة الصارم
  useEffect(() => {
    if (isChecking) return;

    let isOpen = true;
    if (rawSettings && typeof rawSettings.is_open !== 'undefined') {
      isOpen = rawSettings.is_open === true || String(rawSettings.is_open).toLowerCase() === 'true';
    }
    
    if (!isOpen && authRole !== 'admin' && authRole !== 'management' && !isControlTeamMember) {
      setPlatformClosed(true);
      setCloseMessage(rawSettings?.message || '<div class="text-center text-white">المنصة مغلقة للصيانة</div>');
    } else {
      setPlatformClosed(false);
    }
  }, [rawSettings, authRole, isControlTeamMember, isChecking]);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#02040a] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تأمين الاتصال والتحقق من الصلاحيات...</p>

          <AnimatePresence>
            {showEmergencyBtn && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center flex flex-col items-center gap-4">
                 <p className="text-rose-400 text-xs font-bold px-6 text-center">يبدو أن الاتصال بقاعدة البيانات يستغرق وقتاً طويلاً.</p>
                 <button onClick={emergencyClear} className="px-6 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black hover:bg-rose-500 hover:text-white transition-all text-sm active:scale-95 shadow-inner">
                   إلغاء ومحاولة الدخول مجدداً
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (platformClosed && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden font-cairo" dir="rtl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-2xl w-full p-4">
          <div className="bg-[#0f1423]/80 backdrop-blur-2xl rounded-[3rem] p-8 sm:p-12 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
            <div className="flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
              <div className="h-24 w-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] border border-white/20 flex items-center justify-center shadow-inner relative z-10">
                <Settings className="h-10 w-10 text-white animate-spin-slow" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-8 leading-tight">المنصة في وضع الصيانة</h1>
            <div className="w-full relative z-10 text-center bg-[#02040a]/60 p-6 rounded-3xl border border-white/5 shadow-inner leading-relaxed font-bold" dangerouslySetInnerHTML={{ __html: closeMessage }} />
            
            {user && (
              <button onClick={signOut} className="block w-full mt-10 text-sm font-bold text-slate-400 hover:text-white underline transition-colors">تسجيل الخروج من الحساب الحالي</button>
            )}
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

const resetPassword = async (password: string) => {};
const requestPasswordReset = async (civilId: string) => {};
const updatePassword = async (password: string) => {};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
