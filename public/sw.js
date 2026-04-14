// public/sw.js
// ☢️ فايروس التدمير الذاتي: هذا الملف مصمم لاغتيال الكاش القديم

self.addEventListener('install', function(e) {
  // تخطي الانتظار وتثبيت هذا التحديث فوراً
  self.skipWaiting(); 
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    // 1. مسح كل ملفات الكاش العميقة في هاتف المستخدم
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // 2. الانتحار: إلغاء تسجيل عامل الخدمة للأبد
      return self.registration.unregister();
    }).then(function() {
      // 3. السيطرة على المتصفح وتحديثه إجبارياً
      return self.clients.claim();
    })
  );
});
