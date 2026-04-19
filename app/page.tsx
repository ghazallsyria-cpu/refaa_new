'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // The actual routing is handled by app-layout.tsx
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-6 glass-panel p-12 rounded-[3rem]">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
        <p className="text-slate-800 font-black animate-pulse text-lg tracking-widest">جاري تجهيز المنصة...</p>
      </div>
    </div>
  );
}
