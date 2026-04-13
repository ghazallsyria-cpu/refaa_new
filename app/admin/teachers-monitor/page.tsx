"use client";

import { useState, useEffect, useCallback } from "react";
import { useUsersSystem } from "@/hooks/useUsersSystem";
import { useTeachersSystem } from "@/hooks/useTeachersSystem";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, Users, Calendar, Clock, Search, Send, ShieldAlert, BarChart2, RefreshCw, Zap, Info
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 

interface TeacherMonitor {
  id: string;
  name: string;
  specialization: string;
  recorded: number;
  missed: number;
  expected: number;
  scheduled: number;
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

const SYSTEM_START_DATE = new Date('2026-03-01T00:00:00');

const getSchoolTime = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3 * 3600000));
};

export default function TeachersMonitorPage() {
  const { teachers: allTeachers, fetchTeachers, loading: usersLoading } = useUsersSystem();
  const { sendTeacherWarning } = useTeachersSystem();
  
  const [localTeachers, setLocalTeachers] = useState<TeacherMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingWarning, setSendingWarning] = useState<string | null>(null);

  const [todayStr, setTodayStr] = useState("");
  const [todayName, setTodayName] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    fetchTeachers();
    const st = getSchoolTime();
    setTodayStr(st.toISOString().split("T")[0]);
    setTodayName(DAY_MAP[st.getDay()]);
    setDateLabel(`${st.getDate()} ${MONTH_MAP[st.getMonth()]} ${st.getFullYear()}`);
    setIsWeekend(st.getDay() === 5 || st.getDay() === 6);
  }, [fetchTeachers]);

  const fetchData = useCallback(async () => {
    if (!todayStr || allTeachers.length === 0) return;
    setLoading(true);
    try {
      const now = getSchoolTime();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const currentDbDay = now.getDay() + 1; // الأحد = 1، الاثنين = 2...

      const [
        { data: schedulesDB },
        { data: dbPeriods },
        { data: attendanceDB },
        { data: assignmentsDB },
        { data: examsDB }
      ] = await Promise.all([
        // 🚀 التحسين السحري: جلب جدول اليوم الحالي فقط بدلاً من جدول الأسبوع بأكمله لجميع المعلمين
        supabase.from('schedules').select('teacher_id, section_id, day_of_week, period').eq('day_of_week', currentDbDay),
        supabase.from('class_periods').select('period_number, end_time'),
        supabase.from('attendance_records').select('section_id, date, period, created_at').eq('date', todayStr),
        supabase.from('assignments').select('teacher_id').gte('created_at', weekAgoStr),
        supabase.from('exams').select('teacher_id').gte('created_at', weekAgoStr)
      ]);

      const periodsMap: Record<string, string> = {};
      dbPeriods?.forEach(p => { periodsMap[String(p.period_number)] = p.end_time; });

      const isSystemActive = now >= SYSTEM_START_DATE;
      const safeAttendance = (attendanceDB || []) as any[];
      const safeSchedules = (schedulesDB || []) as any[];

      const results: TeacherMonitor[] = allTeachers.map((teacher: any) => {
        const daySchedules = safeSchedules.filter(s => String(s.teacher_id) === String(teacher.id));
        const scheduledTotal = daySchedules.length;

        let expectedTotal = 0;
        let actualRecorded = 0;
        let actualMissed = 0;
        let lastRecorded: string | null = null;

        daySchedules.forEach(sch => {
          let isPassed = false;
          const endTimeStr = periodsMap[String(sch.period)];
          
          if (endTimeStr) {
            const [h, m] = endTimeStr.split(':').map(Number);
            const pTime = new Date(now);
            pTime.setHours(h, m, 0, 0);
            if (now > pTime) isPassed = true;
          }

          if (isPassed && isSystemActive) {
            expectedTotal++;
            const hasRecord = safeAttendance.find((a: any) => 
              String(a.section_id) === String(sch.section_id) && 
              String(a.period) === String(sch.period)
            );
            
            if (hasRecord) {
              actualRecorded++;
              const recTime = hasRecord.created_at || hasRecord.date;
              if (!lastRecorded || recTime > lastRecorded) lastRecorded = recTime;
            } else {
              actualMissed++;
            }
          }
        });

        let percent = expectedTotal > 0 ? Math.round((actualRecorded / expectedTotal) * 100) : 100;
        if (!isSystemActive) percent = 100;

        let status: "ممتاز" | "جيد" | "تحذير" | "حرج" = "ممتاز";
        let notes = "";

        if (!isSystemActive) {
          notes = "النظام في وضع الترقب";
        } else if (scheduledTotal === 0) {
          notes = "لا حصص مجدولة";
        } else {
          if (percent < 60 || actualMissed > 0) status = "حرج";
          else if (percent < 85) status = "تحذير";
          else if (percent < 95) status = "جيد";
        }

        const assignmentsCount = assignmentsDB?.filter((a: any) => String(a.teacher_id) === String(teacher.id)).length || 0;
        const examsCount = examsDB?.filter((e: any) => String(e.teacher_id) === String(teacher.id)).length || 0;

        const teacherName = teacher.users 
          ? (Array.isArray(teacher.users) ? teacher.users[0]?.full_name : teacher.users.full_name)
          : teacher.full_name || "غير محدد";

        return {
          id: teacher.id,
          name: teacherName,
          specialization: teacher.specialization || "عام",
          recorded: actualRecorded,
          missed: actualMissed,
          expected: expectedTotal,
          scheduled: scheduledTotal,
          percent,
          lastRecorded,
          status,
          notes,
          assignmentsCount,
          examsCount,
        };
      });

      results.sort((a, b) => {
        const statusOrder = { "حرج": 1, "تحذير": 2, "جيد": 3, "ممتاز": 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setLocalTeachers(results);
    } catch (e) {
      console.error("Monitor Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [todayStr, allTeachers]);

  useEffect(() => {
    if (todayStr && allTeachers.length > 0) fetchData();
  }, [fetchData, todayStr, allTeachers]);

  const sendWarning = async (teacherId: string) => {
    setSendingWarning(teacherId);
    try {
      await sendTeacherWarning(teacherId);
      alert("تم إرسال التنبيه بنجاح عبر النظام");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال التنبيه");
    } finally {
      setSendingWarning(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === "ممتاز") return "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50";
    if (status === "جيد") return "bg-blue-50 text-blue-700 border-blue-100 shadow-blue-50";
    if (status === "تحذير") return "bg-amber-50 text-amber-700 border-amber-100 shadow-amber-50";
    return "bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100 animate-pulse";
  };

  const filtered = localTeachers.filter(t => t.name.includes(search) || t.specialization.includes(search));

  const isDataLoading = loading || usersLoading;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 p-6 sm:p-12 text-white shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>غرفة التحكم الإدارية</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
              مراقبة أداء المعلمين
            </h1>
            <p className="text-indigo-100 text-xs sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed flex items-center gap-2">
              <Calendar className="w-4 h-4" /> اليوم: {todayName}، {dateLabel}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link href="/admin/teachers-report" className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 sm:py-4 rounded-[1.5rem] bg-white text-indigo-600 hover:bg-indigo-50 text-sm sm:text-base font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
              <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" /> التقارير الشاملة
            </Link>
            <button onClick={fetchData} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white text-sm sm:text-base font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      </div>

      {isWeekend && !isDataLoading && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex items-center gap-3 text-sky-800 shadow-sm">
          <Info className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">
            هذه الصفحة مخصصة لمراقبة &quot;اليوم الحالي&quot; لحظة بلحظة، وحيث أن اليوم عطلة رسمية، فلن تظهر جداول هنا. يمكنك الانتقال إلى <strong>التقارير الشاملة</strong> للاطلاع على الأسبوع الماضي.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "انضباط ممتاز", count: localTeachers.filter(t => t.status === "ممتاز").length, color: "emerald", icon: CheckCircle2 },
          { label: "أداء جيد", count: localTeachers.filter(t => t.status === "جيد").length, color: "blue", icon: Users },
          { label: "يستدعي التحذير", count: localTeachers.filter(t => t.status === "تحذير").length, color: "amber", icon: AlertTriangle },
          { label: "وضع حرج (تأخير)", count: localTeachers.filter(t => t.status === "حرج").length, color: "rose", icon: ShieldAlert },
        ].map(item => (
          <div key={item.label} className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 sm:gap-3 hover:shadow-md transition-all group">
            <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 group-hover:scale-110 transition-transform`}>
              <item.icon className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <p className={`text-3xl sm:text-4xl font-black text-${item.color}-600`}>{item.count}</p>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">حالة الرصد اليومية</h3>
              <p className="text-[10px] sm:text-xs lg:text-sm text-slate-500 font-bold mt-1">يتم تحديث البيانات بناءً على توقيت &quot;الآن&quot; في الحرم المدرسي</p>
            </div>
          </div>
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input type="text" placeholder="البحث عن معلم..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-[1.5rem] bg-white border border-slate-200 py-3.5 pr-12 pl-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/30">
              <tr>
                <th className="py-4 sm:py-5 pr-6 sm:pr-8 pl-4 text-right text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم</th>
                <th className="px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">الرصد / المطالب به</th>
                <th className="px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">واجبات (أسبوع)</th>
                <th className="px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">اختبارات (أسبوع)</th>
                <th className="px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">مؤشر الأداء</th>
                <th className="px-6 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">إجراء استباقي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isDataLoading ? (
                <tr><td colSpan={6} className="py-20 text-center"><div className="flex flex-col items-center gap-4"><div className="h-10 w-10 sm:h-12 sm:w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" /><p className="text-slate-400 font-bold text-sm sm:text-base">جاري معالجة البيانات السحابية...</p></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center"><div className="flex flex-col items-center gap-4"><div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 mx-auto text-slate-300"><Search className="h-6 w-6 sm:h-8 sm:w-8" /></div><p className="text-slate-400 font-bold text-sm sm:text-lg">لا توجد نتائج مطابقة</p></div></td></tr>
              ) : (
                filtered.map((teacher, idx) => {
                  const hasAlert = teacher.status === "حرج" || teacher.status === "تحذير";
                  return (
                    <motion.tr
                      key={teacher.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`group transition-all hover:bg-slate-50/50 ${teacher.status === "حرج" ? "bg-rose-50/10" : ""}`}
                    >
                      <td className="whitespace-nowrap py-3 sm:py-4 pr-6 sm:pr-8 pl-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-base sm:text-lg shadow-sm shrink-0">
                            {teacher.name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-900 tracking-tight text-xs sm:text-sm group-hover:text-indigo-600 transition-colors truncate">{teacher.name}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold truncate">{teacher.specialization}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center">
                        {teacher.scheduled === 0 ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">لا حصص مجدولة اليوم</span>
                        ) : teacher.expected === 0 ? (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">لم يحن وقتها</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1 text-sm sm:text-base font-black">
                              <span className={teacher.recorded === teacher.expected ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-slate-700">{teacher.expected}</span>
                            </div>
                            {teacher.missed > 0 && (
                              <span className="text-[8px] sm:text-[9px] font-bold text-rose-500 mt-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" /> تأخر عن {teacher.missed}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center hidden sm:table-cell">
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 text-slate-600 font-black text-xs sm:text-sm border border-slate-200">
                          {teacher.assignmentsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center hidden md:table-cell">
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 text-slate-600 font-black text-xs sm:text-sm border border-slate-200">
                          {teacher.examsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:py-4 text-center">
                        <span className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black border shadow-sm ${statusColor(teacher.status)}`}>
                          {teacher.status} {teacher.expected > 0 ? `(${teacher.percent}%)` : ''}
                        </span>
                        {teacher.lastRecorded && (
                          <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 mt-1 flex items-center justify-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> آخر رصد: {new Date(teacher.lastRecorded).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 sm:py-4 text-center">
                        <button
                          onClick={() => sendWarning(teacher.id)}
                          disabled={sendingWarning === teacher.id || !hasAlert || teacher.expected === 0}
                          className={`inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all active:scale-95 ${
                            !hasAlert || teacher.expected === 0
                              ? "bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed"
                              : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 shadow-sm"
                          }`}
                        >
                          {sendingWarning === teacher.id ? (
                            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          تنبيه آلي
                        </button>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
