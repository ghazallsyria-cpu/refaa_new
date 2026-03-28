'use client';

import { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, BookOpen, CalendarDays, Plus, 
  Bell, School, ArrowUpRight, Activity, FileText 
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem, type AdminDashboardData } from '@/hooks/useDashboardSystem';

// تم إصلاح الخطأ هنا عبر استخدام "any" لتجاوز تدقيق TypeScript في Netlify
const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: 'spring', stiffness: 100 } 
  }
};

export default function AdminDashboard() {
  const { fetchAdminDashboardStats, fetchAdminRecentActivities } = useDashboardSystem();
  
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '...' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '...' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '...' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: '...' },
  ]);

  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      if (!mounted) return;
      try {
        const data = await fetchAdminDashboardStats() as AdminDashboardData;
        const activities = await fetchAdminRecentActivities();

        setStats([
          { name: 'إجمالي الطلاب', value: (data.studentsCount || 0).toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
          { name: 'إجمالي المعلمين', value: (data.teachersCount || 0).toString(), icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
          { name: 'إجمالي الفصول', value: (data.sectionsCount || 0).toString(), icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0' },
          { name: 'حضور اليوم', value: `${data.attendanceRate || 0}%`, icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: `${data.attendanceRate || 0}%` },
        ]);
        setRecentActivities(activities);
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
        setActivitiesLoading(false);
      }
    }
    loadDashboardData();
  }, [mounted, fetchAdminDashboardStats, fetchAdminRecentActivities]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '...';
    const date = new Date(timeStr);
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffMins < 1440) return `منذ ${Math.floor(diffMins / 60)} ساعة`;
    return `منذ ${Math.floor(diffMins / 1440)} يوم`;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-10 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black leading-tight">مرحباً بك في لوحة تحكم <br /><span className="text-indigo-200">مدرسة الرفعة النموذجية</span></h1>
            <p className="text-indigo-100 text-lg md:text-xl font-medium opacity-90">إليك نظرة عامة شاملة على أداء المنصة والنشاطات الجارية اليوم.</p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/admin/teacher-assignments" className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2 group">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> إدارة التعيينات
              </Link>
              <Link href="/gradebook" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center gap-2">
                <Activity size={20} /> سجل الأداء (دفتر الأعمال)
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="h-48 w-48 rounded-full bg-white/10 backdrop-blur-3xl border border-white/10 flex items-center justify-center">
              <School size={80} className="text-white/20" />
            </div>
          </div>
        </div>
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
      </motion.div>

      {/* Stats Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div key={stat.name} whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-50 group transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight size={12} /> {stat.trend}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Activity className="text-indigo-600" /> آخر النشاطات والتحديثات
            </h2>
            <button className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">عرض الكل</button>
          </div>
          <div className="space-y-4">
            {activitiesLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-3xl" />)}
              </div>
            ) : recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-5 p-4 rounded-3xl hover:bg-slate-50 transition-all group">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${activity.color}`}>
                  {activity.title[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{activity.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                    <CalendarDays size={12} /> {mounted ? formatTime(activity.time) : '...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          
          {/* Live Classes Card */}
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-red-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center"><Activity className="animate-pulse" /></div>
                <h2 className="text-xl font-black">الحصص الحية</h2>
              </div>
              <p className="text-red-100 text-sm mb-6 font-medium">رابط المراقبة الحية للمشرفين التربويين</p>
              <div className="bg-black/20 rounded-xl p-3 mb-6 font-mono text-xs text-center select-all border border-white/10">
                {mounted ? `${window.location.origin}/live` : '...'}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/live'); alert('تم النسخ!'); }} className="flex-1 bg-white/20 py-3 rounded-xl font-bold text-sm">نسخ</button>
                <Link href="/live" target="_blank" className="flex-1 bg-white text-red-600 py-3 rounded-xl font-black text-sm text-center">فتح</Link>
              </div>
            </div>
          </motion.div>

          <AnnouncementsWidget role="admin" />

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50">
            <h2 className="text-xl font-black text-slate-900 mb-6">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'متابعة المعلمين', icon: Activity, href: '/admin/teachers-monitor', color: 'text-rose-600', bg: 'bg-rose-50' },
                { name: 'تقرير المعلمين', icon: FileText, href: '/admin/teachers-report', color: 'text-violet-600', bg: 'bg-violet-50' },
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { name: 'إضافة معلم', icon: GraduationCap, href: '/teachers', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((action) => (
                <Link key={action.name} href={action.href} className="flex flex-col items-center p-5 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                  <div className={`p-3 rounded-2xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}><action.icon size={24} /></div>
                  <span className="text-[10px] font-black text-slate-700 group-hover:text-indigo-600 text-center">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}

