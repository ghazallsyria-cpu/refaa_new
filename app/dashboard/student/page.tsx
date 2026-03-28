'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, FileText, GraduationCap, 
  TrendingUp, Bell, Award, CheckCircle2, 
  XCircle, AlertTriangle, PieChart, ArrowUpRight 
} from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

export default function StudentDashboard() {
  const { fetchStudentDashboardData } = useDashboardSystem();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await fetchStudentDashboardData();
      if (res) setData(res);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [fetchStudentDashboardData]);

  useEffect(() => { if (mounted) fetchData(); }, [fetchData, mounted]);

  const avgScore = useMemo(() => {
    const grades = data?.grades || [];
    if (grades.length === 0) return 0;
    return Math.round(grades.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0) / grades.length);
  }, [data?.grades]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-[45px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-800 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest">بوابة الطالب الذكية</div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">مرحباً، {data?.student?.users?.full_name} 👋</h1>
            <p className="text-indigo-100 text-lg font-medium opacity-90 flex items-center gap-2">
              <GraduationCap size={20} /> {data?.student?.sections?.classes?.name} - {data?.student?.sections?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[30px] border border-white/20 text-center min-w-[140px] shadow-lg">
              <p className="text-[10px] font-black uppercase mb-1 opacity-70">نسبة الالتزام</p>
              <p className="text-4xl font-black">{data?.attendanceRate || 0}%</p>
            </div>
            <div className="bg-indigo-500/30 backdrop-blur-xl p-6 rounded-[30px] border border-white/20 text-center min-w-[140px] shadow-lg">
              <p className="text-[10px] font-black uppercase mb-1 opacity-70">المعدل العام</p>
              <p className="text-4xl font-black">{avgScore}%</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Attendance Grid - THE REQUESTED PART */}
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black flex items-center gap-3">
                <PieChart className="text-indigo-600" /> إحصائيات الحضور التفصيلية
              </h2>
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">تحديث حي</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'أيام الحضور', val: data?.presentCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'التزام تام' },
                { label: 'أيام الغياب', val: data?.absentCount, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', sub: 'بدون عذر' },
                { label: 'مرات التأخير', val: data?.lateCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'بعد الوقت' },
                { label: 'غياب جزئي', val: data?.partialCount, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'حصص محددة' }
              ].map((s, i) => (
                <div key={i} className="p-6 rounded-[30px] border border-slate-100 hover:border-indigo-100 transition-all bg-slate-50/30 group">
                  <div className={`h-12 w-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <s.icon size={24} />
                  </div>
                  <p className="text-3xl font-black text-slate-900 mb-1">{s.val || 0}</p>
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-1">{s.label}</p>
                  <p className="text-[9px] font-bold text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <TrendingUp className="text-indigo-600" /> الرسم البياني للأداء
            </h2>
            <div className="h-[300px]">
              {data?.grades?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...data.grades].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam.title" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-slate-300 font-bold bg-slate-50 rounded-3xl">لم يتم رصد نتائج اختبارات بعد</div>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <AnnouncementsWidget role="student" />

          {/* Today's Classes Sidebar */}
          <div className="bg-white p-6 rounded-[35px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><Calendar className="text-indigo-600" /> جدول اليوم</h2>
            <div className="space-y-3">
              {data?.todaysSchedule?.length > 0 ? data.todaysSchedule.map((lesson: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-indigo-600">{lesson.period}</div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{lesson.subjects?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{lesson.teachers?.users?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-[9px] font-black text-slate-400" dir="ltr">{lesson.start_time?.substring(0, 5)}</div>
                </div>
              )) : <p className="text-center py-6 text-slate-400 font-bold text-xs">لا توجد حصص لليوم</p>}
            </div>
          </div>

          {/* Quick Tasks */}
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                <Bell size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">تنبيه المهام</h3>
              <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">لديك {data?.assignments?.length || 0} واجبات و {data?.exams?.length || 0} اختبارات مسندة إليك حالياً.</p>
              <Link href="/assignments" className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-center block shadow-lg hover:bg-indigo-50 transition-all active:scale-95">عرض المهام</Link>
            </div>
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-colors"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

