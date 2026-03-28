'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, Users, Zap, GraduationCap, MapPin } from 'lucide-react';
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
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const { fetchTeacherSchedule: fetchScheduleData } = useDashboardSystem();

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchTeacherSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // استخدام : any هنا يمنع خطأ "Property schedule does not exist on type never"
      const data: any = await fetchScheduleData();
      if (data) {
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchScheduleData]);

  useEffect(() => {
    if (mounted) fetchTeacherSchedule();
  }, [fetchTeacherSchedule, mounted]);

  const getCellData = (day: number, period: number) => {
    return schedule.find(s => s.day_of_week === day && s.period === period);
  };

  const isCurrentClass = (day: number, period: any) => {
    if (!currentTime) return false;
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
    if (!currentTime) return false;
    const now = currentTime;
    const currentDay = now.getDay() + 1;
    if (day !== currentDay) return false;

    const [startH, startM] = period.start_time.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0);

    return startTime > now && (startTime.getTime() - now.getTime()) < 120 * 60000;
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-7xl mx-auto px-4"
      dir="rtl"
    >
      {/* Header Bento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border border-slate-50">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">جدولي الدراسي الأسبوعي</h1>
            <p className="text-slate-500 mt-2 font-bold flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-500" />
              <span>إدارة الحصص والصفوف المسندة</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">الوقت الحالي</p>
            <p className="text-lg font-black text-slate-900">{mounted && currentTime ? format(currentTime, 'hh:mm a') : '...'}</p>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 border-collapse table-fixed">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="py-8 px-6 text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-l border-slate-200 w-32">اليوم / الحصة</th>
                {periods.map(period => (
                  <th key={period.id} className="py-6 px-4 text-center border-l border-slate-100 last:border-l-0">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-black text-indigo-600">الحصة {period.period_number}</span>
                      <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-1 rounded-lg border border-slate-100" dir="ltr">
                        {period.start_time?.substring(0, 5)} - {period.end_time?.substring(0, 5)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="py-8 px-6 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/50">{day.name}</td>
                  {periods.map(period => {
                    const cellData = getCellData(day.id, period.period_number);
                    const isCurrent = isCurrentClass(day.id, period);
                    const isNext = isNextClass(day.id, period);

                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-100 last:border-l-0 h-44 align-top min-w-[180px]">
                        {cellData ? (
                          <motion.div 
                            whileHover={{ y: -5 }}
                            className={`h-full flex flex-col justify-between rounded-3xl p-4 border transition-all duration-300 relative overflow-hidden shadow-sm ${
                              isCurrent 
                                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent shadow-xl ring-4 ring-indigo-100 scale-105 z-10' 
                                : isNext
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-white'
                                  : 'bg-white border-slate-100 text-slate-900 hover:shadow-lg hover:border-indigo-100'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 right-0 p-2 bg-white/20 rounded-bl-2xl">
                                <Zap className="h-4 w-4 text-white animate-pulse" />
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className={`flex items-center gap-2 mb-1 ${isCurrent ? 'text-indigo-100' : 'text-indigo-600'}`}>
                                <BookOpen size={14} />
                                <span className="text-[9px] font-black uppercase tracking-wider">المادة</span>
                              </div>
                              <div className={`font-black text-sm leading-tight ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                                {cellData.subjects?.name}
                              </div>
                            </div>
                            <div className={`mt-4 pt-4 border-t flex flex-col gap-2 ${isCurrent ? 'border-white/20' : 'border-slate-50'}`}>
                              <div className={`flex items-center gap-2 ${isCurrent ? 'text-indigo-100' : 'text-slate-500'}`}>
                                <Users size={14} />
                                <div className="text-[11px] font-bold truncate">
                                  {cellData.sections?.classes?.name} - {cellData.sections?.name}
                                </div>
                              </div>
                              {isCurrent && (
                                <div className="mt-1 inline-flex items-center justify-center py-2 px-3 bg-white/20 rounded-xl text-[10px] font-black text-white backdrop-blur-md animate-pulse">
                                  جارية الآن
                                </div>
                              )}
                              {isNext && !isCurrent && (
                                <div className="mt-1 inline-flex items-center justify-center py-2 px-3 bg-indigo-100 rounded-xl text-[10px] font-black text-indigo-600">
                                  الحصة القادمة
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-5">
                            <BookOpen size={24} className="text-slate-300" />
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

