// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCheck, UserX, ShieldCheck, Loader2, Search, CheckCircle2, XCircle, Clock, LayoutGrid, ScanLine, AlertTriangle, AlertCircle, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ExamAttendanceRadar() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // البيانات الأساسية
  const [timetables, setTimetables] = useState<any[]>([]);
  const [committees, setCommittees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // الاختيارات
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // وضع المسح بالباركود
  const [isScanMode, setIsScanMode] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // إعدادات افتراضية للفصل الحالي (يمكن جلبها من الإعدادات لاحقاً)
  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';
  const todayDate = format(new Date(), 'yyyy-MM-dd'); // تاريخ اليوم

  // 1️⃣ جلب اختبارات اليوم واللجان المتاحة
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // جلب اختبارات اليوم فقط
      const { data: todayExams } = await supabase
        .from('exam_timetables')
        .select('*, subjects(name)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .eq('exam_date', todayDate) // يمكنك إلغاء هذا الشرط لاختبار النظام
        .order('start_time');

      // جلب كل اللجان
      const { data: comms } = await supabase
        .from('exam_committees')
        .select('*')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('name');

      setTimetables(todayExams || []);
      setCommittees(comms || []);
      
      // التحديد التلقائي إذا كان هناك اختبار ولجنة
      if (todayExams && todayExams.length > 0) setSelectedTimetableId(todayExams[0].id);
      
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

  // 2️⃣ جلب طلاب اللجنة المختارة ومعرفة حالة حضورهم
  const fetchCommitteeStudents = async () => {
    if (!selectedTimetableId || !selectedCommitteeId) return;
    setIsLoading(true);
    
    try {
      // جلب توزيع الطلاب في هذه اللجنة
      const { data: allocations } = await supabase
        .from('student_seat_allocations')
        .select(`
          seat_number, 
          student_id,
          students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )
        `)
        .eq('committee_id', selectedCommitteeId)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('seat_number', { ascending: true });

      // جلب سجلات الحضور لهذه اللجنة وهذا الاختبار تحديداً
      const { data: attendanceRecords } = await supabase
        .from('exam_attendance')
        .select('*')
        .eq('timetable_id', selectedTimetableId)
        .eq('committee_id', selectedCommitteeId);

      // دمج البيانات
      const formattedStudents = (allocations || []).map((alloc: any) => {
        const studentInfo = alloc.students;
        const userInfo = Array.isArray(studentInfo?.users) ? studentInfo?.users[0] : studentInfo?.users;
        const sectionInfo = Array.isArray(studentInfo?.sections) ? studentInfo?.sections[0] : studentInfo?.sections;
        const classInfo = sectionInfo?.classes;

        const clsName = classInfo?.name || 'صف غير محدد';
        const secName = sectionInfo?.name ? ` - ${sectionInfo.name}` : '';
        
        // البحث هل الطالب مسجل في جدول الحضور أم لا
        const attendanceRecord = attendanceRecords?.find(r => r.student_id === alloc.student_id);

        return {
          student_id: alloc.student_id,
          seat_number: alloc.seat_number,
          full_name: userInfo?.full_name || 'طالب مجهول',
          avatar_url: userInfo?.avatar_url,
          class_name: `${clsName}${secName}`,
          status: attendanceRecord ? attendanceRecord.status : 'pending', // pending = لم يتم الرصد
          record_id: attendanceRecord?.id || null
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitteeStudents();
  }, [selectedTimetableId, selectedCommitteeId]);

  // 3️⃣ دالة تسجيل الحضور/الغياب اليدوية
  const markAttendance = async (studentId: string, newStatus: 'present' | 'absent' | 'excused') => {
    if (!selectedTimetableId || !selectedCommitteeId || !user?.id) return;
    setIsProcessing(true);

    try {
      const existingStudent = students.find(s => s.student_id === studentId);
      
      // تحديث الواجهة فوراً (Optimistic Update)
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, status: newStatus } : s));

      // تسجيل في قاعدة البيانات (Upsert لضمان التحديث إذا كان موجوداً مسبقاً)
      const { data, error } = await supabase
        .from('exam_attendance')
        .upsert({ 
          student_id: studentId,
          timetable_id: selectedTimetableId,
          committee_id: selectedCommitteeId,
          status: newStatus,
          recorded_by: user.id
        }, { onConflict: 'student_id, timetable_id' })
        .select()
        .single();

      if (error) throw error;
      
      // تحديث الـ ID الخاص بالسجل
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, record_id: data.id } : s));

    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('حدث خطأ أثناء حفظ الحالة.');
      fetchCommitteeStudents(); // التراجع عن التحديث الواهم
    } finally {
      setIsProcessing(false);
    }
  };

  // 4️⃣ محرك استشعار الباركود (الرادار) 🚀
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const scannedCode = e.currentTarget.value.trim();
      e.currentTarget.value = ''; // تفريغ الحقل فوراً للبطاقة التالية

      // تحليل الكود (الذي صممناه في الطباعة ليصبح: raf-exam-seat:10001)
      if (scannedCode.startsWith('raf-exam-seat:')) {
        const seatNumber = scannedCode.split(':')[1];
        
        // البحث عن الطالب في القائمة الحالية
        const targetStudent = students.find(s => String(s.seat_number) === seatNumber);
        
        if (targetStudent) {
          if (targetStudent.status !== 'present') {
            markAttendance(targetStudent.student_id, 'present');
            // يمكنك تشغيل صوت (Beep) هنا للنجاح
          }
        } else {
          alert(`رقم الجلوس ${seatNumber} غير موجود في هذه اللجنة! تأكد من الطالب.`);
        }
      } else {
         // إذا كان الباركود يحمل رقم الجلوس فقط (بدون البريفكس)
         const targetStudent = students.find(s => String(s.seat_number) === scannedCode);
         if (targetStudent) markAttendance(targetStudent.student_id, 'present');
      }
    }
  };

  // الحفاظ على التركيز في حقل الباركود أثناء وضع المسح
  useEffect(() => {
    if (isScanMode && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScanMode]);

  // إحصائيات حية
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const pendingCount = students.filter(s => s.status === 'pending').length;

  // 🛡️ حماية الغرفة
  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">عذراً، هذه الغرفة مخصصة لمدير النظام والمراقبين فقط.</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">العودة للخلف</button>
        </div>
      </div>
    );
  }

  // فلترة قائمة الطلاب المعروضة
  const filteredStudents = students.filter(s => {
    const term = String(searchTerm || '').toLowerCase();
    const matchesName = String(s.full_name || '').toLowerCase().includes(term);
    const matchesSeat = String(s.seat_number || '').includes(term);
    return matchesName || matchesSeat;
  });

  const selectedTimetableData = timetables.find(t => t.id === selectedTimetableId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo" dir="rtl">
      
      {/* 🚀 شاشة التحميل */}
      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-indigo-600">
            <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin" />
               <span className="font-black text-lg">جاري تحميل البيانات...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
        
        {/* 📋 رأس الصفحة (Header) */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-emerald-50/50 pointer-events-none"><ScanLine className="w-64 h-64" /></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><UserCheck className="w-6 h-6 sm:w-8 sm:h-8" /></div> 
                رادار الحضور الامتحاني
              </h1>
              <p className="text-slate-500 font-bold text-sm sm:text-base">تسجيل ومسح الباركود الفوري لغياب وحضور الطلاب في اللجان.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              {/* زر تفعيل الرادار */}
              <button 
                 onClick={() => setIsScanMode(!isScanMode)} 
                 className={`flex-1 lg:flex-none px-5 py-3.5 font-black rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 border ${isScanMode ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'}`}
              >
                {isScanMode ? <><XCircle className="w-5 h-5"/> إيقاف الرادار</> : <><ScanLine className="w-5 h-5"/> تفعيل رادار الباركود</>}
              </button>
            </div>
          </div>

          {/* 🎛️ أدوات التصفية والبحث */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {/* اختيار الاختبار */}
             <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/> اختبار اليوم</label>
                <select 
                   value={selectedTimetableId} 
                   onChange={(e) => setSelectedTimetableId(e.target.value)}
                   className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm"
                >
                   <option value="" disabled>اختر المادة...</option>
                   {timetables.length === 0 && <option value="" disabled>لا توجد اختبارات مبرمجة اليوم</option>}
                   {timetables.map(t => (
                      <option key={t.id} value={t.id}>{t.subjects?.name} - الصف {t.class_level} ({t.start_time?.substring(0,5)})</option>
                   ))}
                </select>
             </div>

             {/* اختيار اللجنة */}
             <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><LayoutGrid className="w-3 h-3"/> تحديد اللجنة</label>
                <select 
                   value={selectedCommitteeId} 
                   onChange={(e) => setSelectedCommitteeId(e.target.value)}
                   disabled={!selectedTimetableId}
                   className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-sm disabled:opacity-50"
                >
                   <option value="">اختر لجنتك للمراقبة...</option>
                   {committees.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                </select>
             </div>

             {/* إحصائيات سريعة للجنة */}
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 mb-1">العدد الكلي</p>
                   <p className="text-xl font-black text-slate-800">{totalStudents}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                   <p className="text-[10px] font-black text-emerald-600 mb-1">حاضر</p>
                   <p className="text-xl font-black text-emerald-700">{presentCount}</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                   <p className="text-[10px] font-black text-rose-600 mb-1">غائب</p>
                   <p className="text-xl font-black text-rose-700">{absentCount}</p>
                </div>
             </div>
          </div>
        </div>

        {/* 🔴 شاشة وضع المسح (Barcode Radar Mode) */}
        <AnimatePresence>
           {isScanMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                 <div className="bg-emerald-600 rounded-[2rem] p-8 sm:p-12 text-white shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-500/50 backdrop-blur-3xl animate-pulse"></div>
                    <div className="relative z-10">
                       <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white/30 backdrop-blur-md shadow-[0_0_50px_rgba(255,255,255,0.3)]">
                          <ScanLine className="w-12 h-12 text-white animate-bounce" />
                       </div>
                       <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-wide">الرادار نشط وجاهز للمسح!</h2>
                       <p className="text-emerald-100 font-bold text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">قم بتوجيه مسدس الباركود (أو تطبيق كاميرا الجوال المتصل) نحو بطاقة الطالب لتبديل حالته إلى حاضر فوراً.</p>
                       
                       {/* حقل الإدخال الخفي (يستقبل ضربات المسدس) */}
                       <input 
                          ref={scanInputRef}
                          type="text" 
                          onKeyDown={handleBarcodeScan}
                          onBlur={() => { if(isScanMode) scanInputRef.current?.focus(); }} // يمنع فقدان التركيز
                          className="w-full max-w-sm bg-white/10 border-2 border-white/40 rounded-2xl p-4 text-center font-black text-2xl text-white outline-none placeholder:text-white/30 focus:border-white transition-all shadow-inner"
                          placeholder="... ينتظر قراءة الباركود ..."
                          autoFocus
                       />
                    </div>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>

        {/* 👥 قائمة الطلاب (Manual Attendance) */}
        {selectedCommitteeId ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            
            {/* شريط البحث المانيوال */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Users className="w-5 h-5 text-indigo-500" /> كشف المناداة الإلكتروني
               </h3>
               <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                  <input
                     type="text"
                     disabled={isScanMode} // تعطل البحث اليدوي أثناء المسح لمنع التداخل
                     className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                     placeholder={isScanMode ? "أوقف الرادار للبحث اليدوي..." : "ابحث بالاسم أو رقم الجلوس..."}
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            {/* شبكة الطلاب */}
            <div className="p-4 sm:p-6">
              {filteredStudents.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredStudents.map((student, idx) => {
                       const isPresent = student.status === 'present';
                       const isAbsent = student.status === 'absent';
                       const isPending = student.status === 'pending';
                       
                       const stdInitial = String(student.full_name || 'ط').charAt(0);

                       return (
                          <div key={student.student_id} className={cn(
                             "p-4 rounded-2xl border-2 transition-all flex flex-col gap-4 relative overflow-hidden",
                             isPresent ? "bg-emerald-50 border-emerald-200 shadow-sm" : 
                             isAbsent ? "bg-rose-50 border-rose-200 shadow-sm" : 
                             "bg-white border-slate-100 hover:border-slate-300"
                          )}>
                             {/* مؤشر الحالة الجانبي */}
                             <div className={cn(
                                "absolute top-0 right-0 w-1.5 h-full",
                                isPresent ? "bg-emerald-500" : isAbsent ? "bg-rose-500" : "bg-slate-200"
                             )}></div>

                             <div className="flex items-start gap-3">
                                <div className={cn(
                                   "w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 shadow-inner border border-white/50",
                                   isPresent ? "bg-emerald-200 text-emerald-700" :
                                   isAbsent ? "bg-rose-200 text-rose-700" : "bg-slate-100 text-slate-500"
                                )}>
                                   {student.avatar_url ? (
                                      <img src={student.avatar_url} className="w-full h-full rounded-xl object-cover" alt="avatar" />
                                   ) : stdInitial}
                                </div>
                                <div className="flex-1 min-w-0 pr-1">
                                   <p className="font-black text-sm sm:text-base text-slate-800 truncate" title={student.full_name}>{student.full_name}</p>
                                   <p className="text-[10px] font-bold text-slate-500 mt-1 truncate">{student.class_name}</p>
                                   <div className="mt-2 inline-flex items-center gap-1.5 bg-slate-900 text-white px-2 py-1 rounded-md text-[10px] font-black tracking-widest shadow-sm">
                                      رقم الجلوس: <span className="text-amber-400 text-xs">{student.seat_number}</span>
                                   </div>
                                </div>
                             </div>

                             {/* أزرار التحول اليدوي (Toggle) */}
                             <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                                <button 
                                   onClick={() => markAttendance(student.student_id, 'present')}
                                   disabled={isProcessing}
                                   className={cn(
                                      "py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-95 disabled:opacity-50",
                                      isPresent ? "bg-emerald-500 text-white shadow-md border border-emerald-600" : "bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50"
                                   )}
                                >
                                   {isPresent ? <CheckCircle2 className="w-4 h-4"/> : null} 
                                   {isPresent ? 'حاضر' : 'تحديد كحاضر'}
                                </button>
                                <button 
                                   onClick={() => markAttendance(student.student_id, 'absent')}
                                   disabled={isProcessing}
                                   className={cn(
                                      "py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-95 disabled:opacity-50",
                                      isAbsent ? "bg-rose-500 text-white shadow-md border border-rose-600" : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50"
                                   )}
                                >
                                   {isAbsent ? <XCircle className="w-4 h-4"/> : null} 
                                   {isAbsent ? 'غائب' : 'تحديد كغائب'}
                                </button>
                             </div>
                          </div>
                       )
                    })}
                 </div>
              ) : (
                 <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-700 mb-1">لا يوجد نتائج</h3>
                    <p className="text-sm font-bold text-slate-500">جرب البحث باسم آخر، أو تأكد من اختيار اللجنة الصحيحة.</p>
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-200 flex flex-col items-center justify-center border-dashed">
            <LayoutGrid className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-400 mb-2">اختر اللجنة للبدء</h3>
            <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto">قم باختيار المادة التي يتم اختبارها الآن، ثم اختر لجنتك لاستعراض قائمة الطلاب وتسجيل الحضور.</p>
          </div>
        )}

      </div>
    </div>
  );
}
