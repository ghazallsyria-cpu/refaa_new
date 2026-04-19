/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle, Camera, Play, Star, ChevronRight,
  AlertTriangle, ShieldAlert, HeartHandshake, Award, ArrowUpRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { format, startOfWeek, addDays } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

const containerVariants: any = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: any = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

export default function TeacherDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  const [teacherData, setTeacherData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [myBadges, setMyBadges] = useState<any[]>([]);

  const [attendanceStatus, setAttendanceStatus] = useState<{
    isActive: boolean;
    missedPeriods: number[];
    completed: boolean;
    totalToday: number;
  }>({ isActive: false, missedPeriods: [], completed: false, totalToday: 0 });

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalAssignments: 0,
    avgAttendance: 0,
    absenceRate: 0
  });
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { fetchTeacherDashboardData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    const autoRecordPresence = async () => {
      if (user?.id && authRole === 'teacher') {
        try {
          await supabase.rpc('auto_record_teacher_presence', { p_user_id: user.id });
        } catch (error) {
          console.error("Error auto-recording presence:", error);
        }
      }
    };

    if (authRole === 'teacher') {
       autoRecordPresence();
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (authRole === 'teacher') {
         autoRecordPresence();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [user, authRole]);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTeacherDashboardData();
      
      if (data) {
        setTeacherData(data.teacher);
        setSections(data.sections);
        setRecentExams(data.recentExams);
        setRecentAssignments(data.recentAssignments);
        setSchedule(data.schedule);
        setPeriods(data.periods);
        setMessages(data.messages);
        setStats(prev => ({
          ...prev,
          ...data.stats
        }));
        
        if (data.assignmentStats) {
            setAssignmentStats(data.assignmentStats);
        }

        if (data.teacher?.id) {
            const { data: badgesData } = await supabase
              .from('student_badges')
              .select('*, badge:badges(*)')
              .eq('student_id', data.teacher.id)
              .order('granted_at', { ascending: false });
            
            if (badgesData) {
              setMyBadges(badgesData);
            }

            const { data: absences } = await supabase
              .from('attendance_records')
              .select('student_id, students(users(full_name)), sections(name, classes(name))')
              .eq('teacher_id', data.teacher.id)
              .eq('status', 'absent');

            if (absences) {
              const studentAbsences = new Map();
              absences.forEach((a: any) => {
                const sid = a.student_id;
                if (!studentAbsences.has(sid)) {
                  const stuObj = Array.isArray(a.students) ? a.students[0] : a.students;
                  const userObj = Array.isArray(stuObj?.users) ? stuObj.users[0] : stuObj?.users;
                  const secObj = Array.isArray(a.sections) ? a.sections[0] : a.sections;
                  const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
                  
                  studentAbsences.set(sid, {
                    id: sid,
                    name: userObj?.full_name || 'طالب غير معروف',
                    className: `${classObj?.name || ''} - ${secObj?.name || ''}`,
                    count: 0
                  });
                }
                studentAbsences.get(sid).count++;
              });

              const atRisk = Array.from(studentAbsences.values())
                                  .filter((s: any) => s.count >= 5)
                                  .sort((a: any, b: any) => b.count - a.count);
              setAtRiskStudents(atRisk);
            }

            const now = new Date();
            if (now >= SYSTEM_START_DATE && data.schedule && data.periods) {
              const todayStr = now.toLocaleDateString('en-CA');
              const currentDayOfWeek = now.getDay() + 1; 
              
              const todaysScheduleData = data.schedule.filter((s: any) => s.day_of_week === currentDayOfWeek);
              const myPeriodsToday = Array.from(new Set(todaysScheduleData.map((s: any) => s.period)));

              if (myPeriodsToday.length === 0) {
                setAttendanceStatus({ isActive: true, completed: true, missedPeriods: [], totalToday: 0 });
              } else {
                const { data: recs } = await supabase
                  .from('attendance_records')
                  .select('*')
                  .eq('date', todayStr)
                  .eq('teacher_id', data.teacher.id);

                const recordedPeriods = new Set(recs?.map((r: any) => r.period || r.period_number).filter(Boolean) || []);
                const missed: number[] = [];
                
                myPeriodsToday.forEach((pNum: any) => {
                  if (recordedPeriods.has(pNum)) return;

                  const pInfo = data.periods.find((p: any) => p.period_number === pNum);
                  if (pInfo && pInfo.end_time) {
                    const [h, m] = pInfo.end_time.split(':').map(Number);
                    const endTime = new Date(now);
                    endTime.setHours(h, m, 0, 0);

                    if (now > endTime) {
                      missed.push(pNum);
                    }
                  }
                });

                setAttendanceStatus({
                  isActive: true,
                  missedPeriods: missed.sort((a, b) => a - b),
                  completed: missed.length === 0 && recordedPeriods.size >= myPeriodsToday.length,
                  totalToday: myPeriodsToday.length
                });
              }
            }
        }
      }
    } catch (error) {
      console.error('Error fetching teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTeacherDashboardData]);

  useEffect(() => {
    if (!isChecking && (authRole === 'teacher' || authRole === 'admin' || authRole === 'management')) {
      fetchData();
    }
  }, [fetchData, isChecking, authRole]);

  const todaysSchedule = useMemo(() => {
    const today = new Date().getDay() + 1; 
    return schedule.filter(s => s.day_of_week === today);
  }, [schedule]);

  const unreadMessagesCount = useMemo(() => {
    return messages.filter(m => !m.is_read).length;
  }, [messages]);

  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-14 h-14 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') {
    return <div className="p-10 text-center font-black text-rose-500 min-h-[80vh] flex items-center justify-center bg-[#090b14]">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#090b14] relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
          <p className="text-slate-400 font-bold animate-pulse tracking-widest">جاري إعداد لوحتك المدرسية...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = teacherData?.users?.avatar_url;

  return (
    <motion.div 
      initial="hidden" animate="visible" variants={containerVariants}
      className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo pt-6"
      dir="rtl"
    >
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <AnimatePresence>
          {attendanceStatus.isActive && attendanceStatus.totalToday > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full">
              {attendanceStatus.missedPeriods.length > 0 ? (
                <div className="bg-[#131836]/90 border border-rose-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)] z-20 backdrop-blur-xl">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="flex items-start gap-5 relative z-10 w-full md:w-auto">
                    <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl shadow-lg shadow-rose-500/30 animate-[pulse_2s_ease-in-out_infinite] shrink-0">
                      <AlertTriangle className="h-8 w-8 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">تنبيه إداري: سجلات غياب غير مكتملة!</h3>
                      <p className="text-sm font-bold text-slate-300 mb-4 leading-relaxed">
                        أستاذي الكريم، بحسب <strong className="text-emerald-400">التوقيت الرسمي المعتمد من الإدارة</strong>، لقد انتهى وقت الحصص التالية ولم تقم بتسجيل غياب الطلاب لها حتى الآن:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attendanceStatus.missedPeriods.map(p => (
                          <span key={p} className="px-4 py-1.5 bg-[#090b14]/50 text-rose-400 font-black text-xs sm:text-sm rounded-xl shadow-sm border border-rose-500/30">الحصة {p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link href="/attendance" className="relative z-10 shrink-0 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-[1.5rem] shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95 w-full md:w-auto text-center border border-rose-500/50">
                    تسجيل الغياب الآن
                  </Link>
                </div>
              ) : attendanceStatus.completed ? (
                <div className="bg-[#131836]/60 border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] flex items-center gap-5 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)] z-20 backdrop-blur-xl">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-500/30 shrink-0 relative z-10">
                    <HeartHandshake className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">شكراً لتعاونك وإخلاصك!</h3>
                    <p className="text-sm font-bold text-slate-300 leading-relaxed">
                      لقد قمت بتسجيل الغياب لجميع حصصك المجدولة اليوم (<strong className="text-emerald-400">{attendanceStatus.totalToday} حصص</strong>) بنجاح. جهودك مقدرة وسجلاتك مكتملة تماماً.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#131836]/60 border border-indigo-500/30 p-6 rounded-[2rem] flex items-start gap-4 backdrop-blur-xl shadow-lg">
                   <div className="p-3 bg-indigo-500/20 rounded-xl shadow-inner border border-indigo-500/30 shrink-0"><Clock className="h-6 w-6 text-indigo-400" /></div>
                   <div>
                     <h4 className="text-base font-black text-white mb-1">جدولك اليوم: {attendanceStatus.totalToday} حصص</h4>
                     <p className="text-sm font-bold text-slate-400 leading-relaxed">النظام يراقب أوقات الحصص المعتمدة وسيقوم بتذكيرك آلياً بتسجيل الغياب فور انتهاء وقت كل حصة لضمان دقة السجلات.</p>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#131836] via-[#1a2044] to-[#0f142b] p-8 sm:p-12 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
              <div className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-[#090b14]/50 backdrop-blur-md flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={teacherData?.users?.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-indigo-400 drop-shadow-md">{teacherData?.users?.full_name?.charAt(0) || 'م'}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-indigo-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-emerald-400 border-4 border-[#090b14] rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
              </div>

              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-black uppercase tracking-widest mb-3 backdrop-blur-sm shadow-sm text-indigo-400">
                  <Star className="w-3.5 h-3.5" /> <span>لوحة تحكم المعلم</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight drop-shadow-md text-white">
                  مرحباً، أ. {teacherData?.users?.full_name} 👋
                </h1>
                <p className="text-slate-300 text-base sm:text-lg font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-[#090b14]/50 w-fit px-4 py-2 rounded-2xl backdrop-blur-md border border-white/5 mx-auto sm:mx-0 shadow-inner">
                  <Clock className="h-5 w-5 text-indigo-400 shrink-0" />
                  <span>لديك اليوم <strong className="text-white text-xl mx-1">{todaysSchedule.length}</strong> حصص و <strong className="text-white text-xl mx-1">{recentAssignments.length}</strong> واجبات للتقييم.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <Link href="/attendance" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md px-6 py-4 text-sm font-black text-white hover:bg-white/10 transition-all border border-white/10 hover:scale-105 active:scale-95 shadow-lg">
                <UserCheck className="h-5 w-5" /> رصد الحضور
              </Link>
              <Link href="/exams/builder/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition-all hover:scale-105 active:scale-95 border border-indigo-400/50">
                <Plus className="h-5 w-5" /> إنشاء اختبار
              </Link>
            </div>
          </div>

          {myBadges.length > 0 && (
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 w-full">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف: أوسمة التميز التي حصلت عليها
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar mask-fade-edges">
                {myBadges.map((badgeEntry, index) => (
                 <div key={badgeEntry.id || index} className="flex-shrink-0 bg-[#090b14]/40 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 flex items-center gap-5 w-[24rem] hover:bg-white/5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/10 group cursor-default">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                    <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl group-hover:bg-amber-500/20 transition-colors"></div>
                    {badgeEntry.badge?.image_url ? (
                      <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized referrerPolicy="no-referrer" className="object-contain drop-shadow-2xl relative z-10" />
                    ) : (
                      <Award className="w-full h-full text-amber-400 relative z-10 drop-shadow-lg p-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-white truncate">{badgeEntry.badge?.name}</p>
                    <p className="text-xs font-bold text-slate-400 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>{badgeEntry.reason || 'تقديراً للجهود والتميز'}</p>
                  </div>
                 </div>
                ))}
              </div>
            </div>
          )}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl mix-blend-overlay animate-pulse pointer-events-none"></div>
        </motion.div>

        {/* 🚀 نظام الإنذار المبكر للمعلم (The Danger Zone) */}
        <AnimatePresence>
          {atRiskStudents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-rose-500/10 p-6 sm:p-8 text-white shadow-[0_0_30px_rgba(244,63,94,0.15)] border border-rose-500/30 backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-2xl animate-pulse pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6 sm:mb-8">
                <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 bg-rose-500/20 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-rose-500/30 shadow-inner shrink-0">
                    <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-rose-400 animate-bounce" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#090b14]/50 backdrop-blur-sm text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-rose-500/30 text-rose-400">
                      <ShieldAlert className="w-3.5 h-3.5" /> إنذار سلوك ومواظبة
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-white leading-tight">تنبيه: {atRiskStudents.length} طلاب تجاوزوا حد الغياب لديك!</h2>
                    <p className="text-slate-300 text-xs sm:text-sm font-bold leading-relaxed max-w-xl">حسب لائحة السلوك والمواظبة، هؤلاء الطلاب تجاوزوا (5 حصص غياب) في حصصك. يرجى الانتباه ورفع التقرير للإدارة.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                 {atRiskStudents.slice(0, 4).map((student, idx) => (
                    <div key={idx} className="bg-[#090b14]/50 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-rose-500/30 transition-colors shadow-inner">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm border border-rose-500/30 shrink-0">{student.name.charAt(0)}</div>
                         <div className="min-w-0 pr-1">
                            <p className="font-black text-white text-sm truncate group-hover:text-rose-400 transition-colors">{student.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{student.className}</p>
                         </div>
                       </div>
                       <div className="text-center shrink-0 ml-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                          <span className="block text-xl font-black text-rose-400 leading-none">{student.count}</span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">حصص</span>
                       </div>
                    </div>
                 ))}
              </div>

              {atRiskStudents.length > 4 && (
                <div className="relative z-10 mt-6 flex justify-center sm:justify-end border-t border-white/10 pt-6">
                  <Link href="/dashboard/teacher/warnings" className="group flex items-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-rose-500 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-95 border border-rose-500/50">
                    <span>عرض كل الطلاب المنذرين ({atRiskStudents.length}) وتصدير التقرير للإدارة</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
              {atRiskStudents.length > 0 && atRiskStudents.length <= 4 && (
                <div className="relative z-10 mt-6 flex justify-center sm:justify-end border-t border-white/10 pt-6">
                  <Link href="/dashboard/teacher/warnings" className="group flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-white/20 transition-all border border-white/20 hover:border-white/30">
                    <span>إدارة الإنذارات وتصدير التقرير</span>
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'متوسط الحضور', value: `${stats.avgAttendance || 100}%`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'معدل الغياب', value: `${stats.absenceRate || 0}%`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className={`bg-[#131836]/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-lg border border-white/10 flex flex-col justify-center items-center text-center gap-3 hover:border-white/20 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden group`}>
              <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg.split(' ')[0]} blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} border ${stat.border} flex items-center justify-center ${stat.color} relative z-10 group-hover:scale-110 transition-transform shadow-inner`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div className="relative z-10">
                <p className="text-3xl font-black text-white leading-none mb-1 drop-shadow-md">{stat.value}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 🚀 Main Grids */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-2 space-y-8">
            {/* Today's Schedule */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#090b14]/30 relative z-10 gap-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shadow-inner">
                    <Clock className="h-6 w-6 text-indigo-400" />
                  </div>
                  جدول حصص اليوم
                </h2>
                <span className="text-sm font-bold px-4 py-2 bg-[#090b14]/50 text-slate-300 rounded-xl border border-white/5 shadow-inner flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  {mounted ? format(new Date(), 'EEEE، d MMMM', { locale: arSA }) : '...'}
                </span>
              </div>
              
              <div className="p-6 sm:p-8 relative z-10 bg-transparent overflow-x-hidden">
                {todaysSchedule.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/20 before:via-white/10 before:to-transparent">
                    {todaysSchedule.map((item, i) => {
                      const current = isCurrentClass(item.period);
                      const next = isNextClass(item.period);
                      
                      return (
                        <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-2xl border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500",
                            current ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-900 scale-125 border-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.5)]" : 
                            next ? "bg-amber-500 text-slate-900 border-[#090b14]" : "bg-[#131836] text-slate-400 border-[#090b14]"
                          )}>
                            {current ? <Play className="h-5 w-5 animate-pulse ml-1" /> : <span className="text-base font-black">{item.period}</span>}
                          </div>

                          <div className={cn(
                            "w-[calc(100%-4.5rem)] md:w-[calc(50%-3rem)] p-5 rounded-3xl border transition-all duration-500 cursor-pointer backdrop-blur-md",
                            current ? "bg-[#1a2044] border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02]" : 
                            next ? "bg-amber-500/10 border-amber-500/30 shadow-md" : "bg-[#090b14]/50 border-white/5 shadow-sm hover:border-white/10"
                          )}>
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3">
                              <h3 className={cn("text-lg font-black transition-colors truncate pl-2", current ? "text-emerald-400" : next ? "text-amber-400" : "text-white")}>{item.subjects?.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && (
                                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> החصة الآن
                                  </span>
                                )}
                                {next && !current && <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold shadow-inner">الحصة القادمة</span>}
                                <span className={cn("text-xs font-black px-3 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-[#090b14]/50 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-400 border-white/10")}>الحصة {item.period}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-white/5 gap-3">
                              <p className={cn("text-sm font-bold flex items-center gap-2", current ? "text-emerald-400/80" : "text-slate-400")}>
                                <Users className="h-4 w-4 opacity-70 shrink-0" />
                                <span className="truncate">{item.sections?.classes?.name} - {item.sections?.name}</span>
                              </p>
                              {(() => {
                                const periodInfo = periods.find(p => p.period_number === item.period);
                                if (periodInfo?.start_time && periodInfo?.end_time) {
                                  return (
                                    <span className={cn("text-[11px] font-black tracking-widest flex items-center gap-1.5 bg-[#090b14]/50 px-2.5 py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-emerald-400 border-emerald-500/20" : "text-slate-500 border-white/5")} dir="ltr">
                                      <Clock className="w-3 h-3 shrink-0" />
                                      {periodInfo.start_time.substring(0, 5)} - {periodInfo.end_time.substring(0, 5)}
                                    </span>
                                  );
                                }
                                return null;
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
                    <p className="text-sm text-slate-400 font-bold">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم في النظام.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* My Sections */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all">
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-inner"><BookOpen className="h-6 w-6 text-blue-400" /></div> فصولي الدراسية
                </h2>
                <Link href="/classes" className="text-sm font-bold text-blue-400 hover:text-white flex items-center gap-1 bg-blue-500/10 px-4 py-2 rounded-xl hover:bg-blue-500/30 transition-colors shadow-sm border border-blue-500/20">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
              </div>
              <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-transparent">
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <Link href={`/classes`} key={section.id} className="block group">
                      <div className="p-6 rounded-[2rem] bg-[#090b14]/50 border border-white/5 hover:border-blue-500/50 hover:bg-[#1a2044] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all h-full flex flex-col relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/10 rounded-br-full -mt-2 -ml-2 transition-transform group-hover:scale-110 z-0 blur-xl"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div>
                            <h3 className="font-black text-xl text-white group-hover:text-blue-400 transition-colors mb-1">{section.classes?.name}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section.name}</p>
                          </div>
                          <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner border border-blue-500/30 shrink-0"><Users className="h-6 w-6" /></div>
                        </div>
                        <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between text-sm relative z-10">
                          <span className="text-slate-300 font-bold flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"><Users className="h-4 w-4 text-slate-500" /> {Array.isArray(section.students) ? section.students[0]?.count || 0 : section.students?.count || 0} طالب</span>
                          <span className="text-blue-400 font-black group-hover:underline flex items-center gap-1 bg-[#090b14] px-3 py-1.5 rounded-lg border border-white/5">إدارة الفصل <ChevronLeft className="h-4 h-4" /></span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 p-16 text-center text-slate-500 bg-[#090b14]/30 rounded-[2rem] border border-dashed border-white/10 shadow-inner">لا توجد فصول مسندة إليك حالياً</div>
                )}
              </div>
            </motion.div>

            {/* Assignment Stats */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all relative">
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 shadow-inner"><BarChart2 className="h-6 w-6 text-amber-400" /></div> إحصائيات إنجاز الواجبات
                </h2>
              </div>
              <div className="p-6 sm:p-8 bg-transparent">
                <div className="space-y-8 bg-[#090b14]/50 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                  {assignmentStats.length > 0 ? (
                    assignmentStats.map((stat, i) => (
                      <div key={i} className="space-y-3 group">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm font-black text-white mb-1 group-hover:text-amber-400 transition-colors">{stat.title}</p>
                            <p className="text-xs font-bold text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 inline-block">{stat.className}</p>
                          </div>
                          <div className="text-left flex flex-col items-end">
                            <span className={`text-xl font-black ${stat.percentage > 80 ? 'text-emerald-400' : stat.percentage > 50 ? 'text-indigo-400' : 'text-amber-400'}`}>{stat.percentage}%</span>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{stat.submissionCount} من {stat.totalStudents} تسليم</p>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${stat.percentage}%` }} transition={{ duration: 1.5, delay: i * 0.1, type: 'spring' }} className={`h-full rounded-full ${stat.percentage > 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : stat.percentage > 50 ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-500 font-bold border border-dashed border-white/10 rounded-3xl bg-[#090b14]/30">لا توجد واجبات نشطة حالياً لحساب نسبة الإنجاز</div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>

          <div className="space-y-8">
            <AnnouncementsWidget authRole="teacher" />

            {/* Recent Exams */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30"><FileText className="h-5 w-5 text-indigo-400" /></div> الاختبارات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentExams.length > 0 ? (
                  recentExams.map((exam) => (
                    <div key={exam.id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-black text-white text-base leading-tight group-hover:text-indigo-400 transition-colors pr-2 border-r-2 border-transparent group-hover:border-indigo-500 line-clamp-1">{exam.title}</h3>
                        <span className="text-[10px] font-black px-2 py-1 bg-[#090b14]/80 text-slate-400 border border-white/5 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> {exam.start_time ? format(new Date(`2000-01-01T${exam.start_time}`), 'hh:mm a', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mb-4 bg-white/5 px-3 py-1.5 rounded-lg inline-block border border-white/5">
                        {exam.subject_name} • {exam.section_name}
                      </p>
                      <div className="flex gap-3">
                        <Link href={`/exams/builder/${exam.id}`} className="flex-1 text-center py-2 text-xs font-black text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-inner">تعديل</Link>
                        <Link href={`/exams/results/${exam.id}`} className="flex-1 text-center py-2 text-xs font-black text-slate-900 bg-indigo-500 rounded-xl hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400">النتائج</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-500 font-bold bg-[#090b14]/30 m-4 rounded-2xl border border-dashed border-white/10">لا توجد اختبارات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#090b14]/30">
                <Link href="/exams" className="block w-full text-center text-sm font-black text-indigo-400 hover:text-white hover:bg-indigo-500/20 border border-transparent hover:border-indigo-500/30 py-3 rounded-xl transition-all">عرض كل الاختبارات</Link>
              </div>
            </motion.div>

            {/* Recent Assignments */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30"><BookOpen className="h-5 w-5 text-amber-400" /></div> الواجبات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-black text-white text-base leading-tight group-hover:text-amber-400 transition-colors pr-2 border-r-2 border-transparent group-hover:border-amber-500 line-clamp-1">{assignment.title}</h3>
                        <span className="text-[10px] font-black px-2 py-1 bg-[#090b14]/80 text-amber-500/70 border border-amber-500/20 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3" /> {mounted ? format(new Date(assignment.due_date), 'd MMM', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mb-4 bg-white/5 px-3 py-1.5 rounded-lg inline-block border border-white/5">
                        {assignment.subject_name} • {assignment.section_name}
                      </p>
                      <div className="flex gap-3">
                        <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-2 text-xs font-black text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30 transition-all shadow-inner">تعديل</Link>
                        <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-2 text-xs font-black text-slate-900 bg-amber-500 rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400">التقييم</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-500 font-bold bg-[#090b14]/30 m-4 rounded-2xl border border-dashed border-white/10">لا توجد واجبات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#090b14]/30">
                <Link href="/assignments" className="block w-full text-center text-sm font-black text-amber-400 hover:text-white hover:bg-amber-500/20 border border-transparent hover:border-amber-500/30 py-3 rounded-xl transition-all">عرض كل الواجبات</Link>
              </div>
            </motion.div>

            {/* Messages */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all relative">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#090b14]/30">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30"><MessageSquare className="h-5 w-5 text-emerald-400" /></div> صندوق الرسائل
                </h2>
                {unreadMessagesCount > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-[0_0_10px_rgba(225,29,72,0.8)] animate-pulse relative z-10 border border-rose-400">{unreadMessagesCount}</span>
                )}
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {messages.length > 0 ? (
                  messages.map((msg, i) => {
                    const isUnread = !msg.is_read;
                    return (
                      <Link href={`/messages?id=${msg.id}`} key={i} className={`flex gap-4 p-6 transition-all group relative ${isUnread ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-l-4 border-l-indigo-400' : 'hover:bg-white/[0.02] border-l-4 border-l-transparent'}`}>
                        {isUnread && <div className="absolute top-1/2 right-3 w-2.5 h-2.5 rounded-full bg-indigo-400 transform -translate-y-1/2 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></div>}
                        
                        <div className="h-12 w-12 rounded-2xl bg-[#090b14] border border-white/10 flex-shrink-0 flex items-center justify-center font-black text-lg text-emerald-400 shadow-inner group-hover:scale-110 transition-transform overflow-hidden relative z-10">
                          {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} alt={msg.sender.full_name} className="w-full h-full object-cover" />
                          ) : (
                            msg.sender?.full_name?.charAt(0) || 'م'
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className={`text-sm truncate transition-colors ${isUnread ? 'font-black text-white group-hover:text-indigo-400' : 'font-bold text-slate-300 group-hover:text-emerald-400'}`}>{msg.sender?.full_name}</p>
                            <p className={`text-[10px] whitespace-nowrap mr-2 px-2.5 py-1 rounded-md border ${isUnread ? 'bg-indigo-500/20 text-indigo-300 font-black border-indigo-500/30' : 'bg-white/5 text-slate-500 font-bold border-white/5'}`}>{mounted ? format(new Date(msg.created_at), 'd MMM', { locale: arSA }) : '...'}</p>
                          </div>
                          <p className={`text-xs truncate mb-1 ${isUnread ? 'text-indigo-300 font-black' : 'text-emerald-400/80 font-bold'}`}>{msg.subject}</p>
                          <p className={`text-xs truncate leading-relaxed ${isUnread ? 'text-slate-300 font-medium' : 'text-slate-500 font-medium'}`}>{msg.content}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center bg-[#090b14]/30 m-4 rounded-2xl border border-dashed border-white/10">
                    <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/5"><CheckCircle2 className="h-7 w-7 text-slate-600" /></div>
                    <span className="font-bold">صندوق الوارد فارغ</span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#090b14]/30">
                <Link href="/messages" className="block w-full text-center text-sm font-black text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 py-3 rounded-xl transition-all">فتح صندوق الرسائل</Link>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
