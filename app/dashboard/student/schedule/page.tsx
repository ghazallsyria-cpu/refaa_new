'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  const fetchScheduleData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. جلب بيانات الطالب للوصول إلى شعبته
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('section_id, sections(name, classes(name))')
        .eq('id', user.id)
        .single();

      if (studentError) throw studentError;
      setStudentInfo(student);

      if (student?.section_id) {
        // 2. جلب الحصص المجدولة لهذه الشعبة
        const { data: scheduleData } = await supabase
          .from('schedules')
          .select('id, day_of_week, period, subjects(name), teachers(zoom_link, users(full_name))')
          .eq('section_id', student.section_id);

        setSchedule(scheduleData || []);

        // 3. جلب أوقات الحصص الرسمية المبرمجة
        const { data: periodsData } = await supabase
          .from('class_periods')
          .select('*')
          .order('period_number');

        setPeriods(periodsData || []);
      }
    } catch (error) {
      console.error('Error fetching student schedule data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // دالة المطابقة الآمنة (تقارن القيم كنصوص)
  const getCellData = (day: number, period: number) => {
    return schedule.find(s => String(s.day_of_week) === String(day) && String(s.period) === String(period));
  };

  const getSubjectName = (cellData: any) => {
    if (!cellData?.subjects) return null;
    const subject = Array.isArray(cellData.subjects) ? cellData.subjects[0] : cellData.subjects;
    return subject?.name || null;
  };

  const getTeacherData = (cellData: any) => {
    if (!cellData?.teachers) return { name: null, zoom: null };
    const teacher = Array.isArray(cellData.teachers) ? cellData.teachers[0] : cellData.teachers;
    const user = Array.isArray(teacher?.users) ? teacher.users[0] : teacher?.users;
    return {
      name: user?.full_name || null,
      zoom: teacher?.zoom_link || null
    };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  // --- الفلتر الذكي للحصص ---
  // حساب أقصى رقم حصة في جدول الطالب الفعلي، مع تعيين 5 كحد أدنى لتجنب شكل الجدول الصغير
  const maxScheduledPeriod = schedule.length > 0 
    ? Math.max(...schedule.map(s => Number(s.period) || 0)) 
    : 5;

  // قص وإخفاء أي حصص إضافية من الإدارة (مثل 6، 7، 8) إذا لم يكن الطالب يحتاجها
  const displayPeriods = periods.filter(p => Number(p.period_number) <= Math.max(maxScheduledPeriod, 5));

  const sectionData = Array.isArray(studentInfo?.sections) ? studentInfo.sections[0] : studentInfo?.sections;
  const classData = Array.isArray(sectionData?.classes) ? sectionData.classes[0] : sectionData?.classes;
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200 w-32 bg-slate-100/50">اليوم / الحصة</th>
                {displayPeriods.map(period => (
                  <th key={period.id} className="py-5 px-4 text-center text-sm font-black text-slate-900 border-l border-slate-200">
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
                  <td className="py-6 px-4 text-sm font-black text-slate-900 border-l border-slate-200 text-center bg-slate-50/80">{day.name}</td>
                  {displayPeriods.map(period => {
                    const cellData = getCellData(day.id, Number(period.period_number));
                    const subjectName = getSubjectName(cellData);
                    const { name: teacherName, zoom: zoomLink } = getTeacherData(cellData);

                    return (
                      <td key={`${day.id}-${period.id}`} className="p-3 border-l border-slate-200 h-32 align-top min-w-[140px]">
                        {cellData && subjectName ? (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="h-full flex flex-col justify-between bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-3 border border-indigo-100 shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-wider">مادة</span>
                              </div>
                              <div className="font-black text-slate-900 text-sm leading-tight">{subjectName}</div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-indigo-100/50 flex flex-col gap-2">
                              {teacherName && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <User className="h-3 w-3" />
                                  <div className="text-[11px] font-bold text-slate-600 truncate">{teacherName}</div>
                                </div>
                              )}
                              {zoomLink && (
                                <a 
                                  href={zoomLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 py-1 px-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors"
                                >
                                  <span>دخول الحصة (Zoom)</span>
                                </a>
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

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
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


