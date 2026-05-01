// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Users, Search, Video, Layers, UserCircle, AlertTriangle, Lock, Clock, CheckCircle2, Loader2, FileDown
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// 🚀 استيراد مكتبات توليد الـ PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

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

// 🚀 تنظيف الرابط ليعمل بشكل صحيح في PDF
const normalizeUrl = (url?: string) => {
  if (!url) return '';
  const clean = url.trim();
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
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

  // 🚀 محرك الطباعة المحصن (لا يعتمد على تفاعلات React لمنع الانهيار)
  const executePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // إعطاء واجهة التحميل فرصة صغيرة للظهور بسلاسة
      await new Promise((resolve) => setTimeout(resolve, 150));

      // البحث عن الحاوية الخفية الدائمة (الموجودة في أسفل الكود)
      const container = document.getElementById('pdf-export-container');
      if (!container) throw new Error('الجدول غير جاهز للطباعة.');

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // التقاط الصورة للجدول المخفي
      const canvas = await html2canvas(container, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff', 
        logging: false 
      });
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // 🚀 برمجة الروابط النشطة فوق الصورة داخل الـ PDF
      const links = container.querySelectorAll('a.zoom-link');
      const elementRect = container.getBoundingClientRect();
      
      links.forEach((link: any) => {
        const rect = link.getBoundingClientRect();
        // حماية ضد القسمة على الصفر
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
      
      let safeName = getEntityName().replace(/\s+/g, '_');
      pdf.save(`جدول_${safeName}.pdf`);

    } catch (error: any) { 
      console.error(error);
      alert(error.message || 'حدث خطأ أثناء بناء وتصدير ملف الـ PDF.'); 
    } finally { 
      setIsGeneratingPDF(false); 
    }
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
      
      {/* 🚀 إخفاء الطباعة العادية للمتصفح تماماً */}
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

      {/* شاشة تحميل الـ PDF */}
      <AnimatePresence>
        {isGeneratingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090b14]/90 backdrop-blur-xl text-white">
            <Loader2 className="w-20 h-20 animate-spin text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">جاري بناء وثيقة الـ PDF الذكية...</h2>
            <p className="text-slate-300 font-bold mt-3 text-lg">يتم الآن تجهيز الجدول وروابط البث המباشر.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
        
        {/* Header - Screen View */}
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
            <button onClick={executePDF} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2">
               <FileDown className="w-5 h-5" /> تحميل الجدول PDF
            </button>
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

            {/* عارض الشاشة للمستخدم */}
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

            {/* 🚀 منطقة الطباعة الخفية (موجودة دائماً في الخلفية لتجنب تأخيرات وأخطاء React) */}
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', pointerEvents: 'none', zIndex: -50 }} aria-hidden="true">
              <div id="pdf-export-container" className="pdf-page-container" dir="rtl" style={{ width: '1122px', height: '793px', padding: '40px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: '"Cairo", sans-serif', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '4px solid #1e293b', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 8px 0', color: '#0f172a' }}>الجدول الدراسي الأسبوعي</h1>
                    <h2 style={{ fontSize: '18px', fontWeight: 900, padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e293b', margin: 0 }}>
                       {isStudentView ? `الفصل: ${getEntityName()}` : `المعلم: ${getEntityName()}`}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 900, fontSize: '14px', marginBottom: '8px' }}>العام الدراسي الحالي</div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', margin: 0 }}>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #cbd5e1', borderRadius: '12px', flex: 1, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '120px', border: '1px solid #cbd5e1', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '16px 8px', fontSize: '16px', fontWeight: 900 }}>اليوم / الحصة</th>
                      {dynamicPeriods.map(p => (
                        <th key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#1e1b4b', textAlign: 'center', padding: '12px 4px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 900, margin: '0 0 4px 0' }}>الحصة {p}</div>
                          {(() => {
                            const slotForTime = currentViewSchedules.find(s => s.period_number === p);
                            if (slotForTime) {
                              return <div style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#ffffff', color: '#10b981', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', display: 'inline-block' }}>{formatTime(slotForTime.start_time)} - {formatTime(slotForTime.end_time)}</div>;
                            }
                            return null;
                          })()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, index) => (
                      <tr key={day.id}>
                        <td style={{ border: '1px solid #cbd5e1', backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', color: '#0f172a', textAlign: 'center', fontWeight: 900, fontSize: '18px' }}>{day.name}</td>
                        {dynamicPeriods.map((p) => {
                          const slot = currentViewSchedules.find(s => s.day === day.id && s.period_number === p);
                          return (
                            <td key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {slot ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#1e1b4b', marginBottom: '6px', wordWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>{isStudentView ? slot.subject_name : slot.section_name}</div>
                                  <div style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', width: '100%', wordWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.2', boxSizing: 'border-box' }}>
                                    {isStudentView ? `أ. ${slot.teacher_name}` : slot.subject_name}
                                  </div>
                                  {/* 🚀 رابط الزووم مزروع بكلاس zoom-link ليتم صيده في محرك الـ PDF */}
                                  {slot.zoom_link && (
                                    <a href={normalizeUrl(slot.zoom_link)} className="zoom-link" style={{ display: 'inline-block', backgroundColor: '#10b981', color: '#ffffff', fontSize: '10px', fontWeight: 900, textDecoration: 'none', padding: '6px 0', borderRadius: '6px', marginTop: '6px', width: '90%' }}>
                                      رابط البث
                                    </a>
                                  )}
                                </div>
                              ) : (<span style={{ fontSize: '20px', fontWeight: 900, color: '#cbd5e1' }}>-</span>)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #cbd5e1', paddingTop: '16px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '40px', height: '40px', backgroundColor: '#1e293b', color: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>R</div><div><p style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', lineHeight: '1' }}>مدرسة الرفعة النموذجية</p><p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', margin: 0 }}>نظام الإدارة الأكاديمية الشامل</p></div></div>
                  <div><p style={{ fontSize: '12px', fontWeight: 900, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', margin: 0 }}>وثيقة إلكترونية معتمدة</p></div>
                </div>
              </div>
            </div>

          </>
        ) : null}
      </div>
    </div>
  );
}
