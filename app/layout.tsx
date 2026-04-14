import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { NotificationProvider } from "@/context/notification-context";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";

// 🚀 السلاح النووي لمنع كاش السيرفر (Next.js)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
  manifest: "/manifest.json", 
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable}`} suppressHydrationWarning>
      <head>
        {/* 🚀 المطرقة النووية: لاقتلاع الكاش والتطبيق القديم (PWA) من جذور الهاتف */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // تغيير هذا الرقم سيؤدي لضربة تنظيف جديدة في كل الهواتف
              var finalVersion = 'v_ultimate_clear_101';
              
              if (localStorage.getItem('app_super_version') !== finalVersion) {
                // 1. إيقاف واقتلاع "عامل الخدمة" الذي يحفظ الكود القديم في الجوال
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for(var i=0; i<regs.length; i++) {
                      regs[i].unregister();
                    }
                  });
                }
                
                // 2. مسح مساحة تخزين الكاش العميق (حيث تختبئ الأكواد القديمة)
                if (window.caches) {
                  caches.keys().then(function(names) {
                    for(var j=0; j<names.length; j++) {
                      caches.delete(names[j]);
                    }
                  });
                }

                // 3. مسح الذاكرة المحلية والجلسات بالكامل (لمسح الأصفار والبيانات المعلقة)
                localStorage.clear();
                sessionStorage.clear();
                
                // 4. حفظ الإصدار الجديد لكي لا يعلق في حلقة مفرغة
                localStorage.setItem('app_super_version', finalVersion);
                
                // 5. إعادة التوجيه الإجباري من السيرفر مباشرة (تخطي الكاش)
                window.location.replace('/login?refresh=' + new Date().getTime());
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            <QueryProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </QueryProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
