/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart2, Calendar, Clock, Download, FileSpreadsheet, 
  Filter, ShieldAlert, TrendingUp, Users, CheckCircle2, 
  XCircle, AlertCircle, ArrowLeft, Printer,
  RefreshCw, SearchX, Bug, Calculator, Loader2, Layers, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { useDashboardSystem } from '@/hooks/useDashboardSystem';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

export default function AttendanceReportsPage() {
  const { user, authRole, isChecking } = useAuth() as any; 
  const { fetchTeacherDashboardData } = useDashboardSystem();
  
  const isAdmin = authRole === 'admin' || authRole === 'management';
  
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'daily_snapshot' | 'analytics'>(isAdmin ? 'daily_snapshot' : 'analytics');
  
  const [snapshotDate, setSnapshotDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dailyStats, setDailyStats] = useState<any[]>([]);

  const [records, setRecords] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month'); 
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));


  const fetchDailySnapshot = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true); setDbError(null);
    try {
      const { data, error } = await supabase
        .from('daily_attendance_stats')
        .select(`
          id, date, period, lesson_title, total_students, present_count, absent_count, late_count, excused_count,
          sections (name, classes(name)),
          subjects (name),
          users!daily_attendance_stats_teacher_id_fkey (full_name, teachers(academic_departments(name)))
        `)
        .eq('date', snapshotDate)
        .order('period', { ascending: true });

      if (error) throw error;
      setDailyStats(data || []);
    } catch (error: any) {
      setDbError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, snapshotDate]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!user || (authRole !== 'admin' && authRole !== 'management' && authRole !== 'teacher')) return;

    setLoading(true); setDbError(null);
    try {
      let currentTeacherId = null;
      if (authRole === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('id', user.id).maybeSingle();
        if (teacherData) currentTeacherId = teacherData.id;
      }

      let availableSections = [];
      if (authRole === 'teacher') {
        const dashData = await fetchTeacherDashboardData();
        availableSections = dashData?.sections || [];
      } else {
        const { data } = await supabase.from('sections').select('id, name, classes(name)');
        availableSections = data || [];
      }

      const validSections = availableSections.map(sec => {
        const classData = Array.isArray(sec.classes) ? sec.classes[0] : sec.classes;
        return { id: sec.id, name: sec.name, className: classData?.name || 'فصل غير محدد' };
      });
      setSections(validSections);

      if (validSections.length === 0 && authRole === 'teacher') {
        setRecords([]); setLoading(false); return;
      }

      let query = supabase
        .from('attendance_records')
        .select(`
          id, date, period, status, section_id,
          students (id, users!students_id_fkey (full_name, avatar_url)),
          sections (name, classes(name))
        `);

      if (authRole === 'teacher' && currentTeacherId) {
        query = query.eq('teacher_id', currentTeacherId);
      }

      if (selectedSection !== 'all') {
        query = query.eq('section_id', selectedSection);
      }

      const today = new Date();
      if (dateRange === 'today') query = query.eq('date', format(today, 'yyyy-MM-dd'));
      else if (dateRange === 'week') query = query.gte('date', format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd')).lte('date', format(endOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
      else if (dateRange === 'month') query = query.gte('date', format(startOfMonth(today), 'yyyy-MM-dd')).lte('date', format(endOfMonth(today), 'yyyy-MM-dd'));
      else if (dateRange === 'custom') query = query.gte('date', customStartDate).lte('date', customEndDate);

      const { data: attendanceData, error } = await query;
      if (error) throw error;

      let finalData = attendanceData || [];
      if (authRole === 'teacher' && selectedSection === 'all') {
        const sectionIds = validSections.map(s => String(s.id));
        finalData = finalData.filter((record: any) => sectionIds.includes(String(record.section_id)));
      }
      
      setRecords(finalData);

    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setDbError(error.message || JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }, [user, authRole, fetchTeacherDashboardData, selectedSection, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (isChecking) return;
    if (activeTab === 'daily_snapshot' && isAdmin) fetchDailySnapshot();
    else if (activeTab === 'analytics') fetchAnalyticsData();
  }, [activeTab, fetchDailySnapshot, fetchAnalyticsData, isChecking, isAdmin]);

  // 🚀 المحرك المعماري لفرز الإحصائيات مع الاعتماد على جدول الأقسام
  const groupedDailyStats = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {
      'المرحلة المتوسطة': {},
      'المرحلة الثانوية': {}
    };

    dailyStats.forEach(stat => {
      const secObj: any = Array.isArray(stat.sections) ? stat.sections[0] : stat.sections;
      const classData: any = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;
      const className = classData?.name || '';
      const fullClassName = `${className} - ${secObj?.name || ''}`;
      
      const stage = /(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className) ? 'المرحلة المتوسطة' : 'المرحلة الثانوية';
      
      const subjData: any = Array.isArray(stat.subjects) ? stat.subjects[0] : stat.subjects;
      const subjName = subjData?.name || 'مادة غير محددة';
      
      const teacherData: any = Array.isArray(stat.users) ? stat.users[0] : stat.users;
      const teacherProfile: any = Array.isArray(teacherData?.teachers) ? teacherData.teachers[0] : teacherData?.teachers;
      const academicDept: any = Array.isArray(teacherProfile?.academic_departments) ? teacherProfile.academic_departments[0] : teacherProfile?.academic_departments;
      
      // 🚀 القراءة الصريحة للقسم من القاعدة بدلاً من التخمين
      let dept = academicDept?.name || 'أقسام أخرى';

      if (!groups[stage][dept]) groups[stage][dept] = [];
      groups[stage][dept].push({
        teacher: teacherData?.full_name || 'غير محدد',
        lesson: stat.lesson_title || 'لم يتم التسجيل',
        subject: subjName,
        total: stat.total_students,
        absent: stat.absent_count,
        present: stat.present_count,
        period: stat.period,
        className: fullClassName
      });
    });

    return groups;
  }, [dailyStats]);

  const reportData = useMemo(() => {
    const studentMap = new Map<string, any>();
    
    records.forEach((record: any) => {
      const stuObj: any = Array.isArray(record.students) ? record.students[0] : record.students;
      const sId = stuObj?.id;
      if (!sId) return;

      if (!studentMap.has(sId)) {
        const userData: any = Array.isArray(stuObj?.users) ? stuObj?.users[0] : stuObj?.users;
        const secData: any = Array.isArray(record.sections) ? record.sections[0] : record.sections;
        const classData: any = Array.isArray(secData?.classes) ? secData?.classes[0] : secData?.classes;
        
        studentMap.set(sId, {
          id: sId,
          name: userData?.full_name || 'طالب غير معروف',
          className: classData?.name ? `${classData.name} - ${secData?.name || ''}` : 'فصل غير محدد',
          present: 0, absent: 0, late: 0, excused: 0, fullDaysAbsent: 0, totalRecords: 0
        });
      }
      
      const st = studentMap.get(sId);
      st.totalRecords += 1;
      if (record.status === 'present') st.present += 1;
      if (record.status === 'absent') st.absent += 1;
      if (record.status === 'late') st.late += 1;
      if (record.status === 'excused') st.excused += 1;
    });

    return Array.from(studentMap.values()).map(st => {
      st.fullDaysAbsent = Math.floor(st.absent / 5);
      return st;
    }).sort((a, b) => b.absent - a.absent);
  }, [records]);

  const atRiskStudents = reportData.filter(s => s.absent >= 5);

  const getReportTitle = () => {
    const secName = selectedSection === 'all' ? 'جميع الفصول' : sections.find(s => String(s.id) === String(selectedSection))?.className + ' - ' + sections.find(s => String(s.id) === String(selectedSection))?.name || '';
    const dateText = dateRange === 'all' ? 'كل الأوقات' : dateRange === 'today' ? 'اليوم' : dateRange === 'week' ? 'هذا الأسبوع' : dateRange === 'month' ? 'هذا الشهر' : 'فترة مخصصة';
    return `تقرير الغياب التحليلي (${secName}) - ${dateText}`;
  };

  const printDepartmentReport = (stage: string, department: string, deptRecords: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('الرجاء السماح بالنوافذ المنبثقة');

    const formattedDate = new Date(snapshotDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' });
    const rows = deptRecords.map((r) => `
      <tr>
        <td><strong>${r.teacher}</strong></td>
        <td style="text-align: right; padding-right: 10px;">${r.lesson}</td>
        <td>${r.subject}</td>
        <td style="font-weight: bold;">${r.total}</td>
        <td style="color: #e11d48; font-weight: bold;">${r.absent}</td>
        <td style="color: #059669; font-weight: bold;">${r.present}</td>
        <td>${r.period}</td>
        <td dir="ltr">${r.className}</td>
      </tr>
    `).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>إحصائية ${department} - ${formattedDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 30px; color: #000; background: #fff; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h3 { margin: 5px 0; font-size: 18px; font-weight: 900; }
            .header h4 { margin: 10px 0; font-size: 16px; font-weight: 700; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; text-align: center; }
            th { background-color: #f1f5f9; color: #000; padding: 12px 5px; font-weight: 900; border: 1px solid #000; font-size: 13px; }
            td { padding: 8px 5px; border: 1px solid #000; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; padding: 0 50px; }
            .signatures div { text-align: center; }
            .signatures p { margin-top: 5px; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>مدرسة الرفعة النموذجية ( ${department} )</h3>
            <h4>إحصائية غياب الطلبة خلال حصص ${department} - ${formattedDate.replace('،', '')}</h4>
          </div>
          <table>
            <thead>
              <tr>
                <th width="15%">اسم المدرس</th>
                <th width="25%">عنوان الدرس</th>
                <th width="12%">المادة</th>
                <th width="8%">الإجمالي</th>
                <th width="8%">الغياب</th>
                <th width="8%">الحضور</th>
                <th width="8%">الحصة</th>
                <th width="16%">الصف</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="signatures">
            <div>رئيس القسم<br/><p>.........................</p></div>
            <div>مدير المدرسة<br/><p>أ. صالح المطيري</p></div>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    if (reportData.length === 0) return alert('لا توجد بيانات للتصدير');
    const data = reportData.map((s, index) => ({
      'م': index + 1,
      'اسم الطالب': s.name,
      'الفصل': s.className,
      'حصص الحضور': s.present,
      'حصص الغياب': s.absent,
      'أيام الغياب الفعلية': s.fullDaysAbsent,
      'حصص التأخير': s.late,
      'حصص مستأذن': s.excused,
      'مؤشر الخطر': s.absent >= 15 ? 'خطير (3 أيام)' : s.absent >= 5 ? 'منذر (يوم فأكثر)' : 'سليم'
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
    
    const title = isWarningReport ? 'إشعار إنذار إداري (تجاوز 5 حصص غياب = يوم كامل)' : getReportTitle();

    const rows = dataToPrint.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.className}</td>
        <td style="color: #059669; font-weight: bold;">${s.present}</td>
        <td style="color: #e11d48; font-weight: bold; background: ${s.absent >= 5 ? '#ffe4e6' : 'transparent'}">${s.absent} حصة</td>
        <td style="color: #9f1239; font-weight: 900; background: ${s.fullDaysAbsent > 0 ? '#fecdd3' : 'transparent'}">${s.fullDaysAbsent} يوم</td>
        <td style="color: #d97706; font-weight: bold;">${s.late}</td>
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
            .header p { color: #64748b; font-size: 14px; margin: 0; font-weight: bold; }
            .info-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; font-weight: bold; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; text-align: center; }
            th { background-color: ${isWarningReport ? '#fef1f2' : '#f1f5f9'}; color: ${isWarningReport ? '#be123c' : '#1e293b'}; padding: 12px; font-weight: 900; border: 1px solid #cbd5e1; }
            td { padding: 10px; border: 1px solid #cbd5e1; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${isWarningReport ? '⚠️ إشعار إنذار غياب للطلاب' : '📊 التقرير التحليلي الشامل للغياب'}</h1>
            <p>${title} | تاريخ الإصدار: ${format(new Date(), 'yyyy/MM/dd')}</p>
          </div>
          <div class="info-box">يتم احتساب الأيام الفعلية بناءً على المعادلة (كل 5 حصص غياب متفرقة = 1 يوم غياب كامل).</div>
          <table>
            <thead>
              <tr><th width="5%">#</th><th width="30%">اسم الطالب</th><th width="20%">الفصل</th><th width="10%">حضـور</th><th width="10%">غيـاب</th><th width="15%">الغياب الفعلي</th><th width="10%">تأخيـر</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">تطبيق الرفعة النموذجي - جميع الحقوق محفوظة</div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-slate-400 font-bold animate-pulse">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (authRole !== 'admin' && authRole !== 'management' && authRole !== 'teacher') {
    return <div className="p-10 text-center font-black text-rose-500 min-h-screen flex items-center justify-center bg-[#090b14]">هذه الصفحة مخصصة لفريق الإدارة والمعلمين فقط.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen relative bg-[#090b14] text-slate-200 pb-32 overflow-x-hidden font-cairo" dir="rtl">
      
      <div className="fixed top-1/4 right-[-10%] w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[-10%] w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        <div className="flex justify-between items-center">
          <Link href="/attendance" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 font-bold bg-[#131836]/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 transition-all w-fit group text-sm sm:text-base shadow-lg">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" /> العودة للرصد
          </Link>
          <button onClick={activeTab === 'daily_snapshot' ? fetchDailySnapshot : fetchAnalyticsData} className="flex items-center gap-2 text-slate-900 font-black bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 rounded-2xl transition-all hover:opacity-90 active:scale-95 text-sm sm:text-base shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-[#131836]/60 backdrop-blur-2xl border border-white/10 p-8 sm:p-12 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-400 uppercase tracking-widest backdrop-blur-sm shadow-sm">
                <BarChart2 className="w-4 h-4" /> مركز العمليات والتحليل
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                تقارير الحضور والغياب
              </h1>
              <p className="text-slate-400 text-sm sm:text-base font-bold max-w-2xl leading-relaxed">
                تحليل ذكي لسجلات الحضور. تطبيق تلقائي لمعادلة (5 حصص = يوم غياب) لاستخراج إحصائيات دقيقة وفورية.
              </p>
            </div>
            
            {isAdmin && (
              <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto bg-[#090b14]/50 p-2 rounded-[2rem] border border-white/5">
                <button onClick={() => setActiveTab('daily_snapshot')} className={`flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] text-sm sm:text-base font-black transition-all ${activeTab === 'daily_snapshot' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <Layers className="w-5 h-5" /> الإحصائية الإدارية السريعة
                </button>
                <button onClick={() => setActiveTab('analytics')} className={`flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] text-sm sm:text-base font-black transition-all ${activeTab === 'analytics' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <Users className="w-5 h-5" /> سجل تقارير الطلاب العام
                </button>
              </div>
            )}
          </div>
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        </div>

        {dbError && (
          <div className="bg-rose-500/10 p-6 rounded-[2rem] border border-rose-500/30 text-rose-400 font-bold flex items-center gap-3 backdrop-blur-md">
            <Bug className="w-6 h-6 shrink-0" /> خطأ في جلب البيانات: {dbError}
          </div>
        )}

        {isAdmin && activeTab === 'daily_snapshot' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3 text-emerald-400 font-black text-lg">
                <Calendar className="w-6 h-6" /> عرض إحصائيات يوم:
              </div>
              <input 
                type="date" 
                value={snapshotDate} 
                onChange={(e) => setSnapshotDate(e.target.value)} 
                className="w-full sm:w-auto rounded-2xl border border-white/10 py-3.5 px-6 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" 
                style={{ colorScheme: 'dark' }} 
              />
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" /></div>
            ) : dailyStats.length === 0 ? (
              <div className="bg-[#131836]/40 backdrop-blur-xl py-20 text-center rounded-[2.5rem] border border-white/5"><BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" /><p className="text-slate-400 font-bold text-xl">لا توجد إحصائيات معتمدة في هذا اليوم.</p></div>
            ) : (
              Object.keys(groupedDailyStats).map(stage => {
                const stageData = groupedDailyStats[stage];
                if (Object.keys(stageData).length === 0) return null;
                
                return (
                  <div key={stage} className="space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-white border-r-4 border-emerald-500 pr-4 drop-shadow-md">{stage}</h2>
                    
                    {Object.keys(stageData).map(dept => {
                      const recordsList = stageData[dept];
                      return (
                        <div key={dept} className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                          <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#090b14]/30">
                            <h3 className="text-xl font-black text-emerald-400 flex items-center gap-3">
                              <Layers className="w-6 h-6" /> قسم {dept}
                            </h3>
                            <button onClick={() => printDepartmentReport(stage, dept, recordsList)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black transition-all border border-white/10 active:scale-95">
                              <Printer className="w-4 h-4" /> طباعة الإحصائية
                            </button>
                          </div>
                          <div className="overflow-x-auto pb-4">
                            <table className="w-full text-right whitespace-nowrap">
                              <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                  <th className="py-4 px-6 text-xs font-black uppercase text-slate-400">اسم المدرس</th>
                                  <th className="py-4 px-6 text-xs font-black uppercase text-slate-400">عنوان الدرس</th>
                                  <th className="py-4 px-6 text-xs font-black uppercase text-slate-400 text-center">المادة</th>
                                  <th className="py-4 px-4 text-xs font-black uppercase text-slate-400 text-center">الإجمالي</th>
                                  <th className="py-4 px-4 text-xs font-black uppercase text-rose-400 text-center">الغياب</th>
                                  <th className="py-4 px-4 text-xs font-black uppercase text-emerald-400 text-center">الحضور</th>
                                  <th className="py-4 px-4 text-xs font-black uppercase text-slate-400 text-center">الحصة</th>
                                  <th className="py-4 px-6 text-xs font-black uppercase text-slate-400 text-center">الصف</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {recordsList.map((r, i) => (
                                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-6 font-black text-white text-sm">{r.teacher}</td>
                                    <td className="py-4 px-6 font-bold text-slate-300 text-sm truncate max-w-[200px]" title={r.lesson}>{r.lesson}</td>
                                    <td className="py-4 px-6 font-bold text-slate-400 text-sm text-center">{r.subject}</td>
                                    <td className="py-4 px-4 font-black text-white text-base text-center">{r.total}</td>
                                    <td className="py-4 px-4 font-black text-rose-400 text-base text-center">{r.absent}</td>
                                    <td className="py-4 px-4 font-black text-emerald-400 text-base text-center">{r.present}</td>
                                    <td className="py-4 px-4 font-black text-slate-300 text-sm text-center bg-white/5 border-x border-white/5">{r.period}</td>
                                    <td className="py-4 px-6 font-black text-slate-300 text-sm text-center" dir="ltr">{r.className}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            
            <div className="bg-[#131836]/60 backdrop-blur-2xl p-5 sm:p-6 rounded-[2.5rem] shadow-xl border border-white/10 sticky top-4 z-30">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-black text-white">محددات التقرير</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الفصل الدراسي</label>
                  <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836]">
                    <option value="all">جميع الفصول والشعب</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.className} - {s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">الفترة الزمنية</label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="w-full rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none appearance-none [&>option]:bg-[#131836]">
                    <option value="all">كل الأوقات (قد يكون بطيئاً)</option>
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
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">من</label>
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" style={{ colorScheme: 'dark' }} />
                      </div>
                      <div className="flex-1 space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">إلى</label>
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full rounded-2xl border border-white/10 py-3.5 px-4 text-white bg-[#090b14]/80 focus:ring-2 focus:ring-emerald-400 text-sm font-bold outline-none" style={{ colorScheme: 'dark' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" /></div>
            ) : (
              <>
                <AnimatePresence>
                  {atRiskStudents.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 p-5 sm:p-8 rounded-[2.5rem] border border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)] backdrop-blur-xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shadow-inner animate-pulse shrink-0">
                            <ShieldAlert className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">إنذار: غياب يوم فأكثر</h2>
                            <p className="text-[10px] sm:text-sm font-bold text-rose-300 mt-1">هؤلاء الطلاب يتطلبون استدعاء وطباعة إنذار.</p>
                          </div>
                        </div>
                        <button onClick={() => exportToPDF(true)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:bg-rose-400 transition-all active:scale-95 shrink-0 w-full sm:w-auto">
                          <Printer className="w-4 h-4" /> طباعة تقرير الإنذار
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {atRiskStudents.map(student => (
                          <div key={student.id} className="bg-[#090b14]/50 p-5 rounded-[1.5rem] border border-white/5 flex items-center justify-between group hover:border-rose-500/50 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-12 w-12 bg-white/5 text-white border border-white/10 rounded-xl flex items-center justify-center font-black shrink-0 text-lg">{student.name.charAt(0)}</div>
                              <div className="min-w-0">
                                <p className="font-black text-white text-sm truncate">{student.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{student.className}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-1 rounded-md text-[10px] font-black whitespace-nowrap">{student.absent} حصة</div>
                              <div className="bg-rose-500 text-white px-2 py-1 rounded-md text-[10px] font-black whitespace-nowrap shadow-sm">{student.fullDaysAbsent} يوم فعلي</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-[#131836]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden">
                  <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-[#090b14]/30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-inner shrink-0">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">السجل التحليلي الشامل للطلاب</h2>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-bold">
                           <Calculator className="w-3.5 h-3.5 text-indigo-400" /> يتم حساب الأيام الفعلية بناءً على المعادلة: كل 5 حصص = 1 يوم غياب.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                      <button onClick={exportToExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-black hover:bg-white/10 transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
                      <button onClick={() => exportToPDF(false)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-black hover:bg-white/10 transition-all active:scale-95"><Download className="w-4 h-4" /> PDF</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-4">
                    <table className="w-full text-right whitespace-nowrap">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          <th className="py-5 pr-8 pl-4 text-xs font-black uppercase tracking-widest text-slate-400">اسم الطالب والفصل</th>
                          <th className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-emerald-400">حضور<br/><span className="text-[9px]">(حصص)</span></th>
                          <th className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-rose-400">غياب<br/><span className="text-[9px]">(حصص)</span></th>
                          <th className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-rose-300 bg-rose-500/10 border-x border-rose-500/20">الأيام الفعلية<br/><span className="text-[9px]">(تجاوز)</span></th>
                          <th className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-amber-400">متأخر<br/><span className="text-[9px]">(حصص)</span></th>
                          <th className="px-4 py-5 text-center text-xs font-black uppercase tracking-widest text-blue-400">مستأذن<br/><span className="text-[9px]">(حصص)</span></th>
                          <th className="px-6 py-5 text-center text-xs font-black uppercase tracking-widest text-slate-400">مؤشر الخطر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {reportData.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-24 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10"><SearchX className="h-10 w-10 text-slate-500" /></div>
                                <p className="text-slate-400 font-bold text-lg">لا توجد سجلات مطابقة لمحددات البحث الحالية.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          reportData.map((student) => {
                            const isWarning = student.fullDaysAbsent > 0;
                            const isDanger = student.fullDaysAbsent >= 3;
                            
                            return (
                              <tr key={student.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 pr-8 pl-4">
                                  <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-[#090b14] border border-white/10 text-white flex items-center justify-center font-black text-lg shrink-0">{student.name.charAt(0)}</div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-black text-white text-sm group-hover:text-emerald-400 transition-colors truncate">{student.name}</span>
                                      <span className="text-[10px] text-slate-400 font-bold truncate mt-1">{student.className}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm border border-emerald-500/20">{student.present}</span></td>
                                <td className="px-4 py-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm border ${student.absent > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>{student.absent}</span></td>
                                <td className="px-4 py-4 text-center bg-rose-500/5 border-x border-rose-500/10">
                                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-base border shadow-sm ${isDanger ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse' : isWarning ? 'bg-rose-500 text-white border-rose-400' : 'bg-[#090b14] text-slate-500 border-white/10'}`}>{student.fullDaysAbsent}</span>
                                </td>
                                <td className="px-4 py-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm border ${student.late > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-slate-500 border-white/10'}`}>{student.late}</span></td>
                                <td className="px-4 py-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 font-black text-sm border border-blue-500/20">{student.excused}</span></td>
                                <td className="px-6 py-4 text-center">
                                   {isDanger ? (
                                     <span className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-black"><AlertCircle className="w-3.5 h-3.5" /> استدعاء فوري</span>
                                   ) : isWarning ? (
                                     <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-black"><ShieldAlert className="w-3.5 h-3.5" /> إنذار أولي</span>
                                   ) : (
                                     <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-black"><CheckCircle2 className="w-3.5 h-3.5" /> سليم</span>
                                   )}
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
