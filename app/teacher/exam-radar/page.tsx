// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCheck, ShieldCheck, Loader2, Search, CheckCircle2, XCircle, ScanLine, AlertTriangle, AlertCircle, Camera, CalendarClock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { QrReader } from 'react-qr-reader'; 

export default function InvigilatorRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [todayExam, setTodayExam] = useState<any>(null);
  const [myCommittee, setMyCommittee] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚀 حالات التحكم بالمسح
const [isScanMode, setIsScanMode] = useState(false);
const [isCameraActive, setIsCameraActive] = useState(false);
const [isScannerActive, setIsScannerActive] = useState(false);

const scanInputRef = useRef<HTMLInputElement>(null);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd'); 

  const fetchMyMission = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;

      const { data: exams } = await supabase
        .from('exam_timetables')
        .select('*, subjects(name)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .eq('exam_date', todayDate)
        .order('start_time')
        .limit(1);

      if (!exams || exams.length === 0) {
        setIsLoading(false);
        return; 
      }
      const activeExam = exams[0];
      setTodayExam(activeExam);

      const { data: myAssignment } = await supabase
        .from('committee_invigilators')
        .select('committee_id, exam_committees(*)')
        .eq('teacher_id', user.id)
        .single();

      if (!myAssignment) {
        setIsLoading(false);
        return; 
      }
      setMyCommittee(myAssignment.exam_committees);

      await fetchStudents(activeExam.id, myAssignment.committee_id);

    } catch (error) {
      console.error('Error fetching mission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (timetableId: string, committeeId: string) => {
    try {
      const { data: allocations } = await supabase
        .from('student_seat_allocations')
        .select(`
          seat_number, 
          student_id,
          students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )
        `)
        .eq('committee_id', committeeId)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('seat_number', { ascending: true });

      const { data: attendanceRecords } = await supabase
        .from('exam_attendance')
        .select('*')
        .eq('timetable_id', timetableId)
        .eq('committee_id', committeeId);

      const formattedStudents = (allocations || []).map((alloc: any) => {
        const studentInfo = alloc.students;
        const userInfo = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users;
        const sectionInfo = Array.isArray(studentInfo?.sections) ? studentInfo?.sections[0] : studentInfo?.sections;
        const classInfo = sectionInfo?.classes;

        const clsName = classInfo?.name || 'صف غير محدد';
        const secName = sectionInfo?.name ? ` - ${sectionInfo.name}` : '';
        const attendanceRecord = attendanceRecords?.find(r => r.student_id === alloc.student_id);

        return {
          student_id: alloc.student_id,
          seat_number: alloc.seat_number,
          full_name: userInfo?.full_name || 'طالب مجهول',
          avatar_url: userInfo?.avatar_url,
          class_name: `${clsName}${secName}`,
          status: attendanceRecord ? attendanceRecord.status : 'pending',
          record_id: attendanceRecord?.id || null
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error("Failed to fetch students", error);
    }
  };

  useEffect(() => {
    if (user?.id) fetchMyMission();
  }, [user?.id]);

  const markAttendance = async (studentId: string, newStatus: 'present' | 'absent' | 'excused') => {
    if (!todayExam?.id || !myCommittee?.id || !user?.id) return;
    setIsProcessing(true);

    try {
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status: newStatus } : s));

      const { data, error } = await supabase
        .from('exam_attendance')
        .upsert({ 
          student_id: studentId,
          timetable_id: todayExam.id,
          committee_id: myCommittee.id,
          status: newStatus,
          recorded_by: user.id
        }, { onConflict: 'student_id, timetable_id' })
        .select()
        .single();

      if (error) throw error;
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, record_id: data.id } : s));

    } catch (error) {
      console.error('Attendance Error:', error);
      alert('حدث خطأ بالاتصال، سيتم إعادة المحاولة.');
      fetchStudents(todayExam.id, myCommittee.id); 
    } finally {
      setIsProcessing(false);
    }
  };

  // 🚀 المحرك المركزي الجديد لمعالجة الأكواد
  const processScannedCode = (scannedCode: string) => {
    if (!scannedCode) return;
    
    let targetStudent = null;

    if (scannedCode.startsWith('raf-id:')) {
      const uuid = scannedCode.split(':')[1];
      targetStudent = students.find(s => s.student_id === uuid);
    } 
    else if (scannedCode.startsWith('raf-exam-seat:')) {
      const seatNumber = scannedCode.split(':')[1];
      targetStudent = students.find(s => String(s.seat_number) === seatNumber);
    } 
    else {
      targetStudent = students.find(s => String(s.seat_number) === scannedCode);
    }

    if (targetStudent) {
      if (targetStudent.status !== 'present') {
        playSuccessBeep();
        markAttendance(targetStudent.student_id, 'present');
      } else {
        playAlreadyEnteredBeep();
      }
    } else {
      playErrorBeep();
      alert(`عذراً، هذا الطالب لا ينتمي للجنة (${myCommittee?.name})! يرجى توجيهه للجنة الصحيحة.`);
    }
  };

  // معالج مسدس الباركود أو إدخال الكيبورد
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedCode = e.currentTarget.value.trim();
      e.currentTarget.value = ''; 
      processScannedCode(scannedCode);
    }
  };

  // 🚀 معالج الكاميرا (QrReader)
  const handleCameraScan = (result: any, error: any) => {
    if (!!result && result?.text) {
      const rawText = result.text.trim();
      setIsCameraActive(false); 
      processScannedCode(rawText);
timeoutRef.current = setTimeout(() => {
  setIsCameraActive(true);
}, 2500);    }
  };

