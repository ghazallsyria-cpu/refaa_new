'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarCheck,
  FileText,
  CalendarDays,
  Clock,
  PenTool,
  BarChart3,
  MessageSquare,
  Bell,
  FolderOpen,
  Settings,
  Database,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  Scale,
  Activity,
  Medal,
  ShieldAlert
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users },
  { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText },
  { name: 'الرادار الرقمي', href: '/admin/live-monitor', icon: Activity },
  { name: 'رصد الغياب الآلي', href: '/admin/teacher-attendance', icon: ShieldAlert },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  { name: 'قرارات الخصم', href: '/admin/absence-deductions', icon: Scale },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
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

export function Sidebar({ 
  onClose, 
  authRole = 'admin', 
  isCollapsed = false, 
  onToggleCollapse 
}: { 
  onClose?: () => void, 
  authRole?: string,
  isCollapsed?: boolean,
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname();
  
  const [schoolData, setSchoolData] = useState({ name: 'الرفعة النموذجية', logo_url: '' });

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) {
          setSchoolData({
            name: data.school_name?.split(' ')[0] || 'الرفعة',
            logo_url: data.logo_url || ''
          });
        }
      } catch (err) {
        console.error('Error fetching school data:', err);
      }
    };
    fetchSchoolData();
  }, []);

  const filteredNavigation = navigation.filter(item => {
    if (authRole === 'admin' || authRole === 'management') return true;
    if (authRole === 'teacher') return ['لوحة التحكم', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل'].includes(item.name);
    if (authRole === 'student') return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    if (authRole === 'parent') return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل', 'الإعلانات'].includes(item.name);
    return false;
  });

  const roleDisplayNames: Record<string, string> = {
    'admin': 'المدير العام',
    'management': 'الإدارة',
    'teacher': 'معلم',
    'student': 'طالب',
    'parent': 'ولي أمر'
  };
  const roleDisplayName = roleDisplayNames[authRole] || 'مستخدم';

  return (
    <div className={cn(
      "flex h-full flex-col bg-slate-900 text-slate-300 border-l border-slate-800/50 shadow-[20px_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500 ease-out z-50",
      isCollapsed ? "w-20" : "w-72",
      "group/sidebar"
    )}>
      <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500/0 group-hover/sidebar:bg-indigo-500/30 transition-all duration-700" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse" />

      {/* Header Sidebar */}
      <div className={cn(
        "flex h-24 shrink-0 items-center border-b border-slate-800/80 relative z-10 transition-all duration-500 bg-slate-900/50 backdrop-blur-md",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        <motion.div 
          initial={false}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1, x: isCollapsed ? 20 : 0 }}
          className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "pointer-events-none absolute" : "relative")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)] ring-2 ring-indigo-500/30 group-hover/sidebar:rotate-3 transition-transform duration-300 overflow-hidden relative">
            {schoolData.logo_url ? (
              <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><School className="h-6 w-6 text-white" /></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tight leading-none">{schoolData.name}</span>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1.5">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        {isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)] ring-2 ring-indigo-500/30 relative z-20 overflow-hidden"
          >
            {schoolData.logo_url ? (
              <Image src={schoolData.logo_url} alt="Logo" fill className="object-contain p-1.5" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"><School className="h-6 w-6 text-white" /></div>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-1 relative z-20">
          {onToggleCollapse && (
            <button 
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90"
            >
              {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all active:scale-90"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Links Scroll Area */}
      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar relative z-10" dir="rtl">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            let itemHref = item.href;
            if (item.name === 'لوحة التحكم') {
              if (authRole === 'student') itemHref = '/dashboard/student';
              else if (authRole === 'teacher') itemHref = '/dashboard/teacher';
              else if (authRole === 'parent') itemHref = '/dashboard/parent';
              else if (authRole === 'admin' || authRole === 'management') itemHref = '/dashboard';
            }

            const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));
            
            const isSpecialBtn = item.name === 'قرارات الخصم';
            const isRadarBtn = item.name === 'الرادار الرقمي' || item.name === 'رصد الغياب الآلي';
            const isBadgeBtn = item.name === 'إدارة الأوسمة';

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Link
                  href={itemHref}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-bold transition-all duration-300 group relative overflow-hidden",
                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5",
                    isActive 
                      ? isSpecialBtn ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30" 
                        : isRadarBtn ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                        : isBadgeBtn ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
                        : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30" 
                      : "hover:bg-white/5 hover:text-white text-slate-400"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all duration-300",
                      !isCollapsed && "ml-3.5",
                      isActive ? "text-white scale-110" 
                        : isSpecialBtn ? "group-hover:text-rose-400" 
                        : isRadarBtn ? "group-hover:text-emerald-400" 
                        : isBadgeBtn ? "group-hover:text-amber-400 group-hover:scale-110" 
                        : "group-hover:text-indigo-400 group-hover:scale-110"
                    )}
                  />
                  <span className={cn(
                    "relative z-10 transition-all duration-500 whitespace-nowrap font-black tracking-wide",
                    isCollapsed ? "w-0 opacity-0 scale-0 overflow-hidden" : "w-auto opacity-100 scale-100"
                  )}>
                    {item.name}
                  </span>
                  
                  {isActive && !isCollapsed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                  )}
                  {isActive && isCollapsed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-l-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      {/* Footer User Info */}
      <div className={cn("p-4 border-t border-slate-800/80 relative z-10 transition-all duration-500 bg-slate-900/50 backdrop-blur-md", isCollapsed ? "items-center" : "")}>
        <div className={cn(
          "bg-white/5 backdrop-blur-sm rounded-[1rem] flex items-center border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group overflow-hidden shadow-inner",
          isCollapsed ? "justify-center p-2" : "gap-3 p-3"
        )}>
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-md ring-2 ring-slate-800 group-hover:scale-105 transition-transform">
              {roleDisplayName.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-500",
            isCollapsed ? "w-0 opacity-0 scale-0" : "w-auto opacity-100 scale-100"
          )}>
            <span className="text-xs font-black text-white truncate group-hover:text-indigo-300 transition-colors">{roleDisplayName}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">لوحة التحكم</span>
          </div>
        </div>
      </div>
    </div>
  );
}
