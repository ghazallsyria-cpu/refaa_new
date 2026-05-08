// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, FileText, Printer, ShieldCheck, 
  Settings, Loader2, Search, Trash2, PrinterIcon, IdCard, DoorOpen, LayoutGrid, CheckCircle2, Download, X, Edit3, Plus, Eye, AlertTriangle, Contact, BarChart2,
  Camera, UploadCloud, Crown 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas-pro';
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
  const [timetables, setTimetables] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHeadsModalOpen, setIsHeadsModalOpen] = useState(false);
  
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState(''); 
  
  const [editCommitteeData, setEditCommitteeData] = useState({ id: '', name: '', capacity: 14, location: '' });
  const [viewCommitteeDetails, setViewCommitteeDetails] = useState<{ students: any[], invigs: any[] }>({ students: [], invigs: [] });

  const [headAssignment, setHeadAssignment] = useState({ timetable_id: '', head_teacher_id: '', committees_range: '' });
  const [currentHeads, setCurrentHeads] = useState<any[]>([]);

  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [printType, setPrintType] = useState<'door_sheet' | 'desk_cards' | 'invigilator_ids' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: comms } = await supabase.from('exam_committees').select('*').eq('academic_year', currentYear).eq('semester', currentSemester);
      
      const sortedComms = (comms || []).sort((a, b) => a.name.localeCompare(b.name, 'ar', { numeric: true }));

      const { data: tchrs } = await supabase.from('teachers').select(`id, users(full_name, avatar_url), teacher_subjects(subjects(name))`);
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, users(full_name, avatar_url)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('committee_id').eq('academic_year', currentYear).eq('semester', currentSemester);
      const { data: exams } = await supabase.from('exam_timetables').select('id, exam_date, subjects(name), class_level').eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date');

      const stats: any = {};
      if (allocs) { allocs.forEach((a: any) => { stats[a.committee_id] = (stats[a.committee_id] || 0) + 1; }); }

      const formattedTeachers = (tchrs || []).map((t: any) => {
        const u = Array.isArray(t.users) ? t.users[0] : t.users;
        const subjects = t.teacher_subjects?.map((s:any) => s.subjects?.name).filter(Boolean).join('، ') || 'غير محدد';
        return { id: t.id || Math.random().toString(), full_name: u?.full_name || 'بدون اسم', avatar_url: u?.avatar_url || null, subjectsStr: subjects };
      });

      setCommittees(sortedComms);
      setTeachers(formattedTeachers);
      setInvigilators(invigs || []);
      setAllocationsStats(stats);
      setTimetables(exams || []);
    } catch (error) { console.error('Error fetching data:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (currentRole === 'admin' || currentRole === 'management') fetchData(); }, [currentRole]);

  const fetchHeads = async (timetableId: string) => {
    if (!timetableId) return;
    const { data } = await supabase.from('exam_committee_heads').select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name, avatar_url)').eq('timetable_id', timetableId);
    setCurrentHeads(data || []);
  };

  const handleAssignHead = async () => {
    if (!headAssignment.timetable_id || !headAssignment.head_teacher_id || !headAssignment.committees_range) {
      alert('يرجى تعبئة جميع الحقول!'); return;
    }
    try {
      await supabase.from('exam_committee_heads').insert({
        timetable_id: headAssignment.timetable_id,
        head_teacher_id: headAssignment.head_teacher_id,
        committees_range: headAssignment.committees_range
      });
      setHeadAssignment({...headAssignment, head_teacher_id: '', committees_range: ''});
      fetchHeads(headAssignment.timetable_id);
    } catch (error) { alert('هذا المعلم مكلف كرئيس لجان في هذه المادة مسبقاً!'); }
  };

  const handleDeleteHead = async (id: string) => {
    if (!confirm('هل أنت متأكد من إزالة التكليف؟')) return;
    await supabase.from('exam_committee_heads').delete().eq('id', id);
    fetchHeads(headAssignment.timetable_id);
  };

  const triggerAvatarUpload = (userId: string) => { setTargetUserId(userId); if (fileInputRef.current) fileInputRef.current.click(); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rafaa_preset');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzmyqnj01';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        await supabase.from('users').update({ avatar_url: data.secure_url }).eq('id', targetUserId);
        alert('تم رفع الصورة واعتمادها بنجاح!'); fetchData();
      } else throw new Error('فشل الرفع');
    } catch (error) { alert('حدث خطأ أثناء رفع الصورة.'); } finally { setIsUploadingAvatar(false); setTargetUserId(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleMoveStudent = async (studentId: string, newCommitteeId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('student_seat_allocations')
        .update({ committee_id: newCommitteeId })
        .eq('student_id', studentId)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      if (error) throw error;
      alert('تم نقل الطالب بنجاح وتحديث التوزيع!');
      setIsViewModalOpen(false); 
      fetchData();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء نقل الطالب.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTeacherData = teachers.find(t => t.id === selectedTeacherId);
  const selectedTeacherSubjects = selectedTeacherData?.subjectsStr || 'غير محدد';
  const totalTeachers = teachers.length;
  const uniqueAssignedTeachers = new Set(invigilators.map(i => i.teacher_id)).size;
  const assignmentCoverage = totalTeachers > 0 ? Math.round((uniqueAssignedTeachers / totalTeachers) * 100) : 0;

  const handleSaveCommittee = async () => {
    if (!editCommitteeData.name.trim()) { alert('يرجى إدخال اسم اللجنة'); return; }
    try {
      if (editCommitteeData.id) await supabase.from('exam_committees').update({ name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location }).eq('id', editCommitteeData.id);
      else await supabase.from('exam_committees').insert({ name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location, academic_year: currentYear, semester: currentSemester });
      setIsCommitteeModalOpen(false); fetchData();
    } catch (error) { alert('حدث خطأ'); }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm('تأكيد الحذف؟ (سيتم حذف المراقبين المرتبطين بهذه اللجنة أيضاً)')) return;
    try { await supabase.from('exam_committees').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ في الحذف'); }
  };

  // 🚀 التصفير القوي (يهدم اللجان بالكامل)
  const handleNuclearReset = async () => {
    if (!confirm('تحذير خطير: سيتم حذف جميع اللجان، والمراقبين، وأرقام جلوس الطلاب لهذا الفصل بالكامل للبدء من الصفر! هل أنت متأكد؟')) return;
    try { setIsLoading(true); await supabase.from('exam_committees').delete().eq('academic_year', currentYear).eq('semester', currentSemester); fetchData(); } catch (error) { alert('خطأ'); }
  };

  // 🚀 التصفير الناعم (تفريغ الطلاب فقط)
  const handleSoftReset = async () => {
    if (!confirm('تفريغ جميع الطلاب؟ ستبقى أسماء اللجان والمراقبين كما هي.')) return;
    try { 
      setIsLoading(true); 
      await supabase.from('student_seat_allocations').delete().eq('academic_year', currentYear).eq('semester', currentSemester); 
      fetchData(); 
      alert('تم تفريغ اللجان بنجاح!');
    } catch (error) { 
      alert('خطأ أثناء التصفير'); 
    }
  };

  const openCommitteeModal = (committee: any = null) => {
    if (committee) setEditCommitteeData({ id: committee.id, name: committee.name, capacity: committee.capacity, location: committee.location || '' });
    else setEditCommitteeData({ id: '', name: `لجنة ${committees.length + 1}`, capacity: 14, location: '' });
    setIsCommitteeModalOpen(true);
  };

  const openViewModal = async (committee: any) => {
    setIsLoading(true); setSelectedCommittee(committee);
    try {
      const { data: students } = await supabase.from('student_seat_allocations').select(`seat_number, student_id, students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )`).eq('committee_id', committee.id).order('seat_number', { ascending: true });
      const commInvigs = invigilators.filter(i => i.committee_id === committee.id);
      setViewCommitteeDetails({ students: students || [], invigs: commInvigs }); setIsViewModalOpen(true);
    } catch (error) { alert('خطأ'); } finally { setIsLoading(false); }
  };

  const handleDistribute = async () => {
    if (!confirm('هل أنت متأكد من بدء عملية الفرز الأبجدي والسحّاب؟ (سيمسح أي توزيع سابق)')) return;
    const result = await generateSeatingAndDistribute(currentYear, currentSemester);
    if (result.success) { alert('تم توزيع الطلاب بالتبادل الأبجدي بنجاح!'); fetchData(); }
  };

  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee) return;
    const currentInvigs = invigilators.filter(i => i.committee_id === selectedCommittee.id);
    if (currentInvigs.length >= 2) { alert('أقصى حد مراقبين 2!'); return; }
    if (invigilators.some(i => i.teacher_id === selectedTeacherId && i.committee_id === selectedCommittee.id)) { alert('مكلف مسبقاً!'); return; }
    try { await supabase.from('committee_invigilators').insert({ committee_id: selectedCommittee.id, teacher_id: selectedTeacherId }); setIsAssignModalOpen(false); setSelectedTeacherId(''); setTeacherSearchTerm(''); fetchData(); } catch (error) { alert('خطأ'); }
  };

  const handleRemoveInvigilator = async (id: string) => {
    if (!confirm('إزالة المراقب؟')) return;
    try { await supabase.from('committee_invigilators').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ'); }
  };

  const getFullClassName = (studentData: any) => {
    const classLvl = studentData?.sections?.classes?.level || studentData?.sections?.[0]?.classes?.level;
    let classNameDisplay = 'صف غير محدد';
    if (classLvl === 10) classNameDisplay = 'الصف العاشر';
    if (classLvl === 11) classNameDisplay = 'الصف الحادي عشر';
    if (classLvl === 12) classNameDisplay = 'الصف الثاني عشر';
    const secName = studentData?.sections?.name || studentData?.sections?.[0]?.name || '';
    return `${classNameDisplay} ${secName ? '- ' + secName : ''}`;
  };

  const fetchPrintData = async (committeeId: string) => {
    setIsPrinting(true);
    const { data } = await supabase.from('student_seat_allocations').select(`seat_number, student_id, students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )`).eq('committee_id', committeeId).order('seat_number', { ascending: true });
    const committee = committees.find(c => c.id === committeeId);
    const committeeInvigs = invigilators.filter(i => i.committee_id === committeeId);
    return { students: data || [], committee, invigilators: committeeInvigs };
  };

  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards' | 'invigilator_ids') => {
    const data = await fetchPrintData(committeeId);
    if (type !== 'invigilator_ids' && data.students.length === 0) { alert('لا يوجد طلاب!'); setIsPrinting(false); return; }
    if (type === 'invigilator_ids' && data.invigilators.length === 0) { alert('لا يوجد مراقبون!'); setIsPrinting(false); return; }

    setPrintData(data); setPrintType(type);

    setTimeout(async () => {
      if (!printRef.current) return;
      try {
        window.scrollTo(0, 0); const isMobile = window.innerWidth < 768;
        const pages = printRef.current.querySelectorAll('.print-page-wrapper');
        if (pages.length === 0) return;
        const pdf = new jsPDF('p', 'mm', 'a4');
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i] as HTMLElement, { scale: isMobile ? 1.5 : 2, useCORS: true, allowTaint: false, logging: false, width: 794, height: 1122, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/jpeg', 0.85); 
          const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); 
          if (i > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }
        let fileName = 'مستند';
        if (type === 'door_sheet') fileName = `كشف_مناداة_${data.committee.name}`;
        if (type === 'desk_cards') fileName = `بطاقات_طاولة_${data.committee.name}`;
        if (type === 'invigilator_ids') fileName = `هويات_المراقبين_الذكية`;
        pdf.save(`${fileName}.pdf`);
      } catch (err: any) { alert('حدث خطأ أثناء معالجة الصور.'); } finally { setPrintData(null); setPrintType(null); setIsPrinting(false); }
    }, 3000); 
  };

  const chunkArray = (arr: any[], size: number) => {
    if (!arr) return []; return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  };

  if (currentRole !== 'admin' && currentRole !== 'management') return null;

  const getTeacherAssignments = (tId: string) => invigilators.filter(i => i.teacher_id === tId);
  const sortedAndFilteredTeachers = teachers
    .filter(t => {
       const term = String(teacherSearchTerm || '').toLowerCase();
       return String(t?.full_name || '').toLowerCase().includes(term) || String(t?.subjectsStr || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
       const aCount = getTeacherAssignments(String(a?.id)).length;
       const bCount = getTeacherAssignments(String(b?.id)).length;
       if (aCount !== bCount) return aCount - bCount; 
       return String(a?.full_name || '').localeCompare(String(b?.full_name || ''), 'ar');
    });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      { (isEngineLoading || isPrinting) && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
          <h2 className="text-2xl font-black mb-2 animate-pulse text-center px-4">{isPrinting ? 'جاري تجهيز وتصميم ملف الطباعة عالي الدقة...' : progressMsg}</h2>
        </div>
      )}

      <AnimatePresence>
        {isUploadingAvatar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white">
            <UploadCloud className="w-16 h-16 animate-bounce text-emerald-400 mb-4" />
            <h2 className="text-xl font-black">جاري رفع الصورة واعتمادها...</h2>
          </motion.div>
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
              <p className="text-slate-500 font-bold text-sm">إدارة اللجان، التوزيع السحّاب (Zipper)، تكليف الرؤساء وإحصائيات المراقبة.</p>
            </div>
            {/* 🚀 قسم الأزرار المحدثة (التوزيع وتفريغ الطلاب) */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => openCommitteeModal()} className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-emerald-200">
                <Plus className="w-4 h-4" /> إضافة لجنة
              </button>
              <button onClick={() => setIsHeadsModalOpen(true)} className="px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-amber-200">
                <Crown className="w-4 h-4" /> رؤساء اللجان
              </button>
              <button onClick={handleDistribute} disabled={committees.length === 0} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                <Users className="w-4 h-4" /> التوزيع الأبجدي
              </button>
              {committees.length > 0 && (
                <>
                  <button onClick={handleSoftReset} className="px-5 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-orange-200" title="مسح التوزيع لإعادته">
                    <Trash2 className="w-4 h-4" /> تفريغ الطلاب
                  </button>
                  <button onClick={handleNuclearReset} className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl transition-all shadow-sm flex items-center gap-2 border border-rose-200" title="هدم اللجان وبناء من الصفر">
                    <AlertTriangle className="w-4 h-4" /> هدم اللجان
                  </button>
                </>
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
                   <p className="text-xs font-bold text-indigo-500 mb-1">مراقبين مكلفين</p>
                   <p className="text-2xl font-black text-indigo-800">{uniqueAssignedTeachers}</p>
                </div>
             </div>
             <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100"><BarChart2 className="w-6 h-6 text-emerald-500" /></div>
                <div className="flex-1">
                   <p className="text-xs font-bold text-emerald-600 mb-1 flex justify-between">
                     <span>نسبة التغطية</span>
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
              const isOverflow = committee.name.includes('لجنة الفائض'); // 🚀 تحديد لجنة الفائض باللون الأحمر

              return (
                <div key={committee.id} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md transition-all flex flex-col group ${isOverflow ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4 relative">
                    <div>
                      <h3 className={`text-xl font-black ${isOverflow ? 'text-rose-700' : 'text-slate-800'}`}>{committee.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">السعة: {committee.capacity} {committee.location && `| 📍 ${committee.location}`}</p>
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => openViewModal(committee)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"><Eye className="w-4 h-4"/></button>
                       <button onClick={() => openCommitteeModal(committee)} className="p-2 bg-slate-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit3 className="w-4 h-4"/></button>
                       <button onClick={() => handleDeleteCommittee(committee.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-xs font-black text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-400"/> المراقبون ({committeeInvigs.length}/2)</p>
                       <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${isOverflow ? 'bg-rose-100 text-rose-700' : isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                         <Users className="w-3 h-3"/> {studentsCount} طالب
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                      {committeeInvigs.map(invig => {
                        const invigAvatar = invig.users?.avatar_url || invig.users?.[0]?.avatar_url;
                        const invigName = String(invig.users?.full_name || invig.users?.[0]?.full_name || 'غير معروف');
                        return (
                          <div key={invig.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 overflow-hidden relative group/avatar cursor-pointer" onClick={(e) => { e.stopPropagation(); triggerAvatarUpload(invig.teacher_id); }} title="انقر لرفع صورة المعلم">
                              <div className="relative shrink-0">
                                {invigAvatar ? <img src={invigAvatar} crossOrigin="anonymous" className="w-6 h-6 rounded-full object-cover shrink-0" alt="avatar" /> : <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">{invigName.charAt(0) || 'م'}</div>}
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"><Camera className="w-3 h-3 text-white" /></div>
                              </div>
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
                    <button onClick={() => printDocument(committee.id, 'invigilator_ids')} className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-100">
                      <Contact className="w-3 h-3"/> هويات المراقبين
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isHeadsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHeadsModalOpen(false)}>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500"/> تكليف رؤساء اللجان والممرات
              </h3>
              <button onClick={() => setIsHeadsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-black text-slate-700 mb-2">المادة الامتحانية والتاريخ</label>
                   <select value={headAssignment.timetable_id} onChange={(e) => { setHeadAssignment({...headAssignment, timetable_id: e.target.value}); fetchHeads(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-amber-500 outline-none">
                     <option value="">- اختر المادة -</option>
                     {timetables.map(t => <option key={t.id} value={t.id}>{t.subjects?.name} ({t.exam_date}) - ص{t.class_level}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-black text-slate-700 mb-2">المعلم المُكلف</label>
                   <select value={headAssignment.head_teacher_id} onChange={(e) => setHeadAssignment({...headAssignment, head_teacher_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-amber-500 outline-none">
                     <option value="">- اختر المعلم -</option>
                     {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                   </select>
                 </div>
               </div>

               <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">نطاق اللجان المسؤول عنها (وصف)</label>
                  <div className="flex gap-2">
                    <input type="text" value={headAssignment.committees_range} onChange={(e) => setHeadAssignment({...headAssignment, committees_range: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-amber-500 outline-none" placeholder="مثال: من لجنة 1 إلى لجنة 5 (الجناح الشرقي)" />
                    <button onClick={handleAssignHead} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 rounded-xl transition-all shadow-md">إضافة وتكليف</button>
                  </div>
               </div>

               {headAssignment.timetable_id && (
                 <div className="mt-8">
                    <h4 className="text-sm font-black text-slate-800 mb-4 bg-slate-100 p-2 rounded-lg">الرؤساء المكلفين بهذه المادة:</h4>
                    <div className="space-y-3">
                       {currentHeads.length > 0 ? currentHeads.map(head => (
                          <div key={head.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black">
                                   {head.users?.avatar_url ? <img src={head.users.avatar_url} className="w-full h-full rounded-full object-cover" alt="img" /> : <Crown className="w-5 h-5"/>}
                                </div>
                                <div>
                                   <p className="font-black text-slate-800 text-sm">{head.users?.full_name}</p>
                                   <p className="font-bold text-amber-600 text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 inline-block">{head.committees_range}</p>
                                </div>
                             </div>
                             <button onClick={() => handleDeleteHead(head.id)} className="p-2 bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       )) : <p className="text-center text-xs font-bold text-slate-400 py-4">لم يتم تكليف أي رئيس لجان لهذه المادة بعد.</p>}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isCommitteeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCommitteeModalOpen(false)}>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}}>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600"/> تكليف مراقب ({selectedCommittee.name})
              </h3>
              <button onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
              <div className="relative mb-4 shrink-0">
                 <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                 <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500" placeholder="ابحث عن اسم معلم، أو مادة يدرسها..." value={teacherSearchTerm} onChange={(e) => setTeacherSearchTerm(e.target.value)} />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                 {sortedAndFilteredTeachers.map((t, index) => {
                    const tId = String(t?.id || `temp-${index}`);
                    const assignedComms = getTeacherAssignments(tId);
                    const isInThisCommittee = assignedComms.some(c => c?.committee_id === selectedCommittee?.id);
                    const isSelected = selectedTeacherId === tId;
                    const safeAvatarUrl = t?.avatar_url ? `${t.avatar_url}?t=${new Date().getTime()}` : null;

                    return (
                       <div key={tId} onClick={() => !isInThisCommittee && setSelectedTeacherId(tId)} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isInThisCommittee ? "bg-slate-100 opacity-60 cursor-not-allowed" : isSelected ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white hover:border-indigo-300 cursor-pointer"}`}>
                          <div className="flex items-center gap-3">
                             <div className="relative group/avatar cursor-pointer" onClick={(e) => { e.stopPropagation(); triggerAvatarUpload(tId); }} title="رفع وتعديل الصورة">
                               {safeAvatarUrl ? <img src={safeAvatarUrl} crossOrigin="anonymous" className="w-10 h-10 rounded-full object-cover shrink-0" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">{String(t?.full_name).charAt(0) || 'م'}</div>}
                               <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"><Camera className="w-4 h-4 text-white" /></div>
                             </div>
                             <div>
                                <p className="text-sm font-black text-slate-800">{t?.full_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">المواد: {t?.subjectsStr}</p>
                             </div>
                          </div>
                          <div className="shrink-0 text-left">
                             {isInThisCommittee ? <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-1 rounded">موجود باللجنة</span> : assignedComms.length === 0 ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">🟢 متاح</span> : <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded">🟠 مكلف بـ {assignedComms.length} لجنة</span>}
                          </div>
                       </div>
                    );
                 })}
                 {sortedAndFilteredTeachers.length === 0 && <p className="text-center text-sm font-bold text-slate-400 py-8">لا يوجد معلمين.</p>}
              </div>

              {selectedTeacherId && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3 mt-4 shrink-0 overflow-hidden">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-xs font-black text-amber-800 mb-1">معلومات للإدارة:</p>
                       <p className="text-[11px] font-bold text-amber-700 leading-relaxed">هذا المعلم يقوم بتدريس: <span className="font-black bg-amber-100 px-1.5 rounded">{selectedTeacherSubjects}</span>.</p>
                    </div>
                 </div>
              )}

              <div className="pt-4 shrink-0">
                <button onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> تأكيد التكليف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}>
           <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                       <DoorOpen className="w-6 h-6 text-indigo-600"/> استعراض {selectedCommittee.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">السعة: {selectedCommittee.capacity} | إجمالي الطلاب: {viewCommitteeDetails.students.length}</p>
                 </div>
                 <button onClick={() => setIsViewModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-6 h-6"/></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                 <div>
                    <h4 className="text-sm font-black text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg flex justify-between items-center mb-3">
                       <span>قائمة الطلاب الموزعين وإجراءات النقل</span>
                       <span className="text-xs font-bold text-emerald-600">{viewCommitteeDetails.students.length} طالب</span>
                    </h4>
                    
                    {viewCommitteeDetails.students.length > 0 ? (
                       <table className="w-full border-collapse border border-slate-200 text-right text-sm rounded-xl overflow-hidden shadow-sm">
                         <thead className="bg-slate-100">
                           <tr>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">رقم الجلوس</th>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">اسم الطالب</th>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700">الصف</th>
                             <th className="p-3 border-b border-slate-200 font-black text-slate-700 text-center">إجراء النقل اليدوي</th>
                           </tr>
                         </thead>
                         <tbody>
                           {viewCommitteeDetails.students.map((s, idx) => {
                             const stdAvatar = s.students?.users?.avatar_url || s.students?.users?.[0]?.avatar_url;
                             const stdName = String(s.students?.users?.full_name || s.students?.users?.[0]?.full_name || 'طالب');
                             const stdInitial = stdName.charAt(0) || 'ط';
                             
                             const fullClassName = getFullClassName(s.students);
                             const safeStdAvatar = stdAvatar ? `${stdAvatar}?t=${new Date().getTime()}` : null;

                             return (
                               <tr key={s.seat_number || `std-${idx}`} className="even:bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                                 <td className="p-3 border-b border-slate-100 font-black text-indigo-600 tracking-widest">{s.seat_number}</td>
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                                    {safeStdAvatar ? (
                                      <img src={safeStdAvatar} crossOrigin="anonymous" className="w-6 h-6 rounded-full object-cover shrink-0" alt="std" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-black shrink-0">{stdInitial}</div>
                                    )}
                                    <span className="truncate">{stdName}</span>
                                 </td>
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-500">{fullClassName}</td>
                                 <td className="p-3 border-b border-slate-100 text-center">
                                    <select 
                                       className="bg-white border border-slate-200 text-indigo-700 text-[10px] font-black rounded-lg px-2 py-1.5 outline-none hover:border-indigo-400 cursor-pointer shadow-sm transition-all"
                                       onChange={(e) => {
                                         if(e.target.value && confirm('تأكيد نقل هذا الطالب إلى ' + e.target.options[e.target.selectedIndex].text + '؟')) {
                                           handleMoveStudent(s.student_id, e.target.value);
                                         }
                                       }}
                                       defaultValue=""
                                    >
                                       <option value="" disabled>🔄 نقل إلى لجنة...</option>
                                       {committees.filter(c => c.id !== selectedCommittee.id).map(c => (
                                         <option key={c.id} value={c.id}>{c.name}</option>
                                       ))}
                                    </select>
                                 </td>
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
           </div>
        </div>
      )}

      {/* 🖨️ قوالب الطباعة (مخفية) */}
      {printData && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, pointerEvents: 'none' }}>
          <div ref={printRef} className="flex flex-col gap-10" dir="rtl">
            
            {/* 📄 هويات المراقبين (PVC Layout) */}
            {printType === 'invigilator_ids' && chunkArray(printData.invigilators, 6).map((invigChunk, pageIndex) => (
              <div key={pageIndex} className="print-page-wrapper bg-white mx-auto relative" style={{ width: '794px', height: '1122px', padding: '40px', boxSizing: 'border-box' }}>
                <div className="flex flex-wrap gap-8 justify-center content-start">
                  {invigChunk.map((invig:any) => {
                    const invAvatar = invig.users?.avatar_url || invig.users?.[0]?.avatar_url;
                    const invName = invig.users?.full_name || invig.users?.[0]?.full_name;
                    const safeAvatar = invAvatar ? `${invAvatar}?t=${new Date().getTime()}` : null;
                    
                    const qrPayload = `raf-id:${invig.teacher_id}`;
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                      <div key={invig.id} className="w-[60mm] h-[95mm] border-[3px] border-slate-900 rounded-2xl relative overflow-hidden flex flex-col items-center text-center shadow-lg bg-white" style={{ pageBreakInside: 'avoid' }}>
                        <div className="absolute top-0 left-0 w-full h-[30mm] bg-slate-900 shrink-0 flex flex-col items-center justify-start pt-3">
                           <p className="text-white font-black text-[13px] mt-1">مدرسة الرفعة النموذجية</p>
                           <p className="text-emerald-400 font-bold text-[10px] mt-1">هوية مراقب معتمد</p>
                        </div>
                        <div className="relative z-10 w-[22mm] h-[22mm] mt-[18mm] mb-2 rounded-full bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                           {safeAvatar ? <img src={safeAvatar} crossOrigin="anonymous" alt="Teacher" className="w-full h-full object-cover" /> : <UserPlus className="w-8 h-8 text-slate-300" />}
                        </div>
                        <div className="relative z-10 w-full px-3 flex-1 flex flex-col items-center">
                           <h2 className="text-[16px] font-black text-slate-900 mb-1 leading-tight line-clamp-2">{invName}</h2>
                           <p className="text-[10px] font-bold text-slate-500 mb-2 border-b border-slate-200 pb-2 w-full">وزارة التربية - لجان الامتحانات</p>
                           <div className="mt-auto mb-3 flex flex-col items-center">
                              <div className="w-[20mm] h-[20mm] bg-white p-1 rounded-lg border border-slate-300 mb-1"><img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" /></div>
                              <p className="text-[8px] font-black text-slate-400">امسح الكود للتحقق</p>
                           </div>
                        </div>
                        <div className="w-full h-2 bg-emerald-500 shrink-0"></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* 📄 بطاقات الطاولة للطلاب (Desk Cards) */}
            {printType === 'desk_cards' && chunkArray(printData.students, 6).map((studentChunk, pageIndex) => (
              <div key={pageIndex} className="print-page-wrapper bg-white mx-auto" style={{ width: '794px', height: '1122px', padding: '20px', boxSizing: 'border-box' }}>
                <div className="flex flex-wrap gap-4 justify-center">
                  {studentChunk.map((student:any) => {
                    const stdName = student.students?.users?.full_name || student.students?.users?.[0]?.full_name || 'غير معروف';
                    const fullClassName = getFullClassName(student.students);
                    const qrPayload = `raf-id:${student.student_id}`; 
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                      <div key={student.seat_number} className="w-[85mm] h-[55mm] border-2 border-slate-800 rounded-xl relative overflow-hidden flex flex-col bg-white" style={{ pageBreakInside: 'avoid' }}>
                        <div className="h-[12mm] bg-slate-900 text-white flex items-center justify-between px-4 shrink-0">
                           <span className="font-black text-sm">مدرسة الرفعة النموذجية</span>
                           <span className="font-bold text-[10px] text-amber-400">بطاقة جلوس اختبار</span>
                        </div>
                        <div className="p-3 flex gap-3 flex-1">
                           <div className="flex-1 flex flex-col justify-center">
                             <p className="text-[10px] font-bold text-slate-500 mb-0.5">اسم الطالب</p>
                             <h3 className="font-black text-sm text-slate-900 leading-tight mb-2 line-clamp-2">{stdName}</h3>
                             <p className="text-[10px] font-bold text-slate-500 mb-0.5">الصف والشعبة</p>
                             <p className="font-black text-xs text-indigo-700">{fullClassName}</p>
                           </div>
                           <div className="flex flex-col items-center justify-center shrink-0 w-[25mm]">
                             <div className="w-full text-center border-b border-slate-200 pb-1 mb-2">
                               <p className="text-[8px] font-black text-slate-400">رقم الجلوس</p>
                               <p className="font-black text-2xl text-rose-600 tracking-widest">{student.seat_number}</p>
                             </div>
                             <div className="w-[18mm] h-[18mm] p-0.5 bg-white border border-slate-200 rounded"><img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" /></div>
                           </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}
      
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}
