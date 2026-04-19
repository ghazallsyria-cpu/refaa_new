'use client';

import { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell, 
  School, ArrowUpRight, Activity, FileText, Target, ShieldCheck, Loader2 , Crown
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { useAuth } from '@/context/auth-context';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
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
  const { authRole, isChecking } = useAuth();

  const { fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats } = useDashboardSystem();
  
  // 🚀 تحديث الألوان الافتراضية لتتناسب مع الثيم الداكن الفخم
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', trend: '+12%' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', trend: '+3' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', trend: '0' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', trend: '92%' },
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
    if (authRole !== 'admin' && authRole !== 'management') return;

    async function fetchDashboardStats() {
      try {
        const data = await fetchAdminDashboardStats();

        setStats([
          { name: 'إجمالي الطلاب', value: data.studentsCount.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', trend: '+12%' },
          { name: 'إجمالي المعلمين', value: data.teachersCount.toString(), icon: GraduationCap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', trend: '+3' },
          { name: 'إجمالي الفصول', value: data.sectionsCount.toString(), icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', trend: '0' },
          { name: 'حضور اليوم', value: `${data.attendanceRate}%`, icon: CalendarDays, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', trend: `${data.attendanceRate}%` },
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
  }, [authRole, fetchAdminDashboardStats, fetchAdminRecentActivities, fetchTrackSelectionStats]);

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

  // 🚀 شاشة حماية الوصول والتحميل بالثيم الملكي
  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldCheck className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚀 منع المتطفلين برسالة فخمة
  if (authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة لفريق الإدارة العليا فقط.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest">جاري تحميل لوحة القيادة...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 sm:space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden font-cairo"
      dir="rtl"
    >
      {/* 🚀 Welcome Header (التحفة المعمارية الفنية) */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#0a0d16] via-[#0f1423] to-[#02040a] p-6 sm:p-10 lg:p-12 text-white border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-5 max-w-2xl text-center lg:text-right w-full">
            <div className="inline-flex items-center justify-center lg:justify-start gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] mx-auto lg:mx-0 text-amber-400">
              <Crown className="w-4 h-4" />
              <span>القيادة العليا</span>
            </div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-lg"
            >
              مرحباً بك في منصة <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">مدرسة الرفعة النموذجية</span>
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-slate-400 text-sm sm:text-base lg:text-lg font-bold opacity-90 mx-auto lg:mx-0 max-w-xl leading-relaxed"
            >
              إليك نظرة عامة وشاملة على أداء المنصة والنشاطات الجارية اليوم. تحكم بكل تفاصيل المدرسة من مركز القيادة.
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 justify-center lg:justify-start"
            >
              <Link href="/admin/teacher-assignments" className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 px-6 py-3.5 rounded-2xl font-black hover:from-amber-400 hover:to-yellow-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 group w-full sm:w-auto active:scale-95 border border-amber-300/50">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> إدارة التعيينات
              </Link>
              <Link href="/report" className="glass-panel hover:bg-white/10 text-white px-6 py-3.5 rounded-2xl font-black transition-all flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95">
                <Activity className="h-5 w-5 text-amber-400" /> تقرير التدقيق
              </Link>
            </motion.div>
          </div>
          <div className="hidden lg:flex justify-center shrink-0 relative">
            <div className="absolute inset-0 bg-amber-500/20 blur-[80px] rounded-full"></div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.5 }}
              className="h-40 w-40 sm:h-48 sm:w-48 rounded-full bg-[#0f1423]/80 backdrop-blur-3xl border-2 border-amber-500/30 flex items-center justify-center relative shadow-[0_0_50px_rgba(245,158,11,0.2)]"
            >
              <School className="h-20 w-20 sm:h-24 sm:w-24 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_10s_linear_infinite] opacity-50"></div>
              <div className="absolute inset-[-10px] rounded-full border border-dashed border-amber-500/20 animate-[spin_15s_linear_infinite_reverse] opacity-30"></div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 🚀 Stats Bento Grid (البطاقات الزجاجية المدخنة) */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.name} 
            whileHover={{ y: -5 }}
            className="glass-panel rounded-[1.5rem] lg:rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start sm:items-center justify-between mb-4 relative z-10 flex-col sm:flex-row gap-3 sm:gap-0">
              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color} ${stat.border} border group-hover:scale-110 transition-transform shadow-inner shrink-0`}>
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md" />
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full shadow-sm">
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                <span dir="ltr">{stat.trend}</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-1 tracking-tight drop-shadow-md">{stat.value}</p>
            </div>
            <div className={`absolute -bottom-6 -right-6 h-32 w-32 rounded-full ${stat.bg} opacity-0 group-hover:opacity-20 transition-opacity blur-3xl pointer-events-none`}></div>
          </motion.div>
        ))}
      </motion.div>

      {/* 🚀 Track Selection Results */}
      {trackStats && trackStats.total > 0 && (
        <motion.div 
          variants={itemVariants}
          className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 sm:p-3.5 bg-amber-500/10 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white drop-shadow-sm">نتائج تحديد المسار (الصف العاشر)</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 relative z-10">
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-[#0f1423]/80 border border-blue-500/20 shadow-inner hover:border-blue-500/40 transition-all group">
              <p className="text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest mb-1">المسار العلمي</p>
              <p className="text-3xl sm:text-4xl font-black text-white group-hover:scale-105 transition-transform origin-right drop-shadow-md">{trackStats.scientific}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-bold">طالب اختاروا هذا المسار</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-[#0f1423]/80 border border-emerald-500/20 shadow-inner hover:border-emerald-500/40 transition-all group">
              <p className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-widest mb-1">المسار الأدبي</p>
              <p className="text-3xl sm:text-4xl font-black text-white group-hover:scale-105 transition-transform origin-right drop-shadow-md">{trackStats.literary}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-bold">طالب اختاروا هذا المسار</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-[#0f1423]/80 border border-white/10 shadow-inner hover:border-amber-500/30 transition-all group">
              <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي المشاركين</p>
              <p className="text-3xl sm:text-4xl font-black text-amber-400 group-hover:scale-105 transition-transform origin-right drop-shadow-md">{trackStats.total}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-bold">إجمالي التحديدات</p>
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
            <div className="h-4 sm:h-5 w-full bg-[#02040a] rounded-full overflow-hidden flex shadow-inner border border-white/5">
              <div className="h-full bg-blue-500 transition-all duration-1000 relative shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(trackStats.scientific / trackStats.total) * 100}%` }}>
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
              </div>
              <div className="h-full bg-emerald-500 transition-all duration-1000 relative shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(trackStats.literary / trackStats.total) * 100}%` }}></div>
            </div>
            <div className="mt-3 flex justify-between text-[10px] sm:text-xs font-black">
              <span className="text-blue-400 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">علمي ({Math.round((trackStats.scientific / trackStats.total) * 100)}%)</span>
              <span className="text-emerald-400 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">أدبي ({Math.round((trackStats.literary / trackStats.total) * 100)}%)</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🚀 Main Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        
        {/* 🌟 Column 1: Wide Area - Recent Activity */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 glass-panel rounded-[2rem] lg:rounded-[2.5rem] p-5 sm:p-6 lg:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[80px] -ml-10 -mt-10 pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 relative z-10 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white drop-shadow-sm">آخر النشاطات والتحديثات</h2>
            </div>
            <button className="text-[10px] sm:text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-5 py-2.5 rounded-xl transition-colors border border-amber-500/20 shrink-0 w-full sm:w-auto active:scale-95 hover:bg-amber-500/20">
              عرض الكل
            </button>
          </div>
          
          <div className="space-y-3 sm:space-y-4 relative z-10">
            {activitiesLoading ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#0f1423]/50">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/10 shrink-0"></div>
                    <div className="flex-1 space-y-2 sm:space-y-3">
                      <div className="h-3 sm:h-4 bg-white/10 rounded w-3/4"></div>
                      <div className="h-2 sm:h-3 bg-white/5 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-[#0f1423]/50 rounded-2xl sm:rounded-3xl border border-dashed border-white/10">
                <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm sm:text-base font-bold text-slate-400">لا توجد نشاطات حديثة</p>
              </div>
            ) : (
              recentActivities.map((activity, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: -5 }}
                  className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#0f1423]/60 hover:bg-[#0f1423] transition-all border border-white/5 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] group"
                >
                  <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 ${activity.color} border border-current opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-inner bg-black/20`}>
                    {activity.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* 🚀 الشرط الذكي: تحويل اسم المعلم إلى رابط فخم إذا وجد معرّف المعلم */}
                    {activity.teacher_id ? (
                       <Link href={`/teachers/${activity.teacher_id}`} className="text-sm sm:text-base font-black text-white hover:text-amber-400 transition-colors truncate block drop-shadow-sm decoration-amber-500/30 hover:underline underline-offset-4">
                         {activity.title}
                       </Link>
                    ) : (
                       <p className="text-sm sm:text-base font-black text-white group-hover:text-amber-400 transition-colors truncate drop-shadow-sm">{activity.title}</p>
                    )}
                    
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1.5 sm:mt-2 flex items-center gap-1.5 bg-[#02040a] w-fit px-2.5 py-1 rounded-lg border border-white/5 shadow-inner">
                      <CalendarDays className="h-3 w-3 shrink-0 text-slate-500" />
                      {mounted ? formatTime(activity.time) : '...'}
                    </p>
                  </div>
                  {activity.teacher_id ? (
                     <Link href={`/teachers/${activity.teacher_id}`} className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 shadow-sm">
                       <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                     </Link>
                  ) : (
                     <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 border border-white/10 shadow-sm">
                       <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                     </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* 🌟 Column 2: Narrow Area - Widgets */}
        <div className="space-y-6 lg:space-y-8 w-full">
          
          {/* Live Classes Card (Royal Edition) */}
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-br from-[#1a1200] via-[#0f0a00] to-[#02040a] rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 text-white border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden group hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] transition-all"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-amber-500/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner border border-amber-500/40 shrink-0">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 animate-pulse" />
                </div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-amber-500 drop-shadow-md">الرادار الرقمي الحصري</h2>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mb-5 sm:mb-6 font-bold leading-relaxed">
                رابط المراقبة الحية للمشرفين لمتابعة تواجد الطلاب والمعلمين (بدون تسجيل دخول)
              </p>
              <div className="bg-black/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-5 sm:mb-6 font-mono text-[10px] sm:text-sm text-center select-all border border-amber-500/20 shadow-inner overflow-hidden text-ellipsis whitespace-nowrap text-amber-100">
                {typeof window !== 'undefined' ? `${window.location.origin}/live` : '.../live'}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/live` : '');
                    alert('تم نسخ الرابط بنجاح!');
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs sm:text-sm backdrop-blur-md border border-white/10 active:scale-95"
                >
                  نسخ الرابط
                </button>
                <Link 
                  href="/admin/live-monitor"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black hover:from-amber-400 hover:to-yellow-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 border border-amber-300/50"
                >
                  فتح اللوحة
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-amber-500/10 blur-[60px] pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-700"></div>
          </motion.div>

          <AnnouncementsWidget authRole="admin" />

          {/* Quick Actions */}
          <motion.div 
            variants={itemVariants}
            className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8"
          >
            <h2 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-6 flex items-center gap-2 drop-shadow-sm">
               <Target className="w-5 h-5 text-amber-500" /> إجراءات سريعة
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { name: 'متابعة المعلمين', icon: Activity, href: '/admin/teachers-monitor', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                { name: 'تقرير المعلمين', icon: FileText, href: '/admin/teachers-report', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { name: 'تقرير المسارات', icon: Target, href: '/admin/students-track-report', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
              ].map((action) => (
                <Link 
                  key={action.name} 
                  href={action.href} 
                  className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#0f1423]/60 hover:bg-[#0f1423] border border-white/5 hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all group"
                >
                  <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${action.bg} ${action.color} border ${action.border} mb-2 sm:mb-3 group-hover:scale-110 group-hover:-translate-y-1 transition-transform shadow-inner`}>
                    <action.icon className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-md" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-300 group-hover:text-amber-400 transition-colors text-center">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Support (Royal Edition) */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="bg-[#02040a] rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden group cursor-pointer border border-white/10 hover:border-amber-500/40 transition-all"
          >
            <div className="relative z-10">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-amber-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner border border-amber-500/30">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
              </div>
              <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 text-white">الدعم الفني والكونسيرج</h2>
              <p className="text-slate-400 text-xs sm:text-sm mb-5 sm:mb-6 font-bold leading-relaxed">
                هل تحتاج لتدخل سريع أو مساعدة متقدمة؟ فريق الكونسيرج الفني متاح لخدمة الإدارة العليا 24/7.
              </p>
              <button className="w-full bg-white/5 text-amber-400 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black hover:bg-amber-500 hover:text-slate-950 transition-all shadow-sm active:scale-95 border border-amber-500/30 text-sm sm:text-base">
                تواصل مع الفريق
              </button>
            </div>
            <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-amber-500/10 blur-[60px] group-hover:bg-amber-500/20 transition-colors pointer-events-none"></div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
