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
  Ticket, Timer, FileKey, Download
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

export default function StudentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any; 
  
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

  // 🚀 حالات نظام الأعذار الطبية للطالب
  const [excuses, setExcuses] = useState<any[]>([]);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);
  
  // 🚀 حالات منظومة الاختبارات التفاعلية
  const [seatAllocation, setSeatAllocation] = useState<any>(null);
  const [examTimetables, setExamTimetables] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);

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

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { fetchStudentDashboardData, updateStudentTrack } = useDashboardSystem();

  const fetchData = useCallback(async () => {
    if (!user?.id || authRole !== 'student' || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      setLoading(true);
      
      const data = await fetchStudentDashboardData(true); 
      
      if (data) {
        setStudentData(data.student);
        setUpcomingExams(data.exams || []);
        setUpcomingAssignments(data.assignments || []);
        setTodaysSchedule(data.todaysSchedule || []);
        setPeriods(data.periods || []);

        const studentId = data.student?.id;
        
        if (studentId) {
            const [
              badgesRes,
              gradesRes,
              absentCountRes,
              totalCountRes,
              excusesRes,
              trackRes
            ] = await Promise.all([
              supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', studentId).order('granted_at', { ascending: false }),
              supabase.from('exam_attempts').select('*, exams(id, title, max_score, total_marks, exam_date, end_time, subjects(name))').eq('student_id', studentId).order('completed_at', { ascending: false }).limit(10),
              supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId).eq('status', 'absent'),
              supabase.from('attendance_records').select('id', { count: 'exact' }).eq('student_id', studentId),
              supabase.from('absence_excuses').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
              supabase.from('students').select('next_year_track, track_selection_date, sections(name, classes(name))').eq('id', studentId).maybeSingle()
            ]);
            
            if (badgesRes.data) setMyBadges(badgesRes.data);
            if (excusesRes.data) setExcuses(excusesRes.data);

            if (trackRes.data) {
                setStudentData((prev: any) => ({ ...prev, ...trackRes.data }));
            }

            if (gradesRes.data && gradesRes.data.length > 0) {
                const formattedGrades = gradesRes.data.map((g: any) => ({
                    ...g,
                    exam: { ...g.exams, subject: g.exams?.subjects }
                }));
                setRecentGrades(formattedGrades);
            } else {
                setRecentGrades(data.grades || []);
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

            // 🚀 جلب بيانات المنظومة الامتحانية بشكل معزول وآمن من أخطاء الـ Type
            try {
               const tData: any = trackRes.data;
               const sData: any = data.student;
               
               // تجاوز حماية TypeScript باستخدام any والمصفوفات
               const classLevelStr = String(
                 tData?.sections?.classes?.name || 
                 tData?.sections?.[0]?.classes?.name || 
                 sData?.sections?.classes?.name || 
                 sData?.sections?.[0]?.classes?.name || 
                 sData?.class_name || ''
               );
               
               const cLevel = (classLevelStr.includes('10') || classLevelStr.includes('عاشر')) ? 10 : (classLevelStr.includes('11') || classLevelStr.includes('حادي عشر')) ? 11 : null;
               
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
            } catch (examErr) {
               console.error('Error fetching exam system data:', examErr);
            }
        }
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchStudentDashboardData, user?.id, authRole]);

  const handleAddDate = () => {
    if (!currentDateInput) return;
    if (excuseForm.absent_dates.includes(currentDateInput)) {
      alert('هذا التاريخ مضاف مسبقاً.');
      return;
    }
    setExcuseForm(prev => ({
      ...prev,
      absent_dates: [...prev.absent_dates, currentDateInput].sort()
    }));
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setExcuseForm(prev => ({
      ...prev,
      absent_dates: prev.absent_dates.filter(d => d !== dateToRemove)
    }));
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReport(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        setExcuseForm(prev => ({ ...prev, attachment_url: data.secure_url, cloudinary_public_id: data.public_id }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      alert('فشل رفع الملف. تأكد من جودة اتصالك أو حاول مجدداً.');
    } finally {
      setIsUploadingReport(false);
    }
  };

  const handleSubmitExcuse = async () => {
    if (excuseForm.absent_dates.length === 0) {
      alert('يرجى تحديد يوم غياب واحد على الأقل.'); return;
    }
    if (!excuseForm.attachment_url) {
      alert('يرجى إرفاق التقرير الطبي أو الإثبات أولاً.'); return;
    }
    if (excuseForm.duration_type === 'partial_day' && excuseForm.target_periods.length === 0) {
      alert('يرجى تحديد الحصص التي غبت عنها.'); return;
    }

    setIsSubmittingExcuse(true);
    try {
      const payload = {
        student_id: studentData.id,
        submitted_by: user.id,
        submitter_role: 'student',
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

      alert('تم تقديم العذر بنجاح! نتمى لك دوام الصحة والعافية. طلبك الآن قيد المراجعة.');
      setIsExcuseModalOpen(false);
      setExcuseForm({ 
        absent_dates: [format(new Date(), 'yyyy-MM-dd')], 
        duration_type: 'full_day', target_periods: [], reason: '', attachment_url: '', cloudinary_public_id: '' 
      });
      fetchData();
    } catch (error: any) {
      alert('حدث خطأ أثناء التقديم: ' + error.message);
    } finally {
      setIsSubmittingExcuse(false);
    }
  };

  const togglePeriod = (periodNum: number) => {
    setExcuseForm(prev => {
      const exists = prev.target_periods.includes(periodNum);
      if (exists) return { ...prev, target_periods: prev.target_periods.filter(p => p !== periodNum) };
      return { ...prev, target_periods: [...prev.target_periods, periodNum].sort((a,b) => a - b) };
    });
  };

  const handleTrackSelection = async (track: 'scientific' | 'literary') => {
    try {
      await updateStudentTrack(track);
      fetchData();
    } catch (error) {
      console.error('Error selecting track:', error);
    }
  };

  useEffect(() => {
    if (!isChecking && user) fetchData();
  }, [fetchData, isChecking, user]);

  const safeFormat = (dateStr: any, formatStr: string, fallback = '...') => {
    if (!dateStr || !mounted) return fallback;
    try {
      return format(new Date(dateStr), formatStr, { locale: arSA });
    } catch (e) { return fallback; }
  };

  // 🚀 هندسة العداد التنازلي للاختبار
  const nextOfficialExam = examTimetables.find(ex => {
      const exDate = new Date(`${ex.exam_date}T${ex.start_time}`);
      return currentTime && exDate > currentTime;
  });

  let countdownStr = '';
  if (nextOfficialExam && currentTime) {
      const exDate = new Date(`${nextOfficialExam.exam_date}T${nextOfficialExam.start_time}`);
      const diff = exDate.getTime() - currentTime.getTime();
      if (diff > 0) {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const m = Math.floor((diff / 1000 / 60) % 60);
          countdownStr = `${d > 0 ? d + ' يوم و ' : ''}${h} ساعة و ${m} دقيقة`;
      }
  }

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

  if (authRole !== 'student') {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للطلاب فقط.</p>
        </div>
      </div>
    );
  }

  if (loading || !mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-transparent font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-500/10 border-t-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد لوحتك الدراسية...</p>
        </div>
      </div>
    );
  }

  const rawFullName = studentData?.users?.full_name || studentData?.user?.full_name || studentData?.full_name || user?.user_metadata?.full_name || 'بطلنا';
  const nameParts = rawFullName.split(' ');
  const displayFirstName = nameParts.length > 1 && nameParts[0].length <= 2 ? `${nameParts[0]} ${nameParts[1]}` : nameParts[0];
  
  const classNameStr = String(studentData?.sections?.classes?.name || studentData?.section?.classes?.name || studentData?.class_name || '');
  const sectionNameStr = String(studentData?.sections?.name || studentData?.section?.name || studentData?.section_name || 'غير محدد');
  const isTenthGrade = classNameStr.includes('العاشر') || classNameStr.includes('عاشر') || classNameStr.includes('10');
  const hasSelectedTrack = !!studentData?.next_year_track;
  
  const unlockedGrades = recentGrades.filter(g => !checkIsLocked(g.exam));
  const avgScore = unlockedGrades.length > 0 ? Math.round(unlockedGrades.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / unlockedGrades.length) : 0;
  const avatarUrl = studentData?.users?.avatar_url || studentData?.user?.avatar_url || studentData?.avatar_url;

  let warningLevel = 0;
  let warningTitle = "";
  let warningMessage = "";
  let warningColors = "";
  let warningIconColor = "";
  let WarningIcon = Info;
  let warningPulse = false;

  if (absentPeriods >= 100) {
    warningLevel = 4;
    warningTitle = "إشعار فصل نهائي";
    warningMessage = "لقد تجاوزت 100 حصة غياب. تم رفع ملفك للإدارة لاتخاذ إجراءات الفصل.";
    warningColors = "from-slate-900 via-rose-950 to-slate-900 border-rose-500/80 text-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.4)]";
    warningIconColor = "text-rose-500";
    WarningIcon = Siren;
    warningPulse = true;
  } else if (absentPeriods >= 75) {
    warningLevel = 3;
    warningTitle = "إنذار ثالث (خطر الفصل)";
    warningMessage = "غيابك وصل لمرحلة حرجة جداً. أي غياب إضافي سيعرضك للفصل النهائي من المدرسة.";
    warningColors = "from-rose-500/20 to-red-600/20 border-rose-500/60 text-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.2)]";
    warningIconColor = "text-rose-500";
    WarningIcon = ShieldAlert;
    warningPulse = true;
  } else if (absentPeriods >= 50) {
    warningLevel = 2;
    warningTitle = "إنذار ثاني للغياب";
    warningMessage = "استمرارك في الغياب يعرض مستقبلك الدراسي للخطر. يرجى تبرير غيابك فوراً.";
    warningColors = "from-orange-500/20 to-amber-600/20 border-orange-500/50 text-orange-500";
    warningIconColor = "text-orange-500";
    WarningIcon = AlertTriangle;
  } else if (absentPeriods >= 25) {
    warningLevel = 1;
    warningTitle = "إنذار أول للغياب";
    warningMessage = "لقد تجاوزت الحد المسموح للغياب. نأمل منك الالتزام بالحضور أو تقديم عذر طبي.";
    warningColors = "from-amber-500/20 to-yellow-600/20 border-amber-500/50 text-amber-500";
    warningIconColor = "text-amber-500";
    WarningIcon = AlertTriangle;
  }

  const dangerPercentage = Math.min((absentPeriods / 100) * 100, 100);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen relative bg-transparent text-slate-100 pb-32 overflow-x-hidden font-cairo pt-6" dir="rtl">
      
      <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 🚀 الهيدر الفخم الموحد للطلاب */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10">
          <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right w-full">
              <Link href={`/students/${user.id}`} className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-[#0f1423] backdrop-blur-md flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 group-hover:border-blue-500/50">
                  {avatarUrl ? <img src={avatarUrl} alt={rawFullName} className="w-full h-full object-cover" /> : <span className="text-4xl sm:text-5xl font-black text-blue-400 drop-shadow-md">{rawFullName.charAt(0)}</span>}
                </div>
                <div className="absolute inset-0 bg-blue-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                <div className="absolute bottom-2 left-2 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-400 border-4 border-[#02040a] rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
              </Link>

              <div className="pt-2 w-full">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)] text-blue-400">
                  <Star className="w-3.5 h-3.5" />
                  <span>لوحة تحكم الطالب</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight drop-shadow-lg leading-tight text-white">
                  مرحباً بك، {displayFirstName} 👋
                </h1>
                <p className="text-slate-300 text-sm sm:text-base font-bold flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-5">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 shrink-0" />
                  <span>مسجل في <strong className="text-white mx-1 drop-shadow-sm">{classNameStr || 'صف غير محدد'}</strong> شعبة <strong className="text-white mx-1 drop-shadow-sm">{sectionNameStr}</strong></span>
                </p>
                
                <Link href={`/students/${user.id}`} className="inline-flex items-center justify-center sm:justify-start gap-2 text-slate-300 hover:text-white font-bold text-sm bg-white/5 px-6 py-3 rounded-2xl border border-white/10 transition-all hover:bg-white/10 shadow-sm active:scale-95 w-full sm:w-auto">
                  <UserCircle className="w-4 h-4 text-blue-400" /> استعراض ملفي الأكاديمي الشامل
                </Link>
              </div>
            </div>

            <div className="flex flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:shrink-0 w-full lg:w-auto">
              <div className="rounded-2xl sm:rounded-[2rem] bg-[#02040a]/60 p-5 sm:p-6 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center min-w-[130px] shadow-inner hover:border-emerald-500/30 transition-colors flex-1 sm:flex-none">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">نسبة الحضور</p>
                <p className="text-3xl sm:text-4xl font-black text-emerald-400 drop-shadow-md">{attendanceStats?.rate || 0}%</p>
              </div>
              <div className="rounded-2xl sm:rounded-[2rem] bg-[#02040a]/60 p-5 sm:p-6 backdrop-blur-md border border-white/5 flex flex-col items-center justify-center min-w-[130px] shadow-inner hover:border-amber-500/30 transition-colors flex-1 sm:flex-none">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">المتوسط العام</p>
                <p className="text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-md">{avgScore}%</p>
              </div>
            </div>
          </div>

          {/* 🚀 قسم الأوسمة (لوحة الشرف) */}
          {myBadges.length > 0 && (
            <div className="relative z-10 mt-10 pt-6 border-t border-white/10 w-full">
              <h3 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm">
                <Award className="w-5 h-5 text-amber-400" /> لوحة الشرف: أوسمة التميز التي حصلت عليها
              </h3>
              <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {myBadges.map((badgeEntry, index) => (
                  <div key={badgeEntry.id || index} className="snap-center flex-shrink-0 bg-[#0f1423]/60 backdrop-blur-md rounded-[2rem] p-5 border border-white/5 flex items-center gap-4 w-[20rem] sm:w-[22rem] hover:bg-[#0f1423] transition-all duration-300 hover:border-amber-500/30 group cursor-default shadow-inner hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                      <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl group-hover:bg-amber-500/30 transition-colors"></div>
                      {badgeEntry.badge?.image_url ? (
                        <Image src={badgeEntry.badge.image_url} alt={badgeEntry.badge.name} fill unoptimized className="object-contain drop-shadow-2xl relative z-10" />
                      ) : <Award className="w-full h-full text-amber-400 relative z-10 drop-shadow-lg p-2" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-black text-white truncate drop-shadow-sm">{badgeEntry.badge?.name}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 line-clamp-2 mt-1 leading-tight" title={badgeEntry.reason}>{badgeEntry.reason || 'تقديراً للجهود'}</p>
                      <p className="text-[9px] text-slate-500 mt-2 bg-[#02040a]/80 w-fit px-2 py-1 rounded-lg border border-white/5">بتاريخ: {safeFormat(badgeEntry.granted_at, 'd MMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🚀 البانر السينمائي (مجلس الصف - للطالب) */}
        {studentData?.section_id && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(99,102,241,0.15)] border border-indigo-500/30 backdrop-blur-xl bg-[#0f1423]">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none z-0"></div>
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
                <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-indigo-500/20 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-indigo-500/40 shadow-inner shrink-0 relative">
                  <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 drop-shadow-lg" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f1423] shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
                </div>
                <div>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[#02040a]/80 backdrop-blur-sm text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 border border-indigo-500/30 text-indigo-400 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5" /> مجلس الصف الموحد
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1 text-white drop-shadow-md">النقاشات المدرسية الحية</h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-bold opacity-90 max-w-lg mx-auto md:mx-0">انضم لغرفة نقاش صفك للتواصل مع جميع معلميك وزملائك في مكان واحد، واستقبال إعلانات الفصل الهامة.</p>
                </div>
              </div>
              <Link href={`/messages?sectionId=${studentData.section_id}`} className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black rounded-2xl sm:rounded-[1.5rem] shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all hover:scale-105 active:scale-95 border border-indigo-400/50 w-full md:w-auto overflow-hidden shrink-0 z-10">
                <span className="relative z-10 flex items-center gap-2">دخول المجلس الآن <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" /></span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
              </Link>
            </div>
          </motion.div>
        )}

        {/* 🚀 بطاقة إنذار الغياب الذكية (Smart Warning Banner) */}
        <AnimatePresence>
          {warningLevel > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }} 
              animate={{ opacity: 1, y: 0, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className={`relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border-2 backdrop-blur-xl p-6 sm:p-8 shadow-lg bg-gradient-to-r ${warningColors}`}
            >
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                
                <div className="flex items-start gap-4 sm:gap-6 w-full md:w-auto flex-1">
                  <div className={`p-4 rounded-2xl bg-white/10 shrink-0 border border-white/10 shadow-inner ${warningPulse ? 'animate-pulse' : ''}`}>
                    <WarningIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${warningIconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black mb-2 tracking-tight flex items-center gap-2 drop-shadow-md text-white">
                      {warningTitle}
                    </h3>
                    <p className="text-sm sm:text-base font-bold opacity-90 leading-relaxed max-w-2xl text-white/80">
                      {warningMessage}
                    </p>
                    {/* 🚀 زر الإنقاذ السريع لتقديم العذر */}
                    <button onClick={() => setIsExcuseModalOpen(true)} className="mt-4 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-sm transition-all border border-white/20 flex items-center gap-2 shadow-inner active:scale-95">
                      <Stethoscope className="w-4 h-4" /> تقديم عذر طبي لتبرير الغياب
                    </button>
                  </div>
                </div>

                <div className="w-full md:w-auto min-w-[200px] shrink-0 bg-[#02040a]/60 p-5 rounded-2xl border border-white/10 shadow-inner backdrop-blur-md">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-bold uppercase opacity-80 text-white">حصص الغياب</span>
                    <span className="text-3xl font-black text-white drop-shadow-md">{absentPeriods} <span className="text-sm opacity-50 font-bold">/ 100</span></span>
                  </div>
                  <div className="h-2.5 w-full bg-[#02040a] rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dangerPercentage}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${warningLevel >= 3 ? 'bg-rose-500 text-rose-500' : warningLevel === 2 ? 'bg-orange-500 text-orange-500' : 'bg-amber-500 text-amber-500'}`}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] font-black text-white/50 uppercase tracking-widest">
                    <span>آمن</span>
                    <span className={warningLevel >= 3 ? 'text-rose-400 animate-pulse' : ''}>فصل نهائي</span>
                  </div>
                </div>

              </div>

              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 pointer-events-none"></div>
              {warningLevel >= 3 && (
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/20 blur-3xl animate-pulse pointer-events-none"></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 بطاقة الهوية الامتحانية والعداد */}
        {(seatAllocation || nextOfficialExam) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#131836] via-[#0f1423] to-[#02040a] p-6 sm:p-8 border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

              {/* 💳 الهوية */}
              {seatAllocation && (
                  <div className="flex items-center gap-4 relative z-10 w-full md:w-auto bg-[#02040a]/60 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30"><Ticket className="w-8 h-8 text-indigo-400" /></div>
                      <div>
                          <p className="text-[10px] sm:text-xs text-indigo-300 font-black uppercase tracking-widest mb-1">هويتك الامتحانية</p>
                          <div className="flex items-end gap-3">
                              <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-md tracking-widest">{seatAllocation.seat_number}</p>
                              <div className="mb-1">
                                  <p className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-1 rounded-md border border-white/5">{seatAllocation.exam_committees?.name}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* ⏳ العداد */}
              {nextOfficialExam ? (
                  <div className="flex flex-col items-center md:items-end text-center md:text-right relative z-10 w-full md:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] sm:text-xs font-black mb-3">
                          <Timer className="w-4 h-4 animate-pulse" /> الاختبار القادم: {nextOfficialExam.subjects?.name}
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md" dir="rtl">
                          {countdownStr}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-bold">في {safeFormat(nextOfficialExam.exam_date, 'EEEE d MMM')} الساعة {nextOfficialExam.start_time.substring(0,5)}</p>
                  </div>
              ) : examTimetables.length > 0 ? (
                  <div className="flex flex-col items-center md:items-end text-center md:text-right relative z-10 w-full md:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-black mb-3">
                          <CheckCircle2 className="w-4 h-4" /> اكتملت الاختبارات
                      </div>
                      <p className="text-sm font-bold text-slate-400">لقد أنهيت جميع اختباراتك المجدولة بنجاح.</p>
                  </div>
              ) : null}
            </motion.div>
        )}

        {/* Track Selection (For 10th Grade) */}
        {isTenthGrade && !hasSelectedTrack && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] glass-panel border border-amber-500/30 p-6 sm:p-8 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10 text-center md:text-right">
              <div className="p-4 sm:p-5 bg-amber-500/10 rounded-[2rem] shadow-inner border border-amber-500/20 shrink-0"><Target className="h-10 w-10 sm:h-12 sm:w-12 text-amber-400 animate-pulse" /></div>
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-2 sm:mb-3 tracking-tight drop-shadow-md">تحديد المسار الأكاديمي للعام القادم</h2>
                <p className="text-slate-300 font-bold text-xs sm:text-sm leading-relaxed">يرجى اختيار المسار الأكاديمي (علمي أو أدبي) الذي ترغب في دراسته في الصف الحادي عشر.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto shrink-0">
                <button onClick={() => handleTrackSelection('scientific')} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl font-black text-sm sm:text-base shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto border border-blue-400/50">المسار العلمي</button>
                <button onClick={() => handleTrackSelection('literary')} className="px-6 sm:px-8 py-3.5 sm:py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm sm:text-base shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto border border-emerald-400/50">المسار الأدبي</button>
              </div>
            </div>
          </motion.div>
        )}

        {isTenthGrade && hasSelectedTrack && (
          <div className="rounded-[2rem] bg-emerald-950/40 border border-emerald-500/30 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-right">
              <div className="p-3 bg-emerald-500/20 rounded-2xl shrink-0 border border-emerald-500/30"><CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" /></div>
              <div>
                <p className="text-base sm:text-lg font-black text-emerald-400 drop-shadow-sm">تم اعتماد مسارك الأكاديمي</p>
                <p className="text-xs sm:text-sm font-bold text-slate-300 mt-1">المسار المختار: <span className="font-black bg-[#02040a]/80 px-2.5 py-1 rounded-lg shadow-inner border border-emerald-500/30 text-emerald-400 mx-1">{studentData.next_year_track === 'scientific' ? 'علمي 🔬' : 'أدبي 📚'}</span></p>
              </div>
            </div>
            <p className="text-[9px] sm:text-[10px] text-emerald-400/70 font-black uppercase tracking-widest bg-[#02040a]/80 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-inner w-full sm:w-auto text-center">تم الاختيار في {safeFormat(studentData.track_selection_date, 'd MMMM yyyy')}</p>
          </div>
        )}

        {/* 🚀 Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[
            { href: '/dashboard/student/schedule', icon: Calendar, label: 'الجدول الدراسي', color: 'blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { href: '/exams', icon: FileText, label: 'الاختبارات', color: 'emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { href: '/assignments', icon: BookOpen, label: 'الواجبات', color: 'amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { href: '/messages', icon: Bell, label: 'التنبيهات', color: 'purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
          ].map((item, idx) => (
            <Link key={idx} href={item.href} className="group">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className={`p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] glass-panel transition-all flex flex-col items-center justify-center gap-3 sm:gap-4 group-hover:-translate-y-1 h-full`}>
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-colors duration-500 ${item.bg} border ${item.border} group-hover:scale-110 shadow-inner`}><item.icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${item.color} drop-shadow-md`} /></div>
                <span className="font-black text-slate-300 group-hover:text-white transition-colors text-xs sm:text-sm text-center">{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* 🚀 Main Grid System */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          
          <div className="lg:col-span-2 space-y-6 lg:space-y-8 w-full">
            
            {/* 🚀 Today's Schedule Timeline (Live Pulse) */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-5 sm:p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#02040a]/40 relative z-10 gap-4 text-center sm:text-right">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl sm:rounded-2xl border border-blue-500/20 shadow-inner"><Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 drop-shadow-md" /></div> جدول حصص اليوم
                </h2>
                <Link href="/dashboard/student/schedule" className="text-xs sm:text-sm font-bold text-blue-400 hover:text-white hover:bg-blue-500/20 transition-colors px-4 sm:px-5 py-2.5 bg-blue-500/10 rounded-xl shadow-sm border border-blue-500/20 shrink-0 w-full sm:w-auto active:scale-95">الجدول الكامل</Link>
              </div>
              
              <div className="p-5 sm:p-6 lg:p-8 relative z-10 bg-transparent overflow-x-hidden">
                {todaysSchedule.length > 0 ? (
                  <div className="space-y-5 sm:space-y-6 relative before:absolute before:inset-0 before:ml-5 sm:before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-blue-500/30 before:via-white/10 before:to-transparent">
                    {todaysSchedule.map((item, i) => {
                      // 🚀 [هندسة النبض الذكي محلياً]
                      let current = false;
                      let next = false;
                      let isPast = false;

                      if (item.start_time && item.end_time && currentTime) {
                          const [startH, startM] = item.start_time.split(':').map(Number);
                          const [endH, endM] = item.end_time.split(':').map(Number);
                          
                          const now = currentTime;
                          const start = new Date(now); start.setHours(startH, startM, 0);
                          const end = new Date(now); end.setHours(endH, endM, 0);
                          
                          if (now >= start && now <= end) {
                              current = true;
                          } else if (now > end) {
                              isPast = true;
                          } else {
                              const diff = (start.getTime() - now.getTime()) / (1000 * 60);
                              if (diff > 0 && diff <= 60) next = true;
                          }
                      }

                      return (
                        <div key={i} className={cn("relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", current ? "is-active z-20" : "z-10")}>
                          <div className={cn("flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 sm:border-4 shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-all duration-500", 
                            current ? "bg-gradient-to-br from-blue-400 to-indigo-500 text-white scale-110 sm:scale-125 border-[#02040a] shadow-[0_0_20px_rgba(59,130,246,0.5)]" : 
                            isPast ? "bg-[#02040a]/40 text-slate-600 border-white/5 opacity-50" :
                            next ? "bg-[#0f1423] text-blue-400 border-blue-500/50" : "bg-[#02040a] text-slate-500 border-white/10"
                          )}>
                            {current ? <Play className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse ml-0.5 sm:ml-1" /> : isPast ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span className="text-sm sm:text-base font-black">{item.period}</span>}
                          </div>
                          
                          <div className={cn("w-[calc(100%-3.5rem)] sm:w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl border transition-all duration-500 backdrop-blur-md cursor-default relative overflow-hidden", 
                            current ? "bg-[#0f1423]/90 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02] ring-1 ring-blue-500/30" : 
                            isPast ? "bg-[#02040a]/20 border-white/5 opacity-40 grayscale" :
                            next ? "bg-blue-500/5 border-blue-500/20 shadow-sm" : "bg-[#02040a]/60 border-white/5 shadow-inner hover:border-white/10"
                          )}>
                            
                            {/* 🔥 تأثير النبض في زاوية البطاقة للحصة الفعالة */}
                            {current && (
                              <span className="absolute top-4 right-4 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                              </span>
                            )}

                            <div className={`absolute top-0 left-0 w-1 h-full ${
                              current ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' 
                              : isPast ? 'bg-slate-800' 
                              : next ? 'bg-blue-400' 
                              : 'bg-white/10'
                            }`}></div>

                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-3 mb-3 pr-2">
                              <h3 className={cn("text-base sm:text-lg font-black transition-colors truncate pl-2", current ? "text-blue-400 drop-shadow-sm" : next ? "text-white" : isPast ? "text-slate-500" : "text-slate-300")}>{item.subjects?.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {current && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[9px] sm:text-[10px] font-bold text-blue-400 shadow-inner"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> الحصة الآن</span>}
                                {next && !current && <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] sm:text-[10px] font-bold shadow-inner">الحصة القادمة</span>}
                                {isPast && <span className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-500 border border-white/5 text-[9px] sm:text-[10px] font-bold shadow-inner flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> انتهت</span>}
                                <span className={cn("text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-xl shadow-inner border whitespace-nowrap", current ? "bg-[#02040a] text-blue-400 border-blue-500/20" : isPast ? "bg-transparent text-slate-600 border-slate-800" : "bg-white/5 text-slate-400 border-white/10")}>الحصة {item.period}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-3 pr-2">
                              <p className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", current ? "text-blue-100" : isPast ? "text-slate-600" : "text-slate-400")}><GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70 shrink-0" /><span className="truncate">أ. {item.teachers?.users?.full_name || 'غير محدد'}</span></p>
                              {item.start_time && item.end_time && (
                                <span className={cn("text-[9px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border shadow-inner shrink-0", current ? "text-blue-400 border-blue-500/20" : isPast ? "text-slate-600 border-slate-800" : "text-slate-500 border-white/5")} dir="ltr"><Clock className="w-2.5 h-2.5 sm:w-3 h-3 shrink-0" />{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</span>
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
                    <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-sm mx-auto">استمتع بيومك! ليس لديك أي حصص مجدولة لهذا اليوم.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Chart */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] p-5 sm:p-6 lg:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px] -ml-10 -mt-10 pointer-events-none"></div>
              <div className="mb-6 sm:mb-8 flex items-center justify-between relative z-10 text-center sm:text-right">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white flex items-center justify-center sm:justify-start gap-3 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner"><TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 drop-shadow-md" /></div>
                  تطور المستوى الأكاديمي
                </h2>
              </div>
              <div className="h-[250px] sm:h-[300px] lg:h-[350px] w-full relative z-10 ml-[-15px] sm:ml-0">
                {unlockedGrades.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={unlockedGrades.map(g => ({ ...g, displayTitle: g.exam?.title || 'اختبار', displayScore: g.score || 0 })).reverse()}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.5}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="displayTitle" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} dx={-10} width={30} />
                      <Tooltip contentStyle={{borderRadius: '1rem', border: '1px solid #ffffff10', backgroundColor: '#02040a', color: '#fff', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8)'}} itemStyle={{color: '#34d399', fontWeight: '900'}} />
                      <Area type="monotone" dataKey="displayScore" name="الدرجة" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{r: 5, strokeWidth: 0, fill: '#34d399'}} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#02040a]/50 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-white/10 p-4 text-center shadow-inner">
                    <BarChart2 className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mb-3 sm:mb-4" />
                    <p className="font-bold text-xs sm:text-sm text-slate-400 max-w-xs">لا توجد نتائج اختبارات متاحة لعرض الرسم البياني حتى الآن</p>
                  </div>
                )}
              </div>
            </div>

            {/* 📅 جدول الاختبارات البانورامي (الميزة الجديدة) */}
            {examTimetables.length > 0 && (
                <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden mt-6 lg:mt-8">
                  <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-sm">
                      <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" /></div> جدول الاختبارات النهائية
                    </h2>
                  </div>
                  <div className="p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {examTimetables.map((ex, idx) => {
                          const isFinished = currentTime && new Date(`${ex.exam_date}T${ex.start_time}`) < currentTime;
                          return (
                          <div key={idx} className={`bg-[#0f1423]/60 border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between shadow-inner transition-colors group ${isFinished ? 'opacity-60 grayscale' : 'hover:border-indigo-500/30'}`}>
                              <div>
                                  <p className="font-black text-white text-sm sm:text-base group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                      {ex.subjects?.name}
                                      {isFinished && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                  </p>
                                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">{safeFormat(ex.exam_date, 'EEEE، d MMM yyyy')}</p>
                              </div>
                              <div className="bg-[#02040a] px-3 py-2 rounded-xl border border-white/5 shadow-inner flex flex-col items-center justify-center shrink-0">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase">الوقت</span>
                                  <span className="text-xs sm:text-sm font-black text-indigo-300" dir="ltr">{ex.start_time.substring(0,5)}</span>
                              </div>
                          </div>
                          );
                      })}
                  </div>
                </div>
            )}

          </div>

          {/* 🌟 Column 2: Narrow Area */}
          <div className="space-y-6 lg:space-y-8 w-full">
            <AnnouncementsWidget authRole="student" />

            {/* 🩺 سجل الغياب والأعذار الطبية */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 gap-4">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-sm">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner">
                    <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-md" />
                  </div> 
                  سجل الأعذار 
                </h2>
                <button onClick={() => setIsExcuseModalOpen(true)} className="text-[10px] sm:text-xs font-black text-slate-900 flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shrink-0 active:scale-95 whitespace-nowrap">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> عذر جديد
                </button>
              </div>

              
              <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {excuses.length > 0 ? (
                  excuses.map(exc => (
                    <div key={exc.id} className="p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 bg-[#0f1423]/60 flex flex-col gap-2 mb-2 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-black text-sm">
                          {exc.absent_dates && exc.absent_dates.length > 0 
                            ? `${safeFormat(exc.absent_dates[0], 'dd MMM yyyy')} ${exc.absent_dates.length > 1 ? `(+${exc.absent_dates.length - 1} أيام)` : ''}`
                            : safeFormat(exc.excuse_date, 'dd MMM yyyy')}
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-md border ${
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
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-[#02040a]/50 rounded-[1rem] border border-dashed border-white/10 font-bold text-xs sm:text-sm m-2 shadow-inner">لم تقم بتقديم أي أعذار مسبقة</div>
                )}
              </div>
            </div>

            {/* Recent Grades */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner"><Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 drop-shadow-md" /></div> آخر النتائج
                </h2>
                <Link href="/student/performance" className="text-[10px] sm:text-xs font-bold text-emerald-400 hover:text-white flex items-center justify-center gap-1 bg-emerald-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 shrink-0 w-full sm:w-auto active:scale-95">السجل <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" /></Link>
              </div>
              
              <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                {recentGrades.length > 0 ? (
                  recentGrades.slice(0,4).map((grade) => {
                    const isLocked = checkIsLocked(grade.exam);
                    return (
                      <div key={grade.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border transition-all mb-2 ${isLocked ? 'bg-[#02040a]/60 border-white/5 shadow-inner' : 'bg-[#0f1423]/60 border-white/5 hover:border-emerald-500/30 hover:bg-[#0f1423] group'}`}>
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0 transition-colors ${isLocked ? 'bg-white/5 text-slate-500 border border-white/10' : grade.score >= 50 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-900' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white'}`}>
                            {isLocked ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                          </div>
                          <div className="min-w-0 pr-1">
                            <p className="font-black text-white text-xs sm:text-sm leading-tight mb-1 truncate drop-shadow-sm">{grade.exam?.title}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-[#02040a] px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg inline-block truncate max-w-full border border-white/5 shadow-inner">{grade.exam?.subject?.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center shrink-0 pl-1">
                          {isLocked ? (
                            <><span className="text-[9px] sm:text-[10px] font-black text-slate-500 bg-white/5 shadow-inner border border-white/10 px-2 py-1 rounded-md flex items-center gap-1 mb-1"><Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> محجوبة</span><p className="text-[8px] sm:text-[9px] text-slate-600 font-bold uppercase tracking-widest">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                          ) : (
                            <><p className={`text-base sm:text-xl font-black flex items-baseline gap-1 drop-shadow-md ${grade.score >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{grade.score} <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">/ {grade.exam?.max_score || 100}</span></p><p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 sm:mt-1">{safeFormat(grade.completed_at, 'd MMM')}</p></>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-[#02040a]/50 rounded-[1rem] border border-dashed border-white/10 font-bold text-xs sm:text-sm m-2 shadow-inner">لا توجد نتائج اختبارات حالياً</div>
                )}
              </div>
            </div>

            {/* Upcoming Assignments */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shadow-inner"><Target className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 drop-shadow-md" /></div> واجبات مطلوبة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                {upcomingAssignments.length > 0 ? (
                  upcomingAssignments.map((assignment) => (
                    <Link href={`/assignments/${assignment.id}`} key={assignment.id} className="block group mb-2">
                      <div className="p-4 sm:p-5 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 hover:border-amber-500/30 hover:bg-[#0f1423] transition-all bg-[#0f1423]/60 flex flex-col justify-between h-full shadow-inner">
                        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                          <p className="font-black text-white text-xs sm:text-sm leading-tight group-hover:text-amber-400 transition-colors line-clamp-2 drop-shadow-sm">{assignment.title}</p>
                          <span className="text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#02040a] text-amber-400 border border-amber-500/20 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-inner"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {safeFormat(assignment.due_date, 'd MMM')}</span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg inline-block w-fit border border-white/5 shadow-inner">{assignment.subject?.name}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold bg-[#02040a]/50 rounded-[1rem] border border-dashed border-white/10 text-xs sm:text-sm m-2 shadow-inner">لا توجد واجبات مطلوبة حالياً</div>
                )}
              </div>
            </div>

            {/* 📚 نماذج الإجابات الرسمية (الميزة الجديدة) */}
            {answerKeys.length > 0 && (
                <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden mt-6 lg:mt-8">
                  <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 drop-shadow-sm">
                      <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-inner"><FileKey className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" /></div> نماذج الإجابات الرسمية
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                      {answerKeys.map(keyObj => (
                          <a href={keyObj.file_url} target="_blank" rel="noreferrer" key={keyObj.id} className="flex items-center justify-between p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 hover:border-emerald-500/30 hover:bg-[#0f1423] transition-all mb-2 group shadow-inner">
                              <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors shrink-0">
                                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="min-w-0">
                                      <p className="font-black text-white text-xs sm:text-sm truncate drop-shadow-sm">{keyObj.title}</p>
                                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1 bg-[#02040a] px-2 py-0.5 rounded border border-white/5 inline-block">{keyObj.subjects?.name}</p>
                                  </div>
                              </div>
                          </a>
                      ))}
                  </div>
                </div>
            )}

            {/* Upcoming Exams (القديمة للاختبارات الدورية) */}
            <div className="glass-panel rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-[#02040a]/40 text-center sm:text-right gap-4">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-2 drop-shadow-sm w-full sm:w-auto">
                  <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 shadow-inner"><Bell className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 drop-shadow-md" /></div> اختبارات دورية قادمة
                </h2>
              </div>
              <div className="divide-y divide-white/5 bg-transparent p-2 sm:p-3">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam) => (
                    <Link href={`/exams/take/${exam.id}`} key={exam.id} className="block group mb-2">
                      <div className="p-4 sm:p-5 rounded-[1rem] sm:rounded-[1.5rem] border border-white/5 hover:border-rose-500/30 hover:bg-[#0f1423] transition-all bg-[#0f1423]/60 flex flex-col justify-between h-full shadow-inner">
                        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                          <p className="font-black text-white text-xs sm:text-sm leading-tight group-hover:text-rose-400 transition-colors line-clamp-2 drop-shadow-sm">{exam.title}</p>
                          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors shadow-inner"><Play className="h-3 w-3 sm:h-4 sm:w-4" /></div>
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-[#02040a]/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg inline-block w-fit border border-white/5 mb-3 sm:mb-4 shadow-inner">{exam.subject?.name}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black text-rose-400 bg-[#02040a] border border-rose-500/20 p-2 sm:p-3 rounded-lg sm:rounded-xl uppercase tracking-widest shadow-inner">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="truncate">
                            {(() => {
                              if (!exam.exam_date) return '...';
                              const fullDateStr = (exam.start_time || '00:00').includes('T') ? exam.start_time : `${exam.exam_date}T${exam.start_time || '00:00'}`;
                              return safeFormat(fullDateStr, 'EEEE، d MMM - h:mm a');
                            })()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 font-bold bg-[#02040a]/50 rounded-[1rem] border border-dashed border-white/10 text-xs sm:text-sm m-2 shadow-inner">لا توجد اختبارات مجدولة حالياً</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 🚀 نافذة (Modal) تقديم العذر الطبي */}
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </motion.div>
  );
}
