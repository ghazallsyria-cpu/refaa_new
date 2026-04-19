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

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authRole, userName, mustResetPassword, isChecking, isAdminByEmail, platformClosed, closeMessage, signOut } = useAuth() as any;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isLivePage = pathname === '/live';
  const isPublicPage = isLoginPage || isResetPasswordPage || isLivePage;

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => { console.error("Global Error:", event.error); };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => { console.error("Unhandled Rejection:", event.reason); };
    window.addEventListener('error', handleGlobalError); window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => { window.removeEventListener('error', handleGlobalError); window.removeEventListener('unhandledrejection', handleUnhandledRejection); };
  }, []);

  const getAuthorization = () => {
    if (isChecking || isPublicPage || !user || !authRole) return true;
    if (mustResetPassword && !isResetPasswordPage) return false;
    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (authRole === 'student') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) return false; }
    else if (authRole === 'teacher') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) return false; }
    else if (authRole === 'parent') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) return false; }
    else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) { if (isRoot) return false; }
    return true;
  };

  const isAuthorized = getAuthorization();

  useEffect(() => {
    if (isChecking || isPublicPage || !user) return;
    if (mustResetPassword && !isResetPasswordPage) { router.push('/reset-password'); return; }
    if (!authRole) return;
    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (authRole === 'student') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) router.push('/dashboard/student'); }
    else if (authRole === 'teacher') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) router.push('/dashboard/teacher'); }
    else if (authRole === 'parent') { if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) router.push('/dashboard/parent'); }
    else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) { if (isRoot) router.push('/dashboard'); }
  }, [pathname, authRole, isChecking, isPublicPage, router, isAdminByEmail, user, mustResetPassword, isResetPasswordPage]);

  if (isChecking || (!isAuthorized && !isPublicPage)) {
    return (
      // 🚀 تم تغيير لون الخلفية لـ Slate 900 المريح
      <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]/80 backdrop-blur-md">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
          <div className="absolute inset-0 flex items-center justify-center"><School className="h-6 w-6 text-emerald-400 animate-pulse"/></div>
        </div>
      </div>
    );
  }

  if (platformClosed && !isPublicPage) {
    return (
      // 🚀 تم تغيير لون الخلفية لـ Slate 900
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] p-4 text-center relative overflow-hidden" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_30px_rgba(244,63,94,0.4)] mb-8 border border-white/10">
          <School className="h-12 w-12 text-white" />
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#1e293b]/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/10 max-w-md w-full">
          <div className="flex justify-center mb-6"><div className="bg-amber-500/20 p-4 rounded-full border border-amber-500/30 animate-bounce"><AlertTriangle className="h-10 w-10 text-amber-400" /></div></div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">المنصة مغلقة مؤقتاً</h1>
          <p className="text-slate-300 mb-8 font-bold text-sm bg-[#0f172a]/50 p-4 rounded-2xl border border-white/5">{closeMessage}</p>
          <button onClick={signOut} className="w-full py-4 rounded-[1.5rem] shadow-lg text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all active:scale-95">العودة لتسجيل الدخول</button>
        </motion.div>
      </div>
    );
  }

  if (isPublicPage) { return (<main className="flex-1 h-full flex flex-col overflow-y-auto"><div className="flex-1">{children}</div><Footer /></main>); }

  const showSidebar = !isPublicPage;

  return (
    <div className="flex h-full overflow-hidden bg-transparent selection:bg-emerald-500/30 selection:text-emerald-200" dir="rtl">
      
      <AnimatePresence>
        {isSidebarOpen && showSidebar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#0f172a]/60 lg:hidden backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
        )}
      </AnimatePresence>
      
      {showSidebar && (
        <div className={cn("fixed inset-y-0 right-0 z-50 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] print:hidden shadow-2xl lg:shadow-none", isSidebarCollapsed ? "w-20" : "w-72", isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0", !isSidebarOpen && "lg:translate-x-full lg:w-0", isSidebarOpen && "lg:translate-x-0 lg:static")}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} authRole={authRole || 'student'} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => { setIsSidebarCollapsed(!isSidebarCollapsed); if (window.innerWidth >= 1024) setIsSidebarOpen(false); }} />
        </div>
      )}
      
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full relative bg-transparent">
        <div className="print:hidden sticky top-0 z-30">
          <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} showMenuButton={showSidebar} user={user} authRole={authRole || ''} userName={userName} isSidebarCollapsed={!isSidebarOpen} />
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
