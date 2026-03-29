'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: SupabaseUser | null;
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdminByEmail, setIsAdminByEmail] = useState(false);
  const [platformClosed, setPlatformClosed] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isPublicPage = isLoginPage || isResetPasswordPage;

  const signIn = async (civilId: string, password: string) => {
    let authEmail = civilId;
    
    if (!civilId.includes('@')) {
      // Try to find student
      const { data: studentData } = await supabase
        .from('students')
        .select('id, users!inner(email)')
        .eq('national_id', civilId)
        .maybeSingle();
        
      if (studentData && studentData.users) {
        authEmail = (studentData.users as { email: string }).email;
      } else {
        // Try to find teacher
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id, users!inner(email)')
          .eq('national_id', civilId)
          .maybeSingle();
          
        if (teacherData && teacherData.users) {
          authEmail = (teacherData.users as { email: string }).email;
        } else {
          // Try to find parent
          const { data: parentData } = await supabase
            .from('parents')
            .select('id, users!inner(email)')
            .eq('national_id', civilId)
            .maybeSingle();
            
          if (parentData && parentData.users) {
            authEmail = (parentData.users as { email: string }).email;
          } else {
            // Default fallback
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
        setMustResetPassword(true);
        router.push('/reset-password');
      } else {
        router.push('/');
      }
    }
  };

  const requestPasswordReset = async (civilId: string) => {
    let authEmail = '';
    
    // Check students
    const { data: studentData } = await supabase
      .from('students')
      .select('users!inner(email)')
      .eq('national_id', civilId)
      .maybeSingle();
      
    if (studentData && studentData.users) {
      authEmail = (studentData.users as { email: string }).email;
    } else {
      // Check teachers
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('users!inner(email)')
        .eq('national_id', civilId)
        .maybeSingle();
        
      if (teacherData && teacherData.users) {
        authEmail = (teacherData.users as { email: string }).email;
      } else {
        // Check parents
        const { data: parentData } = await supabase
          .from('parents')
          .select('users!inner(email)')
          .eq('national_id', civilId)
          .maybeSingle();
          
        if (parentData && parentData.users) {
          authEmail = (parentData.users as { email: string }).email;
        }
      }
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
          const cachedRole = sessionStorage.getItem('userRole');
          const cachedName = sessionStorage.getItem('userName');
          if (cachedRole) setUserRole(cachedRole);
          if (cachedName) setUserName(cachedName);
        } else {
          setUser(null);
          sessionStorage.removeItem('userRole');
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
        setUserRole(null);
        sessionStorage.removeItem('userRole');
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
      setUserRole(null);
      return;
    }

    // Skip fetching if we already have the role from cache and it's not a fresh login
    if (userRole && userName && !isLoginPage) {
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
          setUserRole(role);
          setMustResetPassword(userRes.data.must_reset_password || false);
          
          // Cache the data
          sessionStorage.setItem('userRole', role || '');
          sessionStorage.setItem('userName', name);
        }

        if (!isPublicPage) {
          try {
            if (!settingsError && settings) {
              let isOpen = settings.is_open;
              const now = new Date();
              
              if (settings.open_date && new Date(settings.open_date) > now) {
                isOpen = false;
              }
              if (settings.close_date && new Date(settings.close_date) < now) {
                isOpen = false;
              }

              if (!isOpen && role !== 'admin' && role !== 'management') {
                setPlatformClosed(true);
                setCloseMessage(settings.message || 'المنصة مغلقة حاليا للصيانة');
              }
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
  }, [user, isPublicPage, isLoginPage, userRole, userName]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userName');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
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
