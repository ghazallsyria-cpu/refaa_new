// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, GraduationCap, School, BookOpen, 
  CalendarCheck, FileText, CalendarDays, Clock, PenTool, 
  BarChart3, MessageSquare, Bell, FolderOpen, Settings, 
  Database, Award, X, Scale, Activity, Medal, ShieldAlert, 
  LayoutGrid, Compass, AlertTriangle, LayoutTemplate, Crown, 
  UserCircle, UserCog, Calculator, Network, HeartPulse, Sparkles, 
  MonitorPlay, Target, Wand2, MonitorUp, ShieldCheck, FileKey, 
  ScanLine, FileSignature, UserSearch, CreditCard, ClipboardList, 
  Globe, ScrollText, Star, Shield, LogOut, Search, ChevronDown
} from 'lucide-react';

// ==========================================
// 🗂️ قاعدة بيانات الروابط المركزية
// ==========================================
const navigationGroups = [
  {
    title: 'اللوحات الرئيسية', icon: LayoutDashboard, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    items: [
      { name: 'لوحة التحكم', href: '/', icon: LayoutDashboard },
      { name: 'الرئيسية (الحرم)', href: '/', icon: Compass },
      { name: 'إدارة الحرم', href: '/admin/campus-control', icon: Globe },
      { name: 'ملف الإدارة', href: '/admin/profile', icon: Crown }, 
      { name: 'ملفي الشخصي (CV)', href: '/teachers/profile', icon: UserCircle }, 
      { name: 'الفريق الإداري', href: '/admin/staff', icon: UserCog },
    ]
  },
  {
    title: 'شؤون أكاديمية وطلابية', icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    items: [
      { name: 'الهيكل الأكاديمي', href: '/hierarchy', icon: Network },
      { name: 'الطلاب', href: '/students', icon: Users },
      { name: 'الفصول', href: '/classes', icon: School },
      { name: 'المواد الدراسية', href: '/subjects', icon: BookOpen },
      { name: 'أولياء الأمور', href: '/parents', icon: Users },
    ]
  },
  {
    title: 'شؤون المعلمين (HR)', icon: UserCog, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20',
    items: [
      { name: 'المعلمين', href: '/teachers', icon: GraduationCap },
      { name: 'متابعة المعلمين', href: '/admin/teachers-monitor', icon: Users },
      { name: 'تقرير المعلمين', href: '/admin/teachers-report', icon: FileText },
      { name: 'تقييم المعلمين (الإدارة)', href: '/admin/evaluations', icon: Activity },
      { name: 'تقييم الطلاب للمُعلمين', href: '/admin/student-evaluations', icon: Star },
      { name: 'تعيينات المعلمين', href: '/admin/teacher-assignments', icon: BookOpen },
    ]
  },
  {
    title: 'الكنترول والامتحانات (VIP)', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
    items: [
      { name: 'فريق الكنترول', href: '/admin/control-team', icon: ShieldCheck },
      { name: 'كنترول اللجان', href: '/admin/exam-committees', icon: ShieldCheck },
      { name: 'رادار الكنترول', href: '/admin/control-radar', icon: ScanLine },
      { name: 'اللوائح الأكاديمية', href: '/admin/grading-rules', icon: Scale }, // 🚀 رابط اللوائح للمدير
      { name: 'الغلاف الرقمي', href: '/hod/digital-cover', icon: FileSignature },
      { name: 'مسار إنجاز الكنترول', href: '/admin/exam-pipeline', icon: BarChart3 },
      { name: 'جداول الاختبارات', href: '/admin/exam-timetables', icon: CalendarDays },
      { name: 'الاختبارات والدرجات', href: '/exams', icon: FileText },
      { name: 'مستكشف الطلاب 360', href: '/admin/student-360', icon: UserSearch },
      { name: 'وثائق التخرج', href: '/admin/graduation-docs', icon: ScrollText },
      { name: 'نماذج الإجابات', href: '/admin/exam-answer-keys', icon: FileKey },
      { name: 'تقرير غياب الاختبارات', href: '/admin/exam-attendance-report', icon: FileText },
    ]
  },
  {
    title: 'الانضباط المدرسي', icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
    items: [
      { name: 'الرادار الرقمي', href: '/admin/live-monitor', icon: Activity },
      { name: 'رصد الغياب الآلي', href: '/admin/teacher-attendance', icon: ShieldAlert },
      { name: 'إنذارات الغياب', href: '/admin/absence-warnings', icon: AlertTriangle },
      { name: 'الحضور والغياب', href: '/attendance', icon: CalendarCheck },
      { name: 'مراجعة الأعذار', href: '/admin/excuses', icon: HeartPulse },
      { name: 'قرارات الخصم', href: '/admin/absence-deductions', icon: Scale },
    ]
  },
  {
    title: 'العمليات والساحة', icon: CalendarDays, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
    items: [
      { name: 'البوصلة الأكاديمية', href: '/student/academic-compass', icon: Target }, // 🚀 رابط البوصلة للطلاب
      { name: 'العمليات المركزية', href: '/admin/exam-live-dashboard', icon: Activity },
      { name: 'استوديو الهويات', href: '/admin/id-cards', icon: CreditCard },
      { name: 'رادار البوابة', href: '/admin/gate-radar', icon: ScanLine },
      { name: 'سجل البوابة', href: '/admin/gate-logs', icon: ClipboardList },
      { name: 'رادار المراقب', href: '/teacher/exam-radar', icon: ScanLine },
      { name: 'سجل الدرجات', href: '/gradebook', icon: Calculator },
      { name: 'الجدول الدراسي', href: '/schedule', icon: CalendarDays },
      { name: 'محرك الجدولة الذكي', href: '/admin/auto-schedule', icon: Wand2 },
      { name: 'شاشة العرض المركزية', href: '/schedules-view', icon: MonitorUp },
      { name: 'أوقات الحصص', href: '/admin/periods', icon: Clock },
      { name: 'الواجبات', href: '/assignments', icon: PenTool },
      { name: 'ساحة التدريب', href: '/arena', icon: Target },
      { name: 'مراقبة الساحة', href: '/arena-monitor', icon: MonitorPlay },
      { name: 'الواجبات بالذكاء الاصطناعي', href: '/ai-assignments-v2', icon: Sparkles },
    ]
  },
  {
    title: 'التواصل والنظام', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20',
    items: [
      { name: 'الرسائل', href: '/messages', icon: MessageSquare },
      { name: 'إدارة المنتديات', href: '/admin/forums-management', icon: LayoutGrid },
      { name: 'هيدر المنتديات', href: '/admin/forum-hero', icon: LayoutTemplate },
      { name: 'المنتديات', href: '/forums', icon: MessageSquare },
      { name: 'الإعلانات', href: '/announcements', icon: Bell },
      { name: 'التقارير', href: '/reports', icon: BarChart3 },
      { name: 'سجل الأداء', href: '/student/performance', icon: Award },
      { name: 'إدارة الأوسمة', href: '/admin/badges', icon: Medal },
      { name: 'مصنع الدروع', href: '/admin/memorial-shields', icon: Shield }, 
      { name: 'إدارة الصلاحيات', href: '/admin/settings/roles', icon: ShieldCheck },
      { name: 'المستندات', href: '/documents', icon: FolderOpen },
      { name: 'استيراد البيانات', href: '/seed', icon: Database },
      { name: 'تقرير التدقيق', href: '/report', icon: FileText },
      { name: 'الإعدادات', href: '/settings', icon: Settings },
    ]
  }
];

