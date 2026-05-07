'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { School } from 'lucide-react';

// ==========================================
// 🚪 الصفحة الجذرية للمنصة (Root Page - "/")
// تعمل هذه الصفحة كـ "شاشة انتظار انتقالية" (Transitional Loading Screen)
// ==========================================
export default function Home() {
  const router = useRouter();

  // ==========================================
  // 🔄 معالج التوجيه (Routing Handler)
  // ==========================================
  useEffect(() => {
    // 💡 ملاحظة هندسية:
    // لم نكتب هنا أي كود للتوجيه (Redirect) لأننا أوكلنا هذه المهمة بالكامل
    // لملف (app-layout.tsx) الذي يملك صلاحية الوصول لبيانات المستخدم (Auth Context).
    // الـ AppLayout سيقرأ دور المستخدم فوراً ويوجهه (مثلاً: /dashboard/student أو /dashboard).
  }, [router]);

  // ==========================================
  // 🎨 واجهة المستخدم (UI Render) - شاشة تحميل سينمائية
  // ==========================================
  return (
    // 🌌 خلفية شفافة بالكامل لتسمح بظهور التموجات الذهبية والداكنة من الـ (Root Layout)
    <div className="flex h-screen items-center justify-center bg-transparent">
      
      {/* 📦 بطاقة زجاجية فخمة تحتضن أيقونة التحميل */}
      <div className="flex flex-col items-center gap-6 glass-panel p-12 rounded-[3rem]">
        
        {/* ⚙️ مركز التحميل (القرص الدوار + الأيقونة النابضة) */}
        <div className="relative flex items-center justify-center">
          {/* حلقة ذهبية تدور بسرعة مستمرة (Spin) */}
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
          {/* أيقونة المدرسة تنبض بنعومة في المنتصف (Pulse) */}
          <School className="absolute h-8 w-8 text-amber-400 animate-pulse" />
        </div>
        
        {/* 📝 رسالة طمأنة للمستخدم أثناء الانتظار */}
        <p className="text-white font-black animate-pulse text-lg tracking-widest drop-shadow-md mt-2">
          جاري تجهيز المنصة...
        </p>
        
      </div>
    </div>
  );
}
