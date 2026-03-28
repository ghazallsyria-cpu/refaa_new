'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2
} from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem, type StudentDashboardData } from '@/hooks/useDashboardSystem';

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const { fetchStudentDashboardData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // الخطوة الحاسمة: تعريف data كـ any يمنع خطأ "Property does not exist on type never"
      const data: any = await fetchStudentDashboardData();
      
      if (data) {
        setStudentData(data.student);
        setAttendanceStats({ 
          rate: data.attendanceRate,
          present: data.presentCount,
          absent: data.absentCount,
          partial: data.partialCount,
          incomplete: data.incompleteCount
        });
        setRecentGrades(data.grades || []);
        setUpcomingExams(data.exams || []);
        setUpcomingAssignments(data.assignments || []);
        setTodaysSchedule(data.todaysSchedule || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboardData]);

  useEffect(() => {
    if (mounted) fetchData();
  }, [fetchData, mounted]);

  const avgScore = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) return 0;
    const total = recentGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    return Math.round(total / recentGrades.length);
  }, [recentGrades]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-8 max-w-7xl mx-auto px-4" dir="rtl">
      
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 to-violet-700 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black mb-4">مرحباً، {studentData?.users?.full_name || 'عزيزي الطالب'} 👋</h1>
            <p className="text-xl flex items-center gap-2 opacity-90">
              <GraduationCap /> {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">نسبة الحضور</p>
              <p className="text-4xl font-black">{attendanceStats?.rate || 0}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[140px]">
              <p className="text-[10px] font-black uppercase mb-1">المتوسط</p>
              <p className="text-4xl font-black">{avgScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'الجدول الدراسي', href: '/dashboard/student/schedule', icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'الاختبارات', href: '/exams', icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'الواجبات', href: '/assignments', icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
          { label: 'التنبيهات', href: '/messages', icon: Bell, color: 'bg-sky-50 text-sky-600' }
        ].map((action, i) => (
          <Link href={action.href} key={i}>
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center gap-4 group">
              <div className={`p-3 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="font-black text-slate-800 text-sm">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Chart */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-600" /> تطور المستوى</h2>
            <div className="h-[300px]">
              {recentGrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...recentGrades].reverse()}>
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

          {/* Grades List */}
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Award className="text-emerald-500" /> آخر النتائج</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentGrades.map((grade: any) => (
                <div key={grade.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div className="overflow-hidden">
                    <p className="font-black text-slate-900 truncate">{grade.exam?.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{grade.exam?.subject?.name}</p>
                  </div>
                  <p className={`text-2xl font-black ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{grade.score}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2"><Calendar className="text-emerald-600" /> ملخص الحضور</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'حضور', val: attendanceStats?.present, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                { label: 'غياب', val: attendanceStats?.absent, bg: 'bg-red-50', text: 'text-red-600' },
                { label: 'تأخير', val: attendanceStats?.partial, bg: 'bg-amber-50', text: 'text-amber-600' },
                { label: 'غير مكتمل', val: attendanceStats?.incomplete, bg: 'bg-slate-50', text: 'text-slate-500' }
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-2xl ${s.bg} flex flex-col items-center justify-center`}>
                  <p className={`text-[9px] font-black uppercase mb-1 ${s.text}`}>{s.label}</p>
                  <p className={`text-2xl font-black ${s.text}`}>{s.val || 0}</p>
                </div>
              ))}
            </div>
          </div>
          <AnnouncementsWidget role="student" />
        </div>
      </div>
    </motion.div>
  );
}

