"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeachersSystem } from "@/hooks/useTeachersSystem";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, FileText, Download, Users, Calendar, Clock, Search, ShieldCheck, Zap, Info
} from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";

interface TeacherReport {
  id: string;
  name: string;
  specialization: string;
  recorded: number;
  missed: number;
  total: number;
  percent: number;
  lastRecorded: string | null;
  status: "ممتاز" | "جيد" | "تحذير" | "حرج";
  notes?: string;
  selected: boolean;
}

const DAY_MAP: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء",
  3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت"
};

const MONTH_MAP: Record<number, string> = {
  0: "يناير", 1: "فبراير", 2: "مارس", 3: "أبريل",
  4: "مايو", 5: "يونيو", 6: "يوليو", 7: "أغسطس",
  8: "سبتمبر", 9: "أكتوبر", 10: "نوفمبر", 11: "ديسمبر"
};

// 🚀 تاريخ بدء النظام الإلزامي
const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

// 🚀 إضافة التوقيت الموحد (لتفادي تعارض توقيت أجهزة المستخدمين)
const getSchoolTime = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3 * 3600000));
};

export default function TeachersReportPage() {
  const { loading: hookLoading, fetchTeachersReportData } = useTeachersSystem();
  const [teachers, setTeachers] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");

  const [todayStr, setTodayStr] = useState("");
  const [todayName, setTodayName] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    const now = getSchoolTime();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setTodayStr(`${year}-${month}-${day}`);
    setTodayName(DAY_MAP[now.getDay()]);
    setDateLabel(`${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`);
  }, []);

  const fetchData = useCallback(async () => {
    if (!todayStr) return;
    setLoading(true);
    try {
      const now = getSchoolTime();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const wYear = weekAgo.getFullYear();
      const wMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const wDay = String(weekAgo.getDate()).padStart(2, '0');
      const weekAgoStr = `${wYear}-${wMonth}-${wDay}`;
      
      const jsDay = now.getDay();
      // تحويل رقم اليوم ليتوافق مع قاعدة البيانات (الأحد = 1)
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                    jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;
      
      setIsWeekend(dbDay === 0);

      const data = await fetchTeachersReportData(reportType, todayStr, dbDay, weekAgoStr);

      // 🚀 جلب أوقات الحصص المعتمدة من الإدارة
      const { data: dbPeriods } = await supabase.from('periods').select('period_num, end_time');
      const periodsMap: Record<string, string> = {};
      dbPeriods?.forEach(p => { periodsMap[String(p.period_num)] = p.end_time; });

      const isSystemActive = now >= SYSTEM_START_DATE;

      // 🚀 خوارزمية التدقيق الذكية (تم تحصينها بـ String لضمان عدم تعطلها بسبب نوع المتغيرات)
      const results: TeacherReport[] = data.map((item: any) => {
        const { teacher, scheduleData, attendanceData } = item;
        
        let total = 0;
        let recorded = 0;
        let missed = 0;

        if (reportType === "day") {
            // 🚀 الفلترة الآمنة 100% باستخدام String()
            const todaySchedule = scheduleData?.filter((s: any) => String(s.day_of_week) === String(dbDay)) || [];
            total = todaySchedule.length;
            
            const todayAttendance = attendanceData?.filter((a: any) => {
               const recDate = a.date ? String(a.date).split('T')[0] : '';
               return recDate === todayStr;
            }) || [];
            
            const recordedSet = new Set(todayAttendance.map((a: any) => String(a.period)));
            recorded = recordedSet.size;

            if (isSystemActive) {
              todaySchedule.forEach((s: any) => {
                if (!recordedSet.has(String(s.period))) {
                  const endTimeStr = periodsMap[String(s.period)];
                  if (endTimeStr) {
                    const [h, m] = endTimeStr.split(':').map(Number);
                    const periodEndTime = new Date(now);
                    periodEndTime.setHours(h, m, 0, 0);
                    // إذا انتهى وقت الحصة ولم يسجلها -> تعتبر متأخرة
                    if (now > periodEndTime) missed++;
                  }
                }
              });
            }
        } else {
            total = scheduleData?.length || 0;
            // 🚀 توحيد استخراج التواريخ للأسبوع لعدم ضياع الإحصائيات
            const uniqueSlots = new Set(attendanceData?.map((a: any) => {
               const recDate = a.date ? String(a.date).split('T')[0] : '';
               return `${recDate}-${String(a.period)}`;
            }));
            recorded = uniqueSlots.size;
            recorded = Math.min(recorded, total);
            missed = isSystemActive ? Math.max(0, total - recorded) : 0;
        }

        let percent = total > 0 ? Math.round((recorded / total) * 100) : 100;
        percent = Math.min(100, percent); 

        const lastRecorded = attendanceData && attendanceData.length > 0
          ? [...attendanceData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : null;

        let status: TeacherReport["status"] = "ممتاز";
        let notes = "";

        if (!isSystemActive) {
          status = "ممتاز";
          percent = 100;
          missed = 0;
          notes = "النظام في وضع الترقب";
        } else if (total === 0) {
          notes = "لا توجد حصص مجدولة";
          status = "ممتاز";
          percent = 100;
        } else {
          if (percent < 60 || (missed > 0 && reportType === "day")) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";
        }

        const teacherName = teacher.users 
          ? (Array.isArray(teacher.users) ? teacher.users[0]?.full_name : teacher.users.full_name)
          : "غير محدد";

        return {
          id: teacher.id,
          name: teacherName || "غير محدد",
          specialization: teacher.specialization || "عام",
          recorded, missed, total, percent,
          lastRecorded, status, notes,
          selected: true,
        };
      });

      results.sort((a, b) => a.status === "حرج" ? -1 : 1);

      setTeachers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [reportType, todayStr, fetchTeachersReportData]);

  useEffect(() => {
    if (todayStr) {
      fetchData();
    }
  }, [fetchData, todayStr]);

  const toggleSelect = (id: string) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const selectAll = () => setTeachers(prev => prev.map(t => ({ ...t, selected: true })));
  const deselectAll = () => setTeachers(prev => prev.map(t => ({ ...t, selected: false })));

  const selectedTeachers = teachers.filter(t => t.selected);

  const generatePDF = () => {
    window.print();
  };

  const statusColor = (status: string) => {
    if (status === "ممتاز") return "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-100";
    if (status === "جيد") return "bg-blue-50 text-blue-700 border-blue-100 shadow-blue-100";
    if (status === "تحذير") return "bg-amber-50 text-amber-700 border-amber-100 shadow-amber-100";
    return "bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100";
  };

  const filtered = teachers.filter(t =>
    t.name.includes(search) || t.specialization.includes(search)
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; }
          .print-table th, .print-table td { border: 1px solid #cbd5e1 !important; padding: 8px !important; text-align: center !important; font-size: 12px !important; }
          .print-table th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #0f172a !important; }
          .print-table tr:nth-child(even) { background-color: #f8fafc !important; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid; }
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
                <FileText className="w-3.5 h-3.5 text-indigo-200" />
                <span>مركز التقارير المعتمدة</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                تقرير متابعة المعلمين
              </h1>
              <p className="text-indigo-100 text-xs sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed">
                حدد نطاق التقرير، اختر المعلمين المعنيين، واستخرج تقرير PDF رسمي جاهز للعرض على الإدارة، معتمد على التوقيت الزمني الدقيق.
              </p>
            </div>
            
            <div className="flex shrink-0 w-full lg:w-auto">
              <button
                onClick={generatePDF}
                disabled={selectedTeachers.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] bg-white text-indigo-600 hover:bg-indigo-50 text-sm sm:text-base font-black shadow-xl shadow-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5 animate-bounce" />
                تصدير PDF ({selectedTeachers.length})
              </button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        </div>

        {/* 🚀 تنبيه عطلة نهاية الأسبوع */}
        {isWeekend && reportType === "day" && !loading && (
           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex items-center gap-3 text-sky-800 shadow-sm">
             <Info className="w-5 h-5 shrink-0" />
             <p className="text-sm font-bold">
               اليوم هو عطلة نهاية الأسبوع، لذلك تظهر إحصائيات المعلمين اليومية بقيم صفرية لعدم وجود جداول مدرسية. يمكنك التبديل للتقرير <strong>(الأسبوعي)</strong> للاطلاع على أدائهم.
             </p>
           </motion.div>
        )}

        <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24 z-30 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
              <span className="font-black text-slate-900 text-sm">نطاق التقرير:</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setReportType("day")}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  reportType === "day"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-transparent"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                يومي — {todayName}
              </button>
              <button
                onClick={() => setReportType("week")}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  reportType === "week"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-transparent"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                أسبوعي (7 أيام)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100 w-full xl:w-auto justify-center">
            <div className="flex items-center gap-1.5 px-3 border-l border-slate-200 last:border-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-600">ممتاز: <span className="font-black text-emerald-700">{teachers.filter(t => t.status === "ممتاز" && t.selected).length}</span></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 border-l border-slate-200 last:border-0">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-slate-600">تحذير: <span className="font-black text-amber-700">{teachers.filter(t => t.status === "تحذير" && t.selected).length}</span></span>
            </div>
            <div className="flex items-center gap-1.5 px-3">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-xs font-bold text-slate-600">حرج: <span className="font-black text-rose-700">{teachers.filter(t => t.status === "حرج" && t.selected).length}</span></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">قائمة التضمين للتقرير</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1">اختر المعلمين المراد إدراجهم في تقرير الـ PDF.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={selectAll} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100">
                  تحديد الكل
                </button>
                <button onClick={deselectAll} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-all border border-slate-200">
                  إلغاء الكل
                </button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 py-2.5 pr-10 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/30">
                <tr>
                  <th className="py-4 pr-6 pl-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">تضمين</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الالتزام (حصص)</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">المؤشر المئوي</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر تحديث للرصد</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-24 text-center">
                    <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-sm">جاري التجميع والتحليل...</p>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-24 text-center">
                    <p className="text-slate-400 font-bold text-sm">لا توجد نتائج مطابقة</p>
                  </td></tr>
                ) : filtered.map((teacher, idx) => (
                  <motion.tr
                    key={teacher.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => toggleSelect(teacher.id)}
                    className={`cursor-pointer transition-all hover:bg-slate-50/80 ${
                      teacher.selected ? "" : "opacity-40 grayscale-[50%]"
                    } ${teacher.status === "حرج" && teacher.selected ? "bg-rose-50/30" : ""}`}
                  >
                    <td className="py-4 pr-6 pl-4 text-center">
                      <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-lg sm:rounded-xl border-2 mx-auto flex items-center justify-center transition-all ${
                        teacher.selected
                          ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200"
                          : "border-slate-300 bg-white"
                      }`}>
                        {teacher.selected && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm sm:text-base border border-indigo-100">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs sm:text-sm">{teacher.name}</div>
                          <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 mt-0.5">{teacher.specialization}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {teacher.total === 0 ? (
                        <span className="text-[10px] font-bold text-slate-400">لا جدول</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-sm sm:text-base font-black">
                            <span className={teacher.recorded === teacher.total ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-slate-700">{teacher.total}</span>
                          </div>
                          {teacher.missed > 0 && <span className="text-[9px] font-bold text-rose-500 mt-1 flex items-center gap-1"><Zap className="w-3 h-3"/> تأخر ({teacher.missed})</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`text-sm sm:text-base font-black ${
                        teacher.percent >= 90 ? "text-emerald-600" :
                        teacher.percent >= 75 ? "text-amber-600" : "text-rose-600"
                      }`}>{teacher.percent}%</div>
                      <div className="mt-1.5 h-1.5 w-16 mx-auto bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full ${
                          teacher.percent >= 90 ? "bg-emerald-500" :
                          teacher.percent >= 75 ? "bg-amber-500" : "bg-rose-500"
                        }`} style={{ width: `${teacher.percent}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {teacher.lastRecorded ? (
                        <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold text-slate-600">
                          <span dir="ltr">{new Date(teacher.lastRecorded).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}</span>
                          <span className="text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-1"><Clock className="w-2.5 h-2.5"/> {new Date(teacher.lastRecorded).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">لم يسجّل إطلاقاً</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black border shadow-sm ${statusColor(teacher.status)}`}>
                        {teacher.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="hidden print:block w-full bg-white text-black p-8 font-cairo" dir="rtl">
        <div className="text-center mb-8 border-b-[3px] border-slate-900 pb-6 relative">
          <div className="absolute top-0 right-0 text-right">
            <p className="text-[10px] font-bold text-slate-500">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
            <p className="text-[10px] font-bold text-slate-500 mt-1">الوقت: {new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold text-slate-700 bg-slate-50 inline-block px-6 py-2 rounded-xl border border-slate-200 mt-2">التقرير المعتمد لمتابعة تسجيل الغياب اليومي للمعلمين</h2>
          <p className="text-sm font-black text-indigo-700 mt-4">
            {reportType === "day" ? `التقرير اليومي — ${todayName} ${dateLabel}` : `التقرير الأسبوعي الشامل — لآخر 7 أيام`}
          </p>
        </div>

        <div className="flex justify-between items-center mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div className="font-black text-slate-900">إجمالي المعلمين المستهدفين: {selectedTeachers.length}</div>
          <div className="flex gap-6 text-sm font-black">
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg">ممتاز: {selectedTeachers.filter(t => t.status === "ممتاز").length}</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">جيد: {selectedTeachers.filter(t => t.status === "جيد").length}</span>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg">تحذير: {selectedTeachers.filter(t => t.status === "تحذير").length}</span>
            <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-lg">حرج: {selectedTeachers.filter(t => t.status === "حرج").length}</span>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th className="w-10">م</th>
              <th className="w-48 text-right">اسم المعلم</th>
              <th className="w-24 text-right">التخصص</th>
              <th className="w-24">الرصد / الإجمالي</th>
              <th className="w-24">حصص متأخرة</th>
              <th className="w-24">نسبة الالتزام</th>
              <th className="w-32">توقيت آخر رصد</th>
              <th className="w-24">التقييم الفني</th>
            </tr>
          </thead>
          <tbody>
            {selectedTeachers.map((t, i) => {
              const statusClass = 
                t.status === "ممتاز" ? "status-excel" : 
                t.status === "جيد" ? "status-good" : 
                t.status === "تحذير" ? "status-warn" : "status-crit";
                
              return (
              <tr key={t.id}>
                <td className="font-black text-slate-500">{i + 1}</td>
                <td className="font-black text-right">{t.name}</td>
                <td className="text-xs font-bold text-slate-600 text-right">{t.specialization}</td>
                <td className="font-black text-indigo-700" dir="ltr">{t.recorded} / {t.total}</td>
                <td className={`font-black ${t.missed > 0 ? "text-rose-600 bg-rose-50" : "text-slate-400"}`}>{t.missed > 0 ? t.missed : "0"}</td>
                <td className="font-black" dir="ltr">{t.percent}%</td>
                <td className="text-xs font-bold text-slate-700">
                  {t.lastRecorded ? new Date(t.lastRecorded).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td>
                  <span className={`status-badge ${statusClass}`}>{t.status}</span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>

        <div className="mt-16 flex justify-between items-end border-t border-slate-300 pt-8">
          <div className="text-xs font-bold text-slate-500 text-right w-1/3">
            * ملاحظة: هذا التقرير تم توليده آلياً من نظام الرفعة للرصد الأكاديمي، ويعتبر وثيقة رسمية لتقييم الأداء والمحاسبة.
          </div>
          <div className="text-center w-1/3">
            <div className="w-48 border-b-2 border-slate-800 mb-2 mx-auto"></div>
            <div className="font-black text-slate-900">اعتماد إدارة الموارد البشرية</div>
          </div>
          <div className="text-center w-1/3">
            <div className="w-48 border-b-2 border-slate-800 mb-2 mx-auto"></div>
            <div className="font-black text-slate-900">اعتماد مدير المدرسة</div>
          </div>
        </div>
      </div>
    </>
  );
}
