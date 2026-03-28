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
  X
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
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
  { name: 'الحصص الحية', href: '/live', icon: Clock },
  { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock },
  { name: 'الواجبات', href: '/assignments', icon: PenTool },
  { name: 'التقارير', href: '/reports', icon: BarChart3 },
  // تم تحديث المسار هنا ليكون المسار الجديد الذي أنشأناه
  { name: 'سجل الأداء', href: '/gradebook', icon: Award },
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

  const filteredNavigation = navigation.filter(item => {
    if (userRole === 'admin' || userRole === 'management') return true;
    
    if (userRole === 'teacher') {
      // تم إضافة 'سجل الأداء' هنا لكي يظهر في قائمة المعلم
      return ['لوحة التحكم', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    }
    
    if (userRole === 'student') {
      return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    }
    
    if (userRole === 'parent') {
      return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل', 'الإعلانات'].includes(item.name);
    }
    
    return false;
  });

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
      <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500/0 group-hover/sidebar:bg-indigo-500/20 transition-all duration-500" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 animate-pulse" />

      <div className={cn(
        "flex h-24 shrink-0 items-center border-b border-slate-800/50 relative z-10 transition-all duration-700",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        <motion.div 
          initial={false}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1, x: isCollapsed ? 20 : 0 }}
          className={cn("flex items-center gap-3 transition-all duration-500", isCollapsed ? "pointer-events-none" : "")}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20">
            <School className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-white tracking-tight leading-none">مدرسة الرفعة</span>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-[0.15em] mt-1">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button onClick={onToggleCollapse} className="hidden lg:flex p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar relative z-10">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            let itemHref = item.href;
            if (item.name === 'لوحة التحكم') {
              if (userRole === 'student') itemHref = '/dashboard/student';
              else if (userRole === 'teacher') itemHref = '/dashboard/teacher';
              else if (userRole === 'parent') itemHref = '/dashboard/parent';
              else if (userRole === 'admin' || userRole === 'management') itemHref = '/dashboard';
            }

            const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));
            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
                <Link
                  href={itemHref}
                  onClick={onClose}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5",
                    isActive ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-400"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 ml-3.5", isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-indigo-400")} />
                  <span className={cn("relative z-10 transition-all duration-500 font-bold", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                    {item.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      <div className={cn("p-4 border-t border-slate-800/50 relative z-10", isCollapsed ? "items-center" : "")}>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl flex items-center p-3 gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xs">
            {roleDisplayName.substring(0, 2)}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">{roleDisplayName}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase">متصل الآن</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

