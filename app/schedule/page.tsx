'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle } from 'lucide-react';
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

// دالة مساعدة لفك التغليف الآمن للبيانات القادمة من قاعدة البيانات (كائن أو مصفوفة)
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
  const [isSwapping, setIsSwapping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    
    try {
      const conflicts = await checkConflicts(selectedSlot.day, selectedSlot.period, formData.teacher_id, formData.section_id, editingId || undefined);

      if (conflicts.length > 0) {
        const tConflict = conflicts.find(c => c.teacher_id === formData.teacher_id);
        if (tConflict) {
          const conflictData = tConflict as any; // تجاوز فحص النوع الصارم هنا
          const section = safeObj(conflictData.sections);
          const subject = safeObj(conflictData.subjects);
          const className = safeObj(section?.classes)?.name;
          alert(`تضارب: المعلم لديه حصة (${subject?.name}) مع فصل (${className} - ${section?.name}) في هذا الوقت.`);
          return;
        }
        
        const sConflict = conflicts.find(c => c.section_id === formData.section_id);
        if (sConflict) {
          const conflictData = sConflict as any; // تجاوز فحص النوع الصارم هنا
          const teacher = safeObj(conflictData.teachers);
          const subject = safeObj(conflictData.subjects);
          const teacherName = safeObj(teacher?.users)?.full_name || 'غير معروف';
          const subjectName = subject?.name || 'مادة غير معروفة';

          alert(`تضارب: هذا الفصل لديه حصة (${subjectName}) مع المعلم (${teacherName}) في هذا الوقت.`);
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
          filters.teacher_id = selectedId;
        } else {
          filters.section_id = selectedId;
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

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .print-table th, .print-table td {
            border: 1px solid black !important;
            padding: 4px !important;
            text-align: center !important;
            vertical-align: middle !important;
            word-wrap: break-word !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-yellow-100 p-4 rounded-lg text-sm text-yellow-800 no-print">
          <p className="font-bold">Debug Info:</p>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>Email: {user?.email || 'غير مسجل'}</p>
          <p>Role: {authRole || 'بدون دور'}</p>
          <p>إذا كنت مديراً ولا تظهر خيارات الإدارة، يرجى التأكد من دورك في قاعدة البيانات أو التواصل مع المطور.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي'}
          </h1>
          <p className="text-slate-500">
            {authRole === 'teacher' 
              ? 'عرض حصصك الدراسية الأسبوعية' 
              : 'عرض الجداول الدراسية للمعلمين والفصول'}
          </p>
        </div>
        <button 
          onClick={handlePrint}
          className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          <Printer className="mr-2 h-4 w-4 ml-2" />
          طباعة الجدول
        </button>
      </div>

      {isAdmin && authRole !== 'teacher' && swappingFrom && (
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-pulse sticky top-4 z-40 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">وضع تبديل الحصص نشط</p>
              <p className="text-xs text-indigo-100">
                أنت تقوم بنقل حصة: <span className="font-bold underline">{safeObj(swappingFrom.subjects)?.name}</span> ({safeObj(safeObj(swappingFrom.teachers)?.users)?.full_name})
                <br />
                انقر على أي خانة أخرى (فارغة أو مشغولة) لإتمام التبديل.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSwappingFrom(null)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            إلغاء التبديل
          </button>
        </div>
      )}

      {isAdmin && authRole !== 'teacher' && copiedLesson && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between sticky top-4 z-40 no-print mt-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">تم نسخ الحصة</p>
              <p className="text-xs text-emerald-100">
                الحصة المنسوخة: <span className="font-bold underline">{safeObj(copiedLesson.subjects)?.name}</span> ({safeObj(safeObj(copiedLesson.teachers)?.users)?.full_name})
                <br />
                انقر على أي خانة فارغة للصق هذه الحصة.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setCopiedLesson(null)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            مسح النسخ
          </button>
        </div>
      )}

      {isAdmin && authRole !== 'teacher' && (
        <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => {
                  setViewType('teacher');
                  if (teachers.length > 0) setSelectedId(teachers[0].id);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                  viewType === 'teacher' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <User className="inline-block w-4 h-4 ml-2" />
                جدول المعلمين
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewType('section');
                  if (sections.length > 0) setSelectedId(sections[0].id);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border-y border-l ${
                  viewType === 'section' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="inline-block w-4 h-4 ml-2" />
                جدول الفصول
              </button>
            </div>

            <div className="flex-1 w-full sm:max-w-xs">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="">-- اختر {viewType === 'teacher' ? 'المعلم' : 'الفصل'} --</option>
                {viewType === 'teacher' ? (
                  teachers.map(t => (
                    <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name || 'معلم غير معروف'}</option>
                  ))
                ) : (
                  sections.map(s => (
                    <option key={s.id} value={s.id}>{safeObj(s.classes)?.name} - {s.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="showAll" 
                checked={showAllSchedules} 
                onChange={(e) => setShowAllSchedules(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="showAll" className="text-sm font-medium text-slate-700">عرض جميع الحصص (للمدير)</label>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3 text-sm text-slate-700">
              <Clock className="h-5 w-5 text-indigo-500" />
              <div>
                <span className="font-semibold">{DAYS.find(d => d.id === currentCell.day)?.name}</span>
                <span className="mx-2">-</span>
                <span>الحصة {currentCell.period}</span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المادة الدراسية</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentCell.subjectId || ''}
                  onChange={(e) => setCurrentCell({...currentCell, subjectId: e.target.value})}
                >
                  <option value="">اختر المادة</option>
                  {subjects
                    .filter(s => {
                      if (currentCell.teacherId) {
                        return teacherAssignments.some(a => String(a.subject_id) === String(s.id) && String(a.teacher_id) === String(currentCell.teacherId) && String(a.section_id) === String(selectedSectionId));
                      }
                      return teacherAssignments.some(a => String(a.subject_id) === String(s.id) && String(a.section_id) === String(selectedSectionId));
                    })
                    .map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المعلم</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={currentCell.teacherId || ''}
                  onChange={(e) => setCurrentCell({...currentCell, teacherId: e.target.value})}
                >
                  <option value="">اختر المعلم</option>
                  {teachers
                    .filter(t => {
                      if (currentCell.subjectId) {
                        return teacherAssignments.some(a => String(a.teacher_id) === String(t.id) && String(a.subject_id) === String(currentCell.subjectId) && String(a.section_id) === String(selectedSectionId));
                      }
                      return teacherAssignments.some(a => String(a.teacher_id) === String(t.id) && String(a.section_id) === String(selectedSectionId));
                    })
                    .map(t => {
                      const safeUser = safeObj(t.users);
                      return (
                        <option key={t.id} value={t.id}>{safeUser?.full_name || 'غير محدد'}</option>
                      );
                    })}
                </select>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحصة'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


