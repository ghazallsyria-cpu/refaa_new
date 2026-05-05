// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, FileText, Printer, ShieldCheck, 
  Settings, Loader2, Search, Trash2, PrinterIcon, IdCard, DoorOpen, LayoutGrid, CheckCircle2, Download, X, Edit3, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function ExamCommitteesControl() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const { isLoading: isEngineLoading, progressMsg, generateDefaultCommittees, generateSeatingAndDistribute } = useExamSeating();
  
  const [committees, setCommittees] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [allocationsStats, setAllocationsStats] = useState<any>({});
  
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 حالات النوافذ المنبثقة المرنة (Modals)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  
  // 🚀 حالة تعديل/إضافة لجنة
  const [editCommitteeData, setEditCommitteeData] = useState({ id: '', name: '', capacity: 14, location: '' });

  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [printType, setPrintType] = useState<'door_sheet' | 'desk_cards' | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: comms } = await supabase.from('exam_committees').select('*').eq('academic_year', currentYear).eq('semester', currentSemester).order('name');
      const { data: tchrs } = await supabase.from('teachers').select('id, users(full_name)');
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, users(full_name)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('committee_id').eq('academic_year', currentYear).eq('semester', currentSemester);

      const stats: any = {};
      if (allocs) { allocs.forEach((a: any) => { stats[a.committee_id] = (stats[a.committee_id] || 0) + 1; }); }

      setCommittees(comms || []);
      setTeachers(tchrs?.map(t => ({ id: t.id, name: t.users?.full_name || 'بدون اسم' })).sort((a, b) => a.name.localeCompare(b.name)) || []);
      setInvigilators(invigs || []);
      setAllocationsStats(stats);
    } catch (error) { console.error('Error fetching data:', error); } finally { setIsLoading(false); }
  };

  // 🚀 كل الـ Hooks يجب أن تكون في الأعلى قبل أي عبارة Return شرطية 🚀
  useEffect(() => { 
    if (currentRole === 'admin' || currentRole === 'management') {
      fetchData(); 
    }
  }, [currentRole]);

  // 🚀 مرونة إدارة اللجان (إضافة وتعديل وحذف)
  const handleSaveCommittee = async () => {
    if (!editCommitteeData.name.trim()) { alert('يرجى إدخال اسم اللجنة'); return; }
    try {
      if (editCommitteeData.id) {
        await supabase.from('exam_committees').update({ 
          name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location 
        }).eq('id', editCommitteeData.id);
      } else {
        await supabase.from('exam_committees').insert({ 
          name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location, academic_year: currentYear, semester: currentSemester 
        });
      }
      setIsCommitteeModalOpen(false);
      fetchData();
    } catch (error) { alert('حدث خطأ أثناء حفظ اللجنة'); }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه اللجنة بالكامل؟ (سيتم حذف توزيعات الطلاب والمراقبين بداخلها)')) return;
    try { await supabase.from('exam_committees').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ في الحذف'); }
  };

  const openCommitteeModal = (committee: any = null) => {
    if (committee) setEditCommitteeData({ id: committee.id, name: committee.name, capacity: committee.capacity, location: committee.location || '' });
    else setEditCommitteeData({ id: '', name: `لجنة ${committees.length + 1}`, capacity: 14, location: '' });
    setIsCommitteeModalOpen(true);
  };

  const handleDistribute = async () => {
    if (!confirm('هل أنت متأكد من إعادة توليد أرقام الجلوس وتوزيع الطلاب على اللجان؟ (المراقبون واللجان ستبقى كما هي)')) return;
    const result = await generateSeatingAndDistribute(currentYear, currentSemester);
    if (result.success) {
      alert(`تم بنجاح! تم توزيع ${result.totalAllocated} طالب على ${result.totalCommittees} لجنة.`);
      fetchData();
    }
  };

  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee) return;
    const currentInvigs = invigilators.filter(i => i.committee_id === selectedCommittee.id);
    if (currentInvigs.length >= 2) { alert('لا يمكن إضافة أكثر من مراقبين اثنين لكل لجنة!'); return; }
    try {
      await supabase.from('committee_invigilators').insert({ committee_id: selectedCommittee.id, teacher_id: selectedTeacherId });
      setIsAssignModalOpen(false); setSelectedTeacherId(''); fetchData();
    } catch (error) { alert('حدث خطأ أثناء التعيين'); }
  };

  const handleRemoveInvigilator = async (id: string) => {
    if (!confirm('إزالة هذا المراقب من اللجنة؟')) return;
    try { await supabase.from('committee_invigilators').delete().eq('id', id); fetchData(); } catch (error) { alert('حدث خطأ أثناء الإزالة'); }
  };

  const fetchPrintData = async (committeeId: string) => {
    setIsPrinting(true);
    const { data } = await supabase.from('student_seat_allocations')
      .select(`seat_number, students ( id, users(full_name, avatar_url), sections(classes(level)) )`)
      .eq('committee_id', committeeId)
      .order('seat_number', { ascending: true });
    
    const committee = committees.find(c => c.id === committeeId);
    const committeeInvigs = invigilators.filter(i => i.committee_id === committeeId);
    return { students: data || [], committee, invigilators: committeeInvigs };
  };

  const exportToExcel = async (committeeId: string) => {
    const data = await fetchPrintData(committeeId);
    if (data.students.length === 0) { alert('اللجنة فارغة!'); setIsPrinting(false); return; }
    const excelData = data.students.map(s => ({
      'رقم الجلوس': s.seat_number,
      'اسم الطالب': s.students?.users?.full_name || 'غير معروف',
      'الصف': s.students?.sections?.classes?.level === 10 ? 'العاشر' : 'الحادي عشر',
      'التوقيع': '' 
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, data.committee.name);
    XLSX.writeFile(wb, `كشف_مناداة_${data.committee.name}.xlsx`);
    setIsPrinting(false);
  };

  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards') => {
    const data = await fetchPrintData(committeeId);
    if (data.students.length === 0) { alert('لا يوجد طلاب في هذه اللجنة لطباعتهم!'); setIsPrinting(false); return; }
    setPrintData(data); setPrintType(type);

    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${type === 'door_sheet' ? 'كشف_باب' : 'بطاقات_طاولة'}_${data.committee.name}.pdf`);
      } catch (err) { alert('حدث خطأ أثناء إنشاء ملف الـ PDF. تأكد من جودة الاتصال.'); } 
      finally { setPrintData(null); setPrintType(null); setIsPrinting(false); }
    }, 1500); 
  };

  // 🛡️ حماية الغرفة (الآن أصبحت آمنة وفي المكان الصحيح) 🛡️
  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">{'منطقة محظورة! 🛑'}</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{'عذراً، هذه الغرفة مخصصة لمدير النظام والإدارة العليا فقط.'}</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">{'العودة للخلف'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      <AnimatePresence>
        {(isEngineLoading || isPrinting) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
            <h2 className="text-2xl font-black mb-2 animate-pulse">{isPrinting ? 'جاري تجهيز وتصميم ملف الطباعة عالي الدقة...' : progressMsg}</h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8 relative">
        
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none"><ShieldCheck className="w-64 h-64" /></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-indigo-600" /> غرفة كنترول الامتحانات
            </h1>
            <p className="text-slate-500 font-bold text-sm">{'إدارة اللجان، توزيع الطلاب، وتعيين المراقبين بمرونة عالية'}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full md:w-auto">
            <button onClick={() => openCommitteeModal()} className="px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 border border-emerald-200">
              <Plus className="w-5 h-5" /> {'إضافة لجنة'}
            </button>
            <button onClick={handleDistribute} disabled={committees.length === 0} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <Users className="w-5 h-5" /> {'توزيع الطلاب الأبجدي'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : committees.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <h3 className="text-xl font-black text-slate-400 mb-4">{'لم يتم إعداد اللجان بعد'}</h3>
            <button onClick={async () => { await generateDefaultCommittees(currentYear, currentSemester); fetchData(); }} className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800">
              {'توليد 22 لجنة افتراضية الآن'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {committees.map((committee, idx) => {
              const studentsCount = allocationsStats[committee.id] || 0;
              const committeeInvigs = invigilators.filter(i => i.committee_id === committee.id);
              const isFull = studentsCount >= committee.capacity;

              return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={committee.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4 relative">
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{committee.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                        {'السعة:'} {committee.capacity} {committee.location && `| 📍 ${committee.location}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => openCommitteeModal(committee)} className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit3 className="w-4 h-4"/></button>
                       <button onClick={() => handleDeleteCommittee(committee.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-xs font-black text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400"/> {'المراقبون'} ({committeeInvigs.length}/2)</p>
                       <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                         <Users className="w-3 h-3"/> {studentsCount} {'طالب'}
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                      {committeeInvigs.map(invig => (
                        <div key={invig.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-700 truncate">{invig.users?.full_name}</span>
                          <button onClick={() => handleRemoveInvigilator(invig.id)} className="text-rose-400 hover:text-rose-600 p-1 bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                      {committeeInvigs.length < 2 && (
                        <button onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }} className="w-full p-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors">
                          <UserPlus className="w-4 h-4" /> {'إضافة مراقب'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 🖨️ أزرار مركز الطباعة والتصدير */}
                  <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => printDocument(committee.id, 'door_sheet')} className="col-span-2 bg-slate-900 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
                      <PrinterIcon className="w-4 h-4 text-emerald-400"/> {'طباعة كشف الباب (PDF)'}
                    </button>
                    <button onClick={() => printDocument(committee.id, 'desk_cards')} className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100">
                      <IdCard className="w-3 h-3"/> {'بطاقات الطاولة'}
                    </button>
                    <button onClick={() => exportToExcel(committee.id)} className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-100">
                      <Download className="w-3 h-3"/> {'تصدير Excel'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 نافذة إدارة/تعديل اللجنة */}
      <AnimatePresence>
        {isCommitteeModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsCommitteeModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-600"/> {editCommitteeData.id ? 'إعدادات اللجنة' : 'لجنة جديدة'}
                </h3>
                <button onClick={() => setIsCommitteeModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">{'اسم اللجنة'}</label>
                  <input type="text" value={editCommitteeData.name} onChange={e => setEditCommitteeData({...editCommitteeData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder="مثال: لجنة 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">{'السعة القصوى'}</label>
                     <input type="number" min="1" value={editCommitteeData.capacity} onChange={e => setEditCommitteeData({...editCommitteeData, capacity: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">{'المكان (اختياري)'}</label>
                     <input type="text" value={editCommitteeData.location} onChange={e => setEditCommitteeData({...editCommitteeData, location: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder="مثال: المسرح" />
                   </div>
                </div>
                <button onClick={handleSaveCommittee} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-colors shadow-md mt-4">{'حفظ التغييرات'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة اختيار المراقبين */}
      <AnimatePresence>
        {isAssignModalOpen && selectedCommittee && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsAssignModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-indigo-600"/> {'تعيين مراقب'}
                </h3>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500">
                  <option value="">{'-- اختر المعلم --'}</option>
                  {teachers.map(t => ( <option key={t.id} value={t.id}>{t.name}</option> ))}
                </select>
                <button onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-md">{'تأكيد التعيين'}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🖨️ قوالب الطباعة (Hidden Print Templates) */}
      {printData && (
        <div className="absolute left-[-9999px] top-0 bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
          <div ref={printRef} className="w-full h-full bg-white text-black p-10 font-cairo" dir="rtl">
            
            {/* 📝 كشف الباب */}
            {printType === 'door_sheet' && (
              <div>
                <div className="text-center mb-8 border-b-2 border-slate-900 pb-6 flex items-center justify-between">
                  <div className="text-right">
                    <h2 className="text-xl font-black">{'دولة الكويت'}</h2>
                    <h3 className="text-lg font-bold">{'وزارة التربية'}</h3>
                    <h3 className="text-lg font-bold">{'مدرسة الرفعة النموذجية'}</h3>
                  </div>
                  <div className="text-center">
                    <h1 className="text-3xl font-black bg-slate-900 text-white px-6 py-2 rounded-2xl inline-block mb-2">{'كشف مناداة'} ({printData.committee.name})</h1>
                    <p className="font-bold text-lg">{printData.committee.location && `المكان: ${printData.committee.location} | `} {'اختبارات'} {currentSemester} - {currentYear}</p>
                  </div>
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-900">
                     <span className="font-black text-2xl">{'الرفعة'}</span>
                  </div>
                </div>

                <div className="mb-6 flex justify-between bg-slate-50 p-4 rounded-xl border border-slate-300">
                  <p className="font-black text-lg">{'المراقبون:'}</p>
                  {printData.invigilators.map((i:any, idx:number) => (
                    <p key={i.id} className="font-bold text-lg">{idx + 1}- أ. {i.users?.full_name}</p>
                  ))}
                  {printData.invigilators.length === 0 && <p className="text-rose-500 font-bold">{'لم يتم التعيين.'}</p>}
                </div>

                <table className="w-full border-collapse border-2 border-slate-900">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="border border-slate-900 p-3 text-lg font-black w-16 text-center">{'م'}</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-32 text-center">{'رقم الجلوس'}</th>
                      <th className="border border-slate-900 p-3 text-lg font-black">{'اسم الطالب الرباعي'}</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-32 text-center">{'الصف'}</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-32 text-center">{'التوقيع'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.students.map((s:any, idx:number) => (
                      <tr key={s.seat_number} className="even:bg-slate-50">
                        <td className="border border-slate-900 p-3 text-center font-bold text-lg">{idx + 1}</td>
                        <td className="border border-slate-900 p-3 text-center font-black text-xl tracking-widest">{s.seat_number}</td>
                        <td className="border border-slate-900 p-3 font-bold text-lg">{s.students?.users?.full_name}</td>
                        <td className="border border-slate-900 p-3 text-center font-bold text-lg">{s.students?.sections?.classes?.level === 10 ? 'العاشر' : 'الحادي عشر'}</td>
                        <td className="border border-slate-900 p-3 text-center"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 🏷️ بطاقات الطاولة */}
            {printType === 'desk_cards' && (
              <div className="grid grid-cols-2 gap-8">
                {printData.students.map((s:any) => (
                  <div key={s.seat_number} className="border-4 border-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center text-center" style={{ breakInside: 'avoid' }}>
                    <div className="absolute top-0 left-0 w-full h-8 bg-slate-900"></div>
                    <h2 className="text-xl font-black mt-4 mb-2 uppercase tracking-wider">{printData.committee.name}</h2>
                    <div className="w-24 h-24 mb-4 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-300 shadow-sm flex items-center justify-center">
                      {s.students?.users?.avatar_url ? ( <img src={s.students.users.avatar_url} crossOrigin="anonymous" alt="صورة الطالب" className="w-full h-full object-cover" /> ) : ( <span className="text-xs font-bold text-slate-400">{'صورة الطالب'}</span> )}
                    </div>
                    <h1 className="text-2xl font-black mb-2 text-indigo-900">{s.students?.users?.full_name}</h1>
                    <div className="bg-slate-100 w-full py-3 rounded-xl mb-4 border border-slate-300">
                      <p className="text-sm font-bold text-slate-500 mb-1">{'الصف والمرحلة'}</p>
                      <p className="text-xl font-black">{s.students?.sections?.classes?.level === 10 ? 'الصف العاشر' : 'الصف الحادي عشر'}</p>
                    </div>
                    <div className="bg-slate-900 text-white w-full py-4 rounded-xl shadow-lg mt-auto">
                      <p className="text-sm font-bold text-slate-300 mb-1">{'رقم الجلوس الامتحاني'}</p>
                      <p className="text-4xl font-black tracking-widest">{s.seat_number}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
