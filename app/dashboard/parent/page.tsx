/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, Clock, FileText, 
  GraduationCap, TrendingUp, AlertTriangle, Award, MessageCircle,
  Play, Star, ShieldAlert, XCircle, Activity, Loader2, Heart, 
  ChevronDown, Send, UserCheck, ShieldCheck, Headphones,
  BarChart3, Target, Sparkles, Zap, Coffee 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

// ==========================================
// 🎨 مكونات الرسوم البيانية الداخلية (بدون مكتبات خارجية)
// ==========================================

// 1. مؤشر التقدم الدائري (للمواد)
const CircularProgress = ({ value, colorClass, strokeClass }: { value: number, colorClass: string, strokeClass: string }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100" />
        <motion.circle 
          cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent"
          strokeDasharray={circumference} 
          initial={{ strokeDashoffset: circumference }} 
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} 
          className={strokeClass} strokeLinecap="round" 
        />
      </svg>
      <div className={cn("absolute text-sm font-black", colorClass)}>{value}%</div>
    </div>
  );
};

export default function ParentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any;
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // 🧠 بيانات الابن النشط
  const [attendance, setAttendance] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [stats, setStats] = useState({ attendanceRate: 100, examsAvg: 0, assignmentsAvg: 0, absentCount: 0 });
  
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchParentData = useCallback(async () => {
    if (!user?.id || authRole !== 'parent') return;
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('parents').select('*, users(full_name, email, avatar_url)').eq('id', user.id).maybeSingle();
      if (pData) setParentData(pData);

      const { data: cData } = await supabase.from('students').select('*, users(full_name, avatar_url), sections(name, classes(name))').eq('parent_id', user.id);
      if (cData && cData.length > 0) {
        setChildren(cData);
        setActiveChildId(cData[0].id);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user, authRole]);

  useEffect(() => { if (!isChecking) fetchParentData(); }, [fetchParentData, isChecking]);

  const fetchActiveChildData = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      setChildLoading(true);
      
      const { data: attData } = await supabase.from('attendance_records').select('*, subjects(name)').eq('student_id', childId).order('date', { ascending: false });
      setAttendance(attData || []);

      const { data: exData } = await supabase.from('exam_attempts').select('id, score, status, completed_at, exams(id, title, max_score, total_marks, subjects(name))').eq('student_id', childId).eq('status', 'graded').order('completed_at', { ascending: false });
      setExams(exData || []);

      const { data: assData } = await supabase.from('assignment_submissions').select('id, grade, status, submitted_at, feedback, assignments(id, title, total_marks, subjects(name), assignment_questions(points))').eq('student_id', childId).eq('status', 'graded').order('submitted_at', { ascending: false });
      setAssignments(assData || []);

      const { data: bdgData } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', childId).order('granted_at', { ascending: false });
      setBadges(bdgData || []);

      const { data: perData } = await supabase.from('periods').select('*').order('period_number', { ascending: true });
      setPeriods(perData || []);

      const activeChild = children.find(c => c.id === childId);
      if (activeChild?.section_id) {
        const today = new Date().getDay() + 1;
        const { data: schData } = await supabase.from('schedules').select('*, subjects(id, name), teachers(id, users(full_name, avatar_url))').eq('section_id', activeChild.section_id).eq('day_of_week', today).order('period', { ascending: true });
        setSchedule(schData || []);

        // 🚀 جلب جميع مواد الفصل لبناء المصفوفة
        const { data: allSubjects } = await supabase.from('schedules').select('subjects(id, name), teachers(id, users(full_name, avatar_url))').eq('section_id', activeChild.section_id);
        const uniqueSubjects = Array.from(new Map(allSubjects?.map((item: any) => [item.subjects?.id, item])).values());
        
        const performancePromises = uniqueSubjects.map(async (item: any) => {
          const subId = item.subjects?.id;
          if (!subId) return null;
          const filteredExams = exData?.filter((e: any) => e.exams?.subjects?.id === subId) || [];
          const filteredAssignments = assData?.filter((a: any) => a.assignments?.subjects?.id === subId) || [];
          return {
            ...item,
            exams: filteredExams,
            assignments: filteredAssignments,
            average: calculateAverage([...filteredExams, ...filteredAssignments])
          };
        });
        const results = (await Promise.all(performancePromises)).filter(Boolean);
        setSubjectPerformance(results);
      }

      let absentCount = 0; let attRate = 100;
      if (attData && attData.length > 0) {
        absentCount = attData.filter(a => a.status === 'absent').length;
        const presents = attData.filter(a => a.status === 'present' || a.status === 'late').length;
        attRate = Math.round((presents / attData.length) * 100);
      }
      let exAvg = 0;
      if (exData && exData.length > 0) {
        let totalPct = 0;
        exData.forEach((e: any) => {
          const max = e.exams?.total_marks || e.exams?.max_score || 100;
          totalPct += ((e.score || 0) / max) * 100;
        });
        exAvg = Math.round(totalPct / exData.length);
      }
      let assAvg = 0;
      if (assData && assData.length > 0) {
        let totalPct = 0;
        assData.forEach((a: any) => {
          const qs = a.assignments?.assignment_questions;
          const calcMax = Array.isArray(qs) ? qs.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0) : 0;
          const max = calcMax > 0 ? calcMax : (a.assignments?.total_marks || 100);
          totalPct += ((a.grade || 0) / max) * 100;
        });
        assAvg = Math.round(totalPct / assData.length);
      }
      setStats({ attendanceRate: attRate, examsAvg: exAvg, assignmentsAvg: assAvg, absentCount });

    } catch (e) { console.error(e); } finally { setChildLoading(false); }
  }, [children]);

  useEffect(() => { if (activeChildId) fetchActiveChildData(activeChildId); }, [activeChildId, fetchActiveChildData]);

  const activeChild = useMemo(() => children.find(c => c.id === activeChildId), [children, activeChildId]);
  
  const todaysAttendance = useMemo(() => {
    if (!mounted) return [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return attendance.filter(a => a.date && a.date.startsWith(todayStr));
  }, [attendance, mounted]);

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
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  };

  const calculateAverage = (items: any[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => {
      const score = curr.score || curr.grade || 0;
      const max = curr.exams?.total_marks || curr.assignments?.total_marks || 100;
      return acc + (score / max);
    }, 0);
    return Math.round((total / items.length) * 100);
  };

  const getAttendanceStyle = (status: string | undefined | null) => {
    switch(status) {
      case 'present': return { text: 'حاضر وتسلّم حصته', bg: 'bg-emerald-50', border: 'border-emerald-200', textCol: 'text-emerald-700', icon: CheckCircle2, iconCol: 'text-emerald-500' };
      case 'absent': return { text: 'لم يتواجد بالحصة', bg: 'bg-rose-50', border: 'border-rose-200', textCol: 'text-rose-700', icon: XCircle, iconCol: 'text-rose-500' };
      case 'late': return { text: 'حضر متأخراً', bg: 'bg-amber-50', border: 'border-amber-200', textCol: 'text-amber-700', icon: Clock, iconCol: 'text-amber-500' };
      case 'excused': return { text: 'مستأذن بعذر', bg: 'bg-sky-50', border: 'border-sky-200', textCol: 'text-sky-700', icon: ShieldAlert, iconCol: 'text-sky-500' };
      default: return { text: 'لم تُسجل بعد', bg: 'bg-slate-50', border: 'border-slate-100', textCol: 'text-slate-400', icon: Clock, iconCol: 'text-slate-300' };
    }
  };

  if (isChecking || loading) return <div className="flex h-[80vh] items-center justify-center font-cairo"><Loader2 className="w-12 h-12 animate-spin text-indigo-600" /></div>;
  if (authRole !== 'parent') return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة لأولياء الأمور فقط.</div>;

  const isDayEnded = mounted && currentTime && currentTime.getHours() >= 14;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24 max-w-7xl mx-auto px-4 font-cairo pt-6 space-y-10" dir="rtl">
      
      {/* 🔝 الهيدر: اختيار الابن والترحيب */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100">
         <div className="text-center md:text-right flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200 hidden sm:flex">
              {parentData?.users?.full_name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">مرحباً، أ. {parentData?.users?.full_name?.split(' ')[0]} 👋</h1>
              <p className="text-slate-500 font-bold mt-1 text-sm">قمرة القيادة الخاصة بمتابعة أبنائك في مدرسة الرفعة</p>
            </div>
         </div>
         
         <div className="flex gap-3 overflow-x-auto p-2 w-full md:w-auto custom-scrollbar">
            {children.map(child => (
              <button 
                key={child.id} onClick={() => setActiveChildId(child.id)}
                className={cn("flex items-center gap-3 px-6 py-3 rounded-2xl transition-all border-2 shrink-0 shadow-sm", activeChildId === child.id ? "bg-indigo-600 border-indigo-600 text-white scale-105" : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200 text-slate-700")}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black", activeChildId === child.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500")}>
                  {child.users?.avatar_url ? <img src={child.users.avatar_url} className="w-full h-full rounded-xl object-cover" alt="child"/> : child.users?.full_name?.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="font-black text-sm block">{child.users?.full_name?.split(' ')[0]}</span>
                  <span className={cn("text-[10px] font-bold block", activeChildId === child.id ? "text-indigo-200" : "text-slate-400")}>{child.sections?.classes?.name}</span>
                </div>
              </button>
            ))}
         </div>
      </div>

      <AnimatePresence mode="wait">
        {childLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></motion.div>
        ) : activeChild && (
          <motion.div key={activeChild.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
            
            {/* 🚨 نظام الإنذارات (Danger Zone) */}
            {stats.absentCount >= 5 && (
              <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-3xl p-6 text-white shadow-lg shadow-rose-500/20 border-2 border-rose-400/50 flex items-center justify-between flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/20 animate-pulse"><AlertTriangle className="w-6 h-6 text-yellow-300" /></div>
                  <div>
                    <h3 className="font-black text-lg mb-1">تنبيه تراكم غياب</h3>
                    <p className="text-sm font-bold text-rose-100">تجاوز {activeChild.users?.full_name?.split(' ')[0]} الحد المسموح للغياب ({stats.absentCount} حصص). نرجو متابعة الأمر والتواصل مع الأخصائي.</p>
                  </div>
                </div>
                <button className="bg-white text-rose-700 px-6 py-2.5 rounded-xl font-black shadow-md hover:bg-rose-50 transition-colors whitespace-nowrap">تواصل الآن</button>
              </div>
            )}

            {/* 📊 رادار الأداء والمؤشرات العامة (رسوم بيانية حية) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'مؤشر الالتزام بالحضور', value: stats.attendanceRate, icon: Target, color: 'emerald' },
                { label: 'مؤشر التحصيل (اختبارات)', value: stats.examsAvg, icon: BarChart3, color: 'indigo' },
                { label: 'مؤشر الإنجاز (واجبات)', value: stats.assignmentsAvg, icon: Zap, color: 'amber' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all">
                  <div className={`absolute -right-6 -top-6 w-32 h-32 bg-${stat.color}-50 rounded-full blur-3xl opacity-50 group-hover:bg-${stat.color}-100 transition-colors`}></div>
                  <div className="flex items-center justify-between relative z-10 mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-100 text-${stat.color}-600 flex items-center justify-center`}><stat.icon className="w-6 h-6" /></div>
                    <CircularProgress value={stat.value} colorClass={`text-${stat.color}-700`} strokeClass={`text-${stat.color}-500`} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-black text-slate-800 text-lg mb-1">{stat.label}</h3>
                    <p className="text-xs font-bold text-slate-400">بناءً على السجلات الأكاديمية المسجلة حتى اليوم.</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* 📚 العمود الأيمن: مصفوفة إتقان المواد (8 أعمدة) */}
              <div className="lg:col-span-8 space-y-8">
                
                <section>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><BookOpen className="text-indigo-500 w-7 h-7"/> مصفوفة الإتقان الأكاديمي</h2>
                      <p className="text-sm font-bold text-slate-500 mt-1">نظرة تفصيلية لأداء الطالب في كل مادة بشكل مستقل.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {subjectPerformance.map((item, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl border border-indigo-100">{item.average}%</div>
                            <div>
                              <h3 className="font-black text-slate-800 text-lg">{item.subjects?.name}</h3>
                              <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3"/> أ. {item.teachers?.users?.full_name?.split(' ')[0]} {item.teachers?.users?.full_name?.split(' ')[1]}</p>
                            </div>
                          </div>
                          <button className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors tooltip" title="مراسلة المعلم"><MessageCircle className="w-4 h-4"/></button>
                        </div>

                        <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500"/><span className="text-xs font-black text-slate-600">الواجبات</span></div>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">{item.assignments.length} تم التسليم</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Award className="w-4 h-4 text-indigo-500"/><span className="text-xs font-black text-slate-600">الاختبارات</span></div>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">{item.exams.length} تم التقييم</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* 🏆 حائط الفخر الأكاديمي (الأوسمة) */}
                {badges.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Sparkles className="text-yellow-400 w-6 h-6"/> حائط الفخر والتميز</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar mask-fade-edges">
                        {badges.map((b) => (
                          <div key={b.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 min-w-[280px]">
                            <div className="w-16 h-16 relative shrink-0"><Image src={b.badge?.image_url} alt="Badge" fill className="object-contain drop-shadow-xl" unoptimized/></div>
                            <div>
                              <p className="text-white font-black text-sm">{b.badge?.name}</p>
                              <p className="text-indigo-200 text-[10px] font-bold mt-1 line-clamp-2">{b.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 💬 العمود الأيسر: جسر التواصل + نبض اليوم (4 أعمدة) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* 🌟 نبض اليوم المباشر (Timeline Design) */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500 animate-pulse fill-rose-100" /> نبض اليوم</h3>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl font-black text-[10px]">{safeFormat(new Date(), 'EEEE')}</span>
                  </div>

                  {schedule.length === 0 ? (
                     <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><Coffee className="w-8 h-8 text-slate-300" /> لا يوجد دوام مسجل لليوم.</div>
                  ) : (
                    <div className="relative border-r-2 border-slate-100 pr-6 space-y-6">
                      {schedule.map((lesson, idx) => {
                        const attendanceRecord = todaysAttendance.find(a => a.subjects?.name === lesson.subjects?.name) || todaysAttendance[idx];
                        const style = getAttendanceStyle(attendanceRecord?.status);
                        const current = isCurrentClass(lesson.period);
                        
                        return (
                          <div key={idx} className="relative">
                            {/* نقطة الخط الزمني */}
                            <div className={`absolute -right-[31px] w-4 h-4 rounded-full border-4 border-white ${current ? 'bg-indigo-500 animate-pulse' : style.bg.replace('bg-', 'bg-').replace('50', '400')}`}></div>
                            
                            <div className={cn("p-4 rounded-2xl border transition-all", current ? "bg-indigo-50 border-indigo-200 shadow-md" : "bg-white border-slate-100 hover:border-slate-200")}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className={cn("font-black text-sm", current ? "text-indigo-900" : "text-slate-800")}>{lesson.subjects?.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">الحصة {lesson.period} • أ. {lesson.teachers?.users?.full_name?.split(' ')[0]}</p>
                                </div>
                                {current && <span className="bg-indigo-500 text-white text-[9px] px-2 py-1 rounded-lg font-black animate-pulse">الآن</span>}
                              </div>
                              <div className={`text-[10px] font-black px-2 py-1 rounded-md inline-flex items-center gap-1 ${style.bg} ${style.textCol}`}><style.icon className="w-3 h-3"/>{style.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 🎧 جسر التواصل الموحد */}
                <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Headphones className="w-5 h-5"/></div>
                      <div>
                        <h3 className="text-base font-black text-slate-800">جسر التواصل الموحد</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">لمن توجه رسالتك؟</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      {[
                        { label: 'إدارة المدرسة', role: 'admin', icon: ShieldCheck, color: 'indigo' },
                        { label: 'شؤون الطلبة', role: 'staff', icon: Users, color: 'emerald' },
                        { label: 'طاقم المعلمين', role: 'teacher', icon: GraduationCap, color: 'rose' }
                      ].map((target, i) => (
                        <button key={i} className={`w-full group flex items-center justify-between p-3 bg-white hover:bg-${target.color}-50 hover:shadow-md rounded-2xl transition-all border border-slate-100 hover:border-${target.color}-200`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-${target.color}-50 text-${target.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}><target.icon className="w-4 h-4"/></div>
                            <span className="font-black text-slate-700 text-sm">{target.label}</span>
                          </div>
                          <Send className={`w-4 h-4 text-slate-300 group-hover:text-${target.color}-500 transition-colors`}/>
                        </button>
                      ))}
                   </div>

                   <div className="mt-6 pt-6 border-t border-slate-200 border-dashed">
                      <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50 relative">
                        <div className="absolute -top-3 -right-2 text-3xl">📝</div>
                        <h4 className="text-amber-900 font-black text-xs mb-2">ملاحظة من المعلم</h4>
                        <p className="text-amber-700/80 text-[11px] font-bold leading-relaxed italic">
                          {"نأمل متابعة الطالب في حل تكليفات الرياضيات المعلقة عبر المنصة لضمان عدم تأثره في التقييم الأسبوعي."}
                        </p>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
