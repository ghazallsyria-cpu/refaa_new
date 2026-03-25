'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock } from 'lucide-react';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

const PERIODS = [1, 2, 3, 4, 5];

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherSchedule();
  }, []);

  const fetchTeacherSchedule = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('schedules')
        .select('*, subjects(name), sections(name, classes(name))')
        .eq('teacher_id', user.id)
        .order('day_of_week')
        .order('period');

      if (error) throw error;
      setSchedule(data || []);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">جدولي الدراسي</h1>
          <p className="text-slate-500 mt-2 font-medium">عرض كامل للحصص الدراسية المسندة إليك خلال الأسبوع</p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="pr-2 pl-4">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">العام الدراسي</div>
            <div className="text-sm font-bold text-slate-700">2025 - 2026</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] shadow-2xl border-white/40 overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-32 gap-4">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 border-4 border-indigo-600/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 font-bold animate-pulse">جاري تحميل جدولك الدراسي...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 backdrop-blur-md">
                  <th className="py-6 px-6 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-l border-slate-100/50 w-32 bg-slate-100/30">اليوم / الحصة</th>
                  {PERIODS.map(period => (
                    <th key={period} className="py-6 px-4 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-l border-slate-100/50">الحصة {period}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/30 backdrop-blur-sm">
                {DAYS.map((day) => (
                  <tr key={day.id} className="group hover:bg-white/50 transition-colors duration-300">
                    <td className="py-8 px-6 text-base font-black text-slate-700 border-l border-b border-slate-100/50 text-center bg-slate-50/30 group-hover:text-indigo-600 transition-colors">{day.name}</td>
                    {PERIODS.map(period => {
                      const cellData = getCellData(day.id, period);
                      return (
                        <td key={`${day.id}-${period}`} className="p-3 border-l border-b border-slate-100/50 h-32 min-w-[160px] align-top">
                          {cellData ? (
                            <div className="h-full flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-5 shadow-xl shadow-indigo-200/50 transform group-hover:scale-[1.02] transition-all duration-300 border border-white/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                              <div className="relative z-10">
                                <div className="font-black text-white text-base leading-tight mb-1">{cellData.subjects?.name}</div>
                                <div className="text-[11px] text-indigo-100 font-bold uppercase tracking-widest opacity-90">{cellData.sections?.classes?.name}</div>
                              </div>
                              <div className="relative z-10 flex items-center justify-between mt-2 pt-3 border-t border-white/20">
                                <span className="text-[11px] font-black text-white bg-white/20 px-3 py-1 rounded-xl backdrop-blur-sm">{cellData.sections?.name}</span>
                                <div className="flex items-center gap-1 text-white/60">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-bold">الحصة {period}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-100/30 group-hover:bg-slate-100/50 transition-all duration-300">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">فارغ</span>
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
    </div>
  );
}
