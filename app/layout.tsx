import type { Metadata, Viewport } from "next";
// 🚀 الخط الجديد لستايل جيمناي: عصري، نظيف، ومستقبلي
import { Readex_Pro } from "next/font/google";
import "./globals.css";

import { QueryProvider } from "@/lib/query-provider"; 
import { NotificationProvider } from "@/context/notification-context"; 
import { AuthProvider } from "@/context/auth-context"; 
import { AppLayout } from "@/components/app-layout"; 
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// ==========================================
// 🎨 1. تهيئة خط ستايل جيمناي
// ==========================================
const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans", 
});

// ==========================================
// 🏷️ 2. البيانات الوصفية
// ==========================================
export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "الحرم الرقمي الفضائي لمدرسة الرفعة",
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // 🚀 شريط آبل زجاجي وشفاف
    title: "مدرسة الرفعة",
  }, 
};

export const viewport: Viewport = {
  themeColor: "#02040a", 
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, 
  userScalable: false,
  interactiveWidget: 'resizes-visual', 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={readexPro.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#02040a] text-slate-100 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* ==========================================
            🌌 5. واجهة جيمناي الحية (Alive UI Background)
            أجرام سماوية تتحرك ببطء وتندمج ألوانها
            ========================================== */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden">
          {/* الجرم النيلي (القيادة) */}
          <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-indigo-600/10 rounded-full blur-[100px] animate-nebula mix-blend-screen" />
          
          {/* الجرم البنفسجي (الذكاء) */}
          <div className="absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] bg-violet-600/10 rounded-full blur-[120px] animate-nebula animation-delay-2000 mix-blend-screen" />
          
          {/* الجرم الزمردي (النمو) */}
          <div className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] bg-emerald-600/5 rounded-full blur-[130px] animate-nebula animation-delay-4000 mix-blend-screen" />
        </div>

        {/* ==========================================
            🧅 6. شجرة مزودات السياق
            ========================================== */}
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppLayout>
                {children}
              </AppLayout>
              
              <PWAInstallPrompt />
              
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
        
      </body>
    </html>
  );
}
