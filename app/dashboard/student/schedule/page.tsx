'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
// تأكدنا هنا من استيراد النوع المصدّر حديثاً من الهوك
import { useDashboardSystem, type StudentScheduleData } from '@/hooks/useDashboardSystem';

const DAYS = [{ id: 1, name: 'الأحد' }, { id: 2, name: 'الإثنين' }, { id: 3, name: 'الثلاثاء' }, { id: 4, name: 'الأربعاء' }, { id: 5, name: 'الخميس' }];

export default function StudentSchedulePage() {
  const { fetchStudentSchedule } = useDashboardSystem();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // استخدام any هنا كخط دفاع أخير ضد أخطاء Netlify
      const data: any = await fetchStudentSchedule();
      if (data) {
        setStudentInfo(data.student);
        setSchedule(data.schedule || []);
        setPeriods(data.periods || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentSchedule]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 px-4 max-w-7xl mx-auto" dir="rtl">
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-50 flex items-center gap-6">
        <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white"><Calendar size={32} /></div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">الجدول الدراسي</h1>
          <p className="text-slate-500 font-bold mt-1 flex items-center gap-2">
            <GraduationCap size={18} className="text-indigo-500" />
            <span>{studentInfo?.sections?.classes?.name} - {studentInfo?.sections?.name}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 table-fixed">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="py-8 px-6 text-xs font-black text-slate-400 border-l border-slate-200 w-32 text-center">اليوم</th>
              {periods.map(p => (
                <th key={p.id} className="py-6 px-4 text-center border-l border-slate-100 last:border-l-0">
                  <span className="text-sm font-black text-slate-900 block mb-1">الحصة {p.period_number}</span>
                  <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{p.start_time?.substring(0, 5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DAYS.map((day) => (
              <tr key={day.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="py-8 px-6 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/50">{day.name}</td>
                {periods.map(period => {
                  const cell = schedule.find(s => s.day_of_week === day.id && s.period === period.period_number);
                  return (
                    <td key={period.id} className="p-3 border-l border-slate-100 last:border-l-0 h-44 align-top min-w-[180px]">
                      {cell ? (
                        <div className="h-full bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                          <div>
                            <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">مادة دراسية</p>
                            <p className="font-black text-slate-900 text-sm">{cell.subjects?.name}</p>
                          </div>
                          {cell.teachers?.zoom_link && (
                            <a href={cell.teachers.zoom_link} target="_blank" className="mt-4 bg-indigo-600 text-white text-[10px] font-black py-2 rounded-xl text-center shadow-lg active:scale-95 transition-transform">بث مباشر</a>
                          )}
                        </div>
                      ) : <div className="h-full w-full bg-slate-50/20 rounded-3xl" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

