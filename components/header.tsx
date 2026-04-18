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
  onMenuClick, showMenuButton = true, user, authRole, userName, isSidebarCollapsed = false
}: { 
  onMenuClick?: () => void, showMenuButton?: boolean, user?: any, authRole?: string, userName?: string, isSidebarCollapsed?: boolean
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) setSchoolData({ name: data.school_name || 'الرفعة النموذجية', logo_url: data.logo_url || '' });
      } catch (err) { console.error('Error fetching school data:', err); }
    };
    fetchSchoolData();
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/login'); };

  const roleMap: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر' };
  const displayRole = authRole ? (roleMap[authRole] || authRole) : '';

  return (
    // 🚀 الهيدر الزجاجي الداكن
    <header className="flex h-24 shrink-0 items-center justify-between glass-header px-4 sm:px-8 sticky top-0 z-40 transition-all">
      <div className="flex flex-1 items-center gap-4 sm:gap-8">
        
        {onMenuClick && showMenuButton && (
          <button type="button" className="p-2.5 sm:p-3 text-slate-400 hover:text-emerald-400 rounded-xl sm:rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center active:scale-95 border border-transparent hover:border-white/10" onClick={onMenuClick} title="القائمة">
            <Menu className="h-6 w-6" />
          </button>
        )}
        
        {!showMenuButton && (
          <Link href="/" className="flex items-center gap-4 group transition-transform hover:scale-105">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/30 relative overflow-hidden">
              {schoolData.logo_url ? (
                <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5 drop-shadow-lg" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><School className="h-7 w-7 text-[#090b14]" /></div>
              )}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-black text-white tracking-tight leading-none group-hover:text-emerald-400 transition-colors drop-shadow-md">{schoolData.name}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">المنصة الرقمية</span>
            </div>
          </Link>
        )}

        <div className="w-full max-w-xl relative hidden lg:block group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-300" />
          </div>
          <input
            type="search"
            className="block w-full rounded-[1.2rem] py-3.5 pr-12 pl-16 glass-input"
            placeholder="ابحث عن طالب، معلم، أو مادة..."
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black text-slate-400 shadow-sm">
            <span>⌘</span><span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:flex items-center gap-3">
          <NotificationsBell />
        </div>

        <div className="relative">
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 sm:gap-4 p-1.5 sm:pr-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 hover:shadow-lg group active:scale-95">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-black text-white truncate max-w-[150px] group-hover:text-emerald-400 transition-colors">
                {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{displayRole}</span>
            </div>
            <div className="relative">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-2 ring-[#090b14] group-hover:ring-emerald-400 transition-all">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#090b14]" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-400 border-2 border-[#090b14] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </div>
          </button>
          
          <AnimatePresence>
            {isDropdownOpen && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <motion.div 
                  initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute left-0 z-50 mt-3 w-64 origin-top-left rounded-[1.5rem] bg-[#131836]/95 backdrop-blur-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)] border border-white/10"
                >
                  <div className="px-4 py-4 border-b border-white/5 mb-2 bg-[#090b14]/50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">حسابك الحالي</p>
                    <p className="text-sm font-black text-white truncate">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <button onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }} className="flex w-full items-center px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 hover:text-emerald-400 rounded-xl transition-colors font-black group">
                      <User className="ml-3 h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-colors" /> إعدادات الحساب
                    </button>
                    <button onClick={handleSignOut} className="flex w-full items-center px-4 py-3.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors font-black group">
                      <LogOut className="ml-3 h-4 w-4 text-rose-500 group-hover:text-rose-400 transition-colors" /> تسجيل الخروج الآمن
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
