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
  X
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
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

export function Sidebar({ onClose, userRole = 'admin' }: { onClose?: () => void, userRole?: string }) {
  const pathname = usePathname();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (userRole === 'admin' || userRole === 'management') return true;
    
    if (userRole === 'teacher') {
      return ['لوحة التحكم', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل'].includes(item.name);
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
    <div className="flex h-full w-72 flex-col bg-slate-900 text-slate-300 border-l border-slate-800/50 shadow-2xl relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="flex h-24 shrink-0 items-center justify-between px-8 border-b border-slate-800/50 relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/20 ring-1 ring-white/20">
            <School className="h-7 w-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tight leading-none">مدرسة الرفعة</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">المنصة الرقمية</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-8 px-4 custom-scrollbar relative z-10">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item) => {
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
              <Link
                key={item.name}
                href={itemHref}
                onClick={onClose}
                className={cn(
                  "flex items-center px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "hover:bg-white/5 hover:text-white"
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
                    "h-5 w-5 shrink-0 ml-3.5 transition-all duration-300",
                    isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-indigo-400 group-hover:scale-110"
                  )}
                  aria-hidden="true"
                />
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-6 border-t border-slate-800/50 relative z-10">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
          <div className="relative">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg ring-2 ring-white/10">
              {roleDisplayName.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{roleDisplayName}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">لوحة التحكم</span>
          </div>
        </div>
      </div>
    </div>
  );
}
