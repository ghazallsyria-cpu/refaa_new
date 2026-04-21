/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, FileText, Download, Calendar, Clock, Search, ShieldCheck, Zap, Filter, School, Crown, Folder, RefreshCw } from "lucide-react";
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

const getDatesBetween = (startDate: Date, endDate: Date) => {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(getLocalDateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
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
    const weekAgo = new Date(schoolTime);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setStartDate(getLocalDateString(weekAgo));
  }, [todayStr, schoolTime]);

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
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        queryStartStr = getLocalDateString(weekAgo);
        datesToProcess = getDatesBetween(new Date(queryStartStr), new Date(queryEndStr));
      } else if (currentType === "custom") {
        if (!startDate || !endDate) { setCustomError("يرجى تحديد التاريخ"); setLoading(false); return; }
        const sDate = new Date(startDate); const eDate = new Date(endDate);
        if (sDate > eDate) { setCustomError("تاريخ البداية خطأ"); setLoading(false); return; }
        if (Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)) > 31) { setCustomError("أقصى مدة 31 يوماً."); setLoading(false); return; }
        queryStartStr = startDate; queryEndStr = endDate;
        datesToProcess = getDatesBetween(sDate, eDate);
      }

      // 🚀 فصل الجلب لحماية النظام
      const [
        { data: teachersDB },
        { data: tsDB },
        { data: schedulesDB },
        { data: dbPeriods },
        { data: attendanceDB }
      ] = await Promise.all([
        supabase.from('teachers').select('id, specialization, national_id, department_id, users(full_name), academic_departments(id, name, head_id)').limit(2000),
        supabase.from('teacher_sections').select('teacher_id, sections(classes(name))').limit(10000),
        supabase.from('schedules').select('teacher_id, section_id, day_of_week, period').limit(10000),
        supabase.from('class_periods').select('period_number, end_time').limit(100),
        currentType === "day" 
          ? supabase.from('attendance_records').select('section_id, date, period, created_at, teacher_id').eq('date', todayStr).limit(10000)
          : supabase.from('attendance_records').select('section_id, date, period, created_at, teacher_id').gte('date', queryStartStr).lte('date', queryEndStr).limit(50000)
      ]);

      const periodsMap: Record<string, string> = {};
      dbPeriods?.forEach(p => { periodsMap[String(p.period_number)] = p.end_time; });

      const isSystemActive = now >= SYSTEM_START_DATE;
      const safeAttendance = (attendanceDB || []) as any[];
      const safeSchedules = (schedulesDB || []) as any[];
      
      // 🚀 الدمج السريع
      const safeTeachers = (teachersDB || []).map((t: any) => ({
        ...t,
        teacher_sections: (tsDB || []).filter(ts => String(ts.teacher_id) === String(t.id))
      }));

      const results: TeacherReport[] = safeTeachers.map((teacher: any) => {
        let expectedTotal = 0; let scheduledTotal = 0; let actualRecorded = 0; let actualMissed = 0;
        let lastRecorded: string | null = null;

        for (const dStr of datesToProcess) {
          const d = new Date(dStr);
          const dDay = getDbDay(d.getDay());
          if (dDay >= 1 && dDay <= 5) { 
            const daySchedules = safeSchedules.filter(s => String(s.teacher_id) === String(teacher.id) && String(s.day_of_week) === String(dDay));
            daySchedules.forEach(sch => {
              scheduledTotal++;
              let isPassed = false;
              if (dStr === todayStr) {
                const endTimeStr = periodsMap[String(sch.period)];
                if (endTimeStr) {
                  const [h, m] = endTimeStr.split(':').map(Number);
                  const pTime = new Date(now); pTime.setHours(h, m, 0, 0);
                  if (now > pTime) isPassed = true;
                }
              } else if (new Date(dStr) < now) isPassed = true;

              if (isPassed && isSystemActive) {
                expectedTotal++;
                const hasRecord = safeAttendance.find(a => String(a.teacher_id) === String(teacher.id) && String(a.date).split('T')[0] === dStr && String(a.period) === String(sch.period));
                if (hasRecord) {
                  actualRecorded++;
                  const recTime = hasRecord.created_at || hasRecord.date;
                  if (!lastRecorded || recTime > lastRecorded) lastRecorded = recTime;
                } else actualMissed++;
              }
            });
          }
        }

        let percent = expectedTotal > 0 ? Math.round((actualRecorded / expectedTotal) * 100) : 100;
        if (!isSystemActive) percent = 100;

        let status: "ممتاز" | "جيد" | "تحذير" | "حرج" = "ممتاز";
        if (scheduledTotal > 0 && isSystemActive) {
          if (percent < 60 || (actualMissed > 0 && currentType === "day")) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";
        }

        const deptObj = Array.isArray(teacher.academic_departments) ? teacher.academic_departments[0] : teacher.academic_departments;

        return {
          id: teacher.id,
          name: getTeacherName(teacher),
          specialization: teacher.specialization || "عام",
          department_name: deptObj?.name || "عام",
          isHOD: deptObj ? deptObj.head_id === teacher.id : false,
          stage: getTeacherStage(teacher),
          recorded: actualRecorded, missed: actualMissed, expected: expectedTotal, scheduled: scheduledTotal, percent, lastRecorded, status,
          selected: true,
        };
      });

      setLocalTeachers(results);
    } catch (e) { console.error(e); setCustomError("حدث خطأ أثناء التجميع."); } 
    finally { setLoading(false); }
  }, [reportType, todayStr, startDate, endDate]);

  useEffect(() => { if (todayStr && reportType !== "custom") fetchData(); }, [todayStr, reportType, fetchData]);

  const handleTypeChange = (type: "day" | "week" | "custom") => { setReportType(type); if (type !== "custom") fetchData(type); };
  const handleApplyCustomRange = () => { fetchData("custom"); };
  const toggleSelect = (id: string) => setLocalTeachers(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  const selectAll = () => setLocalTeachers(prev => prev.map(t => ({ ...t, selected: true })));
  const deselectAll = () => setLocalTeachers(prev => prev.map(t => ({ ...t, selected: false })));

  const filteredAndStagedTeachers = useMemo(() => {
    return localTeachers.filter(t => {
      const matchSearch = (t.name || "").toLowerCase().includes(search.toLowerCase()) || (t.specialization || "").toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'all' || t.stage === stageFilter || t.stage === 'both';
      return matchSearch && matchStage;
    });
  }, [localTeachers, search, stageFilter]);

  const groupedTeachers = useMemo(() => {
    const groups = filteredAndStagedTeachers.reduce((acc, t) => {
      if (!acc[t.department_name]) acc[t.department_name] = [];
      acc[t.department_name].push(t);
      return acc;
    }, {} as Record<string, TeacherReport[]>);

    const sortedGroups: Record<string, TeacherReport[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key].sort((a, b) => {
        if (a.isHOD && !b.isHOD) return -1;
        if (!a.isHOD && b.isHOD) return 1;
        return a.name.localeCompare(b.name, 'ar');
      });
    });
    return sortedGroups;
  }, [filteredAndStagedTeachers]);

  const selectedTeachersCount = filteredAndStagedTeachers.filter(t => t.selected).length;
  const generatePDF = () => window.print();

  const statusColor = (status: string) => {
    if (status === "ممتاز") return "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-100";
    if (status === "جيد") return "bg-blue-50 text-blue-700 border-blue-100 shadow-blue-100";
    if (status === "تحذير") return "bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100";
    return "bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100";
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 1.5cm 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; font-family: 'Cairo', sans-serif !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 20px; }
          .print-table th, .print-table td { border: 1px solid #cbd5e1 !important; padding: 10px !important; text-align: center !important; font-size: 13px !important; }
          .print-table th { background-color: #f8fafc !important; font-weight: 900 !important; color: #0f172a !important; border-bottom: 2px solid #94a3b8 !important; }
          .dept-header { background-color: #e2e8f0 !important; color: #1e293b !important; font-weight: 900 !important; font-size: 15px !important; text-align: right !important; padding-right: 15px !important; }
          .hod-row { background-color: #fefce8 !important; font-weight: bold !important; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; border: 1px solid; font-size: 11px !important; }
          .status-excel { background: #dcfce7 !important; color: #15803d !important; border-color: #bbf7d0 !important; }
          .status-good { background: #dbeafe !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }
          .status-warn { background: #fef3c7 !important; color: #b45309 !important; border-color: #fde68a !important; }
          .status-crit { background: #ffe4e6 !important; color: #be123c !important; border-color: #fecdd3 !important; }
        }
      `}</style>

      <div className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden font-cairo" dir="rtl">
        
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-6 sm:p-12 text-white shadow-2xl shadow-indigo-500/20">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
                <FileText className="w-3.5 h-3.5 text-indigo-200" /> مركز التقارير الإدارية المعتمدة
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                تقرير المتابعة والإنتاجية
              </h1>
              <p className="text-indigo-100 text-xs sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed">
                تقارير مصنفة بذكاء حسب الأقسام العلمية والمراحل الدراسية، جاهزة للطباعة والاعتماد من الإدارات العليا.
              </p>
            </div>
            <div className="flex shrink-0 w-full lg:w-auto">
              <button onClick={generatePDF} disabled={selectedTeachersCount === 0} className="w-full flex items-center justify-center gap-2 px-6 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] bg-white text-indigo-600 hover:bg-indigo-50 text-sm sm:text-base font-black shadow-xl shadow-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="w-5 h-5 animate-bounce" /> تصدير التقرير الرسمي ({selectedTeachersCount})
              </button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24 z-30 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          
          <div className="flex flex-col w-full xl:w-auto gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><School className="w-5 h-5" /></div>
               <span className="font-black text-slate-900 text-sm shrink-0">المرحلة الدراسية:</span>
               <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                 <button onClick={() => setStageFilter('all')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all ${stageFilter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>الكل</button>
                 <button onClick={() => setStageFilter('middle')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all ${stageFilter === 'middle' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>متوسط</button>
                 <button onClick={() => setStageFilter('high')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-black transition-all ${stageFilter === 'high' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>ثانوي</button>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
              <span className="font-black text-slate-900 text-sm shrink-0">نطاق التقرير:</span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button onClick={() => handleTypeChange("day")} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${reportType === "day" ? "bg-indigo-600 text-white shadow-md border-transparent" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>يومي ({todayName})</button>
                <button onClick={() => handleTypeChange("week")} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${reportType === "week" ? "bg-indigo-600 text-white shadow-md border-transparent" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>أسبوعي</button>
                <button onClick={() => handleTypeChange("custom")} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${reportType === "custom" ? "bg-indigo-600 text-white shadow-md border-transparent" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>مخصص</button>
              </div>
            </div>

            <AnimatePresence>
              {reportType === "custom" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col sm:flex-row items-end gap-3 mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-slate-500 mb-1">من</label><input type="date" max={todayStr} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40 rounded-xl border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 py-2.5 px-3 outline-none" /></div>
                  <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-slate-500 mb-1">إلى</label><input type="date" max={todayStr} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-40 rounded-xl border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 py-2.5 px-3 outline-none" /></div>
                  <button onClick={handleApplyCustomRange} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-md"><Filter className="w-4 h-4" /> تطبيق</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">هيكلية المعلمين ({stageFilter === 'all' ? 'جميع المراحل' : stageFilter === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'})</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1">القائمة منظمة تلقائياً حسب الأقسام العلمية والمناصب.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={selectAll} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100">تحديد الكل</button>
                <button onClick={deselectAll} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-all border border-slate-200">إلغاء الكل</button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" placeholder="بحث بالاسم أو التخصص..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-xl bg-white border border-slate-200 py-2.5 pr-10 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="py-4 pr-6 pl-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">تضمين</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم / المنصب</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الرصد / المطالب به</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المؤشر المئوي</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-24 text-center"><div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-slate-400 font-bold">جاري الهيكلة والتحليل...</p></td></tr>
                ) : Object.keys(groupedTeachers).length === 0 ? (
                  <tr><td colSpan={5} className="py-24 text-center"><p className="text-slate-400 font-bold">لا توجد نتائج مطابقة لهذه المرحلة/البحث</p></td></tr>
                ) : (
                  Object.entries(groupedTeachers).map(([dept, teachers]) => (
                    <React.Fragment key={dept}>
                      <tr className="bg-slate-100/50 border-y border-slate-200">
                        <td colSpan={5} className="py-3 px-6">
                           <div className="flex items-center gap-2 text-indigo-900 font-black">
                              <Folder className="w-5 h-5 text-indigo-500" />
                              قسم {dept} <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md mr-2">{teachers.length} معلمين</span>
                           </div>
                        </td>
                      </tr>
                      {teachers.map((teacher) => (
                        <motion.tr key={teacher.id} onClick={() => toggleSelect(teacher.id)} className={`cursor-pointer transition-all hover:bg-slate-50/80 ${teacher.selected ? "" : "opacity-50 grayscale"} ${teacher.isHOD ? "bg-amber-50/10" : ""}`}>
                          <td className="py-4 pr-6 pl-4 text-center">
                            <div className={`h-5 w-5 rounded-lg border-2 mx-auto flex items-center justify-center transition-all ${teacher.selected ? "bg-indigo-600 border-indigo-600 shadow-md" : "border-slate-300 bg-white"}`}>
                              {teacher.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border ${teacher.isHOD ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                {teacher.isHOD ? <Crown className="w-5 h-5" /> : teacher.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-black text-slate-900 text-sm flex items-center gap-2">{teacher.name}</div>
                                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                                  {teacher.isHOD ? <span className="text-amber-600">رئيس القسم</span> : teacher.specialization}
                                  <span className="mx-1 text-slate-300">|</span> 
                                  {teacher.stage === 'middle' ? 'متوسط' : teacher.stage === 'high' ? 'ثانوي' : teacher.stage === 'both' ? 'مشترك' : 'غير محدد'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {teacher.expected === 0 ? (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">لم يحن / لا يوجد</span>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="text-sm font-black">
                                  <span className={teacher.recorded === teacher.expected ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span>
                                  <span className="text-slate-300 mx-1">/</span>
                                  <span className="text-slate-700">{teacher.expected}</span>
                                </div>
                                {teacher.missed > 0 && <span className="text-[9px] font-bold text-rose-500 mt-1 flex items-center gap-1"><Zap className="w-3 h-3"/> تأخر ({teacher.missed})</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className={`text-sm font-black ${teacher.percent >= 90 ? "text-emerald-600" : teacher.percent >= 75 ? "text-amber-600" : "text-rose-600"}`}>{teacher.percent}%</div>
                            <div className="mt-1 h-1.5 w-16 mx-auto bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${teacher.percent >= 90 ? "bg-emerald-500" : teacher.percent >= 75 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${teacher.percent}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusColor(teacher.status)}`}>{teacher.status}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🖨️ التقرير المطبوع الأنيق (للإدارة العليا) */}
      <div className="hidden print:block w-full bg-white text-black p-8 font-cairo" dir="rtl">
        <div className="text-center mb-8 border-b-[3px] border-slate-900 pb-6 relative">
          <div className="absolute top-0 right-0 text-right">
            <p className="text-[10px] font-bold text-slate-500">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">توقيت الإصدار: {new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold text-slate-700 mt-2">التقرير الإداري لمتابعة الأقسام العلمية والإنتاجية</h2>
          <p className="text-sm font-black text-indigo-700 mt-4 bg-indigo-50 inline-block px-4 py-1.5 rounded-lg border border-indigo-200">
            المرحلة: {stageFilter === 'all' ? 'جميع المراحل' : stageFilter === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'} | 
            النطاق: {reportType === "day" ? `اليومي (${todayName})` : reportType === "week" ? `أسبوعي` : `مخصص`}
          </p>
        </div>

        <table className="print-table w-full">
          <thead>
            <tr>
              <th className="w-12">م</th>
              <th className="w-48 text-right">المعلم / المنصب</th>
              <th className="w-24 text-right">التخصص الدقيق</th>
              <th className="w-24">مطالب به/رصد</th>
              <th className="w-24">مؤشر الإنجاز</th>
              <th className="w-24">التقييم الفني</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedTeachers).map(([dept, teachers]) => {
              const printedTeachers = teachers.filter(t => t.selected);
              if (printedTeachers.length === 0) return null;

              return (
                <React.Fragment key={`print-${dept}`}>
                  <tr>
                    <td colSpan={6} className="dept-header">قسم {dept}</td>
                  </tr>
                  {printedTeachers.map((t, i) => {
                    const statusClass = t.status === "ممتاز" ? "status-excel" : t.status === "جيد" ? "status-good" : t.status === "تحذير" ? "status-warn" : "status-crit";
                    return (
                      <tr key={t.id} className={t.isHOD ? "hod-row" : ""}>
                        <td className="font-black text-slate-500">{i + 1}</td>
                        <td className="font-black text-right">
                          {t.name} {t.isHOD && <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded mr-2">رئيس قسم</span>}
                        </td>
                        <td className="text-xs font-bold text-slate-600 text-right">{t.specialization}</td>
                        <td className="font-black text-indigo-700" dir="ltr">{t.recorded} / {t.expected}</td>
                        <td className="font-black" dir="ltr">{t.percent}%</td>
                        <td><span className={`status-badge ${statusClass}`}>{t.status}</span></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        <div className="print-signatures w-full px-12 mt-16">
          <div className="flex justify-between items-end w-full pt-10">
            <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع الإشراف الإداري</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
            <div className="text-center"><p className="font-bold text-slate-800 mb-10">توقيع مدير المدرسة</p><div className="border-t-2 border-slate-400 w-48 mx-auto"></div></div>
          </div>
        </div>
      </div>
    </>
  );
}
