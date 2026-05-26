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
  ShieldCheck, MapPin, FileKey, CalendarDays, Download, Fingerprint, Crown, Key, FileSignature, X, Stethoscope, UploadCloud, PartyPopper,
  Printer
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
import TeacherGradingCTA from '@/components/TeacherGradingCTA';

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

  // 🌟 حالات المنظومة الامتحانية المطورة
  const [upcomingDuty, setUpcomingDuty] = useState<any>(null);
  const [coInvigilator, setCoInvigilator] = useState<string | null>(null);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [headDuties, setHeadDuties] = useState<any[]>([]);
  const [controlTeamRole, setControlTeamRole] = useState<any>(null);
  const [finalExamsTimetable, setFinalExamsTimetable] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);

  const [platformSettings, setPlatformSettings] = useState<any>(null);

  const [isDutyExcuseModalOpen, setIsDutyExcuseModalOpen] = useState(false);
  const [dutyExcuseText, setDutyExcuseText] = useState('');
  const [isProcessingDuty, setIsProcessingDuty] = useState(false);

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

  const [attendanceStatus, setAttendanceStatus] = useState<{ isActive: boolean; missedPeriods: number[]; completed: boolean; totalToday: number; }>({ isActive: false, missedPeriods: [], completed: false, totalToday: 0 });
  const [stats, setStats] = useState({ totalStudents: 0, totalExams: 0, totalAssignments: 0, avgAttendance: 0, absenceRate: 0 });
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

  // ✅ الإصلاح الأول: todaysSchedule مشتق من schedule بشكل صحيح
  const todaysSchedule = useMemo(() => {
    if (!schedule || !currentTime) return [];
    const currentDayOfWeek = currentTime.getDay() + 1; // 0=الأحد في JS → 1=الأحد في DB
    return schedule.filter((s: any) => Number(s.day_of_week) === currentDayOfWeek);
  }, [schedule, currentTime]);

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

  const getSafeName = (userObj: any) => {
    if (!userObj) return 'زميل آخر';
    try {
      const name = Array.isArray(userObj) ? userObj[0]?.full_name : userObj?.full_name;
      return String(name || 'زميل آخر');
    } catch (e) { return 'زميل آخر'; }
  };

  useEffect(() => {
    if (isChecking || !user || isFetchedRef.current) return;
    if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') return;

    const loadDashboardData = async () => {
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

          if (data.teacher?.id) {
              const [absencesRes, settingsRes] = await Promise.all([
                 supabase.from('attendance_records').select('student_id, students(users(full_name)), sections(name, classes(name, level))').eq('teacher_id', data.teacher.id).eq('status', 'absent'),
                 supabase.from('platform_settings').select('*').limit(1).maybeSingle()
              ]);

              if (settingsRes.data) setPlatformSettings(settingsRes.data);

              if (absencesRes.data) {
                const studentAbsences = new Map();
                absencesRes.data.forEach((a: any) => {
                  const sid = a.student_id;
                  if (!studentAbsences.has(sid)) {
                    const stuObj = Array.isArray(a.students) ? a.students[0] : a.students;
                    const userObj = Array.isArray(stuObj?.users) ? stuObj.users[0] : stuObj?.users;
                    const secObj = Array.isArray(a.sections) ? a.sections[0] : a.sections;
                    const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
                    studentAbsences.set(sid, { id: sid, name: userObj?.full_name || 'طالب', className: `${classObj?.name || ''} - ${secObj?.name || ''}`, count: 0 });
                  }
                  studentAbsences.get(sid).count++;
                });
                setAtRiskStudents(Array.from(studentAbsences.values()).filter((s: any) => s.count >= 5));
              }

              try {
                 const currentYear = '2025-2026';
                 const currentSemester = 'الفصل الدراسي الثاني';
                 
                 const todayDate = new Date();
                 const tomorrowDate = new Date(todayDate);
                 tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                 
                 const todayStr = format(todayDate, 'yyyy-MM-dd');
                 const tomorrowStr = format(tomorrowDate, 'yyyy-MM-dd');

                 let mySubjectIds: string[] = [];
                 const { data: myAssignments } = await supabase.from('teacher_assignments').select('subject_id').eq('teacher_id', data.teacher.id);
                 if (myAssignments) mySubjectIds = [...mySubjectIds, ...myAssignments.map((a: any) => a.subject_id)];
                 if (data.schedule) mySubjectIds = [...mySubjectIds, ...data.schedule.map((s: any) => s.subject_id)];
                 mySubjectIds = Array.from(new Set(mySubjectIds.filter(Boolean)));

                 const [invigRes, headRes, controlRes, finalExamsRes] = await Promise.all([
                    supabase.from('committee_invigilators').select('id, status, excuse_reason, signed_at, exam_date, committee_id, exam_committees(name, location, capacity)')
                      .eq('teacher_id', data.teacher.id)
                      .in('exam_date', [todayStr, tomorrowStr])
                      .order('exam_date', { ascending: true })
                      .limit(1),
                    supabase.from('exam_committee_heads').select('committees_range, exam_timetables!inner(exam_date, subjects(name), class_level)')
                      .eq('head_teacher_id', data.teacher.id),
                    supabase.from('exam_control_team').select('role_name')
                      .eq('user_id', user.id).eq('academic_year', currentYear).eq('semester', currentSemester).maybeSingle(),
                    supabase.from('exam_timetables').select('*, subjects(name)')
                      .eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date', { ascending: true }).limit(10)
                 ]);

                 if (invigRes.data && invigRes.data.length > 0) {
                     const duty = invigRes.data[0];
                     setUpcomingDuty(duty);

                     const { data: coData } = await supabase.from('committee_invigilators')
                        .select('users(full_name)')
                        .eq('committee_id', duty.committee_id)
                        .eq('exam_date', duty.exam_date)
                        .neq('teacher_id', data.teacher.id)
                        .limit(1);
                     if (coData && coData.length > 0) setCoInvigilator(getSafeName(coData[0].users));

                     const { data: subjectsData } = await supabase.from('exam_timetables')
                        .select('class_level, subjects(name)')
                        .eq('exam_date', duty.exam_date)
                        .eq('academic_year', currentYear)
                        .eq('semester', currentSemester);
                     if (subjectsData) setExamSubjects(subjectsData);
                 }

                 if (headRes.data) setHeadDuties(headRes.data);
                 if (controlRes.data) setControlTeamRole(controlRes.data);
                 if (finalExamsRes.data) setFinalExamsTimetable(finalExamsRes.data);

                 if (mySubjectIds.length > 0) {
                     const { data: keysRes } = await supabase.from('exam_answer_keys')
                       .select('*, subjects(name)')
                       .eq('is_published', true).eq('academic_year', currentYear).eq('semester', currentSemester)
                       .in('subject_id', mySubjectIds).order('created_at', { ascending: false }).limit(10);
                     if (keysRes) setAnswerKeys(keysRes);
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
                    const key = `${slot.section_id}-${pNum}`;
                    if (recordedKeys.has(key)) { totalRecorded++; } 
                    else if (slot.end_time) {
                      const [h, m] = slot.end_time.split(':').map(Number);
                      const endTime = new Date(now); endTime.setHours(h, m, 0, 0);
                      if (now > endTime && !missed.includes(pNum)) missed.push(pNum);
                    }
                  });
                  setAttendanceStatus({ isActive: true, missedPeriods: missed.sort((a, b) => a - b), completed: missed.length === 0 && totalRecorded >= todaysScheduleData.length, totalToday: todaysScheduleData.length });
                }
              }
          }
        }
      } catch (error) { console.error('Error fetching dashboard data:', error); } finally { setLoading(false); }
    };

    loadDashboardData();
  }, [isChecking, user, authRole, mounted]); 

  // --- دوال الأعذار والتوقيع ---
  const signDuty = async () => {
    if (!upcomingDuty) return;
    if (!confirm('هل أنت متأكد من توقيعك إلكترونياً لاستلام مهام هذه اللجنة؟')) return;
    setIsProcessingDuty(true);
    try {
      const { error } = await supabase.from('committee_invigilators').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', upcomingDuty.id);
      if (error) throw error;
      setUpcomingDuty({ ...upcomingDuty, status: 'signed', signed_at: new Date().toISOString() });
    } catch(e) { alert('حدث خطأ أثناء التوقيع.'); } finally { setIsProcessingDuty(false); }
  };

  const submitDutyExcuse = async () => {
    if (!upcomingDuty) return;
    if (!dutyExcuseText.trim()) { alert('يرجى كتابة سبب العذر للإدارة!'); return; }
    setIsProcessingDuty(true);
    try {
       const { error } = await supabase.from('committee_invigilators').update({ status: 'excused', excuse_reason: dutyExcuseText }).eq('id', upcomingDuty.id);
      if (error) throw error;
      alert('تم رفع العذر للإدارة بنجاح وفي سرية تامة وسيتم مراجعته.');
      setIsDutyExcuseModalOpen(false);
      setUpcomingDuty({ ...upcomingDuty, status: 'excused', excuse_reason: dutyExcuseText });
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
      window.location.reload(); 
    } catch (error: any) { alert('حدث خطأ أثناء التقديم: ' + error.message); } finally { setIsSubmittingExcuse(false); }
  };

  const togglePeriod = (periodNum: number) => {
    setExcuseForm(prev => {
      const exists = prev.target_periods.includes(periodNum);
      if (exists) return { ...prev, target_periods: prev.target_periods.filter(p => p !== periodNum) };
      return { ...prev, target_periods: [...prev.target_periods, periodNum].sort((a,b) => a - b) };
    });
  };

  if (isChecking && !user) return <div className="flex h-[100dvh] items-center justify-center bg-[#02040a]"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>;
  if (authRole !== 'teacher' && authRole !== 'admin' && authRole !== 'management') return <div className="flex h-[100dvh] items-center justify-center bg-[#02040a] text-white">وصول مقيد.</div>;
  if (loading && !teacherData) return <div className="flex h-[100dvh] items-center justify-center bg-[#02040a]"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>;

  const avatarUrl = teacherData?.users?.avatar_url;
  const isDutyTomorrow = upcomingDuty?.exam_date === format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd');

  // 🌟 نظام تصفية المراحل للمعلمين لتحديد أي شاشة تظهر لهم 🌟
  const teachesHighSchool = sections.some(sec => Number(sec.classes?.level) >= 10);
  const teachesMiddleSchool = sections.some(sec => Number(sec.classes?.level) >= 6 && Number(sec.classes?.level) <= 9);
  
  const isHighSchoolTeacher = teachesHighSchool || (teachesHighSchool && teachesMiddleSchool); 
  const isStrictlyMiddleSchoolTeacher = !teachesHighSchool && teachesMiddleSchool;

  const isSuspenseGlobal = platformSettings?.results_suspense_mode === true;
  
  const showMiddleSchoolEndYear = isStrictlyMiddleSchoolTeacher && isSuspenseGlobal;
  const showHighSchoolExamMode = isHighSchoolTeacher && isSuspenseGlobal;
  const showRegularDashboard = !showMiddleSchoolEndYear && !showHighSchoolExamMode;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen relative bg-[#02040a] text-slate-100 pb-32 overflow-x-hidden font-sans pt-2 sm:pt-6 print:bg-white print:text-black print:p-0" dir="rtl">
      
      {/* 🚀 ستايل الطباعة */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
           body * { visibility: hidden; }
           .printable-duty, .printable-duty * { visibility: visible; }
           .printable-duty { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 2cm; background: white !important; }
           .no-print { display: none !important; }
        }
      `}} />

      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 print:w-full print:px-0">

        {teacherData?.id && showRegularDashboard && <div className="no-print"><MemorialShieldDisplay userId={teacherData.id} role="teacher" /></div>}

        <AnimatePresence mode="wait">
           {/* ========================================================= */}
           {/* 🎓 1. شاشة معلمي المتوسطة (نهاية العام) */}
           {/* ========================================================= */}
           {showMiddleSchoolEndYear && (
             <motion.div key="middle-school-end" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative overflow-hidden rounded-[2.5rem] glass-panel p-10 sm:p-16 border-emerald-500/30 text-center shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center justify-center min-h-[70vh]">
                <div className="absolute inset-0 bg-[url('https://cdn.discordapp.com/attachments/1083424168050720880/1155913210359058512/confetti.gif')] opacity-20 mix-blend-screen bg-cover pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 to-transparent"></div>
                
                <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] mb-8 z-10">
                   <HeartHandshake className="w-14 h-14 text-emerald-400 drop-shadow-md" />
                </div>
                <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 drop-shadow-xl z-10 tracking-tight">عامٌ حافلٌ بالعطاء! 🌟</h2>
                <p className="text-emerald-100 font-bold text-lg sm:text-2xl max-w-3xl leading-relaxed z-10 bg-[#02040a]/60 backdrop-blur-md p-8 rounded-3xl border border-emerald-500/20 shadow-inner">
                   أستاذي القدير <strong className="text-emerald-400">({teacherData?.users?.full_name})</strong>، نتقدم لكم بخالص الشكر وعظيم الامتنان على جهودكم المخلصة مع أبنائنا في المرحلة المتوسطة. لقد انقضى العام الدراسي وبدأت فترة الاختبارات النهائية للثانوية.
                   <br/><br/>
                   <span className="text-sm sm:text-base text-slate-300">نرجو متابعة الإعلانات هنا لأي طارئ. دمتم فخراً للتعليم، وإلى لقاء قريب في العام القادم بإذن الله.</span>
                </p>
                <div className="mt-8 z-10 w-full max-w-3xl">
                  <AnnouncementsWidget authRole="teacher" />
                </div>
             </motion.div>
           )}

           {/* ========================================================= */}
           {/* 🎯 2. شاشة معلمي الثانوية (غرفة عمليات الاختبارات) */}
           {/* ========================================================= */}
           {showHighSchoolExamMode && (
             <motion.div key="high-school-exams" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 no-print">
               
               <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 sm:p-12 border-rose-500/30 group shadow-2xl">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110 opacity-50"></div>
                 <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-xs font-black uppercase tracking-widest mb-4 shadow-inner text-rose-300">
                     <ShieldAlert className="w-4 h-4" /> <span>غرفة عمليات الاختبارات النهائية</span>
                   </div>
                   <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight drop-shadow-xl text-white">يعطيك العافية أ. {getSafeName(teacherData?.users).split(' ')[0]} 🎯</h1>
                   <p className="text-rose-200 font-black text-sm sm:text-lg drop-shadow-md max-w-3xl leading-relaxed bg-[#02040a]/60 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/5 shadow-inner">
                     أنت الآن في فترة الاختبارات النهائية للثانوية. تم إخفاء الجداول والحصص لتتفرغ تماماً لمهام اللجان والتصحيح. تجد أدناه تكليفاتك ونماذج الإجابة المعتمدة.
                   </p>
                 </div>
               </div>

               {controlTeamRole && (
                 <div className="relative overflow-hidden rounded-[2rem] glass-panel p-8 md:p-10 border-purple-500/30 group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between text-center md:text-right">
                       <div className="flex items-center justify-center w-20 h-20 bg-purple-500/10 backdrop-blur-md rounded-3xl border border-purple-400/30 shadow-inner shrink-0">
                          <Key className="w-10 h-10 text-purple-300 drop-shadow-md" />
                       </div>
                       <div className="flex-1">
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-black mb-4 uppercase tracking-widest shadow-inner"><ShieldCheck className="w-4 h-4" /> القيادة العليا للامتحانات</div>
                          <h2 className="text-3xl font-black text-white mb-3 drop-shadow-lg">غرفة <span className="text-purple-400">الكنترول المركزي</span></h2>
                          <p className="text-purple-100/80 font-bold text-sm max-w-2xl leading-relaxed">أنت مكلف كـ <span className="text-white bg-purple-500/20 px-2 py-0.5 rounded">{controlTeamRole.role_name}</span>.</p>
                       </div>
                       <div className="relative z-10 mt-6 md:mt-0 flex justify-center">
                          <Link href="/admin/exam-pipeline" className="px-8 py-4 bg-purple-600/80 hover:bg-purple-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center gap-2 border border-purple-400/50">الدخول للكنترول <ArrowUpRight className="w-5 h-5" /></Link>
                       </div>
                    </div>
                 </div>
               )}

               {headDuties.length > 0 && (
                 <div className="relative overflow-hidden rounded-[2rem] glass-panel p-8 md:p-10 border-amber-500/30">
                    <div className="relative z-10 flex flex-col items-center text-center gap-6">
                       <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-400/30 shadow-inner"><Crown className="w-10 h-10 text-amber-400" /></div>
                          <h2 className="text-3xl font-black text-white">القيادة الميدانية: <span className="text-amber-400">رئيس لجان</span></h2>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                          {headDuties.map((duty, idx) => (
                             <div key={idx} className="bg-[#02040a]/40 p-5 rounded-2xl border border-white/5 flex flex-col gap-4 text-right">
                                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                                   <span className="text-[11px] font-black bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/20"><CalendarDays className="w-3.5 h-3.5 inline mr-1" /> {safeFormat(duty.exam_timetables?.exam_date, 'd MMMM')}</span>
                                   <span className="text-[10px] font-black bg-[#02040a]/80 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10">الصف {duty.exam_timetables?.class_level}</span>
                                </div>
                                <h3 className="text-xl font-black text-white truncate">{duty.exam_timetables?.subjects?.name}</h3>
                                <p className="text-sm font-bold text-amber-200/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 mt-auto">📍 إشراف على: <span className="text-amber-400 font-black">{duty.committees_range}</span></p>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
               )}

               {upcomingDuty && (
                 <div className="printable-duty relative overflow-hidden rounded-[2rem] glass-panel p-8 md:p-10 border-emerald-500/30">
                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                       <div className="flex-1 text-right w-full">
                          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-black mb-6"><Award className="w-4 h-4" /> تكليف رسمي بالمراقبة</div>
                          <p className="text-emerald-50 text-sm sm:text-base font-bold leading-relaxed mb-6 max-w-3xl">نُعلمكم بأنه تم تكليفكم بمهام المراقبة {isDutyTomorrow ? 'ليوم غدٍ' : 'لهذا اليوم'} الموافق <strong className="text-emerald-300">({safeFormat(upcomingDuty.exam_date, 'd MMMM yyyy')})</strong>.</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                             <div className="bg-[#02040a]/40 p-5 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-400 mb-1">اللجنة المخصصة لكم</p>
                                <p className="text-xl font-black text-emerald-400">{upcomingDuty.exam_committees?.name}</p>
                                {coInvigilator && <p className="text-sm font-bold text-slate-300 mt-3 pt-3 border-t border-white/5"><Users className="w-4 h-4 inline" /> الزميل: {coInvigilator}</p>}
                             </div>
                             <div className="bg-[#02040a]/40 p-5 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-400 mb-2"><BookOpen className="w-3.5 h-3.5 inline" /> المواد المختبرة</p>
                                {examSubjects.map((sub, idx) => <div key={idx} className="text-sm font-bold text-slate-200">الصف {sub.class_level}: <span className="text-emerald-300">{sub.subjects?.name}</span></div>)}
                             </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 no-print">
                             {(!upcomingDuty.status || upcomingDuty.status === 'pending') && (
                                <>
                                  <button onClick={signDuty} disabled={isProcessingDuty} className="px-6 py-3.5 bg-emerald-500 text-slate-950 font-black text-sm rounded-xl flex items-center gap-2"><FileSignature className="w-5 h-5" /> قبول التكليف</button>
                                  <button onClick={() => setIsDutyExcuseModalOpen(true)} disabled={isProcessingDuty} className="px-6 py-3.5 bg-rose-500/10 text-rose-300 font-black text-sm rounded-xl border border-rose-500/30 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> أعتذر لظرف طارئ</button>
                                </>
                             )}
                             {upcomingDuty.status === 'signed' && <div className="px-6 py-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-black text-sm rounded-xl"><CheckCircle2 className="w-5 h-5 inline" /> تم تأكيد الاستلام بنجاح!</div>}
                             {upcomingDuty.status === 'excused' && <div className="px-6 py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 font-black text-sm rounded-xl"><AlertTriangle className="w-5 h-5 inline" /> تم رفع عذركم للإدارة.</div>}
                             
                             {/* ✅ الإصلاح الثاني: Printer بدلاً من PrinterIcon */}
                             <button onClick={() => window.print()} className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-black text-sm rounded-xl border border-white/20 flex items-center gap-2 mr-auto"><Printer className="w-4 h-4"/> طباعة التكليف</button>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {answerKeys.length > 0 && (
                  <div className="glass-panel border-emerald-500/30 rounded-[2rem] p-6 sm:p-8">
                    <div className="border-b border-white/5 flex items-center justify-between pb-5 mb-5">
                      <h2 className="text-lg font-black text-white flex items-center gap-3"><FileKey className="w-5 h-5 text-emerald-400" /> نماذج الإجابات الرسمية (للتصحيح)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {answerKeys.map(keyObj => (
                            <a href={keyObj.file_url} target="_blank" rel="noreferrer" key={keyObj.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all bg-[#02040a]/40">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><Download className="w-5 h-5" /></div>
                                <div>
                                    <p className="font-black text-white text-sm">{keyObj.title}</p>
                                    <p className="text-[10px] font-bold text-slate-300 mt-1">{keyObj.subjects?.name} • الصف {keyObj.class_level}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                  </div>
               )}

               <AnnouncementsWidget authRole="teacher" />
             </motion.div>
           )}

           {/* ========================================================= */}
           {/* 🏫 3. الوضع الافتراضي للداشبورد العادي */}
           {/* ========================================================= */}
           {showRegularDashboard && (
             <motion.div key="regular-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 no-print">
                
                <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] glass-panel p-8 sm:p-12 text-white border-amber-500/20 group">
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
                      <Link href="/assignments" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/80 to-yellow-500/80 backdrop-blur-md px-6 py-4 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-yellow-500 transition-all active:scale-95 border border-amber-400/50 w-full sm:w-auto">
                        <BookOpen className="h-5 w-5" /> إدارة الواجبات
                      </Link>
                    </div>
                  </div>
                </div>

                <motion.div variants={itemVariants}>
                  <TeacherGradingCTA />
                </motion.div>

                {/* التحذيرات (الطلاب المهددين بالحرمان) */}
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

                    <div className="relative z-10 mt-6 flex justify-center lg:justify-end border-t border-white/5 pt-6">
                      <Link href="/dashboard/teacher/warnings" className={`group flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm transition-all border shadow-inner backdrop-blur-md ${atRiskStudents.length > 4 ? 'bg-rose-600/80 text-white hover:bg-rose-500 border-rose-500/40 active:scale-95' : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'}`}>
                        <span>{atRiskStudents.length > 4 ? `عرض كل الطلاب المنذرين (${atRiskStudents.length})` : 'إدارة الإنذارات وتصدير التقرير'}</span>
                        <ArrowUpRight className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* شبكة الإحصائيات */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {[
                    { label: 'إجمالي الطلاب', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                    { label: 'الاختبارات النشطة', value: stats.totalExams, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { label: 'الواجبات الحالية', value: stats.totalAssignments, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { label: 'متوسط الحضور', value: `${stats.avgAttendance || 100}%`, icon: BarChart2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'معدل الغياب', value: `${stats.absenceRate || 0}%`, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                  ].map((stat, i) => (
                    <motion.div key={i} variants={itemVariants} whileHover={{ y: -5 }} className={`glass-panel p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col justify-center items-center text-center gap-3 group relative overflow-hidden`}>
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  
                  {/* العمود الأيمن (الرئيسي) */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8 w-full">
                    
                    <motion.div variants={itemVariants}>
                      <DigitalLibraryWidget userRole="teacher" />
                    </motion.div>

                    {/* تنبيه الغياب لليوم */}
                    {attendanceStatus.isActive && attendanceStatus.totalToday > 0 && (
                      <motion.div variants={itemVariants} className="w-full">
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

                    {/* جدول حصص اليوم */}
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

                    {/* الاختبارات الدورية */}
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

                  {/* العمود الأيسر (الجانبي) */}
                  <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8 w-full">
                    
                    <motion.div variants={itemVariants}>
                       <AnnouncementsWidget authRole="teacher" />
                    </motion.div>

                    {/* الواجبات الحالية */}
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

                    {/* صندوق الرسائل */}
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
             </motion.div>
           )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
