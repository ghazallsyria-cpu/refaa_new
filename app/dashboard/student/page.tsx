'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

export default function StudentDashboard() {
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch student profile
      const { data: student } = await supabase
        .from('students')
        .select('*, users(*), sections(*, classes(*))')
        .eq('id', user.id)
        .single();
      
      setStudentData(student);

      if (student) {
        // Fetch attendance stats
        const { data: attendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id);
        
        if (attendance) {
          const total = attendance.length;
          const present = attendance.filter(a => a.status === 'present').length;
          const late = attendance.filter(a => a.status === 'late').length;
          const absent = attendance.filter(a => a.status === 'absent').length;
          
          setAttendanceStats({
            total,
            present,
            late,
            absent,
            rate: total > 0 ? Math.round((present / total) * 100) : 100
          });
        }

        // Fetch recent grades
        const { data: grades } = await supabase
          .from('exam_attempts')
          .select('*, exam:exams(title, subject:subjects(name))')
          .eq('student_id', student.id)
          .order('completed_at', { ascending: false })
          .limit(5);
        
        setRecentGrades(grades || []);

        // Fetch upcoming exams for the student's section
        const { data: exams } = await supabase
          .from('exams')
          .select('*, subject:subjects(name)')
          .eq('section_id', student.section_id)
          .eq('status', 'published')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3);
        
        setUpcomingExams(exams || []);

        // Fetch upcoming assignments
        const { data: assignments } = await supabase
          .from('assignments')
          .select('*, subject:subjects(name)')
          .eq('section_id', student.section_id)
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(3);
        
        setUpcomingAssignments(assignments || []);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  // Calculate average score
  const avgScore = recentGrades.length > 0 
    ? Math.round(recentGrades.reduce((acc, curr) => acc + curr.score, 0) / recentGrades.length)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto"
    >
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">مرحباً، {studentData?.users?.full_name} 👋</h1>
            <p className="text-indigo-100 text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              أنت مسجل في {studentData?.sections?.classes?.name} - {studentData?.sections?.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center min-w-[120px]">
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">نسبة الحضور</p>
              <p className="text-3xl font-bold">{attendanceStats?.rate || 0}%</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center min-w-[120px]">
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">المتوسط العام</p>
              <p className="text-3xl font-bold">{avgScore}%</p>
            </div>
          </div>
        </div>
        {/* Decorative background circles */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/student/schedule" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">الجدول الدراسي</span>
          </div>
        </Link>
        <Link href="/exams" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">الاختبارات</span>
          </div>
        </Link>
        <Link href="/assignments" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <span className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">الواجبات</span>
          </div>
        </Link>
        <Link href="/messages" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl group-hover:bg-sky-100 transition-colors">
              <Bell className="h-5 w-5 text-sky-600" />
            </div>
            <span className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">التنبيهات</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recent Grades Chart */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                تطور المستوى الأكاديمي
              </h2>
              <Link href="/reports" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                التقارير المفصلة <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="h-[300px] w-full">
              {recentGrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentGrades.slice().reverse()}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="exam.title" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BarChart2 className="h-10 w-10 text-slate-300 mb-3" />
                  <p>لا توجد بيانات كافية لعرض الرسم البياني</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity / Grades Table */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                آخر النتائج
              </h2>
              <Link href="/exams" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                كل الاختبارات <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${grade.score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{grade.exam?.title}</p>
                        <p className="text-sm text-slate-500">{grade.exam?.subject?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {grade.score}%
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {format(new Date(grade.completed_at), 'd MMMM', { locale: arSA })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد نتائج اختبارات حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content - Right 1 Column */}
        <div className="space-y-8">
          
          {/* Announcements Widget */}
          <AnnouncementsWidget role="student" />

          {/* Attendance Widget */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              ملخص الحضور
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">حضور</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{attendanceStats?.present || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex flex-col items-center justify-center">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider">غياب</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{attendanceStats?.absent || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">تأخير</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{attendanceStats?.late || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex flex-col items-center justify-center">
                <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">إجمالي</p>
                <p className="text-3xl font-bold text-sky-700 mt-1">{attendanceStats?.total || 0}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <Target className="h-5 w-5 text-amber-500" />
                </div>
                واجبات مطلوبة
              </h2>
            </div>
            <div className="space-y-4">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group">
                    <div className="p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">{assignment.title}</p>
                        <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-md whitespace-nowrap ml-2">
                          {format(new Date(assignment.due_date), 'd MMM', { locale: arSA })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{assignment.subject?.name}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد واجبات مطلوبة حالياً
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Bell className="h-5 w-5 text-indigo-600" />
                </div>
                اختبارات قادمة
              </h2>
            </div>
            <div className="space-y-4">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group">
                    <div className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{exam.title}</p>
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                          <Clock className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{exam.subject?.name}</p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{format(new Date(exam.start_time), 'EEEE، d MMMM - h:mm a', { locale: arSA })}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد اختبارات مجدولة حالياً
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
