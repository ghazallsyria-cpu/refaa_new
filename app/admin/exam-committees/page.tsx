// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Settings, Loader2, Search, Trash2, PrinterIcon, 
  IdCard, DoorOpen, LayoutGrid, CheckCircle2, X, Edit3, Plus, Eye, AlertTriangle, 
  Contact, BarChart2, Camera, UploadCloud, Crown, Layers, Filter, CheckSquare, Info,
  AlertCircle, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating';
import { useAuth } from '@/context/auth-context';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import * as Dialog from '@radix-ui/react-dialog'; 

// =========================================================================
// 1. 🛡️ جدار الحماية (Error Boundary) لاصطياد الأخطاء ومنع الانهيار
// =========================================================================
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ errorInfo });
    console.error("🔥 ErrorBoundary Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-100 p-6 flex flex-col items-center justify-center font-sans" dir="ltr">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl border-4 border-rose-500">
            <h1 className="text-3xl font-black text-rose-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-8 h-8"/> Application Crashed!
            </h1>
            <p className="text-slate-600 font-bold mb-4">Please take a screenshot of this error and send it to the developer:</p>
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-auto max-h-[60vh] text-xs font-mono whitespace-pre-wrap">
              <p className="text-rose-400 font-bold text-sm mb-2">{String(this.state.error)}</p>
              {this.state.errorInfo?.componentStack}
            </div>
            <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =========================================================================
// 2. 🕵️‍♂️ الكونسول العائم (Floating Debug Console)
// =========================================================================
function FloatingConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setLogs(prev => [...prev, `[ERROR] ${msg}`]);
      origError.apply(console, args);
    };

    const handleRejection = (event: any) => setLogs(prev => [...prev, `[PROMISE] ${String(event.reason)}`]);
    const handleError = (event: any) => setLogs(prev => [...prev, `[WINDOW] ${String(event.message)}`]);
    
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);
    
    return () => {
      console.error = origError;
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (logs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full max-h-48 overflow-y-auto bg-black/95 text-emerald-400 p-4 z-[9999] text-[10px] sm:text-xs font-mono border-t-2 border-emerald-500 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]" dir="ltr">
      <div className="flex justify-between items-center text-white font-bold mb-2 sticky top-0 bg-black pb-2">
        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500"/> Live Debug Console</span>
        <button onClick={() => setLogs([])} className="text-rose-400 bg-rose-500/20 px-3 py-1 rounded hover:bg-rose-500 hover:text-white transition-colors">Clear</button>
      </div>
      {logs.map((l, i) => (
        <div key={i} className={`mb-1 border-b border-emerald-800/30 pb-1 break-words ${l.includes('[ERROR]') ? 'text-rose-400' : 'text-amber-400'}`}>
          {l}
        </div>
      ))}
    </div>
  );
}

