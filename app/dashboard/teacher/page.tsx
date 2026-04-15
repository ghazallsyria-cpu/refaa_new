'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle, Camera, Play, Star, ChevronRight,
  AlertTriangle, ShieldAlert, HeartHandshake, Award, ArrowUpRight, Loader2, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

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

  const [attendanceStatus, setAttendanceStatus] = useState<any>({ isActive: false, missedPeriods: [], completed: false, totalToday: 0 });
  const [stats, setStats] = useState({ totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 0, absenceRate: 0 });
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { fetchTeacherDashboardData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
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
        setStats(prev => ({ ...prev, ...data.stats }));
        if (data.assignmentStats) setAssignmentStats(data.assignmentStats);
        
        const { data: badgesData } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', user.id).order('granted_at', { ascending: false });
        if (badgesData) setMyBadges(badgesData);

        // حساب الطلاب المنذرين
        if (data.teacher?.id) {
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
        }
      }
    } catch (error) { console.error('Fetch Error:', error); } 
    finally { setLoading(false); }
  }, [fetchTeacherDashboardData, user]);

  useEffect(() => { if (!isChecking && user) fetchData(); }, [fetchData, isChecking, user]);

  const todaysSchedule = useMemo(() => {
    const today = new Date().getDay() + 1; 
    return schedule.filter(s => s.day_of_week === today);
  }, [schedule]);

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

  if (isChecking || loading) return (
    <div className="flex h-[80vh] items-center justify-center font-cairo">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">جاري إعداد لوحة التحكم...</p>
      </div>
    </div>
  );

  const avatarUrl = teacherData?.users?.avatar_url;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4 font-cairo pt-6" dir="rtl">
      
      {/* 👑 Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
            <Link href={`/teachers/${user.id}`} className="relative group shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <span className="text-5xl font-black">{teacherData?.users?.full_name?.charAt(0) || 'أ'}</span>}
              </div>
              <div className="absolute -bottom-2 -left-2 bg-indigo-500 text-white p-2 rounded-full border-4 border-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={12}/></div>
            </Link>

            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold mb-3 backdrop-blur-sm">
                <Star className="w-3.5 h-3.5 text-yellow-300" />
                <span>لوحة التحكم الرئيسية</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-2 tracking-tight">مرحباً، أ. {teacherData?.users?.full_name || 'معلم'} 👋</h1>
              
              <Link href={`/teachers/${user.id}`} className="inline-flex items-center gap-2 text-indigo-100 hover:text-white font-bold text-sm bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all hover:bg-white/20 mt-2">
                <UserCircle className="w-4 h-4" /> استعراض وتنسيق ملفي الشخصي (CV)
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/attendance" className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl font-black text-white border border-white/20 hover:bg-white/20 transition-all text-center shadow-lg flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> رصد الحضور
            </Link>
            <Link href="/exams/builder/new" className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-xl hover:bg-indigo-50 transition-all text-center flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> إضافة اختبار
            </Link>
          </div>
        </div>

        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse"></div>
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-400/30 blur-[100px]"></div>
      </div>

      {/* لوحة الأوسمة */}
      {myBadges.length > 0 && (
        <div className="relative z-10 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200 shadow-sm w-full">
          <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" /> لوحة الشرف: أوسمة التميز التي حصلت عليها
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {myBadges.map((badgeEntry, index) => (
              <div key={badgeEntry.id || index} className="flex-shrink-0 bg-white shadow-sm rounded-2xl p-4 border border-slate-100 flex items-center gap-4 w-[20rem] hover:-translate-y-1 transition-all duration-300">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  {badgeEntry.badge?.image_url ? (
                    <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized className="object-contain drop-shadow-lg" />
                  ) : (
                    <Award className="w-full h-full text-yellow-400 drop-shadow-sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800 truncate">{badgeEntry.badge?.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 line-clamp-2 mt-1 leading-tight">{badgeEntry.reason || 'تقديراً للجهود'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚨 إنذارات الغياب للطلاب */}
      <AnimatePresence>
        {atRiskStudents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-6 sm:p-8 text-white shadow-2xl shadow-rose-500/30 border border-rose-400/50">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner shrink-0">
                  <AlertTriangle className="w-10 h-10 text-yellow-300 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-white">تنبيه: {atRiskStudents.length} طلاب تجاوزوا حد الغياب!</h2>
                  <p className="text-rose-100 text-xs sm:text-sm font-bold">حسب لائحة السلوك والمواظبة، هؤلاء الطلاب تجاوزوا الحد المسموح.</p>
                </div>
              </div>
              
              <Link href="/dashboard/teacher/warnings" className="group flex items-center justify-center gap-2 bg-white text-rose-700 px-6 py-3 rounded-xl font-black text-sm hover:bg-rose-50 transition-all shadow-lg active:scale-95 border border-rose-200 w-full lg:w-auto">
                <span>إدارة الإنذارات</span>
                <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {atRiskStudents.slice(0, 4).map((student, idx) => (
                <div key={idx} className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-black/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/50 flex items-center justify-center text-white font-black text-sm border border-rose-400/50 shrink-0">{student.name.charAt(0)}</div>
                    <div className="min-w-0 pr-1">
                      <p className="font-black text-white text-sm truncate">{student.name}</p>
                      <p className="text-[10px] font-bold text-rose-200 truncate mt-0.5">{student.className}</p>
                    </div>
                  </div>
                  <div className="text-center shrink-0 ml-2 bg-white/10 px-3 py-2 rounded-xl border border-white/20">
                    <span className="block text-lg font-black text-yellow-300 leading-none">{student.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 الإحصائيات العامة */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-50 to-white', border: 'border-blue-100' },
          { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-50 to-white', border: 'border-indigo-100' },
          { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-50 to-white', border: 'border-amber-100' },
          { label: 'متوسط الحضور', value: `${stats.avgAttendance || 100}%`, icon: BarChart2, color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-50 to-white', border: 'border-emerald-100' },
          { label: 'معدل الغياب', value: `${stats.absenceRate || 0}%`, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', gradient: 'from-rose-50 to-white', border: 'border-rose-100' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`bg-gradient-to-br ${stat.gradient} p-6 rounded-[2rem] shadow-sm border ${stat.border} flex flex-col justify-center items-center text-center gap-3 hover:shadow-lg hover:-translate-y-1 transition-all relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className={`h-14 w-14 rounded-2xl ${stat.bg} border ${stat.border} flex items-center justify-center ${stat.color} relative z-10 group-hover:scale-110 transition-transform`}><stat.icon className="h-7 w-7" /></div>
            <div className="relative z-10"><p className="text-3xl font-black text-slate-900 leading-none mb-1 drop-shadow-sm">{stat.value}</p><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* 🚀 قسم الجداول والكروت السفلية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          {/* جدول حصص اليوم */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all relative">
            <div className="p-6 sm:p-8 border-b border-slate-100/50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 relative z-10 gap-4">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-inner"><Clock className="h-6 w-6 text-indigo-600" /></div>
                جدول حصص اليوم
              </h2>
              <span className="text-sm font-bold px-4 py-2 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> {mounted ? format(new Date(), 'EEEE، d MMMM', { locale: arSA }) : '...'}
              </span>
            </div>
            
            <div className="p-6 sm:p-8 relative z-10 bg-slate-50/30">
              {todaysSchedule.length > 0 ? (
                <div className="space-y-4">
                  {todaysSchedule.map((item, i) => {
                    const current = isCurrentClass(item.period);
                    const next = isNextClass(item.period);
                    return (
                      <div key={i} className={cn("p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4", current ? "bg-indigo-50 border-indigo-200 shadow-md scale-[1.02]" : "bg-white border-slate-100 hover:shadow-sm hover:border-slate-200")}>
                        <div className={cn("h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm", current ? "bg-indigo-600 text-white animate-pulse" : "bg-slate-50 text-slate-500 border border-slate-100")}>
                          {current ? <Play className="h-6 w-6 fill-current"/> : item.period}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn("font-black text-lg mb-1 truncate", current ? "text-indigo-900" : "text-slate-800")}>{item.sections?.classes?.name} - {item.sections?.name}</h4>
                          <p className="text-xs font-bold text-slate-500">{item.subjects?.name}</p>
                        </div>
                        {current && <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl animate-pulse">الآن</div>}
                        {next && !current && <div className="px-4 py-2 bg-amber-100 text-amber-700 text-xs font-black rounded-xl">القادمة</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-900 mb-2">لا توجد حصص اليوم</h3>
                  <p className="text-slate-500 font-medium">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم.</p>
                </div>
              )}
            </div>
          </div>

          {/* فصولي الدراسية */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all">
            <div className="p-6 sm:p-8 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-inner"><BookOpen className="h-6 w-6 text-blue-600" /></div> فصولي الدراسية
              </h2>
              <Link href="/classes" className="text-sm font-bold text-blue-600 hover:text-white flex items-center gap-1 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm border border-blue-100">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
            </div>
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/30">
              {sections.length > 0 ? (
                sections.map((section) => (
                  <Link href="/classes" key={section.id} className="block group">
                    <div className="p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100 transition-all h-full flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                          <h3 className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors mb-1">{section.classes?.name}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section.name}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100 shrink-0"><Users className="h-6 w-6" /></div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 p-16 text-center text-slate-500 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">لا توجد فصول مسندة إليك حالياً</div>
              )}
            </div>
          </div>

        </div>

        {/* الشريط الجانبي الأيمن */}
        <div className="space-y-8">
          {/* الإعلانات */}
          <AnnouncementsWidget authRole="teacher" />

          {/* الاختبارات */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100"><FileText className="h-5 w-5 text-emerald-600" /></div> الاختبارات الأخيرة
              </h2>
            </div>
            <div className="divide-y divide-slate-100 bg-slate-50/30 p-4">
              {recentExams.length > 0 ? (
                recentExams.map((exam) => (
                  <div key={exam.id} className="p-4 bg-white rounded-2xl border border-slate-100 mb-3 hover:shadow-md transition-shadow">
                    <h3 className="font-black text-slate-800 text-sm mb-2 truncate">{exam.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mb-3 bg-slate-50 px-2 py-1 rounded inline-block">{exam.subject_name} • {exam.section_name}</p>
                    <div className="flex gap-2">
                      <Link href={`/exams/builder/${exam.id}`} className="flex-1 text-center py-2 text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">تعديل</Link>
                      <Link href={`/exams/results/${exam.id}`} className="flex-1 text-center py-2 text-[10px] font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">النتائج</Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد اختبارات حالياً</div>
              )}
            </div>
          </div>

          {/* الواجبات */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all">
            <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-100"><BookOpen className="h-5 w-5 text-amber-600" /></div> الواجبات الأخيرة
              </h2>
            </div>
            <div className="divide-y divide-slate-100 bg-slate-50/30 p-4">
              {recentAssignments.length > 0 ? (
                recentAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 bg-white rounded-2xl border border-slate-100 mb-3 hover:shadow-md transition-shadow">
                    <h3 className="font-black text-slate-800 text-sm mb-2 truncate">{assignment.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 mb-3 bg-slate-50 px-2 py-1 rounded inline-block">{assignment.subject_name} • {assignment.section_name}</p>
                    <div className="flex gap-2">
                      <Link href={`/assignments/${assignment.id}`} className="flex-1 text-center py-2 text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">تعديل</Link>
                      <Link href={`/assignments/${assignment.id}/submissions`} className="flex-1 text-center py-2 text-[10px] font-black text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">التقييم</Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد واجبات حالياً</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
