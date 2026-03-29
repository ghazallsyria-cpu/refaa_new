'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  Compass
} from 'lucide-react';

/* ================= TYPES ================= */

type Role = 'admin' | 'management' | 'teacher' | 'student' | 'parent';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  grades?: string[];
};

/* ================= HELPERS ================= */

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const usePathname = () => '/';

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

const Link = ({ href, children, className }: LinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/* ================= NAVIGATION ================= */

const navigation: NavItem[] = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard, roles: ['admin','management','teacher','student','parent'] },
  { name: 'الطلاب', href: '/students', icon: Users, roles: ['admin','management'] },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap, roles: ['admin','management'] },
  { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users, roles: ['admin'] },
  { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText, roles: ['admin'] },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen, roles: ['admin','management'] },
  { name: 'أولياء الأمور', href: '/parents', icon: Users, roles: ['admin','management'] },
  { name: 'الفصول', href: '/classes', icon: School, roles: ['admin','management','teacher'] },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen, roles: ['admin','management'] },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck, roles: ['admin','management','teacher','student','parent'] },
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText, roles: ['admin','management','teacher','student','parent'] },
  { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays, roles: ['admin','management','teacher','student','parent'] },
  { name: 'الحصص الحية', href: '/live', icon: Clock, roles: ['admin','management','teacher'] },
  { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock, roles: ['admin'] },
  { name: 'الواجبات', href: '/assignments', icon: PenTool, roles: ['admin','management','teacher','student','parent'] },
  { name: 'تحديد المسار', href: '/dashboard/student/track', icon: Compass, roles: ['student'], grades: ['10'] },
  { name: 'التقارير', href: '/reports', icon: BarChart3, roles: ['admin','management'] },
  { name: 'سجل الأداء', href: '/student/performance', icon: Award, roles: ['student','parent'] },
  { name: 'الرسائل', href: '/messages', icon: MessageSquare, roles: ['admin','management','teacher','student','parent'] },
  { name: 'الإعلانات', href: '/announcements', icon: Bell, roles: ['admin','management','parent'] },
  { name: 'المستندات', href: '/documents', icon: FolderOpen, roles: ['admin','management'] },
  { name: 'استيراد البيانات', href: '/seed', icon: Database, roles: ['admin'] },
  { name: 'تقرير التدقيق', href: '/report', icon: FileText, roles: ['admin'] },
  { name: 'الإعدادات', href: '/settings', icon: Settings, roles: ['admin','management'] }
];

/* ================= APP ================= */

export default function App() {
  return (
    <div className="h-screen w-full bg-slate-100 flex">
      <Sidebar userRole="student" userGrade="10" />
      <main className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold text-slate-800">محتوى الصفحة الرئيسية</h1>
      </main>
    </div>
  );
}

/* ================= SIDEBAR ================= */

type SidebarProps = {
  onClose?: () => void;
  userRole?: Role;
  userGrade?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function Sidebar({
  userRole = 'admin',
  userGrade = '10',
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.grades && !item.grades.includes(userGrade)) return false;
    return true;
  });

  const roleDisplayNames: Record<Role, string> = {
    admin: 'المدير العام',
    management: 'الإدارة',
    teacher: 'معلم',
    student: 'طالب',
    parent: 'ولي أمر'
  };

  const roleDisplayName = roleDisplayNames[userRole];

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-slate-900 text-slate-300 border-l border-slate-800/50 shadow-2xl transition-all duration-700",
        isCollapsed ? "w-20" : "w-72"
      )}
      dir="rtl"
    >
      {/* HEADER */}
      <div className="flex h-24 items-center justify-between px-6 border-b border-slate-800/50">
        <div className={cn("flex items-center gap-3", isCollapsed && "hidden")}>
          <School className="h-6 w-6 text-white" />
          <div>
            <div className="text-white font-bold">مدرسة الرفعة</div>
          </div>
        </div>

        {onToggleCollapse && (
          <button onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
          </button>
        )}
      </div>

      {/* NAV */}
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            const Icon = item.icon;

            let itemHref = item.href;
            if (item.name === 'لوحة التحكم') {
              if (userRole === 'student') itemHref = '/dashboard/student';
              if (userRole === 'teacher') itemHref = '/dashboard/teacher';
              if (userRole === 'parent') itemHref = '/dashboard/parent';
              if (userRole === 'admin' || userRole === 'management') itemHref = '/dashboard';
            }

            const isActive = pathname === itemHref;

            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Link
                  href={itemHref}
                  className={cn(
                    "flex items-center rounded-xl text-sm font-medium transition-all",
                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5",
                    isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span className="mr-3">{item.name}</span>}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800/50">
        {!isCollapsed && (
          <div className="text-xs text-slate-400">
            {roleDisplayName}
          </div>
        )}
      </div>
    </div>
  );
}
