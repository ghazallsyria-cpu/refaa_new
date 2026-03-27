'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Printer, User, Users, Info, X, Plus, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSchedulesSystem } from '@/hooks/useSchedulesSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

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
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; period: number } | null>(null);
  const [formData, setFormData] = useState({ teacher_id: '', section_id: '', subject_id: '' });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [copiedLesson, setCopiedLesson] = useState<any | null>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [swappingFrom, setSwappingFrom] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    fetchInitialScheduleData,
    fetchStudentSection,
    fetchSchedules: fetchSchedulesData,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    checkConflicts,
    swapSchedules,
    notifyScheduleChange,
  } = useSchedulesSystem();

  const fetchFilters = useCallback(async () => {
    if (isChecking) return;

    let role = authRole;

    setIsAdmin(role === 'admin' || role === 'management');

    const data = await fetchInitialScheduleData();

    setTeachers(data.teachers || []);
    setSections(data.sections || []);
    setSubjects(data.subjects || []);
    setAssignments(data.assignments || []);
    setPeriods(data.periods || []);

    if (role === 'teacher' && user) {
      setSelectedId(user.id);
      setViewType('teacher');
      setShowAllSchedules(false);
    }

    if (role === 'student' && user) {
      const sectionId = await fetchStudentSection(user.id);
      if (sectionId) {
        setSelectedId(sectionId);
        setViewType('section');
        setShowAllSchedules(false);
      }
    }
  }, [authRole, user, isChecking, fetchInitialScheduleData, fetchStudentSection]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);

    try {
      const filters: any = {};

      if (!(isAdmin && showAllSchedules)) {
        if (viewType === 'teacher') filters.teacher_id = selectedId;
        if (viewType === 'section') filters.section_id = selectedId;
      }

      const data = await fetchSchedulesData(filters);
      setScheduleData(data || []);
    } finally {
      setLoading(false);
    }
  }, [selectedId, viewType, isAdmin, showAllSchedules, fetchSchedulesData]);

  useEffect(() => {
    if (!selectedId && !showAllSchedules) return;
    fetchSchedule();
  }, [selectedId, viewType, showAllSchedules, fetchSchedule]);

  const handleAddSchedule = async () => {
    if (!selectedSlot) return;

    const conflicts = await checkConflicts(
      selectedSlot.day,
      selectedSlot.period,
      formData.teacher_id,
      formData.section_id,
      editingId || undefined
    );

    if (conflicts.length > 0) return;

    if (editingId) {
      await updateSchedule(editingId, formData);
    } else {
      await addSchedule({
        ...formData,
        day_of_week: selectedSlot.day,
        period: selectedSlot.period,
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ teacher_id: '', section_id: '', subject_id: '' });
    fetchSchedule();
  };

  const handleDeleteSchedule = async (id: string) => {
    await deleteSchedule(id);
    fetchSchedule();
  };

  const handleSwap = async (targetDay: number, targetPeriod: number, targetSlot: any) => {
    if (!swappingFrom || !isAdmin) return;

    await swapSchedules(
      swappingFrom.id,
      swappingFrom.day_of_week,
      swappingFrom.period,
      targetSlot?.id || null,
      targetDay,
      targetPeriod
    );

    setSwappingFrom(null);
    fetchSchedule();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between print:hidden">
        <h1 className="text-xl font-bold">الجدول الدراسي</h1>
        <button onClick={() => window.print()}>
          <Printer />
        </button>
      </div>

      {loading ? (
        <div>جاري التحميل...</div>
      ) : periods.length === 0 ? (
        <div>لا يوجد فترات</div>
      ) : !selectedId && !showAllSchedules ? (
        <div>اختر عنصر</div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          <div>اليوم</div>
          {periods.map((p) => (
            <div key={p.id}>حصة {p.period_number}</div>
          ))}

          {DAYS.map((day) => (
            <React.Fragment key={day.id}>
              <div>{day.name}</div>

              {periods.map((p) => {
                const slot = scheduleData.find(
                  (s) =>
                    s.day_of_week === day.id &&
                    s.period === p.period_number &&
                    (viewType === 'teacher'
                      ? s.teachers?.id === selectedId
                      : s.sections?.id === selectedId)
                );

                return (
                  <div
                    key={`${day.id}-${p.id}`}
                    className="border p-2 min-h-[80px]"
                    onClick={() => {
                      if (!slot && isAdmin) {
                        setSelectedSlot({ day: day.id, period: p.period_number });
                        setIsModalOpen(true);
                      }
                    }}
                  >
                    {slot ? (
                      <>
                        <div>{slot.subjects?.name}</div>
                        <div className="text-xs">
                          {viewType === 'teacher'
                            ? slot.sections?.name
                            : slot.teachers?.users?.full_name}
                        </div>

                        {isAdmin && (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSwappingFrom(slot);
                              }}
                            >
                              تبديل
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(slot.id);
                                setFormData({
                                  teacher_id: slot.teachers?.id || '',
                                  section_id: slot.sections?.id || '',
                                  subject_id: slot.subjects?.id || '',
                                });
                                setSelectedSlot({ day: day.id, period: p.period_number });
                                setIsModalOpen(true);
                              }}
                            >
                              تعديل
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(slot.id);
                              }}
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 w-[400px]">
            <select
              value={formData.teacher_id}
              onChange={(e) =>
                setFormData({ ...formData, teacher_id: e.target.value })
              }
            >
              <option value="">معلم</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.users?.full_name}
                </option>
              ))}
            </select>

            <select
              value={formData.section_id}
              onChange={(e) =>
                setFormData({ ...formData, section_id: e.target.value })
              }
            >
              <option value="">فصل</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={formData.subject_id}
              onChange={(e) =>
                setFormData({ ...formData, subject_id: e.target.value })
              }
            >
              <option value="">مادة</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button onClick={handleAddSchedule}>حفظ</button>
            <button onClick={() => setIsModalOpen(false)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
