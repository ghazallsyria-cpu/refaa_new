/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, FileText, Download, Calendar, Clock, Search, ShieldCheck, Zap, Filter, School, Crown, Folder, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface TeacherReport {
  id: string;
  name: string;
  specialization: string;
  department_name: string;
  isHOD: boolean;
  stage: 'middle' | 'high' | 'both' | 'unassigned';
  recorded: number;
  missed: number;
  expected: number;
  scheduled: number;
  percent: number;
  lastRecorded: string | null;
  status: "ممتاز" | "جيد" | "تحذير" | "حرج";
  selected: boolean;
}

const DAY_MAP: Record<number, string> = { 0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };
const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

// 🚀 دالة الوقت المحلي الكويتي الفولاذية
const getSchoolTime = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3 * 3600000));
};

const getDbDay = (jsDay: number) => jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 : jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 🚀 توليد التواريخ
const getDatesBetween = (startStr: string, endStr: string) => {
  const dates = [];
  let curr = new Date(startStr + 'T12:00:00'); 
  const end = new Date(endStr + 'T12:00:00');
  while (curr <= end) {
    dates.push(getLocalDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const getTeacherName = (t: any) => {
  const u = t.users;
  if (!u) return "معلم غير محدد";
  return Array.isArray(u) ? u[0]?.full_name || "معلم غير محدد" : u.full_name || "معلم غير محدد";
};

const getTeacherStage = (teacher: any) => {
  if (!teacher.teacher_sections || teacher.teacher_sections.length === 0) return 'unassigned';
  let hasMiddle = false;
  let hasHigh = false;
  teacher.teacher_sections.forEach((ts: any) => {
    const className = ts.sections?.classes?.name || '';
    if (className.includes('سادس') || className.includes('سابع') || className.includes('ثامن') || className.includes('تاسع')) hasMiddle = true;
    if (className.includes('عاشر') || className.includes('حادي') || className.includes('ثاني')) hasHigh = true;
  });
  if (hasMiddle && hasHigh) return 'both';
  if (hasMiddle) return 'middle';
  if (hasHigh) return 'high';
  return 'unassigned';
};

// 🚀 دالة مساعدة لمعرفة النظام الفعال حالياً (يدوي أو آلي)
const getActiveSystem = async () => {
  try {
    const { data } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    return data?.active_schedule_system || 'manual';
  } catch {
    return 'manual';
  }
};

export default function TeachersReportPage() {
  const [localTeachers, setLocalTeachers] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [reportType, setReportType] = useState<"day" | "week" | "custom">("day");
  const [stageFilter, setStageFilter] = useState<"all" | "middle" | "high">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customError, setCustomError] = useState<string | null>(null);

  const schoolTime = useMemo(() => getSchoolTime(), []);
  const todayStr = useMemo(() => getLocalDateString(schoolTime), [schoolTime]);
  const todayName = useMemo(() => DAY_MAP[schoolTime.getDay()], [schoolTime]);

  useEffect(() => {
    setEndDate(todayStr);
    const now = getSchoolTime();
    const day = now.getDay();
    const startOfSchoolWeek = new Date(now);
    startOfSchoolWeek.setDate(now.getDate() - day); // العودة للأحد (0)
    setStartDate(getLocalDateString(startOfSchoolWeek));
  }, [todayStr]);

  const fetchData = useCallback(async (overrideType?: "day" | "week" | "custom") => {
    const currentType = overrideType || reportType;
    setLoading(true);
    setCustomError(null);

    try {
      const now = getSchoolTime();
      let queryStartStr = todayStr;
      let queryEndStr = todayStr;
      let datesToProcess: string[] = [todayStr];

      if (currentType === "week") {
        const day = now.getDay();
        const sun = new Date(now);
        sun.setDate(now.getDate() - day);
        queryStartStr = getLocalDateString(sun);
        datesToProcess = getDatesBetween(queryStartStr, todayStr);
      } else if (currentType === "custom") {
        if (!startDate || !endDate) { setCustomError("يرجى تحديد النطاق"); setLoading(false); return; }
        if (new Date(startDate) > new Date(endDate)) { setCustomError("البداية بعد النهاية"); setLoading(false); return; }
        queryStartStr = startDate; queryEndStr = endDate;
        datesToProcess = getDatesBetween(startDate, endDate);
      }

      const activeSystem = await getActiveSystem();

      // 🚀 تجهيز الاستعلامات بناءً على النظام הפعال
      let schedulesQuery = supabase.from('schedules').select('teacher_id, section_id, day_of_week, period').limit(10000);
      let periodsQuery = activeSystem === 'auto' ? supabase.from('auto_class_periods').select('*').limit(100) : supabase.from('class_periods').select('period_number, end_time').limit(100);

      // 🚀 إذا كان آلي، نحتاج لجلب الخطة الفعالة أولاً
      let effectiveSchedules: any[] = [];
      if (activeSystem === 'auto') {
         const { data: planData } = await supabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
         if (planData) {
            const { data } = await supabase.from('auto_schedules').select('teacher_id, section_id, day_of_week, period_number').eq('plan_id', planData.id);
            if (data) {
                effectiveSchedules = data.map(s => ({ ...s, period: s.period_number }));
            }
         }
      }

      // 🚀 الجلب المتوازي السريع
      const [
        { data: teachersDB },
        { data: tsDB },
        manualSchedulesRes,
        { data: dbPeriods },
        { data: attendanceDB }
      ] = await Promise.all([
        supabase.from('teachers').select('id, specialization, department_id, users(full_name), academic_departments(id, name), department_heads(id)').limit(2000),
        supabase.from('teacher_sections').select('teacher_id, sections(classes(name))').limit(10000),
        activeSystem === 'manual' ? schedulesQuery : Promise.resolve({ data: null }),
        periodsQuery,
        supabase.from('attendance_records').select('teacher_id, date, period').gte('date', queryStartStr).lte('date', queryEndStr + 'T23:59:59').limit(50000)
      ]);

      if (activeSystem === 'manual' && manualSchedulesRes.data) {
          effectiveSchedules = manualSchedulesRes.data;
      }

      const getEndTime = (pNum: number, tStage: string) => {
          if (activeSystem === 'manual') {
              return dbPeriods?.find((p: any) => Number(p.period_number) === Number(pNum))?.end_time;
          } else {
              let stage = tStage === 'both' ? 'high' : (tStage === 'unassigned' ? 'high' : tStage);
              const p = dbPeriods?.find((p: any) => Number(p.period_number) === Number(pNum) && p.stage === stage);
              return p?.end_time || dbPeriods?.find((p: any) => Number(p.period_number) === Number(pNum))?.end_time;
          }
      };

      // 🚀 الحل السحري لمشكلة التواريخ
      const attendanceMap = new Set((attendanceDB || []).map(a => {
        const normalizedDate = String(a.date).split('T')[0].split(' ')[0]; // اقتطاع التاريخ الصافي فقط
        return `${a.teacher_id}_${normalizedDate}_${a.period}`;
      }));
      
      const safeTeachers = (teachersDB || []).map((t: any) => ({
        ...t,
        teacher_sections: (tsDB || []).filter(ts => String(ts.teacher_id) === String(t.id))
      }));

      const results: TeacherReport[] = safeTeachers.map((teacher: any) => {
        let expectedTotal = 0; let actualRecorded = 0;
        const tStage = getTeacherStage(teacher);

        for (const dStr of datesToProcess) {
          const d = new Date(dStr + 'T12:00:00');
          const dDay = getDbDay(d.getDay());
          
          if (dDay >= 1 && dDay <= 5) { // الأحد للخميس فقط
            const daySchedules = effectiveSchedules.filter(s => String(s.teacher_id) === String(teacher.id) && String(s.day_of_week) === String(dDay));
            
            daySchedules.forEach(sch => {
              let isPassed = false;
              
              // 🚀 حل مشكلة الأيام المستقبلية والسابقة مع دعم المراحل
              if (dStr === todayStr) {
                const endTime = getEndTime(sch.period, tStage);
                if (endTime) {
                  const [h, m] = endTime.split(':').map(Number);
                  const pEnd = new Date(now); pEnd.setHours(h, m, 0, 0);
                  if (now > pEnd) isPassed = true;
                }
              } else if (dStr < todayStr) {
                isPassed = true; // الأيام السابقة منتهية ومؤكدة
              }

              if (isPassed && new Date(dStr) >= SYSTEM_START_DATE) {
                expectedTotal++;
                if (attendanceMap.has(`${teacher.id}_${dStr}_${sch.period}`)) {
                   actualRecorded++;
                }
              }
            });
          }
        }

        const percent = expectedTotal > 0 ? Math.round((actualRecorded / expectedTotal) * 100) : 100;
        const deptObj = Array.isArray(teacher.academic_departments) ? teacher.academic_departments[0] : teacher.academic_departments;
        const isHOD = teacher.department_heads && teacher.department_heads.length > 0;

        let status: any = "ممتاز";
        if (expectedTotal > 0) {
          if (percent < 70) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";
        }

        return {
          id: teacher.id,
          name: getTeacherName(teacher),
          specialization: teacher.specialization || "عام",
          department_name: deptObj?.name || "عام",
          isHOD,
          stage: tStage,
          recorded: actualRecorded, missed: expectedTotal - actualRecorded, expected: expectedTotal, scheduled: 0, percent, lastRecorded: null, status,
          selected: true,
        };
      });

      setLocalTeachers(results);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, [reportType, todayStr, startDate, endDate]);

  useEffect(() => { if (todayStr) fetchData(); }, [todayStr, reportType, fetchData]);

  const handleTypeChange = (type: any) => { setReportType(type); fetchData(type); };

  const groupedTeachers = useMemo(() => {
    const groups = localTeachers
      .filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchStage = stageFilter === 'all' || t.stage === stageFilter || t.stage === 'both';
        return matchSearch && matchStage;
      })
      .reduce((acc, t) => {
        if (!acc[t.department_name]) acc[t.department_name] = [];
        acc[t.department_name].push(t);
        return acc;
      }, {} as Record<string, TeacherReport[]>);

    // 🚀 الترتيب الذهبي: رئيس القسم أولاً ثم أبجدياً
    const sortedGroups: Record<string, TeacherReport[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key].sort((a, b) => {
        if (a.isHOD && !b.isHOD) return -1;
        if (!a.isHOD && b.isHOD) return 1;
        return a.name.localeCompare(b.name, 'ar');
      });
    });
    return sortedGroups;
  }, [localTeachers, search, stageFilter]);

  return (
    <>
      {/* 🚀 إعدادات الطباعة تبقى بيضاء لكي تعمل بشكل صحيح على الورق */}
      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 1.5cm 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; font-family: 'Cairo', sans-serif !important; }
          .no-print { display: none !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 8px !important; text-align: center !important; font-size: 12px !important; }
          .dept-row { background: #eee !important; font-weight: 900 !important; text-align: right !important; }
        }
      `}</style>

      {/* 🚀 الثيم الملكي المظلم (دستور الرفعة) */}
      <div className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 font-cairo print:hidden min-h-screen bg-[#05070e] pt-6" dir="rtl">
        
        {/* الهيدر العلوي */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#0a0d16] via-[#111827] to-[#0a0d16] p-8 sm:p-12 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-black uppercase tracking-widest text-indigo-400 shadow-inner">
                <FileText className="w-4 h-4" /> مركز التقارير المعتمد
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">تقرير المتابعة والإنتاجية</h1>
              <p className="text-slate-400 font-bold opacity-90 max-w-2xl drop-shadow-sm">بإشراف المدير: أ. صالح مخلد المطيري | إعداد المنسق: إيهاب جمال غزال</p>
            </div>
            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 flex items-center gap-2 transition-all active:scale-95 border border-indigo-400/50">
              <Download className="w-5 h-5" /> تصدير التقرير
            </button>
          </div>
        </div>

        {/* شريط التحكم (الفلاتر) */}
        <div className="bg-[#0f1423]/80 backdrop-blur-xl p-5 rounded-[2rem] shadow-lg border border-white/5 flex flex-col xl:flex-row gap-5 justify-between items-center sticky top-24 z-30">
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <div className="flex bg-[#02040a]/60 p-1.5 rounded-2xl w-full sm:w-auto border border-white/5 shadow-inner">
               <button onClick={() => handleTypeChange("day")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "day" ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}>يومي</button>
               <button onClick={() => handleTypeChange("week")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "week" ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}>أسبوعي</button>
               <button onClick={() => handleTypeChange("custom")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "custom" ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}>مخصص</button>
             </div>
             {reportType === "custom" && (
               <div className="flex gap-2 animate-in slide-in-from-right-2">
                 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#02040a] rounded-xl border border-white/10 text-white text-xs font-bold p-2 outline-none focus:border-indigo-500 shadow-inner" style={{ colorScheme: 'dark' }} />
                 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#02040a] rounded-xl border border-white/10 text-white text-xs font-bold p-2 outline-none focus:border-indigo-500 shadow-inner" style={{ colorScheme: 'dark' }} />
                 <button onClick={() => fetchData("custom")} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)]"><RefreshCw className="w-4 h-4" /></button>
               </div>
             )}
          </div>
          <div className="relative w-full xl:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="بحث بالاسم أو التخصص..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-2xl bg-[#02040a]/60 border border-white/5 py-3.5 px-12 text-sm font-bold text-white outline-none focus:border-indigo-500/50 shadow-inner placeholder:text-slate-500 transition-all" />
          </div>
        </div>

        {/* جدول البيانات الملكي */}
        <div className="bg-[#0a0d16]/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-[#0f1423]">
                <tr className="text-[10px] font-black text-indigo-400 uppercase tracking-widest drop-shadow-sm">
                  <th className="py-5 px-8 text-right">المعلم / المنصب</th>
                  <th className="px-4 py-5 text-center">الرصد / المطالب به</th>
                  <th className="px-4 py-5 text-center">الإنجاز</th>
                  <th className="px-4 py-5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="py-32 text-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" /></td></tr>
                ) : Object.keys(groupedTeachers).length === 0 ? (
                  <tr><td colSpan={4} className="py-32 text-center text-slate-500 font-bold"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" /> لا توجد بيانات مسجلة في هذه الفترة</td></tr>
                ) : (
                  Object.entries(groupedTeachers).map(([dept, teachers]) => (
                    <React.Fragment key={dept}>
                      <tr className="bg-white/[0.02]">
                        <td colSpan={4} className="py-4 px-8 text-sm font-black text-indigo-300 flex items-center gap-2 drop-shadow-sm"><Folder className="w-4 h-4 text-indigo-500" /> قسم {dept}</td>
                      </tr>
                      {teachers.map((t) => (
                        <tr key={t.id} className={`hover:bg-white/[0.03] transition-colors group ${t.isHOD ? "bg-amber-500/5" : ""}`}>
                          <td className="py-4 px-8 border-r-2 border-transparent group-hover:border-indigo-500 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black shadow-inner border ${t.isHOD ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}`}>
                                {t.isHOD ? <Crown className="w-6 h-6" /> : t.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-white text-sm sm:text-base drop-shadow-sm">{t.name}</p>
                                <p className="text-[10px] font-bold text-slate-500 mt-1">{t.specialization}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-sm font-black flex items-center justify-center gap-1">
                               <span className="text-emerald-400">{t.recorded}</span>
                               <span className="text-slate-600">/</span>
                               <span className="text-slate-300">{t.expected}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center w-48">
                            <div className="text-sm font-black text-indigo-400 mb-1.5 drop-shadow-sm">{t.percent}%</div>
                            <div className="w-full h-1.5 bg-[#02040a] rounded-full overflow-hidden shadow-inner border border-white/5">
                               <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${t.percent}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border shadow-inner ${
                               t.status === 'ممتاز' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
                               t.status === 'جيد' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                               t.status === 'تحذير' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                               'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                            }`}>{t.status}</span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🖨️ التقرير المطبوع الرسمي (للإدارة) */}
      <div className="hidden print:block w-full bg-white text-black p-8 font-cairo" dir="rtl">
        <div className="text-center mb-8 border-b-4 border-black pb-6">
          <h1 className="text-3xl font-black">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold mt-2">تقرير متابعة رصد المعلمين ({reportType === 'day' ? todayName : reportType === 'week' ? 'أسبوعي' : 'مخصص'})</h2>
          <p className="text-sm mt-4 font-black">النطاق: {startDate} إلى {endDate}</p>
        </div>
        <table className="print-table w-full">
          <thead>
            <tr>
              <th>المعلم / المنصب</th>
              <th>التخصص</th>
              <th>مطالب به</th>
              <th>رصد فعلي</th>
              <th>النسبة</th>
              <th>التقييم</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedTeachers).map(([dept, teachers]) => (
              <React.Fragment key={`print-${dept}`}>
                <tr><td colSpan={6} className="dept-row">قسم {dept}</td></tr>
                {teachers.map(t => (
                  <tr key={`pr-${t.id}`} className={t.isHOD ? "hod-row" : ""}>
                    <td className="text-right font-black">{t.name} {t.isHOD && "(رئيس القسم)"}</td>
                    <td>{t.specialization}</td>
                    <td>{t.expected}</td>
                    <td>{t.recorded}</td>
                    <td>{t.percent}%</td>
                    <td>{t.status}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div className="mt-16 flex justify-between px-10">
          <div className="text-center"><p className="font-black">توقيع المدير المساعد</p><div className="mt-10 border-t border-black w-40" /></div>
          <div className="text-center"><p className="font-black">مدير المدرسة</p><p className="mt-2 text-sm font-bold">أ. صالح المطيري</p><div className="mt-6 border-t border-black w-40" /></div>
        </div>
      </div>
    </>
  );
}
