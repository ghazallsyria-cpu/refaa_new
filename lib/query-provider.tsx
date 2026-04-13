
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 🚀 التعديل الأهم: صفر، يعني بمجرد التنقل لصفحة أخرى، اطلب البيانات الجديدة.
            staleTime: 0, 
            
            // 🚀 إجباري: إعادة الطلب بمجرد فتح الصفحة (لكي يرى المعلم التحديثات فوراً).
            refetchOnMount: true, 
            
            // 🚀 تم إغلاقه لإنقاذ السيرفر: يمنع الطلبات العشوائية عند فتح وقفل الموبايل.
            refetchOnWindowFocus: false, 
            
            // المحاولة مرة واحدة عند الفشل
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


