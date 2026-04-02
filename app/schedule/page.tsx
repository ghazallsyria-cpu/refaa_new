'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video, BookOpen, MapPin, Sparkles, ChevronLeft, Bug, LayoutGrid, Save } from 'lucide-react';
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
  
  // للطالب: تحديد اليوم الافتراضي بناءً على يوم الأسبوع الحقيقي
  const currentDayOfWeek = new Date().getDay() + 1; // الأحد = 1 في نظامنا
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
      setTeachers(data.teachers);
      setSections(data.sections);
      setSubjects(data.subjects);
      setAssignments(data.assignments);
      setPeriods(data.periods);

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

  const availableSections = (viewType === 'teacher' && selectedId)
    ? sections.filter(s => assignments.some(a => a.teacher_id === selectedId && a.section_id === s.id))
    : sections;

  const modalAvailableTeachers = (viewType === 'section' && selectedId)
    ? teachers.filter(t => assignments.some(a => a.section_id === selectedId && a.teacher_id === t.id))
    : (formData.section_id 
        ? teachers.filter(t => assignments.some(a => a.section_id === formData.section_id && a.teacher_id === t.id))
        : teachers);

  const availableSubjects = (formData.section_id && formData.teacher_id)
    ? subjects.filter(sub => assignments.some(a => 
        a.section_id === formData.section_id && 
        a.teacher_id === formData.teacher_id && 
        a.subject_id === sub.id
      ))
    : [];

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin) return;

    try {
      setLoading(true);
      
      const sourceDay = swappingFrom.day_of_week;
      const sourcePeriod = swappingFrom.period;

      const conflicts = await checkConflicts(targetDay, targetPeriod, swappingFrom.teacher_id, swappingFrom.section_id, swappingFrom.id);
      
      const targetConflicts = conflicts.filter(c => 
        c.id !== targetSlot?.id && 
        (c.teacher_id === swappingFrom.teacher_id || c.section_id === swappingFrom.section_id)
      );

      if (targetConflicts.length > 0) {
        alert('تعذر التبديل: يوجد تعارض في الحصة المستهدفة للمعلم أو الفصل');
        setLoading(false);
        return;
      }

      if (targetSlot) {
        const sourceConflicts = await checkConflicts(sourceDay, sourcePeriod, targetSlot.teacher_id, targetSlot.section_id, targetSlot.id);
        const filteredSourceConflicts = sourceConflicts.filter(c => 
          c.id !== swappingFrom.id && 
          (c.teacher_id === targetSlot.teacher_id || c.section_id === targetSlot.section_id)
        );

        if (filteredSourceConflicts.length > 0) {
          alert('تعذر التبديل: يوجد تعارض في الحصة الأصلية للمعلم أو الفصل المنقول');
          setLoading(false);
          return;
        }
      }

      await swapSchedules(swappingFrom.id, sourceDay, sourcePeriod, targetSlot?.id || null, targetDay, targetPeriod);
      await notifyScheduleChange(swappingFrom, targetDay, targetPeriod, DAYS);
      if (targetSlot) {
        await notifyScheduleChange(targetSlot, sourceDay, sourcePeriod, DAYS);
      }

      setSwappingFrom(null);
      setIsSwapping(false);
      await fetchSchedule();
      alert('تم تبديل الحصص بنجاح');
    } catch (err) {
      console.error('Error swapping lessons:', err);
      alert('حدث خطأ أثناء تبديل الحصص. يرجى المحاولة مرة أخرى.');
      fetchSchedule();
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    
    const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

    try {
      const conflicts = await checkConflicts(selectedSlot.day, selectedSlot.period, formData.teacher_id, formData.section_id, editingId || undefined);

      if (conflicts.length > 0) {
        const tConflict = conflicts.find(c => c.teacher_id === formData.teacher_id);
        if (tConflict) {
          const section = safeObj(tConflict.sections);
          const subject = safeObj(tConflict.subjects);
          const className = safeObj(section?.classes)?.name;
          alert(`تضارب: المعلم لديه حصة (${subject?.name}) مع فصل (${className} - ${section?.name}) في هذا الوقت.`);
          return;
        }
        
        const sConflict = conflicts.find(c => c.section_id === formData.section_id);
        if (sConflict) {
          const teacher = safeObj(sConflict.teachers);
          const subject = safeObj(sConflict.subjects);
          const teacherName = safeObj(teacher?.users)?.full_name;
          alert(`تضارب: هذا الفصل لديه حصة (${subject?.name}) مع المعلم (${teacherName}) في هذا الوقت.`);
          return;
        }
      }

      if (editingId) {
        await updateSchedule(editingId, {
          teacher_id: formData.teacher_id,
          section_id: formData.section_id,
          subject_id: formData.subject_id,
        });
      } else {
        await addSchedule({
          teacher_id: formData.teacher_id,
          section_id: formData.section_id,
          subject_id: formData.subject_id,
          day_of_week: selectedSlot.day,
          period: selectedSlot.period
        });
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      fetchSchedule(); 
    } catch (err) {
      console.error(err);
      alert(`حدث خطأ أثناء ${editingId ? 'تعديل' : 'إضافة'} الحصة`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      await deleteSchedule(id);
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف الحصة');
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

  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // 🚀 THE MASTERPIECE: STUDENT VIEW
  // ==========================================
  if (authRole === 'student') {
    const currentSectionName = sections.find(s => s.id === selectedId)?.name || '';
    const currentClassName = sections.find(s => s.id === selectedId)?.classes?.name || '';

    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
        {/* 🚀 Hero Banner */}
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
          {/* Decorative Background Elements */}
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
            {/* 🚀 Mobile View: Smart Tabs */}
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
                  <motion.div
                    key={activeDayTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {periods.map(p => {
                      const slot = scheduleData.find(s => s.day_of_week === activeDayTab && s.period === p.period_number);
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
                    {periods.every(p => !scheduleData.find(s => s.day_of_week === activeDayTab && s.period === p.period_number)) && (
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

            {/* 🚀 Desktop View: The Majestic Grid */}
            <div className="hidden lg:block bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden">
              <div className="grid gap-4" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                {/* Header Row */}
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

                {/* Body Rows */}
                {DAYS.map((day, idx) => (
                  <React.Fragment key={day.id}>
                    {/* Day Pill */}
                    <div className={`font-black text-sm flex items-center justify-center rounded-2xl shadow-sm border ${day.id === currentDayOfWeek ? 'bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-100' : 'bg-white text-slate-700 border-slate-200'}`}>
                      {day.name}
                    </div>
                    
                    {/* Slots */}
                    {periods.map((p, pIdx) => {
                      const slot = scheduleData.find(s => s.day_of_week === day.id && s.period === p.period_number);
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (idx * 0.1) + (pIdx * 0.05) }}
                          key={`${day.id}-${p.id}`} 
                          className={`relative p-4 rounded-2xl min-h-[140px] flex flex-col justify-between transition-all group overflow-hidden ${
                            slot 
                              ? 'bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300' 
                              : 'bg-slate-50/50 border border-dashed border-slate-200 opacity-60'
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
                                <a 
                                  href={slot.teachers.zoom_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="mt-3 w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 py-2 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200 relative z-10"
                                >
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
      </div>
    );
  }

  // ==========================================
  // 🚀 ADMIN / TEACHER VIEW (Original Functional View - Slightly Polished)
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 print:m-0 print:p-0" dir="rtl">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
          .print-table th, .print-table td { border: 1px solid black !important; padding: 4px !important; text-align: center !important; vertical-align: middle !important; word-wrap: break-word !important; }
          .print-table th { background-color: #f1f5f9 !important; font-weight: bold !important; }
          .print-others-text { font-size: 8px !important; color: #444 !important; border-top: 1px dashed #ccc !important; margin-top: 2px !important; display: block !important; }
        }
      `}</style>
      
      {/* Debug Info */}
      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-amber-50 p-4 rounded-2xl text-sm text-amber-800 font-bold border border-amber-200 no-print flex items-center gap-3">
          <Bug className="w-5 h-5 shrink-0" />
          <div>
            <p>وضع الإدارة مفعل. يمكنك تعديل ونسخ وتبديل الحصص بالسحب والنقر.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>إدارة الهيكل الزمني</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي الشامل'}
          </h1>
        </div>
        <button 
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95 w-full sm:w-auto"
        >
          <Printer className="h-4 w-4" /> طباعة الجدول
        </button>
      </div>

      {/* Swapping Indicator */}
      {isAdmin && authRole !== 'teacher' && swappingFrom && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between animate-pulse sticky top-4 z-40 no-print gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-lg">وضع التبديل نشط</p>
              <p className="text-sm text-amber-50 font-medium mt-1">
                أنت تقوم بنقل حصة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{swappingFrom.subjects?.name}</span> ({swappingFrom.teachers?.users?.full_name})
                <br />انقر على أي خانة أخرى (فارغة أو مشغولة) لإتمام التبديل.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSwappingFrom(null)}
            className="bg-white text-amber-600 hover:bg-amber-50 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors w-full sm:w-auto"
          >
            إلغاء التبديل
          </button>
        </div>
      )}

      {/* Copied Lesson Indicator */}
      {isAdmin && authRole !== 'teacher' && copiedLesson && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between sticky top-4 z-40 no-print gap-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Info className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-lg">تم نسخ الحصة</p>
              <p className="text-sm text-emerald-50 font-medium mt-1">
                الحصة المنسوخة: <span className="font-black bg-white/20 px-2 py-0.5 rounded">{copiedLesson.subjects?.name}</span> ({copiedLesson.teachers?.users?.full_name})
                <br />انقر على أي خانة فارغة للصق هذه الحصة.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setCopiedLesson(null)}
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl text-sm font-black shadow-sm transition-colors w-full sm:w-auto"
          >
            مسح الحافظة
          </button>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:hidden flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex rounded-xl shadow-sm bg-slate-100 p-1 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewType('teacher');
                if (teachers.length > 0) setSelectedId(teachers[0].id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${
                viewType === 'teacher' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" /> جدول المعلمين
            </button>
            <button
              type="button"
              onClick={() => {
                setViewType('section');
                if (sections.length > 0) setSelectedId(sections[0].id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-black rounded-lg transition-all ${
                viewType === 'section' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" /> جدول الفصول
            </button>
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <BookOpen className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="block w-full rounded-xl border-0 py-4 pr-12 pl-4 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm font-bold outline-none"
            >
              <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
              {viewType === 'teacher' ? (
                teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.users?.full_name || 'معلم غير معروف'}</option>
                ))
              ) : (
                sections.map(s => {
                  const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                  return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>
                })
              )}
            </select>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-slate-50 px-5 py-3.5 rounded-xl border border-slate-200 w-full lg:w-auto">
            <input 
              type="checkbox" 
              id="showAll" 
              checked={showAllSchedules} 
              onChange={(e) => setShowAllSchedules(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
            />
            <label htmlFor="showAll" className="text-sm font-black text-slate-700 cursor-pointer select-none">عرض كامل اللوحةة (كافة الحصص)</label>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-5 h-5"/></div>
                  {editingId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
                </h2>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                {viewType === 'teacher' ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">المعلم المحدد</label>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {teachers.find(t => t.id === selectedId)?.users?.full_name}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">الفصل المحدد</label>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      {sections.find(s => s.id === selectedId)?.classes?.name} - {sections.find(s => s.id === selectedId)?.name}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {viewType === 'teacher' ? 'إسناد لفصل' : 'اختيار المعلم'}
                  </label>
                  {viewType === 'teacher' ? (
                    <select 
                      className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" 
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}
                    >
                      <option value="">-- اختر الفصل --</option>
                      {availableSections.map(s => {
                        const classData = Array.isArray(s.classes) ? s.classes[0] : s.classes;
                        return <option key={s.id} value={s.id}>{classData?.name} - {s.name}</option>
                      })}
                    </select>
                  ) : (
                    <select 
                      className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none" 
                      value={formData.teacher_id}
                      onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}
                    >
                      <option value="">-- اختر المعلم --</option>
                      {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المادة الدراسية</label>
                  <select 
                    className="w-full p-4 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none appearance-none disabled:opacity-50" 
                    value={formData.subject_id}
                    disabled={!formData.section_id || !formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  >
                    <option value="">-- اختر المادة --</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {(!formData.section_id || !formData.teacher_id) && <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1"><Info className="w-3 h-3"/> يرجى اختيار {viewType === 'teacher' ? 'الفصل' : 'المعلم'} أولاً لفتح المواد</p>}
                  {formData.section_id && formData.teacher_id && availableSubjects.length === 0 && <p className="text-[10px] font-bold text-amber-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> لا توجد مواد مسندة لهذا المعلم في هذا الفصل ضمن صفحة (تعيينات المعلمين)</p>}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-8">
                <button className="w-full sm:w-auto px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-black transition-colors" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>إلغاء الأمر</button>
                <button className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-colors flex-1 flex justify-center items-center gap-2" onClick={handleAddSchedule}>
                  <Save className="w-5 h-5" /> {editingId ? 'تحديث بيانات الحصة' : 'اعتماد الحصة في الجدول'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Header */}
      <div className="hidden print:block text-center mb-8 font-cairo">
        <h2 className="text-3xl font-black text-slate-900 border-b-2 border-slate-900 inline-block pb-2 mb-2">تطبيق الرفعة النموذجي</h2>
        <h3 className="text-xl font-bold text-slate-700 mt-2">
          {viewType === 'teacher' ? 'الجدول الدراسي للمعلم' : 'الجدول الدراسي للفصل'}
        </h3>
        <p className="text-2xl font-black mt-2 text-indigo-800 bg-indigo-50 inline-block px-4 py-1 rounded-lg">
          {viewType === 'teacher' 
            ? teachers.find(t => t.id === selectedId)?.users?.full_name 
            : (sections.find(s => s.id === selectedId)?.classes?.[0]?.name || sections.find(s => s.id === selectedId)?.classes?.name) + ' - ' + sections.find(s => s.id === selectedId)?.name}
        </p>
      </div>

      {/* Admin/Teacher Table View */}
      {!selectedId && !showAllSchedules ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-16 text-center print:hidden">
          <div className="mx-auto h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
            <LayoutGrid className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">لوحة الجدول فارغة</h3>
          <p className="text-slate-500 font-bold">
            الرجاء اختيار معلم أو فصل من القائمة العلوية لعرض وتعديل الجدول المخصص.
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-rose-100 p-16 text-center print:hidden">
          <div className="mx-auto h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 animate-pulse">
            <AlertCircle className="h-10 w-10 text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">النظام الزمني غير معد</h3>
          <p className="text-slate-500 font-bold mb-8 max-w-md mx-auto">
            لا يمكن عرض أي جدول دراسي لعدم وجود (حصص وتواقيت) في النظام. يرجى إعداد أوقات الحصص أولاً لتتمكن من توزيع الجدول.
          </p>
          {isAdmin && (
            <Link 
              href="/admin/periods"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
            >
              <Clock className="w-5 h-5" /> بناء الهيكل الزمني للحصص
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden print:hidden">
            <div className="overflow-x-auto p-6 sm:p-8">
              <div className="min-w-[800px]">
                <div className="grid gap-3" style={{ gridTemplateColumns: `100px repeat(${periods.length}, minmax(0, 1fr))` }}>
                  {/* Header Row */}
                  <div className="h-16 flex items-center justify-center bg-slate-900 rounded-2xl shadow-inner">
                    <span className="text-xs font-black text-white uppercase tracking-widest">اليوم</span>
                  </div>
                  {periods.map(p => (
                    <div key={p.id} className="h-16 flex flex-col items-center justify-center bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
                      <span className="text-sm font-black text-slate-900">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {p.start_time.slice(0, 5)}</span>
                    </div>
                  ))}

                {/* Body Rows */}
                {loading ? (
                  <div className="col-span-full py-32 text-center flex flex-col items-center justify-center">
                    <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-slate-400">جاري فك تشفير الجدول...</p>
                  </div>
                ) : (
                  DAYS.map((day) => (
                    <React.Fragment key={day.id}>
                      <div className="font-black text-sm flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                        {day.name}
                      </div>
                      {periods.map(p => {
                        const period = p.period_number;
                        const slot = scheduleData.find(s => 
                          s.day_of_week === day.id && 
                          s.period === period && 
                          (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))
                        );

                        const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                          s.day_of_week === day.id && 
                          s.period === period && 
                          (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))
                        ) : [];

                        const isSwappingFromThisSlot = swappingFrom && others.find(o => o.id === swappingFrom.id);
                        const isCopiedFromThisSlot = copiedLesson && others.find(o => o.id === copiedLesson.id);
                        const displaySlot = slot || (isSwappingFromThisSlot ? swappingFrom : (isCopiedFromThisSlot ? copiedLesson : others[0]));

                        return (
                          <div key={`${day.id}-${period}`} className={`group p-3 sm:p-4 rounded-2xl min-h-[120px] flex flex-col items-center justify-center text-center transition-all relative overflow-hidden
                            ${slot 
                              ? 'bg-white border-2 border-indigo-500 shadow-md shadow-indigo-100 z-10' 
                              : displaySlot 
                                ? 'bg-slate-50 border border-slate-200 text-slate-400' 
                                : 'bg-slate-50/30 border border-dashed border-slate-200 text-slate-300 hover:bg-slate-50'
                            }
                            ${isAdmin ? 'cursor-pointer hover:border-indigo-400 hover:shadow-lg' : ''} 
                            ${swappingFrom?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-amber-400 bg-amber-50 z-20 scale-105 shadow-xl border-transparent' : ''} 
                            ${copiedLesson?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-emerald-400 bg-emerald-50 z-20 border-transparent' : ''}`}
                            onClick={() => {
                              if (isAdmin) {
                                if (swappingFrom) {
                                  if (swappingFrom.id === displaySlot?.id) {
                                    setSwappingFrom(null);
                                  } else {
                                    handleSwap(day.id, period, displaySlot);
                                  }
                                } else if (!displaySlot || others.length > 0) {
                                  setFormData({ 
                                    teacher_id: viewType === 'teacher' ? selectedId : (copiedLesson?.teacher_id || ''), 
                                    section_id: viewType === 'section' ? selectedId : (copiedLesson?.section_id || ''), 
                                    subject_id: copiedLesson?.subject_id || '' 
                                  });
                                  setSelectedSlot({day: day.id, period: period});
                                  setIsModalOpen(true);
                                }
                              } else if (slot?.teachers?.zoom_link) {
                                window.open(slot.teachers.zoom_link, '_blank');
                              }
                            }}
                          >
                            {displaySlot ? (
                              <div className="w-full relative z-10">
                                <span className={`font-black text-sm block mb-1.5 leading-tight ${slot ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {displaySlot.subjects?.name}
                                </span>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-100 inline-block truncate max-w-full ${slot ? 'text-indigo-700 bg-indigo-50 border border-indigo-100' : 'text-slate-400'}`}>
                                  {viewType === 'teacher' ? (
                                    `${Array.isArray(displaySlot.sections?.classes) ? displaySlot.sections?.classes[0]?.name : displaySlot.sections?.classes?.name} - ${displaySlot.sections?.name}`
                                  ) : (
                                    displaySlot.teachers?.users?.full_name
                                  )}
                                </div>
                                
                                {isAdmin && slot && (
                                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 transition-colors shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); setCopiedLesson(displaySlot); }}
                                      >نسخ</button>
                                      <button 
                                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-100 transition-colors shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); setSwappingFrom(displaySlot); }}
                                      >نقل</button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button 
                                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 transition-colors shadow-sm"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setEditingId(displaySlot.id);
                                          setFormData({ 
                                            teacher_id: displaySlot.teacher_id || '', 
                                            section_id: displaySlot.section_id || '', 
                                            subject_id: displaySlot.subject_id || '' 
                                          });
                                          setSelectedSlot({day: day.id, period: period});
                                          setIsModalOpen(true);
                                        }}
                                      >تعديل</button>
                                      <button 
                                        className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors shadow-sm"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(displaySlot.id); }}
                                      >حذف</button>
                                    </div>
                                  </div>
                                )}
                                {!slot && others.length > 1 && (
                                  <span className="text-[9px] font-bold text-slate-400 block mt-2 bg-slate-100 rounded-full px-2 py-0.5 inline-block">+{others.length - 1} تعارضات</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Plus className="w-6 h-6 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full shadow-sm" />
                                <span className="text-slate-300 text-[10px] font-bold tracking-widest uppercase group-hover:opacity-0 transition-opacity">فراغ</span>
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

          {/* 🚀 Printable Minimal View */}
          <div className="hidden print:block p-4 font-cairo">
            <table className="print-table table-fixed w-full">
              <thead>
                <tr>
                  <th className="w-24 bg-slate-100 py-3">اليوم / الحصة</th>
                  {periods.map(p => <th key={p.id} className="py-3 bg-slate-50">الحصة {p.period_number}<br/><span className="text-[10px] font-normal">{p.start_time.slice(0, 5)}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.id}>
                    <td className="font-bold bg-slate-50">{day.name}</td>
                    {periods.map(p => {
                      const period = p.period_number;
                      const slot = scheduleData.find(s => 
                        s.day_of_week === day.id && 
                        s.period === period && 
                        (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))
                      );

                      return (
                        <td key={p.id} className="h-24">
                          {slot ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                              <div className="font-bold text-sm text-slate-900 border-b border-slate-300 pb-1 w-full text-center">{slot.subjects?.name}</div>
                              <div className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-full text-center">
                                {viewType === 'teacher' 
                                  ? `${Array.isArray(slot.sections?.classes) ? slot.sections?.classes[0]?.name : slot.sections?.classes?.name} - ${slot.sections?.name}`
                                  : slot.teachers?.users?.full_name}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-300 text-xs">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-8 pt-6 border-t-2 border-slate-900 flex justify-between items-center">
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">تطبيق الرفعة النموذجي</p>
                <p className="text-xs font-bold text-slate-500 mt-1">نسخة معتمدة للجدول الدراسي</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
