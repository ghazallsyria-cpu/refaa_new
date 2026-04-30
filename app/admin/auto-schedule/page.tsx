
// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, Settings, Play, CheckCircle2, AlertTriangle, 
  Loader2, Save, X, CalendarDays, Clock, Users, BookOpen, Trash2, ShieldAlert, SlidersHorizontal, Layers, CheckSquare
} from 'lucide-react';

const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const isTimeIntersecting = (startA: string, endA: string, startB: string, endB: string) => {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
};

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function AutoScheduleGenerator() {
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  
  const [sections, setSections] = useState<any[]>([]);
  const [rawTeacherAssignments, setRawTeacherAssignments] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  
  // 🚀 ميزانية الحصص مفصّلة (المادة + اسم الصف/المسار)
  const [uniqueSubjectClasses, setUniqueSubjectClasses] = useState<{subj_id: string, class_id: string, class_name: string, subj_name: string}[]>([]);
  const [subjectQuotas, setSubjectQuotas] = useState<Record<string, number>>({});
  
  // 🚀 حالة الاعتماد
  const [isBudgetSaved, setIsBudgetSaved] = useState(false);

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); 
  const [planName, setPlanName] = useState('جدول الفصل الدراسي الثاني - معتمد');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [generatedSchedules, setGeneratedSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    fetchMasterData();
    fetchSavedPlans();
  }, [currentRole]);

  const fetchMasterData = async () => {
    try {
      setLoadingData(true);
      
      const { data: sectionsData } = await supabase.from('sections').select('id, name, class_id, classes(id, name, level)');
      const formattedSections = (sectionsData || []).map(sec => {
        const cData = Array.isArray(sec.classes) ? sec.classes[0] : sec.classes;
        const level = cData?.level || 0;
        const className = cData?.name || 'صف غير محدد';
        const classId = cData?.id || 'unknown';
        const stage = level >= 10 ? 'high' : 'middle';
        return { ...sec, class_id: classId, class_name: className, level, stage, full_name: `${className} - ${sec.name}` };
      });
      setSections(formattedSections);

      const { data: periodsData } = await supabase.from('auto_class_periods').select('*').order('period_number');
      setPeriods(periodsData || []);

      const { data: tsData } = await supabase.from('teacher_sections').select('teacher_id, section_id, subject_id, teachers(users(full_name)), subjects(name)');
      setRawTeacherAssignments(tsData || []);

      if (tsData && formattedSections.length > 0) {
        const subjClassMap = new Map();
        
        tsData.forEach(ts => {
          const sec = formattedSections.find(s => s.id === ts.section_id);
          if (sec && ts.subject_id && ts.subjects?.name) {
            // استخدام مسار الصف (علمي/أدبي) كمفتاح أساسي
            const key = `${ts.subject_id}_${sec.class_id}`;
            if (!subjClassMap.has(key)) {
              subjClassMap.set(key, { 
                subj_id: ts.subject_id, 
                class_id: sec.class_id, 
                class_name: sec.class_name, 
                subj_name: ts.subjects.name 
              });
            }
          }
        });

        const subjClassList = Array.from(subjClassMap.values());
        // ترتيب المسارات أبجدياً
        subjClassList.sort((a, b) => a.class_name.localeCompare(b.class_name) || a.subj_name.localeCompare(b.subj_name));
        setUniqueSubjectClasses(subjClassList);

        const savedQuotasStr = localStorage.getItem('auto_schedule_quotas_v3');
        let initialQuotas: Record<string, number> = {};
        
        if (savedQuotasStr) {
          try { initialQuotas = JSON.parse(savedQuotasStr); } catch (e) {}
        }
        
        subjClassList.forEach(item => {
          const key = `${item.subj_id}_${item.class_id}`;
          if (initialQuotas[key] === undefined) initialQuotas[key] = 3; // النصاب الافتراضي
        });
        setSubjectQuotas(initialQuotas);
      }

    } catch (error) { console.error(error); } finally { setLoadingData(false); }
  };

  const handleQuotaChange = (key: string, val: number) => {
    let newVal = isNaN(val) ? 1 : val;
    if (newVal < 1) newVal = 1;
    const newQuotas = { ...subjectQuotas, [key]: newVal };
    setSubjectQuotas(newQuotas);
    setIsBudgetSaved(false); // 🚀 إذا غيّر أي رقم، يجب أن يعتمد الميزانية من جديد
  };

  const saveBudget = () => {
    localStorage.setItem('auto_schedule_quotas_v3', JSON.stringify(subjectQuotas));
    setIsBudgetSaved(true);
    alert('تم اعتماد الميزانية وحفظها. يمكنك الآن توليد الجدول بناءً عليها.');
  };

  const fetchSavedPlans = async () => {
    const { data } = await supabase.from('auto_schedule_plans').select('*').order('created_at', { ascending: false });
    setSavedPlans(data || []);
  };

  const addLog = (msg: string) => {
    setGenerationLogs(prev => [msg, ...prev]);
  };

  const generateSchedule = async () => {
    if (!isBudgetSaved) {
      alert("يرجى (حفظ واعتماد الميزانية) أولاً لتتمكن من توليد الجدول."); return;
    }
    if (sections.length === 0 || rawTeacherAssignments.length === 0 || periods.length === 0) {
      alert("البيانات الأساسية غير مكتملة."); return;
    }

    setGenerating(true); setGenerationLogs([]);
    addLog("🚀 بدء تحليل الميزانية المخصصة (للمسارات) والقيود الصارمة...");
    
    let finalSchedule: any[] = [];
    await new Promise(r => setTimeout(r, 800)); 

    // 🚀 حساب النصاب لكل معلم بناءً على (المادة + مسار الصف)
    const teacherAssignments = rawTeacherAssignments.map(ts => {
      const section = sections.find(s => s.id === ts.section_id);
      const key = section ? `${ts.subject_id}_${section.class_id}` : '';
      const quota = key ? (subjectQuotas[key] || 3) : 3;

      return {
        ...ts,
        weekly_quota: quota,
        teacher_name: ts.teachers?.users?.full_name || 'غير معروف',
        subject_name: ts.subjects?.name || 'مادة',
        class_name: section?.class_name
      };
    });

    const sortedAssignments = [...teacherAssignments].sort((a, b) => b.weekly_quota - a.weekly_quota);
    
    addLog(`📊 جاري توزيع ${sortedAssignments.reduce((acc, a) => acc + a.weekly_quota, 0)} حصة أسبوعية...`);
    let failedPlacements = 0;

    for (const assignment of sortedAssignments) {
      const section = sections.find(s => s.id === assignment.section_id);
      if (!section) continue;

      let remainingLessons = assignment.weekly_quota;
      
      let targetDays: number[] = [];
      if (remainingLessons <= 5) {
        targetDays = shuffleArray([...workingDays]).slice(0, remainingLessons);
      } else {
        targetDays = [...workingDays];
        const extraDays = remainingLessons - 5;
        for (let i = 0; i < extraDays; i++) {
          targetDays.push(workingDays[Math.floor(Math.random() * workingDays.length)]);
        }
      }

      for (const day of targetDays) {
        const availablePeriods = periods.filter(p => p.stage === section.stage && !p.is_break);
        const randomizedPeriods = shuffleArray(availablePeriods);
        
        let isPlaced = false;

        for (const period of randomizedPeriods) {
          const isSectionBusy = finalSchedule.some(s => s.section_id === section.id && s.day === day && s.period_number === period.period_number);
          if (isSectionBusy) continue;

          const hasTeacherTimeClash = finalSchedule.some(s => 
            s.teacher_id === assignment.teacher_id && 
            s.day === day && 
            isTimeIntersecting(s.start_time, s.end_time, period.start_time, period.end_time)
          );
          if (hasTeacherTimeClash) continue;

          finalSchedule.push({
            section_id: section.id, section_name: section.full_name,
            subject_id: assignment.subject_id, subject_name: assignment.subject_name,
            teacher_id: assignment.teacher_id, teacher_name: assignment.teacher_name,
            day: day, period_number: period.period_number,
            start_time: period.start_time, end_time: period.end_time,
            stage: section.stage
          });

          isPlaced = true;
          break; 
        }

        if (!isPlaced) failedPlacements++;
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    addLog(`✅ اكتمل التوليد! تم تسكين ${finalSchedule.length} حصة بنجاح مع احترام المسارات (علمي/أدبي).`);
    
    if (failedPlacements > 0) {
      addLog(`⚠️ تنبيه: تعذر تسكين ${failedPlacements} حصة بسبب اختناق الجداول. قد تحتاج لتقليل الأنصبة أو زيادة عدد المعلمين.`);
    }

    finalSchedule.sort((a, b) => a.day - b.day || a.period_number - b.period_number);

    setGeneratedSchedules(finalSchedule);
    setGenerating(false);
  };

  const savePlanToDatabase = async () => {
    if (generatedSchedules.length === 0) return;
    
    setGenerating(true);
    addLog("💾 جاري حفظ الخطة في قاعدة البيانات (البيئة التجريبية)...");

    try {
      const { data: planData, error: planErr } = await supabase.from('auto_schedule_plans')
        .insert({ name: planName, created_by: user.id })
        .select().single();

      if (planErr) throw planErr;

      const slotsPayload = generatedSchedules.map(slot => ({
        plan_id: planData.id, section_id: slot.section_id, subject_id: slot.subject_id, teacher_id: slot.teacher_id,
        day_of_week: slot.day, period_number: slot.period_number, stage: slot.stage, start_time: slot.start_time, end_time: slot.end_time
      }));

      for (let i = 0; i < slotsPayload.length; i += 500) {
        const chunk = slotsPayload.slice(i, i + 500);
        await supabase.from('auto_schedules').insert(chunk);
      }

      addLog(`🎉 تم حفظ الخطة باسم: ${planName}`);
      fetchSavedPlans();
      setActivePlanId(planData.id);
      alert('تم حفظ الخطة بنجاح في البيئة التجريبية.');

    } catch (err) {
      addLog(`❌ خطأ أثناء الحفظ: ${err.message}`);
      alert("خطأ أثناء الحفظ");
    } finally { setGenerating(false); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('حذف هذه الخطة نهائياً؟')) return;
    await supabase.from('auto_schedule_plans').delete().eq('id', id);
    fetchSavedPlans();
    if (activePlanId === id) { setGeneratedSchedules([]); setActivePlanId(null); }
  };

  const loadPlan = async (id: string) => {
    setGenerating(true);
    try {
      const { data: slots } = await supabase.from('auto_schedules')
        .select('*, sections(name, classes(name)), teachers(users(full_name)), subjects(name)')
        .eq('plan_id', id);

      const formatted = (slots || []).map(s => ({
        ...s,
        day: s.day_of_week,
        section_name: `${Array.isArray(s.sections?.classes) ? s.sections?.classes[0]?.name : s.sections?.classes?.name} - ${s.sections?.name}`,
        teacher_name: s.teachers?.users?.full_name,
        subject_name: s.subjects?.name
      }));
      
      formatted.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      setGeneratedSchedules(formatted);
      setActivePlanId(id);
    } catch(e) {} finally { setGenerating(false); }
  };

  // 🚀 تجميع المواد حسب المسار (الصف) لترتيب العرض
  const groupedSubjectsByClass = useMemo(() => {
    const groups: Record<string, typeof uniqueSubjectClasses> = {};
    uniqueSubjectClasses.forEach(item => {
      const cName = item.class_name || 'غير محدد';
      if (!groups[cName]) groups[cName] = [];
      groups[cName].push(item);
    });
    return groups;
  }, [uniqueSubjectClasses]);

  const sortedClassNames = Object.keys(groupedSubjectsByClass).sort();

  if (currentRole !== 'admin' && currentRole !== 'management') return <div className="p-10 text-center font-bold">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-[2rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-black text-indigo-300 mb-3 uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4" /> خوارزمية قيود الوزارة المتقدمة
            </div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-amber-400" /> محرك الجدولة الآلي (مسارات)
            </h1>
            <p className="text-slate-300 font-bold max-w-xl">
              يمكنك الآن إعداد ميزانية الحصص بناءً على (المسار العلمي/الأدبي) بشكل منظم. اعتمد الميزانية، ثم ولّد الجدول دون تضارب زمني!
            </p>
          </div>
          <div className="flex flex-col gap-3 relative z-10 w-full md:w-auto shrink-0">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4">
                <div><p className="text-xs text-slate-400 font-bold">فصول المتوسط</p><p className="text-xl font-black text-center">{sections.filter(s=>s.stage === 'middle').length}</p></div>
                <div className="w-px h-8 bg-white/20"></div>
                <div><p className="text-xs text-slate-400 font-bold">فصول الثانوي</p><p className="text-xl font-black text-center">{sections.filter(s=>s.stage === 'high').length}</p></div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            
            {/* لوحة الميزانية المنظمة حسب مسار الصف 🚀 */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-500" /> ميزانية الحصص
                </h3>
                {isBudgetSaved ? (
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> معتمدة</span>
                ) : (
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> بانتظار الاعتماد</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-500 mb-4">
                حدد نصاب الحصص الأسبوعي لكل مادة مقسمة حسب (مسار الصف).
              </p>
              
              <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                {uniqueSubjectClasses.length === 0 && !loadingData && (
                   <p className="text-xs font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">لم يتم إسناد مواد للمعلمين بعد.</p>
                )}
                
                {sortedClassNames.map(className => (
                  <div key={className} className="space-y-3">
                    <h4 className="font-black text-sm text-indigo-900 bg-indigo-50/80 px-3 py-2.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> {className}
                    </h4>
                    <div className="space-y-2 pl-3 border-r-2 border-indigo-100 mr-2">
                      {groupedSubjectsByClass[className].map(item => {
                        const key = `${item.subj_id}_${item.class_id}`;
                        return (
                          <div key={key} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                            <span className="font-bold text-sm text-slate-700 truncate group-hover:text-indigo-700 transition-colors">
                              {item.subj_name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                               <input 
                                 type="number" 
                                 min="1" 
                                 value={subjectQuotas[key] || 3} 
                                 onChange={(e) => handleQuotaChange(key, parseInt(e.target.value))}
                                 className={`w-14 p-1.5 text-center font-black rounded-lg outline-none shadow-inner transition-all ${isBudgetSaved ? 'bg-slate-50 border border-slate-200 text-slate-500' : 'bg-white border border-indigo-300 text-indigo-700 focus:border-indigo-500 focus:bg-white'}`}
                               />
                               <span className="text-[10px] font-bold text-slate-400">حصص</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 🚀 زر اعتماد الميزانية */}
              <button 
                onClick={saveBudget}
                disabled={loadingData || isBudgetSaved}
                className={`mt-4 w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-md flex justify-center items-center gap-2 ${isBudgetSaved ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 opacity-60' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
              >
                <CheckSquare className="w-5 h-5" /> 
                {isBudgetSaved ? 'تم اعتماد الميزانية' : 'حفظ واعتماد الميزانية أولاً'}
              </button>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-indigo-500" /> إعدادات التوليد
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">اسم الخطة المقترحة</label>
                  <input type="text" value={planName} onChange={e=>setPlanName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:border-indigo-500 outline-none" />
                </div>
                
                <button 
                  onClick={generateSchedule} 
                  disabled={loadingData || generating || !isBudgetSaved} 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  توليد الجدول آلياً
                </button>

                {generatedSchedules.length > 0 && !activePlanId && (
                  <button onClick={savePlanToDatabase} disabled={generating} className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-black text-sm transition-all active:scale-95 flex justify-center items-center gap-2">
                    <Save className="w-4 h-4" /> حفظ هذه الخطة للرجوع لها
                  </button>
                )}
              </div>

              <div className="mt-6 bg-slate-900 rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[10px] text-slate-300 shadow-inner flex flex-col-reverse custom-scrollbar">
                {generationLogs.length === 0 ? (
                   <span className="text-center opacity-50 m-auto">محرك الذكاء بانتظار الإطلاق...</span>
                ) : (
                  generationLogs.map((log, i) => (
                    <div key={i} className={`mb-1 border-b border-white/5 pb-1 ${log.includes('❌') || log.includes('⚠️') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : ''}`}>
                      &gt; {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                <Save className="w-5 h-5 text-amber-500" /> المسودات المحفوظة
              </h3>
              <div className="space-y-3">
                {savedPlans.length === 0 ? (
                  <p className="text-center text-xs font-bold text-slate-400 py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">لا توجد خطط محفوظة بعد</p>
                ) : (
                  savedPlans.map(plan => (
                    <div key={plan.id} className={`p-3 rounded-xl border transition-colors flex items-center justify-between ${activePlanId === plan.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                       <div className="cursor-pointer flex-1" onClick={() => loadPlan(plan.id)}>
                         <p className="font-black text-sm text-slate-800">{plan.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold">{new Date(plan.created_at).toLocaleDateString()}</p>
                       </div>
                       <button onClick={() => deletePlan(plan.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-xl font-black text-slate-800">النتيجة المجردة (الخام)</h2>
                 <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{generatedSchedules.length} حصة مُسكنة</span>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto max-h-[800px] bg-slate-50/30 custom-scrollbar">
                {generatedSchedules.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CalendarDays className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold text-lg">اللوحة فارغة</p>
                    <p className="text-sm mt-1 opacity-70">قم بتحديد الميزانية، والضغط على &quot;توليد الجدول&quot; لتبدأ الخوارزمية.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {generatedSchedules.slice(0, 150).map((slot, i) => (
                       <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-white shrink-0 ${slot.stage === 'high' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                               <span className="text-xs">يوم</span>
                               <span className="text-lg leading-none">{slot.day}</span>
                            </div>
                            <div>
                               <p className="font-black text-sm text-slate-800">{slot.section_name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">حصة {slot.period_number}</span>
                                 <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</span>
                               </div>
                            </div>
                          </div>
                          <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[150px]">
                            <p className="text-xs font-black text-slate-700 truncate">{slot.subject_name}</p>
                            <p className="text-[10px] font-bold text-slate-500 truncate mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {slot.teacher_name}</p>
                          </div>
                       </div>
                     ))}
                     {generatedSchedules.length > 150 && (
                       <div className="text-center text-xs font-bold text-slate-400 pt-4 border-t border-dashed border-slate-200">
                         (يتم عرض أول 150 حصة فقط من أصل {generatedSchedules.length} لتسريع الواجهة)
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



