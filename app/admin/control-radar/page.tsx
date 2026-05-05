// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Loader2, XCircle, ScanLine, Camera, UserCheck, Briefcase, FileSignature, ArrowRightLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ControlRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [radarMode, setRadarMode] = useState<'invigilators' | 'envelopes'>('invigilators');
  
  const [todayExam, setTodayExam] = useState<any>(null);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [lastMessage, setLastMessage] = useState({ text: '', type: '' });

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchExam = async () => {
      const { data } = await supabase.from('exam_timetables').select('*, subjects(name)').eq('academic_year', currentYear).eq('semester', currentSemester).eq('exam_date', todayDate).limit(1);
      if (data && data.length > 0) setTodayExam(data[0]);
      setIsLoading(false);
    };
    fetchExam();
  }, []);

  const handleInvigilatorScan = async (teacherId: string) => {
    // منطق حضور المراقب الذي برمجناه سابقاً (تم تبسيطه هنا للاختصار)
    try {
      const { data: assignment } = await supabase.from('committee_invigilators').select('*').eq('teacher_id', teacherId).single();
      if (!assignment) { setLastMessage({ text: 'المعلم غير مكلف اليوم!', type: 'error' }); return; }
      
      await supabase.from('invigilator_attendance').upsert({ teacher_id: teacherId, timetable_id: todayExam.id, committee_id: assignment.committee_id, scanned_by: user.id }, { onConflict: 'teacher_id, timetable_id' });
      setLastMessage({ text: 'تم إثبات استلام المراقب للجنته بنجاح!', type: 'success' });
    } catch (e) { setLastMessage({ text: 'خطأ في الرصد', type: 'error' }); }
  };

  const handleEnvelopeScan = async (hodId: string) => {
    // منطق تسليم واستلام المظاريف الجديد!
    try {
      // التحقق من حالة المظروف الحالية
      const { data: pipeline } = await supabase.from('exam_pipeline').select('*').eq('timetable_id', todayExam.id).single();
      
      let newStatus = 'with_hod';
      let msg = 'تم تسليم المظاريف لرئيس القسم للتصحيح.';
      
      if (pipeline && pipeline.handover_status === 'with_hod') {
        newStatus = 'returned_to_control';
        msg = 'تم استرجاع المظاريف المصححة للكنترول للرصد!';
      }

      await supabase.from('exam_pipeline').upsert({ 
        timetable_id: todayExam.id, 
        hod_id: hodId,
        handover_status: newStatus,
        [newStatus === 'with_hod' ? 'handover_at' : 'returned_at']: new Date().toISOString()
      }, { onConflict: 'timetable_id' });

      setLastMessage({ text: msg, type: 'success' });
    } catch (e) { setLastMessage({ text: 'حدث خطأ في النظام', type: 'error' }); }
  };

  useEffect(() => {
    if (isScannerActive) {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const html5QrCode = new Html5Qrcode("control-reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start(
          { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (decodedText.startsWith('raf-teacher:')) {
              const scannedId = decodedText.split(':')[1];
              if (radarMode === 'invigilators') handleInvigilatorScan(scannedId);
              else handleEnvelopeScan(scannedId);
            }
          }, () => {}
        ).catch(() => setIsScannerActive(false));
      });
    } else {
      if (scannerRef.current) scannerRef.current.stop().then(() => scannerRef.current.clear());
    }
    return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop(); };
  }, [isScannerActive, radarMode, todayExam]);

  if (!['admin', 'management', 'staff'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-[#0a0d16] p-4 font-cairo text-slate-200" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">رادار الكنترول المركزي</h1>
            <p className="text-indigo-400 font-bold">{todayExam ? `اختبار اليوم: ${todayExam.subjects?.name}` : 'لا يوجد اختبار'}</p>
          </div>
        </div>

        {todayExam && (
          <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800">
            {/* أزرار التبديل (Tabs) */}
            <div className="flex bg-slate-800 p-1.5 rounded-2xl mb-8">
              <button onClick={() => {setRadarMode('invigilators'); setIsScannerActive(false); setLastMessage({text:'', type:''})}} className={cn("flex-1 py-3 rounded-xl font-black flex justify-center items-center gap-2 transition-all", radarMode === 'invigilators' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
                <UserCheck className="w-5 h-5"/> تسليم اللجان للمراقبين
              </button>
              <button onClick={() => {setRadarMode('envelopes'); setIsScannerActive(false); setLastMessage({text:'', type:''})}} className={cn("flex-1 py-3 rounded-xl font-black flex justify-center items-center gap-2 transition-all", radarMode === 'envelopes' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
                <ArrowRightLeft className="w-5 h-5"/> حركة مظاريف التصحيح
              </button>
            </div>

            <div className="text-center min-h-[400px]">
              {!isScannerActive ? (
                <div className="py-20">
                  <ScanLine className={cn("w-20 h-20 mx-auto mb-6", radarMode === 'invigilators' ? "text-indigo-500/50" : "text-emerald-500/50")} />
                  <button onClick={() => setIsScannerActive(true)} className={cn("text-white font-black py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 mx-auto transition-all", radarMode === 'invigilators' ? "bg-indigo-600 hover:bg-indigo-500" : "bg-emerald-600 hover:bg-emerald-500")}>
                    <Camera className="w-6 h-6" /> تفعيل ماسح {radarMode === 'invigilators' ? 'المراقبين' : 'التصحيح'}
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-sm mx-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className={cn("font-black text-sm animate-pulse", radarMode === 'invigilators' ? "text-indigo-400" : "text-emerald-400")}>الماسح جاهز للقراءة...</span>
                    <button onClick={() => setIsScannerActive(false)} className="text-rose-400 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg"><XCircle className="w-4 h-4"/> إيقاف</button>
                  </div>
                  <div id="control-reader" className="w-full aspect-square bg-black rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl mb-4"></div>
                  
                  <input type="text" ref={scanInputRef} onKeyDown={(e) => { if (e.key === 'Enter') { const val = e.currentTarget.value.trim().split(':')[1] || e.currentTarget.value.trim(); radarMode === 'invigilators' ? handleInvigilatorScan(val) : handleEnvelopeScan(val); e.currentTarget.value = ''; } }} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 text-center text-white focus:outline-none placeholder:text-slate-600" placeholder="... مسدس الباركود جاهز ..." autoFocus />
                </div>
              )}

              {lastMessage.text && (
                <div className={cn("mt-6 p-4 rounded-xl font-black text-lg border", lastMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                  {lastMessage.text}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
