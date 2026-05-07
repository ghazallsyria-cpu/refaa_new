// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, Loader2, PrinterIcon, Search, Users, ShieldCheck, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

export default function IdCardsStudio() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // جلب جميع الصفوف والشعب للفلترة
      const { data: classesData } = await supabase.from('classes').select('*').order('level');
      const { data: sectionsData } = await supabase.from('sections').select('*');
      
      setClasses(classesData || []);
      setSections(sectionsData || []);

      // جلب الطلاب النشطين فقط
      const { data: studentsData } = await supabase
        .from('students')
        .select(`
          id, national_id, enrollment_status, section_id,
          users(full_name, avatar_url),
          sections(name, class_id, classes(name))
        `)
        .eq('enrollment_status', 'active'); // الطلاب المستمرين فقط

      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  // فلترة الطلاب بناءً على التحديد
  const filteredStudents = students.filter(s => {
    const matchClass = selectedClass ? s.sections?.class_id === selectedClass : true;
    const matchSection = selectedSection ? s.section_id === selectedSection : true;
    const matchSearch = searchTerm ? s.users?.full_name?.includes(searchTerm) || s.national_id?.includes(searchTerm) : true;
    return matchClass && matchSection && matchSearch;
  });

  const availableSections = sections.filter(sec => selectedClass ? sec.class_id === selectedClass : true);

  // تقسيم المصفوفة لتناسب صفحات الطباعة (مثلاً 8 بطاقات في صفحة A4)
  const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

  const printBadges = async () => {
    if (filteredStudents.length === 0) { alert('لا يوجد طلاب لطباعة هوياتهم!'); return; }
    setIsPrinting(true);
    
    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0);
        const pages = printRef.current.querySelectorAll('.print-page-wrapper');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { 
            scale: 2, useCORS: true, allowTaint: false, logging: false, width: 794, height: 1122, backgroundColor: '#ffffff' 
          });
          const imgData = canvas.toDataURL('image/jpeg', 1.0); 
          if (i > 0) pdf.addPage(); 
          pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        }
        pdf.save(`هويات_الطلاب_${selectedClass ? 'مفلترة' : 'الكل'}.pdf`);
      } catch (err: any) { alert('حدث خطأ أثناء التصدير.'); } finally { setIsPrinting(false); }
    }, 2000); 
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-cairo pb-20" dir="rtl">
      
      { (isLoading || isPrinting) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-6" />
          <h2 className="text-2xl font-black mb-2 animate-pulse text-center px-4">
            {isPrinting ? 'جاري تجهيز وتوليد الهويات الرقمية...' : 'تحميل استوديو الهويات...'}
          </h2>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* الهيدر وفلاتر البحث */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <CreditCard className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">استوديو الهويات الرقمية</h1>
                <p className="text-slate-500 font-bold text-sm">توليد وطباعة بطاقات الهوية الموحدة (PVC) للطلاب.</p>
              </div>
            </div>
            
            <button onClick={printBadges} disabled={filteredStudents.length === 0} className="w-full lg:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
              <PrinterIcon className="w-5 h-5" /> طباعة ({filteredStudents.length}) هوية
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">الصف الدراسي</label>
                <select value={selectedClass} onChange={(e) => {setSelectedClass(e.target.value); setSelectedSection('');}} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500">
                   <option value="">جميع الصفوف</option>
                   {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">الشعبة</label>
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClass} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:opacity-50">
                   <option value="">جميع الشعب</option>
                   {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="relative">
                <label className="text-xs font-black text-slate-500 mb-1 block">بحث بالاسم أو الرقم المدني</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="اكتب للبحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500" />
                </div>
             </div>
          </div>
        </div>

        {/* عرض المعاينة (Preview) للبطاقات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {filteredStudents.slice(0, 8).map(student => (
             <div key={student.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-slate-100 mb-3 overflow-hidden border-2 border-indigo-100">
                   {student.users?.avatar_url ? <img src={student.users.avatar_url} className="w-full h-full object-cover"/> : <Users className="w-8 h-8 text-slate-400 m-auto mt-4"/>}
                </div>
                <h3 className="font-black text-slate-800 text-sm line-clamp-1 w-full">{student.users?.full_name}</h3>
                <p className="text-xs font-bold text-indigo-600 mt-1">{student.sections?.classes?.name} - {student.sections?.name}</p>
                <div className="mt-4 p-2 bg-slate-50 rounded-lg w-full">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=raf-id:${student.id}&margin=0`} alt="QR" className="w-16 h-16 mx-auto opacity-50"/>
                  <p className="text-[9px] text-slate-400 mt-1 font-bold">معاينة الهوية</p>
                </div>
             </div>
           ))}
        </div>
        {filteredStudents.length > 8 && (
          <p className="text-center font-bold text-slate-500 mt-4">... وسيتم طباعة {filteredStudents.length - 8} بطاقة أخرى في التصدير.</p>
        )}
        {filteredStudents.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
             <Filter className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
             <h2 className="text-xl font-black text-slate-500">لا يوجد طلاب يطابقون بحثك</h2>
          </div>
        )}
      </div>

      {/* 🖨️ قوالب الطباعة (مخفية وتستخدم فقط عند التصدير) - تصميم PVC قياسي */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 1, pointerEvents: 'none' }}>
         <div ref={printRef} className="flex flex-col gap-10" dir="rtl">
            {chunkArray(filteredStudents, 8).map((chunk, pageIndex) => (
               <div key={pageIndex} className="print-page-wrapper bg-white mx-auto relative" style={{ width: '794px', height: '1122px', padding: '30px', boxSizing: 'border-box' }}>
                  <div className="flex flex-wrap gap-6 justify-center content-start">
                     {chunk.map((student:any) => {
                        const safeAvatar = student.users?.avatar_url ? `${student.users.avatar_url}?t=${new Date().getTime()}` : null;
                        // 🚀 النواة الحقيقية: الشفرة الثابتة raf-id
                        const qrPayload = `raf-id:${student.id}`;
                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}&margin=0`;

                        return (
                           <div key={student.id} className="w-[54mm] h-[86mm] border-[2px] border-slate-200 rounded-[10px] relative overflow-hidden flex flex-col items-center text-center bg-white shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                              
                              {/* هيدر البطاقة */}
                              <div className="w-full h-[25mm] bg-indigo-900 shrink-0 flex flex-col items-center justify-start pt-3 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                 <p className="text-white font-black text-[12px] relative z-10">مدرسة الرفعة النموذجية</p>
                                 <p className="text-indigo-200 font-bold text-[8px] mt-0.5 relative z-10">هوية طالب رقمية</p>
                              </div>
                              
                              {/* الصورة الشخصية */}
                              <div className="relative z-10 w-[22mm] h-[22mm] -mt-[11mm] mb-2 rounded-full bg-white border-[3px] border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                                 {safeAvatar ? <img src={safeAvatar} crossOrigin="anonymous" alt="Student" className="w-full h-full object-cover" /> : <Users className="w-8 h-8 text-slate-300" />}
                              </div>

                              {/* بيانات الطالب */}
                              <div className="relative z-10 w-full px-2 flex-1 flex flex-col items-center">
                                 <h2 className="text-[12px] font-black text-slate-900 mb-0.5 leading-tight line-clamp-2 w-full">{student.users?.full_name}</h2>
                                 <p className="text-[9px] font-black text-indigo-600 mb-1">{student.sections?.classes?.name} - {student.sections?.name}</p>
                                 <p className="text-[8px] font-bold text-slate-500 mb-2">ر.م: <span className="font-black">{student.national_id || 'غير مسجل'}</span></p>
                                 
                                 {/* الـ QR Code السحري */}
                                 <div className="mt-auto mb-2 flex flex-col items-center w-full">
                                    <div className="w-[20mm] h-[20mm] bg-white p-1 rounded-lg border border-slate-200 mb-1">
                                       <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="w-full flex items-center justify-center gap-1 mt-1 text-[7px] font-black text-slate-400 uppercase">
                                       <ShieldCheck className="w-2 h-2"/> Smart Campus Access
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="w-full h-1.5 bg-indigo-600 shrink-0"></div>
                           </div>
                        )
                     })}
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
}
