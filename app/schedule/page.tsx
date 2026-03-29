'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

// دالة فك التغليف الآمنة
const safeObj = (obj: any) => Array.isArray(obj) ? obj[0] : obj;

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  
  // نعتمد هنا على نفس الهوك المستخدم في الداشبورد لضمان تطابق البيانات وروابط الزووم
  const { fetchStudentSchedule } = useDashboardSystem();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب البيانات من الهوك (يحتوي على روابط الزووم المهيأة)
      const data = await fetchStudentSchedule();
      if (data) {
        setStudentInfo(data.student);
        setSchedule(data.schedule || []);
      }

      // 2. جلب أوقات الحصص للحفاظ على التنسيق
      const { data: periodsData } = await supabase
        .from('class_periods')
        .select('*')
        .order('period_number');
      
      setPeriods(periodsData || []);
    } catch (error) {
      console.error('Error fetching student schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchStudentSchedule]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // دالة المطابقة الآمنة
  const getCellData = (day: number, period: number) => {
    return schedule.find(s => String(s.day_of_week) === String(day) && String(s.period) === String(period));
  };

  const getSubjectName = (cellData: any) => {
    if (!cellData) return null;
    const subject = safeObj(cellData.subjects);
    return subject?.name || cellData.subject_name || null;
  };

  const getTeacherData = (cellData: any) => {
    if (!cellData) return { name: null, zoom: null };
    
    const teacher = safeObj(cellData.teachers);
    const user = safeObj(teacher?.users) || safeObj(cellData.users);
    
    // استخراج شامل وذكي لرابط الزووم: نبحث عنه في كل مكان ممكن أن يرجعه الهوك!
    const zoomLink = cellData.zoom_link || 
                     cellData.teacher_zoom_link || 
                     teacher?.zoom_link || 
                     user?.zoom_link || 
                     null;

    const name = user?.full_name || cellData.teacher_name || null;

    return { name, zoom: zoomLink };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  // --- الفلتر الذكي للحصص ---
  const maxScheduledPeriod = schedule.length > 0 
    ? Math.max(...schedule.map(s => Number(s.period) || 0)) 
    : 5;

  const displayPeriods = periods.filter(p => Number(p.period_number) <= Math.max(maxScheduledPeriod, 5));

  const sectionData = safeObj(studentInfo?.sections);
  const classData = safeObj(sectionData?.classes);
  const sectionName = sectionData?.name || '';
  const className = classData?.name || '';

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
          <p className="text-slate-500 mt-2 font-medium">
            عرض الحصص الدراسية لصفك: <span className="text-indigo-600 font-bold">{className} - {sectionName}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
          <table className="w-full min-w-max divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50 sticky right-0 z-10">اليوم / الحصة</th>
                {displayPeriods.map(period => (
                  <th key={period.id} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 min-w-[150px]">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="h-4 w-4 text-indigo-500" />
                      <span>الحصة {period.period_number}</span>
                      {period.start_time && period.end_time && (
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          {String(period.start_time).substring(0, 5)} - {String(period.end_time).substring(0, 5)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {DAYS.map((day) => (
                <tr key={day.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80 sticky right-0 z-10">{day.name}</td>
                  {displayPeriods.map(period => {
                    const cellData = getCellData(day.id, Number(period.period_number));
                    const subjectName = getSubjectName(cellData);
                    const { name: teacherName, zoom: zoomLink } = getTeacherData(cellData);

                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-200 h-36 align-top">
                        {cellData && subjectName ? (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="h-full flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-4 border border-indigo-100 shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                <BookOpen className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase tracking-wider">مادة</span>
                              </div>
                              <div className="font-black text-slate-900 text-base leading-tight break-words">{subjectName}</div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-indigo-100/50 flex flex-col gap-2">
                              {teacherName && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <User className="h-3.5 w-3.5" />
                                  <div className="text-xs font-bold truncate" title={teacherName}>{teacherName}</div>
                                </div>
                              )}
                              
                              {/* زر الزووم المحدث والجذاب */}
                              {zoomLink && zoomLink.trim() !== '' && (
                                <a 
                                  href={zoomLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                                >
                                  <Video className="w-3.5 h-3.5 animate-pulse" />
                                  <span>دخول الحصة</span>
                                </a>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-200">
                            <div className="h-1 w-6 bg-slate-100 rounded-full" />
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

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg shrink-0">
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">تنبيه الحصص</h4>
          <p className="text-sm text-amber-700 font-medium mt-0.5">يرجى الالتزام بمواعيد الحصص الدراسية والتواجد في الفصل قبل بدء الحصة بـ 5 دقائق.</p>
        </div>
      </div>
    </motion.div>
  );
}


