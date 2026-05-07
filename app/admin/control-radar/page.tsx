// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScanLine, ShieldCheck, CheckCircle2, XCircle, AlertCircle, 
  User, Mail, Loader2, RefreshCcw, Camera, Crown
} from 'lucide-react';
import { QrReader } from 'react-qr-reader'; 

export default function ControlRadarPage() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [activeTab, setActiveTab] = useState<'envelope' | 'invigilator'>('envelope');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'loading' | 'vip'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [vipData, setVipData] = useState<any>(null);

  // 🎵 أصوات الرادار
  const playSuccessBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); };
  const playErrorBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4); };

  // معالجة الأكواد القديمة والجديدة
  const processQRText = (text: string) => {
    if (!text) return null;
    let cleanId = text.trim();
    try {
      if (cleanId.startsWith('{')) {
        const parsed = JSON.parse(cleanId);
        if (parsed.id) return parsed.id;
        if (parsed.student_id) return parsed.student_id;
        if (parsed.teacher_id) return parsed.teacher_id;
      }
      if (cleanId.includes('/')) {
        const parts = cleanId.split('/');
        cleanId = parts[parts.length - 1]; 
      }
      return cleanId;
    } catch (e) {
      return cleanId;
    }
  };

  // 🚀 المحرك المركزي لمسح الكنترول
  const handleScan = async (result: any, error: any) => {
    if (!!result && result?.text) {
      const rawText = result.text.trim();
      if (scanStatus === 'loading') return;

      // استخراج الهوية سواء كانت موحدة raf-id أو نظام الكنترول raf-control أو مغلفات قديمة
      let extractedId = rawText;
      if (rawText.startsWith('raf-id:')) extractedId = rawText.split(':')[1];
      else if (rawText.startsWith('raf-control:')) extractedId = rawText.split(':')[1];
      else extractedId = processQRText(rawText);
      
      if (extractedId && scanResult !== extractedId) {
        setScanResult(extractedId);
        setCameraActive(false); 
        
        if (rawText.startsWith('raf-control:')) {
           await processVipScan(extractedId);
        } else if (activeTab === 'envelope') {
          await processEnvelopeScan(extractedId);
        } else {
          await processInvigilatorScan(extractedId);
        }
      }
    }
  };

  const processVipScan = async (userId: string) => {
    setScanStatus('loading');
    setStatusMessage('جاري التحقق من الهوية الأمنية...');
    try {
      const { data, error } = await supabase
        .from('exam_control_team')
        .select('*, users!exam_control_team_user_id_fkey(full_name, avatar_url)')
        .eq('user_id', userId)
        .single();

      if (error || !data) throw new Error('بطاقة كنترول غير صالحة أو ملغاة.');

      playSuccessBeep();
      setVipData(data);
      setScanStatus('vip');
    } catch (err: any) {
      playErrorBeep();
      setScanStatus('error');
      setStatusMessage(err.message);
    }
  };

  const processEnvelopeScan = async (scannedId: string) => {
    setScanStatus('loading');
    setStatusMessage('جاري التحقق من مغلف الأسئلة...');
    try {
      const { data: envelope, error: fetchError } = await supabase
        .from('exam_committee_heads')
        .select('*, exam_timetables(subject_id, class_level, subjects(name))')
        .eq('timetable_id', scannedId)
        .single();

      if (fetchError || !envelope) throw new Error('لم يتم العثور على مغلف أسئلة مطابق لهذا الرمز.');
      if (envelope.is_delivered) {
        throw new Error(`هذا المغلف تم تسليمه مسبقاً في ${new Date(envelope.delivered_at).toLocaleTimeString('ar-KW')}`);
      }

      const { error: updateError } = await supabase
        .from('exam_committee_heads')
        .update({ is_delivered: true, delivered_at: new Date().toISOString(), received_by: user.id })
        .eq('id', envelope.id);

      if (updateError) throw updateError;
      
      playSuccessBeep();
      setScanStatus('success');
      setStatusMessage(`تم استلام مغلف (${envelope.exam_timetables?.subjects?.name} - صف ${envelope.exam_timetables?.class_level}) بنجاح!`);
    } catch (err: any) {
      playErrorBeep();
      setScanStatus('error');
      setStatusMessage(err.message || 'حدث خطأ أثناء معالجة المغلف.');
    }
  };

  const processInvigilatorScan = async (teacherId: string) => {
    setScanStatus('loading');
    setStatusMessage('جاري تسجيل حضور المراقب...');
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: timetables } = await supabase.from('exam_timetables').select('id').eq('exam_date', todayDate);
      if (!timetables || timetables.length === 0) throw new Error('لا توجد اختبارات مجدولة لهذا اليوم.');
      const timetableIds = timetables.map(t => t.id);

      const { data: assignment, error: fetchError } = await supabase
        .from('committee_invigilators')
        .select('*, exam_committees(name)')
        .eq('teacher_id', teacherId)
        .single(); 

      if (fetchError || !assignment) throw new Error('هذا المعلم غير مكلف بالمراقبة اليوم أو الرمز غير صحيح.');

      const { data: existingAttendance } = await supabase
        .from('invigilator_attendance')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('committee_id', assignment.committee_id)
        .eq('timetable_id', timetableIds[0]) 
        .maybeSingle();

      if (existingAttendance) {
         throw new Error(`تم تسجيل حضور هذا المراقب مسبقاً في لجنة (${assignment.exam_committees?.name}).`);
      }

      const { error: insertError } = await supabase
        .from('invigilator_attendance')
        .insert({ teacher_id: teacherId, timetable_id: timetableIds[0], committee_id: assignment.committee_id, status: 'present', scanned_by: user.id });

      if (insertError) throw insertError;
      
      playSuccessBeep();
      setScanStatus('success');
      setStatusMessage(`تم تسجيل حضور المراقب للجنة (${assignment.exam_committees?.name}) بنجاح!`);
    } catch (err: any) {
      playErrorBeep();
      setScanStatus('error');
      setStatusMessage(err.message || 'حدث خطأ أثناء تسجيل حضور المراقب.');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setScanStatus('idle');
    setStatusMessage('');
    setVipData(null);
    setCameraActive(true);
  };

  if (!['admin', 'management', 'staff'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20 relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 left-0 w-full h-96 bg-slate-900 overflow-hidden z-0">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
         <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 sm:pt-20">
        <div className="text-center mb-10">
           <div className="w-20 h-20 mx-auto bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl mb-6">
              <ScanLine className="w-10 h-10 text-indigo-300" />
           </div>
           <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4 drop-shadow-md">
             رادار الكنترول <span className="text-amber-400">الذكي</span>
           </h1>
           <p className="text-indigo-200 font-bold text-sm max-w-xl mx-auto">
             قم بتوجيه الكاميرا نحو الهوية الموحدة للمراقبين أو الـ QR الخاص بمغلفات الأسئلة لتسجيل الحركات فورياً.
           </p>
        </div>

        <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 mb-8 mx-auto max-w-md shadow-lg">
           <button onClick={() => { setActiveTab('envelope'); resetScan(); }} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'envelope' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
             <Mail className="w-4 h-4"/> تسليم المغلفات
           </button>
           <button onClick={() => { setActiveTab('invigilator'); resetScan(); }} className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'invigilator' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
             <User className="w-4 h-4"/> حضور المراقبين
           </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden">
           <div className="mb-6 text-center">
              <h2 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
                 {activeTab === 'envelope' ? <><ShieldCheck className="w-6 h-6 text-indigo-600"/> مسح مغلف الأسئلة</> : <><Camera className="w-6 h-6 text-indigo-600"/> مسح الهوية الموحدة للمراقب</>}
              </h2>
           </div>

           <div className="relative mx-auto w-full max-w-md aspect-square bg-slate-900 rounded-3xl overflow-hidden border-4 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.3)] flex flex-col items-center justify-center">
              {!cameraActive && scanStatus === 'idle' ? (
                <div className="text-center p-6 text-indigo-200/50">
                   <ScanLine className="w-16 h-16 mx-auto mb-4" />
                   <button onClick={() => setCameraActive(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all">
                     تفعيل الرادار والمسح
                   </button>
                </div>
              ) : cameraActive ? (
                <div className="w-full h-full relative">
                  {/* 🚀 إجبار الكاميرا على ملء المربع عبر CSS */}
                  <div className="absolute inset-0 z-0 qr-force-wrapper">
                     <QrReader 
                        onResult={handleScan} 
                        constraints={{ facingMode: 'environment' }} 
                        videoContainerStyle={{ width: '100%', height: '100%', paddingTop: 0, margin: 0 }} 
                        videoStyle={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                     />
                  </div>
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-8">
                     <div className="w-full h-full border-2 border-indigo-400/50 rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl -mb-1 -mr-1"></div>
                        <div className="absolute w-full h-0.5 bg-indigo-300/80 shadow-[0_0_10px_rgba(99,102,241,0.8)] top-1/2 left-0 -translate-y-1/2 animate-scan"></div>
                     </div>
                  </div>
                </div>
              ) : null}

              <AnimatePresence>
                {scanStatus !== 'idle' && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 bg-white/95 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 text-center">
                     {scanStatus === 'loading' && (
                        <>
                          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
                          <h3 className="text-xl font-black text-slate-800 mb-2">جاري التحقق...</h3>
                          <p className="text-sm font-bold text-slate-500">{statusMessage}</p>
                        </>
                     )}
                     
                     {/* 🚀 شاشة الترحيب الخاصة بالـ VIP */}
                     {scanStatus === 'vip' && vipData && (
                        <>
                          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-3 border-4 border-white shadow-lg overflow-hidden">
                            {vipData.users?.avatar_url ? <img src={vipData.users.avatar_url} className="w-full h-full object-cover"/> : <Crown className="w-10 h-10 text-amber-500" />}
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-1">{vipData.users?.full_name}</h3>
                          <p className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-4">{vipData.role_name}</p>
                          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4 text-emerald-400"/> صلاحية وصول معتمدة
                          </div>
                          <button onClick={resetScan} className="mt-6 bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95">
                             <RefreshCcw className="w-4 h-4"/> إغلاق
                          </button>
                        </>
                     )}

                     {scanStatus === 'success' && (
                        <>
                          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-2">عملية ناجحة</h3>
                          <p className="text-sm font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">{statusMessage}</p>
                          <button onClick={resetScan} className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-xl font-black shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2">
                             <RefreshCcw className="w-4 h-4"/> مسح كود آخر
                          </button>
                        </>
                     )}

                     {scanStatus === 'error' && (
                        <>
                          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                            <XCircle className="w-10 h-10 text-rose-500" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-2">فشلت العملية</h3>
                          <p className="text-sm font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{statusMessage}</p>
                          <button onClick={resetScan} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-black shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2">
                             <RefreshCcw className="w-4 h-4"/> المحاولة مرة أخرى
                          </button>
                        </>
                     )}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
      
      {/* 🚀 CSS مخصص لإجبار الكاميرا على ملء المربع */}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } } 
        .animate-scan { animation: scan 2s linear infinite; }
        
        .qr-force-wrapper section { padding-top: 0 !important; height: 100% !important; display: flex; align-items: center; justify-content: center; }
        .qr-force-wrapper video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
      `}}/>
    </div>
  );
}
