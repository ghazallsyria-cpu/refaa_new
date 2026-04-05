'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  Users, Printer, Calendar, Clock, AlertCircle, ShieldAlert, ArrowLeft, RefreshCw, CheckCircle2,
  XCircle, Hourglass, Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import Link from 'next/link';

export default function TeacherAttendanceMatrix() {
  const { userRole } = useAuth();
  
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [periodsList, setPeriodsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1); // الافتراضي: الأحد = 1 (حسب بياناتك)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // إحصائيات سريعة
  const [stats, setStats] = useState({ totalAbsences: 0, totalPresents: 0 });

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      // 1. جلب جميع البيانات الخام دفعة واحدة
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const [
        { data: teachers },
        { data: users },
        { data: periods },
        { data: schedule },
        { data: subjects },
        { data: attendance }
      ] = await Promise.all([
        supabase.from('teachers').select('id'),
        supabase.from('users').select('id, full_name'),
        supabase.from('periods').select('*').order('period_number'),
        supabase.from('schedule').select('*').eq('day_of_week', selectedDay),
        supabase.from('subjects').select('id, name'),
        supabase.from('teacher_attendance_records').select('*').eq('date', todayStr)
      ]);

      // تحديد عدد الحصص (مثلاً من 1 إلى 5 أو 7 حسب المبرمج في القاعدة)
      const sortedPeriods = (periods || []).sort((a, b) => a.period_number - b.period_number);
      setPeriodsList(sortedPeriods);

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // هل اليوم المختار هو اليوم الفعلي الحالي؟
      // (الجافاسكريبت تعتبر الأحد 0، وفي بياناتك الأحد 1)
      const isToday = (now.getDay() + 1) === selectedDay || (now.getDay() === 0 && selectedDay === 1);

      let absencesCount = 0;
      let presentsCount = 0;

      // 2. بناء المصفوفة (لكل معلم، نمر على جميع الحصص)
      const matrix = (teachers || []).map(teacher => {
        const user = (users || []).find(u => u.id === teacher.id);
        const row: any = {
          teacher_id: teacher.id,
          teacher_name: user?.full_name || 'معلم غير محدد',
          periodsData: {}
        };

        sortedPeriods.forEach(period => {
          // هل لديه حصة في هذا الوقت؟
          const sch = (schedule || []).find(s => s.teacher_id === teacher.id && s.period === period.period_number);
          
          if (!sch) {
            // ليس لديه حصة (فراغ)
            row.periodsData[period.period_number] = { status: 'free' };
            return;
          }

          const subject = (subjects || []).find(s => s.id === sch.subject_id);
          
          // هل سجل حضوره؟
          const hasAttended = (attendance || []).some(a => a.teacher_id === teacher.id && a.period_number === period.period_number);

          if (hasAttended) {
            row.periodsData[period.period_number] = { status: 'present', subject: subject?.name };
            presentsCount++;
          } else {
            // لم يسجل، نتحقق من الوقت
            if (period.end_time) {
              const [endH, endM] = period.end_time.split(':').map(Number);
              const periodEndMinutes = endH * 60 + endM;

              if (isToday && currentMinutes > periodEndMinutes) {
                row.periodsData[period.period_number] = { status: 'absent', subject: subject?.name };
                absencesCount++;
              } else if (!isToday && now > new Date(todayStr)) {
                // إذا كنا نستعرض يوماً في الماضي ولم يحضر
                row.periodsData[period.period_number] = { status: 'absent', subject: subject?.name };
                absencesCount++;
              } else {
                row.periodsData[period.period_number] = { status: 'pending', subject: subject?.name };
              }
            } else {
               row.periodsData[period.period_number] = { status: 'pending', subject: subject?.name };
            }
          }
        });

        return row;
      });

      // ترتيب المعلمين أبجدياً
      matrix.sort((a, b) => a.teacher_name.localeCompare(b.teacher_name, 'ar'));
      
      setMatrixData(matrix);
      setStats({ totalAbsences: absencesCount, totalPresents: presentsCount });
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching matrix data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // تحديد اليوم الحالي افتراضياً (تحويل من نظام JS لنظام مدرستك)
    const jsDay = new Date().getDay();
    setSelectedDay(jsDay === 0 ? 1 : jsDay + 1);
  }, []);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'management') {
      fetchMatrixData();
      const interval = setInterval(fetchMatrixData, 60000);
      return () => clearInterval(interval);
    }
  }, [userRole, selectedDay]);

  // دالة الطباعة وتصدير PDF
  const handlePrint = () => {
    window.print();
  };

  if (userRole !== 'admin' && userRole !== 'management') return null;

  const daysOfWeek = [
    { id: 1, name: 'الأحد' }, { id: 2, name: 'الإثنين' }, { id: 3, name: 'الثلاثاء' },
    { id: 4, name: 'الأربعاء' }, { id: 5, name: 'الخميس' }
  ];

  return (
    <>
      {/* 🚀 ستايل مخصص للطباعة (يخفي كل شيء ما عدا الجدول) */}
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

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-900 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-900/20 border border-slate-700 no-print">
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-4 shadow-inner">
                <ShieldAlert className="w-4 h-4 text-emerald-400" /> مصفوفة الدوام الشاملة
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">السجل اليومي لحضور المعلمين</h1>
              <p className="text-indigo-200 font-bold text-base max-w-2xl leading-relaxed">
                راقب جميع المعلمين وحصصهم في شاشة واحدة. قم بطباعة التقرير في نهاية اليوم للتوثيق الإداري.
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

        {/* أزرار الأيام */}
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

        {/* ========================================= */}
        {/* 🖨️ منطقة الطباعة والجدول (Print Area) */}
        {/* ========================================= */}
        <div className="print-area bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          
          {/* ترويسة التقرير (تظهر في الطباعة بشكل أنيق) */}
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
            
            {/* ملخص إحصائي سريع */}
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

          {/* 🚀 الجدول الماتريكس */}
          <div className="overflow-x-auto p-6">
            {loading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" /></div>
            ) : matrixData.length === 0 ? (
              <div className="py-20 text-center font-bold text-slate-500">لا يوجد معلمين مسجلين.</div>
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
                          {period.start_time?.substring(0,5)} - {period.end_time?.substring(0,5)}
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
                      
                      {/* تفريغ بيانات الحصص */}
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

          {/* تذييل الطباعة */}
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
