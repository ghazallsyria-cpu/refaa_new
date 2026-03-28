'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, TrendingUp, Bell, 
  Award, Target, BarChart2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem, type StudentDashboardData } from '@/hooks/useDashboardSystem';

// ملاحظة لـ Netlify: تم إزالة أي صادرات (exports) إضافية من هنا لمنع أخطاء الـ Build
export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { fetchStudentDashboardData } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchStudentDashboardData();
      if (res) setData(res);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboardData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const safeFormat = (dateStr: any, formatStr: string) => {
    if (!mounted || !dateStr) return '...';
    try {
      const dateObj = new Date(dateStr);
      return isValid(dateObj) ? format(dateObj, formatStr, { locale: arSA }) : 'غير محدد';
    } catch (e) { return 'خطأ في التاريخ'; }
  };

  const avgScore = useMemo(() => {
    const grades = data?.grades || [];
    if (grades.length === 0) return 0;
    return Math.round(grades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / grades.length);
  }, [data?.grades]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  const student = data?.student;
  const sectionName = student?.sections?.name || 'غير محدد';
  const className = student?.sections?.classes?.name || 'صف دراسي';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-8 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-700 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black mb-4">مرحباً، {student?.users?.full_name || 'عزيزي الطالب'} 👋</h1>
            <p className="text-xl flex items-center gap-2 opacity-90"><GraduationCap /> {className} - {sectionName}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">نسبة الحضور</p>
              <p className="text-4xl font-black">{data?.attendanceRate || 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">المتوسط</p>
              <p className="text-4xl font-black">{avgScore}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600" /> تطور المستوى</h2>
            <div className="h-[300px]">
              {data?.grades && data.grades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...data.grades].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam.title" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 font-bold">لا توجد درجات حالياً</div>}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Award className="text-emerald-500" /> آخر النتائج</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data?.grades || []).map((grade: any) => (
                <div key={grade.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-900 truncate max-w-[150px]">{grade.exam?.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{grade.exam?.subject?.name}</p>
                  </div>
                  <p className={`text-2xl font-black ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{grade.score}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><Calendar className="text-emerald-600" /> ملخص الحضور</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase">حضور</p>
                <p className="text-2xl font-black text-emerald-700">{data?.presentCount || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-red-600 uppercase">غياب</p>
                <p className="text-2xl font-black text-red-700">{data?.absentCount || 0}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-amber-600 uppercase">تأخير</p>
                <p className="text-2xl font-black text-amber-700">{data?.partialCount || 0}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase">غير مكتمل</p>
                <p className="text-2xl font-black text-slate-700">{data?.incompleteCount || 0}</p>
              </div>
            </div>
          </div>
          <AnnouncementsWidget role="student" />
        </div>
      </div>
    </motion.div>
  );
}

