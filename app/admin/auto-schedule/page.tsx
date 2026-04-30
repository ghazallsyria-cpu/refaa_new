
// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, Settings, Play, CheckCircle2, AlertTriangle, 
  Loader2, Save, X, CalendarDays, Clock, Users, BookOpen, Trash2, ShieldAlert, SlidersHorizontal, Layers, CheckSquare, Ban, Briefcase, UserCog, LayoutGrid, List
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
  
  const [uniqueSubjectClasses, setUniqueSubjectClasses] = useState<{subj_id: string, class_id: string, class_name: string, subj_name: string}[]>([]);
  const [subjectQuotas, setSubjectQuotas] = useState<Record<string, number>>({});
  
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, { days: number[], periods: number[] }>>({});
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState<{id: string, name: string} | null>(null);
  const [tempConstraints, setTempConstraints] = useState<{days: number[], periods: number[]}>({days: [], periods: []});

  const [isBudgetSaved, setIsBudgetSaved] = useState(false);

  const workingDays = [1, 2, 3, 4, 5]; 
  const allPeriods = [1, 2, 3, 4, 5, 6, 7]; 
  
  const [planName, setPlanName] = useState('جدول الفصل الدراسي الثاني - معتمد');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [generatedSchedules, setGeneratedSchedules] = useState<any[]>([]);

  const [displayMode, setDisplayMode] = useState<'grid' | 'raw'>('grid');
  const [gridFilterType, setGridFilterType] = useState<'section' | 'teacher'>('section');
  const [gridFilterId, setGridFilterId] = useState<string>('');

  useEffect(() => {
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    fetchMasterData();
    fetchSavedPlans();
  }, [currentRole]);

  useEffect(() => {
    if (generatedSchedules.length > 0 && !gridFilterId) {
      if (gridFilterType === 'section') {
        const firstSection = sections.find(s => generatedSchedules.some(gs => gs.section_id === s.id));
        if (firstSection) setGridFilterId(firstSection.id);
      } else {
        const firstTeacherId = generatedSchedules[0]?.teacher_id;
        if (firstTeacherId) setGridFilterId(firstTeacherId);
      }
    }
  }, [generatedSchedules, gridFilterType, sections, gridFilterId]);

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
      formattedSections.sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));
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
            const key = `${ts.subject_id}_${sec.class_id}`;
            if (!subjClassMap.has(key)) {
              subjClassMap.set(key, { subj_id: ts.subject_id, class_id: sec.class_id, class_name: sec.class_name, subj_name: ts.subjects.name });
            }
          }
        });

        const subjClassList = Array.from(subjClassMap.values());
        subjClassList.sort((a, b) => a.class_name.localeCompare(b.class_name) || a.subj_name.localeCompare(b.subj_name));
        setUniqueSubjectClasses(subjClassList);

        const savedQuotasStr = localStorage.getItem('auto_schedule_quotas_v3');
        let initialQuotas: Record<string, number> = {};
        if (savedQuotasStr) { try { initialQuotas = JSON.parse(savedQuotasStr); } catch (e) {} }
        subjClassList.forEach(item => { const key = `${item.subj_id}_${item.class_id}`; if (initialQuotas[key] === undefined) initialQuotas[key] = 3; });
        setSubjectQuotas(initialQuotas);

        const savedConstraintsStr = localStorage.getItem('auto_schedule_teacher_constraints');
        let initialConstraints: Record<string, { days: number[], periods: number[] }> = {};
        if (savedConstraintsStr) { try { initialConstraints = JSON.parse(savedConstraintsStr); } catch (e) {} }
        setTeacherConstraints(initialConstraints);
      }
    } catch (error) { console.error(error); } finally { setLoadingData(false); }
  };

  const handleQuotaChange = (key: string, val: number) => {
    let newVal = isNaN(val) ? 0 : val;
    if (newVal < 0) newVal = 0; 
    const newQuotas = { ...subjectQuotas, [key]: newVal };
    setSubjectQuotas(newQuotas);
    setIsBudgetSaved(false); 
  };

  const saveBudget = () => {
    localStorage.setItem('auto_schedule_quotas_v3', JSON.stringify(subjectQuotas));
    setIsBudgetSaved(true);
    alert('تم اعتماد الميزانية.');
  };

  const openTeacherConstraintsModal = (id: string, name: string) => {
    setSelectedTeacherObj({ id, name });
    const existing = teacherConstraints[id] || { days: [...workingDays], periods: [...allPeriods] };
    setTempConstraints({ days: [...existing.days], periods: [...existing.periods] });
    setIsTeacherModalOpen(true);
  };

  const toggleTempConstraint = (type: 'days' | 'periods', val: number) => {
    setTempConstraints(prev => {
      const arr = prev[type];
      if (arr.includes(val)) return { ...prev, [type]: arr.filter(x => x !== val) };
      return { ...prev, [type]: [...arr, val].sort() };
    });
  };

  const saveTeacherConstraints = () => {
    if (!selectedTeacherObj) return;
    if (tempConstraints.days.length === 0 || tempConstraints.periods.length === 0) {
      alert("يجب على الأقل اختيار يوم واحد وحصة واحدة للمعلم!"); return;
    }
    const newConstraints = { ...teacherConstraints, [selectedTeacherObj.id]: tempConstraints };
    setTeacherConstraints(newConstraints);
    localStorage.setItem('auto_schedule_teacher_constraints', JSON.stringify(newConstraints));
    setIsTeacherModalOpen(false);
  };

  const fetchSavedPlans = async () => {
    const { data } = await supabase.from('auto_schedule_plans').select('*').order('created_at', { ascending: false });
    setSavedPlans(data || []);
  };

  const addLog = (msg: string) => { setGenerationLogs(prev => [msg, ...prev]); };

  const teacherWorkloads = useMemo(() => {
    const loads: Record<string, { id: string, total: number, details: string[] }> = {};
    rawTeacherAssignments.forEach(ts => {
      const section = sections.find(s => s.id === ts.section_id);
      const key = section ? `${ts.subject_id}_${section.class_id}` : '';
      const quota = key && subjectQuotas[key] !== undefined ? subjectQuotas[key] : 0;
      
      if (quota > 0 && ts.teachers?.users?.full_name) {
        const tName = ts.teachers.users.full_name;
        const tId = ts.teacher_id;
        if (!loads[tName]) loads[tName] = { id: tId, total: 0, details: [] };
        loads[tName].total += quota;
        const detailStr = `${ts.subjects?.name} (${section?.class_name}): ${quota} حصص`;
        if (!loads[tName].details.includes(detailStr)) {
            loads[tName].details.push(detailStr);
        }
      }
    });
    return Object.entries(loads).sort((a, b) => b[1].total - a[1].total);
  }, [rawTeacherAssignments, subjectQuotas, sections]);

  // ==========================================
  // 🧠 THE ULTIMATE ALGORITHM (Anti-Pattern + Swapping Engine)
  // ==========================================
  const generateSchedule = async () => {
    if (!isBudgetSaved) { alert("يرجى اعتماد الميزانية أولاً."); return; }
    if (sections.length === 0 || rawTeacherAssignments.length === 0 || periods.length === 0) { alert("بيانات غير مكتملة."); return; }

    setGenerating(true); setGenerationLogs([]);
    addLog("🚀 بدء التوليد الذكي (توزيع عشوائي ديناميكي + تعبئة الفراغات بالإزاحة)...");
    
    let finalSchedule: any[] = [];
    const teacherDailyLoad: Record<string, Record<number, number>> = {};
    
    // 1. تحديد المعلمين المشتركين لضبط أوقاتهم
    const teacherStages = new Map<string, Set<string>>();
    rawTeacherAssignments.forEach(ts => {
      const sec = sections.find(s => s.id === ts.section_id);
      if (sec) {
        if (!teacherStages.has(ts.teacher_id)) teacherStages.set(ts.teacher_id, new Set());
        teacherStages.get(ts.teacher_id).add(sec.stage);
      }
    });
    
    const sharedTeachers = new Set<string>();
    teacherStages.forEach((stages, tId) => { if (stages.size > 1) sharedTeachers.add(tId); });

    addLog(`🔍 تم التعرف على ${sharedTeachers.size} معلمين مشتركين بين المرحلتين.`);

    const teacherAssignments = rawTeacherAssignments.map(ts => {
      const section = sections.find(s => s.id === ts.section_id);
      const key = section ? `${ts.subject_id}_${section.class_id}` : '';
      const quota = key ? (subjectQuotas[key] !== undefined ? subjectQuotas[key] : 3) : 3;
      if (!teacherDailyLoad[ts.teacher_id]) teacherDailyLoad[ts.teacher_id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      return {
        ...ts, weekly_quota: quota, teacher_name: ts.teachers?.users?.full_name || 'غير معروف',
        subject_name: ts.subjects?.name || 'مادة', class_name: section?.class_name, section_level: section?.level,
        stage: section?.stage
      };
    }).filter(ta => ta.weekly_quota > 0); 

    const sortedAssignments = [...teacherAssignments].sort((a, b) => {
      const isHighA = (a.section_level || 0) >= 10 ? 1 : 0;
      const isHighB = (b.section_level || 0) >= 10 ? 1 : 0;
      if (isHighA !== isHighB) return isHighB - isHighA; 
      return b.weekly_quota - a.weekly_quota; 
    });
    
    let failedPlacements = 0;
    await new Promise(r => setTimeout(r, 800));

    // 🚀 دالة مساعدة لإضافة الحصة للجدول النهائي
    const commitPlacement = (section, assignment, day, period) => {
      finalSchedule.push({
        section_id: section.id, section_name: section.full_name,
        subject_id: assignment.subject_id, subject_name: assignment.subject_name,
        teacher_id: assignment.teacher_id, teacher_name: assignment.teacher_name,
        day: day, period_number: period.period_number,
        start_time: period.start_time, end_time: period.end_time, stage: section.stage
      });
      teacherDailyLoad[assignment.teacher_id][day]++; 
    };

    // 🚀 دالة مساعدة لفحص التعارض
    const canPlace = (teacherId, sectionId, day, period) => {
      const isSectionBusy = finalSchedule.some(s => s.section_id === sectionId && s.day === day && s.period_number === period.period_number);
      if (isSectionBusy) return false;
      const hasTeacherTimeClash = finalSchedule.some(s => s.teacher_id === teacherId && s.day === day && isTimeIntersecting(s.start_time, s.end_time, period.start_time, period.end_time));
      if (hasTeacherTimeClash) return false;
      return true;
    };

    for (const assignment of sortedAssignments) {
      const section = sections.find(s => s.id === assignment.section_id);
      if (!section) continue;

      const tConst = teacherConstraints[assignment.teacher_id] || { days: [...workingDays], periods: [...allPeriods] };
      const allowedDaysForTeacher = workingDays.filter(d => tConst.days.includes(d));

      if (allowedDaysForTeacher.length === 0) {
        failedPlacements += assignment.weekly_quota;
        continue;
      }

      let remainingLessons = assignment.weekly_quota;
      const maxPerDay = Math.ceil(assignment.weekly_quota / allowedDaysForTeacher.length); 

      for (let i = 0; i < remainingLessons; i++) {
        let preferredDays = shuffleArray([...allowedDaysForTeacher]);
        preferredDays.sort((d1, d2) => teacherDailyLoad[assignment.teacher_id][d1] - teacherDailyLoad[assignment.teacher_id][d2]);

        let isPlaced = false;

        // 🟢 المحاولة 1: التسكين المثالي (منع تكرار المادة + كسر الأنماط العشوائي)
        for (const day of preferredDays) {
          const subjectCountToday = finalSchedule.filter(s => s.section_id === section.id && s.day === day && s.subject_id === assignment.subject_id).length;
          if (subjectCountToday >= maxPerDay) continue;

          const availablePeriods = periods.filter(p => p.stage === section.stage && !p.is_break && tConst.periods.includes(p.period_number));
          
          let orderedPeriods = [];
          if (sharedTeachers.has(assignment.teacher_id)) {
            // كسر الجمود للمشتركين: خلط سلة الصباح وسلة المساء بدلاً من الترتيب الثابت
            if (section.stage === 'high') {
              const morning = shuffleArray(availablePeriods.filter(p => p.period_number <= 3));
              const afternoon = shuffleArray(availablePeriods.filter(p => p.period_number > 3));
              orderedPeriods = [...morning, ...afternoon];
            } else {
              const afternoon = shuffleArray(availablePeriods.filter(p => p.period_number >= 3));
              const morning = shuffleArray(availablePeriods.filter(p => p.period_number < 3));
              orderedPeriods = [...afternoon, ...morning];
            }
          } else {
            // كسر الجمود لغير المشتركين: خلط كامل لضمان عدم ثبات العربي في الحصة الأخيرة مثلاً
            orderedPeriods = shuffleArray(availablePeriods);
          }
          
          for (const period of orderedPeriods) {
            if (canPlace(assignment.teacher_id, section.id, day, period)) {
              commitPlacement(section, assignment, day, period);
              isPlaced = true;
              break; 
            }
          }
          if (isPlaced) break;
        }

        // 🟡 المحاولة 2: التغاضي عن قيد (عدم تكرار المادة) لسد الفراغات
        if (!isPlaced) {
           for (const day of shuffleArray([...allowedDaysForTeacher])) {
             const fallbackPeriods = shuffleArray(periods.filter(p => p.stage === section.stage && !p.is_break && tConst.periods.includes(p.period_number)));
             for (const period of fallbackPeriods) {
               if (canPlace(assignment.teacher_id, section.id, day, period)) {
                 commitPlacement(section, assignment, day, period);
                 isPlaced = true;
                 break; 
               }
             }
             if (isPlaced) break;
           }
        }

        // 🔴 المحاولة 3 (الإزاحة الذكية Swapping): 
        // نبحث عن حصة مشغولة بمعلم آخر في نفس الفصل، ونطلب من هذا المعلم أن ينتقل لفراغ آخر، لنأخذ مكانه!
        if (!isPlaced) {
          for (const day of shuffleArray([...allowedDaysForTeacher])) {
            if (isPlaced) break;
            const dayPeriods = periods.filter(p => p.stage === section.stage && !p.is_break && tConst.periods.includes(p.period_number));
            
            for (const period of shuffleArray(dayPeriods)) {
              // هل المعلم الحالي مشغول في مكان آخر في هذه الدقيقة؟ إذا نعم لا يمكننا الإزاحة هنا.
              const teacherYBusy = finalSchedule.some(s => s.teacher_id === assignment.teacher_id && s.day === day && isTimeIntersecting(s.start_time, s.end_time, period.start_time, period.end_time));
              if (teacherYBusy) continue;

              // من هو المعلم الذي يجلس في هذه الحصة الآن؟
              const blockingSlotIndex = finalSchedule.findIndex(s => s.section_id === section.id && s.day === day && s.period_number === period.period_number);
              
              if (blockingSlotIndex !== -1) {
                const blockingSlot = finalSchedule[blockingSlotIndex];
                
                // هل يمكننا نقل المعلم الزاحم (Z) إلى حصة أخرى في نفس اليوم لهذا الفصل؟
                for (const altPeriod of shuffleArray(dayPeriods)) {
                  if (altPeriod.period_number === period.period_number) continue;
                  
                  // هل الفصل فارغ في الحصة البديلة؟
                  const secFreeAtAlt = !finalSchedule.some(s => s.section_id === section.id && s.day === day && s.period_number === altPeriod.period_number);
                  if (!secFreeAtAlt) continue;

                  // هل المعلم الزاحم (Z) فارغ في الحصة البديلة؟
                  const teacherZBusyAtAlt = finalSchedule.some(s => s.teacher_id === blockingSlot.teacher_id && s.day === day && isTimeIntersecting(s.start_time, s.end_time, altPeriod.start_time, altPeriod.end_time));
                  
                  if (secFreeAtAlt && !teacherZBusyAtAlt) {
                    // نجحت الإزاحة! ننقل المعلم Z
                    finalSchedule[blockingSlotIndex].period_number = altPeriod.period_number;
                    finalSchedule[blockingSlotIndex].start_time = altPeriod.start_time;
                    finalSchedule[blockingSlotIndex].end_time = altPeriod.end_time;

                    // ونضع المعلم الحالي (Y) في المكان الذي فرغ للتو
                    commitPlacement(section, assignment, day, period);
                    isPlaced = true;
                    break;
                  }
                }
              }
              if (isPlaced) break;
            }
          }
        }
        
        if (!isPlaced) failedPlacements++;
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    addLog(`✅ اكتمل التوليد! تم تفعيل الانتشار العشوائي للمواد وتعبئة الفراغات بشكل استثنائي عبر محرك الإزاحة الذكي.`);
    if (failedPlacements > 0) addLog(`⚠️ تحذير: ${failedPlacements} حصة فشلت في التسكين بالرغم من الإزاحة! يرجى مراجعة أنصبة بعض المعلمين المزدحمة جداً.`);

    finalSchedule.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
    setGeneratedSchedules(finalSchedule);
    setGenerating(false);
  };

  const savePlanToDatabase = async () => {
    if (generatedSchedules.length === 0) return;
    setGenerating(true);
    addLog("💾 جاري الحفظ...");

    try {
      const { data: planData, error: planErr } = await supabase.from('auto_schedule_plans').insert({ name: planName, created_by: user.id }).select().single();
      if (planErr) throw planErr;

      const slotsPayload = generatedSchedules.map(slot => ({
        plan_id: planData.id, section_id: slot.section_id, subject_id: slot.subject_id, teacher_id: slot.teacher_id,
        day_of_week: slot.day, period_number: slot.period_number, stage: slot.stage, start_time: slot.start_time, end_time: slot.end_time
      }));

      for (let i = 0; i < slotsPayload.length; i += 500) {
        await supabase.from('auto_schedules').insert(slotsPayload.slice(i, i + 500));
      }

      addLog(`🎉 تم الحفظ!`);
      fetchSavedPlans();
      setActivePlanId(planData.id);
      alert('تم حفظ الخطة بنجاح.');
    } catch (err) { addLog(`❌ خطأ: ${err.message}`); } finally { setGenerating(false); }
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
      const { data: slots } = await supabase.from('auto_schedules').select('*, sections(name, classes(name)), teachers(users(full_name)), subjects(name)').eq('plan_id', id);
      const formatted = (slots || []).map(s => ({
        ...s, day: s.day_of_week, section_name: `${Array.isArray(s.sections?.classes) ? s.sections?.classes[0]?.name : s.sections?.classes?.name} - ${s.sections?.name}`,
        teacher_name: s.teachers?.users?.full_name, subject_name: s.subjects?.name
      }));
      formatted.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      setGeneratedSchedules(formatted);
      setActivePlanId(id);
      setDisplayMode('grid');
    } catch(e) {} finally { setGenerating(false); }
  };

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

  const getDayName = (day: number) => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    return days[day - 1] || day;
  };

  const uniqueTeachersInSchedule = useMemo(() => {
    const tMap = new Map();
    generatedSchedules.forEach(s => {
      if (!tMap.has(s.teacher_id)) tMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name });
    });
    return Array.from(tMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [generatedSchedules]);

  if (currentRole !== 'admin' && currentRole !== 'management') return <div className="p-10 text-center font-bold">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      
      {/* Modal الإعدادات */}
      <AnimatePresence>
        {isTeacherModalOpen && selectedTeacherObj && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setIsTeacherModalOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, y: 100 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 100 }} 
               className="fixed bottom-0 left-0 w-full sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" 
               dir="rtl"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-200"><UserCog className="w-5 h-5"/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base md:text-lg">قيود وتوفر المعلم</h3>
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-0.5">المعلم: {selectedTeacherObj.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsTeacherModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 bg-white rounded-full shadow-sm border border-slate-200 transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-sm font-black text-indigo-900 mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500"/> أيام الدوام المسموحة</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {workingDays.map(day => (
                      <label key={day} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${tempConstraints.days.includes(day) ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                        <input type="checkbox" checked={tempConstraints.days.includes(day)} onChange={() => toggleTempConstraint('days', day)} className="hidden" />
                        <span className="font-bold text-sm">{getDayName(day)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-black text-indigo-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500"/> الحصص المسموحة للتدريس</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {allPeriods.map(p => (
                      <label key={p} className={`flex items-center justify-center gap-1 p-2.5 rounded-xl border cursor-pointer transition-all shadow-sm ${tempConstraints.periods.includes(p) ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                        <input type="checkbox" checked={tempConstraints.periods.includes(p)} onChange={() => toggleTempConstraint('periods', p)} className="hidden" />
                        <span className="font-black text-xs md:text-sm">الحصة {p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 flex gap-3 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={() => setIsTeacherModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={saveTeacherConstraints} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm border border-indigo-500">
                  <Save className="w-5 h-5" /> حفظ القيود
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-[2rem] p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] md:text-xs font-black text-indigo-300 mb-3 uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4" /> خوارزمية السلوك العشوائي وتعبئة الفراغات
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <Wand2 className="w-6 h-6 md:w-8 md:h-8 text-amber-400" /> محرك الجدولة الآلي الشامل
            </h1>
            <p className="text-slate-300 font-bold max-w-xl text-sm md:text-base">
              تم إضافة (الانتشار العشوائي) لضمان عدم ثبات المواد في حصص محددة، وتفعيل (الإزاحة الذكية) لملء الفراغات ومنع أي نقص في حصص الفصول!
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-500" /> الميزانية
                </h3>
                {isBudgetSaved ? (
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> معتمدة</span>
                ) : (
                  <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> بالانتظار</span>
                )}
              </div>
              
              <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                {uniqueSubjectClasses.length === 0 && !loadingData && (
                   <p className="text-xs font-bold text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">فارغ</p>
                )}
                
                {sortedClassNames.map(className => (
                  <div key={className} className="space-y-3">
                    <h4 className="font-black text-sm text-indigo-900 bg-indigo-50/80 px-3 py-2.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" /> {className}
                    </h4>
                    <div className="space-y-2 pl-3 border-r-2 border-indigo-100 mr-2">
                      {groupedSubjectsByClass[className].map(item => {
                        const key = `${item.subj_id}_${item.class_id}`;
                        const currentVal = subjectQuotas[key] !== undefined ? subjectQuotas[key] : 3;
                        const isZero = currentVal === 0;

                        return (
                          <div key={key} className={`flex items-center justify-between p-2.5 rounded-xl border shadow-sm transition-colors group ${isZero ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
                            <span className={`font-bold text-xs md:text-sm truncate ${isZero ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {item.subj_name} {isZero && <Ban className="w-3 h-3 inline-block mr-1 text-rose-400"/>}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                               <input 
                                 type="number" 
                                 min="0" 
                                 value={currentVal} 
                                 onChange={(e) => handleQuotaChange(key, parseInt(e.target.value))}
                                 className="w-12 md:w-14 p-1.5 text-center font-black rounded-lg outline-none bg-slate-50 border border-slate-200 text-slate-700 focus:border-indigo-500"
                               />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={saveBudget}
                disabled={loadingData || isBudgetSaved}
                className={`mt-4 w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-md flex justify-center items-center gap-2 ${isBudgetSaved ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 opacity-60' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <CheckSquare className="w-5 h-5" /> 
                {isBudgetSaved ? 'تم الاعتماد' : 'اعتماد الميزانية أولاً'}
              </button>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-indigo-500" /> إعدادات وأنصبة المعلمين
              </h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                انقر على الأيقونة ⚙️ لتحديد أيام دوام المعلم وحصصه المسموحة بدقة.
              </p>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {teacherWorkloads.map(([name, data]) => {
                  const tConst = teacherConstraints[data.id];
                  const hasCustomConstraints = tConst && (tConst.days.length < 5 || tConst.periods.length < 7);
                  
                  return (
                    <div key={data.id} className={`bg-white border p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors shadow-sm ${hasCustomConstraints ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm md:text-base text-slate-700">{name}</span>
                          {hasCustomConstraints && <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 w-fit mt-1">يوجد قيود دوام</span>}
                        </div>
                        <span className={`font-black text-xs md:text-sm px-2.5 py-1 rounded-lg shrink-0 ${data.total > 24 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>{data.total} حصة</span>
                      </div>
                      <button onClick={() => openTeacherConstraintsModal(data.id, name)} className={`w-full md:w-auto px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shrink-0 transition-all active:scale-95 shadow-sm border ${hasCustomConstraints ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-200'}`}>
                        <UserCog className="w-5 h-5" /> <span className="text-xs font-black">القيود والدوام</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-indigo-500" /> التوليد والحفظ
              </h3>
              <div className="space-y-4">
                <input type="text" value={planName} onChange={e=>setPlanName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:border-indigo-500 outline-none text-sm" placeholder="اسم الخطة..." />
                <button onClick={generateSchedule} disabled={loadingData || generating || !isBudgetSaved} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} توليد الجدول آلياً
                </button>
                {generatedSchedules.length > 0 && !activePlanId && (
                  <button onClick={savePlanToDatabase} disabled={generating} className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-sm transition-all active:scale-95 flex justify-center items-center gap-2">
                    <Save className="w-4 h-4" /> حفظ الخطة للرجوع لها
                  </button>
                )}
              </div>
              <div className="mt-6 bg-slate-900 rounded-2xl p-4 h-40 overflow-y-auto font-mono text-[10px] text-slate-300 shadow-inner flex flex-col-reverse custom-scrollbar">
                {generationLogs.length === 0 ? <span className="text-center opacity-50 m-auto">محرك الذكاء بانتظار الإطلاق...</span> : generationLogs.map((log, i) => <div key={i} className={`mb-1 border-b border-white/5 pb-1 ${log.includes('❌') || log.includes('⚠️') ? 'text-rose-400' : log.includes('✅') ? 'text-emerald-400' : ''}`}>&gt; {log}</div>)}
              </div>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[600px] overflow-hidden">
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                 <div className="flex items-center gap-3">
                   <h2 className="text-lg font-black text-slate-800">عارض الجداول الذكي</h2>
                   <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{generatedSchedules.length} حصة</span>
                 </div>
                 {generatedSchedules.length > 0 && (
                   <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-fit">
                     <button onClick={() => setDisplayMode('grid')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${displayMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid className="w-4 h-4" /> عرض شبكي</button>
                     <button onClick={() => setDisplayMode('raw')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${displayMode === 'raw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><List className="w-4 h-4" /> عرض خام</button>
                   </div>
                 )}
              </div>
              
              <div className="flex-1 bg-slate-50/30 relative">
                {generatedSchedules.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <CalendarDays className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold text-lg">لا يوجد جدول للعرض</p>
                  </div>
                ) : displayMode === 'raw' ? (
                  <div className="p-5 overflow-y-auto absolute inset-0 custom-scrollbar space-y-3">
                     {generatedSchedules.slice(0, 150).map((slot, i) => (
                       <div key={i} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-white shrink-0 bg-slate-800"><span className="text-[9px]">يوم</span><span className="text-base leading-none">{slot.day}</span></div>
                            <div>
                               <p className="font-black text-sm text-slate-800">{slot.section_name}</p>
                               <div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">حصة {slot.period_number}</span></div>
                            </div>
                          </div>
                          <div className="text-right bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[120px]"><p className="text-xs font-black text-slate-700 truncate">{slot.subject_name}</p><p className="text-[10px] font-bold text-slate-500 truncate mt-1">{slot.teacher_name}</p></div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col">
                    <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
                      <select value={gridFilterType} onChange={(e) => { setGridFilterType(e.target.value as any); setGridFilterId(''); }} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-indigo-500">
                        <option value="section">عرض جدول (فصل محدد)</option><option value="teacher">عرض جدول (معلم محدد)</option>
                      </select>
                      <select value={gridFilterId} onChange={(e) => setGridFilterId(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500">
                        <option value="" disabled>-- اختر --</option>
                        {gridFilterType === 'section' ? sections.filter(s => generatedSchedules.some(gs => gs.section_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>) : uniqueTeachersInSchedule.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-50 p-4 custom-scrollbar">
                      {!gridFilterId ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-bold">يرجى اختيار معلم أو فصل</div>
                      ) : (
                        <div className="min-w-[800px] border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-center border-collapse">
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="p-4 font-black w-32 border-b-2 border-slate-900 border-l border-white/10">اليوم</th>
                                {allPeriods.map(p => <th key={p} className="p-3 font-black border-b-2 border-slate-900 border-l border-white/10 last:border-l-0">الحصة {p}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {workingDays.map((day) => (
                                <tr key={day} className="border-b border-slate-200 last:border-b-0">
                                  <td className="p-4 font-black text-slate-700 bg-slate-100 border-l border-slate-200">{getDayName(day)}</td>
                                  {allPeriods.map(p => {
                                    const slot = generatedSchedules.find(s => s.day === day && s.period_number === p && (gridFilterType === 'section' ? s.section_id === gridFilterId : s.teacher_id === gridFilterId));
                                    return (
                                      <td key={p} className="p-2 border-l border-slate-200 last:border-l-0 relative min-w-[120px] h-24 align-top hover:bg-indigo-50/50 transition-colors">
                                        {slot ? (
                                          <div className="bg-white border border-indigo-100 shadow-sm rounded-xl p-2 h-full flex flex-col justify-between overflow-hidden">
                                            <div className="font-black text-indigo-900 text-xs leading-tight mb-1 truncate" title={slot.subject_name}>{slot.subject_name}</div>
                                            <div className="font-bold text-[10px] text-slate-500 bg-slate-50 px-1.5 py-1 rounded-md truncate border border-slate-100" title={gridFilterType === 'section' ? slot.teacher_name : slot.section_name}>{gridFilterType === 'section' ? slot.teacher_name : slot.section_name}</div>
                                          </div>
                                        ) : (<div className="flex items-center justify-center h-full text-slate-300"><span className="text-xl opacity-50">-</span></div>)}
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
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


