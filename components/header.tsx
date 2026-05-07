'use client';

import { User, LogOut, Menu, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';
import Link from 'next/link';

export function Header({ 
  onMenuClick,          // 📌 دالة تفتح/تغلق الشريط الجانبي في الجوال
  showMenuButton = true,// 📌 هل يظهر زر القائمة؟ (يختفي في شاشات تسجيل الدخول)
  user,                 // 📌 كائن يحتوي على بيانات المستخدم (ID و Email)
  authRole,             // 📌 دور المستخدم (مدير، معلم، طالب)
  userName,             // 📌 اسم المستخدم المعروض (يأتي من قاعدة البيانات)
  isSidebarCollapsed = false // 📌 هل الشريط الجانبي في حالة الطي (أيقونات فقط)؟
}: { 
  onMenuClick?: () => void, showMenuButton?: boolean, user?: any, authRole?: string, userName?: string, isSidebarCollapsed?: boolean
}) {
  
  // ==========================================
  // 🎛️ 1. حالات مكون الهيدر (States)
  // ==========================================
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // التحكم في ظهور قائمة المستخدم (تسجيل الخروج/الإعدادات)
  const router = useRouter(); 
  
  // بيانات المدرسة (الاسم والشعار) مع حالة ابتدائية (Fallback)
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });
  const [imageError, setImageError] = useState(false); // تستخدم للتحويل للاسم النصي في حال فشل تحميل صورة الشعار

  // ==========================================
  // ⚡ 2. محرك تحميل بيانات المدرسة الذكي (الكاش - LocalStorage)
  // هذا الكود يمنع إرهاق قاعدة البيانات بطلبات متكررة للشعار مع كل انتقال بين الصفحات
  // ==========================================
  useEffect(() => {
    const loadSchoolData = async () => {
      try {
        // أ. البحث في الذاكرة المؤقتة للمتصفح أولاً (للسرعة المطلقة)
        const cachedSettings = localStorage.getItem('school_settings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setSchoolData({ 
            name: parsed.school_name || 'الرفعة النموذجية', 
            logo_url: parsed.logo_url || '' 
          });
          return; // الخروج من الدالة لأن البيانات موجودة مسبقاً
        }

        // ب. إذا كانت الذاكرة فارغة، نطلب البيانات من السيرفر (Supabase)
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').limit(1).maybeSingle();
        if (data) {
          setSchoolData({ name: data.school_name || 'الرفعة النموذجية', logo_url: data.logo_url || '' });
          // حفظ البيانات في الذاكرة لتجنب طلبها في المرة القادمة
          localStorage.setItem('school_settings', JSON.stringify(data));
        }
      } catch (err) { 
        console.error('Error fetching school data:', err); 
      }
    };
    
    loadSchoolData();
  }, []);

  // ==========================================
  // 🚪 3. دالة الخروج الآمن (Security SignOut)
  // ==========================================
  const handleSignOut = async () => { 
    // أ. تسجيل الخروج من جلسة السيرفر
    await supabase.auth.signOut(); 
    
    // ب. تنظيف الذاكرة بشكل كامل (حذف الشعار المحفوظ، والبيانات المخبأة) لضمان الأمان
    sessionStorage.clear();
    localStorage.clear();
    
    // ج. توجيه إجباري وسريع واقتلاع الجلسة من الراوتر (يمنع المستخدم من العودة عبر زر "الخلف")
    window.location.replace('/login');
  };
  
  // ==========================================
  // 🏷️ 4. محول المسميات الوظيفية (Role Mapper)
  // لتحويل الرتبة البرمجية الإنجليزية إلى مسمى عربي لائق
  // ==========================================
  const roleMap: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر' };
  const displayRole = authRole ? (roleMap[authRole] || authRole) : '';

  // تحديد مسار الشعار (إما الشعار المرفوع أو الشعار الافتراضي)
  const finalLogoSrc = schoolData.logo_url || "/images/logo.png";

  return (
    // 🏛️ الحاوية الرئيسية للهيدر (شريط ثابت وشفاف قليلاً Glassmorphism)
    <header className="relative flex h-20 shrink-0 items-center glass-header px-4 sm:px-6 sticky top-0 z-40" dir="rtl">

      {/* ==========================================
          🔘 القسم الأيمن (عند العرض بالعربي يكون يسار الشاشة)
          يحتوي على زر القائمة (همبرغر) + صورة وبيانات المستخدم
          ========================================== */}
      <div className="flex items-center gap-3 z-10">
        
        {/* زر فتح وإغلاق الشريط الجانبي (يظهر أساساً في الجوال) */}
        {onMenuClick && showMenuButton && (
          <button
            type="button"
            className="p-2.5 text-slate-400 hover:text-amber-400 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center active:scale-95 border border-transparent hover:border-amber-500/30"
            onClick={onMenuClick}
            title="القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* بطاقة بيانات المستخدم المصغرة */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-amber-500/30 group active:scale-95"
          >
            {/* أيقونة المستخدم (Avatar Placeholder) */}
            <div className="relative">
              <div className="h-10 w-10 rounded-[0.8rem] bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-white/10 group-hover:ring-amber-300 transition-all">
                <User className="h-5 w-5 text-slate-950" />
              </div>
              {/* النقطة الخضراء التي تدل على أن المستخدم نشط (Online) */}
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-500 border-2 border-[#02040a] rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
            
            {/* اسم المستخدم والمسمى الوظيفي (يختفي في الشاشات الصغيرة جداً) */}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-black text-white truncate max-w-[120px] group-hover:text-amber-400 transition-colors drop-shadow-md">
                {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest">{displayRole}</span>
            </div>
          </button>

          {/* القائمة المنسدلة (Dropdown) التي تظهر عند الضغط على اسم المستخدم */}
          <AnimatePresence>
            {isDropdownOpen && user && (
              <>
                {/* طبقة شفافة للإغلاق عند النقر خارج القائمة */}
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-[1.5rem] bg-[#0f1423]/95 backdrop-blur-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10"
                >
                  <div className="px-4 py-4 border-b border-white/5 mb-2 bg-[#02040a]/60 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">حسابك الحالي</p>
                    <p className="text-sm font-black text-white truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    {/* زر الإعدادات الشخصية */}
                    <button
                      onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}
                      className="flex w-full items-center px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-amber-400 rounded-xl transition-colors font-black group"
                    >
                      <User className="ml-3 h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" /> إعدادات الحساب
                    </button>
                    {/* زر تسجيل الخروج */}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-3.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors font-black group"
                    >
                      <LogOut className="ml-3 h-4 w-4 text-rose-500 group-hover:text-rose-400 transition-colors" /> تسجيل الخروج الآمن
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ==========================================
          🏫 القسم الأوسط: الشعار واسم المدرسة
          استخدمنا (Absolute) لجعله في المنتصف تماماً بغض النظر عن العناصر يميناً ويساراً
          ========================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Link href="/" prefetch={false} className="pointer-events-auto group transition-transform hover:scale-105">
          <div className="relative h-12 w-48 sm:h-14 sm:w-64 md:h-16 md:w-80 flex items-center justify-center">
            {/* في حال وجود صورة يتم عرضها، وفي حال فشل التحميل نعرض النص مع أيقونة */}
            {!imageError ? (
              <img
                src={finalLogoSrc}
                alt={schoolData.name}
                className="max-h-full max-w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                onError={() => setImageError(true)} // إذا كان رابط الصورة مكسوراً، نغير الحالة
              />
            ) : (
              <div className="flex items-center justify-center gap-2 h-full">
                <School className="w-6 h-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <span className="text-lg font-black text-white drop-shadow-md">{schoolData.name}</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ==========================================
          🔔 القسم الأيسر (عند العرض بالعربي يكون يمين الشاشة)
          يحتوي على جرس الإشعارات الخاص بالمستخدم
          ========================================== */}
      <div className="flex items-center gap-3 mr-auto z-10">
        <NotificationsBell />
      </div>

    </header>
  );
}
