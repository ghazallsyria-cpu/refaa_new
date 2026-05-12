// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Smartphone, MoreVertical } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [isReady, setIsReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false); 
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. التحقق من حالة التثبيت
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone || 
             document.referrer.includes('android-app://');
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return; 
    }

    // 2. التحقق من إغلاق المستخدم للنافذة سابقاً
    const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (isDismissed) return;

    // 3. اكتشاف نوع الجهاز
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);

    let timer: NodeJS.Timeout;

    // 4. استراق السمع لإشارة التثبيت من أندرويد
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 🚀 الإصلاح: إزالة الـ return القاتل، وتشغيل المؤقتات بذكاء
    if (isIosDevice) {
      // آيفون يظهر بعد 3 ثواني
      timer = setTimeout(() => setShowPrompt(true), 3000);
    } else if (isAndroidDevice) {
      // أندرويد: إذا لم يرسل كروم زر التثبيت بعد 5 ثواني (بسبب مشكلة الأيقونات)، نظهر الإشعار اليدوي
      timer = setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 5000);
    } else {
       // الديسكتوب
       timer = setTimeout(() => {
          setShowPrompt(true);
       }, 5000);
    }

    setIsReady(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isStandalone || !isReady || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 z-[9999] max-w-sm"
        dir="rtl"
      >
        <div className="bg-[#131836]/95 backdrop-blur-xl border border-indigo-500/30 rounded-[1.5rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] pointer-events-none rounded-full"></div>
          
          <button onClick={handleDismiss} className="absolute top-3 left-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors z-10 active:scale-90">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="pr-1">
              <h3 className="font-black text-white text-sm mb-1">ثبّت التطبيق الآن</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-300 leading-relaxed">
                احصل على تجربة أسرع وإشعارات فورية، واستخدم المنصة بدون الحاجة لفتح المتصفح في كل مرة.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-1">
            {isIOS ? (
              <div className="bg-[#02040a]/60 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-300">
                  اضغط على زر المشاركة <Share className="w-3 h-3 text-indigo-400 inline mx-1" /> بالأسفل، ثم اختر <br/> 
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded mt-1 inline-block border border-white/10">إضافة للشاشة الرئيسية 📱</span>
                </p>
              </div>
            ) : deferredPrompt ? (
              <button 
                onClick={handleInstallClick}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-indigo-500/50"
              >
                <Download className="w-4 h-4" /> تثبيت التطبيق
              </button>
            ) : (
              <div className="bg-[#02040a]/60 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-300">
                  من قائمة المتصفح العلوية <MoreVertical className="w-3 h-3 text-indigo-400 inline mx-0.5" /> اختر <br/> 
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded mt-1 inline-block border border-white/10">تثبيت التطبيق (Install App) 📱</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
