'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { supabase } from '@/lib/supabase';

// 🚀 دالة التحقق من القفل الزمني
const checkIsLocked = (examData: any) => {
  if (!examData?.exam_date) return false;
  try {
    const now = new Date();
    const examDate = new Date(examData.exam_date);
    const endTimeParts = (examData.end_time || '23:59').split(':');
    examDate.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
    return now <= examDate;
  } catch(e) {
    return false;
  }
};

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

  const { fetchStudentDashboardData, updateStudentTrack } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentDashboardData();
      
      if (data) {
        setStudentData(data.student);
        setAttendanceStats({ rate: data.attendanceRate });
        setUpcomingExams(data.exams);
        setUpcomingAssignments(data.assignments);
        setTodaysSchedule(data.todaysSchedule);
        setPeriods(data.periods);

        try {
            const studentId = data.student?.id;
            if (studentId) {
                const { data: dbGrades } = await supabase
                  .from('exam_attempts')
                  .select('*, exams(id, title, max_score, total_marks, exam_date, end_time, subjects(name))')
                  .eq('student_id', studentId)
                  .order('completed_at', { ascending: false })
                  .limit(10);
                  
                if (dbGrades && dbGrades.length > 0) {
                    const formattedGrades = dbGrades.map((g: any) => ({
                        ...g,
                        exam: { ...g.exams, subject: g.exams?.subjects }
                    }));
                    setRecentGrades(formattedGrades);
                } else {
                    setRecentGrades(data.grades || []);
                }
            } else {
                setRecentGrades(data.grades || []);
            }
        } catch (e) {
            console.error("Direct fetch failed", e);
            setRecentGrades(data.grades || []);
        }
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentDashboardData]);

  const handleTrackSelection = async (track: 'scientific' | 'literary') => {
    try {
      await updateStudentTrack(track);
      fetchData();
    } catch (error) {
      console.error('Error selecting track:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatStr, { locale: arSA });
    } catch (e) {
      return fallback;
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium animate-pulse">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const isTenthGrade = studentData?.sections?.classes?.name?.includes('العاشر');
  const hasSelectedTrack = !!studentData?.next_year_track;

  const unlockedGrades = recentGrades.filter(g => !checkIsLocked(g.exam));

  const avgScore = unlockedGrades.length > 0 
    ? Math.round(unlockedGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / unlockedGrades.length)
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto"
    >
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
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
      </div>

      {isTenthGrade && !hasSelectedTrack && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="p-4 bg-amber-100 rounded-2xl"><Target className="h-12 w-12 text-amber-600" /></div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl font-black text-slate-900 mb-2">تحديد المسار الأكاديمي للصف الحادي عشر</h2>
              <p className="text-slate-600 font-medium">عزيزي الطالب، يرجى اختيار المسار الذي ترغب في إكماله العام القادم. هذا القرار مهم لمستقبلك الدراسي.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleTrackSelection('scientific')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">المسار العلمي</button>
              <button onClick={() => handleTrackSelection('literary')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95">المسار الأدبي</button>
            </div>
          </div>
        </motion.div>
      )}

      {isTenthGrade && hasSelectedTrack && (
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-100 rounded-xl"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
            <div>
              <p className="font-bold text-slate-900">تم تحديد المسار الأكاديمي للعام القادم</p>
              <p className="text-sm text-slate-500">المسار المختار: <span className="font-black text-indigo-600">{studentData.next_year_track === 'scientific' ? 'علمي' : 'أدبي'}</span></p>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">تاريخ الاختيار: {safeFormat(studentData.track_selection_date, 'd MMMM yyyy')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/student/schedule" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors"><Calendar className="h-5 w-5 text-indigo-600" /></div>
            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">الجدول الدراسي</span>
          </div>
        </Link>
        <Link href="/exams" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors"><FileText className="h-5 w-5 text-emerald-600" /></div>
            <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">الاختبارات</span>
          </div>
        </Link>
        <Link href="/assignments" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors"><BookOpen className="h-5 w-5 text-amber-600" /></div>
            <span className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">الواجبات</span>
          </div>
        </Link>
        <Link href="/messages" className="group">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-sky-100 transition-all flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl group-hover:bg-sky-100 transition-colors"><Bell className="h-5 w-5 text-sky-600" /></div>
            <span className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">التنبيهات</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl"><TrendingUp className="h-5 w-5 text-indigo-600" /></div>
                تطور المستوى الأكاديمي
              </h2>
              {/* 🚀 تم إزالة الزر المشبوه بالثغرة من هنا بالكامل! */}
            </div>
            <div className="h-[300px] w-full">
              {unlockedGrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={unlockedGrades.map(g => ({ ...g, displayTitle: g.exam?.title || 'اختبار', displayScore: g.score || 0 })).reverse()}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="displayTitle" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="displayScore" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BarChart2 className="h-10 w-10 text-slate-300 mb-3" />
                  <p>لا توجد نتائج اختبارات متاحة لعرض الرسم البياني</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl"><Award className="h-5 w-5 text-emerald-600" /></div>
                آخر النتائج
              </h2>
              {/* 🚀 تم إزالة الزر المشبوه بالثغرة من هنا بالكامل! */}
            </div>
            <div className="space-y-4">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => {
                  const isLocked = checkIsLocked(grade.exam);
                  return (
                    <div key={grade.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isLocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${isLocked ? 'bg-slate-200 text-slate-500' : grade.score >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {isLocked ? <Lock className="h-5 w-5" /> : <FileText className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{grade.exam?.title}</p>
                          <p className="text-sm text-slate-500">{grade.exam?.subject?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isLocked ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-slate-500 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" /> النتيجة محجوبة
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium">{safeFormat(grade.completed_at, 'd MMMM')}</p>
                          </div>
                        ) : (
                          <>
                            <p className={`text-xl font-black ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>{grade.score}%</p>
                            <p className="text-xs text-slate-400 font-medium mt-1">{safeFormat(grade.completed_at, 'd MMMM')}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد نتائج اختبارات حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl"><Clock className="h-5 w-5 text-indigo-600" /></div>
                جدول اليوم
              </h2>
              <Link href="/dashboard/student/schedule" className="text-xs font-bold text-indigo-600 hover:underline">عرض الكل</Link>
            </div>
            <div className="space-y-3">
              {todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-900 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">{item.period}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.subjects?.name}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1"><GraduationCap className="h-3 w-3" />{item.teachers?.users?.full_name}</p>
                        {(() => {
                          const periodInfo = periods.find(p => p.period_number === item.period);
                          const startTime = item.start_time || periodInfo?.start_time;
                          const endTime = item.end_time || periodInfo?.end_time;
                          if (startTime && endTime) {
                            return <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{startTime.substring(0, 5)} - {endTime.substring(0, 5)}</p>;
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد حصص اليوم
                </div>
              )}
            </div>
          </div>

          <AnnouncementsWidget authRole="student" />

          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl"><Calendar className="h-5 w-5 text-indigo-600" /></div>
              ملخص الحضور اليومي
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center"><p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">حضور كامل</p><p className="text-3xl font-bold text-emerald-700 mt-1">{attendanceStats?.present || 0}</p></div>
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex flex-col items-center justify-center"><p className="text-xs text-red-600 font-bold uppercase tracking-wider">غياب كامل</p><p className="text-3xl font-bold text-red-700 mt-1">{attendanceStats?.absent || 0}</p></div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center"><p className="text-xs text-amber-600 font-bold uppercase tracking-wider">غياب جزئي</p><p className="text-3xl font-bold text-amber-700 mt-1">{attendanceStats?.partial || 0}</p></div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center"><p className="text-xs text-slate-600 font-bold uppercase tracking-wider">غير مكتمل</p><p className="text-3xl font-bold text-slate-700 mt-1">{attendanceStats?.incomplete || 0}</p></div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><div className="p-2 bg-amber-50 rounded-xl"><Target className="h-5 w-5 text-amber-500" /></div>واجبات مطلوبة</h2>
            </div>
            <div className="space-y-4">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group">
                    <div className="p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">{assignment.title}</p>
                        <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-md whitespace-nowrap ml-2">{safeFormat(assignment.due_date, 'd MMM')}</span>
                      </div>
                      <p className="text-sm text-slate-500">{assignment.subject?.name}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد واجبات مطلوبة حالياً</div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-sm ring-1 ring-slate-200/50 hover:shadow-md transition-all">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><div className="p-2 bg-indigo-50 rounded-xl"><Bell className="h-5 w-5 text-indigo-600" /></div>اختبارات قادمة</h2>
            </div>
            <div className="space-y-4">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group">
                    <div className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{exam.title}</p>
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Clock className="h-4 w-4" /></div>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{exam.subject?.name}</p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          {(() => {
                            if (!exam.exam_date) return '...';
                            const datePart = exam.exam_date;
                            const timePart = exam.start_time || '00:00';
                            const fullDateStr = timePart.includes('T') ? timePart : `${datePart}T${timePart}`;
                            return safeFormat(fullDateStr, 'EEEE، d MMMM - h:mm a');
                          })()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا توجد اختبارات مجدولة حالياً</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}


