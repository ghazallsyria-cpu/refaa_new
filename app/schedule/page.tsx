'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

export default function SchedulePage() {
  const { user, userRole: authRole, isChecking } = useAuth();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    fetchInitialScheduleData, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkConflicts,
    swapSchedules,
    notifyScheduleChange,
    fetchStudentSection
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;
    try {
      let currentUserRole = authRole;
      if (user) {
        const isSystemAdmin = currentUserRole === 'admin' || currentUserRole === 'management';
        setIsAdmin(isSystemAdmin);
      }

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers);
      setSections(data.sections);
      setSubjects(data.subjects);
      setAssignments(data.assignments);
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

  const availableSections = (viewType === 'teacher' && selectedId)
    ? sections.filter(s => assignments.some(a => String(a.teacher_id) === String(selectedId) && String(a.section_id) === String(s.id)))
    : sections;

  const modalAvailableTeachers = (viewType === 'section' && selectedId)
    ? teachers.filter(t => assignments.some(a => String(a.section_id) === String(selectedId) && String(a.teacher_id) === String(t.id)))
    : (formData.section_id 
        ? teachers.filter(t => assignments.some(a => String(a.section_id) === String(formData.section_id) && String(a.teacher_id) === String(t.id)))
        : teachers);

  const availableSubjects = (formData.section_id && formData.teacher_id)
    ? subjects.filter(sub => assignments.some(a => 
        String(a.section_id) === String(formData.section_id) && 
        String(a.teacher_id) === String(formData.teacher_id) && 
        String(a.subject_id) === String(sub.id)
      ))
    : [];

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let filters: any = {};
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') filters.teacher_id = selectedId;
        else filters.section_id = selectedId;
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

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    setIsSubmitting(true);
    try {
      const conflicts = await checkConflicts(selectedSlot.day, selectedSlot.period, formData.teacher_id, formData.section_id, editingId || undefined);
      if (conflicts.length > 0) {
        const tConflict = conflicts.find(c => String(c.teacher_id) === String(formData.teacher_id));
        if (tConflict) {
          const conflictData = tConflict as any;
          alert(`تضارب: المعلم لديه حصة (${safeObj(conflictData.subjects)?.name}) مع فصل (${safeObj(safeObj(conflictData.sections)?.classes)?.name} - ${safeObj(conflictData.sections)?.name})`);
          setIsSubmitting(false);
          return;
        }
      }

      if (editingId) await updateSchedule(editingId, formData);
      else await addSchedule({ ...formData, day_of_week: selectedSlot.day, period: selectedSlot.period });
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء المعالجة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any | null) => {
    if (!swappingFrom || !isAdmin) return;
    try {
      setLoading(true);
      await swapSchedules(swappingFrom.id, swappingFrom.day_of_week, swappingFrom.period, targetSlot?.id || null, targetDay, targetPeriod);
      setSwappingFrom(null);
      await fetchSchedule();
      alert('تم التبديل بنجاح');
    } catch (err) {
      console.error(err);
      alert('فشل التبديل');
    } finally {
      setLoading(false);
    }
  };

  const maxScheduledPeriod = scheduleData.length > 0 ? Math.max(...scheduleData.map(s => Number(s.period) || 0)) : 5;
  const displayPeriods = periods.filter(p => Number(p.period_number) <= Math.max(maxScheduledPeriod, 5));

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي'}</h1>
          <p className="text-slate-500">عرض وإدارة الحصص الأسبوعية بنظام الزووم المدمج</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50">
          <Printer className="ml-2 h-4 w-4" /> طباعة الجدول
        </button>
      </div>

      {/* شريط وضع التبديل */}
      {isAdmin && swappingFrom && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between no-print sticky top-4 z-40">
           <div className="flex items-center gap-3">
             <Video className="h-5 w-5 animate-pulse" />
             <p className="text-sm font-bold">وضع التبديل نشط: اختر الخانة المستهدفة لنقل حصة {safeObj(swappingFrom.subjects)?.name}</p>
           </div>
           <button onClick={() => setSwappingFrom(null)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs">إلغاء</button>
        </motion.div>
      )}

      {/* فلاتر التحكم */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex rounded-md shadow-sm">
              <button onClick={() => setViewType('teacher')} className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${viewType === 'teacher' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>جدول المعلمين</button>
              <button onClick={() => setViewType('section')} className={`px-4 py-2 text-sm font-medium rounded-l-lg border-y border-l ${viewType === 'section' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>جدول الفصول</button>
            </div>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="flex-1 rounded-md border-slate-300 py-2 text-sm focus:ring-indigo-600">
              <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
              {viewType === 'teacher' ? teachers.map(t => <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name}</option>) : sections.map(s => <option key={s.id} value={s.id}>{safeObj(s.classes)?.name} - {s.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-max divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-4 px-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 w-32 bg-slate-100/50 sticky right-0 z-10 shadow-sm">اليوم / الحصة</th>
                {displayPeriods.map(p => (
                  <th key={p.id} className="py-4 px-4 text-center border-l border-slate-200 min-w-[160px]">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-slate-900">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{p.start_time ? String(p.start_time).substring(0, 5) : ''} - {p.end_time ? String(p.end_time).substring(0, 5) : ''}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-8 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80 sticky right-0 z-10 shadow-sm">{day.name}</td>
                  {displayPeriods.map(p => {
                    const period = p.period_number;
                    const slot = scheduleData.find(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period) && (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId)));
                    const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => String(s.day_of_week) === String(day.id) && String(s.period) === String(period) && (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))) : [];
                    const displaySlot = slot || others[0];

                    // استخراج ذكي وشامل لرابط الزووم (مفتاح الحل)
                    const teacher = safeObj(displaySlot?.teachers);
                    const zoomLink = displaySlot?.zoom_link || teacher?.zoom_link || safeObj(teacher?.users)?.zoom_link;

                    return (
                      <td key={`${day.id}-${period}`} className="p-3 border-l border-slate-200 h-36 align-top">
                        {displaySlot ? (
                          <div 
                            onClick={() => isAdmin && setSwappingFrom(displaySlot)}
                            className={cn(
                              "h-full flex flex-col justify-between rounded-2xl p-4 border transition-all relative group cursor-pointer",
                              slot ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-transparent shadow-lg shadow-indigo-100" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                            )}
                          >
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">{safeObj(displaySlot.subjects)?.name}</span>
                              <span className="font-black text-sm block leading-tight">{viewType === 'teacher' ? `${safeObj(safeObj(displaySlot.sections)?.classes)?.name} - ${safeObj(displaySlot.sections)?.name}` : safeObj(safeObj(displaySlot.teachers)?.users)?.full_name}</span>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                              {/* وسم رابط الزووم المدمج */}
                              {zoomLink && slot && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black bg-white/20 py-1 px-2 rounded-lg w-fit">
                                  <Video className="h-3 w-3 animate-pulse text-emerald-400" />
                                  رابط زوم مدمج
                                </div>
                              )}
                              {zoomLink && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); window.open(zoomLink, '_blank'); }}
                                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold transition-colors border border-white/5"
                                >
                                  دخول الحصة الآن
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => isAdmin && (setSelectedSlot({day: day.id, period}), setIsModalOpen(true))}
                            className="h-full w-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-indigo-200 transition-all cursor-pointer group"
                          >
                            {isAdmin && <Plus className="h-5 w-5 text-slate-200 group-hover:text-indigo-400 transition-colors" />}
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
      </div>

      {/* نافذة الإضافة/التعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6">إضافة حصة جديدة</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddSchedule(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المادة</label>
                <select required className="w-full rounded-xl border-slate-200 py-3 text-sm" value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})}>
                  <option value="">اختر المادة</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المعلم</label>
                <select required className="w-full rounded-xl border-slate-200 py-3 text-sm" value={formData.teacher_id} onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}>
                  <option value="">اختر المعلم</option>
                  {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">حفظ الحصة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

