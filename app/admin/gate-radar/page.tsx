// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, CheckCircle2, XCircle, ScanLine, AlertTriangle, 
  LogIn, Fingerprint, Clock, LogOut, UserCheck, UserX, Info, Camera, Crown, UsersRound
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { QrReader } from 'react-qr-reader'; 

export default function SmartGateRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [stats, setStats] = useState({ present: 0, late: 0, earlyExit: 0, absent: 0 });
  
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [lastScanned, setLastScanned] = useState<any>(null);

  // حالة الخروج المبكر
  const [showEscortModal, setShowEscortModal] = useState(false);
  const [pendingExitUser, setPendingExitUser] = useState<any>(null);
  const [escortData, setEscortData] = useState({ name: '', nationalId: '', relation: '' });

  // حالات نظام "المكنسة" (إغلاق الدوام واعتماد الغياب)
  const [showSweeperModal, setShowSweeperModal] = useState(false);
  const [missingStudents, setMissingStudents] = useState<any[]>([]);
  const [isSubmittingSweeper, setIsSubmittingSweeper] = useState(false);

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: settings } = await supabase.from('school_settings').select('*').single();
      setSchoolSettings(settings || {
        morning_start_time: '07:30:00', late_threshold: '07:45:00', absence_threshold: '08:30:00'
      });

      const { data: logs } = await supabase
        .from('school_gate_attendance')
        .select('status, scan_type')
        .eq('date', todayDate);

      if (logs) {
        setStats({
          present: logs.filter(l => l.status === 'present' && l.scan_type === 'entry').length,
          late: logs.filter(l => l.status === 'late' && l.scan_type === 'entry').length,
          earlyExit: logs.filter(l => l.scan_type === 'exit').length,
          absent: logs.filter(l => l.status === 'absent' && l.scan_type === 'entry').length,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management', 'staff'].includes(currentRole)) fetchInitialData();
  }, [currentRole]);

  const calculateEntryStatus = (settings: any) => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const getMins = (timeStr: string) => {
      if(!timeStr) return 0;
      const [h, m] = timeStr.split(':');
      return parseInt(h) * 60 + parseInt(m);
    };

    const lateMins = getMins(settings.late_threshold);
    const absentMins = getMins(settings.absence_threshold);

    if (currentMins < lateMins) return { status: 'present', color: 'emerald', text: 'حضور مبكر/في الوقت' };
    if (currentMins >= lateMins && currentMins < absentMins) return { status: 'late', color: 'amber', text: 'حضور متأخر' };
    return { status: 'denied', color: 'rose', text: 'تجاوز حد الغياب - يمنع الدخول' };
  };

  const handleScan = async (result: any, error: any) => {
    if (!!result && result?.text) {
      const rawText = result.text.trim();
      setIsScannerActive(false); 
      await processUniversalId(rawText);
      setTimeout(() => setIsScannerActive(true), 3000); 
    }
  };

  const processUniversalId = async (scannedCode: string) => {
    try {
      let targetId = scannedCode;
      if (scannedCode.startsWith('raf-id:')) targetId = scannedCode.split(':')[1];
      else if (scannedCode.startsWith('raf-exam-seat:')) targetId = scannedCode.split(':')[1];

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select(`
          *, 
          students(
            enrollment_status, 
            sections(name, classes(name))
          )
        `)
        .eq('id', targetId)
        .single();

      if (userErr || !userData) {
        throw new Error('بطاقة غير صالحة أو غير مسجلة في النظام.');
      }

      if (userData.role === 'student') {
        const studentInfo = Array.isArray(userData.students) ? userData.students[0] : userData.students;
        if (studentInfo?.enrollment_status && studentInfo.enrollment_status !== 'active') {
          throw new Error(`يُمنع الدخول! حالة الطالب: ${studentInfo.enrollment_status === 'graduated' ? 'خريج' : 'منقول/موقوف'}`);
        }
      }

      const isStudent = userData.role === 'student';
      const studentInfo = Array.isArray(userData.students) ? userData.students[0] : userData.students;
      const userTitle = isStudent ? `${studentInfo?.sections?.classes?.name || 'صف غير محدد'} - ${studentInfo?.sections?.name || ''}` : 'عضو هيئة تدريس/إداري';

      if (scanMode === 'entry') await executeEntryLogic(userData, userTitle);
      else await executeExitLogic(userData, userTitle);

    } catch (error: any) {
      playErrorBeep();
      setLastScanned({ type: 'error', message: error.message });
    }
  };

  const executeEntryLogic = async (userData: any, userTitle: string) => {
    const entryLogic = calculateEntryStatus(schoolSettings);
    
    if (entryLogic.status === 'denied') {
      playErrorBeep();
      setLastScanned({ type: 'error', message: entryLogic.text, user: userData, title: userTitle });
      return;
    }

    const { data: existingLog } = await supabase
      .from('school_gate_attendance')
      .select('id')
      .eq('user_id', userData.id)
      .eq('date', todayDate)
      .eq('scan_type', 'entry')
      .maybeSingle();

    if (existingLog) {
      playAlreadyEnteredBeep();
      setLastScanned({ type: 'warning', message: 'تم تسجيل الدخول مسبقاً اليوم', user: userData, title: userTitle });
      return;
    }

    // 🚀 تحديث الإضافة لدعم student_id القديم و user_id الجديد معاً
    await supabase.from('school_gate_attendance').insert({
      user_id: userData.id, 
      student_id: userData.id,
      user_role: userData.role, 
      status: entryLogic.status, 
      scan_type: 'entry', 
      scanned_by: user.id,
      date: todayDate
    });

    playSuccessBeep();
    setLastScanned({ type: 'success', statusData: entryLogic, user: userData, title: userTitle });
    
    if(entryLogic.status === 'present') setStats(prev => ({...prev, present: prev.present + 1}));
    if(entryLogic.status === 'late') setStats(prev => ({...prev, late: prev.late + 1}));
  };

  const executeExitLogic = async (userData: any, userTitle: string) => {
    if (userData.role === 'student') {
      playWarningBeep();
      setPendingExitUser({ user: userData, title: userTitle });
      setShowEscortModal(true);
    } else {
      await recordExit(userData, userTitle, null);
    }
  };

  const confirmStudentExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escortData.name || !escortData.nationalId) return;
    setShowEscortModal(false);
    await recordExit(pendingExitUser.user, pendingExitUser.title, escortData);
    setEscortData({ name: '', nationalId: '', relation: '' });
    setPendingExitUser(null);
  };

  const recordExit = async (userData: any, userTitle: string, escort: any) => {
    await supabase.from('school_gate_attendance').insert({
      user_id: userData.id, 
      student_id: userData.id,
      user_role: userData.role, 
      scan_type: 'exit', 
      is_early_dismissal: true,
      escort_name: escort?.name || null, 
      escort_national_id: escort?.nationalId || null, 
      escort_relation: escort?.relation || null, 
      scanned_by: user.id,
      date: todayDate
    });
    playSuccessBeep();
    setLastScanned({ type: 'exit_success', message: 'تم تسجيل الخروج بأمان', user: userData, title: userTitle });
    setStats(prev => ({...prev, earlyExit: prev.earlyExit + 1}));
  };

  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = e.currentTarget.value;
      e.currentTarget.value = '';
      if (code) processUniversalId(code);
    }
  };

  // 🚀 دالة تجهيز وإحصاء الغياب (المكنسة)
  const prepareSweeper = async () => {
    setIsLoading(true);
    try {
      const { data: activeStudents, error: err1 } = await supabase
        .from('users')
        .select('id, full_name, students!inner(enrollment_status)')
        .eq('role', 'student')
        .eq('students.enrollment_status', 'active');

      const { data: todayLogs, error: err2 } = await supabase
        .from('school_gate_attendance')
        .select('user_id')
        .eq('date', todayDate)
        .eq('user_role', 'student')
        .eq('scan_type', 'entry');

      if (err1 || err2) throw new Error('فشل في جلب البيانات');

      const loggedUserIds = new Set(todayLogs?.map(log => log.user_id));
      const missing = activeStudents?.filter(s => !loggedUserIds.has(s.id)) || [];

      setMissingStudents(missing);
      setShowSweeperModal(true);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء فحص السجلات.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 دالة تنفيذ واعتماد الغياب آلياً
  const executeSweeper = async () => {
    if (missingStudents.length === 0) {
      setShowSweeperModal(false);
      return;
    }
    setIsSubmittingSweeper(true);
    try {
      const payload = missingStudents.map(s => ({
        user_id: s.id,
        student_id: s.id,
        user_role: 'student',
        status: 'absent',
        scan_type: 'entry',
        scanned_by: user?.id,
        date: todayDate
      }));

      const { error } = await supabase.from('school_gate_attendance').insert(payload);
      if (error) throw error;

      playSuccessBeep();
      setShowSweeperModal(false);
      fetchInitialData(); 
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء اعتماد الغياب في قاعدة البيانات.');
    } finally {
      setIsSubmittingSweeper(false);
    }
  };

  useEffect(() => {
    if (isScannerActive && !showEscortModal && !showSweeperModal && scanInputRef.current) scanInputRef.current.focus();
  }, [isScannerActive, showEscortModal, showSweeperModal]);

  const playSuccessBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); };
  const playAlreadyEnteredBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.2); };
  const playWarningBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15); };
  const playErrorBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4); };

  if (!['admin', 'management', 'staff'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 md:p-8 font-cairo text-slate-200" dir="rtl">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-emerald-400">
               <Loader2 className="w-16 h-16 animate-spin" />
               <span className="font-black text-xl tracking-widest animate-pulse">تهيئة الرادار الذكي...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 🛡️ الهيدر الفخم */}
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
            <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shrink-0">
              <Fingerprint className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">رادار الحرم المدرسي</h1>
              <p className="text-indigo-400/80 font-bold mt-1 text-sm">{format(new Date(), 'dd MMMM yyyy', { locale: arSA })} | نظام الهوية الموحدة</p>
            </div>
          </div>
          
          <div className="relative z-10 flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <div className="bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-700 text-center min-w-[80px]">
                <p className="text-[10px] text-emerald-400 font-black mb-1">مبكر</p>
                <p className="text-lg font-black text-white">{stats.present}</p>
             </div>
             <div className="bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-700 text-center min-w-[80px]">
                <p className="text-[10px] text-amber-400 font-black mb-1">تأخير</p>
                <p className="text-lg font-black text-white">{stats.late}</p>
             </div>
             <div className="bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-700 text-center min-w-[80px]">
                <p className="text-[10px] text-indigo-400 font-black mb-1">خروج</p>
                <p className="text-lg font-black text-white">{stats.earlyExit}</p>
             </div>
             <div className="bg-rose-500/10 px-4 py-2.5 rounded-2xl border border-rose-500/30 text-center min-w-[80px]">
                <p className="text-[10px] text-rose-400 font-black mb-1">غياب</p>
                <p className="text-lg font-black text-white">{stats.absent}</p>
             </div>
          </div>
        </div>

        {/* 🚀 زر المكنسة (إغلاق الدوام) */}
        {['admin', 'management'].includes(currentRole) && (
          <div className="flex justify-end">
             <button onClick={prepareSweeper} className="bg-rose-600 hover:bg-rose-500 text-white font-black py-3 px-6 rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95 border border-rose-400/50">
               <UsersRound className="w-5 h-5"/> إغلاق البوابة واعتماد الغياب
             </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-slate-900 rounded-[2rem] shadow-xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
            <div className="flex bg-slate-800 p-1.5 rounded-2xl w-full max-w-sm mb-6 relative z-10 border border-slate-700">
               <button onClick={() => { setScanMode('entry'); setLastScanned(null); }} className={cn("flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all", scanMode === 'entry' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white")}>
                 <LogIn className="w-4 h-4" /> وضع الدخول
               </button>
               <button onClick={() => { setScanMode('exit'); setLastScanned(null); }} className={cn("flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all", scanMode === 'exit' ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:text-white")}>
                 <LogOut className="w-4 h-4" /> خروج مبكر
               </button>
            </div>

            {!isScannerActive ? (
              <div className="flex flex-col items-center justify-center w-full relative z-10 flex-1">
                <ScanLine className="w-20 h-20 text-slate-700 mb-4" />
                <h2 className="text-xl font-black text-white mb-6">الرادار متوقف حالياً</h2>
                <button onClick={() => setIsScannerActive(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-3 transition-all active:scale-95">
                   <Camera className="w-6 h-6" /> تفعيل الكاميرا للبدء
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center relative z-10 flex-1">
                <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl relative mb-4">
                   
                   {/* 🚀 إجبار الكاميرا على ملء المربع بكلاس qr-force-wrapper */}
                   <div className="absolute inset-0 z-0 qr-force-wrapper">
                      <QrReader 
                         onResult={handleScan} 
                         constraints={{ facingMode: 'environment' }} 
                         containerStyle={{ width: '100%', height: '100%' }} 
                       />
                   </div>

                   {/* إطار التوجيه الزخرفي */}
                   <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
                      <div className={cn("w-full h-full border-2 rounded-2xl relative", scanMode === 'entry' ? "border-emerald-500/50" : "border-rose-500/50")}>
                         <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl -mt-1 -ml-1", scanMode === 'entry' ? "border-emerald-500" : "border-rose-500")}></div>
                         <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl -mt-1 -mr-1", scanMode === 'entry' ? "border-emerald-500" : "border-rose-500")}></div>
                         <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl -mb-1 -ml-1", scanMode === 'entry' ? "border-emerald-500" : "border-rose-500")}></div>
                         <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl -mb-1 -mr-1", scanMode === 'entry' ? "border-emerald-500" : "border-rose-500")}></div>
                         <div className={cn("absolute w-full h-0.5 shadow-[0_0_10px_rgba(0,0,0,0.8)] top-1/2 left-0 -translate-y-1/2 animate-scan", scanMode === 'entry' ? "bg-emerald-400/80" : "bg-rose-400/80")}></div>
                      </div>
                   </div>
                </div>

                <input ref={scanInputRef} type="text" onKeyDown={handleManualScan} onBlur={() => { if(isScannerActive && !showEscortModal && !showSweeperModal) scanInputRef.current?.focus(); }} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-center font-black text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600" placeholder="... مسدس الباركود يعمل هنا ..." autoFocus />
                
                <button onClick={() => setIsScannerActive(false)} className="mt-4 text-slate-400 hover:text-white text-sm font-bold flex items-center gap-1">
                  <XCircle className="w-4 h-4"/> إيقاف الكاميرا
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2rem] shadow-xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
            {lastScanned ? (
              <AnimatePresence mode="wait">
                {lastScanned.type === 'error' ? (
                  <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
                    <div className="w-32 h-32 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                      <UserX className="w-16 h-16 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">عملية مرفوضة!</h2>
                    <p className="text-rose-400 font-bold text-lg bg-rose-500/10 px-6 py-3 rounded-xl border border-rose-500/20">{lastScanned.message}</p>
                    {lastScanned.user && <p className="text-slate-400 mt-4 text-sm">{lastScanned.user.full_name}</p>}
                  </motion.div>
                ) : lastScanned.type === 'warning' ? (
                  <motion.div key="warning" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center w-full">
                    <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
                      <Info className="w-16 h-16 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">{lastScanned.user.full_name}</h2>
                    <p className="text-amber-400 font-bold text-lg bg-amber-500/10 px-6 py-2 rounded-xl border border-amber-500/20">{lastScanned.message}</p>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center w-full">
                    <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20", lastScanned.type === 'exit_success' ? 'bg-rose-500' : lastScanned.statusData?.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500')}></div>
                    
                    <div className={cn("w-40 h-40 rounded-full p-2 mb-6 relative z-10 border-2", lastScanned.type === 'exit_success' ? 'bg-rose-500/20 border-rose-500/50' : lastScanned.statusData?.color === 'amber' ? 'bg-amber-500/20 border-amber-500/50' : 'bg-emerald-500/20 border-emerald-500/50')}>
                       <div className="w-full h-full bg-slate-800 rounded-full overflow-hidden flex items-center justify-center">
                         {lastScanned.user.avatar_url ? (
                           <img src={lastScanned.user.avatar_url} className="w-full h-full object-cover" alt="User" />
                         ) : (
                           <span className="text-4xl font-black text-slate-500">{lastScanned.user.full_name.charAt(0)}</span>
                         )}
                       </div>
                       <div className={cn("absolute bottom-0 right-4 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg", lastScanned.type === 'exit_success' ? 'bg-rose-500 text-white' : lastScanned.statusData?.color === 'amber' ? 'bg-amber-500 text-slate-900' : 'bg-emerald-500 text-slate-900')}>
                          <CheckCircle2 className="w-6 h-6" />
                       </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 tracking-wide relative z-10">{lastScanned.user.full_name}</h2>
                    <p className="text-sm font-bold text-slate-400 mb-6 relative z-10">{lastScanned.title}</p>

                    <div className="flex gap-4 w-full justify-center relative z-10">
                       <div className="bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700 min-w-[140px]">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">وقت المسح</p>
                          <p className="text-xl font-black text-white tracking-widest">{format(new Date(), 'HH:mm')}</p>
                       </div>
                       <div className={cn("px-6 py-4 rounded-2xl border min-w-[140px]", lastScanned.type === 'exit_success' ? 'bg-rose-500/10 border-rose-500/30' : lastScanned.statusData?.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30')}>
                          <p className={cn("text-xs font-black uppercase tracking-widest mb-1", lastScanned.type === 'exit_success' ? 'text-rose-400' : lastScanned.statusData?.color === 'amber' ? 'text-amber-500/70' : 'text-emerald-500/70')}>الحالة الأمنية</p>
                          <p className={cn("text-xl font-black", lastScanned.type === 'exit_success' ? 'text-rose-400' : lastScanned.statusData?.color === 'amber' ? 'text-amber-400' : 'text-emerald-400')}>
                             {lastScanned.type === 'exit_success' ? 'خروج مبكر' : lastScanned.statusData?.text}
                          </p>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="text-center opacity-30 pointer-events-none">
                 <ShieldCheck className="w-32 h-32 mx-auto mb-6" />
                 <h2 className="text-2xl font-black">الرادار جاهز ومستعد</h2>
                 <p className="text-sm font-bold mt-2">الوضع الحالي: {scanMode === 'entry' ? 'تسجيل دخول' : 'خروج مبكر'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🛑 نافذة إجبارية لبيانات المستلم (في الخروج المبكر) */}
      <AnimatePresence>
        {showEscortModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative border-4 border-rose-500">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-rose-600"/></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">تصريح خروج مبكر</h3>
                  <p className="text-xs font-bold text-slate-500">الطالب: {pendingExitUser?.user?.full_name}</p>
                </div>
              </div>

              <form onSubmit={confirmStudentExit} className="space-y-4 text-slate-800">
                <div>
                  <label className="block text-sm font-black mb-1">الرقم المدني للمُستلم <span className="text-rose-500">*</span></label>
                  <input type="text" required autoFocus value={escortData.nationalId} onChange={e=>setEscortData({...escortData, nationalId: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:border-rose-500 font-bold" placeholder="أدخل الرقم المدني..." />
                </div>
                <div>
                  <label className="block text-sm font-black mb-1">الاسم الكامل للمُستلم <span className="text-rose-500">*</span></label>
                  <input type="text" required value={escortData.name} onChange={e=>setEscortData({...escortData, name: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:border-rose-500 font-bold" placeholder="اسم مستلم الطالب..." />
                </div>
                <div>
                  <label className="block text-sm font-black mb-1">صلة القرابة</label>
                  <select value={escortData.relation} onChange={e=>setEscortData({...escortData, relation: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 focus:outline-none focus:border-rose-500 font-bold">
                    <option value="">اختر صلة القرابة...</option>
                    <option value="father">أب</option>
                    <option value="mother">أم</option>
                    <option value="driver">سائق</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => {setShowEscortModal(false); setPendingExitUser(null); setIsScannerActive(true);}} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-colors">إلغاء</button>
                  <button type="submit" className="flex-[2] py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2">
                    <LogOut className="w-4 h-4"/> توثيق وإخراج الطالب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🧹 نافذة تأكيد عملية المكنسة (Sweeper Modal) */}
      <AnimatePresence>
        {showSweeperModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-700">
              <div className="text-center mb-6 border-b border-slate-800 pb-6">
                <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/50"><UsersRound className="w-8 h-8 text-rose-500"/></div>
                <h3 className="text-2xl font-black text-white">إغلاق البوابة</h3>
                <p className="text-sm font-bold text-slate-400 mt-2">تسجيل الغياب التلقائي لمن لم يحضر</p>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 text-center">
                 <p className="text-sm text-slate-300 font-bold">يوجد حالياً <span className="text-2xl text-rose-400 font-black mx-2">{missingStudents.length}</span> طالب نشط لم يسجلوا دخولهم اليوم.</p>
                 <p className="text-xs text-amber-500 font-bold mt-2">هل أنت متأكد من رغبتك في تسجيلهم كغائبين في قاعدة البيانات دفعة واحدة؟</p>
              </div>

              <div className="flex gap-3">
                <button type="button" disabled={isSubmittingSweeper} onClick={() => setShowSweeperModal(false)} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl transition-colors disabled:opacity-50">تراجع</button>
                <button type="button" disabled={isSubmittingSweeper || missingStudents.length === 0} onClick={executeSweeper} className="flex-[2] py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmittingSweeper ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>} اعتماد الغياب للكل
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 CSS مخصص لإجبار الكاميرا على ملء المربع */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } } 
        .animate-scan { animation: scan 2s linear infinite; }
        
        .qr-force-wrapper section {
           padding-top: 0 !important;
           height: 100% !important;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .qr-force-wrapper video {
           object-fit: cover !important;
           width: 100% !important;
           height: 100% !important;
        }
      `}}/>
    </div>
  );
}
