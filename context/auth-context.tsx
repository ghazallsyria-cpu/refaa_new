'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';

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

// 🚀 دالة ذكية لاستخراج البريد الإلكتروني بأمان وتخطي فخ الـ Array
const extractEmail = (data: any) => {
  if (!data || !data.users) return null;
  return Array.isArray(data.users) ? data.users[0]?.email : data.users?.email;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [platformClosed, setPlatformClosed] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  
  // 🚀 إضافة حفظ الإعدادات الخام للمحرك الزمني
  const [rawSettings, setRawSettings] = useState<any>(null); 
  
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isPublicPage = isLoginPage || isResetPasswordPage;

  const signIn = async (civilId: string, password: string) => {
    let authResult = null;
    let lastError = null;

    if (civilId.includes('@')) {
      // الدخول المباشر بالإيميل
      const { data, error } = await supabase.auth.signInWithPassword({ email: civilId, password });
      authResult = data;
      lastError = error;
    } else {
      // 🚀 الحل الفولاذي: تجربة كل النطاقات الممكنة لتخطي حماية RLS
      let extractedEmail = null;
      try {
        const { data: studentData } = await supabase.from('students').select('id, users!inner(email)').eq('national_id', civilId).maybeSingle();
        extractedEmail = extractEmail(studentData);
        if (!extractedEmail) {
          const { data: teacherData } = await supabase.from('teachers').select('id, users!inner(email)').eq('national_id', civilId).maybeSingle();
          extractedEmail = extractEmail(teacherData);
        }
        if (!extractedEmail) {
          const { data: parentData } = await supabase.from('parents').select('id, users!inner(email)').eq('national_id', civilId).maybeSingle();
          extractedEmail = extractEmail(parentData);
        }
      } catch (e) { /* صمت: حماية RLS منعت القراءة وهذا طبيعي قبل الدخول */ }

      // تجهيز قائمة الإيميلات المحتملة
      const possibleEmails = [];
      if (extractedEmail) possibleEmails.push(extractedEmail);
      possibleEmails.push(`${civilId}@alrefaa.edu`); // النطاق e
      possibleEmails.push(`${civilId}@alrifaa.edu`); // النطاق i

      // إزالة المكرر
      const uniqueEmails = [...new Set(possibleEmails)];

      // تجربة الإيميلات بالتسلسل حتى ينجح الدخول
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
        .select('role, must_reset_password')
        .eq('id', authResult.user.id)
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        throw new Error(`تم تسجيل الدخول، ولكن لم نجد بياناتك في النظام. يرجى مراجعة الإدارة.`);
      }

      if (userData.must_reset_password) {
        setMustResetPassword(true);
        router.push('/reset-password');
      } else {
        router.push('/');
      }
    }
  };

  const requestPasswordReset = async (civilId: string) => {
    let authEmail = '';
    
    const { data: studentData } = await supabase.from('students').select('users!inner(email)').eq('national_id', civilId).maybeSingle();
    authEmail = extractEmail(studentData);
      
    if (!authEmail) {
      const { data: teacherData } = await supabase.from('teachers').select('users!inner(email)').eq('national_id', civilId).maybeSingle();
      authEmail = extractEmail(teacherData);
    }
    
    if (!authEmail) {
      const { data: parentData } = await supabase.from('parents').select('users!inner(email)').eq('national_id', civilId).maybeSingle();
      authEmail = extractEmail(parentData);
    }

    if (!authEmail) {
      throw new Error('لم يتم العثور على حساب مرتبط بهذا الرقم المدني');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/login/update-password`,
    });

    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw error;
  };

  const resetPassword = async (password: string) => {
    if (!user) throw new Error('غير مصرح لك بإجراء هذا التغيير');

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) throw updateError;

    // Update the must_reset_password flag
    const { error: dbError } = await supabase
      .from('users')
      .update({ must_reset_password: false })
      .eq('id', user.id);

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
          // Check cached role
          const cachedRole = sessionStorage.getItem('authRole');
          const cachedName = sessionStorage.getItem('userName');
          if (cachedRole) setAuthRole(cachedRole as UserRole);
          if (cachedName) setUserName(cachedName);
        } else {
          setUser(null);
          sessionStorage.removeItem('authRole');
          sessionStorage.removeItem('userName');
          if (!isPublicPage) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
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
        if (!isPublicPage) {
          router.push('/login');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
        }
        if (event === 'SIGNED_IN' && isLoginPage) {
          router.push('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isPublicPage, isLoginPage, router]);

  useEffect(() => {
    if (!user) {
      setAuthRole(null);
      return;
    }

    // Skip fetching if we already have the role from cache and it's not a fresh login
    if (authRole && userName && !isLoginPage) {
      return;
    }

    const fetchUserData = async () => {
      setIsChecking(true);
      try {
        const [userRes, settingsRes] = await Promise.all([
          supabase
            .from('users')
            .select('role, full_name, must_reset_password')
            .eq('id', user.id)
            .single(),
          !isPublicPage ? supabase
            .from('platform_settings')
            .select('*')
            .limit(1)
            .maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);

        let role = userRes.data?.role;
        const settings = settingsRes.data;
        const settingsError = settingsRes.error;

        if (userRes.data) {
          const name = userRes.data.full_name || user.email?.split('@')[0] || '';
          setUserName(name);
          setAuthRole(role as UserRole);
          setMustResetPassword(userRes.data.must_reset_password || false);
          
          // Cache the data
          sessionStorage.setItem('authRole', role || '');
          sessionStorage.setItem('userName', name);
        }

        if (!isPublicPage) {
          try {
            if (!settingsError && settings) {
              // 🚀 حفظ الإعدادات الخام للمحرك الزمني
              setRawSettings(settings);
            }
          } catch (settingsErr) {
            console.warn('Platform settings error:', settingsErr);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsChecking(false);
      }
    };

    fetchUserData();
  }, [user, isPublicPage, isLoginPage, authRole, userName]);

  // ==========================================
  // 🚀 السحر الأول: المحرك الزمني (إلغاء تأثير التواريخ القديمة)
  // ==========================================
  useEffect(() => {
    if (!rawSettings) return;

    const evaluatePlatformStatus = () => {
      // الاعتماد المطلق على زر التفعيل (is_open) وتجاهل التاريخ القديم
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

  // ==========================================
  // 🚀 السحر الثاني: المحرك اللحظي لمراقبة حالة المنصة
  // ==========================================
  useEffect(() => {
    if (!user || isPublicPage || authRole === 'admin' || authRole === 'management') return;

    const channel = supabase
      .channel('platform_settings_listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_settings' },
        (payload) => {
          // تحديث الإعدادات الخام للمحرك الزمني
          setRawSettings(payload.new); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPublicPage, authRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthRole(null);
    sessionStorage.removeItem('authRole');
    sessionStorage.removeItem('userName');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      authRole, 
      userRole: authRole,
      userName, 
      mustResetPassword,
      isChecking, 
      isAdminByEmail, 
      platformClosed, 
      closeMessage,
      signOut,
      signIn,
      resetPassword,
      requestPasswordReset,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
