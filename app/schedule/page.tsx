'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { 
  Printer, User, Users, Info, X, Plus, 
  Calendar, AlertCircle, Clock, Video, Trash2 
} from 'lucide-react';
import { motion } from 'motion/react'; 
import { cn } from '@/lib/utils';
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
      console.error('Error fetching filters:', err);
    }
  }, [fetchInitialScheduleData, fetchStudentSection, user, authRole, isChecking]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const fetchSchedule = useCallback(async () => {
    if (!selectedId && !showAllSchedules) return;
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
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    setIsSubmitting(true);
    try {
      const conflicts = await checkConflicts(selectedSlot.day, selectedSlot.period, formData.teacher_id, formData.section_id, editingId || undefined);
      if (conflicts && conflicts.length > 0) {
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

  const maxScheduledPeriod = scheduleData.length > 0 ? Math.max(...scheduleData.map(s => Number(s.period) || 0)) : 5;
  const displayPeriods = periods.filter(p => Number(p.period_number) <= Math.max(maxScheduledPeriod, 5));

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي'}</h1>
          <p className="text-slate-500 text-sm">عرض وإدارة الحصص الأسبوعية بنظام الزووم المدمج</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50">
          <Printer className="ml-2 h-4 w-4" /> طباعة الجدول
        </button>
      </div>

      {isAdmin && swappingFrom && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between no-print sticky top-4 z-40">
           <div className="flex items-center gap-3">
             <Video className="h-5 w-5 animate-pulse text-indigo-200" />
             <p className="text-sm font-bold">وضع التبديل نشط: اختر الخانة المستهدفة لنقل حصة {safeObj(swappingFrom.subjects)?.name}</p>
           </div>
           <button onClick={() => setSwappingFrom(null)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs font-bold">إلغاء</button>
        </motion.div>
      )}

      {isAdmin && (
        <div className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-200 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => setViewType('teacher')} className={`px-4 py-2 text-xs font-black border ${viewType === 'teacher' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>جدول المعلمين</button>
              <button onClick={() => setViewType('section')} className={`px-4 py-2 text-xs font-black border-y border-l ${viewType === 'section' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>جدول الفصول</button>
            </div>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="flex-1 rounded-xl border-slate-200 py-2 text-sm font-bold focus:ring-indigo-600">
              <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
              {viewType === 'teacher' 
                ? teachers.map(t => <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name || 'معلم غير محدد'}</option>) 
                : sections.map(s => <option key={s.id} value={s.id}>{safeObj(s.classes)?.name} - {s.name}</option>)
              }
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-indigo-200">
          <table className="w-full min-w-max divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l border-slate-200 w-32 bg-slate-100/50 sticky right-0 z-10 shadow-sm">اليوم / الحصة</th>
                {displayPeriods.map(p => (
                  <th key={p.id} className="py-5 px-4 text-center border-l border-slate-200 min-w-[170px]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-slate-900 uppercase">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 bg-white px-2 py-0.5 rounded-full border border-slate-100">{p.start_time ? String(p.start_time).substring(0, 5) : ''} - {p.end_time ? String(p.end_time).substring(0, 5) : ''}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-10 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80 sticky right-0 z-10 shadow-sm">{day.name}</td>
                  {displayPeriods.map(p => {
                    const period = p.period_number;
                    const slot = scheduleData.find(s => 
                      String(s.day_of_week) === String(day.id) && 
                      String(s.period) === String(period) && 
                      (viewType === 'teacher' ? String(s.teacher_id) === String(selectedId) : String(s.section_id) === String(selectedId))
                    );
                    
                    const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                      String(s.day_of_week) === String(day.id) && 
                      String(s.period) === String(period) && 
                      (viewType === 'teacher' ? String(s.teacher_id) !== String(selectedId) : String(s.section_id) !== String(selectedId))
                    ) : [];
                    
                    const displaySlot = slot || others[0];

                    // --- منطق استخراج رابط الزووم الذكي ---
                    const teacher = safeObj(displaySlot?.teachers);
                    const userRel = safeObj(teacher?.users);
                    
                    // البحث عن الرابط في كل مكان محتمل
                    const zoomLink = displaySlot?.zoom_link || 
                                     teacher?.zoom_link || 
                                     userRel?.zoom_link || 
                                     safeObj(displaySlot?.users)?.zoom_link;

                    return (
                      <td key={`${day.id}-${period}`} className="p-3 border-l border-slate-200 h-40 align-top">
                        {displaySlot ? (
                          <motion.div 
                            whileHover={{ y: -2 }}
                            onClick={() => isAdmin && (swappingFrom ? handleSwap(day.id, period, displaySlot) : setSwappingFrom(displaySlot))}
                            className={cn(
                              "h-full flex flex-col justify-between rounded-3xl p-5 border transition-all relative group cursor-pointer shadow-sm",
                              slot ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-transparent" : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{safeObj(displaySlot.subjects)?.name}</span>
                              </div>
                              <span className="font-black text-xs block leading-tight">
                                {viewType === 'teacher' 
                                  ? `${safeObj(safeObj(displaySlot.sections)?.classes)?.name || ''} - ${safeObj(displaySlot.sections)?.name || ''}` 
                                  : safeObj(safeObj(displaySlot.teachers)?.users)?.full_name || 'معلم غير محدد'}
                              </span>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-2">
                              {/* وسم رابط الزووم - يظهر فقط إذا وجد رابط فعلي */}
                              {zoomLink && zoomLink.trim() !== "" && (
                                <div className="flex items-center gap-1.5 text-[8px] font-black bg-emerald-500/20 py-1 px-2 rounded-lg w-fit text-emerald-100">
                                  <Video className="h-2.5 w-2.5 animate-pulse" />
                                  <span>بث مباشر متاح</span>
                                </div>
                              )}
                              
                              {zoomLink && zoomLink.trim() !== "" && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    window.open(zoomLink, '_blank'); 
                                  }}
                                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black transition-colors border border-white/5"
                                >
                                  دخول البث الآن
                                </button>
                              )}

                              {isAdmin && (
                                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
                                      deleteSchedule(displaySlot.id).then(() => fetchSchedule());
                                    }
                                  }} className="p-1.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div 
                            onClick={() => isAdmin && (setSelectedSlot({day: day.id, period}), setIsModalOpen(true))}
                            className="h-full w-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] hover:bg-indigo-50/30 hover:border-indigo-200 transition-all cursor-pointer group"
                          >
                            {isAdmin && (
                              <div className="flex flex-col items-center gap-1">
                                <Plus className="h-5 w-5 text-slate-200 group-hover:text-indigo-400 transition-colors" />
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100">إضافة حصة</span>
                              </div>
                            )}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-black text-slate-900">إضافة حصة جديدة</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X className="h-6 w-6"/></button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleAddSchedule(); }} className="space-y-5">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4 flex items-center gap-3">
                 <Calendar className="h-5 w-5 text-indigo-600" />
                 <span className="text-sm font-bold text-indigo-900">{DAYS.find(d => d.id === selectedSlot?.day)?.name} - الحصة {selectedSlot?.period}</span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">المادة الدراسية</label>
                <select required className="w-full rounded-2xl border-slate-200 py-4 text-sm font-bold focus:ring-indigo-600 bg-slate-50/50" value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})}>
                  <option value="">اختر المادة</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">المعلم المسند</label>
                <select required className="w-full rounded-2xl border-slate-200 py-4 text-sm font-bold focus:ring-indigo-600 bg-slate-50/50" value={formData.teacher_id} onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}>
                  <option value="">اختر المعلم</option>
                  {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name || 'معلم غير محدد'}</option>)}
                </select>
              </div>
              
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all hover:bg-slate-200">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحصة'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

