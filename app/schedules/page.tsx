'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, Plus, Trash2, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSchedulesSystem, type ScheduleEntry } from '@/hooks/useSchedulesSystem';

const DAYS = [{ id: 1, name: 'الأحد' }, { id: 2, name: 'الإثنين' }, { id: 3, name: 'الثلاثاء' }, { id: 4, name: 'الأربعاء' }, { id: 5, name: 'الخميس' }];

export default function SchedulesPage() {
  const { fetchInitialScheduleData, fetchSchedules, saveSchedule, deleteSchedule, loading } = useSchedulesSystem();
  
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{day: number, period: number} | null>(null);
  const [form, setForm] = useState({ subject_id: '', teacher_id: '' });

  useEffect(() => {
    fetchInitialScheduleData().then(data => {
      setSections(data.sections);
      setSubjects(data.subjects);
      setTeachers(data.teachers);
      setPeriods(data.periods);
    });
  }, [fetchInitialScheduleData]);

  const loadCurrentSchedules = useCallback(async () => {
    if (selectedSection) {
      const data = await fetchSchedules({ sectionId: selectedSection });
      setSchedules(data);
    }
  }, [selectedSection, fetchSchedules]);

  useEffect(() => { loadCurrentSchedules(); }, [loadCurrentSchedules]);

  const handleSave = async () => {
    if (!editingSlot || !selectedSection || !form.subject_id || !form.teacher_id) return;
    try {
      await saveSchedule({
        day_of_week: editingSlot.day,
        period: editingSlot.period,
        section_id: selectedSection,
        subject_id: form.subject_id,
        teacher_id: form.teacher_id,
      });
      loadCurrentSchedules();
      setIsModalOpen(false);
    } catch (e) { alert("حدث خطأ أثناء الحفظ."); }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 px-4 md:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">إدارة الجداول الدراسية</h1>
            <p className="text-slate-500 mt-2 font-medium">توزيع الحصص على الفصول والمواد</p>
          </div>
          <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full md:w-80 h-14 bg-white rounded-2xl px-5 font-bold shadow-sm ring-1 ring-slate-200">
            <option value="">-- اختر الفصل --</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
          </select>
        </div>

        {selectedSection ? (
          <div className="bg-white rounded-[40px] shadow-2xl border border-white overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="p-8 text-xs font-black text-slate-400 w-32">اليوم</th>
                  {periods.map(p => (
                    <th key={p.id} className="p-6 text-center min-w-[180px]">
                      <span className="text-sm font-black text-slate-900 block">الحصة {p.period_number}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.id}>
                    <td className="p-8 font-black text-slate-900 bg-slate-50/30 text-center">{day.name}</td>
                    {periods.map(period => {
                      const cell = schedules.find(s => s.day_of_week === day.id && s.period === period.period_number);
                      return (
                        <td key={period.id} className="p-3">
                          {cell ? (
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative group">
                              <button onClick={() => { deleteSchedule(cell.id!).then(loadCurrentSchedules); }} className="absolute -top-2 -left-2 h-8 w-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm transition-all"><Trash2 size={14} /></button>
                              <div className="cursor-pointer" onClick={() => { setEditingSlot({day: day.id, period: period.period_number}); setForm({subject_id: cell.subject_id, teacher_id: cell.teacher_id}); setIsModalOpen(true); }}>
                                <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">{cell.subjects?.name}</p>
                                <p className="text-xs font-bold text-slate-600 truncate">{Array.isArray(cell.teachers?.users) ? cell.teachers?.users[0]?.full_name : (cell.teachers?.users as any)?.full_name}</p>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingSlot({day: day.id, period: period.period_number}); setForm({subject_id: '', teacher_id: ''}); setIsModalOpen(true); }} className="w-full h-24 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 hover:bg-indigo-50/30 transition-all"><Plus size={20} /></button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-20 text-center bg-white rounded-[40px] shadow-xl text-slate-400 font-bold">يرجى اختيار فصل دراسي</div>}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
               <h3 className="text-xl font-black mb-6">تعديل الحصة</h3>
               <div className="space-y-4">
                  <select value={form.subject_id} onChange={(e) => setForm({...form, subject_id: e.target.value})} className="w-full h-12 bg-slate-50 rounded-xl px-4 font-bold ring-1 ring-slate-100">
                    <option value="">اختر المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={form.teacher_id} onChange={(e) => setForm({...form, teacher_id: e.target.value})} className="w-full h-12 bg-slate-50 rounded-xl px-4 font-bold ring-1 ring-slate-100">
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.users?.[0]?.full_name}</option>)}
                  </select>
                  <button onClick={handleSave} className="w-full h-14 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all mt-4">حفظ</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

