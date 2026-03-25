'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function SchedulePage() {
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

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserRole = null;
      if (user) {
        setUserEmail(user.email || null);
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        currentUserRole = profile?.role || null;
        setUserRole(currentUserRole);
        
        const isSystemAdmin = profile?.role === 'admin' || profile?.role === 'management';
        setIsAdmin(isSystemAdmin);
      } else {
        setIsAdmin(false);
      }

      const [teachersRes, sectionsRes, subjectsRes, assignmentsRes, periodsRes] = await Promise.all([
        supabase.from('teachers').select('id, specialization, users(full_name)'),
        supabase.from('sections').select('id, name, classes(name)'),
        supabase.from('subjects').select('id, name'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      if (teachersRes.data) setTeachers(teachersRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (periodsRes.data) setPeriods(periodsRes.data);

      if (currentUserRole === 'teacher' && user) {
        setSelectedId(user.id);
        setViewType('teacher');
        setShowAllSchedules(false);
      } else if (currentUserRole === 'student' && user) {
        const { data: studentData } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .single();
        
        if (studentData?.section_id) {
          setSelectedId(studentData.section_id);
          setViewType('section');
          setShowAllSchedules(false);
        }
      } else if (teachersRes.data?.[0]) {
        setSelectedId(teachersRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // تصفية الفصول المتاحة بناءً على المعلم المختار (في حال عرض جدول المعلم)
  const availableSections = (viewType === 'teacher' && selectedId)
    ? sections.filter(s => assignments.some(a => a.teacher_id === selectedId && a.section_id === s.id))
    : sections;

  // تصفية المعلمين المتاحين بناءً على الفصل المختار (في حال عرض جدول الفصل)
  const modalAvailableTeachers = (viewType === 'section' && selectedId)
    ? teachers.filter(t => assignments.some(a => a.section_id === selectedId && a.teacher_id === t.id))
    : (formData.section_id 
        ? teachers.filter(t => assignments.some(a => a.section_id === formData.section_id && a.teacher_id === t.id))
        : teachers);

  // تصفية المواد بناءً على الفصل والمعلم المختارين في النموذج
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

      // Conflict checks for the swap
      // We need to check if swappingFrom's teacher/section has a conflict at (targetDay, targetPeriod)
      // and if targetSlot's teacher/section has a conflict at (sourceDay, sourcePeriod)
      
      const { data: conflicts } = await supabase
        .from('schedules')
        .select('id, teacher_id, section_id, day_of_week, period')
        .or(`day_of_week.eq.${targetDay},day_of_week.eq.${sourceDay}`)
        .filter('period', 'in', `(${targetPeriod},${sourcePeriod})`);

      if (conflicts) {
        // Check for conflicts at target slot for swappingFrom's teacher/section
        const targetConflicts = conflicts.filter(c => 
          c.day_of_week === targetDay && 
          c.period === targetPeriod && 
          c.id !== targetSlot?.id && 
          (c.teacher_id === swappingFrom.teacher_id || c.section_id === swappingFrom.section_id)
        );

        if (targetConflicts.length > 0) {
          alert('تعذر التبديل: يوجد تعارض في الحصة المستهدفة للمعلم أو الفصل');
          setLoading(false);
          return;
        }

        // If targetSlot exists, check for conflicts at source slot
        if (targetSlot) {
          const sourceConflicts = conflicts.filter(c => 
            c.day_of_week === sourceDay && 
            c.period === sourcePeriod && 
            c.id !== swappingFrom.id && 
            (c.teacher_id === targetSlot.teacher_id || c.section_id === targetSlot.section_id)
          );

          if (sourceConflicts.length > 0) {
            alert('تعذر التبديل: يوجد تعارض في الحصة الأصلية للمعلم أو الفصل المنقول');
            setLoading(false);
            return;
          }
        }
      }

      if (targetSlot) {
        // Swap two lessons
        const { error: err1 } = await supabase
          .from('schedules')
          .update({ day_of_week: sourceDay, period: sourcePeriod })
          .eq('id', targetSlot.id);
        
        if (err1) throw err1;

        const { error: err2 } = await supabase
          .from('schedules')
          .update({ day_of_week: targetDay, period: targetPeriod })
          .eq('id', swappingFrom.id);
        
        if (err2) throw err2;
      } else {
        // Move to empty slot
        const { error } = await supabase
          .from('schedules')
          .update({ day_of_week: targetDay, period: targetPeriod })
          .eq('id', swappingFrom.id);
        
        if (error) throw error;
      }

      // Send notifications
      const notifyUsers = async (lesson: any, newDay: number, newPeriod: number) => {
        const dayName = DAYS.find(d => d.id === newDay)?.name || '';
        const msg = `تم تغيير موعد حصة ${lesson.subjects?.name} إلى يوم ${dayName} الحصة ${newPeriod}`;
        
        // Notify teacher
        await supabase.from('notifications').insert({
          user_id: lesson.teacher_id,
          title: 'تحديث الجدول الدراسي',
          content: msg,
          type: 'system'
        });

        // Notify students in the section
        const { data: students } = await supabase.from('students').select('id').eq('section_id', lesson.section_id);
        if (students) {
          const studentNotifs = students.map(s => ({
            user_id: s.id,
            title: 'تحديث الجدول الدراسي',
            content: msg,
            type: 'system'
          }));
          await supabase.from('notifications').insert(studentNotifs);
        }
      };

      await notifyUsers(swappingFrom, targetDay, targetPeriod);
      if (targetSlot) {
        await notifyUsers(targetSlot, sourceDay, sourcePeriod);
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
      // 1. التحقق من وجود تضارب
      // تضارب للمعلم
      let teacherQuery = supabase
        .from('schedules')
        .select('id, sections(name, classes(name)), subjects(name)')
        .eq('day_of_week', selectedSlot.day)
        .eq('period', selectedSlot.period)
        .eq('teacher_id', formData.teacher_id);
      
      if (editingId) {
        teacherQuery = teacherQuery.neq('id', editingId);
      }
      
      const { data: teacherConflict, error: tError } = await teacherQuery.maybeSingle();

      if (tError) throw tError;

      // تضارب للفصل
      let sectionQuery = supabase
        .from('schedules')
        .select('id, teachers(users(full_name)), subjects(name)')
        .eq('day_of_week', selectedSlot.day)
        .eq('period', selectedSlot.period)
        .eq('section_id', formData.section_id);
      
      if (editingId) {
        sectionQuery = sectionQuery.neq('id', editingId);
      }

      const { data: sectionConflict, error: sError } = await sectionQuery.maybeSingle();

      if (sError) throw sError;

      if (teacherConflict) {
        const section = (Array.isArray(teacherConflict.sections) ? teacherConflict.sections[0] : teacherConflict.sections) as any;
        const subject = (Array.isArray(teacherConflict.subjects) ? teacherConflict.subjects[0] : teacherConflict.subjects) as any;
        const className = (section?.classes && Array.isArray(section.classes) ? section.classes[0]?.name : section?.classes?.name);
        alert(`تضارب: المعلم لديه حصة (${subject?.name}) مع فصل (${className} - ${section?.name}) في هذا الوقت.`);
        return;
      }

      if (sectionConflict) {
        const teacher = (Array.isArray(sectionConflict.teachers) ? sectionConflict.teachers[0] : sectionConflict.teachers) as any;
        const subject = (Array.isArray(sectionConflict.subjects) ? sectionConflict.subjects[0] : sectionConflict.subjects) as any;
        const teacherName = (teacher?.users && Array.isArray(teacher.users) ? teacher.users[0]?.full_name : teacher?.users?.full_name);
        alert(`تضارب: هذا الفصل لديه حصة (${subject?.name}) مع المعلم (${teacherName}) في هذا الوقت.`);
        return;
      }

      // 2. الإضافة أو التحديث إذا لم يوجد تضارب
      if (editingId) {
        const { error } = await supabase
          .from('schedules')
          .update({
            teacher_id: formData.teacher_id,
            section_id: formData.section_id,
            subject_id: formData.subject_id,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedules').insert({
          teacher_id: formData.teacher_id,
          section_id: formData.section_id,
          subject_id: formData.subject_id,
          day_of_week: selectedSlot.day,
          period: selectedSlot.period
        });
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ teacher_id: '', section_id: '', subject_id: '' });
      fetchSchedule(); // تحديث الجدول
    } catch (err) {
      console.error(err);
      alert(`حدث خطأ أثناء ${editingId ? 'تعديل' : 'إضافة'} الحصة`);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف الحصة');
    }
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('schedules').select(`
        id, day_of_week, period,
        teachers(id, users(full_name), zoom_link),
        sections(id, name, classes(name)),
        subjects(id, name)
      `);

      // If admin and showAllSchedules is true, fetch all to show occupancy
      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') {
          query = query.eq('teacher_id', selectedId);
        } else {
          query = query.eq('section_id', selectedId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      console.log('Fetched schedule data:', data);
      setScheduleData(data || []);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, isAdmin, showAllSchedules]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  const handlePrint = () => {
    window.print();
  };

  const groupedTeachers = teachers.reduce((acc, teacher) => {
    const spec = teacher.specialization || 'غير محدد';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(teacher);
    return acc;
  }, {} as Record<string, any[]>);

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
          .print-others-text {
            font-size: 8px !important;
            color: #444 !important;
            border-top: 1px dashed #ccc !important;
            margin-top: 2px !important;
            display: block !important;
          }
        }
      `}</style>
      {/* Debug Info */}
      {isAdmin && userRole !== 'teacher' && (
        <div className="bg-yellow-100 p-4 rounded-lg text-sm text-yellow-800 no-print">
          <p className="font-bold">Debug Info:</p>
          <p>isAdmin: {String(isAdmin)}</p>
          <p>Email: {userEmail || 'غير مسجل'}</p>
          <p>Role: {userRole || 'بدون دور'}</p>
          <p>إذا كنت مديراً ولا تظهر خيارات الإدارة، يرجى التأكد من دورك في قاعدة البيانات أو التواصل مع المطور.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {userRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي'}
          </h1>
          <p className="text-slate-500">
            {userRole === 'teacher' 
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

      {/* Swapping Indicator */}
      {isAdmin && userRole !== 'teacher' && swappingFrom && (
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-pulse sticky top-4 z-40 no-print">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">وضع تبديل الحصص نشط</p>
              <p className="text-xs text-indigo-100">
                أنت تقوم بنقل حصة: <span className="font-bold underline">{swappingFrom.subjects?.name}</span> ({swappingFrom.teachers?.users?.full_name})
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

      {/* Copied Lesson Indicator */}
      {isAdmin && userRole !== 'teacher' && copiedLesson && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between sticky top-4 z-40 no-print mt-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">تم نسخ الحصة</p>
              <p className="text-xs text-emerald-100">
                الحصة المنسوخة: <span className="font-bold underline">{copiedLesson.subjects?.name}</span> ({copiedLesson.teachers?.users?.full_name})
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

      {isAdmin && userRole !== 'teacher' && (
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
                    <option key={t.id} value={t.id}>{t.users?.full_name || 'معلم غير معروف'}</option>
                  ))
                ) : (
                  sections.map(s => (
                    <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>
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
            
            <div className="space-y-4">
              {viewType === 'teacher' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المعلم</label>
                  <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    {teachers.find(t => t.id === selectedId)?.users?.full_name}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الفصل</label>
                  <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    {sections.find(s => s.id === selectedId)?.classes?.name} - {sections.find(s => s.id === selectedId)?.name}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {viewType === 'teacher' ? 'الفصل' : 'المعلم'}
                </label>
                {viewType === 'teacher' ? (
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                    value={formData.section_id}
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value, subject_id: '' })}
                  >
                    <option value="">اختر الفصل</option>
                    {availableSections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                  </select>
                ) : (
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value, subject_id: '' })}
                  >
                    <option value="">اختر المعلم</option>
                    {modalAvailableTeachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" 
                  value={formData.subject_id}
                  disabled={!formData.section_id || !formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                >
                  <option value="">اختر المادة</option>
                  {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {(!formData.section_id || !formData.teacher_id) && <p className="text-[10px] text-slate-400 mt-1">يرجى اختيار {viewType === 'teacher' ? 'الفصل' : 'المعلم'} أولاً</p>}
                {formData.section_id && formData.teacher_id && availableSubjects.length === 0 && <p className="text-[10px] text-amber-600 mt-1">لا توجد مواد مسندة لهذا الربط في تعيينات المعلمين</p>}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>إلغاء</button>
              <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm" onClick={handleAddSchedule}>{editingId ? 'تحديث الحصة' : 'حفظ الحصة'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Header */}
      <div className="hidden print:block text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">مدرسة الرفعة النموذجية</h2>
        <h3 className="text-xl text-slate-700 mt-2">
          {viewType === 'teacher' ? 'الجدول الدراسي للمعلم' : 'الجدول الدراسي للفصل'}
        </h3>
        <p className="text-lg font-medium mt-2">
          {viewType === 'teacher' 
            ? teachers.find(t => t.id === selectedId)?.users?.full_name 
            : sections.find(s => s.id === selectedId)?.classes?.name + ' - ' + sections.find(s => s.id === selectedId)?.name}
        </p>
      </div>

      {!selectedId && !showAllSchedules ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
          <div className="mx-auto h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">لا يوجد جدول متاح</h3>
          <p className="text-slate-500">
            {userRole === 'student' 
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
        <>
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden print:shadow-none print:ring-0 print:border-0">
            <div className="overflow-x-auto print:hidden">
              <div className="min-w-[800px] p-6">
                <div className="grid grid-cols-6 gap-3">
                  {/* Header Row */}
                  <div className="h-14 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">اليوم / الحصة</span>
                  </div>
                  {periods.map(p => (
                    <div key={p.id} className="h-14 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-black text-slate-900">الحصة {p.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}</span>
                    </div>
                  ))}

              {/* Body Rows */}
              {loading ? (
                <div className="col-span-6 py-20 text-center text-slate-500">
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
                      const slot = scheduleData.find(s => 
                        s.day_of_week === day.id && 
                        s.period === period && 
                        (viewType === 'teacher' ? s.teachers?.id === selectedId : s.sections?.id === selectedId)
                      );

                      const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                        s.day_of_week === day.id && 
                        s.period === period && 
                        (viewType === 'teacher' ? s.teachers?.id !== selectedId : s.sections?.id !== selectedId)
                      ) : [];

                      // Prioritize showing the swapping or copied lesson if it's in this slot
                      const isSwappingFromThisSlot = swappingFrom && others.find(o => o.id === swappingFrom.id);
                      const isCopiedFromThisSlot = copiedLesson && others.find(o => o.id === copiedLesson.id);
                      const displaySlot = slot || (isSwappingFromThisSlot ? swappingFrom : (isCopiedFromThisSlot ? copiedLesson : others[0]));

                      return (
                        <div key={`${day.id}-${period}`} className={`group p-3 border rounded-xl min-h-[110px] flex flex-col items-center justify-center text-center transition-all relative overflow-hidden
                          ${slot 
                            ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-200 border-transparent scale-[1.02] z-10' 
                            : displaySlot 
                              ? 'bg-slate-100 border-slate-200 text-slate-400' 
                              : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-300'
                          }
                          ${isAdmin ? 'cursor-pointer hover:ring-2 hover:ring-indigo-300' : ''} 
                          ${slot?.teachers?.zoom_link ? 'cursor-pointer hover:brightness-110' : ''} 
                          ${swappingFrom?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-amber-500 bg-amber-50 z-20 scale-105 shadow-xl' : ''} 
                          ${copiedLesson?.id === displaySlot?.id && displaySlot ? 'ring-4 ring-emerald-500 bg-emerald-50 z-20' : ''}`}
                          onClick={() => {
                            if (isAdmin) {
                              if (swappingFrom) {
                                if (swappingFrom.id === displaySlot?.id) {
                                  setSwappingFrom(null); // Cancel swap
                                } else {
                                  handleSwap(day.id, period, displaySlot);
                                }
                              } else if (displaySlot) {
                                // If admin clicks an occupied slot and not swapping, maybe they want to start swapping?
                                // Or we just let them use the button. Let's make the whole cell clickable for swap initiation if they want.
                                // But they might want to edit. For now, let's keep the buttons for explicit actions but allow swap completion via cell click.
                              } else {
                                setFormData({ 
                                  teacher_id: viewType === 'teacher' ? selectedId : (copiedLesson?.teachers?.id || ''), 
                                  section_id: viewType === 'section' ? selectedId : (copiedLesson?.sections?.id || ''), 
                                  subject_id: copiedLesson?.subjects?.id || '' 
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
                            <div className="w-full">
                              <span className={`font-black text-sm block mb-1 ${slot ? 'text-white' : 'text-slate-500'}`}>
                                {displaySlot.subjects?.name}
                              </span>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${slot ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {viewType === 'teacher' ? (
                                  `${displaySlot.sections?.classes?.name} - ${displaySlot.sections?.name}`
                                ) : (
                                  displaySlot.teachers?.users?.full_name
                                )}
                              </div>
                              {displaySlot.teachers?.zoom_link && slot && (
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
                                        teacher_id: displaySlot.teachers?.id || '', 
                                        section_id: displaySlot.sections?.id || '', 
                                        subject_id: displaySlot.subjects?.id || '' 
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

        {/* Vertical Table for Print (Days as Rows) */}
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
                    const slot = scheduleData.find(s => 
                      s.day_of_week === day.id && 
                      s.period === period && 
                      (viewType === 'teacher' ? s.teachers?.id === selectedId : s.sections?.id === selectedId)
                    );

                    const others = (isAdmin && showAllSchedules) ? scheduleData.filter(s => 
                      s.day_of_week === day.id && 
                      s.period === period && 
                      (viewType === 'teacher' ? s.teachers?.id !== selectedId : s.sections?.id !== selectedId)
                    ) : [];

                    return (
                      <td key={p.id} className="h-28">
                        {slot ? (
                          <div className="flex flex-col items-center justify-center h-full gap-1">
                            <div className="font-bold text-sm text-indigo-800">{slot.subjects?.name}</div>
                            <div className="text-[10px] text-slate-700">
                              {viewType === 'teacher' 
                                ? `${slot.sections?.classes?.name} - ${slot.sections?.name}`
                                : slot.teachers?.users?.full_name}
                            </div>
                          </div>
                        ) : others.length > 0 ? (
                          <div className="flex flex-col items-center justify-center h-full opacity-60">
                            <span className="text-[8px] text-slate-500 mb-1">مشغول:</span>
                            {others.slice(0, 2).map(o => (
                              <div key={o.id} className="text-[8px] leading-tight text-slate-600">
                                {viewType === 'teacher' ? o.sections?.name : o.teachers?.users?.full_name}
                              </div>
                            ))}
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
          
          {/* Print Footer */}
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
        </>
      )}
    </div>
  );
}
