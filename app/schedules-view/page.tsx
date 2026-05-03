// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Users, Search, Video, Layers, UserCircle, AlertTriangle, Lock, Clock, CheckCircle2, Loader2, FileDown, Printer, X, CheckSquare2, Square, Grid3X3
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

const safeString = (val: any, fallback = 'غير محدد') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return fallback; 
  return String(val);
};

const formatTime = (timeStr: any) => {
  if (typeof timeStr !== 'string' || !timeStr.includes(':')) return '--:--';
  return timeStr.slice(0, 5);
};

const timeToMinutes = (timeStr: any) => {
  if (typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const parts = timeStr.split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
};

const getKuwaitDayId = (date: Date) => {
  if (!date || !(date instanceof Date)) return 1;
  const jsDay = date.getDay(); 
  if (jsDay === 5 || jsDay === 6) return 0; 
  return jsDay + 1;
};

const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
};

const formatClassName = (rawName?: string) => {
  if (!rawName) return '';
  return rawName.replace('الصف ', '').trim();
};

export default function PublicSchedulesViewPage() {
  const { user, isChecking, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [uniqueTeachers, setUniqueTeachers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [latestPlanName, setLatestPlanName] = useState<string>('');

  // 🚀 إضافة خيار Master View للمدير
  const [filterType, setFilterType] = useState<'section' | 'teacher' | 'master'>('section');
  const [filterId, setFilterId] = useState<string>('');
  
  const [isRestricted, setIsRestricted] = useState(false);
  const [noSectionAssigned, setNoSectionAssigned] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('');
  const [restrictedIds, setRestrictedIds] = useState<string[]>([]);
  const [restrictedName, setRestrictedName] = useState<string>('جدولك');
  const [userFullName, setUserFullName] = useState<string>('');

  const [isPrintCenterOpen, setIsPrintCenterOpen] = useState(false);
  const [batchPrintIds, setBatchPrintIds] = useState<string[]>([]);
  const [batchPrintType, setBatchPrintType] = useState<'section' | 'teacher'>('section');
  const [printMode, setPrintMode] = useState<'single' | 'custom-batch' | 'master-print'>('single');
  const [entitiesToPrint, setEntitiesToPrint] = useState<any[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const hasFetched = useRef(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isChecking && user && !hasFetched.current) {
        hasFetched.current = true;
        fetchApprovedSchedule();
    } else if (!isChecking && !user) {
        setLoading(false);
    }
  }, [isChecking, user]);

  const fetchApprovedSchedule = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      setNoSectionAssigned(false);

      const [userInfoRes, planRes] = await Promise.all([
         supabase.from('users').select('full_name, role').eq('id', user.id).maybeSingle(),
         supabase.from('auto_schedule_plans').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]);

      let dbRole = safeString(userInfoRes.data?.role || currentRole, '').toLowerCase();
      let resolvedRole = dbRole;
      let isUserRestricted = false;
      let allowedIds: string[] = [];
      let displayName = 'جدولك';
      let fetchedName = '';

      if (userInfoRes.data?.full_name) {
         displayName = safeString(userInfoRes.data.full_name);
         fetchedName = displayName;
         setUserFullName(fetchedName);
      }

      if (!planRes.data) {
        setLoading(false);
        if (resolvedRole === 'student' || resolvedRole === 'teacher') {
            setFetchError("لم يتم العثور على خطة معتمدة، أو أن صلاحيات حسابك تمنعك من قراءة الجداول.");
        }
        return; 
      }
      
      setLatestPlanName(safeString(planRes.data.name, 'خطة دراسية'));

      if (resolvedRole !== 'admin' && resolvedRole !== 'management') {
         isUserRestricted = true;

         if (resolvedRole === 'student') {
            const { data: studentProfiles } = await supabase.from('students').select('section_id').eq('id', user.id);
            if (studentProfiles && studentProfiles.length > 0) {
               allowedIds = studentProfiles.map(s => s.section_id ? String(s.section_id) : null).filter(Boolean) as string[];
               if (allowedIds.length === 0) setNoSectionAssigned(true);
            } else {
               setNoSectionAssigned(true); setLoading(false); return; 
            }
         } 
         else if (resolvedRole === 'teacher') {
            const { data: teacherProfiles } = await supabase.from('teachers').select('id').eq('id', user.id);
            if (teacherProfiles && teacherProfiles.length > 0) {
               allowedIds = teacherProfiles.map(t => String(t.id));
               if (fetchedName) displayName = `أ. ${fetchedName}`;
            }
         }
         else {
             const { data: teacherProfiles } = await supabase.from('teachers').select('id').eq('id', user.id);
             if (teacherProfiles && teacherProfiles.length > 0) {
                resolvedRole = 'teacher';
                allowedIds = teacherProfiles.map(t => String(t.id));
                if (fetchedName) displayName = `أ. ${fetchedName}`;
             } else {
                const { data: studentProfiles } = await supabase.from('students').select('section_id').eq('id', user.id);
                if (studentProfiles && studentProfiles.length > 0) {
                   resolvedRole = 'student';
                   allowedIds = studentProfiles.map(s => s.section_id ? String(s.section_id) : null).filter(Boolean) as string[];
                   if (allowedIds.length === 0) setNoSectionAssigned(true);
                } else {
                   setNoSectionAssigned(true); setLoading(false); return;
                }
             }
         }
      }

      setIsRestricted(isUserRestricted);
      setActiveRole(resolvedRole);
      setRestrictedIds(allowedIds);
      setRestrictedName(displayName);

      if (isUserRestricted && resolvedRole === 'student' && allowedIds.length === 0) {
         setLoading(false); return;
      }

      const [slotsRes, sectionsRes, subjectsRes, teachersRes, usersRes, periodsRes] = await Promise.all([
         supabase.from('auto_schedules').select('*').eq('plan_id', planRes.data.id),
         supabase.from('sections').select('id, name, class_id, classes(name, level)'),
         supabase.from('subjects').select('id, name'),
         supabase.from('teachers').select('id, department_id, zoom_link'), 
         supabase.from('users').select('id, full_name'), 
         supabase.from('auto_class_periods').select('*').order('period_number')
      ]);

      if (slotsRes.error) throw slotsRes.error;

      setPeriods(periodsRes.data || []);

      const slots = slotsRes.data || [];
      const sectionsData = sectionsRes.data || [];
      const subjectsData = subjectsRes.data || [];
      const teachersData = teachersRes.data || [];
      const usersData = usersRes.data || [];

      const formattedSchedules = slots.map(slot => {
        const sec = sectionsData.find(s => String(s.id) === String(slot.section_id));
        const subj = subjectsData.find(s => String(s.id) === String(slot.subject_id));
        
        const teacherIdStr = String(slot.teacher_id);
        const teachRec = teachersData.find(t => String(t.id) === teacherIdStr);
        const userRec = usersData.find(u => String(u.id) === teacherIdStr);

        const cData = Array.isArray(sec?.classes) ? sec?.classes[0] : sec?.classes;
        const level = cData?.level || 0;
        const stage = level >= 10 ? 'high' : 'middle';
        
        const classNameStr = safeString(cData?.name, '').replace('الصف ', '').trim();
        const secNameStr = safeString(sec?.name, '');
        const sectionFullName = sec ? `${classNameStr} - ${secNameStr}` : 'شعبة غير معروفة';
        
        let finalTeacherName = safeString(userRec?.full_name, 'معلم غير محدد');
        if (finalTeacherName === 'undefined') finalTeacherName = 'معلم غير محدد';

        let zoomLink = teachRec?.zoom_link || null;
        if (typeof zoomLink !== 'string' || zoomLink.trim() === '') zoomLink = null;

        return {
          id: String(slot.id),
          day: Number(slot.day_of_week) || 1,
          period_number: Number(slot.period_number) || 1,
          start_time: safeString(slot.start_time, ''),
          end_time: safeString(slot.end_time, ''),
          stage: stage,
          section_id: String(slot.section_id),
          section_name: sectionFullName,
          subject_name: safeString(subj?.name, 'مادة محذوفة'),
          teacher_id: teacherIdStr,
          teacher_name: finalTeacherName,
          zoom_link: zoomLink,
          department_id: teachRec?.department_id || null
        };
      });

      formattedSchedules.sort((a, b) => a.day - b.day || a.period_number - b.period_number);
      setSchedules(formattedSchedules);

      if (!isUserRestricted) {
          const uniqueSecsMap = new Map();
          const uniqueTeachMap = new Map();

          formattedSchedules.forEach(s => {
            if (!uniqueSecsMap.has(s.section_id)) {
               const sec = sectionsData.find(x => String(x.id) === s.section_id);
               uniqueSecsMap.set(s.section_id, { id: s.section_id, name: s.section_name, classes: sec?.classes });
            }
            if (!uniqueTeachMap.has(s.teacher_id)) {
               uniqueTeachMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name, department_id: s.department_id });
            }
          });

          const secsArray = Array.from(uniqueSecsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          const teachArray = Array.from(uniqueTeachMap.values()).sort((a, b) => a.name.localeCompare(b.name));

          setSections(secsArray);
          setUniqueTeachers(teachArray);

          if (secsArray.length > 0) {
             setFilterType('section');
             setFilterId(String(secsArray[0].id));
          }
      }

    } catch (error: any) {
      console.error('Error fetching public schedules:', error);
      setFetchError(safeString(error?.message || error, 'حدث خطأ غير متوقع'));
    } finally {
      setLoading(false);
    }
  };

  const dynamicPeriods = useMemo(() => {
    if (!periods || !Array.isArray(periods) || periods.length === 0) return [1, 2, 3, 4, 5, 6, 7];
    const maxPeriod = Math.max(...periods.map(p => Number(p.period_number) || 1));
    const safeMax = (maxPeriod === -Infinity || maxPeriod < 1 || isNaN(maxPeriod)) ? 7 : maxPeriod;
    return Array.from({length: safeMax}, (_, i) => i + 1);
  }, [periods]);

  const currentViewSchedules = useMemo(() => {
     if (filterType === 'master') return schedules; // Master returns all

     return schedules.filter(s => {
        if (isRestricted) {
           if (activeRole === 'teacher') {
              const matchById = restrictedIds.some(id => String(id) === String(s.teacher_id));
              const matchByName = userFullName && s.teacher_name && s.teacher_name.trim() === userFullName.trim();
              return matchById || matchByName;
           } else {
              return restrictedIds.some(id => String(id) === String(s.section_id));
           }
        }
        return filterType === 'section' ? String(s.section_id) === String(filterId) : String(s.teacher_id) === String(filterId);
     });
  }, [schedules, isRestricted, activeRole, restrictedIds, filterType, filterId, userFullName]);

  const getEntityName = () => {
    try {
      if (filterType === 'master') return 'الجدول المجمع العام';
      if (isRestricted) {
         if (activeRole === 'student') {
            if (currentViewSchedules && currentViewSchedules.length > 0 && currentViewSchedules[0]?.section_name) {
               return safeString(currentViewSchedules[0].section_name);
            }
         }
         return safeString(restrictedName, 'جدولك');
      } else {
         if (filterType === 'section') {
            const sec = sections?.find(s => String(s?.id) === String(filterId));
            return sec ? safeString(sec.name) : 'غير محدد';
         } else {
            const t = uniqueTeachers?.find(t => String(t?.id) === String(filterId));
            return t ? safeString(t.name) : 'غير محدد';
         }
      }
    } catch(e) {
      return 'فصل/معلم غير محدد';
    }
  };

  const isStudentView = isRestricted ? activeRole === 'student' : filterType === 'section';

  const toggleBatchPrintId = (id: string) => {
    setBatchPrintIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllBatchIds = () => {
    if (batchPrintType === 'section') {
      const availableSecs = sections.map(s=>s.id);
      setBatchPrintIds(availableSecs);
    } else {
      setBatchPrintIds(uniqueTeachers.map(t=>t.id));
    }
  };

  const handlePrintCommand = async (mode: string) => {
    if (typeof window === 'undefined') return;
    
    setPrintMode(mode as any);
    setIsPrintCenterOpen(false);
    setIsGeneratingPDF(true);

    let entities: any[] = [];
    
    // 🚀 حالة الطباعة للجدول المجمع
    if (mode === 'master-print') {
       entities = ['MASTER_GRID']; // Dummy entity to trigger print map loop once
    } else if (mode === 'single') {
      const singleEntity = filterType === 'teacher' ? uniqueTeachers.find(t => String(t.id) === String(filterId)) : sections.find(s => String(s.id) === String(filterId));
      if(singleEntity) entities = [singleEntity];
    } else if (mode === 'custom-batch') {
      if (batchPrintType === 'section') {
          entities = sections.filter(s => batchPrintIds.includes(s.id));
      } else {
          entities = uniqueTeachers.filter(t => batchPrintIds.includes(t.id));
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

        const containerClass = mode === 'master-print' ? '.master-pdf-page' : '.batch-pdf-page';
        const containers = document.querySelectorAll(containerClass);
        if (!containers || containers.length === 0) throw new Error('لم يتم العثور على جداول مبنية للطباعة.');

        // 🚀 للمجمع نستخدم ورقة A3 فارهة بالعرض لضمان دقة ووضوح الأرقام الكثيرة
        const paperFormat = mode === 'master-print' ? 'a3' : 'a4';
        const pdf = new jsPDFModule('landscape', 'mm', paperFormat);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < containers.length; i++) {
          if (i > 0) pdf.addPage(); 
          const el = containers[i] as HTMLElement;

          // مقياس عالي الدقة للجدول المجمع
          const canvas = await html2canvasModule(el, { scale: mode === 'master-print' ? 3 : 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

          if (mode !== 'master-print') {
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
        }

        let fileName = 'الجدول_الدراسي.pdf';
        if (mode === 'master-print') fileName = `الجدول_المجمع_العام.pdf`;
        else if (mode === 'single') fileName = `جدول_${getEntityName().replace(/\s+/g, '_')}.pdf`;
        else if (mode === 'custom-batch') fileName = `جداول_مخصصة_مجمعة.pdf`;

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

  if (!mounted || isChecking || loading) {
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
              <p className="text-slate-400 font-bold text-sm leading-relaxed mt-2">
                 يبدو أنه لم يتم تعيينك في أي فصل دراسي حتى الآن.<br/><br/>
                 <span className="text-rose-400 font-black">ملاحظة للإدارة:</span> يرجى التأكد من ربط حساب الطالب بشعبة دراسية.
              </p>
           </div>
       </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#090b14] font-cairo text-slate-100 pb-24 pt-6 relative overflow-hidden" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
           body { display: none !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />

      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 🚀 مركز الطباعة المتقدم بالثيم الليلي */}
      <AnimatePresence>
        {isPrintCenterOpen && !isRestricted && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#02040a]/80 backdrop-blur-md z-40" onClick={() => setIsPrintCenterOpen(false)} />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0f1423] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden border border-white/10 flex flex-col max-h-[85vh]" 
               dir="rtl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#131836] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30"><Printer className="w-6 h-6"/></div>
                  <div>
                    <h3 className="font-black text-white text-lg">مركز الطباعة المجمعة</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">اختر مجموعة من الجداول لطباعتها معاً</p>
                  </div>
                </div>
                <button onClick={() => setIsPrintCenterOpen(false)} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 bg-[#0f1423] rounded-full shadow-sm border border-white/10 transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 flex-1 overflow-auto bg-[#090b14] custom-scrollbar">
                 <div className="flex gap-2 mb-4 bg-[#131836] p-1 rounded-xl shadow-sm border border-white/10">
                    <button onClick={() => {setBatchPrintType('section'); setBatchPrintIds([]);}} className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${batchPrintType === 'section' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>طباعة فصول</button>
                    <button onClick={() => {setBatchPrintType('teacher'); setBatchPrintIds([]);}} className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${batchPrintType === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>طباعة معلمين</button>
                 </div>
                 
                 <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-xs font-bold text-slate-400">تم تحديد: <span className="text-white">{batchPrintIds.length}</span></span>
                    <button onClick={selectAllBatchIds} className="text-xs font-black text-indigo-400 hover:text-indigo-300 hover:underline">تحديد الكل</button>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {batchPrintType === 'section' 
                      ? sections.map(s => (
                          <div key={s.id} onClick={() => toggleBatchPrintId(s.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${batchPrintIds.includes(s.id) ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-[#131836] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                             {batchPrintIds.includes(s.id) ? <CheckSquare2 className="w-4 h-4 text-indigo-400 shrink-0"/> : <Square className="w-4 h-4 text-slate-500 shrink-0"/>}
                             <span className="text-xs font-bold truncate">{s.name}</span>
                          </div>
                      ))
                      : uniqueTeachers.map(t => (
                          <div key={t.id} onClick={() => toggleBatchPrintId(t.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${batchPrintIds.includes(t.id) ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-[#131836] border-white/10 text-slate-300 hover:bg-white/5'}`}>
                             {batchPrintIds.includes(t.id) ? <CheckSquare2 className="w-4 h-4 text-indigo-400 shrink-0"/> : <Square className="w-4 h-4 text-slate-500 shrink-0"/>}
                             <span className="text-xs font-bold truncate">{t.name}</span>
                          </div>
                      ))
                    }
                 </div>
              </div>

              <div className="p-6 flex gap-3 border-t border-white/10 shrink-0 bg-[#131836]">
                <button onClick={() => setIsPrintCenterOpen(false)} className="flex-1 py-3.5 bg-white/5 text-slate-300 border border-white/10 font-black rounded-xl hover:bg-white/10 transition-colors active:scale-95 text-sm shadow-sm">إلغاء</button>
                <button onClick={() => handlePrintCommand('custom-batch')} disabled={batchPrintIds.length===0} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  <FileDown className="w-5 h-5" /> تحميل PDF للمحددين
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090b14]/90 backdrop-blur-xl text-white">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثائق الـ PDF الذكية...</h2>
            <p className="text-slate-300 font-bold mt-3 text-lg">النظام يقوم برسم الجداول وترتيبها حسب طلبك.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#02040a] via-[#0f1423] to-[#02040a] p-6 sm:p-8 text-white border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner shrink-0 relative">
                <div className="absolute inset-0 bg-indigo-400/20 rounded-2xl animate-ping"></div>
                <CalendarDays className="h-8 w-8 text-indigo-400 drop-shadow-md relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">الجداول الدراسية المباشرة</h1>
                <p className="text-slate-400 mt-1 font-bold text-sm">
                  {latestPlanName ? `يعرض النظام: ${safeString(latestPlanName)}` : 'بوابة عرض جداول الطلاب والمعلمين'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handlePrintCommand(filterType === 'master' ? 'master-print' : 'single')} className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                 <FileDown className="w-5 h-5" /> {filterType === 'master' ? 'طباعة المجمع (A3)' : 'تحميل الجدول الحالي'}
              </button>
              
              {!isRestricted && (
                <button onClick={() => setIsPrintCenterOpen(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-slate-900 font-black rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                   <Printer className="w-5 h-5" /> مركز الطباعة المتقدم
                </button>
              )}
            </div>
          </div>
        </div>

        {fetchError && (
           <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">تنبيه تقني: {safeString(fetchError)}</p>
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
            <div className="bg-[#131836]/80 backdrop-blur-xl p-4 rounded-[1.5rem] border border-white/10 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {!isRestricted ? (
                <>
                  <div className="flex bg-[#02040a] p-1 rounded-xl border border-white/5 w-full md:w-auto shrink-0 overflow-x-auto custom-scrollbar">
                    <button 
                      onClick={() => { setFilterType('section'); if(sections[0]) setFilterId(String(sections[0].id)); }}
                      className={`flex-1 md:w-32 min-w-[100px] py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'section' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Layers className="w-4 h-4" /> فصول
                    </button>
                    <button 
                      onClick={() => { setFilterType('teacher'); if(uniqueTeachers[0]) setFilterId(String(uniqueTeachers[0].id)); }}
                      className={`flex-1 md:w-32 min-w-[100px] py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'teacher' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <UserCircle className="w-4 h-4" /> معلمون
                    </button>
                    {/* 🚀 الزر الذهبي للجدول المجمع العام */}
                    <button 
                      onClick={() => { setFilterType('master'); setFilterId(''); }}
                      className={`flex-1 md:w-36 min-w-[120px] py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'master' ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)]' : 'text-slate-400 hover:text-amber-400'}`}
                    >
                      <Grid3X3 className="w-4 h-4" /> الجدول المجمع
                    </button>
                  </div>

                  {filterType !== 'master' ? (
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
                          ? sections.map(s => <option key={s.id} value={s.id}>{safeString(s.name)}</option>)
                          : uniqueTeachers.map(t => <option key={t.id} value={t.id}>{safeString(t.name)}</option>)
                        }
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1 w-full text-center md:text-left flex items-center justify-end px-4">
                       <span className="text-sm font-black text-amber-400 animate-pulse flex items-center gap-2"><Layers className="w-4 h-4"/> الرؤية البانورامية الشاملة لجميع الفصول</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-4 w-full bg-[#02040a]/40 p-3 rounded-xl border border-white/5">
                   <div className={`p-2 rounded-lg ${activeRole === 'student' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {activeRole === 'student' ? <Layers className="w-6 h-6"/> : <UserCircle className="w-6 h-6"/>}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                         <Lock className="w-3 h-3"/> {activeRole === 'student' ? 'جدول فصلك الحالي' : 'الجدول المخصص لك'}
                      </p>
                      <p className="text-base font-black text-white mt-0.5">
                         {getEntityName()}
                      </p>
                   </div>
                   <div className="hidden sm:flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-black text-amber-400" dir="ltr">
                        {currentDateTime.toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                   </div>
                </div>
              )}
            </div>

            {/* 🚀 واجهة عرض الجدول المجمع (Master View) */}
            {filterType === 'master' ? (
              <div className="bg-[#131836]/60 backdrop-blur-xl rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative max-h-[75vh]">
                <div className="overflow-auto custom-scrollbar h-full w-full">
                  <table className="min-w-max w-full divide-y divide-white/5 border-collapse text-right">
                    <thead className="bg-[#02040a]/90 sticky top-0 z-30 shadow-md">
                      <tr>
                        <th className="py-4 px-4 text-center font-black text-indigo-300 w-24 border-l border-white/5 sticky right-0 bg-[#02040a]/95 backdrop-blur-xl z-40">اليوم</th>
                        <th className="py-4 px-4 text-center font-black text-indigo-300 w-28 border-l border-white/5 sticky right-24 bg-[#02040a]/95 backdrop-blur-xl z-40">الحصة</th>
                        {sections.map(sec => (
                          <th key={sec.id} className="py-4 px-4 text-center font-black text-white border-l border-white/5 min-w-[140px]">
                            {safeString(sec.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-transparent relative z-10">
                      {DAYS.map(day => (
                        <React.Fragment key={day.id}>
                          {dynamicPeriods.map((p, pIdx) => {
                            const isToday = getKuwaitDayId(currentDateTime) === day.id;
                            return (
                              <tr key={`${day.id}-${p}`} className={`transition-colors hover:bg-white/[0.04] ${isToday ? 'bg-indigo-900/5' : ''}`}>
                                {pIdx === 0 && (
                                  <td rowSpan={dynamicPeriods.length} className={`py-2 px-2 text-center font-black border-l border-b border-white/5 sticky right-0 z-20 ${isToday ? 'bg-indigo-900/90 text-indigo-300 border-indigo-500/30' : 'bg-[#0f1423]/95 text-slate-300'} backdrop-blur-xl`}>
                                    {day.name}
                                    {isToday && <div className="text-[10px] text-indigo-400 mt-1 uppercase">اليوم</div>}
                                  </td>
                                )}
                                <td className={`py-2 px-2 text-center border-l border-white/5 sticky right-24 z-20 backdrop-blur-xl ${isToday ? 'bg-indigo-900/80' : 'bg-[#0f1423]/90'}`}>
                                  <div className="font-black text-sm text-slate-200">الحصة {p}</div>
                                </td>
                                {sections.map(sec => {
                                  const slot = schedules.find(s => s.day === day.id && s.period_number === p && String(s.section_id) === String(sec.id));
                                  return (
                                    <td key={sec.id} className="p-2 border-l border-white/5 align-middle h-20">
                                      {slot ? (
                                        <div className="bg-[#02040a]/60 border border-indigo-500/20 rounded-xl p-2 text-center h-full flex flex-col justify-center gap-1 shadow-sm hover:border-indigo-400 hover:bg-indigo-900/20 transition-all">
                                          <div className="text-[9px] text-amber-400 font-mono font-black bg-slate-900/80 rounded px-1.5 py-0.5 mx-auto w-max" dir="ltr">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                          </div>
                                          <span className="text-xs sm:text-sm font-black text-emerald-300 line-clamp-1" title={safeString(slot.subject_name)}>{safeString(slot.subject_name)}</span>
                                          <span className="text-[10px] text-slate-400 font-bold line-clamp-1" title={safeString(slot.teacher_name)}>أ. {safeString(slot.teacher_name)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center h-full opacity-10 text-slate-500 font-black">-</div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* 🚀 واجهة عرض الجدول العادي (معلم/طالب) */
              <div className="bg-[#131836]/60 backdrop-blur-xl rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full divide-y divide-white/5 border-collapse table-fixed">
                    <thead className="bg-[#02040a]/80">
                      <tr>
                        <th scope="col" className="py-4 px-4 text-center text-xs font-black text-indigo-300 uppercase tracking-widest border-l border-white/5 w-28">
                          اليوم / الحصة
                        </th>
                        {dynamicPeriods.map(p => {
                          return (
                            <th key={p} scope="col" className="py-4 px-2 text-center border-l border-white/5 min-w-[150px] bg-[#02040a]/40">
                              <span className="text-white font-black text-sm drop-shadow-sm">الحصة {p}</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-transparent">
                      {DAYS.map((day) => {
                        const todayId = getKuwaitDayId(currentDateTime);
                        const isToday = day.id === todayId;

                        return (
                          <tr key={day.id} className={`transition-colors ${isToday ? 'bg-indigo-900/10' : 'hover:bg-white/[0.02]'}`}>
                            <td className={`py-6 px-3 text-sm font-black border-l border-white/5 text-center ${isToday ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-[#0f1423]/30 text-slate-300'}`}>
                              {safeString(day.name)}
                              {isToday && <div className="text-[9px] text-indigo-400 mt-1 uppercase tracking-wider">اليوم</div>}
                            </td>
                            {dynamicPeriods.map(p => {
                              const slot = currentViewSchedules.find(s => s.day === day.id && s.period_number === p);
                              const showZoom = slot && slot.zoom_link;

                              let isNow = false;
                              let isPast = false;
                              const currentMins = currentDateTime.getHours() * 60 + currentDateTime.getMinutes();

                              if (slot) {
                                 const startMins = timeToMinutes(slot.start_time);
                                 const endMins = timeToMinutes(slot.end_time);

                                 if (todayId !== 0) { 
                                    if (day.id < todayId) {
                                      isPast = true; 
                                    } else if (day.id === todayId) {
                                      if (currentMins > endMins) isPast = true; 
                                      else if (currentMins >= startMins && currentMins <= endMins) isNow = true; 
                                    }
                                 }
                              }

                              return (
                                <td key={p} className="p-2 sm:p-3 border-l border-white/5 h-36 align-top">
                                  {slot ? (
                                    <div 
                                      className={`h-full flex flex-col justify-start rounded-xl p-2.5 shadow-inner relative overflow-hidden group transition-all duration-300 transform hover:scale-[1.02]
                                        ${isNow 
                                          ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/50' 
                                          : isPast 
                                          ? 'bg-[#02040a]/40 border border-white/5 opacity-50 grayscale hover:grayscale-0' 
                                          : 'bg-[#02040a]/80 border border-white/10' 
                                        }
                                      `}
                                    >
                                      <div className={`absolute top-0 right-0 w-1.5 h-full ${isStudentView ? 'bg-indigo-500' : 'bg-emerald-500'} ${isPast ? 'opacity-30' : ''}`}></div>
                                      
                                      <div className="flex justify-between items-start mb-2 w-full pr-1.5">
                                        <div className="bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/30 font-mono text-[10px] sm:text-xs font-black text-amber-400 drop-shadow-sm" dir="ltr">
                                           {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                        </div>
                                        {isNow && (
                                           <div className="flex items-center gap-1 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/50">
                                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                              <span className="text-[8px] font-black text-rose-400">الآن</span>
                                           </div>
                                        )}
                                        {isPast && <CheckCircle2 className="w-4 h-4 text-slate-500" />}
                                      </div>

                                      {isStudentView ? (
                                        <>
                                          <div className={`font-black text-xs sm:text-sm whitespace-normal break-words leading-tight mb-1 pr-2 ${isNow ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                            {safeString(slot.subject_name)}
                                          </div>
                                          <div className="text-[10px] sm:text-xs font-bold text-slate-300 pr-2 leading-tight">
                                            أ. {safeString(slot.teacher_name)}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className={`font-black text-xs sm:text-sm whitespace-normal break-words leading-tight mb-1 pr-2 ${isNow ? 'text-emerald-400' : 'text-emerald-300'}`}>
                                            {safeString(slot.section_name)}
                                          </div>
                                          <div className="text-[10px] sm:text-xs font-bold text-slate-300 pr-2 leading-tight">
                                            {safeString(slot.subject_name)}
                                          </div>
                                        </>
                                      )}

                                      {showZoom && (
                                        <div className="mt-auto pt-2 w-full">
                                           <a 
                                             href={slot.zoom_link} 
                                             target="_blank" 
                                             rel="noopener noreferrer" 
                                             className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-black rounded-lg py-1.5 transition-colors relative z-20 ${isPast ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`}
                                           >
                                             <Video className="w-3.5 h-3.5"/> دخول للبث
                                           </a>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={`h-full w-full flex items-center justify-center rounded-xl transition-all ${isPast ? 'opacity-5' : 'opacity-20'}`}>
                                      <span className="text-2xl text-slate-600">-</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 🚀 منطقة الطباعة للجدول العادي */}
            {filterType !== 'master' && (
              <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', opacity: 0, pointerEvents: 'none', zIndex: -50 }} aria-hidden="true">
                {entitiesToPrint.map((entity, idx) => {
                   const isPrintTypeStudent = printMode === 'custom-batch' ? batchPrintType === 'section' : filterType === 'section';
                   
                   const entId = String(entity.id);
                   const entName = entity.name || entity.users?.full_name || 'غير محدد';
                   const entTitle = isPrintTypeStudent ? `${formatClassName(Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name)} - ${entName}` : entName;

                   const printTheme = isPrintTypeStudent ? {
                       cardBg: '#eef2ff',     // bg-indigo-50
                       cardBorder: '#c7d2fe', // border-indigo-200
                       timeBg: '#e0e7ff',     // bg-indigo-100
                       timeText: '#3730a3',   // text-indigo-800
                       timeBorder: '#c7d2fe', // border-indigo-200
                       titleText: '#312e81',  // text-indigo-900
                       subText: '#4f46e5'     // text-indigo-600
                   } : {
                       cardBg: '#f0fdf4',     // bg-emerald-50
                       cardBorder: '#a7f3d0', // border-emerald-200
                       timeBg: '#d1fae5',     // bg-emerald-100
                       timeText: '#065f46',   // text-emerald-800
                       timeBorder: '#a7f3d0', // border-emerald-200
                       titleText: '#064e3b',  // text-emerald-900
                       subText: '#059669'     // text-emerald-600
                   };

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
                                 const slot = schedules.find(s => String(s.day) === String(day.id) && String(s.period_number) === String(p) && (isPrintTypeStudent ? String(s.section_id) === entId : String(s.teacher_id) === entId));
                                 
                                 return (
                                   <td key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: dIdx % 2 === 0 ? '#f8fafc' : '#ffffff', padding: '4px', textAlign: 'center', verticalAlign: 'middle', height: '110px' }}>
                                     {slot ? (
                                       <div style={{ padding: '6px', border: `1px solid ${printTheme.cardBorder}`, borderRadius: '6px', backgroundColor: printTheme.cardBg, textAlign: 'center', height: '100%', boxSizing: 'border-box' }}>
                                         
                                         <div style={{ fontSize: '9px', fontWeight: 'bold', color: printTheme.timeText, backgroundColor: printTheme.timeBg, border: `1px solid ${printTheme.timeBorder}`, padding: '2px 4px', borderRadius: '4px', marginBottom: '4px', display: 'inline-block' }} dir="ltr">
                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                         </div>

                                         <div style={{ fontSize: '11px', fontWeight: 'bold', color: printTheme.titleText, marginBottom: '2px', lineHeight: '1.2' }}>{isPrintTypeStudent ? slot.subject_name : slot.section_name}</div>
                                         <div style={{ fontSize: '9px', color: printTheme.subText, marginBottom: '4px', lineHeight: '1.2', fontWeight: 'bold' }}>
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
            )}

            {/* 🚀 منطقة الطباعة المخفية الخاصة بالجدول المجمع (Master Print) بصيغة A3 فارهة */}
            {filterType === 'master' && (
              <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', opacity: 0, pointerEvents: 'none', zIndex: -50 }} aria-hidden="true">
                <div className="master-pdf-page" dir="rtl" style={{ width: '1600px', padding: '40px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: '"Cairo", sans-serif' }}>
                  
                  <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px solid #1e293b', paddingBottom: '15px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 10px 0', color: '#0f172a', letterSpacing: '-0.5px' }}>الجدول المدرسي المجمع (العام)</h1>
                    <div style={{ display: 'inline-block', fontSize: '14px', fontWeight: 'bold', padding: '6px 16px', borderRadius: '8px', backgroundColor: '#10b981', color: '#ffffff' }}>
                       العام الدراسي الحالي - {new Date().toLocaleDateString('ar-EG')}
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #cbd5e1' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px', border: '1px solid #cbd5e1', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: 900 }}>اليوم</th>
                        <th style={{ width: '70px', border: '1px solid #cbd5e1', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: 900 }}>الحصة</th>
                        {sections.map(sec => (
                          <th key={sec.id} style={{ border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: 900 }}>
                            {safeString(sec.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => (
                        <React.Fragment key={day.id}>
                          {dynamicPeriods.map((p, pIdx) => (
                            <tr key={`${day.id}-${p}`}>
                              {pIdx === 0 && (
                                <td rowSpan={dynamicPeriods.length} style={{ border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#0f172a', textAlign: 'center', padding: '8px', fontSize: '16px', fontWeight: 900 }}>
                                  {day.name}
                                </td>
                              )}
                              <td style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', textAlign: 'center', padding: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                                الحصة {p}
                              </td>
                              {sections.map(sec => {
                                const slot = schedules.find(s => s.day === day.id && s.period_number === p && String(s.section_id) === String(sec.id));
                                return (
                                  <td key={sec.id} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '6px', textAlign: 'center', verticalAlign: 'middle', height: '65px' }}>
                                    {slot ? (
                                      <div style={{ padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f8fafc', height: '100%', boxSizing: 'border-box' }}>
                                         <div style={{ fontSize: '11px', fontWeight: 900, color: '#047857', marginBottom: '2px', lineHeight: '1.2' }}>{safeString(slot.subject_name)}</div>
                                         <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', lineHeight: '1.2' }}>أ. {safeString(slot.teacher_name)}</div>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#e2e8f0' }}>-</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
                    تم إنشاء هذا الجدول تلقائياً بواسطة نظام الإدارة الأكاديمية الشامل - مدرسة الرفعة النموذجية
                  </div>
                </div>
              </div>
            )}

          </>
        ) : null}
      </div>
    </div>
  );
}
