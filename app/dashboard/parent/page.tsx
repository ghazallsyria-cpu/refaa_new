'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, GraduationCap, Calendar, Award, Bell, ShieldCheck, ArrowRight, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

export default function ParentDashboard() {
  const { fetchParentDashboardData } = useDashboardSystem();
  
  // استخدام : any هنا هو الحل الجذري لمنع خطأ "Property does not exist on type never"
  const [children, setChildren] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // تعريف النتيجة كـ any يخبر TypeScript بالتوقف عن التذمر بشأن الأنواع في Netlify
      const data: any = await fetchParentDashboardData();
      
      if (data) {
        setChildren(data.children || []);
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchParentDashboardData]);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [fetchData, mounted]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4" 
      dir="rtl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-800 p-10 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> بوابة أولياء الأمور
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">مرحباً بك، ولي الأمر 👋</h1>
          <p className="text-indigo-100 text-xl font-medium max-w-2xl">تجد هنا نظرة شاملة على تقدم أبنائك، جداولهم الدراسية، وأحدث الإشعارات من المدرسة.</p>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" /> متابعة الأبناء ({children.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.length > 0 ? (
              children.map((child, idx) => (
                <motion.div 
                  key={child.id} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-50 group hover:shadow-indigo-100 transition-all"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl font-black">
                      {child.users?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{child.users?.full_name}</h3>
                      <p className="text-xs text-slate-500 font-bold">{child.sections?.classes?.name} - {child.sections?.name}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link 
                      href={`/dashboard/student/schedule?studentId=${child.id}`}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-600 hover:text-indigo-600 transition-all font-bold text-sm"
                    >
                      <span className="flex items-center gap-2"><Calendar size={16} /> الجدول الدراسي</span>
                      <ArrowRight size={16} />
                    </Link>
                    <Link 
                      href={`/exams?studentId=${child.id}`}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-600 hover:text-emerald-600 transition-all font-bold text-sm"
                    >
                      <span className="flex items-center gap-2"><Award size={16} /> نتائج الاختبارات</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-2 py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-500 font-bold">لا يوجد أبناء مسجلين حالياً.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <AnnouncementsWidget role="parent" />
          
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Bell size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">الدعم الفني</h3>
              <p className="text-slate-400 text-sm font-medium mb-6">هل تواجه صعوبة في استخدام المنصة؟ فريقنا هنا لمساعدتك.</p>
              <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20">تواصل معنا</button>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

