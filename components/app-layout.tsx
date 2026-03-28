'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { School, AlertTriangle } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    user, 
    userRole, 
    userName, 
    mustResetPassword,
    isChecking, 
    isAdminByEmail, 
    platformClosed, 
    closeMessage,
    signOut
  } = useAuth();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isLivePage = pathname === '/live';
  const isPublicPage = isLoginPage || isResetPasswordPage || isLivePage;

  // إدارة الوصول الآمن (Authorization)
  const getAuthorization = () => {
    if (isChecking || isPublicPage || !user || !userRole) return true;
    if (mustResetPassword && !isResetPasswordPage) return false;

    const isDashboardRoute = pathname.startsWith('/dashboard');

    if (userRole === 'student') {
      if (pathname === '/' || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) return false;
    } else if (userRole === 'teacher') {
      if (pathname === '/' || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) return false;
    } else if (userRole === 'parent') {
      if (pathname === '/' || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) return false;
    } else if (userRole === 'admin' || userRole === 'management' || isAdminByEmail) {
      if (pathname === '/') return false;
    }
    return true;
  };

  const isAuthorized = getAuthorization();

  useEffect(() => {
    if (isChecking || isPublicPage || !user) return;
    if (mustResetPassword && !isResetPasswordPage) {
      router.push('/reset-password');
      return;
    }

    if (!userRole) return;

    // توجيه ذكي بناءً على الرتبة عند الدخول للجذر
    if (pathname === '/') {
      if (userRole === 'student') router.push('/dashboard/student');
      else if (userRole === 'teacher') router.push('/dashboard/teacher');
      else if (userRole === 'parent') router.push('/dashboard/parent');
      else router.push('/dashboard');
    }
  }, [pathname, userRole, isChecking, isPublicPage, router, user, mustResetPassword, isResetPasswordPage]);

  if (isChecking || (!isAuthorized && !isPublicPage)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (platformClosed && !isPublicPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center" dir="rtl">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl mb-8">
          <School className="h-12 w-12 text-white" />
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-slate-200 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">المنصة مغلقة</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">{closeMessage}</p>
          <button onClick={signOut} className="w-full py-3 px-4 rounded-xl text-white bg-indigo-600 font-medium">العودة لتسجيل الدخول</button>
        </div>
      </div>
    );
  }

  const showSidebar = !isPublicPage;

  return (
    <div className="flex h-full overflow-hidden bg-slate-50" dir="rtl">
      {isSidebarOpen && showSidebar && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      {showSidebar && (
        <div className={cn(
          "fixed inset-y-0 right-0 z-50 transform transition-all duration-500 ease-in-out print:hidden",
          isSidebarCollapsed ? "w-20" : "w-72",
          isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          !isSidebarOpen && "lg:translate-x-full lg:w-0",
          isSidebarOpen && "lg:translate-x-0 lg:static"
        )}>
          <Sidebar 
            onClose={() => setIsSidebarOpen(false)} 
            userRole={userRole || 'student'} 
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => {
              setIsSidebarCollapsed(!isSidebarCollapsed);
              if (window.innerWidth >= 1024) setIsSidebarOpen(false);
            }}
          />
        </div>
      )}
      
      <div className="flex flex-1 flex-col overflow-hidden w-full relative">
        <div className="print:hidden sticky top-0 z-30">
          <Header 
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            showMenuButton={showSidebar} 
            user={user} 
            userRole={userRole || ''} 
            userName={userName} 
            isSidebarCollapsed={!isSidebarOpen}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 flex flex-col scroll-smooth">
          <div className="flex-1 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

