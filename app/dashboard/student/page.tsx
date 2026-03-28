'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, Clock, FileText, 
  GraduationCap, TrendingUp, Bell, Award, 
  ChevronLeft, LayoutDashboard, CheckCircle2 
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await fetchStudentDashboardData();
      if (res) setData(res);
    } catch (error) {
      console.error('UI Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboardData]);

  useEffect(() => {
    if (mounted) fetchData();
  }, [fetchData, mounted]);

  const avgScore = useMemo(() => {
    const grades = data?.grades || [];
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0);
    return Math.round(sum / grades.length);
  }, [data?.grades]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  const student = data?.student;
  const fullName = student?.users?.full_name || 'عزيزي الطالب';
  const className = student?.sections?.classes?.name || '---';
  const sectionName = student?.sections?.name || '---';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-800 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">مرحباً، {fullName} 👋</h1>
            <p className="text-indigo-100 text-xl font-medium flex items-center gap-2">
              <GraduationCap size={24} /> {className} - {sectionName}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[130px]">
              <p className="text-[10px] font-black uppercase mb-1 opacity-70">نسبة الحضور</p>
              <p className="text-4xl font-black">{data?.attendanceRate || 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[130px]">
              <p className="text-[10px] font-black uppercase mb-1 opacity-70">المتوسط العام</p>
              <p className="text-4xl font-black">{avgScore}%</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Performance Chart */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black flex items-center gap-2">
                <TrendingUp className="text-indigo-600" /> تطور المستوى الأكاديمي
              </h2>
              <Link href="/exams" className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">كل النتائج</Link>
            </div>
            <div className="h-[250px]">
              {data?.grades?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...data.grades].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam.title" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-bold bg-slate-50 rounded-2xl border-2 border-dashed">لا توجد درجات مسجلة حالياً</div>
              )}
            </div>
          </div>

          {/* Today's Schedule Timeline */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-xl font-black mb-8 flex items-center gap-2"><Clock className="text-emerald-500" /> جدول الحصص اليوم</h2>
            <div className="space-y-4">
              {data?.todaysSchedule?.length > 0 ? (
                data.todaysSchedule.map((lesson: any, i: number) => (
                  <div key={i} className="flex items-center gap-6 p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm">{lesson.period}</div>
                    <div className="flex-1">
                      <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{lesson.subjects?.name}</p>
                      <p className="text-xs font-bold text-slate-400">{lesson.teachers?.users?.full_name || 'معلم المادة'}</p>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-100 uppercase" dir="ltr">
                      {lesson.start_time?.substring(0, 5) || '--:--'}
                    </div>
                  </div>
                ))
              ) : <div className="py-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">لا توجد حصص مجدولة لليوم</div>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <AnnouncementsWidget role="student" />

          {/* Attendance Summary */}
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><CheckCircle2 className="text-indigo-600" /> ملخص الحضور</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase">حضور</p>
                <p className="text-2xl font-black text-emerald-700">{data?.presentCount || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-red-600 uppercase">غياب</p>
                <p className="text-2xl font-black text-red-700">{data?.absentCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Exams List */}
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><Bell className="text-amber-500" /> اختبارات قادمة</h2>
            <div className="space-y-3">
              {data?.exams?.map((exam: any) => (
                <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                  <p className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{exam.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{exam.subject?.name}</p>
                </Link>
              ))}
              {data?.exams?.length === 0 && <p className="text-center py-6 text-slate-400 font-bold text-xs">لا توجد اختبارات حالياً</p>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

