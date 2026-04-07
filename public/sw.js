// 🚀 الجزء الأول: متطلبات تطبيق الويب التقدمي (PWA)
self.addEventListener('install', (event) => {
  // تفعيل التحديث الفوري للتطبيق
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // السيطرة على جميع الصفحات فوراً
  event.waitUntil(clients.claim());
});

// ⚠️ هذا الحدث (fetch) هو الشرط السري لجوجل كروم لكي يظهر زر "تثبيت التطبيق"
self.addEventListener('fetch', (event) => {
  // يمكن تركه فارغاً حالياً، وهو مجرد إثبات للمتصفح أن الموقع جاهز ليكون تطبيقاً
});

// 🚀 الجزء الثاني: إشعارات الدفع (الكود الاحترافي الخاص بك)
self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png', // أيقونة شفافة تظهر في شريط الإشعارات العلوي
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
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
