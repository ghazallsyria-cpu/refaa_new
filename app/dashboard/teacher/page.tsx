/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle, Camera, Play, Star, ChevronRight,
  AlertTriangle, ShieldAlert, HeartHandshake, Award, ArrowUpRight, Loader2, Sparkles
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
      if (!teacherData) setLoading(true);
      fetchData();
    }
  }, [fetchData, isChecking, authRole, teacherData]);

  const todaysSchedule = useMemo(() => {
    const today = new Date().getDay() + 1; 
    return schedule.filter(s => s.day_of_week === today);
  }, [schedule]);

  const unreadMessagesCount = useMemo(() => {
    return messages.filter(m => !m.is_read).length;
  }, [messages]);

  if (isChecking && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</p>
        </div>
      </div>
    );
  }

  if (loading && !teacherData) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد لوحتك المدرسية...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = teacherData?.users?.avatar_url;

  return (
    <motion.div 
      initial="hidden" animate="visible" variants={containerVariants}
      className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6"
      dir="rtl"
    >
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* 🚀 نظام التنبيهات (Attendance Status) */}
        <AnimatePresence>
          {attendanceStatus.isActive && attendanceStatus.totalToday > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full">
              {attendanceStatus.missedPeriods.length > 0 ? (
                <div className="glass-panel border-rose-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)] z-20">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="flex items-start gap-5 relative z-10 w-full md:w-auto">
                    <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl shadow-lg shadow-rose-500/30 animate-[pulse_2s_ease-in-out_infinite] shrink-0">
                      <AlertTriangle className="h-8 w-8 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">تنبيه إداري: سجلات غياب غير مكتملة!</h3>
                      <p className="text-sm font-bold text-slate-300 mb-4 leading-relaxed">
                        أستاذي الكريم، بحسب <strong className="text-amber-400">التوقيت الرسمي المعتمد من الإدارة</strong>، لقد انتهى وقت الحصص التالية ولم تقم بتسجيل غياب الطلاب لها حتى الآن:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attendanceStatus.missedPeriods.map(p => (
                          <span key={p} className="px-4 py-1.5 bg-[#02040a]/80 text-rose-400 font-black text-xs sm:text-sm rounded-xl shadow-sm border border-rose-500/30">الحصة {p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link href="/attendance" className="relative z-10 shrink-0 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-[1.5rem] shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95 w-full md:w-auto text-center border border-rose-500/50">
                    تسجيل الغياب الآن
                  </Link>
                </div>
              ) : attendanceStatus.completed ? (
                <div className="glass-panel border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)] z-20 text-center sm:text-right">
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
                <div className="glass-panel border-blue-500/30 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg text-center sm:text-right">
                   <div className="p-3 bg-blue-500/20 rounded-xl shadow-inner border border-blue-500/30 shrink-0"><Clock className="h-6 w-6 text-blue-400" /></div>
                   <div>
                     <h4 className="text-base font-black text-white mb-1">جدولك اليوم: {attendanceStatus.totalToday} حصص</h4>
                     <p className="text-sm font-bold text-slate-400 leading-relaxed">النظام يراقب أوقات الحصص المعتمدة وسيقوم بتذكيرك آلياً بتسجيل الغياب فور انتهاء وقت كل حصة لضمان دقة السجلات.</p>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Teacher Welcome Hero (اللوحة الملكية للمعلم) */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-8 sm:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10">
          <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right w-full">
              <div className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-[#0f1423] backdrop-blur-md flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 group-hover:border-amber-500/50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={teacherData?.users?.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-amber-400 drop-shadow-md">{teacherData?.users?.full_name?.charAt(0) || 'م'}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-amber-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 bg-emerald-400 border-4 border-[#02040a] rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
              </div>

              <div className="pt-2 w-full">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-amber-400">
                  <Star className="w-3.5 h-3.5" /> <span>لوحة تحكم المعلم</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight drop-shadow-md text-white">
                  مرحباً، أ. {teacherData?.users?.full_name} 👋
                </h1>
                <p className="text-slate-300 text-sm sm:text-lg font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-[#02040a]/60 w-fit px-4 py-2 rounded-2xl border border-white/5 mx-auto sm:mx-0 shadow-inner">
                  <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>لديك اليوم <strong className="text-amber-400 text-xl mx-1 drop-shadow-sm">{todaysSchedule.length}</strong> حصص و <strong className="text-amber-400 text-xl mx-1 drop-shadow-sm">{recentAssignments.length}</strong> واجبات.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center w-full md:w-auto shrink-0">
              <Link href="/attendance" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md px-6 py-4 text-sm font-black text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95 shadow-lg w-full sm:w-auto">
                <UserCheck className="h-5 w-5 text-amber-400" /> رصد الحضور
              </Link>
              <Link href="/exams/builder/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 border border-amber-300/50 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> إنشاء اختبار
              </Link>
            </div>
          </div>

          {/* 🚀 Badges (لوحة الشرف الذهبية) */}
          {myBadges.length > 0 && (
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 w-full">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm">
                <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف: أوسمة التميز
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {myBadges.map((badgeEntry, index) => (
                 <div key={badgeEntry.id || index} className="snap-center flex-shrink-0 bg-[#0f1423]/60 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 flex items-center gap-5 w-[20rem] sm:w-[24rem] hover:bg-[#0f1423] transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-500/30 group cursor-default">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                    <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl group-hover:bg-amber-500/30 transition-colors"></div>
                    {badgeEntry.badge?.image_url ? (
                      <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized referrerPolicy="no-referrer" className="object-contain drop-shadow-2xl relative z-10" />
                    ) : (
                      <Award className="w-full h-full text-amber-400 relative z-10 drop-shadow-lg p-2" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-right">
                    <p className="text-sm sm:text-base font-black text-white truncate drop-shadow-sm">{badgeEntry.badge?.name}</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>{badgeEntry.reason || 'تقديراً للجهود والتميز'}</p>
                  </div>
                 </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* 🚀 البانر السينمائي (مجالس الفصول - للمعلم) */}
        {sections.length > 0 && (
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(245,158,11,0.1)] border border-amber-500/30 backdrop-blur-xl bg-[#0f1423]">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-amber-600/10 to-transparent pointer-events-none z-0"></div>
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-right">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
                <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-amber-500/30 shadow-inner shrink-0 relative group">
                  <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f1423] shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
                </div>
                <div>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#02040a]/80 backdrop-blur-sm text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-amber-500/30 text-amber-400 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5" /> مجالس الفصول التفاعلية
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-white drop-shadow-md">غرف النقاش الموحدة</h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-bold opacity-90 max-w-xl mx-auto lg:mx-0">بصفتك معلماً، يمكنك الدخول لغرفة أي صف تدرسه. قم بتوجيه الطلاب، تثبيت الإعلانات، والتفاعل مع طاقم التدريس في مكان واحد.</p>
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto w-full lg:w-auto max-w-full custom-scrollbar pb-2 snap-x">
                {sections.map((sec) => (
                  <Link key={sec.id} href={`/messages?sectionId=${sec.id}`} className="snap-center group relative inline-flex flex-col items-center justify-center p-3 sm:p-4 bg-[#02040a]/60 hover:bg-[#0a0d16] text-white rounded-2xl shadow-inner border border-white/5 hover:border-amber-500/50 transition-all hover:-translate-y-1 shrink-0 min-w-[100px] z-10">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-amber-400 mb-2 transition-colors drop-shadow-sm" />
                    <span className="text-xs sm:text-sm font-black whitespace-nowrap">{sec.classes?.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-0.5">{sec.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 🚀 نظام الإنذار المبكر للمعلم (The Danger Zone) */}
        <AnimatePresence>
          {atRiskStudents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-rose-950/30 p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(225,29,72,0.15)] border border-rose-500/30 backdrop-blur-xl">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-3xl animate-pulse pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 mb-6 sm:mb-8 text-center lg:text-right">
                <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/20 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-rose-500/40 shadow-inner shrink-0">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 animate-bounce" />
                  </div>
                  <div>
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#02040a]/80 backdrop-blur-sm text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-rose-500/30 text-rose-400">
                      <ShieldAlert className="w-3.5 h-3.5" /> إنذار سلوك ومواظبة
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white leading-tight drop-shadow-md">تنبيه: {atRiskStudents.length} طلاب تجاوزوا حد الغياب!</h2>
                    <p className="text-slate-300 text-xs sm:text-sm font-bold leading-relaxed max-w-xl mx-auto lg:mx-0">حسب لائحة السلوك والمواظبة، هؤلاء الطلاب تجاوزوا (5 حصص غياب) في حصصك. يرجى الانتباه ورفع التقرير للإدارة.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                 {atRiskStudents.slice(0, 4).map((student, idx) => (
                    <div key={idx} className="bg-[#02040a]/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-rose-500/40 hover:bg-rose-950/40 transition-all shadow-inner">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm border border-rose-500/30 shrink-0">{student.name.charAt(0)}</div>
                         <div className="min-w-0 pr-1">
                            <p className="font-black text-white text-sm truncate group-hover:text-rose-400 transition-colors drop-shadow-sm">{student.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{student.className}</p>
                         </div>
                       </div>
                       <div className="text-center shrink-0 ml-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 group-hover:bg-rose-500/10 group-hover:border-rose-500/30 transition-colors">
                          <span className="block text-xl font-black text-rose-400 leading-none drop-shadow-sm">{student.count}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">حصص</span>
                       </div>
                    </div>
                 ))}
              </div>

              {atRiskStudents.length > 0 && (
                <div className="relative z-10 mt-6 flex justify-center lg:justify-end border-t border-white/10 pt-6">
                  <Link href="/dashboard/teacher/warnings" className={`group flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all border ${atRiskStudents.length > 4 ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] border-rose-500/50 active:scale-95' : 'bg-white/10 text-white hover:bg-white/20 border-white/20'}`}>
                    <span>{atRiskStudents.length > 4 ? `عرض كل الطلاب المنذرين (${atRiskStudents.length})` : 'إدارة الإنذارات وتصدير التقرير'}</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {[
            { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'متوسط الحضور', value: `${stats.avgAttendance || 100}%`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'معدل الغياب', value: `${stats.absenceRate || 0}%`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className={`glass-panel p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-3 group`}>
              <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg.split(' ')[0]} blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none`}></div>
              <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl ${stat.bg} border ${stat.border} flex items-center justify-center ${stat.color} relative z-10 group-hover:scale-110 transition-transform shadow-inner`}>
                <stat.icon className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-md" />
              </div>
              <div className="relative z-10">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-none mb-1 sm:mb-2 drop-shadow-md">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 🚀 Main Grids */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          <div className="xl:col-span-2 space-y-6 lg:space-y-8 w-full">
            {/* Today's Schedule */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 relative z-10 gap-4 text-center sm:text-right">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
                  </div>
                  جدول حصص اليوم
                </h2>
                <span className="text-xs sm:text-sm font-bold px-4 py-2 sm:py-2.5 bg-[#02040a]/80 text-amber-400 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4 opacity-70" />
                  {mounted ? format(new Date(), 'EEEE، d MMMM', { locale: arSA }) : '...'}
                </span>
              </div>
              
              <div className="p-5 sm:p-6 lg:p-8 relative z-10 bg-transparent overflow-x-hidden">
                {todaysSchedule.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-amber-500/30 before:via-white/10 before:to-transparent">
                    {todaysSchedule.map((item, i) => {
                      const current = isCurrentClass(item.period);
                      const next = isNextClass(item.period);
                      
                      return (
                        <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500",
                            current ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 scale-110 sm:scale-125 border-[#02040a] shadow-[0_0_20px_rgba(245,158,11,0.5)]" : 
                            next ? "bg-[#0f1423] text-amber-400 border-amber-500/50" : "bg-[#02040a] text-slate-500 border-white/10"
                          )}>
                            {current ? <Play className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse ml-0.5 sm:ml-1" /> : <span className="text-sm sm:text-base font-black">{item.period}</span>}
                          </div>

                          <div className={cn(
                            "w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all duration-500 cursor-default backdrop-blur-md",
                            current ? "bg-[#0f1423]/90 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-[1.02]" : 
                            next ? "bg-amber-500/5 border-amber-500/20 shadow-sm" : "bg-[#02040a]/60 border-white/5 shadow-inner hover:border-white/10"
                          )}>
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                              <h3 className={cn("text-base sm:text-lg font-black transition-colors truncate pl-2", current ? "text-amber-400 drop-shadow-sm" : next ? "text-white" : "text-slate-300")}>{item.subjects?.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && (
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[9px] sm:text-[10px] font-bold text-amber-400 shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> الحصة الآن
                                  </span>
                                )}
                                {next && !current && <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] sm:text-[10px] font-bold shadow-inner">القادمة</span>}
                                <span className={cn("text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-[#02040a] text-amber-400 border-amber-500/20" : "bg-white/5 text-slate-400 border-white/10")}>الحصة {item.period}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-3">
                              <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", current ? "text-slate-200" : "text-slate-400")}>
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                                <span className="truncate">{item.sections?.classes?.name} - {item.sections?.name}</span>
                              </p>
                              {(() => {
                                const periodInfo = periods.find(p => p.period_number === item.period);
                                if (periodInfo?.start_time && periodInfo?.end_time) {
                                  return (
                                    <span className={cn("text-[9px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-amber-400 border-amber-500/20" : "text-slate-500 border-white/5")} dir="ltr">
                                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
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
                  <div className="text-center py-12 sm:py-16 bg-[#02040a]/50 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 mb-3 sm:mb-4 border border-white/5"><Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500" /></div>
                    <h3 className="text-lg sm:text-xl font-black text-white mb-2">لا توجد حصص اليوم</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم في النظام.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* My Sections */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl sm:rounded-2xl border border-blue-500/20 shadow-inner"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 drop-shadow-md" /></div> فصولي الدراسية
                </h2>
                <Link href="/classes" className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 bg-blue-500/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-blue-500/20 transition-colors shadow-sm border border-blue-500/20 w-full sm:w-auto active:scale-95">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
              </div>
              <div className="p-5 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 bg-transparent">
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <Link href={`/classes`} key={section.id} className="block group">
                      <div className="p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-[#0f1423]/60 border border-white/5 hover:border-blue-500/40 hover:bg-[#0f1423] hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all h-full flex flex-col relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/10 rounded-br-full -mt-2 -ml-2 transition-transform group-hover:scale-110 z-0 blur-2xl pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-5 sm:mb-6 relative z-10">
                          <div>
                            <h3 className="font-black text-lg sm:text-xl text-white group-hover:text-blue-400 transition-colors mb-1 drop-shadow-sm">{section.classes?.name}</h3>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{section.name}</p>
                          </div>
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner border border-blue-500/20 shrink-0"><Users className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                        </div>
                        <div className="mt-auto pt-4 sm:pt-5 border-t border-white/5 flex items-center justify-between text-xs sm:text-sm relative z-10">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5 bg-[#02040a]/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5 shadow-inner"><Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" /> {Array.isArray(section.students) ? section.students[0]?.count || 0 : section.students?.count || 0} طالب</span>
                          <span className="text-blue-400 font-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">إدارة <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-1 sm:col-span-2 p-12 sm:p-16 text-center text-slate-500 bg-[#02040a]/50 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner font-bold text-sm sm:text-base">لا توجد فصول مسندة إليك حالياً</div>
                )}
              </div>
            </motion.div>

            {/* Assignment Stats */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner"><BarChart2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 drop-shadow-md" /></div> إحصائيات إنجاز الواجبات
                </h2>
              </div>
              <div className="p-5 sm:p-6 lg:p-8 bg-transparent">
                <div className="space-y-6 sm:space-y-8 bg-[#0f1423]/40 p-5 sm:p-6 lg:p-8 rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/5 shadow-inner">
                  {assignmentStats.length > 0 ? (
                    assignmentStats.map((stat, i) => (
                      <div key={i} className="space-y-2 sm:space-y-3 group">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 sm:gap-0">
                          <div>
                            <p className="text-sm sm:text-base font-black text-white mb-1 group-hover:text-emerald-400 transition-colors drop-shadow-sm truncate">{stat.title}</p>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg border border-white/5 inline-block shadow-inner">{stat.className}</p>
                          </div>
                          <div className="text-left flex flex-row sm:flex-col items-center sm:items-end w-full sm:w-auto justify-between sm:justify-normal border-t sm:border-0 border-white/5 pt-2 sm:pt-0 mt-2 sm:mt-0">
                            <span className={`text-lg sm:text-xl font-black drop-shadow-md ${stat.percentage > 80 ? 'text-emerald-400' : stat.percentage > 50 ? 'text-blue-400' : 'text-amber-400'}`}>{stat.percentage}%</span>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{stat.submissionCount} من {stat.totalStudents} تسليم</p>
                          </div>
                        </div>
                        <div className="h-2.5 sm:h-3 w-full bg-[#02040a] rounded-full overflow-hidden shadow-inner border border-white/5">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${stat.percentage}%` }} transition={{ duration: 1.5, delay: i * 0.1, type: 'spring' }} className={`h-full rounded-full ${stat.percentage > 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : stat.percentage > 50 ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 sm:py-10 text-slate-500 font-bold border border-dashed border-white/10 rounded-[1.5rem] bg-[#02040a]/50 text-xs sm:text-sm shadow-inner">لا توجد واجبات نشطة حالياً لحساب نسبة الإنجاز</div>
                  )}
                </div>
              </div>
            </motion.div>

          </div>

          <div className="space-y-6 lg:space-y-8 w-full">
            <AnnouncementsWidget authRole="teacher" />

            {/* Recent Exams */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 drop-shadow-sm" /></div> الاختبارات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentExams.length > 0 ? (
                  recentExams.map((exam) => (
                    <div key={exam.id} className="p-5 sm:p-6 hover:bg-[#0f1423]/80 transition-colors group">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-indigo-400 transition-colors pr-2 border-r-2 border-transparent group-hover:border-indigo-500 line-clamp-1 drop-shadow-sm">{exam.title}</h3>
                        <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-[#02040a] text-slate-400 border border-white/5 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {exam.start_time ? format(new Date(`2000-01-01T${exam.start_time}`), 'hh:mm a', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-3 sm:mb-4 bg-[#02040a]/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-block border border-white/5 shadow-inner">
                        {exam.subject_name} • {exam.section_name}
                      </p>
                      <div className="flex gap-2 sm:gap-3">
                        <Link href={`/exams/builder/${exam.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-inner active:scale-95">تعديل</Link>
                        <Link href={`/exams/results/${exam.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-950 bg-indigo-500 rounded-xl hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400 active:scale-95">النتائج</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-10 text-center text-slate-500 font-bold bg-[#02040a]/50 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm shadow-inner">لا توجد اختبارات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#02040a]/40">
                <Link href="/exams" className="block w-full text-center text-xs sm:text-sm font-black text-indigo-400 hover:text-white hover:bg-indigo-500/20 border border-transparent hover:border-indigo-500/30 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95">عرض كل الاختبارات</Link>
              </div>
            </motion.div>

            {/* Recent Assignments */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" /></div> الواجبات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-5 sm:p-6 hover:bg-[#0f1423]/80 transition-colors group">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-amber-400 transition-colors pr-2 border-r-2 border-transparent group-hover:border-amber-500 line-clamp-1 drop-shadow-sm">{assignment.title}</h3>
                        <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-[#02040a] text-amber-500 border border-amber-500/20 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {mounted ? format(new Date(assignment.due_date), 'd MMM', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-3 sm:mb-4 bg-[#02040a]/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-block border border-white/5 shadow-inner">
                        {assignment.subject_name} • {assignment.section_name}
                      </p>
                      <div className="flex gap-2 sm:gap-3">
                        <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30 transition-all shadow-inner active:scale-95">تعديل</Link>
                        <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-950 bg-amber-500 rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400 active:scale-95">التقييم</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-10 text-center text-slate-500 font-bold bg-[#02040a]/50 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm shadow-inner">لا توجد واجبات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#02040a]/40">
                <Link href="/assignments" className="block w-full text-center text-xs sm:text-sm font-black text-amber-400 hover:text-white hover:bg-amber-500/20 border border-transparent hover:border-amber-500/30 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95">عرض كل الواجبات</Link>
              </div>
            </motion.div>

            {/* Messages */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-sm" /></div> صندوق الرسائل
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {messages.length > 0 ? (
                  messages.map((msg, i) => {
                    const isUnread = !msg.is_read;
                    return (
                      <Link href={`/messages?id=${msg.id}`} key={i} className={`flex gap-3 sm:gap-4 p-4 sm:p-6 transition-all group relative ${isUnread ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-l-4 border-l-indigo-500' : 'hover:bg-[#0f1423]/80 border-l-4 border-l-transparent'}`}>
                        {isUnread && <div className="absolute top-1/2 right-2 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 transform -translate-y-1/2 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></div>}
                        
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#02040a] border border-white/10 flex-shrink-0 flex items-center justify-center font-black text-base sm:text-lg text-emerald-400 shadow-inner group-hover:scale-110 transition-transform overflow-hidden relative z-10">
                          {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} alt={msg.sender.full_name} className="w-full h-full object-cover" />
                          ) : (
                            msg.sender?.full_name?.charAt(0) || 'م'
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className={`text-xs sm:text-sm truncate transition-colors ${isUnread ? 'font-black text-white group-hover:text-indigo-400 drop-shadow-sm' : 'font-bold text-slate-300 group-hover:text-emerald-400'}`}>{msg.sender?.full_name}</p>
                            <p className={`text-[9px] sm:text-[10px] whitespace-nowrap mr-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border ${isUnread ? 'bg-indigo-500/20 text-indigo-300 font-black border-indigo-500/30' : 'bg-[#02040a] text-slate-500 font-bold border-white/5 shadow-inner'}`}>{mounted ? format(new Date(msg.created_at), 'd MMM', { locale: arSA }) : '...'}</p>
                          </div>
                          <p className={`text-[10px] sm:text-xs truncate mb-1 ${isUnread ? 'text-indigo-400 font-black drop-shadow-sm' : 'text-emerald-400/80 font-bold'}`}>{msg.subject}</p>
                          <p className={`text-[10px] sm:text-xs truncate leading-relaxed ${isUnread ? 'text-slate-200 font-medium' : 'text-slate-500 font-medium'}`}>{msg.content}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-8 sm:p-12 text-center text-slate-500 text-xs sm:text-sm flex flex-col items-center bg-[#02040a]/50 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 shadow-inner">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/5 flex items-center justify-center mb-2 sm:mb-3 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 text-slate-600" /></div>
                    <span className="font-bold">صندوق الوارد فارغ</span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#02040a]/40">
                <Link href="/messages" className="block w-full text-center text-xs sm:text-sm font-black text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95">فتح صندوق الرسائل</Link>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
