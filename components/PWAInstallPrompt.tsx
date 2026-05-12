// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Smartphone, MoreVertical } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. هل التطبيق مثبت بالفعل؟ (إذا كان كذلك، لا حاجة لإظهار البانر)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. اكتشاف نوع الجهاز
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. اصطياد إشارة التثبيت الحقيقية من متصفح أندرويد/كروم
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. إظهار البانر بعد 3 ثوانٍ (فقط إذا لم يقم المستخدم بإغلاقه مسبقاً)
    const timer = setTimeout(() => {
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
      // 🚀 تنبيه: إذا ضغطت X سابقاً، لن يظهر. اختبره في المتصفح الخفي (Incognito)
      if (!isDismissed) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

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
    // حفظ قرار المستخدم بعدم الإزعاج
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

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
              <h3 className="font-black text-white text-sm mb-1">ثبّت تطبيق الرفعة</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-300 leading-relaxed">
                احصل على تجربة أسرع للوصول إلى دروسك وجداولك بنقرة واحدة من الشاشة الرئيسية.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-1 border-t border-white/5 pt-3">
            {isIOS ? (
              <div className="bg-[#02040a]/60 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
                  للآيفون: اضغط على أيقونة المشاركة <Share className="w-3 h-3 text-indigo-400 inline mx-0.5" /> بالأسفل، ثم اختر <br/> 
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded mt-1.5 inline-block border border-white/10 shadow-inner">إضافة للشاشة الرئيسية 📱</span>
                </p>
              </div>
            ) : deferredPrompt ? (
              <button 
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 border border-indigo-500/50"
              >
                <Download className="w-4 h-4" /> تثبيت التطبيق الآن
              </button>
            ) : (
              <div className="bg-[#02040a]/60 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-slate-300 leading-relaxed">
                  من قائمة المتصفح العلوية <MoreVertical className="w-3 h-3 text-indigo-400 inline mx-0.5" /> اختر <br/> 
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded mt-1.5 inline-block border border-white/10 shadow-inner">تثبيت التطبيق (Install App) 📱</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
