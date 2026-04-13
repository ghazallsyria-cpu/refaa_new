'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Printer, Calendar, Clock, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2,
  XCircle, Hourglass, Minus, Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfWeek, addDays } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// دالة تحويل الأيام لتتناسب مع قاعدة بياناتك (الأحد = 1)
const getDbDay = () => {
  const jsDay = new Date().getDay(); // 0 = الأحد
  if (jsDay >= 0 && jsDay <= 4) return jsDay + 1; 
  return 1; // الافتراضي يوم الأحد في عطلة الجمعة والسبت
};

export default function TeacherAttendanceMatrix() {
  const { userRole } = useAuth();
  
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [periodsList, setPeriodsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentDbDay = getDbDay();
  const [selectedDay, setSelectedDay] = useState<number>(currentDbDay);
  const [displayDate, setDisplayDate] = useState<string>(''); 
  
  const [stats, setStats] = useState({ totalAbsences: 0, totalPresents: 0 });
  const [debugInfo, setDebugInfo] = useState({ schedulesCount: -1, periodsCount: -1, error: null as string | null });

  const fetchMatrixData = useCallback(async () => {
    setLoading(true);
    try {
      const sundayOfThisWeek = startOfWeek(new Date(), { weekStartsOn: 0 }); 
      const targetDateObj = addDays(sundayOfThisWeek, selectedDay - 1);
      const targetDateStr = format(targetDateObj, 'yyyy-MM-dd'); 
      
      setDisplayDate(format(targetDateObj, 'yyyy/MM/dd')); 
      
      const [
        schRes, 
        perRes, 
        secRes, 
        clsRes, 
        usrRes, 
        attRes
      ] = await Promise.all([
        // 🚀 التحسين 1: جلب حصص اليوم المختار فقط لتخفيف الضغط على السيرفر
        supabase.from('schedules').select('*').eq('day_of_week', selectedDay),
        supabase.from('class_periods').select('*').order('period_number'), 
        supabase.from('sections').select('id, name, class_id'), 
        supabase.from('classes').select('id, name'), 
        supabase.from('users').select('id, full_name').in('role', ['teacher', 'admin', 'management']),
        supabase.from('teacher_attendance_records').select('*').eq('date', targetDateStr)
      ]);

      setDebugInfo({
        schedulesCount: schRes.data?.length || 0,
        periodsCount: perRes.data?.length || 0,
        error: schRes.error?.message || perRes.error?.message || null
      });

      const todaysSchedule = schRes.data || [];
      const periods = perRes.data || [];
      const sections = secRes.data || [];
      const classes = clsRes.data || [];
      const users = usrRes.data || [];
      const attendance = attRes.data || [];

      // 🚀 التحسين 2: الفهرسة (Hash Maps / Sets) 
      // لتحويل سرعة البحث داخل المصفوفات من بطيئة جداً O(N) إلى سرعة لحظية O(1) ومنع تجمد المتصفح
      const sectionsMap = new Map(sections.map(s => [s.id, s]));
      const classesMap = new Map(classes.map(c => [c.id, c]));
      const usersMap = new Map(users.map(u => [u.id, u]));
      const periodsMap = new Map(periods.map(p => [Number(p.period_number), p]));
      
      // فهرسة الحضور في Set للتحقق السريع
      const attendanceSet = new Set(attendance.map(a => `${a.teacher_id}_${a.period_number}`));

      // ترتيب الحصص حسب الرقم المعتمد في القاعدة
      const sortedPeriods = [...periods].sort((a: any, b: any) => Number(a.period_number) - Number(b.period_number));
      setPeriodsList(sortedPeriods);

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const isToday = targetDateStr === format(now, 'yyyy-MM-dd');
      const isPastDay = targetDateObj < new Date(new Date().setHours(0,0,0,0));

      let absencesCount = 0;
      let presentsCount = 0;

      const teacherMap = new Map();

      todaysSchedule.forEach(sch => {
        if (!teacherMap.has(sch.teacher_id)) {
          // استخدام الخريطة السريعة للبحث عن اسم المعلم
          const userRecord = usersMap.get(sch.teacher_id);
          
          let finalName = `معلم (${sch.teacher_id.substring(0, 4)})`;
          if (userRecord && userRecord.full_name && userRecord.full_name.trim() !== '') {
             finalName = userRecord.full_name;
          }

          teacherMap.set(sch.teacher_id, {
            teacher_id: sch.teacher_id,
            teacher_name: finalName,
            periodsData: {}
          });
        }

        const row = teacherMap.get(sch.teacher_id);
        
        // استخدام الخرائط السريعة لجلب الصف والشعبة
        const section = sectionsMap.get(sch.section_id);
        const cls = section ? classesMap.get(section.class_id) : null;
        const classNameToDisplay = cls && section ? `${cls.name} - ${section.name}` : 'صف غير محدد';
        
        // 🚀 تحقق لحظي وفوري من الحضور باستخدام Set بدلاً من الدوران الكامل
        const hasAttended = attendanceSet.has(`${sch.teacher_id}_${sch.period}`);
        const periodInfo = periodsMap.get(Number(sch.period));

        let status = 'pending';

        if (hasAttended) {
          status = 'present';
          presentsCount++;
        } else if (periodInfo && periodInfo.end_time) {
          const [endH, endM] = periodInfo.end_time.split(':').map(Number);
          const periodEndMinutes = endH * 60 + endM;

          if (isPastDay) {
            status = 'absent';
            absencesCount++;
          } else if (isToday && currentMinutes > periodEndMinutes) {
            status = 'absent';
            absencesCount++;
          }
        } else if (isPastDay) {
          status = 'absent';
          absencesCount++;
        }

        row.periodsData[sch.period] = {
          status,
          displayData: classNameToDisplay 
        };
      });

      const matrix = Array.from(teacherMap.values()).map(row => {
        sortedPeriods.forEach(p => {
          if (!row.periodsData[p.period_number]) {
            row.periodsData[p.period_number] = { status: 'free' };
          }
        });
        return row;
      });

      matrix.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
      setMatrixData(matrix);
      setStats({ totalAbsences: absencesCount, totalPresents: presentsCount });

    } catch (error) {
      console.error('Error fetching matrix data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'management') {
      fetchMatrixData();
      const interval = setInterval(fetchMatrixData, 300000);
      return () => clearInterval(interval);
    }
  }, [userRole, fetchMatrixData]);

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    if (matrixData.length === 0) return alert('لا توجد بيانات للتصدير');
    const dataToExport = matrixData.map(row => {
      const obj: any = { 'اسم المعلم': row.teacher_name };
      periodsList.forEach(p => {
        const cell = row.periodsData[p.period_number];
        let val = '-';
        if (cell?.status === 'present') val = `حاضر (${cell.displayData})`;
        if (cell?.status === 'absent') val = 'غياب ❌';
        if (cell?.status === 'pending') val = `بانتظار الحضور (${cell.displayData})`;
        obj[`الحصة ${p.period_number}`] = val;
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الحضور");
    XLSX.writeFile(workbook, `سجل_الدوام_${displayDate.replace(/\//g, '-')}.xlsx`);
  };

  if (userRole !== 'admin' && userRole !== 'management') return null;

  const daysOfWeek = [
    { id: 1, name: 'الأحد' }, { id: 2, name: 'الإثنين' }, { id: 3, name: 'الثلاثاء' },
    { id: 4, name: 'الأربعاء' }, { id: 5, name: 'الخميس' }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, nav, header, footer, button, a { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: landscape A4; margin: 10mm; }
          #printable-matrix { visibility: visible !important; width: 100% !important; border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .overflow-x-auto { overflow: visible !important; }
          th, td { position: static !important; border: 1px solid #cbd5e1 !important; font-size: 10px !important; }
          .print-signatures { display: block !important; margin-top: 50px !important; }
        }
      `}} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 max-w-[98%] mx-auto px-4 font-cairo pt-8" dir="rtl">
        
        <div className="no-print">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-900 p-8 sm:p-12 text-white shadow-2xl border border-slate-700 no-print">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-4 shadow-inner">
                <ShieldAlert className="w-4 h-4 text-emerald-400" /> رادار الرصد المباشر
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">مصفوفة دوام المعلمين</h1>
              <p className="text-indigo-200 font-bold text-base max-w-2xl leading-relaxed">
                متابعة الحضور المباشر للمعلمين حسب جدول الحصص اليومي بكل دقة وموثوقية.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportToExcel} className="flex items-center justify-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-black hover:bg-indigo-50 transition-colors shadow-lg active:scale-95">
                <Database className="w-5 h-5" /> تصدير Excel
              </button>
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-600 transition-colors shadow-lg active:scale-95">
                <Printer className="w-5 h-5" /> طباعة / PDF
              </button>
              <button onClick={fetchMatrixData} className="p-3 bg-indigo-500/50 hover:bg-indigo-500/80 text-white rounded-xl transition-all border border-indigo-400/50" title="تحديث البيانات الآن">
                <RefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 justify-center no-print">
          {daysOfWeek.map(day => (
            <button key={day.id} onClick={() => setSelectedDay(day.id)} className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex-1 sm:flex-none ${selectedDay === day.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              {day.name} {day.id === currentDbDay && '(اليوم)'}
            </button>
          ))}
        </div>

        <div id="printable-matrix" className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-indigo-600" />
                سجل الحضور - {daysOfWeek.find(d => d.id === selectedDay)?.name}
              </h2>
              <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">تاريخ السجل: <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-indigo-700 shadow-sm" dir="ltr">{displayDate}</span></p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white px-5 py-2 rounded-xl border border-slate-200 text-center shadow-sm">
                <p className="text-emerald-600 font-black text-xl">{stats.totalPresents}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">حصص مكتملة</p>
              </div>
              <div className="bg-white px-5 py-2 rounded-xl border border-slate-200 text-center shadow-sm">
                <p className="text-rose-600 font-black text-xl">{stats.totalAbsences}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">حصص غياب</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-4 md:p-6 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex justify-center no-print"><RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" /></div>
            ) : debugInfo.periodsCount === 0 ? (
              <div className="py-16 px-8 bg-rose-50 border-2 border-rose-200 rounded-3xl mx-auto max-w-2xl text-center no-print">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-rose-100 text-rose-500"><Database className="w-10 h-10" /></div>
                <h3 className="font-black text-xl text-rose-700 mb-2">جدول الأوقات غير متاح!</h3>
                <p className="font-bold text-slate-600 text-sm mb-6">يرجى التأكد من وجود بيانات في جدول <code>class_periods</code> وفتح صلاحية القراءة RLS.</p>
              </div>
            ) : matrixData.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100"><Clock className="w-8 h-8" /></div>
                <h3 className="font-black text-lg text-slate-800">لا توجد حصص مجدولة لهذا اليوم</h3>
                <p className="text-slate-500 text-sm font-bold">يرجى مراجعة جدول الحصص الأسبوعي.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 bg-slate-900 text-white font-black border border-slate-800 md:sticky md:right-0 z-10 w-[220px]">المعلم</th>
                    {periodsList.map(p => (
                      <th key={p.id} className="p-3 bg-slate-100 text-slate-700 font-black border border-slate-200 text-center min-w-[110px]">
                        {p.label || `الحصة ${p.period_number}`}
                        <div className="text-[10px] font-bold text-slate-400 mt-1" dir="ltr">{p.start_time?.substring(0,5)} - {p.end_time?.substring(0,5)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((row, idx) => (
                    <tr key={row.teacher_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border border-slate-200 font-black text-slate-800 bg-white md:sticky md:right-0 z-10 md:shadow-md">{idx + 1}. {row.teacher_name}</td>
                      {periodsList.map(p => {
                        const cell = row.periodsData[p.period_number];
                        return (
                          <td key={p.id} className="p-2 border border-slate-200 text-center align-middle">
                            {cell?.status === 'free' ? <Minus className="w-4 h-4 mx-auto text-slate-200" /> :
                             cell?.status === 'present' ? (
                               <div className="flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 rounded-xl p-2 border border-emerald-100 h-full min-h-[55px]">
                                 <CheckCircle2 className="w-5 h-5 mb-1" />
                                 <span className="font-bold text-[9px] leading-tight">{cell.displayData}</span>
                               </div>
                             ) : cell?.status === 'absent' ? (
                               <div className="flex flex-col items-center justify-center bg-rose-50 text-rose-700 rounded-xl p-2 border border-rose-100 h-full min-h-[55px]">
                                 <XCircle className="w-5 h-5 mb-1" />
                                 <span className="font-black text-[10px] uppercase">غيـاب</span>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center justify-center bg-amber-50 text-amber-600 rounded-xl p-2 border border-amber-100 h-full min-h-[55px]">
                                 <Hourglass className="w-4 h-4 mb-1 animate-pulse" />
                                 <span className="font-bold text-[9px] leading-tight">{cell.displayData}</span>
                               </div>
                             )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="print-signatures hidden w-full px-12 pb-12 mt-12">
            <div className="flex justify-between items-end w-full border-t-2 border-slate-100 pt-10">
              <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع الإشراف الإداري</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
              <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع مدير المدرسة</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
            </div>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </>
  );
}
