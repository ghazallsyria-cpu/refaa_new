'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
import { useEffect, useState } from 'react';
import { School, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase'; 

// 🚀 استيراد كبسولة جيمناي بدلاً من السايد بار القديم
import GeminiNavigation from './GeminiNavigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  // ==========================================
  // 🧭 1. أدوات التوجيه ومعلومات الصفحة الحالية
  // ==========================================
  const pathname = usePathname(); 
  const router = useRouter(); 

  // ==========================================
  // 🔐 2. جلب بيانات المستخدم وصلاحياته
  // ==========================================
  const { 
    user, 
    authRole, 
    userName, 
    mustResetPassword,
    isChecking, 
    isAdminByEmail, 
    platformClosed, 
    closeMessage, 
    signOut 
  } = useAuth() as any;
  
  // 🚀 حالة نظام التعافي التلقائي
  const [isVerifyingClosure, setIsVerifyingClosure] = useState(false);

  // ==========================================
  // 🌍 4. الصفحات العامة (التي لا تحتاج تسجيل دخول أو تحويل قسري)
  // ==========================================
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isLivePage = pathname === '/live'; 
  const isRootPage = pathname === '/'; 

  const isPublicPage = isLoginPage || isResetPasswordPage || isLivePage || isRootPage;

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => { console.error("Global Error:", event.error); };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => { console.error("Unhandled Rejection:", event.reason); };
    window.addEventListener('error', handleGlobalError); 
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => { 
      window.removeEventListener('error', handleGlobalError); 
      window.removeEventListener('unhandledrejection', handleUnhandledRejection); 
    };
  }, []);

  // ==========================================
  // 🛡️ 5. نظام التعافي التلقائي (Auto-Healing Cache)
  // ==========================================
  useEffect(() => {
    if (platformClosed && !isPublicPage) {
      let isMounted = true;
      const verifyRealClosureStatus = async () => {
        setIsVerifyingClosure(true);
        try {
          const { data } = await supabase.from('platform_settings').select('is_open').limit(1).maybeSingle();
          if (data && (data.is_open === true || String(data.is_open).toLowerCase() === 'true')) {
            localStorage.removeItem('school_settings');
            if (isMounted) window.location.reload(); 
          }
        } catch (e) {
          console.error("Verification failed", e);
        } finally {
          if (isMounted) setIsVerifyingClosure(false);
        }
      };
      verifyRealClosureStatus();
      return () => { isMounted = false; };
    }
  }, [platformClosed, isPublicPage]);

  // ==========================================
  // 👮 6. جدار الحماية (Authorization Guard)
  // ==========================================
  const getAuthorization = () => {
    if (isChecking || isPublicPage || !user || !authRole) return true; 
    if (mustResetPassword && !isResetPasswordPage) return false; 
    
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (authRole === 'student') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/student')) return false; 
    }
    else if (authRole === 'teacher') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/teacher')) return false; 
    }
    else if (authRole === 'parent') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/parent')) return false; 
    }
    
    return true; 
  };

  const isAuthorized = getAuthorization();

  // ==========================================
  // 🚀 7. التوجيه الإجباري (Auto-Redirect)
  // ==========================================
  useEffect(() => {
    if (isChecking || isPublicPage || !user || !authRole) return;
    
    if (mustResetPassword && !isResetPasswordPage) { router.push('/reset-password'); return; }
    
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (isDashboardRoute) {
      const hasSeenNewCampus = localStorage.getItem('seen_campus_v1');
      if (!hasSeenNewCampus) {
        localStorage.setItem('seen_campus_v1', 'true'); 
        router.push('/'); 
        return; 
      }
    }

    if (authRole === 'student') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/student')) router.push('/dashboard/student'); 
    }
    else if (authRole === 'teacher') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/teacher')) router.push('/dashboard/teacher'); 
    }
    else if (authRole === 'parent') { 
      if (isDashboardRoute && !pathname.startsWith('/dashboard/parent')) router.push('/dashboard/parent'); 
    }
    else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) { 
      if (isDashboardRoute && pathname === '/dashboard/student') router.push('/dashboard'); 
    }
  }, [pathname, authRole, isChecking, isPublicPage, router, isAdminByEmail, user, mustResetPassword, isResetPasswordPage]);

  // ==========================================
  // ⏳ 8. شاشة التحميل الحاجزة
  // ==========================================
  const isRolePending = !!user && !authRole;

  if (isChecking || isRolePending || (!isAuthorized && !isPublicPage)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#02040a]/90 backdrop-blur-xl z-50 fixed inset-0">
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
          <School className="absolute top-6 h-8 w-8 text-amber-400 animate-pulse"/>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🛑 9. شاشة إغلاق المنصة
  // ==========================================
  const isExemptFromClosure = ['admin', 'management'].includes(authRole);

  if (platformClosed && !isPublicPage && !isExemptFromClosure) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 text-center relative overflow-hidden" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-rose-600 to-red-900 shadow-[0_0_40px_rgba(225,29,72,0.5)] mb-8 border border-rose-500/30 relative z-10">
          <School className="h-12 w-12 text-white" />
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-10 rounded-[2.5rem] max-w-md w-full relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-500/10 p-4 rounded-full border border-amber-500/20 animate-bounce">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight drop-shadow-md">المنصة مغلقة مؤقتاً</h1>
          
          {isVerifyingClosure ? (
            <div className="flex flex-col items-center gap-2 mb-8 bg-black/40 p-4 rounded-2xl border border-white/5">
               <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
               <p className="text-sm font-bold text-amber-400">جاري التحقق اللحظي من حالة السيرفر...</p>
            </div>
          ) : (
            <p className="text-slate-300 mb-8 font-bold text-sm bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
              {closeMessage}
            </p>
          )}

          <button onClick={signOut} className="w-full py-4 rounded-[1.5rem] shadow-[0_0_20px_rgba(245,158,11,0.3)] text-sm font-black text-slate-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 transition-all active:scale-95 border border-amber-300/50">
            العودة لتسجيل الدخول
          </button>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 🔓 10. تخطيط الصفحات العامة (الرئيسية، تسجيل الدخول)
  // ==========================================
  if (isPublicPage) { 
    return (
      <main className="flex-1 h-full flex flex-col overflow-y-auto">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    ); 
  }

  const showSidebar = !isPublicPage;

  // ==========================================
  // 🏗️ 11. الهيكل الرئيسي للتطبيق (Gemini Style)
  // ==========================================
  return (
    <div className="flex h-full overflow-hidden bg-transparent selection:bg-amber-500/30 selection:text-amber-200" dir="rtl">
      
      {/* 🚀 زراعة كبسولة جيمناي */}
      {showSidebar && <GeminiNavigation />}
      
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full relative bg-transparent">
        <div className="print:hidden sticky top-0 z-30">
          <Header 
            onMenuClick={() => {}} // تم إيقاف الاعتماد عليها
            showMenuButton={false} // 🚀 إخفاء زر الهمبرغر القديم لأننا نستخدم Dock / Capsule
            user={user} 
            authRole={authRole || ''} 
            userName={userName} 
            isSidebarCollapsed={true} 
          />
        </div>
        
        {/* 🚀 مساحة إضافية لحماية المحتوى من التغطية بالكبسولة أو الجزيرة السفلية */}
        <main className={cn(
          "flex-1 overflow-y-auto print:p-0 print:overflow-visible flex flex-col scroll-smooth",
          showSidebar ? "p-4 pb-28 md:pr-[110px] sm:p-6 lg:p-8 lg:pb-8" : "p-4 sm:p-6 lg:p-8"
        )}>
          <div className="flex-1 max-w-[1600px] mx-auto w-full">
            {children} 
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
