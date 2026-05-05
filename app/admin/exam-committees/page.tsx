// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, FileText, Printer, ShieldCheck, 
  Settings, Loader2, Search, Trash2, PrinterIcon, IdCard, DoorOpen, LayoutGrid, CheckCircle2, Download, X, Edit3, Plus, Eye, AlertTriangle, Contact, BarChart2
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
  
  // 🚀 حالات النوافذ المنبثقة
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState(''); 
  
  const [editCommitteeData, setEditCommitteeData] = useState({ id: '', name: '', capacity: 14, location: '' });
  const [viewCommitteeDetails, setViewCommitteeDetails] = useState<{ students: any[], invigs: any[] }>({ students: [], invigs: [] });

  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [printType, setPrintType] = useState<'door_sheet' | 'desk_cards' | 'invigilator_ids' | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: comms } = await supabase.from('exam_committees').select('*').eq('academic_year', currentYear).eq('semester', currentSemester).order('name');
      
      const { data: tchrs } = await supabase.from('teachers').select(`
        id, 
        users(full_name, avatar_url),
        teacher_subjects(subjects(name))
      `);
      
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, users(full_name, avatar_url)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('committee_id').eq('academic_year', currentYear).eq('semester', currentSemester);

      const stats: any = {};
      if (allocs) { allocs.forEach((a: any) => { stats[a.committee_id] = (stats[a.committee_id] || 0) + 1; }); }

      // تنظيف البيانات لضمان عدم حدوث أي انهيار أثناء البحث
      const formattedTeachers = (tchrs || []).map((t: any) => {
        const u = Array.isArray(t.users) ? t.users[0] : t.users;
        const subjects = t.teacher_subjects?.map((s:any) => s.subjects?.name).filter(Boolean).join('، ') || 'غير محدد';
        return {
          id: t.id,
          full_name: u?.full_name || 'بدون اسم',
          avatar_url: u?.avatar_url || null,
          subjectsStr: subjects
        };
      });

      setCommittees(comms || []);
      setTeachers(formattedTeachers);
      setInvigilators(invigs || []);
      setAllocationsStats(stats);
    } catch (error) { console.error('Error fetching data:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { 
    if (currentRole === 'admin' || currentRole === 'management') {
      fetchData(); 
    }
  }, [currentRole]);

  const selectedTeacherData = teachers.find(t => t.id === selectedTeacherId);
  const selectedTeacherSubjects = selectedTeacherData?.subjectsStr || 'غير محدد';

  const totalTeachers = teachers.length;
  const uniqueAssignedTeachers = new Set(invigilators.map(i => i.teacher_id)).size;
  const assignmentCoverage = totalTeachers > 0 ? Math.round((uniqueAssignedTeachers / totalTeachers) * 100) : 0;

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

  const handleNuclearReset = async () => {
    if (!confirm('تحذير خطير: سيتم حذف جميع اللجان، والمراقبين، وأرقام جلوس الطلاب لهذا الفصل بالكامل! هل تريد البدء من الصفر؟')) return;
    try {
      setIsLoading(true);
      await supabase.from('exam_committees').delete().eq('academic_year', currentYear).eq('semester', currentSemester);
      fetchData();
    } catch (error) { alert('خطأ في التصفير'); }
  };

  const openCommitteeModal = (committee: any = null) => {
    if (committee) setEditCommitteeData({ id: committee.id, name: committee.name, capacity: committee.capacity, location: committee.location || '' });
    else setEditCommitteeData({ id: '', name: `لجنة ${committees.length + 1}`, capacity: 14, location: '' });
    setIsCommitteeModalOpen(true);
  };

  const openViewModal = async (committee: any) => {
    setIsLoading(true);
    setSelectedCommittee(committee);
    try {
      const { data: students } = await supabase.from('student_seat_allocations')
        .select(`seat_number, students ( id, users(full_name, avatar_url), sections(classes(level)) )`)
        .eq('committee_id', committee.id)
        .order('seat_number', { ascending: true });
        
      const commInvigs = invigilators.filter(i => i.committee_id === committee.id);
      setViewCommitteeDetails({ students: students || [], invigs: commInvigs });
      setIsViewModalOpen(true);
    } catch (error) {
      alert('خطأ في جلب بيانات اللجنة');
    } finally {
      setIsLoading(false);
    }
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
    
    const isInThisCommittee = invigilators.some(i => i.teacher_id === selectedTeacherId && i.committee_id === selectedCommittee.id);
    if (isInThisCommittee) { alert('هذا المعلم معين مسبقاً في هذه اللجنة!'); return; }

    try {
      await supabase.from('committee_invigilators').insert({ committee_id: selectedCommittee.id, teacher_id: selectedTeacherId });
      setIsAssignModalOpen(false); setSelectedTeacherId(''); setTeacherSearchTerm(''); fetchData();
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

  // 🚀 محرك الطباعة المحسن للهواتف والمثبت بإحداثيات آمنة (Fixed to Top: 200vh)
  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards' | 'invigilator_ids') => {
    const data = await fetchPrintData(committeeId);
    if (type !== 'invigilator_ids' && data.students.length === 0) { alert('لا يوجد طلاب في هذه اللجنة لطباعتهم!'); setIsPrinting(false); return; }
    if (type === 'invigilator_ids' && data.invigilators.length === 0) { alert('لا يوجد مراقبون في هذه اللجنة لطباعة هوياتهم!'); setIsPrinting(false); return; }

    setPrintData(data); 
    setPrintType(type);

    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0); 
        const canvas = await html2canvas(printRef.current, { 
          scale: 1.5, 
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: 1024 
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        let fileName = 'مستند';
        if (type === 'door_sheet') fileName = `كشف_مناداة_${data.committee.name}`;
        if (type === 'desk_cards') fileName = `بطاقات_طاولة_${data.committee.name}`;
        if (type === 'invigilator_ids') fileName = `هويات_المراقبين_${data.committee.name}`;

        pdf.save(`${fileName}.pdf`);
      } catch (err: any) { 
        console.error("PDF Engine Error:", err);
        alert('حدث خطأ أثناء المعالجة في المتصفح الحالي، يرجى استخدام جهاز كمبيوتر أو متصفح كروم.'); 
      } 
      finally { setPrintData(null); setPrintType(null); setIsPrinting(false); }
    }, 2500); 
  };

  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">عذراً، هذه الغرفة مخصصة لمدير النظام والإدارة العليا فقط.</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">العودة للخلف</button>
        </div>
      </div>
    );
  }

  // 🚀 خوارزمية الفرز والبحث الآمنة 100% والمضادة للانهيار
  const getTeacherAssignments = (tId: string) => invigilators.filter(i => i.teacher_id === tId);
  const sortedAndFilteredTeachers = teachers
    .filter(t => {
       const term = String(teacherSearchTerm || '').toLowerCase();
       const matchesName = String(t.full_name || '').toLowerCase().includes(term);
       const matchesSubj = String(t.subjectsStr || '').toLowerCase().includes(term);
       return matchesName || matchesSubj;
    })
    .sort((a, b) => {
       const aCount = getTeacherAssignments(a.id).length;
       const bCount = getTeacherAssignments(b.id).length;
       if (aCount !== bCount) return aCount - bCount; 
       return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'ar');
    });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      {/* 🚀 نافذة التحميل الشاملة */}
      <AnimatePresence>
        {(isEngineLoading || isPrinting) && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
            <h2 className="text-2xl font-black mb-2 animate-pulse text-center px-4">{isPrinting ? 'جاري تجهيز وتصميم ملف الطباعة عالي الدقة...' : progressMsg}</h2>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8 relative">
        
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-indigo-50/50 pointer-events-none"><ShieldCheck className="w-64 h-64" /></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8 border-b border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <LayoutGrid className="w-8 h-8 text-indigo-600" /> غرفة كنترول الامتحانات
              </h1>
              <p className="text-slate-500 font-bold text-sm">إدارة اللجان، التوزيع، وإحصائيات عدالة المراقبة.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => openCommitteeModal()} className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-emerald-200">
                <Plus className="w-4 h-4" /> إضافة لجنة
              </button>
              <button onClick={handleDistribute} disabled={committees.length === 0} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                <Users className="w-4 h-4" /> الخلط الأبجدي للطلاب
              </button>
              {committees.length > 0 && (
                <button onClick={handleNuclearReset} className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-rose-200">
                  <Trash2 className="w-4 h-4" /> تصفير شامل
                </button>
              )}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100"><Users className="w-6 h-6 text-slate-500" /></div>
                <div>
                   <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المعلمين</p>
                   <p className="text-2xl font-black text-slate-800">{totalTeachers}</p>
                </div>
             </div>
             <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100"><CheckCircle2 className="w-6 h-6 text-indigo-500" /></div>
                <div>
                   <p className="text-xs font-bold text-indigo-500 mb-1">تم تكليفهم (يستحقون الراحة)</p>
                   <p className="text-2xl font-black text-indigo-800">{uniqueAssignedTeachers}</p>
                </div>
             </div>
             <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100"><BarChart2 className="w-6 h-6 text-emerald-500" /></div>
                <div className="flex-1">
                   <p className="text-xs font-bold text-emerald-600 mb-1 flex justify-between">
                     <span>نسبة التغطية العادلة</span>
                     <span>{assignmentCoverage}%</span>
                   </p>
                   <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${assignmentCoverage}%` }}></div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
        ) : committees.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <h3 className="text-xl font-black text-slate-400 mb-4">لم يتم إعداد اللجان بعد</h3>
            <button onClick={async () => { await generateDefaultCommittees(currentYear, currentSemester); fetchData(); }} className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800">
              توليد 22 لجنة افتراضية الآن
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
                        السعة: {committee.capacity} {committee.location && `| 📍 ${committee.location}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => openViewModal(committee)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="استعراض اللجنة"><Eye className="w-4 h-4"/></button>
                       <button onClick={() => openCommitteeModal(committee)} className="p-2 bg-slate-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit3 className="w-4 h-4"/></button>
                       <button onClick={() => handleDeleteCommittee(committee.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-xs font-black text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400"/> المراقبون ({committeeInvigs.length}/2)</p>
                       <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                         <Users className="w-3 h-3"/> {studentsCount} طالب
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                      {committeeInvigs.map(invig => {
                        const invigAvatar = invig.users?.avatar_url || invig.users?.[0]?.avatar_url;
                        const invigName = String(invig.users?.full_name || invig.users?.[0]?.full_name || 'غير معروف');
                        return (
                          <div key={invig.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {invigAvatar ? (
                                 <img src={invigAvatar} crossOrigin="anonymous" className="w-6 h-6 rounded-full object-cover shrink-0" alt="avatar" />
                              ) : (
                                 <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">{invigName.charAt(0)}</div>
                              )}
                              <span className="text-xs font-bold text-slate-700 truncate">{invigName}</span>
                            </div>
                            <button onClick={() => handleRemoveInvigilator(invig.id)} className="text-rose-400 hover:text-rose-600 p-1 bg-rose-50 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        )
                      })}
                      {committeeInvigs.length < 2 && (
                        <button onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }} className="w-full p-2.5 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 flex items-center justify-center gap-2 transition-colors">
                          <UserPlus className="w-4 h-4" /> اختيار مراقب
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => printDocument(committee.id, 'door_sheet')} className="col-span-2 bg-slate-900 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm">
                      <PrinterIcon className="w-4 h-4 text-emerald-400"/> طباعة كشف الباب (PDF)
                    </button>
                    <button onClick={() => printDocument(committee.id, 'desk_cards')} className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100">
                      <IdCard className="w-3 h-3"/> بطاقات الطاولة
                    </button>
                    <button onClick={() => printDocument(committee.id, 'invigilator_ids')} className="bg-amber-50 text-amber-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-amber-100 transition-colors shadow-sm border border-amber-100">
                      <Contact className="w-3 h-3"/> هويات المراقبين
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🚀 نافذة إدارة اللجنة (الآن داخل div عادي لحماية Framer Motion) */}
      <AnimatePresence>
        {isCommitteeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsCommitteeModalOpen(false)} />
            <motion.div key="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-600"/> {editCommitteeData.id ? 'إعدادات اللجنة' : 'لجنة جديدة'}
                </h3>
                <button onClick={() => setIsCommitteeModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">اسم اللجنة</label>
                  <input type="text" value={editCommitteeData.name} onChange={e => setEditCommitteeData({...editCommitteeData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder="مثال: لجنة 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">السعة القصوى</label>
                     <input type="number" min="1" value={editCommitteeData.capacity} onChange={e => setEditCommitteeData({...editCommitteeData, capacity: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-indigo-500" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-600 mb-2">المكان (اختياري)</label>
                     <input type="text" value={editCommitteeData.location} onChange={e => setEditCommitteeData({...editCommitteeData, location: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500" placeholder="مثال: المسرح" />
                   </div>
                </div>
                <button onClick={handleSaveCommittee} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-colors shadow-md mt-4">حفظ التغييرات</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة اختيار المراقبين */}
      <AnimatePresence>
        {isAssignModalOpen && selectedCommittee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="backdrop-assign" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}} />
            <motion.div key="modal-assign" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
              
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-indigo-600"/> تكليف مراقب ({selectedCommittee.name})
                </h3>
                <button onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="relative mb-4 shrink-0">
                   <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                   </div>
                   <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="ابحث عن اسم معلم، أو مادة يدرسها..."
                      value={teacherSearchTerm}
                      onChange={(e) => setTeacherSearchTerm(e.target.value)}
                   />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                   {sortedAndFilteredTeachers.map(t => {
                      const assignedComms = getTeacherAssignments(t.id);
                      const isInThisCommittee = assignedComms.some(c => c.committee_id === selectedCommittee.id);
                      const isSelected = selectedTeacherId === t.id;
                      const initialChar = String(t.full_name || 'م').charAt(0);

                      return (
                         <div 
                            key={t.id || Math.random()} 
                            onClick={() => !isInThisCommittee && setSelectedTeacherId(t.id)}
                            className={cn(
                               "p-3 rounded-xl border flex items-center justify-between transition-all",
                               isInThisCommittee ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" : 
                               isSelected ? "bg-indigo-50 border-indigo-500 cursor-pointer shadow-sm ring-1 ring-indigo-500" :
                               "bg-white border-slate-200 hover:border-indigo-300 cursor-pointer hover:shadow-sm"
                            )}
                         >
                            <div className="flex items-center gap-3">
                               {t.avatar_url ? (
                                  <img src={t.avatar_url} crossOrigin="anonymous" className="w-10 h-10 rounded-full object-cover shrink-0" alt="av" />
                               ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">{initialChar}</div>
                               )}
                               <div>
                                  <p className="text-sm font-black text-slate-800">{t.full_name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 max-w-[150px] truncate" title={t.subjectsStr}>المواد: {t.subjectsStr}</p>
                               </div>
                            </div>
                            <div className="shrink-0 text-left">
                               {isInThisCommittee ? (
                                  <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-1 rounded border border-slate-300">موجود باللجنة</span>
                               ) : assignedComms.length === 0 ? (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">🟢 متاح (لم يُكلف)</span>
                               ) : (
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">🟠 مكلف بـ {assignedComms.length} لجنة</span>
                               )}
                            </div>
                         </div>
                      );
                   })}
                   {sortedAndFilteredTeachers.length === 0 && (
                      <p className="text-center text-sm font-bold text-slate-400 py-8">لا يوجد معلمين يطابقون البحث.</p>
                   )}
                </div>

                <AnimatePresence>
                  {selectedTeacherId && (
                     <motion.div initial={{ opacity:0, height: 0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3 mt-4 shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                           <p className="text-xs font-black text-amber-800 mb-1">معلومات أكاديمية للإدارة:</p>
                           <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                              هذا المعلم يقوم بتدريس: <span className="font-black bg-amber-100 px-1.5 rounded">{selectedTeacherSubjects}</span>.
                              يُرجى عدم وضعه في لجان يُمتحن فيها تلاميذه لضمان نزاهة المراقبة.
                           </p>
                        </div>
                     </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-4 shrink-0">
                  <button onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> تأكيد وتكليف المعلم
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة عرض تفاصيل اللجنة */}
      <AnimatePresence>
        {isViewModalOpen && selectedCommittee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="view-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)} />
            <motion.div key="view-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col">
              
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <DoorOpen className="w-6 h-6 text-indigo-600"/> استعراض {selectedCommittee.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">السعة: {selectedCommittee.capacity} | الموقع: {selectedCommittee.location || 'غير محدد'}</p>
                </div>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-6 h-6"/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                 <div>
                    <h4 className="text-sm font-black text-indigo-900 bg-indigo-50 px-3 py-2 rounded-lg inline-block mb-3">طاقم المراقبة</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {viewCommitteeDetails.invigs.length > 0 ? viewCommitteeDetails.invigs.map(invig => {
                          const invAvatar = invig.users?.avatar_url || invig.users?.[0]?.avatar_url;
                          const invName = String(invig.users?.full_name || invig.users?.[0]?.full_name || 'غير معروف');
                          const invInitial = invName.charAt(0);
                          return (
                            <div key={invig.id || Math.random()} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                               {invAvatar ? (
                                  <img src={invAvatar} crossOrigin="anonymous" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100" alt="avatar" />
                               ) : (
                                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">{invInitial}</div>
                               )}
                               <div>
                                  <p className="text-sm font-black text-slate-800">{invName}</p>
                                  <p className="text-[10px] font-bold text-slate-500">مراقب لجنة</p>
                               </div>
                            </div>
                          )
                       }) : <p className="text-sm font-bold text-rose-500">لم يتم تعيين مراقبين لهذه اللجنة بعد.</p>}
                    </div>
                 </div>

                 <div>
                    <h4 className="text-sm font-black text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg flex justify-between items-center mb-3">
                       <span>قائمة الطلاب الموزعين</span>
                       <span className="text-xs font-bold text-emerald-600">{viewCommitteeDetails.students.length} طالب</span>
                    </h4>
                    
                    {viewCommitteeDetails.students.length > 0 ? (
                       <table className="w-full border-collapse border border-slate-200 text-right text-sm rounded-xl overflow-hidden shadow-sm">
                         <thead className="bg-slate-100">
                           <tr>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">رقم الجلوس</th>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">اسم الطالب</th>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">الصف</th>
                           </tr>
                         </thead>
                         <tbody>
                           {viewCommitteeDetails.students.map((s) => {
                             const stdAvatar = s.students?.users?.avatar_url || s.students?.users?.[0]?.avatar_url;
                             const stdName = String(s.students?.users?.full_name || s.students?.users?.[0]?.full_name || 'طالب');
                             const classLvl = s.students?.sections?.classes?.level || s.students?.sections?.[0]?.classes?.level;
                             return (
                               <tr key={s.seat_number || Math.random()} className="even:bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                                 <td className="p-3 border-b border-slate-100 font-black text-indigo-600 tracking-widest">{s.seat_number}</td>
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                                    {stdAvatar ? (
                                      <img src={stdAvatar} crossOrigin="anonymous" className="w-6 h-6 rounded-full object-cover shrink-0" alt="std" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-black shrink-0">{stdName.charAt(0)}</div>
                                    )}
                                    <span className="truncate">{stdName}</span>
                                 </td>
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-500">{classLvl === 10 ? 'العاشر' : 'الحادي عشر'}</td>
                               </tr>
                             )
                           })}
                         </tbody>
                       </table>
                    ) : (
                       <p className="text-sm font-bold text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">هذه اللجنة فارغة، لم يتم توزيع الطلاب بعد.</p>
                    )}
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 
        =========================================================
        🖨️ قوالب الطباعة (مخفية عن المستخدم، مرئية للـ Canvas) 
        الآن متوافقة 100% مع الجوالات بفضل position: fixed top: 200vh
        =========================================================
      */}
      {printData && (
        <div style={{ position: 'fixed', top: '200vh', left: 0, pointerEvents: 'none', zIndex: -9999 }}>
          <div ref={printRef} className="bg-white text-black p-10 font-cairo" dir="rtl" style={{ width: '210mm', minHeight: '297mm' }}>
            
            {printType === 'door_sheet' && (
              <div className="min-h-[1122px] bg-white">
                <div className="text-center mb-8 border-b-2 border-slate-900 pb-6 flex items-center justify-between">
                  <div className="text-right">
                    <h2 className="text-xl font-black">دولة الكويت</h2>
                    <h3 className="text-lg font-bold">وزارة التربية</h3>
                    <h3 className="text-lg font-bold">مدرسة الرفعة النموذجية</h3>
                  </div>
                  <div className="text-center">
                    <h1 className="text-3xl font-black bg-slate-900 text-white px-6 py-2 rounded-2xl inline-block mb-2 shadow-sm">كشف مناداة ({printData.committee.name})</h1>
                    <p className="font-bold text-lg">{printData.committee.location && `المكان: ${printData.committee.location} | `} اختبارات {currentSemester} - {currentYear}</p>
                  </div>
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-900 overflow-hidden shrink-0">
                     <span className="font-black text-2xl text-slate-400">شعار</span>
                  </div>
                </div>

                <div className="mb-6 flex justify-between bg-slate-50 p-4 rounded-xl border border-slate-300">
                  <p className="font-black text-lg">أعضاء لجنة المراقبة:</p>
                  {printData.invigilators.map((i:any, idx:number) => (
                    <p key={i.id} className="font-bold text-lg">{idx + 1}- أ. {i.users?.full_name || i.users?.[0]?.full_name}</p>
                  ))}
                  {printData.invigilators.length === 0 && <p className="text-slate-400 font-bold">لم يتم التعيين.</p>}
                </div>

                <table className="w-full border-collapse border-2 border-slate-900">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="border border-slate-900 p-3 text-lg font-black w-12 text-center">م</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-32 text-center">رقم الجلوس</th>
                      <th className="border border-slate-900 p-3 text-lg font-black">اسم الطالب الرباعي</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-24 text-center">الصف</th>
                      <th className="border border-slate-900 p-3 text-lg font-black w-32 text-center">التوقيع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.students.map((s:any, idx:number) => {
                      const stdName = s.students?.users?.full_name || s.students?.users?.[0]?.full_name;
                      const stdClass = s.students?.sections?.classes?.level || s.students?.sections?.[0]?.classes?.level;
                      return (
                        <tr key={s.seat_number} className="even:bg-slate-50">
                          <td className="border border-slate-900 p-3 text-center font-bold text-lg">{idx + 1}</td>
                          <td className="border border-slate-900 p-3 text-center font-black text-xl tracking-widest">{s.seat_number}</td>
                          <td className="border border-slate-900 p-3 font-bold text-lg">{stdName}</td>
                          <td className="border border-slate-900 p-3 text-center font-bold text-lg">{stdClass === 10 ? 'العاشر' : 'الحادي عشر'}</td>
                          <td className="border border-slate-900 p-3 text-center"></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {printType === 'desk_cards' && (
              <div className="grid grid-cols-2 gap-8 bg-white min-h-[1122px]">
                {printData.students.map((s:any) => {
                   const stdName = s.students?.users?.full_name || s.students?.users?.[0]?.full_name;
                   const stdAvatar = s.students?.users?.avatar_url || s.students?.users?.[0]?.avatar_url;
                   const stdClass = s.students?.sections?.classes?.level || s.students?.sections?.[0]?.classes?.level;
                   return (
                      <div key={s.seat_number} className="border-4 border-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center text-center shadow-sm" style={{ pageBreakInside: 'avoid' }}>
                        <div className="absolute top-0 left-0 w-full h-8 bg-slate-900"></div>
                        <h2 className="text-xl font-black mt-4 mb-2 uppercase tracking-wider">{printData.committee.name}</h2>
                        <div className="w-24 h-24 mb-4 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-300 shadow-sm flex items-center justify-center shrink-0">
                          {stdAvatar ? ( 
                            <img src={stdAvatar} crossOrigin="anonymous" alt="Student" className="w-full h-full object-cover" /> 
                          ) : ( 
                            <span className="text-xs font-bold text-slate-400">صورة الطالب</span> 
                          )}
                        </div>
                        <h1 className="text-2xl font-black mb-2 text-indigo-900">{stdName}</h1>
                        <div className="bg-slate-100 w-full py-3 rounded-xl mb-4 border border-slate-300">
                          <p className="text-sm font-bold text-slate-500 mb-1">الصف والمرحلة</p>
                          <p className="text-xl font-black">{stdClass === 10 ? 'الصف العاشر' : 'الصف الحادي عشر'}</p>
                        </div>
                        <div className="bg-slate-900 text-white w-full py-4 rounded-xl shadow-md mt-auto">
                          <p className="text-sm font-bold text-slate-300 mb-1">رقم الجلوس الامتحاني</p>
                          <p className="text-4xl font-black tracking-widest">{s.seat_number}</p>
                        </div>
                      </div>
                   )
                })}
              </div>
            )}

            {printType === 'invigilator_ids' && (
              <div className="flex flex-wrap gap-8 justify-center bg-white min-h-[1122px]">
                {printData.invigilators.map((invig:any) => {
                  const invAvatar = invig.users?.avatar_url || invig.users?.[0]?.avatar_url;
                  const invName = invig.users?.full_name || invig.users?.[0]?.full_name;
                  return (
                    <div key={invig.id} className="w-[60mm] h-[95mm] border-[3px] border-indigo-900 rounded-2xl relative overflow-hidden flex flex-col items-center text-center shadow-lg bg-white" style={{ pageBreakInside: 'avoid' }}>
                      <div className="absolute top-0 left-0 w-full h-[35mm] bg-indigo-900 shrink-0"></div>
                      <div className="absolute top-[25mm] left-1/2 -translate-x-1/2 w-[90mm] h-[20mm] bg-indigo-800 rounded-[50%] shrink-0"></div>
                      
                      <div className="relative z-10 w-full pt-3">
                         <p className="text-white font-black text-sm tracking-wider">مدرسة الرفعة النموذجية</p>
                         <p className="text-indigo-200 font-bold text-[10px]">لجنة الامتحانات النهائية</p>
                      </div>

                      <div className="relative z-10 w-[22mm] h-[22mm] mt-4 mb-3 rounded-full bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                         {invAvatar ? ( 
                            <img src={invAvatar} crossOrigin="anonymous" alt="Teacher" className="w-full h-full object-cover" /> 
                         ) : ( 
                            <UserPlus className="w-8 h-8 text-slate-300" /> 
                         )}
                      </div>

                      <div className="relative z-10 w-full px-3 flex-1 flex flex-col">
                         <h2 className="text-lg font-black text-indigo-900 mb-1 leading-tight">{invName}</h2>
                         <p className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-widest border-b-2 border-indigo-100 pb-2">مراقب لجنة</p>
                         
                         <div className="mt-auto bg-indigo-50 w-full p-2 rounded-lg border border-indigo-100 mb-3">
                            <p className="text-[10px] font-bold text-indigo-400 mb-0.5">مكلف في</p>
                            <p className="text-sm font-black text-indigo-900">{printData.committee.name}</p>
                            {printData.committee.location && <p className="text-[10px] font-bold text-slate-500 mt-0.5">{printData.committee.location}</p>}
                         </div>
                      </div>
                      
                      <div className="w-full h-2 bg-indigo-900 shrink-0"></div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

    </div>
  );
}
```</AnimatePresence>
