'use client';

import { Search, User, LogOut, Menu, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';

import Link from 'next/link';
import Image from 'next/image';

export function Header({ 
  onMenuClick, 
  showMenuButton = true,
  user,
  authRole,
  userName,
  isSidebarCollapsed = false
}: { 
  onMenuClick?: () => void, 
  showMenuButton?: boolean,
  user?: any,
  authRole?: string,
  userName?: string,
  isSidebarCollapsed?: boolean
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  // 🚀 جلب بيانات وشعار المدرسة من القاعدة
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) {
          setSchoolData({
            name: data.school_name || 'الرفعة النموذجية',
            logo_url: data.logo_url || ''
          });
        }
      } catch (err) {
        console.error('Error fetching school data:', err);
      }
    };
    fetchSchoolData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const roleMap: Record<string, string> = {
    'admin': 'المدير العام',
    'management': 'الإدارة',
    'teacher': 'معلم',
    'student': 'طالب',
    'parent': 'ولي أمر'
  };
  
  const displayRole = authRole ? (roleMap[authRole] || authRole) : '';

  return (
    <header className="flex h-24 shrink-0 items-center justify-between bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 px-4 sm:px-8 sticky top-0 z-40 transition-all">
      <div className="flex flex-1 items-center gap-4 sm:gap-8">
        
        {onMenuClick && showMenuButton && (
          <button
            type="button"
            className="p-2.5 sm:p-3 text-slate-500 hover:text-indigo-600 rounded-xl sm:rounded-2xl hover:bg-indigo-50/80 transition-all flex items-center justify-center active:scale-95 border border-transparent hover:border-indigo-100"
            onClick={onMenuClick}
            title="القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        
        {!showMenuButton && (
          <Link href="/" className="flex items-center gap-4 group transition-transform hover:scale-105">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-[0_8px_16px_rgba(99,102,241,0.2)] ring-2 ring-indigo-100 relative overflow-hidden">
              {schoolData.logo_url ? (
                <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><School className="h-7 w-7 text-white" /></div>
              )}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{schoolData.name}</span>
              <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-[0.2em] mt-1.5">المنصة الرقمية</span>
            </div>
          </Link>
        )}

        <div className="w-full max-w-xl relative hidden lg:block group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
          </div>
          <input
            type="search"
            className="block w-full rounded-[1.2rem] border-0 py-3.5 pr-12 pl-16 text-slate-900 bg-slate-100/50 backdrop-blur-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm font-bold transition-all duration-300 hover:bg-slate-100 focus:bg-white shadow-inner"
            placeholder="ابحث عن طالب، معلم، أو مادة..."
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-[10px] font-black text-slate-400 shadow-sm">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:flex items-center gap-3">
          <NotificationsBell />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 sm:gap-4 p-1.5 sm:pr-4 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-slate-200/80 hover:shadow-sm group active:scale-95"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-black text-slate-900 truncate max-w-[150px] group-hover:text-indigo-600 transition-colors">
                {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
              </span>
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">{displayRole}</span>
            </div>
            <div className="relative">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white group-hover:ring-indigo-100 transition-all">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
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
                  className="absolute left-0 z-50 mt-3 w-64 origin-top-left rounded-[1.5rem] bg-white/90 backdrop-blur-xl p-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/60"
                >
                  <div className="px-4 py-4 border-b border-slate-100 mb-2 bg-slate-50/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">حسابك الحالي</p>
                    <p className="text-sm font-black text-indigo-900 truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}
                      className="flex w-full items-center px-4 py-3.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors font-black group"
                    >
                      <User className="ml-3 h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      إعدادات الحساب
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-3.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-black group"
                    >
                      <LogOut className="ml-3 h-4 w-4 text-rose-400 group-hover:text-rose-600 transition-colors" />
                      تسجيل الخروج الآمن
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
