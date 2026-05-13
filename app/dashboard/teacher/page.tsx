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
  ShieldCheck, MapPin, FileKey, CalendarDays, Download, Fingerprint, Crown, Key, FileSignature, X, Stethoscope, UploadCloud
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
import DigitalLibraryWidget from '@/components/DigitalLibraryWidget';

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

  // حالات المنظومة الامتحانية
  const [invigilationDuties, setInvigilationDuties] = useState<any[]>([]);
  const [headDuties, setHeadDuties] = useState<any[]>([]);
  const [controlTeamRole, setControlTeamRole] = useState<any>(null);
  const [finalExamsTimetable, setFinalExamsTimetable] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);

  // حالات الاعتذار
  const [isDutyExcuseModalOpen, setIsDutyExcuseModalOpen] = useState(false);
  const [selectedDutyId, setSelectedDutyId] = useState('');
  const [dutyExcuseText, setDutyExcuseText] = useState('');
  const [isProcessingDuty, setIsProcessingDuty] = useState(false);

  // حالات الاعتذار الطبي
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
  
  // 🛡️ قفل الجلب لمنع الحلقة المفرغة (Infinite Loop)
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

  // 🛡️ هندسة جلب البيانات الجديدة المنيعة
  useEffect(() => {
    if (isChecking || !user || isFetchedRef.current) return;
    if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') return;

    const loadDashboardData = async () => {
      // نغلق القفل فوراً ولا نعيد فتحه أبداً لتجنب أي تكرار لا نهائي
      isFetchedRef.current = true;
      
      try {
        setLoading(true);
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
              // جلب الغيابات المنذرة
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

              // جلب المنظومة الامتحانية
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

              // حالة تسجيل الحضور
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
      } catch (error) { 
        console.error('Error fetching dashboard data:', error); 
      } finally { 
        if (mounted) setLoading(false); 
      }
    };

    loadDashboardData();
  }, [isChecking, user, authRole, mounted]); 

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
      window.location.reload(); // تحديث الصفحة لرؤية الحالة الجديدة
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
      <div className="flex h-[100dvh] items-center justify-center bg-transparent">
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
      <div className="flex h-[100dvh] items-center justify-center bg-transparent p-4">
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
      <div className="flex h-[100dvh] items-center justify-center bg-transparent relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد مركبة القيادة...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = teacherData?.users?.avatar_url;
  const qrPayloadControl = `raf-control:${user?.id}`;
  const qrCodeUrlControl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayloadControl)}&margin=0`;
  const qrPayloadInvig = `raf-id:${user?.id}`;
  const qrCodeUrlInvig = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayloadInvig)}&margin=0`;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-[100dvh] relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-sans pt-2 sm:pt-6" dir="rtl">
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {teacherData?.id && (
           <MemorialShieldDisplay userId={teacherData.id} role="teacher" />
        )}

        {/* هرم القيادة: 1. بانر أعضاء الكنترول */}
        <AnimatePresence>
          {controlTeamRole && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 md:p-10 border-purple-500/30 group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between text-center md:text-right">
                  <div className="flex items-center justify-center w-20 h-20 bg-purple-500/10 backdrop-blur-md rounded-3xl border border-purple-400/30 shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-500">
                     <Key className="w-10 h-10 text-purple-300 drop-shadow-md" />
                  </div>
                  <div className="flex-1">
                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 backdrop-blur-sm border border-purple-500/20 text-purple-300 text-xs font-black mb-4 uppercase tracking-widest shadow-inner">
                       <ShieldCheck className="w-4 h-4" /> القيادة العليا للامتحانات
                     </div>
                     <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 drop-shadow-lg">أهلاً بك في <span className="text-purple-400">الكنترول المركزي</span></h2>
                     <p className="text-purple-100/80 font-bold text-sm sm:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed">
                       أنتم العقل المدبر خلف الكواليس، حراس النزاهة وأمناء السر. لقد تم اعتماد صفتكم كـ <span className="font-black text-white bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">{controlTeamRole.role_name}</span>.
                     </p>
                  </div>
                  <div className="relative z-10 mt-6 md:mt-8 flex justify-center md:justify-start">
                     <Link href="/admin/exam-pipeline" className="px-8 py-4 bg-purple-600/80 backdrop-blur-md hover:bg-purple-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center gap-2 transition-all active:scale-95 border border-purple-400/50 w-full sm:w-auto text-center justify-center">
                        الدخول لغرفة الكنترول <ArrowUpRight className="w-5 h-5" />
                     </Link>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* هرم القيادة: 2. بانر رؤساء اللجان */}
        <AnimatePresence>
          {headDuties.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, type: 'spring' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 md:p-10 border-amber-500/30 group">
               <div className="absolute top-0 left-0 w-[60vw] h-[60vw] bg-amber-500/10 blur-[100px] pointer-events-none rounded-full transition-transform duration-1000 group-hover:scale-110 mix-blend-screen"></div>
               <div className="relative z-10 flex flex-col items-center text-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                     <div className="p-4 bg-amber-500/10 backdrop-blur-md rounded-3xl border border-amber-400/30 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Crown className="w-10 h-10 text-amber-400 drop-shadow-md" />
                     </div>
                     <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">القيادة الميدانية: <span className="text-amber-400">رئيس لجان الامتحانات</span></h2>
                     <p className="text-slate-200 text-sm sm:text-lg font-bold leading-relaxed max-w-3xl opacity-90 drop-shadow-sm">
                       أستاذي الكريم، القيادة الميدانية تتطلب حكمة وحزماً، وقد تم تكليفكم بناءً على كفاءتكم للإشراف وإدارة سير الامتحانات في النطاقات التالية.
                     </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-4">
                     {headDuties.map((duty, idx) => (
                        <div key={idx} className="bg-[#02040a]/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-inner flex flex-col gap-4 text-right hover:border-amber-400/40 hover:bg-[#0f1423]/60 transition-all">
                           <div className="flex justify-between items-start border-b border-white/5 pb-4">
                              <span className="text-[11px] font-black bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/20 shadow-inner"><CalendarDays className="w-3.5 h-3.5 inline mr-1" /> {safeFormat(duty.exam_timetables?.exam_date, 'd MMMM yyyy')}</span>
                              <span className="text-[10px] font-black bg-[#02040a]/80 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">الصف {duty.exam_timetables?.class_level}</span>
                           </div>
                           <h3 className="text-xl font-black text-white drop-shadow-sm truncate">{duty.exam_timetables?.subjects?.name}</h3>
                           <p className="text-sm font-bold text-amber-200/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 mt-auto leading-relaxed shadow-inner">
                              📍 إشراف على: <span className="text-amber-400 font-black">{duty.committees_range}</span>
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* هرم القيادة: 3. بانر تكليف المراقبة */}
        <AnimatePresence>
          {invigilationDuties.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, type: 'spring' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 md:p-10 border-emerald-500/30 group">
               <div className="absolute top-[-50%] left-[-10%] w-[100vw] h-[100vw] sm:w-[60vw] sm:h-[60vw] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none transition-transform duration-1000 group-hover:scale-110 mix-blend-screen"></div>
               
               <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex-1 text-center lg:text-right">
                     <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-black mb-6 shadow-inner backdrop-blur-xl">
                       <Award className="w-4 h-4 text-emerald-400" /> تكليف رسمي بمهام المراقبة
                     </div>
                     <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 tracking-tight leading-tight drop-shadow-xl">
                       أنتم <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-teal-200">صمام الأمان</span> وعماد المنظومة!
                     </h2>
                     <p className="text-slate-200 text-sm sm:text-lg font-bold leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0 opacity-90 drop-shadow-sm">
                       أستاذي الفاضل، ثقةً منا في حرصكم وعدالتكم، تم اختياركم لضمان نزاهة سير الاختبارات. يرجى التوقيع الإلكتروني بالاستلام أدناه.
                     </p>
                     
                     <div className="flex flex-col gap-4 mb-6 w-full lg:w-3/4">
                        {invigilationDuties.map((duty, idx) => (
                          <div key={idx} className={`px-5 py-4 rounded-2xl flex flex-col gap-4 shadow-inner backdrop-blur-md transition-all ${duty.status === 'excused' ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10'}`}>
                             <div className="flex items-center gap-4">
                                 <div className={`p-3 rounded-xl border ${duty.status === 'excused' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                   <ShieldCheck className="w-6 h-6" />
                                 </div>
                                 <div className="text-right flex-1">
                                   <p className={`text-[10px] font-bold mb-1 uppercase tracking-widest ${duty.status === 'excused' ? 'text-rose-300/80' : 'text-emerald-300/80'}`}>اللجنة المخصصة لك:</p>
                                   <h3 className="text-lg sm:text-xl font-black text-white drop-shadow-md">{duty.exam_committees?.name}</h3>
                                 </div>
                             </div>
                             
                             <div className={`border-t pt-3 flex flex-wrap items-center gap-3 ${duty.status === 'excused' ? 'border-rose-500/10' : 'border-emerald-500/10'}`}>
                                {(!duty.status || duty.status === 'pending') && (
                                   <>
                                     <button onClick={() => signDuty(duty.id)} disabled={isProcessingDuty} className="flex-1 sm:flex-none px-5 py-3 bg-emerald-500/80 hover:bg-emerald-500 backdrop-blur-md text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50 border border-emerald-400/50">
                                       <FileSignature className="w-4 h-4" /> توقيع إلكتروني بالاستلام
                                     </button>
                                     <button onClick={() => openDutyExcuseModal(duty.id)} disabled={isProcessingDuty} className="px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-black text-xs sm:text-sm rounded-xl transition-all border border-rose-500/30 flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                                       <X className="w-4 h-4" /> لدي مانع
                                     </button>
                                   </>
                                )}
                                {duty.status === 'signed' && (
                                   <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 w-full shadow-inner">
                                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                     تم توقيع العهدة إلكترونياً (في {safeFormat(duty.signed_at, 'd MMM - h:mm a')})
                                   </div>
                                )}
                                {duty.status === 'excused' && (
                                   <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 w-full shadow-inner">
                                     <AlertTriangle className="w-5 h-5 text-rose-400" />
                                     تم رفع الاعتذار للإدارة وهو قيد المراجعة.
                                   </div>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>

                     {finalExamsTimetable.length > 0 && (
                        <div className="w-full max-w-2xl bg-[#02040a]/40 border border-white/5 rounded-2xl p-5 shadow-inner backdrop-blur-md">
                           <p className="text-sm font-bold text-emerald-300 mb-4 flex items-center justify-center lg:justify-start gap-2"><CalendarDays className="w-4 h-4"/> جدول الامتحانات (أيام المراقبة):</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {finalExamsTimetable.map((ex, i) => (
                                 <div key={i} className="flex justify-between items-center bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-inner">
                                    <span className="text-sm font-black text-white truncate max-w-[120px]" title={ex.subjects?.name}>{ex.subjects?.name}</span>
                                    <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">{safeFormat(ex.exam_date, 'd MMM yyyy')}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* نظام التنبيهات الزجاجي (Attendance Status) */}
        <AnimatePresence>
          {attendanceStatus.isActive && attendanceStatus.totalToday > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full">
              {attendanceStatus.missedPeriods.length > 0 ? (
                <div className="glass-panel border-rose-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(244,63,94,0.2)] z-20">
                  <div className="absolute top-0 left-0 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full pointer-events-none mix-blend-screen"></div>
                  <div className="flex items-start gap-5 relative z-10 w-full md:w-auto">
                    <div className="p-4 bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-2xl shadow-inner animate-[pulse_2s_ease-in-out_infinite] shrink-0">
                      <AlertTriangle className="h-8 w-8 text-rose-400 drop-shadow-md" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight drop-shadow-sm">تنبيه إداري: سجلات غياب غير مكتملة!</h3>
                      <p className="text-sm font-bold text-slate-300 mb-4 leading-relaxed">
                        أستاذي الكريم، لقد انتهى وقت الحصص التالية ولم تقم بتسجيل غياب الطلاب لها حتى الآن:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attendanceStatus.missedPeriods.map((p, idx) => (
                          <span key={idx} className="px-4 py-1.5 bg-[#02040a]/80 text-rose-400 font-black text-xs sm:text-sm rounded-xl shadow-inner border border-rose-500/20">الحصة {p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Link href="/attendance" className="relative z-10 shrink-0 px-8 py-4 bg-rose-600/80 backdrop-blur-md hover:bg-rose-500 text-white font-black text-sm rounded-[1.5rem] shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all active:scale-95 w-full md:w-auto text-center border border-rose-500/40">
                    تسجيل الغياب الآن
                  </Link>
                </div>
              ) : attendanceStatus.completed ? (
                <div className="glass-panel border-emerald-500/30 p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(16,185,129,0.1)] z-20 text-center sm:text-right">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none mix-blend-screen"></div>
                  <div className="p-4 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl shadow-inner shrink-0 relative z-10">
                    <HeartHandshake className="h-8 w-8 text-emerald-400 drop-shadow-md" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight drop-shadow-sm">شكراً لتعاونك وإخلاصك!</h3>
                    <p className="text-sm font-bold text-slate-300 leading-relaxed">
                      لقد قمت بتسجيل الغياب لجميع حصصك المجدولة اليوم (<strong className="text-emerald-400">{attendanceStatus.totalToday} حصص</strong>) بنجاح.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="glass-panel border-blue-500/20 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg text-center sm:text-right">
                   <div className="p-3 bg-blue-500/10 backdrop-blur-md rounded-xl shadow-inner border border-blue-500/20 shrink-0"><Clock className="h-6 w-6 text-blue-400 drop-shadow-sm" /></div>
                   <div>
                     <h4 className="text-base font-black text-white mb-1 drop-shadow-sm">جدولك اليوم: {attendanceStatus.totalToday} حصص</h4>
                     <p className="text-sm font-bold text-slate-400 leading-relaxed">النظام يراقب أوقات الحصص المعتمدة وسيقوم بتذكيرك آلياً بتسجيل الغياب فور انتهاء كل حصة.</p>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 Teacher Welcome Hero (Holographic Card) */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] glass-panel p-8 sm:p-12 text-white border-amber-500/20 group">
          <div className="absolute inset-0 bg-amber-500/5 blur-[100px] pointer-events-none mix-blend-screen transition-opacity group-hover:opacity-100 opacity-50"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right w-full">
              <div className="relative shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-[0_0_30px_rgba(245,158,11,0.1)] bg-[#0f1423]/50 backdrop-blur-xl flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:border-amber-500/30">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={teacherData?.users?.full_name || 'Avatar'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-amber-400 drop-shadow-md">{teacherData?.users?.full_name?.charAt(0) || 'م'}</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-amber-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 mix-blend-screen"></div>
              </div>

              <div className="pt-2 w-full">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-xs font-black uppercase tracking-widest mb-3 shadow-inner text-amber-400">
                  <Star className="w-3.5 h-3.5 drop-shadow-sm" /> <span>لوحة القيادة الميدانية</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight drop-shadow-xl text-white">
                  مرحباً، أ. {teacherData?.users?.full_name || '...'} 👋
                </h1>
                <p className="text-slate-200 text-sm sm:text-lg font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 bg-[#02040a]/40 backdrop-blur-md w-fit px-4 py-2 rounded-2xl border border-white/5 mx-auto sm:mx-0 shadow-inner">
                  <Clock className="h-5 w-5 text-amber-400 shrink-0 drop-shadow-sm" />
                  <span>لديك اليوم <strong className="text-amber-400 text-xl mx-1 drop-shadow-md">{todaysSchedule.length}</strong> حصص و <strong className="text-amber-400 text-xl mx-1 drop-shadow-md">{recentAssignments.length}</strong> واجبات نشطة.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center w-full md:w-auto shrink-0">
              <Link href="/attendance" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md px-6 py-4 text-sm font-black text-white hover:bg-white/10 transition-all border border-white/10 active:scale-95 shadow-inner w-full sm:w-auto">
                <UserCheck className="h-5 w-5 text-amber-400 drop-shadow-sm" /> رصد الحضور
              </Link>
              {/* 🚀 الزر الذي يعتمد النظام الكلاسيكي (بدون ذكاء اصطناعي) */}
              <Link href="/assignments" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/80 to-yellow-500/80 backdrop-blur-md px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-yellow-500 transition-all active:scale-95 border border-amber-400/50 w-full sm:w-auto">
                <BookOpen className="h-5 w-5" /> إدارة الواجبات
              </Link>
            </div>
          </div>
        </motion.div>

        {/* نظام الإنذار المبكر للمعلم (زجاجي) */}
        <AnimatePresence>
          {atRiskStudents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] glass-panel p-6 sm:p-8 border-rose-500/20">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl animate-pulse pointer-events-none mix-blend-screen"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 mb-6 sm:mb-8 text-center lg:text-right">
                <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
                  <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-rose-500/10 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-rose-500/20 shadow-inner shrink-0">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 animate-bounce drop-shadow-md" />
                  </div>
                  <div>
                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 backdrop-blur-sm text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-rose-500/20 text-rose-400 shadow-inner">
                      <ShieldAlert className="w-3.5 h-3.5" /> إنذار سلوك ومواظبة
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-white leading-tight drop-shadow-sm">تنبيه: {atRiskStudents.length} طلاب تجاوزوا حد الغياب!</h2>
                    <p className="text-slate-300 text-xs sm:text-sm font-bold leading-relaxed max-w-xl mx-auto lg:mx-0 opacity-90">حسب لائحة السلوك والمواظبة، هؤلاء الطلاب تجاوزوا (5 حصص غياب) في حصصك. يرجى الانتباه ورفع التقرير للإدارة.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                 {atRiskStudents.slice(0, 4).map((student, idx) => (
                    <div key={idx} className="bg-[#02040a]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-rose-500/30 hover:bg-rose-500/5 transition-all shadow-inner">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 font-black text-sm border border-rose-500/20 shrink-0 shadow-inner">{student.name.charAt(0)}</div>
                         <div className="min-w-0 pr-1">
                            <p className="font-black text-white text-sm truncate group-hover:text-rose-400 transition-colors drop-shadow-sm">{student.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{student.className}</p>
                         </div>
                       </div>
                       <div className="text-center shrink-0 ml-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 group-hover:bg-rose-500/10 group-hover:border-rose-500/20 transition-colors shadow-inner">
                          <span className="block text-xl font-black text-rose-400 leading-none drop-shadow-sm">{student.count}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">حصص</span>
                       </div>
                    </div>
                 ))}
              </div>

              {atRiskStudents.length > 0 && (
                <div className="relative z-10 mt-6 flex justify-center lg:justify-end border-t border-white/5 pt-6">
                  <Link href="/dashboard/teacher/warnings" className={`group flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all border shadow-inner backdrop-blur-md ${atRiskStudents.length > 4 ? 'bg-rose-600/80 text-white hover:bg-rose-500 border-rose-500/40 active:scale-95' : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'}`}>
                    <span>{atRiskStudents.length > 4 ? `عرض كل الطلاب المنذرين (${atRiskStudents.length})` : 'إدارة الإنذارات وتصدير التقرير'}</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid (Holographic Orbs) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {[
            { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'متوسط الحضور', value: `${stats.avgAttendance || 100}%`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'معدل الغياب', value: `${stats.absenceRate || 0}%`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className={`glass-panel p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2.rem] flex flex-col justify-center items-center text-center gap-3 group relative overflow-hidden`}>
              <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg.split(' ')[0]} blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none mix-blend-screen`}></div>
              <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl ${stat.bg} backdrop-blur-md border ${stat.border} flex items-center justify-center ${stat.color} relative z-10 group-hover:scale-110 transition-transform shadow-inner`}>
                <stat.icon className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-md" />
              </div>
              <div className="relative z-10">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-none mb-1 sm:mb-2 drop-shadow-lg">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest opacity-80">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Grids (Gemini Rebalance) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8 w-full">
            
            <motion.div variants={itemVariants}>
              <DigitalLibraryWidget userRole="teacher" />
            </motion.div>

            {/* Today's Schedule (Live Pulse) */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden p-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none mix-blend-screen"></div>
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-transparent relative z-10 gap-4 text-center sm:text-right">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-md">
                  <div className="p-2.5 bg-amber-500/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
                  </div>
                  جدول حصص اليوم
                </h2>
                <span className="text-xs sm:text-sm font-bold px-4 py-2 sm:py-2.5 bg-white/5 backdrop-blur-md text-amber-300 rounded-xl sm:rounded-2xl border border-white/10 shadow-inner flex items-center justify-center gap-2">
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
                            "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500 backdrop-blur-md",
                            current ? "bg-gradient-to-br from-emerald-400/90 to-emerald-600/90 text-slate-950 scale-110 sm:scale-125 border-[#02040a] shadow-[0_0_20px_rgba(16,185,129,0.5)]" : 
                            isPast ? "bg-[#02040a]/40 text-slate-500 border-white/5 opacity-50" :
                            next ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-[#02040a]/80 text-slate-400 border-white/10"
                          )}>
                            {current ? <Play className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse ml-0.5 sm:ml-1" /> : isPast ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-sm sm:text-base font-black">{item.period}</span>}
                          </div>

                          <div className={cn(
                            "w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all duration-500 cursor-default backdrop-blur-md relative overflow-hidden shadow-inner",
                            current 
                              ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02] ring-1 ring-emerald-500/20" 
                              : isPast 
                                ? "bg-[#02040a]/20 border-white/5 opacity-60 grayscale" 
                                : next 
                                  ? "bg-amber-500/5 border-amber-500/20" 
                                  : "bg-[#02040a]/40 border-white/5 hover:border-white/10 hover:bg-[#02040a]/60"
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
                              <h3 className={cn("text-base sm:text-lg font-black transition-colors truncate drop-shadow-md", current ? "text-emerald-400" : next ? "text-amber-400" : isPast ? "text-slate-500" : "text-white")}>
                                {item.subjects?.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && (
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold text-emerald-300 shadow-inner">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> تعمل الآن
                                  </span>
                                )}
                                {next && !current && <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] sm:text-[10px] font-bold shadow-inner">القادمة</span>}
                                {isPast && <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5 text-[9px] sm:text-[10px] font-bold shadow-inner flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> انتهت</span>}
                                <span className={cn("text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" : isPast ? "bg-transparent text-slate-500 border-slate-800" : "bg-white/5 text-slate-300 border-white/10")}>
                                  الحصة {item.period}
                               </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-3 pr-2">
                              <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", current ? "text-emerald-200" : isPast ? "text-slate-500" : "text-slate-300")}>
                                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                                <span className="truncate">{item.sections?.classes?.name} - {item.sections?.name}</span>
                              </p>
                              {item.start_time && item.end_time && (
                                <span className={cn("text-[9px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/60 backdrop-blur-sm px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-emerald-300 border-emerald-500/20" : isPast ? "text-slate-600 border-slate-800" : "text-slate-400 border-white/5")} dir="ltr">
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
                  <div className="text-center py-12 sm:py-16 bg-[#02040a]/30 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner px-4 backdrop-blur-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 mb-3 sm:mb-4 border border-white/5 shadow-inner"><Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500" /></div>
                    <h3 className="text-lg sm:text-xl font-black text-white mb-2 drop-shadow-sm">لا توجد حصص اليوم</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم في النظام.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Exams */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden p-0">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                  <div className="p-2 bg-indigo-500/10 backdrop-blur-md rounded-xl border border-indigo-500/20 shadow-inner"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400 drop-shadow-sm" /></div> الاختبارات الدورية
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentExams.length > 0 ? (
                  recentExams.map((exam, idx) => (
                    <div key={idx} className="p-5 sm:p-6 hover:bg-white/5 transition-colors group">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-indigo-300 transition-colors pr-2 border-r-2 border-transparent group-hover:border-indigo-400 line-clamp-1 drop-shadow-sm">{exam.title}</h3>
                        <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-[#02040a]/60 backdrop-blur-sm text-slate-300 border border-white/10 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" /> {exam.start_time ? format(new Date(`2000-01-01T${exam.start_time}`), 'hh:mm a', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-300 mb-3 sm:mb-4 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-block border border-white/5 shadow-inner">
                        {exam.subject_name} • {exam.section_name}
                      </p>
                      <div className="flex gap-2 sm:gap-3">
                        <Link href={`/exams/builder/${exam.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-200 bg-white/5 border border-white/10 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 transition-all shadow-inner active:scale-95">تعديل</Link>
                        <Link href={`/exams/results/${exam.id}`} className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-900 bg-indigo-500/90 backdrop-blur-md rounded-xl hover:bg-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400 active:scale-95">النتائج</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-10 text-center text-slate-400 font-bold bg-[#02040a]/30 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm shadow-inner backdrop-blur-sm">لا توجد اختبارات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-transparent">
                <Link href="/exams" className="block w-full text-center text-xs sm:text-sm font-black text-indigo-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95 shadow-inner">عرض كل الاختبارات</Link>
              </div>
            </motion.div>

          </div>

          {/* 🚀 العمود الأيسر (5/12) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8 w-full">
            
            <motion.div variants={itemVariants}>
               <AnnouncementsWidget authRole="teacher" />
            </motion.div>

            {/* Recent Assignments */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden p-0">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                  <div className="p-2 bg-amber-500/10 backdrop-blur-md rounded-xl border border-amber-500/20 shadow-inner"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" /></div> الواجبات الأخيرة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {recentAssignments.length > 0 ? (
                  recentAssignments.map((assignment, idx) => (
                    <div key={idx} className="p-5 sm:p-6 hover:bg-white/5 transition-colors group">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <h3 className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-amber-300 transition-colors pr-2 border-r-2 border-transparent group-hover:border-amber-400 line-clamp-1 drop-shadow-sm">{assignment.title}</h3>
                        <span className="text-[9px] sm:text-[10px] font-black px-2 py-1 bg-[#02040a]/60 backdrop-blur-sm text-amber-400 border border-white/10 rounded-lg shadow-inner whitespace-nowrap ml-2 flex items-center gap-1 shrink-0">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {mounted ? format(new Date(assignment.due_date), 'd MMM', { locale: arSA }) : '...'}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-300 mb-3 sm:mb-4 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg inline-block border border-white/5 shadow-inner">
                        {assignment.subject_name} • {assignment.section_name || 'توزيع ذكي'}
                      </p>
                      <div className="flex gap-2 sm:gap-3">
                        <Link href="/arena-monitor" className="flex-1 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-slate-900 bg-amber-400/90 backdrop-blur-md rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-300 active:scale-95">التقييم والمتابعة</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 sm:p-10 text-center text-slate-400 font-bold bg-[#02040a]/30 m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 text-xs sm:text-sm shadow-inner backdrop-blur-sm">لا توجد واجبات حالياً</div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-transparent">
                <Link href="/arena-monitor" className="block w-full text-center text-xs sm:text-sm font-black text-amber-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95 shadow-inner">فتح رادار المتابعة</Link>
              </div>
            </motion.div>

            {/* 🔑 خزانة نماذج الإجابات */}
            {answerKeys.length > 0 && (
                <motion.div variants={itemVariants} className="glass-panel border-emerald-500/30 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)] p-0">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none mix-blend-screen"></div>
                  <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right">
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                      <div className="p-2 bg-emerald-500/10 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-inner"><FileKey className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-sm" /></div> نماذج الإجابات
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5 bg-transparent p-3">
                      {answerKeys.map(keyObj => (
                          <a href={keyObj.file_url} target="_blank" rel="noreferrer" key={keyObj.id} className="flex items-center justify-between p-3 sm:p-4 rounded-[1.5rem] border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all mb-2 group shadow-inner">
                              <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 bg-emerald-500/10 backdrop-blur-md text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/80 group-hover:text-slate-900 transition-colors shrink-0">
                                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="min-w-0">
                                      <p className="font-black text-white text-xs sm:text-sm truncate drop-shadow-sm">{keyObj.title}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-300 mt-1 bg-[#02040a]/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/5 inline-block">{keyObj.subjects?.name} • الصف {keyObj.class_level}</p>
                                  </div>
                              </div>
                          </a>
                      ))}
                  </div>
                </motion.div>
            )}

            {/* Messages */}
            <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden p-0">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                  <div className="p-2 bg-emerald-500/10 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-inner"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-sm" /></div> صندوق الرسائل
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent">
                {messages.length > 0 ? (
                  messages.map((msg, i) => {
                    const isUnread = !msg.is_read;
                    return (
                      <Link href={`/messages?id=${msg.id}`} key={i} className={`flex gap-3 sm:gap-4 p-4 sm:p-6 transition-all group relative ${isUnread ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-l-4 border-l-indigo-400' : 'hover:bg-white/5 border-l-4 border-l-transparent'}`}>
                        {isUnread && <div className="absolute top-1/2 right-2 sm:right-3 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-400 transform -translate-y-1/2 shadow-[0_0_10px_rgba(129,140,248,0.8)] animate-pulse"></div>}
                        
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#02040a]/60 backdrop-blur-md border border-white/10 flex-shrink-0 flex items-center justify-center font-black text-base sm:text-lg text-emerald-400 shadow-inner group-hover:scale-110 transition-transform overflow-hidden relative z-10">
                          {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} alt={msg.sender.full_name} className="w-full h-full object-cover" />
                          ) : (
                            msg.sender?.full_name?.charAt(0) || 'م'
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className={`text-xs sm:text-sm truncate transition-colors ${isUnread ? 'font-black text-white group-hover:text-indigo-300 drop-shadow-sm' : 'font-bold text-slate-200 group-hover:text-emerald-300'}`}>{msg.sender?.full_name}</p>
                            <p className={`text-[9px] sm:text-[10px] whitespace-nowrap mr-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border ${isUnread ? 'bg-indigo-500/20 text-indigo-300 font-black border-indigo-500/30' : 'bg-[#02040a]/60 backdrop-blur-sm text-slate-400 font-bold border-white/5 shadow-inner'}`}>{mounted ? format(new Date(msg.created_at), 'd MMM', { locale: arSA }) : '...'}</p>
                          </div>
                          <p className={`text-[10px] sm:text-xs truncate mb-1 ${isUnread ? 'text-indigo-300 font-black drop-shadow-sm' : 'text-emerald-400/80 font-bold'}`}>{msg.subject}</p>
                          <p className={`text-[10px] sm:text-xs truncate leading-relaxed ${isUnread ? 'text-slate-100 font-medium' : 'text-slate-400 font-medium'}`}>{msg.content}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-8 sm:p-12 text-center text-slate-400 text-xs sm:text-sm flex flex-col items-center bg-[#02040a]/30 backdrop-blur-sm m-4 rounded-[1.5rem] sm:rounded-2xl border border-dashed border-white/10 shadow-inner">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/5 flex items-center justify-center mb-2 sm:mb-3 border border-white/5 shadow-inner"><CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 text-slate-600" /></div>
                    <span className="font-bold">صندوق الوارد فارغ</span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/5 bg-transparent">
                <Link href="/messages" className="block w-full text-center text-xs sm:text-sm font-black text-emerald-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 py-2.5 sm:py-3 rounded-xl transition-all active:scale-95 shadow-inner">فتح صندوق الرسائل</Link>
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
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-panel rounded-[2.5rem] w-[95%] max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 p-6 sm:p-8 border-white/10" dir="rtl">
                
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md"><Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" /> تقديم عذر طبي</Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-300 mt-2">يرجى تعبئة تفاصيل الغياب وإرفاق التقرير لاعتماده من الإدارة.</p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90 shadow-inner"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Dialog.Close>
                </div>

                <div className="space-y-6">
                  
                  <div className="space-y-3 bg-[#02040a]/40 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> أيام الغياب المراد تبريرها
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={currentDateInput} 
                        onChange={(e) => setCurrentDateInput(e.target.value)} 
                        className="flex-1 glass-input p-3 text-xs sm:text-sm font-bold" 
                        style={{ colorScheme: 'dark' }} 
                      />
                      <button type="button" onClick={handleAddDate} className="bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 rounded-xl px-4 py-3 font-black text-xs sm:text-sm transition-all shadow-inner active:scale-95">
                        إضافة
                      </button>
                    </div>

                    {excuseForm.absent_dates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                        {excuseForm.absent_dates.map(date => (
                          <div key={date} className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-200" dir="ltr">{date}</span>
                            <button type="button" onClick={() => handleRemoveDate(date)} className="text-rose-400 hover:text-rose-300 drop-shadow-sm">
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">نوع الدوام</label>
                    <select value={excuseForm.duration_type} onChange={(e) => setExcuseForm({...excuseForm, duration_type: e.target.value, target_periods: []})} className="w-full glass-input p-3.5 text-xs sm:text-sm font-bold appearance-none [&>option]:bg-[#0f1423] cursor-pointer">
                      <option value="full_day">غياب يوم كامل</option>
                      <option value="partial_day">غياب جزئي (استئذان حصص)</option>
                    </select>
                  </div>

                  <AnimatePresence>
                    {excuseForm.duration_type === 'partial_day' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> حدد الحصص التي غبت عنها</label>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                              <button 
                                key={p} type="button" onClick={() => togglePeriod(p)}
                                className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all border shadow-inner backdrop-blur-md", excuseForm.target_periods.includes(p) ? "bg-amber-500/80 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/40 hover:bg-white/10")}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">إرفاق التقرير الطبي (صورة)</label>
                    <label className={cn("relative flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all backdrop-blur-md shadow-inner", isUploadingReport ? "border-amber-500/50 bg-amber-500/10" : excuseForm.attachment_url ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-[#02040a]/40 hover:border-amber-500/30 hover:bg-white/5")}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleReportUpload} disabled={isUploadingReport} />
                      {isUploadingReport ? (
                        <div className="flex flex-col items-center gap-2 text-amber-400"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /><span className="text-[10px] sm:text-xs font-black">جاري الرفع السحابي...</span></div>
                      ) : excuseForm.attachment_url ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-400 drop-shadow-sm"><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-black text-center">تم إرفاق التقرير بنجاح (انقر لتغييره)</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400 drop-shadow-sm"><UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-bold text-center">اضغط هنا لاختيار صورة التقرير</span></div>
                      )}
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">ملاحظات للإدارة (اختياري)</label>
                    <textarea 
                      value={excuseForm.reason} onChange={(e) => setExcuseForm({...excuseForm, reason: e.target.value})}
                      placeholder="اكتب أي تفاصيل إضافية هنا..." 
                      className="w-full glass-input p-3 sm:p-4 text-xs sm:text-sm font-bold h-20 sm:h-24 resize-none"
                    />
                  </div>

                </div>

                <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={handleSubmitExcuse} disabled={isSubmittingExcuse} className="flex-1 py-3.5 sm:py-4 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 border border-amber-300">
                    {isSubmittingExcuse && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />} إرسال الطلب
                  </button>
                  <button onClick={() => setIsExcuseModalOpen(false)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 text-sm sm:text-base active:scale-95 shadow-inner backdrop-blur-sm">إلغاء</button>
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
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-panel border border-rose-500/20 rounded-[2.5rem] w-[95%] max-w-lg shadow-[0_0_50px_rgba(225,29,72,0.2)] z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 drop-shadow-md" /> تقديم اعتذار رسمي
                    </Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-300 mt-2">يرجى توضيح سبب الاعتذار عن لجنة المراقبة ليتم مراجعته من الإدارة.</p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90 shadow-inner" onClick={() => setIsDutyExcuseModalOpen(false)}>
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Dialog.Close>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">سبب الاعتذار المباشر</label>
                    <textarea 
                      value={dutyExcuseText} onChange={(e) => setDutyExcuseText(e.target.value)}
                      placeholder="أرجو إعفائي من المراقبة للأسباب التالية..." 
                      className="w-full glass-input border border-rose-500/20 focus:border-rose-500/50 focus:ring-rose-500/20 p-4 text-xs sm:text-sm font-bold h-32 resize-none"
                    />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={submitDutyExcuse} disabled={isProcessingDuty} className="flex-1 py-3.5 sm:py-4 bg-rose-600/80 backdrop-blur-md hover:bg-rose-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 border border-rose-500/50">
                    {isProcessingDuty ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : 'رفع الاعتذار'}
                  </button>
                  <button onClick={() => setIsDutyExcuseModalOpen(false)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 text-sm sm:text-base active:scale-95 shadow-inner backdrop-blur-sm">إلغاء</button>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
