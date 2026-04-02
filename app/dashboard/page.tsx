'use client';

import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell, School, ArrowUpRight, Activity, FileText, Target, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
};

export default function AdminDashboard() {
  const { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats } = useDashboardSystem();
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: '92%' },
  ]);
  const [trackStats, setTrackStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const data = await fetchAdminDashboardStats();

        setStats([
          { name: 'إجمالي الطلاب', value: data.studentsCount.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
          { name: 'إجمالي المعلمين', value: data.teachersCount.toString(), icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
          { name: 'إجمالي الفصول', value: data.sectionsCount.toString(), icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0' },
          { name: 'حضور اليوم', value: `${data.attendanceRate}%`, icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: `${data.attendanceRate}%` },
        ]);
      } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchRecentActivities() {
      try {
        const activities = await fetchAdminRecentActivities();
        setRecentActivities(activities);
      } catch (error) {
        console.error('Error fetching admin dashboard activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    }

    async function fetchTrackData() {
      try {
        const data = await fetchTrackSelectionStats();
        setTrackStats(data);
      } catch (error) {
        console.error('Error fetching track selection stats:', error);
      }
    }

    fetchDashboardStats();
    fetchRecentActivities();
    fetchTrackData();
  }, [fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '...';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return '...';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden"
      dir="rtl"
    >
      {/* 🚀 Welcome Header (التحفة المعمارية الفنية) */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 sm:p-12 text-white shadow-2xl shadow-indigo-200/50"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center sm:text-right w-full">
            <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 backdrop-blur-sm shadow-sm mx-auto sm:mx-0">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
              <span>لوحة تحكم الإدارة</span>
            </div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md"
            >
              مرحباً بك في منصة <br className="hidden sm:block" />
              <span className="text-indigo-200">مدرسة الرفعة النموذجية</span>
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-indigo-100 text-sm sm:text-base lg:text-lg font-bold opacity-90 mx-auto sm:mx-0 max-w-xl"
            >
              إليك نظرة عامة شاملة على أداء المنصة والنشاطات الجارية اليوم. تحكم بكل شيء من مكان واحد.
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 justify-center sm:justify-start"
            >
              <Link href="/admin/teacher-assignments" className="bg-white text-indigo-600 px-6 py-3.5 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 group w-full sm:w-auto active:scale-95">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> إدارة التعيينات
              </Link>
              <Link href="/report" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3.5 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95 shadow-sm">
                <Activity className="h-5 w-5" /> تقرير التدقيق
              </Link>
            </motion.div>
          </div>
          <div className="hidden lg:flex justify-center shrink-0">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.5 }}
              className="h-40 w-40 sm:h-48 sm:w-48 rounded-full bg-white/10 backdrop-blur-3xl border-4 border-white/20 flex items-center justify-center relative shadow-2xl"
            >
              <School className="h-20 w-20 sm:h-24 sm:w-24 text-white/60 drop-shadow-lg" />
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20"></div>
            </motion.div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl pointer-events-none"></div>
      </motion.div>

      {/* 🚀 Stats Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.name} 
            whileHover={{ y: -5 }}
            className="bg-white/90 backdrop-blur-xl rounded-[1.5rem] lg:rounded-[2rem] p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between group relative overflow-hidden transition-all hover:shadow-lg"
          >
            <div className="flex items-start sm:items-center justify-between mb-4 relative z-10 flex-col sm:flex-row gap-2 sm:gap-0">
              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform shadow-sm shrink-0`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full shadow-sm">
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                <span dir="ltr">{stat.trend}</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.name}</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-1 tracking-tight drop-shadow-sm">{stat.value}</p>
            </div>
            <div className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full ${stat.bg} opacity-0 group-hover:opacity-30 transition-opacity blur-2xl pointer-events-none`}></div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🚀 Track Selection Results */}
      {trackStats && trackStats.total > 0 && (
        <motion.div 
          variants={itemVariants}
          className="bg-white/90 backdrop-blur-xl rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-100 shadow-inner">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">نتائج تحديد المسار (الصف العاشر)</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-indigo-50 border border-indigo-100 shadow-sm hover:shadow-md transition-all group">
              <p className="text-xs sm:text-sm font-black text-indigo-600 uppercase tracking-widest mb-1">المسار العلمي</p>
              <p className="text-3xl sm:text-4xl font-black text-indigo-900 group-hover:scale-105 transition-transform origin-right">{trackStats.scientific}</p>
              <p className="text-[10px] sm:text-xs text-indigo-500 mt-2 font-bold">طالب اختاروا هذا المسار</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-all group">
              <p className="text-xs sm:text-sm font-black text-emerald-600 uppercase tracking-widest mb-1">المسار الأدبي</p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-900 group-hover:scale-105 transition-transform origin-right">{trackStats.literary}</p>
              <p className="text-[10px] sm:text-xs text-emerald-500 mt-2 font-bold">طالب اختاروا هذا المسار</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <p className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-widest mb-1">إجمالي المشاركين</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:scale-105 transition-transform origin-right">{trackStats.total}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-bold">إجمالي التحديدات</p>
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
            <div className="h-4 sm:h-5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000 relative" 
                style={{ width: `${(trackStats.scientific / trackStats.total) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
              </div>
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 relative" 
                style={{ width: `${(trackStats.literary / trackStats.total) * 100}%` }}
              ></div>
            </div>
            <div className="mt-3 flex justify-between text-[10px] sm:text-xs font-black">
              <span className="text-indigo-600 px-2 py-1 bg-indigo-50 rounded-md border border-indigo-100 shadow-sm">علمي ({Math.round((trackStats.scientific / trackStats.total) * 100)}%)</span>
              <span className="text-emerald-600 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100 shadow-sm">أدبي ({Math.round((trackStats.literary / trackStats.total) * 100)}%)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🚀 Main Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* 🌟 Column 1: Wide Area (Takes 2/3 on Desktop) - Recent Activity */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-[2rem] lg:rounded-[2.5rem] p-5 sm:p-6 lg:p-8 shadow-sm border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 relative z-10 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-inner">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">آخر النشاطات والتحديثات</h2>
            </div>
            <button className="text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors shadow-sm border border-indigo-100 shrink-0 w-full sm:w-auto">عرض الكل</button>
          </div>
          
          <div className="space-y-3 sm:space-y-4 relative z-10">
            {activitiesLoading ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 bg-slate-50/50">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-200 shrink-0"></div>
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="h-3 sm:h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-slate-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-slate-50 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200">
                <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm sm:text-base font-bold text-slate-500">لا توجد نشاطات حديثة</p>
              </div>
            ) : (
              recentActivities.map((activity, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: -5 }}
                  className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl hover:bg-indigo-50/30 transition-all border border-slate-100 hover:border-indigo-100 hover:shadow-sm group cursor-pointer"
                >
                  <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${activity.color} border border-current opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-sm`}>
                    {activity.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{activity.title}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 sm:mt-1.5 flex items-center gap-1.5 bg-slate-50 w-fit px-2 py-0.5 rounded-md border border-slate-100">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      {mounted ? formatTime(activity.time) : '...'}
                    </p>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 border border-slate-200 shadow-sm">
                    <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* 🌟 Column 2: Narrow Area (Takes 1/3 on Desktop) - Widgets */}
        <div className="space-y-6 lg:space-y-8 w-full">
          
          {/* Live Classes Card */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-br from-red-500 to-rose-600 rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-red-200 relative overflow-hidden group hover:shadow-2xl hover:shadow-red-300 transition-all"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 shrink-0">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse" />
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight">الحصص الحية</h2>
              </div>
              <p className="text-red-100 text-xs sm:text-sm mb-5 sm:mb-6 font-bold leading-relaxed">
                رابط المراقبة الحية للمشرفين التربويين (لا يحتاج تسجيل دخول)
              </p>
              <div className="bg-black/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 font-mono text-[10px] sm:text-sm text-center select-all border border-white/10 shadow-inner overflow-hidden text-ellipsis whitespace-nowrap">
                {typeof window !== 'undefined' ? `${window.location.origin}/live` : '.../live'}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/live` : '');
                    alert('تم نسخ الرابط بنجاح!');
                  }}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs sm:text-sm backdrop-blur-md border border-white/20 active:scale-95 shadow-sm"
                >
                  نسخ الرابط
                </button>
                <Link 
                  href="/live"
                  target="_blank"
                  className="flex-1 bg-white text-red-600 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black hover:bg-red-50 transition-all shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
                >
                  فتح اللوحة
                </Link>
              </div>
            </div>
            <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-white/10 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
          </motion.div>

          {/* Announcements Widget */}
          <AnnouncementsWidget authRole="admin" />

          {/* Quick Actions */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/90 backdrop-blur-xl rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-100"
          >
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-5 sm:mb-6 flex items-center gap-2">
               <Target className="w-5 h-5 text-indigo-600" /> إجراءات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { name: 'متابعة المعلمين', icon: Activity, href: '/admin/teachers-monitor', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                { name: 'تقرير المعلمين', icon: FileText, href: '/admin/teachers-report', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                { name: 'تقرير المسارات', icon: Target, href: '/admin/students-track-report', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
              ].map((action) => (
                <Link 
                  key={action.name} 
                  href={action.href} 
                  className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/80 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 transition-all group"
                >
                  <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${action.bg} ${action.color} border ${action.border} mb-2 sm:mb-3 group-hover:scale-110 group-hover:-translate-y-1 transition-transform shadow-sm`}>
                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-600 group-hover:text-indigo-600 transition-colors text-center">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Support */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="bg-slate-900 rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group cursor-pointer border border-slate-800"
          >
            <div className="relative z-10">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-indigo-900/50 border border-indigo-400">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4">الدعم الفني</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-5 sm:mb-6 font-bold leading-relaxed">
                هل تواجه مشكلة في استخدام المنصة؟ فريق الدعم الفني متاح لمساعدتك على مدار الساعة.
              </p>
              <button className="w-full bg-indigo-600 text-white py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/50 active:scale-95 border border-indigo-500 text-sm sm:text-base">
                تواصل معنا
              </button>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none"></div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
