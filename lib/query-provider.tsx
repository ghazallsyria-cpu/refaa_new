
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0, // 🚀 صفر: إجبار جلب البيانات فوراً مع كل تنقل
            refetchOnMount: true, // 🚀 إعادة جلب البيانات عند فتح الصفحة
            refetchOnWindowFocus: true, // 🚀 إعادة الجلب عند العودة للمتصفح (بشكل آمن لأننا أوقفنا قنوات الـ Realtime)
            retry: 1, 
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}


