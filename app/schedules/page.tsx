'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Plus, Trash2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';

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
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  // ✅ FIX: إضافة updateSchedule
  const { 
    fetchInitialScheduleData, 
    fetchSchedules: fetchSchedulesData, 
    addSchedule, 
    updateSchedule,
    deleteSchedule: deleteScheduleAction 
  } = useSchedulesSystem();

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
    setLoading(true);
    try {
      const data = await fetchInitialScheduleData();
      setSections(data.sections as any);
      setSubjects(data.subjects as any);
      setTeachers(data.teachers as any);
      setTeacherAssignments(data.assignments);
      setPeriods(data.periods);

      if (data.sections?.length) {
        setSelectedSectionId(data.sections[0].id);
      }
    } catch {
      showNotification('error', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [fetchInitialScheduleData]);

  const fetchSchedules = useCallback(async (sectionId: string) => {
    setLoading(true);
    try {
      const data = await fetchSchedulesData({ section_id: sectionId }); // ✅ FIX
      setSchedules(data as any);
    } catch {
      showNotification('error', 'فشل تحميل الجدول');
    } finally {
      setLoading(false);
    }
  }, [fetchSchedulesData]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSchedules(selectedSectionId);
    }
  }, [selectedSectionId, fetchSchedules]);

  const openCellModal = (day: number, period: number, existing?: Schedule) => {
    if (!selectedSectionId) return;

    setCurrentCell({
      day,
      period,
      scheduleId: existing?.id,
      subjectId: existing?.subject_id || '',
      teacherId: existing?.teacher_id || '',
    });

    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCell.subjectId || !currentCell.teacherId) return;

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
      showNotification('success', 'تم الحفظ');
    } catch {
      showNotification('error', 'خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;

    await deleteScheduleAction(scheduleToDelete);
    await fetchSchedules(selectedSectionId);
    setScheduleToDelete(null);
  };

  const getCellData = (day: number, period: number) =>
    schedules.find(s => s.day_of_week === day && s.period === period);

  return (
    <div className="space-y-6">

      <select
        value={selectedSectionId}
        onChange={(e) => setSelectedSectionId(e.target.value)}
      >
        {sections.map(s => (
          <option key={s.id} value={s.id}>
            {s.classes?.name} - {s.name}
          </option>
        ))}
      </select>

      <table className="w-full">
        <thead>
          <tr>
            <th>اليوم</th>
            {periods.map(p => <th key={p.id}>حصة {p.period_number}</th>)}
          </tr>
        </thead>

        <tbody>
          {DAYS.map(day => (
            <tr key={day.id}>
              <td>{day.name}</td>

              {periods.map(p => {
                const cell = getCellData(day.id, p.period_number);

                return (
                  <td
                    key={p.id}
                    onClick={() => openCellModal(day.id, p.period_number, cell)}
                    className="border h-20 cursor-pointer"
                  >
                    {cell?.subjects?.name}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed inset-0 m-auto max-w-md bg-white p-6">

            <form onSubmit={handleSaveSchedule}>
              <select
                value={currentCell.subjectId || ''}
                onChange={(e) => setCurrentCell({...currentCell, subjectId: e.target.value})}
              >
                <option value="">مادة</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={currentCell.teacherId || ''}
                onChange={(e) => setCurrentCell({...currentCell, teacherId: e.target.value})}
              >
                <option value="">معلم</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.users.full_name}</option>
                ))}
              </select>

              <button type="submit">
                {isSubmitting ? '...' : 'حفظ'}
              </button>
            </form>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
