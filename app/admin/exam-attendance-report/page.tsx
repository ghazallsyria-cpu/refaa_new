// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Loader2, Calendar, Search, PrinterIcon, ShieldCheck, CheckCircle2, AlertCircle, Siren, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

export default function ExamAttendanceReport() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(false);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [examData, setExamData] = useState<any>(null);

  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    const fetchTimetables = async () => {
      const { data } = await supabase
        .from('exam_timetables')
        .select('id, exam_date, class_level, subjects(name)')
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('exam_date', { ascending: false });
      setTimetables(data || []);
    };
    if (['admin', 'management'].includes(currentRole)) fetchTimetables();
  }, [currentRole]);

  const fetchReport = async () => {
    if (!selectedTimetableId) return;
    setIsLoading(true);
    try {
      const selected = timetables.find(t => t.id === selectedTimetableId);
      setExamData(selected);

      // 🚀 جلب الطلاب الغائبين والمحرومين (بسبب الغش) في هذا الاختبار
      const { data } = await supabase
        .from('exam_attendance')
        .select(`
          status,
          student_id,
          committee_id,
          exam_committees(name),
          users!exam_attendance_student_id_fkey(full_name, national_id),
          student_seat_allocations!inner(seat_number)
        `)
        .eq('timetable_id', selectedTimetableId)
        .in('status', ['absent', 'cheating']) // 🚀 جلب الحالتين
        .eq('student_seat_allocations.timetable_id', selectedTimetableId); 

      // معالجة البيانات بسبب العلاقات المتشابكة
      const formatted = (data || []).map((record: any) => ({
         id: record.student_id,
         name: record.users?.full_name || 'غير معروف',
         nationalId: record.users?.national_id || '---',
         committee: record.exam_committees?.name || 'غير محدد',
         status: record.status, // إضافة الحالة للتمييز بين الغياب والغش
         // نجلب رقم الجلوس من مصفوفة التوزيع لو وجدت
         seat: Array.isArray(record.student_seat_allocations) ? record.student_seat_allocations[0]?.seat_number : record.student_seat_allocations?.seat_number || '---'
      })).sort((a, b) => a.seat - b.seat);

      setAbsentStudents(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [selectedTimetableId]);

  const printReport = async () => {
    if (absentStudents.length === 0) return alert('لا توجد سجلات حرمان أو غياب لطباعتها.');
    setIsPrinting(true);
    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0);
        const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
        pdf.save(`تقرير_غياب_وحرمان_${examData?.subjects?.name}.pdf`);
      } catch (err) { alert('خطأ في الطباعة'); } 
      finally { setIsPrinting(false); }
    }, 1500);
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo pb-20" dir="rtl">
      
      {isPrinting && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black">جاري توليد التقرير الرسمي...</h2>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* الهيدر الأنيق */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] pointer-events-none rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
             <div>
               <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3"><FileText className="w-8 h-8 text-rose-500"/> تقارير الحرمان والغياب</h1>
               <p className="text-slate-500 font-bold mt-1 text-sm">استخراج الكشوف الرسمية للطلاب الغائبين وحالات الغش لاعتمادها من الكنترول.</p>
             </div>
             <button onClick={printReport} disabled={absentStudents.length === 0} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.1)] transition-all active:scale-95">
                <PrinterIcon className="w-5 h-5"/> طباعة التقرير الرسمي (PDF)
             </button>
          </div>

          <div className="relative z-10 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
             <div className="w-full">
                <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4"/> اختر المادة / الاختبار</label>
                <select value={selectedTimetableId} onChange={e => setSelectedTimetableId(e.target.value)} className="w-full bg-white border border-slate-200 p-4 rounded-xl font-black text-slate-800 outline-none focus:border-rose-500 shadow-sm cursor-pointer transition-colors hover:border-rose-300">
                   <option value="">-- اضغط لاختيار الاختبار من الجدول --</option>
                   {timetables.map(t => <option key={t.id} value={t.id}>{t.subjects?.name} (صف {t.class_level}) - {t.exam_date}</option>)}
                </select>
             </div>
          </div>
        </div>

        {/* عرض النتائج */}
        {isLoading ? (
           <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-rose-500" /></div>
        ) : selectedTimetableId && absentStudents.length === 0 ? (
           <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-12 text-center shadow-inner">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm"><CheckCircle2 className="w-12 h-12 text-emerald-500"/></div>
              <h3 className="text-2xl font-black text-emerald-800 mb-2">لا يوجد غياب أو حرمان! 🎉</h3>
              <p className="text-emerald-600 font-bold text-sm">جميع الطلاب حضروا هذا الاختبار ولا توجد حالات غش مسجلة.</p>
           </div>
        ) : selectedTimetableId && absentStudents.length > 0 ? (
           <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                       <tr>
                          <th className="p-4 font-black text-slate-600">رقم الجلوس</th>
                          <th className="p-4 font-black text-slate-600">اسم الطالب</th>
                          <th className="p-4 font-black text-slate-600">الرقم المدني</th>
                          <th className="p-4 font-black text-slate-600">اللجنة الامتحانية</th>
                          <th className="p-4 font-black text-center text-slate-600">الحالة</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {absentStudents.map(student => {
                         const isCheating = student.status === 'cheating';
                         return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                               <td className="p-4 font-black text-indigo-600 text-lg tracking-widest">{student.seat}</td>
                               <td className="p-4 font-black text-slate-800">{student.name}</td>
                               <td className="p-4 font-bold text-slate-500">{student.nationalId}</td>
                               <td className="p-4 font-bold text-slate-600">{student.committee}</td>
                               <td className="p-4 text-center">
                                  {isCheating ? (
                                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-black text-xs border border-rose-200 shadow-inner"><Siren className="w-3.5 h-3.5"/> حرمان (محضر غش)</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-black text-xs border border-amber-200 shadow-inner"><XCircle className="w-3.5 h-3.5"/> غائب</span>
                                  )}
                               </td>
                            </tr>
                         )
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : (
           <div className="text-center p-20 opacity-50 bg-white rounded-[2rem] border border-dashed border-slate-300">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-10 h-10 text-slate-400"/></div>
             <p className="font-black text-lg text-slate-500">يرجى اختيار اختبار من القائمة العلوية لعرض الكشوفات.</p>
           </div>
        )}
      </div>

      {/* 🖨️ قالب الطباعة الرسمي (مخفي) */}
      {selectedTimetableId && absentStudents.length > 0 && (
         <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
            <div ref={printRef} className="bg-white p-10" style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box' }} dir="rtl">
               
               {/* ترويسة وزارة التربية */}
               <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
                  <div className="text-right space-y-1">
                     <h2 className="text-xl font-black text-slate-900">وزارة التربية - إدارة التعليم الخاص</h2>
                     <h3 className="text-lg font-bold text-slate-800">مدرسة الرفعة النموذجية بنين (م-ث)</h3>
                     <h3 className="text-md font-bold text-slate-700">الكنترول المركزي الموحد - {currentYear}</h3>
                  </div>
                  <div className="text-center">
                     <h1 className="text-2xl font-black border-[3px] border-slate-900 px-8 py-3 rounded-2xl inline-block mb-2 bg-slate-100 uppercase tracking-widest shadow-sm">كشف حرمان وغياب</h1>
                     <p className="font-bold text-lg text-slate-800">مادة: {examData?.subjects?.name} (الصف {examData?.class_level})</p>
                  </div>
                  <div className="w-24 h-24 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-400 shrink-0">شعار الوزارة</div>
               </div>

               <div className="flex justify-between items-center mb-6">
                  <p className="font-bold text-lg text-slate-800 border-r-4 border-slate-900 pr-3">تاريخ الاختبار: {examData?.exam_date}</p>
                  <p className="font-bold text-sm text-slate-500">تاريخ الطباعة: {format(new Date(), 'yyyy-MM-dd')}</p>
               </div>

               {/* الجدول المطبوع */}
               <table className="w-full border-collapse border-[3px] border-slate-900 text-right mb-10 text-slate-900">
                  <thead>
                     <tr className="bg-slate-200">
                        <th className="border-[3px] border-slate-900 p-3 font-black w-24 text-center">رقم الجلوس</th>
                        <th className="border-[3px] border-slate-900 p-3 font-black">اسم الطالب الرباعي</th>
                        <th className="border-[3px] border-slate-900 p-3 font-black w-32 text-center">الرقم المدني</th>
                        <th className="border-[3px] border-slate-900 p-3 font-black w-32 text-center">اللجنة</th>
                        <th className="border-[3px] border-slate-900 p-3 font-black w-32 text-center">حالة الحضور</th>
                     </tr>
                  </thead>
                  <tbody>
                     {absentStudents.map(student => (
                        <tr key={student.id}>
                           <td className="border-[3px] border-slate-900 p-3 font-black text-center text-xl tracking-widest">{student.seat}</td>
                           <td className="border-[3px] border-slate-900 p-3 font-black text-base">{student.name}</td>
                           <td className="border-[3px] border-slate-900 p-3 font-bold text-center text-sm">{student.nationalId}</td>
                           <td className="border-[3px] border-slate-900 p-3 font-bold text-center text-sm">{student.committee}</td>
                           <td className="border-[3px] border-slate-900 p-3 font-black text-center">
                             {student.status === 'cheating' ? 'حرمان (حالة غش)' : 'غائب'}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>

               {/* التواقيع الرسمية */}
               <div className="flex justify-between items-end mt-24 px-10">
                  <div className="text-center">
                    <p className="font-black text-lg mb-10">رئيس الكنترول</p>
                    <p className="w-48 border-b-2 border-slate-900 border-dashed mx-auto"></p>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-lg mb-10">الختم الرسمي</p>
                    <div className="w-32 h-32 border-[3px] border-slate-400 rounded-full mx-auto border-dashed flex items-center justify-center text-slate-300 text-xs font-bold transform -rotate-12">مكان الختم</div>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-lg mb-10">مدير المدرسة / رئيس عام اللجان</p>
                    <p className="w-48 border-b-2 border-slate-900 border-dashed mx-auto"></p>
                  </div>
               </div>

            </div>
         </div>
      )}
    </div>
  );
}
