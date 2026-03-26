"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import {
  CheckCircle2, FileText, Download, Users, Calendar, Clock, Search
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [teachers, setTeachers] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const todayName = DAY_MAP[now.getDay()];
  const dateLabel = `${now.getDate()} ${MONTH_MAP[now.getMonth()]} ${now.getFullYear()}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const fromDate = reportType === "day" ? todayStr : weekAgoStr;
      const todayDay = now.getDay();

      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, specialization, users(full_name)");

      if (!teachersData) return;

      const results: TeacherReport[] = await Promise.all(
        teachersData.map(async (teacher: any) => {
          // جدول المعلم
          const daysFilter = reportType === "day"
            ? [todayDay]
            : [0, 1, 2, 3, 4];

          const { data: scheduleData } = await supabase
            .from("schedules")
            .select("section_id, day_of_week")
            .eq("teacher_id", teacher.id)
            .in("day_of_week", daysFilter);

          const total = scheduleData?.length || 0;

          // سجلات الحضور
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("date, section_id")
            .eq("recorded_by", teacher.id)
            .gte("date", fromDate);

          const recorded = scheduleData?.filter((slot: any) =>
            attendanceData?.some(a => a.section_id === slot.section_id)
          ).length || 0;

          const missed = total - recorded;
          const percent = total > 0 ? Math.round((recorded / total) * 100) : 100;

          const lastRecorded = attendanceData && attendanceData.length > 0
            ? [...attendanceData].sort((a, b) => b.date.localeCompare(a.date))[0].date
            : null;

          let status: TeacherReport["status"] = "ممتاز";
          if (percent < 60 || (missed > 0 && reportType === "day")) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";

          return {
            id: teacher.id,
            name: teacher.users?.full_name || "غير محدد",
            specialization: teacher.specialization || "غير محدد",
            recorded, missed, total, percent,
            lastRecorded, status,
            selected: true,
          };
        })
      );

      setTeachers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [reportType, todayStr, now]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id: string) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const selectAll = () => setTeachers(prev => prev.map(t => ({ ...t, selected: true })));
  const deselectAll = () => setTeachers(prev => prev.map(t => ({ ...t, selected: false })));

  const selectedTeachers = teachers.filter(t => t.selected);

  const generatePDF = async () => {
    if (selectedTeachers.length === 0) return;
    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // ترويسة
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, 297, 35, "F");

      // اسم المدرسة
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Al-Refaa Model School", 148, 13, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Teacher Attendance Monitoring Report", 148, 22, { align: "center" });

      // التاريخ والنوع
      const reportLabel = reportType === "day"
        ? `Daily Report - ${todayName} ${dateLabel}`
        : `Weekly Report - ${dateLabel}`;
      doc.text(reportLabel, 148, 30, { align: "center" });

      // ملخص سريع
      const excellent = selectedTeachers.filter(t => t.status === "ممتاز").length;
      const good = selectedTeachers.filter(t => t.status === "جيد").length;
      const warning = selectedTeachers.filter(t => t.status === "تحذير").length;
      const critical = selectedTeachers.filter(t => t.status === "حرج").length;

      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(10, 40, 277, 18, "F");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Teachers: ${selectedTeachers.length}`, 15, 50);
      doc.setTextColor(5, 150, 105); doc.text(`Excellent: ${excellent}`, 65, 50);
      doc.setTextColor(37, 99, 235); doc.text(`Good: ${good}`, 105, 50);
      doc.setTextColor(217, 119, 6); doc.text(`Warning: ${warning}`, 140, 50);
      doc.setTextColor(220, 38, 38); doc.text(`Critical: ${critical}`, 175, 50);

      // الجدول
      const tableData = selectedTeachers.map((t, idx) => [
        idx + 1,
        t.name,
        t.specialization,
        `${t.recorded}/${t.total}`,
        t.missed.toString(),
        `${t.percent}%`,
        t.lastRecorded
          ? new Date(t.lastRecorded).toLocaleDateString("en-GB")
          : "Not recorded",
        t.status,
      ]);

      autoTable(doc, {
        startY: 62,
        head: [["#", "Teacher Name", "Specialization", "Recorded", "Missed", "Rate", "Last Record", "Status"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 55, halign: "left" },
          2: { cellWidth: 40, halign: "left" },
          3: { cellWidth: 22 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 28 },
          7: { cellWidth: 25 },
        },
        didParseCell: (data: any) => {
          if (data.column.index === 7 && data.section === "body") {
            const status = data.cell.raw as string;
            if (status === "حرج") {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            } else if (status === "تحذير") {
              data.cell.styles.textColor = [217, 119, 6];
            } else if (status === "ممتاز") {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
          // تلوين صفوف الحرج
          if (data.section === "body") {
            const status = data.row.cells[7]?.raw;
            if (status === "حرج") {
              data.cell.styles.fillColor = [254, 242, 242];
            } else if (status === "تحذير") {
              data.cell.styles.fillColor = [255, 251, 235];
            }
          }
        },
      });

      // توقيع في الأسفل
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(10, finalY, 90, finalY);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Principal Signature", 50, finalY + 6, { align: "center" });

      // تاريخ الطباعة
      doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, 287, finalY + 6, { align: "right" });

      // حفظ الملف
      const fileName = `teachers-report-${reportType}-${todayStr}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
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
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">

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
          disabled={generating || selectedTeachers.length === 0}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200"
        >
          {generating ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {generating ? "جاري الإنشاء..." : `تصدير PDF (${selectedTeachers.length} معلم)`}
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
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر تسجيل</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">جاري تجميع البيانات...</p>
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

      {/* معاينة ما سيظهر في PDF */}
      {selectedTeachers.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border-2 border-dashed border-indigo-200">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-indigo-500" />
            <span className="font-black text-slate-700">معاينة التقرير</span>
            <span className="text-xs text-slate-400 font-bold">سيتضمن {selectedTeachers.length} معلم</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            {/* ترويسة المعاينة */}
            <div className="bg-slate-800 rounded-xl p-4 text-center text-white mb-4">
              <div className="font-black text-lg">مدرسة الرفعة النموذجية</div>
              <div className="text-sm text-slate-300 mt-1">
                تقرير متابعة المعلمين — {reportType === "day" ? `${todayName} ${dateLabel}` : `أسبوعي — ${dateLabel}`}
              </div>
            </div>
            {/* ملخص المعاينة */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "ممتاز", count: selectedTeachers.filter(t => t.status === "ممتاز").length, color: "emerald" },
                { label: "جيد", count: selectedTeachers.filter(t => t.status === "جيد").length, color: "blue" },
                { label: "تحذير", count: selectedTeachers.filter(t => t.status === "تحذير").length, color: "amber" },
                { label: "حرج", count: selectedTeachers.filter(t => t.status === "حرج").length, color: "red" },
              ].map(item => (
                <div key={item.label} className={`text-center p-3 rounded-xl bg-${item.color}-50`}>
                  <div className={`text-2xl font-black text-${item.color}-600`}>{item.count}</div>
                  <div className={`text-[10px] font-bold text-${item.color}-500`}>{item.label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 text-center font-bold">
              ... جدول تفصيلي لكل معلم + خانة توقيع المدير
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
