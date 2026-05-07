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
  // ==========================================
  // 🧭 1. أدوات التوجيه ومعلومات الصفحة الحالية
  // ==========================================
  const pathname = usePathname(); // لمعرفة الرابط الحالي (مثال: /dashboard/student)
  const router = useRouter(); // أداة نقل المستخدم من صفحة لأخرى برمجياً

  // ==========================================
  // 🔐 2. جلب بيانات المستخدم وصلاحياته من "السياق المركزي" (Context)
  // ==========================================
  const { 
    user,             // بيانات المستخدم الأساسية (ID, Email)
    authRole,         // دور المستخدم (مدير، معلم، طالب...)
    userName,         // اسم المستخدم للعرض
    mustResetPassword,// حالة إجبار المستخدم على تغيير كلمة مروره الافتراضية
    isChecking,       // هل النظام لا يزال يفحص بيانات الدخول؟ (حالة التحميل)
    isAdminByEmail,   // هل هذا المستخدم مدير بناءً على بريده الإلكتروني (صلاحية عليا)؟
    platformClosed,   // هل المنصة مغلقة حالياً للصيانة أو انتهاء الدوام؟
    closeMessage,     // الرسالة التي تظهر عند إغلاق المنصة
    signOut           // دالة تسجيل الخروج
  } = useAuth() as any;
  
  // ==========================================
  // 📱 3. حالات التحكم في الواجهة (الشريط الجانبي)
  // ==========================================
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // هل الشريط مفتوح في الجوال؟
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // هل الشريط مصغر (أيقونات فقط) في الشاشات الكبيرة؟
  
  // ==========================================
  // 🌍 4. الصفحات العامة (التي لا تحتاج تسجيل دخول)
  // ==========================================
  const isLoginPage = pathname === '/login';
  const isResetPasswordPage = pathname === '/reset-password';
  const isLivePage = pathname === '/live'; // شاشة العرض المباشرة في ساحة المدرسة
  // إذا كانت إحدى هذه الصفحات، نعتبرها "صفحة عامة"
  const isPublicPage = isLoginPage || isResetPasswordPage || isLivePage;

  // ==========================================
  // 🛠️ 5. صائد الأخطاء الشامل (Global Error Handler)
  // يمنع الشاشة البيضاء ويطبع الأخطاء في الكونسول بهدوء
  // ==========================================
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
  // 👮 6. جدار الحماية (Authorization Guard)
  // هذه الدالة تقرر: هل يحق لهذا المستخدم رؤية هذه الصفحة؟
  // ==========================================
  const getAuthorization = () => {
    if (isChecking || isPublicPage || !user || !authRole) return true; // تخطي الفحص للروابط العامة
    if (mustResetPassword && !isResetPasswordPage) return false; // منع الدخول إذا كان يجب تغيير الباسورد
    
    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    // منع الطالب من دخول لوحات الإدارة أو المعلمين
    if (authRole === 'student') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) return false; 
    }
    // منع المعلم من دخول لوحة الإدارة
    else if (authRole === 'teacher') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) return false; 
    }
    // منع ولي الأمر من دخول لوحة الطلاب
    else if (authRole === 'parent') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) return false; 
    }
    // الإدارة تُمنع من الصفحة الجذرية وتوجه للوحة التحكم مباشرة
    else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) { 
      if (isRoot) return false; 
    }
    
    return true; // إذا اجتاز كل الشروط السابقة، يُسمح له بالدخول
  };

  const isAuthorized = getAuthorization();

  // ==========================================
  // 🚀 7. التوجيه الإجباري (Auto-Redirect)
  // إذا كان غير مصرح له، إلى أين نرسله؟
  // ==========================================
  useEffect(() => {
    if (isChecking || isPublicPage || !user) return;
    
    // إجباره على صفحة تغيير كلمة المرور
    if (mustResetPassword && !isResetPasswordPage) { router.push('/reset-password'); return; }
    if (!authRole) return;
    
    const isRoot = pathname === '/';
    const isDashboardRoute = pathname.startsWith('/dashboard');

    // توجيه كل رتبة للوحة القيادة (Dashboard) الخاصة بها
    if (authRole === 'student') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/student'))) router.push('/dashboard/student'); 
    }
    else if (authRole === 'teacher') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/teacher'))) router.push('/dashboard/teacher'); 
    }
    else if (authRole === 'parent') { 
      if (isRoot || (isDashboardRoute && !pathname.startsWith('/dashboard/parent'))) router.push('/dashboard/parent'); 
    }
    else if (authRole === 'admin' || authRole === 'management' || isAdminByEmail) { 
      if (isRoot) router.push('/dashboard'); 
    }
  }, [pathname, authRole, isChecking, isPublicPage, router, isAdminByEmail, user, mustResetPassword, isResetPasswordPage]);

  // ==========================================
  // ⏳ 8. شاشة التحميل (أثناء فحص الصلاحيات)
  // ==========================================
  if (isChecking || (!isAuthorized && !isPublicPage)) {
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
  // 🛑 9. شاشة إغلاق المنصة (عندما يوقف المدير النظام)
  // ==========================================
  if (platformClosed && !isPublicPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 text-center relative overflow-hidden" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-rose-600 to-red-900 shadow-[0_0_40px_rgba(225,29,72,0.5)] mb-8 border border-rose-500/30 relative z-10">
          <School className="h-12 w-12 text-white" />
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel p-10 rounded-[2.5rem] max-w-md w-full relative z-10">
          <div className="flex justify-center mb-6"><div className="bg-amber-500/10 p-4 rounded-full border border-amber-500/20 animate-bounce"><AlertTriangle className="h-10 w-10 text-amber-500" /></div></div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight drop-shadow-md">المنصة مغلقة مؤقتاً</h1>
          <p className="text-slate-300 mb-8 font-bold text-sm bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">{closeMessage}</p>
          <button onClick={signOut} className="w-full py-4 rounded-[1.5rem] shadow-[0_0_20px_rgba(245,158,11,0.3)] text-sm font-black text-slate-950 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 transition-all active:scale-95 border border-amber-300/50">العودة لتسجيل الدخول</button>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // 🔓 10. تخطيط الصفحات العامة (بدون هيدر وسايد بار)
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
  // 🏗️ 11. الهيكل الرئيسي للتطبيق (الهيدر، السايد بار، المحتوى)
  // ==========================================
  return (
    <div className="flex h-full overflow-hidden bg-transparent selection:bg-amber-500/30 selection:text-amber-200" dir="rtl">
      
      {/* 📱 خلفية معتمة للجوال عند فتح الشريط الجانبي */}
      <AnimatePresence>
        {isSidebarOpen && showSidebar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-[#02040a]/80 lg:hidden backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
        )}
      </AnimatePresence>
      
      {/* 🧩 الشريط الجانبي (Sidebar) */}
      {showSidebar && (
        <div className={cn("fixed inset-y-0 right-0 z-50 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] print:hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] lg:shadow-none", isSidebarCollapsed ? "w-20" : "w-72", isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0", !isSidebarOpen && "lg:translate-x-full lg:w-0", isSidebarOpen && "lg:translate-x-0 lg:static")}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} authRole={authRole || 'student'} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => { setIsSidebarCollapsed(!isSidebarCollapsed); if (window.innerWidth >= 1024) setIsSidebarOpen(false); }} />
        </div>
      )}
      
      {/* 📄 منطقة المحتوى الرئيسي (Main Content Area) */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible w-full relative bg-transparent">
        
        {/* 🔝 الهيدر العلوي */}
        <div className="print:hidden sticky top-0 z-30">
          <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} showMenuButton={showSidebar} user={user} authRole={authRole || ''} userName={userName} isSidebarCollapsed={!isSidebarOpen} />
        </div>
        
        {/* 🖼️ المحتوى الفعلي للصفحة المعروضة */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible flex flex-col scroll-smooth">
          <div className="flex-1 max-w-[1600px] mx-auto w-full">
            {children} {/* 👈 هنا يتم حقن الصفحات (مثل /dashboard أو /students) */}
          </div>
          <Footer />
        </main>
      </div>
      
    </div>
  );
}
