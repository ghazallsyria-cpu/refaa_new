'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

import { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '@/types';

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

      if (userData.must_reset_password) {
        setMustResetPassword(true);
        router.push('/reset-password');
      } else {
        router.push('/');
      }
    }
  };

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
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const cachedRole = sessionStorage.getItem('authRole');
          const cachedName = sessionStorage.getItem('userName');
          if (cachedRole) setAuthRole(cachedRole as UserRole);
          if (cachedName) setUserName(cachedName);

          // 🚀 الحل هنا: إذا كانت الذاكرة نظيفة (لا يوجد Role)، نأمر النظام بانتظار جلب البيانات من السيرفر
          if (cachedRole && cachedName) {
             setIsChecking(false); 
          }
        } else {
          setUser(null);
          sessionStorage.removeItem('authRole');
          sessionStorage.removeItem('userName');
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
        sessionStorage.removeItem('authRole');
        sessionStorage.removeItem('userName');
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

    if (authRole && userName && !isLoginPage) return;

    const fetchUserData = async () => {
      setIsChecking(true);
      try {
        const [userRes, settingsRes] = await Promise.all([
          supabase.from('users').select('role, full_name, must_reset_password').eq('id', user.id).maybeSingle(),
          !isPublicPage ? supabase.from('platform_settings').select('*').limit(1).maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);

        // صائد الأشباح (تم التأمين ضد أخطاء الشبكة)
        if (!userRes.data && !userRes.error && !isPublicPage) {
          console.warn("Ghost account detected! Forcing auto-logout and clear...");
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login?cleared=ghost_session';
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
        setIsChecking(false); // 🚀 بعد انتهاء جلب البيانات تماماً، نسمح للصفحة بالفتح
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
        setCloseMessage(rawSettings.message || 'المنصة مغلقة حاليا للصيانة');
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
