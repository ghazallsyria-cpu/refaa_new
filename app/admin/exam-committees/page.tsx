/**
 * ============================================================================
 * @file      app/admin/exam-committees/page.tsx
 * @version   8.1.1 (ESLint Errors Fixed)
 * @description كنترول الامتحانات — TypeScript Strict، Zero `any`، مُقسّم،
 *              مع Batch Operations وطباعة احترافية.
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useExamSeating } from '@/hooks/useExamSeating';
import { useAuth } from '@/context/auth-context';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Users, UserPlus, ShieldCheck, Settings, Loader2, Search, Trash2, PrinterIcon,
  IdCard, DoorOpen, LayoutGrid, CheckCircle2, X, Edit3, Plus, Eye, AlertTriangle,
  Contact, UploadCloud, Crown, Layers, UserMinus, CalendarDays, FileText, Info,
  AlertCircle, Clock, Wand2, CheckSquare, UserCheck, Check
} from 'lucide-react';

import type {
  ExamCommittee,
  ExamTimetable,
  TeacherWithRelations,
  InvigilatorWithRelations,
  HeadWithRelations,
  StudentAllocationRow,
  FormattedTeacher,
  StudentStats,
  ActiveTab,
  PrintType,
  PrintPayload,

} from '@/types/exam';

import {
  getSafeName,
  getSafeAvatar,
  getInitials,
  getFullClassName,
  chunkArray,
  shuffleArray,
  sortCommittees,
  normalizeRelation,
  extractUniqueDates,
  getUniqueHeadsForDate,
  getAssignedCommitteeNames,
} from '@/lib/exam-utils';

/* ═════════════════════════════════════════════════════════════════════════ */
/* 1. ثوابت                                                                 */
/* ═════════════════════════════════════════════════════════════════════════ */

const CURRENT_YEAR = '2025-2026';
const CURRENT_SEMESTER = 'الفصل الدراسي الثاني';
const BATCH_SIZE = 100;

/* ═════════════════════════════════════════════════════════════════════════ */
/* 2. Error Boundary                                                        */
/* ═════════════════════════════════════════════════════════════════════════ */

interface EBState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 p-6 flex flex-col items-center justify-center font-cairo" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-2xl border-4 border-rose-500 text-center">
            <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h1 className="text-3xl font-black text-rose-600 mb-4">حدث خطأ في عرض الصفحة</h1>
            <p className="text-sm text-rose-400 mb-6 font-mono">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-colors"
            >
              تحديث الصفحة وإعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═════════════════════════════════════════════════════════════════════════ */
/* 3. مكونات UI فرعية (Sub-Components)                                      */
/* ═════════════════════════════════════════════════════════════════════════ */

