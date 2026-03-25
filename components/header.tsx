'use client';

import { Search, User, LogOut, Menu, School } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';
import Link from 'next/link';

export function Header({ onMenuClick, showMenuButton = true }: { onMenuClick?: () => void, showMenuButton?: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [rawUserRole, setRawUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch user role and name
        const { data: userData } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();
          
        if (userData) {
          setUserName(userData.full_name || session.user.email?.split('@')[0] || '');
          setRawUserRole(userData.role);
          
          // Map role to Arabic display name
          const roleMap: Record<string, string> = {
            'admin': 'المدير العام',
            'management': 'الإدارة',
            'teacher': 'معلم',
            'student': 'طالب',
            'parent': 'ولي أمر'
          };
          
          setUserRole(roleMap[userData.role] || userData.role);
        }
      } else {
        setUser(null);
        setUserRole('');
        setRawUserRole('');
        setUserName('');
      }
    };

    fetchUserAndRole();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserAndRole();
      } else {
        setUser(null);
        setUserRole('');
        setUserName('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="flex h-24 shrink-0 items-center justify-between bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-8 sticky top-0 z-30">
      <div className="flex flex-1 items-center gap-8">
        {onMenuClick && showMenuButton && (
          <button
            type="button"
            className="lg:hidden p-3 text-slate-500 hover:text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all"
            onClick={onMenuClick}
          >
            <span className="sr-only">فتح القائمة</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        
        {!showMenuButton && (
          <Link href="/" className="flex items-center gap-4 group transition-transform hover:scale-105">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 ring-1 ring-slate-200/50">
              <School className="h-7 w-7 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">مدرسة الرفعة</span>
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-[0.2em] mt-1">المنصة الرقمية</span>
            </div>
          </Link>
        )}

        <div className="w-full max-w-xl relative hidden md:block group">
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" aria-hidden="true" />
          </div>
          <input
            type="search"
            name="search"
            id="search"
            className="block w-full rounded-2xl border-0 py-3.5 pr-12 text-slate-900 bg-slate-100/50 ring-1 ring-inset ring-slate-200/60 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm transition-all hover:bg-slate-100"
            placeholder="ابحث عن طالب، معلم، أو مادة..."
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-bold text-slate-400">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden sm:block">
            <NotificationsBell />
          </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-4 p-1.5 pr-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200/60 group"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-slate-900 truncate max-w-[150px] group-hover:text-indigo-600 transition-colors">
                {userName || (user ? user.email.split('@')[0] : 'تسجيل الدخول')}
              </span>
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{userRole || 'مستخدم'}</span>
            </div>
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/20 ring-2 ring-white">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
          </button>
          
          {isDropdownOpen && user && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute left-0 z-10 mt-4 w-64 origin-top-left rounded-3xl bg-white p-3 shadow-2xl ring-1 ring-slate-200 focus:outline-none"
            >
              <div className="px-4 py-4 border-b border-slate-100 mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">تم تسجيل الدخول كـ</p>
                <p className="text-sm font-black text-slate-900 truncate">{user.email}</p>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => router.push('/settings')}
                  className="flex w-full items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors font-bold"
                >
                  <User className="ml-3 h-4 w-4 text-slate-400" />
                  الملف الشخصي
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-2xl transition-colors font-bold"
                >
                  <LogOut className="ml-3 h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
