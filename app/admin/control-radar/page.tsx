// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, Search, CheckCircle2, XCircle, ScanLine, AlertTriangle, Camera, UserCheck, Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ControlRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  
  // الخريطة السريعة للمعلمين المكلفين اليوم
  const [invigilatorsMap, setInvigilatorsMap] = useState<Map<string, any>>(new Map());
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [scannedToday, setScannedToday] = useState(0);
  
  const [todayExam, setTodayExam] = useState<any>(null);
  const [lastScanned, setLastScanned] = useState<any>(null);
  
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  // 1️⃣ استخبارات الكنترول: من هم المعلمون المكلفون اليوم؟
  const fetchControlData = async () => {
    setIsLoading(true);
    try {
      // أ. جلب اختبار اليوم
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
        return; // لا يوجد اختبار
      }
      const activeExam = exams[0];
      setTodayExam(activeExam);

      // ب. جلب تكليفات اللجان للمعلمين
      const { data: assignments } = await supabase
        .from('committee_invigilators')
        .select(`
          teacher_id,
          exam_committees!inner(id, name, academic_year, semester),
          users!committee_invigilators_teacher_id_fkey(full_name, avatar_url)
        `)
        .eq('exam_committees.academic_year', currentYear)
        .eq('exam_committees.semester', currentSemester);

      // ج. جلب سجلات حضور الكنترول لهذا الاختبار
      const { data: attendanceRecords } = await supabase
        .from('invigilator_attendance')
        .select('teacher_id')
        .eq('timetable_id', activeExam.id);

      const scannedIds = new Set(attendanceRecords?.map(r => r.teacher_id));

      const map = new Map();
      (assignments || []).forEach((assignment: any) => {
        const userInfo = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
        
        map.set(String(assignment.teacher_id), {
          teacher_id: assignment.teacher_id,
          full_name: userInfo?.full_name || 'معلم مجهول',
          avatar_url: userInfo?.avatar_url,
          committee_id: assignment.exam_committees.id,
          committee_name: assignment.exam_committees.name,
          has_scanned: scannedIds.has(assignment.teacher_id)
        });
      });

      setInvigilatorsMap(map);
      setTotalAssigned(map.size);
      setScannedToday(scannedIds.size);

    } catch (error) {
      console.error('Error fetching control data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management', 'staff'].includes(currentRole)) {
      fetchControlData();
    }
  }, [currentRole]);

  // 2️⃣ إثبات حضور المعلم للكنترول واستلام اللجان
  const markInvigilatorAttendance = async (teacher: any) => {
    if (!user?.id || teacher.has_scanned || !todayExam) return;

    try {
      const { error } = await supabase
        .from('invigilator_attendance')
        .insert({ 
          teacher_id: teacher.teacher_id,
          timetable_id: todayExam.id,
          committee_id: teacher.committee_id,
          scanned_by: user.id
        });

      if (error && error.code !== '23505') throw error;

      teacher.has_scanned = true;
      setInvigilatorsMap(new Map(invigilatorsMap));
      setScannedToday(prev => prev + 1);

    } catch (error) {
      console.error('Invigilator Attendance Error:', error);
    }
  };

  // 3️⃣ تشغيل الرادار الخاص ببطاقات المعلمين 🚀
  useEffect(() => {
    if (isScannerActive) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const html5QrCode = new Html5Qrcode("control-reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 300, height: 300 } },
          (decodedText) => {
            // المفتاح الرقمي للمعلم الذي برمجناه (raf-teacher:xxx)
            if (decodedText.startsWith('raf-teacher:')) {
              const teacherId = decodedText.split(':')[1];
              handleScannedTeacher(teacherId);
            } else {
              setLastScanned({ error: true, message: 'هذه ليست بطاقة معلم صالحة' });
              playErrorBeep();
            }
          },
          () => {}
        ).catch((err) => {
          console.error("Camera Error: ", err);
          alert("تعذر الوصول للكاميرا.");
          setIsScannerActive(false);
        });
      });
    } else {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear();
        }).catch((err: any) => console.error(err));
      }
    }

    return () => {
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error);
    };
  }, [isScannerActive]);

  const handleScannedTeacher = (teacherId: string) => {
    const teacher = invigilatorsMap.get(String(teacherId));
    
    if (teacher) {
      setLastScanned(teacher);
      
      if (!teacher.has_scanned) {
        playSuccessBeep();
        markInvigilatorAttendance(teacher);
      } else {
        playAlreadyEnteredBeep();
      }
    } else {
      playErrorBeep();
      setLastScanned({ error: true, message: 'هذا المعلم غير مكلف بالمراقبة اليوم!' });
    }
  };

  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedCode = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      if (scannedCode.startsWith('raf-teacher:')) {
        handleScannedTeacher(scannedCode.split(':')[1]);
      } else {
        handleScannedTeacher(scannedCode); // محاولة يدوية في حال كان يكتب الـ ID مباشرة
      }
    }
  };

  useEffect(() => {
    if (isScannerActive && scanInputRef.current) scanInputRef.current.focus();
  }, [isScannerActive, lastScanned]);

  // الأصوات
  const playSuccessBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  };
  const playAlreadyEnteredBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.2);
  };
  const playErrorBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4);
  };

  if (!['admin', 'management', 'staff'].includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0d16] p-4 font-cairo" dir="rtl">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-800">
          <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">غرفة الكنترول مغلقة! 🛑</h1>
          <button onClick={() => router.back()} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl mt-4">العودة</button>
        </div>
      </div>
    );
  }

  const missingInvigilators = totalAssigned - scannedToday;

  return (
    <div className="min-h-screen bg-[#0a0d16] p-4 sm:p-6 md:p-8 font-cairo text-slate-200" dir="rtl">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0a0d16]/90 backdrop-blur-xl z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-indigo-400">
               <Loader2 className="w-16 h-16 animate-spin" />
               <span className="font-black text-xl tracking-widest animate-pulse">تجهيز رادار الكنترول المركزي...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 🛡️ الهيدر الفخم للكنترول */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Briefcase className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-wide">رادار الكنترول للمراقبين</h1>
              <p className="text-indigo-300/80 font-bold mt-1 text-sm">
                 {todayExam ? `اختبار اليوم: ${todayExam.subjects?.name} | الصف: ${todayExam.class_level}` : 'لا يوجد اختبار مبرمج اليوم'}
              </p>
            </div>
          </div>
          
          {todayExam && (
            <div className="relative z-10 flex gap-4 w-full md:w-auto">
               <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center flex-1 md:flex-none">
                  <p className="text-xs text-slate-400 font-black mb-1 uppercase">استلموا اللجان</p>
                  <p className="text-2xl font-black text-indigo-400">{scannedToday}</p>
               </div>
               <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center flex-1 md:flex-none">
                  <p className="text-xs text-slate-400 font-black mb-1 uppercase">لم يستلموا بعد</p>
                  <p className="text-2xl font-black text-rose-400">{missingInvigilators}</p>
               </div>
            </div>
          )}
        </div>

        {todayExam ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 🔴 نظام المسح للكنترول */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-800 p-6 text-center flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
              {!isScannerActive ? (
                <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                  <ScanLine className="w-24 h-24 text-slate-700 mb-6" />
                  <h2 className="text-2xl font-black text-white mb-2">رادار الكنترول مغلق</h2>
                  <p className="text-slate-400 mb-8 max-w-sm">فعل الرادار وامسح هويات المراقبين المعتمدة لإثبات استلامهم لأوراق اللجان.</p>
                  <button 
                     onClick={() => setIsScannerActive(true)}
                     className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-3 transition-all active:scale-95"
                  >
                     <Camera className="w-6 h-6" /> تفعيل ماسح الكنترول
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center relative z-10 h-full">
                  <div className="flex justify-between items-center w-full mb-4">
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                      <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                      <span className="font-black text-sm">الماسح جاهز للقراءة</span>
                    </div>
                    <button onClick={() => setIsScannerActive(false)} className="text-rose-400 hover:text-rose-300 font-black text-sm flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors">
                      <XCircle className="w-4 h-4"/> إيقاف
                    </button>
                  </div>
                  
                  <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl relative mb-4">
                     <div id="control-reader" className="w-full h-full"></div>
                  </div>

                  <input 
                    ref={scanInputRef}
                    type="text" 
                    onKeyDown={handleManualScan}
                    onBlur={() => { if(isScannerActive) scanInputRef.current?.focus(); }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-center font-black text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                    placeholder="... مسدس الباركود جاهز ..."
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* 👨‍🏫 شاشة المعلم (Feedback Screen) */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
              {lastScanned ? (
                <AnimatePresence mode="wait">
                  {lastScanned.error ? (
                    <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
                      <div className="w-32 h-32 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-16 h-16 text-rose-500" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2">بطاقة مرفوضة!</h2>
                      <p className="text-rose-400 font-bold text-lg bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/20 mt-4">
                        {lastScanned.message}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center w-full">
                      
                      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20", lastScanned.has_scanned ? "bg-amber-500" : "bg-indigo-500")}></div>
                      
                      <div className={cn("w-40 h-40 rounded-full p-2 mb-6 relative z-10", lastScanned.has_scanned ? "bg-amber-500/20 border-2 border-amber-500/50" : "bg-indigo-500/20 border-2 border-indigo-500/50")}>
                         <div className="w-full h-full bg-slate-800 rounded-full overflow-hidden flex items-center justify-center">
                           {lastScanned.avatar_url ? (
                             <img src={lastScanned.avatar_url} className="w-full h-full object-cover" alt="Teacher" />
                           ) : (
                             <span className="text-4xl font-black text-slate-500">{lastScanned.full_name.charAt(0)}</span>
                           )}
                         </div>
                         <div className={cn("absolute bottom-0 right-4 w-10 h-10 rounded-full border-4 border-[#0a0d16] flex items-center justify-center shadow-lg", lastScanned.has_scanned ? "bg-amber-500 text-slate-900" : "bg-indigo-500 text-white")}>
                            <UserCheck className="w-5 h-5" />
                         </div>
                      </div>

                      <h2 className="text-3xl font-black text-white mb-2 tracking-wide relative z-10">{lastScanned.full_name}</h2>
                      <p className="text-lg font-bold text-slate-400 mb-8 relative z-10 border-b border-slate-700 pb-4">معلم مكلف - كنترول الامتحانات</p>

                      <div className="flex gap-4 w-full justify-center relative z-10">
                         <div className="bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700 flex-1">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">اللجنة المخصصة</p>
                            <p className="text-2xl font-black text-white">{lastScanned.committee_name}</p>
                         </div>
                         <div className={cn("px-6 py-4 rounded-2xl border flex-1", lastScanned.has_scanned ? "bg-amber-500/10 border-amber-500/30" : "bg-indigo-500/10 border-indigo-500/30")}>
                            <p className={cn("text-xs font-black uppercase tracking-widest mb-1", lastScanned.has_scanned ? "text-amber-500/70" : "text-indigo-400/70")}>حالة الاستلام</p>
                            <p className={cn("text-xl font-black", lastScanned.has_scanned ? "text-amber-400" : "text-indigo-400")}>
                               {lastScanned.has_scanned ? "تم التسجيل مسبقاً" : "تم استلام اللجنة"}
                            </p>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <div className="text-center opacity-30 pointer-events-none">
                   <ShieldCheck className="w-32 h-32 mx-auto mb-6 text-indigo-400" />
                   <h2 className="text-2xl font-black">ينتظر المعلم الأول...</h2>
                </div>
              )}
            </div>

          </div>
        ) : (
           <div className="bg-slate-900/50 rounded-[2rem] p-12 text-center border border-slate-800 border-dashed">
             <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
             <h3 className="text-xl font-black text-slate-300 mb-2">لا يوجد اختبارات مبرمجة</h3>
             <p className="text-sm font-bold text-slate-500">لا يمكن فتح الكنترول لعدم وجود مادة امتحانية في الجداول لهذا اليوم.</p>
           </div>
        )}
      </div>

      <style jsx global>{`
        #control-reader { border: none !important; border-radius: 1.5rem; overflow: hidden; }
        #control-reader__dashboard_section_csr { display: none !important; }
        #control-reader__camera_selection { padding: 8px; border-radius: 8px; background: #1e293b; color: white; border: 1px solid #334155; margin-bottom: 10px; width: 100%; max-width: 300px; }
      `}</style>
    </div>
  );
}
