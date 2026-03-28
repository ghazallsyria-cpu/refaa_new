'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, Plus, Trash2, LayoutGrid, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSchedulesSystem, type ScheduleEntry } from '@/hooks/useSchedulesSystem';

const DAYS = [
  { id: 1, name: 'الأحد' }, 
  { id: 2, name: 'الإثنين' }, 
  { id: 3, name: 'الثلاثاء' }, 
  { id: 4, name: 'الأربعاء' }, 
  { id: 5, name: 'الخميس' }
];

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

  // 1. تحميل البيانات الأولية عند فتح الصفحة
  useEffect(() => {
    let isMounted = true;
    const loadInit = async () => {
      const data = await fetchInitialScheduleData();
      if (isMounted) {
        setSections(data.sections || []);
        setSubjects(data.subjects || []);
        setTeachers(data.teachers || []);
        setPeriods(data.periods || []);
      }
    };
    loadInit();
    return () => { isMounted = false; };
  }, [fetchInitialScheduleData]);

  // 2. جلب الجدول عند تغيير الفصل الدراسي (تم الإصلاح لمنع Cascading Renders)
  useEffect(() => {
    if (!selectedSection) {
      setSchedules([]);
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      const data = await fetchSchedules({ sectionId: selectedSection });
      if (isMounted) {
        setSchedules(data || []);
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, [selectedSection, fetchSchedules]);

  const handleOpenModal = (day: number, period: number, existing?: any) => {
    setEditingSlot({ day, period });
    setForm({ 
      subject_id: existing?.subject_id || '', 
      teacher_id: existing?.teacher_id || '' 
    });
    setIsModalOpen(true);
  };

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
      
      // تحديث البيانات بعد الحفظ مباشرة
      const updated = await fetchSchedules({ sectionId: selectedSection });
      setSchedules(updated);
      setIsModalOpen(false);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      const updated = await fetchSchedules({ sectionId: selectedSection });
      setSchedules(updated);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 px-4 md:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">إدارة الجداول</h1>
            <p className="text-slate-500 mt-2 font-medium">نظام توزيع الحصص والمواد الدراسية</p>
          </div>
          
          <div className="w-full md:w-80 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase mr-2 tracking-widest">اختر الفصل الدراسي</label>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full h-14 bg-white border-0 ring-1 ring-slate-200 rounded-2xl px-5 font-bold focus:ring-2 focus:ring-indigo-600 transition-all shadow-sm"
            >
              <option value="">-- اختر الفصل --</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
            </select>
          </div>
        </div>

        {selectedSection ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] shadow-2xl border border-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 backdrop-blur-md">
                    <th className="p-8 text-xs font-black text-slate-400 uppercase w-32 border-b border-slate-100">اليوم</th>
                    {periods.map(p => (
                      <th key={p.id} className="p-6 text-center border-b border-slate-100 min-w-[200px]">
                        <span className="text-sm font-black text-slate-900 block mb-1">الحصة {p.period_number}</span>
                        <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{p.start_time?.substring(0, 5)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {DAYS.map((day) => (
                    <tr key={day.id} className="group">
                      <td className="p-8 font-black text-slate-900 bg-slate-50/30 text-center border-l border-slate-50">{day.name}</td>
                      {periods.map(period => {
                        const cell = schedules.find(s => s.day_of_week === day.id && s.period === period.period_number);
                        return (
                          <td key={period.id} className="p-3 align-top group-hover:bg-slate-50/50 transition-colors">
                            {cell ? (
                              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative group/card hover:shadow-xl hover:border-indigo-100 transition-all">
                                <button 
                                  onClick={() => handleDelete(cell.id!)}
                                  className="absolute -top-2 -left-2 h-8 w-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all shadow-sm z-10"
                                >
                                  <Trash2 size={14} />
                                </button>
                                <div className="space-y-3 cursor-pointer" onClick={() => handleOpenModal(day.id, period.period_number, cell)}>
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{cell.subjects?.name}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><User size={12}/></div>
                                    <p className="text-xs font-bold text-slate-600 line-clamp-1">
                                      {Array.isArray(cell.teachers?.users) ? cell.teachers?.users[0]?.full_name : (cell.teachers?.users as any)?.full_name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleOpenModal(day.id, period.period_number)}
                                className="w-full h-24 rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all"
                              >
                                <Plus size={20} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-xl space-y-4">
            <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto"><LayoutGrid size={40}/></div>
            <h2 className="text-2xl font-black text-slate-900">بانتظار اختيار الفصل</h2>
            <p className="text-slate-400 font-medium">اختر الفصل الدراسي من القائمة أعلاه للبدء في إدارة الحصص</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-white">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 italic">تعديل الحصة</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-1">المادة</label>
                  <select 
                    value={form.subject_id}
                    onChange={(e) => setForm({...form, subject_id: e.target.value})}
                    className="w-full h-12 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-xl px-4 font-bold"
                  >
                    <option value="">اختر المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mr-1">المعلم</label>
                  <select 
                    value={form.teacher_id}
                    onChange={(e) => setForm({...form, teacher_id: e.target.value})}
                    className="w-full h-12 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-xl px-4 font-bold"
                  >
                    <option value="">اختر المعلم</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {Array.isArray(t.users) ? t.users[0]?.full_name : t.users?.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full h-14 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

