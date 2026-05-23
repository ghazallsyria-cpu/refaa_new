// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, ShieldCheck, Settings, Loader2, Search, Trash2, PrinterIcon, 
  IdCard, DoorOpen, LayoutGrid, CheckCircle2, X, Edit3, Plus, Eye, AlertTriangle, 
  Contact, Camera, UploadCloud, Crown, Layers, UserMinus, CalendarDays, FileText, Info, AlertCircle, Clock, Wand2,
  CheckSquare, UserCheck, FileSignature, QrCode, Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating';
import { useAuth } from '@/context/auth-context';

// =========================================================================
// 1. 🛡️ جدار الحماية
// =========================================================================
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 p-6 flex flex-col items-center justify-center font-cairo" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border-4 border-rose-500 text-center">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4"/>
            <h1 className="text-3xl font-black text-rose-600 mb-4">حدث خطأ في عرض الصفحة</h1>
            <button onClick={() => window.location.reload()} className="mt-6 w-full py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-colors">
              تحديث الصفحة وإعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =========================================================================
// 2. 🚀 التطبيق الرئيسي (لجان الامتحانات)
// =========================================================================
function ExamCommitteesControl() {
  const authContext = useAuth() || {};
  const currentRole = authContext.authRole || authContext.userRole;

  const engineContext = useExamSeating() || {};
  const isEngineLoading = engineContext.isLoading || false;
  const progressMsg = engineContext.progressMsg || 'جاري المعالجة...';
  const buildCommittees = engineContext.buildCommittees || (async () => false);
  const nukeEverything = engineContext.nukeEverything || (async () => false);
  const generateSeatingAndDistribute = engineContext.generateSeatingAndDistribute || (async () => ({success: false}));
  const addInvigilatorToDay = engineContext.addInvigilatorToDay || (async () => false);

  const [committees, setCommittees] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invigilators, setInvigilators] = useState<any[]>([]);
  const [allocationsStats, setAllocationsStats] = useState<any>({});
  const [timetables, setTimetables] = useState<any[]>([]);
  const [allHeads, setAllHeads] = useState<any[]>([]);
  
  const [studentStats, setStudentStats] = useState({ g10: 0, g11_sci: 0, g11_lit: 0, totalAllocated: 0 });
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  const [uniqueExamDates, setUniqueExamDates] = useState<string[]>([]);
  const [activeExamDate, setActiveExamDate] = useState<string>(''); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'management' | 'invigilators_radar' | 'heads_radar' | 'daily_stats' | 'custom_ids'>('management');
  
  const [customIdsList, setCustomIdsList] = useState<{name: string, role: string}[]>([{ name: '', role: 'مراقب إداري' }]);
  const [isFinalized, setIsFinalized] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHeadsModalOpen, setIsHeadsModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isClassPrintModalOpen, setIsClassPrintModalOpen] = useState(false);
  const [isReadExcuseModalOpen, setIsReadExcuseModalOpen] = useState(false);
  const [isExemptionsModalOpen, setIsExemptionsModalOpen] = useState(false);
  
  const [exemptionSearchTerm, setExemptionSearchTerm] = useState('');
  const [headSearchTerm, setHeadSearchTerm] = useState(''); 
  const [selectedExcuseData, setSelectedExcuseData] = useState<any>(null);
  const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState(''); 
  const [builderData, setBuilderData] = useState({ count: 21, capacity: 14 });
  const [editCommitteeData, setEditCommitteeData] = useState({ id: '', name: '', capacity: 14, location: '' });
  const [viewCommitteeDetails, setViewCommitteeDetails] = useState<{ students: any[], invigs: any[], loading: boolean }>({ students: [], invigs: [], loading: false });

  const [headAssignment, setHeadAssignment] = useState({ date: '', head_teacher_id: '' });
  const [selectedCommitteesForHead, setSelectedCommitteesForHead] = useState<string[]>([]);
  const [currentHeads, setCurrentHeads] = useState<any[]>([]);

  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [printType, setPrintType] = useState<'door_sheet' | 'desk_cards' | 'invigilator_ids' | 'class_cards' | 'head_ids' | 'signatures_sheet' | 'custom_ids' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    try {
      const finalizedState = localStorage.getItem('committees_finalized');
      if (finalizedState === 'true') setIsFinalized(true);
    } catch(e) {}
  }, []);

  const handleToggleFinalize = () => {
    const newState = !isFinalized;
    if (newState && !confirm('اعتماد اللجان سيضيف ختم "معتمد رسمياً" على جميع المطبوعات، هل أنت متأكد؟')) return;
    setIsFinalized(newState);
    try { localStorage.setItem('committees_finalized', newState ? 'true' : 'false'); } catch(e) {}
  };

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

      const { data: exams } = await supabase.from('exam_timetables').select('id, exam_date, subjects(name), class_level').eq('academic_year', currentYear).eq('semester', currentSemester).order('exam_date');
      setTimetables(Array.isArray(exams) ? exams : []);
      
      const datesSet = new Set<string>();
      (exams || []).forEach(e => { if (e?.exam_date) datesSet.add(e.exam_date) });
      const datesArr = Array.from(datesSet).sort();
      setUniqueExamDates(datesArr);
      
      let currentDateToFetch = activeExamDate;
      if (!currentDateToFetch && datesArr.length > 0) {
         currentDateToFetch = datesArr[0];
         setActiveExamDate(currentDateToFetch);
      }

      let finalTchrs = [];
      const { data: tchrsWithCols, error: tchrErr } = await supabase.from('teachers').select('id, is_excluded_from_exams, is_committee_head, users(full_name, avatar_url), teacher_subjects(subjects(name))');
      
      if (tchrErr) {
         const { data: fb1 } = await supabase.from('teachers').select('id, is_excluded_from_exams, users(full_name, avatar_url), teacher_subjects(subjects(name))');
         finalTchrs = fb1 || [];
      } else {
         finalTchrs = tchrsWithCols || [];
      }

      const formattedTeachers = (finalTchrs || []).map((t: any, idx: number) => {
        if (!t) return null;
        const u = Array.isArray(t?.users) ? t.users[0] : t?.users;
        const subjects = Array.isArray(t?.teacher_subjects) ? t.teacher_subjects.map((s:any) => s?.subjects?.name).filter(Boolean).join('، ') : 'غير محدد';
        return { 
          id: String(t?.id || `t-${idx}`), 
          full_name: String(u?.full_name || 'بدون اسم'), 
          avatar_url: u?.avatar_url || null, 
          subjectsStr: subjects, 
          is_excluded_from_exams: t?.is_excluded_from_exams || false,
          is_committee_head: t?.is_committee_head || false 
        };
      }).filter(Boolean);

      const { data: invigs } = await supabase.from('committee_invigilators').select('id, committee_id, teacher_id, status, excuse_reason, signed_at, exam_date, users(full_name, avatar_url)');
      const { data: allocs } = await supabase.from('student_seat_allocations').select('id, committee_id, student_id, seat_number, students(next_year_track, sections(name, classes(level, name)))').eq('academic_year', currentYear).eq('semester', currentSemester);
      const { data: hds } = await supabase.from('exam_committee_heads').select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name, avatar_url), exam_timetables(exam_date, subjects(name))');
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

        if (lvl === 10) { g10++; } 
        else if (lvl === 11) {
            if (track === 'literary' || cName.includes('أدبي') || cName.includes('ادبي') || sName.includes('أدبي') || sName.includes('ادبي')) { g11_lit++; } 
            else { g11_sci++; }
        }
      });
      
      setStudentStats({ g10, g11_sci, g11_lit, totalAllocated: allocs?.length || 0 });
      setAvailableClasses(Array.from(uniqueClassesSet).sort());
      setCommittees(sortedComms);
      setTeachers(formattedTeachers);
      setInvigilators(Array.isArray(invigs) ? invigs : []);
      setAllocationsStats(stats);
      setAllHeads(Array.isArray(hds) ? hds : []);

      if (currentDateToFetch) fetchHeadsByDate(currentDateToFetch);

    } catch (error) { 
      console.error('Error fetching data:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { if (['admin', 'management'].includes(String(currentRole))) fetchData(); }, [currentRole]);

  const handleToggleExemption = async (tId: string, currentStatus: boolean) => {
    try {
       setTeachers(prev => prev.map(t => String(t.id) === tId ? { ...t, is_excluded_from_exams: !currentStatus } : t));
       await supabase.from('teachers').update({ is_excluded_from_exams: !currentStatus }).eq('id', tId);
    } catch (err) { fetchData(); }
  };

  const handleToggleCommitteeHead = async (tId: string, currentStatus: boolean) => {
    try {
       setTeachers(prev => prev.map(t => String(t.id) === tId ? { ...t, is_committee_head: !currentStatus } : t));
       await supabase.from('teachers').update({ is_committee_head: !currentStatus }).eq('id', tId);
    } catch (err) { fetchData(); }
  };

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
    } catch (e) {}
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
      alert('يرجى اختيار التاريخ، تحديد اللجان، ثم اختيار رئيس اللجان!'); return;
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
      await supabase.from('exam_committee_heads').delete().eq('head_teacher_id', headTeacherId).in('timetable_id', ttIds);
      fetchHeadsByDate(activeExamDate);
      fetchData();
    } catch (e) { alert('حدث خطأ أثناء الحذف'); } finally { setIsLoading(false); }
  };

  const resequenceSeatNumbers = async () => {
    try {
      const { data: allocs } = await supabase.from('student_seat_allocations').select('id, student_id, committee_id, students(next_year_track, users(full_name), sections(classes(level)))').eq('academic_year', currentYear).eq('semester', currentSemester);
      if (!allocs || allocs.length === 0) return;

      const clean = (name: string) => name.replace(/^[\s\.\-\_]+/, '').replace(/[أإآ]/g, 'ا').trim();
      const sortAr = (a: any, b: any) => clean(a.fullName).localeCompare(clean(b.fullName), 'ar');

      let grade10 = []; let grade11_sci = []; let grade11_lit = [];

      allocs.forEach(a => {
        const lvl = a.students?.sections?.classes?.level || 0;
        const track = String(a.students?.next_year_track || '').toLowerCase();
        const obj = { alloc_id: a.id, fullName: getSafeName(a.students?.users) };

        if (lvl === 10) grade10.push(obj);
        else if (lvl === 11) {
           if (track === 'literary') grade11_lit.push(obj);
           else grade11_sci.push(obj);
        }
      });

      grade10.sort(sortAr); grade11_sci.sort(sortAr); grade11_lit.sort(sortAr);

      const updates = [];
      grade10.forEach((s, idx) => updates.push({ id: s.alloc_id, seat_number: `10${String(idx + 1).padStart(3, '0')}` }));
      grade11_sci.forEach((s, idx) => updates.push({ id: s.alloc_id, seat_number: `111${String(idx + 1).padStart(3, '0')}` }));
      grade11_lit.forEach((s, idx) => updates.push({ id: s.alloc_id, seat_number: `112${String(idx + 1).padStart(3, '0')}` }));

      for (const update of updates) {
         await supabase.from('student_seat_allocations').update({ seat_number: update.seat_number }).eq('id', update.id);
      }
    } catch (e) {
      console.error("Resequence error:", e);
    }
  };

  const handleMoveStudent = async (studentId: string, newCommitteeId: string) => {
    try {
      setIsLoading(true);
      await supabase.from('student_seat_allocations').update({ committee_id: newCommitteeId }).eq('student_id', studentId).eq('academic_year', currentYear).eq('semester', currentSemester);
      await resequenceSeatNumbers(); 
      alert('تم نقل الطالب وإعادة تسلسل أرقام الجلوس للمصداقية بنجاح!'); 
      setIsViewModalOpen(false); 
      fetchData();
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
    if (!confirm('تأكيد الحذف نهائياً لهذه اللجنة؟')) return;
    setActionLoadingId(`del-${id}`);
    try { 
       await supabase.from('exam_committees').delete().eq('id', id); 
       fetchData(); 
    } catch (error) { alert('خطأ في الحذف'); } finally { setActionLoadingId(null); }
  };

  const handleNuclear = async () => {
    if (!confirm('سيتم هدم اللجان ومسح التوزيع بالكامل! تأكيد؟')) return;
    const ok = await nukeEverything(currentYear, currentSemester);
    if(ok) { alert('تم الهدم الشامل بنجاح'); fetchData(); }
  };

  const handleResetStaffOnly = async () => {
    if (!confirm('هل أنت متأكد من تصفير تكليفات المراقبين ورؤساء اللجان فقط؟ لن تتأثر لجان الطلاب.')) return;
    setIsLoading(true);
    try {
      await supabase.from('committee_invigilators').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      await supabase.from('exam_committee_heads').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
      alert('تم تصفير المهام الإشرافية بنجاح.');
      fetchData();
    } catch(e) { alert('خطأ أثناء التصفير.'); } finally { setIsLoading(false); }
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
    if (!confirm('تفريغ جميع الطلاب من اللجان؟')) return;
    try { setIsLoading(true); await supabase.from('student_seat_allocations').delete().eq('academic_year', currentYear).eq('semester', currentSemester); fetchData(); alert('تم تفريغ المقاعد!'); } catch (error) { alert('خطأ'); } finally { setIsLoading(false); }
  };

  const openCommitteeModal = (committee: any = null) => {
    if (committee) setEditCommitteeData({ id: committee.id, name: committee.name || '', capacity: committee.capacity || 14, location: committee.location || '' });
    else setEditCommitteeData({ id: '', name: `لجنة ${committees.length + 1}`, capacity: 14, location: '' });
    setIsCommitteeModalOpen(true);
  };

  const openViewModal = async (committee: any) => {
    if (!committee) return;
    setSelectedCommittee(committee);
    setViewCommitteeDetails({ students: [], invigs: [], loading: true }); 
    setIsViewModalOpen(true); 
    
    try {
      const { data: students } = await supabase.from('student_seat_allocations').select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) )`).eq('committee_id', committee.id).order('seat_number', { ascending: true });
      const commInvigs = invigilators.filter(i => String(i?.committee_id) === String(committee.id) && i.exam_date === activeExamDate);
      setViewCommitteeDetails({ students: students || [], invigs: commInvigs, loading: false }); 
    } catch (error) { 
      alert('خطأ في جلب بيانات الطلاب.');
      setViewCommitteeDetails({ students: [], invigs: [], loading: false }); 
    }
  };

  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee?.id || !activeExamDate) { alert('يرجى التأكد من اختيار المعلم واللجنة وتحديد تاريخ الاختبار!'); return; }
    const currentInvigs = invigilators.filter(i => String(i?.committee_id) === String(selectedCommittee.id) && i.exam_date === activeExamDate);
    if (currentInvigs.length >= 2) { alert('الحد الأقصى هو مراقبين 2 للجنة في اليوم!'); return; }
    
    const success = await addInvigilatorToDay(selectedCommittee.id, selectedTeacherId, activeExamDate);
    if (success) {
      setIsAssignModalOpen(false); 
      setSelectedTeacherId(''); 
      fetchData(); 
    }
  };

  const handleRemoveInvigilator = async (id: string, name: string) => {
    if (!confirm(`إعفاء وتأكيد إزالة المراقب (${name}) من المراقبة في هذا اليوم؟`)) return;
    try { setIsReadExcuseModalOpen(false); await supabase.from('committee_invigilators').delete().eq('id', id); fetchData(); } catch (error) { alert('خطأ في إزالة المراقب.'); }
  };

  const openReadExcuseModal = (invig: any) => {
    if(!invig) return;
    setSelectedExcuseData(invig);
    setIsReadExcuseModalOpen(true);
  };

  const handleAutoAssignInvigilators = async () => {
    if (!confirm('سيقوم النظام بتوزيع المراقبين المتاحين بواقع (مراقب واحد كحد أدنى) لكل لجنة، ثم يدمج المراقب الثاني بدون تكرار للضرورة. تأكيد؟')) return;
    
    setIsAutoAssigning(true);
    try {
      if (committees.length === 0 || uniqueExamDates.length === 0 || teachers.length === 0) {
        throw new Error("تأكد من وجود لجان، جداول امتحانات، ومعلمين متاحين!");
      }

      const eligibleTeachers = teachers.filter(t => !t.is_excluded_from_exams && !t.is_committee_head);
      if (eligibleTeachers.length === 0) throw new Error("لا يوجد معلمين متاحين للمراقبة العادية!");

      const teacherTotalShifts = new Map<string, number>();
      const teacherCommittees = new Map<string, Set<string>>();
      const dailyTeacherAssignments = new Map<string, Set<string>>();
      const dailyCommitteeCount = new Map<string, number>();

      invigilators.forEach(inv => {
         const tId = String(inv.teacher_id);
         const cId = String(inv.committee_id);
         const date = String(inv.exam_date);

         teacherTotalShifts.set(tId, (teacherTotalShifts.get(tId) || 0) + 1);
         if (!teacherCommittees.has(tId)) teacherCommittees.set(tId, new Set());
         teacherCommittees.get(tId)?.add(cId);
         if (!dailyTeacherAssignments.has(date)) dailyTeacherAssignments.set(date, new Set());
         dailyTeacherAssignments.get(date)?.add(tId);

         const commKey = `${date}_${cId}`;
         dailyCommitteeCount.set(commKey, (dailyCommitteeCount.get(commKey) || 0) + 1);
      });

      const newAssignments: any[] = [];

      for (const date of uniqueExamDates) {
         for (const comm of committees) {
            const commKey = `${date}_${comm.id}`;
            while ((dailyCommitteeCount.get(commKey) || 0) < 1) {
               let bestTeacher: any = null;
               let minShifts = Infinity;
               const shuffledTeachers = [...eligibleTeachers].sort(() => Math.random() - 0.5);

               for (const teacher of shuffledTeachers) {
                  const tId = String(teacher.id);
                  const isAssignedToday = dailyTeacherAssignments.get(date)?.has(tId);
                  const hasSupervisedThisCommBefore = teacherCommittees.get(tId)?.has(String(comm.id));

                  if (!isAssignedToday && !hasSupervisedThisCommBefore) {
                     const shifts = teacherTotalShifts.get(tId) || 0;
                     if (shifts < minShifts) { minShifts = shifts; bestTeacher = teacher; }
                  }
               }
               if (!bestTeacher) break;

               const tId = String(bestTeacher.id);
               newAssignments.push({ committee_id: comm.id, teacher_id: tId, exam_date: date, status: 'pending' });

               teacherTotalShifts.set(tId, (teacherTotalShifts.get(tId) || 0) + 1);
               if (!teacherCommittees.has(tId)) teacherCommittees.set(tId, new Set());
               teacherCommittees.get(tId)?.add(String(comm.id));
               if (!dailyTeacherAssignments.has(date)) dailyTeacherAssignments.set(date, new Set());
               dailyTeacherAssignments.get(date)?.add(tId);
               dailyCommitteeCount.set(commKey, (dailyCommitteeCount.get(commKey) || 0) + 1);
            }
         }
      }

      for (const date of uniqueExamDates) {
         for (const comm of committees) {
            const commKey = `${date}_${comm.id}`;
            while ((dailyCommitteeCount.get(commKey) || 0) < 2) {
               let bestTeacher: any = null;
               let minShifts = Infinity;
               const shuffledTeachers = [...eligibleTeachers].sort(() => Math.random() - 0.5);

               for (const teacher of shuffledTeachers) {
                  const tId = String(teacher.id);
                  const isAssignedToday = dailyTeacherAssignments.get(date)?.has(tId);
                  const hasSupervisedThisCommBefore = teacherCommittees.get(tId)?.has(String(comm.id));

                  if (!isAssignedToday && !hasSupervisedThisCommBefore) {
                     const shifts = teacherTotalShifts.get(tId) || 0;
                     if (shifts < minShifts) { minShifts = shifts; bestTeacher = teacher; }
                  }
               }

               if (!bestTeacher) {
                  for (const teacher of shuffledTeachers) {
                     const tId = String(teacher.id);
                     if (!dailyTeacherAssignments.get(date)?.has(tId)) {
                        const shifts = teacherTotalShifts.get(tId) || 0;
                        if (shifts < minShifts) { minShifts = shifts; bestTeacher = teacher; }
                     }
                  }
               }

               if (!bestTeacher) break;

               const tId = String(bestTeacher.id);
               newAssignments.push({ committee_id: comm.id, teacher_id: tId, exam_date: date, status: 'pending' });

               teacherTotalShifts.set(tId, (teacherTotalShifts.get(tId) || 0) + 1);
               if (!teacherCommittees.has(tId)) teacherCommittees.set(tId, new Set());
               teacherCommittees.get(tId)?.add(String(comm.id));
               if (!dailyTeacherAssignments.has(date)) dailyTeacherAssignments.set(date, new Set());
               dailyTeacherAssignments.get(date)?.add(tId);
               dailyCommitteeCount.set(commKey, (dailyCommitteeCount.get(commKey) || 0) + 1);
            }
         }
      }

      if (newAssignments.length > 0) {
         const chunkSize = 100;
         for (let i = 0; i < newAssignments.length; i += chunkSize) {
            await supabase.from('committee_invigilators').insert(newAssignments.slice(i, i + chunkSize));
         }
         alert(`تم التوزيع بنجاح! تم إضافة ${newAssignments.length} تكليف.`);
         fetchData();
      } else {
         alert('جميع اللجان مكتملة أو استنفذنا طاقة المعلمين المتاحين!');
      }

    } catch (err: any) { alert('خطأ في التوزيع الآلي: ' + err.message); } finally { setIsAutoAssigning(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Stub
  };

  const printDocument = async (committeeId: string, type: 'door_sheet' | 'desk_cards' | 'invigilator_ids' | 'class_cards' | 'head_ids' | 'signatures_sheet' | 'custom_ids', classNameToPrint?: string) => {
    setIsPrinting(true);
    try {
      let finalDataToPrint = [];
      let committee = { name: 'لجنة عامة', id: committeeId };

      if (['door_sheet', 'desk_cards', 'class_cards', 'signatures_sheet'].includes(type)) {
         let query = supabase.from('student_seat_allocations')
           .select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) ), exam_committees ( id, name )`)
           .eq('academic_year', currentYear).eq('semester', currentSemester);

         if (committeeId) {
           query = query.eq('committee_id', committeeId).order('seat_number', { ascending: true });
         }
         const { data } = await query;
         finalDataToPrint = Array.isArray(data) ? data : [];
         committee = committees.find(c => String(c?.id) === String(committeeId)) || committee;

         if (type === 'class_cards' && classNameToPrint) {
           finalDataToPrint = finalDataToPrint.filter(s => getFullClassName(s?.students) === classNameToPrint);
           finalDataToPrint.sort((a, b) => getSafeName(a?.students?.users).localeCompare(getSafeName(b?.students?.users), 'ar'));
         }
      }

      let currentDayInvigilators = [];
      let eligibleHeadsForPrint = [];

      if (type === 'invigilator_ids') currentDayInvigilators = teachers.filter(t => !t.is_excluded_from_exams && !t.is_committee_head);
      if (type === 'head_ids') eligibleHeadsForPrint = teachers.filter(t => t.is_committee_head);

      if (['door_sheet','desk_cards','class_cards'].includes(type) && finalDataToPrint.length === 0) { 
        alert('لا يوجد طلاب للطباعة!'); setIsPrinting(false); return; 
      }
      if (type === 'invigilator_ids' && currentDayInvigilators.length === 0) { 
        alert('لا يوجد مراقبون لطباعة هوياتهم!'); setIsPrinting(false); return; 
      }
      if (type === 'head_ids' && eligibleHeadsForPrint.length === 0) {
        alert('لا يوجد رؤساء لطباعة هوياتهم!'); setIsPrinting(false); return;
      }

      setPrintData({ 
        students: finalDataToPrint, 
        committee, 
        invigilators: currentDayInvigilators, 
        className: classNameToPrint, 
        heads: eligibleHeadsForPrint,
        allInvigilators: invigilators.filter(i => String(i?.committee_id) === String(committeeId)),
        allHeads: allHeads,
        timetables: timetables,
        uniqueDates: uniqueExamDates,
        customIds: customIdsList
      }); 
      
      setPrintType(type);

      // 🛡️ Safe timeout logic to ensure render
      setTimeout(async () => {
        if (!printRef.current) { 
            alert('الرجاء المحاولة مرة أخرى.');
            setIsPrinting(false); 
            return; 
        }
        
        try {
          // 🛡️ Safe Promise Race to avoid hanging fonts
          try { await Promise.race([document.fonts.ready, new Promise(res => setTimeout(res, 1000))]); } catch(e) {}
          
          let html2canvasModule;
          try {
             html2canvasModule = await import('html2canvas-pro');
          } catch(e) {
             alert('تعذر تحميل مكتبة الطباعة، تأكد من الاتصال.');
             setIsPrinting(false);
             return;
          }
          
          const html2canvas = html2canvasModule.default || html2canvasModule;
          const { jsPDF } = await import('jspdf');

          window.scrollTo(0, 0); const isMobile = window.innerWidth < 768;
          const pages = printRef.current.querySelectorAll('.print-page-wrapper');
          if (pages.length === 0) { 
              alert('خطأ في بناء العرض المرئي للطباعة، حاول مرة أخرى.');
              setIsPrinting(false); return; 
          }
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const pdfWidth = pdf.internal.pageSize.getWidth(); 
          const pdfHeight = pdf.internal.pageSize.getHeight(); 

          for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i] as HTMLElement;
            const canvas = await html2canvas(pageElement, { scale: isMobile ? 1.5 : 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0, scrollX: 0, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 1.0); 
            
            const imgProps = pdf.getImageProperties(imgData);
            const totalImgHeightInMm = (imgProps.height * pdfWidth) / imgProps.width;
            
            if (i > 0) pdf.addPage(); 
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, totalImgHeightInMm);
          }
          let fileName = `مستند_${type}`;
          pdf.save(`${fileName}.pdf`);
        } catch (err: any) { alert('خطأ داخلي أثناء بناء الـ PDF.'); console.error(err); } finally { setPrintData(null); setPrintType(null); setIsPrinting(false); setIsClassPrintModalOpen(false); }
      }, 2000); 
    } catch (e) { alert('خطأ في الطباعة'); console.error(e); setIsPrinting(false); }
  };

  const getTeacherTotalAssignments = (tId: string) => invigilators.filter(i => String(i?.teacher_id) === String(tId));
  const alreadyAssignedCommittees = currentHeads.flatMap(h => String(h?.committees_range || '').split('، '));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo pb-24" dir="rtl">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      { (isEngineLoading || isPrinting || isAutoAssigning) && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
          <h2 className="text-xl font-black animate-pulse text-center px-4">
             {isPrinting ? 'جاري رسم ومعالجة قوالب الطباعة العالية الدقة...' : isAutoAssigning ? 'جاري تشغيل خوارزمية التوزيع الذكي...' : String(progressMsg || 'جاري التحميل')}
          </h2>
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
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><LayoutGrid className="w-8 h-8 text-indigo-600" /> كنترول الامتحانات {isFinalized && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md border border-emerald-200 ml-2 shadow-sm">مُعتمد</span>}</h1>
              <p className="text-slate-500 font-bold text-sm mt-1">توزيع وإدارة المهام حسب الجدول اليومي</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('management')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='management' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>اللجان</button>
              <button onClick={() => setActiveTab('invigilators_radar')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='invigilators_radar' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>رادار المراقبين</button>
              <button onClick={() => setActiveTab('heads_radar')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='heads_radar' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>الرؤساء</button>
              <button onClick={() => setActiveTab('daily_stats')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='daily_stats' ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><FileText className="w-4 h-4 inline mr-1" /> إحصائية اليوم</button>
              <button onClick={() => setActiveTab('custom_ids')} className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab==='custom_ids' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><IdCard className="w-4 h-4 inline mr-1" /> هويات مخصصة</button>
            </div>
          </div>

          {uniqueExamDates.length > 0 && ['invigilators_radar', 'daily_stats', 'management'].includes(activeTab) && (
             <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-indigo-800 font-black shrink-0">
                   <CalendarDays className="w-6 h-6"/> تحديد يوم الاختبار:
                </div>
                <select 
                   value={activeExamDate} 
                   onChange={(e) => {
                      setActiveExamDate(e.target.value);
                      fetchHeadsByDate(e.target.value);
                   }} 
                   className="w-full md:w-auto flex-1 bg-white border border-indigo-200 rounded-xl p-3 font-black text-indigo-900 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
                >
                   {uniqueExamDates.map((date, di) => {
                      const count = timetables.filter(t => t?.exam_date === date).length;
                      return <option key={`ed-${di}`} value={date}>{date} (يتضمن {count} مواد)</option>
                   })}
                </select>
             </div>
          )}

          {activeTab === 'custom_ids' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                  <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2"><IdCard className="w-6 h-6 text-indigo-600"/> صانع الهويات المخصصة الإدارية</h3>
                  <p className="text-slate-500 font-bold text-sm mb-6">أنشئ بطاقات تعريفية مدمجة بالـ QR للجان الخاصة أو الموجهين أو أي مهام إدارية إضافية.</p>
                  
                  <div className="space-y-4 mb-6">
                    {customIdsList.map((cId, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                         <input type="text" placeholder="الاسم (مثال: د. أحمد محمد)" value={cId.name} onChange={(e) => { const n = [...customIdsList]; n[idx] = { ...n[idx], name: e.target.value }; setCustomIdsList(n); }} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 font-black text-slate-800 outline-none focus:border-indigo-500 w-full" />
                         <input type="text" placeholder="المهمة (مثال: موجه مقيم)" value={cId.role} onChange={(e) => { const n = [...customIdsList]; n[idx] = { ...n[idx], role: e.target.value }; setCustomIdsList(n); }} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 font-black text-slate-800 outline-none focus:border-indigo-500 w-full" />
                         <button onClick={() => { const n = customIdsList.filter((_, i) => i !== idx); setCustomIdsList(n); }} className="p-3 bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shrink-0 w-full sm:w-auto"><Trash2 className="w-5 h-5 mx-auto"/></button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setCustomIdsList([...customIdsList, {name: '', role: ''}])} className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-black py-3 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-center gap-2"><Plus className="w-5 h-5"/> إضافة حقل جديد</button>
                    <button onClick={() => printDocument('', 'custom_ids')} disabled={customIdsList.length === 0 || !customIdsList[0].name} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50"><PrinterIcon className="w-5 h-5"/> طباعة الهويات المخصصة</button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'invigilators_radar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               
               {invigilators.filter(i => i.status === 'excused' && i.exam_date === activeExamDate).length > 0 && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl shadow-sm">
                    <h3 className="text-xl font-black text-rose-600 mb-4 flex items-center gap-2"><AlertCircle className="w-6 h-6 animate-pulse"/> طلبات اعتذار قيد الانتظار ({activeExamDate})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {invigilators.filter(i => i.status === 'excused' && i.exam_date === activeExamDate).map((excuse, idx) => {
                          const committeeName = committees.find(c => c.id === excuse.committee_id)?.name;
                          return (
                             <div key={idx} className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                   <div>
                                      <p className="font-black text-slate-800 text-lg">{getSafeName(excuse.users)}</p>
                                      <p className="text-xs font-bold text-slate-500 mt-1">كان مكلفاً بـ: <span className="text-indigo-600 font-black">{committeeName}</span></p>
                                   </div>
                                   <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">اعتذار طارئ</span>
                                </div>
                                <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-50 text-xs font-bold text-rose-900 leading-relaxed">
                                   " {excuse.excuse_reason} "
                                </div>
                                <div className="flex gap-2 mt-2">
                                   <button onClick={() => handleRemoveInvigilator(excuse.id, getSafeName(excuse.users))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2 rounded-lg text-xs transition-colors shadow-md">إعفاء المعلم وإلغاء التكليف</button>
                                </div>
                             </div>
                          )
                       })}
                    </div>
                 </motion.div>
               )}

               <div className="bg-white border border-slate-200 rounded-3xl p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                     <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-500"/> رادار المراقبة</h3>
                     <div className="flex gap-2 w-full md:w-auto">
                       <button onClick={handleAutoAssignInvigilators} disabled={isAutoAssigning} className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
                          <Wand2 className="w-5 h-5"/> توزيع ذكي متوازن
                       </button>
                       <button onClick={handleResetStaffOnly} className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl border border-rose-100 transition-all flex justify-center items-center shadow-sm" title="تصفير المراقبين والرؤساء">
                          <Trash2 className="w-5 h-5"/>
                       </button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                     {teachers.filter(t => getTeacherTotalAssignments(String(t?.id)).length > 0).map((t, tIndex) => {
                       const totalDuties = getTeacherTotalAssignments(String(t?.id));
                       return (
                         <div key={`tr-${tIndex}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0 text-xl border-2 border-white shadow-sm overflow-hidden">
                               {t?.avatar_url ? <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="avatar" /> : String(t?.full_name || 'م').charAt(0)}
                             </div>
                             <div>
                               <h4 className="font-black text-slate-800 text-sm">{String(t?.full_name || 'غير معروف')}</h4>
                               <p className="text-[10px] font-bold text-slate-500 mt-1">إجمالي المراقبات: <span className="text-emerald-600 font-black text-sm">{totalDuties.length}</span></p>
                             </div>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-slate-100 flex-1">
                             <p className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1">سجل التكليفات المفصل:</p>
                             <div className="flex flex-col gap-2">
                               {totalDuties.map((duty, idx) => {
                                  const cName = committees.find(c => String(c?.id) === String(duty?.committee_id))?.name || 'غير معروف';
                                  return (
                                     <div key={`dty-${idx}`} className="flex flex-col bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-center mb-1">
                                           <span className="text-xs font-black text-slate-700">{String(cName)}</span>
                                           <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 rounded">{duty?.exam_date}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1 border-t border-slate-200/50 pt-1">
                                           {duty?.status === 'signed' ? <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> استلم</span> :
                                            duty?.status === 'excused' ? <button onClick={() => openReadExcuseModal(duty)} className="text-[9px] font-black text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"><AlertCircle className="w-3 h-3"/> عرض العذر</button> :
                                            <span className="text-[9px] font-bold text-slate-400">بانتظار التوقيع</span>}
                                        </div>
                                     </div>
                                  )
                               })}
                             </div>
                           </div>
                         </div>
                       )
                     })}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'daily_stats' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                  <div className="flex justify-between items-center mb-8 border-b-[3px] border-fuchsia-100 pb-4">
                     <div>
                        <h3 className="text-2xl font-black text-fuchsia-800 flex items-center gap-2 mb-2"><FileText className="w-7 h-7 text-fuchsia-600"/> إحصائية لجان المراقبة اليومية</h3>
                        <p className="text-sm font-bold text-fuchsia-600">تقرير مفصل ليوم: {activeExamDate}</p>
                     </div>
                     <button onClick={() => window.print()} className="px-4 py-2 bg-fuchsia-600 text-white font-black rounded-xl hover:bg-fuchsia-700 shadow-sm print:hidden">طباعة الإحصائية</button>
                  </div>
                  <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                     <h4 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-200 pb-2">المواد المختبرة في هذا اليوم:</h4>
                     <div className="flex flex-wrap gap-2">
                        {timetables.filter(t => t.exam_date === activeExamDate).map((t, idx) => (
                           <span key={`sub-${idx}`} className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                              {t.subjects?.name} <span className="text-indigo-500 font-black">({t.class_level === 10 ? 'عاشر' : 'حادي عشر'})</span>
                           </span>
                        ))}
                     </div>
                  </div>
                  <div className="mb-6 bg-amber-50 p-5 rounded-2xl border border-amber-200">
                     <h4 className="text-sm font-black text-amber-900 mb-3 border-b border-amber-200/50 pb-2 flex items-center gap-2"><Crown className="w-4 h-4"/> رؤساء اللجان لهذا اليوم:</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentHeads.length > 0 ? currentHeads.map((h, i) => (
                           <div key={`h-stat-${i}`} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 overflow-hidden">
                                 {h?.users?.avatar_url ? <img src={h.users.avatar_url} className="w-full h-full object-cover"/> : <Crown className="w-5 h-5 text-amber-600"/>}
                              </div>
                              <div>
                                 <p className="font-black text-sm text-slate-800">{getSafeName(h?.users)}</p>
                                 <p className="text-[10px] font-bold text-amber-600 mt-1">مسؤول عن: {h?.committees_range}</p>
                              </div>
                           </div>
                        )) : <p className="text-xs font-bold text-amber-600">لم يتم تعيين رؤساء لجان لهذا اليوم.</p>}
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">توزيع المراقبين على اللجان:</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {committees.map((comm, idx) => {
                           const commInvigs = invigilators.filter(i => String(i?.committee_id) === String(comm.id) && i.exam_date === activeExamDate);
                           return (
                              <div key={`c-stat-${idx}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                 <h5 className="font-black text-indigo-700 border-b border-slate-100 pb-2 mb-3">{comm.name}</h5>
                                 {commInvigs.length > 0 ? (
                                    <ul className="space-y-2">
                                       {commInvigs.map((inv, iIdx) => (
                                          <li key={`inv-${iIdx}`} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                             <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0"/> {getSafeName(inv.users)}
                                          </li>
                                       ))}
                                    </ul>
                                 ) : (
                                    <p className="text-xs font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-lg">لا يوجد مراقبون</p>
                                 )}
                              </div>
                           )
                        })}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'heads_radar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white border border-slate-200 rounded-3xl p-6">
                 <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><UserCheck className="w-6 h-6 text-emerald-600"/> 1. تعيين رؤساء اللجان (اعتماد الفريق الدائم)</h3>
                 <p className="text-xs font-bold text-slate-500 mb-6">ابحث عن المعلم، واعتمد كونه "رئيس لجنة". بمجرد الاعتماد سيتم استبعاده من المراقبات التلقائية اليومية ليتفرغ للرئاسة.</p>
                 <div className="relative mb-4">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner" placeholder="ابحث عن اسم المعلم لتعيينه رئيساً..." value={headSearchTerm} onChange={(e) => setHeadSearchTerm(e.target.value)} />
                 </div>
                 <div className="max-h-56 overflow-y-auto custom-scrollbar p-2 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                    {teachers.filter(t => String(t?.full_name || '').includes(headSearchTerm)).map((t, idx) => {
                       const isHead = t.is_committee_head;
                       return (
                          <div key={`hdl-${idx}`} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isHead ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                     {t?.avatar_url ? <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">{String(t?.full_name || 'م').charAt(0)}</div>}
                                 </div>
                                 <div>
                                     <p className={`text-sm font-black ${isHead ? 'text-amber-800' : 'text-slate-800'}`}>{t?.full_name}</p>
                                     <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">{t?.subjectsStr}</p>
                                 </div>
                             </div>
                             <button type="button" onClick={() => handleToggleCommitteeHead(String(t?.id), isHead)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all shadow-sm ${isHead ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                                 {isHead ? 'إلغاء صفة الرئاسة' : 'تعيين كرئيس لجنة'}
                             </button>
                          </div>
                       )
                    })}
                 </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-3xl p-6">
                 <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                   <CalendarDays className="w-6 h-6 text-indigo-500"/> 2. التكليف اليومي لرؤساء اللجان المعتمدين
                 </h3>
                 <div className="space-y-6">
                   <div>
                     <label className="block text-sm font-black text-slate-700 mb-2">أ) حدد اليوم الامتحاني</label>
                     <select value={headAssignment.date} onChange={(e) => { setHeadAssignment({...headAssignment, date: e.target.value, head_teacher_id: ''}); fetchHeadsByDate(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                       <option value="">- اضغط لاختيار اليوم الامتحاني -</option>
                       {uniqueExamDates.map((date, di) => {
                          const count = timetables.filter(t => t?.exam_date === date).length;
                          return <option key={`d-${di}`} value={date}>{date} (يتضمن {count} امتحانات)</option>
                       })}
                     </select>
                   </div>
                   {headAssignment.date && (
                     <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
                       <label className="block text-sm font-black text-slate-700 mb-2">ب) اختر اللجان (يمكنك تحديد عدة لجان لرئيس واحد)</label>
                       <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                          {committees.filter(c => !String(c?.name || '').includes('الفائض')).map((c, ci) => {
                            const isAssigned = alreadyAssignedCommittees.includes(c?.name);
                            const isSelected = selectedCommitteesForHead.includes(c?.name);
                            return (
                              <button type="button" key={`hc-${ci}`} disabled={isAssigned} onClick={() => toggleCommitteeSelectionForHead(c?.name)} className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 border shadow-sm ${isAssigned ? 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed' : isSelected ? 'bg-indigo-600 text-white border-indigo-700 scale-105' : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-700'}`}>
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
                       <label className="block text-sm font-black text-slate-700 mb-2">ج) من سيتولى رئاسة هذه اللجان المحددة؟</label>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <select value={headAssignment.head_teacher_id} onChange={(e) => setHeadAssignment({...headAssignment, head_teacher_id: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm">
                           <option value="">- اختر رئيس اللجان المعتمد -</option>
                           {teachers.filter(t => t.is_committee_head).map((t, ti) => <option key={`ht-${ti}`} value={t?.id}>👑 {t?.full_name}</option>)}
                         </select>
                         <button type="button" onClick={handleAssignHead} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 sm:py-0 rounded-xl transition-all shadow-md text-lg flex items-center gap-2 justify-center">
                            <CheckCircle2 className="w-5 h-5"/> اعتماد التكليف
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </div>
               </div>

               {headAssignment.date && (
                 <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> تكليفات رؤساء اللجان لليوم الامتحاني المحدد:</h4>
                    <div className="space-y-3">
                       {currentHeads.length > 0 ? currentHeads.map((head, hi) => (
                          <div key={`h-asg-${hi}`} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black shrink-0 overflow-hidden">
                                   {head?.users?.avatar_url ? <img src={head.users.avatar_url} className="w-full h-full rounded-full object-cover" alt="img" /> : <Crown className="w-6 h-6"/>}
                                </div>
                                <div>
                                   <p className="font-black text-slate-900 text-base">{getSafeName(head?.users)}</p>
                                   <div className="flex flex-wrap gap-1 mt-1.5">
                                      {String(head?.committees_range || '').split('، ').filter(Boolean).map((cr:string, i:number) => (
                                        <span key={`cr-${i}`} className="font-bold text-amber-800 text-[11px] bg-amber-100 px-2 py-1 rounded-md border border-amber-200">{cr}</span>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <button type="button" onClick={() => handleDeleteHead(head?.head_teacher_id, headAssignment.date)} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm" title="إزالة التكليف"><Trash2 className="w-5 h-5"/></button>
                          </div>
                       )) : <p className="text-center text-sm font-bold text-slate-400 py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">لم يتم تكليف أي رئيس لهذا اليوم الامتحاني بعد.</p>}
                    </div>
                 </div>
               )}
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

              <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center gap-4 mb-6 border-b border-slate-200 pb-6">
                 <div className="flex flex-wrap gap-2 flex-1">
                    {committees.length === 0 ? (
                      <button type="button" onClick={() => setIsBuilderModalOpen(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"><Plus className="w-5 h-5" /> بناء هندسي للجان</button>
                    ) : (
                      <>
                        <button type="button" onClick={handleDistribute} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md flex items-center gap-2"><Users className="w-4 h-4" /> توزيع السحّاب</button>
                        <button type="button" onClick={() => setIsClassPrintModalOpen(true)} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl shadow-md flex items-center gap-2"><Layers className="w-4 h-4" /> طباعة بطاقات الفصول</button>
                        <button type="button" onClick={() => setIsExemptionsModalOpen(true)} className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-black text-sm rounded-xl shadow-sm flex items-center gap-2"><UserMinus className="w-4 h-4" /> إعفاء معلمين</button>
                        <button type="button" onClick={() => openCommitteeModal()} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-xl flex items-center gap-2"><Plus className="w-4 h-4" /> لجنة يدوية</button>
                        <button type="button" onClick={handleSoftReset} className="px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black text-sm rounded-xl flex items-center gap-2"><Trash2 className="w-4 h-4" /> تفريغ الطلاب</button>
                        <button type="button" onClick={handleNuclear} className="px-5 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-sm rounded-xl flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> هدم اللجان</button>
                      </>
                    )}
                 </div>
                 
                 {committees.length > 0 && (
                   <div className="flex gap-2">
                     <button onClick={handleToggleFinalize} className={`px-6 py-3 font-black rounded-xl border flex items-center gap-2 shadow-sm transition-all ${isFinalized ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'}`}>
                        {isFinalized ? <Lock className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
                        {isFinalized ? 'إلغاء الاعتماد النهائي' : 'اعتماد اللجان النهائي'}
                     </button>
                   </div>
                 )}
              </div>

              {!activeExamDate ? (
                <div className="flex justify-center p-20 flex-col items-center gap-4 bg-white rounded-3xl border border-dashed border-indigo-200">
                   <CalendarDays className="w-16 h-16 text-indigo-200" />
                   <h3 className="font-black text-slate-500">يرجى إضافة جداول اختبارات وتحديد اليوم الامتحاني لعرض اللجان.</h3>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {committees.map((committee: any, idx: number) => {
                    const stdCount = Number(allocationsStats[committee?.id] || 0);
                    const commInvigs = invigilators.filter(i => String(i?.committee_id) === String(committee?.id) && i.exam_date === activeExamDate);
                    const isFull = stdCount >= Number(committee?.capacity || 0);
                    const isOverflow = String(committee?.name || '').includes('الفائض');

                    return (
                      <div key={`comm-${idx}`} className={`bg-white rounded-2xl p-5 border ${isOverflow ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} shadow-sm flex flex-col`}>
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className={`text-lg font-black ${isOverflow ? 'text-rose-700' : 'text-slate-800'}`}>{String(committee?.name || 'بدون اسم')}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">السعة: {Number(committee?.capacity || 0)} {committee?.location && `| ${String(committee.location)}`}</p>
                          </div>
                          <div className="flex gap-2">
                             <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openViewModal(committee); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer z-10 flex items-center justify-center">
                               {actionLoadingId === `view-${committee.id}` ? <Loader2 className="w-5 h-5 animate-spin"/> : <Eye className="w-5 h-5"/>}
                             </button>
                             <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCommitteeModal(committee); }} className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shadow-sm cursor-pointer z-10 flex items-center justify-center">
                               <Edit3 className="w-5 h-5"/>
                             </button>
                             <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCommittee(committee?.id); }} disabled={actionLoadingId === `del-${committee.id}`} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm cursor-pointer z-10 flex items-center justify-center">
                               {actionLoadingId === `del-${committee.id}` ? <Loader2 className="w-5 h-5 animate-spin"/> : <Trash2 className="w-5 h-5"/>}
                             </button>
                          </div>
                        </div>

                        <div className="flex-1 mb-4">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-xs font-black text-slate-500">المراقبون ({commInvigs.length}/2) - {activeExamDate}</p>
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isOverflow ? 'bg-rose-200 text-rose-800' : isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{stdCount} طالب</span>
                          </div>
                          <div className="space-y-2">
                            {commInvigs.map((inv, iIdx) => {
                              const tName = getSafeName(inv?.users);
                              return (
                                <div key={`i-${iIdx}`} className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100 gap-1.5">
                                  <div className="flex justify-between items-center">
                                     <span className="text-xs font-bold text-slate-800 truncate pr-1">{tName}</span>
                                     <button type="button" onClick={() => handleRemoveInvigilator(inv?.id, tName)} className="text-slate-400 hover:text-rose-500 p-1"><X className="w-3 h-3"/></button>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-0.5">
                                     {inv?.status === 'signed' ? (
                                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> وقع الاستلام</span>
                                     ) : inv?.status === 'excused' ? (
                                        <button type="button" onClick={() => openReadExcuseModal(inv)} className="text-[9px] font-black text-rose-500 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-rose-200 transition-colors cursor-pointer"><AlertCircle className="w-3 h-3"/> عرض العذر</button>
                                     ) : (
                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> قيد الانتظار</span>
                                     )}
                                  </div>
                                </div>
                              )
                            })}
                            {commInvigs.length < 2 && (
                              <button type="button" onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }} className="w-full py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition-colors mt-2"><UserPlus className="w-3 h-3 inline mr-1" /> إضافة مراقب لليوم</button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-auto pt-3 border-t border-slate-100">
                          <button type="button" onClick={() => printDocument(committee?.id, 'door_sheet')} className="bg-slate-800 text-white text-[10px] font-black py-2 rounded-lg hover:bg-slate-700 flex justify-center items-center"><Users className="w-3 h-3 mr-1"/> كشف الطلاب</button>
                          <button type="button" onClick={() => printDocument(committee?.id, 'signatures_sheet')} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black py-2 rounded-lg hover:bg-emerald-100 flex justify-center items-center"><FileSignature className="w-3 h-3 mr-1"/> التوقيعات</button>
                          <button type="button" onClick={() => printDocument(committee?.id, 'desk_cards')} className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2 rounded-lg hover:bg-indigo-100 flex justify-center items-center"><IdCard className="w-3 h-3 mr-1"/> الطاولة</button>
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

      {/* النوافذ المنبثقة */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-emerald-600"/> هندسة اللجان</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-bold text-slate-600">كم عدد اللجان الإجمالي؟</label><input type="number" min="1" max="100" value={builderData.count} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, count: isNaN(v) ? 1 : Math.min(100, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" /></div>
              <div><label className="text-sm font-bold text-slate-600">سعة اللجنة الواحدة؟</label><input type="number" min="1" max="50" value={builderData.capacity} onChange={e => { const v = parseInt(e.target.value); setBuilderData({...builderData, capacity: isNaN(v) ? 1 : Math.min(50, Math.max(1, v))}) }} className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500" /><p className="text-[10px] text-slate-400 text-center mt-1">السعة القصوى 50 طالب للجنة.</p></div>
              <div className="flex gap-2 pt-2"><button type="button" onClick={handleBuild} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700">بناء واعتماد</button><button type="button" onClick={() => setIsBuilderModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200">إلغاء</button></div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isExemptionsModalOpen && (
           <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setIsExemptionsModalOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-3xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-hidden flex flex-col">
                 <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserMinus className="w-6 h-6 text-rose-500"/> إدارة إعفاءات المعلمين</h3>
                    <button type="button" onClick={() => setIsExemptionsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="relative mb-4 shrink-0">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-rose-500 transition-colors" placeholder="ابحث عن معلم لإعفائه من المراقبة..." value={exemptionSearchTerm} onChange={(e) => setExemptionSearchTerm(e.target.value)} />
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                     {teachers.filter(t => String(t?.full_name || '').includes(exemptionSearchTerm) || String(t?.subjectsStr || '').includes(exemptionSearchTerm)).map((t, index) => {
                         const isExcluded = t?.is_excluded_from_exams;
                         return (
                            <div key={`exm-${index}`} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isExcluded ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                       {t?.avatar_url ? <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="av" /> : <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">{String(t?.full_name || 'م').charAt(0)}</div>}
                                   </div>
                                   <div>
                                       <p className={`text-sm font-black ${isExcluded ? 'text-rose-700' : 'text-slate-800'}`}>{t?.full_name}</p>
                                   </div>
                               </div>
                               <button type="button" onClick={() => handleToggleExemption(String(t?.id), isExcluded)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all shadow-sm ${isExcluded ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                   {isExcluded ? 'إلغاء الإعفاء' : 'إعفاء من المراقبة'}
                               </button>
                            </div>
                         )
                     })}
                 </div>
              </motion.div>
           </>
        )}
      </AnimatePresence>

      {isClassPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsClassPrintModalOpen(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Layers className="w-6 h-6 text-emerald-600"/> طباعة بطاقات الفصول</h3>
              <button type="button" onClick={() => setIsClassPrintModalOpen(false)} className="p-2 bg-slate-50 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-4">اختر الصف لطباعة بطاقات جميع طلابه مجمعة.</p>
            {availableClasses.length === 0 ? (
              <p className="text-center text-sm font-bold text-slate-500 py-8">لا يوجد طلاب موزعون بعد للطباعة.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                 {availableClasses.map((cls, ci) => (
                   <button type="button" key={`cls-${ci}`} onClick={() => printDocument('', 'class_cards', cls)} className="w-full bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 p-4 rounded-xl text-right transition-all flex items-center justify-between group">
                     <span className="font-black text-slate-700 group-hover:text-emerald-700">{cls}</span>
                     <PrinterIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                   </button>
                 ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                 {viewCommitteeDetails.loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                       <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                       <p className="text-sm font-bold text-slate-500">جاري سحب بيانات الطلاب...</p>
                    </div>
                 ) : (
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
                             const stdName = getSafeName(s?.students?.users);
                             const fullClassName = getFullClassName(s?.students);
                             return (
                               <tr key={`vstd-${idx}`} className="even:bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                                 <td className="p-3 border-b border-slate-100 font-black text-indigo-600 tracking-widest">{s?.seat_number}</td>
                                 <td className="p-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                                    <span className="truncate max-w-[200px]">{stdName}</span>
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
                 )}
              </div>
           </div>
        </div>
      )}

      <AnimatePresence>
        {isCommitteeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCommitteeModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-6 h-6 text-indigo-600"/> {editCommitteeData.id ? 'تعديل بيانات اللجنة' : 'إضافة لجنة جديدة يدويّاً'}</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-600 mb-1 block">اسم اللجنة (مثال: لجنة الحالات الخاصة)</label>
                  <input type="text" value={editCommitteeData.name} onChange={e => setEditCommitteeData({...editCommitteeData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-600 mb-1 block">السعة القصوى</label>
                    <input type="number" min="1" value={editCommitteeData.capacity} onChange={e => setEditCommitteeData({...editCommitteeData, capacity: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-600 mb-1 block">المكان (اختياري)</label>
                    <input type="text" placeholder="رقم الفصل..." value={editCommitteeData.location} onChange={e => setEditCommitteeData({...editCommitteeData, location: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleSaveCommittee} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black shadow-md transition-colors">حفظ واعتماد</button>
                <button type="button" onClick={() => setIsCommitteeModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-black transition-colors">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAssignModalOpen && selectedCommittee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><UserPlus className="w-6 h-6 text-emerald-600"/> تعويض / تكليف مراقب</h3>
              <p className="text-sm font-bold text-slate-500 mb-6">لجنة: <span className="text-indigo-600">{selectedCommittee.name}</span> | التاريخ: <span className="text-indigo-600">{activeExamDate}</span></p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-600 mb-2 block">اختر المعلم المتاح للتكليف:</label>
                  <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-black text-slate-800 outline-none focus:border-emerald-500">
                    <option value="">- اختر معلم -</option>
                    {teachers.filter(t => !t.is_excluded_from_exams && !t.is_committee_head).map((t, idx) => (
                      <option key={idx} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleAddInvigilator} disabled={!selectedTeacherId} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-black shadow-md transition-colors">اعتماد التكليف</button>
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-black transition-colors">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReadExcuseModalOpen && selectedExcuseData && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsReadExcuseModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b border-rose-100 pb-4">
                 <h3 className="text-xl font-black text-rose-600 flex items-center gap-2"><AlertCircle className="w-6 h-6"/> عذر عن المراقبة</h3>
                 <button onClick={() => setIsReadExcuseModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="mb-6">
                 <p className="text-sm font-bold text-slate-500 mb-1">المعلم المعتذر:</p>
                 <p className="text-lg font-black text-slate-800 mb-4">{getSafeName(selectedExcuseData.users)}</p>
                 <p className="text-sm font-bold text-slate-500 mb-1">سبب الاعتذار المُقدم:</p>
                 <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-900 font-bold text-sm min-h-[100px]">
                    {selectedExcuseData.excuse_reason || 'لم يتم كتابة سبب مفصل من قبل المعلم.'}
                 </div>
              </div>
              <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => handleRemoveInvigilator(selectedExcuseData.id, getSafeName(selectedExcuseData.users))} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black shadow-md transition-colors flex justify-center items-center gap-2">
                  <UserMinus className="w-5 h-5"/> قبول العذر وإلغاء التكليف
                </button>
                <button type="button" onClick={() => setIsReadExcuseModalOpen(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-black transition-colors">إغلاق</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🖨️ قوالب الطباعة المعالجة لدعم اللغة العربية والـ QR بدقة تامة */}
      {printData && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, opacity: 0.01, pointerEvents: 'none' }}>
          <div ref={printRef} className="flex flex-col bg-white" dir="rtl" style={{ fontFamily: '"Cairo", sans-serif', textRendering: 'optimizeLegibility' }}>
            
            {isFinalized && (
               <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '140px', color: 'rgba(16, 185, 129, 0.07)', fontWeight: '900', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>مُعْتَمَد رَسْمِيّاً</div>
            )}

            {/* 📄 1. محضر اللجنة / كشف أسماء الطلاب النظيف المفرغ من التوقيعات */}
            {printType === 'door_sheet' && chunkArray(printData.students, 16).map((chunk, pageIdx, chunksArr) => (
              <div key={`ds-${pageIdx}`} className="print-page-wrapper bg-white mx-auto relative flex flex-col" style={{ width: '794px', height: '1122px', padding: '35px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 <div className="text-center mb-6 border-b-[3px] border-black pb-4 shrink-0 relative z-10">
                    <h1 className="text-2xl font-black text-black">وزارة التربية - إدارة التعليم الخاص</h1>
                    <h2 className="text-xl font-black text-black mt-1">مدرسة الرفعة النموذجية بنين (م-ث)</h2>
                    <h3 className="text-2xl font-black text-black mt-3 border-2 border-black inline-block px-8 py-1.5 bg-slate-100 rounded-2xl">{printData.committee?.name || 'لجنة غير محددة'}</h3>
                    <p className="text-lg font-black text-black mt-3">كشف أسماء الطلاب - الفصل الدراسي الثاني 2025/2026</p>
                 </div>
                 <table className="w-full border-collapse border-[3px] border-black text-sm text-black relative z-10 mb-auto">
                   <thead>
                     <tr className="bg-slate-100 border-b-[3px] border-black h-12">
                       <th className="border-l-[3px] border-black p-2 w-10 text-center">م</th>
                       <th className="border-l-[3px] border-black p-2 w-28 text-center">رقم الجلوس</th>
                       <th className="border-l-[3px] border-black p-2 text-center">اسم الطالب الرباعي</th>
                       <th className="p-2 w-36 text-center">الصف والشعبة</th>
                     </tr>
                   </thead>
                   <tbody>
                     {chunk.map((s:any, i:number) => {
                       const globalIndex = (pageIdx * 16) + i + 1;
                       return (
                         <tr key={`p1-${i}`} className="border-b-[2px] border-black h-[48px]">
                           <td className="border-l-[3px] border-black px-2 text-center font-bold">{globalIndex}</td>
                           <td className="border-l-[3px] border-black px-2 text-center font-black text-lg">{s?.seat_number}</td>
                           <td className="border-l-[3px] border-black px-3 font-bold text-base">{getSafeName(s?.students?.users)}</td>
                           <td className="px-2 text-center font-bold text-xs">{getFullClassName(s?.students)}</td>
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
                 <div className="flex-1"></div>
                 <div className="text-left mt-4 text-[10px] font-bold text-slate-500 shrink-0">صفحة {pageIdx + 1} من {chunksArr.length}</div>
              </div>
            ))}

            {/* 📄 2. سجل توقيعات اللجنة المخصص */}
            {printType === 'signatures_sheet' && (
              <div className="print-page-wrapper bg-white mx-auto relative flex flex-col" style={{ width: '794px', height: '1122px', padding: '35px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 <div className="text-center mb-6 border-b-[3px] border-black pb-4 shrink-0 relative z-10">
                    <h1 className="text-2xl font-black text-black">وزارة التربية - إدارة التعليم الخاص</h1>
                    <h2 className="text-xl font-black text-black mt-1">مدرسة الرفعة النموذجية بنين (م-ث)</h2>
                    <h3 className="text-2xl font-black text-black mt-3 border-2 border-black inline-block px-8 py-1.5 bg-slate-100 rounded-2xl">{printData.committee?.name || 'لجنة غير محددة'}</h3>
                    <p className="text-lg font-black text-black mt-3">سجل توقيعات الملاحظين ورؤساء اللجان - الفصل الدراسي الثاني 2025/2026</p>
                 </div>

                 <table className="w-full border-collapse border-[3px] border-black text-sm text-black relative z-10 mb-auto">
                   <thead>
                     <tr className="bg-slate-100 border-b-[3px] border-black h-12">
                       <th className="border-l-[3px] border-black p-2 text-center w-24">اليوم والتاريخ</th>
                       <th className="border-l-[3px] border-black p-2 text-center w-32">المادة</th>
                       <th className="border-l-[3px] border-black p-2 text-center w-40">المراقب الأول</th>
                       <th className="border-l-[3px] border-black p-2 text-center w-40">المراقب الثاني</th>
                       <th className="p-2 text-center w-40">رئيس اللجنة</th>
                     </tr>
                   </thead>
                   <tbody>
                     {printData.uniqueDates.map((date: string, i: number) => {
                       const dayExams = printData.timetables.filter(t => t.exam_date === date);
                       const subjectsStr = dayExams.map(ex => ex.subjects?.name).join(' + ');

                       return (
                         <tr key={`sig-${i}`} className="border-b-[2px] border-black h-[72px]">
                           <td className="border-l-[3px] border-black px-2 text-center font-bold text-xs">{date}</td>
                           <td className="border-l-[3px] border-black px-2 text-center font-bold text-xs">{subjectsStr || '---'}</td>
                           <td className="border-l-[3px] border-black px-2 text-center text-xs relative bg-slate-50/30">
                              <div className="font-bold mb-5 text-slate-400">الاسم: ..........................</div>
                              <div className="text-[10px] text-slate-400 absolute bottom-2 w-full text-center">التوقيع: .....................</div>
                           </td>
                           <td className="border-l-[3px] border-black px-2 text-center text-xs relative bg-slate-50/30">
                              <div className="font-bold mb-5 text-slate-400">الاسم: ..........................</div>
                              <div className="text-[10px] text-slate-400 absolute bottom-2 w-full text-center">التوقيع: .....................</div>
                           </td>
                           <td className="px-2 text-center text-xs relative bg-slate-50/30">
                              <div className="font-bold mb-5 text-slate-400">الاسم: ..........................</div>
                              <div className="text-[10px] text-slate-400 absolute bottom-2 w-full text-center">التوقيع: .....................</div>
                           </td>
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
                 <div className="flex-1"></div>
              </div>
            )}

            {/* 📄 3. بطاقات الطلاب للفصول */}
            {printType === 'class_cards' && chunkArray(printData.students, 8).map((chunk, pageIdx) => (
              <div key={`pc2-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 {chunk.map((student:any, si) => {
                    const stdName = getSafeName(student?.students?.users);
                    const fullClassName = getFullClassName(student?.students);
                    const commName = student?.exam_committees?.name || 'غير محدد';
                    const qrPayload = `raf-id:${student?.student_id}`; 
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                       <div key={`c-${si}`} style={{ width: '85mm', height: '55mm', border: '3px solid black', position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '1rem', overflow: 'hidden', boxSizing: 'border-box' }}>
                          <div style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid black', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '11px', color: 'black', margin: 0, padding: 0 }}>مدرسة الرفعة النموذجية بنين (م-ث)</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>بطاقة جلوس اختبارات نهاية العام</div>
                             </div>
                             <div style={{ backgroundColor: 'black', color: 'white', padding: '2px 8px', fontWeight: '900', fontSize: '10px', border: '1px solid black', borderRadius: '6px' }}>{commName}</div>
                          </div>
                          <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }} dir="rtl">
                             <div style={{ width: '20mm', height: '20mm', padding: '2px', border: '2px solid #1e293b', borderRadius: '8px', flexShrink: 0 }}>
                                <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>اسم الطالب</div>
                                <div style={{ minHeight: '30px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '13px', fontWeight: '900', color: 'black', lineHeight: '1.2', margin: 0, padding: 0, display: 'block' }}>{stdName}</h2>
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                   <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '2px solid #1e293b', padding: '2px 6px', borderRadius: '4px', fontWeight: '900', fontSize: '9px', color: '#0f172a' }}>{fullClassName}</span>
                                </div>
                             </div>
                             <div style={{ borderRight: '3px solid #cbd5e1', paddingRight: '10px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '20mm', flexShrink: 0 }}>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>رقم الجلوس</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'black', lineHeight: '1' }}>{student?.seat_number || '---'}</div>
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 4. بطاقات الطاولة */}
            {printType === 'desk_cards' && chunkArray(printData.students, 8).map((chunk, pageIdx) => (
              <div key={`pc3-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 {chunk.map((student:any, si) => {
                    const stdName = getSafeName(student?.students?.users);
                    const fullClassName = getFullClassName(student?.students);
                    const qrPayload = `raf-id:${student?.student_id}`; 
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrPayload)}&margin=0`;

                    return (
                       <div key={`d-${si}`} style={{ width: '85mm', height: '55mm', border: '3px solid black', position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '1rem', overflow: 'hidden', boxSizing: 'border-box' }}>
                          <div style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid black', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '11px', color: 'black', margin: 0, padding: 0 }}>مدرسة الرفعة النموذجية بنين (م-ث)</div>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>بطاقة جلوس اختبارات نهاية العام</div>
                             </div>
                             <div style={{ backgroundColor: 'black', color: 'white', padding: '2px 8px', fontWeight: '900', fontSize: '10px', border: '1px solid black', borderRadius: '6px' }}>{printData.committee?.name || 'غير محدد'}</div>
                          </div>
                          <div style={{ padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }} dir="rtl">
                             <div style={{ width: '20mm', height: '20mm', padding: '2px', border: '2px solid #1e293b', borderRadius: '8px', flexShrink: 0 }}>
                                <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>اسم الطالب</div>
                                <div style={{ minHeight: '30px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '13px', fontWeight: '900', color: 'black', lineHeight: '1.2', margin: 0, padding: 0, display: 'block' }}>{stdName}</h2>
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                   <span style={{ display: 'inline-block', backgroundColor: '#f1f5f9', border: '2px solid #1e293b', padding: '2px 6px', borderRadius: '4px', fontWeight: '900', fontSize: '9px', color: '#0f172a' }}>{fullClassName}</span>
                                </div>
                             </div>
                             <div style={{ borderRight: '3px solid #cbd5e1', paddingRight: '10px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '20mm', flexShrink: 0 }}>
                                <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>رقم الجلوس</div>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: 'black', lineHeight: '1' }}>{student?.seat_number || '---'}</div>
                             </div>
                          </div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 5. هويات المراقبين الثابتة (تصميم فخم مدمج مع QR) */}
            {printType === 'invigilator_ids' && chunkArray(printData.invigilators, 6).map((chunk, pageIdx) => (
              <div key={`p-inv-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 {chunk.map((inv: any, si) => {
                    const teacherName = getSafeName(inv);
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=raf-staff:${inv.id}&margin=0`;
                    return (
                       <div key={`inv-card-${si}`} style={{ height: '260px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '1.25rem', overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '3px solid #0f172a' }}>
                          <div style={{ background: 'linear-gradient(to right, #0f172a, #1e293b)', borderBottom: '3px solid #d4af37', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '15px', color: '#f8fafc' }}>مدرسة الرفعة النموذجية بنين</div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#d4af37', marginTop: '4px' }}>كنترول امتحانات نهاية العام</div>
                             </div>
                             <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid #d4af37', color: '#d4af37', padding: '6px 12px', fontWeight: '900', fontSize: '12px', borderRadius: '8px' }}>2025-2026</div>
                          </div>
                          <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flex: 1, backgroundColor: '#ffffff' }} dir="rtl">
                             <div style={{ width: '80px', height: '80px', border: '3px solid #d4af37', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f1f5f9', padding: '3px' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {inv?.avatar_url ? (
                                    <img src={inv.avatar_url} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '32px' }}>{String(teacherName).charAt(0)}</div>
                                  )}
                                </div>
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'black', color: '#64748b', marginBottom: '4px' }}>عضو لجنة المراقبة</div>
                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', lineHeight: '1.4', display: 'block', margin: 0 }}>{teacherName}</h2>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                   <span style={{ display: 'inline-block', backgroundColor: '#0f172a', border: '1px solid #d4af37', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '11px', color: '#f8fafc' }}>مُراقب معتمد</span>
                                </div>
                             </div>
                             <div style={{ width: '22mm', height: '22mm', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, padding: '2px', alignSelf: 'start' }}>
                               <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'linear-gradient(to right, #d4af37, #fef08a, #d4af37)' }}></div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 6. هويات رؤساء اللجان المتوافقة مع QR */}
            {printType === 'head_ids' && chunkArray(printData.heads, 6).map((chunk, pageIdx) => (
              <div key={`p-head-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 {chunk.map((head: any, si) => {
                    const headName = getSafeName(head);
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=raf-head:${head.id}&margin=0`;
                    return (
                       <div key={`head-card-${si}`} style={{ height: '260px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '1.25rem', overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '3px solid #78350f' }}>
                          <div style={{ background: 'linear-gradient(to right, #78350f, #92400e)', borderBottom: '3px solid #fcd34d', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '15px', color: '#fffbeb' }}>مدرسة الرفعة النموذجية بنين</div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fcd34d', marginTop: '4px' }}>التكليف الإشرافي العام للجان</div>
                             </div>
                             <div style={{ backgroundColor: '#b45309', border: '1px solid #fcd34d', color: '#fffbeb', padding: '6px 12px', fontWeight: '900', fontSize: '11px', borderRadius: '8px' }}>رئيس اللجان</div>
                          </div>
                          <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flex: 1, backgroundColor: '#ffffff' }} dir="rtl">
                             <div style={{ width: '80px', height: '80px', border: '3px solid #b45309', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#fffbeb', padding: '3px' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {head?.avatar_url ? (
                                    <img src={head.avatar_url} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ fontWeight: '900', color: '#b45309', fontSize: '32px' }}>👑</div>
                                  )}
                                </div>
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'black', color: '#92400e', marginBottom: '4px' }}>رئيس اللجنة القيادي</div>
                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#451a03', lineHeight: '1.4', display: 'block', margin: 0 }}>{headName}</h2>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                   <div style={{ fontSize: '11px', fontWeight: 'black', color: '#b45309', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fcd34d', display: 'inline-block' }}>نطاق الإشراف: الشامل</div>
                                </div>
                             </div>
                             <div style={{ width: '22mm', height: '22mm', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, padding: '2px', alignSelf: 'start' }}>
                               <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'linear-gradient(to right, #b45309, #fde68a, #b45309)' }}></div>
                       </div>
                    )
                 })}
              </div>
            ))}

            {/* 📄 7. الهويات الإدارية المخصصة */}
            {printType === 'custom_ids' && chunkArray(printData.customIds, 6).map((chunk, pageIdx) => (
              <div key={`p-cstm-${pageIdx}`} className="print-page-wrapper bg-white mx-auto p-10 grid grid-cols-2 gap-x-6 gap-y-8 content-start" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' }}>
                 {chunk.map((item: any, si: number) => {
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=raf-custom:${encodeURIComponent(item.name)}&margin=0`;
                    return (
                       <div key={`cstm-card-${si}`} style={{ height: '260px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '1.25rem', overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '3px solid #1e1b4b' }}>
                          <div style={{ background: 'linear-gradient(to right, #1e1b4b, #312e81)', borderBottom: '3px solid #fbbf24', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '900', fontSize: '15px', color: '#f8fafc' }}>مدرسة الرفعة النموذجية بنين</div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24', marginTop: '4px' }}>إدارة الامتحانات والكنترول</div>
                             </div>
                             <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '6px 12px', fontWeight: '900', fontSize: '12px', borderRadius: '8px' }}>2025-2026</div>
                          </div>
                          <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flex: 1, backgroundColor: '#ffffff' }} dir="rtl">
                             <div style={{ width: '80px', height: '80px', border: '3px solid #fbbf24', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f1f5f9', padding: '3px' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ fontWeight: '900', color: '#1e1b4b', fontSize: '32px' }}>{String(item.name).charAt(0)}</div>
                                </div>
                             </div>
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'black', color: '#64748b', marginBottom: '4px' }}>{item.role || 'عضو إداري'}</div>
                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                                   <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e1b4b', lineHeight: '1.4', display: 'block', margin: 0 }}>{item.name || 'بدون اسم'}</h2>
                                </div>
                             </div>
                             <div style={{ width: '22mm', height: '22mm', border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, padding: '2px', alignSelf: 'start' }}>
                               <img src={qrCodeUrl} crossOrigin="anonymous" alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                             </div>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'linear-gradient(to right, #fbbf24, #fef08a, #fbbf24)' }}></div>
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

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setMounted(true), 0); return () => clearTimeout(timer); }, []);
  if (!mounted) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-cairo"></div>;

  return (
    <ErrorBoundary>
      <ExamCommitteesControl />
    </ErrorBoundary>
  );
}
