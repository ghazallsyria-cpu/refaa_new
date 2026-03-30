'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * ملاحظة لبيئة التطوير:
 * هذه الاستيرادات تعتمد على هيكلة ملفات مشروعك. 
 * إذا واجهت مشكلة في المعاينة هنا، فهذا بسبب عدم توفر الملفات المحلية في بيئة العرض المتصفح.
 * الكود أدناه هو الكود الصحيح والجاهز لمشروعك الحقيقي.
 */
import { useAuth } from '@/context/auth-context';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';
import { supabase } from '@/lib/supabase';

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
  const [editingId, setEditingId] = useState<string | null>(null);

  const { 
    fetchInitialScheduleData, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    checkConflicts,
    swapSchedules
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking || !user) return;
    try {
      const isSystemAdmin = authRole === 'admin' || authRole === 'management';
      setIsAdmin(isSystemAdmin);

      const data = await fetchInitialScheduleData();
      setTeachers(data.teachers || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
      setAssignments(data.assignments || []);
      setPeriods(data.periods || []);

      if (authRole === 'teacher') {
        // جلب معرف ملف المعلم بدلاً من معرف الحساب (Auth ID)
        const { data: teacherProfile } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (teacherProfile) {
          setSelectedId(teacherProfile.id);
          setViewType('teacher');
          setShowAllSchedules(false);
        }
      } else if (authRole === 'student') {
        // جلب معرف الفصل المرتبط بالطالب عبر ملفه الشخصي
        const { data: studentProfile } = await supabase
          .from('students')
          .select('section_id')
          .eq('user_id', user.id)
          .single();

        if (studentProfile?.section_id) {
          setSelectedId(studentProfile.section_id);
          setViewType('section');
          setShowAllSchedules(false);
        }
      } else if (data.teachers?.length > 0) {
        setSelectedId(data.teachers[0].id);
      }
    } catch (err) {
      console.error("Error in fetchFilters:", err);
    }
  }, [fetchInitialScheduleData, user, authRole, isChecking]);

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

  const fetchSchedule = useCallback(async () => {
    if (!selectedId && !showAllSchedules) return;
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
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  const handleAddSchedule = async () => {
    if (!formData.teacher_id || !formData.section_id || !formData.subject_id || !selectedSlot) {
      alert('يرجى تعبئة جميع الحقول');
      return;
    }
    try {
      const conflicts = await checkConflicts(selectedSlot.day, selectedSlot.period, formData.teacher_id, formData.section_id, editingId || undefined);
      if (conflicts.length > 0) {
        alert('يوجد تضارب في هذا الوقت للمعلم أو الفصل المختار');
        return;
      }

      if (editingId) {
        await updateSchedule(editingId, { teacher_id: formData.teacher_id, section_id: formData.section_id, subject_id: formData.subject_id });
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
      fetchSchedule();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحصة؟')) return;
    try {
      await deleteSchedule(id);
      fetchSchedule();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; }
          .print-table th, .print-table td { border: 1px solid black !important; padding: 4px !important; text-align: center !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {authRole === 'teacher' ? 'جدولي الدراسي' : 'الجدول الدراسي'}
          </h1>
          <p className="text-slate-500">
            {authRole === 'teacher' ? 'استعراض حصصك الأسبوعية المسجلة' : 'استعراض وإدارة الجداول الدراسية'}
          </p>
        </div>
        <button onClick={handlePrint} className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors">
          <Printer className="mr-2 h-4 w-4 ml-2" />
          طباعة الجدول
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 print:hidden transition-all">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex rounded-md shadow-sm" role="group">
              <button 
                type="button" 
                onClick={() => { setViewType('teacher'); if (teachers.length > 0) setSelectedId(teachers[0].id); }} 
                className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${viewType === 'teacher' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                <User className="inline-block w-4 h-4 ml-2" /> جدول المعلمين
              </button>
              <button 
                type="button" 
                onClick={() => { setViewType('section'); if (sections.length > 0) setSelectedId(sections[0].id); }} 
                className={`px-4 py-2 text-sm font-medium rounded-l-lg border-y border-l ${viewType === 'section' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                <Users className="inline-block w-4 h-4 ml-2" /> جدول الفصول
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
                  teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)
                ) : (
                  sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)
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
              <label htmlFor="showAll" className="text-sm font-medium text-slate-700 select-none">عرض الكل</label>
            </div>
          </div>
        </div>
      )}

      {!selectedId && !showAllSchedules ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">يرجى اختيار معلم أو فصل لعرض الجدول</h3>
          <p className="text-slate-500 mt-1">إذا كنت طالباً أو معلماً، سيظهر جدولك تلقائياً عند اكتمال بيانات ملفك.</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">لم يتم إعداد أوقات الحصص</h3>
          <p className="text-slate-500 mt-1">يجب على الإدارة تحديد توقيت الحصص الدراسية أولاً.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px] p-6">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${periods.length + 1}, minmax(0, 1fr))` }}>
                <div className="h-14 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 font-bold text-xs text-slate-400 uppercase tracking-wider">اليوم / الحصة</div>
                {periods.map(p => (
                  <div key={p.id} className="h-14 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-900">الحصة {p.period_number}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}</span>
                  </div>
                ))}

                {DAYS.map((day) => (
                  <React.Fragment key={day.id}>
                    <div className="font-bold text-center p-4 bg-slate-50 rounded-lg flex items-center justify-center text-slate-700">
                      {day.name}
                    </div>
                    {periods.map(p => {
                      const slot = scheduleData.find(s => 
                        s.day_of_week === day.id && 
                        s.period === p.period_number && 
                        (viewType === 'teacher' ? s.teachers?.id === selectedId : s.sections?.id === selectedId)
                      );
                      
                      return (
                        <div 
                          key={`${day.id}-${p.period_number}`} 
                          className={`group p-3 border rounded-xl min-h-[110px] flex flex-col items-center justify-center text-center transition-all relative ${
                            slot 
                              ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md scale-[1.01]' 
                              : 'bg-slate-50/30 text-slate-300 border-dashed border-slate-200'
                          }`}
                        >
                          {slot ? (
                            <div className="w-full">
                              <span className="font-black text-xs block mb-1 drop-shadow-sm">{slot.subjects?.name}</span>
                              <span className="text-[9px] font-bold opacity-90 block leading-tight">
                                {viewType === 'teacher' 
                                  ? `${slot.sections?.classes?.name || ''} - ${slot.sections?.name || ''}` 
                                  : slot.teachers?.users?.full_name}
                              </span>
                              {isAdmin && (
                                <div className="mt-2 flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity no-print">
                                  <button 
                                    onClick={() => handleDeleteSchedule(slot.id)} 
                                    className="p-1.5 bg-red-500 hover:bg-red-600 rounded-md text-white shadow-sm"
                                    title="حذف"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            isAdmin && (
                              <button 
                                onClick={() => { setSelectedSlot({day: day.id, period: p.period_number}); setIsModalOpen(true); }} 
                                className="opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all no-print"
                                title="إضافة حصة"
                              >
                                <Plus className="w-5 h-5 text-slate-400" />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl space-y-5">
             <div className="flex justify-between items-center border-b pb-3">
               <h2 className="text-xl font-bold text-slate-800">{editingId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}</h2>
               <button onClick={() => {setIsModalOpen(false); setEditingId(null);}} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <X className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">الفصل الدراسي</label>
                 <select 
                   className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                   value={formData.section_id}
                   onChange={(e) => setFormData({...formData, section_id: e.target.value, subject_id: ''})}
                 >
                   <option value="">-- اختر الفصل --</option>
                   {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">المعلم</label>
                 <select 
                   className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                   value={formData.teacher_id}
                   onChange={(e) => setFormData({...formData, teacher_id: e.target.value, subject_id: ''})}
                 >
                   <option value="">-- اختر المعلم --</option>
                   {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.full_name}</option>)}
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">المادة</label>
                 <select 
                   className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400" 
                   value={formData.subject_id}
                   disabled={!formData.section_id || !formData.teacher_id}
                   onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                 >
                   <option value="">-- اختر المادة --</option>
                   {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
                 {(!formData.section_id || !formData.teacher_id) && (
                   <p className="text-[10px] text-slate-400 mt-1 italic">* يرجى اختيار الفصل والمعلم أولاً لعرض المواد المتاحة.</p>
                 )}
               </div>
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t">
               <button onClick={() => {setIsModalOpen(false); setEditingId(null);}} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium">إلغاء</button>
               <button onClick={handleAddSchedule} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-md shadow-indigo-200">حفظ الحصة</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
