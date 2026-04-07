'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Info, AlertTriangle, CheckCircle2, MessageSquare, BookOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // إصلاح مسار framer-motion

export type NotificationType = 'exam' | 'assignment' | 'attendance' | 'message' | 'announcement' | 'system' | 'success' | 'error';

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
  sendNotification: (userId: string, title: string, content: string, type: NotificationType, link?: string) => Promise<void>;
  showNotification: (type: NotificationType, content: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (uid: string) => {
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
    }
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let currentUserId: string | null = null;

    const setupNotifications = async (user: any) => {
      const newUserId = user?.id || null;
      
      if (newUserId === currentUserId) {
        return; // Already set up for this user
      }
      
      currentUserId = newUserId;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (newUserId) {
        setUserId(newUserId);
        fetchNotifications(newUserId);

        // Polling every 30 seconds instead of Realtime
        intervalId = setInterval(() => {
          fetchNotifications(newUserId);
        }, 30000);
      } else {
        setUserId(null);
        setNotifications([]);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setupNotifications(session?.user);
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setupNotifications(session?.user);
    });

    return () => {
      subscription.unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const sendNotification = async (
    targetUserId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string
  ) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        content,
        type,
        link,
      });
      if (error) throw error;

      // 🚀 الإضافة السحرية هنا: إرسال الإشعار الفعلي لهاتف الطالب عبر الـ API
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, title, body: content, url: link || '/' })
      }).catch(err => console.error("Failed to trigger push:", err));

    } catch (error) {
      console.error('Error sending notification:', error);
    }
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
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
