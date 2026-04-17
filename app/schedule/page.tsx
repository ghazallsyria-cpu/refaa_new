/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, Sparkles, Bug, LayoutGrid, Save, Loader2, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { motion, AnimatePresence } from 'framer-motion';

// استيراد المكتبات القوية لتوليد الـ PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

// ==========================================
// 🛠️ دوال مساعدة لتنسيق النصوص والروابط
// ==========================================
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
  const { user, authRole, isChecking } = useAuth();
  const [viewType, setViewType] = useState<'teacher' | 'section'>('teacher');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: number, period: number} | null>(null);
  const [formData, setFormData] = useState({ teacher_id: '', section_id: '', subject_id: '' });
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 🖨️ حالات محرك الـ PDF
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'all-sections'>('single');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  const { 
    fetchInitialScheduleData, 
    fetchStudentSection, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkConflicts,
    swapSchedules
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;
    try {
      let currentUserRole = authRole;
      if (user) {
        setIsAdmin(currentUserRole === 'admin' || currentUserRole === 'management');
      }

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setPeriods(data.periods || []);

      if (currentUserRole === 'teacher' && user) {
        setSelectedId(user.id);
        setViewType('teacher');
        setShowAllSchedules(false);
      } else if (currentUserRole === 'student' && user) {
        const sectionId = await fetchStudentSection(user.id);
        if (sectionId) {
          setSelectedId(sectionId);
          setViewType('section');
          setShowAllSchedules(false);
        }
      } else if (data.teachers?.[0]) {
        setSelectedId(data.teachers[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [fetchInitialScheduleData, fetchStudentSection, user, authRole, isChecking]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin) return;

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
      setSwappingFrom(null);
      await fetchSchedule();
      alert('تم التبديل بنجاح!');
    } catch (err: any) {
      alert(`حدث خطأ: ${err.message}`);
      fetchSchedule();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول المطلوبة.');
      return;
    }
    const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

    try {
      try {
        const conflicts = await checkConflicts(Number(selectedSlot.day), Number(selectedSlot.period), String(formData.teacher_id), String(formData.section_id), editingId ? String(editingId) : undefined);
        if (conflicts && conflicts.length > 0) {
          alert(`يوجد تضارب مع حصة أخرى في نفس الوقت.`);
          return;
        }
      } catch (e) { console.warn("تجاوز المحرك", e); }

      const payload: any = {
        teacher_id: String(formData.teacher_id),
        section_id: String(formData.section_id),
        subject_id: String(formData.subject_id),
      };

      if (editingId) {
        await updateSchedule(String(editingId), payload);
      } else {
        payload.day_of_week = Number(selectedSlot.day);
        payload.period = Number(selectedSlot.period);
        await addSchedule(payload);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      await fetchSchedule(); 
      alert('تم الحفظ بنجاح!');
    } catch (err: any) {
      alert(`خطأ أثناء الحفظ: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      await deleteSchedule(String(id));
      await fetchSchedule();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    }
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let filters: any = {};
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') filters.teacherId = selectedId;
        else filters.sectionId = selectedId;
      }
      const data = await fetchSchedulesData(filters);
      setScheduleData(data || []);
    } catch (err: any) {
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, isAdmin, showAllSchedules, fetchSchedulesData]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  const getEntitySchedule = (entityId: string, entityType: 'teacher' | 'section') => {
    return scheduleData.filter(s => 
      entityType === 'teacher' ? String(s.teacher_id) === String(entityId) : String(s.section_id) === String(entityId)
    );
  };

  // ==========================================
  // 🚀 محرك PDF الهجين (The Hybrid PDF Engine)
  // ==========================================
  const executePDF = async (mode: 'single' | 'all-teachers' | 'all-sections') => {
    try {
      setIsGeneratingPDF(true);
      setPrintMode(mode);

      // التأكد من جلب جميع البيانات صراحة إذا كان الطلب جماعيًا
      if (mode !== 'single') {
        setShowAllSchedules(true);
        const allData = await fetchSchedulesData({});
        setScheduleData(allData || []);
      }

      // الانتظار ليتم بناء العناصر في الـ DOM المخفي
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const containers = document.querySelectorAll('.pdf-page-container');
      if (!containers || containers.length === 0) {
        throw new Error('لم يتم العثور على جداول صالحة للطباعة (ربما تكون فارغة).');
      }

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      for (let i = 0; i < containers.length; i++) {
        if (i > 0) pdf.addPage();
        
        const el = containers[i] as HTMLElement;
        
        // التقاط العنصر كصورة
        const canvas = await html2canvas(el, { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // 🔗 حقن الروابط القابلة للنقر
        const links = el.querySelectorAll('a.zoom-link');
        const elementRect = el.getBoundingClientRect();
        
        links.forEach((link: any) => {
          const rect = link.getBoundingClientRect();
          const relativeX = (rect.left - elementRect.left) / elementRect.width;
          const relativeY = (rect.top - elementRect.top) / elementRect.height;
          const relativeW = rect.width / elementRect.width;
          const relativeH = rect.height / elementRect.height;
          
          const pdfX = relativeX * pdfWidth;
          const pdfY = relativeY * pdfHeight;
          const pdfW = relativeW * pdfWidth;
          const pdfH = relativeH * pdfHeight;
          
          const finalUrl = normalizeUrl(link.href);
          if (finalUrl) {
            pdf.link(pdfX, pdfY, pdfW, pdfH, { url: finalUrl });
          }
        });
      }
      
      const fileName = mode === 'single' ? `الجدول_الدراسي.pdf` : `جميع_الجداول_${mode}.pdf`;
      pdf.save(fileName);

    } catch (error: any) {
      console.error('PDF Build Error:', error);
      alert(error.message || 'حدث خطأ أثناء بناء وتصدير ملف الـ PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ==========================================
  // 👨‍🎓 شاشة الطالب
  // ==========================================
  if (authRole === 'student') {
    const studentSection = sections.find(s => String(s.id) === String(selectedId));
    const sectionTitle = getEntityTitle(studentSection, 'section');

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl shadow-indigo-200/50">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-sm mx-auto md:mx-0">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span>الفصل الدراسي الحالي</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-lg">الجدول الأكاديمي</h1>
              <p className="text-indigo-100 text-sm sm:text-lg font-bold opacity-90">
                مرحباً بك يا بطل! هذا هو جدول حصصك لصف <span className="text-white underline decoration-wavy decoration-emerald-400">{sectionTitle}</span>.
              </p>
            </div>
            <div className="h-24 w-24 sm:h-32 sm:w-32 bg-white/10 backdrop-blur-xl rounded-full border-4 border-white/20 flex items-center justify-center shadow-2xl shrink-0">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-white drop-shadow-md" />
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        </motion.div>

        {loading || periods.length === 0 ? (
          <div className="flex h-64 items-center justify-center bg-white/50 backdrop-blur-md rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-14 w-14 animate-spin text-indigo-600" />
              <p className="text-slate-500 font-bold animate-pulse tracking-widest text-lg">جاري سحب الجدول الأسطوري...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide snap-x">
                {DAYS.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDayTab(day.id)}
                    className={`snap-center shrink-0 px-6 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                      activeDayTab === day.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {activeDayTab === day.id && <Calendar className="w-4 h-4" />}
                    {day.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4 mt-2">
                <AnimatePresence mode="wait">
                  <motion.div key={activeDayTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    {periods.map(p => {
                      const slot = scheduleData.find(s => String(s.day_of_week) === String(activeDayTab) && String(s.period) === String(p.period_number));
                      if (!slot) return null;

                      return (
                        <div key={p.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-all">
                          <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-violet-500"></div>
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 mb-2">
                                <Clock className="w-3 h-3" /> الحصة {p.period_number}
                              </span>
                              <h3 className="text-xl font-black text-slate-900">{slot.subjects?.name}</h3>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                              {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100/80">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <User className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold text-slate-700">{slot.teachers?.users?.full_name}</span>
                            </div>

                            {slot.teachers?.zoom_link && (
                              <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-200">
                                <Video className="w-4 h-4 animate-pulse" /> دخول البث
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {periods.every(p => !scheduleData.find(s => String(s.day_of_week) === String(activeDayTab) && String(s.period) === String(p.period_number))) && (
                      <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300">
                         <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                         <p className="font-bold text-slate-500 text-lg">يوم إجازة أو لا توجد حصص مجدولة!</p>
                         <p className="text-sm text-slate-400 font-medium mt-1">استمتع بوقتك 🎮</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden">
              <div className="grid gap-4" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl shadow-inner">
                  <span className="text-xs font-black text-white uppercase tracking-widest">اليوم</span>
                </div>
                {periods.map(p => (
                  <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <span className="text-sm font-black text-indigo-900">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {p.start_time.slice(0, 5)}
                    </span>
                  </div>
                ))}

                {DAYS.map((day, idx) => (
                  <React.Fragment key={day.id}>
                    <div className={`font-black text-sm flex items-center justify-center rounded-2xl shadow-sm border ${day.id === currentDayOfWeek ? 'bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-100' : 'bg-white text-slate-700 border-slate-200'}`}>
                      {day.name}
                    </div>
                    
                    {periods.map((p, pIdx) => {
                      const period = p.period_number;
                      const slot = scheduleData.find(s => 
                        String(s.day_of_week) === String(day.id) && 
                        String(s.period) === String(period) && 
                        (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))
                      );
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (idx * 0.1) + (pIdx * 0.05) }} key={`${day.id}-${p.id}`} 
                          className={`relative p-4 rounded-2xl min-h-[140px] flex flex-col justify-between transition-all group overflow-hidden ${
                            slot ? 'bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300' : 'bg-slate-50/50 border border-dashed border-slate-200 opacity-60'
                          }`}
                        >
                          {slot ? (
                            <>
                              <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br from-indigo-100 to-transparent rounded-full opacity-50 pointer-events-none group-hover:scale-150 transition-transform duration-500"></div>
                              <div>
                                <h4 className="font-black text-slate-900 text-base leading-tight mb-1">{slot.subjects?.name}</h4>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-2">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate">{slot.teachers?.users?.full_name}</span>
                                </div>
                              </div>
                              {slot.teachers?.zoom_link && (
                                <a href={normalizeUrl(slot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200 relative z-10">
                                  <Video className="w-3.5 h-3.5" /> دخول البث
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                              <BookOpen className="w-6 h-6 opacity-20" />
                              <span className="text-[10px] font-bold tracking-widest uppercase">فراغ</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  // ==========================================
  // 🚀 ADMIN / TEACHER VIEW 
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" dir="rtl">
      
      {/* ⏳ شاشة التحميل للـ PDF */}
      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md text-white">
            <Loader2 className="w-20 h-20 animate-spin text-indigo-400 mb-6" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثيقة الـ PDF...</h2>
            <p className="text-slate-300 font-bold mt-2 text-lg">النظام يقوم برسم الجداول وحقن الروابط الذكية.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-amber-50 p-4 rounded-2xl text-sm text-amber-800 font-bold border border-amber-200 flex items-center gap-3">
          <Bug className="w-5 h-5 shrink-0" />
          <div><p>وضع الإدارة مفعل. يمكنك تعديل ونسخ وتبديل الحصص بالسحب والنقر بحرية تامة.</p></div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-600 mb-2">
            <LayoutGrid className="w-3.5 h-3.5" /> <span>إدارة الهيكل الزمني</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">{authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الشامل'}</h1>
        </div>
        
        {/* أزرار تحميل الـ PDF */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button onClick={() => executePDF('single')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all active:scale-95">
            <FileDown className="h-4 w-4" /> تحميل الجدول الحالي (PDF)
          </button>
          {isAdmin && (
            <>
              <button onClick={() => executePDF('all-sections')} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 px-5 py-3 text-sm font-black hover:bg-indigo-100 transition-all active:scale-95 border border-indigo-200">
                <FileDown className="h-4 w-4" /> فصول (PDF)
              </button>
              <button onClick={() => executePDF('all-teachers')} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-5 py-3 text-sm font-black hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-200">
                <FileDown className="h-4 w-4" /> معلمين (PDF)
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && authRole !== 'teacher' && swappingFrom && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-xl flex justify-between animate-pulse sticky top-4 z-40">
          <div><p className="font-black text-lg">وضع التبديل نشط</p></div>
          <button onClick={() => setSwappingFrom(null)} className="bg-white text-amber-600 px-6 py-2 rounded-xl font-black shadow-sm">إلغاء التبديل</button>
        </div>
      )}

      {isAdmin && authRole !== 'teacher' && copiedLesson && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between sticky top-4 z-40 gap-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Info className="h-6 w-6" /></div>
            <div>
              <p className="font-black text-lg">تم نسخ الحصة</p>
              <p className="text-sm text-emerald-50 font-medium mt-1">الحصة المنسوخة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{copiedLesson.subjects?.name}</span> ({copiedLesson.teachers?.users?.full_name})<br />انقر على أي خانة فارغة للصق.</p>
            </div>
          </div>
          <button onClick={() => setCopiedLesson(null)} className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors w-full sm:w-auto">مسح الحافظة</button>
        </div>
      )}

      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex rounded-xl shadow-sm bg-slate-100 p-1 w-full lg:w-auto shrink-0">
            <button type="button" onClick={() => { setViewType('teacher'); if (teachers.length > 0) setSelectedId(String(teachers[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${viewType === 'teacher' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><User className="w-4 h-4" /> جدول المعلمين</button>
            <button type="button" onClick={() => { setViewType('section'); if (sections.length > 0) setSelectedId(String(sections[0].id)); }} className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${viewType === 'section' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4" /> جدول الفصول</button>
          </div>
          <div className="flex-1 w-full relative">
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none"><BookOpen className="h-5 w-5 text-slate-400" /></div>
            <select value={selectedId} onChange={(e) => setSelectedId(String(e.target.value))} className="w-full rounded-xl py-4 pr-12 pl-4 bg-slate-50 border border-slate-200 font-bold outline-none">
              <option value="">-- اختر --</option>
              {viewType === 'teacher' 
                ? teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>) 
                : sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-5 py-4 rounded-xl border border-slate-200">
            <input type="checkbox" id="showAll" checked={showAllSchedules} onChange={(e) => setShowAllSchedules(e.target.checked)} className="w-5 h-5 rounded cursor-pointer" />
            <label htmlFor="showAll" className="text-sm font-black cursor-pointer">عرض الكل</label>
          </div>
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">{editingId ? 'تعديل الحصة' : 'إضافة حصة'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 bg-slate-50 rounded-xl"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">{viewType === 'teacher' ? 'اختيار الفصل' : 'اختيار المعلم'}</label>
                  {viewType === 'teacher' ? (
                    <select className="w-full p-4 border rounded-xl font-bold" value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}>
                      <option value="">-- اختر الفصل --</option>
                      {sections.map(s => <option key={s.id} value={s.id}>{formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)} - {s.name}</option>)}
                    </select>
                  ) : (
                    <select className="w-full p-4 border rounded-xl font-bold" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}>
                      <option value="">-- اختر المعلم --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">المادة الدراسية</label>
                  <select className="w-full p-4 border rounded-xl font-bold" value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}>
                    <option value="">-- اختر المادة --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t"><button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black" onClick={handleAddSchedule}>اعتماد الحصة</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!selectedId && !showAllSchedules ? (
        <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm"><LayoutGrid className="h-10 w-10 mx-auto text-slate-300 mb-4" /><h3 className="text-2xl font-black">الجدول فارغ</h3></div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-16 text-center shadow-sm"><AlertCircle className="h-10 w-10 mx-auto text-rose-500 mb-4" /><h3 className="text-2xl font-black">لا يوجد توقيتات</h3></div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto p-6 sm:p-8">
            <div className="min-w-[800px] grid gap-3" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
              <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-white font-black">اليوم</span></div>
              {periods.map(p => (
                <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl">
                  <span className="font-black">الحصة {p.period_number}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{p.start_time.slice(0, 5)}</span>
                </div>
              ))}
              {loading ? (
                <div className="col-span-full py-32 text-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" /></div>
              ) : (
                DAYS.map(day => (
                  <React.Fragment key={day.id}>
                    <div className="font-black text-sm flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">{day.name}</div>
                    {periods.map(p => {
                      const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                      const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];
                      const displaySlot = slot || (swappingFrom && others.find(o => String(o.id) === String(swappingFrom.id)) ? swappingFrom : others[0]);

                      return (
                        <div key={`${day.id}-${p.id}`} className={`relative p-4 rounded-2xl min-h-[120px] flex flex-col justify-between transition-all group ${slot ? 'bg-white shadow-md border border-indigo-200' : displaySlot ? 'bg-slate-50 border border-slate-200' : 'bg-slate-50/50 border border-dashed border-slate-200 hover:bg-slate-50'} ${isAdmin ? 'cursor-pointer hover:border-indigo-400' : ''}`}
                          onClick={() => {
                            if (isAdmin) {
                              if (swappingFrom) {
                                if (String(swappingFrom.id) === String(displaySlot?.id)) setSwappingFrom(null);
                                else handleSwap(day.id, p.period_number, displaySlot);
                              } else if (!displaySlot || others.length > 0) {
                                setFormData({ teacher_id: viewType === 'teacher' ? selectedId : '', section_id: viewType === 'section' ? selectedId : '', subject_id: '' });
                                setSelectedSlot({ day: day.id, period: p.period_number });
                                setIsModalOpen(true);
                              }
                            } else if (slot?.teachers?.zoom_link) { window.open(normalizeUrl(slot.teachers.zoom_link), '_blank'); }
                          }}>
                          {displaySlot ? (
                            <div className="w-full">
                              <h4 className="font-black text-sm mb-1">{displaySlot.subjects?.name}</h4>
                              <div className="text-[10px] font-bold px-2 py-1.5 bg-slate-100 rounded-lg whitespace-normal break-words leading-tight">{getSlotSubtitle(displaySlot, viewType)}</div>
                              {displaySlot.teachers?.zoom_link && (
                                <a href={normalizeUrl(displaySlot.teachers.zoom_link)} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
                                  <Video className="w-3.5 h-3.5" /> دخول البث
                                </a>
                              )}
                              {isAdmin && slot && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-xl">
                                  <div className="flex gap-1.5">
                                    <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600" onClick={(e) => { e.stopPropagation(); setCopiedLesson(displaySlot); }}>نسخ</button>
                                    <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600" onClick={(e) => { e.stopPropagation(); setSwappingFrom(displaySlot); }}>نقل</button>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600" onClick={(e) => { e.stopPropagation(); setEditingId(String(displaySlot.id)); setFormData({ teacher_id: displaySlot.teacher_id || '', section_id: displaySlot.section_id || '', subject_id: displaySlot.subject_id || '' }); setSelectedSlot({day: day.id, period: p.period_number}); setIsModalOpen(true); }}>تعديل</button>
                                    <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(String(displaySlot.id)); }}>حذف</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><Plus className="w-6 h-6" /></div>
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

      {/* ======================================================== */}
      {/* 🖨️ منطقة تجهيز الـ PDF المخفية (The Print DOM) */}
      {/* تم استخدام الستايلات المباشرة (HEX) لتجاوز خطأ oklch */}
      {/* ======================================================== */}
      <div className="fixed top-[-20000px] left-[-20000px] opacity-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        {isGeneratingPDF && (() => {
          let entitiesToPrint: any[] = [];
          if (printMode === 'all-teachers') {
            entitiesToPrint = teachers.filter(t => scheduleData.some(s => String(s.teacher_id) === String(t.id)));
          } else if (printMode === 'all-sections') {
            entitiesToPrint = sections.filter(sec => scheduleData.some(s => String(s.section_id) === String(sec.id)));
          } else {
            entitiesToPrint = [{ id: selectedId }];
          }

          return entitiesToPrint.map((entity) => {
            const entityId = entity.id;
            const printType = printMode === 'all-teachers' || (printMode === 'single' && viewType === 'teacher') ? 'teacher' : 'section';
            const entitySchedule = getEntitySchedule(String(entityId), printType);
            
            if (printMode !== 'single' && entitySchedule.length === 0) return null;

            const entityName = getEntityTitle(entity, printType);

            return (
              <div key={`pdf-${entityId}`} className="pdf-page-container w-[1122px] h-[793px] p-10 font-cairo flex flex-col" dir="rtl" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                {/* ترويسة PDF */}
                <div className="flex justify-between items-end border-b-[3px] pb-4 mb-6" style={{ borderColor: '#312e81' }}>
                  <div>
                    <h1 className="text-4xl font-black mb-2" style={{ color: '#1e1b4b' }}>الجدول الدراسي الأسبوعي</h1>
                    <h2 className="text-xl font-black inline-block px-5 py-2 rounded-xl border shadow-sm" style={{ backgroundColor: '#f1f5f9', color: '#1e293b', borderColor: '#cbd5e1' }}>
                      {printType === 'teacher' ? `المعلم: ${entityName}` : `الفصل: ${entityName}`}
                    </h2>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-2 px-5 py-2 rounded-xl font-black shadow-sm" style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                      <Calendar className="w-5 h-5" /> العام الدراسي الحالي
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#475569' }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                {/* جدول PDF */}
                <table className="w-full border-collapse border-2 rounded-xl overflow-hidden flex-1 table-fixed" style={{ borderColor: '#cbd5e1' }}>
                  <thead>
                    <tr>
                      <th className="w-32 border text-center py-4 font-black text-lg" style={{ backgroundColor: '#3730a3', color: '#ffffff', borderColor: '#cbd5e1' }}>اليوم / الحصة</th>
                      {periods.map(p => (
                        <th key={p.id} className="border text-center py-3" style={{ backgroundColor: '#f1f5f9', color: '#1e1b4b', borderColor: '#cbd5e1' }}>
                          <div className="font-black text-base mb-1">الحصة {p.period_number}</div>
                          <div className="text-xs font-bold inline-block px-3 py-1 rounded-md border shadow-sm" style={{ backgroundColor: '#ffffff', color: '#4338ca', borderColor: '#c7d2fe' }}>
                            {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, index) => (
                      <tr key={day.id}>
                        <td className="font-black text-xl text-center border" style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}>
                          {day.name}
                        </td>
                        {periods.map((p) => {
                          const slot = entitySchedule.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(p.period_number));
                          return (
                            <td key={p.id} className="border p-2 align-middle text-center" style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', borderColor: '#cbd5e1' }}>
                              {slot ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 p-2 rounded-lg shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                                  <div className="font-black text-[16px] leading-tight w-full break-words whitespace-normal" style={{ color: '#1e1b4b' }}>{slot.subjects?.name}</div>
                                  <div className="text-[12px] font-bold px-2 py-1.5 rounded-lg w-full border break-words whitespace-normal leading-tight" style={{ backgroundColor: '#f1f5f9', color: '#1e293b', borderColor: '#e2e8f0' }}>
                                    {getSlotSubtitle(slot, printType)}
                                  </div>
                                  {slot.teachers?.zoom_link && (
                                    <a href={normalizeUrl(slot.teachers.zoom_link)} className="zoom-link inline-flex items-center justify-center gap-1.5 text-[11px] font-black px-4 py-2 rounded-lg mt-1 w-[90%] shadow-sm" style={{ backgroundColor: '#2563eb', color: '#ffffff', textDecoration: 'none' }}>
                                      <Video className="w-4 h-4" /> رابط زوم
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="font-bold text-2xl" style={{ color: '#cbd5e1' }}>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* تذييل PDF */}
                <div className="mt-6 pt-4 border-t-[3px] flex justify-between items-center pb-2" style={{ borderColor: '#cbd5e1' }}>
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-md" style={{ backgroundColor: '#312e81', color: '#ffffff' }}>R</div>
                     <div>
                       <p className="text-lg font-black leading-tight" style={{ color: '#0f172a', margin: '0 0 4px 0' }}>مدرسة الرفعة النموذجية</p>
                       <p className="text-xs font-bold" style={{ color: '#64748b', margin: 0 }}>نظام الإدارة الأكاديمية الشامل</p>
                     </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black px-4 py-2 rounded-xl border shadow-sm" style={{ backgroundColor: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe', margin: 0 }}>وثيقة إلكترونية معتمدة</p>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>

    </div>
  );
}
