// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, 
  FileText, GraduationCap, LayoutDashboard, 
  TrendingUp, AlertCircle, Bell, ChevronLeft,
  Award, Target, BarChart2, Lock, Star, ChevronRight, Play,
  AlertTriangle, ShieldAlert, Calculator, Loader2, UserCircle, Users,
  Siren, Info, MessageSquare, Sparkles, Stethoscope, UploadCloud, X, Plus, Trash2,
  Ticket, Timer, FileKey, Download, ShieldCheck, ScrollText, Coins, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';

// 🚀 مسارات نسبية
import AnnouncementsWidget from '../../../components/AnnouncementsWidget';
import { useDashboardSystem } from '../../../hooks/useDashboardSystem';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth-context';
import { cn } from '../../../lib/utils';

const checkIsLocked = (examData: any) => {
  if (!examData?.exam_date) return false;
  try {
    const now = new Date();
    const examDate = new Date(examData.exam_date);
    const endTimeParts = (examData.end_time || '23:59').split(':');
    examDate.setHours(parseInt(endTimeParts[0], 10), parseInt(endTimeParts[1], 10), 0);
    return now <= examDate;
  } catch(e) {
    return false;
  }
};

const StarRating = ({ rating, setRating, label }: { rating: number, setRating: (r: number) => void, label: string }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">{label}</label>
    <div className="flex gap-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          onClick={() => setRating(star)} 
          className={cn(
            "w-8 h-8 cursor-pointer transition-all hover:scale-110 active:scale-95", 
            star <= rating ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" : "fill-slate-800 text-slate-700 hover:text-amber-400/50"
          )} 
        />
      ))}
    </div>
  </div>
);

