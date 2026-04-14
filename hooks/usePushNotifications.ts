'use client';

import { useState, useEffect } from 'react';

// 🚀 تم إيقاف نظام الإشعارات وعامل الخدمة (Service Worker) بالكامل من هنا
// لضمان عدم عودة مشكلة الكاش (الزومبي) وتعليق المتصفحات للأبد.

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');

  useEffect(() => {
    // فقط لتحديث حالة الإذن شكلياً للواجهة إذا كان المتصفح يدعم ذلك
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribeToPush = async () => {
    console.log('🚨 تم إيقاف نظام الإشعارات مؤقتاً لحماية المنصة من مشكلة الكاش.');
    return false;
  };

  const unsubscribeFromPush = async () => {
    console.log('🚨 تم إيقاف نظام الإشعارات.');
    setIsSubscribed(false);
    return true;
  };

  return {
    isSubscribed,
    permission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
