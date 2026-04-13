
// 🚨 هذا الكود هدفه الوحيد هو تدمير الكاش القديم وإجبار المتصفحات على التحديث
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// هذا يمنع الـ Service Worker من التدخل في أي طلبات شبكة ويجبرها على الذهاب للسيرفر مباشرة
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});

// هذه التعليمة تخبر الـ Service Worker أن يدمر نفسه
self.registration.unregister().then(function() {
  console.log('Service Worker unregistered');
});


