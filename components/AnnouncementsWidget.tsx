'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_role: string | null;
}

interface AnnouncementsWidgetProps {
  authRole: string;
}

// 🚀 نظام كاش مخصص للإعلانات لتخفيف الضغط
const announcementsCache = new Map<string, { data: Announcement[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

// 🚀 استخدام React.memo لمنع إعادة التصيير العشوائي
const AnnouncementsWidget = memo(({ authRole }: AnnouncementsWidgetProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    if (!authRole) return;

    const cacheKey = `announcements_${authRole}`;
    
    // فحص الكاش أولاً
    if (announcementsCache.has(cacheKey)) {
      const cached = announcementsCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        setAnnouncements(cached.data);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
        .or(`target_role.eq.${authRole},target_role.is.null`);

      if (error) throw error;
      
      const result = data || [];
      setAnnouncements(result);
      
      // حفظ في الكاش
      announcementsCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [authRole]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200 p-6 sm:p-8 animate-pulse flex flex-col justify-center items-center h-48">
         <div className="h-10 w-10 bg-indigo-100 rounded-full mb-3"></div>
         <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
      </div>
    );
  }

  if (announcements.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
      <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-inner">
            <Megaphone className="h-5 w-5 text-indigo-600" />
          </div>
          إعلانات المدرسة
        </h2>
      </div>
      <div className="divide-y divide-slate-100 bg-slate-50/30">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="p-6 hover:bg-white transition-colors group">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-base leading-tight mb-1 group-hover:text-indigo-600 transition-colors truncate">{announcement.title}</h3>
                <p className="text-xs font-bold text-slate-400 mb-2">{format(new Date(announcement.created_at), 'EEEE، d MMMM', { locale: arSA })}</p>
                <p className="text-sm font-medium text-slate-600 leading-relaxed line-clamp-2">{announcement.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

AnnouncementsWidget.displayName = 'AnnouncementsWidget';
export default AnnouncementsWidget;
```

#### 2. تحديث جزء بسيط في لوحة المعلم `app/dashboard/teacher/page.tsx`

الآن، سنقوم بتعديل بسيط في لوحة المعلم لمنع تكرار إرسال طلب `auto_record_teacher_presence`.

**ابحث عن هذا الجزء في أعلى ملف `app/dashboard/teacher/page.tsx` (حوالي السطر 45):**
```tsx
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    const autoRecordPresence = async () => {
      if (user?.id && authRole === 'teacher') {
        try {
          await supabase.rpc('auto_record_teacher_presence', { p_user_id: user.id });
        } catch (error) {
          console.error("Error auto-recording presence:", error);
        }
      }
    };

    if (authRole === 'teacher') {
       autoRecordPresence();
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (authRole === 'teacher') {
         autoRecordPresence();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [user, authRole]);
```

**واستبدله بهذا الكود الذكي:**
```tsx
  // 🚀 استخدام useRef لمنع تكرار إرسال الطلب في نفس الدقيقة
  const lastRecordedTime = React.useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    const autoRecordPresence = async () => {
      // نمنع إرسال الطلب إذا لم تمر 50 ثانية على الأقل منذ آخر طلب (لتفادي تكرار Strict Mode)
      const now = Date.now();
      if (now - lastRecordedTime.current < 50000) return;
      
      if (user?.id && authRole === 'teacher') {
        try {
          lastRecordedTime.current = now;
          await supabase.rpc('auto_record_teacher_presence', { p_user_id: user.id });
        } catch (error) {
          console.error("Error auto-recording presence:", error);
        }
      }
    };

    if (authRole === 'teacher' && !isChecking) {
       autoRecordPresence();
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (authRole === 'teacher' && !isChecking) {
         autoRecordPresence();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [user, authRole, isChecking]);