// =========================================================================
// 3. 🚀 التطبيق الرئيسي (Main Component)
// =========================================================================
const BASE_ROLES = [
  { id: 'head', defaultName: 'رئيس الكنترول', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'secret_numbering', defaultName: 'مسؤول الأرقام السرية', icon: FileKey, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { id: 'data_entry', defaultName: 'مسؤول الرصد والإدخال', icon: MonitorCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'auditor', defaultName: 'مراجع ومُدقق الدرجات', icon: ClipboardSignature, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'archiver', defaultName: 'مسؤول الحفظ والأرشيف', icon: FileArchive, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
];

function ExamCommitteesControl() {
  const { authRole, userRole, user } = useAuth() as any;
  const currentRole = authRole || userRole;

  const { isLoading: isEngineLoading, progressMsg, buildCommittees, nukeEverything, generateSeatingAndDistribute } = useExamSeating();
  
  const [committees, setCommittees] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [allocationsStats, setAllocationsStats] = useState<any>({});
  const [timetables, setTimetables] = useState<any[]>([]);
  const [allHeads, setAllHeads] = useState<any[]>([]);
  
  const [studentStats, setStudentStats] = useState({ g10: 0, g11_sci: 0, g11_lit: 0, totalAllocated: 0 });
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [uniqueExamDates, setUniqueExamDates] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'management' | 'invigilators_radar' | 'heads_radar'>('management');
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHeadsModalOpen, setIsHeadsModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isClassPrintModalOpen, setIsClassPrintModalOpen] = useState(false);
  const [isReadExcuseModalOpen, setIsReadExcuseModalOpen] = useState(false);
  const [selectedExcuseData, setSelectedExcuseData] = useState<any>(null);
  
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState(''); 
  const [builderData, setBuilderData] = useState({ count: 21, capacity: 14 });
  const [editCommitteeData, setEditCommitteeData] = useState({ id: '', name: '', capacity: 14, location: '' });
  const [viewCommitteeDetails, setViewCommitteeDetails] = useState<{ students: any[], invigs: any[] }>({ students: [], invigs: [] });

  const [headAssignment, setHeadAssignment] = useState({ date: '', head_teacher_id: '' });
  const [selectedCommitteesForHead, setSelectedCommitteesForHead] = useState<string[]>([]);
  const [currentHeads, setCurrentHeads] = useState<any[]>([]);

  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [printType, setPrintType] = useState<'door_sheet' | 'desk_cards' | 'invigilator_ids' | 'class_cards' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const getFullClassName = (studentData: any) => {
    if (!studentData) return 'غير محدد';
    try {
      const secObj = Array.isArray(studentData?.sections) ? studentData?.sections[0] : studentData?.sections;
      const classObj = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;

      const classLvl = Number(classObj?.level || 0);
      const cName = String(classObj?.name || '');
      const sName = String(secObj?.name || '');
      const track = String(studentData?.next_year_track || '').toLowerCase();

      const isLiterary = track === 'literary' || cName.includes('أدبي') || cName.includes('ادبي') || sName.includes('أدبي') || sName.includes('ادبي');
      const isScientific = track === 'scientific' || cName.includes('علمي') || cName.includes('علمى') || sName.includes('علمي') || sName.includes('علمى');

      let classNameDisplay = '';
      if (classLvl === 10) classNameDisplay = 'العاشر';
      else if (classLvl === 11) classNameDisplay = isLiterary ? 'الحادي عشر أدبي' : (isScientific ? 'الحادي عشر علمي' : 'الحادي عشر');
      else if (classLvl === 12) classNameDisplay = isLiterary ? 'الثاني عشر أدبي' : (isScientific ? 'الثاني عشر علمي' : 'الثاني عشر');
      else classNameDisplay = cName || 'صف غير محدد';

      const cleanSecName = sName.replace(/أدبي|ادبي|علمي|علمى/g, '').replace(/-/g, '').trim();

      return `${classNameDisplay} ${cleanSecName ? '- شعبة ' + cleanSecName : ''}`.trim();
    } catch (e) {
      return 'غير محدد';
    }
  };

  const getSafeName = (userObj: any) => {
    if (!userObj) return 'غير معروف';
    try {
      const name = Array.isArray(userObj) ? userObj[0]?.full_name : userObj?.full_name;
      return String(name || 'غير معروف');
    } catch (e) {
      return 'غير معروف';
    }
  };

  const chunkArray = (arr: any[], size: number) => {
    if (!arr || !Array.isArray(arr)) return [];
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: comms } = await supabase.from('exam_committees').select('*').eq('academic_year', currentYear).eq('semester', currentSemester);
      const sortedComms = (comms || []).sort((a, b) => {
        const numA = parseInt(String(a?.name || '').replace(/\D/g, '')) || 0;
        const numB = parseInt(String(b?.name || '').replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const { data: tchrs } = await supabase.from('teachers').select(`id, users(full_name, avatar_url), teacher_subjects(subjects(name))`);
      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, status, excuse_reason, signed_at, users(full_name, avatar_url)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('committee_id, student_id, students(next_year_track, sections(name, classes(level, name)))').eq('academic_year', currentYear).eq('semester', currentSemester);
      const { data: exams } = await supabase.from('exam_timetables').select('id, exam_date, subjects(name), class_level').eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date');
      const { data: hds } = await supabase.from('exam_committee_heads').select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name), exam_timetables(exam_date, subjects(name))');
      const { data: stds } = await supabase.from('students').select('id, next_year_track, sections(name, classes(level, name))');

      const stats: Record<string, number> = {};
      const uniqueClassesSet = new Set<string>();

      if (allocs && Array.isArray(allocs)) { 
        allocs.forEach((a: any) => { 
          if(a?.committee_id) stats[a.committee_id] = (stats[a.committee_id] || 0) + 1; 
          const cName = getFullClassName(a?.students);
          if(cName && !cName.includes('غير محدد')) uniqueClassesSet.add(cName);
        }); 
      }

      let g10 = 0, g11_sci = 0, g11_lit = 0;
      (stds || []).forEach((s:any) => {
        if (!s) return;
        const secObj = Array.isArray(s?.sections) ? s.sections[0] : s?.sections;
        const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;

        const lvl = Number(classObj?.level || 0);
        const cName = String(classObj?.name || '');
        const sName = String(secObj?.name || '');
        const track = String(s?.next_year_track || '').toLowerCase();

        if (lvl === 10) {
            g10++; 
        } else if (lvl === 11) {
            if (track === 'literary' || cName.includes('أدبي') || cName.includes('ادبي') || sName.includes('أدبي') || sName.includes('ادبي')) {
                g11_lit++;
            } else {
                g11_sci++;
            }
        }
      });
      
      setStudentStats({ g10, g11_sci, g11_lit, totalAllocated: allocs?.length || 0 });
      setAvailableClasses(Array.from(uniqueClassesSet).sort());

      const datesSet = new Set<string>();
      (exams || []).forEach(e => { if (e?.exam_date) datesSet.add(e.exam_date) });
      setUniqueExamDates(Array.from(datesSet).sort());

      const formattedTeachers = (tchrs || []).map((t: any, idx: number) => {
        if (!t) return null;
        const u = Array.isArray(t?.users) ? t.users[0] : t?.users;
        const subjects = Array.isArray(t?.teacher_subjects) ? t.teacher_subjects.map((s:any) => s?.subjects?.name).filter(Boolean).join('، ') : 'غير محدد';
        return { id: String(t?.id || `t-${idx}`), full_name: String(u?.full_name || 'بدون اسم'), avatar_url: u?.avatar_url || null, subjectsStr: subjects };
      }).filter(Boolean);

      setCommittees(sortedComms);
      setTeachers(formattedTeachers);
      setInvigilators(Array.isArray(invigs) ? invigs : []);
      setAllocationsStats(stats);
      setTimetables(Array.isArray(exams) ? exams : []);
      setAllHeads(Array.isArray(hds) ? hds : []);
    } catch (error) { 
      console.error('Error fetching data:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { if (['admin', 'management'].includes(String(currentRole))) fetchData(); }, [currentRole]);

  const fetchHeadsByDate = async (date: string) => {
    if (!date) { setCurrentHeads([]); setSelectedCommitteesForHead([]); return; }
    try {
      const { data } = await supabase.from('exam_committee_heads')
        .select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name, avatar_url), exam_timetables!inner(exam_date)')
        .eq('exam_timetables.exam_date', date);
      
      const uniqueHeadsMap = new Map();
      (data || []).forEach(h => {
         if(h?.head_teacher_id && !uniqueHeadsMap.has(h.head_teacher_id)) {
            uniqueHeadsMap.set(h.head_teacher_id, h);
         }
      });

      setCurrentHeads(Array.from(uniqueHeadsMap.values()));
      setSelectedCommitteesForHead([]); 
    } catch (e) { console.error(e); }
  };

  const toggleCommitteeSelectionForHead = (commName: string) => {
    if(!commName) return;
    if(selectedCommitteesForHead.includes(commName)) {
      setSelectedCommitteesForHead(selectedCommitteesForHead.filter(c => c !== commName));
    } else {
      setSelectedCommitteesForHead([...selectedCommitteesForHead, commName]);
    }
  };

  const handleAssignHead = async () => {
    if (!headAssignment.date || !headAssignment.head_teacher_id || selectedCommitteesForHead.length === 0) {
      alert('يرجى اختيار التاريخ، المعلم، وتحديد اللجان المسؤولة!'); return;
    }
    try {
      setIsLoading(true);
      const committeesRangeStr = selectedCommitteesForHead.join('، ');
      const timetablesForDate = timetables.filter(t => t?.exam_date === headAssignment.date);
      
      if(timetablesForDate.length === 0) throw new Error("لا توجد امتحانات مبرمجة في هذا التاريخ!");

      const inserts = timetablesForDate.map(t => ({
        timetable_id: t?.id,
        head_teacher_id: headAssignment.head_teacher_id,
        committees_range: committeesRangeStr
      })).filter(i => i.timetable_id);
      
      const { error } = await supabase.from('exam_committee_heads').insert(inserts);
      if (error) throw error;

      setHeadAssignment({...headAssignment, head_teacher_id: ''});
      setSelectedCommitteesForHead([]); 
      fetchHeadsByDate(headAssignment.date);
      fetchData();
      alert('تم التكليف بنجاح!');
    } catch (error: any) { alert('حدث خطأ! ' + error.message); } finally { setIsLoading(false); }
  };

  const handleDeleteHead = async (headTeacherId: string, date: string) => {
    if (!confirm('هل أنت متأكد من إزالة التكليف عن هذا المعلم لهذا اليوم؟')) return;
    try {
      setIsLoading(true);
      const ttIds = timetables.filter(t => t?.exam_date === date).map(t => t?.id).filter(Boolean);
      const { error } = await supabase.from('exam_committee_heads').delete().eq('head_teacher_id', headTeacherId).in('timetable_id', ttIds);
      if (error) throw error;
      fetchHeadsByDate(headAssignment.date);
      fetchData();
    } catch (e) { alert('حدث خطأ أثناء الحذف'); } finally { setIsLoading(false); }
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
        alert('تم رفع الصورة بنجاح!'); fetchData();
      } else throw new Error('فشل الرفع');
    } catch (error) { alert('خطأ أثناء رفع الصورة.'); } finally { setIsUploadingAvatar(false); setTargetUserId(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleMoveStudent = async (studentId: string, newCommitteeId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.from('student_seat_allocations').update({ committee_id: newCommitteeId }).eq('student_id', studentId).eq('academic_year', currentYear).eq('semester', currentSemester);
      if (error) throw error;
      alert('تم نقل الطالب!'); setIsViewModalOpen(false); fetchData();
    } catch (error) { alert('خطأ أثناء النقل.'); } finally { setIsLoading(false); }
  };

  const handleSaveCommittee = async () => {
    if (!String(editCommitteeData.name || '').trim()) { alert('يرجى إدخال اسم اللجنة'); return; }
    try {
      if (editCommitteeData.id) await supabase.from('exam_committees').update({ name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location }).eq('id', editCommitteeData.id);
      else await supabase.from('exam_committees').insert({ name: editCommitteeData.name, capacity: editCommitteeData.capacity, location: editCommitteeData.location, academic_year: currentYear, semester: currentSemester });
      setIsCommitteeModalOpen(false); fetchData();
    } catch (error) { alert('خطأ في الحفظ'); }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm('تأكيد الحذف؟')) return;
    try { await supabase.from('exam_committees').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ في الحذف'); }
  };

  const handleNuclear = async () => {
    if (!confirm('سيتم هدم اللجان ومسح التوزيع بالكامل! تأكيد؟')) return;
    const ok = await nukeEverything(currentYear, currentSemester);
    if(ok) { alert('تم الهدم الشامل بنجاح'); fetchData(); }
  };

  const handleBuild = async () => {
    setIsBuilderModalOpen(false);
    const ok = await buildCommittees(currentYear, currentSemester, builderData.count, builderData.capacity);
    if(ok) fetchData();
  };

  const handleDistribute = async () => {
    if (!confirm('هل أنت متأكد من التوزيع؟')) return;
    const result = await generateSeatingAndDistribute(currentYear, currentSemester);
    if (result?.success) { alert('تم التوزيع بنجاح!'); fetchData(); }
  };

  const handleSoftReset = async () => {
    if (!confirm('تفريغ جميع الطلاب؟')) return;
    try { setIsLoading(true); await supabase.from('student_seat_allocations').delete().eq('academic_year', currentYear).eq('semester', currentSemester); fetchData(); alert('تم تفريغ المقاعد!'); } catch (error) { alert('خطأ'); } finally { setIsLoading(false); }
  };

  const openCommitteeModal = (committee: any = null) => {
    if (committee) setEditCommitteeData({ id: committee.id, name: committee.name || '', capacity: committee.capacity || 14, location: committee.location || '' });
    else setEditCommitteeData({ id: '', name: `لجنة ${committees.length + 1}`, capacity: 14, location: '' });
    setIsCommitteeModalOpen(true);
  };

  const openViewModal = async (committee: any) => {
    if (!committee) return;
    setIsLoading(true); setSelectedCommittee(committee);
    try {
      const { data: students } = await supabase.from('student_seat_allocations').select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) )`).eq('committee_id', committee.id).order('seat_number', { ascending: true });
      const commInvigs = invigilators.filter(i => String(i?.committee_id) === String(committee.id));
      setViewCommitteeDetails({ students: students || [], invigs: commInvigs }); setIsViewModalOpen(true);
    } catch (error) { alert('خطأ في جلب البيانات'); } finally { setIsLoading(false); }
  };

  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee?.id) return;
    const currentInvigs = invigilators.filter(i => String(i?.committee_id) === String(selectedCommittee.id));
    if (currentInvigs.length >= 2) { alert('أقصى حد مراقبين 2!'); return; }
    if (invigilators.some(i => String(i?.teacher_id) === String(selectedTeacherId) && String(i?.committee_id) === String(selectedCommittee.id))) { alert('مكلف مسبقاً!'); return; }
    try { await supabase.from('committee_invigilators').insert({ committee_id: selectedCommittee.id, teacher_id: selectedTeacherId, status: 'pending' }); setIsAssignModalOpen(false); setSelectedTeacherId(''); setTeacherSearchTerm(''); fetchData(); } catch (error) { alert('خطأ في التكليف'); }
  };

  const handleRemoveInvigilator = async (id: string, name: string) => {
    if (!confirm(`إزالة المراقب (${name})؟`)) return;
    try { setIsReadExcuseModalOpen(false); await supabase.from('committee_invigilators').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ'); }
  };

  const openReadExcuseModal = (invig: any) => {
    if(!invig) return;
    setSelectedExcuseData(invig);
    setIsReadExcuseModalOpen(true);
  };

  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards' | 'invigilator_ids' | 'class_cards', classNameToPrint?: string) => {
    setIsPrinting(true);
    try {
      let query = supabase.from('student_seat_allocations')
        .select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) ), exam_committees ( name )`)
        .eq('academic_year', currentYear).eq('semester', currentSemester);

      if (type === 'door_sheet' || type === 'desk_cards') {
        query = query.eq('committee_id', committeeId).order('seat_number', { ascending: true });
      }

      const { data } = await query;
      let finalDataToPrint = Array.isArray(data) ? data : [];
      const committee = committees.find(c => String(c?.id) === String(committeeId)) || { name: 'لجنة غير محددة' };
      const committeeInvigs = committeeId ? invigilators.filter(i => String(i?.committee_id) === String(committeeId)) : [];
      
      if (type === 'class_cards' && classNameToPrint) {
        finalDataToPrint = finalDataToPrint.filter(s => getFullClassName(s?.students) === classNameToPrint);
        finalDataToPrint.sort((a, b) => {
           const nameA = getSafeName(a?.students?.users);
           const nameB = getSafeName(b?.students?.users);
           return nameA.localeCompare(nameB, 'ar');
        });
      }

      if (type !== 'invigilator_ids' && finalDataToPrint.length === 0) { alert('لا يوجد طلاب للطباعة!'); setIsPrinting(false); return; }
      if (type === 'invigilator_ids' && committeeInvigs.length === 0) { alert('لا يوجد مراقبون!'); setIsPrinting(false); return; }

      setPrintData({ students: finalDataToPrint, committee, invigilators: committeeInvigs, className: classNameToPrint }); 
      setPrintType(type);

      setTimeout(async () => {
        if (!printRef.current) { setIsPrinting(false); return; }
        try {
          window.scrollTo(0, 0); const isMobile = window.innerWidth < 768;
          const pages = printRef.current.querySelectorAll('.print-page-wrapper');
          if (pages.length === 0) { setIsPrinting(false); return; }
          const pdf = new jsPDF('p', 'mm', 'a4');
          for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i] as HTMLElement;
            const originalCssText = pageElement.style.cssText;
            pageElement.style.position = 'fixed'; pageElement.style.top = '0'; pageElement.style.left = '0'; pageElement.style.zIndex = '9999';

            const canvas = await html2canvas(pageElement, { scale: isMobile ? 1.5 : 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, scrollX: 0 });
            pageElement.style.cssText = originalCssText;
            const imgData = canvas.toDataURL('image/jpeg', 1.0); 
            const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); 
            if (i > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          }
          let fileName = 'مستند';
          if (type === 'door_sheet') fileName = `محضر_لجنة_${committee.name}`;
          if (type === 'desk_cards') fileName = `بطاقات_طاولة_${committee.name}`;
          if (type === 'class_cards') fileName = `بطاقات_طلاب_${classNameToPrint}`;
          if (type === 'invigilator_ids') fileName = `هويات_المراقبين_${committee.name}`;
          pdf.save(`${fileName}.pdf`);
        } catch (err: any) { alert('حدث خطأ أثناء بناء الـ PDF.'); } finally { setPrintData(null); setPrintType(null); setIsPrinting(false); setIsClassPrintModalOpen(false); }
      }, 3000); 
    } catch (e) { alert('خطأ في تحضير الطباعة'); setIsPrinting(false); }
  };

  if (currentRole !== 'admin' && currentRole !== 'management') return null;

  const getTeacherAssignments = (tId: string) => invigilators.filter(i => String(i?.teacher_id) === String(tId));
  const getTeacherHeadAssignments = (tId: string) => {
    const dates = new Set<string>();
    allHeads.forEach(h => { if(String(h?.head_teacher_id) === String(tId) && h?.exam_timetables?.exam_date) dates.add(h.exam_timetables.exam_date); });
    return Array.from(dates);
  };

  const filteredStaff = availableStaff.filter(s => {
    const isAlreadyInTeam = teamMembers.some(tm => String(tm?.user_id) === String(s?.id));
    const matchesSearch = String(s?.full_name || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
    return !isAlreadyInTeam && matchesSearch;
  });

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

  const alreadyAssignedCommittees = currentHeads.flatMap(h => String(h?.committees_range || '').split('، '));
  const selectedTeacherData = teachers.find(t => String(t?.id) === String(headAssignment?.head_teacher_id));
  const selectedTeacherHeadDates = selectedTeacherData ? getTeacherHeadAssignments(selectedTeacherData.id) : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo" dir="rtl">
      
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      { (isEngineLoading || isPrinting) && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
          <h2 className="text-xl font-black animate-pulse text-center px-4">{isPrinting ? 'جاري رسم ومعالجة قوالب الطباعة عالية الدقة...' : String(progressMsg || 'جاري التحميل')}</h2>
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
              <p className="text-slate-500 font-bold text-sm mt-1">توزيع أبجدي مزدوج (سحّاب) وإدارة المهام</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('management')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='management' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>الإدارة واللجان</button>
              <button onClick={() => setActiveTab('invigilators_radar')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='invigilators_radar' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>رادار المراقبين</button>
              <button onClick={() => setActiveTab('heads_radar')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='heads_radar' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>سجل رؤساء اللجان</button>
            </div>
          </div>

          {activeTab === 'invigilators_radar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white border border-slate-200 rounded-3xl p-6">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-500"/> رادار المراقبة (العدالة والتدوير)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                     {teachers.filter(t => getTeacherAssignments(String(t?.id)).length > 0).map((t, tIndex) => {
                       const invigDuties = getTeacherAssignments(String(t?.id));
                       return (
                         <div key={`tr-${tIndex}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0 text-xl border-2 border-white shadow-sm">
                               {t?.avatar_url ? <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full rounded-full object-cover" alt="avatar" /> : String(t?.full_name || 'م').charAt(0)}
                             </div>
                             <div>
                               <h4 className="font-black text-slate-800 text-sm">{String(t?.full_name || 'غير معروف')}</h4>
                               <p className="text-[10px] font-bold text-slate-500 mt-1">إجمالي المراقبات: <span className="text-emerald-600 font-black text-sm">{invigDuties.length}</span></p>
                             </div>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-slate-100 flex-1">
                             <p className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1">اللجان المُكلف بها:</p>
                             <div className="flex flex-col gap-2">
                               {invigDuties.map((duty, idx) => {
                                  const cName = committees.find(c => String(c?.id) === String(duty?.committee_id))?.name || 'غير معروف';
                                  return (
                                     <div key={`dty-${idx}`} className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                        <span className="text-xs font-black text-slate-700">{String(cName)}</span>
                                        {duty?.status === 'signed' ? <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> استلم</span> :
                                         duty?.status === 'excused' ? <button onClick={() => openReadExcuseModal(duty)} className="text-[9px] font-black text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors"><AlertCircle className="w-3 h-3"/> عرض العذر</button> :
                                         <span className="text-[9px] font-bold text-slate-400">بانتظار التوقيع</span>}
                                     </div>
                                  )
                               })}
                             </div>
                           </div>
                         </div>
                       )
                     })}
                     {teachers.filter(t => getTeacherAssignments(String(t?.id)).length > 0).length === 0 && <p className="text-slate-400 font-bold text-sm col-span-full text-center py-10">لم يتم تكليف أي مراقب حتى الآن.</p>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'heads_radar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white border border-slate-200 rounded-3xl p-6">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500"/> سجل وتاريخ رؤساء اللجان</h3>
                  <div className="overflow-x-auto">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-amber-50 text-amber-800">
                         <tr><th className="p-4 border-b border-amber-100">التاريخ</th><th className="p-4 border-b border-amber-100">المادة (اليوم)</th><th className="p-4 border-b border-amber-100">رئيس اللجان</th><th className="p-4 border-b border-amber-100">نطاق اللجان</th></tr>
                       </thead>
                       <tbody>
                         {allHeads.length > 0 ? allHeads.map((h, i) => (
                           <tr key={`hd-${i}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="p-4 font-black text-slate-600">{String(h?.exam_timetables?.exam_date || '-')}</td>
                             <td className="p-4 font-bold text-slate-700">{String(h?.exam_timetables?.subjects?.name || '-')}</td>
                             <td className="p-4 font-black text-indigo-700 flex items-center gap-2">
                               <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">{h?.users?.avatar_url ? <img src={h.users.avatar_url} className="w-full h-full object-cover"/> : <Crown className="w-4 h-4 m-2 text-slate-400"/>}</div>
                               {getSafeName(h?.users)}
                             </td>
                             <td className="p-4 text-xs font-bold text-amber-700">{String(h?.committees_range || '-')}</td>
                           </tr>
                         )) : <tr><td colSpan={4} className="text-center py-10 font-bold text-slate-400">لا توجد سجلات لرؤساء اللجان بعد.</td></tr>}
                       </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-emerald-600 mb-1">عاشر</p><p className="text-2xl font-black text-emerald-800">{Number(studentStats?.g10 || 0)}</p></div>
                 <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-blue-600 mb-1">11 علمي</p><p className="text-2xl font-black text-blue-800">{Number(studentStats?.g11_sci || 0)}</p></div>
                 <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-purple-600 mb-1">11 أدبي</p><p className="text-2xl font-black text-purple-800">{Number(studentStats?.g11_lit || 0)}</p></div>
                 <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-indigo-600 mb-1">إجمالي الموزعين</p><p className="text-2xl font-black text-indigo-800">{Number(studentStats?.totalAllocated || 0)}</p></div>
              </div>

              <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {committees.length === 0 ? (
                  <button onClick={() => setIsBuilderModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> بناء هندسي للجان</button>
                ) : (
                  <>
                    <button onClick={handleDistribute} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"><Users className="w-5 h-5" /> توزيع السحّاب</button>
                    <button onClick={() => setIsClassPrintModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl flex justify-center items-center gap-2 shadow-md border border-emerald-600"><Layers className="w-5 h-5" /> طباعة بطاقات الفصول</button>
                    <button onClick={() => setIsHeadsModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-black rounded-xl flex justify-center items-center gap-2"><Crown className="w-5 h-5" /> تكليف الرؤساء</button>
                    <button onClick={() => openCommitteeModal()} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> لجنة</button>
                    <button onClick={handleSoftReset} className="flex-1 sm:flex-none px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black rounded-xl flex justify-center items-center gap-2"><Trash2 className="w-5 h-5" /> تفريغ</button>
                    <button onClick={handleNuclear} className="flex-1 sm:flex-none px-6 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black rounded-xl flex justify-center items-center gap-2 mr-auto"><AlertTriangle className="w-5 h-5" /> هدم</button>
                  </>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {committees.map((committee: any, idx: number) => {
                    const stdCount = Number(allocationsStats[committee?.id] || 0);
                    const commInvigs = invigilators.filter(i => String(i?.committee_id) === String(committee?.id));
                    const isFull = stdCount >= Number(committee?.capacity || 0);
                    const isOverflow = String(committee?.name || '').includes('الفائض');

                    return (
                      <div key={`comm-${idx}`} className={`bg-white rounded-2xl p-5 border ${isOverflow ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} shadow-sm flex flex-col`}>
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className={`text-lg font-black ${isOverflow ? 'text-rose-700' : 'text-slate-800'}`}>{String(committee?.name || 'بدون اسم')}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">السعة: {Number(committee?.capacity || 0)} {committee?.location && `| ${String(committee.location)}`}</p>
                          </div>
                          <div className="flex gap-1">
                             <button onClick={() => openViewModal(committee)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Eye className="w-4 h-4"/></button>
                             <button onClick={() => openCommitteeModal(committee)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-200"><Edit3 className="w-4 h-4"/></button>
                             <button onClick={() => handleDeleteCommittee(committee?.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>

                        <div className="flex-1 mb-4">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-black text-slate-500">المراقبون ({commInvigs.length}/2)</p>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isOverflow ? 'bg-rose-200 text-rose-800' : isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{stdCount} طالب</span>
                          </div>
                          <div className="space-y-2">
                            {commInvigs.map((inv, iIdx) => {
                              const tName = getSafeName(inv?.users);
                              return (
                                <div key={`i-${iIdx}`} className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100 gap-1.5">
                                  <div className="flex justify-between items-center">
                                     <span className="text-xs font-bold text-slate-800 truncate pr-1">{tName}</span>
                                     <button onClick={() => handleRemoveInvigilator(inv?.id, tName)} className="text-slate-400 hover:text-rose-500 p-1"><X className="w-3 h-3"/></button>
                                  </div>
                                  
                                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-0.5">
                                     {inv?.status === 'signed' ? (
                                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> وقع الاستلام</span>
                                     ) : inv?.status === 'excused' ? (
                                        <button onClick={() => openReadExcuseModal(inv)} className="text-[9px] font-black text-rose-500 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-rose-200 transition-colors"><AlertCircle className="w-3 h-3"/> عرض العذر</button>
                                     ) : (
                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> قيد الانتظار</span>
                                     )}
                                  </div>
                                </div>
                              )
                            })}
                            {commInvigs.length < 2 && (
                              <button onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }} className="w-full py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition-colors mt-2"><UserPlus className="w-3 h-3 inline mr-1" /> إضافة مراقب</button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-100">
                          <button onClick={() => printDocument(committee?.id, 'door_sheet')} className="col-span-2 bg-slate-800 text-white text-[10px] font-black py-2 rounded-lg hover:bg-slate-700"><PrinterIcon className="w-3 h-3 inline mr-1"/> محضر اللجنة (كشف الحضور)</button>
                          <button onClick={() => printDocument(committee?.id, 'desk_cards')} className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2 rounded-lg hover:bg-indigo-100"><IdCard className="w-3 h-3 inline mr-1"/> الطاولة</button>
                          <button onClick={() => printDocument(committee?.id, 'invigilator_ids')} className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-2 rounded-lg hover:bg-emerald-100"><Contact className="w-3 h-3 inline mr-1"/> الهويات</button>
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

      {/* 🚀 نافذة بناء اللجان الديناميكية */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-600"/> هندسة اللجان</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-bold text-slate-600">كم عدد اللجان الإجمالي؟</label><input type="number" min="1" max="100" value={builderData.count} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, count: isNaN(v) ? 1 : Math.min(100, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" /></div>
              <div><label className="text-sm font-bold text-slate-600">سعة اللجنة الواحدة؟</label><input type="number" min="1" max="50" value={builderData.capacity} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, capacity: isNaN(v) ? 1 : Math.min(50, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" /><p className="text-[10px] text-slate-400 text-center mt-1">السعة القصوى 50 طالب للجنة.</p></div>
              <div className="flex gap-2 pt-2"><button onClick={handleBuild} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700">بناء واعتماد</button><button onClick={() => setIsBuilderModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة طباعة الفصول */}
      {isClassPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassPrintModalOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Layers className="w-6 h-6 text-emerald-600"/> طباعة بطاقات الفصول</h3>
              <button onClick={() => setIsClassPrintModalOpen(false)} className="p-2 bg-slate-50 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-4">اختر الصف لطباعة بطاقات جميع طلابه مجمعة لتسليمها لمربي الفصل.</p>
            {availableClasses.length === 0 ? (
              <p className="text-center text-sm font-bold text-slate-500 py-8">لا يوجد طلاب موزعون بعد للطباعة.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                 {availableClasses.map((cls, ci) => (
                   <button key={`cls-${ci}`} onClick={() => printDocument('', 'class_cards', cls)} className="w-full bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 p-4 rounded-xl text-right transition-all flex items-center justify-between group">
                     <span className="font-black text-slate-700 group-hover:text-emerald-700">{cls}</span>
                     <PrinterIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                   </button>
                 ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 👑 نافذة التكليف الذكي لرؤساء اللجان */}
      {isHeadsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHeadsModalOpen(false)}>
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500"/> التكليف الذكي للرؤساء (حسب اليوم الامتحاني)
              </h3>
              <button onClick={() => setIsHeadsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
               <div className="grid grid-cols-1 gap-5">
                 <div>
                   <label className="block text-sm font-black text-slate-700 mb-2">1. حدد اليوم الامتحاني (التاريخ)</label>
                   <select value={headAssignment.date} onChange={(e) => { setHeadAssignment({...headAssignment, date: e.target.value, head_teacher_id: ''}); fetchHeadsByDate(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-amber-500 outline-none shadow-sm cursor-pointer hover:border-amber-300 transition-colors">
                     <option value="">- اضغط لاختيار اليوم الامتحاني -</option>
                     {uniqueExamDates.map((date, di) => {
                        const count = timetables.filter(t => t?.exam_date === date).length;
                        return <option key={`d-${di}`} value={date}>{date} (يتضمن {count} امتحانات)</option>
                     })}
                   </select>
                 </div>
                 
                 {headAssignment.date && (
                   <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
                     <label className="block text-sm font-black text-slate-700 mb-2">2. اختر اللجان لتسليمها للرئيس</label>
                     <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                        {committees.filter(c => !String(c?.name || '').includes('الفائض')).map((c, ci) => {
                          const isAssigned = alreadyAssignedCommittees.includes(c?.name);
                          const isSelected = selectedCommitteesForHead.includes(c?.name);
                          return (
                            <button 
                              key={`hc-${ci}`} 
                              disabled={isAssigned}
                              onClick={() => toggleCommitteeSelectionForHead(c?.name)}
                              className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 border shadow-sm
                                ${isAssigned ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed' : 
                                  isSelected ? 'bg-amber-500 text-white border-amber-600 scale-105' : 
                                  'bg-white text-slate-700 border-slate-300 hover:border-amber-400 hover:text-amber-700'}`}
                            >
                              {isAssigned ? <X className="w-4 h-4"/> : isSelected ? <CheckSquare className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                              {String(c?.name || '')}
                            </button>
                          )
                        })}
                     </div>
                   </motion.div>
                 )}

                 {headAssignment.date && selectedCommitteesForHead.length > 0 && (
                   <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
                     <label className="block text-sm font-black text-slate-700 mb-2">3. حدد المعلم الذي سيتولى المسؤولية</label>
                     <div className="flex flex-col sm:flex-row gap-3">
                       <select value={headAssignment.head_teacher_id} onChange={(e) => setHeadAssignment({...headAssignment, head_teacher_id: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-amber-500 outline-none shadow-sm">
                         <option value="">- اختر المعلم من القائمة -</option>
                         {teachers.map((t, ti) => <option key={`ht-${ti}`} value={t?.id}>{t?.full_name}</option>)}
                       </select>
                       <button onClick={handleAssignHead} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-4 sm:py-0 rounded-xl transition-all shadow-md text-lg">اعتماد التكليف</button>
                     </div>
                     {headAssignment.head_teacher_id && (() => {
                        const selectedTeacherHeadDates = getTeacherHeadAssignments(headAssignment.head_teacher_id);
                        if(selectedTeacherHeadDates.length > 0) {
                          return (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                              <Info className="w-5 h-5 text-amber-500 shrink-0"/>
                              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                <span className="font-black text-amber-900 block mb-1">تنبيه لضمان التدوير:</span>
                                هذا المعلم كُلف برئاسة اللجان مسبقاً في ({selectedTeacherHeadDates.length}) أيام، وهي: 
                                <span className="font-black"> {selectedTeacherHeadDates.join('، ')}</span>. النظام يسمح بالتكليف لكن يُنصح باختيار معلم آخر لتحقيق العدالة.
                              </p>
                            </div>
                          )
                        }
                        return null;
                     })()}
                   </motion.div>
                 )}
               </div>

               {headAssignment.date && (
                 <div className="mt-8 border-t border-slate-100 pt-6">
                    <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> التكليفات الحالية لهذا اليوم الامتحاني:</h4>
                    <div className="space-y-3">
                       {currentHeads.length > 0 ? currentHeads.map((head, hi) => (
                          <div key={`h-asg-${hi}`} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black shrink-0">
                                   {head?.users?.avatar_url ? <img src={head.users.avatar_url} className="w-full h-full rounded-full object-cover" alt="img" /> : <Crown className="w-6 h-6"/>}
                                </div>
                                <div>
                                   <p className="font-black text-slate-900 text-base">{getSafeName(head?.users)}</p>
                                   <div className="flex flex-wrap gap-1 mt-1.5">
                                      {String(head?.committees_range || '').split('، ').filter(Boolean).map((cr:string, i:number) => (
                                        <span key={`cr-${i}`} className="font-bold text-amber-800 text-[11px] bg-amber-50 px-2 py-1 rounded-md border border-amber-200">{cr}</span>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => handleDeleteHead(head?.head_teacher_id, headAssignment.date)} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm" title="إزالة التكليف"><Trash2 className="w-5 h-5"/></button>
                          </div>
                       )) : <p className="text-center text-sm font-bold text-slate-400 py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">لم يتم تكليف أي رئيس لهذا اليوم الامتحاني بعد.</p>}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ نافذة إعدادات اللجنة */}
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

      {/* 👤 نافذة تعيين المراقبين */}
      {isAssignModalOpen && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}}>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600"/> تكليف مراقب ({selectedCommittee?.name})
              </h3>
              <button onClick={() => {setIsAssignModalOpen(false); setTeacherSearchTerm(''); setSelectedTeacherId('');}} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col min-h-[400px]">
              <div className="relative mb-4 shrink-0">
                 <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                 <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500" placeholder="ابحث عن اسم معلم، أو مادة يدرسها..." value={teacherSearchTerm} onChange={(e) => setTeacherSearchTerm(e.target.value)} />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                 {teachers.filter(t => String(t?.full_name || '').includes(teacherSearchTerm) || String(t?.subjectsStr || '').includes(teacherSearchTerm)).map((t, index) => {
                    const tId = String(t?.id || `temp-${index}`);
                    const assignedComms = getTeacherAssignments(tId);
                    const isInThisCommittee = assignedComms.some(c => String(c?.committee_id) === String(selectedCommittee?.id));
                    const isSelected = selectedTeacherId === tId;
                    const safeAvatarUrl = t?.avatar_url ? `${t.avatar_url}?t=${new Date().getTime()}` : null;

                    return (
                       <div key={`ta-${index}`} onClick={() => !isInThisCommittee && setSelectedTeacherId(tId)} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isInThisCommittee ? "bg-slate-100 opacity-60 cursor-not-allowed" : isSelected ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" : "bg-white hover:border-indigo-300 cursor-pointer"}`}>
                          <div className="flex items-center gap-3">
                             <div className="relative group/avatar cursor-pointer" onClick={(e) => { e.stopPropagation(); triggerAvatarUpload(tId); }} title="رفع وتعديل الصورة">
                               {safeAvatarUrl ? <img src={safeAvatarUrl} crossOrigin="anonymous" className="w-10 h-10 rounded-full object-cover shrink-0" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">{String(t?.full_name || 'م').charAt(0)}</div>}
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
                 {teachers.filter(t => String(t?.full_name || '').includes(teacherSearchTerm)).length === 0 && <p className="text-center text-sm font-bold text-slate-400 py-8">لا يوجد معلمين.</p>}
              </div>

              {selectedTeacherId && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3 mt-4 shrink-0 overflow-hidden">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-xs font-black text-amber-800 mb-1">معلومات للإدارة:</p>
                       <p className="text-[11px] font-bold text-amber-700 leading-relaxed">هذا المعلم يقوم بتدريس: <span className="font-black bg-amber-100 px-1.5 rounded">{teachers.find(t=>String(t?.id)===String(selectedTeacherId))?.subjectsStr || 'غير محدد'}</span>.</p>
                    </div>
                 </div>
              )}

              <div className="pt-4 shrink-0">
                <button onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> تأكيد التكليف للمراقبة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة (Modal) قراءة عذر المراقب */}
      <AnimatePresence>
        {isReadExcuseModalOpen && selectedExcuseData && (
          <Dialog.Root open={isReadExcuseModalOpen} onOpenChange={setIsReadExcuseModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-3xl w-[95%] max-w-md shadow-2xl z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-3 bg-rose-50 rounded-xl text-rose-500"><AlertCircle className="w-6 h-6" /></div>
                     <div>
                       <Dialog.Title className="text-xl font-black text-slate-800">عذر مراقبة مقدّم</Dialog.Title>
                       <p className="text-[10px] font-bold text-slate-400 mt-1">المعلم: {getSafeName(selectedExcuseData?.users)}</p>
                     </div>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors active:scale-90" onClick={() => setIsReadExcuseModalOpen(false)}>
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                     <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">نص الاعتذار المرفوع:</p>
                     <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedExcuseData?.excuse_reason || 'لا يوجد نص مرفق.'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleRemoveInvigilator(selectedExcuseData?.id, getSafeName(selectedExcuseData?.users))} className="flex-1 py-3.5 sm:py-4 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-500 hover:text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95 shadow-sm">
                    <Trash2 className="w-5 h-5" /> إعفاء المعلم من اللجنة
                  </button>
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* 👁️ نافذة استعراض اللجنة ونقل الطلاب */}
      {isViewModalOpen && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)}>
           <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                       <DoorOpen className="w-6 h-6 text-indigo-600"/> استعراض {selectedCommittee?.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">السعة: {selectedCommittee?.capacity} | إجمالي الطلاب: {viewCommitteeDetails.students.length}</p>
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
                             const stdAvatar = s?.students?.users?.avatar_url || s?.students?.users?.[0]?.avatar_url;
                             const stdName = getSafeName(s?.students?.users);
                             const stdInitial = String(stdName || 'ط').charAt(0);
                             const fullClassName = getFullClassName(s?.students);
                             const safeStdAvatar = stdAvatar ? `${stdAvatar}?t=${new Date().getTime()}` : null;

                             return (
                               <tr key={`vstd-${idx}`} className="even:bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                                 <td className="p-3 border-b border-slate-100 font-black text-indigo-600 tracking-widest">{s?.seat_number}</td>
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
                                           handleMoveStudent(s?.student_id, e.target.value);
                                         }
                                       }}
                                       defaultValue=""
                                    >
                                       <option value="" disabled>🔄 نقل إلى لجنة...</option>
                                       {committees.filter(c => String(c?.id) !== String(selectedCommittee?.id)).map(c => (
                                         <option key={`m-${c.id}`} value={c.id}>{c.name}</option>
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

      {/* 🖨️ قوالب الطباعة المخفية */}
      {printData && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, pointerEvents: 'none' }}>
          <div ref={printRef} className="flex flex-col gap-10 bg-white" dir="rtl">
            
            {/* 📄 1. محضر اللجنة / كشف الباب الرسمي */}
            {printType === 'door_sheet' && (
              <div className="print-page-wrapper bg-white mx-auto relative p-10" style={{ width: '794px', height: '1122px' }}>
                 <div className="text-center mb-6 border-b-[3px] border-black pb-4">
                    <h1 className="text-2xl font-black text-black">وزارة التربية - إدارة التعليم الخاص</h1>
                    <h2 className="text-xl font-black text-black mt-1">مدرسة الرفعة النموذجية بنين (م-ث)</h2>
                    <h3 className="text-3xl font-black text-black mt-4 border-2 border-black inline-block px-8 py-2 bg-slate-100 rounded-2xl">{printData.committee?.name || 'لجنة غير محددة'}</h3>
                    <p className="text-base font-black text-black mt-3">محضر سير لجان الامتحانات - الفصل الدراسي الثاني 2025/2026</p>
                 </div>
                 
                 <div className="flex justify-between items-center mb-6 px-4 font-black text-lg text-black border-2 border-slate-300 p-4 rounded-xl">
                    <p>اليوم والتاريخ: ............................................</p>
                    <p>المادة: ............................................</p>
                 </div>

                 <table className="w-full border-collapse border-[3px] border-black text-base text-black mb-8">
                   <thead>
                     <tr className="bg-slate-100 border-b-[3px] border-black text-black">
                       <th className="border-l-[3px] border-black p-3 w-12 text-black">م</th>
                       <th className="border-l-[3px] border-black p-3 w-32 text-black">رقم الجلوس</th>
                       <th className="border-l-[3px] border-black p-3 text-black">اسم الطالب الرباعي</th>
                       <th className="p-3 w-40 text-black">الصف والشعبة</th>
                     </tr>
                   </thead>
                   <tbody>
                     {printData.students.map((s:any, i:number) => (
                       <tr key={`p1-${i}`} className="border-b-2 border-black h-12 text-black">
                         <td className="border-l-[3px] border-black p-2 text-center font-bold text-black">{i + 1}</td>
                         <td className="border-l-[3px] border-black p-2 text-center font-black text-xl tracking-widest text-black">{s?.seat_number}</td>
                         <td className="border-l-[3px] border-black p-2 font-bold px-4 text-black text-lg">{getSafeName(s?.students?.users)}</td>
                         <td className="p-2 text-center font-bold text-sm text-black">{getFullClassName(s?.students)}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>

                 <div className="flex justify-between px-6 text-black border-t-[3px] border-black pt-8">
                    <div className="text-center">
                       <p className="font-black text-lg mb-2">المراقب الأول</p>
                       <p className="font-bold text-base mb-6 text-slate-800">{printData.invigilators?.[0] ? getSafeName(printData.invigilators[0].users) : '.......................................'}</p>
                       <p className="font-black">التوقيع: ..........................</p>
                    </div>
                    <div className="text-center">
                       <p className="font-black text-lg mb-2">المراقب الثاني</p>
                       <p className="font-bold text-base mb-6 text-slate-800">{printData.invigilators?.[1] ? getSafeName(printData.invigilators[1].users) : '.......................................'}</p>
                       <p className="font-black">التوقيع: ..........................</p>
                    </div>
                    <div className="text-center">
                       <p className="font-black text-lg mb-2">رئيس اللجنة الإشرافي</p>
                       <p className="font-bold text-base mb-6 text-slate-800">.......................................</p>
                       <p className="font-black">التوقيع: ..........................</p>
                    </div>
                 </div>
              </div>
            )}

            {/* 📄 2. بطاقات الطاولة العرضية للفصول المفرزة */}
            {printType === 'class_cards' && chunkArray(printData.students, 8).map((chunk, pageIdx) => (
              <div key={`pc2-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px' }}>
                 {chunk.map((student:any, si) => {
                    const stdName = getSafeName(student?.students?.users);
                    const fullClassName = getFullClassName(student?.students);
                    const commName = student?.exam_committees?.name || 'غير محدد';
                    const qrPayload = `raf-id:${student?.student_id}`; 
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                       <div key={`c-${si}`} className="w-[85mm] h-[55mm] border-[3px] border-black relative flex flex-col bg-white overflow-hidden rounded-[1rem]" style={{ pageBreakInside: 'avoid' }}>
                          <div className="bg-slate-100 border-b-[3px] border-black p-2 flex justify-between items-center shrink-0">
                             <div className="text-right">
                                <h3 className="font-black text-[12px] text-black leading-none">مدرسة الرفعة النموذجية بنين (م-ث)</h3>
                                <p className="text-[9px] font-bold text-slate-700 mt-1">بطاقة جلوس اختبارات نهاية العام</p>
                             </div>
                             <div className="bg-black text-white px-3 py-1.5 font-black text-xs border border-black rounded-lg">{commName}</div>
                          </div>
                          <div className="flex p-3 gap-3 items-center flex-1">
                             <div className="w-[22mm] h-[22mm] p-0.5 border-2 border-slate-800 rounded-lg shrink-0"><img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" /></div>
                             <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-500 mb-0.5">اسم الطالب</p>
                                <h2 className="text-[13px] font-black text-black mb-2 leading-tight">{stdName}</h2>
                                <div className="inline-block bg-slate-100 border-2 border-slate-800 px-2 py-1 rounded font-black text-[10px] text-slate-900">{fullClassName}</div>
                             </div>
                             <div className="shrink-0 text-center border-r-[3px] border-slate-300 pr-3">
                                <p className="text-[9px] font-bold text-slate-500 mb-1">رقم الجلوس</p>
                                <p className="text-2xl font-black text-black tracking-widest">{student?.seat_number || '---'}</p>
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 3. بطاقات الطاولة العادية (مفرزة باللجنة) */}
            {printType === 'desk_cards' && chunkArray(printData.students, 8).map((chunk, pageIdx) => (
              <div key={`pc3-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px' }}>
                 {chunk.map((student:any, si) => {
                    const stdName = getSafeName(student?.students?.users);
                    const fullClassName = getFullClassName(student?.students);
                    const qrPayload = `raf-id:${student?.student_id}`; 
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                       <div key={`d-${si}`} className="w-[85mm] h-[55mm] border-[3px] border-black relative flex flex-col bg-white overflow-hidden rounded-[1rem]" style={{ pageBreakInside: 'avoid' }}>
                          <div className="bg-slate-100 border-b-[3px] border-black p-2 flex justify-between items-center shrink-0">
                             <div className="text-right">
                                <h3 className="font-black text-[12px] text-black leading-none">مدرسة الرفعة النموذجية بنين (م-ث)</h3>
                                <p className="text-[9px] font-bold text-slate-700 mt-1">بطاقة جلوس اختبارات نهاية العام</p>
                             </div>
                             <div className="bg-black text-white px-3 py-1.5 font-black text-xs border border-black rounded-lg">{printData.committee?.name || 'غير محدد'}</div>
                          </div>
                          <div className="flex p-3 gap-3 items-center flex-1">
                             <div className="w-[22mm] h-[22mm] p-0.5 border-2 border-slate-800 rounded-lg shrink-0"><img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" className="w-full h-full object-contain" /></div>
                             <div className="flex-1">
                                <p className="text-[9px] font-bold text-slate-500 mb-0.5">اسم الطالب</p>
                                <h2 className="text-[13px] font-black text-black mb-2 leading-tight">{stdName}</h2>
                                <div className="inline-block bg-slate-100 border-2 border-slate-800 px-2 py-1 rounded font-black text-[10px] text-slate-900">{fullClassName}</div>
                             </div>
                             <div className="shrink-0 text-center border-r-[3px] border-slate-300 pr-3">
                                <p className="text-[9px] font-bold text-slate-500 mb-1">رقم الجلوس</p>
                                <p className="text-2xl font-black text-black tracking-widest">{student?.seat_number || '---'}</p>
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
}

// 🚀 تغليف التطبيق الأساسي بالدروع
export default function Page() {
  return (
    <ErrorBoundary>
      <FloatingConsole />
      <ExamCommitteesControl />
    </ErrorBoundary>
  );
}