export default function StudentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  const { fetchStudentDashboardData, updateStudentTrack } = useDashboardSystem();

  const [studentData, setStudentData] = useState<any>(null);
  const [attendanceStats, setAttendanceStats] = useState<any>({ rate: 100 });
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [todaysSchedule, setTodaysSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [myBadges, setMyBadges] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [absentPeriods, setAbsentPeriods] = useState<number>(0);
  const [fullDaysAbsent, setFullDaysAbsent] = useState<number>(0);

  // حالات نظام الأعذار الطبية للطالب
  const [excuses, setExcuses] = useState<any[]>([]);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);
  
  // حالات منظومة الاختبارات التفاعلية
  const [seatAllocation, setSeatAllocation] = useState<any>(null);
  const [examTimetables, setExamTimetables] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);

  // حالات وثائق التخرج
  const [docRequest, setDocRequest] = useState({ cert_ar: 0, cert_en: 0, twimc_ar: 0, twimc_en: 0, conduct_ar: 0, conduct_en: 0 });
  const [existingDocRequest, setExistingDocRequest] = useState<any>(null);
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);

  // 🚀 بوابة التقييم الإجبارية (تم إصلاحها لتشمل كل الجداول)
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [currentEvalIndex, setCurrentEvalIndex] = useState(0);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalForm, setEvalForm] = useState({ scientific: 0, management: 0, humanity: 0, feedback: '' });

  const isFetchingRef = useRef(false);

  const [currentDateInput, setCurrentDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [excuseForm, setExcuseForm] = useState({
    absent_dates: [format(new Date(), 'yyyy-MM-dd')],
    duration_type: 'full_day',
    target_periods: [] as number[],
    reason: '',
    attachment_url: '',
    cloudinary_public_id: ''
  });

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id || authRole !== 'student' || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      setLoading(true);
      
      const data = await fetchStudentDashboardData(true); 
      
      if (data && data.student) {
        setStudentData(data.student);
        setUpcomingExams(data.exams || []);
        setUpcomingAssignments(data.assignments || []);
        setTodaysSchedule(data.todaysSchedule || []);
        setPeriods(data.periods || []);
        setAttendanceStats({ rate: data.attendanceRate || 100 });

        // 🚀 إصلاح الرسم البياني: اعتماد درجات الهوك الأصلية مباشرة بدون الكتابة فوقها
        if (data.grades && data.grades.length > 0) {
           const safeGrades = data.grades.map((g: any) => ({
             ...g,
             exam: g.exam || g.exams || { title: 'اختبار', subjects: { name: 'مادة' } }
           }));
           setRecentGrades(safeGrades);
        } else {
           setRecentGrades([]);
        }

        const studentId = data.student.id;
        
        if (studentId) {
            const [
              badgesRes, absentCountRes, totalCountRes, excusesRes, trackRes, docsRes, settingsRes 
            ] = await Promise.all([
              supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', studentId).order('granted_at', { ascending: false }),
              supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId).eq('status', 'absent'),
              supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId),
              supabase.from('absence_excuses').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
              supabase.from('students').select('next_year_track, track_selection_date, sections(id, name, classes(name, level))').eq('id', studentId).maybeSingle(),
              supabase.from('graduation_documents').select('*').eq('student_id', studentId).eq('academic_year', '2025-2026').maybeSingle(),
              supabase.from('platform_settings').select('is_evaluations_active').limit(1).maybeSingle()
            ]);
            
            if (badgesRes.data) setMyBadges(badgesRes.data);
            if (excusesRes.data) setExcuses(excusesRes.data);
            if (docsRes.data) setExistingDocRequest(docsRes.data);

            if (trackRes.data) {
                setStudentData((prev: any) => ({ ...prev, ...trackRes.data }));
            }

            if (!absentCountRes.error && absentCountRes.count !== null) {
              setAbsentPeriods(absentCountRes.count);
              setFullDaysAbsent(Math.floor(absentCountRes.count / 5)); 
              if (totalCountRes.count && totalCountRes.count > 0) {
                const calculatedRate = Math.round(((totalCountRes.count - absentCountRes.count) / totalCountRes.count) * 100);
                setAttendanceStats({ rate: calculatedRate });
              } else {
                setAttendanceStats({ rate: 100 });
              }
            }

            // 🚀 نظام التقييم الإجباري للجامعة (معزول وآمن يعتمد على كافة الجداول)
            const sectionIdForEvals = trackRes.data?.sections?.id || data.student.section_id;
            const isEvalActive = settingsRes.data?.is_evaluations_active === true;
            
            if (isEvalActive && sectionIdForEvals) {
               try {
                   let allTeachersRaw = [];

                   // المحاولة 1: جدول إسناد المعلمين الحديث
                   const { data: taData } = await supabase.from('teacher_assignments').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionIdForEvals);
                   if (taData && taData.length > 0) allTeachersRaw = taData;
                   else {
                      // المحاولة 2: جدول إسناد المعلمين القديم
                      const { data: tsData } = await supabase.from('teacher_sections').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionIdForEvals);
                      if (tsData && tsData.length > 0) allTeachersRaw = tsData;
                      else {
                         // المحاولة 3: جدول الحصص الآلي
                         const { data: autoData } = await supabase.from('auto_schedules').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionIdForEvals);
                         if (autoData && autoData.length > 0) allTeachersRaw = autoData;
                         else {
                            // المحاولة 4: جدول الحصص اليدوي
                            const { data: schedData } = await supabase.from('schedules').select('teacher_id, teachers(users(full_name, avatar_url)), subjects(name)').eq('section_id', sectionIdForEvals);
                            allTeachersRaw = schedData || [];
                         }
                      }
                   }

                   if (allTeachersRaw && allTeachersRaw.length > 0) {
                      const uniqueMap = new Map();
                      allTeachersRaw.forEach((slot:any) => {
                         if(slot.teacher_id && !uniqueMap.has(slot.teacher_id)) {
                            const u = Array.isArray(slot.teachers?.users) ? slot.teachers.users[0] : slot.teachers?.users;
                            uniqueMap.set(slot.teacher_id, {
                               teacher_id: slot.teacher_id,
                               full_name: u?.full_name || 'معلم',
                               avatar_url: u?.avatar_url,
                               subject_name: Array.isArray(slot.subjects) ? slot.subjects[0]?.name : slot.subjects?.name || 'مادة'
                            });
                         }
                      });
                      const allMyTeachers = Array.from(uniqueMap.values());

                      const { data: myEvals } = await supabase
                         .from('student_evaluations_of_teachers')
                         .select('teacher_id')
                         .eq('student_id', studentId)
                         .eq('academic_year', currentYear)
                         .eq('semester', currentSemester);

                      const evalIds = new Set((myEvals || []).map(e => e.teacher_id));
                      const pending = allMyTeachers.filter(t => !evalIds.has(t.teacher_id));
                      
                      if(pending.length > 0) {
                         setPendingEvaluations(pending);
                         setIsEvalModalOpen(true); 
                      }
                   }
               } catch (evalErr) { console.error("Gatekeeper Error:", evalErr); }
            }

            // جلب بيانات المنظومة الامتحانية
            try {
               const classLevelStr = String(trackRes.data?.sections?.classes?.name || data.student?.sections?.classes?.name || data.student?.class_name || '');
               const cLevel = (classLevelStr.includes('10') || classLevelStr.includes('عاشر')) ? 10 : (classLevelStr.includes('11') || classLevelStr.includes('حادي عشر')) ? 11 : (classLevelStr.includes('12') || classLevelStr.includes('ثاني عشر')) ? 12 : null;
               
               if (cLevel) {
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
    } catch (error) { console.error('Error fetching dashboard data:', error); } 
    finally { setLoading(false); isFetchingRef.current = false; }
  }, [fetchStudentDashboardData, user?.id, authRole]);

  useEffect(() => { if (!isChecking && user) fetchData(); }, [fetchData, isChecking, user]);

  // إرسال التقييم
  const handleEvalSubmit = async () => {
     if(evalForm.scientific === 0 || evalForm.management === 0 || evalForm.humanity === 0) {
        alert('يرجى تقييم جميع المحاور للمتابعة!'); return;
     }
     setIsSubmittingEval(true);
     try {
        const currentTeacher = pendingEvaluations[currentEvalIndex];
        const payload = {
           student_id: studentData.id,
           teacher_id: currentTeacher.teacher_id,
           subject_name: currentTeacher.subject_name,
           academic_year: currentYear,
           semester: currentSemester,
           scientific_rating: evalForm.scientific,
           management_rating: evalForm.management,
           humanity_rating: evalForm.humanity,
           feedback: evalForm.feedback || ''
        };
        const { error } = await supabase.from('student_evaluations_of_teachers').insert([payload]);
        if(error && !error.message.includes('duplicate key')) throw error; 

        setEvalForm({ scientific: 0, management: 0, humanity: 0, feedback: '' });
        
        if (currentEvalIndex + 1 < pendingEvaluations.length) {
           setCurrentEvalIndex(prev => prev + 1);
        } else {
           setIsEvalModalOpen(false);
           alert('شكراً لك! مساهمتك ستساعدنا في تطوير العملية التعليمية. تم فتح لوحة التحكم لك الآن.');
        }
     } catch (error:any) {
        alert('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
     } finally {
        setIsSubmittingEval(false);
     }
  };

  const handleDocChange = (field: string, delta: number) => { setDocRequest(prev => { const newVal = Math.max(0, prev[field as keyof typeof prev] + delta); return { ...prev, [field]: newVal }; }); };
  const totalDocsCost = Object.values(docRequest).reduce((a, b) => a + b, 0);
  const submitDocRequest = async () => {
    if (totalDocsCost === 0) { alert('يرجى تحديد نسخة واحدة على الأقل'); return; }
    if (!confirm(`إجمالي المبلغ المطلوب هو ${totalDocsCost} دينار كويتي. هل أنت متأكد من تقديم الطلب؟`)) return;
    setIsSubmittingDocs(true);
    try {
      const payload = { student_id: studentData.id, academic_year: currentYear, cert_ar: docRequest.cert_ar, cert_en: docRequest.cert_en, twimc_ar: docRequest.twimc_ar, twimc_en: docRequest.twimc_en, conduct_ar: docRequest.conduct_ar, conduct_en: docRequest.conduct_en, total_amount: totalDocsCost, payment_status: 'pending' };
      const { error } = await supabase.from('graduation_documents').insert([payload]);
      if (error) throw error;
      alert('تم تقديم طلب الوثائق بنجاح! يرجى التوجه لمسؤول المدرسة لدفع المبلغ واعتماد الطلب للمندوب.');
      fetchData(); 
    } catch (e) { alert('حدث خطأ أثناء التقديم.'); } finally { setIsSubmittingDocs(false); }
  };

  const handleAddDate = () => { if (!currentDateInput) return; if (excuseForm.absent_dates.includes(currentDateInput)) { alert('هذا التاريخ مضاف مسبقاً.'); return; } setExcuseForm(prev => ({ ...prev, absent_dates: [...prev.absent_dates, currentDateInput].sort() })); };
  const handleRemoveDate = (dateToRemove: string) => { setExcuseForm(prev => ({ ...prev, absent_dates: prev.absent_dates.filter(d => d !== dateToRemove) })); };
  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsUploadingReport(true);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) { setExcuseForm(prev => ({ ...prev, attachment_url: data.secure_url, cloudinary_public_id: data.public_id })); } else { throw new Error('Upload failed'); }
    } catch (err) { alert('فشل رفع الملف. تأكد من جودة اتصالك أو حاول مجدداً.'); } finally { setIsUploadingReport(false); }
  };
  const handleSubmitExcuse = async () => {
    if (excuseForm.absent_dates.length === 0) { alert('يرجى تحديد يوم غياب واحد على الأقل.'); return; }
    if (!excuseForm.attachment_url) { alert('يرجى إرفاق التقرير الطبي أو الإثبات أولاً.'); return; }
    if (excuseForm.duration_type === 'partial_day' && excuseForm.target_periods.length === 0) { alert('يرجى تحديد الحصص التي غبت عنها.'); return; }
    setIsSubmittingExcuse(true);
    try {
      const payload = { student_id: studentData.id, submitted_by: user.id, submitter_role: 'student', excuse_date: excuseForm.absent_dates[0], absent_dates: excuseForm.absent_dates, duration_type: excuseForm.duration_type, target_periods: excuseForm.duration_type === 'partial_day' ? excuseForm.target_periods : [], reason: excuseForm.reason, attachment_url: excuseForm.attachment_url, cloudinary_public_id: excuseForm.cloudinary_public_id, status: 'pending' };
      const { error } = await supabase.from('absence_excuses').insert([payload]);
      if (error) throw error;
      alert('تم تقديم العذر بنجاح! نتمى لك دوام الصحة والعافية. طلبك الآن قيد المراجعة.');
      setIsExcuseModalOpen(false); setExcuseForm({ absent_dates: [format(new Date(), 'yyyy-MM-dd')], duration_type: 'full_day', target_periods: [], reason: '', attachment_url: '', cloudinary_public_id: '' }); fetchData();
    } catch (error: any) { alert('حدث خطأ أثناء التقديم: ' + error.message); } finally { setIsSubmittingExcuse(false); }
  };
  const togglePeriod = (periodNum: number) => { setExcuseForm(prev => { const exists = prev.target_periods.includes(periodNum); if (exists) return { ...prev, target_periods: prev.target_periods.filter(p => p !== periodNum) }; return { ...prev, target_periods: [...prev.target_periods, periodNum].sort((a,b) => a - b) }; }); };
  const handleTrackSelection = async (track: 'scientific' | 'literary') => { try { await updateStudentTrack(track); fetchData(); } catch (error) {} };

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try { return format(new Date(dateStr), formatStr, { locale: arSA }); } catch (e) { return fallback; }
  };

  const nextOfficialExam = examTimetables.find(ex => { const exDate = new Date(`${ex.exam_date}T${ex.start_time}`); return currentTime && exDate > currentTime; });
  let countdownStr = '';
  if (nextOfficialExam && currentTime) {
      const exDate = new Date(`${nextOfficialExam.exam_date}T${nextOfficialExam.start_time}`);
      const diff = exDate.getTime() - currentTime.getTime();
      if (diff > 0) {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24)); const h = Math.floor((diff / (1000 * 60 * 60)) % 24); const m = Math.floor((diff / 1000 / 60) % 60);
          countdownStr = `${d > 0 ? d + ' يوم و ' : ''}${h} ساعة و ${m} دقيقة`;
      }
  }

  if (isChecking || loading || !mounted) return <div className="flex h-screen items-center justify-center bg-[#090b14]"><Loader2 className="w-12 h-12 animate-spin text-blue-500" /></div>;
  if (authRole !== 'student') return <div className="flex h-screen items-center justify-center bg-[#090b14] text-white">وصول مقيد. للطلاب فقط.</div>;

  const rawFullName = studentData?.users?.full_name || studentData?.full_name || user?.user_metadata?.full_name || 'بطلنا';
  const displayFirstName = rawFullName.split(' ')[0];
  const classNameStr = String(studentData?.sections?.classes?.name || studentData?.class_name || '');
  const sectionNameStr = String(studentData?.sections?.name || studentData?.section_name || 'غير محدد');
  const isTenthGrade = classNameStr.includes('10') || classNameStr.includes('عاشر');
  const isTwelfthGrade = classNameStr.includes('12') || classNameStr.includes('ثاني عشر');
  const hasSelectedTrack = !!studentData?.next_year_track;
  
  const avgScore = recentGrades.length > 0 ? Math.round(recentGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / recentGrades.length) : 0;
  const avatarUrl = studentData?.users?.avatar_url || studentData?.avatar_url;
  
  // 🚀 تحسين شفرة الـ QR لتظهر كاملة داخل الإطار
  const qrPayload = `raf-id:${studentData?.id}`; 
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=1`;

  let warningLevel = 0; let warningTitle = ""; let warningMessage = ""; let warningColors = ""; let warningIconColor = ""; let WarningIcon = Info; let warningPulse = false;
  if (absentPeriods >= 100) { warningLevel = 4; warningTitle = "إشعار فصل نهائي"; warningMessage = "تجاوزت 100 حصة غياب."; warningColors = "from-slate-900 via-rose-950 to-slate-900 border-rose-500/80 text-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.4)]"; warningIconColor = "text-rose-500"; WarningIcon = Siren; warningPulse = true; } 
  else if (absentPeriods >= 75) { warningLevel = 3; warningTitle = "إنذار ثالث"; warningMessage = "غيابك بمرحلة حرجة."; warningColors = "from-rose-500/20 to-red-600/20 border-rose-500/60 text-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.2)]"; warningIconColor = "text-rose-500"; WarningIcon = ShieldAlert; warningPulse = true; } 
  else if (absentPeriods >= 50) { warningLevel = 2; warningTitle = "إنذار ثاني"; warningMessage = "برر غيابك فوراً."; warningColors = "from-orange-500/20 to-amber-600/20 border-orange-500/50 text-orange-500"; warningIconColor = "text-orange-500"; WarningIcon = AlertTriangle; } 
  else if (absentPeriods >= 25) { warningLevel = 1; warningTitle = "إنذار أول"; warningMessage = "الالتزام بالحضور مطلوب."; warningColors = "from-amber-500/20 to-yellow-600/20 border-amber-500/50 text-amber-500"; warningIconColor = "text-amber-500"; WarningIcon = AlertTriangle; }
  const dangerPercentage = Math.min((absentPeriods / 100) * 100, 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen relative bg-transparent text-slate-100 pb-32 font-cairo pt-6" dir="rtl">
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 🚀 الهيدر الرئيسي */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-10 text-white shadow-2xl border border-white/10">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-right">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 bg-[#0f1423] flex items-center justify-center relative">
                {avatarUrl ? <img src={avatarUrl} alt="av" className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-blue-400">{rawFullName.charAt(0)}</span>}
                <div className="absolute bottom-2 left-2 w-5 h-5 bg-emerald-400 border-4 border-[#02040a] rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-black mb-2 leading-tight">وفقك الله يا {displayFirstName} 🌟</h1>
                <p className="text-slate-300 font-bold text-sm sm:text-base">{classNameStr} - {sectionNameStr}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <p className="text-[10px] text-slate-400 uppercase font-bold">الحضور</p>
                <p className="text-2xl font-black text-emerald-400">{attendanceStats.rate}%</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center min-w-[100px]">
                <p className="text-[10px] text-slate-400 uppercase font-bold">المتوسط</p>
                <p className="text-2xl font-black text-amber-400">{avgScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 الهوية الامتحانية - مع إصلاح الـ QR */}
        <AnimatePresence>
          {seatAllocation && (
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative overflow-hidden rounded-[2.5rem] bg-[#02040a] p-6 sm:p-10 border-[3px] border-[#0f1423] shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 group">
                <div className="absolute inset-0 bg-rose-600/5 blur-[100px] pointer-events-none"></div>
                <div className="flex-1 text-center lg:text-right relative z-10">
                   <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black mb-4">
                     <Ticket className="w-4 h-4" /> بطاقة دخول الاختبار
                   </div>
                   <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">رقم جلوسك المعتمد: <span className="text-rose-500">{seatAllocation.seat_number}</span></h2>
                   <p className="text-slate-300 font-bold text-sm sm:text-lg">لجنتك: <span className="text-white bg-rose-500/20 px-3 py-1 rounded-xl">{seatAllocation.exam_committees?.name}</span></p>
                   <p className="text-[10px] text-slate-500 mt-4">📍 الموقع: {seatAllocation.exam_committees?.location || 'المبنى الرئيسي'}</p>
                </div>
                
                {/* 🚀 البطاقة المحسنة لمنع إخفاء الـ QR */}
                <div className="shrink-0 perspective-1000 hidden md:block">
                   <div className="w-[65mm] min-h-[100mm] pb-4 border-[4px] border-slate-900 rounded-[2rem] relative flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-white group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-[25mm] bg-slate-900 pt-3 border-b-[3px] border-slate-700 shrink-0">
                         <p className="text-white font-black text-[13px] tracking-wide">مدرسة الرفعة النموذجية بنين</p>
                         <div className="mt-1.5 bg-slate-100 px-3 py-1 rounded-full inline-flex"><p className="text-slate-900 font-black text-[9px]">{seatAllocation.exam_committees?.name}</p></div>
                      </div>
                      <div className="w-[22mm] h-[22mm] -mt-[11mm] rounded-2xl bg-white border-4 border-white shadow-xl overflow-hidden z-10 shrink-0">
                         {avatarUrl ? <img src={avatarUrl} crossOrigin="anonymous" alt="Student" className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-slate-300" />}
                      </div>
                      <div className="w-full px-4 flex-1 flex flex-col items-center justify-between mt-3">
                         <div>
                            <h2 className="text-[15px] font-black text-slate-900 line-clamp-2 leading-tight">{rawFullName}</h2>
                            <p className="text-[10px] font-bold text-slate-500 mb-2 border-b-2 border-slate-200 pb-1 w-full">{classNameStr}</p>
                         </div>
                         <div className="flex flex-col items-center mt-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">رقم الجلوس</p>
                            <p className="text-3xl font-black text-rose-600 tracking-widest drop-shadow-sm">{seatAllocation.seat_number}</p>
                         </div>
                         <div className="mt-3 w-[20mm] h-[20mm] bg-white p-1 rounded-lg border-2 border-slate-800 shrink-0">
                            <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" />
                         </div>
                      </div>
                   </div>
                </div>

                {/* 🚀 نسخة الموبايل للـ QR */}
                <div className="w-full md:hidden bg-white border-[3px] border-slate-800 rounded-3xl p-5 shadow-2xl flex items-center gap-4 relative z-10">
                   <div className="w-20 h-20 bg-white p-1 rounded-xl border-2 border-slate-800 shrink-0">
                      <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" />
                   </div>
                   <div className="flex-1 text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">لجنة الاختبار</p>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{seatAllocation.exam_committees?.name}</h3>
                   </div>
                   <div className="shrink-0 text-center border-r-2 border-slate-200 pr-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">الجلوس</p>
                      <p className="text-2xl font-black text-rose-600 tracking-widest">{seatAllocation.seat_number}</p>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 وثائق التخرج */}
        <AnimatePresence>
          {isTwelfthGrade && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full">
              {existingDocRequest ? (
                <div className="bg-gradient-to-l from-emerald-900/40 to-[#0f1423] border border-emerald-500/30 rounded-[2rem] p-6 sm:p-8 flex items-center justify-between gap-6 shadow-lg backdrop-blur-xl">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/50"><ScrollText className="w-8 h-8 text-emerald-400" /></div>
                      <div>
                         <h3 className="text-xl sm:text-2xl font-black text-white">تم استلام طلب الوثائق بنجاح! 🎉</h3>
                         <p className="text-sm font-bold text-emerald-200/80">المبلغ المطلوب: {existingDocRequest.total_amount} د.ك</p>
                      </div>
                   </div>
                   <div className={`px-6 py-3 rounded-xl border font-black text-sm shadow-inner ${existingDocRequest.payment_status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                      {existingDocRequest.payment_status === 'pending' ? 'بانتظار الدفع بالمدرسة ⏳' : 'مدفوع وجاري التصديق ✅'}
                   </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#1e1b4b] to-[#0f1423] border border-fuchsia-500/30 rounded-[2.5rem] p-6 sm:p-10 shadow-xl relative overflow-hidden">
                   <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-8">
                      <div className="p-4 bg-fuchsia-500/20 rounded-3xl border border-fuchsia-400/50"><ScrollText className="w-10 h-10 text-fuchsia-400" /></div>
                      <div>
                         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-black mb-2 border border-fuchsia-500/30">خاص بخريجي الثاني عشر 🎓</div>
                         <h2 className="text-2xl sm:text-3xl font-black text-white">بوابة طلب الوثائق والتصديقات</h2>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                      {['cert_ar', 'cert_en', 'twimc_ar', 'twimc_en', 'conduct_ar', 'conduct_en'].map(f => (
                         <div key={f} className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300">{f.includes('cert') ? 'شهادة ثانوية' : f.includes('twimc') ? 'لمن يهمه الأمر' : 'سيرة وسلوك'} ({f.includes('_ar')?'ع':'E'})</span>
                            <div className="flex items-center gap-2">
                               <button onClick={() => handleDocChange(f, -1)} className="w-6 h-6 bg-slate-800 rounded font-black">-</button>
                               <span className="text-xs font-black w-4 text-center">{docRequest[f]}</span>
                               <button onClick={() => handleDocChange(f, 1)} className="w-6 h-6 bg-fuchsia-600 rounded font-black">+</button>
                            </div>
                         </div>
                      ))}
                   </div>
                   <div className="bg-black/40 border border-white/5 rounded-2xl p-6 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-fuchsia-500/20 rounded-xl"><Coins className="w-8 h-8 text-fuchsia-400" /></div>
                         <div><p className="text-sm font-bold text-slate-400 mb-1">الإجمالي</p><p className="text-3xl font-black text-white">{totalDocsCost} د.ك</p></div>
                      </div>
                      <button onClick={submitDocRequest} disabled={totalDocsCost === 0 || isSubmittingDocs} className="px-10 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black rounded-2xl transition-all disabled:opacity-50">تقديم الطلب</button>
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 الجدول الدراسي والتطور الأكاديمي */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              
              {/* جدول الحصص */}
              <div className="glass-panel rounded-[2rem] relative overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-[#02040a]/40 flex justify-between items-center">
                  <h2 className="text-xl font-black text-white flex items-center gap-3"><Clock className="w-6 h-6 text-blue-400" /> جدول حصص اليوم</h2>
                  <Link href="/dashboard/student/schedule" className="text-sm font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20">الجدول الكامل</Link>
                </div>
                <div className="p-6">
                  {todaysSchedule.length > 0 ? (
                    <div className="space-y-4">
                      {todaysSchedule.map((item, i) => {
                        let current = false; let isPast = false;
                        if (item.start_time && item.end_time && currentTime) {
                            const [startH, startM] = item.start_time.split(':').map(Number);
                            const [endH, endM] = item.end_time.split(':').map(Number);
                            const now = currentTime;
                            const start = new Date(now); start.setHours(startH, startM, 0);
                            const end = new Date(now); end.setHours(endH, endM, 0);
                            if (now >= start && now <= end) current = true; else if (now > end) isPast = true;
                        }
                        return (
                          <div key={i} className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between", current ? "bg-[#0f1423] border-blue-500/50 shadow-lg scale-[1.02]" : isPast ? "bg-white/5 border-white/5 opacity-50" : "bg-[#02040a]/60 border-white/10")}>
                            <div className="flex items-center gap-4">
                              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black", current ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400")}>{item.period}</div>
                              <div>
                                <h3 className={cn("font-black", current ? "text-blue-400" : "text-white")}>{item.subjects?.name}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">أ. {item.teachers?.users?.full_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {current && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2 py-1 rounded-md mb-1 inline-block animate-pulse">الحصة الآن</span>}
                              <p className="text-xs font-black text-slate-500" dir="ltr">{item.start_time?.substring(0,5)} - {item.end_time?.substring(0,5)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="text-center py-12 text-slate-500 font-bold bg-white/5 rounded-2xl border border-dashed border-white/10">لا توجد حصص مجدولة اليوم</div>}
                </div>
              </div>

              {/* 🚀 تطور المستوى - تم الإصلاح لاعتماد درجات الهوك */}
              <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden h-[300px]">
                <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6"><TrendingUp className="w-6 h-6 text-emerald-400" /> تطور المستوى الأكاديمي</h2>
                {recentGrades.length > 0 ? (
                  <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={recentGrades.map(g => ({ name: g.exam?.title, score: g.score })).reverse()}>
                      <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <Tooltip contentStyle={{background: '#02040a', border: '1px solid #34d399'}} itemStyle={{color: '#34d399', fontWeight: '900'}} />
                      <Area type="monotone" dataKey="score" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-500 font-bold text-sm bg-white/5 rounded-2xl border border-dashed border-white/10">لا توجد نتائج لعرض الرسم البياني</div>}
              </div>

           </div>

           <div className="space-y-6">
              <AnnouncementsWidget authRole="student" />

              {/* الأعذار الطبية */}
              <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-white flex items-center gap-2"><Stethoscope className="w-5 h-5 text-amber-400" /> سجل الأعذار</h2>
                  <button onClick={() => setIsExcuseModalOpen(true)} className="text-[10px] font-black bg-amber-500 text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-amber-400"><Plus className="w-3 h-3"/> عذر جديد</button>
                </div>
                <div className="space-y-3 max-h-[250px] overflow-auto custom-scrollbar pr-1">
                  {excuses.length > 0 ? excuses.map(exc => (
                    <div key={exc.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-black text-white">{safeFormat(exc.excuse_date, 'dd MMM yyyy')}</span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${exc.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : exc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{exc.status === 'pending' ? 'قيد المراجعة ⏳' : exc.status === 'approved' ? 'عذر مقبول ✓' : 'عذر مرفوض ✕'}</span>
                      </div>
                    </div>
                  )) : <div className="text-center py-6 text-slate-500 font-bold text-xs bg-white/5 rounded-xl border border-dashed border-white/10">لا يوجد سجل للأعذار</div>}
                </div>
              </div>

              {/* الأوسمة */}
              {myBadges.length > 0 && (
                <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden">
                  <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-400" /> أوسمة التميز</h2>
                  <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                    {myBadges.map((b, i) => (
                      <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/10 min-w-[120px] shrink-0 flex flex-col items-center text-center">
                        <div className="w-12 h-12 mb-2"><Image src={b.badge?.image_url || '/badge.png'} width={48} height={48} className="object-contain" /></div>
                        <p className="text-xs font-black text-white">{b.badge?.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>

      </div>

      {/* 🚀 بوابة التقييم الإجبارية (Gatekeeper Modal) - تعمل بشكل منفصل 100% */}
      <AnimatePresence>
        {isEvalModalOpen && pendingEvaluations.length > 0 && (
          <Dialog.Root open={isEvalModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/98 backdrop-blur-xl z-[9999]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl z-[9999] outline-none">
                 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#131836] border border-amber-500/50 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden" dir="rtl">
                    <div className="flex flex-col items-center text-center mb-6">
                       <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30"><Star className="w-8 h-8 text-amber-400" /></div>
                       <h2 className="text-2xl font-black text-white">تقييم جودة التدريس</h2>
                       <p className="text-xs font-bold text-amber-200/80 mt-2">مساهمتك سرية وتساعدنا في تحسين مدرستنا.</p>
                    </div>

                    <div className="bg-[#0a0d1a]/50 p-6 rounded-3xl border border-white/5">
                       <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                          <div className="w-12 h-12 bg-slate-800 rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                             {pendingEvaluations[currentEvalIndex]?.avatar_url ? <img src={pendingEvaluations[currentEvalIndex].avatar_url} className="w-full h-full object-cover" /> : <UserCircle className="w-8 h-8 text-slate-500"/>}
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-black text-white">{pendingEvaluations[currentEvalIndex]?.full_name}</p>
                             <p className="text-xs font-bold text-amber-400">مادة: {pendingEvaluations[currentEvalIndex]?.subject_name}</p>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <StarRating rating={evalForm.scientific} setRating={(r) => setEvalForm({...evalForm, scientific: r})} label="المحور العلمي (الشرح وتوصيل المعلومة)" />
                          <StarRating rating={evalForm.management} setRating={(r) => setEvalForm({...evalForm, management: r})} label="المحور الإداري (إدارة الفصل والوقت)" />
                          <StarRating rating={evalForm.humanity} setRating={(r) => setEvalForm({...evalForm, humanity: r})} label="المحور الإنساني (التعامل والتحفيز)" />
                          <textarea value={evalForm.feedback} onChange={(e) => setEvalForm({...evalForm, feedback: e.target.value})} placeholder="رسالة سرية للإدارة (اختياري)..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-amber-500/50 h-24 resize-none" />
                       </div>
                       <button onClick={handleEvalSubmit} disabled={isSubmittingEval || evalForm.scientific === 0 || evalForm.management === 0 || evalForm.humanity === 0} className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                          {isSubmittingEval ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5" /> إرسال والتقييم التالي</>}
                       </button>
                    </div>
                 </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; } `}</style>
    </motion.div>
  );
}
