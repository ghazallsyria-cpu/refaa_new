'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // The actual routing is handled by app-layout.tsx
    // This page is just a fallback while routing happens
  }, [router]);

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-slate-500 font-medium animate-pulse">جاري توجيهك...</p>
      </div>
    </div>
  );
}
