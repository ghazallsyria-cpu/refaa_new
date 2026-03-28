'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function TeacherSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { fetchTeacherSchedule: fetchScheduleData } = useDashboardSystem();

  const fetchTeacherSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchScheduleData();
      if (data) {
        setSchedule(data.schedule);
        setPeriods(data.periods);
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData]);

  useEffect(() => {
    fetchTeacherSchedule();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [fetchTeacherSchedule]);

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  const isCurrentClass = (day: number, period: any) => {
    const now = currentTime;
    const currentDay = now.getDay() + 1; // 1 is Sunday
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const [endH, endM] = period.end_time.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endH, endM, 0);

    return now >= startTime && now <= endTime;
  };

  const isNextClass = (day: number, period: any) => {
    const now = currentTime;
    const currentDay = now.getDay() + 1;
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0);

    // Next class is the one starting after now, but within the next 2 hours
    return startTime > now && (startTime.getTime() - now.getTime()) < 120 * 60000;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
            جدولي الدراسي الأسبوعي
          </h1>
          <p className="text-slate-500 mt-2 font-medium">عرض كامل للحصص الدراسية المسندة إليك خلال الأسبوع</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">الوقت الحالي</div>
            <div className="text-sm font-bold text-slate-700">{format(currentTime, 'hh:mm a')}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50">اليوم / الحصة</th>
                {periods.map(period => (
                  <th key={period.id} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-indigo-600">الحصة {period.period_number}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        {period.start_time.substring(0, 5)} - {period.end_time.substring(0, 5)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80">{day.name}</td>
                  {periods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    const isCurrent = isCurrentClass(day.id, period);
                    const isNext = isNextClass(day.id, period);

                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-200 h-36 align-top min-w-[160px]">
                        {cellData ? (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className={`h-full flex flex-col justify-between rounded-2xl p-4 border shadow-sm relative overflow-hidden ${
                              isCurrent 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent ring-4 ring-indigo-100' 
                                : isNext
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                                  : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 right-0 p-1 bg-white/20 rounded-bl-xl">
                                <Zap className="h-3 w-3 text-white animate-pulse" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <div className={`flex items-center gap-1.5 mb-1 ${isCurrent ? 'text-indigo-100' : 'text-indigo-600'}`}>
                                <BookOpen className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-wider">المادة</span>
                              </div>
                              <div className={`font-black text-sm leading-tight ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                                {cellData.subjects?.name}
                              </div>
                            </div>
                            <div className={`mt-3 pt-2 border-t flex flex-col gap-1 ${isCurrent ? 'border-white/20' : 'border-slate-100'}`}>
                              <div className={`flex items-center gap-1.5 ${isCurrent ? 'text-indigo-100' : 'text-slate-500'}`}>
                                <Users className="h-3 w-3" />
                                <div className="text-[11px] font-bold truncate">
                                  {cellData.sections?.classes?.name} - {cellData.sections?.name}
                                </div>
                              </div>
                              {isCurrent && (
                                <div className="mt-1 inline-flex items-center justify-center py-1 px-2 bg-white/20 rounded-lg text-[9px] font-bold text-white backdrop-blur-sm animate-pulse">
                                  جارية الآن
                                </div>
                              )}
                              {isNext && !isCurrent && (
                                <div className="mt-1 inline-flex items-center justify-center py-1 px-2 bg-indigo-100 rounded-lg text-[9px] font-bold text-indigo-600">
                                  الحصة القادمة
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200">
                            <div className="h-1 w-4 bg-slate-100 rounded-full" />
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
      </div>
    </motion.div>
  );
}
