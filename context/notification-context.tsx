'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
// 🚀 إضافة هذا الاستيراد للاعتماد على الـ Auth المستقر
import { useAuth } from '@/context/auth-context';

export type NotificationType =
  | 'exam'
  | 'assignment'
  | 'attendance'
  | 'message'
  | 'announcement'
  | 'system'
  | 'success'
  | 'error';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: NotificationType;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (
    userId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string
  ) => Promise<void>;
  showNotification: (type: NotificationType, content: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 استدعاء الـ user من الـ AuthContext النظيف والمستقر لدينا
  const { user } = useAuth() as any;
  const userId = user?.id || null;
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchNotifications = useCallback(async (uid: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // 🚀 مراقبة تغير الـ userId فقط (الذي يأتي من AuthContext بعد التحقق)
  useEffect(() => {
    let mounted = true;

    if (userId) {
      // تحميل أولي للبيانات
      fetchNotifications(userId);

      // مسح أي عداد سابق لتجنب التكدس
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // تحديث الإشعارات كل 3 دقائق
      intervalRef.current = setInterval(() => {
        if (mounted) fetchNotifications(userId);
      }, 3 * 60 * 1000);

    } else {
      // تفريغ البيانات عند تسجيل الخروج
      setNotifications([]);
      setLoading(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, fetchNotifications]); // 🚀 يعتمد فقط على الـ userId الصريح والمستقر

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const sendNotification = async (
    targetUserId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string
  ) => {
    const { error } = await supabase.from('notifications').insert({
      user_id: targetUserId,
      title,
      content,
      type,
      link,
    });

    if (error) {
      console.error('Error sending notification:', error);
      return;
    }

    fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetUserId,
        title,
        body: content,
        url: link || '/',
      }),
    }).catch(() => {});
  };

  const showNotification = async (type: NotificationType, content: string) => {
    if (!userId) return;
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    await sendNotification(userId, title, content, type);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendNotification,
        showNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
