// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, Lock, Star, Play,
  AlertTriangle, ShieldAlert, Loader2, UserCircle,
  Siren, Info, MessageSquare, Sparkles, Stethoscope, UploadCloud, X, Plus, Trash2,
  Ticket, Timer, FileKey, Download, ScrollText, Coins, PartyPopper, Wallet, PrinterIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';

import StudentEvaluationGate from '@/components/StudentEvaluationGate';
import AnnouncementsWidget from '../../../components/AnnouncementsWidget';
import MemorialShieldDisplay from '@/components/MemorialShieldDisplay';
import DigitalLibraryWidget from '@/components/DigitalLibraryWidget';
import { useDashboardSystem } from '../../../hooks/useDashboardSystem';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth-context';
import { cn } from '../../../lib/utils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

const checkIsLocked = (examData: any) => {
  if (!examData?.exam_date) return false;
  try {
    const now = new Date();
    const examDate = new Date(examData.exam_date);
    const endTimeParts = (examData.end_time || '23:59').split(':');
    examDate.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
    return now <= examDate;
  } catch(e) { return false; }
};

export default function StudentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  
  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>({ rate: 100 });
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [myBadges, setMyBadges] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [absentPeriods, setAbsentPeriods] = useState<number>(0);
  const [excuses, setExcuses] = useState<any[]>([]);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [seatAllocation, setSeatAllocation] = useState<any>(null);
  const [examTimetables, setExamTimetables] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);
  const [docRequest, setDocRequest] = useState({ cert_ar: 0, cert_en: 0, twimc_ar: 0, twimc_en: 0, conduct_ar: 0, conduct_en: 0 });
  const [existingDocRequest, setExistingDocRequest] = useState<any>(null);
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const [isFinanciallyBlocked, setIsFinanciallyBlocked] = useState(false);

  const isFetchingRef = useRef(false);
  const { fetchStudentDashboardData, updateStudentTrack } = useDashboardSystem();

  const [currentDateInput, setCurrentDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [excuseForm, setExcuseForm] = useState({ absent_dates: [format(new Date(), 'yyyy-MM-dd')], duration_type: 'full_day', target_periods: [] as number[], reason: '', attachment_url: '', cloudinary_public_id: '' });
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

  // 🚀 حالات الطباعة الجديدة
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isChecking || !user || authRole !== 'student' || !mounted || isFetchingRef.current) return;
    const loadDashboardData = async () => {
      isFetchingRef.current = true;
      try {
        setLoading(true);
        const data = await fetchStudentDashboardData(true); 
        if (data && data.student) {
          setUpcomingAssignments(data.assignments || []);
          setTodaysSchedule(data.todaysSchedule || []);
          const studentId = data.student.id;
          if (studentId) {
              const [ badgesRes, gradesRes, absentCountRes, excusesRes, trackRes, docsRes, settingsRes, resultRes, stdFinanceRes ] = await Promise.all([
                supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', studentId).order('granted_at', { ascending: false }),
                supabase.from('exam_attempts').select('*, exams(id, title, max_score, total_marks, exam_date, end_time, subjects(name))').eq('student_id', studentId).order('completed_at', { ascending: false }).limit(10),
                supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId).eq('status', 'absent'),
                supabase.from('absence_excuses').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabase.from('students').select('next_year_track, track_selection_date, sections(id, name, classes(name, level))').eq('id', studentId).maybeSingle(),
                supabase.from('graduation_documents').select('*').eq('student_id', studentId).eq('academic_year', '2025-2026').maybeSingle(),
                supabase.from('platform_settings').select('*').limit(1).maybeSingle(),
                supabase.from('student_final_results').select('final_percentage').eq('student_id', studentId).eq('academic_year', '2025-2026').eq('semester', 'الفصل الدراسي الثاني').maybeSingle(),
                supabase.from('students').select('has_financial_dues').eq('id', studentId).single()
              ]);
              
              if (badgesRes.data) setMyBadges(badgesRes.data);
              if (excusesRes.data) setExcuses(excusesRes.data);
              if (docsRes.data) setExistingDocRequest(docsRes.data);
              if (settingsRes.data) setPlatformSettings(settingsRes.data);
              if (resultRes.data) setFinalResult(resultRes.data.final_percentage);
              setIsFinanciallyBlocked(stdFinanceRes.data?.has_financial_dues ?? false);
              
              const mergedStudent = { ...data.student, ...trackRes.data };
              setStudentData(mergedStudent);
              
              if (!absentCountRes.error) setAbsentPeriods(absentCountRes.count || 0);
              if (gradesRes.data) setRecentGrades(gradesRes.data.map((g: any) => ({ ...g, exam: { ...g.exams, subject: g.exams?.subjects } })));
              
              try {
                 const sec = Array.isArray(mergedStudent.sections) ? mergedStudent.sections[0] : mergedStudent.sections;
                 const cls = Array.isArray(sec?.classes) ? sec?.classes[0] : sec?.classes;
                 const cLevel = Number(cls?.level || 0);
                 
                 if (cLevel > 0) {
                    const [allocRes, timeRes, keysRes] = await Promise.all([
                      supabase.from('student_seat_allocations').select('seat_number, exam_committees(name, location)').eq('student_id', studentId).maybeSingle(),
                      supabase.from('exam_timetables').select('*, subjects(name)').eq('class_level', cLevel).order('exam_date', { ascending: true }).order('start_time', { ascending: true }),
                      supabase.from('exam_answer_keys').select('*, subjects(name)').eq('class_level', cLevel).eq('is_published', true).order('created_at', { ascending: false })
                    ]);
                    if (allocRes.data) setSeatAllocation(allocRes.data);
                    if (timeRes.data) setExamTimetables(timeRes.data);
                    if (keysRes.data) setAnswerKeys(keysRes.data);
                 }
              } catch (examErr) {}
          }
        }
      } catch (error) { console.error(error); } finally { if (mounted) setLoading(false); }
    };
    loadDashboardData();
  }, [isChecking, user, authRole, mounted]); 

  const handleDocChange = (field: string, delta: number) => { setDocRequest(prev => { const newVal = Math.max(0, prev[field as keyof typeof prev] + delta); return { ...prev, [field]: newVal }; }); };
  const totalDocsCost = Object.values(docRequest).reduce((a, b) => a + b, 0);
  const submitDocRequest = async () => {
    if (totalDocsCost === 0) return alert('يرجى تحديد نسخة واحدة على الأقل');
    if (!confirm(`إجمالي المبلغ المطلوب هو ${totalDocsCost} دينار كويتي. تقديم الطلب؟`)) return;
    setIsSubmittingDocs(true);
    try {
      const payload = { student_id: studentData.id, academic_year: '2025-2026', cert_ar: docRequest.cert_ar, cert_en: docRequest.cert_en, twimc_ar: docRequest.twimc_ar, twimc_en: docRequest.twimc_en, conduct_ar: docRequest.conduct_ar, conduct_en: docRequest.conduct_en, total_amount: totalDocsCost, payment_status: 'pending' };
      await supabase.from('graduation_documents').insert([payload]);
      alert('تم التقديم بنجاح!'); window.location.reload(); 
    } catch (e) { alert('حدث خطأ'); } finally { setIsSubmittingDocs(false); }
  };
  const handleAddDate = () => { if (!currentDateInput || excuseForm.absent_dates.includes(currentDateInput)) return; setExcuseForm(prev => ({ ...prev, absent_dates: [...prev.absent_dates, currentDateInput].sort() })); };
  const handleRemoveDate = (dateToRemove: string) => { setExcuseForm(prev => ({ ...prev, absent_dates: prev.absent_dates.filter(d => d !== dateToRemove) })); };
  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsUploadingReport(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) setExcuseForm(prev => ({ ...prev, attachment_url: data.secure_url, cloudinary_public_id: data.public_id }));
    } catch (err) { alert('فشل الرفع.'); } finally { setIsUploadingReport(false); }
  };
  const handleSubmitExcuse = async () => {
    if (excuseForm.absent_dates.length === 0 || !excuseForm.attachment_url) return;
    setIsSubmittingExcuse(true);
    try {
      const payload = { student_id: studentData.id, submitted_by: user.id, submitter_role: 'student', excuse_date: excuseForm.absent_dates[0], absent_dates: excuseForm.absent_dates, duration_type: excuseForm.duration_type, target_periods: excuseForm.duration_type === 'partial_day' ? excuseForm.target_periods : [], reason: excuseForm.reason, attachment_url: excuseForm.attachment_url, cloudinary_public_id: excuseForm.cloudinary_public_id, status: 'pending' };
      await supabase.from('absence_excuses').insert([payload]);
      alert('تم تقديم العذر!'); setIsExcuseModalOpen(false); window.location.reload(); 
    } catch (error: any) { alert('خطأ'); } finally { setIsSubmittingExcuse(false); }
  };
  const handleTrackSelection = async (track: 'scientific' | 'literary') => { try { await updateStudentTrack(track); window.location.reload(); } catch (error) {} };
  const togglePeriod = (periodNum: number) => { setExcuseForm(prev => { const exists = prev.target_periods.includes(periodNum); return { ...prev, target_periods: exists ? prev.target_periods.filter(p => p !== periodNum) : [...prev.target_periods, periodNum].sort((a,b) => a - b) }; }); };

  // 🚀 دالة الطباعة باستخدام html2canvas و jspdf
  const handlePrintTicket = async () => {
    setIsPrinting(true);
    try {
      // إعطاء فرصة للخطوط للتحميل
      try { await Promise.race([document.fonts.ready, new Promise(res => setTimeout(res, 1000))]); } catch(e) {}
      
      let html2canvasModule;
      try {
         html2canvasModule = await import('html2canvas-pro');
      } catch(e) {
         alert('تعذر تحميل مكتبة الطباعة، تأكد من الاتصال.');
         setIsPrinting(false);
         return;
      }
      
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      if (!printRef.current) {
        setIsPrinting(false);
        return;
      }

      const cardElement = printRef.current;
      const originalCssText = cardElement.style.cssText;
      
      // التجهيز للطباعة المخفية
      cardElement.style.position = 'fixed'; 
      cardElement.style.top = '0'; 
      cardElement.style.left = '0'; 
      cardElement.style.width = '794px'; // حجم A4 بالعرض تقريباً لضمان دقة الرسم
      cardElement.style.zIndex = '-9999';

      const canvas = await html2canvas(cardElement, { 
        scale: 3, // دقة عالية جداً
        useCORS: true, 
        backgroundColor: '#ffffff', 
        scrollY: 0, 
        scrollX: 0, 
        logging: false 
      });
      
      cardElement.style.cssText = originalCssText;
      const imgData = canvas.toDataURL('image/jpeg', 1.0); 
      
      // إنشاء ملف PDF بحجم البطاقة الفعلي
      const pdf = new jsPDF('l', 'mm', [85, 55]); 
      pdf.addImage(imgData, 'JPEG', 0, 0, 85, 55);
      
      pdf.save(`بطاقة_الجلوس_${displayFirstName}.pdf`);
    } catch (e) {
      alert('خطأ أثناء تحويل البطاقة إلى PDF.');
      console.error(e);
    } finally {
      setIsPrinting(false);
    }
  };

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  };

  if (isChecking || loading || !mounted) return <div className="flex h-screen items-center justify-center bg-[#02040a]"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
  if (authRole !== 'student') return <div className="flex h-screen items-center justify-center bg-[#02040a] text-white">وصول مقيد للطلاب فقط.</div>;

  const rawFullName = studentData?.users?.full_name || studentData?.full_name || 'بطل الرفعة';
  const displayFirstName = rawFullName.split(' ')[0];
  
  const secObj = Array.isArray(studentData?.sections) ? studentData?.sections[0] : studentData?.sections;
  const clsObj = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;
  const classLevel = Number(clsObj?.level || 0);
  const classNameStr = String(clsObj?.name || studentData?.class_name || '');
  const sectionNameStr = String(secObj?.name || studentData?.section_name || 'غير محدد');
  const avatarUrl = studentData?.users?.avatar_url || studentData?.avatar_url;
  
  const isMiddleSchool = classLevel >= 6 && classLevel <= 9;
  const isHighSchool = classLevel >= 10 && classLevel <= 12;
  const isTenthGrade = classLevel === 10;
  const isTwelfthGrade = classLevel === 12;
  const hasSelectedTrack = !!studentData?.next_year_track;
  
  const isLiterary = classNameStr.includes('أدبي') || sectionNameStr.includes('أدبي') || studentData?.next_year_track === 'literary';
  const isScientific = classNameStr.includes('علمي') || sectionNameStr.includes('علمي') || studentData?.next_year_track === 'scientific';
  
  const literaryExclusions = ['فيزياء', 'كيمياء', 'أحياء', 'جيولوجيا']; 
  const scientificExclusions = ['تاريخ', 'جغرافيا', 'فلسفة', 'علم نفس', 'فرنسي', 'احصاء', 'إحصاء'];

  const filteredTimetables = examTimetables.filter(ex => {
     const subjName = ex.subjects?.name || '';
     if (isLiterary && literaryExclusions.some(s => subjName.includes(s))) return false;
     if (isScientific && scientificExclusions.some(s => subjName.includes(s))) return false;
     return true;
  });

  const nextOfficialExam = filteredTimetables.find(ex => { const exDate = new Date(`${ex.exam_date}T${ex.start_time}`); return currentTime && exDate > currentTime; });
  let countdownStr = '';
  if (nextOfficialExam && currentTime) {
      const exDate = new Date(`${nextOfficialExam.exam_date}T${nextOfficialExam.start_time}`);
      const diff = exDate.getTime() - currentTime.getTime();
      if (diff > 0) {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff / (1000 * 60 * 60)) % 24); const m = Math.floor((diff / 1000 / 60) % 60);
          countdownStr = `${d > 0 ? d + ' يوم و ' : ''}${h} ساعة و ${m} دقيقة`;
      }
  }

  const unlockedGrades = recentGrades.filter(g => !checkIsLocked(g.exam));
  const avgScore = unlockedGrades.length > 0 ? Math.round(unlockedGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / unlockedGrades.length) : 0;
  
  const qrPayload = `raf-id:${studentData?.id}`; 
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=1`;

  const isSuspenseGlobal = platformSettings?.results_suspense_mode === true;
  const isMyResultPublished = (isMiddleSchool && platformSettings?.results_published_middle === true) || (isHighSchool && platformSettings?.results_published_high === true);
  
  const showFinalResult = isMyResultPublished;
  const showMiddleSchoolSuspense = isMiddleSchool && isSuspenseGlobal && !isMyResultPublished;
  const showHighSchoolExamMode = isHighSchool && isSuspenseGlobal && !isMyResultPublished;
  const showRegularDashboard = !showFinalResult && !showMiddleSchoolSuspense && !showHighSchoolExamMode;
  const hideOldContent = showFinalResult || showMiddleSchoolSuspense || showHighSchoolExamMode;


  let warningLevel = 0; let warningTitle = ""; let warningMessage = ""; let warningColors = ""; let warningIconColor = ""; let WarningIcon = Info; let warningPulse = false;
  if (absentPeriods >= 100) { warningLevel = 4; warningTitle = "إشعار فصل نهائي"; warningMessage = "تجاوزت 100 حصة غياب."; warningColors = "border-rose-500/80 text-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.4)]"; warningIconColor = "text-rose-500"; WarningIcon = Siren; warningPulse = true; } 
  else if (absentPeriods >= 75) { warningLevel = 3; warningTitle = "إنذار ثالث"; warningMessage = "غيابك بمرحلة حرجة."; warningColors = "border-rose-500/60 text-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.2)]"; warningIconColor = "text-rose-500"; WarningIcon = ShieldAlert; warningPulse = true; } 
  else if (absentPeriods >= 50) { warningLevel = 2; warningTitle = "إنذار ثاني"; warningMessage = "برر غيابك فوراً."; warningColors = "border-orange-500/50 text-orange-500"; warningIconColor = "text-orange-500"; WarningIcon = AlertTriangle; } 
  else if (absentPeriods >= 25) { warningLevel = 1; warningTitle = "إنذار أول"; warningMessage = "الالتزام بالحضور مطلوب."; warningColors = "border-amber-500/50 text-amber-500"; warningIconColor = "text-amber-500"; WarningIcon = AlertTriangle; }
  const dangerPercentage = Math.min((absentPeriods / 100) * 100, 100);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-[#02040a] text-slate-100 pb-32 pt-6 font-sans" dir="rtl">
      
      {/* 🚀 شاشة التحميل للطباعة */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-6" />
            <h2 className="text-xl font-black">جاري إنشاء بطاقة الجلوس (PDF)...</h2>
            <p className="text-slate-400 font-bold mt-2">يرجى الانتظار للحظات</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {studentData?.id && !hideOldContent && (
           <MemorialShieldDisplay userId={studentData.id} role="student" />
        )}

        <AnimatePresence mode="wait">
          
          {showFinalResult && (
             <motion.div key="result-mode" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`relative overflow-hidden rounded-[2.5rem] glass-panel p-8 sm:p-12 text-center shadow-2xl flex flex-col items-center justify-center min-h-[50vh] ${isFinanciallyBlocked ? 'border-rose-500/40' : 'border-emerald-500/40'}`}>
                {isFinanciallyBlocked ? (
                   <>
                      <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent"></div>
                      <div className="w-24 h-24 bg-rose-500/10 rounded-[2rem] flex items-center justify-center border border-rose-500/30 shadow-[0_0_30px_rgba(225,29,72,0.3)] mb-6 z-10">
                         <Lock className="w-12 h-12 text-rose-400 drop-shadow-md" />
                      </div>
                      <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 drop-shadow-xl z-10 tracking-tight">النتيجة معتمدة وجاهزة</h2>
                    <div className="bg-[#02040a]/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-rose-500/20 max-w-2xl z-10 text-right shadow-inner">
         <p className="text-rose-200 font-bold text-sm sm:text-base leading-relaxed">
            <strong className="text-rose-400 font-black text-lg block mb-2">عزيزي ولي الأمر،</strong>
            نبارك لنجلكم إنهاء العام الدراسي بنجاح. يرجى التكرم بتسوية الرصيد المالي المتبقي لدى قسم المحاسبة لتفعيل إصدار الشهادة الرقمية فوراً، ولتتمكنوا من استلام النسخة الورقية الرسمية المعتمدة من سكرتارية المدرسة.
         </p>
      </div>

      <div className="relative z-10 w-full max-w-2xl mt-6">
        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30 shadow-inner">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-black text-white text-sm">الدفع الإلكتروني الآمن</p>
              <p className="text-[10px] font-bold text-emerald-300/70">مدعوم من منصة سند الكويت 🇰🇼</p>
            </div>
          </div>

          <p className="text-emerald-100/80 text-xs sm:text-sm font-bold leading-relaxed mb-5 bg-[#02040a]/30 p-3 rounded-xl border border-white/5">
            يمكنكم الآن تسوية الرصيد المالي بكل سهولة وأمان عبر بوابة الدفع الإلكتروني، دون الحاجة للحضور الشخصي.
          </p>

          <a
            href="https://sanad.com.kw/sanadpayment/Eschool001/AccountList.aspx?sid=239&ifrm=yes&fbclid=PAdGRleASBo7tjbGNrAcFYgWV4dG4DYWVtAjEwAAGmyOnjC2Xr5yun7aWOK0R2n-RQRIRVLghj5GmY43RwXCjIDt215bhxe-XX_aem_DvO8rx8pRbbjqimzW6OQUA"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-8 bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all active:scale-95 border border-emerald-400/50 text-sm sm:text-base group"
          >
            <Wallet className="w-5 h-5 group-hover:scale-110 transition-transform" />
            ادفع الآن وافتح نتيجتك فوراً
            <span className="text-emerald-200 text-xs font-bold bg-white/10 px-2 py-1 rounded-lg border border-white/10">سند</span>
          </a>

          <p className="text-center text-[10px] text-emerald-300/50 font-bold mt-3 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> دفع آمن ومشفر بالكامل
          </p>
        </div>
      </div>
   </>

                ) : (
                   <>
                      <div className="absolute inset-0 bg-[url('https://cdn.discordapp.com/attachments/1083424168050720880/1155913210359058512/confetti.gif')] opacity-20 mix-blend-screen bg-cover pointer-events-none z-0"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/30 to-transparent z-0"></div>
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-4 z-10 animate-bounce">
                         <PartyPopper className="w-10 h-10 text-emerald-400 drop-shadow-md" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-emerald-100 mb-2 drop-shadow-md z-10">ألف مبروك النجاح والتفوق!</h2>
                      <div className="text-7xl sm:text-9xl font-black text-white mb-6 drop-shadow-[0_0_40px_rgba(16,185,129,0.6)] z-10 tracking-tighter" dir="ltr">
                         {finalResult ? `${finalResult}%` : '---'}
                      </div>
                      <p className="text-emerald-200/80 font-bold text-sm sm:text-base max-w-xl leading-relaxed z-10 mb-8 bg-[#02040a]/40 p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-inner">
                         هذه هي نتيجتك النهائية للعام الدراسي. الشهادة الورقية الرسمية والموثقة بختم المدرسة بانتظارك لدى قسم سكرتارية الطلبة، يرجى مراجعتهم لاستلامها.
                      </p>
                   </>
                )}
             </motion.div>
          )}

          {showMiddleSchoolSuspense && (
             <motion.div key="suspense-mode" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative overflow-hidden rounded-[2.5rem] glass-panel p-10 sm:p-16 border-amber-500/30 text-center shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center min-h-[60vh]">
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 to-transparent"></div>
                
                {platformSettings?.grading_cta_image_url && (
                   <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl mb-8 border border-white/10 relative z-10">
                      <img src={platformSettings.grading_cta_image_url} alt="Announcement" className="w-full h-auto object-contain" />
                   </div>
                )}

                <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-8 animate-[bounce_3s_infinite] z-10">
                   <GraduationCap className="w-12 h-12 text-amber-400 drop-shadow-md" />
                </div>
                <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 drop-shadow-xl z-10 tracking-tight">مبارك التفوق والنجاح! 🌟</h2>
                <p className="text-amber-200/80 font-bold text-base sm:text-xl max-w-2xl leading-relaxed z-10 bg-[#02040a]/40 p-6 rounded-2xl border border-amber-500/20 shadow-inner">
                   تهانينا بانتقالك إلى صف أعلى! جاري الآن إصدار الشهادات واعتمادها من الإدارة، ترقبوا التحديث هنا قريباً جداً...
                </p>
             </motion.div>
          )}

          {showHighSchoolExamMode && (
            <motion.div key="exam-mode" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              
              <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 sm:p-12 border-rose-500/30 group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110 opacity-50"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/30 text-xs font-black uppercase tracking-widest mb-4 shadow-inner text-rose-300">
                    <ShieldAlert className="w-4 h-4" /> <span>وضع التركيز للاختبارات</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight drop-shadow-xl text-white">بالتوفيق يا {displayFirstName} 🎯</h1>
                  <p className="text-rose-200 font-black text-sm sm:text-lg drop-shadow-md max-w-2xl leading-relaxed bg-black/40 px-6 py-3 rounded-2xl border border-white/5">أنت الآن في فترة الاختبارات النهائية. تم إخفاء المشتتات لتتفرغ تماماً لمراجعة موادك، نثق بقدراتك وبأنك ستحقق أعلى الدرجات!</p>
                </div>
              </div>

              {/* 🎫 البطاقة في الشاشة */}
              {seatAllocation && (
                  <div className="relative">
                    <div className="overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 sm:p-10 border-indigo-500/40 flex flex-col items-center justify-center gap-8 shadow-[0_0_50px_rgba(79,70,229,0.15)]">
                      <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 relative z-10">
                         <h2 className="text-xl font-black text-indigo-300">البطاقة الرسمية (يرجى طباعتها وإبرازها للمراقب)</h2>
                         <button onClick={handlePrintTicket} disabled={isPrinting} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-lg flex items-center gap-2 border border-indigo-400 active:scale-95">
                            <PrinterIcon className="w-5 h-5"/> {isPrinting ? 'جاري التجهيز...' : 'تحميل البطاقة (PDF)'}
                         </button>
                      </div>

                      {/* تصميم البطاقة في الشاشة (يحاكي المطبوع) */}
                      <div style={{ width: '85mm', height: '55mm', backgroundColor: 'white', color: 'black', border: '3px solid black', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, direction: 'rtl', boxSizing: 'border-box' }}>
                          <div style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid black', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '11px', color: 'black', margin: 0, padding: 0 }}>مدرسة الرفعة النموذجية بنين</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>بطاقة دخول اختبارات نهاية العام</div>
                             </div>
                             <div style={{ backgroundColor: 'black', color: 'white', padding: '3px 8px', fontWeight: '900', fontSize: '10px', border: '1px solid black', borderRadius: '6px' }}>{seatAllocation.exam_committees?.name}</div>
                          </div>
                          <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                             <div style={{ width: '22mm', height: '22mm', padding: '2px', border: '2px solid #1e293b', borderRadius: '8px', flexShrink: 0 }}>
                                <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>اسم الطالب</div>
                                <div style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '14px', fontWeight: '900', color: 'black', lineHeight: '1.2', margin: 0, padding: 0 }}>{rawFullName}</h2>
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                   <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '2px solid #1e293b', padding: '3px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '10px', color: '#0f172a' }}>{classNameStr}</span>
                                </div>
                             </div>
                             <div style={{ borderRight: '3px solid #cbd5e1', paddingRight: '12px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '22mm', flexShrink: 0 }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>رقم الجلوس</div>
                                <div style={{ fontSize: '20px', fontWeight: '900', color: 'black', lineHeight: '1' }}>{seatAllocation.seat_number}</div>
                             </div>
                          </div>
                      </div>
                    </div>
                  </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredTimetables.length > 0 && (
                  <div className="glass-panel rounded-[2.5rem] p-6 sm:p-8 border-white/10">
                    <div className="border-b border-white/5 flex items-center justify-between pb-5 mb-5">
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-3 drop-shadow-md">
                        <div className="p-2 bg-indigo-500/10 backdrop-blur-md rounded-xl border border-indigo-500/20 shadow-inner"><Calendar className="h-5 w-5 text-indigo-400" /></div> جدول اختباراتك المعتمد
                      </h2>
                    </div>
                    <div className="space-y-3">
                        {filteredTimetables.map((ex, idx) => {
                            const isFinished = currentTime && new Date(`${ex.exam_date}T${ex.start_time}`) < currentTime;
                            return (
                            <div key={idx} className={`bg-[#02040a]/40 backdrop-blur-md border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between shadow-inner transition-colors group ${isFinished ? 'opacity-60 grayscale' : 'hover:border-indigo-500/30'}`}>
                                <div>
                                    <p className="font-black text-white text-sm sm:text-base group-hover:text-indigo-400 transition-colors flex items-center gap-2 drop-shadow-sm">
                                        {ex.subjects?.name}
                                        {isFinished && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                    </p>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">{safeFormat(ex.exam_date, 'EEEE، d MMM yyyy')}</p>
                                </div>
                                <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 shadow-inner flex flex-col items-center justify-center shrink-0">
                                    <span className="text-[10px] text-slate-300 font-bold uppercase mb-0.5">الوقت</span>
                                    <span className="text-sm sm:text-base font-black text-indigo-300" dir="ltr">{ex.start_time.substring(0,5)}</span>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                  </div>
                )}

                {answerKeys.length > 0 && (
                  <div className="glass-panel border-emerald-500/30 rounded-[2.5rem] p-6 sm:p-8">
                    <div className="border-b border-white/5 flex items-center justify-between pb-5 mb-5">
                      <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-3 drop-shadow-md">
                        <div className="p-2 bg-emerald-500/10 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-inner"><FileKey className="h-5 w-5 text-emerald-400" /></div> نماذج الإجابات المعتمدة
                      </h2>
                    </div>
                    <div className="space-y-3">
                        {answerKeys.map(keyObj => (
                            <a href={keyObj.file_url} target="_blank" rel="noreferrer" key={keyObj.id} className="flex items-center justify-between p-4 rounded-[1.5rem] border border-white/5 hover:border-emerald-500/30 hover:bg-white/5 transition-all group shadow-inner bg-[#02040a]/40 backdrop-blur-md">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/80 group-hover:text-slate-900 transition-colors shrink-0">
                                        <Download className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white text-sm sm:text-base truncate drop-shadow-md">{keyObj.title}</p>
                                        <p className="text-[10px] font-bold text-slate-300 mt-1 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 inline-block shadow-inner">{keyObj.subjects?.name}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. الوضع العادي (الداشبورد الكامل) */}
          {showRegularDashboard && (
             <motion.div key="regular-mode" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-12 space-y-8">
                  <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-6 sm:p-10 border-blue-500/30 group shadow-lg">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110 opacity-50"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-right">
                        <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-[#0f1423]/50 backdrop-blur-xl flex items-center justify-center relative shadow-[0_0_30px_rgba(59,130,246,0.1)] group-hover:scale-105 group-hover:border-blue-500/30 transition-transform duration-500">
                          {avatarUrl ? <img src={avatarUrl} alt="av" className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-blue-400">{rawFullName.charAt(0)}</span>}
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-xs font-black uppercase tracking-widest mb-3 shadow-inner text-blue-400">
                            <Star className="w-3.5 h-3.5 drop-shadow-sm" /> <span>لوحة الطالب المخصصة</span>
                          </div>
                          <h1 className="text-3xl sm:text-5xl font-black mb-2 leading-tight drop-shadow-xl">وفقك الله يا {displayFirstName} 🌟</h1>
                          <p className="text-slate-200 font-bold text-sm sm:text-lg drop-shadow-md">{classNameStr} - {sectionNameStr}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full sm:w-auto shrink-0 justify-center">
                        <div className="bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 text-center min-w-[100px] shadow-inner group-hover:border-white/20 transition-colors">
                          <p className="text-[10px] sm:text-xs text-slate-300 uppercase font-bold tracking-widest drop-shadow-sm">نسبة الحضور</p>
                          <p className="text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-lg">{attendanceStats.rate}%</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 text-center min-w-[100px] shadow-inner group-hover:border-white/20 transition-colors">
                          <p className="text-[10px] sm:text-xs text-slate-300 uppercase font-bold tracking-widest drop-shadow-sm">متوسط الدرجات</p>
                          <p className="text-2xl sm:text-3xl font-black text-blue-400 drop-shadow-lg">{avgScore}%</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {seatAllocation && (
                    <div className="relative">
                      <div className="overflow-hidden rounded-[2rem] sm:rounded-[3rem] glass-panel p-8 sm:p-10 border-indigo-500/40 flex flex-col items-center justify-center gap-8 shadow-[0_0_50px_rgba(79,70,229,0.15)]">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                        
                        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 relative z-10">
                           <h2 className="text-xl font-black text-indigo-300">البطاقة الرسمية (يرجى طباعتها وإبرازها للمراقب)</h2>
                           <button onClick={handlePrintTicket} disabled={isPrinting} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-sm transition-all shadow-lg flex items-center gap-2 border border-indigo-400 active:scale-95">
                              <PrinterIcon className="w-5 h-5"/> {isPrinting ? 'جاري التجهيز...' : 'تحميل البطاقة (PDF)'}
                           </button>
                        </div>

                        {/* تصميم البطاقة في الشاشة */}
                        <div style={{ width: '85mm', height: '55mm', backgroundColor: 'white', color: 'black', border: '3px solid black', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', zIndex: 10, direction: 'rtl', boxSizing: 'border-box' }}>
                            <div style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid black', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: '900', fontSize: '11px', color: 'black', margin: 0, padding: 0 }}>مدرسة الرفعة النموذجية بنين</div>
                                  <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>بطاقة دخول اختبارات نهاية العام</div>
                               </div>
                               <div style={{ backgroundColor: 'black', color: 'white', padding: '3px 8px', fontWeight: '900', fontSize: '10px', border: '1px solid black', borderRadius: '6px' }}>{seatAllocation.exam_committees?.name}</div>
                            </div>
                            <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                               <div style={{ width: '22mm', height: '22mm', padding: '2px', border: '2px solid #1e293b', borderRadius: '8px', flexShrink: 0 }}>
                                  <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                               </div>
                               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>اسم الطالب</div>
                                  <div style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                     <h2 style={{ fontSize: '14px', fontWeight: '900', color: 'black', lineHeight: '1.2', margin: 0, padding: 0 }}>{rawFullName}</h2>
                                  </div>
                                  <div style={{ marginTop: '2px' }}>
                                     <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '2px solid #1e293b', padding: '3px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '10px', color: '#0f172a' }}>{classNameStr}</span>
                                  </div>
                               </div>
                               <div style={{ borderRight: '3px solid #cbd5e1', paddingRight: '12px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '22mm', flexShrink: 0 }}>
                                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>رقم الجلوس</div>
                                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'black', lineHeight: '1' }}>{seatAllocation.seat_number}</div>
                               </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isTwelfthGrade && (
                    <div className="relative z-10 w-full">
                      {existingDocRequest ? (
                        <div className="glass-panel border-emerald-500/30 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                            <div className="flex items-center gap-5 text-center md:text-right w-full md:w-auto flex-col md:flex-row">
                              <div className="w-16 h-16 bg-emerald-500/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                                  <ScrollText className="w-8 h-8 text-emerald-400 drop-shadow-sm" />
                              </div>
                              <div>
                                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-md">تم استلام طلب الوثائق والتصديقات بنجاح! 🎉</h3>
                                  <p className="text-sm font-bold text-slate-300 leading-relaxed max-w-xl">
                                    طلبك الآن قيد المعالجة (الإجمالي: <strong className="text-emerald-400">{existingDocRequest.total_amount} د.ك</strong>). 
                                    {existingDocRequest.payment_status === 'pending' ? ' يرجى التوجه لمكتب شؤون الطلبة لدفع الرسوم واعتماد الطلب.' : ' تم الدفع والمندوب يقوم بتصديق أوراقك من الوزارة.'}
                                  </p>
                              </div>
                            </div>
                            <div className="shrink-0 w-full md:w-auto flex justify-center">
                              <div className={`px-6 py-3 rounded-xl border font-black text-xs sm:text-sm shadow-inner backdrop-blur-md ${existingDocRequest.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                  الحالة: {existingDocRequest.payment_status === 'pending' ? 'بانتظار الدفع بالمدرسة ⏳' : 'مدفوع وجاري التصديق ✅'}
                              </div>
                            </div>
                        </div>
                      ) : (
                        <div className="glass-panel border-fuchsia-500/30 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_40px_rgba(192,38,211,0.1)] relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-64 h-64 bg-fuchsia-600/10 blur-[100px] pointer-events-none rounded-full mix-blend-screen transition-transform duration-1000 group-hover:scale-110 opacity-50"></div>
                            <div className="flex flex-col md:flex-row items-center gap-6 mb-8 relative z-10 text-center md:text-right border-b border-white/5 pb-8">
                              <div className="p-4 bg-fuchsia-500/10 backdrop-blur-md rounded-3xl border border-fuchsia-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                  <ScrollText className="w-10 h-10 text-fuchsia-400 drop-shadow-md" />
                              </div>
                              <div className="flex-1">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-300 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-fuchsia-500/20 shadow-inner backdrop-blur-sm">خاص بخريجي الثاني عشر 🎓</div>
                                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 drop-shadow-xl">بوابة طلب الوثائق والتصديقات الرسمية</h2>
                                  <p className="text-sm font-bold text-slate-300 leading-relaxed max-w-3xl opacity-90 drop-shadow-sm">
                                    مبارك تخرجك المرتقب! لراحتك وسرعة تقديمك للجامعات، وفرنا لك خدمة استخراج الوثائق وتصديقها من الوزارة عن طريق مندوب المدرسة. 
                                  </p>
                              </div>
                            </div>
                            <div className="bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-2xl p-4 sm:p-5 mb-8 relative z-10 flex items-start sm:items-center gap-4 text-rose-200 shadow-inner">
                              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 text-rose-400 animate-pulse drop-shadow-md" />
                              <p className="text-xs sm:text-sm font-bold leading-relaxed opacity-90">
                                  <strong className="text-rose-400 font-black block sm:inline">تنبيه هام للسرعة:</strong> الوزارة تحصل رسوماً مقدارها <strong className="bg-rose-500/20 px-2 py-0.5 rounded text-white border border-rose-500/30 shadow-inner">1 دينار كويتي</strong> لكل طابع تصديق. يرجى تعبئة طلبك هنا ثم التوجه فوراً لدفع المبلغ في المدرسة ليتسنى للمندوب الانطلاق وتجهيز أوراقك قبل إغلاق باب التسجيل في الجامعات!
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 mb-8">
                              <div className="bg-[#02040a]/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-fuchsia-500/30 hover:bg-[#02040a]/60 transition-all shadow-inner flex flex-col gap-4">
                                  <div>
                                    <h4 className="font-black text-white text-base drop-shadow-sm">شهادة الثانوية العامة</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">الشهادة الأساسية بالدرجات</p>
                                  </div>
                                  <div className="space-y-3 mt-auto">
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة عربية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('cert_ar', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.cert_ar}</span>
                                          <button onClick={() => handleDocChange('cert_ar', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة إنجليزية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('cert_en', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.cert_en}</span>
                                          <button onClick={() => handleDocChange('cert_en', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                              <div className="bg-[#02040a]/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-fuchsia-500/30 hover:bg-[#02040a]/60 transition-all shadow-inner flex flex-col gap-4">
                                  <div>
                                    <h4 className="font-black text-white text-base drop-shadow-sm">شهادة لمن يهمه الأمر</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">إثبات دراسة وتخرج</p>
                                  </div>
                                  <div className="space-y-3 mt-auto">
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة عربية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('twimc_ar', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.twimc_ar}</span>
                                          <button onClick={() => handleDocChange('twimc_ar', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة إنجليزية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('twimc_en', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.twimc_en}</span>
                                          <button onClick={() => handleDocChange('twimc_en', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                              <div className="bg-[#02040a]/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-fuchsia-500/30 hover:bg-[#02040a]/60 transition-all shadow-inner flex flex-col gap-4">
                                  <div>
                                    <h4 className="font-black text-white text-base drop-shadow-sm">شهادة حسن سيرة وسلوك</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">مطلوبة للجامعات والبعثات</p>
                                  </div>
                                  <div className="space-y-3 mt-auto">
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة عربية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('conduct_ar', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.conduct_ar}</span>
                                          <button onClick={() => handleDocChange('conduct_ar', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 shadow-inner">
                                        <span className="text-xs font-bold text-slate-300">نسخة إنجليزية</span>
                                        <div className="flex items-center gap-3">
                                          <button onClick={() => handleDocChange('conduct_en', -1)} className="w-7 h-7 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg font-black active:scale-90 transition-all shadow-sm">-</button>
                                          <span className="font-black text-fuchsia-300 w-4 text-center">{docRequest.conduct_en}</span>
                                          <button onClick={() => handleDocChange('conduct_en', 1)} className="w-7 h-7 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 border border-fuchsia-500/30 text-fuchsia-300 rounded-lg font-black active:scale-90 transition-all shadow-sm">+</button>
                                        </div>
                                    </div>
                                  </div>
                              </div>
                            </div>
                            <div className="relative z-10 bg-[#02040a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-inner">
                              <div className="flex items-center gap-4 text-center sm:text-right">
                                  <div className="p-3 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20 shadow-inner"><Coins className="w-8 h-8 text-fuchsia-400 drop-shadow-md" /></div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-400 mb-1">إجمالي رسوم التصديق والطوابع</p>
                                    <p className="text-3xl font-black text-white drop-shadow-md"><span className="text-fuchsia-400">{totalDocsCost}</span> د.ك</p>
                                  </div>
                              </div>
                              <button onClick={submitDocRequest} disabled={totalDocsCost === 0 || isSubmittingDocs} className="w-full sm:w-auto px-10 py-4 bg-fuchsia-600/80 backdrop-blur-md hover:bg-fuchsia-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(192,38,211,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-fuchsia-400/50">
                                  {isSubmittingDocs ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> اعتماد وتقديم الطلب</>}
                              </button>
                            </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {myBadges.length > 0 && (
                    <div className="relative z-10 pt-2 w-full">
                      <h3 className="text-sm sm:text-base font-black text-white mb-4 flex items-center justify-center sm:justify-start gap-2 drop-shadow-md">
                        <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف الخاصة بك
                      </h3>
                      <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 custom-scrollbar snap-x">
                        {myBadges.map((badgeEntry, index) => (
                          <div key={badgeEntry.id || index} className="snap-center flex-shrink-0 glass-panel rounded-[2rem] p-5 border-white/5 flex items-center gap-4 w-[20rem] sm:w-[22rem] hover:border-amber-500/30 transition-all duration-300 group cursor-default">
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                              <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl group-hover:bg-amber-500/20 transition-colors"></div>
                              {badgeEntry.badge?.image_url ? (
                                <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized className="object-contain drop-shadow-xl relative z-10" />
                              ) : <Award className="w-full h-full text-amber-400 relative z-10 drop-shadow-md p-2" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm sm:text-base font-black text-white truncate drop-shadow-sm">{badgeEntry.badge?.name}</p>
                              <p className="text-[10px] sm:text-xs font-bold text-slate-300 opacity-90 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>{badgeEntry.reason || 'تقديراً للجهود'}</p>
                              <p className="text-[9px] text-slate-400 mt-2 bg-white/5 w-fit px-2.5 py-1 rounded-lg border border-white/5 shadow-inner font-bold">بتاريخ: {safeFormat(badgeEntry.granted_at, 'd MMM yyyy')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    {[
                      { href: '/dashboard/student/schedule', icon: Calendar, label: 'الجدول الدراسي', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { href: '/exams', icon: FileText, label: 'الاختبارات', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                      { href: '/assignments', icon: BookOpen, label: 'الواجبات', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                      { href: '/messages', icon: Bell, label: 'التنبيهات', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
                    ].map((item, idx) => (
                      <Link key={idx} href={item.href} className="group h-full">
                        <div className="p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] glass-panel transition-all flex flex-col items-center justify-center gap-3 sm:gap-4 group-hover:-translate-y-1 h-full hover:border-white/20">
                          <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-500 ${item.bg} backdrop-blur-md border ${item.border} group-hover:scale-110 shadow-inner`}><item.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${item.color} drop-shadow-md`} /></div>
                          <span className="font-black text-slate-300 group-hover:text-white transition-colors text-xs sm:text-sm text-center drop-shadow-sm">{item.label}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8 w-full">
                      <DigitalLibraryWidget userRole="student" />
                      
                      {filteredTimetables.length > 0 && (
                          <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
                            <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right gap-4">
                              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-md">
                                <div className="p-2 bg-indigo-500/10 backdrop-blur-md rounded-xl border border-indigo-500/20 shadow-inner"><Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" /></div> جدول الاختبارات النهائية
                              </h2>
                            </div>
                            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {filteredTimetables.map((ex, idx) => {
                                    const isFinished = currentTime && new Date(`${ex.exam_date}T${ex.start_time}`) < currentTime;
                                    return (
                                    <div key={idx} className={`bg-[#02040a]/40 backdrop-blur-md border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between shadow-inner transition-colors group ${isFinished ? 'opacity-60 grayscale' : 'hover:border-indigo-500/30'}`}>
                                        <div>
                                            <p className="font-black text-white text-sm sm:text-base group-hover:text-indigo-400 transition-colors flex items-center gap-2 drop-shadow-sm">
                                                {ex.subjects?.name}
                                                {isFinished && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                            </p>
                                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">{safeFormat(ex.exam_date, 'EEEE، d MMM yyyy')}</p>
                                        </div>
                                        <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/10 shadow-inner flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[10px] text-slate-300 font-bold uppercase">الوقت</span>
                                            <span className="text-xs sm:text-sm font-black text-indigo-300" dir="ltr">{ex.start_time.substring(0,5)}</span>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                          </div>
                      )}

                      <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none mix-blend-screen opacity-50"></div>
                        <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-transparent relative z-10 gap-4 text-center sm:text-right">
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-md w-full sm:w-auto">
                            <div className="p-2.5 sm:p-3 bg-blue-500/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-blue-500/20 shadow-inner"><Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 drop-shadow-sm" /></div> جدول حصص اليوم
                          </h2>
                          <Link href="/dashboard/student/schedule" className="text-xs sm:text-sm font-bold text-blue-300 hover:text-white hover:bg-white/10 transition-colors px-4 sm:px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-xl shadow-inner border border-white/10 shrink-0 w-full sm:w-auto active:scale-95">الجدول الكامل</Link>
                        </div>
                        
                        <div className="p-5 sm:p-6 lg:p-8 relative z-10 bg-transparent overflow-x-hidden">
                          {todaysSchedule.length > 0 ? (
                            <div className="space-y-5 sm:space-y-6 relative before:absolute before:inset-0 before:ml-5 sm:before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-blue-500/30 before:via-white/5 before:to-transparent">
                              {todaysSchedule.map((item, i) => {
                                let current = false; let next = false; let isPast = false;
                                if (item.start_time && item.end_time && currentTime) {
                                    const [startH, startM] = item.start_time.split(':').map(Number);
                                    const [endH, endM] = item.end_time.split(':').map(Number);
                                    const now = currentTime;
                                    const start = new Date(now); start.setHours(startH, startM, 0);
                                    const end = new Date(now); end.setHours(endH, endM, 0);
                                    if (now >= start && now <= end) { current = true; } else if (now > end) { isPast = true; } else {
                                        const diff = (start.getTime() - now.getTime()) / (1000 * 60);
                                        if (diff > 0 && diff <= 60) next = true;
                                    }
                                }
                                return (
                                  <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                                    <div className={cn("flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500 backdrop-blur-md", 
                                      current ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white scale-110 sm:scale-125 border-[#02040a] shadow-[0_0_20px_rgba(59,130,246,0.5)]" : 
                                      isPast ? "bg-[#02040a]/40 text-slate-500 border-white/5 opacity-50" :
                                      next ? "bg-[#02040a]/80 text-blue-400 border-blue-500/30" : "bg-[#02040a]/80 text-slate-400 border-white/10"
                                    )}>
                                      {current ? <Play className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse ml-0.5 sm:ml-1" /> : isPast ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-sm sm:text-base font-black">{item.period}</span>}
                                    </div>
                                    
                                    <div className={cn("w-[calc(100%-3.5rem)] sm:w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all duration-500 backdrop-blur-xl relative overflow-hidden shadow-inner cursor-default", 
                                      current ? "bg-blue-500/10 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02] ring-1 ring-blue-500/20" : 
                                      isPast ? "bg-[#02040a]/20 border-white/5 opacity-60 grayscale" :
                                      next ? "bg-blue-500/5 border-blue-500/20" : "bg-[#02040a]/40 border-white/5 hover:border-white/10"
                                    )}>
                                      {current && (
                                        <span className="absolute top-4 right-4 flex h-3.5 w-3.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                                        </span>
                                      )}
                                      <div className={`absolute top-0 left-0 w-1 h-full ${
                                        current ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : isPast ? 'bg-slate-800' : next ? 'bg-blue-400' : 'bg-white/10'
                                      }`}></div>

                                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-3 mb-3 pr-2">
                                        <h3 className={cn("text-base sm:text-lg font-black transition-colors truncate drop-shadow-md pl-2", current ? "text-blue-400" : next ? "text-white" : isPast ? "text-slate-500" : "text-slate-200")}>{item.subjects?.name}</h3>
                                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                          {current && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[9px] sm:text-[10px] font-bold text-blue-300 shadow-inner"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> الحصة الآن</span>}
                                          {next && !current && <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-bold shadow-inner">الحصة القادمة</span>}
                                          {isPast && <span className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5 text-[9px] sm:text-[10px] font-bold shadow-inner flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> انتهت</span>}
                                          <span className={cn("text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-blue-500/20 text-blue-300 border-blue-500/20" : isPast ? "bg-transparent text-slate-500 border-slate-800" : "bg-white/5 text-slate-300 border-white/10")}>الحصة {item.period}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-3 pr-2">
                                        <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", current ? "text-blue-100" : isPast ? "text-slate-500" : "text-slate-300")}><GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" /><span className="truncate">أ. {item.teachers?.users?.full_name || 'غير محدد'}</span></p>
                                        {item.start_time && item.end_time && (
                                          <span className={cn("text-[9px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/60 backdrop-blur-sm px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-blue-300 border-blue-500/20" : isPast ? "text-slate-600 border-slate-800" : "text-slate-400 border-white/5")} dir="ltr"><Clock className="w-2.5 h-2.5 sm:w-3 h-3 shrink-0" />{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-12 sm:py-16 bg-[#02040a]/30 backdrop-blur-sm rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 shadow-inner px-4">
                              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 mb-3 sm:mb-4 border border-white/5 shadow-inner"><Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500" /></div>
                              <h3 className="text-lg sm:text-xl font-black text-white mb-2 drop-shadow-md">لا توجد حصص اليوم</h3>
                              <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] p-5 sm:p-6 lg:p-8 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] -ml-10 -mt-10 pointer-events-none mix-blend-screen opacity-50 group-hover:scale-150 transition-transform duration-1000"></div>
                        
                        <div className="mb-6 sm:mb-8 flex items-center justify-between relative z-10 text-center sm:text-right border-b border-white/5 pb-6">
                          <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-md w-full sm:w-auto">
                            <div className="p-2.5 sm:p-3 bg-emerald-500/10 backdrop-blur-md rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                               <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 drop-shadow-sm" />
                            </div>
                            تطور المستوى الأكاديمي
                          </h2>
                        </div>
                        
                        <div className="h-[250px] sm:h-[300px] lg:h-[350px] w-full relative z-10 ml-[-15px] sm:ml-0">
                          {recentGrades.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={recentGrades.map(g => ({ displayTitle: g.exam?.title || 'اختبار', displayScore: g.score || 0 })).reverse()}>
                                <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.5}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                                <XAxis dataKey="displayTitle" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} dx={-10} width={30} />
                                <Tooltip contentStyle={{borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(2,4,10,0.8)', backdropFilter: 'blur(16px)', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)'}} itemStyle={{color: '#34d399', fontWeight: '900'}} />
                                <Area type="monotone" dataKey="displayScore" name="الدرجة" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{r: 5, strokeWidth: 0, fill: '#34d399', stroke: '#fff'}} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="relative w-full h-full rounded-[2rem] overflow-hidden flex flex-col items-center justify-center p-6 border border-white/5 bg-[#02040a]/40 backdrop-blur-sm shadow-inner group cursor-default">
                               <div className="absolute inset-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                               <div className="absolute bottom-0 w-full h-[60%] opacity-20 pointer-events-none">
                                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                                     <path d="M0,100 C20,80 40,30 60,60 C80,90 90,40 100,50 L100,100 Z" fill="url(#ghostGradient)" className="animate-[pulse_4s_ease-in-out_infinite]" />
                                     <defs>
                                        <linearGradient id="ghostGradient" x1="0" y1="0" x2="0" y2="1">
                                           <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                                           <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                                        </linearGradient>
                                     </defs>
                                  </svg>
                               </div>
                               <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[bounce_3s_infinite] opacity-50"></div>
                               <div className="absolute top-1/4 right-1/3 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[bounce_4s_infinite] opacity-50 delay-1000"></div>

                               <div className="relative z-10 flex flex-col items-center text-center bg-[#02040a]/80 backdrop-blur-md px-8 py-6 rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-emerald-500/30 transition-all duration-500">
                                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                     <Sparkles className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                                  </div>
                                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight drop-shadow-md">نستعد لرصد تألقك الشامل! 🚀</h3>
                                  <p className="text-sm font-bold text-slate-400 max-w-md leading-relaxed">
                                    الرادار الذكي متصل الآن.. بانتظار التزامك <span className="text-emerald-400">بالحضور</span>، وإنجازك <span className="text-amber-400">للواجبات</span>، وتفوقك في <span className="text-indigo-400">الاختبارات</span> ليرسم هولوجرام نجاحك السنوي!
                                  </p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8 w-full">
                      <AnnouncementsWidget authRole="student" />

                      <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right gap-4">
                          <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                            <div className="p-2 bg-amber-500/10 backdrop-blur-md rounded-xl border border-amber-500/20 shadow-inner"><BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" /></div> واجبات مطلوبة
                          </h2>
                        </div>
                        <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                          {upcomingAssignments.length > 0 ? (
                            upcomingAssignments.map((assignment) => (
                              <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group mb-2">
                                <div className="p-4 sm:p-5 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 hover:border-amber-500/30 hover:bg-white/5 transition-all bg-[#02040a]/40 backdrop-blur-md flex flex-col justify-between h-full shadow-inner">
                                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                                    <p className="font-black text-white text-xs sm:text-sm leading-tight group-hover:text-amber-300 transition-colors line-clamp-2 drop-shadow-md">{assignment.title}</p>
                                    <span className="text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-inner"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {safeFormat(assignment.due_date, 'd MMM')}</span>
                                  </div>
                                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-300 bg-white/5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg inline-block w-fit border border-white/10 shadow-inner">{assignment.subject?.name}</p>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-400 font-bold bg-[#02040a]/30 backdrop-blur-sm rounded-[1rem] border border-dashed border-white/10 text-xs sm:text-sm m-2 shadow-inner">لا توجد واجبات مطلوبة حالياً</div>
                          )}
                        </div>
                      </div>

                      <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent gap-4">
                          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-md">
                            <div className="p-2 bg-amber-500/10 backdrop-blur-md rounded-xl border border-amber-500/20 shadow-inner">
                              <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-sm" />
                            </div> 
                            سجل الأعذار 
                          </h2>
                          <button onClick={() => setIsExcuseModalOpen(true)} className="text-[10px] sm:text-xs font-black text-slate-900 flex items-center gap-1.5 bg-gradient-to-r from-amber-400/90 to-orange-500/90 backdrop-blur-md px-4 py-2.5 rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 active:scale-95 whitespace-nowrap border border-amber-300/50">
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> عذر جديد
                          </button>
                        </div>
                        
                        <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {excuses.length > 0 ? (
                            excuses.map(exc => (
                              <div key={exc.id} className="p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 bg-[#02040a]/40 backdrop-blur-md flex flex-col gap-2 mb-2 shadow-inner hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-center">
                                  <span className="text-white font-black text-sm drop-shadow-md">
                                    {exc.absent_dates && exc.absent_dates.length > 0 
                                      ? `${safeFormat(exc.absent_dates[0], 'dd MMM yyyy')} ${exc.absent_dates.length > 1 ? `(+${exc.absent_dates.length - 1} أيام)` : ''}`
                                      : safeFormat(exc.excuse_date, 'dd MMM yyyy')}
                                  </span>
                                  <span className={`text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-md border shadow-inner ${
                                    exc.status === 'pending' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                                    exc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                                    'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  }`}>
                                    {exc.status === 'pending' ? 'قيد المراجعة ⏳' : exc.status === 'approved' ? 'عذر مقبول ✓' : 'عذر مرفوض ✕'}
                                  </span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">
                                  {exc.duration_type === 'full_day' ? 'غياب يوم كامل' : `غياب جزئي: حصص (${exc.target_periods?.join(', ')})`}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-400 bg-[#02040a]/30 backdrop-blur-sm rounded-[1rem] border border-dashed border-white/10 font-bold text-xs sm:text-sm m-2 shadow-inner">لم تقم بتقديم أي أعذار مسبقة</div>
                          )}
                        </div>
                      </div>

                      <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-transparent text-center sm:text-right gap-4">
                          <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-md w-full sm:w-auto">
                            <div className="p-2 bg-emerald-500/10 backdrop-blur-md rounded-xl border border-emerald-500/20 shadow-inner"><Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-sm" /></div> آخر النتائج
                          </h2>
                          <Link href="/student/performance" className="text-[10px] sm:text-xs font-bold text-emerald-300 hover:text-white flex items-center justify-center gap-1 bg-white/5 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-white/10 transition-colors border border-white/10 shrink-0 w-full sm:w-auto active:scale-95 shadow-inner">السجل <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" /></Link>
                        </div>
                        
                        <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                          {recentGrades.length > 0 ? (
                            recentGrades.slice(0,4).map((grade) => {
                              const isLocked = checkIsLocked(grade.exam);
                              return (
                                <div key={grade.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border transition-all mb-2 ${isLocked ? 'bg-[#02040a]/40 border-white/5 shadow-inner grayscale opacity-80' : 'bg-[#02040a]/60 backdrop-blur-md border-white/5 hover:border-emerald-500/30 hover:bg-white/5 group shadow-inner'}`}>
                                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0 transition-colors ${isLocked ? 'bg-white/5 text-slate-500 border border-white/10' : grade.score >= 50 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/80 group-hover:text-slate-900' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500/80 group-hover:text-slate-900'}`}>
                                      {isLocked ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    </div>
                                    <div className="min-w-0 pr-1">
                                      <p className="font-black text-white text-xs sm:text-sm leading-tight mb-1 truncate drop-shadow-md">{grade.exam?.title}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg inline-block truncate max-w-full border border-white/10 shadow-inner">{grade.exam?.subject?.name}</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end justify-center shrink-0 pl-1">
                                    {isLocked ? (
                                      <><span className="text-[9px] sm:text-[10px] font-black text-slate-400 bg-white/5 shadow-inner border border-white/10 px-2 py-1 rounded-md flex items-center gap-1 mb-1"><Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> محجوبة</span><p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                                    ) : (
                                      <><p className={`text-base sm:text-xl font-black flex items-baseline gap-1 drop-shadow-lg ${grade.score >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{grade.score} <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">/ {grade.exam?.max_score || 100}</span></p><p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-slate-400 bg-[#02040a]/30 backdrop-blur-sm rounded-[1rem] border border-dashed border-white/10 font-bold text-xs sm:text-sm m-2 shadow-inner">لا توجد نتائج اختبارات حالياً</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>  
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {studentData?.id && !isSuspenseGlobal && !isMyResultPublished && (
         <StudentEvaluationGate studentId={studentData.id} sectionId={studentData.section_id || studentData.sections?.id} />
      )}

      {/* 🚀 البطاقة المخفية في الـ DOM لكي يتم رسمها وطباعتها بدقة عالية بعيداً عن ألوان الـ Dark Mode */}
      {seatAllocation && (
        <div style={{ position: 'fixed', top: '-9999px', left: 0, zIndex: -9999, opacity: 1, pointerEvents: 'none' }}>
           <div ref={printRef} style={{ width: '85mm', height: '55mm', backgroundColor: 'white', color: 'black', border: '3px solid black', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', boxSizing: 'border-box', fontFamily: '"Cairo", sans-serif', direction: 'rtl' }}>
              <div style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid black', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '900', fontSize: '11px', color: 'black', margin: 0, padding: 0 }}>مدرسة الرفعة النموذجية بنين</div>
                    <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>بطاقة دخول اختبارات نهاية العام</div>
                 </div>
                 <div style={{ backgroundColor: 'black', color: 'white', padding: '3px 8px', fontWeight: '900', fontSize: '10px', border: '1px solid black', borderRadius: '6px' }}>{seatAllocation.exam_committees?.name}</div>
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                 <div style={{ width: '22mm', height: '22mm', padding: '2px', border: '2px solid #1e293b', borderRadius: '8px', flexShrink: 0 }}>
                    <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                 </div>
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>اسم الطالب</div>
                    <div style={{ minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                       <h2 style={{ fontSize: '14px', fontWeight: '900', color: 'black', lineHeight: '1.2', margin: 0, padding: 0 }}>{rawFullName}</h2>
                    </div>
                    <div style={{ marginTop: '2px' }}>
                       <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '2px solid #1e293b', padding: '3px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '10px', color: '#0f172a' }}>{classNameStr}</span>
                    </div>
                 </div>
                 <div style={{ borderRight: '3px solid #cbd5e1', paddingRight: '12px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '22mm', flexShrink: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>رقم الجلوس</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'black', lineHeight: '1' }}>{seatAllocation.seat_number}</div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* نافذة تقديم العذر */}
      <AnimatePresence>
        {isExcuseModalOpen && (
          <Dialog.Root open={isExcuseModalOpen} onOpenChange={setIsExcuseModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-50 no-print" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-panel rounded-[2.5rem] w-[95%] max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 p-6 sm:p-8 border-white/10 no-print" dir="rtl">
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 drop-shadow-md"><Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" /> تقديم عذر طبي</Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-300 mt-2">يرجى تعبئة تفاصيل الغياب وإرفاق التقرير لاعتماده من الإدارة.</p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90 shadow-inner"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Dialog.Close>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-3 bg-[#02040a]/40 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/5 shadow-inner">
                    <label className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> أيام الغياب المراد تبريرها</label>
                    <div className="flex items-center gap-2">
                      <input type="date" value={currentDateInput} onChange={(e) => setCurrentDateInput(e.target.value)} className="flex-1 glass-input p-3 text-xs sm:text-sm font-bold" style={{ colorScheme: 'dark' }} />
                      <button type="button" onClick={handleAddDate} className="bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-900 rounded-xl px-4 py-3 font-black text-xs sm:text-sm transition-all shadow-inner active:scale-95">إضافة</button>
                    </div>
                    {excuseForm.absent_dates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                        {excuseForm.absent_dates.map(date => (
                          <div key={date} className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-200" dir="ltr">{date}</span>
                            <button type="button" onClick={() => handleRemoveDate(date)} className="text-rose-400 hover:text-rose-300 drop-shadow-sm"><Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
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
                              <button key={p} type="button" onClick={() => togglePeriod(p)} className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all border shadow-inner backdrop-blur-md", excuseForm.target_periods.includes(p) ? "bg-amber-500/80 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/40 hover:bg-white/10")}>{p}</button>
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
                      {isUploadingReport ? <div className="flex flex-col items-center gap-2 text-amber-400"><Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /><span className="text-[10px] sm:text-xs font-black">جاري الرفع السحابي...</span></div> : excuseForm.attachment_url ? <div className="flex flex-col items-center gap-2 text-emerald-400 drop-shadow-sm"><CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-black text-center">تم الإرفاق بنجاح</span></div> : <div className="flex flex-col items-center gap-2 text-slate-400 drop-shadow-sm"><UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" /><span className="text-[10px] sm:text-xs font-bold text-center">اضغط لاختيار صورة</span></div>}
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest drop-shadow-sm">ملاحظات (اختياري)</label>
                    <textarea value={excuseForm.reason} onChange={(e) => setExcuseForm({...excuseForm, reason: e.target.value})} placeholder="اكتب أي تفاصيل إضافية هنا..." className="w-full glass-input p-3 sm:p-4 text-xs sm:text-sm font-bold h-20 sm:h-24 resize-none" />
                  </div>
                </div>
                <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={handleSubmitExcuse} disabled={isSubmittingExcuse} className="flex-1 py-3.5 sm:py-4 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 border border-amber-300"><Loader2 className={cn("w-5 h-5", isSubmittingExcuse ? "animate-spin" : "hidden")} /> إرسال الطلب</button>
                  <button onClick={() => setIsExcuseModalOpen(false)} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl transition-all border border-white/10 text-sm sm:text-base active:scale-95 shadow-inner backdrop-blur-sm">إلغاء</button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
