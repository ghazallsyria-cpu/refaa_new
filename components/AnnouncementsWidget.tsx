'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Calendar, ArrowRight, BellRing, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
// استدعاء دالة cn (classnames) لدمج الكلاسات برمجياً وبشكل نظيف
import { cn } from '@/lib/utils';

// ==========================================
// 📦 تعريف خصائص المكون (Props)
// ==========================================
// يستقبل المكون خاصية authRole لمعرفة رتبة المستخدم الحالي
// (طالب، معلم، ولي أمر، إدارة) لعرض الإعلانات المخصصة له فقط.
interface AnnouncementsWidgetProps {
  authRole: string; 
}

export default function AnnouncementsWidget({ authRole }: AnnouncementsWidgetProps) {
  // ==========================================
  // 🎛️ حالات المكون (States)
  // ==========================================
  const [announcements, setAnnouncements] = useState<any[]>([]); // لتخزين مصفوفة الإعلانات القادمة من السيرفر
  const [loading, setLoading] = useState(true); // حالة التحميل (لإظهار أيقونة الدوران أثناء الجلب)

  // ==========================================
  // ⚡ محرك جلب البيانات (Data Fetcher)
  // يتم تشغيله مرة واحدة عند تحميل المكون، أو إذا تغيرت رتبة المستخدم
  // ==========================================
  useEffect(() => {
    const fetchWidgetAnnouncements = async () => {
      try {
        setLoading(true);
        
        // 1️⃣ بناء الاستعلام الأساسي (Query)
        // نطلب الـ ID والعنوان والمحتوى وتاريخ الإنشاء والجمهور المستهدف
        // ونرتبها تنازلياً (الأحدث أولاً) ونسحب آخر 4 إعلانات فقط لكي لا نملأ الشاشة.
        let query = supabase
          .from('announcements')
          .select('id, title, content, target_role, created_at')
          .order('created_at', { ascending: false })
          .limit(4);

        // 🛡️ 2️⃣ جدار الرفعة الناري (Role-based Filtering)
        // إذا كان المستخدم ليس من الإدارة (طالب أو معلم أو ولي أمر)
        if (authRole !== 'admin' && authRole !== 'management') {
          // فلترة: اجلب فقط الإعلانات الموجهة للجميع ('all') 
          // أو الموجهة خصيصاً لرتبة هذا المستخدم (مثال: 'student' فقط)
          query = query.in('target_role', [authRole, 'all']);
        }

        // 3️⃣ تنفيذ الاستعلام على قاعدة البيانات
        const { data, error } = await query;
        
        if (error) throw error;
        
        // 4️⃣ تخزين البيانات في الـ State
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements widget:', error);
      } finally {
        // إيقاف أيقونة التحميل بغض النظر عن النتيجة (نجاح أو فشل)
        setLoading(false);
      }
    };

    fetchWidgetAnnouncements();
  }, [authRole]);

  // ==========================================
  // 🎨 الواجهة المرئية للمكون (UI Render)
  // ==========================================
  return (
    // حركة دخول خفيفة للمكون (يصعد للأعلى مع ظهور تدريجي)
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      // تصميم الزجاج المكسور (Glassmorphism) الغامق
      className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden border border-white/5 shadow-2xl bg-[#0f1423]/60 flex flex-col h-full"
      dir="rtl"
    >
      {/* 💡 تأثير الإضاءة الخلفية (توهج أزرق/نيلي في الزاوية العلوية) */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none -ml-10 -mt-10"></div>

      {/* 👑 هيدر المربع (العنوان وزر "عرض الكل") */}
      <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 relative z-10">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-3 drop-shadow-sm">
          {/* أيقونة المكبر الصوتي مع نقطة حمراء تنبض */}
          <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-xl sm:rounded-2xl border border-indigo-500/20 shadow-inner relative">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 drop-shadow-md" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#02040a] animate-pulse"></div>
          </div>
          لوحة الإعلانات
        </h2>
        {/* زر يأخذ المستخدم للصفحة الكاملة للإعلانات */}
        <Link 
          href="/announcements" 
          className="text-[10px] sm:text-xs font-bold text-indigo-400 hover:text-white flex items-center justify-center gap-1 bg-indigo-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-indigo-500/20 transition-colors shadow-sm border border-indigo-500/20 active:scale-95 shrink-0"
        >
          عرض الكل <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 -rotate-180" />
        </Link>
      </div>

      {/* 📜 منطقة عرض المحتوى (الحالات الثلاث: تحميل، يوجد بيانات، فارغ) */}
      <div className="flex-1 flex flex-col bg-transparent relative z-10 p-2 sm:p-3 min-h-[250px]">
        
        {/* ⏳ الحالة الأولى: جاري التحميل */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] sm:text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">جاري جلب التعاميم...</span>
          </div>
        ) 
        
        /* 📝 الحالة الثانية: تم جلب الإعلانات بنجاح */
        : announcements.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {announcements.map((announcement) => (
              <Link 
                key={announcement.id} 
                href="/announcements"
                // كارت الإعلان: يتفاعل عند المرور عليه (Hover)
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-[1.25rem] sm:rounded-[1.5rem] bg-[#02040a]/40 hover:bg-[#02040a]/80 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 shadow-inner active:scale-[0.98]"
              >
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* أيقونة الجرس بجانب كل إعلان */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 group-hover:text-indigo-400 text-slate-500 transition-colors shadow-inner">
                    <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* عنوان الإعلان - truncate تقصه إذا كان طويلاً وتضع ... */}
                    <h3 className="font-black text-sm sm:text-base text-slate-200 group-hover:text-white transition-colors truncate drop-shadow-sm mb-1">
                      {announcement.title}
                    </h3>
                    {/* محتوى الإعلان المصغر - line-clamp-1 يجعله سطراً واحداً فقط */}
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 line-clamp-1 group-hover:text-slate-400 transition-colors">
                      {announcement.content}
                    </p>
                  </div>
                </div>
                
                {/* تاريخ نشر الإعلان (أقصى اليسار) */}
                <div className="shrink-0 flex items-center justify-end sm:flex-col sm:items-end gap-2 border-t border-white/5 pt-3 sm:border-0 sm:pt-0 mt-1 sm:mt-0">
                  <span className="text-[9px] sm:text-[10px] font-black text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 shadow-inner">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 
                    {/* تنسيق التاريخ ليصبح مثل: 5 مارس */}
                    {format(new Date(announcement.created_at), 'd MMM', { locale: arSA })}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                    اضغط للتفاصيل
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) 
        
        /* 📭 الحالة الثالثة: لا توجد إعلانات (مصفوفة فارغة) */
        : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 sm:py-12 bg-[#02040a]/30 rounded-[1.5rem] border border-dashed border-white/5 shadow-inner m-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-3 border border-white/5 shadow-inner">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-slate-600" />
            </div>
            <h3 className="font-black text-slate-300 text-sm sm:text-base drop-shadow-sm mb-1">لا توجد إعلانات جديدة</h3>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 max-w-[200px]">لم يتم نشر أي إعلانات أو تعاميم تخصك في الوقت الحالي.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
