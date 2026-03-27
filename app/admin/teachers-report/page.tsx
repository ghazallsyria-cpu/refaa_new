"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeachersSystem } from "@/hooks/useTeachersSystem";
import { motion } from "motion/react";
import {
  CheckCircle2, FileText, Download, Users, Calendar, Clock, Search
} from "lucide-react";

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

export default function TeachersReportPage() {
  const { loading: hookLoading, fetchTeachersReportData } = useTeachersSystem();
  const [teachers, setTeachers] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");

  const [todayStr, setTodayStr] = useState("");
  const [todayName, setTodayName] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const now = new Date();
    setTodayStr(now.toISOString().split("T")[0]);
    setTodayName(DAY_MAP[now.getDay()]);
    setDateLabel(`${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`);
  }, []);

  const fetchData = useCallback(async () => {
    if (!todayStr) return;
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      
      const jsDay = now.getDay();
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                    jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

      const data = await fetchTeachersReportData(reportType, todayStr, dbDay, weekAgoStr);

      const results: TeacherReport[] = data.map((item: any) => {
        const { teacher, scheduleData, attendanceData } = item;
        const total = scheduleData?.length || 0;

        const recorded = scheduleData?.filter((slot: any) =>
          attendanceData?.some((a: any) => {
            const aDate = new Date(a.date);
            const aDay = aDate.getDay();
            const aDbDay = aDay === 0 ? 1 : aDay === 1 ? 2 : aDay === 2 ? 3 : aDay === 3 ? 4 : aDay === 4 ? 5 : 0;
            return a.section_id === slot.section_id && a.period_number === slot.period && aDbDay === slot.day_of_week;
          })
        ).length || 0;

        const missed = total - recorded;
        let percent = total > 0 ? Math.round((recorded / total) * 100) : 100;

        const lastRecorded = attendanceData && attendanceData.length > 0
          ? [...attendanceData].sort((a, b) => b.date.localeCompare(a.date))[0].date
          : null;

        let status: TeacherReport["status"] = "ممتاز";
        let notes = "";

        if (total === 0) {
          notes = "لا يوجد حصص مجدولة";
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
          specialization: teacher.specialization || "غير محدد",
          recorded, missed, total, percent,
          lastRecorded, status, notes,
          selected: true,
        };
      });

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
    if (status === "ممتاز") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "جيد") return "bg-blue-50 text-blue-700 border-blue-100";
    if (status === "تحذير") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-red-50 text-red-700 border-red-100";
  };

  const filtered = teachers.filter(t =>
    t.name.includes(search) || t.specialization.includes(search)
  );

  return (
    <>
      {/* واجهة المستخدم العادية (تخفى عند الطباعة) */}
      <div className="space-y-8 pb-20 max-w-7xl mx-auto print:hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 mb-3">
              <FileText className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">التقرير اليومي</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">تقرير متابعة المعلمين</h1>
            <p className="text-slate-500 mt-1 font-medium">
              اختر المعلمين وأنشئ تقرير PDF جاهز للعرض
            </p>
          </div>

          <button
            onClick={generatePDF}
            disabled={selectedTeachers.length === 0}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200"
          >
            <Download className="h-5 w-5" />
            تصدير PDF ({selectedTeachers.length} معلم)
          </button>
        </div>

        {/* خيارات التقرير */}
        <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row gap-6 items-center">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <span className="font-black text-slate-700 text-sm">نطاق التقرير:</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setReportType("day")}
              className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                reportType === "day"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              يومي — {todayName} {dateLabel}
            </button>
            <button
              onClick={() => setReportType("week")}
              className={`px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                reportType === "week"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              أسبوعي — آخر 7 أيام
            </button>
          </div>

          {/* ملخص سريع */}
          <div className="mr-auto flex items-center gap-4 text-xs font-bold">
            <span className="text-emerald-600">{teachers.filter(t => t.status === "ممتاز" && t.selected).length} ممتاز</span>
            <span className="text-amber-600">{teachers.filter(t => t.status === "تحذير" && t.selected).length} تحذير</span>
            <span className="text-red-600">{teachers.filter(t => t.status === "حرج" && t.selected).length} حرج</span>
          </div>
        </div>

        {/* اختيار المعلمين */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400" />
              <span className="font-black text-slate-700">اختر المعلمين للتقرير</span>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll}
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100 transition-all">
                تحديد الكل
              </button>
              <button onClick={deselectAll}
                className="px-4 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-black hover:bg-slate-100 transition-all">
                إلغاء الكل
              </button>
            </div>
            <div className="relative sm:mr-auto w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-2xl bg-slate-50 border-0 py-2.5 pr-10 pl-4 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="py-4 pr-6 pl-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">تضمين</th>
                  <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحصص المسجّلة</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحصص الفائتة</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">نسبة الالتزام</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر تسجيل</th>
                  <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-20 text-center">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-sm">جاري تجميع البيانات...</p>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center">
                    <p className="text-slate-400 font-bold text-sm">لا توجد نتائج</p>
                  </td></tr>
                ) : filtered.map((teacher, idx) => (
                  <motion.tr
                    key={teacher.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => toggleSelect(teacher.id)}
                    className={`cursor-pointer transition-all hover:bg-slate-50/80 ${
                      teacher.selected ? "" : "opacity-40"
                    } ${teacher.status === "حرج" ? "bg-red-50/20" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 pr-6 pl-4 text-center">
                      <div className={`h-5 w-5 rounded-lg border-2 mx-auto flex items-center justify-center transition-all ${
                        teacher.selected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300"
                      }`}>
                        {teacher.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </td>

                    {/* المعلم */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
                          <div className="text-[10px] text-slate-400">{teacher.specialization}</div>
                        </div>
                      </div>
                    </td>

                    {/* المسجّلة */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-lg font-black text-emerald-600">{teacher.recorded}</span>
                      <span className="text-xs text-slate-400"> / {teacher.total}</span>
                    </td>

                    {/* الفائتة */}
                    <td className="px-4 py-4 text-center">
                      <span className={`text-lg font-black ${teacher.missed > 0 ? "text-red-600" : "text-slate-300"}`}>
                        {teacher.missed}
                      </span>
                    </td>

                    {/* النسبة */}
                    <td className="px-4 py-4 text-center">
                      <div className={`text-lg font-black ${
                        teacher.percent >= 90 ? "text-emerald-600" :
                        teacher.percent >= 75 ? "text-amber-600" : "text-red-600"
                      }`}>{teacher.percent}%</div>
                      <div className="mt-1 h-1.5 w-14 mx-auto bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          teacher.percent >= 90 ? "bg-emerald-500" :
                          teacher.percent >= 75 ? "bg-amber-500" : "bg-red-500"
                        }`} style={{ width: `${teacher.percent}%` }} />
                      </div>
                    </td>

                    {/* ملاحظات */}
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs font-black ${teacher.notes ? "text-amber-600" : "text-slate-300"}`}>
                        {teacher.notes || "—"}
                      </span>
                    </td>

                    {/* آخر تسجيل */}
                    <td className="px-4 py-4 text-center">
                      {teacher.lastRecorded ? (
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(teacher.lastRecorded).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                        </div>
                      ) : (
                        <span className="text-xs font-black text-red-500">لم يسجّل</span>
                      )}
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusColor(teacher.status)}`}>
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

      {/* تقرير الطباعة (يظهر فقط عند الطباعة) */}
      <div className="hidden print:block w-full bg-white text-black p-8" dir="rtl">
        <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
          <h1 className="text-3xl font-black mb-2">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold text-slate-700">تقرير متابعة تسجيل الحضور والغياب للمعلمين</h2>
          <p className="text-sm text-slate-500 mt-2">
            {reportType === "day" ? `التقرير اليومي — ${todayName} ${dateLabel}` : `التقرير الأسبوعي — ${dateLabel}`}
          </p>
        </div>

        <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="font-bold">إجمالي المعلمين: {selectedTeachers.length}</div>
          <div className="flex gap-6 text-sm font-bold">
            <span className="text-emerald-700">ممتاز: {selectedTeachers.filter(t => t.status === "ممتاز").length}</span>
            <span className="text-blue-700">جيد: {selectedTeachers.filter(t => t.status === "جيد").length}</span>
            <span className="text-amber-700">تحذير: {selectedTeachers.filter(t => t.status === "تحذير").length}</span>
            <span className="text-red-700">حرج: {selectedTeachers.filter(t => t.status === "حرج").length}</span>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-300 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-3 text-right">م</th>
              <th className="border border-slate-300 p-3 text-right">اسم المعلم</th>
              <th className="border border-slate-300 p-3 text-right">التخصص</th>
              <th className="border border-slate-300 p-3 text-center">الحصص المسجلة</th>
              <th className="border border-slate-300 p-3 text-center">الحصص الفائتة</th>
              <th className="border border-slate-300 p-3 text-center">نسبة الالتزام</th>
              <th className="border border-slate-300 p-3 text-center">ملاحظات</th>
              <th className="border border-slate-300 p-3 text-center">آخر تسجيل</th>
              <th className="border border-slate-300 p-3 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {selectedTeachers.map((t, i) => (
              <tr key={t.id} className={t.status === "حرج" ? "bg-red-50" : t.status === "تحذير" ? "bg-amber-50" : ""}>
                <td className="border border-slate-300 p-3 text-center font-bold">{i + 1}</td>
                <td className="border border-slate-300 p-3 font-bold">{t.name}</td>
                <td className="border border-slate-300 p-3 text-slate-600">{t.specialization}</td>
                <td className="border border-slate-300 p-3 text-center" dir="ltr">{t.recorded} / {t.total}</td>
                <td className={`border border-slate-300 p-3 text-center font-bold ${t.missed > 0 ? "text-red-600" : ""}`}>{t.missed}</td>
                <td className="border border-slate-300 p-3 text-center font-bold" dir="ltr">{t.percent}%</td>
                <td className="border border-slate-300 p-3 text-center text-xs font-bold text-amber-700">
                  {t.notes || "—"}
                </td>
                <td className="border border-slate-300 p-3 text-center text-xs">
                  {t.lastRecorded ? new Date(t.lastRecorded).toLocaleDateString("ar-EG") : "لم يسجل"}
                </td>
                <td className={`border border-slate-300 p-3 text-center font-bold ${
                  t.status === "حرج" ? "text-red-700" :
                  t.status === "تحذير" ? "text-amber-700" :
                  t.status === "ممتاز" ? "text-emerald-700" : "text-blue-700"
                }`}>
                  {t.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-16 flex justify-between items-end">
          <div className="text-sm text-slate-500">
            تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-400 mb-2"></div>
            <div className="font-bold text-slate-700">توقيع مدير المدرسة</div>
          </div>
        </div>
      </div>
    </>
  );
}
