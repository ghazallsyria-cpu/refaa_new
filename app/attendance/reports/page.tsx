'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart2, Calendar, Clock, Download, FileSpreadsheet, 
  Filter, ShieldAlert, TrendingUp, Users, CheckCircle2, 
  XCircle, AlertCircle, ArrowLeft, GraduationCap, Printer,
  RefreshCw, SearchX, Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export default function AttendanceReportsPage() {
  const { user, userRole } = useAuth();
  const { fetchTeacherDashboardData } = useDashboardSystem();
  
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Filters
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setDbError(null);
    try {
      let currentTeacherId = null;
      if (userRole === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', user.id).maybeSingle();
        if (teacherData) currentTeacherId = teacherData.id;
      }

      // 1. جلب الفصول الخاصة بالمعلم أو المدير
      let availableSections = [];
      if (userRole === 'teacher') {
        const dashData = await fetchTeacherDashboardData();
        availableSections = dashData?.sections || [];
      } else {
        const { data } = await supabase.from('sections').select('id, name, classes(name)');
        availableSections = data || [];
      }

      const validSections = availableSections.map(sec => {
        const classData = Array.isArray(sec.classes) ? sec.classes[0] : sec.classes;
        return {
          id: sec.id,
          name: sec.name,
          className: classData?.name || 'فصل غير محدد'
        };
      });
      setSections(validSections);

      if (validSections.length === 0 && userRole === 'teacher') {
        setRecords([]);
        setLoading(false);
        return;
      }

      const sectionIds = validSections.map(s => String(s.id));

      // 🚀 2. استعلام ذكي ومحمي (بدون section_id من جدول الغياب)
      let query = supabase
        .from('attendance_records')
        .select(`
          id, created_at, status, student_id,
          students (
            id, section_id,
            users (full_name, avatar_url),
            sections (id, name, classes(name))
          )
        `)
        .order('created_at', { ascending: false });

      if (userRole === 'teacher' && currentTeacherId) {
        query = query.eq('teacher_id', currentTeacherId);
      }

      const { data: attendanceData, error } = await query;
      
      if (error) {
        throw error;
      }

      // فلترة برمجية آمنة جداً: التأكد من أن السجل يعود لأحد فصول المعلم
      let finalData = attendanceData || [];
      if (userRole === 'teacher' && sectionIds.length > 0) {
        finalData = finalData.filter((record: any) => {
          const stu: any = Array.isArray(record.students) ? record.students[0] : record.students;
          const stuSec: any = Array.isArray(stu?.sections) ? stu?.sections[0] : stu?.sections;
          const stuSecId = stu?.section_id || stuSec?.id;
          return sectionIds.includes(String(stuSecId));
        });
      }
      
      setRecords(finalData);

    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setDbError(error.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }, [user, userRole, fetchTeacherDashboardData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🚀 المحرك الذكي للفلترة والتجميع
  const reportData = useMemo(() => {
    let filtered = records || [];

    // 1. فلترة الفصل (من بيانات الطالب المدمجة) بشكل آمن
    if (selectedSection !== 'all') {
      filtered = filtered.filter((r: any) => {
        const stu: any = Array.isArray(r.students) ? r.students[0] : r.students;
        const stuSec: any = Array.isArray(stu?.sections) ? stu?.sections[0] : stu?.sections;
        const secId = stu?.section_id || stuSec?.id;
        return String(secId) === String(selectedSection);
      });
    }

    // 2. فلترة التاريخ
    if (dateRange !== 'all') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      filtered = filtered.filter((r: any) => {
        const targetDate = r.created_at || r.date;
        if (!targetDate) return false;
        
        if (dateRange === 'today') {
          return targetDate.startsWith(todayStr);
        } 
        
        const recordDate = new Date(targetDate);
        if (dateRange === 'week') {
          return recordDate >= startOfWeek(today, { weekStartsOn: 6 }) && recordDate <= endOfWeek(today, { weekStartsOn: 6 });
        } else if (dateRange === 'month') {
          return recordDate >= startOfMonth(today) && recordDate <= endOfMonth(today);
        } else if (dateRange === 'custom') {
          const start = new Date(customStartDate); start.setHours(0,0,0,0);
          const end = new Date(customEndDate); end.setHours(23,59,59,999);
          return recordDate >= start && recordDate <= end;
        }
        return true;
      });
    }

    const studentMap = new Map<string, any>();
    
    filtered.forEach((record: any) => {
      const sId = record.student_id;
      if (!sId) return;

      if (!studentMap.has(sId)) {
        // استخراج سلس وآمن لبيانات الطالب
        const stu: any = Array.isArray(record.students) ? record.students[0] : record.students;
        const userData: any = Array.isArray(stu?.users) ? stu?.users[0] : stu?.users;
        const secData: any = Array.isArray(stu?.sections) ? stu?.sections[0] : stu?.sections;
        const classData: any = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
        
        const className = classData?.name || '';
        const secName = secData?.name || '';
        
        studentMap.set(sId, {
          id: sId,
          name: userData?.full_name || 'طالب غير معروف',
          avatar: userData?.avatar_url,
          className: className ? `${className} - ${secName}` : 'فصل غير محدد',
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          totalRecords: 0
        });
      }
      
      const st = studentMap.get(sId);
      st.totalRecords += 1;
      if (record.status === 'present') st.present += 1;
      if (record.status === 'absent') st.absent += 1;
      if (record.status === 'late') st.late += 1;
      if (record.status === 'excused') st.excused += 1;
    });

    return Array.from(studentMap.values()).sort((a, b) => b.absent - a.absent);
  }, [records, selectedSection, dateRange, customStartDate, customEndDate]);

  const atRiskStudents = reportData.filter(s => s.absent >= 5);

  const getReportTitle = () => {
    const secName = selectedSection === 'all' ? 'جميع الفصول' : sections.find(s => String(s.id) === String(selectedSection))?.name || '';
    const dateText = dateRange === 'all' ? 'كل الأوقات' : dateRange === 'today' ? 'اليوم' : dateRange === 'week' ? 'هذا الأسبوع' : dateRange === 'month' ? 'هذا الشهر' : 'فترة مخصصة';
    return `تقرير غياب (${secName}) - ${dateText}`;
  };

  const exportToExcel = () => {
    if (reportData.length === 0) return alert('لا توجد بيانات للتصدير');
    const data = reportData.map((s, index) => ({
      'م': index + 1,
      'اسم الطالب': s.name,
      'الفصل': s.className,
      'أيام الحضور': s.present,
      'أيام الغياب': s.absent,
      'التأخير': s.late,
      'استئذان': s.excused,
      'نسبة الغياب': `${Math.round((s.absent / s.totalRecords) * 100) || 0}%`
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير الغياب");
    XLSX.writeFile(workbook, `${getReportTitle()}.xlsx`);
  };

  const exportToPDF = (isWarningReport = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('الرجاء السماح بالنوافذ المنبثقة');

    const dataToPrint = isWarningReport ? atRiskStudents : reportData;
    if (dataToPrint.length === 0) {
      printWindow.close();
      return alert('لا توجد بيانات للطباعة');
    }
    
    const title = isWarningReport ? 'تقرير الطلاب المنذرين (تجاوز 5 غيابات)' : getReportTitle();

    const rows = dataToPrint.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.className}</td>
        <td style="color: #059669; font-weight: bold;">${s.present}</td>
        <td style="color: #e11d48; font-weight: bold; background: ${s.absent >= 5 ? '#ffe4e6' : 'transparent'}">${s.absent}</td>
        <td style="color: #d97706; font-weight: bold;">${s.late}</td>
        <td>${Math.round((s.absent / s.totalRecords) * 100) || 0}%</td>
      </tr>
    `).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #0f172a; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${isWarningReport ? '#e11d48' : '#4f46e5'}; padding-bottom: 20px; }
            .header h1 { color: ${isWarningReport ? '#e11d48' : '#4f46e5'}; font-size: 28px; font-weight: 900; margin-bottom: 5px; }
            .header p { color: #64748b; font-size: 16px; margin: 0; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; text-align: center; }
            th { background-color: ${isWarningReport ? '#fef1f2' : '#f1f5f9'}; color: ${isWarningReport ? '#be123c' : '#1e293b'}; padding: 15px; font-weight: 900; border: 1px solid #cbd5e1; }
            td { padding: 12px; border: 1px solid #cbd5e1; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; }
            .stamp { float: left; border: 2px dashed ${isWarningReport ? '#e11d48' : '#4f46e5'}; padding: 10px; color: ${isWarningReport ? '#e11d48' : '#4f46e5'}; font-weight: bold; transform: rotate(-10deg); margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${isWarningReport ? '⚠️ إشعار إنذار غياب للطلاب' : '📊 التقرير التحليلي للغياب والحضور'}</h1>
            <p>${title} | تاريخ الإصدار: ${format(new Date(), 'yyyy/MM/dd')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="30%">اسم الطالب</th>
                <th width="20%">الفصل</th>
                <th width="10%">حاضر</th>
                <th width="10%">غائب</th>
                <th width="10%">متأخر</th>
                <th width="15%">مؤشر الخطر</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="stamp">اعتماد النظام الموحد<br/>تم الإصدار تلقائياً</div>
          <div class="clearfix" style="clear: both;"></div>
          <div class="footer">تطبيق الرفعة النموذجي - جميع الحقوق محفوظة</div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-500 font-bold animate-pulse tracking-widest">جاري سحب وتجميع التقارير...</p>
        </div>
      </div>
    );
  }

  // 🚀 رادار الأخطاء
  if (dbError) {
    return (
      <div className="flex h-screen items-center justify-center p-6" dir="rtl">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-rose-100 text-center max-w-lg w-full">
          <div className="h-24 w-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <Bug className="h-12 w-12 text-rose-500 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">عذراً، حدث خطأ في قاعدة البيانات</h2>
          <div className="bg-rose-50 p-4 rounded-xl text-right mb-8 overflow-auto max-h-32 border border-rose-100">
             <p className="text-rose-600 font-mono text-xs" dir="ltr">{dbError}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
               <RefreshCw className="w-5 h-5" /> إعادة المحاولة
            </button>
            <Link href="/attendance" className="flex-1 bg-white text-slate-700 border border-slate-200 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2">
               العودة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8" dir="rtl">
      
      {/* 🚀 Top Navigation */}
      <div className="pt-6 flex justify-between items-center">
        <Link href="/attendance" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 transition-all w-fit group text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" /> العودة لرصد الغياب
        </Link>
        <button onClick={fetchData} className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-4 py-2.5 rounded-2xl shadow-sm border border-indigo-100 transition-all hover:bg-indigo-600 hover:text-white active:scale-95 text-sm sm:text-base">
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> تحديث البيانات
        </button>
      </div>

      {/* 🚀 Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 p-6 sm:p-12 text-white shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>التحليل والإحصاء</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
              تقارير الحضور والغياب
            </h1>
            <p className="text-indigo-100 text-xs sm:text-base font-bold opacity-90 max-w-2xl leading-relaxed">
              تحليل ذكي لسجلات غياب الطلاب في حصصك الدراسية. يمكنك تتبع الغياب، اكتشاف الطلاب المنذرين، وتصدير التقارير الرسمية بضغطة زر.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
            <button onClick={exportToExcel} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-base font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" /> تصدير Excel
            </button>
            <button onClick={() => exportToPDF(false)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-[1.5rem] bg-rose-500 hover:bg-rose-600 text-white text-sm sm:text-base font-black shadow-lg shadow-rose-500/30 transition-all active:scale-95">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" /> تقرير PDF
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
      </div>

      {/* 🚀 Smart Filter Bar */}
      <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-200 sticky top-24 z-30">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-black text-slate-900">محددات التقرير</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">الفصل الدراسي</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="all">جميع الفصول والشعب</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.className} - {s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">الفترة الزمنية</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="all">كل الأوقات (الافتراضي)</option>
              <option value="today">اليوم الحالي</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>

          <AnimatePresence>
            {dateRange === 'custom' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 space-y-0">
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">من</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-3 sm:px-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold transition-all outline-none" />
                </div>
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">إلى</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-3 sm:px-4 text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm font-bold transition-all outline-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 🚀 At-Risk Radar */}
      <AnimatePresence>
        {atRiskStudents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-rose-50 to-red-50 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-rose-200 shadow-lg shadow-rose-100/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 sm:p-3 bg-rose-500 text-white rounded-xl sm:rounded-2xl shadow-md shadow-rose-500/30 animate-pulse shrink-0">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-rose-900 leading-tight">إنذار: تجاوز الحد (5 غيابات فأكثر)</h2>
                  <p className="text-[10px] sm:text-sm font-bold text-rose-600 mt-1">يتطلب هذا القسم انتباهك لرفع تقرير للإدارة.</p>
                </div>
              </div>
              <button onClick={() => exportToPDF(true)} className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white text-rose-600 text-xs sm:text-sm font-black shadow-sm border border-rose-200 hover:bg-rose-600 hover:text-white transition-all active:scale-95 shrink-0 w-full sm:w-auto">
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> طباعة تقرير إنذار
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {atRiskStudents.map(student => (
                <div key={student.id} className="bg-white p-4 sm:p-5 rounded-[1.5rem] shadow-sm border border-rose-100 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-black shrink-0 text-base sm:text-lg">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-xs sm:text-sm truncate">{student.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 truncate">{student.className}</p>
                    </div>
                  </div>
                  <div className="bg-rose-500 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black shadow-sm shrink-0">
                    {student.absent} غياب
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Main Data Table */}
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner border border-indigo-100 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">السجل التحليلي الشامل</h2>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto text-center">
            إجمالي السجلات: {reportData.length} طالب
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/30">
                <th scope="col" className="py-4 sm:py-5 pr-6 sm:pr-8 pl-4 text-right text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">اسم الطالب</th>
                <th scope="col" className="px-2 sm:px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600">حاضر</th>
                <th scope="col" className="px-2 sm:px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-600">غائب</th>
                <th scope="col" className="px-2 sm:px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600">متأخر</th>
                <th scope="col" className="px-2 sm:px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600">مستأذن</th>
                <th scope="col" className="px-4 py-4 sm:py-5 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">مؤشر الغياب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 sm:py-20 text-center">
                    <div className="flex flex-col items-center gap-3 sm:gap-4">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <SearchX className="h-6 w-6 sm:h-8 sm:w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-bold text-xs sm:text-lg">لا توجد سجلات مطابقة لمحددات البحث الحالية.</p>
                      <p className="text-slate-400 font-medium text-[10px] sm:text-xs">تأكد من أنك قمت برصد الغياب لطلابك من لوحة الرصد أولاً.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reportData.map((student) => {
                  const absenceRate = Math.round((student.absent / student.totalRecords) * 100) || 0;
                  return (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap py-3 sm:py-4 pr-6 sm:pr-8 pl-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-sm sm:text-lg shadow-sm shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors truncate">{student.name}</span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold truncate">{student.className}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 sm:px-4 py-3 sm:py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs sm:text-sm border border-emerald-100">{student.present}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 sm:px-4 py-3 sm:py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm border ${student.absent > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{student.absent}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 sm:px-4 py-3 sm:py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm border ${student.late > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{student.late}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 sm:px-4 py-3 sm:py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 font-black text-xs sm:text-sm border border-blue-100">{student.excused}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:py-4 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 sm:w-20 h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full ${absenceRate >= 20 ? 'bg-rose-500' : absenceRate > 0 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(absenceRate, 100)}%` }} />
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-black w-8 text-right ${absenceRate >= 20 ? 'text-rose-600' : 'text-slate-500'}`}>{absenceRate}%</span>
                        </div>
                      </td>
                    </tr>
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
