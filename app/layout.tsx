import type { Metadata, Viewport } from "next";
// 🔤 استيراد الخط الرسمي للمنصة (IBM Plex Sans Arabic) لوضوحه العالي في الشاشات الرقمية
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

// 📦 استيراد مزودات السياق (Providers) التي تغلف التطبيق بالكامل
import { QueryProvider } from "@/lib/query-provider"; // لإدارة طلبات البيانات والكاش (React Query)
import { NotificationProvider } from "@/context/notification-context"; // لإدارة الإشعارات اللحظية
import { AuthProvider } from "@/context/auth-context"; // لإدارة جلسات المستخدم وصلاحياته
import { AppLayout } from "@/components/app-layout"; // هيكل الصفحة (الهيدر، الشريط الجانبي)

// ==========================================
// 🎨 1. تهيئة الخط الأساسي (Font Initialization)
// ==========================================
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans", 
});

// ==========================================
// 🏷️ 2. البيانات الوصفية العامة (Global Metadata)
// ==========================================
export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
  manifest: "/manifest.json", // 🚀 ربط هوية التطبيق (PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مدرسة الرفعة",
  }, // 🚀 دعم شاشات الآيفون بشكل مثالي
};

// ==========================================
// 📱 3. إعدادات عرض الشاشة (Viewport Configuration)
// ==========================================
export const viewport: Viewport = {
  themeColor: "#02040a", // تغيير لون شريط متصفح الجوال ليطابق لون المنصة
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 🚫 منع التكبير العشوائي (Zoom)
  userScalable: false,
  interactiveWidget: 'resizes-visual', 
};

// ==========================================
// 🏗️ 4. المكون الجذري (Root Layout)
// ==========================================
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#02040a] text-slate-100 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* ==========================================
            🌌 5. الخلفية الديناميكية (Background Gradients)
            ========================================== */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden opacity-50">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        {/* ==========================================
            🧅 6. شجرة مزودات السياق (Providers Tree)
            🚀 التحديث المعماري: QueryProvider يجب أن يكون الأب الأكبر
            ليسمح للـ Auth و الـ Notifications باستخدام الكاش وجلب البيانات
            ========================================== */}
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppLayout>
                {/* 📄 هنا يتم حقن الصفحات الفرعية */}
                {children}
              </AppLayout>
              
              {/* 🔔 مكان وضع مكون الإشعارات المنبثقة الشامل (Toaster) مستقبلاً */}
              {/* <Toaster position="top-center" /> */}
              
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
        
      </body>
    </html>
  );
}
