// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, Search, CheckCircle2, XCircle, ScanLine, AlertTriangle, Camera, LogIn, Fingerprint
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function GateRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  
  // الخريطة السريعة للطلاب (للبحث في أجزاء من الثانية)
  const [studentMap, setStudentMap] = useState<Map<string, any>>(new Map());
  const [totalStudents, setTotalStudents] = useState(0);
  const [enteredToday, setEnteredToday] = useState(0);
  
  // شاشة الطالب الذي تم مسحه للتو
  const [lastScanned, setLastScanned] = useState<any>(null);
  
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  // 1️⃣ استخبارات البوابة (تحميل كل بطاقات الطلاب الموزعة)
  const fetchGateData = async () => {
    setIsLoading(true);
    try {
      // أ. جلب كل الطلاب الذين لديهم أرقام جلوس هذا الفصل
      const { data: allocations } = await supabase
        .from('student_seat_allocations')
        .select(`
          seat_number, 
          student_id,
          students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )
        `)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      // ب. جلب من دخلوا من البوابة اليوم
      const { data: gateRecords } = await supabase
        .from('school_gate_attendance')
        .select('student_id')
        .eq('date', todayDate);

      const enteredIds = new Set(gateRecords?.map(r => r.student_id));

      const map = new Map();
      (allocations || []).forEach((alloc: any) => {
        const studentInfo = alloc.students;
        const userInfo = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users;
        const sectionInfo = Array.isArray(studentInfo?.sections) ? studentInfo?.sections[0] : studentInfo?.sections;
        const classInfo = sectionInfo?.classes;

        const clsName = classInfo?.name || 'صف غير محدد';
        const secName = sectionInfo?.name ? ` - ${sectionInfo.name}` : '';

        map.set(String(alloc.seat_number), {
          student_id: alloc.student_id,
          seat_number: alloc.seat_number,
          full_name: userInfo?.full_name || 'طالب مجهول',
          avatar_url: userInfo?.avatar_url,
          class_name: `${clsName}${secName}`,
          has_entered: enteredIds.has(alloc.student_id)
        });
      });

      setStudentMap(map);
      setTotalStudents(allocations?.length || 0);
      setEnteredToday(enteredIds.size);

    } catch (error) {
      console.error('Error fetching gate data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management', 'staff'].includes(currentRole)) {
      fetchGateData();
    }
  }, [currentRole]);

  // 2️⃣ تسجيل الدخول في البوابة
  const markGateEntry = async (student: any) => {
    if (!user?.id || student.has_entered) return;

    try {
      const { error } = await supabase
        .from('school_gate_attendance')
        .insert({ 
          student_id: student.student_id,
          date: todayDate,
          scanned_by: user.id
        });

      if (error && error.code !== '23505') throw error; // تجاهل خطأ التكرار (Unique Violation)

      // تحديث الإحصائيات فوراً
      student.has_entered = true;
      setStudentMap(new Map(studentMap));
      setEnteredToday(prev => prev + 1);

    } catch (error) {
      console.error('Gate Attendance Error:', error);
    }
  };

  // 3️⃣ تشغيل كاميرا الرادار الذكي للبوابة 🚀
  useEffect(() => {
    if (isScannerActive) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const html5QrCode = new Html5Qrcode("gate-reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 300, height: 300 } }, // كاميرا سريعة جداً ومربع كبير للبوابة
          (decodedText) => {
            let seatNumber = decodedText;
            if (decodedText.startsWith('raf-exam-seat:')) {
              seatNumber = decodedText.split(':')[1];
            }
            handleScannedSeat(seatNumber);
          },
          () => {} // تجاهل الأخطاء الفارغة
        ).catch((err) => {
          console.error("Camera Error: ", err);
          alert("تعذر الوصول للكاميرا، تأكد من منح الصلاحيات للمتصفح.");
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
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScannerActive]);

  // معالجة الباركود المقروء من الكاميرا أو مسدس الباركود الخارجي
  const handleScannedSeat = (seatNumber: string) => {
    const student = studentMap.get(String(seatNumber));
    
    if (student) {
      setLastScanned(student);
      
      if (!student.has_entered) {
        playSuccessBeep();
        markGateEntry(student);
      } else {
        // قرأ بطاقة طالب دخل مسبقاً (تم مسحه من قبل)
        playAlreadyEnteredBeep();
      }
    } else {
      playErrorBeep();
      setLastScanned({ error: true, seat_number: seatNumber });
    }
  };

  // دعم مسدس الباركود الخارجي (USB Barcode Scanner)
  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedCode = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      
      let seatNumber = scannedCode;
      if (scannedCode.startsWith('raf-exam-seat:')) {
        seatNumber = scannedCode.split(':')[1];
      }
      handleScannedSeat(seatNumber);
    }
  };

  // المحافظة على تركيز حقل الإدخال إذا كان الرادار نشطاً لمسدس الباركود
  useEffect(() => {
    if (isScannerActive && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScannerActive, lastScanned]);

  // أصوات البوابة المخصصة
  const playSuccessBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  };
  const playAlreadyEnteredBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.2);
  };
  const playErrorBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4);
  };

  if (!['admin', 'management', 'staff'].includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-cairo" dir="rtl">
        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-700">
          <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">نقطة تفتيش مغلقة! 🛑</h1>
          <p className="text-slate-400 font-bold mb-6">هذا النظام مخصص لمشرفي البوابات والإدارة فقط.</p>
          <button onClick={() => router.back()} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl">العودة</button>
        </div>
      </div>
    );
  }

  const unenteredStudents = totalStudents - enteredToday;

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 md:p-8 font-cairo text-slate-200" dir="rtl">
      
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-emerald-400">
               <Loader2 className="w-16 h-16 animate-spin" />
               <span className="font-black text-xl tracking-widest animate-pulse">تجهيز نقطة التفتيش الرئيسية...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 🛡️ الهيدر الفخم للبوابة */}
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <Fingerprint className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-wide">رادار البوابة الرئيسية</h1>
              <p className="text-emerald-400/80 font-bold mt-1 text-sm">{format(new Date(), 'dd MMMM yyyy', { locale: arSA })} | تسجيل الدخول للحرم المدرسي</p>
            </div>
          </div>
          
          <div className="relative z-10 flex gap-4 w-full md:w-auto">
             <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center flex-1 md:flex-none">
                <p className="text-xs text-slate-400 font-black mb-1 uppercase">حاضر في المدرسة</p>
                <p className="text-2xl font-black text-emerald-400">{enteredToday}</p>
             </div>
             <div className="bg-slate-800 px-6 py-3 rounded-2xl border border-slate-700 text-center flex-1 md:flex-none">
                <p className="text-xs text-slate-400 font-black mb-1 uppercase">لم يدخل بعد</p>
                <p className="text-2xl font-black text-rose-400">{unenteredStudents}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 🔴 نظام المسح (الكاميرا أو المسدس) */}
          <div className="bg-slate-900 rounded-[2rem] shadow-xl border border-slate-800 p-6 text-center flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
            {!isScannerActive ? (
              <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                <ScanLine className="w-24 h-24 text-slate-700 mb-6" />
                <h2 className="text-2xl font-black text-white mb-2">نقطة التفتيش مغلقة</h2>
                <p className="text-slate-400 mb-8 max-w-sm">قم بتفعيل الرادار لتتمكن من مسح بطاقات الطلاب عبر كاميرا الهاتف أو جهاز الباركود.</p>
                <button 
                   onClick={() => setIsScannerActive(true)}
                   className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-3 transition-all active:scale-95"
                >
                   <LogIn className="w-6 h-6" /> تفعيل بوابة الدخول
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center relative z-10 h-full">
                <div className="flex justify-between items-center w-full mb-4">
                  <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                    <span className="font-black text-sm">البوابة نشطة ومستعدة</span>
                  </div>
                  <button onClick={() => setIsScannerActive(false)} className="text-rose-400 hover:text-rose-300 font-black text-sm flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors">
                    <XCircle className="w-4 h-4"/> إيقاف
                  </button>
                </div>
                
                {/* كاميرا الرادار الخاصة بالبوابة */}
                <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl relative mb-4">
                   <div id="gate-reader" className="w-full h-full"></div>
                </div>

                {/* حقل الإدخال السري لمسدس الباركود */}
                <input 
                  ref={scanInputRef}
                  type="text" 
                  onKeyDown={handleManualScan}
                  onBlur={() => { if(isScannerActive) scanInputRef.current?.focus(); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-center font-black text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  placeholder="... يمكن استخدام مسدس الباركود هنا ..."
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* 🧑‍🎓 شاشة الطالب (Feedback Screen) */}
          <div className="bg-slate-900 rounded-[2rem] shadow-xl border border-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
            {lastScanned ? (
              <AnimatePresence mode="wait">
                {lastScanned.error ? (
                  <motion.div key="error" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center">
                    <div className="w-32 h-32 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                      <AlertTriangle className="w-16 h-16 text-rose-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">بطاقة غير صالحة!</h2>
                    <p className="text-rose-400 font-bold text-lg bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/20">
                      الكود الممسوح ({lastScanned.seat_number}) غير مسجل في النظام.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center w-full">
                    
                    {/* هالة خضراء أو صفراء خلف الصورة */}
                    <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20", lastScanned.has_entered ? "bg-amber-500" : "bg-emerald-500")}></div>
                    
                    <div className={cn("w-40 h-40 rounded-full p-2 mb-6 relative z-10", lastScanned.has_entered ? "bg-amber-500/20 border-2 border-amber-500/50" : "bg-emerald-500/20 border-2 border-emerald-500/50")}>
                       <div className="w-full h-full bg-slate-800 rounded-full overflow-hidden flex items-center justify-center">
                         {lastScanned.avatar_url ? (
                           <img src={lastScanned.avatar_url} className="w-full h-full object-cover" alt="Student" />
                         ) : (
                           <span className="text-4xl font-black text-slate-500">{lastScanned.full_name.charAt(0)}</span>
                         )}
                       </div>
                       
                       {/* أيقونة الحالة الصح */}
                       <div className={cn("absolute bottom-0 right-4 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-lg", lastScanned.has_entered ? "bg-amber-500 text-slate-900" : "bg-emerald-500 text-slate-900")}>
                          <CheckCircle2 className="w-6 h-6" />
                       </div>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 tracking-wide relative z-10">{lastScanned.full_name}</h2>
                    <p className="text-lg font-bold text-slate-400 mb-6 relative z-10">{lastScanned.class_name}</p>

                    <div className="flex gap-4 w-full justify-center relative z-10">
                       <div className="bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700 min-w-[140px]">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">رقم الجلوس</p>
                          <p className="text-2xl font-black text-white tracking-widest">{lastScanned.seat_number}</p>
                       </div>
                       <div className={cn("px-6 py-4 rounded-2xl border min-w-[140px]", lastScanned.has_entered ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30")}>
                          <p className={cn("text-xs font-black uppercase tracking-widest mb-1", lastScanned.has_entered ? "text-amber-500/70" : "text-emerald-500/70")}>حالة الدخول</p>
                          <p className={cn("text-2xl font-black", lastScanned.has_entered ? "text-amber-400" : "text-emerald-400")}>
                             {lastScanned.has_entered ? "مسجل مسبقاً" : "تم الدخول"}
                          </p>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="text-center opacity-30 pointer-events-none">
                 <ShieldCheck className="w-32 h-32 mx-auto mb-6" />
                 <h2 className="text-2xl font-black">جاهز لاستقبال أول طالب</h2>
              </div>
            )}
          </div>

        </div>
      </div>

      <style jsx global>{`
        #gate-reader { border: none !important; border-radius: 1.5rem; overflow: hidden; }
        #gate-reader__dashboard_section_csr { display: none !important; }
        #gate-reader__camera_selection { padding: 8px; border-radius: 8px; background: #1e293b; color: white; border: 1px solid #334155; margin-bottom: 10px; width: 100%; max-width: 300px; }
      `}</style>
    </div>
  );
}
