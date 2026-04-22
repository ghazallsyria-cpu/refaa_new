/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, Clock, FileText, 
  GraduationCap, TrendingUp, AlertTriangle, Award, MessageCircle,
  Play, Star, ShieldAlert, XCircle, Activity, Loader2, Heart, 
  ChevronDown, Send, UserCheck, ShieldCheck, Headphones,
  BarChart3, Target, Sparkles, Zap, Coffee, Crown, Plus, Stethoscope, UploadCloud, X, LayoutDashboard, Shield, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import AnnouncementsWidget from '@/components/AnnouncementsWidget';
import Link from 'next/link';

const CircularProgress = ({ value, colorClass, strokeClass }: { value: number, colorClass: string, strokeClass: string }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90 filter drop-shadow-md">
        <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
        <motion.circle 
          cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
          strokeDasharray={circumference} 
          initial={{ strokeDashoffset: circumference }} 
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} 
          className={strokeClass} strokeLinecap="round" 
        />
      </svg>
      <div className={cn("absolute text-lg font-black drop-shadow-lg", colorClass)}>{value}%</div>
    </div>
  );
};

const OverviewTab = ({ stats, absentCount, setIsExcuseModalOpen, router }: any) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
    {absentCount >= 5 && (
      <div className="bg-rose-950/40 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(225,29,72,0.2)] border border-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="w-16 h-16 bg-rose-500/20 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-rose-500/40 animate-pulse shadow-inner"><AlertTriangle className="w-8 h-8 text-rose-400" /></div>
          <div>
            <h3 className="font-black text-xl mb-1 text-rose-300">تجاوز الحد المسموح للغياب!</h3>
            <p className="text-sm font-bold text-rose-100/70">سجل ابنك <span className="text-white font-black">{absentCount} غيابات</span>، يرجى تقديم العذر الطبي أو مراجعة الإدارة.</p>
          </div>
        </div>
        <button onClick={() => setIsExcuseModalOpen(true)} className="w-full md:w-auto mt-4 md:mt-0 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-sm transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 active:scale-95 shrink-0 relative z-10">
          <Stethoscope className="w-4 h-4" /> تقديم عذر طبي عاجل
        </button>
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[
        { label: 'مؤشر الالتزام بالحضور', value: stats.attendanceRate, icon: Target, color: 'emerald' },
        { label: 'متوسط الاختبارات', value: stats.examsAvg, icon: BarChart3, color: 'blue' },
        { label: 'إنجاز الواجبات', value: stats.assignmentsAvg, icon: Zap, color: 'amber' }
      ].map((stat, i) => (
        <div key={i} className="bg-[#0a0d16]/80 backdrop-blur-xl p-8 rounded-[2.5rem] relative overflow-hidden border border-white/5 hover:border-white/10 transition-all shadow-xl group">
          <div className={`absolute -right-10 -top-10 w-40 h-40 bg-${stat.color}-500/10 rounded-full blur-[60px] group-hover:bg-${stat.color}-500/20 transition-colors pointer-events-none`}></div>
          <div className="flex items-center justify-between relative z-10 mb-6">
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 flex items-center justify-center border border-${stat.color}-500/20 shadow-inner`}><stat.icon className="w-7 h-7 drop-shadow-sm" /></div>
            <CircularProgress value={stat.value} colorClass={`text-${stat.color}-400`} strokeClass={`text-${stat.color}-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-white text-xl mb-1">{stat.label}</h3>
            <p className="text-[11px] font-bold text-slate-500">تم احتسابه من السجلات الأكاديمية الحقيقية.</p>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <AnnouncementsWidget authRole="parent" />
      <div className="bg-gradient-to-br from-[#111827] to-[#05070e] p-8 rounded-[3rem] shadow-2xl border border-white/5 relative overflow-hidden h-full flex flex-col">
          <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Headphones className="w-6 h-6"/></div>
            <div>
              <h3 className="text-xl font-black text-white">جسر التواصل الموحد</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">بوابتك لإدارة المدرسة</p>
            </div>
          </div>
          <div className="space-y-3 relative z-10 flex-1">
            {[
              { label: 'رسالة للإدارة العليا', role: 'admin', icon: ShieldCheck, color: 'indigo' },
              { label: 'شؤون الطلبة (الغيابات)', role: 'staff', icon: Users, color: 'emerald' },
            ].map((target, i) => (
              <button key={i} onClick={() => router.push(`/messages?to=${target.role}`)} className={`w-full group flex items-center justify-between p-4 bg-[#0a0d16] hover:bg-[#0f1423] rounded-2xl transition-all border border-white/5 hover:border-${target.color}-500/30 shadow-inner active:scale-95`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-${target.color}-500/10 text-${target.color}-400 border border-${target.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0`}><target.icon className="w-4 h-4"/></div>
                  <span className="font-black text-slate-300 group-hover:text-white text-sm transition-colors">{target.label}</span>
                </div>
                <Send className={`w-4 h-4 text-slate-600 group-hover:text-${target.color}-400 transition-colors -rotate-90 rtl:rotate-180`}/>
              </button>
            ))}
          </div>
      </div>
    </div>
  </motion.div>
);

const AcademicsTab = ({ subjectPerformance, detailedTasks, safeFormat, router, activeChildId }: any) => {
  const teachers = useMemo(() => {
    const uniqueTeachers = new Map();
    subjectPerformance.forEach((sp: any) => {
      if (sp.teachers && !uniqueTeachers.has(sp.teachers.id)) {
        uniqueTeachers.set(sp.teachers.id, {
          id: sp.teachers.id, name: sp.teachers.users?.full_name,
          avatar: sp.teachers.users?.avatar_url, subject: sp.subjects?.name
        });
      }
    });
    return Array.from(uniqueTeachers.values());
  }, [subjectPerformance]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
      {teachers.length > 0 && (
        <section className="bg-[#0a0d16]/80 backdrop-blur-xl p-6 sm:p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-3 drop-shadow-sm"><Users className="w-6 h-6 text-indigo-400" /> كادر المعلمين المتابعين للابن</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x mask-fade-edges relative z-10">
            {teachers.map((teacher: any) => (
              <button key={teacher.id} onClick={() => router.push(`/messages?to=teacher&teacherId=${teacher.id}`)} className="snap-center flex items-center gap-3 p-3 pr-4 rounded-2xl bg-[#05070e] border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all min-w-[220px] group shadow-inner shrink-0">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black overflow-hidden border border-indigo-500/20">
                  {teacher.avatar ? <img src={teacher.avatar} alt={teacher.name} className="w-full h-full object-cover" /> : teacher.name?.charAt(0)}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate group-hover:text-indigo-300 transition-colors">أ. {teacher.name?.split(' ')[0]}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{teacher.subject}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-[#0a0d16]/80 backdrop-blur-xl p-8 rounded-[3rem] relative overflow-hidden border border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><BookOpen className="text-blue-400 w-6 h-6"/></div>
              <div>
                <h2 className="text-2xl font-black text-white drop-shadow-md">التحليل الأكاديمي الدقيق</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">مستوى إتقان الابن موزعاً على المواد والمعلمين.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
              {subjectPerformance.map((item: any, idx: number) => (
                <div key={idx} className="bg-[#05070e] p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/20 transition-all group relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-[1.2rem] bg-[#0a0d16] text-blue-400 flex items-center justify-center font-black text-xl border border-white/5 shadow-inner drop-shadow-sm">{item.average}%</div>
                      <div>
                        <h3 className="font-black text-white text-lg group-hover:text-blue-400 transition-colors">{item.subjects?.name}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> أ. {item.teachers?.users?.full_name?.split(' ')[0]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0a0d16] rounded-2xl p-4 border border-white/5 shadow-inner flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500"/> الواجبات</span>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">{item.assignments.length} مهام</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-500"/> الاختبارات</span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">{item.exams.length} تم التقييم</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4">
          <section className="bg-[#0a0d16]/80 backdrop-blur-xl p-8 rounded-[3rem] relative overflow-hidden border border-white/5 shadow-2xl h-full flex flex-col">
            <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20"><FileText className="text-amber-400 w-6 h-6"/></div>
              <div>
                <h2 className="text-xl font-black text-white drop-shadow-md">سجل التقييمات والأوراق</h2>
                <p className="text-xs font-bold text-slate-400 mt-1">اضغط على أي مهمة لمشاهدة الحل.</p>
              </div>
            </div>

            <div className="bg-[#05070e] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner relative z-10 flex-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              {detailedTasks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-bold text-sm">لا يوجد مهام أو اختبارات مسجلة حتى الآن.</div>
              ) : (
                <div className="divide-y divide-white/5 p-2">
                  {detailedTasks.map((task: any) => {
                    const href = task.type === 'exam' ? `/exams/results/${task.original_id}/student/${activeChildId}` : `/assignments/${task.original_id}/submissions/${task.submission_id}`;
                    return (
                      <Link href={href} key={task.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all group rounded-2xl cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-[1rem] flex items-center justify-center shrink-0 border shadow-inner transition-transform group-hover:scale-110", task.type === 'exam' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                            {task.type === 'exam' ? <Award className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                          </div>
                          <div>
                            <h4 className="font-black text-white text-sm group-hover:text-indigo-300 transition-colors drop-shadow-sm line-clamp-1">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black bg-white/5 text-slate-300 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[80px]">{task.subject}</span>
                              <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {safeFormat(task.date, 'dd MMM')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-left flex flex-col items-end gap-1 pl-1 border-l border-white/10 ml-2">
                          <div className={cn("px-3 py-1.5 rounded-xl text-center shadow-inner flex items-baseline gap-1", task.isZero ? "bg-rose-500/10 border border-rose-500/30 text-rose-400" : "bg-[#0a0d16] border border-emerald-500/30 text-emerald-400")}>
                            <span className="font-black text-sm">{task.score}</span>
                            <span className="text-[9px] font-bold opacity-70">/ {task.max}</span>
                          </div>
                          <span className="text-[9px] font-black flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 transition-colors">
                            ورقة الإجابة <Eye className="w-3 h-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

const BehaviorTab = ({ schedule, todaysAttendance, isCurrentClass, getAttendanceStyle, excuses, safeFormat, setIsExcuseModalOpen, attendance }: any) => {
  const absentRecords = useMemo(() => {
    return attendance.filter((a: any) => a.status === 'absent' || a.status === 'late' || a.status === 'excused')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-[#0a0d16]/80 backdrop-blur-xl p-8 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl h-fit">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xl font-black text-white flex items-center gap-3 drop-shadow-sm"><Clock className="w-6 h-6 text-emerald-500" /> البث المباشر لدوام اليوم</h3>
          </div>

          {schedule.length === 0 ? (
              <div className="text-center py-12 bg-[#05070e] rounded-[2rem] border border-dashed border-white/10 text-slate-500 font-bold text-sm shadow-inner">لا يوجد دوام مسجل اليوم.</div>
          ) : (
            <div className="relative border-r-2 border-white/5 pr-6 space-y-6 z-10">
              {schedule.map((lesson: any, idx: number) => {
                const attendanceRecord = todaysAttendance.find((a:any) => a.subjects?.name === lesson.subjects?.name) || todaysAttendance[idx];
                const style = getAttendanceStyle(attendanceRecord?.status);
                const current = isCurrentClass(lesson.period);
                return (
                  <div key={idx} className="relative group">
                    <div className={`absolute -right-[31px] w-4 h-4 rounded-full border-4 border-[#0a0d16] ${current ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]' : style.bg.replace('bg-', 'bg-').replace('/10', '')}`}></div>
                    <div className={cn("p-5 rounded-[1.5rem] border transition-all", current ? "bg-[#05070e] border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]" : "bg-[#05070e]/60 border-white/5 hover:border-white/10 shadow-inner")}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className={cn("font-black text-sm drop-shadow-sm", current ? "text-emerald-400" : "text-white")}>{lesson.subjects?.name}</h4>
                          <p className="text-[10px] font-bold text-slate-500 mt-1">الحصة {lesson.period} • أ. {lesson.teachers?.users?.full_name?.split(' ')[0]}</p>
                        </div>
                        {current && <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] px-2.5 py-1 rounded-md font-black shadow-inner">حصة تفاعلية الآن</span>}
                      </div>
                      <div className={`text-[10px] font-black px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border shadow-inner ${style.bg} ${style.textCol} ${style.border}`}><style.icon className="w-3.5 h-3.5 shrink-0"/>{style.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl flex flex-col h-fit">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>
          
          {/* 🚀 الحل الجذري والآمن لمشكلة تمدد الزر في الجوال */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 relative z-10 w-full">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner">
                <Stethoscope className="w-5 h-5 text-amber-400 drop-shadow-md" />
              </div> 
              سجل الأعذار 
            </h2>
            <button onClick={() => setIsExcuseModalOpen(true)} className="flex-none w-auto px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl text-slate-900 font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-md">
              <Plus className="w-4 h-4" /> عذر جديد
            </button>
          </div>

          <div className="p-6 space-y-3 relative z-10 max-h-[300px] overflow-y-auto custom-scrollbar">
            {excuses.length === 0 ? (
              <div className="text-center py-16 text-slate-500 font-bold text-sm">لم تقم بتقديم أي أعذار طبية مسبقة.</div>
            ) : (
              excuses.map((exc: any) => (
                <div key={exc.id} className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex flex-col gap-2 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-sm">{safeFormat(exc.excuse_date, 'dd MMMM yyyy')}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${
                      exc.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      exc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {exc.status === 'pending' ? 'قيد المراجعة ⏳' : exc.status === 'approved' ? 'عذر مقبول ✓' : 'عذر مرفوض ✕'}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    {exc.duration_type === 'full_day' ? 'غياب يوم كامل' : `غياب جزئي: حصص (${exc.target_periods?.join(', ')})`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#0a0d16]/80 backdrop-blur-xl p-8 rounded-[3rem] border border-rose-500/20 relative overflow-hidden shadow-2xl h-full flex flex-col">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none"></div>
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20"><XCircle className="text-rose-400 w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black text-white drop-shadow-md">سجل الغياب التفصيلي (الفعلي)</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">كشف شفاف للحصص التي لم يحضرها الابن.</p>
          </div>
        </div>

        <div className="bg-[#05070e] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner relative z-10 flex-1 max-h-[750px] overflow-y-auto custom-scrollbar">
          {absentRecords.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold text-sm flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500/50" />
              سجل الابن نظيف تماماً ولا يوجد أي غيابات. ممتاز!
            </div>
          ) : (
            <div className="divide-y divide-white/5 p-2">
              {absentRecords.map((record: any) => {
                const style = getAttendanceStyle(record.status);
                return (
                  <div key={record.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-[1rem] flex items-center justify-center shrink-0 border shadow-inner", style.bg, style.textCol, style.border)}>
                        <style.icon className="w-5 h-5"/>
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm drop-shadow-sm flex items-center gap-2">
                          {safeFormat(record.date, 'EEEE، d MMMM')}
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md border", style.bg, style.textCol, style.border)}>{style.text.split(' ')[0]}</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black bg-white/5 text-slate-300 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[100px]">{record.subjects?.name || 'مادة'}</span>
                          <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> الحصة {record.period}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function ParentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any;
  
  // 🛡️ [Anti-Freeze Patch]: قفل دوال الـ Fetch باستخدام useRef
  const { fetchParentDashboardData, fetchParentChildDetails } = useDashboardSystem();
  const systemRef = useRef({ fetchParentDashboardData, fetchParentChildDetails });
  
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'behavior'>('overview');
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  const [attendance, setAttendance] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [stats, setStats] = useState({ attendanceRate: 100, examsAvg: 0, assignmentsAvg: 0, absentCount: 0 });
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [detailedTasks, setDetailedTasks] = useState<any[]>([]); 
  const [excuses, setExcuses] = useState<any[]>([]);
  
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);
  const [excuseForm, setExcuseForm] = useState({
    excuse_date: format(new Date(), 'yyyy-MM-dd'), duration_type: 'full_day',
    target_periods: [] as number[], reason: '', attachment_url: '', cloudinary_public_id: ''
  });

  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  // 🛡️ الأقفال لمنع التكرار
  const initialFetchDone = useRef(false);
  const lastFetchedChildId = useRef<string | null>(null);

  useEffect(() => {
    systemRef.current = { fetchParentDashboardData, fetchParentChildDetails };
  }, [fetchParentDashboardData, fetchParentChildDetails]);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('parents').select('*, users(full_name, email, avatar_url)').eq('id', user.id).maybeSingle();
      setParentData(pData);

      const dashboardData = await systemRef.current.fetchParentDashboardData(false);
      if (dashboardData && dashboardData.children.length > 0) {
        setChildren(dashboardData.children);
        setActiveChildId(dashboardData.children[0].id);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user?.id]); // 🛡️ الاعتماد فقط على الـ ID

  useEffect(() => { 
    if (isChecking || !user?.id || authRole !== 'parent' || initialFetchDone.current) return;
    initialFetchDone.current = true;
    loadInitialData(); 
  }, [isChecking, user?.id, authRole, loadInitialData]);

  const loadActiveChild = useCallback(async (childId: string, sectionId: string | null) => {
    try {
      setChildLoading(true);
      const data = await systemRef.current.fetchParentChildDetails(childId, sectionId);
      
      setAttendance(data.attendance);
      setBadges(data.badges);
      setPeriods(data.periods);
      setSchedule(data.schedule);

      const { data: excusesData } = await supabase.from('absence_excuses').select('*').eq('student_id', childId).order('created_at', { ascending: false });
      setExcuses(excusesData || []);

      const allTasks: any[] = [];
      data.assignments.forEach((sub: any) => {
        allTasks.push({
          id: `ass_${sub.id}`, type: 'assignment',
          original_id: sub.assignments?.id, submission_id: sub.id,
          title: sub.assignments?.title || 'واجب تفاعلي',
          subject: sub.assignments?.subjects?.name || 'عام',
          score: sub.grade || 0, max: sub.assignments?.total_marks || 100,
          date: sub.submitted_at || new Date().toISOString(), isZero: sub.grade === 0
        });
      });

      data.exams.forEach((att: any) => {
        allTasks.push({
          id: `ex_${att.id}`, type: 'exam',
          original_id: att.exams?.id, attempt_id: att.id,
          title: att.exams?.title || 'اختبار قصير',
          subject: att.exams?.subjects?.name || 'عام',
          score: att.score || 0, max: att.exams?.total_marks || att.exams?.max_score || 100,
          date: att.completed_at || new Date().toISOString(), isZero: att.score === 0
        });
      });

      allTasks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDetailedTasks(allTasks);

      const uniqueSubjects = Array.from(new Map(data.schedule.map((item: any) => [item.subjects?.id, item])).values());
      const performance = uniqueSubjects.map((item: any) => {
        const subId = item.subjects?.id;
        if (!subId) return null;
        const subExams = data.exams.filter((e: any) => e.exams?.subjects?.id === subId && e.status === 'graded');
        const subAss = data.assignments.filter((a: any) => a.assignments?.subjects?.id === subId && a.status === 'graded');
        return {
          ...item, exams: subExams, assignments: subAss,
          average: calculateAverage([...subExams, ...subAss])
        };
      }).filter(Boolean);
      
      setSubjectPerformance(performance);

      let absentCount = 0; let attRate = 100;
      if (data.attendance.length > 0) {
        absentCount = data.attendance.filter(a => a.status === 'absent').length;
        const presents = data.attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        attRate = Math.round((presents / data.attendance.length) * 100);
      }

      setStats({ 
        attendanceRate: attRate, 
        examsAvg: calculateAverage(data.exams.filter(e => e.status === 'graded')), 
        assignmentsAvg: calculateAverage(data.assignments.filter(a => a.status === 'graded')), 
        absentCount 
      });

    } catch (e) { console.error(e); } finally { setChildLoading(false); }
  }, []); // 🛡️ لا يوجد تبعيات تتغير

  useEffect(() => { 
    if (activeChildId && activeChildId !== lastFetchedChildId.current) {
      lastFetchedChildId.current = activeChildId;
      const child = children.find(c => c.id === activeChildId);
      loadActiveChild(activeChildId, child?.section_id || null); 
    }
  }, [activeChildId, children, loadActiveChild]);

  const activeChild = useMemo(() => children.find(c => c.id === activeChildId), [children, activeChildId]);
  
  const todaysAttendance = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return attendance.filter(a => a.date && a.date.startsWith(todayStr));
  }, [attendance]);

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
      case 'present': return { text: 'حاضر (تم الرصد)', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', textCol: 'text-emerald-400', icon: CheckCircle2 };
      case 'absent': return { text: 'غائب (سجل خطر)', bg: 'bg-rose-500/10', border: 'border-rose-500/30', textCol: 'text-rose-400', icon: XCircle };
      case 'late': return { text: 'متأخر (تم الرصد)', bg: 'bg-amber-500/10', border: 'border-amber-500/30', textCol: 'text-amber-400', icon: Clock };
      case 'excused': return { text: 'مستأذن (بعذر)', bg: 'bg-blue-500/10', border: 'border-blue-500/30', textCol: 'text-blue-400', icon: ShieldCheck };
      default: return { text: 'لم يُرصد بعد', bg: 'bg-white/5', border: 'border-white/10', textCol: 'text-slate-400', icon: Clock };
    }
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReport(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) setExcuseForm(prev => ({ ...prev, attachment_url: data.secure_url, cloudinary_public_id: data.public_id }));
      else throw new Error('Upload failed');
    } catch (err) { alert('فشل رفع الملف. تأكد من إعدادات Cloudinary أو حاول مجدداً.'); } finally { setIsUploadingReport(false); }
  };

  const handleSubmitExcuse = async () => {
    if (!excuseForm.attachment_url) return alert('يرجى إرفاق التقرير الطبي أو الإثبات.');
    if (excuseForm.duration_type === 'partial_day' && excuseForm.target_periods.length === 0) return alert('يرجى تحديد الحصص التي غاب عنها الابن.');
    
    setIsSubmittingExcuse(true);
    try {
      const payload = {
        student_id: activeChildId, submitted_by: user.id, submitter_role: 'parent',
        excuse_date: excuseForm.excuse_date, duration_type: excuseForm.duration_type,
        target_periods: excuseForm.duration_type === 'partial_day' ? excuseForm.target_periods : [],
        reason: excuseForm.reason, attachment_url: excuseForm.attachment_url,
        cloudinary_public_id: excuseForm.cloudinary_public_id, status: 'pending'
      };
      const { error } = await supabase.from('absence_excuses').insert([payload]);
      if (error) throw error;
      alert('تم تقديم العذر بنجاح، وهو الآن قيد المراجعة من الإدارة.');
      setIsExcuseModalOpen(false);
      setExcuseForm({ excuse_date: format(new Date(), 'yyyy-MM-dd'), duration_type: 'full_day', target_periods: [], reason: '', attachment_url: '', cloudinary_public_id: '' });
      if (activeChildId && activeChild) {
         lastFetchedChildId.current = null; // لإجبار التحديث
         loadActiveChild(activeChildId, activeChild.section_id);
      }
    } catch (error: any) { alert('حدث خطأ أثناء التقديم: ' + error.message); } finally { setIsSubmittingExcuse(false); }
  };

  const togglePeriod = (periodNum: number) => {
    setExcuseForm(prev => {
      const exists = prev.target_periods.includes(periodNum);
      if (exists) return { ...prev, target_periods: prev.target_periods.filter(p => p !== periodNum) };
      return { ...prev, target_periods: [...prev.target_periods, periodNum].sort((a,b) => a - b) };
    });
  };

  if (isChecking || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05070e] font-cairo">
        <div className="flex flex-col items-center gap-5 relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full"></div>
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] relative z-10" />
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md relative z-10">تجهيز قمرة القيادة...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'parent') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05070e] font-cairo p-4">
        <div className="bg-[#0f1423] p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)] relative overflow-hidden">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة لأولياء الأمور كشركاء أساسيين في النجاح.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#05070e] pb-32 md:pb-24 font-cairo overflow-x-hidden" dir="rtl">
      
      {/* ✨ خلفية الواجهة (Mesh Gradient) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px]"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* 👑 الهيدر الثابت العُلوي (Global Header & Switcher) */}
        <div className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#0a0d16] via-[#111827] to-[#0a0d16] p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
           
           <div className="flex flex-col md:flex-row items-center gap-6 relative z-10 text-center md:text-right">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#05070e] border border-indigo-500/30 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-white font-black text-3xl shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  {parentData?.users?.full_name?.charAt(0)}
                </div>
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-black uppercase tracking-widest mb-3 text-indigo-400 shadow-inner">
                  <Crown className="w-4 h-4" /> شركاء النجاح
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">مرحباً بك، أ. {parentData?.users?.full_name?.split(' ')[0]}</h1>
                <p className="text-slate-400 font-bold mt-2 text-sm drop-shadow-sm max-w-lg leading-relaxed">قمرة القيادة الذكية لمتابعة التقدم الأكاديمي والحضور الفعلي لأبنائك.</p>
              </div>
           </div>
           
           {/* 🔄 مبدل الأبناء المطور (Children Switcher) */}
           <div className="flex gap-3 overflow-x-auto p-2 w-full md:w-auto custom-scrollbar snap-x relative z-10 mask-fade-edges">
              {children.map(child => (
                <button 
                  key={child.id} onClick={() => setActiveChildId(child.id)}
                  className={cn("snap-center flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 border shrink-0 min-w-[200px] group relative overflow-hidden", activeChildId === child.id ? "bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-105" : "bg-[#0f1423]/60 border-white/5 hover:bg-[#1a233a] hover:border-indigo-500/30 text-slate-300")}
                >
                  {activeChildId === child.id && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>}
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors shadow-inner relative z-10", activeChildId === child.id ? "bg-white/20 text-white" : "bg-[#05070e] text-indigo-400 group-hover:bg-indigo-500/20")}>
                    {child.users?.avatar_url ? <img src={child.users.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="child"/> : child.users?.full_name?.charAt(0)}
                  </div>
                  <div className="text-right relative z-10">
                    <span className="font-black text-base block drop-shadow-sm">{child.users?.full_name?.split(' ')[0]}</span>
                    <span className={cn("text-[10px] font-bold block mt-1", activeChildId === child.id ? "text-indigo-100" : "text-slate-500")}>{child.sections?.classes?.name || 'لم يحدد'}</span>
                  </div>
                </button>
              ))}
           </div>
        </div>

        <AnimatePresence mode="wait">
          {childLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-32"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></motion.div>
          ) : activeChild && (
            <motion.div key={activeTab} className="w-full">
              {activeTab === 'overview' && <OverviewTab stats={stats} absentCount={stats.absentCount} setIsExcuseModalOpen={setIsExcuseModalOpen} router={router} />}
              {activeTab === 'academics' && <AcademicsTab subjectPerformance={subjectPerformance} detailedTasks={detailedTasks} safeFormat={safeFormat} router={router} activeChildId={activeChildId} />}
              {activeTab === 'behavior' && <BehaviorTab schedule={schedule} todaysAttendance={todaysAttendance} isCurrentClass={isCurrentClass} getAttendanceStyle={getAttendanceStyle} excuses={excuses} safeFormat={safeFormat} setIsExcuseModalOpen={setIsExcuseModalOpen} attendance={attendance} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 📱 الشريط السفلي للتنقل (Mobile-First Bottom Navigation Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom)] md:pb-6 pt-2 pointer-events-none flex justify-center">
        <div className="bg-[#131836]/90 backdrop-blur-2xl border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-full p-2 flex items-center justify-center gap-2 max-w-[400px] w-full pointer-events-auto">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'النظرة العامة' },
            { id: 'academics', icon: BookOpen, label: 'الأكاديميات' },
            { id: 'behavior', icon: Shield, label: 'السلوك والدوام' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn("flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-full transition-all duration-300 relative group", activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-indigo-400 hover:bg-white/5")}
            >
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 bg-indigo-600 rounded-full -z-10 shadow-lg shadow-indigo-600/40" />}
              <tab.icon className={cn("w-5 h-5 mb-1 transition-transform", activeTab === tab.id && "scale-110 drop-shadow-md")} />
              <span className={cn("text-[10px] font-black tracking-wide", activeTab === tab.id && "drop-shadow-sm")}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🚀 نافذة (Modal) تقديم العذر الطبي العائم */}
      <AnimatePresence>
        {isExcuseModalOpen && (
          <Dialog.Root open={isExcuseModalOpen} onOpenChange={setIsExcuseModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/90 backdrop-blur-md z-[100]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] w-[95%] max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.7)] z-[101] p-8 max-h-[90vh] overflow-y-auto custom-scrollbar" dir="rtl">
                
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-2xl font-black text-white flex items-center gap-3"><Stethoscope className="w-6 h-6 text-amber-400" /> تقديم عذر طبي</Dialog.Title>
                    <p className="text-xs font-bold text-slate-400 mt-2">لابنك: <span className="text-indigo-300">{activeChild?.users?.full_name}</span></p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></Dialog.Close>
                </div>

                <div className="space-y-6">
                  {/* التاريخ ونوع الغياب */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">تاريخ الغياب</label>
                      <input type="date" value={excuseForm.excuse_date} onChange={(e) => setExcuseForm({...excuseForm, excuse_date: e.target.value})} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-3.5 text-sm font-bold text-white outline-none focus:border-amber-500/50" style={{ colorScheme: 'dark' }} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">نوع الدوام</label>
                      <select value={excuseForm.duration_type} onChange={(e) => setExcuseForm({...excuseForm, duration_type: e.target.value, target_periods: []})} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-3.5 text-sm font-bold text-white outline-none focus:border-amber-500/50 appearance-none [&>option]:bg-[#131836]">
                        <option value="full_day">غياب يوم كامل</option>
                        <option value="partial_day">غياب جزئي (استئذان حصص)</option>
                      </select>
                    </div>
                  </div>

                  {/* اختيار الحصص */}
                  <AnimatePresence>
                    {excuseForm.duration_type === 'partial_day' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> حدد الحصص التي غاب عنها ابنك</label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                              <button 
                                key={p} type="button" onClick={() => togglePeriod(p)}
                                className={cn("w-10 h-10 rounded-xl font-black text-sm transition-all border", excuseForm.target_periods.includes(p) ? "bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-[#090b14] text-slate-400 border-white/10 hover:border-amber-500/50")}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* رفع المرفق */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">إرفاق التقرير الطبي (صورة)</label>
                    <label className={cn("relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all", isUploadingReport ? "border-amber-500/50 bg-amber-500/5" : excuseForm.attachment_url ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-[#090b14] hover:border-amber-500/30 hover:bg-white/5")}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleReportUpload} disabled={isUploadingReport} />
                      {isUploadingReport ? (
                        <div className="flex flex-col items-center gap-2 text-amber-400"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs font-black">جاري الرفع السحابي...</span></div>
                      ) : excuseForm.attachment_url ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-400"><CheckCircle2 className="w-8 h-8" /><span className="text-xs font-black">تم إرفاق التقرير بنجاح (انقر لتغييره)</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500"><UploadCloud className="w-8 h-8" /><span className="text-xs font-bold">اضغط هنا لاختيار صورة التقرير</span></div>
                      )}
                    </label>
                  </div>

                  {/* تفاصيل إضافية */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">ملاحظات للإدارة (اختياري)</label>
                    <textarea 
                      value={excuseForm.reason} onChange={(e) => setExcuseForm({...excuseForm, reason: e.target.value})}
                      placeholder="اكتب أي تفاصيل إضافية هنا..." 
                      className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500/50 h-24 resize-none custom-scrollbar"
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={handleSubmitExcuse} disabled={isSubmittingExcuse} className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-900 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmittingExcuse && <Loader2 className="w-5 h-5 animate-spin" />} إرسال الطلب للإدارة
                  </button>
                  <button onClick={() => setIsExcuseModalOpen(false)} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10">إلغاء</button>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .mask-fade-edges { mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
      `}</style>
    </motion.div>
  );
}
