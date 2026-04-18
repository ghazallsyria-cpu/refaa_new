'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { LayoutDashboard, Users, GraduationCap, School, BookOpen, CalendarCheck, FileText, CalendarDays, Clock, PenTool, BarChart3, MessageSquare, Bell, FolderOpen, Settings, Database, Award, ChevronRight, ChevronLeft, X, Scale, Activity, Medal, ShieldAlert, LayoutGrid, Compass, AlertTriangle, LayoutTemplate, Crown, UserCircle, UserCog } from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'ملف الإدارة', href: '/admin/profile', icon: Crown }, 
  { name: 'ملفي الشخصي (CV)', href: '/teachers/profile', icon: UserCircle }, 
  { name: 'الفريق الإداري', href: '/admin/staff', icon: UserCog },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users },
  { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText },
  { name: 'الرادار الرقمي', href: '/admin/live-monitor', icon: Activity },
  { name: 'رصد الغياب الآلي', href: '/admin/teacher-attendance', icon: ShieldAlert },
  { name: 'إنذارات الغياب', href: '/admin/absence-warnings', icon: AlertTriangle },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  { name: 'قرارات الخصم', href: '/admin/absence-deductions', icon: Scale },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
  { name: 'إدارة المنتديات', href: '/admin/forums-management', icon: LayoutGrid },
  { name: 'هيدر المنتديات', href: '/admin/forum-hero', icon: LayoutTemplate },
  { name: 'المنتديات', href: '/forums', icon: Compass },
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
  { name: 'الحصص الحية', href: '/live', icon: Clock },
  { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock },
  { name: 'الواجبات', href: '/assignments', icon: PenTool },
  { name: 'التقارير', href: '/reports', icon: BarChart3 },
  { name: 'سجل الأداء', href: '/student/performance', icon: Award },
  { name: 'إدارة الأوسمة', href: '/admin/badges', icon: Medal },
  { name: 'الرسائل', href: '/messages', icon: MessageSquare },
  { name: 'الإعلانات', href: '/announcements', icon: Bell },
  { name: 'المستندات', href: '/documents', icon: FolderOpen },
  { name: 'استيراد البيانات', href: '/seed', icon: Database },
  { name: 'تقرير التدقيق', href: '/report', icon: FileText },
  { name: 'الإعدادات', href: '/settings', icon: Settings },
];

export function Sidebar({ onClose, authRole = 'admin', isCollapsed = false, onToggleCollapse }: { onClose?: () => void, authRole?: string, isCollapsed?: boolean, onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth() as any;
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) setSchoolData({ name: data.school_name?.split(' ')[0] || 'الرفعة', logo_url: data.logo_url || '' });
      } catch (err) { console.error('Error fetching school data:', err); }
    };
    fetchSchoolData();
  }, []);

  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'ملف الإدارة') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'الفريق الإداري') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'ملفي الشخصي (CV)') return (authRole === 'teacher');
    if (authRole === 'admin' || authRole === 'management') return true; 
    if (authRole === 'teacher') return ['لوحة التحكم', 'المنتديات', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل'].includes(item.name);
    if (authRole === 'student') return ['لوحة التحكم', 'المنتديات', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    if (authRole === 'parent') return ['لوحة التحكم', 'المنتديات', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل', 'الإعلانات'].includes(item.name);
    return false;
  });

  const roleDisplayNames: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر' };
  const roleDisplayName = roleDisplayNames[authRole] || 'مستخدم';

  return (
    // 🚀 تحديث لون الشريط ليكون شديد الفخامة
    <div className={cn("flex h-full flex-col bg-[#090b14]/90 backdrop-blur-2xl text-slate-300 border-l border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 z-50", isCollapsed ? "w-20" : "w-72", "group/sidebar")}>
      <div className="absolute inset-y-0 right-0 w-1 bg-emerald-500/0 group-hover/sidebar:bg-emerald-500/30 transition-all duration-700" />
      
      <div className={cn("flex h-24 shrink-0 items-center border-b border-white/5 relative z-10 transition-all duration-500 bg-[#131836]/40", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        <motion.div initial={false} animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1, x: isCollapsed ? 20 : 0 }} className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "pointer-events-none absolute" : "relative")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-2 ring-emerald-500/30 group-hover/sidebar:rotate-3 transition-transform duration-300 overflow-hidden relative">
            {schoolData.logo_url ? <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5" /> : <School className="h-6 w-6 text-emerald-400" />}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tight leading-none">{schoolData.name}</span>
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1.5">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        {isCollapsed && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-2 ring-emerald-500/30 relative z-20 overflow-hidden">
            {schoolData.logo_url ? <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5" /> : <School className="h-6 w-6 text-emerald-400" />}
          </motion.div>
        )}

        <div className="flex items-center gap-1 relative z-20">
          {onToggleCollapse && <button onClick={onToggleCollapse} className="hidden lg:flex p-2 text-slate-500 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-all active:scale-90">{isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</button>}
          {onClose && <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all active:scale-90"><X className="h-6 w-6" /></button>}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar relative z-10" dir="rtl">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            let itemHref = item.href;
            if (item.name === 'لوحة التحكم') {
              if (authRole === 'student') itemHref = '/dashboard/student'; else if (authRole === 'teacher') itemHref = '/dashboard/teacher'; else if (authRole === 'parent') itemHref = '/dashboard/parent'; else if (authRole === 'admin' || authRole === 'management') itemHref = '/dashboard';
            } else if (item.name === 'ملفي الشخصي (CV)') { itemHref = `/teachers/${user?.id}`; }

            const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));
            const isSpecialBtn = item.name === 'قرارات الخصم' || item.name === 'إنذارات الغياب';
            const isRadarBtn = item.name === 'الرادار الرقمي' || item.name === 'رصد الغياب الآلي';
            const isGoldBtn = item.name === 'ملف الإدارة' || item.name === 'ملفي الشخصي (CV)' || item.name === 'الفريق الإداري';

            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}>
                <Link href={itemHref} onClick={onClose} className={cn("flex items-center rounded-xl text-sm font-bold transition-all duration-300 group relative overflow-hidden", isCollapsed ? "justify-center p-3" : "px-4 py-3.5", isActive ? isSpecialBtn ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" : isRadarBtn ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]" : isGoldBtn ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "hover:bg-white/5 hover:text-white text-slate-400")}>
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-all", !isCollapsed && "ml-3.5", isActive ? "scale-110" : "group-hover:text-emerald-400")} />
                  <span className={cn("relative z-10 transition-all duration-500 whitespace-nowrap font-black", isCollapsed ? "w-0 opacity-0 scale-0 overflow-hidden" : "w-auto opacity-100 scale-100")}>{item.name}</span>
                  {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      <div className={cn("p-4 border-t border-white/5 relative z-10 bg-[#131836]/40", isCollapsed ? "items-center" : "")}>
        <div className={cn("bg-[#090b14]/50 rounded-[1rem] flex items-center border border-white/5 hover:bg-white/5 transition-all cursor-pointer group overflow-hidden shadow-inner", isCollapsed ? "justify-center p-2" : "gap-3 p-3")}>
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[#090b14] font-black text-xs shadow-md ring-2 ring-[#090b14]">{roleDisplayName.substring(0, 2)}</div>
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#090b14] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black text-white truncate">{roleDisplayName}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">لوحة التحكم</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
