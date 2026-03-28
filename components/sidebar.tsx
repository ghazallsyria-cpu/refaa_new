'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
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
  ClipboardList
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users },
  { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  // --- الرابط الجديد لدفتر أعمال المعلم ---
  { name: 'دفتر الأعمال', href: '/gradebook', icon: ClipboardList }, 
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
  { name: 'الحصص الحية', href: '/live', icon: Clock },
  { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock },
  { name: 'الواجبات', href: '/assignments', icon: PenTool },
  { name: 'التقارير', href: '/reports', icon: BarChart3 },
  { name: 'سجل الأداء', href: '/student/performance', icon: Award },
  { name: 'الرسائل', href: '/messages', icon: MessageSquare },
  { name: 'الإعلانات', href: '/announcements', icon: Bell },
  { name: 'المستندات', href: '/documents', icon: FolderOpen },
  { name: 'استيراد البيانات', href: '/seed', icon: Database },
  { name: 'تقرير التدقيق', href: '/report', icon: FileText },
  { name: 'الإعدادات', href: '/settings', icon: Settings },
];

export function Sidebar({ 
  onClose, 
  userRole = 'admin', 
  isCollapsed = false, 
  onToggleCollapse 
}: { 
  onClose?: () => void, 
  userRole?: string,
  isCollapsed?: boolean,
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (userRole === 'admin' || userRole === 'management') return true;
    
    if (userRole === 'teacher') {
      // --- تمت إضافة 'دفتر الأعمال' هنا ليراه المعلم ---
      return ['لوحة التحكم', 'الفصول', 'الحضور والغياب', 'دفتر الأعمال', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل'].includes(item.name);
    }
    
    if (userRole === 'student') {
      return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    }
    
    if (userRole === 'parent') {
      return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل', 'الإعلانات'].includes(item.name);
    }
    
    return false;
  });

  // Map role to display name
  const roleDisplayNames: Record<string, string> = {
    'admin': 'المدير العام',
    'management': 'الإدارة',
    'teacher': 'معلم',
    'student': 'طالب',
    'parent': 'ولي أمر'
  };
  const roleDisplayName = roleDisplayNames[userRole] || 'مستخدم';

  return (
    <div className={cn(
      "flex h-full flex-col bg-slate-900 text-slate-300 border-l border-slate-800/50 shadow-2xl relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
      isCollapsed ? "w-20" : "w-72",
      "group/sidebar"
    )}>
      {/* Interactive Peek Handle (Only when hidden on desktop) */}
      <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500/0 group-hover/sidebar:bg-indigo-500/20 transition-all duration-500" />

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse" />
      <div className="absolute top-1/2 left-0 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full -translate-x-1/2" />

      <div className={cn(
        "flex h-24 shrink-0 items-center border-b border-slate-800/50 relative z-10 transition-all duration-700",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        <motion.div 
          initial={false}
          animate={{ 
            opacity: isCollapsed ? 0 : 1,
            scale: isCollapsed ? 0.8 : 1,
            x: isCollapsed ? 20 : 0
          }}
          className={cn("flex items-center gap-3 transition-all duration-500", isCollapsed ? "pointer-events-none" : "")}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20 group-hover:rotate-6 transition-transform">
            <School className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-white tracking-tight leading-none">مدرسة الرفعة</span>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.15em] mt-1">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        {isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20"
          >
            <School className="h-6 w-6 text-white" />
          </motion.div>
        )}

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button 
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all active:scale-90"
              title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar relative z-10">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            // Special handling for dashboard route based on role
            let itemHref = item.href;
            if (item.name === 'لوحة التحكم') {
              if (userRole === 'student') itemHref = '/dashboard/student';
              else if (userRole === 'teacher') itemHref = '/dashboard/teacher';
              else if (userRole === 'parent') itemHref = '/dashboard/parent';
              else if (userRole === 'admin' || userRole === 'management') itemHref = '/dashboard';
            }

            const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link
                  href={itemHref}
                  onClick={onClose}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                      : "hover:bg-white/5 hover:text-white text-slate-400"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 -z-10"
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all duration-300",
                      !isCollapsed && "ml-3.5",
                      isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-indigo-400 group-hover:scale-110"
                    )}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    "relative z-10 transition-all duration-500 whitespace-nowrap font-bold",
                    isCollapsed ? "w-0 opacity-0 scale-0 overflow-hidden" : "w-auto opacity-100 scale-100"
                  )}>
                    {item.name}
                  </span>
                  {isActive && !isCollapsed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  )}
                  {isActive && isCollapsed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-l-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      <div className={cn("p-4 border-t border-slate-800/50 relative z-10 transition-all duration-700", isCollapsed ? "items-center" : "")}>
        <div className={cn(
          "bg-white/5 backdrop-blur-sm rounded-xl flex items-center border border-white/5 hover:bg-white/10 transition-all duration-500 cursor-pointer group overflow-hidden",
          isCollapsed ? "justify-center p-2" : "gap-3 p-3"
        )}>
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs shadow-lg ring-2 ring-white/10 group-hover:scale-105 transition-transform">
              {roleDisplayName.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
          </div>
          <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-700",
            isCollapsed ? "w-0 opacity-0 scale-0" : "w-auto opacity-100 scale-100"
          )}>
            <span className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{roleDisplayName}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">لوحة التحكم</span>
          </div>
        </div>
      </div>
    </div>
  );
}

