'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2, Lock, Star, ChevronRight, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري تحميل لوحة التحكم...</p>
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

  const avatarUrl = studentData?.users?.avatar_url || studentData?.avatar_url;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      dir="rtl"
    >
      {/* 🚀 Hero Section (التحفة المعمارية الفنية) */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-200/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
            {/* 📸 الصورة الشخصية الفخمة */}
            <div className="relative group shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={studentData?.users?.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-black text-white/70 drop-shadow-md">{studentData?.users?.full_name?.charAt(0) || 'ط'}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              {/* 🟢 مؤشر الأونلاين التفاعلي */}
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-emerald-400 border-4 border-indigo-600 rounded-full z-20 shadow-lg animate-pulse"></div>
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-300" />
                <span>لوحة تحكم الطالب</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight drop-shadow-md">
                مرحباً، {studentData?.users?.full_name?.split(' ')[0] || 'طالب'} 👋
              </h1>
              <p className="text-indigo-100 text-base sm:text-lg font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-black/10 w-fit px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10 mx-auto sm:mx-0 shadow-inner">
                <GraduationCap className="h-5 w-5 text-indigo-300 shrink-0" />
                <span>مسجل في <strong className="text-white text-xl mx-1">{studentData?.sections?.classes?.name}</strong> شعبة <strong className="text-white text-xl mx-1">{studentData?.sections?.name}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex flex-row md:flex-col lg:flex-row flex-wrap gap-4 justify-center shrink-0">
            <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center min-w-[140px] shadow-lg hover:bg-white/20 transition-colors">
              <p className="text-xs text-indigo-200 uppercase tracking-widest font-black mb-1">نسبة الحضور</p>
              <p className="text-4xl font-black drop-shadow-md">{attendanceStats?.rate || 0}%</p>
            </div>
            <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center min-w-[140px] shadow-lg hover:bg-white/20 transition-colors">
              <p className="text-xs text-indigo-200 uppercase tracking-widest font-black mb-1">المتوسط العام</p>
              <p className="text-4xl font-black drop-shadow-md">{avgScore}%</p>
            </div>
          </div>
        </div>

        {/* 🎆 تأثيرات الزجاج والضوء الخلفية (Glow Effects) */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl mix-blend-overlay animate-pulse"></div>
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-400/30 blur-[100px] mix-blend-overlay"></div>
        <div className="absolute right-1/3 top-1/4 h-32 w-32 rounded-full bg-yellow-300/10 blur-2xl mix-blend-overlay"></div>
      </div>

      {/* 🚀 تحديد المسار (لطلاب العاشر) */}
      {isTenthGrade && !hasSelectedTrack && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-8 sm:p-10 shadow-xl shadow-amber-100/50">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="p-5 bg-white rounded-[2rem] shadow-sm border border-amber-100 shrink-0">
              <Target className="h-14 w-14 text-amber-500 animate-pulse" />
            </div>
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">تحديد المسار الأكاديمي للعام القادم</h2>
              <p className="text-slate-600 font-bold text-lg leading-relaxed">عزيزي الطالب، يرجى اختيار المسار الأكاديمي (علمي أو أدبي) الذي ترغب في دراسته في الصف الحادي عشر. هذا القرار سيحدد مستقبلك الدراسي.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
              <button onClick={() => handleTrackSelection('scientific')} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">المسار العلمي</button>
              <button onClick={() => handleTrackSelection('literary')} className="px-8 py-5 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">المسار الأدبي</button>
            </div>
          </div>
        </motion.div>
      )}

      {isTenthGrade && hasSelectedTrack && (
        <div className="rounded-3xl bg-emerald-50/50 border border-emerald-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-2xl shrink-0"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div>
            <div>
              <p className="text-lg font-black text-emerald-900">تم اعتماد مسارك الأكاديمي للعام القادم</p>
              <p className="text-sm font-bold text-emerald-700 mt-1">المسار المختار: <span className="font-black bg-white px-2 py-0.5 rounded-lg shadow-sm border border-emerald-50">{studentData.next_year_track === 'scientific' ? 'علمي 🔬' : 'أدبي 📚'}</span></p>
            </div>
          </div>
          <p className="text-xs text-emerald-600/70 font-black uppercase tracking-widest bg-white px-3 py-1.5 rounded-xl">تم الاختيار في {safeFormat(studentData.track_selection_date, 'd MMMM yyyy')}</p>
        </div>
      )}

      {/* 🚀 Quick Actions (الأزرار السريعة الزجاجية) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { href: '/dashboard/student/schedule', icon: Calendar, label: 'الجدول الدراسي', color: 'indigo' },
          { href: '/exams', icon: FileText, label: 'الاختبارات', color: 'emerald' },
          { href: '/assignments', icon: BookOpen, label: 'الواجبات', color: 'amber' },
          { href: '/messages', icon: Bell, label: 'التنبيهات', color: 'sky' }
        ].map((item, idx) => (
          <Link key={idx} href={item.href} className="group">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-5 sm:p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col items-center justify-center gap-4 group-hover:-translate-y-1`}
            >
              <div className={`p-4 bg-${item.color}-50 rounded-2xl group-hover:bg-${item.color}-500 transition-colors duration-500`}>
                <item.icon className={`h-8 w-8 text-${item.color}-500 group-hover:text-white transition-colors duration-500`} />
              </div>
              <span className={`font-black text-slate-700 group-hover:text-${item.color}-600 transition-colors text-sm sm:text-base`}>{item.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 🚀 Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Performance Chart */}
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -ml-10 -mt-10"></div>
            <div className="mb-8 flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-inner">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                تطور المستوى الأكاديمي
              </h2>
            </div>
            <div className="h-[350px] w-full relative z-10">
              {unlockedGrades.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={unlockedGrades.map(g => ({ ...g, displayTitle: g.exam?.title || 'اختبار', displayScore: g.score || 0 })).reverse()}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="displayTitle" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} domain={[0, 100]} dx={-10} />
                    <Tooltip 
                      contentStyle={{borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} 
                      itemStyle={{color: '#4f46e5', fontWeight: '900'}}
                    />
                    <Area type="monotone" dataKey="displayScore" name="الدرجة" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" activeDot={{r: 6, strokeWidth: 0, fill: '#4f46e5'}} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <BarChart2 className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="font-bold text-lg">لا توجد نتائج اختبارات متاحة لعرض الرسم البياني</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="mb-8 flex items-center justify-between relative z-10">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner">
                  <Award className="h-6 w-6 text-emerald-600" />
                </div>
                آخر النتائج
              </h2>
              <Link href="/dashboard/student/performance" className="text-sm font-bold text-emerald-600 hover:text-white flex items-center gap-1 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm border border-emerald-100">
                السجل الكامل <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="space-y-4 relative z-10">
              {recentGrades.length > 0 ? (
                recentGrades.map((grade) => {
                  const isLocked = checkIsLocked(grade.exam);
                  return (
                    <div key={grade.id} className={`flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all ${isLocked ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 group'}`}>
                      <div className="flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-colors ${isLocked ? 'bg-slate-200 text-slate-500' : grade.score >= 50 ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'}`}>
                          {isLocked ? <Lock className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight mb-1">{grade.exam?.title}</p>
                          <p className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md inline-block">{grade.exam?.subject?.name}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-center">
                        {isLocked ? (
                          <>
                            <span className="text-xs font-black text-slate-500 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mb-1">
                              <Lock className="w-3.5 h-3.5" /> محجوبة
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{safeFormat(grade.completed_at, 'd MMMM')}</p>
                          </>
                        ) : (
                          <>
                            <p className={`text-2xl font-black flex items-baseline gap-1 ${grade.score >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {grade.score} <span className="text-xs font-bold opacity-60">/ {grade.exam?.max_score || 100}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{safeFormat(grade.completed_at, 'd MMMM')}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 font-bold text-lg">
                  لا توجد نتائج اختبارات حالياً
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🚀 Sidebar Content - Right 1 Column */}
        <div className="space-y-8">
          
          {/* Today's Schedule */}
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden">
            <div className="mb-6 flex items-center justify-between relative z-10">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 shadow-inner">
                  <Clock className="h-6 w-6 text-sky-600" />
                </div>
                جدول اليوم
              </h2>
              <Link href="/dashboard/student/schedule" className="text-xs font-bold text-sky-600 hover:underline">الجدول الكامل</Link>
            </div>
            
            <div className="space-y-3 relative z-10">
              {todaysSchedule.length > 0 ? (
                todaysSchedule.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 group hover:border-sky-200 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                    <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg font-black text-slate-900 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all shadow-sm shrink-0">
                      {item.period}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-slate-900 truncate mb-1">{item.subjects?.name}</p>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 truncate">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.teachers?.users?.full_name}</span>
                        </p>
                        {(() => {
                          const periodInfo = periods.find(p => p.period_number === item.period);
                          const startTime = item.start_time || periodInfo?.start_time;
                          const endTime = item.end_time || periodInfo?.end_time;
                          if (startTime && endTime) {
                            return (
                              <p className="text-[10px] font-black uppercase tracking-widest text-sky-600/70 flex items-center gap-1.5" dir="ltr">
                                <Clock className="h-3 w-3 shrink-0" />
                                {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 font-bold bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  لا توجد حصص اليوم، استمتع بوقتك!
                </div>
              )}
            </div>
          </div>

          <AnnouncementsWidget authRole="student" />

          {/* Upcoming Assignments */}
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden">
            <div className="mb-6 flex items-center justify-between relative z-10">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner">
                  <Target className="h-6 w-6 text-amber-500" />
                </div>
                واجبات مطلوبة
              </h2>
            </div>
            <div className="space-y-4 relative z-10">
              {upcomingAssignments.length > 0 ? (
                upcomingAssignments.map((assignment) => (
                  <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group">
                    <div className="p-5 rounded-2xl border-2 border-slate-100 hover:border-amber-300 hover:shadow-md transition-all bg-white flex flex-col justify-between h-full">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <p className="font-black text-slate-900 text-lg leading-tight group-hover:text-amber-600 transition-colors line-clamp-2">{assignment.title}</p>
                        <span className="text-[10px] font-black px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5">
                           <Clock className="w-3 h-3" /> {safeFormat(assignment.due_date, 'd MMM')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md inline-block w-fit border border-slate-100">{assignment.subject?.name}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 font-bold bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  لا توجد واجبات مطلوبة حالياً
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden">
            <div className="mb-6 flex items-center justify-between relative z-10">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 shadow-inner">
                  <Bell className="h-6 w-6 text-rose-500" />
                </div>
                اختبارات قادمة
              </h2>
            </div>
            <div className="space-y-4 relative z-10">
              {upcomingExams.length > 0 ? (
                upcomingExams.map((exam) => (
                  <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group">
                    <div className="p-5 rounded-2xl border-2 border-slate-100 hover:border-rose-300 hover:shadow-md transition-all bg-white flex flex-col justify-between h-full">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <p className="font-black text-slate-900 text-lg leading-tight group-hover:text-rose-600 transition-colors line-clamp-2">{exam.title}</p>
                        <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0"><Play className="h-4 w-4" /></div>
                      </div>
                      <p className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md inline-block w-fit border border-slate-100 mb-4">{exam.subject?.name}</p>
                      <div className="flex items-center gap-2 text-[11px] font-black text-rose-700 bg-rose-50/50 border border-rose-100 p-2.5 rounded-xl uppercase tracking-widest">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {(() => {
                            if (!exam.exam_date) return '...';
                            const datePart = exam.exam_date;
                            const timePart = exam.start_time || '00:00';
                            const fullDateStr = timePart.includes('T') ? timePart : `${datePart}T${timePart}`;
                            return safeFormat(fullDateStr, 'EEEE، d MMM - h:mm a');
                          })()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 font-bold bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
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
