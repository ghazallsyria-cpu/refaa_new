self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. حذف كل الكاش القديم
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 2. تفعيل الخدمة مباشرة
      await self.clients.claim();

      // 3. إلغاء تسجيل الـ SW القديم (مهم جدًا)
      await self.registration.unregister();
    })()
  );
});
