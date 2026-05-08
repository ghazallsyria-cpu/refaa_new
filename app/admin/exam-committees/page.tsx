// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, FileText, Printer, ShieldCheck, 
  Settings, Loader2, Search, Trash2, PrinterIcon, IdCard, DoorOpen, LayoutGrid, CheckCircle2, Download, X, Edit3, Plus, Eye, AlertTriangle, Contact, BarChart2,
  Camera, UploadCloud, Crown, BookOpen
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

  const { isLoading: isEngineLoading, progressMsg, buildCommittees, nukeEverything, generateSeatingAndDistribute } = useExamSeating();
  
  const [committees, setCommittees] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [allocationsStats, setAllocationsStats] = useState<any>({});
  const [timetables, setTimetables] = useState<any[]>([]);
  const [allHeads, setAllHeads] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({ g10: 0, g11: 0, totalAllocated: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'management' | 'statistics'>('management');
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHeadsModalOpen, setIsHeadsModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState(''); 
  const [builderData, setBuilderData] = useState({ count: 21, capacity: 14 });
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
      
      const sortedComms = (comms || []).sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const { data: tchrs } = await supabase.from('teachers').select(`id, users(full_name, avatar_url), teacher_subjects(subjects(name))`);
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, users(full_name, avatar_url)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('committee_id, student_id').eq('academic_year', currentYear).eq('semester', currentSemester);
      const { data: exams } = await supabase.from('exam_timetables').select('id, exam_date, subjects(name), class_level').eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date');
      const { data: hds } = await supabase.from('exam_committee_heads').select('*, users(full_name), exam_timetables(exam_date, subjects(name))');
      const { data: stds } = await supabase.from('students').select('id, sections(classes(level))');

      const stats: any = {};
      if (allocs) { allocs.forEach((a: any) => { stats[a.committee_id] = (stats[a.committee_id] || 0) + 1; }); }

      let g10 = 0, g11 = 0;
      (stds || []).forEach((s:any) => {
        const lvl = s.sections?.classes?.level;
        if(lvl === 10) g10++; if(lvl === 11) g11++;
      });
      setStudentStats({ g10, g11, totalAllocated: allocs?.length || 0 });

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
      setAllHeads(hds || []);
    } catch (error) { console.error('Error fetching data:', error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (currentRole === 'admin' || currentRole === 'management') fetchData(); }, [currentRole]);

  const fetchHeads = async (timetableId: string) => {
    if (!timetableId) return;
    try {
      const { data, error } = await supabase.from('exam_committee_heads').select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name, avatar_url)').eq('timetable_id', timetableId);
      if (error) console.error(error);
      setCurrentHeads(data || []);
    } catch (e) { console.error(e); }
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
      fetchData();
      alert('تم التكليف بنجاح!');
    } catch (error) { console.error(error); alert('حدث خطأ! قد يكون هذا المعلم مكلفاً مسبقاً في نفس التوقيت.'); }
  };

  const handleDeleteHead = async (id: string) => {
    if (!confirm('هل أنت متأكد من إزالة التكليف؟')) return;
    await supabase.from('exam_committee_heads').delete().eq('id', id);
    fetchHeads(headAssignment.timetable_id);
    fetchData();
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

  const handleNuclear = async () => {
    if (!confirm('سيتم هدم اللجان ومسح توزيع الطلاب والمراقبين بالكامل! تأكيد؟')) return;
    const ok = await nukeEverything(currentYear, currentSemester);
    if(ok) { alert('تم الهدم الشامل بنجاح'); fetchData(); }
  };

  const handleBuild = async () => {
    setIsBuilderModalOpen(false);
    const ok = await buildCommittees(currentYear, currentSemester, builderData.count, builderData.capacity);
    if(ok) fetchData();
  };

  const handleSoftReset = async () => {
    if (!confirm('تفريغ جميع الطلاب؟ ستبقى أسماء اللجان والمراقبين كما هي.')) return;
    try { 
      setIsLoading(true); 
      await supabase.from('student_seat_allocations').delete().eq('academic_year', currentYear).eq('semester', currentSemester); 
      fetchData(); 
      alert('تم تفريغ مقاعد الطلاب بنجاح!');
    } catch (error) { 
      alert('خطأ أثناء التصفير'); 
    } finally {
      setIsLoading(false);
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
    if (!confirm('هل أنت متأكد من بدء التوزيع الأبجدي والسحّاب لعاشر وحادي عشر؟ (سيمسح أي توزيع سابق)')) return;
    const result = await generateSeatingAndDistribute(currentYear, currentSemester);
    if (result.success) { alert('تم التوزيع بنجاح!'); fetchData(); }
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

  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards' | 'invigilator_ids') => {
    setIsPrinting(true);
    try {
      const { data } = await supabase.from('student_seat_allocations').select(`seat_number, student_id, students ( id, users(full_name, avatar_url), sections(name, classes(name, level)) )`).eq('committee_id', committeeId).order('seat_number', { ascending: true });
      const committee = committees.find(c => c.id === committeeId);
      const committeeInvigs = invigilators.filter(i => i.committee_id === committeeId);
      
      if (type !== 'invigilator_ids' && (!data || data.length === 0)) { alert('لا يوجد طلاب!'); setIsPrinting(false); return; }
      if (type === 'invigilator_ids' && committeeInvigs.length === 0) { alert('لا يوجد مراقبون!'); setIsPrinting(false); return; }

      setPrintData({ students: data || [], committee, invigilators: committeeInvigs }); 
      setPrintType(type);

      setTimeout(async () => {
        if (!printRef.current) return;
        try {
          window.scrollTo(0, 0); const isMobile = window.innerWidth < 768;
          const pages = printRef.current.querySelectorAll('.print-page-wrapper');
          if (pages.length === 0) return;
          const pdf = new jsPDF('p', 'mm', 'a4');
          for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i] as HTMLElement, { scale: isMobile ? 1.5 : 2, useCORS: true, allowTaint: false, logging: false, width: 794, height: 1122, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/jpeg', 1.0); // استخدام جودة عالية للطباعة 
            const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); 
            if (i > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          }
          let fileName = 'مستند';
          if (type === 'door_sheet') fileName = `كشف_مناداة_${committee.name}`;
          if (type === 'desk_cards') fileName = `بطاقات_طاولة_${committee.name}`;
          if (type === 'invigilator_ids') fileName = `هويات_المراقبين_الذكية`;
          pdf.save(`${fileName}.pdf`);
        } catch (err: any) { alert('حدث خطأ أثناء معالجة الصور.'); } finally { setPrintData(null); setPrintType(null); setIsPrinting(false); }
      }, 3000); 
    } catch (e) {
      alert('خطأ في تحضير الطباعة');
      setIsPrinting(false);
    }
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

  const selectedTeacherData = teachers.find(t => t.id === selectedTeacherId);
  const selectedTeacherSubjects = selectedTeacherData?.subjectsStr || 'غير محدد';
  const totalTeachers = teachers.length;
  const uniqueAssignedTeachers = new Set(invigilators.map(i => i.teacher_id)).size;
  const assignmentCoverage = totalTeachers > 0 ? Math.round((uniqueAssignedTeachers / totalTeachers) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo" dir="rtl">
      
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      { (isEngineLoading || isPrinting) && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
          <h2 className="text-xl font-black animate-pulse text-center px-4">{isPrinting ? 'جاري رسم ومعالجة قوالب الطباعة عالية الدقة...' : progressMsg}</h2>
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

      <div className="max-w-7xl mx-auto space-y-6 relative">
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><LayoutGrid className="w-8 h-8 text-indigo-600" /> كنترول الامتحانات</h1>
              <p className="text-slate-500 font-bold text-sm mt-1">توزيع أبجدي مزدوج (سحّاب) - صف 10 و 11</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('management')} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='management' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>الإدارة واللجان</button>
              <button onClick={() => setActiveTab('statistics')} className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='statistics' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>إحصائيات التدوير</button>
            </div>
          </div>

          {activeTab === 'statistics' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100"><p className="text-xs font-bold text-emerald-600 mb-1">طلاب العاشر المتاحين</p><p className="text-3xl font-black text-emerald-800">{studentStats.g10}</p></div>
                 <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100"><p className="text-xs font-bold text-blue-600 mb-1">طلاب الحادي عشر</p><p className="text-3xl font-black text-blue-800">{studentStats.g11}</p></div>
                 <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100"><p className="text-xs font-bold text-indigo-600 mb-1">إجمالي الموزعين باللجان</p><p className="text-3xl font-black text-indigo-800">{studentStats.totalAllocated}</p></div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                 <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500"/> سجل رؤساء اللجان (حسب التواريخ)</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">التاريخ</th><th className="p-3">المادة</th><th className="p-3">المعلم رئيس اللجان</th><th className="p-3">النطاق</th></tr></thead>
                      <tbody>
                        {allHeads.map(h => (
                          <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="p-3 font-bold">{h.exam_timetables?.exam_date}</td><td className="p-3">{h.exam_timetables?.subjects?.name}</td><td className="p-3 font-black text-indigo-700">{h.users?.full_name}</td><td className="p-3">{h.committees_range}</td></tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {committees.length === 0 ? (
                  <button onClick={() => setIsBuilderModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> بناء هندسي للجان</button>
                ) : (
                  <>
                    <button onClick={handleDistribute} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"><Users className="w-5 h-5" /> توزيع السحّاب</button>
                    <button onClick={() => setIsHeadsModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-black rounded-xl flex justify-center items-center gap-2"><Crown className="w-5 h-5" /> رؤساء اللجان</button>
                    <button onClick={() => openCommitteeModal()} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> إضافة لجنة</button>
                    <button onClick={handleSoftReset} className="flex-1 sm:flex-none px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black rounded-xl flex justify-center items-center gap-2"><Trash2 className="w-5 h-5" /> تفريغ المقاعد</button>
                    <button onClick={handleNuclear} className="flex-1 sm:flex-none px-6 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black rounded-xl flex justify-center items-center gap-2 mr-auto"><AlertTriangle className="w-5 h-5" /> هدم اللجان</button>
                  </>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {committees.map(committee => {
                    const stdCount = allocationsStats[committee.id] || 0;
                    const commInvigs = invigilators.filter(i => i.committee_id === committee.id);
                    const isFull = stdCount >= committee.capacity;
                    const isOverflow = committee.name.includes('الفائض');

                    return (
                      <div key={committee.id} className={`bg-white rounded-2xl p-5 border ${isOverflow ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} shadow-sm flex flex-col`}>
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className={`text-lg font-black ${isOverflow ? 'text-rose-700' : 'text-slate-800'}`}>{committee.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">السعة: {committee.capacity} {committee.location && `| ${committee.location}`}</p>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => openViewModal(committee)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Eye className="w-4 h-4"/></button>
                             <button onClick={() => openCommitteeModal(committee)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                             <button onClick={() => handleDeleteCommittee(committee.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>

                        <div className="flex-1 mb-4">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-black text-slate-500">المراقبون ({commInvigs.length}/2)</p>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isOverflow ? 'bg-rose-200 text-rose-800' : isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{stdCount} طالب</span>
                          </div>
                          <div className="space-y-2">
                            {commInvigs.map(inv => (
                              <div key={inv.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-xs font-bold text-slate-700 truncate px-1">{inv.users?.full_name || 'معلم'}</span>
                                <button onClick={async () => { await supabase.from('committee_invigilators').delete().eq('id', inv.id); fetchData(); }} className="text-rose-400 hover:text-rose-600 p-1"><X className="w-3 h-3"/></button>
                              </div>
                            ))}
                            {commInvigs.length < 2 && (
                              <button onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }} className="w-full py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50"><UserPlus className="w-3 h-3 inline mr-1" /> إضافة مراقب</button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-100">
                          <button onClick={() => printDocument(committee.id, 'door_sheet')} className="col-span-2 bg-slate-800 text-white text-[10px] font-black py-2 rounded-lg hover:bg-slate-700"><PrinterIcon className="w-3 h-3 inline mr-1"/> كشف الباب</button>
                          <button onClick={() => printDocument(committee.id, 'desk_cards')} className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2 rounded-lg"><IdCard className="w-3 h-3 inline mr-1"/> الطاولة</button>
                          <button onClick={() => printDocument(committee.id, 'invigilator_ids')} className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-2 rounded-lg"><Contact className="w-3 h-3 inline mr-1"/> الهويات</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🚀 نافذة بناء اللجان الديناميكية (بحماية قصوى) */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-600"/> هندسة اللجان</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-600">كم عدد اللجان الإجمالي؟</label>
                <input type="number" min="1" max="100" value={builderData.count} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, count: isNaN(v) ? 1 : Math.min(100, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">سعة اللجنة الواحدة؟</label>
                <input type="number" min="1" max="50" value={builderData.capacity} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, capacity: isNaN(v) ? 1 : Math.min(50, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" />
                <p className="text-[10px] text-slate-400 text-center mt-1">السعة القصوى 50 طالب للجنة.</p>
              </div>
              <div className="flex gap-2 pt-2">
                 <button onClick={handleBuild} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700">بناء واعتماد</button>
                 <button onClick={() => setIsBuilderModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👤 نافذة تعيين المراقبين */}
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

      {/* 👁️ نافذة استعراض اللجنة ونقل الطلاب */}
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
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-500 text-xs">{fullClassName}</td>
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

      {/* 👑 نافذة رؤساء اللجان */}
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

      {/* ⚙️ نافذة تعديل / إضافة لجنة */}
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
                   <input type="number" min="1" max="50" value={editCommitteeData.capacity} onChange={e => setEditCommitteeData({...editCommitteeData, capacity: Math.min(50, Number(e.target.value))})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-700 outline-none focus:border-indigo-500" />
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

      {/* 🖨️ قوالب الطباعة المخفية (كشف الباب + بطاقات محسنة) */}
      {printData && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, pointerEvents: 'none' }}>
          <div ref={printRef} className="flex flex-col gap-10 bg-white" dir="rtl">
            
            {/* 📄 1. كشف الباب الرسمي (Door Sheet) - 🚀 التصحيح: الألوان الخالصة */}
            {printType === 'door_sheet' && (
              <div className="print-page-wrapper bg-white mx-auto relative p-10" style={{ width: '794px', height: '1122px' }}>
                 <div className="text-center mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-black text-black">وزارة التربية - إدارة التعليم الخاص</h1>
                    <h2 className="text-xl font-black text-black mt-1">مدرسة الرفعة النموذجية بنين (م-ث)</h2>
                    <h3 className="text-3xl font-black text-black mt-4 border-2 border-black inline-block px-8 py-2 bg-slate-100 rounded-2xl">{printData.committee.name}</h3>
                    <p className="text-sm font-bold text-black mt-2">كشف مناداة وحضور الطلاب - الفصل الدراسي الثاني 2025/2026</p>
                 </div>
                 <table className="w-full border-collapse border-2 border-black text-sm text-black">
                   <thead>
                     <tr className="bg-slate-100 border-b-2 border-black text-black">
                       <th className="border border-black p-3 w-12 text-black">م</th>
                       <th className="border border-black p-3 w-32 text-black">رقم الجلوس</th>
                       <th className="border border-black p-3 text-black">اسم الطالب الرباعي</th>
                       <th className="border border-black p-3 w-24 text-black">الصف</th>
                       <th className="border border-black p-3 w-24 text-black">توقيع الحضور</th>
                     </tr>
                   </thead>
                   <tbody>
                     {printData.students.map((s:any, i:number) => (
                       <tr key={i} className="border-b border-black h-12 text-black">
                         <td className="border border-black p-2 text-center font-bold text-black">{i + 1}</td>
                         <td className="border border-black p-2 text-center font-black text-lg tracking-widest text-black">{s.seat_number}</td>
                         <td className="border border-black p-2 font-bold px-4 text-black">{s.students?.users?.full_name || s.students?.users?.[0]?.full_name}</td>
                         <td className="border border-black p-2 text-center font-bold text-xs text-black">الصف {s.students?.sections?.classes?.level || s.students?.sections?.[0]?.classes?.level}</td>
                         <td className="border border-black p-2"></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 <div className="mt-10 flex justify-between px-10 text-black">
                    <div className="text-center"><p className="font-bold mb-8 text-black">المراقب الأول</p><p className="text-black">.................................</p></div>
                    <div className="text-center"><p className="font-bold mb-8 text-black">المراقب الثاني</p><p className="text-black">.................................</p></div>
                 </div>
              </div>
            )}

            {/* 📄 2. بطاقات الطاولة المحسنة */}
            {printType === 'desk_cards' && chunkArray(printData.students, 4).map((chunk, pageIdx) => (
              <div key={pageIdx} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-1 gap-8" style={{ width: '794px', height: '1122px' }}>
                 {chunk.map((student:any) => {
                    const stdName = student.students?.users?.full_name || student.students?.users?.[0]?.full_name || 'غير معروف';
                    const lvl = student.students?.sections?.classes?.level || student.students?.sections?.[0]?.classes?.level;
                    const className = lvl === 10 ? 'الصف العاشر' : 'الصف الحادي عشر';
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=raf-id:${student.student_id}&margin=0`;

                    return (
                       <div key={student.seat_number} className="w-full h-[60mm] border-4 border-slate-900 rounded-[2rem] flex flex-col overflow-hidden bg-white shadow-md relative" style={{ pageBreakInside: 'avoid' }}>
                          <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0">
                             <div className="flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                <div><h3 className="font-black text-lg">مدرسة الرفعة النموذجية بنين</h3><p className="text-[10px] text-slate-300">لجان الامتحانات الرسمية 2026</p></div>
                             </div>
                             <div className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black text-xl border-2 border-emerald-500">{printData.committee.name}</div>
                          </div>
                          <div className="flex p-6 gap-6 items-center flex-1">
                             <div className="w-[30mm] h-[30mm] p-1 border-2 border-slate-300 rounded-xl shrink-0"><img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" /></div>
                             <div className="flex-1">
                                <p className="text-sm font-bold text-slate-500 mb-1">اسم الطالب الرباعي</p>
                                <h2 className="text-3xl font-black text-slate-900 mb-4">{stdName}</h2>
                                <div className="inline-block bg-slate-100 border border-slate-300 px-4 py-2 rounded-lg font-black text-lg text-slate-700">{className}</div>
                             </div>
                             <div className="shrink-0 text-center border-r-2 border-slate-200 pr-6">
                                <p className="text-sm font-bold text-slate-500 mb-2">رقم الجلوس</p>
                                <p className="text-6xl font-black text-rose-600 tracking-tighter">{student.seat_number}</p>
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 3. هويات المراقبين */}
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
                           <p className="text-white font-black text-[13px] mt-1">مدرسة الرفعة النموذجية بنين</p>
                           <p className="text-emerald-400 font-bold text-[10px] mt-1">هوية مراقب معتمد</p>
                        </div>
                        <div className="relative z-10 w-[22mm] h-[22mm] mt-[18mm] mb-2 rounded-full bg-white border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                           {safeAvatar ? <img src={safeAvatar} crossOrigin="anonymous" alt="Teacher" className="w-full h-full object-cover" /> : <UserPlus className="w-8 h-8 text-slate-300" />}
                        </div>
                        <div className="relative z-10 w-full px-3 flex-1 flex flex-col items-center">
                           <h2 className="text-[16px] font-black text-slate-900 mb-1 leading-tight line-clamp-2">{invName}</h2>
                           <p className="text-[10px] font-bold text-slate-500 mb-2 border-b border-slate-200 pb-2 w-full">إدارة التعليم الخاص</p>
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

          </div>
        </div>
      )}
      
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}
