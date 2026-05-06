// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScanLine, ShieldCheck, CheckCircle2, XCircle, AlertCircle, 
  User, Mail, ArrowRight, Loader2, RefreshCcw, Camera
} from 'lucide-react';
import { QrReader } from 'react-qr-reader'; // 🚀 نستخدم القارئ المعتمد

export default function ControlRadarPage() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [activeTab, setActiveTab] = useState<'envelope' | 'invigilator'>('envelope');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  // 🚀 فلترة وتهيئة النص الممسوح من الـ QR Code
  const processQRText = (text: string) => {
    if (!text) return null;
    let cleanId = text.trim();
    
    try {
      // 1. إذا كان JSON (مثل {"id": "123..."})
      if (cleanId.startsWith('{')) {
        const parsed = JSON.parse(cleanId);
        if (parsed.id) return parsed.id;
        if (parsed.student_id) return parsed.student_id;
        if (parsed.teacher_id) return parsed.teacher_id;
      }
      
      // 2. إذا كان رابطاً (مثل https://domain.com/scan/123...)
      if (cleanId.includes('/')) {
        const parts = cleanId.split('/');
        cleanId = parts[parts.length - 1]; // نأخذ آخر جزء من الرابط (وهو الـ ID غالباً)
      }
      
      return cleanId;
    } catch (e) {
      return cleanId; // إرجاع النص كما هو إذا فشل التحليل
    }
  };

  const handleScan = async (result: any, error: any) => {
    if (!!result) {
      const rawText = result?.text;
      const extractedId = processQRText(rawText);
      
      if (extractedId && scanStatus !== 'loading' && scanResult !== extractedId) {
        setScanResult(extractedId);
        setCameraActive(false); // إيقاف الكاميرا مؤقتاً لتجنب المسح المتكرر المزعج
        
        if (activeTab === 'envelope') {
          await processEnvelopeScan(extractedId);
        } else {
          await processInvigilatorScan(extractedId);
        }
      }
    }
    
    if (!!error) {
      // نتجاهل أخطاء "عدم وجود رمز" لأنها تحدث في كل إطار (Frame)
      if (error?.message && !error.message.includes('No QR code found')) {
        console.warn("QR Error:", error);
      }
    }
  };

  // 🚀 معالجة مسح مغلف الأسئلة (استلام من رئيس اللجنة)
  const processEnvelopeScan = async (scannedId: string) => {
    setScanStatus('loading');
    setStatusMessage('جاري التحقق من مغلف الأسئلة...');
    
    try {
      // البحث عن المغلف في جدول رؤساء اللجان (exam_committee_heads) بناءً على معرف الجدول (timetable_id)
      const { data: envelope, error: fetchError } = await supabase
        .from('exam_committee_heads')
        .select('*, exam_timetables(subject_id, class_level, subjects(name))')
        .eq('timetable_id', scannedId)
        .single();

      if (fetchError || !envelope) {
        throw new Error('لم يتم العثور على مغلف أسئلة مطابق لهذا الرمز.');
      }

      if (envelope.is_delivered) {
        setScanStatus('error');
        setStatusMessage(`هذا المغلف تم تسليمه مسبقاً في ${new Date(envelope.delivered_at).toLocaleTimeString('ar-KW')}`);
        return;
      }

      // تحديث حالة المغلف إلى "تم التسليم"
      const { error: updateError } = await supabase
        .from('exam_committee_heads')
        .update({
          is_delivered: true,
          delivered_at: new Date().toISOString(),
          received_by: user.id
        })
        .eq('id', envelope.id);

      if (updateError) throw updateError;

      setScanStatus('success');
      setStatusMessage(`تم استلام مغلف (${envelope.exam_timetables?.subjects?.name} - صف ${envelope.exam_timetables?.class_level}) بنجاح!`);

    } catch (err: any) {
      setScanStatus('error');
      setStatusMessage(err.message || 'حدث خطأ أثناء معالجة المغلف.');
    }
  };

  // 🚀 معالجة مسح بطاقة المراقب (تسجيل الحضور)
  const processInvigilatorScan = async (teacherId: string) => {
    setScanStatus('loading');
    setStatusMessage('جاري تسجيل حضور المراقب...');
    
    try {
      // 1. التحقق من أن هذا المعلم هو مراقب اليوم
      const todayDate = new Date().toISOString().split('T')[0];
      
      const { data: timetables } = await supabase
        .from('exam_timetables')
        .select('id')
        .eq('exam_date', todayDate);

      if (!timetables || timetables.length === 0) {
        throw new Error('لا توجد اختبارات مجدولة لهذا اليوم.');
      }

      const timetableIds = timetables.map(t => t.id);

      // 2. البحث عن لجنة المراقبة المكلف بها
      const { data: assignment, error: fetchError } = await supabase
        .from('committee_invigilators')
        .select('*, exam_committees(name)')
        .eq('teacher_id', teacherId)
        .single(); // في نظام واقعي قد يراقب أكثر من لجنة، نأخذ الأولى مؤقتاً للتوضيح

      if (fetchError || !assignment) {
        throw new Error('هذا المعلم غير مكلف بالمراقبة اليوم أو الرمز غير صحيح.');
      }

      // 3. تسجيل حضوره في جدول (invigilator_attendance)
      const { data: existingAttendance } = await supabase
        .from('invigilator_attendance')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('committee_id', assignment.committee_id)
        .eq('timetable_id', timetableIds[0]) // نفترض الاختبار الأول اليوم
        .maybeSingle();

      if (existingAttendance) {
         setScanStatus('error');
         setStatusMessage(`تم تسجيل حضور هذا المراقب مسبقاً في لجنة (${assignment.exam_committees?.name}).`);
         return;
      }

      const { error: insertError } = await supabase
        .from('invigilator_attendance')
        .insert({
          teacher_id: teacherId,
          timetable_id: timetableIds[0],
          committee_id: assignment.committee_id,
          status: 'present',
          scanned_by: user.id
        });

      if (insertError) throw insertError;

      setScanStatus('success');
      setStatusMessage(`تم تسجيل حضور المراقب للجنة (${assignment.exam_committees?.name}) بنجاح!`);

    } catch (err: any) {
      setScanStatus('error');
      setStatusMessage(err.message || 'حدث خطأ أثناء تسجيل حضور المراقب.');
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setScanStatus('idle');
    setStatusMessage('');
    setCameraActive(true);
  };

  if (!['admin', 'management', 'staff'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20 relative overflow-hidden" dir="rtl">
      {/* Background Decor */}
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
             قم بتوجيه الكاميرا نحو الـ QR Code الخاص بمغلفات الأسئلة أو بطاقات المراقبين لتسجيل الحركات فورياً في النظام المركزي.
           </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 mb-8 mx-auto max-w-md">
           <button
             onClick={() => { setActiveTab('envelope'); resetScan(); }}
             className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'envelope' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
           >
             <Mail className="w-4 h-4"/> تسليم المغلفات
           </button>
           <button
             onClick={() => { setActiveTab('invigilator'); resetScan(); }}
             className={`flex-1 py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'invigilator' ? 'bg-white text-indigo-900 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
           >
             <User className="w-4 h-4"/> حضور المراقبين
           </button>
        </div>

        {/* Scanner Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden">
           
           <div className="mb-6 text-center">
              <h2 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
                 {activeTab === 'envelope' ? (
                   <><ShieldCheck className="w-6 h-6 text-indigo-600"/> مسح مغلف الأسئلة</>
                 ) : (
                   <><Camera className="w-6 h-6 text-indigo-600"/> مسح بطاقة المراقب</>
                 )}
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-2">
                 {activeTab === 'envelope' ? 'قم بمسح الكود الموجود على المغلف لإثبات استلامه من رئيس اللجنة.' : 'قم بمسح كود المعلم لتسجيل حضوره كـ (مراقب لجنة).'}
              </p>
           </div>

           <div className="relative mx-auto w-full max-w-md aspect-square bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-200 shadow-inner flex flex-col items-center justify-center">
              
              {!cameraActive && scanStatus === 'idle' ? (
                <div className="text-center p-6">
                   <ScanLine className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                   <button onClick={() => setCameraActive(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-md hover:bg-indigo-700 active:scale-95 transition-all">
                     تفعيل الكاميرا والمسح
                   </button>
                </div>
              ) : cameraActive ? (
                <div className="w-full h-full relative">
                  {/* 🚀 القارئ المعتمد والموثوق */}
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%', height: '100%' }}
                    videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* إطار التوجيه (Guides) */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                     <div className="w-full h-full border-2 border-indigo-500/50 rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -mb-1 -mr-1"></div>
                        <div className="absolute w-full h-0.5 bg-indigo-400/80 shadow-[0_0_10px_rgba(99,102,241,0.8)] top-1/2 left-0 -translate-y-1/2 animate-scan"></div>
                     </div>
                  </div>
                </div>
              ) : null}

              {/* طبقة العرض (Overlay) لنتيجة المسح */}
              <AnimatePresence>
                {scanStatus !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }} 
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center"
                  >
                     {scanStatus === 'loading' && (
                        <>
                          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
                          <h3 className="text-xl font-black text-slate-800 mb-2">جاري التحقق...</h3>
                          <p className="text-sm font-bold text-slate-500">{statusMessage}</p>
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
                          <p className="text-xs text-slate-400 mt-4">الرمز الممسوح: {scanResult}</p>
                          <button onClick={resetScan} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-black shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2">
                             <RefreshCcw className="w-4 h-4"/> المحاولة مرة أخرى
                          </button>
                        </>
                     )}
                  </motion.div>
                )}
              </AnimatePresence>

           </div>
           
           <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 py-3 rounded-xl border border-slate-100">
             <AlertCircle className="w-4 h-4 text-amber-500" />
             تأكد من إضاءة المكان بشكل جيد للحصول على قراءة سريعة.
           </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}}/>
    </div>
  );
}
