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
// 🎨 مكونات الرسوم البيانية الداخلية (بالثيم الملكي)
// ==========================================
const CircularProgress = ({ value, colorClass, strokeClass }: { value: number, colorClass: string, strokeClass: string }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0 drop-shadow-md">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/10" />
        <motion.circle 
          cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="5" fill="transparent"
          strokeDasharray={circumference} 
          initial={{ strokeDashoffset: circumference }} 
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} 
          className={strokeClass} strokeLinecap="round" 
        />
      </svg>
      <div className={cn("absolute text-sm font-black drop-shadow-sm", colorClass)}>{value}%</div>
    </div>
  );
};

export default function ParentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any;
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // 🧠 حالات البيانات
  const [attendance, setAttendance] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [stats, setStats] = useState({ attendanceRate: 100, examsAvg: 0, assignmentsAvg: 0, absentCount: 0 });
  
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [detailedTasks, setDetailedTasks] = useState<any[]>([]); 
  
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

      const { data: bdgData } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', childId).order('granted_at', { ascending: false });
      setBadges(bdgData || []);

      const { data: perData } = await supabase.from('periods').select('*').order('period_number', { ascending: true });
      setPeriods(perData || []);

      const activeChild = children.find(c => c.id === childId);
      if (!activeChild?.section_id) return;

      const today = new Date().getDay() + 1;
      const { data: schData } = await supabase.from('schedules').select('*, subjects(id, name), teachers(id, users(full_name, avatar_url))').eq('section_id', activeChild.section_id).eq('day_of_week', today).order('period', { ascending: true });
      setSchedule(schData || []);

      const { data: exData } = await supabase.from('exam_attempts').select('id, score, status, completed_at, exams(title, total_marks, max_score, subjects(id, name))').eq('student_id', childId);
      const { data: assData } = await supabase.from('assignment_submissions').select('id, grade, status, submitted_at, feedback, assignments(title, total_marks, subjects(id, name))').eq('student_id', childId);

      const allTasks: any[] = [];
      
      assData?.forEach((sub: any) => {
        allTasks.push({
          id: `ass_${sub.id}`, type: 'assignment',
          title: sub.assignments?.title || 'واجب غير معروف',
          subject: sub.assignments?.subjects?.name || 'عام',
          score: sub.grade || 0,
          max: sub.assignments?.total_marks || 100,
          date: sub.submitted_at || new Date().toISOString(),
          isZero: sub.grade === 0
        });
      });

      exData?.forEach((att: any) => {
        allTasks.push({
          id: `ex_${att.id}`, type: 'exam',
          title: att.exams?.title || 'اختبار غير معروف',
          subject: att.exams?.subjects?.name || 'عام',
          score: att.score || 0,
          max: att.exams?.total_marks || att.exams?.max_score || 100,
          date: att.completed_at || new Date().toISOString(),
          isZero: att.score === 0
        });
      });

      allTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDetailedTasks(allTasks);

      const { data: allSubjects } = await supabase.from('schedules').select('subjects(id, name), teachers(id, users(full_name, avatar_url))').eq('section_id', activeChild.section_id);
      const uniqueSubjects = Array.from(new Map(allSubjects?.map((item: any) => [item.subjects?.id, item])).values());
      
      const performancePromises = uniqueSubjects.map(async (item: any) => {
        const subId = item.subjects?.id;
        if (!subId) return null;
        const filteredExams = exData?.filter((e: any) => e.exams?.subjects?.id === subId && e.status === 'graded') || [];
        const filteredAssignments = assData?.filter((a: any) => a.assignments?.subjects?.id === subId && a.status === 'graded') || [];
        return {
          ...item,
          exams: filteredExams,
          assignments: filteredAssignments,
          average: calculateAverage([...filteredExams, ...filteredAssignments])
        };
      });
      
      const results = (await Promise.all(performancePromises)).filter(Boolean);
      setSubjectPerformance(results);

      let absentCount = 0; let attRate = 100;
      if (attData && attData.length > 0) {
        absentCount = attData.filter(a => a.status === 'absent').length;
        const presents = attData.filter(a => a.status === 'present' || a.status === 'late').length;
        attRate = Math.round((presents / attData.length) * 100);
      }

      const gradedExams = exData?.filter(e => e.status === 'graded') || [];
      const gradedAss = assData?.filter(a => a.status === 'graded') || [];
      
      setStats({ 
        attendanceRate: attRate, 
        examsAvg: calculateAverage(gradedExams), 
        assignmentsAvg: calculateAverage(gradedAss), 
        absentCount 
      });

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

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  };

  const calculateAverage = (items: any[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => {
      const score = curr.score || curr.grade || 0;
      const max = curr.exams?.total_marks || curr.exams?.max_score || curr.assignments?.total_marks || 100;
      return acc + (score / max);
    }, 0);
    return Math.round((total / items.length) * 100);
  };

  const getAttendanceStyle = (status: string | undefined | null) => {
    switch(status) {
      case 'present': return { text: 'حاضر وتسلّم حصته', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', textCol: 'text-emerald-400', icon: CheckCircle2, iconCol: 'text-emerald-500' };
      case 'absent': return { text: 'لم يتواجد بالحصة', bg: 'bg-rose-500/10', border: 'border-rose-500/30', textCol: 'text-rose-400', icon: XCircle, iconCol: 'text-rose-500' };
      case 'late': return { text: 'حضر متأخراً', bg: 'bg-amber-500/10', border: 'border-amber-500/30', textCol: 'text-amber-400', icon: Clock, iconCol: 'text-amber-500' };
      case 'excused': return { text: 'مستأذن بعذر', bg: 'bg-blue-500/10', border: 'border-blue-500/30', textCol: 'text-blue-400', icon: ShieldAlert, iconCol: 'text-blue-500' };
      default: return { text: 'لم تُسجل بعد', bg: 'bg-[#02040a]/80', border: 'border-white/5', textCol: 'text-slate-400', icon: Clock, iconCol: 'text-slate-500' };
    }
  };

  // 🚀 شاشات الحماية والتحميل الملكية
  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'parent') {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة لأولياء الأمور فقط.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري سحب بيانات الأبناء...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-cairo pt-6 space-y-8 relative z-10" dir="rtl">
      
      {/* 🔝 الهيدر الفخم (Obsidian & Indigo) */}
      <div className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-8 lg:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
         
         <div className="text-center md:text-right flex flex-col md:flex-row items-center gap-4 sm:gap-6 relative z-10">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#0f1423] border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-[0_0_30px_rgba(99,102,241,0.2)] group-hover:border-indigo-500/50 transition-colors">
                {parentData?.users?.full_name?.charAt(0)}
              </div>
              <div className="absolute inset-0 bg-indigo-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(99,102,241,0.2)] text-indigo-400 mx-auto md:mx-0">
                <ShieldCheck className="w-3.5 h-3.5" /> بوابة ولي الأمر
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">مرحباً، أ. {parentData?.users?.full_name?.split(' ')[0]} 👋</h1>
              <p className="text-slate-400 font-bold mt-2 text-xs sm:text-sm drop-shadow-sm max-w-md leading-relaxed mx-auto md:mx-0">قمرة القيادة الآمنة الخاصة بمتابعة أبنائك في مدرسة الرفعة. اختر الابن لعرض تفاصيله الأكاديمية.</p>
            </div>
         </div>
         
         <div className="flex gap-2 sm:gap-3 overflow-x-auto p-2 w-full md:w-auto custom-scrollbar snap-x relative z-10">
            {children.map(child => (
              <button 
                key={child.id} onClick={() => setActiveChildId(child.id)}
                className={cn("snap-center flex items-center gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl transition-all border shrink-0 shadow-inner group", activeChildId === child.id ? "bg-gradient-to-r from-indigo-600 to-blue-600 border-indigo-400 text-white scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]" : "bg-[#0f1423]/60 border-white/5 hover:bg-[#0f1423] hover:border-indigo-500/30 text-slate-300")}
              >
                <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1rem] flex items-center justify-center font-black transition-colors shadow-inner", activeChildId === child.id ? "bg-white/20 text-white border border-white/30" : "bg-[#02040a] text-indigo-400 border border-white/5 group-hover:border-indigo-500/30")}>
                  {child.users?.avatar_url ? <img src={child.users.avatar_url} className="w-full h-full rounded-xl sm:rounded-[1rem] object-cover" alt="child"/> : child.users?.full_name?.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="font-black text-sm block drop-shadow-sm">{child.users?.full_name?.split(' ')[0]}</span>
                  <span className={cn("text-[9px] sm:text-[10px] font-bold block mt-0.5", activeChildId === child.id ? "text-indigo-100" : "text-slate-500")}>{child.sections?.classes?.name}</span>
                </div>
              </button>
            ))}
         </div>
      </div>

      <AnimatePresence mode="wait">
        {childLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-20 sm:py-32 relative z-10"><Loader2 className="w-12 h-12 animate-spin text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></motion.div>
        ) : activeChild && (
          <motion.div key={activeChild.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 sm:space-y-8 relative z-10">
            
            {/* 🚨 إنذار الغياب المتقدم */}
            {stats.absentCount >= 5 && (
              <div className="bg-rose-950/40 backdrop-blur-xl rounded-[2rem] p-6 text-white shadow-[0_0_30px_rgba(225,29,72,0.15)] border border-rose-500/30 flex items-center justify-between flex-col sm:flex-row gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/20 blur-3xl rounded-full pointer-events-none"></div>
                <div className="flex items-start sm:items-center gap-4 relative z-10 w-full sm:w-auto">
                  <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/40 animate-pulse shadow-inner"><AlertTriangle className="w-6 h-6 text-rose-400" /></div>
                  <div>
                    <h3 className="font-black text-lg mb-1 drop-shadow-md text-rose-300">تنبيه تراكم غياب</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-300 leading-relaxed">تجاوز <span className="text-white mx-1 font-black">{activeChild.users?.full_name?.split(' ')[0]}</span> الحد المسموح للغياب (<span className="text-rose-400 font-black">{stats.absentCount} حصص</span>). نرجو التواصل مع الأخصائي فوراً.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 📊 رادار الأداء العام (الزجاج الملكي) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { label: 'مؤشر الالتزام بالحضور', value: stats.attendanceRate, icon: Target, color: 'emerald' },
                { label: 'مؤشر التحصيل (اختبارات)', value: stats.examsAvg, icon: BarChart3, color: 'blue' },
                { label: 'مؤشر الإنجاز (واجبات)', value: stats.assignmentsAvg, icon: Zap, color: 'amber' }
              ].map((stat, i) => (
                <div key={i} className="glass-panel p-5 sm:p-6 rounded-[2rem] relative overflow-hidden group hover:border-white/20 transition-all cursor-default">
                  <div className={`absolute -right-6 -top-6 w-32 h-32 bg-${stat.color}-500/10 rounded-full blur-[60px] group-hover:bg-${stat.color}-500/20 transition-colors pointer-events-none`}></div>
                  <div className="flex items-center justify-between relative z-10 mb-5 sm:mb-6 gap-2">
                    <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 text-${stat.color}-400 flex items-center justify-center border border-${stat.color}-500/20 shadow-inner shrink-0`}><stat.icon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" /></div>
                    <CircularProgress value={stat.value} colorClass={`text-${stat.color}-400`} strokeClass={`text-${stat.color}-400 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
                  </div>
                  <div className="relative z-10 text-center sm:text-right">
                    <h3 className="font-black text-white text-base sm:text-lg mb-1 drop-shadow-sm">{stat.label}</h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400">بناءً على السجلات الأكاديمية المسجلة حتى اليوم.</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              
              {/* 📚 العمود الأيمن (8 أعمدة) */}
              <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                
                {/* مصفوفة الإتقان الأكاديمي */}
                <section className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden border-white/10">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6 sm:mb-8 relative z-10 gap-4 text-center sm:text-right">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-md">
                        <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner shrink-0"><BookOpen className="text-blue-400 w-5 h-5 sm:w-6 sm:h-6"/></div>
                        مصفوفة الإتقان الأكاديمي
                      </h2>
                      <p className="text-xs sm:text-sm font-bold text-slate-400 mt-2 max-w-md mx-auto sm:mx-0">نظرة تفصيلية لمتوسط أداء الابن في كل مادة.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 relative z-10">
                    {subjectPerformance.map((item, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-[#0f1423]/60 p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-start justify-between mb-5 gap-2">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#02040a] text-blue-400 flex items-center justify-center font-black text-lg sm:text-xl border border-white/5 shadow-inner shrink-0 group-hover:border-blue-500/30 transition-colors drop-shadow-sm">{item.average}%</div>
                            <div className="min-w-0 pr-1">
                              <h3 className="font-black text-white text-base sm:text-lg truncate group-hover:text-blue-400 transition-colors drop-shadow-sm">{item.subjects?.name}</h3>
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1 truncate"><Users className="w-3 h-3 shrink-0"/> أ. {item.teachers?.users?.full_name?.split(' ')[0]} {item.teachers?.users?.full_name?.split(' ')[1]}</p>
                            </div>
                          </div>
                          <button className="w-8 h-8 sm:w-10 sm:h-10 bg-[#02040a] text-slate-400 border border-white/5 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-slate-950 transition-colors tooltip shrink-0 shadow-inner active:scale-95" title="مراسلة المعلم"><MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4"/></button>
                        </div>
                        <div className="space-y-2 sm:space-y-3 bg-[#02040a]/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"/><span className="text-[10px] sm:text-xs font-black text-slate-300">الواجبات</span></div>
                            <span className="text-[9px] sm:text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md shadow-inner">{item.assignments.length} تم التقييم</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400"/><span className="text-[10px] sm:text-xs font-black text-slate-300">الاختبارات</span></div>
                            <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md shadow-inner">{item.exams.length} تم التقييم</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* 🚀 السجل التفصيلي الجديد (المهام المنسية) */}
                <section className="glass-panel p-5 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden border-white/10">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6 sm:mb-8 relative z-10 gap-4 text-center sm:text-right">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-md">
                        <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner shrink-0"><FileText className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6"/></div>
                        سجل المهام والتقييمات المفصل
                      </h2>
                      <p className="text-xs sm:text-sm font-bold text-slate-400 mt-2 max-w-md mx-auto sm:mx-0">يُظهر هذا السجل درجات كل واجب واختبار، وينبهك للمهام التي انتهى وقتها ولم تُقدم.</p>
                    </div>
                  </div>

                  <div className="bg-transparent rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden shadow-inner relative z-10">
                    {detailedTasks.length === 0 ? (
                      <div className="text-center py-10 sm:py-16 text-slate-400 font-bold text-xs sm:text-sm bg-[#0f1423]/40">لا يوجد مهام مسجلة حتى الآن.</div>
                    ) : (
                      <div className="divide-y divide-white/5 bg-[#0f1423]/40">
                        {detailedTasks.slice(0, 10).map((task) => (
                          <div key={task.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-[#02040a]/40 transition-colors group">
                            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                              <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border shadow-inner", task.type === 'exam' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}>
                                {task.type === 'exam' ? <Award className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm"/> : <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm"/>}
                              </div>
                              <div className="min-w-0 pr-1">
                                <h4 className="font-black text-white text-sm sm:text-base group-hover:text-indigo-400 transition-colors drop-shadow-sm line-clamp-1">{task.title}</h4>
                                <div className="flex items-center flex-wrap gap-2 mt-1 sm:mt-1.5">
                                  <span className="text-[9px] sm:text-[10px] font-black bg-[#02040a] text-slate-300 px-2 py-1 rounded-md border border-white/5 shadow-inner">{task.subject}</span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> {safeFormat(task.date, 'dd MMMM yyyy')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="shrink-0 flex sm:block justify-end w-full sm:w-auto mt-2 sm:mt-0">
                              {task.isZero ? (
                                <div className="bg-rose-500/10 border border-rose-500/30 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-center shadow-inner flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 w-full sm:w-auto">
                                  <span className="block text-rose-400 font-black text-[10px] sm:text-xs sm:mb-0.5 drop-shadow-sm">لم يُنجز (انتهى الوقت)</span>
                                  <span className="block text-rose-300/80 font-bold text-[9px] sm:text-[10px]">تم رصد صفر ({task.score} / {task.max})</span>
                                </div>
                              ) : (
                                <div className="bg-[#02040a]/80 border border-emerald-500/20 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-center shadow-inner flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 w-full sm:w-auto group-hover:border-emerald-500/40 transition-colors">
                                  <span className="block text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest sm:mb-0.5">الدرجة المعتمدة</span>
                                  <span className="block text-emerald-400 font-black text-sm sm:text-xl drop-shadow-md">{task.score} <span className="text-[10px] sm:text-xs text-emerald-500/70">/ {task.max}</span></span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* 🏆 حائط الفخر */}
                {badges.length > 0 && (
                  <div className="bg-gradient-to-br from-[#0a0d16] to-[#1a1125] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                    <div className="relative z-10">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-5 sm:mb-6 flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm"><Sparkles className="text-amber-400 w-5 h-5 sm:w-6 sm:h-6"/> حائط الفخر والتميز</h3>
                      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x px-1">
                        {badges.map((b) => (
                          <div key={b.id} className="snap-center bg-[#02040a]/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex items-center gap-3 sm:gap-4 min-w-[260px] sm:min-w-[280px] shadow-inner shrink-0 hover:border-amber-500/30 transition-colors group">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 relative shrink-0 group-hover:scale-110 transition-transform"><Image src={b.badge?.image_url} alt="Badge" fill className="object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" unoptimized/></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-black text-xs sm:text-sm truncate drop-shadow-sm">{b.badge?.name}</p>
                              <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold mt-1 line-clamp-2 leading-snug" title={b.reason}>{b.reason || 'تقديراً للجهود'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 💬 العمود الأيسر (4 أعمدة) */}
              <div className="lg:col-span-4 space-y-6 lg:space-y-8 mt-6 lg:mt-0">
                
                {/* 🌟 نبض اليوم */}
                <div className="glass-panel p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <div className="flex items-center justify-between mb-5 sm:mb-6 relative z-10">
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-sm"><Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse fill-rose-500/20" /> نبض اليوم</h3>
                    <span className="bg-[#0f1423] text-indigo-400 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg border border-white/5 shadow-inner font-black text-[9px] sm:text-[10px]">{safeFormat(new Date(), 'EEEE')}</span>
                  </div>

                  {schedule.length === 0 ? (
                     <div className="text-center py-8 sm:py-10 bg-[#0f1423]/40 rounded-[1.5rem] border border-dashed border-white/10 text-slate-400 font-bold text-xs sm:text-sm flex flex-col items-center gap-2 sm:gap-3 shadow-inner relative z-10"><Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 drop-shadow-md" /> لا يوجد دوام مسجل لليوم.</div>
                  ) : (
                    <div className="relative border-r-2 border-white/5 pr-4 sm:pr-6 space-y-5 sm:space-y-6 z-10">
                      {schedule.map((lesson, idx) => {
                        const attendanceRecord = todaysAttendance.find(a => a.subjects?.name === lesson.subjects?.name) || todaysAttendance[idx];
                        const style = getAttendanceStyle(attendanceRecord?.status);
                        const current = isCurrentClass(lesson.period);
                        
                        return (
                          <div key={idx} className="relative group">
                            <div className={`absolute -right-[23px] sm:-right-[31px] w-3 h-3 sm:w-4 sm:h-4 rounded-full border-[3px] sm:border-4 border-[#090b14] shadow-[0_0_5px_rgba(0,0,0,0.5)] ${current ? 'bg-indigo-400 animate-pulse' : style.bg.replace('bg-', 'bg-').replace('/10', '')}`}></div>
                            <div className={cn("p-3 sm:p-4 rounded-[1rem] sm:rounded-2xl border transition-all", current ? "bg-[#0f1423]/90 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-[#02040a]/60 border-white/5 hover:border-white/20 shadow-inner")}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className={cn("font-black text-xs sm:text-sm drop-shadow-sm", current ? "text-indigo-400" : "text-white")}>{lesson.subjects?.name}</h4>
                                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-1">الحصة {lesson.period} • أ. {lesson.teachers?.users?.full_name?.split(' ')[0]}</p>
                                </div>
                                {current && <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-[8px] sm:text-[9px] px-2 py-1 rounded-md font-black shadow-inner">الآن</span>}
                              </div>
                              <div className={`text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border shadow-inner ${style.bg} ${style.textCol} ${style.border}`}><style.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"/>{style.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 🎧 جسر التواصل */}
                <div className="bg-gradient-to-br from-[#0f1423]/80 to-[#02040a] p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-white/10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                   <div className="flex items-center gap-3 mb-5 sm:mb-6 relative z-10">
                      <div className="w-10 h-10 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner"><Headphones className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md"/></div>
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white drop-shadow-sm">جسر التواصل الموحد</h3>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">لمن توجه رسالتك؟</p>
                      </div>
                   </div>
                   <div className="space-y-2 sm:space-y-3 relative z-10">
                      {[
                        { label: 'إدارة المدرسة', role: 'admin', icon: ShieldCheck, color: 'indigo' },
                        { label: 'شؤون الطلبة', role: 'staff', icon: Users, color: 'emerald' },
                        { label: 'طاقم المعلمين', role: 'teacher', icon: GraduationCap, color: 'rose' }
                      ].map((target, i) => (
                        <button key={i} className={`w-full group flex items-center justify-between p-2.5 sm:p-3 bg-[#02040a]/60 hover:bg-[#0f1423] rounded-xl sm:rounded-2xl transition-all border border-white/5 hover:border-${target.color}-500/30 shadow-inner active:scale-95`}>
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-${target.color}-500/10 text-${target.color}-400 border border-${target.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0`}><target.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/></div>
                            <span className="font-black text-slate-300 group-hover:text-white text-xs sm:text-sm transition-colors">{target.label}</span>
                          </div>
                          <Send className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 group-hover:text-${target.color}-400 transition-colors -rotate-90 rtl:rotate-180`}/>
                        </button>
                      ))}
                   </div>
                   <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/5 border-dashed relative z-10">
                      <div className="bg-amber-500/10 p-4 sm:p-5 rounded-[1rem] sm:rounded-[1.5rem] border border-amber-500/20 relative shadow-inner group cursor-default">
                        <div className="absolute -top-3 -right-2 text-2xl sm:text-3xl drop-shadow-md group-hover:scale-110 transition-transform">📝</div>
                        <h4 className="text-amber-400 font-black text-[10px] sm:text-xs mb-1.5 sm:mb-2 drop-shadow-sm">ملاحظة من المعلم</h4>
                        <p className="text-amber-200/70 text-[9px] sm:text-[11px] font-bold leading-relaxed italic pr-1">
                          {"نأمل متابعة الطالب في حل التكليفات المعلقة لضمان عدم تأثره في التقييم الأسبوعي."}
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