export default function GeminiNavigation() {
  const { user, authRole, userRole, signOut, isChecking } = useAuth() as any;
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [staffPermissions, setStaffPermissions] = useState<any>({});
  const [dynamicRolePermissions, setDynamicRolePermissions] = useState<any>(null);

  useEffect(() => {
    async function fetchPlatformSettingsAndPerms() {
      // 1. جلب صلاحيات الكادر (Staff) إن وجد
      if (userRole === 'staff' && user?.id) {
        const { data: staffData } = await supabase.from('school_staff').select('permissions').eq('id', user.id).maybeSingle();
        if (staffData) setStaffPermissions(staffData.permissions || {});
      }

      // 2. جلب الصلاحيات الديناميكية للرتب من قاعدة البيانات
      try {
        const { data: settingsData } = await supabase.from('platform_settings').select('role_permissions').single();
        if (settingsData?.role_permissions) {
          setDynamicRolePermissions(settingsData.role_permissions);
        }
      } catch (err) {
        console.warn("Dynamic permissions fetch failed, using internal safety logic.");
      }
    }
    fetchPlatformSettingsAndPerms();
  }, [userRole, user?.id]);
  
  const isGlobalWatcher = userRole === 'staff' && staffPermissions['global_read_only'] === true;

  useEffect(() => { setMounted(true); }, []);
  if (!mounted || isChecking || !authRole) return null;

  // ==========================================
  // 🛡️ فلترة الصلاحيات الهجينة (Hybrid RBAC Logic)
  // ==========================================
  const isItemVisible = (item: any) => {
    const r = authRole;
    const n = item.name;

    // 1. روابط "العامود الفقري" للنظام (مفتوحة دائماً للجميع)
    if (['الرئيسية (الحرم)', 'لوحة التحكم', 'الرسائل', 'الإعلانات'].includes(n)) return true;

    // 2. المدير والإدارة دائماً يرون كل شيء (All Access)
    if (r === 'admin' || r === 'management' || isGlobalWatcher) return true;

    // 3. التحقق من الصلاحيات الديناميكية المسجلة في DB من قبل المدير
    if (dynamicRolePermissions && dynamicRolePermissions[r]) {
      return dynamicRolePermissions[r].includes(n);
    }

    // 4. (Strict Fallback) في حال عدم وجود إعدادات ديناميكية، نطبق المنطق الداخلي الصارم
    if (r === 'teacher') {
      const internalTeacherSafety = [
        'ملفي الشخصي (CV)', 'الفصول', 'الحضور والغياب', 'سجل الدرجات', 'الاختبارات والدرجات',
        'الواجبات', 'مراقبة الساحة', 'الجدول الدراسي', 'شاشة العرض المركزية', 'المنتديات'
      ];
      return internalTeacherSafety.includes(n);
    }

    if (r === 'student') {
      const internalStudentSafety = [
        'الجدول الدراسي', 'الاختبارات والدرجات', 'الواجبات', 'ساحة التدريب', 'سجل الأداء', 
        'شاشة العرض المركزية', 'المنتديات', 'البوصلة الأكاديمية' // 🚀 تم السماح برؤية البوصلة
      ];
      return internalStudentSafety.includes(n);
    }

    if (r === 'parent') {
      const internalParentSafety = [
        'الجدول الدراسي', 'الاختبارات والدرجات', 'الواجبات', 'سجل الأداء', 'الحضور والغياب', 
        'شاشة العرض المركزية', 'البوصلة الأكاديمية' // 🚀 تم السماح برؤية البوصلة
      ];
      return internalParentSafety.includes(n);
    }

    return false;
  };

  const filteredGroups = navigationGroups.map(group => ({
    ...group, items: group.items.filter(isItemVisible)
  })).filter(group => group.items.length > 0);

  // ==========================================
  // ⚡ الروابط السريعة (Quick Links Dock)
  // ==========================================
  const getQuickLinks = () => {
    let dashboardHref = '/';
    if (authRole === 'student') dashboardHref = '/dashboard/student'; 
    else if (authRole === 'teacher') dashboardHref = '/dashboard/teacher'; 
    else if (authRole === 'parent') dashboardHref = '/dashboard/parent'; 
    else if (userRole === 'staff') dashboardHref = '/dashboard/staff'; 
    else if (authRole === 'admin' || authRole === 'management') dashboardHref = '/dashboard';

    const base = [
      { name: 'الرئيسية', href: dashboardHref, icon: LayoutDashboard, color: 'text-blue-400' },
      { name: 'الرسائل', href: '/messages', icon: MessageSquare, color: 'text-emerald-400' }
    ];

    if (authRole === 'admin' || authRole === 'management') {
      base.push({ name: 'الرادار', href: '/admin/live-monitor', icon: Activity, color: 'text-rose-400' });
      base.push({ name: 'الطلاب', href: '/admin/student-360', icon: Users, color: 'text-indigo-400' });
    } else if (authRole === 'teacher') {
      base.push({ name: 'الجدول', href: '/schedule', icon: CalendarDays, color: 'text-amber-400' });
      base.push({ name: 'الواجبات', href: '/assignments', icon: PenTool, color: 'text-purple-400' });
    } else if (authRole === 'student') {
      // 🚀 تم إضافة البوصلة للروابط السريعة للطلاب
      base.push({ name: 'البوصلة', href: '/student/academic-compass', icon: Target, color: 'text-purple-400' });
      base.push({ name: 'الجدول', href: '/schedule', icon: CalendarDays, color: 'text-amber-400' });
    }
    return base;
  };
  const quickLinks = getQuickLinks();

  return (
    <>
      {/* 💻 الكبسولة الطافية (Desktop) */}
      <motion.div 
        initial={false} animate={{ width: isExpanded ? 240 : 80 }}
        onHoverStart={() => setIsExpanded(true)} onHoverEnd={() => setIsExpanded(false)}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex fixed top-6 bottom-6 right-6 z-40 flex-col bg-[#02040a]/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="p-4 shrink-0 flex items-center justify-center border-b border-white/5 relative z-10 bg-[#0f1423]/40">
          <button onClick={() => setIsHubOpen(true)} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-400/30 cursor-pointer shadow-inner relative group hover:scale-110 transition-all duration-300">
            <LayoutGrid className="w-6 h-6 text-indigo-400 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col gap-3 px-3 relative z-10">
          {quickLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href} className="relative group">
                <div className={`flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/10 shadow-inner border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
                  <link.icon className={`w-6 h-6 shrink-0 transition-colors drop-shadow-md ${isActive ? 'text-white' : `${link.color} opacity-80 group-hover:opacity-100`}`} />
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className={`font-black text-sm whitespace-nowrap drop-shadow-sm ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {link.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {isActive && <motion.div layoutId="capsule-active" className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" />}
              </Link>
            );
          })}
        </div>

        <div className="p-4 shrink-0 border-t border-white/5 relative z-10 bg-[#0f1423]/40">
          <button onClick={signOut} className="w-full flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-300 group text-slate-400 hover:text-rose-400">
            <LogOut className="w-6 h-6 shrink-0" />
            <AnimatePresence>
              {isExpanded && <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="font-black text-sm whitespace-nowrap">الخروج</motion.span>}
            </AnimatePresence>
          </button>
        </div>
      </motion.div>

      {/* 📱 الجزيرة السفلية (Mobile) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="bg-[#02040a]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-around shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {quickLinks.slice(0, 4).map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link key={link.name} href={link.href} className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl group">
                {isActive && <motion.div layoutId="dock-active" className="absolute inset-0 bg-white/10 border border-white/10 rounded-2xl shadow-inner z-0" />}
                <link.icon className={`w-6 h-6 relative z-10 transition-colors drop-shadow-md ${isActive ? 'text-white' : `${link.color} opacity-70`}`} />
                <span className={`text-[8px] font-black mt-1 relative z-10 drop-shadow-sm ${isActive ? 'text-white' : 'text-slate-500'}`}>{link.name}</span>
              </Link>
            );
          })}
          <button onClick={() => setIsHubOpen(true)} className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl group bg-indigo-500/20 border border-indigo-500/30 shadow-inner">
            <LayoutGrid className="w-6 h-6 text-indigo-400" />
            <span className="text-[8px] font-black mt-1 text-indigo-300">الكل</span>
          </button>
        </div>
      </div>

      {/* 🌌 منصة جيمناي المركزية (Central Hub) */}
      <AnimatePresence>
        {isHubOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" dir="rtl">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#02040a]/70 backdrop-blur-2xl" onClick={() => setIsHubOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-[1400px] h-[90vh] bg-[#0f1423]/60 border border-white/10 rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
              
              <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 bg-[#02040a]/40">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shadow-inner"><Sparkles className="w-8 h-8 text-indigo-400" /></div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">بوابة الأنظمة المركزية</h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">جميع صلاحياتك وأدواتك في مكان واحد.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="ابحث عن نظام..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#02040a]/60 border border-white/10 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 shadow-inner" />
                  </div>
                  <button onClick={() => setIsHubOpen(false)} className="p-3.5 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-2xl border border-white/10 shadow-inner"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGroups.map((group, idx) => {
                    const searchedItems = group.items.filter(item => item.name.includes(searchQuery));
                    if (searchedItems.length === 0) return null;
                    return (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={group.title} className="bg-[#02040a]/40 border border-white/5 rounded-[2rem] p-6 shadow-inner flex flex-col">
                        <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
                          <div className={`p-2.5 rounded-xl ${group.bg} border ${group.border}`}><group.icon className={`w-5 h-5 ${group.color}`} /></div>
                          <h3 className="text-base font-black text-white">{group.title}</h3>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          {searchedItems.map((item) => (
                            <Link key={item.name} href={item.href} onClick={() => setIsHubOpen(false)} className="group/link flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all">
                              <item.icon className="w-4 h-4 text-slate-500 group-hover/link:text-white" />
                              <span className="text-sm font-bold text-slate-300 group-hover/link:text-white">{item.name}</span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </>
  );
}
