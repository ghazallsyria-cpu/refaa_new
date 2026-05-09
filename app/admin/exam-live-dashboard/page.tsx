// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, ShieldCheck, CheckCircle2, XCircle, Loader2, 
  Search, AlertTriangle, RefreshCw, LayoutGrid, Clock, Calendar, ShieldAlert, Siren, Image as ImageIcon, X, AlertCircle, ListChecks
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';

export default function ExamLiveDashboard() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [timetables, setTimetables] = useState<any[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [committees, setCommittees] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  const [cheatingReports, setCheatingReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 🚀 حالات نوافذ القوائم السريعة (للمدير)
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalType, setListModalType] = useState<'absent' | 'cheating' | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: todayExams } = await supabase
        .from('exam_timetables')
        .select('*, subjects(name)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .eq('exam_date', todayDate)
        .order('start_time');

      const { data: comms } = await supabase
        .from('exam_committees')
        .select('*')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      const sortedComms = (comms || []).sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setTimetables(todayExams || []);
      setCommittees(sortedComms); 
      
      if (todayExams && todayExams.length > 0) {
        setSelectedTimetableId(todayExams[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'admin' || currentRole === 'management') {
      fetchInitialData();
    }
  }, [currentRole]);

  const fetchLiveStats = async (showRefreshAnimation = false) => {
    if (!selectedTimetableId) return;
    if (showRefreshAnimation) setIsRefreshing(true);
    
    try {
      const selectedExam = timetables.find(t => t.id === selectedTimetableId);
      
      const { data: allocs } = await supabase
        .from('student_seat_allocations')
        .select(`
          seat_number, committee_id, student_id,
          students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )
        `)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      // فلترة الطلاب بناءً على صف المادة المحددة فقط
      const filteredAllocs = (allocs || []).filter((a: any) => {
         const classLvl = a.students?.sections?.classes?.level;
         return classLvl === selectedExam?.class_level;
      });

      const { data: attRecords } = await supabase
        .from('exam_attendance')
        .select('*')
        .eq('timetable_id', selectedTimetableId);

      const { data: cheatRecords } = await supabase
        .from('exam_cheating_reports')
        .select(`*, reporter:users!reporter_id(full_name)`)
        .eq('timetable_id', selectedTimetableId);

      setAllocations(filteredAllocs);
      setAttendance(attRecords || []);
      setCheatingReports(cheatRecords || []);
    } catch (error) {
      console.error('Error fetching live stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(() => fetchLiveStats(false), 15000);
    return () => clearInterval(interval);
  }, [selectedTimetableId]);

  const handleManualAttendance = async (studentId: string, committeeId: string, newStatus: 'present' | 'absent') => {
    if (!selectedTimetableId || !user?.id) return;
    
    if (cheatingReports.some(c => c.student_id === studentId)) {
       alert('تنبيه: هذا الطالب موقوف حالياً بسبب محضر غش! لا يمكن تغيير حالته يدوياً.');
       return;
    }

    setIsRefreshing(true);
    try {
      const { error } = await supabase
        .from('exam_attendance')
        .upsert({ 
          student_id: studentId,
          timetable_id: selectedTimetableId,
          committee_id: committeeId,
          status: newStatus,
          recorded_by: user.id
        }, { onConflict: 'student_id, timetable_id' });

      if (error) throw error;
      await fetchLiveStats(); 
    } catch (error) {
      alert('حدث خطأ أثناء التحديث اليدوي.');
      setIsRefreshing(false);
    }
  };

  const openEvidenceModal = (studentId: string) => {
    const report = cheatingReports.find(c => c.student_id === studentId);
    if (report) {
       setSelectedReport(report);
       setIsReportModalOpen(true);
    }
  };

  if (currentRole !== 'admin' && currentRole !== 'management') return null;

  // 🚀 تصحيح الحسابات الرياضية لمنع مشكلة (-1)
  const totalExpected = allocations.length;
  // الغائب: مسجل غائب وليس له محضر غش
  const totalAbsent = attendance.filter(a => a.status === 'absent' && !cheatingReports.some(c => c.student_id === a.student_id)).length;
  const totalCheating = cheatingReports.length;
  // الحاضر: مسجل حاضر وليس له محضر غش
  const totalPresent = attendance.filter(a => a.status === 'present' && !cheatingReports.some(c => c.student_id === a.student_id)).length;
  const totalPending = totalExpected - totalPresent - totalAbsent - totalCheating;
  
  const attendancePercentage = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

  // استخراج قوائم الغياب والغش لعرضها للمدير
  const absentStudentsList = allocations.filter(a => attendance.some(att => att.student_id === a.student_id && att.status === 'absent') && !cheatingReports.some(c => c.student_id === a.student_id));
  const cheatingStudentsList = allocations.filter(a => cheatingReports.some(c => c.student_id === a.student_id));

  const searchResults = allocations.filter(a => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase().trim();
    let searchId = term;
    if (term.startsWith('raf-id:')) searchId = term.split(':')[1];
    else if (term.startsWith('raf-exam-seat:')) searchId = term.split(':')[1];
    const studentName = String(a.students?.users?.full_name || '').toLowerCase();
    const seatNum = String(a.seat_number || '');
    const stdId = String(a.student_id || '').toLowerCase();
    return studentName.includes(term) || seatNum.includes(term) || stdId === searchId;
  }).slice(0, 5); 

  return (
    <div className="min-h-screen bg-[#0a0d16] p-4 sm:p-6 md:p-8 font-cairo text-slate-200 selection:bg-indigo-500/30 pb-32" dir="rtl">
      
      {isLoading && (
        <div className="fixed inset-0 bg-[#0a0d16] z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-indigo-400">
            <Loader2 className="w-12 h-12 animate-spin" />
            <span className="font-black tracking-widest text-lg animate-pulse">جاري تشغيل الرادارات المركزية...</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 relative">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-slate-700/50 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Activity className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-wide">غرفة العمليات المركزية</h1>
                <p className="text-indigo-300/80 font-bold text-sm">مراقبة حية للجان، التدخل اليدوي السريع، ومحاضر الغش.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-3 rounded-2xl border border-slate-700/50 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">{format(new Date(), 'dd MMMM yyyy', { locale: arSA })}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-amber-400 font-black tracking-widest min-w-[120px] justify-center shadow-inner">
                <Clock className="w-4 h-4" />
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <button onClick={() => fetchLiveStats(true)} disabled={isRefreshing} className="p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all disabled:opacity-50 group shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="mt-8 relative z-10">
            <select 
               value={selectedTimetableId} 
               onChange={(e) => setSelectedTimetableId(e.target.value)}
               className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-3.5 font-bold text-white outline-none focus:border-indigo-500 transition-colors shadow-inner"
            >
               <option value="" disabled>اختر المادة الحالية للمراقبة...</option>
               {timetables.map(t => (
                  <option key={t.id} value={t.id}>{t.subjects?.name} - الصف {t.class_level} ({t.start_time?.substring(0,5)})</option>
               ))}
            </select>
          </div>
        </div>

        {selectedTimetableId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-700/50 shadow-xl relative overflow-hidden">
                {totalCheating > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/20 blur-2xl rounded-full pointer-events-none animate-pulse"></div>}
                
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 relative z-10"><ShieldAlert className="w-5 h-5 text-indigo-400"/> ملخص الحضور العام</h3>
                
                <div className="flex justify-between text-sm font-bold text-slate-400 mb-2 relative z-10">
                   <span>نسبة التواجد السليم في اللجان</span>
                   <span className="text-emerald-400">{attendancePercentage}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3 mb-8 overflow-hidden border border-slate-700/50 relative z-10">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${attendancePercentage}%` }} transition={{ duration: 1 }} className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></motion.div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center">
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 mb-1 uppercase tracking-widest">إجمالي الطلاب</p>
                    <p className="text-2xl sm:text-3xl font-black text-white">{totalExpected}</p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex flex-col items-center justify-center">
                    <p className="text-[10px] sm:text-[11px] font-black text-emerald-400 mb-1 uppercase tracking-widest">حاضر الآن</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{totalPresent}</p>
                  </div>
                  
                  {/* 🚀 أزرار تفاعلية للمدير لفتح قوائم الغياب والغش */}
                  <button onClick={() => {setListModalType('absent'); setIsListModalOpen(true);}} disabled={totalAbsent === 0} className="bg-amber-500/10 hover:bg-amber-500/20 p-4 rounded-2xl border border-amber-500/20 flex flex-col items-center justify-center transition-colors disabled:opacity-50">
                    <p className="text-[10px] sm:text-[11px] font-black text-amber-400 mb-1 uppercase tracking-widest flex items-center gap-1">غائب <ListChecks className="w-3 h-3"/></p>
                    <p className="text-2xl sm:text-3xl font-black text-amber-400">{totalAbsent}</p>
                  </button>
                  <button onClick={() => {setListModalType('cheating'); setIsListModalOpen(true);}} disabled={totalCheating === 0} className={cn("p-4 rounded-2xl flex flex-col items-center justify-center border transition-colors disabled:opacity-50", totalCheating > 0 ? "bg-rose-600/20 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:bg-rose-600/30" : "bg-rose-500/5 border-rose-500/10")}>
                    <p className="text-[10px] sm:text-[11px] font-black text-rose-400 mb-1 uppercase tracking-widest flex items-center gap-1">{totalCheating > 0 && <Siren className="w-3 h-3 animate-pulse"/>} حالات الغش</p>
                    <p className="text-2xl sm:text-3xl font-black text-rose-400">{totalCheating}</p>
                  </button>
                </div>
              </div>

              <div className="bg-indigo-900/20 backdrop-blur-xl rounded-[2rem] p-6 border border-indigo-500/30 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2 relative z-10"><Search className="w-5 h-5 text-indigo-400"/> البحث والتدخل اليدوي</h3>
                <p className="text-xs font-bold text-indigo-200/70 mb-5 relative z-10">اكتب الاسم أو مرر البطاقة باستخدام مسدس الباركود.</p>
                
                <div className="relative z-10 mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="امسح الهوية أو ابحث بالاسم..."
                    className="w-full bg-slate-900/80 border border-indigo-500/30 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-400 transition-colors shadow-inner placeholder:text-slate-500"
                  />
                </div>

                {searchTerm && (
                  <div className="space-y-2 relative z-10 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {searchResults.length > 0 ? searchResults.map(s => {
                       const stdName = s.students?.users?.full_name || 'طالب';
                       const stdId = s.student_id;
                       const commId = s.committee_id;
                       
                       const isCheater = cheatingReports.some(c => c.student_id === stdId);
                       let currentAtt = 'pending';
                       if (isCheater) currentAtt = 'cheating';
                       else currentAtt = attendance.find(a => a.student_id === stdId)?.status || 'pending';
                       
                       return (
                         <div key={stdId} className={cn("p-3 rounded-xl border flex flex-col gap-3 transition-colors", isCheater ? "bg-rose-950/50 border-rose-500/50" : "bg-slate-800/80 border-slate-700 hover:border-indigo-500/50")}>
                           <div className="flex justify-between items-start">
                             <div>
                               <p className={cn("text-sm font-black truncate max-w-[150px]", isCheater ? "text-rose-400" : "text-white")}>{stdName}</p>
                               <p className="text-[10px] font-bold text-slate-400 mt-1">جلوس: <span className={isCheater ? "text-rose-400" : "text-amber-400"}>{s.seat_number}</span></p>
                             </div>
                             <div className={cn("px-2 py-0.5 rounded text-[10px] font-black border", 
                                currentAtt === 'cheating' ? "bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse" :
                                currentAtt === 'present' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : 
                                currentAtt === 'absent' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : 
                                "bg-slate-900 text-slate-400 border-slate-700"
                             )}>
                               {currentAtt === 'cheating' ? '🛑 محضر غش' : currentAtt === 'present' ? 'حاضر' : currentAtt === 'absent' ? 'غائب' : 'لم يُرصد'}
                             </div>
                           </div>
                           
                           {isCheater ? (
                              <button onClick={() => openEvidenceModal(stdId)} className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.3)] rounded-lg text-xs font-black transition-all flex justify-center items-center gap-2">
                                <Siren className="w-4 h-4"/> عرض المحضر والأدلة
                              </button>
                           ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { handleManualAttendance(stdId, commId, 'present'); setSearchTerm(''); }} className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-black transition-all">حاضر (يدوي)</button>
                                <button onClick={() => { handleManualAttendance(stdId, commId, 'absent'); setSearchTerm(''); }} className="py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-black transition-all">غائب (يدوي)</button>
                              </div>
                           )}
                         </div>
                       )
                    }) : (
                      <p className="text-center text-xs font-bold text-slate-400 py-4">لم يتم العثور على طالب مطابق.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2 ml-2"><LayoutGrid className="w-6 h-6 text-indigo-400"/> حالة اللجان المباشرة (للمادة المحددة)</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {committees.map(committee => {
                   const commAllocs = allocations.filter(a => a.committee_id === committee.id);
                   const commCapacity = commAllocs.length;
                   if (commCapacity === 0) return null; 

                   const commCheatCount = cheatingReports.filter(c => c.committee_id === committee.id).length;
                   const hasCheating = commCheatCount > 0;

                   const commAtts = attendance.filter(a => a.committee_id === committee.id);
                   
                   // 🚀 إصلاح الحسبة للجنة: الحاضر والغائب هم من ليس لهم محضر غش فقط
                   const commPresent = commAtts.filter(a => a.status === 'present' && !cheatingReports.some(c => c.student_id === a.student_id)).length;
                   const commAbsent = commAtts.filter(a => a.status === 'absent' && !cheatingReports.some(c => c.student_id === a.student_id)).length;
                   const commPending = commCapacity - commPresent - commAbsent - commCheatCount;

                   const isCompleted = commPending === 0;
                   const isCritical = commPending > 0 && commPresent === 0 && attendance.length > 10; 

                   return (
                     <div key={committee.id} className={cn(
                       "rounded-[1.5rem] p-5 border relative overflow-hidden transition-all duration-500",
                       hasCheating ? "bg-rose-950/40 border-rose-500/50 shadow-[0_0_30px_rgba(225,29,72,0.2)]" :
                       isCompleted ? "bg-emerald-900/10 border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.05)]" :
                       isCritical ? "bg-amber-900/10 border-amber-500/30" :
                       "bg-slate-800/40 border-slate-700/50"
                     )}>
                       {isCompleted && !hasCheating && <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse"></div>}
                       {hasCheating && <Siren className="absolute top-4 left-4 w-5 h-5 text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]" />}

                       <h3 className={cn("text-lg font-black mb-4 flex items-center gap-2", hasCheating ? "text-rose-400" : "text-white")}>
                         {committee.name}
                       </h3>
                       
                       <div className="flex justify-between items-center mb-4">
                         <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 mb-1">الطلاب</p>
                            <p className="text-xl font-black text-white">{commCapacity}</p>
                         </div>
                         <div className="w-px h-8 bg-slate-700"></div>
                         <div className="text-center">
                            <p className="text-[10px] font-black text-emerald-400 mb-1">حاضر</p>
                            <p className="text-xl font-black text-emerald-400">{commPresent}</p>
                         </div>
                         <div className="w-px h-8 bg-slate-700"></div>
                         <div className="text-center">
                            <p className="text-[10px] font-black text-amber-400 mb-1">غائب</p>
                            <p className="text-xl font-black text-amber-400">{commAbsent}</p>
                         </div>
                         {hasCheating && (
                           <>
                             <div className="w-px h-8 bg-rose-500/50"></div>
                             <div className="text-center">
                                <p className="text-[10px] font-black text-rose-500 mb-1 animate-pulse">حرمان</p>
                                <p className="text-xl font-black text-rose-500">{commCheatCount}</p>
                             </div>
                           </>
                         )}
                       </div>

                       <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden flex">
                         <div style={{ width: `${(commPresent/commCapacity)*100}%` }} className="bg-emerald-500 h-full transition-all duration-1000"></div>
                         <div style={{ width: `${(commAbsent/commCapacity)*100}%` }} className="bg-amber-500 h-full transition-all duration-1000"></div>
                         <div style={{ width: `${(commCheatCount/commCapacity)*100}%` }} className="bg-rose-600 h-full transition-all duration-1000"></div>
                         <div style={{ width: `${(commPending/commCapacity)*100}%` }} className="bg-slate-700 h-full transition-all duration-1000"></div>
                       </div>
                       
                       <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
                         <span className={isCompleted ? "text-emerald-400" : "text-slate-400"}>
                           {isCompleted ? '✓ اكتمل رصد اللجنة' : `يتبقى ${commPending} طالب`}
                         </span>
                         {isCritical && !hasCheating && <span className="text-amber-400 flex items-center gap-1 animate-pulse"><AlertTriangle className="w-3 h-3"/> المراقب متأخر!</span>}
                         {hasCheating && <span className="text-rose-400 flex items-center gap-1 font-black"><AlertCircle className="w-3 h-3"/> يوجد محضر غش!</span>}
                       </div>
                     </div>
                   )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/30 rounded-[2rem] p-12 text-center border border-slate-700/50 border-dashed">
            <LayoutGrid className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-300 mb-2">لا يوجد اختبار قيد التشغيل</h3>
            <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto">لم يتم العثور على اختبارات مبرمجة في هذا اليوم، أو يرجى التأكد من الجداول الامتحانية.</p>
          </div>
        )}
      </div>

      {/* 🚀 نافذة القوائم السريعة (الغياب / الغش) */}
      <AnimatePresence>
        {isListModalOpen && listModalType && (
          <Dialog.Root open={isListModalOpen} onOpenChange={setIsListModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1423] border border-slate-700 rounded-[2rem] w-[95%] max-w-md shadow-2xl z-[200] overflow-hidden flex flex-col max-h-[85vh]" dir="rtl">
                <div className={cn("p-5 sm:p-6 flex justify-between items-center shrink-0", listModalType === 'cheating' ? "bg-rose-950/80 border-b border-rose-500/30" : "bg-amber-950/80 border-b border-amber-500/30")}>
                  <Dialog.Title className={cn("text-lg font-black flex items-center gap-2", listModalType === 'cheating' ? "text-rose-400" : "text-amber-400")}>
                    {listModalType === 'cheating' ? <Siren className="w-5 h-5 animate-pulse"/> : <Users className="w-5 h-5"/>}
                    {listModalType === 'cheating' ? 'قائمة حالات الغش والحرمان' : 'قائمة الطلاب الغائبين'}
                  </Dialog.Title>
                  <Dialog.Close className="text-slate-400 hover:text-white bg-black/20 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-[#0a0d16]/50">
                   {(listModalType === 'cheating' ? cheatingStudentsList : absentStudentsList).map(a => {
                      const cName = committees.find(c => c.id === a.committee_id)?.name || 'لجنة غير محددة';
                      return (
                        <div key={a.student_id} className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 flex justify-between items-center">
                           <div>
                             <p className="text-sm font-black text-white">{a.students?.users?.full_name}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1">الجلوس: <span className="text-amber-400">{a.seat_number}</span> | {cName}</p>
                           </div>
                           {listModalType === 'cheating' && (
                             <button onClick={() => openEvidenceModal(a.student_id)} className="shrink-0 p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors" title="عرض المحضر"><Eye className="w-4 h-4"/></button>
                           )}
                        </div>
                      )
                   })}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة قراءة محضر الغش */}
      <AnimatePresence>
        {isReportModalOpen && selectedReport && (
          <Dialog.Root open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200]" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f1423] border-2 border-rose-500/50 rounded-[2rem] w-[95%] max-w-lg shadow-[0_0_80px_rgba(225,29,72,0.3)] z-[200] overflow-hidden" dir="rtl">
                
                <div className="bg-rose-600 p-5 sm:p-6 flex justify-between items-center shrink-0">
                  <Dialog.Title className="text-xl font-black text-white flex items-center gap-3">
                    <Siren className="w-6 h-6 animate-pulse" /> تفاصيل محضر الغش
                  </Dialog.Title>
                  <Dialog.Close className="text-white hover:text-rose-200 bg-black/20 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   {selectedReport.evidence_url ? (
                     <div className="rounded-2xl overflow-hidden border-2 border-slate-700 bg-black relative group">
                        <img src={selectedReport.evidence_url} alt="Evidence" className="w-full h-48 sm:h-64 object-contain" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href={selectedReport.evidence_url} target="_blank" rel="noreferrer" className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-black px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-white/20">
                             <ImageIcon className="w-4 h-4"/> تكبير الصورة
                           </a>
                        </div>
                     </div>
                   ) : (
                     <div className="h-32 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center text-slate-500">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50"/>
                        <p className="font-bold text-sm">المراقب لم يرفق صورة للأداة.</p>
                     </div>
                   )}

                   <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                     <div className="flex justify-between border-b border-slate-700 pb-2">
                       <span className="text-xs font-bold text-slate-400">تحرير المحضر بواسطة:</span>
                       <span className="text-sm font-black text-indigo-400">{selectedReport.reporter?.full_name}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-700 pb-2">
                       <span className="text-xs font-bold text-slate-400">توقيت التحرير:</span>
                       <span className="text-sm font-black text-amber-400" dir="ltr">{format(new Date(selectedReport.created_at), 'hh:mm:ss a')}</span>
                     </div>
                     <div>
                       <span className="text-xs font-bold text-slate-400 block mb-2">إفادة المراقب:</span>
                       <p className="text-sm font-bold text-white leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-700/50 whitespace-pre-wrap">
                         {selectedReport.notes}
                       </p>
                     </div>
                   </div>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.6); }
      `}</style>
    </div>
  );
}
