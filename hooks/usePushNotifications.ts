'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });

    setPermission(Notification.permission);
  }, []);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('متصفحك لا يدعم الإشعارات');
      return;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        alert('يرجى السماح بالإشعارات لاستقبال تنبيهات الغياب');
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const padding = '='.repeat((4 - (rawKey.length % 4)) % 4);
      const base64 = (rawKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      if (response.ok) {
        setSubscribed(true);
        console.log('Push subscription saved successfully');
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });

      setSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    } finally {
      setLoading(false);
    }
  };

  return { permission, subscribed, loading, subscribe, unsubscribe };
}
