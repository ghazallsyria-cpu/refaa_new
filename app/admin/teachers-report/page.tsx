/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUsersSystem } from "@/hooks/useUsersSystem";
import { useTeachersSystem } from "@/hooks/useTeachersSystem";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Download, Calendar, Clock, Search, ShieldCheck, 
  Zap, Filter, School, Crown, Folder, CheckCircle2, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ============================================================================
// 🧩 1. المكونات الفرعية المعزولة (لتحسين الأداء)
// ============================================================================

const ReportRow = ({ teacher, toggleSelect }: any) => {
  const statusColor = (status: string) => {
    if (status === "ممتاز") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "جيد") return "bg-blue-50 text-blue-700 border-blue-100";
    if (status === "تحذير") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-rose-50 text-rose-700 border-rose-100";
  };

  return (
    <motion.tr 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={() => toggleSelect(teacher.id)}
      className={`cursor-pointer transition-all hover:bg-slate-50/80 ${teacher.selected ? "" : "opacity-50 grayscale"} ${teacher.isHOD ? "bg-amber-50/10" : ""}`}
    >
      <td className="py-4 pr-6 pl-4 text-center">
        <div className={`h-5 w-5 rounded-lg border-2 mx-auto flex items-center justify-center transition-all ${teacher.selected ? "bg-indigo-600 border-indigo-600 shadow-md" : "border-slate-300 bg-white"}`}>
          {teacher.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border ${teacher.isHOD ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
            {teacher.isHOD ? <Crown className="w-5 h-5" /> : (teacher.name?.charAt(0) || 'م')}
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm">{teacher.name}</div>
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              {teacher.isHOD ? <span className="text-amber-600">رئيس القسم</span> : teacher.specialization}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="text-sm font-black">
          <span className={teacher.recorded === teacher.expected ? "text-emerald-600" : "text-amber-600"}>{teacher.recorded}</span>
          <span className="text-slate-300 mx-1">/</span>
          <span className="text-slate-700">{teacher.expected}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className={`text-sm font-black ${teacher.percent >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{teacher.percent}%</div>
      </td>
      <td className="px-4 py-4 text-center hidden md:table-cell">
        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black border ${statusColor(teacher.status)}`}>{teacher.status}</span>
      </td>
    </motion.tr>
  );
};

// ============================================================================
// 🚀 2. المكون الرئيسي للصفحة
// ============================================================================

export default function TeachersReportPage() {
  const { teachers: allTeachers, fetchTeachers, loading: usersLoading } = useUsersSystem();
  const [localTeachers, setLocalTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reportType, setReportType] = useState<"day" | "week" | "custom">("day");
  const [stageFilter, setStageFilter] = useState<"all" | "middle" | "high">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const schoolTime = useMemo(() => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3 * 3600000));
  }, []);

  const todayStr = useMemo(() => schoolTime.toISOString().split('T')[0], [schoolTime]);

  // ⚡ جلب البيانات وتجميع التقرير
  const fetchData = useCallback(async () => {
    if (allTeachers.length === 0) return;
    setLoading(true);
    try {
      const now = schoolTime;
      let qStart = todayStr;
      let qEnd = todayStr;

      if (reportType === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        qStart = weekAgo.toISOString().split('T')[0];
      } else if (reportType === "custom") {
        qStart = startDate; qEnd = endDate;
      }

      // 🚀 جلب البيانات الموازية (Constitution Rule #1)
      const [
        { data: schedules },
        { data: attendance },
        { data: departments }
      ] = await Promise.all([
        supabase.from('schedules').select('*'),
        supabase.from('attendance_records').select('*').gte('date', qStart).lte('date', qEnd),
        supabase.from('academic_departments').select('*')
      ]);

      const processed = allTeachers.map((teacher: any) => {
        const mySchedules = (schedules || []).filter(s => s.teacher_id === teacher.id);
        const myAttendance = (attendance || []).filter(a => a.teacher_id === teacher.id);
        
        let expected = 0;
        let recorded = 0;
        
        // حساب المتوقع (تبسيط للمنطق البرمجي)
        expected = mySchedules.length * (reportType === 'day' ? 1 : 5);
        recorded = myAttendance.length;

        const percent = expected > 0 ? Math.round((recorded / expected) * 100) : 100;
        let status = "ممتاز";
        if (percent < 70) status = "حرج";
        else if (percent < 85) status = "تحذير";
        else if (percent < 95) status = "جيد";

        return {
          id: teacher.id,
          name: (Array.isArray(teacher.users) ? teacher.users[0]?.full_name : teacher.users?.full_name) || "معلم",
          specialization: teacher.specialization,
          department_id: teacher.department_id,
          department_name: departments?.find(d => d.id === teacher.department_id)?.name || "غير محدد",
          isHOD: departments?.some(d => d.head_id === teacher.id),
          recorded,
          expected,
          percent,
          status,
          selected: true,
          stage: teacher.teacher_sections?.[0]?.sections?.classes?.name?.includes('عاشر') ? 'high' : 'middle'
        };
      });

      setLocalTeachers(processed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [allTeachers, reportType, startDate, endDate]);

  useEffect(() => { fetchTeachers(); }, []);
  useEffect(() => { refreshReport(); }, [allTeachers, reportType]);

  const refreshReport = () => fetchData();

  // ⚡ الفلترة والتجميع
  const groupedTeachers = useMemo(() => {
    const filtered = localTeachers.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchStage = stageFilter === 'all' || t.stage === stageFilter;
      return matchSearch && matchStage;
    });

    return filtered.reduce((acc: any, t: any) => {
      if (!acc[t.department_name]) acc[t.department_name] = [];
      acc[t.department_name].push(t);
      return acc;
    }, {});
  }, [localTeachers, search, stageFilter]);

  const toggleSelect = (id: string) => setLocalTeachers(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  const selectedCount = localTeachers.filter(t => t.selected).length;

  if (usersLoading || loading) {
    return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600 w-10 h-10" /></div>;
  }

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 font-cairo" dir="rtl">
      
      {/* 🖨️ التنسيق الخاص بالطباعة (CSS Injection) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1cm; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; padding: 8px !important; text-align: center !important; font-size: 12px !important; }
          .dept-row { background: #eee !important; font-weight: bold !important; text-align: right !important; }
        }
      `}} />

      {/* Header */}
      <div className="no-print relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold backdrop-blur-sm">
              <FileText className="w-4 h-4" /> مركز استخراج التقارير الرسمية
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">تقرير الإنتاجية الإداري</h1>
            <p className="text-indigo-100 font-bold opacity-80">نطاق التقرير: {reportType === 'day' ? 'يومي' : 'أسبوعي'} | {format(schoolTime, 'dd MMMM yyyy', { locale: arSA })}</p>
          </div>
          <button onClick={() => window.print()} className="bg-white text-indigo-600 px-8 py-4 rounded-[1.5rem] font-black shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-3">
            <Download className="w-5 h-5" /> تصدير للطباعة (PDF)
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="no-print bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
            <button onClick={() => setReportType('day')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === 'day' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>يومي</button>
            <button onClick={() => setReportType('week')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>أسبوعي</button>
            <button onClick={() => setReportType('custom')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all ${reportType === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>مخصص</button>
          </div>
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="بحث باسم المعلم..." value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded-2xl bg-slate-50 border border-slate-200 py-3 pr-12 pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
          </div>
        </div>
        
        {reportType === 'custom' && (
          <div className="flex gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
            <button onClick={refreshReport} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black">تطبيق النطاق</button>
          </div>
        )}
      </div>

      {/* Main Report Preview */}
      <div className="no-print bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-right">
          <thead className="bg-slate-50/50">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-5 pr-8 pl-4 w-16">تحديد</th>
              <th className="px-4 py-5">المعلم / المنصب</th>
              <th className="px-4 py-5 text-center">الإنجاز (رصد/مطلوب)</th>
              <th className="px-4 py-5 text-center">المؤشر</th>
              <th className="px-4 py-5 text-center hidden md:table-cell">الحالة التقديرية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.entries(groupedTeachers).map(([dept, teachers]: any) => (
              <React.Fragment key={dept}>
                <tr className="bg-slate-100/30">
                  <td colSpan={5} className="py-3 px-8 text-sm font-black text-indigo-900 flex items-center gap-2">
                    <Folder className="w-4 h-4" /> قسم {dept}
                  </td>
                </tr>
                {teachers.map((t: any) => (
                  <ReportRow key={t.id} teacher={t} toggleSelect={toggleSelect} />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🖨️ نسخة الطباعة الرسمية (تظهر فقط عند ضغط Print) */}
      <div className="hidden print:block font-cairo" dir="rtl">
        <div className="text-center mb-10 border-b-4 border-slate-900 pb-6">
          <h1 className="text-3xl font-black">مدرسة الرفعة النموذجية</h1>
          <h2 className="text-xl font-bold text-slate-700 mt-2">تقرير متابعة رصد الحضور والغياب للمعلمين</h2>
          <p className="mt-4 text-sm font-bold">التاريخ: {format(schoolTime, 'dd/MM/yyyy')} | الفترة: {reportType === 'day' ? 'يومي' : 'أسبوعي'}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>المعلم</th>
              <th>القسم</th>
              <th>المطلوب</th>
              <th>المنجز</th>
              <th>النسبة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {localTeachers.filter(t => t.selected).map(t => (
              <tr key={t.id}>
                <td className={t.isHOD ? "font-black" : ""}>{t.name} {t.isHOD ? "(رئيس قسم)" : ""}</td>
                <td>{t.department_name}</td>
                <td>{t.expected}</td>
                <td>{t.recorded}</td>
                <td>{t.percent}%</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-16 flex justify-between px-10">
          <div className="text-center"><p className="font-black mb-10">ختم المدرسة</p><div className="w-32 h-32 border-2 border-dashed border-slate-300 mx-auto"></div></div>
          <div className="text-center"><p className="font-black mb-10">توقيع المدير</p><div className="w-48 border-t-2 border-black"></div></div>
        </div>
      </div>

    </div>
  );
}
