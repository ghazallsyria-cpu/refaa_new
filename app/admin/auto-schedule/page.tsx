// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, Settings, Play, CheckCircle2, AlertTriangle, 
  Loader2, Save, X, CalendarDays, Clock, Users, Trash2, SlidersHorizontal, Layers, CheckSquare, Ban, Briefcase, UserCog, LayoutGrid, List, MousePointerClick, AlertOctagon, Repeat, Activity, XCircle, CheckCircle, CloudDownload, Video, Printer, FileDown, CheckSquare2, Square
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

const getDayName = (day: number) => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  return days[day - 1] || day;
};

const formatClassName = (rawName?: string) => {
  if (!rawName) return '';
  return rawName.replace('الصف ', '').trim();
};

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

export default function AutoScheduleGenerator() {
  const { user, authRole, userRole, isChecking } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [mounted, setMounted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  
  const [sections, setSections] = useState<any[]>([]);
  const [rawTeacherAssignments, setRawTeacherAssignments] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [uniqueSubjectClasses, setUniqueSubjectClasses] = useState<{subj_id: string, class_id: string, class_name: string, subj_name: string}[]>([]);
  const [subjectQuotas, setSubjectQuotas] = useState<Record<string, number>>({});
  
  const [teacherConstraints, setTeacherConstraints] = useState<Record<string, { days: number[], periods: number[] }>>({});
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedTeacherObj, setSelectedTeacherObj] = useState<{id: string, name: string} | null>(null);
  const [tempConstraints, setTempConstraints] = useState<{days: number[], periods: number[]}>({days: [], periods: []});

  const [isBudgetSaved, setIsBudgetSaved] = useState(false);

  const workingDays = [1, 2, 3, 4, 5]; 
  
  const dynamicPeriods = useMemo(() => {
    if (!periods || !Array.isArray(periods) || periods.length === 0) return [1, 2, 3, 4, 5, 6, 7];
    const maxPeriod = Math.max(...periods.map(p => Number(p.period_number) || 1));
    const safeMax = (maxPeriod === -Infinity || maxPeriod < 1 || isNaN(maxPeriod)) ? 7 : maxPeriod;
    return Array.from({length: safeMax}, (_, i) => i + 1);
  }, [periods]);

  const [planName, setPlanName] = useState('جدول الفصل الدراسي الثاني - معتمد');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  
  const [generatedSchedules, setGeneratedSchedules] = useState<any[]>([]);
  const [unplacedLessons, setUnplacedLessons] = useState<any[]>([]);
  const [manualAssignModalOpen, setManualAssignModalOpen] = useState(false);
  const [lessonToAssign, setLessonToAssign] = useState<any>(null);

  const [displayMode, setDisplayMode] = useState<'grid' | 'raw'>('grid');
  const [gridFilterType, setGridFilterType] = useState<'section' | 'teacher'>('section');
  const [gridFilterId, setGridFilterId] = useState<string>('');

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);

  const [isPrintCenterOpen, setIsPrintCenterOpen] = useState(false);
  const [batchPrintIds, setBatchPrintIds] = useState<string[]>([]);
  const [batchPrintType, setBatchPrintType] = useState<'section' | 'teacher'>('section');
  const [printMode, setPrintMode] = useState<'single' | 'custom-batch'>('single');
  const [entitiesToPrint, setEntitiesToPrint] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentRole !== 'admin' && currentRole !== 'management') return;
    
    fetchMasterData();
    fetchSavedPlans();

    if (typeof window !== 'undefined') {
      const localDraft = localStorage.getItem('auto_schedule_current_draft_v1');
      const localUnplaced = localStorage.getItem('auto_schedule_unplaced_draft_v1');
      if (localDraft) {
        try {
          setGeneratedSchedules(JSON.parse(localDraft));
          if (localUnplaced) setUnplacedLessons(JSON.parse(localUnplaced));
          setGenerationLogs(['🔄 تم استرجاع مسودتك المحلية السابقة بنجاح!']);
        } catch (e) {}
      }
    }
  }, [currentRole]);

  const saveToLocalDraft = (schedules: any[], unplaced: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_schedule_current_draft_v1', JSON.stringify(schedules));
      localStorage.setItem('auto_schedule_unplaced_draft_v1', JSON.stringify(unplaced));
    }
  };

  const clearLocalDraft = () => {
    if(!confirm('هل أنت متأكد من مسح مسودة الجدول الحالي وبدء العمل من الصفر؟')) return;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auto_schedule_current_draft_v1');
      localStorage.removeItem('auto_schedule_unplaced_draft_v1');
    }
    setGeneratedSchedules([]);
    setUnplacedLessons([]);
    setActivePlanId(null);
    setGenerationLogs(['🧹 تم مسح اللوحة. يمكنك توليد جدول جديد الآن.']);
  };

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
      const { data: deptsData } = await supabase.from('academic_departments').select('id, name');
      setDepartments(deptsData || []);

      const { data: sectionsData } = await supabase.from('sections').select('id, name, class_id, classes(id, name, level)');
      const formattedSections = (sectionsData || []).map(sec => {
        const cData = Array.isArray(sec.classes) ? sec.classes[0] : sec.classes;
        const level = cData?.level || 0;
        const className = cData?.name || 'صف غير محدد';
        const classId = sec.class_id || cData?.id; 
        const stage = level >= 10 ? 'high' : 'middle';
        return { ...sec, class_id: classId, class_name: className, level, stage, full_name: `${className} - ${sec.name}` };
      });
      formattedSections.sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));
      setSections(formattedSections);

      const { data: periodsData } = await supabase.from('auto_class_periods').select('*').order('period_number');
      setPeriods(periodsData || []);

      let tsData = [];
      const { data: tsDataWithZoom, error: zoomError } = await supabase.from('teacher_sections').select('teacher_id, section_id, subject_id, teachers(department_id, users(full_name, zoom_link), zoom_link), subjects(name)');
      if (zoomError) {
         const { data: safeData } = await supabase.from('teacher_sections').select('teacher_id, section_id, subject_id, teachers(department_id, users(full_name)), subjects(name)');
         tsData = safeData || [];
      } else {
         tsData = tsDataWithZoom || [];
      }

      // درع التنقية لضمان عدم وجود حصص مكررة وهمية
      const uniqueAssignmentsMap = new Map();
      tsData.forEach(ts => {
         const uniqueKey = `${ts.section_id}_${ts.subject_id}`;
         if (!uniqueAssignmentsMap.has(uniqueKey)) {
            uniqueAssignmentsMap.set(uniqueKey, ts);
         }
      });
      const cleanTsData = Array.from(uniqueAssignmentsMap.values());
      
      setRawTeacherAssignments(cleanTsData);

      if (cleanTsData && formattedSections.length > 0) {
        const subjClassMap = new Map();
        cleanTsData.forEach(ts => {
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

        let initialQuotas: Record<string, number> = {};
        if (typeof window !== 'undefined') {
          const savedQuotasStr = localStorage.getItem('auto_schedule_quotas_v3') || localStorage.getItem('auto_schedule_quotas_temp');
          if (savedQuotasStr) { 
             try { initialQuotas = JSON.parse(savedQuotasStr); } catch (e) {} 
          }
          if (localStorage.getItem('auto_schedule_quotas_v3')) {
             setIsBudgetSaved(true);
          }
        }
        
        subjClassList.forEach(item => { 
           const key = `${item.subj_id}_${item.class_id}`; 
           if (initialQuotas[key] === undefined) initialQuotas[key] = 3; 
        });
        setSubjectQuotas(initialQuotas);

        let initialConstraints: Record<string, { days: number[], periods: number[] }> = {};
        if (typeof window !== 'undefined') {
          const savedConstraintsStr = localStorage.getItem('auto_schedule_teacher_constraints');
          if (savedConstraintsStr) { try { initialConstraints = JSON.parse(savedConstraintsStr); } catch (e) {} }
        }
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_schedule_quotas_temp', JSON.stringify(newQuotas));
    }
  };

  const saveBudget = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_schedule_quotas_v3', JSON.stringify(subjectQuotas));
      localStorage.setItem('auto_schedule_quotas_temp', JSON.stringify(subjectQuotas));
    }
    setIsBudgetSaved(true);
    alert('تم اعتماد الميزانية بنجاح.');
  };

  const openTeacherConstraintsModal = (id: string, name: string) => {
    setSelectedTeacherObj({ id, name });
    const existing = teacherConstraints[id] || { days: [...workingDays], periods: [...dynamicPeriods] };
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_schedule_teacher_constraints', JSON.stringify(newConstraints));
    }
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
  // 🧠 THE CORE ALGORITHM (Strict Budget Enforcement)
  // ==========================================
  const generateSchedule = async () => {
    if (!isBudgetSaved) { alert("يرجى اعتماد الميزانية أولاً."); return; }
    if (sections.length === 0 || rawTeacherAssignments.length === 0 || periods.length === 0) { alert("بيانات غير مكتملة."); return; }

    setGenerating(true); setGenerationLogs([]); setUnplacedLessons([]); setActivePlanId(null);
    
    addLog("🚀 بدء التوليد... (يتم الآن قراءة الميزانية المعتمدة بصرامة تامة)");
    
    // 🚀 القراءة المباشرة للميزانية من الذاكرة لضمان عدم وجود أخطاء في واجهة React
    let activeQuotas = { ...subjectQuotas };
    if (typeof window !== 'undefined') {
        const tempQ = localStorage.getItem('auto_schedule_quotas_temp');
        if (tempQ) {
            try { activeQuotas = JSON.parse(tempQ); } catch(e) {}
        }
    }
    
    const teacherAssignments = rawTeacherAssignments.map(ts => {
      const section = sections.find(s => s.id === ts.section_id);
      const key = section ? `${ts.subject_id}_${section.class_id}` : '';
      
      // 🚀 ربط فولاذي: استخدام الأرقام من الذاكرة المباشرة فقط!
      const quota = key ? (activeQuotas[key] !== undefined ? activeQuotas[key] : 3) : 3;
      
      const tConst = teacherConstraints[ts.teacher_id] || { days: [...workingDays], periods: [...dynamicPeriods] };
      const isEhab = (ts.teachers?.users?.full_name || '').includes('ايهاب') || (ts.teachers?.users?.full_name || '').includes('إيهاب');
      const isEhabPhysics = isEhab && section?.stage === 'high' && ((ts.subjects?.name || '').includes('فيزياء') || (ts.subjects?.name || '').includes('فيزيا'));
      const zoomLink = ts.teachers?.users?.zoom_link || ts.teachers?.zoom_link || null;

      const maxPossibleSlots = tConst.days.length * tConst.periods.length;
      let effectiveQuota = quota;
      let forcedWaitlistCount = 0;
      if (quota > maxPossibleSlots) {
         effectiveQuota = maxPossibleSlots;
         forcedWaitlistCount = quota - maxPossibleSlots;
      }

      return {
        ...ts, weekly_quota: effectiveQuota, original_quota: quota, forced_waitlist: forcedWaitlistCount,
        teacher_name: ts.teachers?.users?.full_name || 'غير معروف',
        subject_name: ts.subjects?.name || 'مادة', class_name: section?.class_name, section_level: section?.level,
        stage: section?.stage, available_days: tConst.days, available_periods: tConst.periods,
        isVIP: isEhabPhysics, zoom_link: zoomLink
      };
    }).filter(ta => ta.original_quota > 0); // الحصص الصفرية لن تدخل التوليد إطلاقاً

    const teacherTotalQuotas: Record<string, number> = {};
    teacherAssignments.forEach(ta => {
      if (!teacherTotalQuotas[ta.teacher_id]) teacherTotalQuotas[ta.teacher_id] = 0;
      teacherTotalQuotas[ta.teacher_id] += ta.weekly_quota;
    });

    let absoluteBestSchedule = [];
    let absoluteBestUnplaced = Array(1000).fill(null); 
    let absoluteBestFailedCount = 1000;
    
    const MAX_ATTEMPTS = 15; 
    await new Promise(r => setTimeout(r, 100)); 

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let finalSchedule = [];
        let unplacedQueue = []; 
        let failedPlacements = 0;
        
        const ignoreFairness = attempt > 10; 
        const relaxation = attempt > 5 ? 2 : 0; 
        const emergencyForce = attempt > 12; 

        const teacherMaxDailyLoad: Record<string, number> = {};
        Object.keys(teacherTotalQuotas).forEach(tId => {
           const tConst = teacherConstraints[tId] || { days: [...workingDays] };
           let availableDaysCount = tConst.days.length || 5;
           const hasVIP = teacherAssignments.some(ta => ta.teacher_id === tId && ta.isVIP);
           if (hasVIP && availableDaysCount > 2) availableDaysCount = 2;
           
           const total = teacherTotalQuotas[tId];
           let baseMax = Math.ceil(total / availableDaysCount);
           if (baseMax < 2) baseMax = 2; 
           teacherMaxDailyLoad[tId] = baseMax;
        });
        
        const teacherDailyLoad: Record<string, Record<number, number>> = {};
        teacherAssignments.forEach(ta => { 
            teacherDailyLoad[ta.teacher_id] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; 
        });

        const sortedAssignments = [...teacherAssignments].sort((a, b) => {
          if (a.isVIP && !b.isVIP) return -1;
          if (!a.isVIP && b.isVIP) return 1;
          
          const restrictA = a.available_days.length < 5 ? 1 : 0;
          const restrictB = b.available_days.length < 5 ? 1 : 0;
          if (restrictA !== restrictB) return restrictB - restrictA;
          
          if (a.weekly_quota !== b.weekly_quota) return b.weekly_quota - a.weekly_quota;
          
          return Math.random() - 0.5;
        });

        const commitPlacement = (section, assignment, day, period) => {
          finalSchedule.push({
            id: crypto.randomUUID(), 
            section_id: section.id, section_name: section.full_name,
            subject_id: assignment.subject_id, subject_name: assignment.subject_name,
            teacher_id: assignment.teacher_id, teacher_name: assignment.teacher_name,
            day: day, period_number: period.period_number,
            start_time: period.start_time, end_time: period.end_time, stage: section.stage,
            isVIP: assignment.isVIP, zoom_link: assignment.zoom_link 
          });
          teacherDailyLoad[assignment.teacher_id][day]++; 
        };

        const canPlaceAbsolute = (teacherId, section, day, period, subjectId, maxAllowedPerDay, enforceStrictSpread, allowedDaysCount, enforceLoadBalance = true) => {
          const isHighSchool = section.stage === 'high';
          if (isHighSchool && enforceLoadBalance && !emergencyForce && !ignoreFairness) {
              if (teacherDailyLoad[teacherId][day] >= (teacherMaxDailyLoad[teacherId] + relaxation)) return false;
          }

          // 🚀 الحراسة الصارمة: لا يمكن وضع مادتين في نفس اليوم ونفس الحصة للفصل! (تمنع "حل محلها حصص أخرى")
          if (finalSchedule.some(s => s.section_id === section.id && s.day === day && s.period_number === period.period_number)) return false;
          if (finalSchedule.some(s => s.teacher_id === teacherId && s.day === day && isTimeIntersecting(s.start_time, s.end_time, period.start_time, period.end_time))) return false;
          
          const subjectSlots = finalSchedule.filter(s => s.section_id === section.id && s.subject_id === subjectId);
          const subjectCountToday = subjectSlots.filter(s => s.day === day).length;
          
          if (subjectCountToday >= maxAllowedPerDay) return false;

          if (enforceStrictSpread && attempt < 10 && subjectCountToday >= 1) {
              const daysUsed = new Set(subjectSlots.map(s => s.day)).size;
              if (daysUsed < allowedDaysCount) { return false; }
          }
          return true;
        };

        for (const assignment of sortedAssignments) {
          const section = sections.find(s => s.id === assignment.section_id);
          if (!section) continue;

          for(let i=0; i<assignment.forced_waitlist; i++) {
             unplacedQueue.push({...assignment, section_id: section.id, section_name: section.full_name, stage: section.stage, id: crypto.randomUUID()});
             failedPlacements++;
          }

          let remainingLessons = assignment.weekly_quota;
          let allowedDaysForTeacher = workingDays.filter(d => assignment.available_days.includes(d));
          if(allowedDaysForTeacher.length === 0) continue;

          let maxPerDay = 1; 
          if (assignment.weekly_quota >= 5) maxPerDay = 2; 
          const forcedMax = Math.ceil(assignment.weekly_quota / allowedDaysForTeacher.length);
          if (forcedMax > maxPerDay) maxPerDay = forcedMax; 
          if (assignment.isVIP) maxPerDay = Math.ceil(assignment.weekly_quota / 2); 

          const getBestDays = () => {
             let days = shuffleArray([...allowedDaysForTeacher]);
             days.sort((d1, d2) => teacherDailyLoad[assignment.teacher_id][d1] - teacherDailyLoad[assignment.teacher_id][d2]);
             if (assignment.isVIP) {
                const vipDays = days.filter(d => d === 1 || d === 2);
                if (vipDays.length > 0) return vipDays;
             }
             return days;
          };

          for (let i = 0; i < remainingLessons; i++) {
            let isPlaced = false;

            for (const day of getBestDays()) {
              let availablePeriods = periods.filter(p => p.stage === section.stage && !p.is_break && assignment.available_periods.includes(p.period_number));
              if (assignment.isVIP) availablePeriods = availablePeriods.filter(p => p.period_number <= 3);
              
              let orderedPeriods = shuffleArray(availablePeriods);
              for (const period of orderedPeriods) {
                if (canPlaceAbsolute(assignment.teacher_id, section, day, period, assignment.subject_id, maxPerDay, !assignment.isVIP, allowedDaysForTeacher.length, true)) {
                  commitPlacement(section, assignment, day, period);
                  isPlaced = true; break; 
                }
              }
              if (isPlaced) break;
            }

            if (!isPlaced) {
               for (const day of getBestDays()) {
                 const fallbackPeriods = shuffleArray(periods.filter(p => p.stage === section.stage && !p.is_break && assignment.available_periods.includes(p.period_number)));
                 for (const period of fallbackPeriods) {
                   if (canPlaceAbsolute(assignment.teacher_id, section, day, period, assignment.subject_id, maxPerDay, false, allowedDaysForTeacher.length, true)) {
                     commitPlacement(section, assignment, day, period);
                     isPlaced = true; break; 
                   }
                 }
                 if (isPlaced) break;
               }
            }

            if (!isPlaced && !assignment.isVIP) {
              for (const day of getBestDays()) {
                const dayPeriods = shuffleArray(periods.filter(p => p.stage === section.stage && !p.is_break && assignment.available_periods.includes(p.period_number)));
                
                for (const period of dayPeriods) {
                  const teacherYBusy = finalSchedule.some(s => s.teacher_id === assignment.teacher_id && s.day === day && isTimeIntersecting(s.start_time, s.end_time, period.start_time, period.end_time));
                  const subjCountToday = finalSchedule.filter(s => s.section_id === section.id && s.day === day && s.subject_id === assignment.subject_id).length;
                  
                  if (section.stage === 'high' && !ignoreFairness && teacherDailyLoad[assignment.teacher_id][day] >= (teacherMaxDailyLoad[assignment.teacher_id] + relaxation)) continue;
                  if (teacherYBusy || subjCountToday >= maxPerDay) continue; 

                  const blockingSlotIndex = finalSchedule.findIndex(s => s.section_id === section.id && s.day === day && s.period_number === period.period_number);
                  if (blockingSlotIndex !== -1) {
                    const blockingSlot = finalSchedule[blockingSlotIndex];
                    if (blockingSlot.isVIP) continue; 
                    
                    const teacherZConstraints = teacherConstraints[blockingSlot.teacher_id] || { days: [...workingDays], periods: [...dynamicPeriods] };
                    
                    let allowedDaysZ = shuffleArray(workingDays.filter(d => teacherZConstraints.days.includes(d)));
                    allowedDaysZ.sort((d1, d2) => teacherDailyLoad[blockingSlot.teacher_id][d1] - teacherDailyLoad[blockingSlot.teacher_id][d2]);
                    
                    const zAssignment = teacherAssignments.find(ta => ta.teacher_id === blockingSlot.teacher_id && ta.subject_id === blockingSlot.subject_id);
                    const zAllowedDaysCount = workingDays.filter(d => zAssignment?.available_days.includes(d)).length || 5;
                    
                    let zMaxPerDay = 1;
                    if (zAssignment) {
                        zMaxPerDay = Math.ceil(zAssignment.weekly_quota / zAllowedDaysCount);
                        if (zAssignment.weekly_quota >= 5 && zMaxPerDay < 2) zMaxPerDay = 2;
                    }

                    let swapped = false;
                    for (const altDay of allowedDaysZ) {
                       if(swapped) break;
                       
                       const isZHighSchool = blockingSlot.stage === 'high';
                       if (isZHighSchool && !ignoreFairness && teacherDailyLoad[blockingSlot.teacher_id][altDay] >= (teacherMaxDailyLoad[blockingSlot.teacher_id] + relaxation)) continue;

                       const altPeriods = shuffleArray(periods.filter(p => p.stage === section.stage && !p.is_break && teacherZConstraints.periods.includes(p.period_number)));
                       for (const altPeriod of altPeriods) {
                          if (altDay === day && altPeriod.period_number === period.period_number) continue;
                          const tempSchedule = finalSchedule.filter((_, idx) => idx !== blockingSlotIndex);
                          
                          const secFreeAtAlt = !tempSchedule.some(s => s.section_id === section.id && s.day === altDay && s.period_number === altPeriod.period_number);
                          if (!secFreeAtAlt) continue;
                          
                          const teacherZBusyAtAlt = tempSchedule.some(s => s.teacher_id === blockingSlot.teacher_id && s.day === altDay && isTimeIntersecting(s.start_time, s.end_time, altPeriod.start_time, altPeriod.end_time));
                          if (teacherZBusyAtAlt) continue;

                          const zSubjectSlots = tempSchedule.filter(s => s.section_id === section.id && s.subject_id === blockingSlot.subject_id);
                          const zSubjectCountAltDay = zSubjectSlots.filter(s => s.day === altDay).length;
                          
                          if (zSubjectCountAltDay >= zMaxPerDay) continue;
                          
                          let safeSpreadForZ = true;
                          if (zSubjectCountAltDay >= 1) {
                              const zDaysUsed = new Set(zSubjectSlots.map(s => s.day)).size;
                              if (zDaysUsed < zAllowedDaysCount) safeSpreadForZ = false; 
                          }

                          if (safeSpreadForZ) {
                            finalSchedule[blockingSlotIndex].day = altDay;
                            finalSchedule[blockingSlotIndex].period_number = altPeriod.period_number;
                            finalSchedule[blockingSlotIndex].start_time = altPeriod.start_time;
                            finalSchedule[blockingSlotIndex].end_time = altPeriod.end_time;
                            
                            teacherDailyLoad[blockingSlot.teacher_id][day]--;
                            teacherDailyLoad[blockingSlot.teacher_id][altDay]++;

                            commitPlacement(section, assignment, day, period);
                            isPlaced = true; 
                            swapped = true;
                            break;
                          }
                       }
                    }
                  }
                  if (isPlaced) break;
                }
              }
            }

            if (!isPlaced && emergencyForce) {
               for (const day of shuffleArray([...allowedDaysForTeacher])) {
                 const emergencyPeriods = shuffleArray(periods.filter(p => p.stage === section.stage && !p.is_break && assignment.available_periods.includes(p.period_number)));
                 for (const period of emergencyPeriods) {
                   if (canPlaceAbsolute(assignment.teacher_id, section, day, period, assignment.subject_id, maxPerDay + 2, false, allowedDaysForTeacher.length, false)) {
                     commitPlacement(section, assignment, day, period);
                     isPlaced = true; break; 
                   }
                 }
                 if (isPlaced) break;
               }
            }
            
            if (!isPlaced) {
              failedPlacements++;
              unplacedQueue.push({
                 id: crypto.randomUUID(), section_id: section.id, section_name: section.full_name,
                 subject_id: assignment.subject_id, subject_name: assignment.subject_name,
                 teacher_id: assignment.teacher_id, teacher_name: assignment.teacher_name,
                 stage: section.stage, zoom_link: assignment.zoom_link
              });
            }
          }
        } 

        if (failedPlacements < absoluteBestFailedCount) {
           absoluteBestFailedCount = failedPlacements;
           absoluteBestSchedule = [...finalSchedule];
           absoluteBestUnplaced = [...unplacedQueue];
        }
        if (failedPlacements === 0) break;
    } 

    await new Promise(r => setTimeout(r, 800)); 
    
    absoluteBestSchedule.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
    setGeneratedSchedules(absoluteBestSchedule);
    setUnplacedLessons(absoluteBestUnplaced);
    setDisplayMode('grid');
    
    saveToLocalDraft(absoluteBestSchedule, absoluteBestUnplaced);

    if (absoluteBestFailedCount > 0) {
      addLog(`⚠️ اكتمل مع وجود ${absoluteBestFailedCount} حصص بالانتظار (القيود متضاربة جداً).`);
    } else {
      addLog(`🎉 إنجاز أسطوري! تم التسكين بالكامل والميزانية قُرأت بصرامة تامّة.`);
    }
    setGenerating(false);
  };

  const generateAuditReport = () => {
    let errors: string[] = [];
    let warnings: string[] = [];
    
    let stats = {
      totalAssigned: generatedSchedules.length,
      unplaced: unplacedLessons.length,
      teachersCount: new Set(generatedSchedules.map(s => s.teacher_id)).size,
      sectionsCount: new Set(generatedSchedules.map(s => s.section_id)).size,
    };

    if (stats.unplaced > 0) {
       errors.push(`فشل الاكتمال: يوجد ${stats.unplaced} حصص في سلة الانتظار لم يتم تسكينها.`);
    }

    const teacherTimeMap = new Map();
    const sectionTimeMap = new Map();

    generatedSchedules.forEach(slot => {
       const tKey = `${slot.teacher_id}_${slot.day}_${slot.start_time}`;
       const sKey = `${slot.section_id}_${slot.day}_${slot.start_time}`;

       if (teacherTimeMap.has(tKey)) errors.push(`تضارب خطير ❌: المعلم (${slot.teacher_name}) لديه حصتين في نفس الوقت يوم ${getDayName(slot.day)}!`);
       else teacherTimeMap.set(tKey, true);

       if (sectionTimeMap.has(sKey)) errors.push(`تضارب خطير ❌: الفصل (${slot.section_name}) لديه مادتين في نفس الوقت يوم ${getDayName(slot.day)}!`);
       else sectionTimeMap.set(sKey, true);
    });

    setAuditReport({ errors, warnings, stats });
    setIsAuditModalOpen(true);
  };

  const openManualAssignModal = (lesson: any) => {
    setLessonToAssign(lesson);
    setManualAssignModalOpen(true);
  };

  const handleManualCellClick = (day: number, periodNum: number) => {
    if (!lessonToAssign) return;

    const pData = periods.find(p => p.stage === lessonToAssign.stage && p.period_number === periodNum);
    if (!pData) return;

    const busySlot = generatedSchedules.find(s => s.teacher_id === lessonToAssign.teacher_id && s.day === day && isTimeIntersecting(s.start_time, s.end_time, pData.start_time, pData.end_time));
    if (busySlot) {
      alert(`ممنوع ❌: المعلم مشغول بتدريس فصل (${busySlot.section_name}) في هذا الوقت!`);
      return;
    }

    const occupantIndex = generatedSchedules.findIndex(s => s.section_id === lessonToAssign.section_id && s.day === day && s.period_number === periodNum);
    
    let newSchedules = [...generatedSchedules];
    let newUnplaced = unplacedLessons.filter(l => l.id !== lessonToAssign.id);

    if (occupantIndex !== -1) {
      const occupant = newSchedules[occupantIndex];
      const confirmSwap = confirm(`هذه الحصة مشغولة بمادة (${occupant.subject_name}). هل تريد سحبها وإدخال مادتك مكانها؟`);
      if (!confirmSwap) return;
      newUnplaced.push({...occupant, id: crypto.randomUUID()});
      newSchedules.splice(occupantIndex, 1);
    }

    newSchedules.push({
      id: crypto.randomUUID(),
      section_id: lessonToAssign.section_id, section_name: lessonToAssign.section_name,
      subject_id: lessonToAssign.subject_id, subject_name: lessonToAssign.subject_name,
      teacher_id: lessonToAssign.teacher_id, teacher_name: lessonToAssign.teacher_name,
      day: day, period_number: periodNum,
      start_time: pData.start_time, end_time: pData.end_time, stage: lessonToAssign.stage,
      zoom_link: lessonToAssign.zoom_link
    });

    newSchedules.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
    setGeneratedSchedules(newSchedules);
    setUnplacedLessons(newUnplaced);
    setManualAssignModalOpen(false);
    saveToLocalDraft(newSchedules, newUnplaced);
  };

  const savePlanToDatabase = async () => {
    if (generatedSchedules.length === 0) return;
    if (unplacedLessons.length > 0 && !confirm(`يوجد حصص لم يتم تسكينها! هل أنت متأكد من الحفظ؟`)) return;
    
    setGenerating(true);
    addLog("💾 جاري الحفظ في الخادم السحابي...");

    try {
      const { data: planData, error: planErr } = await supabase.from('auto_schedule_plans').insert({ name: planName, created_by: user.id }).select().single();
      if (planErr) throw planErr;

      const slotsPayload = generatedSchedules.map(slot => ({
        plan_id: planData.id, section_id: slot.section_id, subject_id: slot.subject_id, teacher_id: slot.teacher_id,
        day_of_week: slot.day, period_number: slot.period_number, stage: slot.stage, start_time: slot.start_time, end_time: slot.end_time
      }));

      for (let i = 0; i < slotsPayload.length; i += 500) {
        const { error: insertErr } = await supabase.from('auto_schedules').insert(slotsPayload.slice(i, i + 500));
        if (insertErr) throw insertErr;
      }

      addLog(`🎉 تم الحفظ بنجاح!`);
      fetchSavedPlans();
      setActivePlanId(planData.id);
      alert('تم حفظ الخطة بنجاح.');
    } catch (err) { addLog(`❌ خطأ: ${err.message}`); } finally { setGenerating(false); }
  };

  const loadPlan = async (id: string) => {
    setGenerating(true);
    addLog(`⏳ جاري استدعاء الجدول السحابي (بدون تغيير ميزانيتك المعتمدة)...`);
    try {
      let slots = [];
      const { data: slotsWithZoom, error: zoomErr } = await supabase.from('auto_schedules').select('*, sections(name, class_id, classes(name)), teachers(department_id, users(full_name, zoom_link), zoom_link), subjects(name)').eq('plan_id', id);
      
      if (zoomErr) {
         const { data: safeSlots, error: safeErr } = await supabase.from('auto_schedules').select('*, sections(name, class_id, classes(name)), teachers(department_id, users(full_name)), subjects(name)').eq('plan_id', id);
         if (safeErr) throw safeErr;
         slots = safeSlots || [];
      } else {
         slots = slotsWithZoom || [];
      }
      
      if (slots.length === 0) {
         addLog(`⚠️ الخطة محملة، لكنها فارغة تماماً!`);
         setGeneratedSchedules([]);
         return;
      } else {
         addLog(`✅ تم استرجاع ${slots.length} حصة من قاعدة البيانات.`);
      }

      const formatted = slots.map(slot => {
        const section = sections.find(s => String(s.id) === String(slot.section_id));
        const assignment = rawTeacherAssignments.find(ts => 
           String(ts.teacher_id) === String(slot.teacher_id) && 
           String(ts.subject_id) === String(slot.subject_id)
        );

        let tName = 'معلم غير محدد';
        let zLink = null;
        let sName = 'مادة غير محددة';

        if (assignment) {
           tName = assignment.teachers?.users?.full_name || assignment.teacher_name || 'معلم غير محدد';
           zLink = assignment.teachers?.users?.zoom_link || assignment.teachers?.zoom_link || assignment.zoom_link || null;
           sName = assignment.subjects?.name || assignment.subject_name || 'مادة غير محددة';
        }

        return {
          ...slot,
          id: crypto.randomUUID(), 
          day: slot.day_of_week || slot.day,
          section_name: section ? section.full_name : 'شعبة غير محددة',
          teacher_name: tName,
          subject_name: sName,
          stage: slot.stage || section?.stage,
          zoom_link: zLink
        };
      });

      formatted.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      
      // 🚀 تم حذف دالة تغيير الميزانية أوتوماتيكياً (استجابة للمشكلة التي اكتشفتها)
      
      setGeneratedSchedules(formatted);
      setActivePlanId(id);
      setDisplayMode('grid');
      addLog(`✅ تم تحميل الجدول المعتمد بنجاح!`);

    } catch(e) { 
      addLog(`❌ فشل استدعاء الجدول: ${e.message}`); 
    } finally { 
      setGenerating(false); 
    }
  };

  const getTeacherDept = (tId: string) => {
    const assignment = rawTeacherAssignments.find(ts => String(ts.teacher_id) === String(tId));
    if (assignment?.teachers?.department_id) {
        const dept = departments.find(d => String(d.id) === String(assignment.teachers.department_id));
        if (dept) return dept.name; 
    }

    const tSchedules = generatedSchedules.filter(s => String(s.teacher_id) === String(tId));
    if (tSchedules.length === 0) return 'أقسام أخرى';
    const subjName = tSchedules[0].subject_name || '';
    
    if (/(علوم|فيزياء|كيمياء|أحياء|احياء|جيولوجيا)/.test(subjName)) return 'العلوم';
    if (/(رياضيات|جبر|هندسة|احصاء|إحصاء)/.test(subjName)) return 'الرياضيات';
    if (/(عربي|عربية|أدب|ادب|بلاغة|نحو|صرف)/.test(subjName)) return 'اللغة العربية';
    if (/(إنجليزي|انجليزي|english)/i.test(subjName)) return 'اللغة الإنجليزية';
    if (/(إسلامية|اسلامية|قرآن|تجويد|دين|فقه|عقيدة|حديث)/.test(subjName)) return 'التربية الإسلامية';
    if (/(اجتماعيات|تاريخ|جغرافيا|فلسفة|علم نفس|نفس|وطنية|دستور|اقتصاد)/.test(subjName)) return 'الاجتماعيات';
    if (/(حاسوب|معلوماتية|it)/i.test(subjName)) return 'الحاسوب';
    
    return 'أقسام أخرى';
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

  const uniqueTeachersInSchedule = useMemo(() => {
    const tMap = new Map();
    generatedSchedules.forEach(s => {
      if (!tMap.has(s.teacher_id)) tMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name });
    });
    return Array.from(tMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [generatedSchedules]);

  const getPrintNameById = (id: string, type: 'section'|'teacher') => {
     if (type === 'section') {
       const sec = sections.find(s => s.id === id);
       return sec ? sec.full_name : 'غير محدد';
     } else {
       const t = uniqueTeachersInSchedule.find(t => t.id === id);
       return t ? t.name : 'غير محدد';
     }
  };

  const toggleBatchPrintId = (id: string) => {
    setBatchPrintIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllBatchIds = () => {
    if (batchPrintType === 'section') {
      const availableSecs = sections.filter(s => generatedSchedules.some(gs => gs.section_id === s.id)).map(s=>s.id);
      setBatchPrintIds(availableSecs);
    } else {
      setBatchPrintIds(uniqueTeachersInSchedule.map(t=>t.id));
    }
  };

  const handlePrintCommand = async (mode: string, filterVal: string = '') => {
    if (typeof window === 'undefined') return;
    setPrintMode(mode as any);
    setIsPrintCenterOpen(false);
    setIsGeneratingPDF(true);

    let entities: any[] = [];
    if (mode === 'single') {
      const singleEntity = gridFilterType === 'teacher' ? uniqueTeachersInSchedule.find(t => String(t.id) === String(gridFilterId)) : sections.find(s => String(s.id) === String(gridFilterId));
      if(singleEntity) entities = [singleEntity];
    } else if (mode === 'custom-batch') {
      if (batchPrintType === 'section') {
          entities = sections.filter(s => batchPrintIds.includes(s.id));
      } else {
          entities = uniqueTeachersInSchedule.filter(t => batchPrintIds.includes(t.id));
      }
    }

    if(entities.length === 0) {
      alert('لا توجد بيانات (جداول) لطباعتها في هذا التحديد.');
      setIsGeneratingPDF(false);
      return;
    }

    setEntitiesToPrint(entities);

    setTimeout(async () => {
      try {
        const jsPDFModule = (await import('jspdf')).default;
        const html2canvasModule = (await import('html2canvas-pro')).default;

        const containers = document.querySelectorAll('.batch-pdf-page');
        if (!containers || containers.length === 0) throw new Error('لم يتم العثور على جداول مبنية للطباعة.');

        const pdf = new jsPDFModule('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < containers.length; i++) {
          if (i > 0) pdf.addPage(); 
          const el = containers[i] as HTMLElement;

          const canvas = await html2canvasModule(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

          const links = el.querySelectorAll('a.zoom-link');
          const elementRect = el.getBoundingClientRect();

          links.forEach((link: any) => {
            const rect = link.getBoundingClientRect();
            if (elementRect.width > 0 && elementRect.height > 0) {
              const relativeX = (rect.left - elementRect.left) / elementRect.width;
              const relativeY = (rect.top - elementRect.top) / elementRect.height;
              const pdfX = relativeX * pdfWidth; 
              const pdfY = relativeY * pdfHeight;
              const finalUrl = normalizeUrl(link.href);
              
              if (finalUrl) {
                 pdf.link(pdfX, pdfY, (rect.width / elementRect.width) * pdfWidth, (rect.height / elementRect.height) * pdfHeight, { url: finalUrl });
              }
            }
          });
        }

        let fileName = 'الجدول_الدراسي.pdf';
        if (mode === 'single') fileName = `جدول_${getPrintNameById(gridFilterId, gridFilterType).replace(/\s+/g, '_')}.pdf`;
        if (mode === 'custom-batch') fileName = `جداول_مخصصة_مجمعة.pdf`;

        pdf.save(fileName);
      } catch (error: any) { 
        console.error(error);
        alert(error.message || 'حدث خطأ أثناء بناء وتصدير ملف الـ PDF.'); 
      } finally { 
        setIsGeneratingPDF(false); 
        setEntitiesToPrint([]); 
      }
    }, 1500); 
  };

  if (!mounted || loadingData || isChecking) {
     return (
       <div className="flex h-screen items-center justify-center bg-slate-50 font-cairo">
         <div className="flex flex-col items-center gap-5">
           <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
           <p className="text-indigo-600 font-black animate-pulse">جاري تحميل واجهة الإدارة...</p>
         </div>
       </div>
     );
  }

  if (currentRole !== 'admin' && currentRole !== 'management') return <div className="p-10 text-center font-bold">غير مصرح لك.</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo print-hide" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
           body { display: none !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 1px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />

      {/* Modal تقرير التدقيق والإحصائيات */}
      <AnimatePresence>
        {isAuditModalOpen && auditReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={() => setIsAuditModalOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]" 
               dir="rtl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 text-white rounded-xl shadow-inner border border-indigo-400"><Activity className="w-6 h-6"/></div>
                  <div>
                    <h3 className="font-black text-white text-lg">تقرير جودة وإحصائيات الجدول</h3>
                  </div>
                </div>
                <button onClick={() => setIsAuditModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 bg-slate-800 rounded-full transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 flex-1 overflow-auto bg-slate-50 custom-scrollbar space-y-6">
                 <div className="flex items-center justify-center p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="text-center">
                       <h4 className="text-sm font-bold text-slate-500 mb-2">الحالة الصحية للجدول</h4>
                       {auditReport.errors.length === 0 ? (
                          <div className="inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-full border border-emerald-200">
                             <CheckCircle className="w-8 h-8" />
                             <span className="text-2xl font-black">100% ممتاز ومطابق</span>
                          </div>
                       ) : (
                          <div className="inline-flex items-center gap-2 text-rose-600 bg-rose-50 px-6 py-3 rounded-full border border-rose-200">
                             <XCircle className="w-8 h-8" />
                             <span className="text-2xl font-black">يوجد {auditReport.errors.length} أخطاء</span>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                       <p className="text-xl font-black text-indigo-600">{auditReport.stats.totalAssigned}</p>
                       <p className="text-xs font-bold text-slate-500 mt-1">حصة مُسكنة</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                       <p className={`text-xl font-black ${auditReport.stats.unplaced === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{auditReport.stats.unplaced}</p>
                       <p className="text-xs font-bold text-slate-500 mt-1">في الانتظار</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                       <p className="text-xl font-black text-slate-700">{auditReport.stats.teachersCount}</p>
                       <p className="text-xs font-bold text-slate-500 mt-1">معلم مسجل</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                       <p className="text-xl font-black text-slate-700">{auditReport.stats.sectionsCount}</p>
                       <p className="text-xs font-bold text-slate-500 mt-1">فصل مسجل</p>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><List className="w-4 h-4"/> تفاصيل الفحص:</h4>
                    {auditReport.errors.length === 0 && auditReport.warnings.length === 0 ? (
                       <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-700 text-sm font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5"/> التباعد اليومي مثالي، لا يوجد تكرار عشوائي.
                       </div>
                    ) : (
                       <div className="space-y-2">
                          {auditReport.errors.map((err, idx) => (
                             <div key={idx} className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-xs font-bold flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/> {err}
                             </div>
                          ))}
                          {auditReport.warnings.map((warn, idx) => (
                             <div key={`w-${idx}`} className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-700 text-xs font-bold flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/> {warn}
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              </div>
              <div className="p-6 flex gap-3 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={() => setIsAuditModalOpen(false)} className="w-full py-3.5 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-900 transition-colors active:scale-95 text-sm shadow-sm">إغلاق التقرير</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal مركز الطباعة المجمعة للمدير */}
      <AnimatePresence>
        {isPrintCenterOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setIsPrintCenterOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]" 
               dir="rtl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-200"><Printer className="w-6 h-6"/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">مركز الطباعة المجمعة</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">اختر مجموعة من الجداول لطباعتها معاً</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintCenterOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 bg-white rounded-full shadow-sm border border-slate-200 transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 flex-1 overflow-auto bg-slate-50 custom-scrollbar">
                 <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button onClick={() => {setBatchPrintType('section'); setBatchPrintIds([]);}} className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${batchPrintType === 'section' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>طباعة فصول</button>
                    <button onClick={() => {setBatchPrintType('teacher'); setBatchPrintIds([]);}} className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${batchPrintType === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>طباعة معلمين</button>
                 </div>
                 
                 <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-xs font-bold text-slate-500">تم تحديد: {batchPrintIds.length}</span>
                    <button onClick={selectAllBatchIds} className="text-xs font-black text-indigo-600 hover:underline">تحديد الكل</button>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {batchPrintType === 'section' 
                      ? sections.filter(s => generatedSchedules.some(gs => gs.section_id === s.id)).map(s => (
                          <div key={s.id} onClick={() => toggleBatchPrintId(s.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${batchPrintIds.includes(s.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                             {batchPrintIds.includes(s.id) ? <CheckSquare2 className="w-4 h-4 text-indigo-500 shrink-0"/> : <Square className="w-4 h-4 text-slate-300 shrink-0"/>}
                             <span className="text-xs font-bold truncate">{s.full_name}</span>
                          </div>
                      ))
                      : uniqueTeachersInSchedule.map(t => (
                          <div key={t.id} onClick={() => toggleBatchPrintId(t.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${batchPrintIds.includes(t.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                             {batchPrintIds.includes(t.id) ? <CheckSquare2 className="w-4 h-4 text-indigo-500 shrink-0"/> : <Square className="w-4 h-4 text-slate-300 shrink-0"/>}
                             <span className="text-xs font-bold truncate">{t.name}</span>
                          </div>
                      ))
                    }
                 </div>
              </div>

              <div className="p-6 flex gap-3 border-t border-slate-100 shrink-0 bg-white">
                <button onClick={() => setIsPrintCenterOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 border border-slate-200 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={() => handlePrintCommand('custom-batch')} disabled={batchPrintIds.length===0} className="flex-[2] py-3.5 bg-slate-800 text-white font-black rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  <FileDown className="w-5 h-5" /> تحميل PDF للمحددين
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl text-white">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-400 mb-6" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثائق الـ PDF الذكية...</h2>
            <p className="text-slate-300 font-bold mt-3 text-lg">يرجى الانتظار، النظام يقوم بدمج الجداول وزراعة الروابط.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal التسكين اليدوي */}
      <AnimatePresence>
        {manualAssignModalOpen && lessonToAssign && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setManualAssignModalOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" 
               dir="rtl"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl shadow-inner border border-indigo-200"><MousePointerClick className="w-5 h-5"/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base md:text-lg">تسكين يدوي لحصة: {lessonToAssign.subject_name}</h3>
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-0.5">{lessonToAssign.section_name} | المعلم: {lessonToAssign.teacher_name}</p>
                  </div>
                </div>
                <button onClick={() => setManualAssignModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 bg-white rounded-full shadow-sm border border-slate-200 transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-5 flex-1 overflow-auto bg-slate-50 custom-scrollbar">
                 <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                   <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0" />
                   الخانة الخضراء: متاحة | الصفراء: المعلم متوفر لكن الفصل مشغول (النقر للتبديل) | الحمراء: المعلم مشغول أو الوقت ممنوع.
                 </p>
                 
                 <div className="min-w-[700px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="p-3 text-xs font-black border-l border-white/10 w-24">اليوم</th>
                          {dynamicPeriods.map(p => <th key={p} className="p-3 text-xs font-black border-l border-white/10 last:border-l-0">حصة {p}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {workingDays.map(day => (
                          <tr key={day} className="border-b border-slate-200 last:border-b-0">
                            <td className="p-3 text-xs font-black bg-slate-100 border-l border-slate-200">{getDayName(day)}</td>
                            {dynamicPeriods.map(p => {
                               const pData = periods.find(per => per.stage === lessonToAssign.stage && per.period_number === p);
                               if (!pData) return <td key={p} className="bg-slate-50 p-2 border-l border-slate-200"></td>;

                               const busySlot = generatedSchedules.find(s => s.teacher_id === lessonToAssign.teacher_id && s.day === day && isTimeIntersecting(s.start_time, s.end_time, pData.start_time, pData.end_time));
                               const occupant = generatedSchedules.find(s => s.section_id === lessonToAssign.section_id && s.day === day && s.period_number === p);
                               
                               const tConst = teacherConstraints[lessonToAssign.teacher_id] || { days: [...workingDays], periods: [...dynamicPeriods] };
                               const isAllowedTime = tConst.days.includes(day) && tConst.periods.includes(p);

                               let statusClass = "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 cursor-pointer text-emerald-700";
                               let statusText = "متاح ✔️";
                               
                               if (!isAllowedTime) {
                                  statusClass = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60";
                                  statusText = "وقت ممنوع";
                               } else if (busySlot) {
                                  statusClass = "bg-rose-50 border-rose-200 text-rose-500 cursor-not-allowed";
                               } else if (occupant) {
                                  statusClass = "bg-amber-50 hover:bg-amber-100 border-amber-200 cursor-pointer text-amber-700";
                                  statusText = occupant.subject_name;
                               }

                               return (
                                 <td 
                                   key={p} 
                                   onClick={() => !busySlot && isAllowedTime && handleManualCellClick(day, p)}
                                   className={`p-1 border-l border-b border-slate-200 last:border-l-0 transition-colors ${statusClass}`}
                                 >
                                   <div className="flex flex-col items-center justify-center h-14 overflow-hidden text-center px-0.5">
                                     {!isAllowedTime ? (
                                        <span className="text-[10px] font-black">{statusText}</span>
                                     ) : busySlot ? (
                                        <>
                                          <span className="text-[8px] font-black text-rose-600 bg-rose-100 px-1 rounded mb-0.5 w-full truncate">مشغول بـ:</span>
                                          <span className="text-[8px] font-bold leading-tight line-clamp-2 w-full" title={busySlot.section_name}>{busySlot.section_name}</span>
                                        </>
                                     ) : (
                                        <>
                                          <span className="text-[10px] font-black">{statusText}</span>
                                          {occupant && <span className="text-[8px] font-bold opacity-70 mt-1 flex items-center gap-1"><Repeat className="w-2.5 h-2.5"/> إزاحة</span>}
                                        </>
                                     )}
                                   </div>
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
          </>
        )}
      </AnimatePresence>

      {/* Modal إعدادات المعلم */}
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
                    {dynamicPeriods.map(p => (
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-[10px] md:text-xs font-black text-rose-300 mb-3 uppercase tracking-widest">
              <CloudDownload className="w-4 h-4" /> مركز الاستدعاء والميزانية
            </div>
            <h1 className="text-2xl md:text-3xl font-black mb-2 flex items-center gap-3">
              <Wand2 className="w-6 h-6 md:w-8 md:h-8 text-amber-400" /> محرك الجدولة الشامل
            </h1>
            <p className="text-slate-300 font-bold max-w-xl text-sm md:text-base">
              الآن يمكنك استدعاء الجداول السحابية السابقة، توليد جداول جديدة، تعديلها يدوياً، وطباعتها كلها من هذا المركز الإداري.
            </p>
          </div>
        </div>

        {/* سلة الانتظار */}
        {unplacedLessons.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] shadow-sm">
             <h3 className="text-rose-800 font-black text-lg mb-4 flex items-center gap-2"><AlertOctagon className="w-5 h-5"/> حصص بالانتظار ({unplacedLessons.length})</h3>
             <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {unplacedLessons.map((lesson) => (
                  <div key={lesson.id} className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm min-w-[250px] shrink-0 flex flex-col justify-between">
                     <div>
                       <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md mb-2 inline-block">{lesson.section_name}</span>
                       <h4 className="font-black text-slate-800 whitespace-normal break-words leading-tight">{lesson.subject_name}</h4>
                       <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {lesson.teacher_name}</p>
                     </div>
                     <button onClick={() => openManualAssignModal(lesson)} className="mt-4 w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 py-2 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2">
                       <MousePointerClick className="w-4 h-4"/> تسكين يدوي
                     </button>
                  </div>
                ))}
             </div>
          </div>
        )}

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

              <button onClick={saveBudget} disabled={loadingData || isBudgetSaved} className={`mt-4 w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-md flex justify-center items-center gap-2 ${isBudgetSaved ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 opacity-60' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <CheckSquare className="w-5 h-5" /> {isBudgetSaved ? 'تم الاعتماد' : 'اعتماد الميزانية أولاً'}
              </button>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-base md:text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-indigo-500" /> إعدادات وأنصبة المعلمين
              </h3>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {teacherWorkloads.map(([name, data]) => {
                  const tConst = teacherConstraints[data.id];
                  const hasCustomConstraints = tConst && (tConst.days.length < 5 || tConst.periods.length < dynamicPeriods.length);
                  
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
                        <UserCog className="w-5 h-5" /> <span className="text-xs font-black">الدوام</span>
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
                {savedPlans.length > 0 && (
                   <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl mb-4">
                      <label className="text-xs font-black text-indigo-800 mb-2 block flex items-center gap-1">
                         <CloudDownload className="w-4 h-4"/> استدعاء جدول سحابي سابق:
                      </label>
                      <div className="flex gap-2">
                        <select 
                           className="flex-1 p-2.5 border border-indigo-200 rounded-xl text-sm bg-white font-bold text-slate-700 outline-none focus:border-indigo-500"
                           onChange={(e) => loadPlan(e.target.value)}
                           value={activePlanId || ''}
                        >
                           <option value="" disabled>اختر الخطة المحفوظة...</option>
                           {savedPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                   </div>
                )}

                <input type="text" value={planName} onChange={e=>setPlanName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:border-indigo-500 outline-none text-sm text-slate-900" placeholder="اسم الخطة لتسجيلها..." />
                
                <div className="flex gap-2">
                  <button onClick={generateSchedule} disabled={loadingData || generating || !isBudgetSaved} className="flex-[3] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />} التوليد الذكي
                  </button>
                  <button onClick={clearLocalDraft} title="مسح الجدول الحالي والبدء من جديد" className="flex-1 py-4 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl font-black transition-all active:scale-95 flex justify-center items-center">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {(generatedSchedules.length > 0 || unplacedLessons.length > 0) && (
                  <button onClick={savePlanToDatabase} disabled={generating} className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-sm transition-all active:scale-95 flex justify-center items-center gap-2">
                    <Save className="w-4 h-4" /> حفظ الجدول سحابياً {activePlanId ? '(كخطة جديدة)' : ''}
                  </button>
                )}
              </div>
              <div className="mt-6 bg-slate-900 rounded-2xl p-4 h-40 overflow-y-auto font-mono text-[10px] text-slate-300 shadow-inner flex flex-col-reverse custom-scrollbar">
                {generationLogs.length === 0 ? <span className="text-center opacity-50 m-auto">محرك الذكاء بانتظار الإطلاق...</span> : generationLogs.map((log, i) => <div key={i} className={`mb-1 border-b border-white/5 pb-1 ${log.includes('❌') || log.includes('⚠️') ? 'text-rose-400' : log.includes('✅') || log.includes('🎉') || log.includes('🔄') || log.includes('🧹') ? 'text-emerald-400' : ''}`}>{'>'} {log}</div>)}
              </div>
            </div>
            
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[600px] overflow-visible">
              
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                 <div className="flex items-center gap-3">
                   <h2 className="text-lg font-black text-slate-800">عارض الجداول الذكي</h2>
                   <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{generatedSchedules.length} مسكنة</span>
                 </div>
                 {generatedSchedules.length > 0 && (
                   <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-fit gap-1">
                     <button onClick={() => setDisplayMode('grid')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${displayMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid className="w-4 h-4" /> شبكي</button>
                     <button onClick={() => setDisplayMode('raw')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${displayMode === 'raw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><List className="w-4 h-4" /> خام</button>
                     
                     {/* أزرار الطباعة والتدقيق */}
                     {displayMode === 'grid' && (
                       <>
                         <button onClick={generateAuditReport} className="flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                           <Activity className="w-4 h-4" /> فحص الجودة
                         </button>
                         <button onClick={() => handlePrintCommand('single')} className="flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">
                           <FileDown className="w-4 h-4" /> تحميل PDF
                         </button>
                         <button onClick={() => setIsPrintCenterOpen(true)} className="flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-md">
                           <Printer className="w-4 h-4" /> طباعة مجمعة
                         </button>
                       </>
                     )}
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
                  <div className="p-5 h-[600px] overflow-y-auto custom-scrollbar space-y-3">
                     {generatedSchedules.slice(0, 150).map((slot, i) => (
                       <div key={i} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-white shrink-0 bg-slate-800"><span className="text-[9px]">يوم</span><span className="text-base leading-none">{slot.day}</span></div>
                            <div>
                               <p className="font-black text-sm text-slate-800 flex items-center gap-2">{slot.section_name}</p>
                               <div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">حصة {slot.period_number}</span></div>
                            </div>
                          </div>
                          <div className="text-right bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[120px]"><p className="text-xs font-black text-slate-700 truncate">{slot.subject_name}</p><p className="text-[10px] font-bold text-slate-500 truncate mt-1">{slot.teacher_name}</p></div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col w-full h-full relative">
                    <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0">
                      <select value={gridFilterType} onChange={(e) => { setGridFilterType(e.target.value as any); setGridFilterId(''); }} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-900 outline-none focus:border-indigo-500">
                        <option value="section">عرض جدول (فصل محدد)</option><option value="teacher">عرض جدول (معلم محدد)</option>
                      </select>
                      <select value={gridFilterId} onChange={(e) => setGridFilterId(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:border-indigo-500">
                        <option value="" disabled>-- اختر للعرض --</option>
                        {gridFilterType === 'section' ? sections.filter(s => generatedSchedules.some(gs => gs.section_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>) : uniqueTeachersInSchedule.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-50 p-4 custom-scrollbar w-full">
                      {!gridFilterId ? (
                        <div className="flex items-center justify-center h-[400px] text-slate-400 font-bold">يرجى اختيار معلم أو فصل לעرض جدوله</div>
                      ) : (
                        <div className="min-w-[800px] w-full border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
                          <table className="w-full text-center border-collapse table-fixed">
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="p-4 font-black w-24 border-b-2 border-slate-900 border-l border-white/10">اليوم</th>
                                {dynamicPeriods.map(p => <th key={p} className="p-3 font-black border-b-2 border-slate-900 border-l border-white/10 last:border-l-0">الحصة {p}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {workingDays.map((day) => (
                                <tr key={day} className="border-b border-slate-300 last:border-b-0 break-inside-avoid">
                                  <td className="p-4 font-black text-slate-900 bg-slate-100 border-l border-slate-300">{getDayName(day)}</td>
                                  {dynamicPeriods.map(p => {
                                    const slot = generatedSchedules.find(s => s.day === day && s.period_number === p && (gridFilterType === 'section' ? s.section_id === gridFilterId : s.teacher_id === gridFilterId));
                                    
                                    return (
                                      <td key={p} className="p-2 border-l border-slate-300 last:border-l-0 relative h-auto min-h-[7rem] align-top hover:bg-indigo-50/50 transition-colors">
                                        {slot ? (
                                          <div className="bg-white border border-indigo-200 shadow-sm rounded-xl p-2 h-full flex flex-col justify-center items-center overflow-hidden relative">
                                            <div className="font-black text-indigo-900 text-xs leading-tight mb-1 w-full whitespace-normal break-words" title={slot.subject_name}>{slot.subject_name}</div>
                                            <div className="font-bold text-[9px] sm:text-[10px] text-slate-800 bg-slate-50 px-1.5 py-1 rounded-md w-full whitespace-normal break-words leading-tight border border-slate-200" title={gridFilterType === 'section' ? slot.teacher_name : slot.section_name}>{gridFilterType === 'section' ? slot.teacher_name : slot.section_name}</div>
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
      
      {/* 🚀 منطقة الطباعة الخفية الموحدة للـ PDF */}
      <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', opacity: 0, pointerEvents: 'none', zIndex: -50 }} aria-hidden="true">
        {entitiesToPrint.map((entity, idx) => {
           const isPrintTypeStudent = printMode === 'all-sections' || printMode === 'specific-class' || (printMode === 'single' && gridFilterType === 'section') || (printMode === 'custom-batch' && batchPrintType === 'section');
           
           const entId = String(entity.id);
           const entName = entity.name || entity.users?.full_name || 'غير محدد';
           const entTitle = isPrintTypeStudent ? `${formatClassName(Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name)} - ${entName}` : entName;

           return (
             <div key={idx} className="batch-pdf-page" dir="rtl" style={{ width: '1122px', height: '793px', padding: '30px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: '"Cairo", sans-serif', overflow: 'hidden' }}>
               
               <table style={{ width: '100%', marginBottom: '15px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 6px 0', color: '#0f172a' }}>الجدول الدراسي الأسبوعي</h1>
                        <h2 style={{ fontSize: '14px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e293b', margin: 0, display: 'inline-block' }}>
                          {isPrintTypeStudent ? `الفصل: ${entTitle}` : `المعلم: ${entTitle}`}
                        </h2>
                      </td>
                      <td style={{ textAlign: 'left', verticalAlign: 'bottom' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#10b981', color: '#ffffff', marginBottom: '6px', display: 'inline-block' }}>العام الدراسي الحالي</div>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', margin: 0 }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                      </td>
                    </tr>
                  </tbody>
               </table>

               <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #cbd5e1', borderRadius: '8px', tableLayout: 'fixed' }}>
                 <thead>
                   <tr>
                     <th style={{ width: '100px', border: '1px solid #cbd5e1', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '10px 4px', fontSize: '14px', fontWeight: 900 }}>اليوم / الحصة</th>
                     {dynamicPeriods.map(p => (
                       <th key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e1b4b', textAlign: 'center', padding: '10px 4px', fontSize: '14px', fontWeight: 900 }}>
                         الحصة {p}
                       </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {DAYS.map((day, dIdx) => (
                     <tr key={day.id}>
                       <td style={{ border: '1px solid #cbd5e1', backgroundColor: dIdx % 2 === 0 ? '#f8fafc' : '#ffffff', color: '#0f172a', textAlign: 'center', fontWeight: 900, fontSize: '14px' }}>{day.name}</td>
                       {dynamicPeriods.map((p) => {
                         const slot = generatedSchedules.find(s => String(s.day) === String(day.id) && String(s.period_number) === String(p) && (isPrintTypeStudent ? String(s.section_id) === entId : String(s.teacher_id) === entId));
                         
                         return (
                           <td key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: dIdx % 2 === 0 ? '#f8fafc' : '#ffffff', padding: '4px', textAlign: 'center', verticalAlign: 'middle', height: '110px' }}>
                             {slot ? (
                               <div style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', textAlign: 'center', height: '100%', boxSizing: 'border-box' }}>
                                 
                                 <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 4px', borderRadius: '4px', marginBottom: '4px', display: 'inline-block' }} dir="ltr">
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                 </div>

                                 <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', marginBottom: '2px', lineHeight: '1.2' }}>{isPrintTypeStudent ? slot.subject_name : slot.section_name}</div>
                                 <div style={{ fontSize: '9px', color: '#475569', marginBottom: '4px', lineHeight: '1.2' }}>
                                   {isPrintTypeStudent ? `أ. ${slot.teacher_name}` : slot.subject_name}
                                 </div>
                                 
                                 {slot.zoom_link && (
                                   <div style={{ marginTop: '4px' }}>
                                      <a href={normalizeUrl(slot.zoom_link)} className="zoom-link" style={{ display: 'inline-block', backgroundColor: '#10b981', color: '#ffffff', fontSize: '9px', fontWeight: 'bold', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                                        رابط البث
                                      </a>
                                   </div>
                                 )}
                               </div>
                             ) : (<span style={{ fontSize: '18px', fontWeight: 'bold', color: '#cbd5e1' }}>-</span>)}
                           </td>
                         );
                       })}
                     </tr>
                   ))}
                 </tbody>
               </table>

               <table style={{ width: '100%', marginTop: '15px', borderTop: '2px solid #cbd5e1', paddingTop: '10px' }}>
                  <tbody>
                     <tr>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                           <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>مدرسة الرفعة النموذجية</div>
                           <div style={{ fontSize: '10px', color: '#64748b' }}>نظام الإدارة الأكاديمية الشامل</div>
                        </td>
                        <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                           <div style={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>وثيقة إلكترونية معتمدة</div>
                        </td>
                     </tr>
                  </tbody>
               </table>

             </div>
           );
        })}
      </div>

    </div>
  );
}
