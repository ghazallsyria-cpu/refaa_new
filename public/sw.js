// 🚀 الجزء الأول: متطلبات تطبيق الويب التقدمي (PWA)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // إثبات للمتصفح أن الموقع جاهز PWA
});

// 🚀 الجزء الثاني: استقبال إشعارات الدفع (تم التحصين ضد الانهيار)
self.addEventListener('push', function(event) {
  console.log('[Service Worker] تم استلام إشعار دفع (Push Received)');
  
  let data = {};
  
  // 🛡️ استخدام try-catch يمنع المتصفح من الانهيار إذا كان النص غير صالح
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[Service Worker] خطأ في قراءة بيانات الإشعار:', e);
    // إشعار طوارئ في حال فشل قراءة البيانات
    data = { 
      title: 'إشعار من منصة الرفعة', 
      body: 'لديك تحديث جديد في المنصة.',
      url: '/'
    };
  }

  const options = {
    body: data.body || 'لديك رسالة جديدة',
    icon: '/icon-192.png', // تأكد أن هذه الأيقونة موجودة فعلاً في مجلد public
    badge: '/icon-192.png', 
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200, 100, 200], // نمط اهتزاز مميز
    data: { url: data.url || '/' },
    requireInteraction: true // يبقى الإشعار ظاهراً حتى يغلقه المستخدم
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'مدرسة الرفعة', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