useEffect(() => {
  if (isScanMode && !isCameraActive && scanInputRef.current) {
    scanInputRef.current.focus();
  }
}, [isScanMode, isCameraActive]);

useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);

  const playSuccessBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); };
  const playAlreadyEnteredBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.2); };
  const playErrorBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4); };

  if (!['teacher', 'admin', 'management'].includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
          <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-6">العودة للخلف</button>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(s => {
    const term = String(searchTerm || '').toLowerCase();
    const matchesName = String(s.full_name || '').toLowerCase().includes(term);
    const matchesSeat = String(s.seat_number || '').includes(term);
    return matchesName || matchesSeat;
  });

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo pb-24" dir="rtl">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-4 text-indigo-600">
               <Loader2 className="w-8 h-8 animate-spin" />
               <span className="font-black text-lg">جاري تحديد موقعك ومهامك...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="relative z-10">
            {myCommittee ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-3xl font-black mb-2 flex items-center gap-3 text-emerald-400">
                    <ShieldCheck className="w-8 h-8" /> {myCommittee.name}
                  </h1>
                  <p className="text-slate-300 font-bold flex items-center gap-2">
                    <CalendarClock className="w-4 h-4"/> مادة اليوم: {todayExam?.subjects?.name || 'غير محدد'} | الصف: {todayExam?.class_level || '-'}
                  </p>
                </div>
                
                <div className="flex gap-4 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                   <div className="text-center px-4 border-l border-white/20">
                      <p className="text-xs text-emerald-300 font-black mb-1">حاضر</p>
                      <p className="text-2xl font-black">{presentCount}</p>
                   </div>
                   <div className="text-center px-4">
                      <p className="text-xs text-rose-300 font-black mb-1">غائب</p>
                      <p className="text-2xl font-black">{absentCount}</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">لا توجد لك مهام مراقبة اليوم</h2>
                <p className="text-slate-400 font-bold">لم يتم تكليفك في أي لجنة لاختبارات هذا اليوم، استمتع بوقتك!</p>
              </div>
            )}
          </div>
        </div>

        {myCommittee && (
          <>
            {/* 🚀 قسم الكاميرا الجديد للمراقب */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 text-center border-b border-slate-100 bg-slate-50 flex flex-col items-center justify-center">
                 {!isScannerActive ? (
                    <button 
                       onClick={() => {
                         setIsScanMode(true);
                         setIsScannerActive(true);
                         setIsCameraActive(true);
                       }}
                       className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-3 transition-all active:scale-95"
                    >
                       <Camera className="w-6 h-6" /> تشغيل الكاميرا والمسح السريع
                    </button>
                 ) : (
                    <button 
                       onClick={() => {
                         setIsScanMode(false);
                         setIsScannerActive(false);
                         setIsCameraActive(false);
                       }}
                       className="bg-rose-100 hover:bg-rose-200 text-rose-600 font-black py-3 px-6 rounded-2xl shadow-sm flex items-center gap-3 transition-all"
                    >
                       <XCircle className="w-5 h-5" /> إيقاف الكاميرا
                    </button>
                 )}
                 <p className="text-xs font-bold text-slate-500 mt-4">قم بمسح الباركود الموجود على بطاقة الطالب ليتم تسجيل حضوره فوراً في السيرفر.</p>
              </div>
              
              <AnimatePresence>
                {isScannerActive && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-900 relative">
                     <div className="w-full max-w-sm mx-auto overflow-hidden rounded-none sm:rounded-2xl my-0 sm:my-6 shadow-2xl relative aspect-square bg-black border-4 border-emerald-500">
                        {isCameraActive ? (
                           <>
                              {/* 🚀 إجبار الكاميرا على ملء المربع عبر CSS */}
                              <div className="absolute inset-0 z-0 qr-force-wrapper">
                                 <QrReader 
                                    onResult={handleCameraScan} 
                                    constraints={{ facingMode: 'environment' }} 
                                    videoContainerStyle={{ width: '100%', height: '100%', paddingTop: 0, margin: 0 }} 
                                    videoStyle={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                 />
                              </div>
                              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
                                 <div className="w-full h-full border-2 border-emerald-400/50 rounded-2xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-1 -ml-1"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-1 -mr-1"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-1 -ml-1"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-1 -mr-1"></div>
                                    <div className="absolute w-full h-0.5 bg-emerald-300/80 shadow-[0_0_10px_rgba(52,211,153,0.8)] top-1/2 left-0 -translate-y-1/2 animate-scan"></div>
                                 </div>
                              </div>
                           </>
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-emerald-200/50">
                              <ScanLine className="w-16 h-16 mb-4" />
                              <p className="font-black">جاري الاستعداد للبطاقة التالية...</p>
                           </div>
                        )}
                     </div>

                     {/* حقل الإدخال للي يستخدمون مسدس بدلا من الكاميرا */}
                     <div className="max-w-xs mx-auto pb-6 px-4">
                        <input 
                           ref={scanInputRef}
                           type="text" 
                           onKeyDown={handleBarcodeScan}
                           onBlur={() => { if(isScanMode && !isCameraActive) scanInputRef.current?.focus(); }} 
                           className="w-full bg-white/10 border-2 border-white/40 rounded-2xl p-3 text-center font-black text-sm text-white outline-none placeholder:text-white/30 focus:border-white transition-all"
                           placeholder="أو امسح بمسدس خارجي..."
                        />
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                   <Users className="w-5 h-5 text-indigo-500" /> طلاب لجنتي ({students.length})
                 </h3>
                 <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                    <input
                       type="text"
                       className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-all"
                       placeholder="ابحث بالاسم أو رقم الجلوس..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map((student, idx) => {
                     const isPresent = student.status === 'present';
                     const isAbsent = student.status === 'absent';
                     const stdInitial = String(student.full_name || 'ط').charAt(0);

                     return (
                        <div key={student.student_id} className={cn(
                           "p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 relative overflow-hidden",
                           isPresent ? "bg-emerald-50 border-emerald-200" : 
                           isAbsent ? "bg-rose-50 border-rose-200" : 
                           "bg-white border-slate-100 hover:border-slate-300"
                        )}>
                           <div className="flex items-center gap-3">
                              <div className={cn(
                                 "w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-inner",
                                 isPresent ? "bg-emerald-200 text-emerald-700" :
                                 isAbsent ? "bg-rose-200 text-rose-700" : "bg-slate-100 text-slate-500"
                              )}>
                                 {student.avatar_url ? (
                                    <img src={student.avatar_url} className="w-full h-full rounded-xl object-cover" alt="avatar" />
                                 ) : stdInitial}
                              </div>
                              <div className="flex-1 min-w-0 pr-1">
                                 <p className="font-black text-sm text-slate-800 line-clamp-1">{student.full_name}</p>
                                 <p className="text-[10px] font-bold text-slate-500 mt-0.5">{student.class_name}</p>
                                 <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                                    <span className="text-amber-400">{student.seat_number}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex flex-col gap-2 shrink-0">
                              <button 
                                 onClick={() => markAttendance(student.student_id, 'present')}
                                 disabled={isProcessing}
                                 className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                                    isPresent ? "bg-emerald-500 text-white shadow-md" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                 )} title="تسجيل كحاضر"
                              >
                                 <CheckCircle2 className="w-5 h-5"/>
                              </button>
                              <button 
                                 onClick={() => markAttendance(student.student_id, 'absent')}
                                 disabled={isProcessing}
                                 className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                                    isAbsent ? "bg-rose-500 text-white shadow-md" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                 )} title="تسجيل كغائب"
                              >
                                 <XCircle className="w-5 h-5"/>
                              </button>
                           </div>
                        </div>
                     )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 🚀 CSS مخصص لإجبار الكاميرا على ملء الشاشة */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } } 
        .animate-scan { animation: scan 2s linear infinite; }
        
        .qr-force-wrapper section { padding-top: 0 !important; height: 100% !important; display: flex; align-items: center; justify-content: center; }
        .qr-force-wrapper video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}}/>
    </div>
  );
}
