import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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

export function useNotificationsSystem() {
  const { user } = useAuth();
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: notifData, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setData(notifData || []);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId: user.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to mark as read');
      await fetchNotifications();
    } catch (err: any) {
      console.error('Error marking as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, all: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to mark all as read');
      await fetchNotifications();
    } catch (err: any) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  };

  return { data, loading, error, refetch: fetchNotifications, markAsRead, markAllAsRead };
}
