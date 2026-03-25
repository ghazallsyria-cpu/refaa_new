'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, BookOpen, CalendarDays, Plus, Bell, School, ArrowUpRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

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
  const [stats, setStats] = useState([
    { name: 'إجمالي الطلاب', value: '...', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
    { name: 'إجمالي المعلمين', value: '...', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
    { name: 'إجمالي الفصول', value: '...', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0' },
    { name: 'حضور اليوم', value: '...', icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: '92%' },
  ]);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [
          { count: studentsCount },
          { count: teachersCount },
          { count: sectionsCount },
          { data: attendanceToday },
          { data: recentStudents },
          { data: recentDocs },
          { data: recentExams },
          { data: recentNotifs }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('sections').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('status').eq('date', today),
          supabase.from('students').select('full_name, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('documents').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('exams').select('title, created_at').order('created_at', { ascending: false }).limit(2),
          supabase.from('notifications').select('title, created_at').eq('type', 'announcement').order('created_at', { ascending: false }).limit(2)
        ]);

        const attendanceRate = attendanceToday && attendanceToday.length > 0
          ? Math.round((attendanceToday.filter(a => a.status === 'present' || a.status === 'late').length / attendanceToday.length) * 100)
          : 0;

        setStats([
          { name: 'إجمالي الطلاب', value: (studentsCount || 0).toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12%' },
          { name: 'إجمالي المعلمين', value: (teachersCount || 0).toString(), icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+3' },
          { name: 'إجمالي الفصول', value: (sectionsCount || 0).toString(), icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', trend: '0' },
          { name: 'حضور اليوم', value: `${attendanceRate}%`, icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', trend: `${attendanceRate}%` },
        ]);

        // Combine and sort activities
        const activities: any[] = [
          ...(recentStudents || []).map(s => ({ title: `إضافة الطالب ${s.full_name}`, time: s.created_at, type: 'students', color: 'bg-indigo-100 text-indigo-600' })),
          ...(recentDocs || []).map(d => ({ title: `رفع مستند جديد: ${d.title}`, time: d.created_at, type: 'docs', color: 'bg-emerald-100 text-emerald-600' })),
          ...(recentExams || []).map(e => ({ title: `إنشاء اختبار جديد: ${e.title}`, time: e.created_at, type: 'exams', color: 'bg-amber-100 text-amber-600' })),
          ...(recentNotifs || []).map(n => ({ title: `إعلان جديد: ${n.title}`, time: n.created_at, type: 'announcement', color: 'bg-sky-100 text-sky-600' }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

        setRecentActivities(activities);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-12"
    >
      {/* Welcome Header */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 md:p-12 text-white shadow-2xl shadow-indigo-200"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-5xl font-bold tracking-tight leading-tight"
            >
              مرحباً بك في لوحة تحكم <br />
              <span className="text-indigo-200">مدرسة الرفعة النموذجية</span>
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-indigo-100 text-lg md:text-xl font-medium opacity-90"
            >
              إليك نظرة عامة شاملة على أداء المنصة والنشاطات الجارية اليوم.
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link href="/admin/teacher-assignments" className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2 group">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" /> إدارة التعيينات
              </Link>
              <Link href="/report" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-2">
                <Activity className="h-5 w-5" /> تقرير التدقيق
              </Link>
              <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-2">
                <Bell className="h-5 w-5" /> التنبيهات الأخيرة
              </button>
            </motion.div>
          </div>
          <div className="hidden lg:block">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.5 }}
              className="h-48 w-48 rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 flex items-center justify-center relative"
            >
              <School className="h-24 w-24 text-white/40" />
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20"></div>
            </motion.div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"></div>
      </motion.div>

      {/* Stats Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.name} 
            whileHover={{ y: -5 }}
            className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm ring-1 ring-slate-200/50 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform shadow-sm`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                {stat.trend}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-500">{stat.name}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{stat.value}</p>
            </div>
            <div className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full ${stat.bg} opacity-0 group-hover:opacity-10 transition-opacity blur-2xl`}></div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm ring-1 ring-slate-200/50"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Activity className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">آخر النشاطات والتحديثات</h2>
            </div>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">عرض الكل</button>
          </div>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <div className="text-center py-10 text-slate-400">لا توجد نشاطات حديثة</div>
            ) : (
              recentActivities.map((activity, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ x: -5 }}
                  className="flex items-center gap-5 p-4 rounded-3xl hover:bg-slate-50/50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer"
                >
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${activity.color} group-hover:scale-105 transition-transform shadow-sm`}>
                    {activity.title[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatTime(activity.time)}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions & Notifications */}
        <div className="space-y-8">
          
          {/* Announcements Widget */}
          <AnnouncementsWidget role="admin" />

          <motion.div 
            variants={itemVariants}
            className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-sm ring-1 ring-slate-200/50"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6">إجراءات سريعة</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'إضافة طالب', icon: Users, href: '/students', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { name: 'إضافة معلم', icon: GraduationCap, href: '/teachers', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { name: 'رفع ملف', icon: BookOpen, href: '/documents', color: 'text-amber-600', bg: 'bg-amber-50' },
                { name: 'إرسال تنبيه', icon: Bell, href: '/announcements', color: 'text-sky-600', bg: 'bg-sky-50' },
              ].map((action) => (
                <Link 
                  key={action.name} 
                  href={action.href} 
                  className="flex flex-col items-center justify-center p-5 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-200 transition-all group"
                >
                  <div className={`p-3 rounded-2xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{action.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group cursor-pointer"
          >
            <div className="relative z-10">
              <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-900/20">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-4">الدعم الفني</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                هل تواجه مشكلة في استخدام المنصة؟ فريق الدعم الفني متاح لمساعدتك على مدار الساعة.
              </p>
              <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/40 active:scale-95">
                تواصل معنا
              </button>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
