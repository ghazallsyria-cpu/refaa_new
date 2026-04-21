/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTeachersSystem } from "@/hooks/useTeachersSystem";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Users, Calendar, Clock, Search, Send, ShieldAlert, BarChart2, RefreshCw, Zap, School, Folder, Crown } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// 🚀 محرك استخراج الاسم النظيف
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

const StatCard = ({ label, count, color, icon: Icon }: any) => (
  <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 sm:gap-3 hover:shadow-md transition-all group">
    <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-${color}-50 flex items-center justify-center text-${color}-600 group-hover:scale-110 transition-transform`}><Icon className="h-5 w-5 sm:h-7 sm:w-7" /></div>
    <div><p className={`text-3xl sm:text-4xl font-black text-${color}-600`}>{count}</p><p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p></div>
  </div>
);

const MonitorRow = ({ teacher, onSendWarning, isSending }: any) => {
  const hasAlert = teacher.status === "حرج" || teacher.status === "تحذير";
  const statusColor = teacher.status === "ممتاز" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : teacher.status === "جيد" ? "bg-blue-50 text-blue-700 border-blue-100" : teacher.status === "تحذير" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`group transition-all hover:bg-slate-50/50 ${teacher.status === "حرج" ? "bg-rose-50/5" : ""} ${teacher.isHOD ? "bg-amber-50/5" : ""}`}>
      <td className="whitespace-nowrap py-3 sm:py-4 pr-6 sm:pr-8 pl-4 text-right">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl border flex items-center justify-center font-black text-base shadow-sm shrink-0 ${teacher.isHOD ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
            {teacher.isHOD ? <Crown className="w-5 h-5" /> : (teacher.name?.charAt(0) || 'م')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors truncate">{teacher.name}</span>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold truncate mt-0.5">{teacher.specialization}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 sm:py-4 text-center">
          {teacher.expected === 0 ? <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">لا حصص</span> : <div className="text-sm font-black"><span className={teacher.recorded === teacher.expected ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span><span className="text-slate-300 mx-0.5">/</span><span className="text-slate-700">{teacher.expected}</span></div>}
      </td>
      <td className="px-4 py-3 sm:py-4 text-center hidden sm:table-cell"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-600 font-black text-xs border border-slate-200">{teacher.assignmentsCount}</span></td>
      <td className="px-4 py-3 sm:py-4 text-center"><span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black border shadow-sm ${statusColor}`}>{teacher.status} {teacher.expected > 0 ? `(${teacher.percent}%)` : ''}</span></td>
      <td className="px-6 py-3 sm:py-4 text-center">
        <button onClick={() => onSendWarning(teacher.id)} disabled={isSending || !hasAlert || teacher.expected === 0} className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all ${!hasAlert || teacher.expected === 0 ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200"}`}>
          {isSending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 h-3" />} تنبيه
        </button>
      </td>
    </motion.tr>
  );
};

