// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  LayoutDashboard, Users, GraduationCap, School, BookOpen, 
  CalendarCheck, FileText, CalendarDays, Clock, PenTool, 
  BarChart3, MessageSquare, Bell, FolderOpen, Settings, 
  Database, Award, ChevronRight, ChevronLeft, X, Scale, 
  Activity, Medal, ShieldAlert, LayoutGrid, Compass, 
  AlertTriangle, LayoutTemplate, Crown, UserCircle, UserCog, Calculator, Network, HeartPulse, Sparkles, MonitorPlay, Target, Wand2, MonitorUp,
  ShieldCheck, FileKey, ScanLine, FileSignature, UserSearch,
  CreditCard, ClipboardList 
} from 'lucide-react';

const navigation = [
  { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
  { name: 'ملف الإدارة', href: '/admin/profile', icon: Crown }, 
  { name: 'ملفي الشخصي (CV)', href: '/teachers/profile', icon: UserCircle }, 
  { name: 'الفريق الإداري', href: '/admin/staff', icon: UserCog },
  { name: 'الهيكل الأكاديمي', href: '/hierarchy', icon: Network },
  { name: 'الطلاب', href: '/students', icon: Users },
  { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
  { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users },
  { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText },
  { name: 'تقييم المعلمين', href: '/admin/evaluations', icon: Activity },
  { name: 'الرادار الرقمي', href: '/admin/live-monitor', icon: Activity },
  { name: 'رصد الغياب الآلي', href: '/admin/teacher-attendance', icon: ShieldAlert },
  { name: 'إنذارات الغياب', href: '/admin/absence-warnings', icon: AlertTriangle },
  { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
  { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
  { name: 'مراجعة الأعذار', href: '/admin/excuses', icon: HeartPulse },
  { name: 'قرارات الخصم', href: '/admin/absence-deductions', icon: Scale },
  { name: 'أولياء الأمور', href: '/parents', icon: Users },
  { name: 'الفصول', href: '/classes', icon: School },
  { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
  { name: 'إدارة المنتديات', href: '/admin/forums-management', icon: LayoutGrid },
  { name: 'هيدر المنتديات', href: '/admin/forum-hero', icon: LayoutTemplate },
  { name: 'المنتديات', href: '/forums', icon: Compass },
  { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
  
  // 🚀 أدوات الامتحانات والكنترول المركزية
  { name: 'مستكشف الطلاب 360', href: '/admin/student-360', icon: UserSearch },
  { name: 'فريق الكنترول', href: '/admin/control-team', icon: ShieldCheck },
  { name: 'كنترول اللجان', href: '/admin/exam-committees', icon: ShieldCheck },
  { name: 'رادار الكنترول', href: '/admin/control-radar', icon: ScanLine },
  { name: 'مسار إنجاز الكنترول', href: '/admin/exam-pipeline', icon: BarChart3 },
  { name: 'الغلاف الرقمي', href: '/hod/digital-cover', icon: FileSignature },
  { name: 'جداول الاختبارات', href: '/admin/exam-timetables', icon: CalendarDays },
  { name: 'نماذج الإجابات', href: '/admin/exam-answer-keys', icon: FileKey },
  
  // 🚀 الرادارات وعمليات التتبع الجديدة
  { name: 'العمليات المركزية', href: '/admin/exam-live-dashboard', icon: Activity },
  { name: 'استوديو الهويات', href: '/admin/id-cards', icon: CreditCard }, 
  { name: 'رادار البوابة', href: '/admin/gate-radar', icon: ScanLine },
  { name: 'سجل البوابة', href: '/admin/gate-logs', icon: ClipboardList }, 
  { name: 'رادار المراقب', href: '/teacher/exam-radar', icon: ScanLine },
  // 🚀 الرابط الجديد للتقرير الرسمي للغياب
  { name: 'تقرير غياب الاختبارات', href: '/admin/exam-attendance-report', icon: FileText },
  
  { name: 'سجل الدرجات', href: '/gradebook', icon: Calculator },
  { name: 'الجدول الدراسي القديم', href: '/schedule', icon: CalendarDays },
  { name: 'محرك الجدولة الذكي', href: '/admin/auto-schedule', icon: Wand2 },
  { name: 'شاشة العرض المركزية', href: '/schedules-view', icon: MonitorUp },
  { name: 'الحصص الحية', href: '/live', icon: Clock },
  { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock },
  { name: 'الواجبات', href: '/assignments', icon: PenTool },
  { name: 'ساحة التدريب', href: '/arena', icon: Target },
  { name: 'مراقبة الساحة', href: '/arena-monitor', icon: MonitorPlay },
  { name: 'الواجبات بالذكاء الاصطناعي', href: '/ai-assignments-v2', icon: Sparkles },
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
  const { user, userRole } = useAuth() as any;
  const [schoolData, setSchoolData] = useState({ name: 'المركز العلمي السوري', logo_url: '' });
  
  const [staffPermissions, setStaffPermissions] = useState<any>({});

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('school_name, logo_url').single();
        if (data) setSchoolData({ name: data.school_name?.split(' ')[0] || 'المركز العلمي', logo_url: data.logo_url || '' });
      } catch (err) { console.error('Error fetching school data:', err); }
    };
    fetchSchoolData();
  }, []);

  useEffect(() => {
    async function checkStaffPerms() {
      if (userRole === 'staff' && user?.id) {
        const { data } = await supabase.from('school_staff').select('permissions').eq('id', user.id).maybeSingle();
        if (data) setStaffPermissions(data.permissions || {});
      }
    }
    checkStaffPerms();
  }, [userRole, user?.id]);

  const isGlobalWatcher = userRole === 'staff' && staffPermissions['global_read_only'] === true;

  const filteredNavigation = navigation.filter(item => {
    // إخفاء الأزرار الإدارية البحتة
    if (item.name === 'ملف الإدارة') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'الفريق الإداري') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'استيراد البيانات') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'الإعدادات') return (authRole === 'admin' || authRole === 'management');
    
    // روابط الكنترول والامتحانات الجديدة للمدير والإدارة فقط
    if (item.name === 'مستكشف الطلاب 360') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'فريق الكنترول') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'كنترول اللجان') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'رادار الكنترول') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'مسار إنجاز الكنترول') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'جداول الاختبارات') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'نماذج الإجابات') return (authRole === 'admin' || authRole === 'management');
    // 🚀 ظهور رابط التقرير للإدارة فقط
    if (item.name === 'تقرير غياب الاختبارات') return (authRole === 'admin' || authRole === 'management');

    // الغلاف الرقمي متاح للإدارة ورؤساء الأقسام (المعلمين)
    if (item.name === 'الغلاف الرقمي') return (authRole === 'admin' || authRole === 'management' || authRole === 'teacher');

    // روابط الرادارات والهويات والعمليات المركزية
    if (item.name === 'استوديو الهويات') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'سجل البوابة') return (authRole === 'admin' || authRole === 'management' || authRole === 'staff');
    if (item.name === 'رادار البوابة') return (authRole === 'admin' || authRole === 'management' || authRole === 'staff');
    if (item.name === 'العمليات المركزية') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'رادار المراقب') return (authRole === 'teacher' || authRole === 'admin' || authRole === 'management');

    // الروابط الجديدة للجدول للمدير والإدارة فقط
    if (item.name === 'محرك الجدولة الذكي') return (authRole === 'admin' || authRole === 'management');
    if (item.name === 'شاشة العرض المركزية') return (authRole === 'admin' || authRole === 'management' || authRole === 'student' || authRole === 'teacher' || authRole === 'parent');

    // ظهور الملف الشخصي للمعلم فقط
    if (item.name === 'ملفي الشخصي (CV)') return (authRole === 'teacher');
    
    // ظهور رابط الواجبات الذكية للإدارة فقط
    if (item.name === 'الواجبات بالذكاء الاصطناعي') return (authRole === 'admin' || authRole === 'management');

    // ظهور رابط الساحة (طالب) ومراقبة الساحة (معلم + إدارة)
    if (item.name === 'ساحة التدريب') return (authRole === 'student');
    if (item.name === 'مراقبة الساحة') return (authRole === 'teacher' || authRole === 'admin' || authRole === 'management');

    if (authRole === 'admin' || authRole === 'management') return true; 
    
    // إذا كان مشرفاً إدارياً ولديه صلاحية المراقبة
    if (isGlobalWatcher) return true;
    
    // باقي الصلاحيات 
    if (authRole === 'teacher') return ['لوحة التحكم', 'الهيكل الأكاديمي', 'ملفي الشخصي (CV)', 'المنتديات', 'الفصول', 'الحضور والغياب', 'الاختبارات والدرجات', 'سجل الدرجات', 'شاشة العرض المركزية', 'الواجبات', 'مراقبة الساحة', 'الرسائل', 'رادار المراقب', 'الغلاف الرقمي'].includes(item.name);
    
    if (authRole === 'student') return ['لوحة التحكم', 'الهيكل الأكاديمي', 'المنتديات', 'الحضور والغياب', 'الاختبارات والدرجات', 'شاشة العرض المركزية', 'الواجبات', 'ساحة التدريب', 'سجل الأداء', 'الرسائل'].includes(item.name);
    
    if (authRole === 'parent') return ['لوحة التحكم', 'الهيكل الأكاديمي', 'المنتديات', 'الحضور والغياب', 'الاختبارات والدرجات', 'شاشة العرض المركزية', 'الواجبات', 'الرسائل', 'الإعلانات'].includes(item.name);
    
    return false;
  });

  const roleDisplayNames: Record<string, string> = { 'admin': 'المدير العام', 'management': 'الإدارة', 'teacher': 'معلم', 'student': 'طالب', 'parent': 'ولي أمر', 'staff': 'كادر إداري/مساند' };
  let roleDisplayName = roleDisplayNames[authRole] || roleDisplayNames[userRole] || 'مستخدم';
  if (isGlobalWatcher) roleDisplayName = 'مشرف إداري (مراقبة)';

  return (
    <div className={cn("flex h-full flex-col bg-[#0a0d16]/80 backdrop-blur-3xl text-slate-300 border-l border-white/5 relative overflow-hidden transition-all duration-500 z-50", isCollapsed ? "w-20" : "w-72", "group/sidebar")} dir="rtl">
      
      <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />
      
      <div className={cn("flex h-24 shrink-0 items-center border-b border-white/5 relative z-10 transition-all duration-500 bg-[#02040a]/40", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        <motion.div initial={false} animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1, x: isCollapsed ? -20 : 0 }} className={cn("flex items-center gap-3 transition-all duration-300", isCollapsed ? "pointer-events-none absolute" : "relative")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#0f1423] shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 group-hover/sidebar:rotate-3 transition-transform duration-300 overflow-hidden relative border border-white/10 shrink-0">
            {schoolData.logo_url ? <img src={schoolData.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <School className="h-6 w-6 text-amber-500" />}
          </div>
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-lg font-black text-white tracking-tight leading-none drop-shadow-md truncate">{schoolData.name}</span>
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.2em] mt-1.5 truncate">المنصة الرقمية</span>
          </div>
        </motion.div>
        
        {isCollapsed && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#0f1423] shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 relative z-20 overflow-hidden border border-white/10 shrink-0">
            {schoolData.logo_url ? <img src={schoolData.logo_url} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <School className="h-6 w-6 text-amber-500" />}
          </motion.div>
        )}

        <div className="flex items-center gap-1 relative z-20 shrink-0">
          {onToggleCollapse && (
            <button onClick={onToggleCollapse} className="hidden lg:flex p-2 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-all active:scale-90 shadow-inner">
              {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90 shadow-inner">
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-6 px-3 custom-scrollbar relative z-10 overflow-x-hidden">
        <nav className="space-y-1.5">
          {filteredNavigation.map((item, idx) => {
            let itemHref = item.href;
            
            if (item.name === 'لوحة التحكم') {
              if (authRole === 'student') itemHref = '/dashboard/student'; 
              else if (authRole === 'teacher') itemHref = '/dashboard/teacher'; 
              else if (authRole === 'parent') itemHref = '/dashboard/parent'; 
              else if (userRole === 'staff') itemHref = '/dashboard/staff'; 
              else if (authRole === 'admin' || authRole === 'management') itemHref = '/dashboard';
            } 
            else if (item.name === 'ملفي الشخصي (CV)') { 
              itemHref = `/teachers/${user?.id || user?.user_id}`; 
            }

            const isActive = pathname === itemHref || (itemHref !== '/' && pathname?.startsWith(itemHref));

            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}>
                <Link 
                  href={itemHref} 
                  onClick={onClose} 
                  prefetch={false} 
                  className={cn(
                    "flex items-center rounded-xl text-sm font-bold transition-all duration-300 group relative overflow-hidden", 
                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5", 
                    isActive ? "bg-white/10 text-white shadow-inner border border-white/5" : "hover:bg-white/5 hover:text-white text-slate-400 hover:shadow-sm border border-transparent"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 transition-all", !isCollapsed && "ml-3.5", isActive ? "scale-110 text-amber-400 drop-shadow-md" : "text-slate-500 group-hover:text-amber-400")} />
                  
                  <span className={cn("relative z-10 transition-all duration-500 whitespace-nowrap font-black truncate", isCollapsed ? "w-0 opacity-0 scale-0" : "w-full opacity-100 scale-100")}>
                    {item.name}
                  </span>
                  
                  {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-400 rounded-l-full shadow-[0_0_15px_rgba(245,158,11,0.8)]" />}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      <div className={cn("p-4 border-t border-white/5 relative z-10 bg-[#02040a]/40", isCollapsed ? "items-center" : "")}>
        <div className={cn("bg-[#0f1423] rounded-[1rem] flex items-center border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group overflow-hidden shadow-inner", isCollapsed ? "justify-center p-2" : "gap-3 p-3")}>
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-white/20">
               {roleDisplayName.substring(0, 2)}
            </div>
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f1423] rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden min-w-0 pr-1">
              <span className="text-xs font-black text-white truncate drop-shadow-md group-hover:text-amber-400 transition-colors">{roleDisplayName}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">مستخدم نشط</span>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
