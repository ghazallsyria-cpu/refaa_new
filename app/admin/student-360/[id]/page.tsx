// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useCallback, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, User, GraduationCap, Clock, CheckCircle2, AlertCircle, 
  BookOpen, FileText, Medal, Loader2, Activity, Target, ShieldAlert,
  MessageSquareHeart, Send, ShieldCheck, Database, XCircle, PrinterIcon, Download
} from 'lucide-react';

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

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

  // 1. جلب البيانات الأساسية من الدالة המجمعة (تعمل بنجاح)
  const fetchSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_student_360_summary', { p_student_id: studentId });
      if (error) throw error;
      setSummaryData(data);
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

  // 🚀 2. المحرك الجديد الذكي (Bulletproof Fetcher) لحل مشكلة العلاقات المتشابكة
  const loadTabData = async (tab: string) => {
    if (tabData[tab]) return; // الكاش موجود
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
      setTabData(prev => ({ ...prev, [tab]: [] })); // تأمين الشاشة من الانهيار
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
      
      // جلب بيانات المعلم لدمجها بالكاش فوراً
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
           <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600 h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-indigo-900 animate-pulse tracking-widest">جاري تحميل ملف الطالب الشامل...</h2>
      </div>
    </div>
  );

  if (!summaryData?.basic_info) return <div className="p-10 text-center font-bold text-rose-500">حدث خطأ أو أن الطالب غير موجود.</div>;

  const { basic_info, academic_summary, attendance_summary, badges_count } = summaryData;
  const avgScore = Number(academic_summary?.average_score || 0).toFixed(1);

  const filterSummaryStats = {
     absent: groupedAttendance.filter(d => d.dayStatus === 'absent').length,
     late: groupedAttendance.filter(d => d.dayStatus === 'late').length,
     excused: groupedAttendance.filter(d => d.dayStatus === 'excused').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20 relative overflow-x-hidden" dir="rtl">
      
      <AnimatePresence>
        {isPrinting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mb-4" />
            <h2 className="text-xl font-black">جاري تصميم وتوليد السجل الرسمي (PDF)...</h2>
            <p className="text-sm text-slate-300 mt-2">يرجى الانتظار لحظات...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 overflow-hidden z-0">
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 sm:pt-12">
        
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 w-fit active:scale-95">
          <ArrowRight className="w-4 h-4" /> عودة للخلف
        </button>

        <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none"></div>
           
           <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-[2rem] shadow-inner border-4 border-white flex items-center justify-center shrink-0 overflow-hidden text-indigo-600 font-black text-4xl">
                 {basic_info.avatar_url ? (
                    <img src={basic_info.avatar_url} className="w-full h-full object-cover" alt="Student" />
                 ) : (
                    basic_info.full_name.charAt(0)
                 )}
              </div>
              <div className="text-center md:text-right">
                 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{basic_info.full_name}</h1>
                 <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3">
                    <span className="bg-indigo-50 text-indigo-700 font-black text-xs px-3 py-1 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> الرقم المدني: {basic_info.national_id}</span>
                    <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-lg border border-blue-100 shadow-sm flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/> {basic_info.class_name} - {basic_info.section_name}</span>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 sm:gap-6 relative z-10">
              <div className="text-center">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xl shadow-sm mb-2">{avgScore}%</div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">المعدل العام</p>
              </div>
              <div className="text-center">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black text-xl shadow-sm mb-2">{attendance_summary?.total_absences || 0}</div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">أيام الغياب</p>
              </div>
              <div className="text-center hidden sm:block">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 font-black text-xl shadow-sm mb-2"><Medal className="w-6 h-6"/></div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">{badges_count} وسام</p>
              </div>
           </div>
        </div>

        <div className="mt-8 flex overflow-x-auto custom-scrollbar bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
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
                 "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm transition-all duration-300",
                 activeTab === tab.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
               )}
             >
               <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
           ))}
        </div>

        <div className="mt-6">
           <AnimatePresence mode="wait">
              {isTabLoading ? (
                 <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                 </motion.div>
              ) : (
                 <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    
                    {activeTab === 'overview' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm col-span-1 md:col-span-2">
                             <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500"/> ملخص النشاط</h3>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                  <div className="p-3 bg-white shadow-sm rounded-xl text-indigo-600"><FileText className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500">إجمالي الاختبارات</p>
                                    <p className="text-2xl font-black text-slate-800">{academic_summary?.total_exams_taken || 0}</p>
                                  </div>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                  <div className="p-3 bg-white shadow-sm rounded-xl text-rose-500"><Clock className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500">تأخير صباحي</p>
                                    <p className="text-2xl font-black text-slate-800">{attendance_summary?.total_lates || 0}</p>
                                  </div>
                               </div>
                             </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-500 to-orange-400 p-6 rounded-[2rem] shadow-md text-white relative overflow-hidden">
                             <Medal className="absolute -bottom-4 -left-4 w-32 h-32 text-white/20" />
                             <h3 className="font-black text-lg mb-2 relative z-10">صندوق الأوسمة</h3>
                             <p className="text-4xl font-black relative z-10 mt-4">{badges_count}</p>
                             <p className="text-xs font-bold text-amber-100 relative z-10 mt-1">وسام شرف أكاديمي وسلوكي</p>
                          </div>
                       </div>
                    )}

                    {activeTab === 'grades' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Database className="w-5 h-5 text-indigo-500"/> سجل درجات الاختبارات والمهام</h3>
                          </div>
                          <div className="overflow-x-auto">
                             <table className="w-full text-right">
                                <thead>
                                   <tr className="bg-white text-slate-400 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                                      <th className="p-4">المادة</th>
                                      <th className="p-4">التقييم / الاختبار</th>
                                      <th className="p-4 text-center">الدرجة المكتسبة</th>
                                      <th className="p-4">التاريخ</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                   {tabData['grades']?.length > 0 ? tabData['grades'].map((g: any) => (
                                      <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                         <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100">{g.subjects?.name || 'غير محدد'}</span></td>
                                         <td className="p-4">{g.title}</td>
                                         <td className="p-4 text-center">
                                            <span className="font-black text-lg text-slate-900">{g.score}</span> <span className="text-xs text-slate-400">/ {g.max_score}</span>
                                         </td>
                                         <td className="p-4 text-xs text-slate-500" dir="ltr">{new Date(g.created_at).toLocaleDateString('en-GB')}</td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={4} className="p-10 text-center text-slate-400">لا توجد درجات مسجلة حتى الآن.</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {activeTab === 'assignments' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
                          {tabData['assignments']?.length > 0 ? tabData['assignments'].map((a: any) => {
                             const isGraded = a.teacher_feedback?.includes('[تم رصد الدرجة]');
                             return (
                                <div key={a.id} className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-200 transition-all">
                                   <div className="w-full">
                                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                         {a.assignments_v2?.is_practice_mode ? <Target className="w-4 h-4 text-amber-500"/> : <FileText className="w-4 h-4 text-indigo-500"/>}
                                         {a.assignments_v2?.title || 'واجب بدون عنوان'}
                                      </h4>
                                      <div className="flex items-center gap-4 mt-2">
                                         {a.teacher_feedback && !isGraded && <p className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm inline-block"><MessageSquareHeart className="w-3 h-3 inline mr-1"/> {a.teacher_feedback}</p>}
                                         {a.teacher_feedback && isGraded && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm inline-block"><CheckCircle2 className="w-3 h-3 inline mr-1"/> {a.teacher_feedback}</p>}
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                                      {isGraded ? (
                                         <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200 font-black text-sm flex items-center gap-2 w-full justify-center">
                                            <CheckCircle2 className="w-4 h-4"/> مُصحح وتم الرصد
                                         </div>
                                      ) : a.is_completed ? (
                                         <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200 font-black text-sm flex items-center gap-2 w-full justify-center">
                                            <Clock className="w-4 h-4"/> بانتظار التصحيح
                                         </div>
                                      ) : (
                                         <div className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 w-full justify-center">
                                            قيد الإنجاز
                                         </div>
                                      )}
                                   </div>
                                </div>
                             )
                          }) : (
                             <div className="p-10 text-center text-slate-400 font-bold">لا يوجد سجل للواجبات.</div>
                          )}
                       </div>
                    )}

                    {activeTab === 'attendance' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 shrink-0"><ShieldAlert className="w-5 h-5 text-rose-500"/> سجل الغياب والانضباط</h3>
                             
                             <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select 
                                   value={attendanceFilter} 
                                   onChange={(e) => setAttendanceFilter(e.target.value as any)}
                                   className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-black rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 shadow-sm cursor-pointer"
                                >
                                   <option value="all">كل الأوقات</option>
                                   <option value="month">آخر شهر</option>
                                   <option value="week">آخر أسبوع</option>
                                </select>

                                <button onClick={downloadAttendancePDF} disabled={isPrinting || groupedAttendance.length === 0} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0">
                                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin"/> : <PrinterIcon className="w-4 h-4"/>}
                                  تصدير التقرير (PDF)
                                </button>
                             </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                             <table className="w-full text-right">
                                <thead>
                                   <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase border-b border-slate-200">
                                      <th className="p-4">التاريخ</th>
                                      <th className="p-4">نوع الغياب (يوم / حصص)</th>
                                      <th className="p-4 text-center">الحالة الإجمالية</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                   {groupedAttendance.length > 0 ? groupedAttendance.map((day: any) => (
                                      <tr key={day.date} className="border-b border-slate-50 hover:bg-slate-50/50">
                                         <td className="p-4" dir="ltr">{new Date(day.date).toLocaleDateString('en-GB')}</td>
                                         <td className="p-4 text-slate-600">
                                            {day.isFullDay ? (
                                               <span className="text-rose-600 font-black flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {day.periodsDesc}</span>
                                            ) : (
                                               <span className="text-amber-600 font-bold">{day.periodsDesc}</span>
                                            )}
                                         </td>
                                         <td className="p-4 text-center">
                                            {day.dayStatus === 'absent' && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-md text-xs font-black border border-rose-200">غائب</span>}
                                            {day.dayStatus === 'late' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-xs font-black border border-amber-200">تأخير</span>}
                                            {day.dayStatus === 'excused' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-black border border-blue-200">عذر مقبول</span>}
                                         </td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={3} className="p-10 text-center text-emerald-500 font-black"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400"/>لا توجد غيابات مسجلة في هذه الفترة.</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {activeTab === 'notes' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-4">
                             {tabData['notes']?.length > 0 ? tabData['notes'].map((n: any) => (
                                <div key={n.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                                   <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-3">
                                         {n.users?.avatar_url ? <img src={n.users.avatar_url} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500">{String(n.users?.full_name).charAt(0)}</div>}
                                         <div>
                                            <p className="text-sm font-black text-slate-800">{n.users?.full_name} <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{n.users?.role === 'teacher' ? 'معلم' : 'إدارة'}</span></p>
                                         </div>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                                   </div>
                                   <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{n.content}</p>
                                </div>
                             )) : (
                                <div className="bg-white p-10 rounded-[2rem] border border-slate-200 text-center text-slate-400 font-bold">لا توجد ملاحظات سرية مسجلة لهذا الطالب.</div>
                             )}
                          </div>
                          
                          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 h-fit sticky top-6">
                             <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2"><MessageSquareHeart className="w-5 h-5"/> إضافة ملاحظة سرية</h3>
                             <textarea 
                               rows={4} 
                               value={newNote}
                               onChange={e => setNewNote(e.target.value)}
                               placeholder="اكتب ملاحظة حول سلوك أو أداء الطالب (لن يراها الطالب، بل الإدارة والمعلمين فقط)..."
                               className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none shadow-sm mb-4"
                             />
                             <button onClick={handleAddNote} disabled={isSendingNote || !newNote.trim()} className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSendingNote ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>} حفظ الملاحظة
                             </button>
                          </div>
                       </div>
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

      </div>

      {/* 
        =========================================================
        🖨️ القالب المخفي لتوليد وثيقة الغياب PDF (مُحسّن)
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
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}}/>
    </div>
  );
}
