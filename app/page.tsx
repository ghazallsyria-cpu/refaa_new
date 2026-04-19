'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // The actual routing is handled by app-layout.tsx
  }, [router]);

  return (
    // 🚀 تحديث لون الخلفية لـ Slate 900
    <div className="flex h-screen items-center justify-center bg-[#0f172a]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-slate-400 font-bold animate-pulse">جاري تجهيز المنصة...</p>
      </div>
    </div>
  );
}
