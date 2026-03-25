'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, GraduationCap, School, BookOpen, 
  CalendarCheck, FileText, Activity, ArrowUpRight,
  Bell, MessageSquare, Sparkles, TrendingUp,
  ChevronRight, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboardHome() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    parents: 0,
    classes: 0,
    exams: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          { count: studentsCount },
          { count: teachersCount },
          { count: parentsCount },
          { count: classesCount },
          { count: examsCount },
          { data: announcements }
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('teachers').select('*', { count: 'exact', head: true }),
          supabase.from('parents').select('*', { count: 'exact', head: true }),
          supabase.from('classes').select('*', { count: 'exact', head: true }),
          supabase.from('exams').select('*', { count: 'exact', head: true }),
          supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(5)
        ]);

        setStats({
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          parents: parentsCount || 0,
          classes: classesCount || 0,
          exams: examsCount || 0,
        });
        
        setRecentAnnouncements(announcements || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'الطلاب', value: stats.students, icon: Users, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20', href: '/students', trend: '+12%' },
    { name: 'المعلمين', value: stats.teachers, icon: GraduationCap, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', href: '/teachers', trend: '+5%' },
    { name: 'أولياء الأمور', value: stats.parents, icon: Users, color: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/20', href: '/parents', trend: '+8%' },
    { name: 'الفصول', value: stats.classes, icon: School, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', href: '/classes', trend: '0%' },
    { name: 'الاختبارات', value: stats.exams, icon: FileText, color: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20', href: '/exams', trend: '+15%' },
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100/30"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-amber-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pt-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50/50 border border-indigo-100/50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              نظام مدرسة الرفعة الرقمي
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
              لوحة تحكم <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">الإدارة</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">مرحباً بك مجدداً، إليك نظرة سريعة على أداء المدرسة اليوم.</p>
          </div>
          
          <div className="flex items-center gap-4 px-6 py-3 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl shadow-slate-200/20">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">حالة النظام</span>
              <span className="text-sm font-bold text-slate-700">يعمل بكفاءة عالية</span>
            </div>
            <Activity className="h-5 w-5 text-slate-300 mr-2" />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <AnimatePresence>
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-xl p-8 shadow-2xl shadow-slate-200/40 border border-white/80 transition-all cursor-pointer"
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${stat.color} opacity-80`} />
                
                <div className="flex flex-col gap-8">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg ring-4 ring-white/50 group-hover:rotate-6 transition-transform duration-500`}>
                    <stat.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{stat.name}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black">
                        <TrendingUp className="h-3 w-3" />
                        {stat.trend}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Link href={stat.href} className="absolute inset-0 z-10" />
                
                {/* Decorative element */}
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-slate-100/50 rounded-full group-hover:scale-150 transition-transform duration-700 -z-10" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Recent Announcements */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 rounded-[3rem] bg-white/60 backdrop-blur-xl p-10 shadow-2xl shadow-slate-200/40 border border-white/80"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center shadow-inner">
                  <Bell className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">أحدث الإعلانات</h2>
                  <p className="text-slate-400 text-sm font-bold mt-1">آخر المستجدات والتعاميم المدرسية</p>
                </div>
              </div>
              <Link href="/announcements" className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition-all border border-slate-100 hover:border-indigo-100">
                <span className="text-sm font-black text-indigo-600">عرض الكل</span>
                <ArrowUpRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Link>
            </div>
            
            <div className="grid gap-5">
              {recentAnnouncements.length > 0 ? (
                recentAnnouncements.map((announcement, idx) => (
                  <motion.div 
                    key={announcement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    className="group flex items-center gap-6 p-6 rounded-[2rem] bg-white/40 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 border border-transparent hover:border-white transition-all cursor-pointer"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-indigo-600 shrink-0 border border-slate-50 group-hover:scale-110 transition-transform">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{announcement.title}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <CalendarCheck className="h-3.5 w-3.5" />
                          {new Date(announcement.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
                        </div>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50">إعلان عام</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                      <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-6">
                  <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center">
                    <Bell className="h-12 w-12 opacity-20" />
                  </div>
                  <p className="font-black text-lg">لا توجد إعلانات حديثة حالياً</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions / Activity */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-[3rem] bg-slate-900 p-10 shadow-2xl shadow-indigo-900/20 text-white relative overflow-hidden flex flex-col"
          >
            {/* Background Blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 mb-10">
              <h2 className="text-3xl font-black tracking-tight">إجراءات سريعة</h2>
              <p className="text-slate-400 font-medium mt-1">الوصول السريع للمهام المتكررة</p>
            </div>
            
            <div className="grid gap-4 relative z-10 flex-1">
              {[
                { name: 'إضافة طالب جديد', icon: Users, color: 'bg-blue-500', href: '/students', shadow: 'shadow-blue-500/30' },
                { name: 'تسجيل غياب اليوم', icon: CalendarCheck, color: 'bg-emerald-500', href: '/attendance', shadow: 'shadow-emerald-500/30' },
                { name: 'إنشاء اختبار جديد', icon: FileText, color: 'bg-purple-500', href: '/exams', shadow: 'shadow-purple-500/30' },
                { name: 'إرسال رسالة جماعية', icon: MessageSquare, color: 'bg-amber-500', href: '/messages', shadow: 'shadow-amber-500/30' },
              ].map((action, idx) => (
                <motion.div
                  key={action.name}
                  whileHover={{ x: -8 }}
                  className="w-full"
                >
                  <Link 
                    href={action.href}
                    className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                  >
                    <div className={`h-14 w-14 rounded-2xl ${action.color} ${action.shadow} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="font-black text-lg block">{action.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">انقر للبدء</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/20 group-hover:text-white transition-colors rtl:rotate-180" />
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-12 p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 relative z-10 shadow-2xl shadow-indigo-500/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-black text-xl">تحديث النظام</h3>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed opacity-90 font-medium">
                تم إضافة ميزة التقارير الذكية الجديدة المدعومة بالذكاء الاصطناعي. جربها الآن من قسم التقارير لتحليل أداء الطلاب.
              </p>
              <button className="mt-6 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all active:scale-95 shadow-xl shadow-indigo-900/20">
                اكتشف الميزات الجديدة
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
