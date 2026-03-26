'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: any;
  userRole: string | null;
  userName: string;
  mustResetPassword: boolean;
  isChecking: boolean;
  isAdminByEmail: boolean;
  platformClosed: boolean;
  closeMessage: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
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
  }, [user, isPublicPage, isLoginPage]);

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
      signOut
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
