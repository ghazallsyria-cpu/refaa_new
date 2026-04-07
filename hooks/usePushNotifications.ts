'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// دالة تحويل المفتاح العام
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (e) {
      console.error('Error checking subscription', e);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Service Worker غير مدعوم في هذا المتصفح.');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('يجب تسجيل الدخول أولاً لتفعيل الإشعارات.');

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== 'granted') throw new Error('تم رفض الإشعارات من قبلك، يجب السماح بها من إعدادات المتصفح.');

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) throw new Error('مفتاح VAPID غير موجود (تأكد من إضافته في إعدادات البيئة باسم NEXT_PUBLIC_VAPID_PUBLIC_KEY).');

      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      } catch (subError: any) {
         console.warn("فشل الاشتراك الأولي، جاري تنظيف الاشتراك القديم والمحاولة مجدداً...", subError);
         // إذا فشل بسبب وجود مفتاح قديم مخزن في المتصفح، نزيله ونجرب مرة أخرى
         const existingSub = await registration.pushManager.getSubscription();
         if (existingSub) {
            await existingSub.unsubscribe();
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
         } else {
            throw subError;
         }
      }

      const subData = JSON.parse(JSON.stringify(subscription));

      // 🚀 تم الإصلاح هنا: تغيير onConflict ليتطابق مع قيود جدولك
      const { error: dbError } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: subData.endpoint,
        auth: subData.keys.auth,
        p256dh: subData.keys.p256dh
      }, { onConflict: 'user_id,endpoint' });

      if (dbError) {
         console.error("Supabase Insert Error:", dbError);
         throw new Error(`قاعدة البيانات ترفض الحفظ: ${dbError.message} (تأكد من سياسات RLS للجدول)`);
      }

      setSubscribed(true);
    } catch (error: any) {
      console.error('Push subscription failed:', error);
      alert(`لم نتمكن من تفعيل الإشعارات:\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        const subData = JSON.parse(JSON.stringify(subscription));
        await supabase.from('push_subscriptions').delete().eq('endpoint', subData.endpoint);
      }
      setSubscribed(false);
    } catch (error) {
      console.error('Unsubscribe failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { permission, subscribed, loading, subscribe, unsubscribe };
}
