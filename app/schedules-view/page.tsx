// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  CalendarDays, Users, Search, Video, Layers, UserCircle, AlertTriangle, Lock
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
  const { user, isChecking, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [uniqueTeachers, setUniqueTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [latestPlanName, setLatestPlanName] = useState<string>('');

  // 🚀 إعدادات الفلتر والقيود الصارمة
  const [filterType, setFilterType] = useState<'section' | 'teacher'>('section');
  const [filterId, setFilterId] = useState<string>('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [noSectionAssigned, setNoSectionAssigned] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('');

  useEffect(() => {
    if (!isChecking && user) {
        fetchApprovedSchedule();
    } else if (!isChecking && !user) {
        setLoading(false);
    }
  }, [isChecking, user, currentRole]);

  const fetchApprovedSchedule = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      setNoSectionAssigned(false);

      // 1. 🚀 التحقيق الصارم: تجاهل مسميات المتصفح والبحث المباشر في قاعدة البيانات!
      let isUserRestricted = false;
      let forcedType = 'section';
      let forcedId = '';
      let resolvedRole = (currentRole || '').toLowerCase();

      // إذا لم يكن مديراً صريحاً، نطبق القيود الإجبارية
      if (resolvedRole !== 'admin' && resolvedRole !== 'management') {
         isUserRestricted = true;

         // 🔍 البحث القاطع في جدول المعلمين (يحل مشكلة رؤية المعلم لكل شيء)
         const { data: teacherData } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

         if (teacherData) {
            forcedType = 'teacher';
            forcedId = teacherData.id;
            resolvedRole = 'teacher'; // تأكيد قاطع أنه معلم
         } else {
            // 🔍 البحث القاطع في جدول الطلاب
            const { data: studentData } = await supabase
               .from('students')
               .select('section_id')
               .eq('user_id', user.id)
               .limit(1)
               .maybeSingle();

            if (studentData) {
               forcedType = 'section';
               forcedId = studentData.section_id || '';
               resolvedRole = 'student'; // تأكيد قاطع أنه طالب
               if (!studentData.section_id) {
                  setNoSectionAssigned(true);
               }
            }
         }
      }

      setIsRestricted(isUserRestricted);
      setActiveRole(resolvedRole);

      // إذا كان طالباً بلا فصل، لا داعي لإكمال الجلب
      if (isUserRestricted && resolvedRole === 'student' && !forcedId) {
         setLoading(false);
         return;
      }

      // 2. جلب أحدث خطة معتمدة
      const { data: latestPlan, error: planError } = await supabase
        .from('auto_schedule_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (planError || !latestPlan) {
        setLoading(false);
        return; 
      }

      setLatestPlanName(latestPlan.name);

      // 3. الاستعلام المسطح (Flat Fetch) للسرعة وتجاوز أخطاء RLS
      const { data: slots, error: slotsError } = await supabase
        .from('auto_schedules')
        .select('*')
        .eq('plan_id', latestPlan.id);

      if (slotsError) throw slotsError;

      // 4. جلب البيانات الأساسية للربط
      const { data: sectionsData } = await supabase.from('sections').select('id, name, class_id, classes(name, level)');
      const { data: subjectsData } = await supabase.from('subjects').select('id, name');
      
      let teachersData = [];
      const { data: teachersWithZoom, error: zoomError } = await supabase.from('teachers').select('id, zoom_link, users(full_name, zoom_link)');
      if (zoomError) {
         const { data: safeTeachers } = await supabase.from('teachers').select('id, users(full_name)');
         teachersData = safeTeachers || [];
      } else {
         teachersData = teachersWithZoom || [];
      }

      const { data: periodsData } = await supabase.from('auto_class_periods').select('*').order('period_number');
      setPeriods(periodsData || []);

      // 5. الربط اليدوي الآمن
      const formattedSchedules = (slots || []).map(slot => {
        const sec = sectionsData?.find(s => s.id === slot.section_id);
        const subj = subjectsData?.find(s => s.id === slot.subject_id);
        const teach = teachersData?.find(t => t.id === slot.teacher_id);

        const cData = Array.isArray(sec?.classes) ? sec?.classes[0] : sec?.classes;
        const level = cData?.level || 0;
        const stage = level >= 10 ? 'high' : 'middle';
        const sectionFullName = sec ? `${cData?.name || ''} - شعبة ${sec.name || ''}` : 'شعبة غير معروفة';
        
        const zoomLink = teach?.users?.zoom_link || teach?.zoom_link || null;

        return {
          id: slot.id,
          day: slot.day_of_week,
          period_number: slot.period_number,
          start_time: slot.start_time,
          end_time: slot.end_time,
          stage: stage,
          section_id: slot.section_id,
          section_name: sectionFullName,
          subject_name: subj?.name || 'مادة محذوفة',
          teacher_id: slot.teacher_id,
          teacher_name: teach?.users?.full_name || 'معلم غير محدد',
          zoom_link: zoomLink
        };
      });

      formattedSchedules.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      setSchedules(formattedSchedules);

      // 6. استخراج القوائم المنسدلة
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

      // 🚀 7. تطبيق القيود الإجبارية وإغلاق הפלتر
      if (isUserRestricted) {
         setFilterType(forcedType as any);
         setFilterId(forcedId);
      } else {
         if (secsArray.length > 0) {
            setFilterType('section');
            setFilterId(secsArray[0].id);
         }
      }

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
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل الجدول...</p>
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
              <p className="text-slate-400 font-bold text-sm">عذراً، يجب عليك تسجيل الدخول بحسابك لرؤية الجدول الدراسي الخاص بك.</p>
           </div>
       </div>
    );
  }

  if (noSectionAssigned) {
    return (
       <div className="flex h-[100dvh] items-center justify-center bg-[#090b14] font-cairo p-4">
           <div className="bg-[#131836]/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 text-center shadow-lg max-w-md w-full">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4 opacity-80" />
              <h2 className="text-xl font-black text-white mb-2">غير مسجل في فصل</h2>
              <p className="text-slate-400 font-bold text-sm">لم يتم تعيينك في أي فصل دراسي حتى الآن. يرجى مراجعة إدارة المدرسة.</p>
           </div>
       </div>
    );
  }

  // تحديد اسم المستخدم لعرضه في البطاقة المقفلة
  let restrictedDisplayName = '';
  if (isRestricted) {
     if (activeRole === 'student') {
        restrictedDisplayName = sections.find(s => s.id === filterId)?.name || 'فصلك';
     } else if (activeRole === 'teacher') {
        restrictedDisplayName = uniqueTeachers.find(t => t.id === filterId)?.name || 'جدولك';
     }
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
              <p className="text-sm">حدث خطأ أثناء جلب البيانات: {fetchError}. يرجى مراجعة صلاحيات قاعدة البيانات.</p>
           </div>
        )}

        {schedules.length === 0 && !fetchError ? (
           <div className="bg-[#131836]/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 text-center shadow-lg">
              <CalendarDays className="w-20 h-20 text-slate-600 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-black text-white mb-2">لا توجد جداول معتمدة بعد</h2>
              <p className="text-slate-400 font-bold">لم تقم الإدارة بنشر الجدول النهائي حتى الآن.</p>
           </div>
        ) : schedules.length > 0 ? (
          <>
            {/* 🚀 فلاتر العرض - قفل قوي للمعلمين والطلاب */}
            <div className="bg-[#131836]/80 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/10 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {!isRestricted ? (
                // 🟢 عرض الإدارة: قوائم منسدلة كاملة
                <>
                  <div className="flex bg-[#02040a] p-1 rounded-xl border border-white/5 w-full md:w-auto shrink-0">
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
                </>
              ) : (
                // 🔴 عرض المعلم أو الطالب: بطاقة ثابتة تظهر الاسم وتقفل الجدول عليه فقط
                <div className="flex items-center gap-4 w-full bg-[#02040a]/40 p-3 rounded-xl border border-white/5">
                   <div className={`p-2 rounded-lg ${activeRole === 'student' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {activeRole === 'student' ? <Layers className="w-6 h-6"/> : <UserCircle className="w-6 h-6"/>}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                         <Lock className="w-3 h-3"/> {activeRole === 'student' ? 'جدول فصلك الحالي' : 'الجدول المخصص لك'}
                      </p>
                      <p className="text-base font-black text-white mt-0.5">{restrictedDisplayName}</p>
                   </div>
                </div>
              )}
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
                            <td key={p} className="p-2 sm:p-3 border-l border-white/5 h-32 align-top">
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
                                    <a 
                                      href={slot.zoom_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 rounded-lg py-1.5 transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                                    >
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
        )}
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
