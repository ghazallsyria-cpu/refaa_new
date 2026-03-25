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
          setIsAdminByEmail(session.user.email === 'ghazallsyria@gmail.com');
        } else {
          setUser(null);
          setIsAdminByEmail(false);
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
        setIsAdminByEmail(false);
        if (!isPublicPage) {
          router.push('/login');
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user);
          setIsAdminByEmail(session.user.email === 'ghazallsyria@gmail.com');
        }
        if (isLoginPage) {
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
          setUserName(userRes.data.full_name || user.email?.split('@')[0] || '');
          setUserRole(role);
          setMustResetPassword(userRes.data.must_reset_password || false);
        }

        if (isAdminByEmail && role !== 'admin') {
          try {
            await supabase
              .from('users')
              .upsert({ 
                id: user.id, 
                email: user.email, 
                full_name: 'المدير العام',
                role: 'admin' 
              });
            role = 'admin';
            setUserRole('admin');
          } catch (err) {
            console.error('Error auto-updating admin role:', err);
          }
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

              if (!isOpen && role !== 'admin' && role !== 'management' && !isAdminByEmail) {
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
  }, [user, isPublicPage, isAdminByEmail]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
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
