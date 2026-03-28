'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, Video, GraduationCap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardSystem, type StudentScheduleData } from '@/hooks/useDashboardSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function StudentSchedulePage() {
  const { fetchStudentSchedule: fetchScheduleData } = useDashboardSystem();
  
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await fetchScheduleData();
      if (data) {
        setStudentInfo(data.student);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData]);

  useEffect(() => {
    if (mounted) fetchData();
  }, [fetchData, mounted]);

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12 max-w-7xl mx-auto px-4" dir="rtl">
      {/* Header */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">جدولي الدراسي</h1>
            <p className="text-slate-500 mt-2 font-bold flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-500" />
              <span>{studentInfo?.sections?.classes?.name} - {studentInfo?.sections?.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="py-8 px-6 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l border-slate-200 w-32">اليوم / الحصة</th>
                {periods.map(period => (
                  <th key={period.id} className="py-6 px-4 text-center border-l border-slate-100">
                    <span className="text-sm font-black text-slate-900 block mb-1">الحصة {period.period_number}</span>
                    <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{period.start_time?.substring(0, 5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-indigo-50/30">
                  <td className="py-8 px-6 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/50">{day.name}</td>
                  {periods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-100 h-44 align-top min-w-[180px]">
                        {cellData ? (
                          <div className="h-full bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div>
                               <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">مادة دراسية</p>
                               <p className="font-black text-slate-900 text-sm">{cellData.subjects?.name}</p>
                            </div>
                            {cellData.teachers?.zoom_link && (
                              <a href={cellData.teachers.zoom_link} target="_blank" className="mt-4 bg-indigo-600 text-white text-[10px] font-black py-2 rounded-xl text-center shadow-lg shadow-indigo-100">بث مباشر</a>
                            )}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

