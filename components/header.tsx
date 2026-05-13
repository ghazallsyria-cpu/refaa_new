'use client';

import { User, LogOut, Menu, School, Settings, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/notifications-bell';
import Link from 'next/link';

export function Header({ 
  onMenuClick,          
  showMenuButton = true,
  user,                 
  authRole,             
  userName,             
  isSidebarCollapsed = false 
}: { 
  onMenuClick?: () => void, showMenuButton?: boolean, user?: any, authRole?: string, userName?: string, isSidebarCollapsed?: boolean
}) {
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const router = useRouter(); 
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });
  const [imageError, setImageError] = useState(false); 

  useEffect(() => {
    const loadSchoolData = async () => {
      try {
        const cachedSettings = localStorage.getItem('school_settings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setSchoolData({ 
            name: parsed.school_name || 'الرفعة النموذجية', 
            logo_url: parsed.logo_url || '' 
          });
          return; 
        }

        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').limit(1).maybeSingle();
        if (data) {
          setSchoolData({ name: data.school_name || 'الرفعة النموذجية', logo_url: data.logo_url || '' });
          localStorage.setItem('school_settings', JSON.stringify(data));
        }
      } catch (err) { 
        console.error('Error fetching school data:', err); 
      }
    };
    
    loadSchoolData();
  }, []);

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    sessionStorage.clear();
    localStorage.clear();
    window.location.replace('/login');
  };
  
  const roleMap: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر' };
  const displayRole = authRole ? (roleMap[authRole] || authRole) : '';

  const getThemeColors = (role: string | undefined) => {
    switch (role) {
      case 'admin':
      case 'management':
        return { text: 'text-purple-400', bg: 'from-purple-600 to-indigo-600', ring: 'ring-purple-500/50', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]', hover: 'hover:border-purple-500/40' };
      case 'teacher':
        return { text: 'text-emerald-400', bg: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-500/50', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]', hover: 'hover:border-emerald-500/40' };
      case 'student':
        return { text: 'text-blue-400', bg: 'from-blue-500 to-cyan-500', ring: 'ring-blue-500/50', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', hover: 'hover:border-blue-500/40' };
      default:
        return { text: 'text-amber-400', bg: 'from-amber-500 to-yellow-500', ring: 'ring-amber-500/50', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]', hover: 'hover:border-amber-500/40' };
    }
  };

  const theme = getThemeColors(authRole);
  const finalLogoSrc = schoolData.logo_url || "/images/logo.png";

  return (
    <header className="relative w-full h-[100px] sm:h-[110px] shrink-0 border-b border-indigo-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 z-40 sticky top-0 [&_.notification-dropdown]:max-w-[calc(100vw-2rem)] [&_.notification-dropdown]:left-0 [&_.notification-dropdown]:right-auto" dir="rtl">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-20">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
          alt="Header Background" 
          className="absolute inset-0 w-full h-full object-cover object-center opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02040a]/70 to-[#02040a]/95 backdrop-blur-[6px]"></div>
        <div className="absolute top-[-50%] left-[-10%] w-[30vw] h-[30vw] min-w-[200px] min-h-[200px] bg-indigo-500/20 rounded-full blur-[80px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-50%] right-[-10%] w-[20vw] h-[20vw] min-w-[150px] min-h-[150px] bg-blue-500/20 rounded-full blur-[60px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
      </div>

      <div className="max-w-[1600px] w-full h-full mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center justify-between">
        
        <div className="flex items-center gap-3 sm:gap-4 z-20 w-1/3 relative">
          {onMenuClick && showMenuButton && (
            <button
              type="button"
              className="p-2.5 sm:p-3 text-slate-200 hover:text-white rounded-[1rem] sm:rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center active:scale-95 border border-white/10 shadow-inner backdrop-blur-md shrink-0"
              onClick={onMenuClick}
              title="القائمة"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md" />
            </button>
          )}
          
          {/* 🚀 إجبار الإشعارات على عدم تجاوز الشاشة */}
          <div className="p-1 sm:p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-inner backdrop-blur-md relative shrink-0">
            <NotificationsBell />
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-1/3 flex justify-center">
          <Link href="/" prefetch={false} className="pointer-events-auto group inline-block">
            <div className="relative h-14 sm:h-16 w-auto max-w-[160px] sm:max-w-[220px] flex items-center justify-center">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 group-hover:blur-2xl transition-all duration-700 pointer-events-none"></div>
              
              {!imageError ? (
                <img
                  src={finalLogoSrc}
                  alt={schoolData.name}
                  className="max-h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] group-hover:scale-105 group-hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all duration-500 relative z-10"
                  onError={() => setImageError(true)} 
                />
              ) : (
                <div className="flex items-center justify-center gap-2 sm:gap-3 h-full bg-[#0f1423]/90 px-4 sm:px-6 py-2 rounded-2xl border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl group-hover:bg-[#131836] transition-colors relative z-10">
                  <School className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                  <span className="text-sm sm:text-lg lg:text-xl font-black text-white drop-shadow-lg tracking-tight truncate max-w-[100px] sm:max-w-[200px]">{schoolData.name}</span>
                </div>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-end z-20 w-1/3 relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-3 p-1.5 sm:p-2 rounded-full sm:rounded-[2rem] bg-white/10 hover:bg-white/20 transition-all border border-white/20 ${theme.hover} group active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-xl pr-2 sm:pr-4`}
          >
            <div className="hidden lg:flex flex-col items-end justify-center text-left">
              <span className="text-sm font-black text-white truncate max-w-[150px] group-hover:text-indigo-100 transition-colors drop-shadow-md">
                {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
              </span>
              <span className={`text-[10px] ${theme.text} font-bold tracking-widest drop-shadow-sm`}>{displayRole}</span>
            </div>

            <div className="relative shrink-0">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] sm:rounded-[1.2rem] bg-gradient-to-br ${theme.bg} flex items-center justify-center ${theme.glow} ring-2 ${theme.ring} group-hover:scale-110 transition-transform duration-300 overflow-hidden shadow-inner`}>
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#02040a] drop-shadow-md" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-[3px] border-[#02040a] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            </div>
          </button>

          <AnimatePresence>
            {isDropdownOpen && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95, rotateX: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute left-0 sm:left-auto sm:right-0 top-[110%] z-50 w-[calc(100vw-2rem)] max-w-72 sm:w-72 origin-top sm:origin-top-right rounded-[2rem] bg-[#02040a]/95 backdrop-blur-3xl p-3 shadow-[0_30px_60px_rgba(0,0,0,0.9)] border border-indigo-500/30 flex flex-col gap-2 overflow-hidden"
                  style={{ perspective: "1000px" }}
                >
                  <div className={`absolute top-0 left-0 w-32 h-32 ${theme.bg.split(' ')[0].replace('from-', 'bg-')}/30 blur-[50px] rounded-full pointer-events-none mix-blend-screen`}></div>
                  
                  <div className="px-5 py-5 border-b border-white/5 bg-white/5 rounded-2xl shadow-inner relative z-10 flex items-center gap-3">
                    <div className="p-2 bg-[#02040a] rounded-xl border border-white/10 shrink-0"><Sparkles className={`w-5 h-5 ${theme.text}`} /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">الحساب النشط</p>
                      <p className="text-xs font-black text-white truncate drop-shadow-sm" dir="ltr">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 relative z-10">
                    <button
                      onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}
                      className="flex w-full items-center px-5 py-4 text-sm text-slate-300 hover:bg-white/10 hover:text-white rounded-xl transition-all font-black group shadow-inner border border-transparent hover:border-white/10"
                    >
                      <Settings className={`ml-4 h-5 w-5 ${theme.text} opacity-70 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500`} /> إعدادات الحساب
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center px-5 py-4 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all font-black group shadow-inner border border-transparent hover:border-rose-500/20 mt-1"
                    >
                      <LogOut className="ml-4 h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" /> تسجيل الخروج الآمن
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
