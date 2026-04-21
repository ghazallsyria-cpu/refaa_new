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

// 🚀 دالة توليد التواريخ بدقة متناهية (O(N)) وتجنب مشاكل المناطق الزمنية
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

      // 🚀 جلب البيانات المتوازي (Parallel Fetch) لسرعة البرق
      const [
        { data: teachersDB },
        { data: tsDB },
        { data: schedulesDB },
        { data: dbPeriods },
        { data: attendanceDB }
      ] = await Promise.all([
        supabase.from('teachers').select('id, specialization, department_id, users(full_name), academic_departments(id, name), department_heads(id)').limit(2000),
        supabase.from('teacher_sections').select('teacher_id, sections(classes(name))').limit(10000),
        supabase.from('schedules').select('teacher_id, section_id, day_of_week, period').limit(10000),
        supabase.from('class_periods').select('period_number, end_time').limit(100),
        supabase.from('attendance_records').select('teacher_id, date, period').gte('date', queryStartStr).lte('date', queryEndStr).limit(50000)
      ]);

      const periodsMap: Record<string, string> = {};
      dbPeriods?.forEach(p => { periodsMap[String(p.period_number)] = p.end_time; });

      // 🚀 خريطة الحضور (Hash Map) لسرعة التحقق O(1) بدلاً من find المنهك
      const attendanceMap = new Set((attendanceDB || []).map(a => `${a.teacher_id}_${a.date}_${a.period}`));
      
      const safeSchedules = (schedulesDB || []) as any[];
      const safeTeachers = (teachersDB || []).map((t: any) => ({
        ...t,
        teacher_sections: (tsDB || []).filter(ts => String(ts.teacher_id) === String(t.id))
      }));

      const results: TeacherReport[] = safeTeachers.map((teacher: any) => {
        let expectedTotal = 0; let actualRecorded = 0;

        for (const dStr of datesToProcess) {
          const d = new Date(dStr + 'T12:00:00');
          const dDay = getDbDay(d.getDay());
          if (dDay >= 1 && dDay <= 5) { // الأحد للخميس
            const daySchedules = safeSchedules.filter(s => String(s.teacher_id) === String(teacher.id) && String(s.day_of_week) === String(dDay));
            daySchedules.forEach(sch => {
              let isPassed = false;
              if (dStr === todayStr) {
                const endTime = periodsMap[String(sch.period)];
                if (endTime) {
                  const [h, m] = endTime.split(':').map(Number);
                  const pEnd = new Date(now); pEnd.setHours(h, m, 0, 0);
                  if (now > pEnd) isPassed = true;
                }
              } else isPassed = true;

              if (isPassed && new Date(dStr) >= SYSTEM_START_DATE) {
                expectedTotal++;
                if (attendanceMap.has(`${teacher.id}_${dStr}_${sch.period}`)) actualRecorded++;
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
          stage: getTeacherStage(teacher),
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

      <div className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 font-cairo print:hidden" dir="rtl">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-700 to-indigo-800 p-8 sm:p-12 text-white shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                <FileText className="w-4 h-4" /> مركز التقارير المعتمد
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight">تقرير المتابعة والإنتاجية</h1>
              <p className="text-indigo-100 font-bold opacity-90 max-w-2xl">بإشراف المدير: أ. صالح مخلد المطيري | إعداد المنسق: إيهاب جمال غزال</p>
            </div>
            <button onClick={() => window.print()} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-50 flex items-center gap-2 transition-all active:scale-95">
              <Download className="w-5 h-5" /> تصدير التقرير المعتمد
            </button>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-6 justify-between items-center sticky top-24 z-30">
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
               <button onClick={() => handleTypeChange("day")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "day" ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>يومي</button>
               <button onClick={() => handleTypeChange("week")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "week" ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>أسبوعي</button>
               <button onClick={() => handleTypeChange("custom")} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === "custom" ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>مخصص</button>
             </div>
             {reportType === "custom" && (
               <div className="flex gap-2 animate-in slide-in-from-right-2">
                 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border-slate-200 text-xs font-bold p-2" />
                 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl border-slate-200 text-xs font-bold p-2" />
                 <button onClick={() => fetchData("custom")} className="bg-indigo-600 text-white p-2 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
               </div>
             )}
          </div>
          <div className="relative w-full xl:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="بحث بالاسم أو التخصص..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-2xl bg-white border border-slate-200 py-3 px-10 text-sm font-bold outline-none shadow-sm" />
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-5 px-8 text-right">المعلم / المنصب</th>
                  <th className="px-4 py-5 text-center">الرصد / المطالب به</th>
                  <th className="px-4 py-5 text-center">الإنجاز</th>
                  <th className="px-4 py-5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="py-24 text-center"><div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                ) : (
                  Object.entries(groupedTeachers).map(([dept, teachers]) => (
                    <React.Fragment key={dept}>
                      <tr className="bg-slate-100/50"><td colSpan={4} className="py-3 px-8 text-sm font-black text-indigo-900 flex items-center gap-2"><Folder className="w-4 h-4" /> قسم {dept}</td></tr>
                      {teachers.map((t) => (
                        <tr key={t.id} className={`hover:bg-slate-50/80 transition-colors ${t.isHOD ? "bg-amber-50/20" : ""}`}>
                          <td className="py-4 px-8">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${t.isHOD ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>{t.isHOD ? <Crown className="w-5 h-5" /> : t.name.charAt(0)}</div>
                              <div><p className="font-black text-slate-900 text-sm">{t.name}</p><p className="text-[10px] font-bold text-slate-400">{t.specialization}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-sm font-black"><span className="text-emerald-600">{t.recorded}</span><span className="text-slate-300 mx-1">/</span>{t.expected}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-sm font-black text-indigo-600">{t.percent}%</div>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${t.percent}%` }} /></div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black border ${t.status === 'ممتاز' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{t.status}</span>
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
