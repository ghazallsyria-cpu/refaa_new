'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function UltimateClearPage() {
  useEffect(() => {
    const totalDestruction = async () => {
      // 1. تسجيل خروج رسمي من Supabase (يمسح الجلسة من السيرفر)
      await supabase.auth.signOut();

      // 2. مسح الذاكرة المحلية والجلسات
      localStorage.clear();
      sessionStorage.clear();

      // 3. 🚀 الضربة القاضية: تدمير قواعد بيانات IndexedDB
      if (window.indexedDB) {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      }

      // 4. توجيه لصفحة الدخول برابط يكسر الكاش
      window.location.replace('/login?nuke=' + Date.now());
    };
    totalDestruction();
  }, []);

  return <div className="p-20 text-center font-bold">جاري تنظيف الهوية العالقة... انتظر ثانية</div>;
}
