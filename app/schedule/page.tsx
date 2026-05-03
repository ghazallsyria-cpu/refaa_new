/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, Sparkles, Bug, LayoutGrid, Save, Loader2, FileDown, Printer, Layers, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';

// استيراد المكتبات القوية لتوليد الـ PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

const formatClassName = (rawName?: string) => {
  if (!rawName) return '';
  return rawName.replace('الصف ', '').trim();
};

const getSlotSubtitle = (slot: any, viewType: string) => {
  if (!slot) return '';
  if (viewType === 'teacher') {
    const rawClassName = Array.isArray(slot.sections?.classes) ? slot.sections?.classes[0]?.name : slot.sections?.classes?.name;
    const className = formatClassName(rawClassName);
    return `${className || ''} - ${slot.sections?.name}`;
  }
  return slot.teachers?.users?.full_name || '';
};

const getEntityTitle = (entity: any, type: string) => {
  if (!entity) return '';
  if (type === 'teacher') return entity.users?.full_name || 'معلم غير محدد';
  const className = Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name;
  return `${formatClassName(className)} - ${entity.name}`;
};

export default function SchedulePage() {
  const { user, authRole, userRole, isChecking } = useAuth() as any;
  const [viewType, setViewType] = useState<'teacher' | 'section'>('teacher');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات الأمان
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWatcher, setIsWatcher] = useState(false);
  const [activeSystem, setActiveSystem] = useState<'manual' | 'auto'>('manual'); // 🚀 حالة النظام الفعال
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🚀 السطر الذي كان مفقوداً وتمت إضافته!
  const [selectedSlot, setSelectedSlot] = useState<{day: number, period: number} | null>(null);
  const [formData, setFormData] = useState({ teacher_id: '', section_id: '', subject_id: '' });
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 🚀 حالات الطباعة المتقدمة
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'all-sections' | 'specific-class' | 'specific-dept'>('single');
  const [printFilterVal, setPrintFilterVal] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedPrintClass, setSelectedPrintClass] = useState<string>('');
  const [selectedPrintDept, setSelectedPrintDept] = useState<string>('');

  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  const { 
    fetchInitialScheduleData, fetchStudentSection, fetchSchedules: fetchSchedulesData, 
    addSchedule, updateSchedule, deleteSchedule, checkConflicts, swapSchedules
  } = useSchedulesSystem();

  const isInitialFetched = useRef(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const [currentCell, setCurrentCell] = useState<{
    day: number;
    period: number;
    scheduleId?: string;
    subjectId?: string;
    teacherId?: string;
  }>({ day: 0, period: 1 });

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;
    try {
      let isSuperAdmin = authRole === 'admin' || authRole === 'management';
      let isGlobalWatcher = false;

      if (userRole === 'staff' && user?.id) {
        const { data } = await supabase.from('school_staff').select('permissions').eq('id', user.id).maybeSingle();
        if (data?.permissions?.global_read_only === true) {
          isGlobalWatcher = true;
        }
      }

      // 🚀 قراءة المفتاح المركزي للنظام
      const { data: settings } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
      setActiveSystem(settings?.active_schedule_system || 'manual');

      setIsAdmin(isSuperAdmin);
      setIsWatcher(isGlobalWatcher);

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setPeriods(data.periods || []);

      if (authRole === 'teacher' && user) {
        setSelectedId(user.id); setViewType('teacher'); setShowAllSchedules(false);
      } else if (authRole === 'student' && user) {
        const sectionId = await fetchStudentSection(user.id);
        if (sectionId) { setSelectedId(sectionId); setViewType('section'); setShowAllSchedules(false); }
      } else if ((isSuperAdmin || isGlobalWatcher) && data.teachers?.[0]) {
        setSelectedId(data.teachers[0].id);
      }
    } catch (err) { console.error(err); }
  }, [fetchInitialScheduleData, fetchStudentSection, user, authRole, userRole, isChecking]);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // 🚀 استخراج الفئات والأقسام الفريدة لتغذية فلاتر الطباعة
  const uniqueClasses = Array.from(new Set(sections.map(s => formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)))).filter(Boolean).sort();
  const uniqueDepts = ['قسم العلوم', 'قسم الرياضيات', 'قسم اللغة العربية', 'قسم اللغة الإنجليزية', 'قسم التربية الإسلامية', 'قسم الاجتماعيات', 'قسم الحاسوب', 'أقسام أخرى'];

  const getTeacherDept = (tId: string) => {
    const tSchedules = scheduleData.filter(s => String(s.teacher_id) === String(tId));
    if (tSchedules.length === 0) return 'أقسام أخرى';
    const subjName = tSchedules[0].subjects?.name || '';
    if (/(علوم|فيزياء|كيمياء|أحياء|جيولوجيا)/.test(subjName)) return 'قسم العلوم';
    if (/(رياضيات)/.test(subjName)) return 'قسم الرياضيات';
    if (/(عربي|عربية)/.test(subjName)) return 'قسم اللغة العربية';
    if (/(إنجليزي|انجليزي)/.test(subjName)) return 'قسم اللغة الإنجليزية';
    if (/(إسلامية|قرآن|تجويد)/.test(subjName)) return 'قسم التربية الإسلامية';
    if (/(اجتماعيات|تاريخ|جغرافيا|فلسفة|نفس)/.test(subjName)) return 'قسم الاجتماعيات';
    if (/(حاسوب|معلوماتية)/.test(subjName)) return 'قسم الحاسوب';
    return 'أقسام أخرى';
  };

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin || activeSystem === 'auto') return; // منع التبديل في النظام الذكي
    try {
      setLoading(true);
      const sourceDay = Number(swappingFrom.day_of_week);
      const sourcePeriod = Number(swappingFrom.period);
      const tDay = Number(targetDay);
      const tPeriod = Number(targetPeriod);

      try {
        const conflicts = await checkConflicts(tDay, tPeriod, String(swappingFrom.teacher_id), String(swappingFrom.section_id), String(swappingFrom.id));
        const targetConflicts = conflicts.filter(c => String(c.id) !== String(targetSlot?.id) && (String(c.teacher_id) === String(swappingFrom.teacher_id) || String(c.section_id) === String(swappingFrom.section_id)));
        if (targetConflicts.length > 0) { alert('تعذر التبديل: يوجد تعارض'); setLoading(false); return; }

        if (targetSlot) {
          const sourceConflicts = await checkConflicts(sourceDay, sourcePeriod, String(targetSlot.teacher_id), String(targetSlot.section_id), String(targetSlot.id));
          const filteredSourceConflicts = sourceConflicts.filter(c => String(c.id) !== String(swappingFrom.id) && (String(c.teacher_id) === String(targetSlot.teacher_id) || String(c.section_id) === String(targetSlot.section_id)));
          if (filteredSourceConflicts.length > 0) { alert('تعذر التبديل: يوجد تعارض'); setLoading(false); return; }
        }
      } catch (e) { console.warn("تجاوز فحص التعارض", e); }

      await swapSchedules(String(swappingFrom.id), sourceDay, sourcePeriod, targetSlot ? String(targetSlot.id) : null, tDay, tPeriod);
      setSwappingFrom(null); await fetchSchedule(); alert('تم التبديل بنجاح!');
    } catch (err: any) { alert(`حدث خطأ: ${err.message}`); fetchSchedule(); } finally { setLoading(false); }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || activeSystem === 'auto') return; // 🔒 حماية إضافية
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !currentCell) { alert('يرجى تعبئة جميع الحقول المطلوبة.'); return; }
    
    setIsSubmitting(true);
    try {
      try {
        const conflicts = await checkConflicts(Number(currentCell.day), Number(currentCell.period), String(formData.teacher_id), String(formData.section_id), editingId ? String(editingId) : undefined);
        if (conflicts && conflicts.length > 0) { alert(`يوجد تضارب مع حصة أخرى في نفس الوقت.`); setIsSubmitting(false); return; }
      } catch (e) { console.warn("تجاوز المحرك", e); }

      const payload: any = { teacher_id: String(formData.teacher_id), section_id: String(formData.section_id), subject_id: String(formData.subject_id), day_of_week: currentCell.day, period: currentCell.period };
      
      if (editingId) { await updateSchedule(String(editingId), payload); } else { await addSchedule(payload); }
      
      setIsModalOpen(false); setEditingId(null); setFormData({ teacher_id: '', section_id: '', subject_id: '' }); await fetchSchedule(); showNotification('success', 'تم حفظ الحصة بنجاح');
    } catch (err: any) { showNotification('error', `خطأ أثناء الحفظ: ${err.message}`); } finally { setIsSubmitting(false); }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!isAdmin || activeSystem === 'auto') return; // 🔒 حماية إضافية
    setScheduleToDelete(id);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    try { 
      await deleteSchedule(String(scheduleToDelete)); 
      await fetchSchedule(); 
      showNotification('success', 'تم حذف الحصة بنجاح');
    } catch (err: any) { 
      showNotification('error', `خطأ: ${err.message}`); 
    } finally {
      setScheduleToDelete(null);
    }
  };

  const openCellModal = (day: number, period: number, existingSchedule?: Schedule) => {
    if (!selectedId) {
      showNotification('error', 'الرجاء اختيار الكيان أولاً');
      return;
    }
    
    setCurrentCell({
      day,
      period,
      scheduleId: existingSchedule?.id,
      subjectId: existingSchedule?.subject_id || '',
      teacherId: existingSchedule?.teacher_id || '',
    });
    setFormData({
      teacher_id: viewType === 'teacher' ? selectedId : existingSchedule?.teacher_id || '',
      section_id: viewType === 'section' ? selectedId : existingSchedule?.section_id || '',
      subject_id: existingSchedule?.subject_id || ''
    });
    setEditingId(existingSchedule?.id || null);
    setIsModalOpen(true);
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let filters: any = {};
      if (!((isAdmin || isWatcher) && showAllSchedules)) {
        if (viewType === 'teacher') filters.teacherId = selectedId;
        else filters.sectionId = selectedId;
      }
      const data = await fetchSchedulesData(filters);
      setScheduleData(data || []);
    } catch (err: any) { setScheduleData([]); } finally { setLoading(false); }
  }, [selectedId, viewType, isAdmin, isWatcher, showAllSchedules, fetchSchedulesData]);

  useEffect(() => { if (!selectedId && !showAllSchedules) return; fetchSchedule(); }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  const getCellData = (day: number, period: number) => {
    return scheduleData.find(s => 
      s.day_of_week === day && 
      s.period === period && 
      (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))
    );
  };

  const getEntitySchedule = (entityId: string, entityType: 'teacher' | 'section') => {
    return scheduleData.filter(s => entityType === 'teacher' ? String(s.teacher_id) === String(entityId) : String(s.section_id) === String(entityId));
  };

  // 🚀 محرك توليد الـ PDF الذكي
  const executePDF = async (mode: 'single' | 'all-teachers' | 'all-sections' | 'specific-class' | 'specific-dept', filterVal?: string) => {
    try {
      setIsGeneratingPDF(true);
      setPrintMode(mode);
      setPrintFilterVal(filterVal || '');

      if (mode !== 'single') {
        setShowAllSchedules(true);
        const allData = await fetchSchedulesData({});
        setScheduleData(allData || []);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const containers = document.querySelectorAll('.pdf-page-container');
      if (!containers || containers.length === 0) throw new Error('لم يتم العثور على جداول صالحة للطباعة (ربما تكون فارغة).');

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < containers.length; i++) {
        if (i > 0) pdf.addPage();
        const el = containers[i] as HTMLElement;
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const links = el.querySelectorAll('a.zoom-link');
        const elementRect = el.getBoundingClientRect();
        links.forEach((link: any) => {
          const rect = link.getBoundingClientRect();
          const relativeX = (rect.left - elementRect.left) / elementRect.width;
          const relativeY = (rect.top - elementRect.top) / elementRect.height;
          const pdfX = relativeX * pdfWidth; const pdfY = relativeY * pdfHeight;
          const finalUrl = normalizeUrl(link.href);
          if (finalUrl) pdf.link(pdfX, pdfY, rect.width / elementRect.width * pdfWidth, rect.height / elementRect.height * pdfHeight, { url: finalUrl });
        });
      }
      
      let fileName = 'الجدول_الدراسي.pdf';
      if (mode === 'all-sections') fileName = 'جداول_جميع_الفصول.pdf';
      if (mode === 'all-teachers') fileName = 'جداول_جميع_المعلمين.pdf';
      if (mode === 'specific-class') fileName = `جداول_مرحلة_${filterVal}.pdf`;
      if (mode === 'specific-dept') fileName = `جداول_${filterVal}.pdf`;

      pdf.save(fileName);
    } catch (error: any) { alert(error.message || 'حدث خطأ أثناء بناء وتصدير ملف الـ PDF.'); } finally { setIsGeneratingPDF(false); }
  };

  // شاشات الحماية والتحميل
  if (isChecking) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management') {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo p-4">
        <div className="glass-panel p-10 rounded-[2.5rem] text-center max-w-md w-full border border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)] bg-[#131836]/60 backdrop-blur-md">
           <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
           <h2 className="text-2xl font-black text-white mb-2">وصول مقيد</h2>
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للإدارة العليا فقط.</p>
        </div>
      </div>
    );
  }

  if (loading && teachers.length === 0) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد محرك الجداول...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🚀 ADMIN / WATCHER VIEW (Dark Glassmorphism + Print Center)
  // ==========================================
  return (
    <div className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
      
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* نافذة مركز الطباعة 🚀 */}
      <Dialog.Root open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-[#090b14]/80 backdrop-blur-md z-50 print:hidden" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#131836] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 w-[90%] max-w-2xl print:hidden" dir="rtl">
            <div className="flex justify-between items-center mb-8">
              <Dialog.Title className="text-2xl font-black text-white flex items-center gap-3"><Printer className="w-6 h-6 text-emerald-400" /> مركز الطباعة والتصدير</Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></Dialog.Close>
            </div>
            
            <div className="space-y-6">
              {/* قسم طباعة المعلمين */}
              <div className="bg-[#090b14]/50 p-6 rounded-3xl border border-white/5 space-y-5">
                <h3 className="font-black text-indigo-400 flex items-center gap-2 text-lg"><User className="w-5 h-5" /> جداول المعلمين</h3>
                <button onClick={() => { setIsPrintModalOpen(false); executePDF('all-teachers'); }} className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-95 shadow-sm">
                  طباعة جميع المعلمين (متسلسل)
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={selectedPrintDept} onChange={e=>setSelectedPrintDept(e.target.value)} className="w-full sm:flex-1 p-3.5 border border-white/10 bg-[#131836] text-white rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                    <option value="">-- اختر قسماً محدداً للطباعة --</option>
                    {uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                  <button onClick={() => { setIsPrintModalOpen(false); executePDF('specific-dept', selectedPrintDept); }} disabled={!selectedPrintDept} className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black disabled:opacity-50 transition-all shadow-lg active:scale-95">طباعة القسم</button>
                </div>
              </div>

              {/* قسم طباعة الفصول */}
              <div className="bg-[#090b14]/50 p-6 rounded-3xl border border-white/5 space-y-5">
                <h3 className="font-black text-emerald-400 flex items-center gap-2 text-lg"><Users className="w-5 h-5" /> جداول الفصول الدراسية</h3>
                <button onClick={() => { setIsPrintModalOpen(false); executePDF('all-sections'); }} className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-95 shadow-sm">
                  طباعة جميع الفصول (متسلسل)
                </button>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select value={selectedPrintClass} onChange={e=>setSelectedPrintClass(e.target.value)} className="w-full sm:flex-1 p-3.5 border border-white/10 bg-[#131836] text-white rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                    <option value="">-- اختر صفاً محدداً للطباعة --</option>
                    {uniqueClasses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => { setIsPrintModalOpen(false); executePDF('specific-class', selectedPrintClass); }} disabled={!selectedPrintClass} className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black disabled:opacity-50 transition-all shadow-lg active:scale-95">طباعة الصف</button>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090b14]/90 backdrop-blur-xl text-white print:hidden">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثائق الـ PDF الذكية...</h2>
            <p className="text-slate-300 font-bold mt-3 text-lg">النظام يقوم برسم الجداول وترتيبها حسب طلبك.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8 relative z-10 print:p-0 print:m-0 print:max-w-none">
        
        {/* 🚀 إشعارات حالة النظام (يدوي أم ذكي) */}
        {isAdmin && authRole !== 'teacher' && activeSystem === 'manual' && (
          <div className="bg-amber-500/10 p-5 rounded-2xl text-sm text-amber-400 font-bold border border-amber-500/30 flex items-center gap-3 backdrop-blur-md shadow-lg print:hidden">
            <Bug className="w-6 h-6 shrink-0" />
            <p>وضع الإدارة مفعل (النظام اليدوي). يمكنك تعديل ونسخ وتبديل الحصص بالسحب والنقر بحرية تامة.</p>
          </div>
        )}

        {isAdmin && authRole !== 'teacher' && activeSystem === 'auto' && (
          <div className="bg-emerald-500/10 p-5 rounded-2xl text-sm text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-3 backdrop-blur-md shadow-lg print:hidden">
            <Sparkles className="w-6 h-6 shrink-0" />
            <p>الجدول الذكي (Auto) مفعل. التعديل اليدوي مقفل. الجداول معروضة بوضعية القراءة والطباعة فقط لضمان سلامة بيانات الذكاء الاصطناعي.</p>
          </div>
        )}

        {isWatcher && (
          <div className="bg-blue-500/10 p-5 rounded-2xl text-sm text-blue-400 font-bold border border-blue-500/30 flex items-center gap-3 backdrop-blur-md shadow-lg print:hidden">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <p>وضع المراقبة الشاملة مفعل. الجداول تظهر بوضعية القراءة فقط.</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-[#131836]/60 backdrop-blur-2xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 print:hidden">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-400 mb-3 shadow-sm">
              <LayoutGrid className="w-4 h-4" /> <span>إدارة الهيكل الزمني</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">الجدول الشامل</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <button onClick={() => executePDF('single')} className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3.5 text-sm font-black text-white hover:bg-white/10 transition-all active:scale-95 shrink-0">
              <FileDown className="h-5 w-5" /> تحميل الجدول الحالي
            </button>
            {(isAdmin || isWatcher) && (
               <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-black text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-90 transition-all active:scale-95 shrink-0">
                 <Printer className="h-5 w-5" /> مركز الطباعة الذكي
               </button>
            )}
          </div>
        </div>

        {isAdmin && authRole !== 'teacher' && swappingFrom && activeSystem === 'manual' && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse sticky top-4 z-40 print:hidden">
            <p className="font-black text-lg">وضع التبديل نشط - انقر على خانة أخرى للتبديل</p>
            <button onClick={() => setSwappingFrom(null)} className="w-full sm:w-auto bg-[#090b14] text-amber-400 px-6 py-3 rounded-xl font-black shadow-sm">إلغاء التبديل</button>
          </div>
        )}

        {isAdmin && authRole !== 'teacher' && copiedLesson && activeSystem === 'manual' && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex flex-col sm:flex-row items-center justify-between sticky top-4 z-40 gap-4 mt-4 print:hidden">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Info className="h-6 w-6" /></div>
              <div>
                <p className="font-black text-lg">تم نسخ الحصة</p>
                <p className="text-sm font-bold mt-1 opacity-90">المادة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{copiedLesson.subjects?.name}</span> ({copiedLesson.teachers?.users?.full_name})<br />انقر على أي خانة فارغة للصق.</p>
              </div>
            </div>
            <button onClick={() => setCopiedLesson(null)} className="w-full sm:w-auto bg-[#090b14] text-emerald-400 hover:text-emerald-300 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors">مسح الحافظة</button>
          </div>
        )}

        <div className="bg-[#131836]/60 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-lg border border-white/10 flex flex-col lg:flex-row gap-6 items-center print:hidden">
          <div className="flex rounded-2xl shadow-inner bg-[#090b14]/50 p-1.5 w-full lg:w-auto shrink-0 border border-white/5">
            <button type="button" onClick={() => { setViewType('teacher'); if (teachers.length > 0) setSelectedId(String(teachers[0].id)); }} className={`flex-1 flex justify-center items-center gap-2 px-6 py-3.5 text-sm font-black rounded-xl transition-all ${viewType === 'teacher' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><User className="w-4 h-4" /> جدول المعلمين</button>
            <button type="button" onClick={() => { setViewType('section'); if (sections.length > 0) setSelectedId(String(sections[0].id)); }} className={`flex-1 flex justify-center items-center gap-2 px-6 py-3.5 text-sm font-black rounded-xl transition-all ${viewType === 'section' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users className="w-4 h-4" /> جدول الفصول</button>
          </div>
          <div className="flex-1 w-full relative group">
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none"><BookOpen className="h-5 w-5 text-slate-500" /></div>
            <select value={selectedId} onChange={(e) => setSelectedId(String(e.target.value))} className="w-full rounded-2xl py-4 pr-12 pl-4 bg-[#090b14]/80 text-white border border-white/10 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-emerald-400 appearance-none [&>option]:bg-[#131836]">
              <option value="">-- اختر --</option>
              {viewType === 'teacher' ? teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>) : sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 shrink-0 bg-[#090b14]/50 px-6 py-4 rounded-2xl border border-white/5">
            <input type="checkbox" id="showAll" checked={showAllSchedules} onChange={(e) => setShowAllSchedules(e.target.checked)} className="w-5 h-5 rounded cursor-pointer accent-emerald-500" />
            <label htmlFor="showAll" className="text-sm font-black cursor-pointer text-slate-300">عرض الكل (المشغول)</label>
          </div>
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090b14]/80 backdrop-blur-md print:hidden" dir="rtl">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#131836] rounded-[2.5rem] p-8 w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 text-white">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-2"><Layers className="w-6 h-6 text-emerald-400" /> {editingId ? 'تعديل الحصة' : 'إضافة حصة'}</h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-300">{viewType === 'teacher' ? 'اختيار الفصل' : 'اختيار المعلم'}</label>
                    {viewType === 'teacher' ? (
                      <select className="w-full p-4 border border-white/10 bg-[#090b14]/80 rounded-2xl focus:ring-2 focus:ring-emerald-400 font-bold outline-none appearance-none [&>option]:bg-[#131836]" value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}>
                        <option value="">-- اختر الفصل --</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
                      </select>
                    ) : (
                      <select className="w-full p-4 border border-white/10 bg-[#090b14]/80 rounded-2xl focus:ring-2 focus:ring-emerald-400 font-bold outline-none appearance-none [&>option]:bg-[#131836]" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}>
                        <option value="">-- اختر المعلم --</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-300">المادة الدراسية</label>
                    <select className="w-full p-4 border border-white/10 bg-[#090b14]/80 rounded-2xl focus:ring-2 focus:ring-emerald-400 font-bold outline-none appearance-none disabled:opacity-50 [&>option]:bg-[#131836]" value={formData.subject_id} disabled={!formData.section_id && !formData.teacher_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
                      <option value="">-- اختر المادة --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8 mt-4 border-t border-white/5">
                  <button className="w-full sm:w-auto px-6 py-4 bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-2xl font-black transition-colors" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>إلغاء الأمر</button>
                  <button className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 hover:opacity-90 rounded-2xl font-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-colors flex-1 flex justify-center items-center gap-2" onClick={handleAddSchedule}><Save className="w-5 h-5" /> {editingId ? 'تحديث الحصة' : 'اعتماد الحصة'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[100]" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] border border-white/10 p-6 sm:p-8 text-center shadow-[0_30px_60px_rgba(0,0,0,0.8)]" dir="rtl">
              <Dialog.Description className="sr-only">تأكيد الحذف</Dialog.Description>
              <div className="mx-auto h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                <Trash2 className="h-8 w-8 drop-shadow-md" />
              </div>
              <Dialog.Title className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-sm">حذف الحصة نهائياً؟</Dialog.Title>
              <p className="text-sm text-slate-400 mb-6 font-bold leading-relaxed">أنت على وشك حذف هذه الحصة من الجدول. هذا الإجراء لا يمكن التراجع عنه.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 border border-rose-500 text-white font-black hover:from-rose-500 hover:to-red-500 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-95 text-sm sm:text-base">نعم، احذف الحصة</button>
                <Dialog.Close asChild>
                  <button className="w-full py-3.5 rounded-xl sm:rounded-2xl bg-[#02040a] border border-white/10 text-slate-300 font-black hover:bg-white/5 hover:text-white shadow-inner transition-all active:scale-95 text-sm sm:text-base">إلغاء</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={`fixed top-6 left-1/2 z-[100] px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 backdrop-blur-xl border ${
                notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-rose-950/90 border-rose-500/50 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
              }`}
            >
              <div className="h-10 w-10 rounded-2xl bg-[#02040a]/40 flex items-center justify-center border border-white/5">
                {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div className="font-bold text-sm sm:text-base text-white">{notification.message}</div>
              <button onClick={() => setNotification(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedId && !showAllSchedules ? (
          <div className="bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] p-16 text-center shadow-2xl border border-white/5 print:hidden"><LayoutGrid className="h-16 w-16 mx-auto text-slate-600 mb-6" /><h3 className="text-2xl font-black text-white">الجدول فارغ</h3><p className="text-slate-400 font-bold mt-2">يرجى تحديد الخيارات لعرض الجدول.</p></div>
        ) : periods.length === 0 ? (
          <div className="bg-[#131836]/40 backdrop-blur-xl rounded-[3rem] p-16 text-center shadow-2xl border border-white/5 print:hidden"><AlertCircle className="h-16 w-16 mx-auto text-rose-500 mb-6" /><h3 className="text-2xl font-black text-white">لا يوجد توقيتات</h3></div>
        ) : (
          <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden print:hidden">
            <div className="overflow-x-auto p-6 sm:p-8">
              <div className="min-w-[800px] grid gap-4" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                <div className="h-16 flex items-center justify-center bg-[#090b14] rounded-2xl shadow-inner border border-white/5"><span className="text-emerald-400 font-black uppercase tracking-widest text-xs">اليوم</span></div>
                {periods.map(p => (
                  <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-[#090b14]/50 rounded-2xl border border-white/5">
                    <span className="font-black text-white text-sm">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-slate-500 font-bold mt-0.5"><Clock className="w-3 h-3 inline pb-0.5" /> {p.start_time.slice(0, 5)}</span>
                  </div>
                ))}
                {loading ? (
                  <div className="col-span-full py-32 text-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" /></div>
                ) : (
                  DAYS.map(day => (
                    <React.Fragment key={day.id}>
                      <div className={`font-black text-sm flex items-center justify-center rounded-2xl shadow-sm border transition-all ${day.id === currentDayOfWeek ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-[#090b14]/80 text-slate-400 border-white/5'}`}>{day.name}</div>
                      {periods.map(p => {
                        const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                        const others = ((isAdmin || isWatcher) && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];
                        const displaySlot = slot || (swappingFrom && others.find(o => String(o.id) === String(swappingFrom.id)) ? swappingFrom : others[0]);

                        return (
                          <div key={`${day.id}-${p.id}`} className={`relative p-4 rounded-2xl min-h-[140px] flex flex-col justify-between transition-all group overflow-hidden ${slot ? 'bg-[#1a2044] border border-white/10 shadow-lg hover:-translate-y-1 hover:border-emerald-400/50' : displaySlot ? 'bg-[#090b14]/60 border border-white/5' : 'bg-[#090b14]/30 border border-dashed border-white/5 hover:bg-white/5'} ${isAdmin && activeSystem === 'manual' ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (activeSystem === 'auto' && isAdmin) return; // 🔒 منع التعديل والنقر في الوضع الآلي
                              if (isAdmin) {
                                if (swappingFrom) { if (String(swappingFrom.id) === String(displaySlot?.id)) setSwappingFrom(null); else handleSwap(day.id, p.period_number, displaySlot);
                                } else if (!displaySlot || others.length > 0) { setFormData({ teacher_id: viewType === 'teacher' ? selectedId : '', section_id: viewType === 'section' ? selectedId : '', subject_id: '' }); setSelectedSlot({day: day.id, period: p.period_number}); setIsModalOpen(true); }
                              } else if (slot?.teachers?.zoom_link) { window.open(normalizeUrl(slot.teachers.zoom_link), '_blank'); }
                            }}>
                            {displaySlot ? (
                              <div className="w-full relative z-10">
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/20 rounded-full opacity-50 pointer-events-none group-hover:scale-150 transition-transform duration-500 blur-xl"></div>
                                <h4 className="font-black text-sm mb-1 text-white leading-tight">{displaySlot.subjects?.name}</h4>
                                <div className="text-[10px] font-bold px-2 py-1.5 bg-[#090b14]/80 text-slate-300 rounded-lg whitespace-normal break-words leading-tight border border-white/5">{getSlotSubtitle(displaySlot, viewType)}</div>
                                {displaySlot.teachers?.zoom_link && (
                                  <a href={normalizeUrl(displaySlot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-1.5 bg-emerald-500/20 text-emerald-400 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-500 hover:text-slate-900 transition-colors border border-emerald-500/30" onClick={(e) => e.stopPropagation()}><Video className="w-3.5 h-3.5" /> البث</a>
                                )}
                                {/* 🚀 أزرار التعديل تظهر فقط إذا كان النظام يدوي */}
                                {isAdmin && slot && activeSystem === 'manual' && (
                                  <div className="absolute inset-0 bg-[#090b14]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity border border-white/10">
                                    <div className="flex gap-1.5"><button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 transition-colors" onClick={(e) => { e.stopPropagation(); setCopiedLesson(displaySlot); }}>نسخ</button><button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors" onClick={(e) => { e.stopPropagation(); setSwappingFrom(displaySlot); }}>نقل</button></div>
                                    <div className="flex gap-1.5"><button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setEditingId(String(displaySlot.id)); setFormData({ teacher_id: displaySlot.teacher_id || '', section_id: displaySlot.section_id || '', subject_id: displaySlot.subject_id || '' }); setSelectedSlot({day: day.id, period: p.period_number}); setIsModalOpen(true); }}>تعديل</button><button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(String(displaySlot.id)); }}>حذف</button></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                                {isAdmin && activeSystem === 'manual' ? (
                                  <Plus className="w-6 h-6 opacity-30 group-hover:opacity-100 group-hover:text-emerald-400 transition-colors" />
                                ) : (
                                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-30">فراغ</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* منطقة الطباعة الخفية (محرك الـ PDF) */}
      <div className="fixed top-[20000px] left-[20000px] opacity-0 pointer-events-none select-none overflow-hidden print-overflow-visible" aria-hidden="true">
        {isGeneratingPDF && (() => {
          let entitiesToPrint: any[] = [];
          const pMode = printMode;
          const pFilter = printFilterVal;

          let printType: 'teacher' | 'section' = 'section';

          if (pMode === 'all-teachers') {
            entitiesToPrint = teachers.filter(t => scheduleData.some(s => String(s.teacher_id) === String(t.id)));
            printType = 'teacher';
          } else if (pMode === 'specific-dept') {
            entitiesToPrint = teachers.filter(t => getTeacherDept(t.id) === pFilter && scheduleData.some(s => String(s.teacher_id) === String(t.id)));
            printType = 'teacher';
          } else if (pMode === 'all-sections') {
            entitiesToPrint = sections.filter(sec => scheduleData.some(s => String(s.section_id) === String(sec.id))).sort((a,b) => a.name.localeCompare(b.name));
            printType = 'section';
          } else if (pMode === 'specific-class') {
            entitiesToPrint = sections.filter(sec => formatClassName(Array.isArray(sec.classes) ? sec.classes[0]?.name : sec.classes?.name) === pFilter && scheduleData.some(s => String(s.section_id) === String(sec.id))).sort((a,b) => a.name.localeCompare(b.name));
            printType = 'section';
          } else {
            const singleEntity = viewType === 'teacher' ? teachers.find(t => String(t.id) === String(selectedId)) : sections.find(s => String(s.id) === String(selectedId));
            if(singleEntity) entitiesToPrint = [singleEntity];
            printType = viewType;
          }

          return entitiesToPrint.map((entity) => {
            const entityId = entity.id;
            const entitySchedule = getEntitySchedule(String(entityId), printType);
            const entityName = getEntityTitle(entity, printType);

            return (
              <div key={`pdf-${entityId}`} className="pdf-page-container" dir="rtl" style={{ width: '1122px', height: '793px', padding: '40px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: '"Cairo", sans-serif', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 8px 0', color: '#0f172a' }}>الجدول الدراسي الأسبوعي</h1>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e293b', margin: 0 }}>{printType === 'teacher' ? `المعلم: ${entityName}` : `الفصل: ${entityName}`}</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 900, fontSize: '14px', marginBottom: '8px' }}>العام الدراسي الحالي</div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: 0 }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #cbd5e1', borderRadius: '12px', flex: 1, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '120px', border: '1px solid #cbd5e1', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '16px 8px', fontSize: '16px', fontWeight: 900 }}>اليوم / الحصة</th>
                      {periods.map(p => (
                        <th key={p.id} style={{ border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e1b4b', textAlign: 'center', padding: '12px 4px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 900, margin: '0 0 4px 0' }}>الحصة {p.period_number}</div>
                          <div style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#ffffff', color: '#10b981', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', display: 'inline-block' }}>{p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, index) => (
                      <tr key={day.id}>
                        <td style={{ border: '1px solid #cbd5e1', backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', color: '#0f172a', textAlign: 'center', fontWeight: 900, fontSize: '18px' }}>{day.name}</td>
                        {periods.map((p) => {
                          const slot = entitySchedule.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number));
                          return (
                            <td key={p.id} style={{ border: '1px solid #cbd5e1', backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {slot ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e1b4b', marginBottom: '6px', wordWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>{slot.subjects?.name}</div>
                                  <div style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', width: '100%', wordWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.2', boxSizing: 'border-box' }}>{getSlotSubtitle(slot, printType)}</div>
                                  {slot.teachers?.zoom_link && (<a href={normalizeUrl(slot.teachers.zoom_link)} className="zoom-link" style={{ display: 'inline-block', backgroundColor: '#10b981', color: '#ffffff', fontSize: '10px', fontWeight: 900, textDecoration: 'none', padding: '6px 0', borderRadius: '6px', marginTop: '6px', width: '90%' }}>رابط البث</a>)}
                                </div>
                              ) : (<span style={{ fontSize: '20px', fontWeight: 900, color: '#cbd5e1' }}>-</span>)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #cbd5e1', paddingTop: '16px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '40px', height: '40px', backgroundColor: '#1e293b', color: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>R</div><div><p style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', lineHeight: '1' }}>مدرسة الرفعة النموذجية</p><p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', margin: 0 }}>نظام الإدارة الأكاديمية الشامل</p></div></div>
                  <div><p style={{ fontSize: '12px', fontWeight: 900, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', margin: 0 }}>وثيقة إلكترونية معتمدة</p></div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
