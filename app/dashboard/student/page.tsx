'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { fetchStudentDashboardData } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentDashboardData();
      
      if (data) {
        setStudentData(data.student);
        setAttendanceStats({ 
          rate: data.attendanceRate || 0,
          present: data.presentCount || 0,
          absent: data.absentCount || 0,
          partial: data.partialCount || 0,
          incomplete: data.incompleteCount || 0
        });
        setRecentGrades(data.grades || []);
        setUpcomingExams(data.exams || []);
        setUpcomingAssignments(data.assignments || []);
        setTodaysSchedule(data.todaysSchedule || []);
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboardData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // دالة آمنة لتنسيق التاريخ تمنع الانهيار
  const safeFormat = (dateStr: any, formatStr: string) => {
    if (!mounted || !dateStr) return '...';
    try {
      const dateObj = new Date(dateStr);
      if (!isValid(dateObj)) return 'غير محدد';
      return format(dateObj, formatStr, { locale: arSA });
    } catch (e) {
      return 'تاريخ غير صالح';
    }
  };

  // حساب المتوسط بشكل آمن لمنع NaN
  const avgScore = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) return 0;
    const total = recentGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
    return Math.round(total / recentGrades.length);
  }, [recentGrades]);

  // دالة لاستخراج اسم المعلم سواء كان مصفوفة أو كائن
  const getTeacherName = (item: any) => {
    const teacher = item.teachers || item.teacher;
    if (!teacher) return 'معلم المادة';
    const users = teacher.users;
    if (Array.isArray(users)) return users[0]?.full_name || 'معلم المادة';
    return users?.full_name || 'معلم المادة';
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // استخراج بيانات الصف
  const sectionName = studentData?.sections?.name || studentData?.section?.name || 'غير محدد';
  const className = studentData?.sections?.classes?.name || studentData?.section?.classes?.name || 'صف دراسي';
  const studentName = studentData?.users?.full_name || 'عزيزي الطالب';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto px-4"
    >
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-10 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-black uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              حساب الطالب النشط
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">مرحباً، {studentName} 👋</h1>
            <p className="text-indigo-100 text-xl flex items-center gap-3 font-medium">
              <div className="p-2 bg-white/10 rounded-xl"><GraduationCap className="h-6 w-6" /></div>
              أنت مسجل في {className} - {sectionName}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center min-w-[140px] shadow-lg">
              <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black mb-2">نسبة الحضور</p>
              <p className="text-4xl font-black tracking-tighter">{attendanceStats?.rate || 0}%</p>
            </div>
            <div className="rounded-3xl bg-indigo-500/30 p-6 backdrop-blur-xl border border-white/20 flex flex-col items-center justify-center min-w-[140px] shadow-lg">
              <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-black mb-2">المتوسط العام</p>
              <p className="text-4xl font-black tracking-tighter">{avgScore}%</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'الجدول الدراسي', href: '/dashboard/student/schedule', icon: Calendar, color: 'bg-indigo-50 text-indigo-600', hover: 'hover:border-indigo-200' },
          { label: 'الاختبارات', href: '/exams', icon: FileText, color: 'bg-emerald-50 text-emerald-600', hover: 'hover:border-emerald-200' },
          { label: 'الواجبات', href: '/assignments', icon: BookOpen, color: 'bg-amber-50 text-amber-600', hover: 'hover:border-amber-200' },
          { label: 'التنبيهات', href: '/messages', icon: Bell, color: 'bg-sky-50 text-sky-600', hover: 'hover:border-sky-200' }
        ].map((action, i) => (
          <Link href={action.href} key={i} className="group">
            <div className={`p-5 rounded-3xl bg-white border border-slate-100 shadow-sm ${action.hover} transition-all duration-300 flex items-center gap-4 group-hover:shadow-xl group-hover:-translate-y-1`}>
              <div className={`p-3 rounded-2xl ${action.color} transition-transform group-hover:scale-110`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="font-black text-slate-800 text-sm">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Grades Chart */}
          <div className="rounded-[32px] bg-white p-8 shadow-xl border border-slate-50">
            <div className="mb-8 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                  تطور المستوى الأكاديمي
                </h2>
                <p className="text-xs text-slate-400 font-bold pr-9">رسم بياني يوضح نتائجك في آخر الاختبارات</p>
              </div>
              <Link href="/reports" className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">التقارير</Link>
            </div>
            <div className="h-[320px] w-full">
              {recentGrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...recentGrades].reverse()}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="exam.title" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                  <BarChart2 className="h-12 w-12 opacity-20 mb-4" />
                  <p className="font-bold">لا توجد درجات مسجلة لعرضها حالياً</p>
                </div>
              )}
            </div>
          </div>

          {/* Grades List */}
          <div className="rounded-[32px] bg-white p-8 shadow-xl border border-slate-50">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Award className="h-6 w-6 text-emerald-500" />
                آخر النتائج المحققة
              </h2>
              <Link href="/exams" className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors">كل النتائج</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => (
                  <div key={grade.id} className="group p-5 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${grade.score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{grade.exam?.title}</p>
                          <p className="text-xs text-slate-400 font-bold">{grade.exam?.subject?.name || 'مادة دراسية'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {grade.score}%
                        </p>
                        <p className="text-[9px] text-slate-400 font-black uppercase mt-1">
                          {safeFormat(grade.completed_at, 'd MMMM')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-3xl">
                  لم يتم رصد نتائج اختبارات بعد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-8">
          
          {/* Today's Schedule Widget */}
          <div className="rounded-[32px] bg-white p-6 shadow-xl border border-slate-50">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><Clock className="h-5 w-5 text-indigo-600" /></div>
              جدول الحصص اليوم
            </h2>
            <div className="space-y-4">
              {todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {item.period}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-black text-slate-900 truncate">{item.subjects?.name || 'مادة دراسية'}</p>
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <GraduationCap className="h-3 w-3" /> {getTeacherName(item)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   <p className="text-xs text-slate-400 font-bold">لا توجد حصص مجدولة لليوم</p>
                </div>
              )}
            </div>
          </div>

          {/* Announcements */}
          <AnnouncementsWidget role="student" />

          {/* Attendance Stats */}
          <div className="rounded-[32px] bg-white p-6 shadow-xl border border-slate-50">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl"><Calendar className="h-5 w-5 text-emerald-600" /></div>
              ملخص الحضور والغياب
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'حضور', val: attendanceStats?.present, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                { label: 'غياب', val: attendanceStats?.absent, bg: 'bg-red-50', text: 'text-red-600' },
                { label: 'تأخير', val: attendanceStats?.partial, bg: 'bg-amber-50', text: 'text-amber-600' },
                { label: 'غير مكتمل', val: attendanceStats?.incomplete, bg: 'bg-slate-50', text: 'text-slate-500' }
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-2xl ${s.bg} flex flex-col items-center justify-center`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${s.text} mb-1`}>{s.label}</p>
                  <p className={`text-2xl font-black ${s.text}`}>{s.val || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="rounded-[32px] bg-white p-6 shadow-xl border border-slate-50">
            <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><Bell className="h-5 w-5 text-indigo-600" /></div>
              تنبيهات الاختبارات
            </h2>
            <div className="space-y-4">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group">
                    <div className="p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-200 group-hover:shadow-md transition-all bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{exam.title}</p>
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{safeFormat(exam.created_at, 'EEEE، d MMMM')}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-bold">لا توجد اختبارات مجدولة قادمة</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

