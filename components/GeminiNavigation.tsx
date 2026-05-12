// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { 
  LayoutDashboard, Users, GraduationCap, Calendar, 
  FileText, BookOpen, MessageSquare, Settings, 
  Sparkles, Radio, LogOut, Loader2, Target, Award
} from 'lucide-react';

const getNavLinks = (role: string | null) => {
  switch (role) {
    case 'admin':
    case 'management':
      return [
        { name: 'مركز القيادة', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'رادار المنصة', href: '/admin/live-monitor', icon: Radio },
        { name: 'الطلاب', href: '/admin/student-360', icon: GraduationCap },
        { name: 'المعلمين', href: '/admin/staff', icon: Users },
        { name: 'الكنترول', href: '/admin/exam-pipeline', icon: Target },
        { name: 'الإعدادات', href: '/admin/settings', icon: Settings },
      ];
    case 'teacher':
      return [
        { name: 'لوحة المعلم', href: '/dashboard/teacher', icon: LayoutDashboard },
        { name: 'جدول الحصص', href: '/dashboard/teacher/schedule', icon: Calendar },
        { name: 'الواجبات الذكية', href: '/ai-assignments-v2', icon: BookOpen },
        { name: 'الاختبارات', href: '/exams', icon: FileText },
        { name: 'الرسائل والمجالس', href: '/messages', icon: MessageSquare },
      ];
    case 'student':
      return [
        { name: 'لوحة الطالب', href: '/dashboard/student', icon: LayoutDashboard },
        { name: 'جدولي', href: '/dashboard/student/schedule', icon: Calendar },
        { name: 'الاختبارات', href: '/exams', icon: FileText },
        { name: 'واجباتي', href: '/assignments', icon: BookOpen },
        { name: 'الأوسمة', href: '/student/performance', icon: Award },
        { name: 'المجلس', href: '/messages', icon: MessageSquare },
      ];
    default:
      return [];
  }
};

const getThemeColors = (role: string | null) => {
  switch (role) {
    case 'admin':
    case 'management':
      return { glow: 'shadow-[0_0_40px_rgba(99,102,241,0.15)]', border: 'border-indigo-500/30', text: 'text-indigo-400', bgHover: 'hover:bg-indigo-500/10' };
    case 'teacher':
      return { glow: 'shadow-[0_0_40px_rgba(16,185,129,0.15)]', border: 'border-emerald-500/30', text: 'text-emerald-400', bgHover: 'hover:bg-emerald-500/10' };
    case 'student':
      return { glow: 'shadow-[0_0_40px_rgba(59,130,246,0.15)]', border: 'border-blue-500/30', text: 'text-blue-400', bgHover: 'hover:bg-blue-500/10' };
    default:
      return { glow: 'shadow-lg', border: 'border-white/10', text: 'text-slate-400', bgHover: 'hover:bg-white/5' };
  }
};

export default function GeminiNavigation() {
  const { authRole, signOut, isChecking } = useAuth();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isChecking || !authRole) return null;

  const links = getNavLinks(authRole);
  const theme = getThemeColors(authRole);
  const mobileLinks = links.slice(0, 5); // للجزيرة السفلية

  return (
    <>
      {/* ==========================================
          💻 1. الكبسولة الطافية (شاشات الكمبيوتر والآيباد)
          ========================================== */}
      <motion.div 
        initial={false}
        animate={{ width: isExpanded ? 240 : 80 }}
        onHoverStart={() => setIsExpanded(true)}
        onHoverEnd={() => setIsExpanded(false)}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`hidden md:flex fixed top-6 bottom-6 right-6 z-50 flex-col bg-[#0f1423]/80 backdrop-blur-2xl rounded-[2.5rem] border ${theme.border} ${theme.glow} overflow-hidden`}
      >
        {/* 🔮 نواة جيمناي */}
        <div className="p-4 shrink-0 flex items-center justify-center border-b border-white/5">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 180 }}
            transition={{ duration: 0.5 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#02040a] to-[#131836] border border-white/10 cursor-pointer shadow-inner relative group`}
          >
            <Sparkles className={`w-6 h-6 ${theme.text} animate-pulse`} />
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity ${theme.glow}`}></div>
          </motion.div>
        </div>

        {/* 🧭 الروابط */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col gap-2 px-3 relative">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link key={link.name} href={link.href} className="relative group">
                <div className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/10 border border-white/10 shadow-inner' : `border border-transparent ${theme.bgHover}`}`}>
                  <link.icon className={`w-6 h-6 shrink-0 transition-colors ${isActive ? 'text-white drop-shadow-md' : 'text-slate-400 group-hover:text-white'}`} />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: -10 }} 
                        className={`font-black text-sm whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                      >
                        {link.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {isActive && (
                  <motion.div layoutId="active-indicator" className={`absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-l-full bg-current ${theme.text}`} />
                )}
              </Link>
            );
          })}
        </div>

        {/* 🚪 تسجيل الخروج */}
        <div className="p-4 shrink-0 border-t border-white/5">
          <button onClick={signOut} className={`w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-300 group text-slate-400 hover:text-rose-400`}>
            <LogOut className="w-6 h-6 shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="font-black text-sm whitespace-nowrap">
                  تسجيل الخروج
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* ==========================================
          📱 2. الجزيرة السفلية (شاشات الجوال - PWA)
          ========================================== */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <div className={`bg-[#0f1423]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${theme.glow}`}>
          {mobileLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link key={link.name} href={link.href} className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl group">
                {isActive && (
                  <motion.div layoutId="mobile-active" className="absolute inset-0 bg-white/10 border border-white/10 rounded-2xl shadow-inner z-0" />
                )}
                <link.icon className={`w-6 h-6 relative z-10 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className={`text-[8px] font-black mt-1 relative z-10 ${isActive ? theme.text : 'text-slate-500'}`}>{link.name}</span>
                {isActive && <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-current ${theme.text} shadow-[0_0_5px_currentColor]`}></div>}
              </Link>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </>
  );
}