export default function TeachersMonitorPage() {
  const { sendTeacherWarning, fetchTeachersMonitorData } = useTeachersSystem();
  const [localTeachers, setLocalTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "middle" | "high">("all");
  const [sendingWarning, setSendingWarning] = useState<string | null>(null);

  const schoolTime = useMemo(() => { const d = new Date(); const utc = d.getTime() + (d.getTimezoneOffset() * 60000); return new Date(utc + (3 * 3600000)); }, []);
  const todayStr = useMemo(() => schoolTime.toISOString().split('T')[0], [schoolTime]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const weekAgo = new Date(schoolTime); weekAgo.setDate(weekAgo.getDate() - 7);
      const currentDbDay = schoolTime.getDay() === 0 ? 1 : schoolTime.getDay() + 1;
      const rawData = await fetchTeachersMonitorData(todayStr, currentDbDay, weekAgo.toISOString());
      
      const { data: periods } = await supabase.from('class_periods').select('*');
      const pMap: any = {}; periods?.forEach(p => pMap[p.period_number] = p.end_time);

      const processed = rawData.teachersData.map((t: any) => {
        const schs = rawData.allSchedules.filter((s:any) => s.teacher_id === t.id);
        const atts = rawData.allAttendance.filter((a:any) => a.teacher_id === t.id);
        let exp = 0, rec = 0, mis = 0;
        
        schs.forEach((sch:any) => {
          const end = pMap[sch.period];
          if (end) {
            const [h, m] = end.split(':').map(Number);
            const pEnd = new Date(schoolTime); pEnd.setHours(h, m, 0, 0);
            if (schoolTime > pEnd) { exp++; if (atts.some((a:any) => a.section_id === sch.section_id && a.period_number === sch.period)) rec++; else mis++; }
          }
        });
        
        const pct = exp > 0 ? Math.round((rec / exp) * 100) : 100;
        const status = mis > 0 ? "حرج" : pct < 90 ? "تحذير" : pct < 100 ? "جيد" : "ممتاز";
        
        const deptObj = Array.isArray(t.academic_departments) ? t.academic_departments[0] : t.academic_departments;

        return { 
          id: t.id, 
          name: getTeacherName(t), 
          specialization: t.specialization || "عام", 
          department: deptObj?.name || "عام", 
          isHOD: deptObj?.head_id === t.id, 
          recorded: rec, expected: exp, missed: mis, percent: pct, status, 
          assignmentsCount: rawData.allAssignments.filter((a:any) => a.teacher_id === t.id).length, 
          examsCount: rawData.allExams.filter((e:any) => e.teacher_id === t.id).length, 
          stage: getTeacherStage(t) 
        };
      });
      setLocalTeachers(processed);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [todayStr, schoolTime, fetchTeachersMonitorData]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const groupedData = useMemo(() => {
    return localTeachers
      .filter(t => (t.name || "").toLowerCase().includes(search.toLowerCase()) && (stageFilter === 'all' || t.stage === stageFilter || t.stage === 'both'))
      .reduce((acc: any, t: any) => { 
        if (!acc[t.department]) acc[t.department] = []; 
        acc[t.department].push(t); 
        return acc; 
      }, {});
  }, [localTeachers, search, stageFilter]);

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 font-cairo" dir="rtl">
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-right">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold backdrop-blur-sm"><Zap className="w-4 h-4 text-yellow-400" /> البث الحي</div>
            <h1 className="text-3xl sm:text-5xl font-black">رادار المعلمين</h1>
            <p className="text-indigo-100 font-bold opacity-80 flex items-center gap-2"><Calendar className="w-5 h-5" /> {format(schoolTime, 'eeee، d MMMM yyyy', { locale: arSA })}</p>
          </div>
          <div className="flex gap-3"><Link href="/admin/teachers-report" className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-50 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> التقارير</Link><button onClick={refreshData} className="bg-indigo-500 text-white p-3 rounded-2xl hover:bg-indigo-400 shadow-lg"><RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} /></button></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="ممتاز" count={localTeachers.filter(t => t.status === "ممتاز").length} color="emerald" icon={CheckCircle2} />
        <StatCard label="جيد" count={localTeachers.filter(t => t.status === "جيد").length} color="blue" icon={Users} />
        <StatCard label="تحذير" count={localTeachers.filter(t => t.status === "تحذير").length} color="amber" icon={AlertTriangle} />
        <StatCard label="حرج" count={localTeachers.filter(t => t.status === "حرج").length} color="rose" icon={ShieldAlert} />
      </div>
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between items-center text-right">
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          {['all', 'middle', 'high'].map((s) => <button key={s} onClick={() => setStageFilter(s as any)} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${stageFilter === s ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>{s === 'all' ? 'الكل' : s === 'middle' ? 'متوسط' : 'ثانوي'}</button>)}
        </div>
        <div className="relative w-full md:w-80 group"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="بحث باسم المعلم..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-3.5 pr-12 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
      </div>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-right">
            <thead className="bg-slate-50/50"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="py-5 pr-8 pl-4">المعلم</th><th className="px-4 py-5 text-center">الرصد</th><th className="px-4 py-5 text-center hidden sm:table-cell">الواجبات</th><th className="px-4 py-5 text-center">الحالة</th><th className="py-5 pl-8 pr-4 text-center">إجراء</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {Object.entries(groupedData).map(([dept, teachers]: any) => (
                <React.Fragment key={dept}>
                  <tr className="bg-slate-100/30 border-y border-slate-200/50"><td colSpan={5} className="py-3 px-8 text-sm font-black text-indigo-900 flex items-center gap-2 text-right"><Folder className="w-4 h-4" /> قسم {dept}</td></tr>
                  {teachers.map((t: any) => <MonitorRow key={t.id} teacher={t} onSendWarning={async (id:string) => { setSendingWarning(id); await sendTeacherWarning(id); setSendingWarning(null); alert("تم التنبيه ✅"); }} isSending={sendingWarning === t.id} />)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
