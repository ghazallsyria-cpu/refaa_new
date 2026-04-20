'use client';

import { User, LogOut, Menu, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';
import Link from 'next/link';

export function Header({ 
  onMenuClick, showMenuButton = true, user, authRole, userName, isSidebarCollapsed = false
}: { 
  onMenuClick?: () => void, showMenuButton?: boolean, user?: any, authRole?: string, userName?: string, isSidebarCollapsed?: boolean
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').maybeSingle();
        if (data) setSchoolData({ name: data.school_name || 'الرفعة النموذجية', logo_url: data.logo_url || '' });
      } catch (err) { console.error('Error fetching school data:', err); }
    };
    fetchSchoolData();
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const roleMap: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر' };
  const displayRole = authRole ? (roleMap[authRole] || authRole) : '';

  // 🚀 تحديد مسار الشعار (من الإعدادات أو الافتراضي)
  const finalLogoSrc = schoolData.logo_url || "/images/logo.png";

  return (
    <header className="relative flex h-20 shrink-0 items-center glass-header px-4 sm:px-6 sticky top-0 z-40" dir="rtl">

      {/* يسار: زر القائمة + معلومات المستخدم */}
      <div className="flex items-center gap-3 z-10">
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

        {/* معلومات المستخدم */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-amber-500/30 group active:scale-95"
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-[0.8rem] bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-white/10 group-hover:ring-amber-300 transition-all">
                <User className="h-5 w-5 text-slate-950" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-500 border-2 border-[#02040a] rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-black text-white truncate max-w-[120px] group-hover:text-amber-400 transition-colors drop-shadow-md">
                {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest">{displayRole}</span>
            </div>
          </button>

          <AnimatePresence>
            {isDropdownOpen && user && (
              <>
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
                    <button
                      onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}
                      className="flex w-full items-center px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-amber-400 rounded-xl transition-colors font-black group"
                    >
                      <User className="ml-3 h-4 w-4 text-slate-500 group-hover:text-amber-400 transition-colors" /> إعدادات الحساب
                    </button>
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

      {/* الوسط: الشعار مركزي مطلق */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* 🚀 إضافة prefetch={false} للوقاية القصوى */}
        <Link href="/" prefetch={false} className="pointer-events-auto group transition-transform hover:scale-105">
          <div className="relative h-12 w-48 sm:h-14 sm:w-64 md:h-16 md:w-80 flex items-center justify-center">
            {!imageError ? (
              /* 🚀 استخدام img العادي لتفادي أخطاء 400 من Next.js مع الروابط الخارجية */
              <img
                src={finalLogoSrc}
                alt={schoolData.name}
                className="max-h-full max-w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                onError={() => setImageError(true)}
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

      {/* اليمين: الإشعارات */}
      <div className="flex items-center gap-3 mr-auto z-10">
        <NotificationsBell />
      </div>

    </header>
  );
}