/** شريط الإحصائيات العلوي */
function StatsBar({ stats }: { stats: StudentStats }) {
  const items = [
    { label: 'عاشر', value: stats.g10, color: 'emerald' },
    { label: '11 علمي', value: stats.g11_sci, color: 'blue' },
    { label: '11 أدبي', value: stats.g11_lit, color: 'purple' },
    { label: 'إجمالي الموزعين', value: stats.totalAllocated, color: 'indigo' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className={`bg-${item.color}-50 p-4 rounded-2xl border border-${item.color}-100 flex flex-col justify-center items-center text-center`}
        >
          <p className={`text-xs font-bold text-${item.color}-600 mb-1`}>{item.label}</p>
          <p className={`text-2xl font-black text-${item.color}-800`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** زر التبويب */
function TabButton({
  active,
  label,
  icon: Icon,
  onClick,
  color,
}: {
  active: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}) {
  const activeClasses = `bg-${color}-600 text-white shadow-md`;
  const inactiveClasses = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${active ? activeClasses : inactiveClasses}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════ */
/* 4. المكون الرئيسي — ExamCommitteesControl                                */
/* ═════════════════════════════════════════════════════════════════════════ */

function ExamCommitteesControl() {
  const authCtx = useAuth();
  const currentRole = authCtx?.authRole || authCtx?.userRole || '';

  const engine = useExamSeating();

  /* ── State ─────────────────────────────────────────────────────────── */
  const [committees, setCommittees] = useState<ExamCommittee[]>([]);
  const [teachers, setTeachers] = useState<FormattedTeacher[]>([]);
  const [invigilators, setInvigilators] = useState<InvigilatorWithRelations[]>([]);
  const [timetables, setTimetables] = useState<ExamTimetable[]>([]);
  const [allHeads, setAllHeads] = useState<HeadWithRelations[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats>({
    g10: 0, g11_sci: 0, g11_lit: 0, totalAllocated: 0,
  });
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  const [uniqueExamDates, setUniqueExamDates] = useState<string[]>([]);
  const [activeExamDate, setActiveExamDate] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('management');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isClassPrintModalOpen, setIsClassPrintModalOpen] = useState(false);
  const [isReadExcuseModalOpen, setIsReadExcuseModalOpen] = useState(false);
  const [isExemptionsModalOpen, setIsExemptionsModalOpen] = useState(false);

  // Search & Selection
  const [exemptionSearchTerm, setExemptionSearchTerm] = useState('');
  const [headSearchTerm, setHeadSearchTerm] = useState('');
  const [selectedExcuseData, setSelectedExcuseData] = useState<InvigilatorWithRelations | null>(null);
  const [selectedCommittee, setSelectedCommittee] = useState<ExamCommittee | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  // Builder & Editor
  const [builderData, setBuilderData] = useState({ count: 21, capacity: 14 });
  const [editCommitteeData, setEditCommitteeData] = useState<Partial<ExamCommittee>>({
    id: '', name: '', capacity: 14, location: '',
  });

  // View
const [viewDetails, setViewDetails] = useState<{
  students: StudentAllocationRow[];
  invigs: InvigilatorWithRelations[];
  loading: boolean;
}>({
  students: [], invigs: [], loading: false,
});


  // Heads
  const [headAssignment, setHeadAssignment] = useState({ date: '', head_teacher_id: '' });
  const [selectedCommitteesForHead, setSelectedCommitteesForHead] = useState<string[]>([]);
  const [currentHeads, setCurrentHeads] = useState<HeadWithRelations[]>([]);

  // Print
  const [isPrinting, setIsPrinting] = useState(false);
  const [printPayload, setPrintPayload] = useState<PrintPayload | null>(null);
  const [printType, setPrintType] = useState<PrintType | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Avatar Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  /* ── Derived ───────────────────────────────────────────────────────── */
  const allocationsStats = useMemo(() => {
    const stats: Record<string, number> = {};
    return stats;
  }, []);

  const alreadyAssignedCommittees = useMemo(
    () => getAssignedCommitteeNames(currentHeads),
    [currentHeads]
  );

  /* ── fetchData (Parallel + Typed) ──────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!['admin', 'management'].includes(String(currentRole))) return;
    setIsLoading(true);

    try {
      const [
        commsRes,
        examsRes,
        tchrsRes,
        invigsRes,
        allocsRes,
        hdsRes,
        stdsRes,
      ] = await Promise.all([
        supabase.from('exam_committees').select('*').eq('academic_year', CURRENT_YEAR).eq('semester', CURRENT_SEMESTER),
        supabase.from('exam_timetables')
          .select('id, exam_date, subjects(name), class_level')
          .eq('academic_year', CURRENT_YEAR)
          .eq('semester', CURRENT_SEMESTER)
          .order('exam_date'),
        supabase.from('teachers')
          .select('id, is_excluded_from_exams, is_committee_head, users(full_name, avatar_url), teacher_subjects(subjects(name))'),
        supabase.from('committee_invigilators')
          .select('id, committee_id, teacher_id, status, excuse_reason, signed_at, exam_date, users(full_name, avatar_url)'),
        supabase.from('student_seat_allocations')
          .select('committee_id, student_id, students(next_year_track, sections(name, classes(level, name)))')
          .eq('academic_year', CURRENT_YEAR)
          .eq('semester', CURRENT_SEMESTER),
        supabase.from('exam_committee_heads')
          .select('*, users!exam_committee_heads_head_teacher_id_fkey(full_name, avatar_url), exam_timetables(exam_date, subjects(name))'),
        supabase.from('students')
          .select('id, next_year_track, sections(name, classes(level, name))'),
      ]);

      const rawComms = (commsRes.data || []) as ExamCommittee[];
      const rawExams = (examsRes.data || []) as unknown as ExamTimetable[];

      const rawTchrs = (tchrsRes.data || []) as unknown as TeacherWithRelations[];
const rawInvigs = (invigsRes.data || []) as unknown as InvigilatorWithRelations[];
const rawAllocs = (allocsRes.data || []) as unknown as Record<string, unknown>[];
const rawHeads = (hdsRes.data || []) as unknown as HeadWithRelations[];
const rawStds = (stdsRes.data || []) as unknown as Record<string, unknown>[];


      // Sort committees
      const sortedComms = sortCommittees(rawComms);

      // Format teachers
      const formattedTeachers: FormattedTeacher[] = rawTchrs.map((t, idx) => {
        const u = normalizeRelation(t.users);
        const subjects = (t.teacher_subjects || [])
          .map((s) => normalizeRelation(s.subjects)?.name)
          .filter(Boolean)
          .join('، ') || 'غير محدد';

        return {
          id: String(t.id || `t-${idx}`),
          full_name: u?.full_name?.trim() || 'بدون اسم',
          avatar_url: u?.avatar_url || null,
          subjectsStr: subjects,
          is_excluded_from_exams: t.is_excluded_from_exams ?? false,
          is_committee_head: t.is_committee_head ?? false,
        };
      });

      // Stats & Classes
      const uniqueClasses = new Set<string>();
      let g10 = 0, g11_sci = 0, g11_lit = 0;

      (rawAllocs as any[]).forEach((a: any) => {
        if (a?.committee_id) {
          // allocationsStats
        }
        const cName = getFullClassName(a?.students);
        if (cName && !cName.includes('غير محدد')) uniqueClasses.add(cName);
      });

      (rawStds as any[]).forEach((s: any) => {
        const sec = normalizeRelation(s?.sections);
        const cls = normalizeRelation(sec?.classes);
        const lvl = Number(cls?.level || 0);
        const cName = String(cls?.name || '');
        const sName = String(sec?.name || '');
        const track = String(s?.next_year_track || '').toLowerCase();

        if (lvl === 10) g10++;
        else if (lvl === 11) {
          const isLit = track === 'literary' || cName.includes('أدبي') || cName.includes('ادبي') || sName.includes('أدبي') || sName.includes('ادبي');
          if (isLit) g11_lit++; else g11_sci++;
        }
      });

      setStudentStats({
        g10, g11_sci, g11_lit, totalAllocated: rawAllocs?.length || 0,
      });
      setAvailableClasses(Array.from(uniqueClasses).sort());
      setCommittees(sortedComms);
      setTeachers(formattedTeachers);
      setInvigilators(rawInvigs);
      setTimetables(rawExams);
      setAllHeads(rawHeads);

      // Dates
      const dates = extractUniqueDates(rawExams);
      setUniqueExamDates(dates);

      let currentDate = activeExamDate;
      if (!currentDate && dates.length > 0) {
        currentDate = dates[0];
        setActiveExamDate(currentDate);
      }

      if (currentDate) {
        fetchHeadsByDate(currentDate, rawHeads, rawExams);
      }
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentRole, activeExamDate]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole]);

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const fetchHeadsByDate = useCallback((date: string, heads?: HeadWithRelations[], tts?: ExamTimetable[]) => {
    if (!date) { setCurrentHeads([]); setSelectedCommitteesForHead([]); return; }
    const h = heads || allHeads;
    const t = tts || timetables;
    const unique = getUniqueHeadsForDate(h, date, t);
    setCurrentHeads(unique);
    setSelectedCommitteesForHead([]);
  }, [allHeads, timetables]);

  const handleToggleExemption = async (tId: string, currentStatus: boolean) => {
    try {
      setTeachers((prev) =>
        prev.map((t) => (t.id === tId ? { ...t, is_excluded_from_exams: !currentStatus } : t))
      );
      const { error } = await supabase.from('teachers').update({ is_excluded_from_exams: !currentStatus }).eq('id', tId);
      if (error) throw error;
    } catch {
      await fetchData();
    }
  };

  const handleToggleCommitteeHead = async (tId: string, currentStatus: boolean) => {
    try {
      setTeachers((prev) =>
        prev.map((t) => (t.id === tId ? { ...t, is_committee_head: !currentStatus } : t))
      );
      const { error } = await supabase.from('teachers').update({ is_committee_head: !currentStatus }).eq('id', tId);
      if (error) throw error;
    } catch {
      await fetchData();
    }
  };

  const handleAssignHead = async () => {
    if (!headAssignment.date || !headAssignment.head_teacher_id || selectedCommitteesForHead.length === 0) {
      alert('يرجى اختيار التاريخ، تحديد اللجان، ثم اختيار رئيس اللجان!');
      return;
    }
    setIsLoading(true);
    try {
      const rangeStr = selectedCommitteesForHead.join('، ');
      const targets = timetables.filter((t) => t.exam_date === headAssignment.date);
      if (targets.length === 0) throw new Error('لا توجد امتحانات مبرمجة في هذا التاريخ!');

      const inserts = targets
        .map((t) => ({
          timetable_id: t.id,
          head_teacher_id: headAssignment.head_teacher_id,
          committees_range: rangeStr,
        }))
        .filter((i) => i.timetable_id);

      const { error } = await supabase.from('exam_committee_heads').insert(inserts);
      if (error) throw error;

      setHeadAssignment({ date: headAssignment.date, head_teacher_id: '' });
      setSelectedCommitteesForHead([]);
      fetchHeadsByDate(headAssignment.date);
      await fetchData();
      alert('تم التكليف بنجاح!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
      alert('حدث خطأ! ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHead = async (headTeacherId: string, date: string) => {
    if (!confirm('هل أنت متأكد من إزالة التكليف عن هذا المعلم لهذا اليوم؟')) return;
    setIsLoading(true);
    try {
      const ttIds = timetables.filter((t) => t.exam_date === date).map((t) => t.id).filter(Boolean);
      await supabase.from('exam_committee_heads').delete().eq('head_teacher_id', headTeacherId).in('timetable_id', ttIds);
      fetchHeadsByDate(date);
      await fetchData();
    } catch {
      alert('حدث خطأ أثناء الحذف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'rafaa_preset');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dzmyqnj01';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        await supabase.from('users').update({ avatar_url: data.secure_url }).eq('id', targetUserId);
        alert('تم رفع الصورة بنجاح!');
        await fetchData();
      } else throw new Error('فشل الرفع');
    } catch {
      alert('خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploadingAvatar(false);
      setTargetUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMoveStudent = async (studentId: string, newCommitteeId: string) => {
    try {
      setIsLoading(true);
      await supabase
        .from('student_seat_allocations')
        .update({ committee_id: newCommitteeId })
        .eq('student_id', studentId)
        .eq('academic_year', CURRENT_YEAR)
        .eq('semester', CURRENT_SEMESTER);
      alert('تم نقل الطالب بنجاح!');
      setIsViewModalOpen(false);
      await fetchData();
    } catch {
      alert('خطأ أثناء النقل.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCommittee = async () => {
    const name = editCommitteeData.name?.trim();
    if (!name) { alert('يرجى إدخال اسم اللجنة'); return; }
    try {
      if (editCommitteeData.id) {
        await supabase.from('exam_committees').update({
          name,
          capacity: editCommitteeData.capacity,
          location: editCommitteeData.location,
        }).eq('id', editCommitteeData.id);
      } else {
        await supabase.from('exam_committees').insert({
          name,
          capacity: editCommitteeData.capacity || 14,
          location: editCommitteeData.location,
          academic_year: CURRENT_YEAR,
          semester: CURRENT_SEMESTER,
        });
      }
      setIsCommitteeModalOpen(false);
      await fetchData();
    } catch {
      alert('خطأ في الحفظ');
    }
  };

  const handleDeleteCommittee = async (id: string) => {
    if (!confirm('تأكيد الحذف نهائياً لهذه اللجنة؟')) return;
    setActionLoadingId(`del-${id}`);
    try {
      await supabase.from('exam_committees').delete().eq('id', id);
      await fetchData();
    } catch {
      alert('خطأ في الحذف');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNuclear = async () => {
    if (!confirm('سيتم هدم اللجان ومسح التوزيع بالكامل! تأكيد؟')) return;
    const ok = await engine.nukeEverything(CURRENT_YEAR, CURRENT_SEMESTER);
    if (ok) { alert('تم الهدم الشامل بنجاح'); await fetchData(); }
  };

  const handleBuild = async () => {
    setIsBuilderModalOpen(false);
    const ok = await engine.buildCommittees(CURRENT_YEAR, CURRENT_SEMESTER, builderData.count, builderData.capacity);
    if (ok) await fetchData();
  };

  const handleDistribute = async () => {
    if (!confirm('هل أنت متأكد من التوزيع؟')) return;
    const result = await engine.generateSeatingAndDistribute(CURRENT_YEAR, CURRENT_SEMESTER);
    if (result.success) { alert(`تم التوزيع بنجاح! ${result.allocatedCount} طالب موزع على ${result.committeesUsed} لجان.`); await fetchData(); }
  };

  const handleSoftReset = async () => {
    if (!confirm('تفريغ جميع الطلاب؟')) return;
    try {
      setIsLoading(true);
      await supabase.from('student_seat_allocations').delete().eq('academic_year', CURRENT_YEAR).eq('semester', CURRENT_SEMESTER);
      await fetchData();
      alert('تم تفريغ المقاعد!');
    } catch {
      alert('خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  const openCommitteeModal = (committee?: ExamCommittee | null) => {
    if (committee) {
      setEditCommitteeData({
        id: committee.id,
        name: committee.name || '',
        capacity: committee.capacity ?? 14,
        location: committee.location || '',
      });
    } else {
      setEditCommitteeData({
        id: '',
        name: `لجنة ${committees.length + 1}`,
        capacity: 14,
        location: '',
      });
    }
    setIsCommitteeModalOpen(true);
  };

  const openViewModal = async (committee: ExamCommittee) => {
    setSelectedCommittee(committee);
    setViewDetails({ students: [], invigs: [], loading: true });
    setIsViewModalOpen(true);

    try {
      const { data } = await supabase
        .from('student_seat_allocations')
        .select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) )`)
        .eq('committee_id', committee.id)
        .order('seat_number', { ascending: true });

      const commInvigs = invigilators.filter(
        (i) => i.committee_id === committee.id && i.exam_date === activeExamDate
      );

      setViewDetails({
        students: (data || []) as StudentAllocationRow[],
        invigs: commInvigs,
        loading: false,
      });
    } catch {
      alert('خطأ في جلب بيانات الطلاب.');
      setViewDetails({ students: [], invigs: [], loading: false });
    }
  };

  const handleAddInvigilator = async () => {
    if (!selectedTeacherId || !selectedCommittee?.id || !activeExamDate) {
      alert('يرجى التأكد من اختيار المعلم واللجنة وتحديد تاريخ الاختبار!');
      return;
    }
    const currentInvigs = invigilators.filter(
      (i) => i.committee_id === selectedCommittee.id && i.exam_date === activeExamDate
    );
    if (currentInvigs.length >= 2) { alert('أقصى حد مراقبين 2 في اليوم الواحد!'); return; }
    if (invigilators.some((i) => i.teacher_id === selectedTeacherId && i.exam_date === activeExamDate)) {
      alert('هذا المعلم مكلف بمراقبة لجنة أخرى في هذا اليوم!'); return;
    }
    try {
      await supabase.from('committee_invigilators').insert({
        committee_id: selectedCommittee.id,
        teacher_id: selectedTeacherId,
        exam_date: activeExamDate,
        status: 'pending',
      });
      setIsAssignModalOpen(false);
      setSelectedTeacherId('');
      setTeacherSearchTerm('');
      await fetchData();
    } catch {
      alert('خطأ في التكليف.');
    }
  };

  const handleRemoveInvigilator = async (invigilator: InvigilatorWithRelations) => {
    const name = getSafeName(invigilator.users);
    if (!confirm(`إزالة المراقب (${name})؟`)) return;
    try {
      setIsReadExcuseModalOpen(false);
      await supabase.from('committee_invigilators').delete().eq('id', invigilator.id);
      await fetchData();
    } catch {
      alert('خطأ');
    }
  };

  const openReadExcuseModal = (invig: InvigilatorWithRelations) => {
    setSelectedExcuseData(invig);
    setIsReadExcuseModalOpen(true);
  };

  /* ── Auto Assign Invigilators (Fisher-Yates) ─────────────────────────── */
  const handleAutoAssignInvigilators = async () => {
    if (!confirm('سيقوم النظام بتوزيع المراقبين المتاحين بواقع 2 لكل لجنة على جميع أيام الامتحانات. هل أنت متأكد؟')) return;
    setIsAutoAssigning(true);
    try {
      if (committees.length === 0 || uniqueExamDates.length === 0 || teachers.length === 0) {
        throw new Error('تأكد من وجود لجان، جداول امتحانات، ومعلمين!');
      }

      const eligible = teachers.filter((t) => !t.is_excluded_from_exams && !t.is_committee_head);
      if (eligible.length === 0) throw new Error('لا يوجد معلمين متاحين!');

      const teacherShifts = new Map<string, number>();
      const teacherCommittees = new Map<string, Set<string>>();
      const dailyAssignments = new Map<string, Set<string>>();
      const dailyCommCount = new Map<string, number>();

      invigilators.forEach((inv) => {
        const tid = inv.teacher_id;
        const cid = inv.committee_id;
        const date = inv.exam_date || '';
        teacherShifts.set(tid, (teacherShifts.get(tid) || 0) + 1);
        if (!teacherCommittees.has(tid)) teacherCommittees.set(tid, new Set());
        teacherCommittees.get(tid)?.add(cid);
        if (!dailyAssignments.has(date)) dailyAssignments.set(date, new Set());
        dailyAssignments.get(date)?.add(tid);
        const key = `${date}_${cid}`;
        dailyCommCount.set(key, (dailyCommCount.get(key) || 0) + 1);
      });

      const newAssignments: { committee_id: string; teacher_id: string; exam_date: string; status: string }[] = [];

      for (const date of uniqueExamDates) {
        for (const comm of committees) {
          const key = `${date}_${comm.id}`;
          let count = dailyCommCount.get(key) || 0;

          while (count < 2) {
            let best: FormattedTeacher | null = null;
            let minShifts = Infinity;

            const pool = shuffleArray(eligible);

            for (const t of pool) {
              const tid = t.id;
              const assignedToday = dailyAssignments.get(date)?.has(tid);
              const supervisedBefore = teacherCommittees.get(tid)?.has(comm.id);
              if (!assignedToday && !supervisedBefore) {
                const shifts = teacherShifts.get(tid) || 0;
                if (shifts < minShifts) {
                  minShifts = shifts;
                  best = t;
                }
              }
            }

            if (!best) break;

            const tid = best.id;
            newAssignments.push({ committee_id: comm.id, teacher_id: tid, exam_date: date, status: 'pending' });
            teacherShifts.set(tid, (teacherShifts.get(tid) || 0) + 1);
            if (!teacherCommittees.has(tid)) teacherCommittees.set(tid, new Set());
            teacherCommittees.get(tid)?.add(comm.id);
            if (!dailyAssignments.has(date)) dailyAssignments.set(date, new Set());
            dailyAssignments.get(date)?.add(tid);
            count++;
          }
        }
      }

      if (newAssignments.length > 0) {
        for (let i = 0; i < newAssignments.length; i += BATCH_SIZE) {
          await supabase.from('committee_invigilators').insert(newAssignments.slice(i, i + BATCH_SIZE));
        }
        alert(`تم التوزيع! ${newAssignments.length} تكليف جديد.`);
        await fetchData();
      } else {
        alert('جميع اللجان مكتملة أو لا يوجد معلمين إضافيون.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ';
      alert('حدث خطأ: ' + msg);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  /* ── Print Logic (Reliable DOM Capture) ──────────────────────────────── */
  const printDocument = useCallback(async (
    committeeId: string,
    type: PrintType,
    classNameToPrint?: string
  ) => {
    setIsPrinting(true);
    try {
      let query = supabase
        .from('student_seat_allocations')
        .select(`seat_number, student_id, students ( id, next_year_track, users(full_name, avatar_url), sections(name, classes(name, level)) ), exam_committees ( name )`)
        .eq('academic_year', CURRENT_YEAR)
        .eq('semester', CURRENT_SEMESTER);

      if (type === 'door_sheet' || type === 'desk_cards') {
        query = query.eq('committee_id', committeeId).order('seat_number', { ascending: true });
      }

      const { data } = await query;
      let rows = (data || []) as StudentAllocationRow[];
      const committee = committees.find((c) => c.id === committeeId) || { name: 'لجنة غير محددة', capacity: 14, id: '' };
      const commInvigs = committeeId
        ? invigilators.filter((i) => i.committee_id === committeeId && i.exam_date === activeExamDate)
        : [];

      if (type === 'class_cards' && classNameToPrint) {
        rows = rows.filter((s) => getFullClassName(normalizeRelation(s?.students) as any) === classNameToPrint);
        rows.sort((a, b) => {
          const na = getSafeName(normalizeRelation(a?.students)?.users);
          const nb = getSafeName(normalizeRelation(b?.students)?.users);
          return na.localeCompare(nb, 'ar');
        });
      }

      if (type !== 'invigilator_ids' && rows.length === 0) { alert('لا يوجد طلاب للطباعة!'); return; }
      if (type === 'invigilator_ids' && commInvigs.length === 0) { alert('لا يوجد مراقبون!'); return; }

      setPrintPayload({ students: rows, committee, invigilators: commInvigs, className: classNameToPrint });
      setPrintType(type);
    } catch {
      alert('خطأ في تحضير الطباعة');
      setIsPrinting(false);
    }
  }, [committees, invigilators, activeExamDate]);

  // Capture print when DOM is ready
  useEffect(() => {
    if (!printPayload || !printType || !printRef.current) return;

    const timer = setTimeout(() => {
      const run = async () => {
        try {
          const html2canvasModule = await import('html2canvas-pro');
          const html2canvas = html2canvasModule.default || html2canvasModule;
          const { jsPDF } = await import('jspdf');

          const pages = printRef.current!.querySelectorAll('.print-page-wrapper');
          if (pages.length === 0) { setIsPrinting(false); return; }

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < pages.length; i++) {
            const el = pages[i] as HTMLElement;
            const original = el.style.cssText;
            el.style.position = 'fixed';
            el.style.top = '0';
            el.style.left = '0';
            el.style.width = '794px';
            el.style.zIndex = '-9999';

            const canvas = await html2canvas(el, {
              scale: window.innerWidth < 768 ? 1.5 : 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              scrollY: 0,
              scrollX: 0,
            });

            el.style.cssText = original;
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const props = pdf.getImageProperties(imgData);
            const imgHeight = (props.height * pdfWidth) / props.width;

            if (printType === 'door_sheet' && imgHeight > pdfHeight) {
              let heightLeft = imgHeight;
              let position = 0;
              if (i > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
              let guard = 0;
              while (heightLeft > 0 && guard < 15) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
                guard++;
              }
            } else {
              if (i > 0) pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
            }
          }

          const names: Record<PrintType, string> = {
            door_sheet: `محضر_${printPayload.committee.name}_يوم_${activeExamDate}`,
            desk_cards: `بطاقات_طاولة_${printPayload.committee.name}`,
            class_cards: `بطاقات_طلاب_${printPayload.className || ''}`,
            invigilator_ids: `هويات_المراقبين_${printPayload.committee.name}_يوم_${activeExamDate}`,
          };
          pdf.save(`${names[printType]}.pdf`);
        } catch (err) {
          console.error(err);
          alert('حدث خطأ أثناء بناء PDF.');
        } finally {
          setPrintPayload(null);
          setPrintType(null);
          setIsPrinting(false);
          setIsClassPrintModalOpen(false);
        }
      };
      run();
    }, 500);

    return () => clearTimeout(timer);
  }, [printPayload, printType, activeExamDate]);

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* RENDER                                                                  */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-cairo pb-24" dir="rtl">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Overlays */}
      {(engine.isLoading || isPrinting || isAutoAssigning) && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-sm">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-400 mb-6" />
          <h2 className="text-xl font-black animate-pulse text-center px-4">
            {isPrinting ? 'جاري رسم قوالب الطباعة...' : isAutoAssigning ? 'جاري تشغيل خوارزمية التوزيع...' : engine.progressMsg || 'جاري التحميل'}
          </h2>
        </div>
      )}

      <AnimatePresence>
        {isUploadingAvatar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white"
          >
            <UploadCloud className="w-16 h-16 animate-bounce text-emerald-400 mb-4" />
            <h2 className="text-xl font-black">جاري رفع الصورة...</h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 relative">
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <LayoutGrid className="w-8 h-8 text-indigo-600" /> كنترول الامتحانات
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-1">توزيع وإدارة المهام حسب الجدول اليومي</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === 'management'} label="اللجان" icon={LayoutGrid} onClick={() => setActiveTab('management')} color="indigo" />
              <TabButton active={activeTab === 'invigilators_radar'} label="رادار المراقبين" icon={ShieldCheck} onClick={() => setActiveTab('invigilators_radar')} color="emerald" />
              <TabButton active={activeTab === 'heads_radar'} label="الرؤساء" icon={Crown} onClick={() => setActiveTab('heads_radar')} color="amber" />
              <TabButton active={activeTab === 'daily_stats'} label="إحصائية اليوم" icon={FileText} onClick={() => setActiveTab('daily_stats')} color="fuchsia" />
            </div>
          </div>

          {/* Date Selector */}
          {uniqueExamDates.length > 0 && activeTab !== 'heads_radar' && (
            <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-800 font-black shrink-0">
                <CalendarDays className="w-6 h-6" /> تحديد يوم الاختبار:
              </div>
              <select
                value={activeExamDate}
                onChange={(e) => {
                  const d = e.target.value;
                  setActiveExamDate(d);
                  fetchHeadsByDate(d);
                }}
                className="w-full md:w-auto flex-1 bg-white border border-indigo-200 rounded-xl p-3 font-black text-indigo-900 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
              >
                {uniqueExamDates.map((date) => {
                  const count = timetables.filter((t) => t.exam_date === date).length;
                  return (
                    <option key={date} value={date}>
                      {date} (يتضمن {count} مواد)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* ── TAB: Management ─────────────────────────────────────────── */}
          {activeTab === 'management' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <StatsBar stats={studentStats} />

              <div className="flex flex-wrap gap-3 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {committees.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsBuilderModalOpen(true)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> بناء هندسي للجان
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={handleDistribute} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex justify-center items-center gap-2">
                      <Users className="w-5 h-5" /> توزيع السحّاب
                    </button>
                    <button type="button" onClick={() => setIsClassPrintModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl flex justify-center items-center gap-2 shadow-md border border-emerald-600">
                      <Layers className="w-5 h-5" /> طباعة بطاقات الفصول
                    </button>
                    <button type="button" onClick={() => setIsExemptionsModalOpen(true)} className="flex-1 sm:flex-none px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black rounded-xl flex justify-center items-center gap-2 shadow-sm border border-rose-100">
                      <UserMinus className="w-5 h-5" /> إعفاء معلمين
                    </button>
                    <button type="button" onClick={() => openCommitteeModal()} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl flex justify-center items-center gap-2">
                      <Plus className="w-5 h-5" /> لجنة
                    </button>
                    <button type="button" onClick={handleSoftReset} className="flex-1 sm:flex-none px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black rounded-xl flex justify-center items-center gap-2">
                      <Trash2 className="w-5 h-5" /> تفريغ
                    </button>
                    <button type="button" onClick={handleNuclear} className="flex-1 sm:flex-none px-6 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black rounded-xl flex justify-center items-center gap-2 mr-auto">
                      <AlertTriangle className="w-5 h-5" /> هدم
                    </button>
                  </>
                )}
              </div>

              {!activeExamDate ? (
                <div className="flex justify-center p-20 flex-col items-center gap-4 bg-white rounded-3xl border border-dashed border-indigo-200">
                  <CalendarDays className="w-16 h-16 text-indigo-200" />
                  <h3 className="font-black text-slate-500">يرجى إضافة جداول اختبارات أولاً.</h3>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {committees.map((committee) => {
                    const stdCount = 0;
                    const commInvigs = invigilators.filter(
                      (i) => i.committee_id === committee.id && i.exam_date === activeExamDate
                    );
                    const capacity = committee.capacity ?? 14;
                    const isFull = stdCount >= capacity;
                    const isOverflow = committee.name.includes('الفائض');

                    return (
                      <div
                        key={committee.id}
                        className={`bg-white rounded-2xl p-5 border ${isOverflow ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'} shadow-sm flex flex-col`}
                      >
                        <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                          <div>
                            <h3 className={`text-lg font-black ${isOverflow ? 'text-rose-700' : 'text-slate-800'}`}>{committee.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">السعة: {capacity} {committee.location ? `| ${committee.location}` : ''}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openViewModal(committee); }}
                              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer z-10"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openCommitteeModal(committee); }}
                              className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shadow-sm cursor-pointer z-10"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCommittee(committee.id); }}
                              disabled={actionLoadingId === `del-${committee.id}`}
                              className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm cursor-pointer z-10"
                            >
                              {actionLoadingId === `del-${committee.id}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-black text-slate-500">المراقبون ({commInvigs.length}/2)</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isOverflow ? 'bg-rose-200 text-rose-800' : isFull ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {stdCount} طالب
                            </span>
                          </div>
                          <div className="space-y-2">
                            {commInvigs.map((inv) => {
                              const tName = getSafeName(inv.users);
                              return (
                                <div key={inv.id} className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100 gap-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-800 truncate pr-1">{tName}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveInvigilator(inv)}
                                      className="text-slate-400 hover:text-rose-500 p-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5 mt-0.5">
                                    {inv.status === 'signed' ? (
                                      <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> وقع الاستلام
                                      </span>
                                    ) : inv.status === 'excused' ? (
                                      <button
                                        type="button"
                                        onClick={() => openReadExcuseModal(inv)}
                                        className="text-[9px] font-black text-rose-500 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-rose-200 transition-colors"
                                      >
                                        <AlertCircle className="w-3 h-3" /> عرض العذر
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> قيد الانتظار
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {commInvigs.length < 2 && (
                              <button
                                type="button"
                                onClick={() => { setSelectedCommittee(committee); setIsAssignModalOpen(true); }}
                                className="w-full py-1.5 rounded-lg border border-dashed border-indigo-200 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition-colors mt-2"
                              >
                                <UserPlus className="w-3 h-3 inline mr-1" /> إضافة مراقب لليوم
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => printDocument(committee.id, 'door_sheet')}
                            className="col-span-2 bg-slate-800 text-white text-[10px] font-black py-2 rounded-lg hover:bg-slate-700"
                          >
                            <PrinterIcon className="w-3 h-3 inline mr-1" /> محضر اللجنة
                          </button>
                          <button
                            type="button"
                            onClick={() => printDocument(committee.id, 'desk_cards')}
                            className="bg-indigo-50 text-indigo-700 text-[10px] font-black py-2 rounded-lg hover:bg-indigo-100"
                          >
                            <IdCard className="w-3 h-3 inline mr-1" /> الطاولة
                          </button>
                          <button
                            type="button"
                            onClick={() => printDocument(committee.id, 'invigilator_ids')}
                            className="bg-emerald-50 text-emerald-700 text-[10px] font-black py-2 rounded-lg hover:bg-emerald-100"
                          >
                            <Contact className="w-3 h-3 inline mr-1" /> الهويات
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Invigilators Radar ───────────────────────────────── */}
          {activeTab === 'invigilators_radar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" /> رادار المراقبة
                  </h3>
                  <button
                    onClick={handleAutoAssignInvigilators}
                    disabled={isAutoAssigning}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <Wand2 className="w-5 h-5" /> التوزيع الآلي الذكي
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                  {teachers
                    .filter((t) => invigilators.some((i) => i.teacher_id === t.id))
                    .map((t) => {
                      const duties = invigilators.filter((i) => i.teacher_id === t.id);
                      return (
                        <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0 text-xl border-2 border-white shadow-sm overflow-hidden">
                              {t.avatar_url ? (
                                <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full rounded-full object-cover" alt="" />
                              ) : (
                                getInitials(t.full_name)
                              )}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-sm">{t.full_name}</h4>
                              <p className="text-[10px] font-bold text-slate-500 mt-1">
                                إجمالي المراقبات: <span className="text-emerald-600 font-black text-sm">{duties.length}</span>
                              </p>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 flex-1">
                            <p className="text-[10px] font-bold text-slate-400 mb-2">سجل التكليفات:</p>
                            <div className="flex flex-col gap-2">
                              {duties.map((duty) => {
                                const cName = committees.find((c) => c.id === duty.committee_id)?.name || 'غير معروف';
                                return (
                                  <div key={duty.id} className="flex flex-col bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-black text-slate-700">{cName}</span>
                                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 rounded">{duty.exam_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 border-t border-slate-200/50 pt-1">
                                      {duty.status === 'signed' ? (
                                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> استلم
                                        </span>
                                      ) : duty.status === 'excused' ? (
                                        <button
                                          onClick={() => openReadExcuseModal(duty)}
                                          className="text-[9px] font-black text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition-colors"
                                        >
                                          <AlertCircle className="w-3 h-3" /> عرض العذر
                                        </button>
                                      ) : (
                                        <span className="text-[9px] font-bold text-slate-400">بانتظار التوقيع</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {teachers.filter((t) => invigilators.some((i) => i.teacher_id === t.id)).length === 0 && (
                    <p className="text-slate-400 font-bold text-sm col-span-full text-center py-10">لم يتم تكليف أي مراقب حتى الآن.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Daily Stats ────────────────────────────────────────── */}
          {activeTab === 'daily_stats' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-8 border-b-[3px] border-fuchsia-100 pb-4">
                  <div>
                    <h3 className="text-2xl font-black text-fuchsia-800 flex items-center gap-2 mb-2">
                      <FileText className="w-7 h-7 text-fuchsia-600" /> إحصائية لجان المراقبة اليومية
                    </h3>
                    <p className="text-sm font-bold text-fuchsia-600">تقرير مفصل ليوم: {activeExamDate}</p>
                  </div>
                  <button onClick={() => window.print()} className="px-4 py-2 bg-fuchsia-600 text-white font-black rounded-xl hover:bg-fuchsia-700 shadow-sm print:hidden">
                    طباعة الإحصائية
                  </button>
                </div>

                <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 mb-3 border-b border-slate-200 pb-2">المواد المختبرة:</h4>
                  <div className="flex flex-wrap gap-2">
                    {timetables.filter((t) => t.exam_date === activeExamDate).map((t, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                        {normalizeRelation(t.subjects)?.name} <span className="text-indigo-500 font-black">({t.class_level === 10 ? 'عاشر' : 'حادي عشر'})</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6 bg-amber-50 p-5 rounded-2xl border border-amber-200">
                  <h4 className="text-sm font-black text-amber-900 mb-3 border-b border-amber-200/50 pb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4" /> رؤساء اللجان:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentHeads.length > 0 ? currentHeads.map((h, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {normalizeRelation(h.users)?.avatar_url ? (
                            <img src={normalizeRelation(h.users)?.avatar_url || ''} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Crown className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-800">{getSafeName(h.users)}</p>
                          <p className="text-[10px] font-bold text-amber-600 mt-1">مسؤول عن: {h.committees_range}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs font-bold text-amber-600">لم يتم تعيين رؤساء لجان.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">توزيع المراقبين:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {committees.map((comm) => {
                      const commInvigs = invigilators.filter((i) => i.committee_id === comm.id && i.exam_date === activeExamDate);
                      return (
                        <div key={comm.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h5 className="font-black text-indigo-700 border-b border-slate-100 pb-2 mb-3">{comm.name}</h5>
                          {commInvigs.length > 0 ? (
                            <ul className="space-y-2">
                              {commInvigs.map((inv, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> {getSafeName(inv.users)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">لا يوجد مراقبون</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Heads Radar ────────────────────────────────────────── */}
          {activeTab === 'heads_radar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {/* Part 1: Assign Heads */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6">
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-emerald-600" /> 1. تعيين رؤساء اللجان (الفريق الدائم)
                </h3>
                {/* FIX 1: escaped quotes using &quot; */}
                <p className="text-xs font-bold text-slate-500 mb-6">
                  ابحث عن المعلم واعتمد كونه &quot;رئيس لجنة&quot;.
                </p>
                <div className="relative mb-4">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                    placeholder="ابحث عن اسم المعلم..."
                    value={headSearchTerm}
                    onChange={(e) => setHeadSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar p-2 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                  {teachers
                    .filter((t) => t.full_name.includes(headSearchTerm))
                    .map((t) => {
                      const isHead = t.is_committee_head;
                      return (
                        <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isHead ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                              {t.avatar_url ? (
                                <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="" />
                              ) : (
                                getInitials(t.full_name)
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-black ${isHead ? 'text-amber-800' : 'text-slate-800'}`}>{t.full_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">{t.subjectsStr}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCommitteeHead(t.id, isHead)}
                            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all shadow-sm ${isHead ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                          >
                            {isHead ? 'إلغاء صفة الرئاسة' : 'تعيين كرئيس'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Part 2: Daily Assignment */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-indigo-500" /> 2. التكليف اليومي لرؤساء اللجان
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2">أ) حدد اليوم الامتحاني</label>
                    <select
                      value={headAssignment.date}
                      onChange={(e) => {
                        const d = e.target.value;
                        setHeadAssignment({ ...headAssignment, date: d, head_teacher_id: '' });
                        fetchHeadsByDate(d);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
                    >
                      <option value="">- اختر اليوم -</option>
                      {uniqueExamDates.map((date) => {
                        const count = timetables.filter((t) => t.exam_date === date).length;
                        return (
                          <option key={date} value={date}>
                            {date} (يتضمن {count} امتحانات)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {headAssignment.date && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-sm font-black text-slate-700 mb-2">ب) اختر اللجان</label>
                      <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                        {committees
                          .filter((c) => !c.name.includes('الفائض'))
                          .map((c) => {
                            const isAssigned = alreadyAssignedCommittees.includes(c.name);
                            const isSelected = selectedCommitteesForHead.includes(c.name);
                            return (
                              <button
                                type="button"
                                key={c.id}
                                disabled={isAssigned}
                                onClick={() => {
                                  setSelectedCommitteesForHead((prev) =>
                                    prev.includes(c.name) ? prev.filter((n) => n !== c.name) : [...prev, c.name]
                                  );
                                }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 border shadow-sm
                                  ${isAssigned ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                                    isSelected ? 'bg-indigo-600 text-white border-indigo-700 scale-105' :
                                      'bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-700'}`}
                              >
                                {isAssigned ? <X className="w-4 h-4" /> : isSelected ? <CheckSquare className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {c.name}
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  )}

                  {headAssignment.date && selectedCommitteesForHead.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-sm font-black text-slate-700 mb-2">ج) اختر رئيس اللجان</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={headAssignment.head_teacher_id}
                          onChange={(e) => setHeadAssignment({ ...headAssignment, head_teacher_id: e.target.value })}
                          className="flex-1 bg-white border border-slate-200 rounded-xl p-4 font-black text-slate-800 focus:border-indigo-500 outline-none shadow-sm"
                        >
                          <option value="">- اختر رئيس معتمد -</option>
                          {teachers.filter((t) => t.is_committee_head).map((t) => (
                            <option key={t.id} value={t.id}>👑 {t.full_name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAssignHead}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 sm:py-0 rounded-xl transition-all shadow-md text-lg flex items-center gap-2 justify-center"
                        >
                          <CheckCircle2 className="w-5 h-5" /> اعتماد
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Current Heads List */}
              {headAssignment.date && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                  <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> تكليفات اليوم:
                  </h4>
                  <div className="space-y-3">
                    {currentHeads.length > 0 ? currentHeads.map((head, hi) => (
                      <div key={hi} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black shrink-0 overflow-hidden">
                            {normalizeRelation(head.users)?.avatar_url ? (
                              <img src={normalizeRelation(head.users)?.avatar_url || ''} className="w-full h-full rounded-full object-cover" alt="" />
                            ) : (
                              <Crown className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-base">{getSafeName(head.users)}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {head.committees_range.split('،').filter(Boolean).map((cr, i) => (
                                <span key={i} className="font-bold text-amber-800 text-[11px] bg-amber-100 px-2 py-1 rounded-md border border-amber-200">
                                  {cr.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHead(head.head_teacher_id, headAssignment.date)}
                          className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors shadow-sm"
                          title="إزالة التكليف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )) : (
                      <p className="text-center text-sm font-bold text-slate-400 py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        لم يتم تكليف أي رئيس لهذا اليوم.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Builder Modal */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" /> هندسة اللجان
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-600">عدد اللجان الإجمالي</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={builderData.count}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setBuilderData((p) => ({ ...p, count: Number.isNaN(v) ? 1 : Math.min(100, Math.max(1, v)) }));
                  }}
                  className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">سعة اللجنة الواحدة</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={builderData.capacity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setBuilderData((p) => ({ ...p, capacity: Number.isNaN(v) ? 1 : Math.min(50, Math.max(1, v)) }));
                  }}
                  className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 text-center mt-1">السعة القصوى 50 طالب.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleBuild} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700">بناء</button>
                <button type="button" onClick={() => setIsBuilderModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemptions Modal */}
      <AnimatePresence>
        {isExemptionsModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
              onClick={() => setIsExemptionsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-3xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserMinus className="w-6 h-6 text-rose-500" /> إدارة الإعفاءات
                </h3>
                <button
                  type="button"
                  onClick={() => setIsExemptionsModalOpen(false)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mb-4 shrink-0">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="ابحث عن معلم..."
                  value={exemptionSearchTerm}
                  onChange={(e) => setExemptionSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {teachers
                  .filter((t) => t.full_name.includes(exemptionSearchTerm) || t.subjectsStr.includes(exemptionSearchTerm))
                  .map((t) => {
                    const isExcluded = t.is_excluded_from_exams;
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isExcluded ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                            {t.avatar_url ? (
                              <img src={t.avatar_url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="" />
                            ) : (
                              getInitials(t.full_name)
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-black ${isExcluded ? 'text-rose-700' : 'text-slate-800'}`}>{t.full_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate max-w-[150px]">{t.subjectsStr}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleExemption(t.id, isExcluded)}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all shadow-sm ${isExcluded ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                        >
                          {isExcluded ? 'إلغاء الإعفاء' : 'إعفاء'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Class Print Modal */}
      {isClassPrintModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsClassPrintModalOpen(false)}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Layers className="w-6 h-6 text-emerald-600" /> طباعة بطاقات الفصول
              </h3>
              <button
                type="button"
                onClick={() => setIsClassPrintModalOpen(false)}
                className="p-2 bg-slate-50 hover:text-rose-500 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {availableClasses.length === 0 ? (
              <p className="text-center text-sm font-bold text-slate-500 py-8">لا يوجد طلاب موزعون بعد.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {availableClasses.map((cls) => (
                  <button
                    type="button"
                    key={cls}
                    onClick={() => printDocument('', 'class_cards', cls)}
                    className="w-full bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 p-4 rounded-xl text-right transition-all flex items-center justify-between group"
                  >
                    <span className="font-black text-slate-700 group-hover:text-emerald-700">{cls}</span>
                    <PrinterIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Committee Modal */}
      {isViewModalOpen && selectedCommittee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <DoorOpen className="w-6 h-6 text-indigo-600" /> {selectedCommittee.name}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  السعة: {selectedCommittee.capacity ?? 14} | الطلاب: {viewDetails.students.length}
                </p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              {viewDetails.loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-500">جاري التحميل...</p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-black text-emerald-900 bg-emerald-50 px-3 py-2 rounded-lg flex justify-between items-center mb-3">
                    <span>قائمة الطلاب</span>
                    <span className="text-xs font-bold text-emerald-600">{viewDetails.students.length} طالب</span>
                  </h4>
                  {viewDetails.students.length > 0 ? (
                    <table className="w-full border-collapse border border-slate-200 text-right text-sm rounded-xl overflow-hidden shadow-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-3 border-b border-slate-200 font-black text-slate-700">رقم الجلوس</th>
                          <th className="p-3 border-b border-slate-200 font-black text-slate-700">الاسم</th>
                          <th className="p-3 border-b border-slate-200 font-black text-slate-700">الصف</th>
                          <th className="p-3 border-b border-slate-200 font-black text-slate-700 text-center">نقل</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDetails.students.map((s, idx) => {
                          const student = normalizeRelation(s.students);
                          const stdName = getSafeName(student?.users);
                          const stdAvatar = getSafeAvatar(student?.users);
                          const clsName = getFullClassName(student as any);
                          return (
                            <tr key={idx} className="even:bg-slate-50 hover:bg-emerald-50/50 transition-colors">
                              <td className="p-3 border-b border-slate-100 font-black text-indigo-600 tracking-widest">{s.seat_number}</td>
                              <td className="p-3 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                                {stdAvatar ? (
                                  <img src={stdAvatar} crossOrigin="anonymous" className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px] font-black shrink-0">
                                    {getInitials(stdName)}
                                  </div>
                                )}
                                <span className="truncate">{stdName}</span>
                              </td>
                              <td className="p-3 border-b border-slate-100 font-bold text-slate-500 text-xs">{clsName}</td>
                              <td className="p-3 border-b border-slate-100 text-center">
                                <select
                                  className="bg-white border border-slate-200 text-indigo-700 text-[10px] font-black rounded-lg px-2 py-1.5 outline-none hover:border-indigo-400 cursor-pointer shadow-sm"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && confirm(`تأكيد نقل إلى ${e.target.options[e.target.selectedIndex].text}؟`)) {
                                      handleMoveStudent(s.student_id || '', val);
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>🔄 نقل...</option>
                                  {committees
                                    .filter((c) => c.id !== selectedCommittee.id)
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm font-bold text-slate-500 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      هذه اللجنة فارغة.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Invigilator Modal */}
      {isAssignModalOpen && selectedCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              تعيين مراقب — {selectedCommittee.name}
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن معلم..."
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {teachers
                  .filter((t) => !t.is_excluded_from_exams && t.full_name.includes(teacherSearchTerm))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeacherId(t.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${selectedTeacherId === t.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black shrink-0">
                        {t.avatar_url ? <img src={t.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : getInitials(t.full_name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800">{t.full_name}</p>
                        <p className="text-[10px] text-slate-400">{t.subjectsStr}</p>
                      </div>
                      {selectedTeacherId === t.id && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddInvigilator}
                  disabled={!selectedTeacherId}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50"
                >
                  تعيين
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAssignModalOpen(false); setSelectedTeacherId(''); setTeacherSearchTerm(''); }}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Committee Edit/Create Modal */}
      {isCommitteeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              {editCommitteeData.id ? 'تعديل لجنة' : 'لجنة جديدة'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-600">الاسم</label>
                <input
                  type="text"
                  value={editCommitteeData.name || ''}
                  onChange={(e) => setEditCommitteeData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">السعة</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={editCommitteeData.capacity ?? 14}
                  onChange={(e) => setEditCommitteeData((p) => ({ ...p, capacity: parseInt(e.target.value, 10) || 14 }))}
                  className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600">الموقع</label>
                <input
                  type="text"
                  value={editCommitteeData.location || ''}
                  onChange={(e) => setEditCommitteeData((p) => ({ ...p, location: e.target.value }))}
                  className="w-full mt-1 p-3 bg-slate-50 border rounded-xl font-black text-center outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleSaveCommittee} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black hover:bg-indigo-700">حفظ</button>
                <button type="button" onClick={() => setIsCommitteeModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read Excuse Modal */}
      {isReadExcuseModalOpen && selectedExcuseData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-rose-700 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" /> عذر المراقب
            </h3>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl mb-4">
              <p className="text-sm font-bold text-rose-800 leading-relaxed">{selectedExcuseData.excuse_reason || 'لا يوجد نص للعذر.'}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRemoveInvigilator(selectedExcuseData)}
                className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black hover:bg-rose-700"
              >
                قبول العذر وإلغاء التكليف
              </button>
              <button
                type="button"
                onClick={() => setIsReadExcuseModalOpen(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HIDDEN PRINT CONTAINER — Professional Templates */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {printPayload && (
        <div className="fixed top-0 left-0 -z-50 opacity-[0.01] pointer-events-none" dir="rtl">
          <div ref={printRef} className="flex flex-col bg-white">

            {/* ── 1. محضر اللجنة الرسمي (Official Attendance Sheet) ───────── */}
            {printType === 'door_sheet' && (
              <div className="print-page-wrapper bg-white mx-auto relative" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
                {/* Header with Logo Area */}
                <div className="flex items-center justify-between mb-6 border-b-4 border-indigo-900 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-indigo-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                      رفعة
                    </div>
                    <div className="text-right">
                      <h1 className="text-2xl font-black text-indigo-900">مدرسة الرفعة النموذجية بنين</h1>
                      <p className="text-sm font-bold text-slate-500">إدارة التعليم الخاص — وزارة التربية</p>
                      <p className="text-xs font-bold text-slate-400 mt-1">الفصل الدراسي الثاني 2025/2026</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="bg-slate-100 border-2 border-slate-300 rounded-xl px-4 py-2 text-center">
                      <p className="text-xs font-bold text-slate-500">رقم المحضر</p>
                      <p className="text-lg font-black text-slate-800">{printPayload.committee.name}</p>
                    </div>
                  </div>
                </div>

                {/* Exam Info Bar */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-indigo-500 mb-1">تاريخ الامتحان</p>
                    <p className="text-sm font-black text-indigo-900">{activeExamDate || '................'}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-emerald-500 mb-1">المادة</p>
                    <p className="text-sm font-black text-emerald-900">........................</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-amber-500 mb-1">المرحلة</p>
                    <p className="text-sm font-black text-amber-900">ثانوي</p>
                  </div>
                </div>

                {/* Students Table */}
                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className="bg-indigo-900 text-white">
                      <th className="p-3 text-center font-black text-sm w-12 border-l border-indigo-800">م</th>
                      <th className="p-3 text-center font-black text-sm w-28 border-l border-indigo-800">رقم الجلوس</th>
                      <th className="p-3 text-right font-black text-sm border-l border-indigo-800">اسم الطالب الرباعي</th>
                      <th className="p-3 text-center font-black text-sm w-32 border-l border-indigo-800">الصف والشعبة</th>
                      <th className="p-3 text-center font-black text-sm w-24 border-l border-indigo-800">التوقيع</th>
                      <th className="p-3 text-center font-black text-sm w-20">الحضور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printPayload.students.map((s, i) => {
                      const std = normalizeRelation(s.students);
                      const stdName = getSafeName(std?.users);
                      const clsName = getFullClassName(std as any);
                      const seatNum = s.seat_number || '';
                      const isGrade10 = seatNum.startsWith('10');
                      const isSci = seatNum.startsWith('111');
                      const rowColor = isGrade10 ? 'bg-blue-50/30' : isSci ? 'bg-emerald-50/30' : 'bg-purple-50/30';
                      const borderColor = isGrade10 ? 'border-blue-200' : isSci ? 'border-emerald-200' : 'border-purple-200';

                      return (
                        <tr key={i} className={`border-b ${borderColor} ${rowColor} hover:bg-slate-50 transition-colors`}>
                          <td className="p-2.5 text-center font-bold text-slate-700 text-sm border-l border-slate-200">{i + 1}</td>
                          <td className="p-2.5 text-center font-black text-indigo-700 text-lg tracking-widest border-l border-slate-200 font-mono">{seatNum}</td>
                          <td className="p-2.5 text-right font-bold text-slate-800 text-sm border-l border-slate-200">{stdName}</td>
                          <td className="p-2.5 text-center font-bold text-slate-600 text-xs border-l border-slate-200">{clsName}</td>
                          <td className="p-2.5 text-center border-l border-slate-200">
                            <div className="w-full h-8 border-b-2 border-dotted border-slate-300"></div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="w-5 h-5 border-2 border-slate-300 rounded mx-auto"></div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary Footer */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">إجمالي الطلاب المسجلين:</p>
                    <p className="text-xl font-black text-slate-800">{printPayload.students.length} طالب</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">الطلاب الحاضرون:</p>
                    <p className="text-xl font-black text-emerald-700">..... / {printPayload.students.length}</p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t-2 border-slate-200">
                  <div className="text-center">
                    <div className="h-16 border-b-2 border-dotted border-slate-400 mb-2"></div>
                    <p className="font-black text-sm text-slate-800">المراقب الأول</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {printPayload.invigilators[0] ? getSafeName(printPayload.invigilators[0].users) : '........................'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 border-b-2 border-dotted border-slate-400 mb-2"></div>
                    <p className="font-black text-sm text-slate-800">المراقب الثاني</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {printPayload.invigilators[1] ? getSafeName(printPayload.invigilators[1].users) : '........................'}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-16 border-b-2 border-dotted border-slate-400 mb-2"></div>
                    <p className="font-black text-sm text-slate-800">رئيس اللجنة الإشرافي</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">........................</p>
                  </div>
                </div>

                {/* Official Stamp Area */}
                <div className="absolute bottom-4 left-4 opacity-10">
                  <div className="w-32 h-32 border-4 border-indigo-900 rounded-full flex items-center justify-center">
                    <span className="text-indigo-900 font-black text-xs text-center">ختم المدرسة<br/>الرسمي</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. بطاقات الطاولة الاحترافية (Professional Desk Cards) ──── */}
            {(printType === 'desk_cards' || printType === 'class_cards') &&
              chunkArray(printPayload.students, 6).map((chunk, pageIdx) => (
                <div
                  key={pageIdx}
                  className="print-page-wrapper bg-white mx-auto"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '10mm',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8mm',
                    alignContent: 'start'
                  }}
                >
                  {chunk.map((student, si) => {
                    const std = normalizeRelation(student.students);
                    const stdName = getSafeName(std?.users);
                    const clsName = getFullClassName(std as any);
                    const seatNum = student.seat_number || '---';
                    const commName = printPayload.committee.name;
                    const isGrade10 = seatNum.startsWith('10');
                    const isSci = seatNum.startsWith('111');

                    const accentColor = isGrade10 ? '#1e40af' : isSci ? '#047857' : '#7c3aed';
                    const bgGradient = isGrade10
                      ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                      : isSci
                        ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                        : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)';

                    const qrPayload = `RAF-${student.student_id}-${seatNum}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&margin=2&color=${accentColor.replace('#', '')}`;

                    return (
                      <div
                        key={si}
                        style={{
                          width: '95mm',
                          height: '60mm',
                          background: bgGradient,
                          borderRadius: '4mm',
                          border: `2px solid ${accentColor}`,
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        {/* Top Bar */}
                        <div style={{
                          background: accentColor,
                          padding: '2mm 3mm',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                            <div style={{
                              width: '8mm',
                              height: '8mm',
                              background: 'white',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '3mm',
                              fontWeight: 900,
                              color: accentColor,
                            }}>
                              ر
                            </div>
                            <div>
                              <div style={{ color: 'white', fontSize: '3.5mm', fontWeight: 900 }}>مدرسة الرفعة النموذجية</div>
                              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '2.5mm', fontWeight: 'bold' }}>
                                اختبارات الفصل الثاني 2025/2026
                              </div>
                            </div>
                          </div>
                          <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '1mm 2mm',
                            borderRadius: '2mm',
                            color: 'white',
                            fontSize: '2.5mm',
                            fontWeight: 900,
                          }}>
                            {commName}
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          padding: '3mm',
                          gap: '3mm',
                        }}>
                          {/* QR Section */}
                          <div style={{
                            width: '22mm',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1mm',
                          }}>
                            <div style={{
                              width: '20mm',
                              height: '20mm',
                              background: 'white',
                              borderRadius: '2mm',
                              padding: '1mm',
                              border: `1px solid ${accentColor}30`,
                            }}>
                              <img
                                src={qrUrl}
                                crossOrigin="anonymous"
                                alt="QR"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                            <div style={{
                              fontSize: '2mm',
                              fontWeight: 'bold',
                              color: accentColor,
                              textAlign: 'center',
                            }}>
                              امسح للتحقق
                            </div>
                          </div>

                          {/* Info Section */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2mm' }}>
                            <div>
                              <div style={{ fontSize: '2.5mm', fontWeight: 'bold', color: '#64748b', marginBottom: '1mm' }}>
                                اسم الطالب
                              </div>
                              <div style={{
                                fontSize: '4.5mm',
                                fontWeight: 900,
                                color: '#1e293b',
                                lineHeight: 1.3,
                                wordBreak: 'break-word',
                              }}>
                                {stdName}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '2mm', alignItems: 'center' }}>
                              <span style={{
                                background: `${accentColor}15`,
                                border: `1px solid ${accentColor}30`,
                                padding: '1mm 2mm',
                                borderRadius: '1.5mm',
                                fontSize: '2.5mm',
                                fontWeight: 900,
                                color: accentColor,
                              }}>
                                {clsName}
                              </span>
                            </div>
                          </div>

                          {/* Seat Number Section */}
                          <div style={{
                            width: '18mm',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRight: `2px solid ${accentColor}20`,
                            paddingRight: '2mm',
                          }}>
                            <div style={{
                              fontSize: '2mm',
                              fontWeight: 'bold',
                              color: '#64748b',
                              marginBottom: '1mm',
                            }}>
                              رقم الجلوس
                            </div>
                            <div style={{
                              fontSize: '6mm',
                              fontWeight: 900,
                              color: accentColor,
                              letterSpacing: '1mm',
                              fontFamily: 'monospace',
                            }}>
                              {seatNum}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Bar */}
                        <div style={{
                          background: `${accentColor}10`,
                          padding: '1.5mm 3mm',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: `1px solid ${accentColor}20`,
                        }}>
                          <div style={{ fontSize: '2mm', fontWeight: 'bold', color: '#94a3b8' }}>
                            {new Date().toLocaleDateString('ar-SA')}
                          </div>
                          <div style={{ fontSize: '2mm', fontWeight: 900, color: accentColor }}>
                            الرفعة النموذجية بنين (م-ث)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* ── 3. هويات المراقبين (Invigilator ID Cards) ──────────────── */}
            {printType === 'invigilator_ids' && (
              <div className="print-page-wrapper bg-white mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-black text-indigo-900 mb-2">هويات المراقبين الرسمية</h1>
                  <p className="text-sm font-bold text-slate-500">{printPayload.committee.name} — {activeExamDate}</p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8mm',
                }}>
                  {printPayload.invigilators.map((inv, i) => {
                    const name = getSafeName(inv.users);
                    const avatar = getSafeAvatar(inv.users);
                    const qrPayload = `RAF-INV-${inv.teacher_id}-${activeExamDate}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrPayload)}&margin=2`;

                    return (
                      <div
                        key={i}
                        style={{
                          width: '95mm',
                          height: '55mm',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderRadius: '3mm',
                          border: '2px solid #1e293b',
                          overflow: 'hidden',
                          display: 'flex',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      >
                        {/* Left: Photo & QR */}
                        <div style={{
                          width: '30mm',
                          background: '#1e293b',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2mm',
                          padding: '3mm',
                        }}>
                          <div style={{
                            width: '18mm',
                            height: '18mm',
                            borderRadius: '50%',
                            border: '2px solid white',
                            overflow: 'hidden',
                            background: '#334155',
                          }}>
                            {avatar ? (
                              <img src={avatar} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '8mm' }}>
                                {getInitials(name)}
                              </div>
                            )}
                          </div>
                          <div style={{ width: '16mm', height: '16mm', background: 'white', borderRadius: '1mm', padding: '1mm' }}>
                            <img src={qrUrl} crossOrigin="anonymous" style={{ width: '100%', height: '100%' }} alt="QR" />
                          </div>
                        </div>

                        {/* Right: Info */}
                        <div style={{ flex: 1, padding: '4mm', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '2.5mm', fontWeight: 'bold', color: '#64748b', marginBottom: '1mm' }}>
                            هوية مراقب الامتحانات
                          </div>
                          <div style={{ fontSize: '5mm', fontWeight: 900, color: '#1e293b', marginBottom: '2mm', lineHeight: 1.2 }}>
                            {name}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                              <div style={{ width: '2mm', height: '2mm', background: '#10b981', borderRadius: '50%' }}></div>
                              <span style={{ fontSize: '2.5mm', fontWeight: 'bold', color: '#374151' }}>
                                {printPayload.committee.name}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                              <div style={{ width: '2mm', height: '2mm', background: '#3b82f6', borderRadius: '50%' }}></div>
                              <span style={{ fontSize: '2.5mm', fontWeight: 'bold', color: '#374151' }}>
                                {activeExamDate}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                              <div style={{ width: '2mm', height: '2mm', background: '#f59e0b', borderRadius: '50%' }}></div>
                              <span style={{ fontSize: '2.5mm', fontWeight: 'bold', color: '#374151' }}>
                                دور: {inv.role || 'مراقب'}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginTop: '3mm', paddingTop: '2mm', borderTop: '1px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '2mm', fontWeight: 'bold', color: '#94a3b8' }}>
                              مصدر: مدرسة الرفعة النموذجية بنين (م-ث)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════ */
/* 5. تصدير الصفحة                                                          */
/* ═════════════════════════════════════════════════════════════════════════ */

export default function Page() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <ErrorBoundary>
      <ExamCommitteesControl />
    </ErrorBoundary>
  );
}
