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

  // 🚀 تحديد اللون التفاعلي للهيدر حسب صلاحية المستخدم (Gemini Smart Colors)
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
    // 🏛️ الحاوية الرئيسية (Glassmorphism فائق الشفافية + خلفية متحركة)
    <header className="relative flex h-24 shrink-0 items-center px-4 sm:px-8 sticky top-0 z-40 border-b border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 overflow-hidden bg-[#02040a]/40 backdrop-blur-2xl" dir="rtl">
      
      {/* 🌌 خلفية جيمناي الكونية الفخمة (متجاوبة وممتدة) */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-50%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-50%] right-[-10%] w-[30vw] h-[30vw] bg-blue-500/20 rounded-full blur-[80px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen"></div>
      </div>

      {/* ==========================================
          🔔 القسم الأيمن: الإشعارات والقائمة (تم النقل لليمين)
          ========================================== */}
      <div className="flex items-center gap-4 z-10">
        {onMenuClick && showMenuButton && (
          <button
            type="button"
            className="p-3 text-slate-300 hover:text-white rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center active:scale-95 border border-white/10 shadow-inner backdrop-blur-md"
            onClick={onMenuClick}
            title="القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        
        <div className="p-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-inner backdrop-blur-md">
          <NotificationsBell />
        </div>
      </div>

      {/* ==========================================
          🏫 القسم الأوسط: الشعار الحي (Alive Logo)
          ========================================== */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <Link href="/" prefetch={false} className="pointer-events-auto group">
          <div className="relative h-14 w-48 sm:h-16 sm:w-64 flex items-center justify-center">
            {/* الهالة المضيئة خلف الشعار */}
            <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 group-hover:blur-3xl transition-all duration-700 pointer-events-none"></div>
            
            {!imageError ? (
              <img
                src={finalLogoSrc}
                alt={schoolData.name}
                className="max-h-full max-w-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-105 group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-500 relative z-10"
                onError={() => setImageError(true)} 
              />
            ) : (
              <div className="flex items-center justify-center gap-3 h-full bg-white/5 px-6 py-2 rounded-full border border-white/10 shadow-inner backdrop-blur-md group-hover:bg-white/10 transition-colors relative z-10">
                <School className="w-6 h-6 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="text-xl font-black text-white drop-shadow-md tracking-tight">{schoolData.name}</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ==========================================
          🔘 القسم الأيسر: البروفايل (تم النقل لليسار)
          ========================================== */}
      <div className="flex items-center gap-3 mr-auto z-10 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-3 sm:gap-4 p-2 rounded-full sm:rounded-[2rem] bg-white/5 hover:bg-white/10 transition-all border border-white/10 ${theme.hover} group active:scale-95 shadow-inner backdrop-blur-md pr-2 sm:pr-4`}
        >
          {/* اسم المستخدم والمسمى الوظيفي */}
          <div className="hidden sm:flex flex-col items-end justify-center text-left">
            <span className="text-sm font-black text-white truncate max-w-[150px] group-hover:text-white transition-colors drop-shadow-md">
              {userName || (user ? user.email.split('@')[0] : 'المستخدم')}
            </span>
            <span className={`text-[10px] ${theme.text} font-bold tracking-widest drop-shadow-sm`}>{displayRole}</span>
          </div>

          {/* أيقونة المستخدم */}
          <div className="relative shrink-0">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-[1rem] sm:rounded-[1.2rem] bg-gradient-to-br ${theme.bg} flex items-center justify-center ${theme.glow} ring-2 ${theme.ring} group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#02040a] drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-[3px] border-[#02040a] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          </div>
        </button>

        {/* القائمة المنسدلة (Futuristic Dropdown) */}
        <AnimatePresence>
          {isDropdownOpen && user && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, y: 20, scale: 0.95, rotateX: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute left-0 top-[120%] z-50 w-72 origin-top-left rounded-[2rem] bg-[#02040a]/90 backdrop-blur-3xl p-3 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col gap-2 overflow-hidden"
                style={{ perspective: "1000px" }}
              >
                <div className={`absolute top-0 left-0 w-32 h-32 ${theme.bg.split(' ')[0].replace('from-', 'bg-')}/20 blur-[50px] rounded-full pointer-events-none mix-blend-screen`}></div>
                
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

    </header>
  );
}
