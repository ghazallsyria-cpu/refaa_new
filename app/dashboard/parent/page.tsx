'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, Clock, FileText, 
  GraduationCap, TrendingUp, AlertTriangle, Award, ChevronLeft, 
  Play, Star, ShieldAlert, XCircle, Activity, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';

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

  // 1. جلب بيانات ولي الأمر وأبنائه
  const fetchParentData = useCallback(async () => {
    if (!user?.id || authRole !== 'parent') return;
    try {
      setLoading(true);
      // جلب بيانات الأب
      const { data: pData } = await supabase
        .from('parents')
        .select('*, users(full_name, email, avatar_url)')
        .eq('id', user.id)
        .maybeSingle();
      
      if (pData) setParentData(pData);

      // جلب بيانات الأبناء
      const { data: cData } = await supabase
        .from('students')
        .select('*, users(full_name, avatar_url), sections(name, classes(name))')
        .eq('parent_id', user.id);

      if (cData && cData.length > 0) {
        setChildren(cData);
        setActiveChildId(cData[0].id); // تعيين الابن الأول كافتراضي
      }
    } catch (e) {
      console.error('Error fetching parent data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, authRole]);

  useEffect(() => {
    if (!isChecking) fetchParentData();
  }, [fetchParentData, isChecking]);

  // 2. جلب بيانات الابن المختار
  const fetchActiveChildData = useCallback(async (childId: string) => {
    if (!childId) return;
    try {
      setChildLoading(true);
      
      // جلب الغياب
      const { data: attData } = await supabase
        .from('attendance_records')
        .select('*, subjects(name)')
        .eq('student_id', childId)
        .order('date', { ascending: false });
      
      setAttendance(attData || []);

      // جلب الاختبارات
      const { data: exData } = await supabase
        .from('exam_attempts')
        .select('id, score, status, completed_at, exams(id, title, max_score, total_marks, subjects(name))')
        .eq('student_id', childId)
        .eq('status', 'graded')
        .order('completed_at', { ascending: false });
      
      setExams(exData || []);

      // جلب الواجبات
      const { data: assData } = await supabase
        .from('assignment_submissions')
        .select('id, grade, status, submitted_at, feedback, assignments(id, title, total_marks, subjects(name), assignment_questions(points))')
        .eq('student_id', childId)
        .eq('status', 'graded')
        .order('submitted_at', { ascending: false });
      
      setAssignments(assData || []);

      // جلب الأوسمة
      const { data: bdgData } = await supabase
        .from('student_badges')
        .select('*, badge:badges(*)')
        .eq('student_id', childId)
        .order('granted_at', { ascending: false });
      
      setBadges(bdgData || []);

      // جلب فترات الحصص (لأننا سنحتاجها في الجدول)
      const { data: perData } = await supabase.from('periods').select('*').order('period_number', { ascending: true });
      setPeriods(perData || []);

      // جلب جدول اليوم للابن
      const activeChild = children.find(c => c.id === childId);
      if (activeChild?.section_id) {
        const today = new Date().getDay() + 1; // الأحد = 1 في المنصة
        const { data: schData } = await supabase
          .from('schedules')
          .select('*, subjects(name), teachers(id, users(full_name))')
          .eq('section_id', activeChild.section_id)
          .eq('day_of_week', today)
          .order('period', { ascending: true });
        
        setSchedule(schData || []);
      }

      // 🧠 الحسابات التحليلية
      let absentCount = 0;
      let attRate = 100;
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

    } catch (e) {
      console.error('Error fetching active child data:', e);
    } finally {
      setChildLoading(false);
    }
  }, [children]);

  useEffect(() => {
    if (activeChildId) fetchActiveChildData(activeChildId);
  }, [activeChildId, fetchActiveChildData]);

  const activeChild = useMemo(() => children.find(c => c.id === activeChildId), [children, activeChildId]);

  // دوال الجدول الدراسي
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

  if (isChecking || loading) return <div className="flex h-[80vh] items-center justify-center font-cairo"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
  if (authRole !== 'parent') return <div className="p-10 text-center font-bold text-rose-600 min-h-[80vh] flex items-center justify-center">هذه الصفحة مخصصة لأولياء الأمور فقط.</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4 font-cairo pt-6" dir="rtl">
      
      {/* 👑 Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-right">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm shadow-sm">
              <Users className="w-3.5 h-3.5 text-blue-300" /> لوحة تحكم ولي الأمر
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight drop-shadow-md">أهلاً بك، {parentData?.users?.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-indigo-100 text-sm sm:text-lg font-bold bg-black/20 w-fit px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
              نحن هنا لنبقيك على اطلاع دائم بمسيرة أبنائك التعليمية.
            </p>
          </div>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-700 mb-2">لا يوجد أبناء مرتبطين</h2>
          <p className="text-slate-500 font-bold">يرجى مراجعة إدارة المدرسة لربط حسابات أبنائك بملفك الشخصي.</p>
        </div>
      ) : (
        <>
          {/* 🔄 Smart Child Switcher */}
          <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {children.map(child => (
              <button 
                key={child.id} 
                onClick={() => setActiveChildId(child.id)}
                className={cn(
                  "flex items-center gap-4 p-3 pr-4 rounded-2xl transition-all duration-300 min-w-[200px] shrink-0 border-2",
                  activeChildId === child.id ? "bg-white border-indigo-500 shadow-xl scale-105" : "bg-slate-50 border-transparent hover:border-indigo-200 hover:bg-white"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner", activeChildId === child.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-500")}>
                  {child.users?.avatar_url ? <img src={child.users.avatar_url} className="w-full h-full rounded-xl object-cover" alt="child"/> : child.users?.full_name?.charAt(0)}
                </div>
                <div className="text-right">
                  <h3 className={cn("font-black text-sm truncate max-w-[120px]", activeChildId === child.id ? "text-indigo-900" : "text-slate-600")}>{child.users?.full_name?.split(' ')[0]} {child.users?.full_name?.split(' ')[1]}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{child.sections?.classes?.name} - {child.sections?.name}</p>
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {childLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              </motion.div>
            ) : activeChild && (
              <motion.div key={activeChild.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                
                {/* 🚨 نظام الإنذارات (Danger Zone) */}
                {stats.absentCount >= 5 && (
                  <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-3xl p-6 text-white shadow-lg shadow-rose-500/20 border-2 border-rose-400/50 flex items-center justify-between flex-col sm:flex-row gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/20 animate-pulse"><AlertTriangle className="w-6 h-6 text-yellow-300" /></div>
                      <div>
                        <h3 className="font-black text-lg mb-1">تنبيه غياب رسمي</h3>
                        <p className="text-sm font-bold text-rose-100">تجاوز {activeChild.users?.full_name?.split(' ')[0]} الحد المسموح للغياب ({stats.absentCount} حصص). يرجى مراجعة الإدارة.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 📊 إحصائيات الأداء */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { label: 'نسبة الحضور', value: `${stats.attendanceRate}%`, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-500' },
                    { label: 'متوسط الاختبارات', value: `${stats.examsAvg}%`, icon: FileText, color: 'indigo', bg: 'bg-indigo-500' },
                    { label: 'متوسط الواجبات', value: `${stats.assignmentsAvg}%`, icon: BookOpen, color: 'amber', bg: 'bg-amber-500' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group overflow-hidden relative">
                      <div className="flex items-center gap-5 mb-5 relative z-10">
                        <div className={`h-14 w-14 shrink-0 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}><stat.icon className="w-7 h-7" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner relative z-10">
                        <motion.div initial={{ width: 0 }} animate={{ width: stat.value }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full ${stat.bg} rounded-full`}></motion.div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🏆 حائط الفخر الأكاديمي (الأوسمة) */}
                {badges.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><Award className="text-yellow-400 w-6 h-6"/> حائط التميز والفخر</h3>
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

                {/* 📅 جدول اليوم المباشر */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-indigo-500"/> الجدول الدراسي اليوم</h3>
                    <div className="space-y-4">
                      {schedule.length === 0 ? (
                         <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">لا توجد حصص مجدولة لليوم.</div>
                      ) : (
                        schedule.map((item, i) => {
                          const current = isCurrentClass(item.period);
                          const next = isNextClass(item.period);
                          return (
                            <div key={i} className={cn("p-4 rounded-2xl border transition-all flex items-center gap-4", current ? "bg-indigo-50 border-indigo-200 shadow-md scale-[1.02]" : "bg-slate-50 border-slate-100")}>
                              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0", current ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200")}>
                                {current ? <Play className="w-5 h-5 animate-pulse" /> : item.period}
                              </div>
                              <div className="flex-1">
                                <p className={cn("font-black text-lg line-clamp-1", current ? "text-indigo-900" : "text-slate-800")}>{item.subjects?.name}</p>
                                <p className="text-xs font-bold text-slate-500 mt-1">أ. {item.teachers?.users?.full_name}</p>
                              </div>
                              {current && <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-black rounded-lg animate-pulse whitespace-nowrap">الآن</span>}
                              {next && !current && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg whitespace-nowrap">القادمة</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 📰 الإعلانات والمستجدات (يتم جلبها عبر الـ Component الجاهز) */}
                  <div className="space-y-6">
                    <AnnouncementsWidget authRole="parent" />
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
