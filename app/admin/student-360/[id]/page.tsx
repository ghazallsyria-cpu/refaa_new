// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useCallback, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
// 🚀 تم إضافة جميع الأيقونات المفقودة هنا (Filter, X, Calendar, Star, ArrowUpRight, Trophy, UserCircle)
import { 
  ArrowRight, User, GraduationCap, Clock, CheckCircle2, AlertCircle, 
  BookOpen, FileText, Medal, Loader2, Activity, Target, ShieldAlert,
  MessageSquareHeart, Send, ShieldCheck, Database, XCircle, PrinterIcon, Download, Sparkles,
  Filter, X, Calendar, Star, ArrowUpRight, Trophy, UserCircle
} from 'lucide-react';

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

// إعدادات الحركة الموحدة
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } } };

const shieldThemes = {
  gold: { border: 'from-amber-400/40 via-amber-500/20 to-amber-700/40', glow: 'bg-amber-500/10', textPrimary: 'text-amber-300', textSecondary: 'text-amber-400/70', icon: <Award className="w-8 h-8 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" /> },
  silver: { border: 'from-slate-300/40 via-slate-100/20 to-slate-400/40', glow: 'bg-slate-400/10', textPrimary: 'text-slate-200', textSecondary: 'text-slate-400/70', icon: <Shield className="w-8 h-8 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)]" /> },
  diamond: { border: 'from-cyan-400/40 via-blue-500/20 to-indigo-600/40', glow: 'bg-cyan-500/10', textPrimary: 'text-cyan-300', textSecondary: 'text-cyan-400/70', icon: <Sparkles className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" /> },
  royal: { border: 'from-amber-600/40 via-yellow-500/20 to-yellow-700/40', glow: 'bg-amber-900/20', textPrimary: 'text-amber-400', textSecondary: 'text-amber-500/60', icon: <Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" /> },
};

export default function Student360Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'assignments' | 'attendance' | 'notes'>('overview');
  
  const [tabData, setTabData] = useState<Record<string, any>>({});
  const [isTabLoading, setIsTabLoading] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);
  const attendancePrintRef = useRef<HTMLDivElement>(null);

  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'week' | 'month'>('all');

  // 1. جلب البيانات الأساسية بأمان (Failsafe Fetcher)
  const fetchSummary = useCallback(async () => {
    try {
      // استعلام مباشر وسريع لضمان عمل الصفحة حتى لو فشل RPC
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id, national_id,
          users!students_user_id_fkey(full_name, avatar_url),
          sections(name, classes(name))
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      const userInfo = Array.isArray(studentData?.users) ? studentData.users[0] : studentData?.users;
      const sectionInfo = Array.isArray(studentData?.sections) ? studentData.sections[0] : studentData?.sections;
      const classInfo = sectionInfo?.classes;
      const className = Array.isArray(classInfo) ? classInfo[0]?.name : classInfo?.name;

      // جلب ملخص الإحصائيات
      const { count: absences } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('student_id', studentId).neq('status', 'present');
      const { count: badges } = await supabase.from('student_badges').select('*', { count: 'exact', head: true }).eq('student_id', studentId);
      
      const { data: grades } = await supabase.from('grades').select('score, max_score').eq('student_id', studentId);
      let avg = 0;
      if (grades && grades.length > 0) {
         const totalScore = grades.reduce((acc, g) => acc + (g.score || 0), 0);
         const totalMax = grades.reduce((acc, g) => acc + (g.max_score || 100), 0);
         avg = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      }

      setSummaryData({
        basic_info: {
           full_name: userInfo?.full_name || 'طالب غير معروف',
           national_id: studentData.national_id || '---',
           avatar_url: userInfo?.avatar_url || null,
           class_name: className || '---',
           section_name: sectionInfo?.name || '---'
        },
        academic_summary: {
           average_score: avg,
           total_exams_taken: grades?.length || 0
        },
        attendance_summary: {
           total_absences: absences || 0,
           total_lates: 0
        },
        badges_count: badges || 0
      });

    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (['admin', 'management', 'teacher', 'staff'].includes(currentRole)) {
      fetchSummary();
    }
  }, [currentRole, fetchSummary]);

  // 🚀 2. المحرك الجديد الذكي (Bulletproof Tab Fetcher)
  const loadTabData = async (tab: string) => {
    if (tabData[tab]) return; 
    if (tab === 'overview') return;

    setIsTabLoading(true);
    try {
      let finalData = [];
      
      if (tab === 'grades') {
        const { data: rawGrades } = await supabase.from('grades').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
        if (rawGrades && rawGrades.length > 0) {
           const subjectIds = [...new Set(rawGrades.map(g => g.subject_id).filter(Boolean))];
           const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
           finalData = rawGrades.map(g => ({
             ...g,
             subjects: subjects?.find(s => s.id === g.subject_id) || null
           }));
        }
      } 
      else if (tab === 'assignments') {
        const { data: rawProgress } = await supabase.from('student_progress_v2').select('*').eq('student_id', studentId).order('updated_at', { ascending: false });
        if (rawProgress && rawProgress.length > 0) {
           const assignIds = [...new Set(rawProgress.map(p => p.assignment_id).filter(Boolean))];
           const { data: assigns } = await supabase.from('assignments_v2').select('id, title, is_practice_mode').in('id', assignIds);
           finalData = rawProgress.map(p => ({
             ...p,
             assignments_v2: assigns?.find(a => a.id === p.assignment_id) || null
           }));
        }
      } 
      else if (tab === 'attendance') {
        const { data: rawAttendance } = await supabase.from('attendance_records').select('*').eq('student_id', studentId).neq('status', 'present').order('date', { ascending: false });
        if (rawAttendance && rawAttendance.length > 0) {
           const subjectIds = [...new Set(rawAttendance.map(a => a.subject_id).filter(Boolean))];
           const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds);
           finalData = rawAttendance.map(a => ({
             ...a,
             subjects: subjects?.find(s => s.id === a.subject_id) || null
           }));
        }
      } 
      else if (tab === 'notes') {
        const { data: rawNotes } = await supabase.from('private_student_notes').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
        if (rawNotes && rawNotes.length > 0) {
           const teacherIds = [...new Set(rawNotes.map(n => n.teacher_id).filter(Boolean))];
           const { data: users } = await supabase.from('users').select('id, full_name, avatar_url, role').in('id', teacherIds);
           finalData = rawNotes.map(n => ({
             ...n,
             users: users?.find(u => u.id === n.teacher_id) || null
           }));
        }
      }
      
      setTabData(prev => ({ ...prev, [tab]: finalData }));
    } catch (err) {
      console.error(`Error loading ${tab}:`, err);
      setTabData(prev => ({ ...prev, [tab]: [] })); 
    } finally {
      setIsTabLoading(false);
    }
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setIsSendingNote(true);
    try {
      const { data: insertedNote, error } = await supabase.from('private_student_notes').insert({
        student_id: studentId,
        teacher_id: user.id,
        content: newNote.trim()
      }).select().single();
      
      if (error) throw error;
      
      const { data: userData } = await supabase.from('users').select('id, full_name, avatar_url, role').eq('id', user.id).single();
      const completeNote = { ...insertedNote, users: userData };

      setTabData(prev => ({
        ...prev,
        notes: [completeNote, ...(prev.notes || [])]
      }));
      setNewNote('');
    } catch (err) {
      alert('خطأ في حفظ الملاحظة');
    } finally {
      setIsSendingNote(false);
    }
  };

  const groupedAttendance = useMemo(() => {
    if (!tabData['attendance']) return [];
    
    const groups: Record<string, any[]> = {};
    tabData['attendance'].forEach((r: any) => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    
    let daysArr = Object.keys(groups).map(date => {
       const recs = groups[date];
       const isFullDay = recs.length >= 4; 
       
       const statuses = [...new Set(recs.map(r => r.status))];
       let dayStatus = 'absent';
       if (statuses.includes('absent')) dayStatus = 'absent';
       else if (statuses.includes('late')) dayStatus = 'late';
       else if (statuses.includes('excused')) dayStatus = 'excused';
       
       const sortedPeriods = recs.map(r => r.period).sort((a,b) => a - b);
       const periodsDesc = isFullDay 
           ? 'غياب يوم كامل' 
           : `غياب جزئي (حصص: ${sortedPeriods.join('، ')})`;

       return { date, records: recs, isFullDay, dayStatus, periodsDesc };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const now = new Date();
    if (attendanceFilter === 'week') {
      const weekAgo = new Date(); 
      weekAgo.setDate(now.getDate() - 7);
      daysArr = daysArr.filter(d => new Date(d.date) >= weekAgo);
    } else if (attendanceFilter === 'month') {
      const monthAgo = new Date(); 
      monthAgo.setMonth(now.getMonth() - 1);
      daysArr = daysArr.filter(d => new Date(d.date) >= monthAgo);
    }
    
    return daysArr;
  }, [tabData, attendanceFilter]);

  const downloadAttendancePDF = async () => {
    if (groupedAttendance.length === 0) {
      alert('لا توجد غيابات في هذه الفترة لطباعتها!');
      return;
    }
    
    setIsPrinting(true);
    
    setTimeout(async () => {
      if (!attendancePrintRef.current) return;
      try {
        window.scrollTo(0, 0); 
        const pages = attendancePrintRef.current.querySelectorAll('.print-page-wrapper');
        if (pages.length === 0) return;

        const pdf = new jsPDF('p', 'mm', 'a4');
        
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { 
            scale: 2, 
            useCORS: true, 
            allowTaint: false, 
            logging: false,
            width: 794,    
            height: 1122,  
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 1.0); 
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight(); 
          
          if (i > 0) pdf.addPage(); 
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        
        const safeStudentName = summaryData?.basic_info?.full_name.replace(/\s+/g, '_') || 'طالب';
        pdf.save(`سجل_غياب_${safeStudentName}.pdf`);
      } catch (err: any) { 
        console.error("PDF Engine Error:", err);
        alert('حدث خطأ أثناء استخراج الملف.'); 
      } 
      finally { setIsPrinting(false); }
    }, 2000); 
  };

  const chunkArray = (arr: any[], size: number) => {
    if (!arr || arr.length === 0) return [[]];
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  };

  if (!['admin', 'management', 'teacher', 'staff'].includes(currentRole)) return null;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 to-transparent pointer-events-none"></div>
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]"></div>
           <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-400 h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-indigo-300 animate-pulse tracking-widest drop-shadow-md">جاري تحليل ملف الطالب الشامل...</h2>
      </div>
    </div>
  );

  if (!summaryData?.basic_info) return <div className="min-h-screen flex items-center justify-center bg-[#02040a] text-rose-400 font-bold text-xl">لم يتم العثور على بيانات الطالب. تأكد من صحة الرابط.</div>;

  const { basic_info, academic_summary, attendance_summary, badges_count } = summaryData;
  const avgScore = Number(academic_summary?.average_score || 0).toFixed(1);

  const filterSummaryStats = {
      absent: groupedAttendance.filter(d => d.dayStatus === 'absent').length,
      late: groupedAttendance.filter(d => d.dayStatus === 'late').length,
      excused: groupedAttendance.filter(d => d.dayStatus === 'excused').length,
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-[#02040a] text-slate-200 font-sans pb-20 relative overflow-x-hidden pt-24" dir="rtl">
      
      {/* 🌌 الإضاءة الخلفية المحيطية بستايل جيمناي */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 to-transparent"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-transparent"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
      </div>

      <AnimatePresence>
        {isPrinting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <h2 className="text-xl font-black drop-shadow-md">جاري تصميم وتوليد السجل الرسمي (PDF)...</h2>
            <p className="text-sm text-slate-400 mt-2">يرجى الانتظار لحظات...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 w-fit active:scale-95 shadow-inner">
          <ArrowRight className="w-4 h-4" /> عودة لمستكشف الطلاب
        </button>

        {/* 🚀 1. البطاقة التعريفية (Hero Profile Card) */}
        <motion.div variants={itemVariants} className="bg-[#0f1423]/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-white/10 p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-screen"></div>
           
           <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative z-10 w-full md:w-auto">
              <div className="w-28 h-28 sm:w-36 sm:h-36 bg-[#02040a] rounded-[2rem] shadow-inner border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-indigo-400 font-black text-4xl group">
                 {basic_info.avatar_url ? (
                    <img src={basic_info.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 mix-blend-luminosity hover:mix-blend-normal" alt="Student" />
                 ) : (
                    basic_info.full_name.charAt(0)
                 )}
              </div>
              <div className="text-center md:text-right flex flex-col justify-center h-full">
                 <h1 className="text-2xl sm:text-4xl font-black text-white mb-3 drop-shadow-md">{basic_info.full_name}</h1>
                 <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3">
                    <span className="bg-indigo-500/10 text-indigo-300 font-black text-[10px] sm:text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-inner flex items-center gap-1.5 backdrop-blur-sm"><ShieldCheck className="w-3.5 h-3.5"/> الرقم المدني: {basic_info.national_id}</span>
                    <span className="bg-blue-500/10 text-blue-300 font-black text-[10px] sm:text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 shadow-inner flex items-center gap-1.5 backdrop-blur-sm"><GraduationCap className="w-3.5 h-3.5"/> {basic_info.class_name} - {basic_info.section_name}</span>
                 </div>
              </div>
           </div>

           <div className="flex gap-3 sm:gap-6 relative z-10 shrink-0 w-full md:w-auto justify-center">
              <div className="text-center glass-panel p-3 sm:p-4 rounded-2xl border-emerald-500/20 min-w-[90px]">
                 <div className="text-2xl sm:text-3xl text-emerald-400 font-black drop-shadow-md">{avgScore}%</div>
                 <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1">المعدل العام</p>
              </div>
              <div className="text-center glass-panel p-3 sm:p-4 rounded-2xl border-rose-500/20 min-w-[90px]">
                 <div className="text-2xl sm:text-3xl text-rose-400 font-black drop-shadow-md">{attendance_summary?.total_absences || 0}</div>
                 <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1">أيام الغياب</p>
              </div>
              <div className="text-center glass-panel p-3 sm:p-4 rounded-2xl border-amber-500/20 min-w-[90px] hidden sm:block">
                 <div className="text-2xl sm:text-3xl text-amber-400 font-black drop-shadow-md flex items-center justify-center gap-1"><Medal className="w-5 h-5"/> {badges_count}</div>
                 <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-1">أوسمة الشرف</p>
              </div>
           </div>
        </motion.div>

        {/* 🚀 2. أزرار التنقل (Bento Navigation) */}
        <motion.div variants={itemVariants} className="mt-8 flex overflow-x-auto custom-scrollbar bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner backdrop-blur-md">
           {[
             { id: 'overview', label: 'نظرة عامة', icon: Activity },
             { id: 'grades', label: 'السجل الأكاديمي', icon: FileText },
             { id: 'assignments', label: 'الواجبات والتسليم', icon: Target },
             { id: 'attendance', label: 'الغياب والانضباط', icon: ShieldAlert },
             { id: 'notes', label: 'الملاحظات السرية', icon: MessageSquareHeart },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => handleTabChange(tab.id)}
               className={cn(
                 "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95",
                 activeTab === tab.id ? "bg-indigo-600 border border-indigo-500 text-white shadow-md" : "text-slate-400 hover:bg-white/10 hover:text-white border border-transparent"
               )}
             >
               <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
           ))}
        </motion.div>

        {/* 🚀 3. محتوى التبويبات (Tab Content) */}
        <div className="mt-6">
           <AnimatePresence mode="wait">
              {isTabLoading ? (
                 <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-20 glass-panel rounded-[2.5rem]">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                 </motion.div>
              ) : (
                 <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    
                    {/* 📊 التبويب الأول: نظرة عامة */}
                    {activeTab === 'overview' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-[#0f1423]/80 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-lg col-span-1 md:col-span-2">
                             <h3 className="font-black text-lg sm:text-xl text-white mb-6 flex items-center gap-3 drop-shadow-md"><Activity className="w-6 h-6 text-indigo-400"/> ملخص النشاط</h3>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="bg-[#02040a]/40 p-5 rounded-[1.5rem] border border-white/5 flex items-center gap-4 shadow-inner group hover:border-indigo-500/30 transition-colors">
                                  <div className="p-3 bg-indigo-500/20 shadow-inner rounded-xl text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400">إجمالي الاختبارات</p>
                                    <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">{academic_summary?.total_exams_taken || 0}</p>
                                  </div>
                               </div>
                               <div className="bg-[#02040a]/40 p-5 rounded-[1.5rem] border border-white/5 flex items-center gap-4 shadow-inner group hover:border-rose-500/30 transition-colors">
                                  <div className="p-3 bg-rose-500/20 shadow-inner rounded-xl text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform"><Clock className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400">تأخير صباحي</p>
                                    <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">{attendance_summary?.total_lates || 0}</p>
                                  </div>
                               </div>
                             </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-600/20 to-orange-500/10 backdrop-blur-md border border-amber-500/30 p-6 sm:p-8 rounded-[2rem] shadow-lg text-white relative overflow-hidden group">
                             <Medal className="absolute -bottom-4 -left-4 w-32 h-32 text-amber-500/10 group-hover:scale-110 transition-transform duration-700" />
                             <h3 className="font-black text-lg sm:text-xl text-amber-300 mb-2 relative z-10 flex items-center gap-2"><Sparkles className="w-5 h-5"/> صندوق الأوسمة</h3>
                             <p className="text-5xl sm:text-6xl font-black relative z-10 mt-6 drop-shadow-md">{badges_count}</p>
                             <p className="text-[10px] sm:text-xs font-bold text-amber-200/70 relative z-10 mt-2">وسام شرف أكاديمي وسلوكي</p>
                          </div>
                       </div>
                    )}

                    {/* 📚 التبويب الثاني: السجل الأكاديمي */}
                    {activeTab === 'grades' && (
                       <div className="bg-[#0f1423]/80 backdrop-blur-md rounded-[2.5rem] border border-white/10 shadow-lg overflow-hidden">
                          <div className="p-6 sm:p-8 border-b border-white/5 bg-[#02040a]/40 flex items-center gap-3">
                             <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20"><Database className="w-5 h-5 text-indigo-400"/></div>
                             <h3 className="font-black text-lg sm:text-xl text-white drop-shadow-md">سجل الدرجات الشامل</h3>
                          </div>
                          <div className="overflow-x-auto custom-scrollbar p-1">
                             <table className="min-w-full text-right whitespace-nowrap">
                                <thead>
                                   <tr className="bg-white/5 text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b border-white/10">
                                      <th className="p-5 pl-4 pr-6">المادة</th>
                                      <th className="p-5 px-4">التقييم / الاختبار</th>
                                      <th className="p-5 px-4 text-center">الدرجة المكتسبة</th>
                                      <th className="p-5 px-6">التاريخ</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-300 divide-y divide-white/5">
                                   {tabData['grades']?.length > 0 ? tabData['grades'].map((g: any) => (
                                      <tr key={g.id} className="hover:bg-white/5 transition-colors group">
                                         <td className="p-4 px-6"><span className="bg-indigo-500/10 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-inner text-xs">{g.subjects?.name || 'غير محدد'}</span></td>
                                         <td className="p-4 px-4 font-black group-hover:text-white transition-colors">{g.title}</td>
                                         <td className="p-4 px-4 text-center">
                                            <span className="font-black text-xl text-emerald-400 drop-shadow-sm">{g.score}</span> <span className="text-[10px] text-slate-500">/ {g.max_score}</span>
                                         </td>
                                         <td className="p-4 px-6 text-[10px] sm:text-xs text-slate-500" dir="ltr">{new Date(g.created_at).toLocaleDateString('en-GB')}</td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={4} className="p-16 text-center text-slate-500 font-bold bg-[#02040a]/20">لا توجد درجات مسجلة حتى الآن.</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {/* 🎯 التبويب الثالث: الواجبات */}
                    {activeTab === 'assignments' && (
                       <div className="bg-[#0f1423]/80 backdrop-blur-md rounded-[2.5rem] border border-white/10 shadow-lg p-6 sm:p-8 space-y-4">
                          {tabData['assignments']?.length > 0 ? tabData['assignments'].map((a: any) => {
                             const isGraded = a.teacher_feedback?.includes('[تم رصد الدرجة]');
                             return (
                                <div key={a.id} className="flex flex-col md:flex-row items-center justify-between gap-5 p-5 sm:p-6 rounded-[1.5rem] border border-white/5 bg-[#02040a]/40 hover:border-indigo-500/30 transition-all shadow-inner group">
                                   <div className="w-full">
                                      <h4 className="font-black text-white text-base sm:text-lg flex items-center gap-3 drop-shadow-sm group-hover:text-indigo-100">
                                         <div className={`p-2 rounded-xl border shadow-inner ${a.assignments_v2?.is_practice_mode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                                            {a.assignments_v2?.is_practice_mode ? <Target className="w-4 h-4"/> : <FileText className="w-4 h-4"/>}
                                         </div>
                                         {a.assignments_v2?.title || 'واجب بدون عنوان'}
                                      </h4>
                                      <div className="flex items-center gap-3 mt-4">
                                         {a.teacher_feedback && !isGraded && <p className="text-[10px] sm:text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-inner flex items-center gap-1.5"><MessageSquareHeart className="w-3.5 h-3.5"/> {a.teacher_feedback}</p>}
                                         {a.teacher_feedback && isGraded && <p className="text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-inner flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> {a.teacher_feedback}</p>}
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                                      {isGraded ? (
                                         <div className="bg-emerald-500/10 text-emerald-400 px-4 sm:px-5 py-2.5 rounded-xl border border-emerald-500/30 font-black text-xs sm:text-sm flex items-center justify-center gap-2 w-full shadow-inner">
                                            <CheckCircle2 className="w-4 h-4"/> مُصحح
                                         </div>
                                      ) : a.is_completed ? (
                                         <div className="bg-amber-500/10 text-amber-400 px-4 sm:px-5 py-2.5 rounded-xl border border-amber-500/30 font-black text-xs sm:text-sm flex items-center justify-center gap-2 w-full shadow-inner">
                                            <Clock className="w-4 h-4"/> بانتظار التصحيح
                                         </div>
                                      ) : (
                                         <div className="bg-white/5 text-slate-400 px-4 sm:px-5 py-2.5 rounded-xl border border-white/10 font-black text-xs sm:text-sm flex items-center justify-center w-full shadow-inner">
                                            قيد الإنجاز
                                         </div>
                                      )}
                                   </div>
                                </div>
                             )
                          }) : (
                             <div className="p-16 text-center text-slate-500 font-bold bg-[#02040a]/40 rounded-[1.5rem] border border-white/5">لا يوجد سجل للواجبات.</div>
                          )}
                       </div>
                    )}

                    {/* 🛡️ التبويب الرابع: الغياب والانضباط */}
                    {activeTab === 'attendance' && (
                       <div className="bg-[#0f1423]/80 backdrop-blur-md rounded-[2.5rem] border border-white/10 shadow-lg overflow-hidden flex flex-col">
                          <div className="p-6 sm:p-8 border-b border-white/5 bg-[#02040a]/40 flex flex-col sm:flex-row justify-between items-center gap-5">
                             <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20"><ShieldAlert className="w-5 h-5 text-rose-400"/></div>
                                <h3 className="font-black text-lg sm:text-xl text-white drop-shadow-md">سجل الغياب والانضباط</h3>
                             </div>
                             
                             <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative">
                                   <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                                   <select 
                                      value={attendanceFilter} 
                                      onChange={(e) => setAttendanceFilter(e.target.value as any)}
                                      className="bg-white/5 border border-white/10 text-white text-xs sm:text-sm font-black rounded-xl pr-9 pl-4 py-2.5 outline-none focus:border-indigo-400 shadow-inner cursor-pointer appearance-none [&>option]:bg-[#0f1423]"
                                   >
                                      <option value="all">كل الأوقات</option>
                                      <option value="month">آخر شهر</option>
                                      <option value="week">آخر أسبوع</option>
                                   </select>
                                </div>

                                <button onClick={downloadAttendancePDF} disabled={isPrinting || groupedAttendance.length === 0} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 text-white font-black text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0">
                                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin"/> : <PrinterIcon className="w-4 h-4 drop-shadow-sm"/>}
                                  <span className="hidden sm:inline">تصدير PDF</span>
                                </button>
                             </div>
                          </div>
                          
                          <div className="overflow-x-auto custom-scrollbar p-1">
                             <table className="min-w-full text-right whitespace-nowrap">
                                <thead>
                                   <tr className="bg-white/5 text-slate-300 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b border-white/10">
                                      <th className="p-5 pl-4 pr-6">التاريخ</th>
                                      <th className="p-5 px-4">تفاصيل الغياب</th>
                                      <th className="p-5 px-6 text-center">الحالة الإجمالية</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-300 divide-y divide-white/5">
                                   {groupedAttendance.length > 0 ? groupedAttendance.map((day: any) => (
                                      <tr key={day.date} className="hover:bg-white/5 transition-colors group">
                                         <td className="p-4 px-6 text-[10px] sm:text-xs text-slate-400 font-black" dir="ltr">{new Date(day.date).toLocaleDateString('en-GB')}</td>
                                         <td className="p-4 px-4">
                                            {day.isFullDay ? (
                                               <span className="text-rose-400 font-black flex items-center gap-1.5 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 w-fit shadow-inner"><AlertCircle className="w-4 h-4" /> {day.periodsDesc}</span>
                                            ) : (
                                               <span className="text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 w-fit shadow-inner block">{day.periodsDesc}</span>
                                            )}
                                         </td>
                                         <td className="p-4 px-6 text-center">
                                            <div className="flex justify-center">
                                               {day.dayStatus === 'absent' && <span className="bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-black border border-rose-500/30 shadow-inner">غائب</span>}
                                               {day.dayStatus === 'late' && <span className="bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-black border border-amber-500/30 shadow-inner">تأخير</span>}
                                               {day.dayStatus === 'excused' && <span className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-xl text-[10px] sm:text-xs font-black border border-blue-500/30 shadow-inner">عذر مقبول</span>}
                                            </div>
                                         </td>
                                      </tr>
                                   )) : (
                                      <tr>
                                         <td colSpan={3} className="p-16 text-center text-emerald-400 font-black bg-[#02040a]/40">
                                            <div className="p-3 bg-emerald-500/10 rounded-full w-fit mx-auto mb-3 border border-emerald-500/20 shadow-inner"><CheckCircle2 className="w-8 h-8 text-emerald-400"/></div>
                                            لا توجد غيابات مسجلة في هذه الفترة. سجل الطالب نظيف!
                                         </td>
                                      </tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {/* 📝 التبويب الخامس: الملاحظات السرية */}
                    {activeTab === 'notes' && (
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                             {tabData['notes']?.length > 0 ? tabData['notes'].map((n: any) => (
                                <div key={n.id} className="bg-[#0f1423]/80 backdrop-blur-md p-5 sm:p-6 rounded-[1.5rem] border border-white/10 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                                   <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                                      <div className="flex items-center gap-3 sm:gap-4">
                                         {n.users?.avatar_url ? <img src={n.users.avatar_url} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-white/10"/> : <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-sm text-slate-400 border border-white/10">{String(n.users?.full_name).charAt(0)}</div>}
                                         <div>
                                            <p className="text-sm sm:text-base font-black text-white drop-shadow-sm">{n.users?.full_name} <span className="text-[9px] bg-white/10 border border-white/10 px-2 py-0.5 rounded-md text-slate-300 shadow-inner mr-1.5">{n.users?.role === 'teacher' ? 'معلم' : 'إدارة'}</span></p>
                                         </div>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-bold bg-[#02040a]/40 px-2 py-1 rounded-md shadow-inner" dir="ltr">{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                                   </div>
                                   <p className="text-sm font-bold text-slate-300 leading-relaxed bg-[#02040a]/40 p-4 rounded-xl border border-white/5 shadow-inner group-hover:text-white transition-colors">{n.content}</p>
                                </div>
                             )) : (
                                <div className="bg-[#0f1423]/60 backdrop-blur-md p-16 rounded-[2.5rem] border border-white/5 text-center text-slate-500 font-bold flex flex-col items-center shadow-inner">
                                   <MessageSquareHeart className="w-12 h-12 mb-4 opacity-50"/>
                                   لا توجد ملاحظات سرية مسجلة لهذا الطالب.
                                </div>
                             )}
                          </div>
                          
                          <div className="bg-indigo-500/10 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-indigo-500/30 h-fit sticky top-28 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[40px] rounded-full pointer-events-none mix-blend-screen"></div>
                             <h3 className="font-black text-white mb-5 flex items-center gap-2 drop-shadow-md relative z-10"><div className="p-2 bg-indigo-500/20 rounded-lg shadow-inner"><MessageSquareHeart className="w-5 h-5 text-indigo-300"/></div> إضافة ملاحظة</h3>
                             <textarea 
                               rows={5} 
                               value={newNote}
                               onChange={e => setNewNote(e.target.value)}
                               placeholder="اكتب ملاحظة حول سلوك أو أداء الطالب (سرية للإدارة والمعلمين فقط)..."
                               className="w-full bg-[#02040a]/60 border border-white/10 rounded-xl p-4 sm:p-5 text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-inner mb-5 placeholder:text-slate-600 custom-scrollbar relative z-10"
                             />
                             <button onClick={handleAddNote} disabled={isSendingNote || !newNote.trim()} className="w-full py-3.5 sm:py-4 bg-indigo-600/90 text-white font-black rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-indigo-400/50 active:scale-95 relative z-10">
                                {isSendingNote ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm"/>} حفظ التقرير السري
                             </button>
                          </div>
                       </div>
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

      </div>

      {/* =========================================================
        🖨️ القالب المخفي لتوليد وثيقة الغياب PDF (مُحسّن وسري)
        =========================================================
      */}
      {groupedAttendance && groupedAttendance.length > 0 && (
         <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 1, pointerEvents: 'none' }}>
            <div ref={attendancePrintRef} className="flex flex-col gap-10" dir="rtl">
               {chunkArray(groupedAttendance, 14).map((chunk: any, pageIndex: number) => (
                  <div key={pageIndex} className="print-page-wrapper bg-white mx-auto relative flex flex-col" style={{ width: '794px', height: '1122px', padding: '40px', boxSizing: 'border-box' }}>
                     
                     <div className="flex justify-between items-center border-b-[3px] border-slate-900 pb-6 mb-6 shrink-0">
                        <div className="text-right">
                           <h2 className="text-xl font-black text-slate-900">دولة الكويت</h2>
                           <h3 className="text-lg font-bold text-slate-800">وزارة التربية</h3>
                           <h3 className="text-lg font-bold text-slate-800">مدرسة الرفعة النموذجية</h3>
                        </div>
                        <div className="text-center">
                           <h1 className="text-3xl font-black bg-slate-900 text-white px-6 py-2 rounded-2xl inline-block mb-2 shadow-sm">سجل الانضباط والغياب</h1>
                           <p className="font-bold text-lg text-slate-700">التقرير الرسمي - للعام 2025/2026</p>
                        </div>
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-900 overflow-hidden shrink-0">
                           <span className="font-black text-xl text-slate-400">شعار</span>
                        </div>
                     </div>

                     <div className="bg-slate-50 border-2 border-slate-300 p-4 rounded-xl mb-6 flex justify-between shrink-0 shadow-sm items-center">
                        <p className="font-black text-lg text-slate-900">الاسم: <span className="text-indigo-700 ml-2">{summaryData?.basic_info?.full_name}</span></p>
                        <p className="font-black text-lg text-slate-900">المدني: <span className="text-indigo-700 ml-2">{summaryData?.basic_info?.national_id}</span></p>
                        <p className="font-black text-lg text-slate-900">الصف: <span className="text-indigo-700 ml-2">{summaryData?.basic_info?.class_name} - {summaryData?.basic_info?.section_name}</span></p>
                     </div>

                     {pageIndex === 0 && (
                        <div className="flex gap-4 mb-6 shrink-0">
                           <div className="flex-1 bg-rose-50 border-2 border-rose-200 p-4 rounded-xl text-center">
                              <p className="text-xs font-black text-rose-800 uppercase mb-1">إجمالي أيام الغياب في السجل</p>
                              <p className="text-2xl font-black text-rose-600">{filterSummaryStats.absent}</p>
                           </div>
                           <div className="flex-1 bg-amber-50 border-2 border-amber-200 p-4 rounded-xl text-center">
                              <p className="text-xs font-black text-amber-800 uppercase mb-1">إجمالي أيام التأخير</p>
                              <p className="text-2xl font-black text-amber-600">{filterSummaryStats.late}</p>
                           </div>
                           <div className="flex-1 bg-blue-50 border-2 border-blue-200 p-4 rounded-xl text-center">
                              <p className="text-xs font-black text-blue-800 uppercase mb-1">الأعذار المقبولة</p>
                              <p className="text-2xl font-black text-blue-600">{filterSummaryStats.excused}</p>
                           </div>
                        </div>
                     )}

                     <div className="flex-1">
                        <table className="w-full border-collapse border-2 border-slate-900 text-right">
                           <thead>
                             <tr className="bg-slate-200 border-b-2 border-slate-900 h-10">
                               <th className="border-l border-slate-900 p-2 font-black text-slate-900 w-16 text-center text-sm">م</th>
                               <th className="border-l border-slate-900 p-2 font-black text-slate-900 w-32 text-center text-sm">التاريخ</th>
                               <th className="border-l border-slate-900 p-2 font-black text-slate-900 text-sm">التفاصيل (يوم كامل / حصص)</th>
                               <th className="p-2 font-black text-slate-900 w-32 text-center text-sm">الحالة</th>
                             </tr>
                           </thead>
                           <tbody>
                              {chunk.map((day: any, idx: number) => (
                                <tr key={day.date} className="even:bg-slate-50 border-b border-slate-300 h-10">
                                  <td className="border-l border-slate-900 p-2 font-bold text-slate-900 text-center text-sm">{pageIndex * 14 + idx + 1}</td>
                                  <td className="border-l border-slate-900 p-2 font-bold text-slate-900 text-center text-sm" dir="ltr">{new Date(day.date).toLocaleDateString('en-GB')}</td>
                                  <td className="border-l border-slate-900 p-2 font-bold text-slate-900 text-sm">{day.periodsDesc}</td>
                                  <td className="p-2 font-black text-center text-sm text-slate-800">
                                     {day.dayStatus === 'absent' ? 'غائب' : day.dayStatus === 'late' ? 'تأخير' : 'عذر مقبول'}
                                  </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                     
                     <div className="mt-auto pt-4 shrink-0">
                        <div className="flex justify-between items-center mb-8 px-10">
                           <div className="text-center">
                              <p className="font-bold text-slate-800 mb-6">توقيع شؤون الطلبة</p>
                              <p className="border-b border-slate-400 w-32 mx-auto"></p>
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-slate-800 mb-6">ختم المدرسة</p>
                              <p className="border-b border-slate-400 w-32 mx-auto"></p>
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-slate-800 mb-6">يعتمد ،،، مدير المدرسة</p>
                              <p className="border-b border-slate-400 w-32 mx-auto"></p>
                           </div>
                        </div>
                        <div className="flex justify-between items-end border-t-[3px] border-slate-900 pt-4">
                           <p className="font-bold text-slate-600 text-xs">صفحة {pageIndex + 1} من {Math.ceil(groupedAttendance.length / 14)}</p>
                           <p className="font-bold text-slate-600 text-xs">تاريخ استخراج التقرير: {new Date().toLocaleString('ar-EG')}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
      `}}/>
    </motion.div>
  );
}
