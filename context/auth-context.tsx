'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// تعريف أنواع البيانات للـ Context
type AuthContextType = {
  user: User | null;
  authRole: string | null;
  isAdminByEmail: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => void;
};

// إنشاء الـ Context بقيمة افتراضية فارغة
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [isAdminByEmail, setIsAdminByEmail] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // دالة لجلب تفاصيل المستخدم ودوره
  const fetchUserRole = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        setAuthRole(data.role);
        // التحقق مما إذا كان المستخدم أدمن بناءً على بريده الإلكتروني (مثال)
        setIsAdminByEmail(data.role === 'admin' || data.role === 'superadmin');
      }
    } catch (err) {
      console.error('Failed to get user role', err);
    }
  };

  useEffect(() => {
    // 1. جلب الجلسة الحالية عند تحميل التطبيق
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // 2. مراقبة تغييرات الجلسة (تسجيل دخول، خروج، الخ)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user);
      } else {
        setUser(null);
        setAuthRole(null);
        setIsAdminByEmail(false);
      }
      setIsLoading(false);
    });

    // 3. الترقب اللحظي (Realtime) بدلاً من setInterval لتقييم حالة المنصة
    const statusSubscription = supabase
      .channel('public:platform_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_settings' },
        (payload) => {
          // يمكنك هنا استدعاء دالة لمعالجة التغييرات في إعدادات المنصة إذا لزم الأمر
          console.log('Platform settings changed:', payload.new);
        }
      )
      .subscribe();

    // 4. التنظيف (Cleanup) عند إغلاق التطبيق
    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(statusSubscription);
    };
  }, []);

  // دالة لتسجيل الخروج
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // دالة لتحديث الجلسة يدوياً إذا لزم الأمر
  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user);
    }
  };

  // القيم التي سيتم توفيرها لجميع أجزاء التطبيق
  const value = {
    user,
    authRole,
    isAdminByEmail,
    isLoading,
    signOut,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook لاستخدام الـ Context بسهولة في أي مكان
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
