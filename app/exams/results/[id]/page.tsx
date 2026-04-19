'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { ArrowRight, Users, CheckCircle2, AlertCircle, Eye, Search, Trash2, Trophy, Clock, BookOpen, Filter, Download, Printer, Layers, Loader2, ShieldAlert, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function TeacherExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, authRole, userRole, isChecking } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchExamResults, deleteAttempt } = useExamsSystem();
  
  const [examData, setExamData] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // فلاتر البحث
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [sectionFilter, setSectionFilter] = useState('all');
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user || isChecking) return;
    try {
      setLoading(true);
      const data = await fetchExamResults(params.id as string);
      if (data) {
        setExamData(data.exam);
        setAttempts(data.attempts || []);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  }, [params.id, user, isChecking, fetchExamResults]);

  useEffect(() => {
    if (user && currentRole === 'student') {
      router.replace(`/exams/results/${params.id}/student/${user.id}`);
    } else if (user) {
      loadData();
    }
  }, [user, currentRole, params.id, router, loadData]);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm('هل أنت متأكد من حذف نتيجة هذا الطالب؟ سيتمكن من إعادة الاختبار وسينحذف تقييمك الحالي.')) return;
    setIsDeleting(attemptId);
    try {
      await deleteAttempt(attemptId);
      await loadData(); 
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(null);
    }
  };

  // شاشات الحماية الملكية والتحميل
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (currentRole === 'student') {
    return <div className="min-h-screen bg-[#090b14] flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent font-cairo relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"></div>
          <p className="text-slate-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري سحب نتائج الطلاب...</p>
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  // 1. استخراج الفصول الفريدة
  const uniqueSections = Array.from(new Set(
    attempts.map(a => a.student?.section?.name ? `${a.student.section?.classes?.name || ''} - ${a.student.section.name}` : 'بدون فصل')
  )).filter(Boolean);

  // 2. تطبيق الفلاتر
  const filteredAttempts = attempts.filter((attempt: any) => {
     const studentName = attempt?.student?.users?.full_name || 'طالب مجهول';
     const sectionName = attempt?.student?.section?.name ? `${attempt.student.section?.classes?.name || ''} - ${attempt.student.section.name}` : 'بدون فصل';
     
     const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'all' 
        ? true : statusFilter === 'pending' ? attempt.status !== 'graded' : attempt.status === 'graded';
     const matchesSection = sectionFilter === 'all' ? true : sectionName === sectionFilter;
         
     return matchesSearch && matchesStatus && matchesSection;
  });

  const gradedAttempts = attempts.filter(a => a.status === 'graded');
  const pendingCount = attempts.length - gradedAttempts.length;
  const averageScore = gradedAttempts.length > 0 
    ? Math.round(gradedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAttempts.length) : 0;
  const maxScore = examData?.total_marks || examData?.max_score || 0;

  // 🎯 التصدير
  const exportToExcel = () => {
    const headers = ['اسم الطالب', 'الفصل', 'الدرجة', 'العلامة الكاملة', 'الحالة', 'تاريخ التسليم'];
    const csvData = filteredAttempts.map(attempt => {
       const name = attempt?.student?.users?.full_name || 'طالب مجهول';
       const section = attempt?.student?.section?.name ? `${attempt.student.section?.classes?.name || ''} - ${attempt.student.section.name}` : 'بدون فصل';
       const score = attempt.status !== 'graded' ? 'قيد المراجعة' : attempt.score || 0;
       const status = attempt.status !== 'graded' ? 'يحتاج تصحيح' : 'مقيّم';
       const date = new Date(attempt.completed_at || attempt.created_at).toLocaleString('ar-EG');
       return `"${name}","${section}","${score}","${maxScore}","${status}","${date}"`;
    });
    
    const csvContent = '\uFEFF' + [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نتائج_${examData?.title || 'الاختبار'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لطباعة الكشف."); return; }

    const tableRows = filteredAttempts.map((attempt, index) => {
       const name = attempt?.student?.users?.full_name || 'طالب مجهول';
       const section = attempt?.student?.section?.name ? `${attempt.student.section?.classes?.name || ''} - ${attempt.student.section.name}` : 'بدون فصل';
       const score = attempt.status !== 'graded' ? '؟' : attempt.score || 0;
       const date = new Date(attempt.completed_at || attempt.created_at).toLocaleDateString('ar-EG');
       return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${name}</strong></td>
          <td>${section}</td>
          <td style="text-align: center; font-weight: bold; color: ${attempt.status !== 'graded' ? '#94a3b8' : '#4f46e5'}">${score} / ${maxScore}</td>
          <td style="text-align: center;">${date}</td>
        </tr>`;
    }).join('');

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف درجات - ${examData?.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { color: #4f46e5; margin: 0 0 10px 0; font-size: 28px; }
            .info-grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; font-size: 16px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background-color: #4f46e5; color: white; padding: 15px; text-align: right; }
            th:nth-child(4), th:nth-child(5) { text-align: center; }
            td { padding: 15px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #64748b; }
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .info-grid { border: 1px solid #000; background: #f8fafc !important;}
              table, th, td { border: 1px solid #000; }
              th { background-color: #f1f5f9 !important; color: #000 !important; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 كشف درجات الطلاب</h1>
            <h2>${examData?.title || 'اختبار'}</h2>
          </div>
          
          <div class="info-grid">
            <div><strong>الفصل المعروض:</strong> ${sectionFilter === 'all' ? 'جميع الفصول' : sectionFilter}</div>
            <div><strong>عدد المحاولات بالجدول:</strong> ${filteredAttempts.length}</div>
            <div><strong>العلامة الكاملة:</strong> ${maxScore}</div>
            <div><strong>متوسط الدرجات:</strong> ${averageScore}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="35%">اسم الطالب</th>
                <th width="20%">الفصل</th>
                <th width="20%">الدرجة</th>
                <th width="20%">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            تم إصدار هذا الكشف تلقائياً من المنصة الرقمية بتاريخ ${new Date().toLocaleString('ar-EG')}
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 800); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-transparent pb-24 font-cairo text-slate-100 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية */}
      <div className="fixed top-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 relative z-10">
        
        {/* 🚀 Top Bar: Back button and Export Tools */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/exams" className="flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-400 font-bold transition-colors glass-panel px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-inner border border-white/5 w-full sm:w-auto active:scale-95 group text-sm sm:text-base">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" /> العودة للاختبارات
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button onClick={exportToPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-rose-500/10 text-rose-400 text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-inner active:scale-95">
               <Printer className="w-4 h-4 sm:w-5 sm:h-5" /> طباعة PDF
            </button>
            <button onClick={exportToExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-900 transition-all shadow-inner active:scale-95">
               <Download className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إكسل
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {/* Header Card */}
          <div className="lg:col-span-2 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[#0f1423]/60">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
            <div className="relative z-10 text-center sm:text-right">
              <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg sm:rounded-xl shadow-inner">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                <h2 className="text-[10px] sm:text-xs font-black tracking-widest uppercase">نتائج الاختبار</h2>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight mb-4 sm:mb-6 drop-shadow-md">{examData?.title || 'جاري التحميل...'}</h1>
              
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-slate-300">
                 <span className="bg-[#02040a]/60 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl border border-white/5 shadow-inner">
                   العلامة الكاملة: <span className="text-white mx-1">{maxScore}</span>
                 </span>
                 <span className="bg-[#02040a]/60 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl border border-white/5 flex items-center gap-1.5 shadow-inner">
                   <Clock className="h-3.5 w-3.5 text-slate-400" /> {examData?.duration ? `${examData.duration} دقيقة` : 'مفتوح'}
                 </span>
              </div>
            </div>
          </div>

          {/* Average Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_10px_30px_rgba(79,70,229,0.3)] border border-indigo-400/50 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-white opacity-10 rounded-full blur-[60px] pointer-events-none mix-blend-overlay"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
               <div>
                  <div className="text-indigo-200 font-black mb-1 sm:mb-2 text-[10px] sm:text-xs uppercase tracking-widest drop-shadow-sm">متوسط العلامات</div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-white drop-shadow-md">{averageScore} <span className="text-lg sm:text-2xl opacity-60">/ {maxScore}</span></div>
               </div>
               <div className="bg-white/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 shadow-inner backdrop-blur-sm">
                 <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-md" />
               </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-4 sm:pt-5 relative z-10">
               <span className="text-indigo-100 font-bold text-xs sm:text-sm">عدد التسليمات الكلي</span>
               <span className="bg-[#02040a]/40 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg font-black text-white shadow-inner text-sm sm:text-base border border-white/10">{attempts.length}</span>
            </div>
          </div>
        </div>

        {/* 🚀 أدوات البحث والفلترة المتقدمة (Glass Theme) */}
        <div className="glass-panel p-4 sm:p-5 lg:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 pointer-events-none transition-colors">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold transition-all shadow-inner outline-none placeholder:text-slate-500"
              placeholder="ابحث عن اسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* فلتر الفصول */}
          <div className="relative min-w-[200px] lg:w-64 group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 pointer-events-none transition-colors z-10">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <select
              className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold transition-all appearance-none cursor-pointer outline-none shadow-inner [&>option]:bg-[#0f1423]"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              <option value="all">جميع الفصول</option>
              {uniqueSections.map((sec: any) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* فلتر الحالة */}
          <div className="relative min-w-[200px] lg:w-64 group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-5 text-slate-500 group-focus-within:text-indigo-400 pointer-events-none transition-colors z-10">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <select
              className="block w-full rounded-xl sm:rounded-2xl border-0 py-3.5 sm:py-4 pr-10 sm:pr-12 pl-4 text-white bg-[#02040a]/60 focus:bg-[#02040a] focus:ring-2 focus:ring-indigo-500/50 text-xs sm:text-sm font-bold transition-all appearance-none cursor-pointer outline-none shadow-inner [&>option]:bg-[#0f1423]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">حالة التصحيح (الكل)</option>
              <option value="pending">بحاجة للتصحيح ({pendingCount})</option>
              <option value="graded">تم التقييم ({gradedAttempts.length})</option>
            </select>
          </div>
        </div>

        {/* 🚀 جدول النتائج الملكي المظلم */}
        <div className="glass-panel rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 overflow-hidden shadow-lg bg-[#0f1423]/40">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-16 sm:py-24 px-4 bg-[#02040a]/40 border border-dashed border-white/10 rounded-[1.5rem] sm:rounded-[2rem] m-4 sm:m-6 shadow-inner">
              <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-1 drop-shadow-sm">لا توجد نتائج مسجلة</h3>
              <p className="text-xs sm:text-sm font-bold text-slate-400">حاول تغيير خيارات البحث والفلترة لعرض النتائج.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#02040a]/80 border-b border-white/10">
                    <th className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">الطالب</th>
                    <th className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">الدرجة</th>
                    <th className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">الحالة</th>
                    <th className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">التاريخ</th>
                    <th className="px-4 sm:px-6 py-4 sm:py-5 text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent">
                  {filteredAttempts.map((attempt: any) => {
                    const studentName = attempt?.student?.users?.full_name || 'طالب مجهول';
                    const sectionName = attempt?.student?.section?.name ? `${attempt.student.section?.classes?.name || ''} - ${attempt.student.section.name}` : 'بدون فصل';
                    const date = new Date(attempt.completed_at || attempt.created_at);
                    const isPending = attempt.status !== 'graded';

                    return (
                      <tr key={attempt.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner shrink-0 font-black text-lg group-hover:border-indigo-500/30 transition-colors">
                              {studentName.charAt(0)}
                            </div>
                            <div className="min-w-0 pr-1">
                               <div className="font-black text-white text-sm sm:text-base truncate drop-shadow-sm group-hover:text-indigo-400 transition-colors mb-1">{studentName}</div>
                               <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Users className="w-3 h-3" /> {sectionName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border shadow-inner ${isPending ? 'bg-[#02040a] text-slate-500 border-white/5' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'}`}>
                            {isPending ? '؟' : (attempt.score || 0)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-center whitespace-nowrap">
                          {!isPending ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs border border-emerald-500/20 shadow-inner">
                              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> مقيّم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs border border-amber-500/20 animate-pulse shadow-inner">
                              <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> قيد المراجعة
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-center text-[10px] sm:text-xs font-bold text-slate-400 whitespace-nowrap bg-[#02040a]/40 border-x border-white/5" dir="ltr">
                          <span className="block">{date.toLocaleDateString('en-GB')}</span>
                          <span className="block mt-0.5 opacity-60">{date.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => router.push(`/exams/results/${params.id}/student/${attempt.student_id}`)}
                              className={`h-9 sm:h-10 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 rounded-xl font-black transition-all shadow-inner shrink-0 text-[10px] sm:text-xs active:scale-95 ${isPending ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-slate-950 border border-indigo-500/30'}`}
                            >
                              {isPending ? <Edit2 className="h-3.5 w-3.5 sm:h-4 w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 w-4" />} 
                              {isPending ? 'صحح' : 'النتيجة'}
                            </button>
                            
                            <button 
                              onClick={() => handleDeleteAttempt(attempt.id)}
                              disabled={isDeleting === attempt.id}
                              title="حذف المحاولة (يتيح للطالب الإعادة)"
                              className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-black hover:bg-rose-500 hover:text-white transition-all shadow-inner shrink-0 disabled:opacity-50 active:scale-95"
                            >
                              {isDeleting === attempt.id ? (
                                <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
