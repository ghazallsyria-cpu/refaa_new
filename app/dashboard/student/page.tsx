/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2, Lock, Star, ChevronRight, Play,
  AlertTriangle, ShieldAlert, Calculator, Loader2, UserCircle, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';

// 🚀 مسارات نسبية لتفادي أخطاء البناء
import AnnouncementsWidget from '../../../components/AnnouncementsWidget';
import { useDashboardSystem } from '../../../hooks/useDashboardSystem';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth-context';
import { cn } from '../../../lib/utils';

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
  const { user, authRole, isChecking } = useAuth() as any; 
  
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>({ rate: 100 });
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [myBadges, setMyBadges] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [absentPeriods, setAbsentPeriods] = useState<number>(0);
  const [fullDaysAbsent, setFullDaysAbsent] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { fetchStudentDashboardData, updateStudentTrack } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    if (!user?.id || authRole !== 'student') return;

    try {
      setLoading(true);
      const data = await fetchStudentDashboardData();
      
      if (data) {
        setStudentData(data.student);
        setUpcomingExams(data.exams);
        setUpcomingAssignments(data.assignments);
        setTodaysSchedule(data.todaysSchedule);
        setPeriods(data.periods);

        try {
            const studentId = data.student?.id;
            if (studentId) {
                // 🚀 Parallel Fetching 
                const [
                  { data: badgesData },
                  { data: dbGrades },
                  { count: absentCount, error: absErr },
                  { count: totalCount }
                ] = await Promise.all([
                  supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', studentId).order('granted_at', { ascending: false }),
                  supabase.from('exam_attempts').select('*, exams(id, title, max_score, total_marks, exam_date, end_time, subjects(name))').eq('student_id', studentId).order('completed_at', { ascending: false }).limit(10),
                  supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId).eq('status', 'absent'),
                  supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId)
                ]);
                
                if (badgesData) setMyBadges(badgesData);

                if (dbGrades && dbGrades.length > 0) {
                    const formattedGrades = dbGrades.map((g: any) => ({
                        ...g,
                        exam: { ...g.exams, subject: g.exams?.subjects }
                    }));
                    setRecentGrades(formattedGrades);
                } else {
                    setRecentGrades(data.grades || []);
                }

                if (!absErr && absentCount !== null) {
                  setAbsentPeriods(absentCount);
                  setFullDaysAbsent(Math.floor(absentCount / 5)); // 5 حصص = 1 يوم
                  
                  if (totalCount && totalCount > 0) {
                    const calculatedRate = Math.round(((totalCount - absentCount) / totalCount) * 100);
                    setAttendanceStats({ rate: calculatedRate });
                  } else {
                    setAttendanceStats({ rate: 100 });
                  }
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
  }, [fetchStudentDashboardData, user, authRole]);

  const handleTrackSelection = async (track: 'scientific' | 'literary') => {
    try {
      await updateStudentTrack(track);
      fetchData();
    } catch (error) {
      console.error('Error selecting track:', error);
    }
  };

  useEffect(() => {
    if (!isChecking) fetchData();
  }, [fetchData, isChecking]);

  const isCurrentClass = useCallback((period: number) => {
    if (!currentTime) return false;
    const periodInfo = periods.find(p => p.period_number === period);
    if (!periodInfo) return false;
    const [startH, startM] = periodInfo.start_time.split(':').map(Number);
    const [endH, endM] = periodInfo.end_time.split(':').map(Number);
    const now = currentTime;
    const start = new Date(now); start.setHours(startH, startM, 0);
    const end = new Date(now); end.setHours(endH, endM, 0);
    return now >= start && now <= end;
  }, [currentTime, periods]);

  const isNextClass = useCallback((period: number) => {
    if (!currentTime) return false;
    const periodInfo = periods.find(p => p.period_number === period);
    if (!periodInfo) return false;
    const [startH, startM] = periodInfo.start_time.split(':').map(Number);
    const now = currentTime;
    const start = new Date(now); start.setHours(startH, startM, 0);
    const diff = (start.getTime() - now.getTime()) / (1000 * 60);
    return diff > 0 && diff <= 60;
  }, [currentTime, periods]);

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try {
      return format(new Date(dateStr), formatStr, { locale: arSA });
    } catch (e) { return fallback; }
  };

  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'student') {
    return <div className="p-10 text-center font-bold text-rose-500 min-h-[80vh] flex items-center justify-center bg-[#090b14] font-cairo">هذه الصفحة مخصصة للطلاب فقط.</div>;
  }

  if (loading || !mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري إعداد لوحتك الدراسية...</p>
        </div>
      </div>
    );
  }

  const isTenthGrade = studentData?.sections?.classes?.name?.includes('العاشر');
  const hasSelectedTrack = !!studentData?.next_year_track;
  const unlockedGrades = recentGrades.filter(g => !checkIsLocked(g.exam));
  const avgScore = unlockedGrades.length > 0 ? Math.round(unlockedGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / unlockedGrades.length) : 0;
  const avatarUrl = studentData?.users?.avatar_url || studentData?.avatar_url;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
      
      {/* 🚀 الخلفية المضيئة */}
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 🚀 الهيدر الفخم الموحد */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#131836] via-[#1a2044] to-[#0f142b] p-6 sm:p-12 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
              <Link href={`/students/${user.id}`} className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-[#090b14]/50 backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                  {avatarUrl ? <img src={avatarUrl} alt={studentData?.users?.full_name} className="w-full h-full object-cover" /> : <span className="text-4xl sm:text-5xl font-black text-indigo-400 drop-shadow-md">{studentData?.users?.full_name?.charAt(0) || 'ط'}</span>}
                </div>
                <div className="absolute inset-0 bg-indigo-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-400 border-4 border-[#090b14] rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
              </Link>

              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm text-indigo-400">
                  <Star className="w-3.5 h-3.5" />
                  <span>لوحة تحكم الطالب</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight drop-shadow-md leading-tight text-white">
                  مرحباً، {studentData?.users?.full_name?.split(' ')[0] || 'بطلنا'} 👋
                </h1>
                <p className="text-slate-400 text-sm sm:text-base font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 shrink-0" />
                  <span>مسجل في <strong className="text-white mx-1">{studentData?.sections?.classes?.name}</strong> شعبة <strong className="text-white mx-1">{studentData?.sections?.name}</strong></span>
                </p>
                
                <Link href={`/students/${user.id}`} className="inline-flex items-center gap-2 text-indigo-300 hover:text-white font-bold text-sm bg-white/5 px-5 py-2.5 rounded-xl border border-white/10 transition-all hover:bg-white/10 shadow-sm active:scale-95">
                  <UserCircle className="w-4 h-4" /> استعراض ملفي الأكاديمي الشامل
                </Link>
              </div>
            </div>

            <div className="flex flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:shrink-0">
              <div className="rounded-2xl sm:rounded-[2rem] bg-[#090b14]/50 p-5 sm:p-6 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center min-w-[130px] shadow-lg hover:border-white/10 transition-colors">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-black mb-1">نسبة الحضور</p>
                <p className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-md">{attendanceStats?.rate || 0}%</p>
              </div>
              <div className="rounded-2xl sm:rounded-[2rem] bg-[#090b14]/50 p-5 sm:p-6 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center min-w-[130px] shadow-lg hover:border-white/10 transition-colors">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-black mb-1">المتوسط العام</p>
                <p className="text-3xl sm:text-4xl font-black text-indigo-400 drop-shadow-md">{avgScore}%</p>
              </div>
            </div>
          </div>

          {/* 🚀 قسم الأوسمة (لوحة الشرف) */}
          {myBadges.length > 0 && (
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 w-full">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف: أوسمة التميز التي حصلت عليها
              </h3>
              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 custom-scrollbar mask-fade-edges">
                {myBadges.map((badgeEntry, index) => (
                  <div key={badgeEntry.id || index} className="flex-shrink-0 bg-[#090b14]/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 flex items-center gap-5 w-[22rem] hover:bg-white/5 transition-all duration-300 hover:border-white/10 group cursor-default">
                    <div className="relative w-20 h-20 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                      <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl group-hover:bg-amber-500/20 transition-colors"></div>
                      {badgeEntry.badge?.image_url ? (
                        <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized className="object-contain drop-shadow-2xl relative z-10" />
                      ) : <Award className="w-full h-full text-amber-400 relative z-10 drop-shadow-lg p-2" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-white truncate">{badgeEntry.badge?.name}</p>
                      <p className="text-xs font-bold text-slate-400 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>{badgeEntry.reason || 'تقديراً للجهود'}</p>
                      <p className="text-[10px] text-slate-500 mt-2 bg-[#090b14]/80 w-fit px-2 py-1 rounded-lg border border-white/5">بتاريخ: {safeFormat(badgeEntry.granted_at, 'd MMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl mix-blend-overlay animate-pulse pointer-events-none"></div>
        </div>

        {/* 🚀 إنذار الغياب المتقدم */}
        <AnimatePresence>
          {fullDaysAbsent > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-rose-500/10 p-6 sm:p-8 text-white shadow-[0_0_30px_rgba(244,63,94,0.15)] border border-rose-500/30 backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 bg-rose-500/20 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-rose-500/30 shadow-inner shrink-0">
                    <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-rose-400 animate-bounce" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-rose-500/30">
                      <ShieldAlert className="w-3.5 h-3.5" /> إنذار إداري مسجل
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-white leading-tight">تنبيه: تجاوزت الحد المسموح للغياب!</h2>
                    <p className="text-slate-300 text-xs sm:text-sm font-bold leading-relaxed max-w-xl mt-2">حسب لائحة السلوك والمواظبة، تم احتساب وتجميع الحصص التي تغيبت عنها لتعادل <span className="bg-rose-500/30 border border-rose-500/50 px-1.5 py-0.5 rounded text-rose-400 mx-1 font-black">{fullDaysAbsent} أيام</span> فعلية. يرجى الالتزام بالدوام.</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-4 bg-[#090b14]/50 p-4 sm:p-5 rounded-2xl backdrop-blur-md border border-white/5 shrink-0 w-full lg:w-auto shadow-inner">
                  <div className="text-center">
                    <span className="block text-2xl sm:text-4xl font-black text-white">{absentPeriods}</span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">حصص غياب</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-600">÷ 5 =</div>
                  <div className="text-center bg-rose-500/20 p-2 sm:p-3 rounded-xl border border-rose-500/30 shadow-inner">
                    <span className="block text-2xl sm:text-4xl font-black text-rose-400 drop-shadow-md">{fullDaysAbsent}</span>
                    <span className="text-[9px] sm:text-[10px] text-rose-300 font-bold uppercase tracking-widest">أيام مسجلة</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Track Selection (For 10th Grade) */}
        {isTenthGrade && !hasSelectedTrack && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl border border-amber-500/30 p-8 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="p-5 bg-amber-500/10 rounded-[2rem] shadow-inner border border-amber-500/20 shrink-0"><Target className="h-12 w-12 text-amber-400 animate-pulse" /></div>
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">تحديد المسار الأكاديمي للعام القادم</h2>
                <p className="text-slate-400 font-bold text-sm sm:text-base leading-relaxed">يرجى اختيار المسار الأكاديمي (علمي أو أدبي) الذي ترغب في دراسته في الصف الحادي عشر.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
                <button onClick={() => handleTrackSelection('scientific')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">المسار العلمي</button>
                <button onClick={() => handleTrackSelection('literary')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">المسار الأدبي</button>
              </div>
            </div>
          </motion.div>
        )}

        {isTenthGrade && hasSelectedTrack && (
          <div className="rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-2xl shrink-0"><CheckCircle2 className="h-7 w-7 text-emerald-400" /></div>
              <div>
                <p className="text-lg font-black text-emerald-400">تم اعتماد مسارك الأكاديمي</p>
                <p className="text-sm font-bold text-slate-300 mt-1">المسار المختار: <span className="font-black bg-[#090b14]/50 px-2 py-1 rounded-lg shadow-sm border border-emerald-500/30 text-emerald-300 mx-1">{studentData.next_year_track === 'scientific' ? 'علمي 🔬' : 'أدبي 📚'}</span></p>
              </div>
            </div>
            <p className="text-[10px] text-emerald-400/70 font-black uppercase tracking-widest bg-[#090b14]/50 px-4 py-2 rounded-xl border border-emerald-500/20">تم الاختيار في {safeFormat(studentData.track_selection_date, 'd MMMM yyyy')}</p>
          </div>
        )}

        {/* 🚀 Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {[
            { href: '/dashboard/student/schedule', icon: Calendar, label: 'الجدول الدراسي', color: 'indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { href: '/exams', icon: FileText, label: 'الاختبارات', color: 'emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { href: '/assignments', icon: BookOpen, label: 'الواجبات', color: 'amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { href: '/messages', icon: Bell, label: 'التنبيهات', color: 'sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' }
          ].map((item, idx) => (
            <Link key={idx} href={item.href} className="group">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className={`p-6 rounded-[2rem] bg-[#131836]/60 backdrop-blur-xl border border-white/10 shadow-lg hover:border-white/20 transition-all flex flex-col items-center justify-center gap-4 group-hover:-translate-y-1 h-full`}>
                <div className={`p-4 rounded-2xl transition-colors duration-500 ${item.bg} border ${item.border}`}><item.icon className={`h-8 w-8 text-${item.color} transition-colors duration-500`} /></div>
                <span className="font-black text-slate-300 group-hover:text-white transition-colors text-sm text-center">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* 🚀 Main Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          <div className="lg:col-span-2 space-y-6 lg:space-y-8 w-full">
            
            {/* 🚀 Today's Schedule Timeline */}
            <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30 relative z-10 gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20 shadow-inner"><Clock className="h-6 w-6 text-sky-400" /></div> جدول حصص اليوم
                </h2>
                <Link href="/dashboard/student/schedule" className="text-sm font-bold text-sky-400 hover:text-white hover:bg-sky-500/20 transition-colors px-4 py-2.5 bg-sky-500/10 rounded-xl shadow-sm border border-sky-500/20 shrink-0">الجدول الكامل</Link>
              </div>
              
              <div className="p-6 lg:p-8 relative z-10 overflow-x-hidden">
                {todaysSchedule.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-sky-500/20 before:via-white/10 before:to-transparent">
                    {todaysSchedule.map((item, i) => {
                      const current = isCurrentClass(item.period);
                      const next = isNextClass(item.period);
                      return (
                        <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                          <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500", current ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-[#090b14] scale-125 border-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.5)]" : next ? "bg-amber-500 text-[#090b14] border-[#090b14]" : "bg-[#131836] text-slate-400 border-[#090b14]")}>
                            {current ? <Play className="h-5 w-5 animate-pulse ml-1" /> : <span className="text-base font-black">{item.period}</span>}
                          </div>
                          <div className={cn("w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-3xl border transition-all duration-500 backdrop-blur-md", current ? "bg-[#1a2044] border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02]" : next ? "bg-amber-500/10 border-amber-500/30 shadow-md" : "bg-[#090b14]/50 border-white/5 shadow-sm hover:border-white/10")}>
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3">
                              <h3 className={cn("text-lg font-black transition-colors truncate pl-2", current ? "text-emerald-400" : next ? "text-amber-400" : "text-white")}>{item.subjects?.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-inner"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> الحصة الآن</span>}
                                {next && !current && <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold shadow-inner">الحصة القادمة</span>}
                                <span className={cn("text-xs font-black px-3 py-1.5 rounded-xl shadow-inner border", current ? "bg-[#090b14]/50 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10")}>الحصة {item.period}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-white/5 gap-3">
                              <p className={cn("text-sm font-bold flex items-center gap-2", current ? "text-emerald-400/80" : "text-slate-400")}><GraduationCap className="h-4 w-4 opacity-70 shrink-0" /><span className="truncate">أ. {item.teachers?.users?.full_name || 'غير محدد'}</span></p>
                              {(() => {
                                const periodInfo = periods.find(p => p.period_number === item.period);
                                if (periodInfo?.start_time && periodInfo?.end_time) {
                                  return <span className={cn("text-[11px] font-black tracking-widest flex items-center gap-1.5 bg-[#090b14]/50 px-2.5 py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-emerald-400 border-emerald-500/20" : "text-slate-500 border-white/5")} dir="ltr"><Clock className="w-3 h-3 shrink-0" />{periodInfo.start_time.substring(0, 5)} - {periodInfo.end_time.substring(0, 5)}</span>;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-[#090b14]/30 rounded-[2rem] border border-dashed border-white/10 shadow-inner">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4 border border-white/10"><Calendar className="h-10 w-10 text-slate-500" /></div>
                    <h3 className="text-xl font-black text-white mb-2">لا توجد حصص اليوم</h3>
                    <p className="text-sm text-slate-400 font-bold">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Chart */}
            <div className="rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl p-6 lg:p-8 shadow-xl border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none"></div>
              <div className="mb-8 flex items-center justify-between relative z-10">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shadow-inner"><TrendingUp className="h-6 w-6 text-indigo-400" /></div>
                  تطور المستوى الأكاديمي
                </h2>
              </div>
              <div className="h-[300px] sm:h-[350px] w-full relative z-10">
                {unlockedGrades.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={unlockedGrades.map(g => ({ ...g, displayTitle: g.exam?.title || 'اختبار', displayScore: g.score || 0 })).reverse()}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.5}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="displayTitle" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} dx={-10} width={30} />
                      <Tooltip contentStyle={{borderRadius: '1rem', border: '1px solid #ffffff20', backgroundColor: '#131836', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'}} itemStyle={{color: '#818cf8', fontWeight: '900'}} />
                      <Area type="monotone" dataKey="displayScore" name="الدرجة" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{r: 5, strokeWidth: 0, fill: '#818cf8'}} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#090b14]/50 rounded-[1.5rem] border-2 border-dashed border-white/10 p-4 text-center">
                    <BarChart2 className="h-12 w-12 text-slate-600 mb-4" />
                    <p className="font-bold text-sm sm:text-lg text-slate-400">لا توجد نتائج اختبارات متاحة لعرض الرسم البياني</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🌟 Column 2: Narrow Area */}
          <div className="space-y-6 lg:space-y-8 w-full">
            <AnnouncementsWidget authRole="student" />

            {/* Recent Grades */}
            <div className="rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="mb-6 flex items-center justify-between relative z-10 gap-3">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-inner shrink-0"><Award className="h-5 w-5 text-emerald-400" /></div> آخر النتائج
                </h2>
                <Link href="/student/performance" className="text-xs font-bold text-emerald-400 hover:text-white flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors border border-emerald-500/20">السجل <ChevronLeft className="h-4 w-4" /></Link>
              </div>
              
              <div className="space-y-4 relative z-10">
                {recentGrades.length > 0 ? (
                  recentGrades.slice(0,4).map((grade) => {
                    const isLocked = checkIsLocked(grade.exam);
                    return (
                      <div key={grade.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isLocked ? 'bg-[#090b14]/50 border-white/5' : 'bg-[#090b14]/80 border-white/10 shadow-inner hover:border-emerald-500/30 group'}`}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 transition-colors ${isLocked ? 'bg-white/5 text-slate-500 border border-white/5' : grade.score >= 50 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-slate-900' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white'}`}>
                            {isLocked ? <Lock className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 pr-1">
                            <p className="font-black text-white text-sm sm:text-base leading-tight mb-1 truncate">{grade.exam?.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md inline-block truncate max-w-full border border-white/5">{grade.exam?.subject?.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center shrink-0 pl-1">
                          {isLocked ? (
                            <><span className="text-[10px] font-black text-slate-400 bg-white/5 shadow-inner border border-white/10 px-2 py-1 rounded-md flex items-center gap-1 mb-1"><Lock className="w-3 h-3" /> محجوبة</span><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                          ) : (
                            <><p className={`text-lg sm:text-xl font-black flex items-baseline gap-1 ${grade.score >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{grade.score} <span className="text-[10px] font-bold text-slate-500">/ {grade.exam?.max_score || 100}</span></p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-[#090b14]/50 rounded-2xl border border-dashed border-white/10 font-bold text-sm">لا توجد نتائج اختبارات حالياً</div>
                )}
              </div>
            </div>

            {/* Upcoming Assignments */}
            <div className="rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
              <div className="mb-6 flex items-center justify-between relative z-10">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30 shadow-inner"><Target className="h-5 w-5 text-amber-400" /></div> واجبات مطلوبة
                </h2>
              </div>
              <div className="space-y-4 relative z-10">
                {upcomingAssignments.length > 0 ? (
                  upcomingAssignments.map((assignment) => (
                    <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group">
                      <div className="p-5 rounded-2xl border border-white/10 hover:border-amber-500/40 hover:bg-[#1a2044] transition-all bg-[#090b14]/50 flex flex-col justify-between h-full shadow-inner">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <p className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-amber-400 transition-colors line-clamp-2">{assignment.title}</p>
                          <span className="text-[10px] font-black px-2.5 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {safeFormat(assignment.due_date, 'd MMM')}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-lg inline-block w-fit border border-white/5">{assignment.subject?.name}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold bg-[#090b14]/50 rounded-2xl border border-dashed border-white/10 text-sm">لا توجد واجبات مطلوبة حالياً</div>
                )}
              </div>
            </div>

            {/* Upcoming Exams */}
            <div className="rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all relative overflow-hidden">
              <div className="mb-6 flex items-center justify-between relative z-10">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 shadow-inner"><Bell className="h-5 w-5 text-rose-400" /></div> اختبارات قادمة
                </h2>
              </div>
              <div className="space-y-4 relative z-10">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam) => (
                    <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group">
                      <div className="p-5 rounded-2xl border border-white/10 hover:border-rose-500/40 hover:bg-[#1a2044] transition-all bg-[#090b14]/50 flex flex-col justify-between h-full shadow-inner">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <p className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-rose-400 transition-colors line-clamp-2">{exam.title}</p>
                          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors"><Play className="h-4 w-4" /></div>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-lg inline-block w-fit border border-white/5 mb-4">{exam.subject?.name}</p>
                        <div className="flex items-center gap-2 text-[11px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl uppercase tracking-widest">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {(() => {
                              if (!exam.exam_date) return '...';
                              const fullDateStr = (exam.start_time || '00:00').includes('T') ? exam.start_time : `${exam.exam_date}T${exam.start_time || '00:00'}`;
                              return safeFormat(fullDateStr, 'EEEE، d MMM - h:mm a');
                            })()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold bg-[#090b14]/50 rounded-2xl border border-dashed border-white/10 text-sm">لا توجد اختبارات مجدولة حالياً</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
