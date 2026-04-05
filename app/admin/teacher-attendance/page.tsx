'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Printer, Calendar, Clock, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2,
  XCircle, Hourglass, Minus, AlertTriangle, Database
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';

// دالة تحويل الأيام لتتناسب مع جميع الاحتمالات في قاعدة بياناتك
const getDbDay = () => {
  const jsDay = new Date().getDay(); // 0 = الأحد
  if (jsDay === 0) return 1; 
  if (jsDay === 1) return 2; 
  if (jsDay === 2) return 3; 
  if (jsDay === 3) return 4; 
  if (jsDay === 4) return 5; 
  return 1; 
};

export default function TeacherAttendanceMatrix() {
  const { userRole } = useAuth();
  
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [periodsList, setPeriodsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentDbDay = getDbDay();
  const [selectedDay, setSelectedDay] = useState<number>(currentDbDay);
  
  const [stats, setStats] = useState({ totalAbsences: 0, totalPresents: 0 });
  const [debugInfo, setDebugInfo] = useState({ schedulesCount: -1, error: null as string | null });

  const fetchMatrixData = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // سحب الجداول بشكل مستقل تماماً
      const schRes = await supabase.from('schedules').select('*');
      const perRes = await supabase.from('periods').select('*').order('period_number');
      const subRes = await supabase.from('subjects').select('id, name');
      const usrRes = await supabase.from('users').select('id, full_name');
      const attRes = await supabase.from('teacher_attendance_records').select('*').eq('date', todayStr);

      // 🚨 كاشف الأعطال الصامتة
      setDebugInfo({
        schedulesCount: schRes.data?.length || 0,
        error: schRes.error?.message || null
      });

      const allSchedules = schRes.data || [];
      const periods = perRes.data || [];
      const subjects = subRes.data || [];
      const users = usrRes.data || [];
      const attendance = attRes.data || [];

      const sortedPeriods = periods.length > 0 
        ? periods.sort((a: any, b: any) => Number(a.period_number) - Number(b.period_number))
        : [1, 2, 3, 4, 5, 6, 7].map(n => ({ period_number: n, start_time: null, end_time: null }));
        
      setPeriodsList(sortedPeriods);

      // تصفية حسب اليوم المختار (بالتطابق الرقمي 100%)
      const todaysSchedule = allSchedules.filter(s => Number(s.day_of_week) === Number(selectedDay));

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const isToday = currentDbDay === selectedDay;
      const isPastDay = selectedDay < currentDbDay;

      let absencesCount = 0;
      let presentsCount = 0;

      const teacherMap = new Map();

      todaysSchedule.forEach(sch => {
        if (!teacherMap.has(sch.teacher_id)) {
          const userRecord = users.find(u => u.id === sch.teacher_id);
          teacherMap.set(sch.teacher_id, {
            teacher_id: sch.teacher_id,
            teacher_name: userRecord?.full_name || `معلم غير مسجل (${sch.teacher_id.substring(0, 4)})`,
            periodsData: {}
          });
        }

        const row = teacherMap.get(sch.teacher_id);
        const subject = subjects.find(s => s.id === sch.subject_id);
        
        const hasAttended = attendance.some(a => a.teacher_id === sch.teacher_id && Number(a.period_number) === Number(sch.period));
        const periodInfo = sortedPeriods.find(p => Number(p.period_number) === Number(sch.period));

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
          subject: subject?.name || 'مادة'
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
  }, [selectedDay, currentDbDay]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'management') {
      fetchMatrixData();
      const interval = setInterval(fetchMatrixData, 60000);
      return () => clearInterval(interval);
    }
  }, [userRole, fetchMatrixData]);

  const handlePrint = () => {
    window.print();
  };

  if (userRole !== 'admin' && userRole !== 'management') return null;

  // 🚀 تغطية جميع الاحتمالات لأرقام الأيام في قاعدة البيانات
  const daysOfWeek = [
    { id: 0, name: 'تأكد: (0)' },
    { id: 1, name: 'الأحد (1)' }, 
    { id: 2, name: 'الإثنين (2)' }, 
    { id: 3, name: 'الثلاثاء (3)' },
    { id: 4, name: 'الأربعاء (4)' }, 
    { id: 5, name: 'الخميس (5)' }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; direction: rtl; }
          .no-print { display: none !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-20 max-w-[95%] mx-auto px-4 font-cairo pt-8" dir="rtl">
        
        <div className="no-print">
          <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> العودة للوحة الإدارة
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-900 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-900/20 border border-slate-700 no-print">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-4 shadow-inner">
                <ShieldAlert className="w-4 h-4 text-emerald-400" /> مصفوفة الدوام المباشرة
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">السجل اليومي لحضور المعلمين</h1>
              <p className="text-indigo-200 font-bold text-base max-w-2xl leading-relaxed">
                تقرأ هذه اللوحة بيانات الجدول مباشرة. أي معلم مسند إليه حصة سيظهر فوراً.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-8 py-4 rounded-xl font-black hover:bg-emerald-600 transition-colors shadow-lg active:scale-95 w-full">
                <Printer className="w-5 h-5" /> تصدير PDF / طباعة
              </button>
              <button onClick={fetchMatrixData} className="flex items-center justify-center gap-2 bg-indigo-500/50 hover:bg-indigo-500/80 text-white px-6 py-3 rounded-xl font-bold transition-colors border border-indigo-400/50 active:scale-95 w-full">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
              </button>
            </div>
          </div>
        </div>

        {/* أزرار اختيار الأيام */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 justify-center no-print">
          {daysOfWeek.map(day => (
            <button 
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex-1 sm:flex-none ${
                selectedDay === day.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>

        <div className="print-area bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-8 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-indigo-600" />
                سجل دوام المعلمين - {daysOfWeek.find(d => d.id === selectedDay)?.name}
              </h2>
              <p className="text-slate-500 font-bold mt-2">
                تاريخ التقرير: <span dir="ltr">{format(new Date(), 'yyyy/MM/dd')}</span>
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 text-center shadow-sm">
                <p className="text-emerald-600 font-black text-xl">{stats.totalPresents}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">حصص مغطاة</p>
              </div>
              <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 text-center shadow-sm">
                <p className="text-rose-600 font-black text-xl">{stats.totalAbsences}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">حصص غياب</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto p-6">
            {loading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" /></div>
            ) : debugInfo.schedulesCount === 0 ? (
              /* 🚨 الشاشة الحمراء الانقاذية (كاشف الحظر) 🚨 */
              <div className="py-16 px-8 bg-rose-50 border-2 border-rose-200 rounded-3xl mx-auto max-w-3xl text-center shadow-inner">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-100 text-rose-500">
                  <Database className="w-12 h-12" />
                </div>
                <h3 className="font-black text-2xl text-rose-700 mb-4">قاعدة البيانات تمنع قراءة الجدول! (RLS Block)</h3>
                <p className="font-bold text-slate-600 text-sm leading-relaxed mb-8">
                  المتصفح يحاول قراءة جدول الحصص، لكن Supabase ترسل له 0 حصص بسبب قفل الأمان (Row Level Security). 
                  لحل المشكلة نهائياً وعرض الجدول، اذهب إلى <strong>SQL Editor</strong> في Supabase وشغل الكود التالي:
                </p>
                <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden text-left" dir="ltr">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
                  <pre className="text-emerald-400 font-mono text-sm leading-loose whitespace-pre-wrap">
                    {`DROP POLICY IF EXISTS "Allow read schedule" ON public.schedules;\nCREATE POLICY "Allow read schedule" ON public.schedules FOR SELECT USING (auth.role() = 'authenticated');`}
                  </pre>
                </div>
                <p className="text-rose-500 font-bold text-sm mt-6 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> بعد تشغيل الكود، اضغط تحديث البيانات.
                </p>
              </div>
            ) : matrixData.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 text-amber-500">
                   <Clock className="w-10 h-10" />
                </div>
                <h3 className="font-black text-xl text-slate-800">لا يوجد جدول مسجل في هذا اليوم</h3>
                <p className="font-bold text-slate-500 text-sm max-w-md leading-relaxed">
                  قاعدة البيانات مفتوحة، ولكن لا يوجد أي حصص مسندة لأي معلم في اليوم المحدد ({daysOfWeek.find(d => d.id === selectedDay)?.name}).
                  جرب الضغط على الأيام الأخرى في الأزرار العلوية.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 bg-slate-900 text-white font-black border border-slate-800 rounded-tr-2xl w-[250px] sticky right-0 z-10">
                      اسم المعلم
                    </th>
                    {periodsList.map(period => (
                      <th key={period.period_number} className="p-4 bg-slate-100 text-slate-700 font-black border border-slate-200 text-center min-w-[140px]">
                        الحصة {period.period_number}
                        <div className="text-[10px] font-bold text-slate-400 mt-1" dir="ltr">
                          {period.start_time?.substring(0,5) || '--:--'} - {period.end_time?.substring(0,5) || '--:--'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((row, idx) => (
                    <tr key={row.teacher_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border border-slate-200 font-black text-slate-800 bg-white sticky right-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        {idx + 1}. {row.teacher_name}
                      </td>
                      
                      {periodsList.map(period => {
                        const cellData = row.periodsData[period.period_number];
                        
                        return (
                          <td key={period.period_number} className="p-3 border border-slate-200 text-center align-middle">
                            {cellData?.status === 'free' ? (
                              <div className="w-full h-full min-h-[60px] flex items-center justify-center text-slate-300 bg-slate-50/50 rounded-lg">
                                <Minus className="w-5 h-5 opacity-50" />
                              </div>
                            ) : cellData?.status === 'present' ? (
                              <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 print-color-adjust-exact">
                                <CheckCircle2 className="w-6 h-6 mb-1" />
                                <span className="font-bold text-[10px] truncate max-w-[120px]">{cellData.subject}</span>
                              </div>
                            ) : cellData?.status === 'absent' ? (
                              <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center bg-rose-50 text-rose-700 rounded-lg border border-rose-200 print-color-adjust-exact">
                                <XCircle className="w-6 h-6 mb-1" />
                                <span className="font-black text-[10px] uppercase">غيـاب</span>
                              </div>
                            ) : (
                              <div className="w-full h-full min-h-[60px] flex flex-col items-center justify-center bg-amber-50 text-amber-600 rounded-lg border border-amber-100 print-color-adjust-exact">
                                <Hourglass className="w-5 h-5 mb-1 opacity-70" />
                                <span className="font-bold text-[10px] truncate max-w-[120px]">{cellData.subject}</span>
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

          <div className="p-6 border-t border-slate-200 bg-white text-center hidden print:block mt-10">
            <div className="flex justify-between items-end px-20">
              <div>
                <p className="font-bold text-slate-600 mb-8">توقيع الإشراف الإداري</p>
                <p className="border-t border-slate-400 w-48 mx-auto"></p>
              </div>
              <div>
                <p className="font-bold text-slate-600 mb-8">توقيع مدير المدرسة</p>
                <p className="border-t border-slate-400 w-48 mx-auto"></p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-10 font-bold">تم إصدار هذا التقرير آلياً من المنصة الرقمية</p>
          </div>

        </div>
      </motion.div>
    </>
  );
}
