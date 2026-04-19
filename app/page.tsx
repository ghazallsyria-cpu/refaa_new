'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { School } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // The actual routing is handled by app-layout.tsx
  }, [router]);

  return (
    // 🚀 خلفية شفافة لتعكس التموجات الذهبية خلفها
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-6 glass-panel p-12 rounded-[3rem]">
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
          <School className="absolute h-8 w-8 text-amber-400 animate-pulse" />
        </div>
        <p className="text-white font-black animate-pulse text-lg tracking-widest drop-shadow-md mt-2">جاري تجهيز المنصة...</p>
      </div>
    </div>
  );
}
