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
  variable: "--font-sans", // حقن الخط كمتغير CSS لاستخدامه في Tailwind
});

// ==========================================
// 🏷️ 2. البيانات الوصفية العامة (Global Metadata)
// تظهر في عنوان التبويبة (Tab) ومحركات البحث (SEO)
// ==========================================
export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
};

// ==========================================
// 📱 3. إعدادات عرض الشاشة (Viewport Configuration)
// ==========================================
export const viewport: Viewport = {
  themeColor: "#02040a", // تغيير لون شريط متصفح الجوال ليطابق لون المنصة
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 🚫 منع التكبير العشوائي (Zoom) عند الضغط على الحقول في أجهزة iOS
  userScalable: false,
  interactiveWidget: 'resizes-visual', // تحسين تفاعل الشاشة عند فتح الكيبورد في الجوال
};

// ==========================================
// 🏗️ 4. المكون الجذري (Root Layout)
// هذا المكون يغلف التطبيق بأكمله، ولن يتم إعادة تحميله عند التنقل بين الصفحات
// ==========================================
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: لمنع تحذيرات عدم التطابق بين السيرفر والمتصفح (بسبب إضافات المتصفح)
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#02040a] text-slate-100 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* ==========================================
            🌌 5. الخلفية الديناميكية (Background Gradients)
            تم استخدام ألوان ثابتة ومموّهة (Blur) بدلاً من الـ Animations الثقيلة
            لضمان أداء سلس وعدم استنزاف بطارية/معالج أجهزة المستخدمين
            ========================================== */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden opacity-50">
          {/* التوهج الذهبي أعلى اليمين */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px]" />
          {/* التوهج النيلي أسفل اليسار */}
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        {/* ==========================================
            🧅 6. شجرة مزودات السياق (Providers Tree)
            الترتيب هنا مقصود وهام جداً:
            1. AuthProvider: يعمل أولاً ليعرف من هو المستخدم وهل هو مسجل دخول.
            2. NotificationProvider: يحتاج معرفة المستخدم ليجلب إشعاراته.
            3. QueryProvider: يغلف التطبيق بأدوات جلب البيانات المتقدمة.
            4. AppLayout: يرسم الواجهة المرئية بناءً على كل ما سبق.
            ========================================== */}
        <AuthProvider>
          <NotificationProvider>
            <QueryProvider>
              <AppLayout>
                {/* 📄 هنا يتم حقن الصفحات الفرعية (مثل /dashboard أو /login) */}
                {children}
              </AppLayout>
            </QueryProvider>
          </NotificationProvider>
        </AuthProvider>
        
      </body>
    </html>
  );
}
