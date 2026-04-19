import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { NotificationProvider } from "@/context/notification-context";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
};

export const viewport: Viewport = {
  themeColor: "#02040a", // أسود ليلي فخم
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                      regs.forEach(function (reg) { reg.unregister(); });
                    });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased bg-[#02040a] text-slate-100 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* 🚀 السحر يبدأ هنا: تموجات الذهب اللامع والأبيض الفضي على خلفية سوداء */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden">
          {/* نور ذهبي ساطع جداً في الأعلى */}
          <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] bg-amber-500/20 rounded-full blur-[150px] animate-blob mix-blend-screen" />
          
          {/* نور أزرق ملكي عميق في الأسفل لكسر الملل */}
          <div className="absolute bottom-[-15%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/15 rounded-full blur-[150px] animate-blob animation-delay-2000 mix-blend-screen" />
          
          {/* نور أبيض/فضي مضيء يتحرك في المنتصف */}
          <div className="absolute top-[30%] left-[20%] w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-screen" />
        </div>

        <AuthProvider>
          <NotificationProvider>
            <QueryProvider>
              <AppLayout>{children}</AppLayout>
            </QueryProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
