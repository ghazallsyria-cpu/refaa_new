'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
// تمت إضافة Clock هنا 👇
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle, Clock } from 'lucide-react';
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
          const conflictData = tConflict as any;
          const section = safeObj(conflictData.sections);
          const subject = safeObj(conflictData.subjects);
          const className = safeObj(section?.classes)?.name;
          alert(`تضارب: المعلم لديه حصة (${subject?.name}) مع فصل (${className} - ${section?.name}) في هذا الوقت.`);
          return;
        }
        
        const sConflict = conflicts.find(c => c.section_id === formData.section_id);
        if (sConflict) {
          const conflictData = sConflict as any;
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
                <span className="font-semibold">{DAYS.find(d => d.id === selectedSlot?.day)?.name}</span>
                <span className="mx-2">-</span>
                <span>الحصة {selectedSlot?.period}</span>
              </div>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المادة الدراسية</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900">المعلم</label>
                <select 
                  required
                  className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                >
                  <option value="">اختر المعلم</option>
                  {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{safeObj(t.users)?.full_name}</option>)}
                </select>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحصة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="hidden print:block text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">مدرسة الرفعة النموذجية</h2>
        <h3 className="text-xl text-slate-700 mt-2">
          {viewType === 'teacher' ? 'الجدول الدراسي للمعلم' : 'الجدول الدراسي للفصل'}
        </h3>
        <p className="text-lg font-medium mt-2">
          {viewType === 'teacher' 
            ? safeObj(teachers.find(t => t.id === selectedId)?.users)?.full_name 
            : safeObj(sections.find(s => s.id === selectedId)?.classes)?.name + ' - ' + sections.find(s => s.id === selectedId)?.name}
        </p>
      </div>

      {!selectedId && !showAllSchedules ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
          <div className="mx-auto h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">لا يوجد جدول متاح</h3>
          <p className="text-slate-500">
            {authRole === 'student' 
              ? 'لم يتم تعيينك في فصل دراسي بعد، أو لا يوجد جدول متاح لصفك.' 
              : 'يرجى اختيار معلم أو فصل لعرض الجدول الدراسي.'}
          </p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
          <div className="mx-auto h-24 w-24 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">لم يتم إعداد توقيت الحصص</h3>
          <p className="text-slate-500 mb-6">
            يجب على المدير إعداد توقيت الحصص (Lesson Timings) أولاً ليظهر الجدول.
          </p>
          {isAdmin && (
            <Link 
              href="/admin/periods"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              انتقل إلى إعداد توقيت الحصص
            </Link>
          )}
        </div>
      ) : (
        <React.Fragment>
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden print:shadow-none print:ring-0 print:border-0">
            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent print:hidden">
              <div className="min-w-[800px] p-6">
                <div 
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `minmax(120px, 1fr) repeat(${periods.length}, minmax(140px, 1.5fr))` }}
                >
                  <div className="h-14 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">اليوم / الحصة</span>
                  </div>
                  {periods.map(p => (
                    <div key={p.id} className="h-14 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-black text-slate-900">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {p.start_time ? String(p.start_time).substring(0, 5) : ''} - {p.end_time ? String(p.end_time).substring(0, 5) : ''}
                      </span>
                    </div>
                  ))}

                  {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500">
                      جاري تحميل الجدول...
                    </div>
                  ) : (
                    DAYS.map((day) => (
                      <React.Fragment key={day.id}>
                        <div className="font-bold text-center p-4 bg-slate-50 rounded-lg flex items-center justify-center">
                          {day.name}
                        </div>
                        {periods.map(p => {
                          const period = p.period_number;
                          
                          const slot = scheduleData.find(s => {
                            const isSameDay = String(s.day_of_week) === String(day.id);
                            const isSamePeriod = String(s.period) === String(period);
                            const t = safeObj(s.teachers);
                            const sec = safeObj(s.sections);
                            const isSameTarget = viewType === 'teacher' ? String(t?.id) === String(selectedId) : String(sec?.id) === String(selectedId);
                            return isSameDay && isSamePeriod && isSameTarget;
                          });

                          const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => {
                            const isSameDay = String(s.day_of_week) === String(day.id);
                            const isSamePeriod = String(s.period) === String(period);
                            const t = safeObj(s.teachers);
                            const sec = safeObj(s.sections);
                            const isSameTarget = viewType === 'teacher' ? String(t?.id) === String(selectedId) : String(sec?.id) === String(selectedId);
                            return isSameDay && isSamePeriod && !isSameTarget;
                          }) : [];

                          const isSwappingFromThisSlot = swappingFrom && others.find(o => o.id === swappingFrom.id);
                          const isCopiedFromThisSlot = copiedLesson && others.find(o => o.id === copiedLesson.id);
                          const displaySlot = slot || (isSwappingFromThisSlot ? swappingFrom : (isCopiedFromThisSlot ? copiedLesson : others[0]));

                          const safeSubj = safeObj(displaySlot?.subjects);
                          const safeTeacher = safeObj(displaySlot?.teachers);
                          const safeUser = safeObj(safeTeacher?.users);
                          const safeSection = safeObj(displaySlot?.sections);
                          const safeClass = safeObj(safeSection?.classes);

                          const subjectName = safeSubj?.name || 'بدون مادة';
                          const teacherName = safeUser?.full_name || 'غير محدد';
                          const sectionName = safeSection ? `${safeClass?.name || ''} - ${safeSection?.name || ''}` : 'غير محدد';

                          return (
                            <div key={`${day.id}-${period}`} className={`group p-3 border rounded-xl min-h-[110px] flex flex-col items-center justify-center text-center transition-all relative overflow-hidden
                              ${slot 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-200 border-transparent scale-[1.02] z-10' 
                                : displaySlot 
                                  ? 'bg-slate-100 border-slate-200 text-slate-400' 
                                  : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-300'
                              }
                              ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : ''} 
                              ${safeTeacher?.zoom_link ? 'cursor-pointer hover:brightness-110' : ''} 
                              ${swappingFrom?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-amber-500 bg-amber-50 z-20 scale-105 shadow-xl' : ''} 
                              ${copiedLesson?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-emerald-500 bg-emerald-50 z-20' : ''}`}
                              onClick={() => {
                                if (isAdmin) {
                                  if (swappingFrom) {
                                    if (swappingFrom.id === displaySlot?.id) {
                                      setSwappingFrom(null); 
                                    } else {
                                      handleSwap(day.id, period, displaySlot);
                                    }
                                  } else if (displaySlot) {
                                    // Empty
                                  } else {
                                    setFormData({ 
                                      teacher_id: viewType === 'teacher' ? selectedId : (safeObj(copiedLesson?.teachers)?.id || ''), 
                                      section_id: viewType === 'section' ? selectedId : (safeObj(copiedLesson?.sections)?.id || ''), 
                                      subject_id: safeObj(copiedLesson?.subjects)?.id || '' 
                                    });
                                    setSelectedSlot({day: day.id, period: period});
                                    setIsModalOpen(true);
                                  }
                                } else if (safeTeacher?.zoom_link) {
                                  window.open(safeTeacher.zoom_link, '_blank');
                                }
                              }}
                            >
                              {displaySlot ? (
                                <div className="w-full">
                                  <span className={`font-black text-sm block mb-1 ${slot ? 'text-white' : 'text-slate-500'}`}>
                                    {subjectName}
                                  </span>
                                  <div className={`text-[10px] font-bold uppercase tracking-wider ${slot ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {viewType === 'teacher' ? sectionName : teacherName}
                                  </div>
                                  {safeTeacher?.zoom_link && slot && (
                                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold text-white backdrop-blur-sm">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      رابط زوم
                                    </div>
                                  )}
                                  {isAdmin && (
                                    <div className="mt-3 flex flex-wrap justify-center gap-1 no-print opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        className={`text-[9px] font-bold px-2 py-1 rounded shadow-sm transition-all ${slot ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setCopiedLesson(displaySlot);
                                          alert('تم نسخ تفاصيل الحصة');
                                        }}
                                      >
                                        نسخ
                                      </button>
                                      <button 
                                        className={`text-[9px] font-bold px-2 py-1 rounded shadow-sm transition-all ${slot ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setSwappingFrom(displaySlot);
                                        }}
                                      >
                                        تبديل
                                      </button>
                                      <button 
                                        className={`text-[9px] font-bold px-2 py-1 rounded shadow-sm transition-all ${slot ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setEditingId(displaySlot.id);
                                          setFormData({ 
                                            teacher_id: safeTeacher?.id || '', 
                                            section_id: safeSection?.id || '', 
                                            subject_id: safeSubj?.id || '' 
                                          });
                                          setSelectedSlot({day: day.id, period: period});
                                          setIsModalOpen(true);
                                        }}
                                      >
                                        تعديل
                                      </button>
                                      <button 
                                        className={`text-[9px] font-bold px-2 py-1 rounded shadow-sm transition-all ${slot ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleDeleteSchedule(displaySlot.id); 
                                        }}
                                      >
                                        حذف
                                      </button>
                                    </div>
                                  )}
                                  {!slot && others.length > 1 && (
                                    <span className="text-[8px] text-slate-400 block mt-1">+{others.length - 1} أخرى</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-slate-300 text-xs font-medium">فارغ</span>
                                  {isAdmin && (
                                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus className="w-4 h-4" />
                                    </div>
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
          </div>

          <div className="hidden print:block p-4">
            <table className="print-table table-fixed w-full">
              <thead>
                <tr>
                  <th className="w-32">اليوم / الحصة</th>
                  {periods.map(p => <th key={p.id}>الحصة {p.period_number}</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.id}>
                    <td className="font-bold bg-slate-50">{day.name}</td>
                    {periods.map(p => {
                      const period = p.period_number;
                      const slot = scheduleData.find(s => {
                        const isSameDay = String(s.day_of_week) === String(day.id);
                        const isSamePeriod = String(s.period) === String(period);
                        const t = safeObj(s.teachers);
                        const sec = safeObj(s.sections);
                        const isSameTarget = viewType === 'teacher' ? String(t?.id) === String(selectedId) : String(sec?.id) === String(selectedId);
                        return isSameDay && isSamePeriod && isSameTarget;
                      });

                      const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => {
                        const isSameDay = String(s.day_of_week) === String(day.id);
                        const isSamePeriod = String(s.period) === String(period);
                        const t = safeObj(s.teachers);
                        const sec = safeObj(s.sections);
                        const isSameTarget = viewType === 'teacher' ? String(t?.id) === String(selectedId) : String(sec?.id) === String(selectedId);
                        return isSameDay && isSamePeriod && !isSameTarget;
                      }) : [];

                      const safeSubj = safeObj(slot?.subjects);
                      const safeTeacher = safeObj(slot?.teachers);
                      const safeUser = safeObj(safeTeacher?.users);
                      const safeSection = safeObj(slot?.sections);
                      const safeClass = safeObj(safeSection?.classes);

                      return (
                        <td key={p.id} className="h-28">
                          {slot ? (
                            <div className="flex flex-col items-center justify-center h-full gap-1">
                              <div className="font-bold text-sm text-indigo-800">{safeSubj?.name}</div>
                              <div className="text-[10px] text-slate-700">
                                {viewType === 'teacher' 
                                  ? `${safeClass?.name} - ${safeSection?.name}`
                                  : safeUser?.full_name}
                              </div>
                            </div>
                          ) : others.length > 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-60">
                              <span className="text-[8px] text-slate-500 mb-1">مشغول:</span>
                              {others.slice(0, 2).map(o => {
                                const oTeacher = safeObj(o.teachers);
                                const oUser = safeObj(oTeacher?.users);
                                const oSection = safeObj(o.sections);
                                return (
                                  <div key={o.id} className="text-[8px] leading-tight text-slate-600">
                                    {viewType === 'teacher' ? oSection?.name : oUser?.full_name}
                                  </div>
                                )
                              })}
                              {others.length > 2 && <span className="text-[7px] text-slate-400">+{others.length - 2}</span>}
                            </div>
                          ) : (
                            <div className="text-slate-200">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">منصة مدرستي الرقمية</p>
                <p className="text-[10px] text-slate-500 mt-1">نظام إدارة التعليم المتكامل</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400">تم استخراج هذا الجدول بتاريخ {new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}


