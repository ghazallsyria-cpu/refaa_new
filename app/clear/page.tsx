'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ClearCachePage() {
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    const nukeEverything = async () => {
      try {
        // 1. مسح الذاكرة المحلية والجلسات
        localStorage.clear();
        sessionStorage.clear();

        // 2. اقتلاع عمال الخدمة (Service Workers) المسؤولة عن الكاش العنيد في الجوالات
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('Service Worker unregistered');
          }
        }

        // 3. مسح مساحة تخزين الكاش العميقة (Cache API)
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('Cache deleted:', cacheName);
          }
        }

        // 4. مسح ملفات تعريف الارتباط (Cookies)
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // 5. إظهار رسالة النجاح
        setStatus('success');

        // 6. توجيه إجباري لصفحة الدخول مع رقم عشوائي لمنع المتصفح من العودة للوراء
        setTimeout(() => {
          window.location.replace('/login?rescued=' + new Date().getTime());
        }, 2000);

      } catch (error) {
        console.error('Error during cleanup:', error);
        // في حال حدوث خطأ، نوجهه على أي حال
        window.location.replace('/login?forced_rescue=' + new Date().getTime());
      }
    };

    // تشغيل عملية التنظيف بمجرد فتح الصفحة
    nukeEverything();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-cairo" dir="rtl">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        <div className="flex justify-center mb-6">
          {status === 'loading' ? (
            <div className="relative">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
          )}
        </div>
        
        <h1 className={`text-2xl font-black mb-3 transition-colors ${status === 'loading' ? 'text-slate-800' : 'text-emerald-600'}`}>
          {status === 'loading' ? 'جاري إصلاح وتحديث المنصة...' : 'تم التحديث بنجاح!'}
        </h1>
        
        <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
          {status === 'loading' 
            ? 'يرجى الانتظار لحظات، نقوم بمسح البيانات القديمة وتجهيز بيئة عمل نظيفة لهاتفك.' 
            : 'بيئة العمل أصبحت نظيفة تماماً. سيتم تحويلك الآن لتسجيل الدخول.'}
        </p>

        {status === 'loading' && (
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-2.5 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-full origin-left"></div>
          </div>
        )}
      </div>
    </div>
  );
}
