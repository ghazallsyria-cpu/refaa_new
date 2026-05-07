// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Loader2, Calendar, Search, PrinterIcon, ShieldCheck, CheckCircle2, AlertCircle
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

      // جلب الطلاب الغائبين فقط في هذا الاختبار
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
        .eq('status', 'absent')
        .eq('student_seat_allocations.timetable_id', selectedTimetableId); // ربط رقم الجلوس

      // معالجة البيانات بسبب العلاقات المتشابكة
      const formatted = (data || []).map((record: any) => ({
         id: record.student_id,
         name: record.users?.full_name || 'غير معروف',
         nationalId: record.users?.national_id || '---',
         committee: record.exam_committees?.name || 'غير محدد',
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
    if (absentStudents.length === 0) return alert('لا يوجد غياب لطباعته.');
    setIsPrinting(true);
    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0);
        const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
        pdf.save(`تقرير_غياب_${examData?.subjects?.name}.pdf`);
      } catch (err) { alert('خطأ في الطباعة'); } 
      finally { setIsPrinting(false); }
    }, 1500);
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      {isPrinting && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black">جاري توليد التقرير الرسمي...</h2>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><FileText className="text-indigo-600"/> تقارير الحرمان والغياب الامتحاني</h1>
               <p className="text-slate-500 font-bold mt-1 text-sm">استخراج الكشوف الرسمية للطلاب الغائبين لاعتمادها من الكنترول.</p>
             </div>
             <button onClick={printReport} disabled={absentStudents.length === 0} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 shadow-md">
                <PrinterIcon className="w-5 h-5"/> طباعة التقرير (PDF)
             </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-4 items-center">
             <div className="flex-1">
                <label className="text-xs font-black text-slate-500 mb-1 block">اختر المادة / الاختبار</label>
                <select value={selectedTimetableId} onChange={e => setSelectedTimetableId(e.target.value)} className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500">
                   <option value="">-- يرجى اختيار الاختبار --</option>
                   {timetables.map(t => <option key={t.id} value={t.id}>{t.subjects?.name} (صف {t.class_level}) - {t.exam_date}</option>)}
                </select>
             </div>
          </div>
        </div>

        {isLoading ? (
           <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : selectedTimetableId && absentStudents.length === 0 ? (
           <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4"/>
              <h3 className="text-xl font-black text-emerald-800">لا يوجد غياب!</h3>
              <p className="text-emerald-600 font-bold">جميع الطلاب حضروا هذا الاختبار.</p>
           </div>
        ) : selectedTimetableId && absentStudents.length > 0 ? (
           <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-right">
                 <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                       <th className="p-4 font-black text-slate-600">رقم الجلوس</th>
                       <th className="p-4 font-black text-slate-600">اسم الطالب</th>
                       <th className="p-4 font-black text-slate-600">الرقم المدني</th>
                       <th className="p-4 font-black text-slate-600">اللجنة الامتحانية</th>
                    </tr>
                 </thead>
                 <tbody>
                    {absentStudents.map(student => (
                       <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="p-4 font-black text-rose-600">{student.seat}</td>
                          <td className="p-4 font-black text-slate-800">{student.name}</td>
                          <td className="p-4 font-bold text-slate-500">{student.nationalId}</td>
                          <td className="p-4 font-bold text-indigo-600">{student.committee}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        ) : (
           <div className="text-center p-20 opacity-50"><AlertCircle className="w-16 h-16 mx-auto mb-4"/><p className="font-black">يرجى اختيار اختبار لعرض نتائجه</p></div>
        )}
      </div>

      {/* 🖨️ قالب الطباعة الرسمي (مخفي) */}
      {selectedTimetableId && absentStudents.length > 0 && (
         <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
            <div ref={printRef} className="bg-white p-10" style={{ width: '794px', minHeight: '1122px' }} dir="rtl">
               <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
                  <div className="text-right space-y-1">
                     <h2 className="text-xl font-black text-slate-900">وزارة التربية</h2>
                     <h3 className="text-lg font-bold text-slate-800">مدرسة الرفعة النموذجية</h3>
                     <h3 className="text-md font-bold text-slate-700">الكنترول المركزي - {currentYear}</h3>
                  </div>
                  <div className="text-center">
                     <h1 className="text-3xl font-black border-2 border-slate-900 px-6 py-2 rounded-xl inline-block mb-2">كشف حرمان وغياب</h1>
                     <p className="font-bold text-lg">مادة: {examData?.subjects?.name} (الصف {examData?.class_level})</p>
                  </div>
                  <div className="w-24 h-24 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-slate-400">شعار</div>
               </div>

               <p className="font-bold text-lg mb-4">تاريخ الاختبار: {examData?.exam_date}</p>

               <table className="w-full border-collapse border-2 border-slate-900 text-right mb-10">
                  <thead>
                     <tr className="bg-slate-200">
                        <th className="border-2 border-slate-900 p-3 font-black w-24 text-center">الجلوس</th>
                        <th className="border-2 border-slate-900 p-3 font-black">اسم الطالب الرباعي</th>
                        <th className="border-2 border-slate-900 p-3 font-black w-40 text-center">الرقم المدني</th>
                        <th className="border-2 border-slate-900 p-3 font-black w-40 text-center">اللجنة</th>
                        <th className="border-2 border-slate-900 p-3 font-black w-32 text-center">ملاحظات</th>
                     </tr>
                  </thead>
                  <tbody>
                     {absentStudents.map(student => (
                        <tr key={student.id}>
                           <td className="border-2 border-slate-900 p-3 font-bold text-center text-lg">{student.seat}</td>
                           <td className="border-2 border-slate-900 p-3 font-black">{student.name}</td>
                           <td className="border-2 border-slate-900 p-3 font-bold text-center">{student.nationalId}</td>
                           <td className="border-2 border-slate-900 p-3 font-bold text-center">{student.committee}</td>
                           <td className="border-2 border-slate-900 p-3"></td>
                        </tr>
                     ))}
                  </tbody>
               </table>

               <div className="flex justify-between items-center mt-20 px-10">
                  <div className="text-center"><p className="font-bold mb-8">رئيس الكنترول</p><p className="w-40 border-b border-slate-400 mx-auto"></p></div>
                  <div className="text-center"><p className="font-bold mb-8">ختم الكنترول</p><p className="w-40 border-b border-slate-400 mx-auto"></p></div>
                  <div className="text-center"><p className="font-bold mb-8">مدير المدرسة / رئيس عام اللجان</p><p className="w-40 border-b border-slate-400 mx-auto"></p></div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
