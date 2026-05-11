// @ts-nocheck
/* eslint-disable */
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, 
  Clock, FileText, Plus, Search, 
  TrendingUp, BarChart2, UserCheck, MessageSquare,
  Bell, ChevronLeft, MoreVertical, Edit, Trash2, AlertCircle, Camera, Play, Star, ChevronRight,
  AlertTriangle, ShieldAlert, HeartHandshake, Award, ArrowUpRight, Loader2, Sparkles,
  ShieldCheck, MapPin, FileKey, CalendarDays, Download, Fingerprint, Crown, Key, FileSignature, X
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
import * as Dialog from '@radix-ui/react-dialog';
import MemorialShieldDisplay from '@/components/MemorialShieldDisplay';


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

  // 🚀 حالات المنظومة الامتحانية
  const [invigilationDuties, setInvigilationDuties] = useState<any[]>([]);
  const [headDuties, setHeadDuties] = useState<any[]>([]);
  const [controlTeamRole, setControlTeamRole] = useState<any>(null);
  const [finalExamsTimetable, setFinalExamsTimetable] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);

  // 🚀 حالات الاعتذار عن المراقبة (تم فصل المفاتيح لمنع الانهيار)
  const [isDutyExcuseModalOpen, setIsDutyExcuseModalOpen] = useState(false);
  const [selectedDutyId, setSelectedDutyId] = useState('');
  const [dutyExcuseText, setDutyExcuseText] = useState('');
  const [isProcessingDuty, setIsProcessingDuty] = useState(false);

  // 🚀 حالات الاعتذار الطبي (الأساسي)
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [currentDateInput, setCurrentDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);
  const [excuseForm, setExcuseForm] = useState({
    absent_dates: [format(new Date(), 'yyyy-MM-dd')],
    duration_type: 'full_day',
    target_periods: [] as number[],
    reason: '',
    attachment_url: '',
    cloudinary_public_id: ''
  });

  const [attendanceStatus, setAttendanceStatus] = useState<{
    isActive: boolean;
    missedPeriods: number[];
    completed: boolean;
    totalToday: number;
  }>({ isActive: false, missedPeriods: [], completed: false, totalToday: 0 });

  const [stats, setStats] = useState({
    totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 0, absenceRate: 0
  });
  const [assignmentStats, setAssignmentStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { fetchTeacherDashboardData } = useDashboardSystem();
  const isFetchedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(clockTimer);
  }, []);

  const isCurrentClass = useCallback((startTime?: string, endTime?: string) => {
    if (!currentTime || !startTime || !endTime) return false;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const now = currentTime;
    const start = new Date(now); start.setHours(startH, startM, 0);
    const end = new Date(now); end.setHours(endH, endM, 0);
    return now >= start && now <= end;
  }, [currentTime]);

  const isNextClass = useCallback((startTime?: string) => {
    if (!currentTime || !startTime) return false;
    const [startH, startM] = startTime.split(':').map(Number);
    const now = currentTime;
    const start = new Date(now); start.setHours(startH, startM, 0);
    const diff = (start.getTime() - now.getTime()) / (1000 * 60);
    return diff > 0 && diff <= 60;
  }, [currentTime]);

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id || isFetchedRef.current) return;
    
    isFetchedRef.current = true;
    setLoading(true);

    try {
      const data = await fetchTeacherDashboardData();
      
      if (data) {
        setTeacherData(data.teacher);
        setSections(data.sections || []);
        setRecentExams(data.recentExams || []);
        setRecentAssignments(data.recentAssignments || []);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
        setMessages(data.messages || []);
        setStats(prev => ({ ...prev, ...data.stats }));
        if (data.assignmentStats) setAssignmentStats(data.assignmentStats);

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
                    id: sid, name: userObj?.full_name || 'طالب غير معروف',
                    className: `${classObj?.name || ''} - ${secObj?.name || ''}`, count: 0
                  });
                }
                studentAbsences.get(sid).count++;
              });
              setAtRiskStudents(Array.from(studentAbsences.values()).filter((s: any) => s.count >= 5));
            }

            try {
               const currentYear = '2025-2026';
               const currentSemester = 'الفصل الدراسي الثاني';
               
               let mySubjectIds: string[] = [];
               const { data: myAssignments } = await supabase.from('teacher_assignments').select('subject_id').eq('teacher_id', data.teacher.id);
               if (myAssignments) mySubjectIds = [...mySubjectIds, ...myAssignments.map((a: any) => a.subject_id)];
               if (data.schedule) mySubjectIds = [...mySubjectIds, ...data.schedule.map((s: any) => s.subject_id)];
               mySubjectIds = Array.from(new Set(mySubjectIds.filter(Boolean))); 

               const [invigRes, finalExamsRes, headRes, controlRes] = await Promise.all([
                  supabase.from('committee_invigilators').select('id, status, excuse_reason, signed_at, exam_committees(name, location, capacity)').eq('teacher_id', data.teacher.id),
                  supabase.from('exam_timetables').select('*, subjects(name)').eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date', { ascending: true }).limit(5),
                  supabase.from('exam_committee_heads').select('committees_range, exam_timetables(exam_date, subjects(name), class_level)').eq('head_teacher_id', data.teacher.id),
                  supabase.from('exam_control_team').select('role_name').eq('user_id', user.id).eq('academic_year', currentYear).eq('semester', currentSemester).maybeSingle()
               ]);

               if (invigRes.data) setInvigilationDuties(invigRes.data);
               if (finalExamsRes.data) setFinalExamsTimetable(finalExamsRes.data);
               if (headRes.data) setHeadDuties(headRes.data);
               if (controlRes.data) setControlTeamRole(controlRes.data);

               if (mySubjectIds.length > 0) {
                   const { data: keysRes } = await supabase.from('exam_answer_keys')
                     .select('*, subjects(name)')
                     .eq('is_published', true).eq('academic_year', currentYear).eq('semester', currentSemester)
                     .in('subject_id', mySubjectIds).order('created_at', { ascending: false }).limit(5);
                   if (keysRes) setAnswerKeys(keysRes);
               } else {
                   setAnswerKeys([]);
               }
            } catch (examErr) { console.error("Error fetching exam system data:", examErr); }

            const now = new Date();
            if (now >= SYSTEM_START_DATE && data.schedule && data.periods) {
              const todayStr = format(now, 'yyyy-MM-dd');
              const currentDayOfWeek = now.getDay() + 1; 
              const todaysScheduleData = data.schedule.filter((s: any) => Number(s.day_of_week) === currentDayOfWeek);
              
              if (todaysScheduleData.length === 0) {
                setAttendanceStatus({ isActive: true, completed: true, missedPeriods: [], totalToday: 0 });
              } else {
                const todaySectionIds = Array.from(new Set(todaysScheduleData.map((s: any) => s.section_id)));
                const [ { data: recordsData }, { data: sessionsData } ] = await Promise.all([
                  supabase.from('attendance_records').select('period, section_id').eq('date', todayStr).in('section_id', todaySectionIds),
                  supabase.from('attendance_sessions').select('period_number, section_id').eq('date', todayStr).eq('status', 'submitted').in('section_id', todaySectionIds)
                ]);

                const recordedKeys = new Set([
                  ...(recordsData || []).map(r => `${r.section_id}-${Number(r.period)}`),
                  ...(sessionsData || []).map(r => `${r.section_id}-${Number(r.period_number)}`)
                ]);

                const missed: number[] = [];
                let totalRecorded = 0;

                todaysScheduleData.forEach((slot: any) => {
                  const pNum = Number(slot.period);
                  const sId = slot.section_id;
                  const key = `${sId}-${pNum}`;

                  if (recordedKeys.has(key)) { totalRecorded++; } 
                  else if (slot.end_time) {
                    const [h, m] = slot.end_time.split(':').map(Number);
                    const endTime = new Date(now); endTime.setHours(h, m, 0, 0);
                    if (now > endTime && !missed.includes(pNum)) missed.push(pNum);
                  }
                });

                setAttendanceStatus({
                  isActive: true, missedPeriods: missed.sort((a, b) => a - b),
                  completed: missed.length === 0 && totalRecorded >= todaysScheduleData.length,
                  totalToday: todaysScheduleData.length
                });
              }
            }
        }
      }
    } catch (error) { console.error('Error:', error); isFetchedRef.current = false; } 
    finally { setLoading(false); }
  }, [fetchTeacherDashboardData, user?.id]);

  useEffect(() => {
    if (!isChecking && (authRole === 'teacher' || authRole === 'admin' || authRole === 'management')) fetchData();
  }, [fetchData, isChecking, authRole]);

  // 🚀 دوال العهد والتوثيق الرقمي للمراقبة
  const signDuty = async (id: string) => {
    if (!confirm('هل أنت متأكد من توقيعك إلكترونياً لاستلام مهام هذه اللجنة؟')) return;
    setIsProcessingDuty(true);
    try {
      const { error } = await supabase.from('committee_invigilators').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setInvigilationDuties(prev => prev.map(d => d.id === id ? { ...d, status: 'signed', signed_at: new Date().toISOString() } : d));
    } catch(e) { alert('حدث خطأ أثناء التوقيع.'); } finally { setIsProcessingDuty(false); }
  };

  const openDutyExcuseModal = (id: string) => {
    setSelectedDutyId(id);
    setDutyExcuseText('');
    setIsDutyExcuseModalOpen(true);
  };

  const submitDutyExcuse = async () => {
    if (!dutyExcuseText.trim()) { alert('يرجى كتابة سبب العذر للإدارة!'); return; }
    setIsProcessingDuty(true);
    try {
       const { error } = await supabase.from('committee_invigilators').update({ status: 'excused', excuse_reason: dutyExcuseText }).eq('id', selectedDutyId);
      if (error) throw error;
      alert('تم رفع العذر للإدارة بنجاح وفي سرية تامة.');
      setIsDutyExcuseModalOpen(false);
      setInvigilationDuties(prev => prev.map(d => d.id === selectedDutyId ? { ...d, status: 'excused', excuse_reason: dutyExcuseText } : d));
    } catch(e) { alert('حدث خطأ أثناء رفع العذر.'); } finally { setIsProcessingDuty(false); }
  };

  // 🚀 دوال العذر الطبي للغياب
  const handleAddDate = () => {
    if (!currentDateInput) return;
    if (excuseForm.absent_dates.includes(currentDateInput)) { alert('هذا التاريخ مضاف مسبقاً.'); return; }
    setExcuseForm(prev => ({ ...prev, absent_dates: [...prev.absent_dates, currentDateInput].sort() }));
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setExcuseForm(prev => ({ ...prev, absent_dates: prev.absent_dates.filter(d => d !== dateToRemove) }));
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
    } catch (err) { alert('فشل رفع الملف.'); } finally { setIsUploadingReport(false); }
  };

  const handleSubmitExcuse = async () => {
    if (excuseForm.absent_dates.length === 0) { alert('يرجى تحديد يوم غياب واحد على الأقل.'); return; }
    if (!excuseForm.attachment_url) { alert('يرجى إرفاق التقرير الطبي أو الإثبات أولاً.'); return; }
    if (excuseForm.duration_type === 'partial_day' && excuseForm.target_periods.length === 0) { alert('يرجى تحديد الحصص التي غبت عنها.'); return; }

    setIsSubmittingExcuse(true);
    try {
      const payload = {
        student_id: teacherData.id,
        submitted_by: user.id,
        submitter_role: 'teacher',
        excuse_date: excuseForm.absent_dates[0],
        absent_dates: excuseForm.absent_dates,
        duration_type: excuseForm.duration_type,
        target_periods: excuseForm.duration_type === 'partial_day' ? excuseForm.target_periods : [],
        reason: excuseForm.reason,
        attachment_url: excuseForm.attachment_url,
        cloudinary_public_id: excuseForm.cloudinary_public_id,
        status: 'pending'
      };

      const { error } = await supabase.from('absence_excuses').insert([payload]);
      if (error) throw error;

      alert('تم تقديم العذر بنجاح!');
      setIsExcuseModalOpen(false);
      setExcuseForm({ absent_dates: [format(new Date(), 'yyyy-MM-dd')], duration_type: 'full_day', target_periods: [], reason: '', attachment_url: '', cloudinary_public_id: '' });
      fetchData();
    } catch (error: any) { alert('حدث خطأ أثناء التقديم: ' + error.message); } finally { setIsSubmittingExcuse(false); }
  };

  const togglePeriod = (periodNum: number) => {
    setExcuseForm(prev => {
      const exists = prev.target_periods.includes(periodNum);
      if (exists) return { ...prev, target_periods: prev.target_periods.filter(p => p !== periodNum) };
      return { ...prev, target_periods: [...prev.target_periods, periodNum].sort((a,b) => a - b) };
    });
  };

  const todaysSchedule = useMemo(() => {
    const today = new Date().getDay() + 1; 
    return schedule.filter(s => Number(s.day_of_week) === today);
  }, [schedule]);

  if (isChecking && !user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14]">
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
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)] bg-[#131836]/60 backdrop-blur-md">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للمعلمين وإدارة المدرسة فقط.</p>
        </div>
      </div>
    );
  }

  if (loading && !teacherData) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد لوحتك المدرسية...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = teacherData?.users?.avatar_url;
  const qrPayloadControl = `raf-control:${user.id}`;
  const qrCodeUrlControl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayloadControl)}&margin=0`;
  const qrPayloadInvig = `raf-id:${user.id}`;
  const qrCodeUrlInvig = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayloadInvig)}&margin=0`;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-[100dvh] relative bg-[#090b14] text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6" dir="rtl">
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
10">

        {/* 🚀 1. مكان زراعة الدرع التذكاري الجديد (يظهر فقط إذا كان للمعلم تكريم) */}
        {teacherData?.id && (
           <MemorialShieldDisplay userId={teacherData.id} role="teacher" />
        )}

        {/* 🚀 هرم القيادة: 1. بانر أعضاء الكنترول */}
        <AnimatePresence>
          {controlTeamRole && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-purple-900 via-[#131836] to-[#0f1423] p-8 md:p-10 shadow-[0_20px_50px_rgba(147,51,234,0.3)] border-[3px] border-[#3b0764] group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] pointer-events-none rounded-full"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between text-center md:text-right">
                  <div className="flex items-center justify-center w-20 h-20 bg-purple-500/20 rounded-3xl border border-purple-400/50 shadow-inner shrink-0">
                     <Key className="w-10 h-10 text-purple-300 drop-shadow-md" />
                  </div>
                  <div className="flex-1">
                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-300 text-xs font-black mb-4 uppercase tracking-widest shadow-inner">
                       <ShieldCheck className="w-4 h-4" /> القيادة العليا للامتحانات
                     </div>
                     <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">أهلاً بك في <span className="text-purple-400">الكنترول المركزي</span></h2>
                     <p className="text-purple-200/80 font-bold text-sm sm:text-base max-w-2xl mx-auto md:mx-0">
                       أنتم العقل المدبر خلف الكواليس، حراس النزاهة وأمناء السر. لقد تم اعتماد صفتكم كـ <span className="font-black text-white bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">{controlTeamRole.role_name}</span>. مهامكم تتطلب دقة متناهية وإخلاصاً مطلقاً.
                     </p>
                  </div>
                  <div className="shrink-0 perspective-1000 hidden md:block">
                     <div className="w-[60mm] h-[95mm] border-[4px] border-slate-900 rounded-[2rem] relative overflow-hidden flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-white transform transition-all duration-700 hover:rotate-y-12 hover:scale-105 group/card">
                        <div className="absolute top-0 left-0 w-full h-[35mm] bg-slate-900 shrink-0 flex flex-col items-center justify-start pt-4 border-b-[3px] border-rose-600 relative overflow-hidden">
                           <div className="absolute -left-10 -top-10 w-24 h-24 bg-rose-500/20 blur-xl rounded-full"></div>
                           <p className="text-white font-black text-[14px] mt-1 drop-shadow-md tracking-wide">مدرسة الرفعة النموذجية</p>
                           <div className="mt-2 bg-rose-600 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-1.5 border border-rose-500/50">
                              <ShieldCheck className="w-3.5 h-3.5 text-white" />
                              <p className="text-white font-black text-[10px] tracking-widest">العمليات (VIP)</p>
                           </div>
                        </div>
                        <div className="relative z-20 w-[26mm] h-[26mm] mt-[20mm] mb-3 rounded-full bg-white border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.3)] overflow-hidden shrink-0 flex items-center justify-center transform group-hover/card:scale-110 transition-transform duration-500">
                           {avatarUrl ? <img src={avatarUrl} crossOrigin="anonymous" alt="Staff" className="w-full h-full object-cover" /> : <Key className="w-10 h-10 text-slate-300" />}
                        </div>
                        <div className="relative z-10 w-full px-4 flex-1 flex flex-col items-center">
                           <h2 className="text-[16px] font-black text-slate-900 mb-1 leading-tight line-clamp-2 drop-shadow-md">{teacherData?.users?.full_name || '...'}</h2>
                           <p className="text-[11px] font-black text-rose-600 mb-2 border-b-2 border-slate-200 pb-2 w-full truncate">{controlTeamRole.role_name}</p>
                           <div className="mt-auto mb-4 flex flex-col items-center group-hover/card:-translate-y-1 transition-transform">
                              <div className="w-[20mm] h-[20mm] bg-white p-1 rounded-xl border-[3px] border-slate-900 mb-1.5 shadow-lg"><img src={qrCodeUrlControl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain mix-blend-multiply" /></div>
                              <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Fingerprint className="w-3 h-3"/> Secured Access</p>
                           </div>
                        </div>
                        <div className="w-full h-3 bg-rose-600 shrink-0"></div>
                     </div>
                  </div>
               </div>
               <div className="relative z-10 mt-6 md:mt-8 flex justify-center md:justify-start">
                  <Link href="/admin/exam-pipeline" className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.6)] flex items-center gap-2 transition-all active:scale-95 border border-purple-400/50 w-full sm:w-auto text-center justify-center">
                     الدخول لغرفة الكنترول <ArrowUpRight className="w-5 h-5" />
                  </Link>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 هرم القيادة: 2. بانر رؤساء اللجان */}
        <AnimatePresence>
          {headDuties.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, type: 'spring' }} className="relative overflow-hidden rounded-[3rem] bg-gradient-to-l from-amber-900 via-[#131836] to-[#0f1423] p-8 md:p-10 shadow-[0_20px_50px_rgba(245,158,11,0.2)] border-[3px] border-[#92400e] group">
               <div className="absolute top-0 left-0 w-[60vw] h-[60vw] bg-amber-500/10 blur-[100px] pointer-events-none rounded-full transition-transform duration-1000 group-hover:scale-110"></div>
               <div className="relative z-10 flex flex-col items-center text-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                     <div className="p-4 bg-amber-500/20 rounded-3xl border border-amber-400/50 shadow-inner">
                        <Crown className="w-10 h-10 text-amber-400 drop-shadow-md" />
                     </div>
                     <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">القيادة الميدانية: <span className="text-amber-400">رئيس لجان الامتحانات</span></h2>
                     <p className="text-slate-300 text-sm sm:text-lg font-bold leading-relaxed max-w-3xl opacity-90">
                       أستاذي الكريم، القيادة الميدانية تتطلب حكمة وحزماً، وقد تم تكليفكم بناءً على كفاءتكم للإشراف وإدارة سير الامتحانات في التواريخ والنطاقات التالية. نثق بقدرتكم على تذليل الصعاب.
                     </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-4">
                     {headDuties.map((duty, idx) => (
                        <div key={idx} className="bg-[#02040a]/80 p-5 rounded-2xl border border-amber-500/30 shadow-inner flex flex-col gap-4 text-right backdrop-blur-md hover:border-amber-400/60 transition-colors">
                           <div className="flex justify-between items-start border-b border-white/5 pb-4">
                              <span className="text-[11px] font-black bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 shadow-inner"><CalendarDays className="w-3.5 h-3.5 inline mr-1" /> {safeFormat(duty.exam_timetables?.exam_date, 'd MMMM yyyy')}</span>
                              <span className="text-[10px] font-black bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10">الصف {duty.exam_timetables?.class_level}</span>
                           </div>
                           <h3 className="text-xl font-black text-white drop-shadow-sm truncate">{duty.exam_timetables?.subjects?.name}</h3>
                           <p className="text-sm font-bold text-amber-200/80 bg-amber-900/40 p-3 rounded-xl border border-amber-500/20 mt-auto leading-relaxed">
                             📍 إشراف على: <span className="text-amber-400 font-black">{duty.committees_range}</span>
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 هرم القيادة: 3. بانر تكليف المراقبة (مع التوقيع والاعتذار) */}
        <AnimatePresence>
          {invigilationDuties.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, type: 'spring' }} className="relative overflow-hidden rounded-[3rem] bg-[#02040a] p-8 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-[3px] border-[#0f1423] group">
               <div className="absolute top-[-50%] left-[-10%] w-[100vw] h-[100vw] sm:w-[60vw] sm:h-[60vw] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
               
               <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex-1 text-center lg:text-right">
                     <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-black mb-6 shadow-inner backdrop-blur-xl">
                       <Award className="w-4 h-4 text-emerald-400" /> تكليف رسمي بمهام المراقبة
                     </div>
                     <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 tracking-tight leading-tight drop-shadow-2xl">
                       أنتم <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-teal-200">صمام الأمان</span> وعماد المنظومة!
                     </h2>
                     <p className="text-slate-300 text-sm sm:text-lg font-bold leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0 opacity-90">
                       أستاذي الفاضل، ثقةً منا في حرصكم وعدالتكم، تم اختياركم لضمان نزاهة سير الاختبارات. يرجى التوقيع الإلكتروني بالاستلام أدناه، أو تقديم عذر رسمي للإدارة في حال وجود مانع ليتسنى لنا توفير البديل.
                     </p>
                     
                     <div className="flex flex-col gap-4 mb-6 w-full lg:w-3/4">
                        {invigilationDuties.map((duty, idx) => (
                          <div key={idx} className={`px-5 py-4 rounded-2xl border flex flex-col gap-4 shadow-inner backdrop-blur-md transition-all ${duty.status === 'excused' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'}`}>
                             <div className="flex items-center gap-4">
                                 <div className={`p-3 rounded-xl ${duty.status === 'excused' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                   <ShieldCheck className="w-6 h-6" />
                                 </div>
                                 <div className="text-right flex-1">
                                   <p className={`text-[10px] font-bold mb-1 uppercase tracking-widest ${duty.status === 'excused' ? 'text-rose-200/80' : 'text-emerald-200/80'}`}>اللجنة المخصصة لك:</p>
                                   <h3 className="text-lg sm:text-xl font-black text-white drop-shadow-md">{duty.exam_committees?.name}</h3>
                                 </div>
                             </div>
                             
                             <div className={`border-t pt-3 flex flex-wrap items-center gap-3 ${duty.status === 'excused' ? 'border-rose-500/20' : 'border-emerald-500/20'}`}>
                                {(!duty.status || duty.status === 'pending') && (
                                   <>
                                     <button onClick={() => signDuty(duty.id)} disabled={isProcessingDuty} className="flex-1 sm:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                                       <FileSignature className="w-4 h-4" /> توقيع إلكتروني بالاستلام
                                     </button>
                                     {/* 🚀 الزر الذي يفتح نافذة عذر المراقبة */}
                                     <button onClick={() => openDutyExcuseModal(duty.id)} disabled={isProcessingDuty} className="px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-black text-xs sm:text-sm rounded-xl transition-all border border-rose-500/30 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                                       <X className="w-4 h-4" /> لدي مانع (اعتذار)
                                     </button>
                                   </>
                                )}
                                {duty.status === 'signed' && (
                                   <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 w-full shadow-inner">
                                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                     تم توقيع العهدة إلكترونياً (في {safeFormat(duty.signed_at, 'd MMM - h:mm a')})
                                   </div>
                                )}
                                {duty.status === 'excused' && (
                                   <div className="px-4 py-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 w-full shadow-inner">
                                     <AlertTriangle className="w-5 h-5 text-rose-400" />
                                     تم رفع الاعتذار للإدارة (السبب: {duty.excuse_reason}) وهو قيد المراجعة.
                                   </div>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>

                     {finalExamsTimetable.length > 0 && (
                        <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-sm">
                           <p className="text-sm font-bold text-emerald-300 mb-4 flex items-center justify-center lg:justify-start gap-2"><CalendarDays className="w-4 h-4"/> جدول الامتحانات (أيام المراقبة):</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {finalExamsTimetable.map((ex, i) => (
                                 <div key={i} className="flex justify-between items-center bg-[#02040a]/60 px-4 py-3 rounded-xl border border-white/5">
                                    <span className="text-sm font-black text-white truncate max-w-[120px]" title={ex.subjects?.name}>{ex.subjects?.name}</span>
                                    <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2 py-1 rounded-md">{safeFormat(ex.exam_date, 'd MMM yyyy')}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="shrink-0 perspective-1000 hidden md:block">
                     <div className="w-[60mm] h-[95mm] border-[3px] border-slate-900 rounded-[1.5rem] relative overflow-hidden flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-white transform transition-all duration-700 hover:rotate-y-12 hover:scale-105 group/card">
                        <div className="absolute top-0 left-0 w-full h-[28mm] bg-slate-900 shrink-0 flex flex-col items-center justify-start pt-4 relative overflow-hidden">
                           <p className="text-white font-black text-[13px] mt-1 tracking-wide">مدرسة الرفعة النموذجية بنين</p>
                           <p className="text-emerald-400 font-bold text-[10px] mt-1 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 shadow-inner">هوية مراقب معتمد</p>
                        </div>
                        <div className="relative z-20 w-[24mm] h-[24mm] mt-[16mm] mb-2 rounded-xl bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center transform group-hover/card:scale-110 transition-transform duration-500">
                           {avatarUrl ? <img src={avatarUrl} crossOrigin="anonymous" alt="Teacher" className="w-full h-full object-cover" /> : <UserCheck className="w-10 h-10 text-slate-300" />}
                        </div>
                        <div className="relative z-10 w-full px-4 flex-1 flex flex-col items-center">
                           <h2 className="text-[16px] font-black text-slate-900 mb-1 leading-tight line-clamp-2">{teacherData?.users?.full_name || '...'}</h2>
                           <p className="text-[11px] font-bold text-slate-600 mb-2 border-b-2 border-slate-200 pb-2 w-full">إدارة التعليم الخاص</p>
                           <div className="mt-auto mb-4 flex flex-col items-center group-hover/card:-translate-y-1 transition-transform">
                              <div className="w-[20mm] h-[20mm] bg-white p-1 rounded-lg border-2 border-slate-800 mb-1 shadow-md"><img src={qrCodeUrlInvig} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain mix-blend-multiply" /></div>
                              <p className="text-[8px] font-black text-slate-400 mt-1">امسح الكود للتحقق</p>
                           </div>
                        </div>
                        <div className="w-full h-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 shrink-0"></div>
                     </div>
                  </div>

               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 نظام التنبيهات (Attendance Status) */}
        <AnimatePresence>
          {attendanceStatus.isActive && attendanceStatus.totalToday > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full">
              {attendanceStatus.missedPeriods.length > 0 ? (
                <div className="bg-[#131836]/60 backdrop-blur-xl border border-rose-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(244,63,94,0.3)] z-20">
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
                        {attendanceStatus.missedPeriods.map((p, idx) => (
                          <span key={idx} className="px-4 py-1.5 bg-[#02040a]/80 text-rose-400 font-black text-xs sm:text-sm rounded-xl shadow-sm border border-rose-500/30">الحصة {p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link href="/attendance" className="relative z-10 shrink-0 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-[1.5rem] shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all active:scale-95 w-full md:w-auto text-center border border-rose-500/50">
                    تسجيل الغياب الآن
                  </Link>
                </div>
              ) : attendanceStatus.completed ? (
                <div className="bg-[#131836]/60 backdrop-blur-xl border border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(16,185,129,0.2)] z-20 text-center sm:text-right">
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
                <div className="bg-[#131836]/60 backdrop-blur-md border border-blue-500/30 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg text-center sm:text-right">
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

        {/* 🚀 Teacher Welcome Hero */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0a0d1a] to-[#02040a] p-8 sm:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10">
          <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right w-full">
              <div className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-[#0f1423] backdrop-blur-md flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 group-hover:border-amber-500/50">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={teacherData?.users?.full_name || 'Avatar'} className="w-full h-full object-cover" />
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
                  مرحباً، أ. {teacherData?.users?.full_name || '...'} 👋
                </h1>
                <p className="text-slate-300 text-sm sm:text-lg font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-[#02040a]/60 w-fit px-4 py-2 rounded-2xl border border-white/5 mx-auto sm:mx-0 shadow-inner">
                  <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                  <span>لديك اليوم <strong className="text-amber-400 text-xl mx-1 drop-shadow-sm">{todaysSchedule.length}</strong> حصص و <strong className="text-amber-400 text-xl mx-1 drop-shadow-sm">{recentAssignments.length}</strong> واجبات.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center w-full md:w-auto shrink-0">
              <Link href="/attendance" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f1423]/80 backdrop-blur-md px-6 py-4 text-sm font-black text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95 shadow-lg w-full sm:w-auto">
                <UserCheck className="h-5 w-5 text-amber-400" /> رصد الحضور
              </Link>
              <Link href="/ai-assignments-v2" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:from-amber-400 hover:to-yellow-400 transition-all active:scale-95 border border-amber-300/50 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> بناء وتوزيع واجب
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 🚀 البانر السينمائي (مجالس الفصول - للمعلم) */}
        {sections.length > 0 && (
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(245,158,11,0.1)] border border-amber-500/30 backdrop-blur-xl bg-[#0f1423]/80">
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
                {sections.map((sec, idx) => (
                  <Link key={idx} href={`/messages?sectionId=${sec.id}`} className="snap-center group relative inline-flex flex-col items-center justify-center p-3 sm:p-4 bg-[#02040a]/60 hover:bg-[#0a0d16] text-white rounded-2xl shadow-inner border border-white/5 hover:border-amber-500/50 transition-all hover:-translate-y-1 shrink-0 min-w-[100px] z-10">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-amber-400 mb-2 transition-colors drop-shadow-sm" />
                    <span className="text-xs sm:text-sm font-black whitespace-nowrap">{sec.classes?.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 mt-0.5">{sec.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 🚀 نظام الإنذار المبكر للمعلم */}
        <AnimatePresence>
          {atRiskStudents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-xl p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(225,29,72,0.15)] border border-rose-500/30">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl animate-pulse pointer-events-none"></div>

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
                    <div key={idx} className="bg-[#02040a]/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shadow-inner">
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
                  <Link href="/dashboard/teacher/warnings" className={`group flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all border ${atRiskStudents.length > 4 ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] border-rose-500/50 active:scale-95' : 'bg-[#02040a] text-slate-300 hover:bg-white/10 border-white/10'}`}>
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
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className={`bg-[#131836]/60 backdrop-blur-md border border-white/5 p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-3 group`}>
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
            {/* Today's Schedule (Live Pulse) */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden border border-white/5">
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
                      const current = isCurrentClass(item.start_time, item.end_time);
                      const next = isNextClass(item.start_time);
                      
                      let isPast = false;
                      if (item.end_time && currentTime) {
                        const [endH, endM] = item.end_time.split(':').map(Number);
                        const endTime = new Date(currentTime);
                        endTime.setHours(endH, endM, 0, 0);
                        isPast = currentTime > endTime;
                      }
                      
                      return (
                        <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500",
                            current ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 scale-110 sm:scale-125 border-[#02040a] shadow-[0_0_20px_rgba(16,185,129,0.5)]" : 
                            isPast ? "bg-[#02040a]/40 text-slate-600 border-white/5 opacity-50" :
                            next ? "bg-[#0f1423] text-amber-400 border-amber-500/50" : "bg-[#02040a] text-slate-400 border-white/10"
                          )}>
                            {current ? <Play className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse ml-0.5 sm:ml-1" /> : isPast ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-sm sm:text-base font-black">{item.period}</span>}
                          </div>

                          <div className={cn(
                            "w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all duration-500 cursor-default backdrop-blur-md relative overflow-hidden",
                            current 
                              ? "bg-[#0f1423]/90 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02] ring-1 ring-emerald-500/30" 
                              : isPast 
                                ? "bg-[#02040a]/20 border-white/5 opacity-40 grayscale" 
                                : next 
                                  ? "bg-amber-500/5 border-amber-500/20 shadow-sm" 
                                  : "bg-[#02040a]/60 border-white/5 shadow-inner hover:border-white/10"
                          )}>
                            {current && (
                              <span className="absolute top-4 left-4 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></span>
                              </span>
                            )}

                            <div className={`absolute top-0 right-0 w-1 h-full ${
                              current ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' 
                              : isPast ? 'bg-slate-800' 
                              : next ? 'bg-amber-400' 
                              : 'bg-white/10'
                            }`}></div>

                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 pr-2">
                              <h3 className={cn("text-base sm:text-lg font-black transition-colors truncate", current ? "text-emerald-400 drop-shadow-sm" : next ? "text-amber-400" : isPast ? "text-slate-500" : "text-slate-300")}>
                                {item.subjects?.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && (
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold text-emerald-400 shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> تعمل الآن
                                  </span>
                                )}
                                {next && !current && <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] sm:text-[10px] font-bold shadow-inner">القادمة</span>}
                                {isPast && <span className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-500 border border-white/5 text-[9px] sm:text-[10px] font-bold shadow-inner flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> انتهت</span>}
                                <span className={cn("text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-[#02040a] text-emerald-400 border-emerald-500/20" : isPast ? "bg-transparent text-slate-600 border-slate-800" : "bg-white/5 text-slate-400 border-white/10")}>
                                  الحصة {item.period}
                               </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-3 pr-2">
                              <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", current ? "text-emerald-100" : isPast ? "text-slate-600" : "text-slate-400")}>
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                                <span className="truncate">{item.sections?.classes?.name} - {item.sections?.name}</span>
                              </p>
                              {item.start_time && item.end_time && (
                                <span className={cn("text-[9px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-emerald-400 border-emerald-500/20" : isPast ? "text-slate-600 border-slate-800" : "text-slate-500 border-white/5")} dir="ltr">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                  {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 sm:py-16 bg-[#02040a]/50 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 mb-3 sm:mb-4 border border-white/5 shadow-inner"><Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500" /></div>
                    <h3 className="text-lg sm:text-xl font-black text-white mb-2 drop-shadow-sm">لا توجد حصص اليوم</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم في النظام.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* My Sections */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl sm:rounded-2xl border border-blue-500/20 shadow-inner"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 drop-shadow-md" /></div> فصولي الدراسية
                </h2>
                <Link href="/classes" className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 bg-blue-500/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-blue-500/20 transition-colors shadow-sm border border-blue-500/20 w-full sm:w-auto active:scale-95">عرض الكل <ChevronLeft className="h-4 w-4" /></Link>
              </div>
              <div className="p-5 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 bg-transparent">
                {sections.length > 0 ? (
                  sections.map((section, idx) => (
                    <Link href={`/classes`} key={idx} className="block group">
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

          </div>

          <div className="space-y-6 lg:space-y-8 w-full">
            <AnnouncementsWidget authRole="teacher" />

            {/* 🔑 خزانة نماذج الإجابات للمعلم */}
            {answerKeys.length > 0 && (
                <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md border border-emerald-500/30 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                      <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner"><FileKey className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-sm" /></div> نماذج الإجابات
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5 bg-transparent p-3">
                      {answerKeys.map(keyObj => (
                          <a href={keyObj.file_url} target="_blank" rel="noreferrer" key={keyObj.id} className="flex items-center justify-between p-3 sm:p-4 rounded-[1rem] border border-white/5 hover:border-emerald-500/30 hover:bg-[#0f1423] transition-all mb-2 group shadow-inner">
                              <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors shrink-0">
                                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="min-w-0">
                                      <p className="font-black text-white text-xs sm:text-sm truncate drop-shadow-sm">{keyObj.title}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1 bg-[#02040a] px-2 py-0.5 rounded border border-white/5 inline-block">{keyObj.subjects?.name} • الصف {keyObj.class_level}</p>
                                  </div>
                              </div>
                          </a>
                      ))}
                  </div>
                </motion.div>
            )}

            {/* Recent Exams */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 drop-shadow-sm" /></div> الاختبارات الدورية
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentExams.length > 0 ? (
                  recentExams.map((exam, idx) => (
                    <div key={idx} className="p-5 sm:p-6 hover:bg-[#0f1423]/80 transition-colors group">
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
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" /></div> الواجبات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((assignment, idx) => (
                    <div key={idx} className="p-5 sm:p-6 hover:bg-[#0f1423]/80 transition-colors group">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-amber-400 transition-colors pr-2 border-r-2 border-transparent group-hover:border-amber-500 line-clamp-1 drop-shadow-sm">{assignment.title}</h3>
                        <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-[#02040a] text-amber-500 border border-amber-500/20 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {mounted ? format(new Date(assignment.due_date), 'd MMM', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mb-3 sm:mb-4 bg-[#02040a]/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-block border border-white/5 shadow-inner">
                        {assignment.subject_name} • {assignment.section_name || 'توزيع ذكي'}
                      </p>
                      <div className="flex gap-2 sm:gap-3">
                        <Link href="/arena-monitor" className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-950 bg-amber-50 rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-400 active:scale-95">التقييم والمتابعة</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-10 text-center text-slate-500 font-bold bg-[#02040a]/50 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm shadow-inner">لا توجد واجبات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-[#02040a]/40">
                <Link href="/arena-monitor" className="block w-full text-center text-xs sm:text-sm font-black text-amber-400 hover:text-white hover:bg-amber-500/20 border border-transparent hover:border-amber-500/30 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95">فتح رادار المتابعة والتصحيح</Link>
              </div>
            </motion.div>

            {/* Messages */}
            <motion.div variants={itemVariants} className="bg-[#131836]/60 backdrop-blur-md border border-white/5 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
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

      {/* 🚀 نافذة (Modal) تقديم عذر طبي غياب عادي */}
      <AnimatePresence>
        {isExcuseModalOpen && (
          <Dialog.Root open={isExcuseModalOpen} onOpenChange={setIsExcuseModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/90 backdrop-blur-md z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] w-[95%] max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white flex items-center gap-3"><Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" /> تقديم عذر طبي</Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2">يرجى تعبئة تفاصيل الغياب وإرفاق التقرير لاعتماده من الإدارة.</p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Dialog.Close>
                </div>

                <div className="space-y-6">
                  
                  {/* 🚀 اختيار التواريخ المتعددة للغياب */}
                  <div className="space-y-3 bg-[#090b14]/50 p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> أيام الغياب المراد تبريرها
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={currentDateInput} 
                        onChange={(e) => setCurrentDateInput(e.target.value)} 
                        className="flex-1 bg-[#131836] border border-white/10 rounded-xl p-3 text-xs sm:text-sm font-bold text-white outline-none focus:border-amber-500/50" 
                        style={{ colorScheme: 'dark' }} 
                      />
                      <button type="button" onClick={handleAddDate} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 rounded-xl px-4 py-3 font-black text-xs sm:text-sm transition-all shadow-sm active:scale-95">
                        إضافة
                      </button>
                    </div>

                    {excuseForm.absent_dates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                        {excuseForm.absent_dates.map(date => (
                          <div key={date} className="flex items-center gap-2 bg-[#02040a]/80 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-200" dir="ltr">{date}</span>
                            <button type="button" onClick={() => handleRemoveDate(date)} className="text-rose-400 hover:text-rose-300">
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">نوع الدوام</label>
                    <select value={excuseForm.duration_type} onChange={(e) => setExcuseForm({...excuseForm, duration_type: e.target.value, target_periods: []})} className="w-full bg-[#090b14] border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm font-bold text-white outline-none focus:border-amber-500/50 appearance-none [&>option]:bg-[#131836]">
                      <option value="full_day">غياب يوم كامل (لكل الأيام المحددة)</option>
                      <option value="partial_day">غياب جزئي (استئذان حصص)</option>
                    </select>
                  </div>

                  {/* اختيار الحصص (يظهر فقط إذا كان الغياب جزئياً) */}
                  <AnimatePresence>
                    {excuseForm.duration_type === 'partial_day' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> حدد الحصص التي غبت عنها</label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                              <button 
                                key={p} type="button" onClick={() => togglePeriod(p)}
                                className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all border", excuseForm.target_periods.includes(p) ? "bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-[#090b14] text-slate-400 border-white/10 hover:border-amber-500/50")}
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
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">إرفاق التقرير الطبي (صورة)</label>
                    <label className={cn("relative flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all", isUploadingReport ? "border-amber-500/50 bg-amber-500/5" : excuseForm.attachment_url ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-[#090b14] hover:border-amber-500/30 hover:bg-white/5")}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleReportUpload} disabled={isUploadingReport} />
                      {isUploadingReport ? (
                        <div className="flex flex-col items-center gap-2 text-amber-400"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /><span className="text-[10px] sm:text-xs font-black">جاري الرفع السحابي...</span></div>
                      ) : excuseForm.attachment_url ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-400"><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-black text-center">تم إرفاق التقرير بنجاح (انقر لتغييره)</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500"><UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-bold text-center">اضغط هنا لاختيار صورة التقرير</span></div>
                      )}
                    </label>
                  </div>

                  {/* تفاصيل إضافية */}
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">ملاحظات للإدارة (اختياري)</label>
                    <textarea 
                      value={excuseForm.reason} onChange={(e) => setExcuseForm({...excuseForm, reason: e.target.value})}
                      placeholder="اكتب أي تفاصيل إضافية هنا..." 
                      className="w-full bg-[#090b14] border border-white/10 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-bold text-white outline-none focus:border-amber-500/50 h-20 sm:h-24 resize-none custom-scrollbar"
                    />
                  </div>

                </div>

                <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={handleSubmitExcuse} disabled={isSubmittingExcuse} className="flex-1 py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-slate-900 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95">
                    {isSubmittingExcuse && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />} إرسال الطلب
                  </button>
                  <button onClick={() => setIsExcuseModalOpen(false)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 text-sm sm:text-base active:scale-95">إلغاء</button>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة (Modal) تقديم اعتذار عن مهمة المراقبة */}
      <AnimatePresence>
        {isDutyExcuseModalOpen && (
          <Dialog.Root open={isDutyExcuseModalOpen} onOpenChange={setIsDutyExcuseModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/90 backdrop-blur-md z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] w-[95%] max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" /> تقديم اعتذار رسمي
                    </Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2">يرجى توضيح سبب الاعتذار عن لجنة المراقبة ليتم مراجعته من الإدارة.</p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90" onClick={() => setIsDutyExcuseModalOpen(false)}>
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Dialog.Close>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">سبب الاعتذار المباشر</label>
                    <textarea 
                      value={dutyExcuseText} onChange={(e) => setDutyExcuseText(e.target.value)}
                      placeholder="أرجو إعفائي من المراقبة للأسباب التالية..." 
                      className="w-full bg-[#090b14] border border-white/10 rounded-xl p-4 text-xs sm:text-sm font-bold text-white outline-none focus:border-rose-500/50 h-32 resize-none custom-scrollbar shadow-inner"
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={submitDutyExcuse} disabled={isProcessingDuty} className="flex-1 py-3.5 sm:py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95">
                    {isProcessingDuty ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : 'رفع الاعتذار'}
                  </button>
                  <button onClick={() => setIsDutyExcuseModalOpen(false)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 text-sm sm:text-base active:scale-95">إلغاء</button>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </motion.div>
  );
}
