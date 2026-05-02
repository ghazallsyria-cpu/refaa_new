// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Users, Search, Video, Layers, UserCircle, AlertTriangle, Lock, Clock, CheckCircle2, Loader2, FileDown, Printer, X, User
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

  const [filterType, setFilterType] = useState<'section' | 'teacher'>('section');
  const [filterId, setFilterId] = useState<string>('');
  
  const [isRestricted, setIsRestricted] = useState(false);
  const [noSectionAssigned, setNoSectionAssigned] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('');
  const [restrictedIds, setRestrictedIds] = useState<string[]>([]);
  const [restrictedName, setRestrictedName] = useState<string>('جدولك');
  const [userFullName, setUserFullName] = useState<string>('');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'single' | 'all-teachers' | 'specific-dept' | 'all-sections' | 'specific-class'>('single');
  const [printFilterVal, setPrintFilterVal] = useState<string>('');
  const [selectedPrintClass, setSelectedPrintClass] = useState<string>('');
  const [selectedPrintDept, setSelectedPrintDept] = useState<string>('');
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

      let resolvedRole = safeString(currentRole, '').toLowerCase();
      let isUserRestricted = false;
      let allowedIds: string[] = [];
      let displayName = 'جدولك';
      let fetchedName = '';

      const [userInfoRes, planRes] = await Promise.all([
         supabase.from('users').select('full_name').eq('id', user.id).maybeSingle(),
         supabase.from('auto_schedule_plans').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
      ]);

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
         supabase.from('teachers').select('id, zoom_link'), 
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
          zoom_link: zoomLink
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
               uniqueTeachMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name });
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
    if (!periods || !Array.isArray(periods) || periods.length === 0) return [1, 2, 3, 4, 5, 6];
    const maxPeriod = Math.max(...periods.map(p => Number(p.period_number) || 1));
    const safeMax = (maxPeriod === -Infinity || maxPeriod < 1) ? 6 : maxPeriod;
    return Array.from({length: safeMax}, (_, i) => i + 1);
  }, [periods]);

  const currentViewSchedules = useMemo(() => {
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

  const uniqueClasses = Array.from(new Set(sections.map(s => formatClassName(Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name)))).filter(Boolean).sort();
  const uniqueDepts = ['قسم العلوم', 'قسم الرياضيات', 'قسم اللغة العربية', 'قسم اللغة الإنجليزية', 'قسم التربية الإسلامية', 'قسم الاجتماعيات', 'قسم الحاسوب', 'أقسام أخرى'];

  const getTeacherDept = (tId: string) => {
    const tSchedules = schedules.filter(s => String(s.teacher_id) === String(tId));
    if (tSchedules.length === 0) return 'أقسام أخرى';
    const subjName = tSchedules[0].subject_name || '';
    if (/(علوم|فيزياء|كيمياء|أحياء|جيولوجيا)/.test(subjName)) return 'قسم العلوم';
    if (/(رياضيات)/.test(subjName)) return 'قسم الرياضيات';
    if (/(عربي|عربية)/.test(subjName)) return 'قسم اللغة العربية';
    if (/(إنجليزي|انجليزي)/.test(subjName)) return 'قسم اللغة الإنجليزية';
    if (/(إسلامية|قرآن|تجويد|دين)/.test(subjName)) return 'قسم التربية الإسلامية';
    if (/(اجتماعيات|تاريخ|جغرافيا|فلسفة|نفس)/.test(subjName)) return 'قسم الاجتماعيات';
    if (/(حاسوب|معلوماتية)/.test(subjName)) return 'قسم الحاسوب';
    return 'أقسام أخرى';
  };

  const getEntityName = () => {
    try {
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

  // 🚀 المحرك الديناميكي للطباعة (Lazy Load + Improved HTML generation)
  const handlePrintCommand = async (mode: string, filterVal: string = '') => {
    if (typeof window === 'undefined') return;
    
    setPrintMode(mode as any);
    setPrintFilterVal(filterVal);
    setIsPrintModalOpen(false);
    setIsGeneratingPDF(true);

    let entities: any[] = [];
    
    if (mode === 'single') {
      const singleEntity = filterType === 'teacher' ? uniqueTeachers.find(t => String(t.id) === String(filterId)) : sections.find(s => String(s.id) === String(filterId));
      if(singleEntity) entities = [singleEntity];
    } else if (mode === 'all-teachers') {
      entities = uniqueTeachers;
    } else if (mode === 'specific-dept') {
      entities = uniqueTeachers.filter(t => getTeacherDept(t.id) === filterVal);
    } else if (mode === 'all-sections') {
      entities = sections;
    } else if (mode === 'specific-class') {
      entities = sections.filter(sec => formatClassName(Array.isArray(sec.classes) ? sec.classes[0]?.name : sec.classes?.name) === filterVal);
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
        if (!containers || containers.length === 0) throw new Error('لم يتم العثور على جداول مبنية.');

        const pdf = new jsPDFModule('landscape', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < containers.length; i++) {
          if (i > 0) pdf.addPage(); 
          const el = containers[i] as HTMLElement;

          // Scale 2 is good for clarity without blowing up dimensions if CSS is strictly contained
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
        if (mode === 'all-sections') fileName = 'جداول_جميع_الفصول.pdf';
        if (mode === 'all-teachers') fileName = 'جداول_جميع_المعلمين.pdf';
        if (mode === 'specific-class') fileName = `جداول_مرحلة_${filterVal.replace(/\s+/g, '_')}.pdf`;
        if (mode === 'specific-dept') fileName = `جداول_${filterVal.replace(/\s+/g, '_')}.pdf`;
        if (mode === 'single') fileName = `جدول_${getEntityName().replace(/\s+/g, '_')}.pdf`;

        pdf.save(fileName);
      } catch (error: any) { 
        console.error(error);
        alert(error.message || 'حدث خطأ أثناء بناء وتصدير ملف الـ PDF.'); 
      } finally { 
        setIsGeneratingPDF(false); 
        setEntitiesToPrint([]); 
      }
    }, 1000); 
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

      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPrintModalOpen(false)} className="absolute inset-0 bg-[#090b14]/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#131836] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.7)] z-50 w-full max-w-2xl relative">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Printer className="w-6 h-6 text-emerald-400" /> مركز الطباعة المتقدم</h2>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-[#090b14]/50 p-6 rounded-3xl border border-white/5 space-y-5">
                  <h3 className="font-black text-indigo-400 flex items-center gap-2 text-lg"><User className="w-5 h-5" /> جداول المعلمين</h3>
                  <button onClick={() => handlePrintCommand('all-teachers')} className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-95 shadow-sm">
                    طباعة جميع المعلمين (ملف واحد)
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select value={selectedPrintDept} onChange={e=>setSelectedPrintDept(e.target.value)} className="w-full sm:flex-1 p-3.5 border border-white/10 bg-[#131836] text-white rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                      <option value="">-- اختر قسماً محدداً للطباعة --</option>
                      {uniqueDepts.map((d, i) => <option key={i} value={d}>{d}</option>)}
                    </select>
                    <button onClick={() => handlePrintCommand('specific-dept', selectedPrintDept)} disabled={!selectedPrintDept} className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black disabled:opacity-50 transition-all shadow-lg active:scale-95">طباعة القسم</button>
                  </div>
                </div>

                <div className="bg-[#090b14]/50 p-6 rounded-3xl border border-white/5 space-y-5">
                  <h3 className="font-black text-emerald-400 flex items-center gap-2 text-lg"><Users className="w-5 h-5" /> جداول الفصول الدراسية</h3>
                  <button onClick={() => handlePrintCommand('all-sections')} className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-95 shadow-sm">
                    طباعة جميع الفصول (ملف واحد)
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select value={selectedPrintClass} onChange={e=>setSelectedPrintClass(e.target.value)} className="w-full sm:flex-1 p-3.5 border border-white/10 bg-[#131836] text-white rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                      <option value="">-- اختر صفاً محدداً للطباعة --</option>
                      {uniqueClasses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => handlePrintCommand('specific-class', selectedPrintClass)} disabled={!selectedPrintClass} className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black disabled:opacity-50 transition-all shadow-lg active:scale-95">طباعة الصف</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090b14]/90 backdrop-blur-xl text-white">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثائق الـ PDF الذكية...</h2>
            <p className="text-slate-300 font-bold mt-3 text-lg">النظام يقوم برسم الجداول وترتيبها وتنسيقها للطباعة.</p>
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
              <button onClick={() => handlePrintCommand('single')} className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                 <FileDown className="w-5 h-5" /> تحميل الجدول الحالي
              </button>
              
              {(!isRestricted || currentRole === 'admin' || currentRole === 'management') && (
                <button onClick={() => setIsPrintModalOpen(true)} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-slate-900 font-black rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                   <Printer className="w-5 h-5" /> مركز الطباعة
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
                  <div className="flex bg-[#02040a] p-1 rounded-xl border border-white/5 w-full md:w-auto shrink-0">
                    <button 
                      onClick={() => { setFilterType('section'); if(sections[0]) setFilterId(String(sections[0].id)); }}
                      className={`flex-1 md:w-32 py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${filterType === 'section' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      <Layers className="w-4 h-4" /> فصول
                    </button>
                    <button 
                      onClick={() => { setFilterType('teacher'); if(uniqueTeachers[0]) setFilterId(String(uniqueTeachers[0].id)); }}
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
                        ? sections.map(s => <option key={s.id} value={s.id}>{safeString(s.name)}</option>)
                        : uniqueTeachers.map(t => <option key={t.id} value={t.id}>{safeString(t.name)}</option>)
                      }
                    </select>
                  </div>
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

            {/* 🚀 منطقة الطباعة الخفية الموحدة (مُعاد كتابة الـ CSS الخاص بها بالكامل لتجنب التضخم العشوائي) */}
            <div style={{ position: 'fixed', top: '-20000px', left: '-20000px', opacity: 0, pointerEvents: 'none', zIndex: -50 }} aria-hidden="true">
              {entitiesToPrint.map((entity, idx) => {
                 const isPrintTypeStudent = printMode === 'all-sections' || printMode === 'specific-class' || (printMode === 'single' && filterType === 'section');
                 
                 const entId = String(entity.id);
                 const entName = entity.name || entity.users?.full_name || 'غير محدد';
                 const entTitle = isPrintTypeStudent ? `${formatClassName(Array.isArray(entity.classes) ? entity.classes[0]?.name : entity.classes?.name)} - ${entName}` : entName;

                 return (
                   <div key={idx} className="batch-pdf-page" dir="rtl" style={{ width: '1122px', height: '793px', padding: '30px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: '"Cairo", sans-serif', overflow: 'hidden' }}>
                     
                     {/* ترويسة الصفحة - Header */}
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

                     {/* الجدول - Table */}
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
                                     <div style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', textAlign: 'center', height: '100%', boxSizing: 'border-box' }}>
                                       
                                       {/* 🚀 إظهار الوقت بدقة داخل المربع نفسه وبحجم دقيق */}
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

                     {/* تذييل الصفحة - Footer */}
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

          </>
        ) : null}
      </div>
    </div>
  );
}
