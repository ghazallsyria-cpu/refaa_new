/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, Sparkles, Bug, LayoutGrid, Save, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

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
  const [assignments, setAssignments] = useState<any[]>([]);
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // 🖨️ حالة الطباعة الذكية
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'all-sections'>('single');

  const currentDayOfWeek = new Date().getDay() + 1;
  const defaultTab = (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) ? currentDayOfWeek : 1;
  const [activeDayTab, setActiveDayTab] = useState<number>(defaultTab);

  const { 
    fetchInitialScheduleData, 
    fetchUserRole, 
    fetchStudentSection, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkConflicts,
    swapSchedules,
    notifyScheduleChange
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;
    try {
      let currentUserRole = authRole;
      if (user) {
        const isSystemAdmin = currentUserRole === 'admin' || currentUserRole === 'management';
        setIsAdmin(isSystemAdmin);
      } else {
        setIsAdmin(false);
      }

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setAssignments(data.assignments || []);
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

  const availableSections = sections;
  const modalAvailableTeachers = teachers;
  const availableSubjects = subjects;

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
        const targetConflicts = conflicts.filter(c => 
          String(c.id) !== String(targetSlot?.id) && 
          (String(c.teacher_id) === String(swappingFrom.teacher_id) || String(c.section_id) === String(swappingFrom.section_id))
        );

        if (targetConflicts.length > 0) {
          alert('تعذر التبديل: يوجد تعارض في الحصة المستهدفة للمعلم أو الفصل');
          setLoading(false);
          return;
        }

        if (targetSlot) {
          const sourceConflicts = await checkConflicts(sourceDay, sourcePeriod, String(targetSlot.teacher_id), String(targetSlot.section_id), String(targetSlot.id));
          const filteredSourceConflicts = sourceConflicts.filter(c => 
            String(c.id) !== String(swappingFrom.id) && 
            (String(c.teacher_id) === String(targetSlot.teacher_id) || String(c.section_id) === String(targetSlot.section_id))
          );

          if (filteredSourceConflicts.length > 0) {
            alert('تعذر التبديل: يوجد تعارض في الحصة الأصلية للمعلم أو الفصل المنقول');
            setLoading(false);
            return;
          }
        }
      } catch (conflictError) {
        console.warn("⚠️ تم تجاوز فحص التعارض للتبديل بسبب خطأ في المحرك", conflictError);
      }

      await swapSchedules(String(swappingFrom.id), sourceDay, sourcePeriod, targetSlot ? String(targetSlot.id) : null, tDay, tPeriod);
      
      setSwappingFrom(null);
      setIsSwapping(false);
      await fetchSchedule();
      alert('تم تبديل الحصص بنجاح! ✅');
    } catch (err: any) {
      console.error('Error swapping lessons:', err);
      alert(`حدث خطأ أثناء التبديل: ${err.message || 'مشكلة غير معروفة'}`);
      fetchSchedule();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول المطلوبة (المعلم، الفصل، المادة). ⚠️');
      return;
    }
    
    const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

    try {
      try {
        const conflicts = await checkConflicts(
          Number(selectedSlot.day), 
          Number(selectedSlot.period), 
          String(formData.teacher_id), 
          String(formData.section_id), 
          editingId ? String(editingId) : undefined
        );

        if (conflicts && conflicts.length > 0) {
          const tConflict = conflicts.find((c:any) => String(c.teacher_id) === String(formData.teacher_id));
          if (tConflict) {
            const section = safeObj(tConflict.sections);
            const subject = safeObj(tConflict.subjects);
            const className = safeObj(section?.classes)?.name;
            alert(`تضارب ❌: المعلم لديه حصة (${subject?.name || ''}) مع فصل (${className || ''} - ${section?.name || ''}) في هذا الوقت.`);
            return;
          }
          
          const sConflict = conflicts.find((c:any) => String(c.section_id) === String(formData.section_id));
          if (sConflict) {
            const teacher = safeObj(sConflict.teachers);
            const subject = safeObj(sConflict.subjects);
            const teacherName = safeObj(teacher?.users)?.full_name;
            alert(`تضارب ❌: هذا الفصل لديه حصة (${subject?.name || ''}) مع المعلم (${teacherName || ''}) في هذا الوقت.`);
            return;
          }
        }
      } catch (conflictError) {
        console.warn("⚠️ تم تجاوز محرك التعارض لتسهيل حفظ الحصة", conflictError);
      }

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
      alert(editingId ? 'تم تحديث الحصة بنجاح! ✅' : 'تم إضافة الحصة بنجاح! ✅');
    } catch (err: any) {
      console.error("Critical Save Error:", err);
      alert(`حدث خطأ أثناء الحفظ ❌:\n${err.message || 'يرجى التحقق من اتصال قاعدة البيانات.'}`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة نهائياً؟')) return;
    try {
      await deleteSchedule(String(id));
      await fetchSchedule();
    } catch (err: any) {
      console.error(err);
      alert(`حدث خطأ أثناء الحذف: ${err.message || ''}`);
    }
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let filters: any = {};
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') {
          filters.teacherId = selectedId;
        } else {
          filters.sectionId = selectedId;
        }
      }

      const data = await fetchSchedulesData(filters);
      setScheduleData(data || []);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, isAdmin, showAllSchedules, fetchSchedulesData]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  // 🖨️ دوال الطباعة الفاخرة
  const handlePrintSingle = () => {
    setPrintMode('single');
    setTimeout(() => window.print(), 200);
  };

  const handlePrintAll = (mode: 'all-teachers' | 'all-sections') => {
    setShowAllSchedules(true); // إجبار تحميل كل البيانات
    setPrintMode(mode);
    // ننتظر قليلاً لكي يتم جلب البيانات ورسم الـ DOM
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  // ==========================================
  // 👨‍🎓 شاشة الطالب
  // ==========================================
  if (authRole === 'student') {
    const currentSectionName = sections.find(s => String(s.id) === String(selectedId))?.name || '';
    const currentClassName = sections.find(s => String(s.id) === String(selectedId))?.classes?.name || '';

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
                مرحباً بك يا بطل! هذا هو جدول حصصك لصف <span className="text-white underline decoration-wavy decoration-emerald-400">{currentClassName} - شعبة {currentSectionName}</span>.
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
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
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
                              <a href={slot.teachers.zoom_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-200">
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
                      const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                      
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
                                <a href={slot.teachers.zoom_link} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200 relative z-10">
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
  // 🚀 ADMIN / TEACHER VIEW (شاشة المعلم والمدير)
  // ==========================================
  
  // دالة صغيرة لترتيب الأيام للطباعة
  const getEntitySchedule = (entityId: string, entityType: 'teacher' | 'section') => {
    return scheduleData.filter(s => 
      entityType === 'teacher' ? String(s.teacher_id) === String(entityId) : String(s.section_id) === String(entityId)
    );
  };

  const entitiesToPrint = printMode === 'all-teachers' ? teachers : printMode === 'all-sections' ? sections : [{ id: selectedId }];

  return (
    <div dir="rtl">
      {/* 🖨️ ستايلات الطباعة الجذرية - تحويل الصفحة لوثيقة PDF فاخرة */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 15mm; }
          html, body, main, #__next {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background-color: white !important;
            color: black !important;
            font-family: 'Cairo', sans-serif !important;
          }
          
          /* إخفاء الواجهة العادية بالكامل */
          .web-content { display: none !important; }
          
          /* عرض قسم الطباعة */
          #print-area { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          
          /* فواصل الصفحات لطباعة المتعدد */
          .page-break { page-break-after: always !important; break-after: page !important; }
          .page-break:last-child { page-break-after: auto !important; break-after: auto !important; }
          
          /* الألوان والخطوط الإجبارية */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          /* تصميم الجدول المعماري الفخم */
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
          .print-table th, .print-table td { border: 1px solid #cbd5e1 !important; padding: 8px !important; text-align: center !important; vertical-align: middle !important; word-wrap: break-word !important; }
          .print-table th { background-color: #f8fafc !important; color: #1e1b4b !important; font-weight: 900 !important; font-size: 14px !important; }
          .print-table td { height: 110px !important; } /* ارتفاع مناسب لمنع قص النص */
          
          /* إصلاح الروابط داخل الـ PDF */
          a[href] { text-decoration: none !important; cursor: pointer !important; }
        }
      `}</style>
      
      {/* 🖥️ واجهة الموقع العادية (تختفي عند الطباعة) */}
      <div className="web-content space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {isAdmin && authRole !== 'teacher' && (
          <div className="bg-amber-50 p-4 rounded-2xl text-sm text-amber-800 font-bold border border-amber-200 flex items-center gap-3">
            <Bug className="w-5 h-5 shrink-0" />
            <div>
              <p>وضع الإدارة مفعل. يمكنك تعديل ونسخ وتبديل الحصص بالسحب والنقر بحرية تامة.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>إدارة الهيكل الزمني</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي الشامل'}
            </h1>
          </div>
          
          {/* أزرار الطباعة الفاخرة */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handlePrintSingle} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95">
              <Printer className="h-4 w-4" /> طباعة الجدول الحالي
            </button>
            {isAdmin && (
              <>
                <button onClick={() => handlePrintAll('all-sections')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 px-6 py-3 text-sm font-black hover:bg-indigo-100 transition-all active:scale-95">
                  <FileDown className="h-4 w-4" /> طباعة جميع الفصول
                </button>
                <button onClick={() => handlePrintAll('all-teachers')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 text-sm font-black hover:bg-emerald-100 transition-all active:scale-95">
                  <FileDown className="h-4 w-4" /> طباعة جميع المعلمين
                </button>
              </>
            )}
          </div>
        </div>

        {/* ... (باقي أكواد واجهة الإدارة والتبديل والإضافة كما هي تماماً في الكود السابق) ... */}
        {isAdmin && authRole !== 'teacher' && swappingFrom && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between animate-pulse sticky top-4 z-40 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"><Users className="h-6 w-6" /></div>
              <div>
                <p className="font-black text-lg">وضع التبديل نشط</p>
                <p className="text-sm text-amber-50 font-medium mt-1">أنت تقوم بنقل حصة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{swappingFrom.subjects?.name}</span> ({swappingFrom.teachers?.users?.full_name})<br />انقر على أي خانة أخرى لإتمام التبديل.</p>
              </div>
            </div>
            <button onClick={() => setSwappingFrom(null)} className="bg-white text-amber-600 hover:bg-amber-50 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors w-full sm:w-auto">إلغاء التبديل</button>
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
              <select value={selectedId} onChange={(e) => setSelectedId(String(e.target.value))} className="block w-full rounded-xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold outline-none">
                <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
                {viewType === 'teacher' ? teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name || 'معلم غير معروف'}</option>) : sections.map(s => { const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes; return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option> })}
              </select>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-5 py-3.5 rounded-xl border border-slate-200 w-full lg:w-auto">
              <input type="checkbox" id="showAll" checked={showAllSchedules} onChange={(e) => setShowAllSchedules(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer" />
              <label htmlFor="showAll" className="text-sm font-black text-slate-700 cursor-pointer select-none">عرض كامل اللوحة (الكل)</label>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-5 h-5"/></div>{editingId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
                  <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-5">
                  {viewType === 'teacher' ? (
                    <div><label className="block text-sm font-bold text-slate-700 mb-2">المعلم المحدد</label><div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold flex items-center gap-2"><User className="w-4 h-4 text-slate-400" />{teachers.find(t => String(t.id) === String(selectedId))?.users?.full_name}</div></div>
                  ) : (
                    <div><label className="block text-sm font-bold text-slate-700 mb-2">الفصل المحدد</label><div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />{sections.find(s => String(s.id) === String(selectedId))?.classes?.name} - {sections.find(s => String(s.id) === String(selectedId))?.name}</div></div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{viewType === 'teacher' ? 'إسناد لفصل' : 'اختيار المعلم'}</label>
                    {viewType === 'teacher' ? (
                      <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" value={formData.section_id} onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}><option value="">-- اختر الفصل --</option>{availableSections.map(s => { const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes; return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option> })}</select>
                    ) : (
                      <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}><option value="">-- اختر المعلم --</option>{modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}</select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">المادة الدراسية</label>
                    <select className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none disabled:opacity-50" value={formData.subject_id} disabled={!formData.section_id || !formData.teacher_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}><option value="">-- اختر المادة --</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    {(!formData.section_id || !formData.teacher_id) && <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1"><Info className="w-3 h-3"/> يرجى اختيار {viewType === 'teacher' ? 'الفصل' : 'المعلم'} أولاً لفتح المواد</p>}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8">
                  <button className="w-full sm:w-auto px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-black transition-colors" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>إلغاء الأمر</button>
                  <button className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-colors flex-1 flex justify-center items-center gap-2" onClick={handleAddSchedule}><Save className="w-5 h-5" /> {editingId ? 'تحديث الحصة' : 'اعتماد الحصة'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!selectedId && !showAllSchedules ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-16 text-center">
            <div className="mx-auto h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100"><LayoutGrid className="h-10 w-10 text-slate-300" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">لوحة الجدول فارغة</h3>
            <p className="text-slate-500 font-bold">الرجاء اختيار معلم أو فصل من القائمة العلوية.</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-rose-100 p-16 text-center">
            <div className="mx-auto h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 animate-pulse"><AlertCircle className="h-10 w-10 text-rose-500" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">النظام الزمني غير معد</h3>
            <p className="text-slate-500 font-bold mb-8 max-w-md mx-auto">لا يمكن عرض أي جدول دراسي لعدم وجود أوقات حصص.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto p-6 sm:p-8">
              <div className="min-w-[800px]">
                <div className="grid gap-3" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                  <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl shadow-inner">
                    <span className="text-xs font-black text-white uppercase tracking-widest">اليوم</span>
                  </div>
                  {periods.map(p => (
                    <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
                      <span className="text-sm font-black text-slate-900">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {p.start_time.slice(0, 5)}</span>
                    </div>
                  ))}

                  {loading ? (
                    <div className="col-span-full py-32 text-center flex flex-col items-center justify-center">
                      <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="font-bold text-slate-400">جاري تحميل الجدول...</p>
                    </div>
                  ) : (
                    DAYS.map((day) => (
                      <React.Fragment key={day.id}>
                        <div className="font-black text-sm flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                          {day.name}
                        </div>
                        {periods.map((p, pIdx) => {
                          const period = p.period_number;
                          const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                          const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];

                          const isSwappingFromThisSlot = swappingFrom && others.find(o => String(o.id) === String(swappingFrom.id));
                          const isCopiedFromThisSlot = copiedLesson && others.find(o => String(o.id) === String(copiedLesson.id));
                          const displaySlot = slot || (isSwappingFromThisSlot ? swappingFrom : (isCopiedFromThisSlot ? copiedLesson : others[0]));

                          return (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (day.id * 0.1) + (pIdx * 0.05) }} key={`${day.id}-${p.id}`} 
                              className={`relative p-4 rounded-2xl min-h-[120px] flex flex-col justify-between transition-all group overflow-hidden
                                ${slot ? 'bg-white border-2 border-indigo-500 shadow-md shadow-indigo-100 z-10' : displaySlot ? 'bg-slate-50 border border-slate-200 text-slate-400' : 'bg-slate-50/30 border border-dashed border-slate-200 text-slate-300 hover:bg-slate-50'}
                                ${isAdmin ? 'cursor-pointer hover:border-indigo-400 hover:shadow-lg' : ''} 
                                ${String(swappingFrom?.id) === String(displaySlot?.id) && displaySlot ? 'ring-4 ring-amber-400 bg-amber-50 z-20 scale-105 shadow-xl border-transparent' : ''} 
                                ${String(copiedLesson?.id) === String(displaySlot?.id) && displaySlot ? 'ring-4 ring-emerald-400 bg-emerald-50 z-20 border-transparent' : ''}`}
                              onClick={() => {
                                if (isAdmin) {
                                  if (swappingFrom) {
                                    if (String(swappingFrom.id) === String(displaySlot?.id)) setSwappingFrom(null);
                                    else handleSwap(day.id, period, displaySlot);
                                  } else if (!displaySlot || others.length > 0) {
                                    setFormData({ teacher_id: viewType === 'teacher' ? selectedId : (copiedLesson?.teacher_id || ''), section_id: viewType === 'section' ? selectedId : (copiedLesson?.section_id || ''), subject_id: copiedLesson?.subject_id || '' });
                                    setSelectedSlot({day: day.id, period: period});
                                    setIsModalOpen(true);
                                  }
                                } else if (slot?.teachers?.zoom_link) { window.open(slot.teachers.zoom_link, '_blank'); }
                              }}
                            >
                              {displaySlot ? (
                                <div className="w-full relative z-10">
                                  <span className={`font-black text-sm block mb-1.5 leading-tight ${slot ? 'text-slate-900' : 'text-slate-500'}`}>{displaySlot.subjects?.name}</span>
                                  <div className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-100 inline-block truncate max-w-full ${slot ? 'text-indigo-700 bg-indigo-50 border border-indigo-100' : 'text-slate-400'}`}>
                                    {viewType === 'teacher' ? `${Array.isArray(displaySlot.sections?.classes) ? displaySlot.sections?.classes[0]?.name : displaySlot.sections?.classes?.name} - ${displaySlot.sections?.name}` : displaySlot.teachers?.users?.full_name}
                                  </div>
                                  
                                  {isAdmin && slot && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                      <div className="flex items-center gap-1.5">
                                        <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); setCopiedLesson(displaySlot); }}>نسخ</button>
                                        <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-100 transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); setSwappingFrom(displaySlot); }}>نقل</button>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); setEditingId(String(displaySlot.id)); setFormData({ teacher_id: displaySlot.teacher_id || '', section_id: displaySlot.section_id || '', subject_id: displaySlot.subject_id || '' }); setSelectedSlot({day: day.id, period: period}); setIsModalOpen(true); }}>تعديل</button>
                                        <button className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors shadow-sm" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(String(displaySlot.id)); }}>حذف</button>
                                      </div>
                                    </div>
                                  )}
                                  {!slot && others.length > 1 && <span className="text-[9px] font-bold text-slate-400 block mt-2 bg-slate-100 rounded-full px-2 py-0.5 inline-block">+{others.length - 1} تعارضات</span>}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2"><Plus className="w-6 h-6 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-sm" /><span className="text-slate-300 text-[10px] font-bold tracking-widest uppercase group-hover:opacity-0 transition-opacity">فراغ</span></div>
                              )}
                            </motion.div>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🖨️ قسم الطباعة الفاخر (يظهر فقط في الـ PDF) */}
      {/* ======================================================== */}
      <div id="print-area" className="hidden print:block font-cairo bg-white w-full">
        {(!selectedId && !showAllSchedules) || periods.length === 0 ? null : (
          entitiesToPrint.map((entity, pageIndex) => {
            const entityId = entity.id;
            const printType = printMode === 'all-teachers' || viewType === 'teacher' ? 'teacher' : 'section';
            const entitySchedule = getEntitySchedule(String(entityId), printType);
            
            // جلب الاسم بدقة (سواء كان معلماً أو فصلاً)
            let entityName = '';
            if (printType === 'teacher') {
              entityName = entity.users?.full_name || 'معلم غير محدد';
            } else {
              const className = Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name;
              entityName = `${className || ''} - ${entity.name}`;
            }

            return (
              <div key={`print-page-${entityId}`} className="page-break w-full p-4 mb-8">
                
                {/* Header الفخم */}
                <div className="flex justify-between items-end border-b-[3px] border-indigo-900 pb-4 mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-indigo-950 tracking-tight mb-2">الجدول الدراسي الأسبوعي</h1>
                    <h2 className="text-lg font-black text-slate-700 bg-slate-100/80 inline-block px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      {printType === 'teacher' ? `المعلم: ${entityName}` : `الفصل: ${entityName}`}
                    </h2>
                  </div>
                  <div className="text-left flex flex-col items-end">
                    <div className="flex items-center gap-2 text-indigo-700 mb-2 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100 font-black shadow-sm">
                       <Calendar className="w-5 h-5" /> العام الدراسي الحالي
                    </div>
                    <p className="text-xs font-bold text-slate-500">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Table المعماري */}
                <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-sm">
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th className="w-32 bg-indigo-900 text-white border-b-2 border-l-2 border-slate-300 text-center align-middle py-4">
                          اليوم / الحصة
                        </th>
                        {periods.map(p => (
                          <th key={p.id} className="bg-slate-100 border-b-2 border-l-2 border-slate-300 text-slate-800 text-center align-middle py-3 last:border-l-0">
                            <div className="font-black text-base mb-1">الحصة {p.period_number}</div>
                            <div className="text-xs font-bold text-indigo-600 bg-white inline-block px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                              {p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day, index) => (
                        <tr key={day.id}>
                          <td className={`font-black text-lg text-center align-middle border-l-2 border-slate-300 text-slate-900 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                            {day.name}
                          </td>
                          {periods.map((p) => {
                            const period = p.period_number;
                            const slot = entitySchedule.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period));

                            return (
                              <td key={p.id} className={`border-l-2 border-t border-slate-300 align-middle p-2 last:border-l-0 ${index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                                {slot ? (
                                  <div className="flex flex-col items-center justify-center h-full gap-2 bg-white rounded-xl p-3 border border-slate-200 shadow-sm w-full">
                                    <div className="font-black text-[15px] text-indigo-950 text-center leading-snug whitespace-normal break-words w-full">
                                      {slot.subjects?.name}
                                    </div>
                                    <div className="text-[12px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded-lg text-center w-full whitespace-normal break-words border border-slate-200">
                                      {printType === 'teacher' 
                                        ? `${Array.isArray(slot.sections?.classes) ? slot.sections?.classes[0]?.name : slot.sections?.classes?.name} - ${slot.sections?.name}`
                                        : slot.teachers?.users?.full_name}
                                    </div>
                                    {slot.teachers?.zoom_link && (
                                      <a href={slot.teachers.zoom_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mt-1 w-full hover:underline">
                                        <Video className="w-4 h-4" /> <span>رابط البث (Zoom)</span>
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <BookOpen className="w-6 h-6 text-slate-400 mb-1" />
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">فراغ</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Footer الرسمي */}
                <div className="mt-8 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md">R</div>
                     <div>
                       <p className="text-base font-black text-slate-900 leading-tight">مدرسة الرفعة النموذجية</p>
                       <p className="text-xs font-bold text-slate-500">نظام الإدارة الأكاديمية الشامل</p>
                     </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                      النسخة المعتمدة للإدارة (رقمي)
                    </p>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
