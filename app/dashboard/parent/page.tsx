'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Heart, Bell, Award, ShieldCheck, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { useAuth } from '@/context/auth-context';

export default function ParentDashboard() {
  const { authRole, isChecking } = useAuth(); // 🚀 استيراد جدار الحماية
  
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { fetchParentDashboardData } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    // 🚀 منع جلب البيانات إذا لم يكن المستخدم ولي أمر
    if (authRole !== 'parent' && authRole !== 'admin' && authRole !== 'management') return;
    
    try {
      setLoading(true);
      const data = await fetchParentDashboardData();
      
      if (data) {
        setChildren(data.children);
        setNotifications(data.notifications);
        // Assuming parent profile is part of the user session or can be derived
        // For now, we use the first child's parent info if needed, or just keep it simple
      }
    } catch (error) {
      console.error('Error fetching parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchParentDashboardData, authRole]);

  useEffect(() => {
    // 🚀 لا نجلب البيانات إلا بعد التأكد التام من الجلسة
    if (!isChecking) {
      fetchData();
    }
  }, [fetchData, isChecking]);

  // 🚀 شاشة التحميل وحماية الوصول (Security Guard)
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // 🚀 منع المتطفلين من رؤية لوحة أولياء الأمور
  if (authRole !== 'parent' && authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة لأولياء الأمور وإدارة المدرسة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6" 
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-inner">
            <Users className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">مرحباً بك مجدداً</h1>
            <p className="text-slate-500 mt-1 font-bold">تابع تقدم أبنائك الدراسي وحضورهم اليومي.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="relative p-3 rounded-2xl bg-slate-50 text-slate-600 shadow-sm border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
          </button>
          <Link 
            href="/messages"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            تواصل مع المدرسة
          </Link>
        </div>
      </div>

      {/* Children Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {children.length === 0 ? (
          <div className="lg:col-span-2 text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300 shadow-sm">
             <div className="mx-auto h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
               <Users className="h-10 w-10 text-slate-300" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 mb-2">لا يوجد أبناء مسجلين</h3>
             <p className="text-slate-500 font-bold">يرجى مراجعة إدارة المدرسة لربط حسابك بملفات أبنائك.</p>
          </div>
        ) : (
          children.map((child) => (
            <div key={child.id} className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl hover:shadow-indigo-100/50 transition-all hover:-translate-y-1">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm flex items-center justify-center text-white font-black text-xl ring-2 ring-white group-hover:scale-110 transition-transform">
                    {child.users?.full_name?.charAt(0) || 'ط'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{child.users?.full_name}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 bg-white px-2 py-0.5 rounded-md inline-block border border-slate-200 shadow-sm">
                      {child.sections?.classes?.name} - {child.sections?.name}
                    </p>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/student?id=${child.id}`}
                  className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-100 transition-all active:scale-95"
                  title="عرض التفاصيل"
                >
                  <TrendingUp className="h-5 w-5" />
                </Link>
              </div>
              
              <div className="p-6 grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 text-center shadow-sm">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">نسبة الحضور</p>
                  <p className="text-2xl font-black text-emerald-700">96%</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-center shadow-sm">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">المعدل العام</p>
                  <p className="text-2xl font-black text-indigo-700">88.5</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-100 text-center shadow-sm">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">الترتيب</p>
                  <p className="text-2xl font-black text-amber-700">5</p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-black text-slate-900">آخر التقييمات</p>
                    <Award className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-slate-600 font-bold">الرياضيات <span className="text-[10px] text-slate-400 font-medium ml-1">(اختبار شهري)</span></span>
                      <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">95/100</span>
                    </div>
                    <div className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-slate-600 font-bold">اللغة العربية <span className="text-[10px] text-slate-400 font-medium ml-1">(مشاركة)</span></span>
                      <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">10/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notifications */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-inner">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              تنبيهات هامة
            </h2>
          </div>
          <div className="divide-y divide-slate-100 bg-slate-50/30">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white m-6 rounded-3xl border border-dashed border-slate-200">
                 لا توجد تنبيهات حالياً
              </div>
            ) : (
              notifications.map((note) => (
                <div key={note.id} className="p-6 flex items-start gap-4 hover:bg-white transition-colors group cursor-pointer">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-110 transition-transform ${
                    note.type === 'warning' ? 'bg-red-50 text-red-600 border-red-100' :
                    note.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                  }`}>
                    {note.type === 'warning' ? <ShieldCheck className="h-5 w-5" /> : 
                     note.type === 'success' ? <Award className="h-5 w-5" /> : 
                     <Bell className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{note.title}</p>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap mr-2 border border-slate-200">{note.date}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-500 mt-1 truncate">الابن: {note.student}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links & Support */}
        <div className="space-y-8">
          
          {/* Announcements Widget */}
          <AnnouncementsWidget authRole="parent" />

          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-200 p-6 sm:p-8 hover:shadow-lg transition-all">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">روابط سريعة</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Link href="/reports" className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md text-center transition-all group hover:-translate-y-1">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-indigo-50 border border-slate-100 group-hover:border-indigo-100 transition-colors">
                  <FileText className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-xs font-black text-slate-700">التقارير</span>
              </Link>
              <Link href="/calendar" className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:shadow-md text-center transition-all group hover:-translate-y-1">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-indigo-50 border border-slate-100 group-hover:border-indigo-100 transition-colors">
                  <Calendar className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-xs font-black text-slate-700">التقويم</span>
              </Link>
              <Link href="/fees" className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:shadow-md text-center transition-all group hover:-translate-y-1">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-amber-50 border border-slate-100 group-hover:border-amber-100 transition-colors">
                  <Award className="h-5 w-5 text-slate-400 group-hover:text-amber-600" />
                </div>
                <span className="text-xs font-black text-slate-700">الرسوم</span>
              </Link>
              <Link href="/settings" className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-md text-center transition-all group hover:-translate-y-1">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:bg-emerald-50 border border-slate-100 group-hover:border-emerald-100 transition-colors">
                  <ShieldCheck className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <span className="text-xs font-black text-slate-700">الإعدادات</span>
              </Link>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="font-black text-xl mb-3">هل تحتاج للمساعدة؟</h3>
              <p className="text-indigo-100 text-sm mb-6 font-bold leading-relaxed">فريق الدعم الفني والإداري متواجد دائماً للإجابة على استفساراتكم وملاحظاتكم.</p>
              <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
                تحدث معنا الآن
              </button>
            </div>
            <Heart className="absolute -bottom-6 -right-6 h-32 w-32 text-indigo-500/30 rotate-12 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/50 rounded-full blur-3xl -mt-10 -mr-10"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
