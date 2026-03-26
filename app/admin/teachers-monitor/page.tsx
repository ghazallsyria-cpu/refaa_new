"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "motion/react";
import {
  CheckCircle2, AlertTriangle, Users, Calendar, Clock, Search, Send
} from "lucide-react";
import Link from "next/link";

interface TeacherMonitor {
  id: string;
  name: string;
  specialization: string;
  recorded: number;
  missed: number;
  total: number;
  percent: number;
  lastRecorded: string | null;
  status: "ممتاز" | "جيد" | "تحذير" | "حرج";
  assignmentsCount: number;
  examsCount: number;
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

export default function TeachersMonitorPage() {
  const [teachers, setTeachers] = useState<TeacherMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingWarning, setSendingWarning] = useState<string | null>(null);

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

      const jsDay = now.getDay();
      const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                    jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

      const { data: teachersData } = await supabase
        .from("teachers")
        .select("id, specialization, users(full_name)");

      if (!teachersData) return;

      const results: TeacherMonitor[] = await Promise.all(
        teachersData.map(async (teacher: any) => {
          // جدول المعلم لليوم
          const { data: scheduleData } = await supabase
            .from("schedules")
            .select("section_id, day_of_week")
            .eq("teacher_id", teacher.id)
            .eq("day_of_week", dbDay);

          const total = scheduleData?.length || 0;

          // سجلات الحضور لليوم
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("date, section_id")
            .eq("recorded_by", teacher.id)
            .eq("date", todayStr);

          const recorded = scheduleData?.filter((slot: any) =>
            attendanceData?.some(a => a.section_id === slot.section_id)
          ).length || 0;

          const missed = total - recorded;
          const percent = total > 0 ? Math.round((recorded / total) * 100) : 100;

          const lastRecorded = attendanceData && attendanceData.length > 0
            ? [...attendanceData].sort((a, b) => b.date.localeCompare(a.date))[0].date
            : null;

          let status: TeacherMonitor["status"] = "ممتاز";
          if (percent < 60 || missed > 0) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";

          // الواجبات هذا الأسبوع
          const { count: assignmentsCount } = await supabase
            .from("assignments")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", teacher.id)
            .gte("created_at", weekAgoStr);

          // الاختبارات هذا الأسبوع
          const { count: examsCount } = await supabase
            .from("exams")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", teacher.id)
            .gte("created_at", weekAgoStr);

          return {
            id: teacher.id,
            name: teacher.users?.full_name || "غير محدد",
            specialization: teacher.specialization || "غير محدد",
            recorded, missed, total, percent,
            lastRecorded, status,
            assignmentsCount: assignmentsCount || 0,
            examsCount: examsCount || 0,
          };
        })
      );

      setTeachers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [todayStr, now]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendWarning = async (teacherId: string) => {
    setSendingWarning(teacherId);
    try {
      await supabase.from("notifications").insert({
        user_id: teacherId,
        title: "تنبيه إداري",
        message: "يرجى استكمال تسجيل الحضور والغياب للحصص الموكلة إليك اليوم.",
        type: "system",
        read: false
      });
      alert("تم إرسال التنبيه بنجاح");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال التنبيه");
    } finally {
      setSendingWarning(null);
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
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">لوحة المراقبة</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">مراقبة أداء المعلمين</h1>
          <p className="text-slate-500 mt-1 font-medium">
            متابعة حية لتسجيل الحضور والغياب والنشاط الأكاديمي اليوم — {todayName} {dateLabel}
          </p>
        </div>

        <Link
          href="/admin/teachers-report"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-indigo-600 border border-indigo-100 font-black text-sm hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-100/50"
        >
          <Calendar className="h-5 w-5" />
          توليد تقرير PDF
        </Link>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "ممتاز", count: teachers.filter(t => t.status === "ممتاز").length, color: "emerald" },
          { label: "جيد", count: teachers.filter(t => t.status === "جيد").length, color: "blue" },
          { label: "تحذير", count: teachers.filter(t => t.status === "تحذير").length, color: "amber" },
          { label: "حرج", count: teachers.filter(t => t.status === "حرج").length, color: "red" },
        ].map(item => (
          <div key={item.label} className={`glass-card p-6 rounded-3xl border-b-4 border-${item.color}-500 flex flex-col items-center justify-center`}>
            <div className={`text-4xl font-black text-${item.color}-600 mb-1`}>{item.count}</div>
            <div className={`text-sm font-bold text-${item.color}-700`}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* قائمة المعلمين */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <span className="font-black text-slate-700">حالة التسجيل اليومية</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث عن معلم..."
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
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحضور (اليوم)</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الواجبات (أسبوع)</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الاختبارات (أسبوع)</th>
                <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">جاري تحميل بيانات المراقبة...</p>
                </td></tr>
              ) : filtered.map((teacher, idx) => (
                <motion.tr
                  key={teacher.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`transition-all hover:bg-slate-50/80 ${teacher.status === "حرج" ? "bg-red-50/20" : ""}`}
                >
                  {/* المعلم */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
                        <div className="text-[10px] text-slate-400">{teacher.specialization}</div>
                      </div>
                    </div>
                  </td>

                  {/* الحضور */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-black text-emerald-600">{teacher.recorded}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-lg font-black text-slate-700">{teacher.total}</span>
                    </div>
                    {teacher.missed > 0 && (
                      <div className="text-[10px] font-bold text-red-500 mt-1">
                        متأخر عن {teacher.missed} حصص
                      </div>
                    )}
                  </td>

                  {/* الواجبات */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                      {teacher.assignmentsCount}
                    </span>
                  </td>

                  {/* الاختبارات */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                      {teacher.examsCount}
                    </span>
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusColor(teacher.status)}`}>
                      {teacher.status}
                    </span>
                  </td>

                  {/* إجراء */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => sendWarning(teacher.id)}
                      disabled={sendingWarning === teacher.id || teacher.status === "ممتاز"}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        teacher.status === "ممتاز"
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                      }`}
                    >
                      {sendingWarning === teacher.id ? (
                        <div className="h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      إرسال تنبيه
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
