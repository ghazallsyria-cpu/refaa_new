// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCheck, ShieldCheck, Loader2, Search, CheckCircle2, XCircle, ScanLine, 
  AlertTriangle, AlertCircle, Camera, CalendarClock, Siren, UploadCloud, FileSignature, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QrReader } from 'react-qr-reader'; 
import * as Dialog from '@radix-ui/react-dialog'; 

export default function InvigilatorRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [todayExams, setTodayExams] = useState<any[]>([]); // 🚀 جلب جميع اختبارات اليوم
  const [myCommittee, setMyCommittee] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حالات التحكم بالمسح
  const [isScanMode, setIsScanMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);

  // حالات محضر الغش
  const [isCheatingModalOpen, setIsCheatingModalOpen] = useState(false);
  const [selectedCheatingStudent, setSelectedCheatingStudent] = useState<any>(null);
  const [cheatingNotes, setCheatingNotes] = useState('');
  const [cheatingEvidenceUrl, setCheatingEvidenceUrl] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd'); 

  const fetchMyMission = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;

      // 🚀 جلب جميع اختبارات اليوم (عاشر، حادي عشر، إلخ)
      const { data: exams } = await supabase
        .from('exam_timetables')
        .select('*, subjects(name)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .eq('exam_date', todayDate);

      if (!exams || exams.length === 0) {
        setIsLoading(false); return; 
      }
      setTodayExams(exams);

      const { data: myAssignment } = await supabase
        .from('committee_invigilators')
        .select('committee_id, exam_committees(*)')
        .eq('teacher_id', user.id)
        .single();

      if (!myAssignment) {
        setIsLoading(false); return; 
      }
      setMyCommittee(myAssignment.exam_committees);

      await fetchStudents(exams, myAssignment.committee_id);

    } catch (error) {
      console.error('Error fetching mission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (allTodayExams: any[], committeeId: string) => {
    try {
      const { data: allocations } = await supabase
        .from('student_seat_allocations')
        .select(`seat_number, student_id, students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )`)
        .eq('committee_id', committeeId)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('seat_number', { ascending: true });

      const { data: attendanceRecords } = await supabase
        .from('exam_attendance')
        .select('*')
        .eq('committee_id', committeeId);

      const { data: cheatingRecords } = await supabase
        .from('exam_cheating_reports')
        .select('*')
        .eq('committee_id', committeeId);

      const formattedStudents = (allocations || []).map((alloc: any) => {
        const studentInfo = alloc.students;
        const userInfo = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users;
        const sectionInfo = Array.isArray(studentInfo?.sections) ? studentInfo?.sections[0] : studentInfo?.sections;
        const classInfo = sectionInfo?.classes;
        const classLevel = classInfo?.level;

        // 🚀 تحديد الاختبار الخاص بهذا الطالب بالتحديد بناءً على صفه!
        const studentExam = allTodayExams.find(e => e.class_level === classLevel);

        const clsName = classInfo?.name || 'صف غير محدد';
        const secName = sectionInfo?.name ? ` - ${sectionInfo.name}` : '';
        
        // جلب سجلات الطالب الخاصة باختباره
        const attendanceRecord = attendanceRecords?.find(r => r.student_id === alloc.student_id && r.timetable_id === studentExam?.id);
        const cheatRecord = cheatingRecords?.find(r => r.student_id === alloc.student_id && r.timetable_id === studentExam?.id);

        let finalStatus = 'pending';
        if (cheatRecord) finalStatus = 'cheating';
        else if (attendanceRecord) finalStatus = attendanceRecord.status;

        return {
          student_id: alloc.student_id,
          seat_number: alloc.seat_number,
          full_name: userInfo?.full_name || 'طالب مجهول',
          avatar_url: userInfo?.avatar_url,
          class_name: `${clsName}${secName}`,
          class_level: classLevel,
          exam_id: studentExam?.id || null, // 🚀 حفظ ID الاختبار الخاص به
          exam_subject: studentExam?.subjects?.name || 'لا يوجد اختبار مبرمج',
          status: finalStatus,
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

  const markAttendance = async (studentId: string, newStatus: 'present' | 'absent' | 'excused' | 'cheating') => {
    const student = students.find(s => s.student_id === studentId);
    if (!student || !student.exam_id || !myCommittee?.id || !user?.id) {
       alert('لا يوجد اختبار مبرمج لهذا الطالب اليوم!');
       return;
    }
    
    setIsProcessing(true);
    try {
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status: newStatus } : s));

      const { data, error } = await supabase
        .from('exam_attendance')
        .upsert({ 
          student_id: studentId,
          timetable_id: student.exam_id, // 🚀 نرسل ID الاختبار الخاص بالطالب
          committee_id: myCommittee.id,
          status: newStatus === 'cheating' ? 'present' : newStatus, // نعتبره حاضراً في جدول الغياب لأنه غش
          recorded_by: user.id
        }, { onConflict: 'student_id, timetable_id' })
        .select()
        .single();

      if (error) throw error;
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, record_id: data.id } : s));

    } catch (error: any) {
      alert('حدث خطأ أثناء تسجيل الحالة!');
      fetchStudents(todayExams, myCommittee.id);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🚀 معالج مسح الباركود
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
      if (targetStudent.status === 'cheating') {
        playErrorBeep();
        alert('تنبيه: هذا الطالب موقوف بسبب محضر غش سابق!');
      } else if (targetStudent.status !== 'present') {
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

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedCode = e.currentTarget.value.trim();
      e.currentTarget.value = ''; 
      processScannedCode(scannedCode);
    }
  };

  const handleCameraScan = (result: any, error: any) => {
    if (!!result && result?.text) {
      const rawText = result.text.trim();
      setIsCameraActive(false); 
      processScannedCode(rawText);
      timeoutRef.current = setTimeout(() => {
        setIsCameraActive(true);
      }, 2500);    
    }
  };

  useEffect(() => {
    if (isScanMode && !isCameraActive && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScanMode, isCameraActive]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // 🚀 دوال محضر الغش
  const openCheatingModal = (student: any) => {
    setSelectedCheatingStudent(student);
    setCheatingNotes('');
    setCheatingEvidenceUrl('');
    setIsCheatingModalOpen(true);
  };

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rafaa_preset');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzmyqnj01';
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.secure_url) {
        setCheatingEvidenceUrl(data.secure_url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      alert('فشل رفع الصورة المرفقة. تأكد من جودة الاتصال.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const submitCheatingReport = async () => {
    if (!cheatingNotes.trim()) { alert('يرجى كتابة تفاصيل واقعة الغش!'); return; }
    if (!selectedCheatingStudent.exam_id) { alert('هذا الطالب ليس لديه اختبار مسجل اليوم!'); return; }
    if (!confirm('تنبيه: سيتم رفع المحضر للجنة الكنترول المركزية ولن يمكنك التراجع. هل أنت متأكد من حالة الغش؟')) return;
    
    setIsProcessing(true);
    try {
      const payload = {
        student_id: selectedCheatingStudent.student_id,
        timetable_id: selectedCheatingStudent.exam_id, // 🚀 نربط الغش باختباره الخاص
        committee_id: myCommittee.id,
        reporter_id: user.id,
        notes: cheatingNotes,
        evidence_url: cheatingEvidenceUrl,
        status: 'pending_review'
      };

      const { error } = await supabase.from('exam_cheating_reports').insert([payload]);
      if (error) throw error;

      await markAttendance(selectedCheatingStudent.student_id, 'cheating');
      alert('تم رفع المحضر بنجاح. الطالب الآن في حالة حرمان بانتظار قرار الكنترول.');
      setIsCheatingModalOpen(false);
    } catch (e) {
      alert('حدث خطأ أثناء رفع المحضر.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playSuccessBeep = () => { try{ const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); }catch(e){} };
  const playAlreadyEnteredBeep = () => { try{ const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.2); }catch(e){} };
  const playErrorBeep = () => { try{ const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4); }catch(e){} };

  if (!['teacher', 'admin', 'management'].includes(currentRole)) return null;

  const filteredStudents = students.filter(s => {
    const term = String(searchTerm || '').toLowerCase();
    const matchesName = String(s.full_name || '').toLowerCase().includes(term);
    const matchesSeat = String(s.seat_number || '').includes(term);
    return matchesName || matchesSeat;
  });

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const cheatingCount = students.filter(s => s.status === 'cheating').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo pb-24" dir="rtl">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-4 text-indigo-600">
               <Loader2 className="w-8 h-8 animate-spin" />
               <span className="font-black text-lg">جاري التجهيز...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="relative z-10">
            {myCommittee ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-3xl font-black mb-2 flex items-center gap-3 text-emerald-400">
                    <ShieldCheck className="w-8 h-8" /> {myCommittee.name}
                  </h1>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* 🚀 عرض جميع المواد التي يتم اختبارها في هذه اللجنة */}
                    {todayExams.map((ex, i) => (
                       <span key={i} className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-white/20"><CalendarClock className="w-3.5 h-3.5"/> {ex.subjects?.name} (صف {ex.class_level})</span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                   <div className="text-center px-4 border-l border-white/20">
                      <p className="text-xs text-emerald-300 font-black mb-1">حاضر</p>
                      <p className="text-2xl font-black">{presentCount}</p>
                   </div>
                   <div className="text-center px-4 border-l border-white/20">
                      <p className="text-xs text-amber-300 font-black mb-1">غائب</p>
                      <p className="text-2xl font-black">{absentCount}</p>
                   </div>
                   <div className="text-center px-4">
                      <p className="text-xs text-rose-400 font-black mb-1">غش</p>
                      <p className="text-2xl font-black text-rose-400">{cheatingCount}</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">لا توجد لك مهام مراقبة اليوم</h2>
              </div>
            )}
          </div>
        </div>

        {myCommittee && (
          <>
            {/* 🚀 قسم الكاميرا الجديد (تم حل مشكلة الشاشة السوداء) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 text-center border-b border-slate-100 bg-slate-50 flex flex-col items-center justify-center">
                 {!isScannerActive ? (
                    <button 
                       onClick={() => { setIsScanMode(true); setIsScannerActive(true); setIsCameraActive(true); }}
                       className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-3 transition-all active:scale-95"
                    >
                       <Camera className="w-6 h-6" /> تشغيل الكاميرا للتحضير السريع
                    </button>
                 ) : (
                    <button 
                       onClick={() => { setIsScanMode(false); setIsScannerActive(false); setIsCameraActive(false); }}
                       className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 px-6 rounded-2xl shadow-sm flex items-center gap-3 transition-all"
                    >
                       <XCircle className="w-5 h-5" /> إيقاف الكاميرا
                    </button>
                 )}
                 <p className="text-xs font-bold text-slate-500 mt-4">امسح الباركود الخاص بالطالب ليتم تسجيل حضوره فوراً.</p>
              </div>
              
              <AnimatePresence>
                {isScannerActive && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-900">
                     <div className="w-full max-w-sm mx-auto overflow-hidden sm:rounded-2xl my-6 shadow-2xl relative aspect-square bg-black border-4 border-emerald-500 flex items-center justify-center">
                        {isCameraActive ? (
                           <div className="w-full h-full relative">
                              <QrReader 
                                 onResult={handleCameraScan} 
                                 constraints={{ facingMode: 'environment' }} 
                                 containerStyle={{ width: '100%', height: '100%' }} 
                                 videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                              {/* إطار المسح */}
                              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
                                 <div className="w-full h-full border-2 border-emerald-400/50 rounded-2xl relative shadow-[inset_0_0_20px_rgba(52,211,153,0.3)]">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-1 -ml-1"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-1 -mr-1"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-1 -ml-1"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-1 -mr-1"></div>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="text-emerald-200/50 flex flex-col items-center">
                              <ScanLine className="w-16 h-16 mb-4 animate-pulse" />
                              <p className="font-black">جاري الاستعداد...</p>
                           </div>
                        )}
                     </div>

                     <div className="max-w-xs mx-auto pb-6 px-4">
                        <input 
                           ref={scanInputRef} type="text" onKeyDown={handleBarcodeScan} onBlur={() => { if(isScanMode && !isCameraActive) scanInputRef.current?.focus(); }} 
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
                 <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> قائمة الطلاب</h3>
                 <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm" placeholder="ابحث بالاسم أو الجلوس..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                 </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map((student, idx) => {
                     const isPresent = student.status === 'present';
                     const isAbsent = student.status === 'absent';
                     const isCheating = student.status === 'cheating';

                     return (
                        <div key={student.student_id} className={cn("p-4 rounded-2xl border-2 transition-all flex flex-col xl:flex-row items-center justify-between gap-4", isCheating ? "bg-slate-900 border-slate-800" : isPresent ? "bg-emerald-50 border-emerald-200" : isAbsent ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100")}>
                           <div className="flex items-center gap-3 w-full xl:w-auto">
                              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-inner", isCheating ? "bg-rose-500/20 text-rose-400" : isPresent ? "bg-emerald-200 text-emerald-700" : isAbsent ? "bg-amber-200 text-amber-700" : "bg-slate-100 text-slate-500")}>
                                 {isCheating ? <Siren className="w-6 h-6 animate-pulse" /> : student.avatar_url ? <img src={student.avatar_url} className="w-full h-full rounded-xl object-cover" alt="avatar" /> : String(student.full_name).charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0 pr-1">
                                 <p className={cn("font-black text-sm line-clamp-1", isCheating ? "text-rose-400" : "text-slate-800")}>{student.full_name}</p>
                                 <p className={cn("text-[10px] font-bold mt-0.5", isCheating ? "text-slate-500" : "text-slate-500")}>{student.class_name} • <span className={isCheating ? "text-rose-500" : "text-indigo-500"}>{student.exam_subject}</span></p>
                                 <div className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-widest"><span className={isCheating ? "text-rose-400" : "text-amber-400"}>{student.seat_number}</span></div>
                              </div>
                           </div>

                           <div className="flex items-center gap-2 shrink-0 w-full xl:w-auto justify-end">
                              {isCheating ? (
                                 <div className="px-4 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-lg text-xs font-black w-full text-center">حالة غش وحرمان 🛑</div>
                              ) : (
                                 <>
                                    <button onClick={() => markAttendance(student.student_id, 'present')} disabled={isProcessing} className={cn("p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50", isPresent ? "bg-emerald-500 text-white shadow-md" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")} title="حاضر"><CheckCircle2 className="w-5 h-5"/></button>
                                    <button onClick={() => markAttendance(student.student_id, 'absent')} disabled={isProcessing} className={cn("p-2 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50", isAbsent ? "bg-amber-500 text-white shadow-md" : "bg-amber-50 text-amber-600 hover:bg-amber-100")} title="غائب"><XCircle className="w-5 h-5"/></button>
                                    {/* 🚀 زر محضر الغش يعمل بنجاح */}
                                    <button onClick={() => openCheatingModal(student)} disabled={isProcessing} className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100" title="محضر غش"><Siren className="w-5 h-5"/></button>
                                 </>
                              )}
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

      {/* 🚀 نافذة (Modal) محضر الغش */}
      <AnimatePresence>
        {isCheatingModalOpen && selectedCheatingStudent && (
          <Dialog.Root open={isCheatingModalOpen} onOpenChange={setIsCheatingModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-rose-950/80 backdrop-blur-md z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0f1d] border-2 border-rose-500/50 rounded-[2.5rem] w-[95%] max-w-lg shadow-[0_0_80px_rgba(225,29,72,0.4)] z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-6 border-b border-rose-500/20 pb-6 relative z-10">
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-rose-400 flex items-center gap-3">
                      <Siren className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" /> تحرير محضر غش!
                    </Dialog.Title>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2">توثيق حالة طارئة للطالب: <span className="text-white">{selectedCheatingStudent.full_name}</span></p>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-400 bg-white/5 p-2 rounded-full transition-colors active:scale-90"><X className="w-5 h-5" /></Dialog.Close>
                </div>

                <div className="space-y-5 relative z-10">
                  <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-rose-200 leading-relaxed">
                      هذا الإجراء رسمي ولا رجعة فيه. سيتم تحويل الطالب إلى حالة (حرمان)، وسيرفع المحضر فوراً لغرفة العمليات المركزية لاتخاذ القرار.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-rose-300 uppercase tracking-widest">تفاصيل الواقعة بدقة</label>
                    <textarea 
                      value={cheatingNotes} onChange={(e) => setCheatingNotes(e.target.value)}
                      placeholder="كيف تمت محاولة الغش؟ أين وجدت الأداة؟..." 
                      className="w-full bg-black/40 border border-rose-500/30 rounded-xl p-4 text-xs sm:text-sm font-bold text-white outline-none focus:border-rose-400 h-28 resize-none custom-scrollbar shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-xs font-black text-rose-300 uppercase tracking-widest">تصوير الأداة المضبوطة (إلزامي للتوثيق)</label>
                    <label className={cn("relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all", isUploadingEvidence ? "border-rose-500/50 bg-rose-500/10" : cheatingEvidenceUrl ? "border-emerald-500/50 bg-emerald-500/10" : "border-rose-500/30 bg-black/40 hover:border-rose-400 hover:bg-rose-500/5")}>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleEvidenceUpload} disabled={isUploadingEvidence} />
                      {isUploadingEvidence ? (
                        <div className="flex flex-col items-center gap-2 text-rose-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-[10px] font-black">جاري رفع الدليل...</span></div>
                      ) : cheatingEvidenceUrl ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-400"><CheckCircle2 className="w-6 h-6" /><span className="text-[10px] font-black">تم إرفاق الدليل بنجاح</span></div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-rose-300/60"><Camera className="w-6 h-6" /><span className="text-[10px] font-bold">افتح الكاميرا لالتقاط صورة</span></div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-rose-500/20 flex gap-3 relative z-10">
                  <button onClick={submitCheatingReport} disabled={isProcessing || isUploadingEvidence} className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileSignature className="w-5 h-5"/> اعتماد المحضر الرسمي</>}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    </div>
  );
}
