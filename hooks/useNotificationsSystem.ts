'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// مفتاح تعطيل النظام
const NOTIFICATIONS_ENABLED = false;

export function useNotificationsSystem() {
  const { user } = useAuth();
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    if (!NOTIFICATIONS_ENABLED) return;
    if (!user) return;
  }, [user]);

  useEffect(() => {
    if (!NOTIFICATIONS_ENABLED) return;
    if (!user?.id) return;

    fetchNotifications();
  }, [user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    if (!NOTIFICATIONS_ENABLED) return;

    // تحديث محلي فقط بدون أي request
    setData(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!NOTIFICATIONS_ENABLED) return;

    // تحديث محلي فقط
    setData(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
  }, []);

  return {
    data,              // فارغ دائماً حالياً
    loading,           // false
    error,             // null
    refetch: fetchNotifications, // معطل
    markAsRead,
    markAllAsRead
  };
}
