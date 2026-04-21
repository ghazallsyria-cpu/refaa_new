/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUsersSystem } from "@/hooks/useUsersSystem";
import { motion } from "framer-motion";
import { 
  FileText, Download, Calendar, Search, ShieldCheck, 
  Filter, School, Crown, Folder, CheckCircle2, RefreshCw
} from "lucide-react";
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
  percent: number;
  status: "ممتاز" | "جيد" | "تحذير" | "حرج";
  selected: boolean;
}

const DAY_MAP: Record<number, string> = { 0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };

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

// 🧠 محرك استنتاج المرحلة الدراسية
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

const ReportRow = ({ teacher, toggleSelect }: { teacher: TeacherReport, toggleSelect: (id: string) => void }) => {
  const statusColor = teacher.status === "ممتاز" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : teacher.status === "جيد" ? "bg-blue-50 text-blue-700 border-blue-100" : teacher.status === "تحذير" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => toggleSelect(teacher.id)} className={`cursor-pointer transition-all hover:bg-slate-50/80 ${teacher.selected ? "" : "opacity-50 grayscale"} ${teacher.isHOD ? "bg-amber-50/10" : ""}`}>
      <td className="py-4 pr-6 pl-4 text-center"><div className={`h-5 w-5 rounded-lg border-2 mx-auto flex items-center justify-center transition-all ${teacher.selected ? "bg-indigo-600 border-indigo-600 shadow-md" : "border-slate-300 bg-white"}`}>{teacher.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</div></td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border ${teacher.isHOD ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{teacher.isHOD ? <Crown className="w-5 h-5" /> : (teacher.name?.charAt(0) || 'م')}</div>
          <div><div className="font-black text-slate-900 text-sm">{teacher.name}</div><div className="text-[10px] font-bold text-slate-500 mt-0.5">{teacher.isHOD ? <span className="text-amber-600">رئيس القسم</span> : teacher.specialization}</div></div>
        </div>
      </td>
      <td className="px-4 py-4 text-center"><div className="text-sm font-black"><span className={teacher.recorded === teacher.expected ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span><span className="text-slate-300 mx-1">/</span><span className="text-slate-700">{teacher.expected}</span></div></td>
      <td className="px-4 py-4 text-center"><div className={`text-sm font-black ${teacher.percent >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{teacher.percent}%</div></td>
      <td className="px-4 py-4 text-center hidden md:table-cell"><span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusColor}`}>{teacher.status}</span></td>
    </motion.tr>
  );
};

export default function TeachersReportPage() {
  const { teachers: allTeachers, fetchTeachers, loading: usersLoading } = useUsersSystem();
  const [localTeachers, setLocalTeachers] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState<"day" | "week" | "custom">("day");
  const [stageFilter, setStageFilter] = useState<"all" | "middle" | "high">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const schoolTime = useMemo(() => getSchoolTime(), []);
  const todayStr = useMemo(() => getLocalDateString(schoolTime), [schoolTime]);
  const todayName = useMemo(() => DAY_MAP[schoolTime.getDay()], [schoolTime]);

  const fetchData = useCallback(async () => {
    if (allTeachers.length === 0) return;
    setLoading(true);
    try {
      let qStart = todayStr, qEnd = todayStr;
      let datesToProcess: string[] = [todayStr];

      if (reportType === "week") { 
        const w = new Date(schoolTime); w.setDate(w.getDate() - 7); 
        qStart = getLocalDateString(w);
        datesToProcess = getDatesBetween(w, new Date(qEnd));
      } else if (reportType === "custom") { 
        qStart = startDate; qEnd = endDate; 
        datesToProcess = getDatesBetween(new Date(startDate), new Date(endDate));
      }

      const [
        { data: schedules }, 
        { data: attendance }, 
        { data: departments }
      ] = await Promise.all([
        supabase.from('schedules').select('*'), 
        supabase.from('attendance_records').select('*').gte('date', qStart).lte('date', qEnd), 
        supabase.from('academic_departments').select('*')
      ]);

      const res: TeacherReport[] = allTeachers.map((t: any) => {
        const mySch = (schedules || []).filter(s => s.teacher_id === t.id);
        const myAtt = (attendance || []).filter(a => a.teacher_id === t.id);
        
        let expected = 0;
        datesToProcess.forEach(dStr => {
          const dDay = getDbDay(new Date(dStr).getDay());
          if (dDay >= 1 && dDay <= 5) {
             expected += mySch.filter(s => String(s.day_of_week) === String(dDay)).length;
          }
        });
        
        const rec = myAtt.length;
        const pct = expected > 0 ? Math.round((rec / expected) * 100) : 100;
        const status = pct < 70 ? "حرج" : pct < 85 ? "تحذير" : pct < 95 ? "جيد" : "ممتاز";
        
        return { 
          id: t.id, 
          name: (Array.isArray(t.users) ? t.users[0]?.full_name : t.users?.full_name) || "معلم", 
          specialization: t.specialization, 
          department_name: departments?.find(d => d.id === t.department_id)?.name || "عام", 
          isHOD: departments?.some(d => d.head_id === t.id) || false, 
          recorded: rec, 
          expected: expected, 
          percent: pct, 
          status, 
          selected: true, 
          stage: getTeacherStage(t),
          missed: expected - rec,
          lastRecorded: null,
          department: departments?.find(d => d.id === t.department_id)?.name || "عام"
        };
      });
      setLocalTeachers(res);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [allTeachers, reportType, startDate, endDate, todayStr, schoolTime]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const groupedTeachers = useMemo(() => {
    return localTeachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && (stageFilter === 'all' || t.stage === stageFilter)).reduce((acc: any, t: any) => { if (!acc[t.department_name]) acc[t.department_name] = []; acc[t.department_name].push(t); return acc; }, {});
  }, [localTeachers, search, stageFilter]);

  if (usersLoading || loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 font-cairo" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: A4; margin: 1cm; } body { background: white !important; } .no-print { display: none !important; } table { width: 100% !important; border-collapse: collapse !important; } th, td { border: 1px solid #000 !important; padding: 8px !important; text-align: center !important; font-size: 12px !important; } }`}} />
      
      <div className="no-print relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl text-right">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold backdrop-blur-sm"><FileText className="w-4 h-4" /> التقارير الرسمية</div>
            <h1 className="text-3xl sm:text-5xl font-black">تقرير الإنتاجية</h1>
            <p className="text-indigo-100 font-bold opacity-80">{format(schoolTime, 'dd MMMM yyyy', { locale: arSA })}</p>
          </div>
          <button onClick={() => window.print()} className="bg-white text-indigo-600 px-8 py-4 rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-3"><Download className="w-5 h-5" /> طباعة التقرير</button>
        </div>
      </div>

      <div className="no-print bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 text-right">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
             <button onClick={() => setStageFilter('all')} className={`flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all ${stageFilter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>الكل</button>
             <button onClick={() => setStageFilter('middle')} className={`flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all ${stageFilter === 'middle' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>متوسط</button>
             <button onClick={() => setStageFilter('high')} className={`flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all ${stageFilter === 'high' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>ثانوي</button>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
            {['day', 'week', 'custom'].map((t:any) => <button key={t} onClick={() => setReportType(t)} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>{t === 'day' ? `يومي (${todayName})` : t === 'week' ? 'أسبوعي' : 'مخصص'}</button>)}
          </div>
          <div className="relative w-full lg:w-80 group"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-3 pr-12 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
        </div>
        {reportType === 'custom' && <div className="flex gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border rounded-xl px-4 py-2 text-sm font-bold" /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border rounded-xl px-4 py-2 text-sm font-bold" /><button onClick={fetchData} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black"><Filter className="w-4 h-4 inline ml-2"/>تطبيق</button></div>}
      </div>

      <div className="no-print bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-right">
          <thead className="bg-slate-50/50"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="py-5 pr-8 pl-4 w-16">تحديد</th><th className="px-4 py-5 text-right">المعلم / المنصب</th><th className="px-4 py-5 text-center">الإنجاز (رصد/مطلوب)</th><th className="px-4 py-5 text-center">المؤشر</th><th className="px-4 py-5 text-center hidden md:table-cell">الحالة</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {Object.entries(groupedTeachers).map(([dept, teachers]: any) => (
              <React.Fragment key={dept}>
                <tr className="bg-slate-100/30 text-right"><td colSpan={5} className="py-3 px-8 text-sm font-black text-indigo-900 flex items-center gap-2"><Folder className="w-4 h-4" /> قسم {dept}</td></tr>
                {teachers.map((t: any) => <ReportRow key={t.id} teacher={t} toggleSelect={(id:string) => setLocalTeachers(prev => prev.map(lt => lt.id === id ? { ...lt, selected: !lt.selected } : lt))} />)}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🖨️ نسخة الطباعة الرسمية */}
      <div className="hidden print:block font-cairo text-right" dir="rtl">
        <div className="text-center mb-10 border-b-4 border-slate-900 pb-6"><h1 className="text-3xl font-black">مدرسة الرفعة النموذجية</h1><h2 className="text-xl font-bold">تقرير متابعة رصد الحضور</h2><p className="mt-4 font-bold">{format(schoolTime, 'dd/MM/yyyy')} | {reportType === 'day' ? 'يومي' : 'أسبوعي'}</p></div>
        <table><thead><tr><th>المعلم</th><th>القسم</th><th>المطلوب</th><th>المنجز</th><th>النسبة</th></tr></thead><tbody>{localTeachers.filter(t => t.selected).map(t => <tr key={t.id}><td>{t.name} {t.isHOD ? "(رئيس قسم)" : ""}</td><td>{t.department_name}</td><td>{t.expected}</td><td>{t.recorded}</td><td>{t.percent}%</td></tr>)}</tbody></table>
        <div className="mt-16 flex justify-between px-10"><div className="text-center"><p className="font-black mb-10">ختم المدرسة</p><div className="w-32 h-32 border-2 border-dashed border-slate-300 mx-auto"></div></div><div className="text-center"><p className="font-black mb-10">توقيع المدير</p><div className="w-48 border-t-2 border-black mx-auto"></div></div></div>
      </div>
    </div>
  );
}
