'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, Plus, Trash2, X, Edit2, AlertCircle, Search, ShieldAlert } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { useAuth } from '@/context/auth-context'; // 🚀 استيراد هوك الحماية
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Types
type Section = {
  id: string;
  name: string;
  classes: { name: string };
};

type Subject = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  users: { full_name: string };
};

type Schedule = {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  period: number;
  subjects?: { name: string };
  teachers?: { users?: { full_name: string } };
};

type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
};

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function SchedulesPage() {
  const { authRole, isChecking } = useAuth() as any; // 🚀 استخدام جدار الحماية
  
  const [sections, setSections] = useState<Section[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false); // لفصل تحميل الجدول عن تحميل الصفحة
  
  // Modal Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const { fetchInitialScheduleData, fetchSchedules: fetchSchedulesData, addSchedule, updateSchedule, deleteSchedule: deleteScheduleAction } = useSchedulesSystem();

  // 🚀 حارس لمنع الطلبات الأولية المزدوجة
  const isInitialFetched = useRef(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const [currentCell, setCurrentCell] = useState<{
    day: number;
    period: number;
    scheduleId?: string;
    subjectId?: string;
    teacherId?: string;
  }>({ day: 0, period: 1 });

  const fetchInitialData = useCallback(async () => {
    if (isInitialFetched.current) return;
    
    setLoading(true);
    isInitialFetched.current = true;
    try {
      const data = await fetchInitialScheduleData();
      setSections(data.sections as unknown as Section[]);
      setSubjects(data.subjects as unknown as Subject[]);
      setTeachers(data.teachers as unknown as Teacher[]);
      setTeacherAssignments(data.assignments);
      setPeriods(data.periods);
      
      if (data.sections && data.sections.length > 0) {
        setSelectedSectionId(data.sections[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showNotification('error', 'فشل تحميل البيانات الأولية');
      isInitialFetched.current = false;
    } finally {
      setLoading(false);
    }
  }, [fetchInitialScheduleData]);

  const fetchSchedules = useCallback(async (sectionId: string) => {
    setScheduleLoading(true);
    try {
      const data = await fetchSchedulesData({ sectionId });
      setSchedules(data as unknown as Schedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      showNotification('error', 'فشل تحميل الجدول');
    } finally {
      setScheduleLoading(false);
    }
  }, [fetchSchedulesData]);

  useEffect(() => {
    if (!isChecking && (authRole === 'admin' || authRole === 'management')) {
      fetchInitialData();
    }
  }, [fetchInitialData, isChecking, authRole]);

  // 🚀 مراقبة تغيير الشعبة وجلب جدولها فقط إذا تغيرت
  useEffect(() => {
    if (selectedSectionId && !isChecking) {
      fetchSchedules(selectedSectionId);
    } else {
      setSchedules([]);
    }
  }, [selectedSectionId, fetchSchedules, isChecking]);

  const openCellModal = (day: number, period: number, existingSchedule?: Schedule) => {
    if (!selectedSectionId) {
      showNotification('error', 'الرجاء اختيار الشعبة أولاً');
      return;
    }
    
    setCurrentCell({
      day,
      period,
      scheduleId: existingSchedule?.id,
      subjectId: existingSchedule?.subject_id || '',
      teacherId: existingSchedule?.teacher_id || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCell.subjectId || !currentCell.teacherId) {
      showNotification('error', 'الرجاء اختيار المادة والمعلم');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        section_id: selectedSectionId,
        subject_id: currentCell.subjectId,
        teacher_id: currentCell.teacherId,
        day_of_week: currentCell.day,
        period: currentCell.period,
      };

      if (currentCell.scheduleId) {
        await updateSchedule(currentCell.scheduleId, payload);
      } else {
        await addSchedule(payload);
      }

      await fetchSchedules(selectedSectionId);
      setIsModalOpen(false);
      showNotification('success', 'تم حفظ الحصة بنجاح');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      if (error.code === '23505') {
        showNotification('error', 'المعلم لديه حصة أخرى في نفس الوقت');
      } else {
        showNotification('error', error.message || 'حدث خطأ أثناء حفظ الحصة');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    try {
      await deleteScheduleAction(scheduleToDelete);
      await fetchSchedules(selectedSectionId);
      showNotification('success', 'تم حذف الحصة بنجاح');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification('error', 'حدث خطأ أثناء حذف الحصة');
    } finally {
      setScheduleToDelete(null);
    }
  };

  const getCellData = (day: number, period: number) => {
    return schedules.find(s => s.day_of_week === day && s.period === period);
  };

  // 🚀 شاشات الحماية والتحميل (الثيم الملكي)
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
           <p className="text-slate-400 font-bold">هذه الصفحة مخصصة للإدارة العليا فقط لإنشاء الجداول.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري إعداد محرك الجداول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#090b14] font-cairo text-slate-100 pb-24 pt-6 relative overflow-hidden" dir="rtl">
      {/* 🚀 الخلفية الزجاجية */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 relative z-10">
        
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

        {/* 🚀 Header */}
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-8 lg:p-10 text-white border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 sm:p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner shrink-0">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-400 drop-shadow-md" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm">الجداول الدراسية</h1>
                <p className="text-slate-400 mt-1.5 font-bold text-xs sm:text-sm">بناء وإدارة الجداول الدراسية الأسبوعية للفصول والشعب</p>
              </div>
            </div>
            <Link href="/dashboard" className="inline-flex w-full md:w-auto justify-center items-center px-6 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-black rounded-2xl transition-all shadow-inner border border-white/10 active:scale-95 text-sm">العودة للوحة التحكم</Link>
          </div>
          <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-indigo-500/10 blur-[80px] pointer-events-none rounded-full"></div>
        </div>

        {/* 🚀 Select Section Area */}
        <div className="bg-[#131836]/60 backdrop-blur-xl p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 shadow-lg relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" /> عرض جدول شعبة:
            </label>
            <div className="relative w-full sm:w-80">
              <select
                className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 px-4 text-white bg-[#02040a]/80 focus:bg-[#02040a] ring-1 ring-inset ring-white/5 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold transition-all shadow-inner outline-none appearance-none [&>option]:bg-[#0f1423]"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={loading && sections.length === 0}
              >
                {sections.length === 0 ? (
                  <option value="">لا توجد شعب مسجلة</option>
                ) : (
                  sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.classes?.name} - شعبة {section.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 🚀 The Timetable Grid */}
        <div className="bg-[#131836]/60 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative z-10">
          {scheduleLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="animate-spin text-indigo-500 w-10 h-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            </div>
          ) : !selectedSectionId ? (
            <div className="text-center py-24 sm:py-32 px-4">
              <div className="mx-auto h-20 w-20 bg-[#02040a]/60 border border-white/5 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                 <Calendar className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2 drop-shadow-sm">لم تقم باختيار شعبة</h3>
              <p className="text-slate-400 font-bold text-sm">اختر إحدى الشعب من القائمة العلوية لعرض وبناء جدولها.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
                <thead className="bg-[#02040a]/80">
                  <tr>
                    <th scope="col" className="py-5 sm:py-6 px-4 text-center text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest border-l border-white/5 w-32">
                      اليوم / الحصة
                    </th>
                    {periods.map(period => (
                      <th key={period.id} scope="col" className="py-4 sm:py-5 px-3 sm:px-4 text-center border-l border-white/5 min-w-[160px] bg-[#02040a]/40">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-indigo-400 font-black text-xs sm:text-sm drop-shadow-sm">الحصة {period.period_number}</span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-[#0f1423] px-2.5 py-1 rounded-md border border-white/5 shadow-inner" dir="ltr">{period.start_time.slice(0,5)} - {period.end_time.slice(0,5)}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {DAYS.map((day) => (
                    <tr key={day.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-5 sm:py-6 px-3 sm:px-4 text-xs sm:text-sm font-black text-slate-300 border-l border-white/5 text-center bg-[#0f1423]/30">
                        {day.name}
                      </td>
                      {periods.map(period => {
                        const cellData = getCellData(day.id, period.period_number);
                        return (
                          <td 
                            key={`${day.id}-${period.period_number}`} 
                            className="p-2 sm:p-3 border-l border-white/5 h-28 sm:h-32 align-top group cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => openCellModal(day.id, period.period_number, cellData)}
                          >
                            {cellData ? (
                              <motion.div whileHover={{ scale: 1.02 }} className="h-full flex flex-col justify-between bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20 shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none"></div>
                                <div className="relative z-10">
                                  <div className="font-black text-white text-xs sm:text-sm truncate drop-shadow-sm" title={cellData.subjects?.name}>
                                    {cellData.subjects?.name}
                                  </div>
                                  <div className="text-[10px] sm:text-xs font-bold text-indigo-300 mt-1 truncate" title={cellData.teachers?.users?.full_name}>
                                    أ. {cellData.teachers?.users?.full_name}
                                  </div>
                                </div>
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2 relative z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setScheduleToDelete(cellData.id);
                                    }}
                                    className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors border border-transparent hover:border-rose-400 shadow-sm"
                                    title="حذف الحصة"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-[#02040a]/40 rounded-xl border border-dashed border-white/10 transition-all group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <div className="flex flex-col items-center gap-1.5 text-slate-500 group-hover:text-indigo-400 transition-colors">
                                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">تعيين حصة</span>
                                </div>
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
          )}
        </div>

        {/* 🚀 Add/Edit Schedule Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-[#02040a]/90 backdrop-blur-md z-[100]" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-[101] w-[95vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[2rem] sm:rounded-[2.5rem] bg-[#0f1423] p-6 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 focus:outline-none" dir="rtl">
              <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <Dialog.Title className="text-lg sm:text-xl font-black text-white drop-shadow-sm">
                    {currentCell.scheduleId ? 'تعديل الحصة' : 'تعيين حصة جديدة'}
                  </Dialog.Title>
                </div>
                <Dialog.Close className="h-8 w-8 flex items-center justify-center bg-[#02040a] rounded-lg text-slate-400 hover:text-white border border-white/5 transition-colors active:scale-90">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              
              <div className="mb-6 bg-[#02040a]/60 p-4 rounded-[1.25rem] border border-white/5 flex items-center gap-3 text-sm font-bold text-slate-300 shadow-inner">
                <Clock className="h-5 w-5 text-indigo-400" />
                <div className="flex items-center gap-2">
                  <span className="text-white bg-white/5 px-2 py-0.5 rounded-md">{DAYS.find(d => d.id === currentCell.day)?.name}</span>
                  <span className="text-slate-500">-</span>
                  <span className="text-white bg-white/5 px-2 py-0.5 rounded-md">الحصة {currentCell.period}</span>
                </div>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">المادة الدراسية <span className="text-rose-500">*</span></label>
                  <select 
                    required
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 px-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 text-sm font-bold transition-all shadow-inner outline-none appearance-none [&>option]:bg-[#0f1423]"
                    value={currentCell.subjectId || ''}
                    onChange={(e) => setCurrentCell({...currentCell, subjectId: e.target.value})}
                  >
                    <option value="">اختر المادة...</option>
                    {subjects
                      .filter(s => {
                        if (currentCell.teacherId) {
                          return teacherAssignments.some(a => a.subject_id === s.id && a.teacher_id === currentCell.teacherId && a.section_id === selectedSectionId);
                        }
                        return teacherAssignments.some(a => a.subject_id === s.id && a.section_id === selectedSectionId);
                      })
                      .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 pl-1">المعلم <span className="text-rose-500">*</span></label>
                  <select 
                    required
                    className="block w-full rounded-xl sm:rounded-2xl border border-white/5 py-3.5 px-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 text-sm font-bold transition-all shadow-inner outline-none appearance-none [&>option]:bg-[#0f1423]"
                    value={currentCell.teacherId || ''}
                    onChange={(e) => setCurrentCell({...currentCell, teacherId: e.target.value})}
                  >
                    <option value="">اختر المعلم...</option>
                    {teachers
                      .filter(t => {
                        if (currentCell.subjectId) {
                          return teacherAssignments.some(a => a.teacher_id === t.id && a.subject_id === currentCell.subjectId && a.section_id === selectedSectionId);
                        }
                        return teacherAssignments.some(a => a.teacher_id === t.id && a.section_id === selectedSectionId);
                      })
                      .map(t => (
                      <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mt-8 pt-5 border-t border-white/5 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black hover:from-indigo-500 hover:to-blue-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : currentCell.scheduleId ? 'حفظ التعديلات' : 'اعتماد الحصة'}
                  </button>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="flex-1 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#02040a] text-slate-300 font-black border border-white/10 hover:bg-white/5 hover:text-white transition-all shadow-inner active:scale-95 text-sm"
                    >
                      إلغاء
                    </button>
                  </Dialog.Close>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
      {/* 🚀 ستايل الـ Scrollbar المطابق للثيم الداكن الفخم */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
