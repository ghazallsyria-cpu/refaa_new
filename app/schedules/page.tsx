'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Plus, Trash2, X, Edit2, AlertCircle, Search } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

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
  const [sections, setSections] = useState<Section[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]); // New state
  const [loading, setLoading] = useState(true);
  
  // Modal Data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Current Cell State
  const [currentCell, setCurrentCell] = useState<{
    day: number;
    period: number;
    scheduleId?: string;
    subjectId?: string;
    teacherId?: string;
  }>({ day: 0, period: 1 });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSchedules(selectedSectionId);
    } else {
      setSchedules([]);
    }
  }, [selectedSectionId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [sectionsRes, subjectsRes, teachersRes, assignmentsRes, periodsRes] = await Promise.all([
        supabase.from('sections').select('id, name, classes(name)').order('name'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('teachers').select('id, users(full_name)'),
        supabase.from('teacher_sections').select('teacher_id, section_id, subject_id'),
        supabase.from('class_periods').select('*').order('period_number')
      ]);

      if (sectionsRes.data) setSections((sectionsRes.data as unknown) as Section[]);
      if (subjectsRes.data) setSubjects((subjectsRes.data as unknown) as Subject[]);
      if (teachersRes.data) setTeachers((teachersRes.data as unknown) as Teacher[]);
      if (assignmentsRes.data) setTeacherAssignments(assignmentsRes.data);
      if (periodsRes.data) setPeriods(periodsRes.data);
      
      if (sectionsRes.data && sectionsRes.data.length > 0) {
        setSelectedSectionId(sectionsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (sectionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          section_id,
          subject_id,
          teacher_id,
          day_of_week,
          period,
          subjects (name),
          teachers (users (full_name))
        `)
        .eq('section_id', sectionId);

      if (error) throw error;
      setSchedules((data as unknown) as Schedule[] || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // Update
        const { error } = await supabase
          .from('schedules')
          .update(payload)
          .eq('id', currentCell.scheduleId);
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('المعلم لديه حصة أخرى في نفس الوقت');
          }
          throw error;
        }
      } else {
        // Insert
        const { error } = await supabase
          .from('schedules')
          .insert([payload]);
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            throw new Error('المعلم لديه حصة أخرى في نفس الوقت');
          }
          throw error;
        }
      }

      await fetchSchedules(selectedSectionId);
      setIsModalOpen(false);
      showNotification('success', 'تم حفظ الحصة بنجاح');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      showNotification('error', error.message || 'حدث خطأ أثناء حفظ الحصة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleToDelete);
      if (error) throw error;
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

  return (
    <div className="space-y-6 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="font-medium">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={!!scheduleToDelete} onOpenChange={(open) => !open && setScheduleToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                تأكيد الحذف
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <p className="text-slate-600 mb-6">هل أنت متأكد من حذف هذه الحصة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  إلغاء
                </button>
              </Dialog.Close>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                تأكيد الحذف
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الجدول الدراسي</h1>
          <p className="text-slate-500">إدارة الجداول الدراسية للفصول والشعب</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
            اختر الشعبة:
          </label>
          <select
            className="block w-full sm:w-64 rounded-md border-0 py-2 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={loading && sections.length === 0}
          >
            {sections.length === 0 ? (
              <option value="">لا توجد شعب مسجلة</option>
            ) : (
              sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.classes?.name} - {section.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : !selectedSectionId ? (
          <div className="text-center py-20">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500">الرجاء اختيار الشعبة لعرض الجدول الدراسي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 w-32 bg-slate-100">
                    اليوم / الحصة
                  </th>
                  {periods.map(period => (
                    <th key={period.id} scope="col" className="py-3.5 px-4 text-center text-sm font-semibold text-slate-900 border-l border-slate-200 min-w-[140px]">
                      الحصة {period.period_number}<br/>
                      <span className="text-xs font-normal text-slate-500">{period.start_time.slice(0,5)} - {period.end_time.slice(0,5)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {DAYS.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap py-4 px-4 text-sm font-bold text-slate-900 border-l border-slate-200 text-center bg-slate-50">
                      {day.name}
                    </td>
                    {periods.map(period => {
                      const cellData = getCellData(day.id, period.period_number);
                      return (
                        <td 
                          key={`${day.id}-${period.period_number}`} 
                          className="relative p-2 border-l border-slate-200 h-24 align-top group cursor-pointer hover:bg-indigo-50/50 transition-colors"
                          onClick={() => openCellModal(day.id, period.period_number, cellData)}
                        >
                          {cellData ? (
                            <div className="h-full flex flex-col justify-between bg-indigo-50 rounded-md p-2 border border-indigo-100">
                              <div>
                                <div className="font-bold text-indigo-900 text-sm truncate" title={cellData.subjects?.name}>
                                  {cellData.subjects?.name}
                                </div>
                                <div className="text-xs text-indigo-600 mt-1 truncate" title={cellData.teachers?.users?.full_name}>
                                  أ. {cellData.teachers?.users?.full_name}
                                </div>
                              </div>
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setScheduleToDelete(cellData.id);
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="حذف الحصة"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 transition-all group-hover:bg-indigo-50/50 group-hover:border-indigo-200">
                              <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-3 w-3" /> إضافة
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

      {/* Add/Edit Schedule Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-white p-6 shadow-lg focus:outline-none" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {currentCell.scheduleId ? 'تعديل الحصة' : 'إضافة حصة جديدة'}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-slate-500">
                <X className="h-5 w-5" />
              </Dialog.Close>
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
                        return teacherAssignments.some(a => a.subject_id === s.id && a.teacher_id === currentCell.teacherId && a.section_id === selectedSectionId);
                      }
                      return teacherAssignments.some(a => a.subject_id === s.id && a.section_id === selectedSectionId);
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
                        return teacherAssignments.some(a => a.teacher_id === t.id && a.subject_id === currentCell.subjectId && a.section_id === selectedSectionId);
                      }
                      return teacherAssignments.some(a => a.teacher_id === t.id && a.section_id === selectedSectionId);
                    })
                    .map(t => (
                    <option key={t.id} value={t.id}>{t.users?.full_name}</option>
                  ))}
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
