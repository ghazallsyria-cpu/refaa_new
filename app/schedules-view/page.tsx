// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  CalendarDays, Users, Search, Video, Layers, UserCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type Period = {
  id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  stage: string;
};

const DAYS = [
  { id: 1, name: 'الأحد' },
  { id: 2, name: 'الإثنين' },
  { id: 3, name: 'الثلاثاء' },
  { id: 4, name: 'الأربعاء' },
  { id: 5, name: 'الخميس' },
];

export default function PublicSchedulesViewPage() {
  const { user, isChecking } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [uniqueTeachers, setUniqueTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [latestPlanName, setLatestPlanName] = useState<string>('');

  // فلاتر العرض
  const [filterType, setFilterType] = useState<'section' | 'teacher'>('section');
  const [filterId, setFilterId] = useState<string>('');

  useEffect(() => {
    if (!isChecking && user) {
        fetchApprovedSchedule();
    } else if (!isChecking && !user) {
        setLoading(false);
    }
  }, [isChecking, user]);

  const fetchApprovedSchedule = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      // 1. جلب أحدث خطة معتمدة
      const { data: latestPlan, error: planError } = await supabase
        .from('auto_schedule_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (planError || !latestPlan) {
        setLoading(false);
        return; // لا توجد خطة
      }

      setLatestPlanName(latestPlan.name);

      // 2. 🚀 الاستعلام المضاد للأعطال (Fallback Query) لحل مشكلة الشاشة الفارغة
      let slots = [];
      const { data: slotsWithZoom, error: zoomError } = await supabase
        .from('auto_schedules')
        .select(`
          *,
          sections (id, name, class_id, classes(name, level)),
          subjects (name),
          teachers (id, zoom_link, users(full_name, zoom_link))
        `)
        .eq('plan_id', latestPlan.id);

      if (zoomError) {
         console.warn("Zoom relation missing, falling back to safe query...");
         // استعلام آمن في حال عدم وجود حقل zoom_link
         const { data: safeSlots, error: safeError } = await supabase
          .from('auto_schedules')
          .select(`
            *,
            sections (id, name, class_id, classes(name, level)),
            subjects (name),
            teachers (id, users(full_name))
          `)
          .eq('plan_id', latestPlan.id);

          if (safeError) {
             console.error("Data Fetch Error:", safeError);
             setFetchError(safeError.message);
          }
          slots = safeSlots || [];
      } else {
         slots = slotsWithZoom || [];
      }

      if (slots.length === 0 && !fetchError) {
          // إذا كانت المصفوفة فارغة، فهذا يعني غالباً مشكلة في صلاحيات RLS للطلاب
          console.warn("No slots found for this plan. Might be an RLS issue.");
      }

      // 3. جلب أوقات الحصص
      const { data: periodsData } = await supabase.from('auto_class_periods').select('*').order('period_number');
      setPeriods(periodsData || []);

      // 4. تنسيق البيانات
      const formattedSchedules = (slots || []).map(s => {
        const cData = Array.isArray(s.sections?.classes) ? s.sections?.classes[0] : s.sections?.classes;
        const level = cData?.level || 0;
        const stage = level >= 10 ? 'high' : 'middle';
        const sectionFullName = `${cData?.name || ''} - شعبة ${s.sections?.name || ''}`;
        
        const zoomLink = s.teachers?.users?.zoom_link || s.teachers?.zoom_link || null;

        return {
          id: s.id,
          day: s.day_of_week,
          period_number: s.period_number,
          start_time: s.start_time,
          end_time: s.end_time,
          stage: stage,
          section_id: s.section_id,
          section_name: sectionFullName,
          subject_name: s.subjects?.name || 'مادة',
          teacher_id: s.teacher_id,
          teacher_name: s.teachers?.users?.full_name || 'معلم',
          zoom_link: zoomLink
        };
      });

      formattedSchedules.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      setSchedules(formattedSchedules);

      // 5. استخراج القوائم المنسدلة
      const uniqueSecsMap = new Map();
      const uniqueTeachMap = new Map();

      formattedSchedules.forEach(s => {
        if (!uniqueSecsMap.has(s.section_id)) {
           uniqueSecsMap.set(s.section_id, { id: s.section_id, name: s.section_name });
        }
        if (!uniqueTeachMap.has(s.teacher_id)) {
           uniqueTeachMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name });
        }
      });

      const secsArray = Array.from(uniqueSecsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      const teachArray = Array.from(uniqueTeachMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      setSections(secsArray);
      setUniqueTeachers(teachArray);

      if (secsArray.length > 0) setFilterId(secsArray[0].id);

    } catch (error: any) {
      console.error('Error fetching public schedules:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const dynamicPeriods = useMemo(() => {
    if (periods.length === 0) return [1, 2, 3, 4, 5, 6, 7];
    const maxPeriod = Math.max(...periods.map(p => p.period_number));
    return Array.from({length: maxPeriod}, (_, i) => i + 1);
  }, [periods]);

  if (isChecking || loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل الجداول المعتمدة...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo p-4">
           <div className="bg-[#131836]/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 text-center shadow-lg max-w-md w-full">
              <Users className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
              <h2 className="text-xl font-black text-white mb-2">يرجى تسجيل الدخول</h2>
              <p className="text-slate-400 font-bold text-sm">عذراً، يجب عليك تسجيل الدخول بحسابك (طالب أو معلم) لرؤية الجدول الدراسي الخاص بك.</p>
           </div>
       </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#090b14] font-cairo text-slate-100 pb-24 pt-6 relative overflow-hidden" dir="rtl">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-8 text-white border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner shrink-0">
                <CalendarDays className="h-8 w-8 text-indigo-400 drop-shadow-md" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">الجداول الدراسية</h1>
                <p className="text-slate-400 mt-1 font-bold text-sm">
                  {latestPlanName ? `الجدول المعتمد: ${latestPlanName}` : 'بوابة عرض جداول الطلاب والمعلمين'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {fetchError && (
           <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">حدث خطأ أثناء جلب البيانات: {fetchError}</p>
           </div>
        )}

        {schedules.length === 0 && !fetchError ? (
           <div className="bg-[#131836]/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 text-center shadow-lg">
              <CalendarDays className="w-20 h-20 text-slate-600 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-black text-white mb-2">لا توجد جداول معتمدة بعد</h2>
              <p className="text-slate-400 font-bold">لم تقم الإدارة بنشر الجدول النهائي حتى الآن، أو أن حسابك لا يملك صلاحية رؤيته حالياً.</p>
           </div>
        ) : schedules.length > 0 ? (
          <>
            {/* Filters */}
            <div className="bg-[#131836]/80 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/10 shadow-lg flex flex-col md:flex-row gap-4 items-center">
              <div className="flex bg-[#02040a] p-1 rounded-xl border border-white/5 w-full md:w-auto">
                <button 
                  onClick={() => { setFilterType('section'); setFilterId(sections[0]?.id || ''); }}
                  className={`flex-1 md:w-32 py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'section' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Layers className="w-4 h-4" /> فصول
                </button>
                <button 
                  onClick={() => { setFilterType('teacher'); setFilterId(uniqueTeachers[0]?.id || ''); }}
                  className={`flex-1 md:w-32 py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'teacher' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <UserCircle className="w-4 h-4" /> معلمون
                </button>
              </div>

              <div className="flex-1 w-full relative">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pointer-events-none pr-4">
                  <Search className="h-4 w-4 text-indigo-400" />
                </div>
                <select
                  value={filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  className="block w-full rounded-xl border border-white/10 py-3 pr-10 pl-4 text-white bg-[#02040a]/80 focus:bg-[#02040a] ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold transition-all shadow-inner outline-none appearance-none [&>option]:bg-[#0f1423]"
                >
                  <option value="" disabled>-- الرجاء الاختيار --</option>
                  {filterType === 'section' 
                    ? sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    : uniqueTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-[#131836]/60 backdrop-blur-xl rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
                  <thead className="bg-[#02040a]/80">
                    <tr>
                      <th scope="col" className="py-4 px-4 text-center text-xs font-black text-indigo-300 uppercase tracking-widest border-l border-white/5 w-28">
                        اليوم / الحصة
                      </th>
                      {dynamicPeriods.map(p => {
                        const pData = periods.find(per => per.period_number === p);
                        return (
                          <th key={p} scope="col" className="py-4 px-2 text-center border-l border-white/5 min-w-[140px] bg-[#02040a]/40">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-white font-black text-sm drop-shadow-sm">الحصة {p}</span>
                              {pData && <span className="text-[10px] text-slate-500 font-bold tracking-widest bg-[#0f1423] px-2 py-0.5 rounded-md border border-white/5" dir="ltr">{pData.start_time.slice(0,5)}</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-transparent">
                    {DAYS.map((day) => (
                      <tr key={day.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-6 px-3 text-sm font-black text-slate-300 border-l border-white/5 text-center bg-[#0f1423]/30">
                          {day.name}
                        </td>
                        {dynamicPeriods.map(p => {
                          const slot = schedules.find(s => s.day === day.id && s.period_number === p && (filterType === 'section' ? s.section_id === filterId : s.teacher_id === filterId));
                          const showZoom = slot && slot.stage === 'middle' && slot.zoom_link;

                          return (
                            <td key={p} className="p-2 sm:p-3 border-l border-white/5 h-28 align-top">
                              {slot ? (
                                <motion.div whileHover={{ scale: 1.02 }} className="h-full flex flex-col justify-center bg-[#02040a]/60 rounded-xl p-3 border border-white/10 shadow-inner relative overflow-hidden group">
                                  <div className={`absolute top-0 right-0 w-1.5 h-full ${filterType === 'section' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                                  <div className="font-black text-white text-xs sm:text-sm whitespace-normal break-words leading-tight mb-1 pr-2">
                                    {slot.subject_name}
                                  </div>
                                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 pr-2 leading-tight">
                                    {filterType === 'section' ? `أ. ${slot.teacher_name}` : slot.section_name}
                                  </div>
                                  {showZoom && (
                                    <a href={slot.zoom_link} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-1.5 transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                                      <Video className="w-3.5 h-3.5"/> دخول للبث
                                    </a>
                                  )}
                                </motion.div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center rounded-xl transition-all opacity-20">
                                  <span className="text-2xl text-slate-600">-</span>
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
          </>
        ) : null}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
