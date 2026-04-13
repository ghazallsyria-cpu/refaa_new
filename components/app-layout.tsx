
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Footer } from './footer';
import { useEffect, useState } from 'react';
import { School, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * 🛠️ الإطار الرئيسي للمنصة (نسخة نظيفة من تعقيدات الكاش)
 * المسار: components/app-layout.tsx
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isLivePage = pathname === '/live';
  const isPublicPage = isLoginPage || isResetPasswordPage || isLivePage;

  // 1️⃣ التقاط الأخطاء العامة (بدون إرسال للسيرفر لتخفيف الضغط)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection:", event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 2️⃣ دالة فحص الصلاحيات (Authorization Guard)
  const getAuthorization = () => {
    if (isChecking || isPublicPage || !user || !authRole) return true;
    if (mustResetPassword && !isResetPasswordPage) return false;

    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (authRole === 'student') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) return false;
    } else if (authRole === 'teacher') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) return false;
    } else if (authRole === 'parent') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) return false;
    } else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) {
      if (isRoot) return false;
    }
    return true;
  };

  const isAuthorized = getAuthorization();

  // 3️⃣ نظام التوجيه التلقائي (Route Redirects)
  useEffect(() => {
    if (isChecking || isPublicPage || !user) return;
    
    if (mustResetPassword && !isResetPasswordPage) {
      router.push('/reset-password');
      return;
    }
    
    if (!authRole) return;

    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (authRole === 'student') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) router.push('/dashboard/student');
    } else if (authRole === 'teacher') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) router.push('/dashboard/teacher');
    } else if (authRole === 'parent') {
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) router.push('/dashboard/parent');
    } else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) {
      if (isRoot) router.push('/dashboard');
    }
  }, [pathname, authRole, isChecking, isPublicPage, router, isAdminByEmail, user, mustResetPassword, isResetPasswordPage]);

  // 🌀 شاشة التحميل (أثناء فحص حالة المستخدم)
  if (isChecking || (!isAuthorized && !isPublicPage)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50/80 backdrop-blur-sm">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 shadow-lg"></div>
          <div className="absolute inset-0 flex items-center justify-center"><School className="h-6 w-6 text-indigo-600 animate-pulse"/></div>
        </div>
      </div>
    );
  }

  // 🛑 شاشة إغلاق المنصة للصيانة
  if (platformClosed && !isPublicPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4 text-center relative overflow-hidden" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl mb-8 border-4 border-white">
          <School className="h-12 w-12 text-white" />
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-slate-200 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-50 p-4 rounded-full border border-amber-100 animate-bounce">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">المنصة مغلقة مؤقتاً</h1>
          <p className="text-slate-600 mb-8 font-bold text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {closeMessage}
          </p>
          <button onClick={signOut} className="w-full py-4 rounded-[1.5rem] shadow-lg text-sm font-black text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95">العودة لتسجيل الدخول</button>
        </motion.div>
      </div>
    );
  }

  // 🌍 الصفحات العامة (Login, Reset Password)
  if (isPublicPage) {
    return (
      <main className="flex-1 h-full flex flex-col overflow-y-auto">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>
    );
  }

  const showSidebar = !isPublicPage;

  // 🏛️ بناء هيكل لوحة التحكم (Dashboard Layout)
  return (
    <div className="flex h-full overflow-hidden bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">
      
      {/* خلفية معتمة للهاتف عند فتح القائمة الجانبية */}
      <AnimatePresence>
        {isSidebarOpen && showSidebar && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden backdrop-blur-md" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>
      
      {/* القائمة الجانبية (Sidebar) */}
      {showSidebar && (
        <div className={cn(
          "fixed inset-y-0 right-0 z-50 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] print:hidden shadow-2xl lg:shadow-none", 
          isSidebarCollapsed ? "w-20" : "w-72", 
          isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0", 
          !isSidebarOpen && "lg:translate-x-full lg:w-0", 
          isSidebarOpen && "lg:translate-x-0 lg:static"
        )}>
          <Sidebar 
            onClose={() => setIsSidebarOpen(false)} 
            authRole={authRole || 'student'} 
            isCollapsed={isSidebarCollapsed} 
            onToggleCollapse={() => { 
              setIsSidebarCollapsed(!isSidebarCollapsed); 
              if (window.innerWidth >= 1024) setIsSidebarOpen(false); 
            }} 
          />
        </div>
      )}
      
      {/* المحتوى الرئيسي للوحة التحكم */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full relative bg-slate-50/50">
        <div className="print:hidden sticky top-0 z-30">
          <Header 
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            showMenuButton={showSidebar} 
            user={user} 
            authRole={authRole || ''} 
            userName={userName} 
            isSidebarCollapsed={!isSidebarOpen} 
          />
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible flex flex-col scroll-smooth">
          <div className="flex-1 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
          <Footer />
        </main>
      </div>
      
    </div>
  );
}



