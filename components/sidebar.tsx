'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- ملاحظة هامة جداً للمشروع الحقيقي ---
// لتجاوز أخطاء العرض هنا، قمنا باستخدام بدائل لـ Next.js


// واستبدلها بالاستيرادات الحقيقية التالية:
 import Link from 'next/link';
 import { usePathname } from 'next/navigation';
// ----------------------------------------

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
  LogOut
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

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    if (authRole === 'admin' || authRole === 'management') return true;
    
    if (authRole === 'teacher') {
      return ['لوحة التحكم', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'الرسائل'].includes(item.name);
    }
    
    if (authRole === 'student') {
      return ['لوحة التحكم', 'الحضور والغياب', 'الاختبارات والدرجات', 'الجدول الدراسي', 'الواجبات', 'سجل الأداء', 'الرسائل'].includes(item.name);
    }
    
    if (authRole === 'parent') {
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
  const roleDisplayName = roleDisplayNames[authRole] || 'مستخدم';

  return (
    <div 
      dir="rtl"
      className={cn(
        // الأساسيات: ألوان داكنة عصرية مع تأثير زجاجي خفيف
        "flex h-full flex-col bg-slate-950 text-slate-300 border-l border-white/5 shadow-2xl relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        // تجاوب الموبايل: عرض كامل في الموبايل، وعرض مرن في الشاشات الكبيرة
        isCollapsed ? "lg:w-20 w-[280px]" : "w-[280px]",
        "group/sidebar"
      )}
    >
      {/* عناصر زخرفية خلفية (Glow Effects) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" />

      {/* الرأس (Header) واللوجو */}
      <div className={cn(
        "flex h-20 shrink-0 items-center border-b border-white/5 relative z-20 transition-all duration-500 backdrop-blur-xl bg-slate-950/50",
        isCollapsed ? "lg:justify-center px-4 lg:px-0" : "justify-between px-5"
      )}>
        <motion.div 
          initial={false}
          animate={{ 
            opacity: isCollapsed ? 0 : 1,
            scale: isCollapsed ? 0.8 : 1,
          }}
          className={cn(
            "flex items-center gap-3 transition-all duration-500", 
            isCollapsed ? "lg:hidden" : "flex"
          )}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 overflow-hidden">
            <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />
            <School className="h-5 w-5 text-white relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-white tracking-tight leading-none drop-shadow-sm">مدرسة الرفعة</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        {/* الأيقونة عند طي القائمة (يظهر فقط في الشاشات الكبيرة) */}
        {isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20"
          >
            <School className="h-5 w-5 text-white" />
          </motion.div>
        )}

        {/* أزرار التحكم (الطي / الإغلاق) */}
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button 
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-2.5 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all active:scale-90 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* الروابط (Navigation) */}
      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 relative z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">
        <nav className="space-y-1.5">
          <AnimatePresence>
            {filteredNavigation.map((item, idx) => {
              let itemHref = item.href;
              if (item.name === 'لوحة التحكم') {
                if (authRole === 'student') itemHref = '/dashboard/student';
                else if (authRole === 'teacher') itemHref = '/dashboard/teacher';
                else if (authRole === 'parent') itemHref = '/dashboard/parent';
                else if (authRole === 'admin' || authRole === 'management') itemHref = '/dashboard';
              }

              const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));
              
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, ease: "easeOut" }}
                >
                  <Link
                    href={itemHref}
                    onClick={onClose}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-xl text-sm font-bold transition-all duration-300 group relative overflow-hidden",
                      isCollapsed ? "lg:justify-center p-3" : "px-4 py-3.5",
                      isActive 
                        ? "bg-indigo-500/10 text-indigo-400" 
                        : "hover:bg-white/5 hover:text-slate-100 text-slate-400"
                    )}
                  >
                    {/* التوهج الخلفي عند التحديد */}
                    {isActive && (
                      <motion.div 
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent -z-10"
                      />
                    )}
                    
                    {/* المؤشر الجانبي للرابط النشط */}
                    {isActive && (
                      <motion.div 
                        layoutId="sidebar-active-indicator"
                        className="absolute right-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-l-full shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                      />
                    )}

                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-300",
                        isCollapsed ? "lg:ml-0 ml-3.5" : "ml-3.5",
                        isActive 
                          ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                          : "text-slate-500 group-hover:text-slate-300"
                      )}
                      aria-hidden="true"
                    />
                    
                    <span className={cn(
                      "relative z-10 transition-all duration-500 whitespace-nowrap",
                      isCollapsed ? "lg:w-0 lg:opacity-0 lg:scale-0 lg:hidden block" : "w-auto opacity-100 scale-100"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </nav>
      </div>
      
      {/* قسم المستخدم السفلي (User Profile Area) */}
      <div className="p-4 border-t border-white/5 relative z-20 bg-slate-950/80 backdrop-blur-md">
        <div className={cn(
          "bg-slate-900/50 rounded-2xl flex items-center border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer group relative overflow-hidden",
          isCollapsed ? "lg:justify-center lg:p-2 p-3" : "gap-3 p-3"
        )}>
          {/* تأثير ضوئي عند المرور */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-black text-xs shadow-inner border border-white/10 group-hover:border-indigo-500/50 transition-colors">
              {roleDisplayName.substring(0, 2)}
            </div>
            {/* مؤشر الأونلاين */}
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-sm" />
          </div>
          
          <div className={cn(
            "flex flex-col flex-1 overflow-hidden transition-all duration-500",
            isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden flex" : "w-auto opacity-100"
          )}>
            <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{roleDisplayName}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">لوحة التحكم</span>
          </div>

          {/* أيقونة جانبية (تظهر فقط في الوضع المفتوح أو الموبايل) */}
          <div className={cn(
            "shrink-0 transition-opacity",
            isCollapsed ? "lg:hidden block opacity-50 group-hover:opacity-100" : "opacity-50 group-hover:opacity-100"
          )}>
            <Settings className="h-4 w-4 text-slate-400 hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
