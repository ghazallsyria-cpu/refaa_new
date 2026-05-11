// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Users, Star, MessageSquare, Loader2, Search, 
  TrendingUp, TrendingDown, Trophy, AlertTriangle, X, Power, Trash2, Settings, Plus, Layers, UserCircle, CheckCircle2, List, Eye, Filter, Save, PrinterIcon, DownloadCloud, Activity, Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const StarDisplay = ({ val }: { val: number }) => (
  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-sm border border-amber-500/20 shadow-inner w-fit">
    <Star className="w-3.5 h-3.5 fill-amber-500 drop-shadow-sm" /> {(val || 0).toFixed(1)}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl">
        <p className="font-black text-white text-base mb-1">{label}</p>
        <p className="text-emerald-400 font-bold text-sm">متوسط التقييم: <span className="font-black text-white">{payload[0].value.toFixed(2)}</span> / 5</p>
      </div>
    );
  }
  return null;
};

export default function StudentEvaluationsDashboard() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingTeacherPDF, setIsExportingTeacherPDF] = useState(false); // 🚀 تصدير تقرير المعلم
  const [activeTab, setActiveTab] = useState<'stats' | 'details'>('stats');
  
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [allRawEvaluations, setAllRawEvaluations] = useState<any[]>([]);
  
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchClass, setSearchClass] = useState('');

  const [settingsId, setSettingsId] = useState<any>(null);
  const [isMiddleActive, setIsMiddleActive] = useState(false);
  const [isHighActive, setIsHighActive] = useState(false);
  const [criteria, setCriteria] = useState<string[]>([]);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // 🚀 ملف الـ 360 درجة للمعلم
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isTeacherProfileOpen, setIsTeacherProfileOpen] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);
  const teacherPdfRef = useRef<HTMLDivElement>(null); // 🚀 مرجع لتقرير المعلم الفردي

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    if (!['admin', 'management'].includes(currentRole)) return;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: settingsData } = await supabase.from('platform_settings').select('id, evaluations_middle_active, evaluations_high_active, evaluation_criteria').limit(1).maybeSingle();
        if (settingsData) {
           setSettingsId(settingsData.id);
           setIsMiddleActive(settingsData.evaluations_middle_active || false);
           setIsHighActive(settingsData.evaluations_high_active || false);
           let parsed = ["المحور العلمي", "المحور الإداري", "المحور الإنساني"];
           if (settingsData.evaluation_criteria) {
               parsed = Array.isArray(settingsData.evaluation_criteria) ? settingsData.evaluation_criteria : JSON.parse(settingsData.evaluation_criteria);
           }
           setCriteria(parsed);
        }

        const { data: sectionsData } = await supabase.from('sections').select('id, name, classes(name)').order('name');
        setSections((sectionsData || []).map(s => ({ id: s.id, full_name: `${Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name || ''} - ${s.name}`.trim() })));
      } catch(e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    loadInitialData();
  }, [currentRole]);

  const fetchEvaluations = async () => {
    setIsFetchingData(true);
    try {
      let query = supabase
        .from('student_evaluations_of_teachers')
        .select(`
          id, created_at, feedback, dynamic_ratings, scientific_rating, management_rating, humanity_rating, subject_name,
          teachers(id, users(full_name, avatar_url)),
          students!inner(users(full_name), section_id, sections(name, classes(name)))
        `)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester);

      if (selectedSectionId !== 'all') {
          query = query.eq('students.section_id', selectedSectionId);
      } else {
          query = query.limit(1000); 
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const formattedRaw = (data || []).map((ev: any) => {
         const tUser = Array.isArray(ev.teachers?.users) ? ev.teachers.users[0] : ev.teachers?.users;
         const sUser = Array.isArray(ev.students?.users) ? ev.students.users[0] : ev.students?.users;
         const sClass = Array.isArray(ev.students?.sections?.classes) ? ev.students.sections.classes[0]?.name : ev.students?.sections?.classes?.name;
         
         let avg = 0;
         let sci = 0, mgt = 0, hum = 0;

         try {
             if (ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object' && Object.keys(ev.dynamic_ratings).length > 0) {
                const keys = Object.keys(ev.dynamic_ratings);
                sci = Number(ev.dynamic_ratings[keys[0]] || 0);
                mgt = Number(ev.dynamic_ratings[keys[1]] || sci);
                hum = Number(ev.dynamic_ratings[keys[2]] || sci);

                const vals = Object.values(ev.dynamic_ratings).map(Number).filter(n => !isNaN(n));
                if (vals.length > 0) avg = vals.reduce((a, b) => a + b, 0) / vals.length;
             } else {
                sci = Number(ev.scientific_rating)||0;
                mgt = Number(ev.management_rating)||0;
                hum = Number(ev.humanity_rating)||0;
                avg = (sci + mgt + hum) / 3;
             }
         } catch(e) { avg = 0; }

         return {
            id: ev.id,
            teacher_id: ev.teachers?.id,
            teacher_name: tUser?.full_name || 'معلم',
            teacher_avatar: tUser?.avatar_url,
            student_name: sUser?.full_name || 'طالب غير معروف',
            class_name: `${sClass || ''} - ${ev.students?.sections?.name || ''}`.trim(),
            subject: ev.subject_name,
            feedback: ev.feedback,
            date: ev.created_at,
            avg_score: isNaN(avg) ? 0 : avg,
            sci_score: isNaN(sci) ? 0 : sci,
            mgt_score: isNaN(mgt) ? 0 : mgt,
            hum_score: isNaN(hum) ? 0 : hum,
            dynamic_ratings: ev.dynamic_ratings
         };
      });
      setAllRawEvaluations(formattedRaw);

      // 🚀 تجميع البيانات وإنشاء إحصائيات دقيقة لكل معلم (Dynamic Averages)
      const groupedData = formattedRaw.reduce((acc: any, curr: any) => {
        const tId = curr.teacher_id;
        if (!acc[tId]) {
          acc[tId] = {
            teacher_id: tId, name: curr.teacher_name, avatar: curr.teacher_avatar, subject: curr.subject,
            total_evals: 0, sum_score: 0, sum_sci: 0, sum_mgt: 0, sum_hum: 0, feedbacks: [],
            dynamic_sums: {}
          };
        }
        acc[tId].total_evals += 1;
        acc[tId].sum_score += curr.avg_score;
        acc[tId].sum_sci += curr.sci_score;
        acc[tId].sum_mgt += curr.mgt_score;
        acc[tId].sum_hum += curr.hum_score;

        // تجميع البنود الديناميكية
        if (curr.dynamic_ratings && typeof curr.dynamic_ratings === 'object') {
            Object.entries(curr.dynamic_ratings).forEach(([k, v]) => {
                if(!isNaN(Number(v))) {
                   acc[tId].dynamic_sums[k] = (acc[tId].dynamic_sums[k] || 0) + Number(v);
                }
            });
        }

        if (curr.feedback && curr.feedback.trim() !== '') {
            acc[tId].feedbacks.push({ text: curr.feedback, date: curr.date, student: curr.student_name, class: curr.class_name });
        }
        return acc;
      }, {});

      const finalStats = Object.values(groupedData).map((t: any) => {
        // حساب المتوسطات الفردية لكل بند ديناميكي
        const dynamic_avgs = Object.keys(t.dynamic_sums).length > 0 
           ? Object.entries(t.dynamic_sums).map(([k, sum]) => ({ subject: k, A: Number((sum as number / t.total_evals).toFixed(2)), fullMark: 5 }))
           : [
               { subject: 'المحور العلمي', A: Number((t.sum_sci / t.total_evals).toFixed(2)), fullMark: 5 },
               { subject: 'المحور الإداري', A: Number((t.sum_mgt / t.total_evals).toFixed(2)), fullMark: 5 },
               { subject: 'المحور الإنساني', A: Number((t.sum_hum / t.total_evals).toFixed(2)), fullMark: 5 }
             ];

        return {
          ...t, 
          overall_avg: t.total_evals > 0 ? (t.sum_score / t.total_evals) : 0,
          sci_avg: t.total_evals > 0 ? (t.sum_sci / t.total_evals) : 0,
          mgt_avg: t.total_evals > 0 ? (t.sum_mgt / t.total_evals) : 0,
          hum_avg: t.total_evals > 0 ? (t.sum_hum / t.total_evals) : 0,
          dynamic_avgs
        };
      }).sort((a: any, b: any) => b.overall_avg - a.overall_avg);

      setTeacherStats(finalStats);
    } catch(err) { console.error(err); }
    finally { setIsFetchingData(false); }
  };

  useEffect(() => { if (['admin', 'management'].includes(currentRole)) fetchEvaluations(); }, [selectedSectionId, currentRole]);

  const addCriterion = () => {
    if (newCriterion.trim() && !criteria.includes(newCriterion.trim())) {
        setCriteria(prev => [...prev, newCriterion.trim()]);
        setNewCriterion('');
    }
  };
  const removeCriterion = (c: string) => { setCriteria(prev => prev.filter(item => item !== c)); };

  const saveSettings = async () => {
     if (!settingsId || criteria.length === 0) { alert('يجب إضافة بند واحد على الأقل.'); return; }
     setIsSavingSettings(true);
     try {
       await supabase.from('platform_settings').update({ evaluations_middle_active: isMiddleActive, evaluations_high_active: isHighActive, evaluation_criteria: criteria, is_evaluations_active: isMiddleActive || isHighActive }).eq('id', settingsId);
       setIsSettingsOpen(false); alert('تم حفظ الإعدادات بنجاح!');
     } catch(e) { alert('حدث خطأ في الحفظ'); }
     finally { setIsSavingSettings(false); }
  };

  const deleteEvaluation = async (id: string, name: string) => {
      if (!confirm(`حذف تقييم الطالب (${name})؟`)) return;
      try {
          await supabase.from('student_evaluations_of_teachers').delete().eq('id', id);
          setAllRawEvaluations(prev => prev.filter(ev => ev.id !== id));
          fetchEvaluations();
      } catch(e) { alert('فشل الحذف'); }
  };

  // 🚀 دالة تصدير تقرير المدرسة الكامل
  const exportToPDF = async () => {
    if (!pdfRef.current) return;
    setIsExportingPDF(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`التقرير_الشامل_لتقييم_المعلمين.pdf`);
    } catch (e) { alert('حدث خطأ أثناء التصدير.'); } finally { setIsExportingPDF(false); }
  };

  // 🚀 دالة تصدير تقرير المعلم الفردي الـ 360 درجة
  const exportTeacherPDF = async () => {
    if (!teacherPdfRef.current || !selectedTeacher) return;
    setIsExportingTeacherPDF(true);
    try {
      const canvas = await html2canvas(teacherPdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير_الاداء_للمعلم_${selectedTeacher.name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { alert('حدث خطأ أثناء التصدير.'); } finally { setIsExportingTeacherPDF(false); }
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  const topTeachers = teacherStats.slice(0, 5);
  const bottomTeacher = teacherStats.filter(t => t.overall_avg < 3.5).reverse()[0];
  const filteredTeacherStats = teacherStats.filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase()));
  const filteredRaw = allRawEvaluations.filter(ev => ev.teacher_name.toLowerCase().includes(searchTeacher.toLowerCase()) && ev.class_name.toLowerCase().includes(searchClass.toLowerCase()));

  const chartData = topTeachers.map(t => ({ name: t.name.split(' ')[0] + ' ' + (t.name.split(' ')[1] || ''), score: Number(t.overall_avg.toFixed(2)) }));

  const globalAverages = {
      sci: teacherStats.reduce((acc, t) => acc + t.sci_avg, 0) / (teacherStats.length || 1),
      mgt: teacherStats.reduce((acc, t) => acc + t.mgt_avg, 0) / (teacherStats.length || 1),
      hum: teacherStats.reduce((acc, t) => acc + t.hum_avg, 0) / (teacherStats.length || 1),
      overall: teacherStats.reduce((acc, t) => acc + t.overall_avg, 0) / (teacherStats.length || 1)
  };

  const radarData = [
    { subject: criteria[0] || 'الجانب العلمي', A: Number(globalAverages.sci.toFixed(2)), fullMark: 5 },
    { subject: criteria[1] || 'الجانب الإداري', A: Number(globalAverages.mgt.toFixed(2)), fullMark: 5 },
    { subject: criteria[2] || 'الجانب الإنساني', A: Number(globalAverages.hum.toFixed(2)), fullMark: 5 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-indigo-600"><Loader2 className="w-12 h-12 animate-spin" /><span className="font-black text-lg">تحميل نظام الذكاء الإداري...</span></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
        
        {/* الهيدر الإداري */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 to-purple-500/5 blur-[100px] pointer-events-none rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-100 shadow-inner">
                <Activity className="w-3.5 h-3.5" /> نظام ذكاء الأعمال (BI)
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight">
                لوحة قياس جودة التدريس
              </h1>
              <p className="text-slate-500 font-bold text-sm max-w-xl leading-relaxed">تحليل عميق لأداء المعلمين بناءً على استبيانات الطلاب السرية، لمساعدتك في اتخاذ قرارات إدارية مبنية على البيانات.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button onClick={exportToPDF} disabled={isExportingPDF || teacherStats.length === 0} className="w-full md:w-auto px-6 py-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                 {isExportingPDF ? <Loader2 className="w-6 h-6 animate-spin"/> : <DownloadCloud className="w-6 h-6" />} تصدير تقرير المدرسة
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="w-full md:w-auto px-6 py-4 rounded-2xl border bg-slate-900 border-slate-800 text-white hover:bg-black font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                 <Settings className="w-6 h-6" /> إعدادات البوابة
              </button>
            </div>
          </div>
        </div>

        {/* الفلتر السحابي */}
        <div className="bg-white border border-slate-200 p-4 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative z-10">
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner"><Filter className="w-5 h-5"/></div>
              <div><p className="font-black text-sm text-slate-800">نطاق التحليل البياناتي:</p></div>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              {isFetchingData && <Loader2 className="w-5 h-5 animate-spin text-indigo-500 shrink-0" />}
              <select 
                 value={selectedSectionId} 
                 onChange={(e) => setSelectedSectionId(e.target.value)} 
                 className="w-full sm:w-72 bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-inner"
              >
                 <option value="all">التحليل الشامل للمدرسة (أحدث 1000 صوت)</option>
                 {sections.map(sec => <option key={sec.id} value={sec.id}>تحليل فصل: {sec.full_name}</option>)}
              </select>
           </div>
        </div>

        {/* التبويبات */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto sm:mx-0 relative z-10">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><TrendingUp className="w-4 h-4"/> لوحة التحليل المدرسي</button>
           <button onClick={() => setActiveTab('details')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><List className="w-4 h-4"/> السجل التفصيلي (الطلاب)</button>
        </div>

        {activeTab === 'stats' ? (
          <div className="space-y-6" ref={pdfRef}>
              
              {/* 🚀 بطاقات الـ KPIs الذكية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:border-indigo-300 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4 border border-indigo-100 shadow-inner"><Users className="w-6 h-6"/></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي الأصوات</p>
                    <p className="text-3xl font-black text-slate-800">{allRawEvaluations.length}</p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:border-emerald-300 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-4 border border-emerald-100 shadow-inner"><Star className="w-6 h-6"/></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">متوسط الرضا العام</p>
                    <p className="text-3xl font-black text-emerald-600 flex items-baseline gap-1">{globalAverages.overall.toFixed(2)} <span className="text-sm font-bold text-slate-400">/ 5</span></p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:border-amber-300 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors"></div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-4 border border-amber-100 shadow-inner"><Trophy className="w-6 h-6"/></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">المعلم الأعلى تقييماً</p>
                    <p className="text-xl font-black text-slate-800 truncate">{topTeachers[0]?.name || 'لا يوجد'}</p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:border-rose-300 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit mb-4 border border-rose-100 shadow-inner"><AlertTriangle className="w-6 h-6"/></div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">يحتاج تدخل وتطوير</p>
                    <p className="text-xl font-black text-rose-600 truncate">{bottomTeacher?.name || 'الكل بأداء ممتاز'}</p>
                 </div>
              </div>

              {/* 🚀 قسم الرسوم البيانية */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Bar Chart */}
                 <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                    <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-indigo-500"/> تصنيف الأداء (أفضل المعلمين)</h2>
                    <div className="h-[300px] w-full mt-4" dir="ltr">
                       {chartData.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                             <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dx={-10} />
                             <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                             <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={40}>
                               {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 3.5 ? '#f59e0b' : '#f43f5e'} />
                               ))}
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                       ) : (
                         <div className="flex items-center justify-center h-full text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">لا توجد بيانات كافية</div>
                       )}
                    </div>
                 </div>

                 {/* Radar Chart */}
                 <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden flex flex-col">
                    <h2 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-fuchsia-500"/> رادار جودة المدرسة</h2>
                    <p className="text-[10px] font-bold text-slate-500 text-center mb-4">متوسط الأداء العام في كل محور</p>
                    <div className="flex-1 w-full min-h-[250px]" dir="ltr">
                       {teacherStats.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                               <PolarGrid stroke="#e2e8f0" />
                               <PolarAngleAxis dataKey="subject" tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                               <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                               <Radar name="المتوسط العام" dataKey="A" stroke="#8b5cf6" fill="#d946ef" fillOpacity={0.3} />
                               <Tooltip content={<CustomTooltip />} />
                             </RadarChart>
                          </ResponsiveContainer>
                       ) : (
                          <div className="flex items-center justify-center h-full text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">لا يوجد بيانات</div>
                       )}
                    </div>
                 </div>
              </div>

              {/* 🚀 تصنيف المعلمين (قائمة تفاعلية) */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> تحليل الأداء الفردي للمعلمين</h3>
                  <div className="relative w-full sm:w-72 print:hidden">
                     <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:border-indigo-500 shadow-sm outline-none transition-colors" placeholder="ابحث عن معلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} />
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTeacherStats.map(t => {
                    const isElite = t.overall_avg >= 4.5;
                    const isWarning = t.overall_avg < 3.5;

                    return (
                      <div key={t.teacher_id} className={`bg-white border-2 rounded-[2rem] p-6 hover:shadow-xl transition-all flex flex-col group cursor-pointer ${isWarning ? 'border-rose-100 hover:border-rose-300' : isElite ? 'border-amber-200 hover:border-amber-400 bg-gradient-to-b from-white to-amber-50/30' : 'border-slate-100 hover:border-indigo-200'}`} onClick={() => { setSelectedTeacher(t); setIsTeacherProfileOpen(true); }}>
                        <div className="flex items-start justify-between mb-5 border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-[1.2rem] border-2 shadow-sm overflow-hidden shrink-0 flex items-center justify-center ${isWarning ? 'border-rose-200 bg-rose-50 text-rose-500' : isElite ? 'border-amber-300 bg-amber-100 text-amber-600' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                                 {t.avatar ? <img src={t.avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-8 h-8"/>}
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-800 text-base leading-tight group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                                 <p className="text-[11px] font-bold text-slate-500 mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit">{t.subject}</p>
                              </div>
                            </div>
                            <div className="text-center">
                               <p className={`text-2xl font-black flex items-baseline gap-0.5 ${isWarning ? 'text-rose-600' : isElite ? 'text-amber-500' : 'text-emerald-600'}`}>{t.overall_avg.toFixed(1)} <Star className="w-3 h-3 fill-current"/></p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">من {t.total_evals} صوت</p>
                            </div>
                        </div>

                        <button className="w-full mt-auto py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 print:hidden shadow-md active:scale-95">
                          <Target className="w-4 h-4"/> عرض الملف الشامل (360 درجة)
                        </button>
                      </div>
                    );
                  })}
                  {filteredTeacherStats.length === 0 && <p className="col-span-full text-center py-12 font-bold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا يوجد بيانات مطابقة للبحث.</p>}
                </div>
              </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row items-center justify-between gap-4">
                 <h3 className="font-black text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> تتبع الطلاب (سجل الرقابة)</h3>
                 <div className="flex gap-3 w-full sm:w-auto">
                    <input type="text" className="w-full sm:w-48 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold outline-none focus:border-indigo-500 shadow-sm" placeholder="بحث بمعلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} />
                    <input type="text" className="w-full sm:w-48 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold outline-none focus:border-indigo-500 shadow-sm" placeholder="بحث بفصل..." value={searchClass} onChange={(e) => setSearchClass(e.target.value)} />
                 </div>
             </div>
             <div className="overflow-x-auto custom-scrollbar p-2">
                <table className="w-full text-right border-collapse min-w-[900px]">
                   <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                      <tr>
                         <th className="p-4 rounded-r-xl">الطالب / الفصل</th>
                         <th className="p-4">المعلم / المادة</th>
                         <th className="p-4">التقييم التفصيلي</th>
                         <th className="p-4 w-[300px]">الرسالة / التعليق</th>
                         <th className="p-4 rounded-l-xl text-center w-16">إجراء</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredRaw.map(ev => (
                         <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                            <td className="p-4">
                               <p className="font-black text-slate-800 text-sm leading-tight">{ev.student_name}</p>
                               <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1.5 inline-block">{ev.class_name}</span>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">{ev.teacher_avatar ? <img src={ev.teacher_avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-400 p-1"/>}</div>
                                 <div><p className="font-bold text-slate-800 text-sm leading-tight">{ev.teacher_name}</p><p className="text-[10px] text-slate-500 font-bold mt-0.5">{ev.subject}</p></div>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col gap-1.5 w-56">
                                 {ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object' && Object.keys(ev.dynamic_ratings).length > 0 ? Object.entries(ev.dynamic_ratings).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center text-[9px] font-bold bg-white px-2 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                       <span className="truncate w-32 text-slate-600" title={k}>{k}</span>
                                       <span className="font-black text-amber-600 flex items-center gap-0.5">{v} <Star className="w-3 h-3 fill-amber-500"/></span>
                                    </div>
                                 )) : <span className="text-[10px] font-bold text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">نظام قديم: {ev.avg_score.toFixed(1)}⭐</span>}
                               </div>
                            </td>
                            <td className="p-4">
                               <p className="text-xs font-bold text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-sm line-clamp-3">{ev.feedback || <span className="text-slate-400 italic">لا يوجد تعليق</span>}</p>
                            </td>
                            <td className="p-4 text-center">
                               <button onClick={() => deleteEvaluation(ev.id, ev.student_name)} className="p-2.5 text-rose-400 bg-white hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 shadow-sm opacity-50 group-hover:opacity-100 active:scale-90" title="حذف هذا التقييم"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                      {filteredRaw.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">لا توجد سجلات مطابقة.</td></tr>}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* 🚀 نافذة الإعدادات */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsSettingsOpen(false)}></div>
           
           <div className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl" dir="rtl">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-inner"><Settings className="w-6 h-6"/></div>
                     <div>
                       <h2 className="text-lg font-black text-slate-800 leading-tight">إعدادات بوابة التقييم</h2>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">التحكم بالمراحل وبنود الاستبيان</p>
                     </div>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm transition-colors active:scale-90"><X className="w-5 h-5"/></button>
               </div>

               <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                     <p className="text-sm font-black text-slate-800 flex items-center gap-2"><Power className="w-4 h-4 text-indigo-500"/> تفعيل البوابة الإلزامية</p>
                     <div className="flex gap-4">
                        <button onClick={() => setIsMiddleActive(!isMiddleActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isMiddleActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100")}>
                           <span>المتوسطة</span>
                           <span className="text-[10px] opacity-80">{isMiddleActive ? 'تعمل الآن' : 'موقفة'}</span>
                        </button>
                        <button onClick={() => setIsHighActive(!isHighActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isHighActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100")}>
                           <span>الثانوية</span>
                           <span className="text-[10px] opacity-80">{isHighActive ? 'تعمل الآن' : 'موقفة'}</span>
                        </button>
                     </div>
                  </div>
                 
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                     <p className="text-sm font-black text-slate-800 flex items-center gap-2"><List className="w-4 h-4 text-indigo-500"/> بنود الاستبيان (المحاور)</p>
                     <div className="flex gap-2 mb-4">
                        <input type="text" value={newCriterion} onChange={e=>setNewCriterion(e.target.value)} placeholder="أضف محوراً جديداً..." className="flex-1 bg-slate-50 border rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
                        <button onClick={addCriterion} className="p-3 px-5 bg-slate-800 text-white rounded-xl active:scale-95 shadow-md hover:bg-slate-900 transition-colors"><Plus className="w-6 h-6"/></button>
                     </div>
                     <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {criteria && criteria.length > 0 ? criteria.map((c, i) => (
                           <div key={`crit-${i}`} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                              <span className="text-xs font-black text-slate-700">{c}</span>
                              <button onClick={() => removeCriterion(c)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors border border-rose-100 active:scale-90"><Trash2 className="w-4 h-4"/></button>
                           </div>
                        )) : <div className="text-center py-4 bg-rose-50 border border-rose-200 border-dashed rounded-xl"><p className="text-xs font-bold text-rose-500">لا توجد بنود مضافة!</p></div>}
                     </div>
                  </div>
               </div>

               <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button onClick={saveSettings} disabled={isSavingSettings} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                     {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> حفظ الإعدادات بالكامل</>}
                  </button>
               </div>
           </div>
        </div>
      )}

      {/* 🚀 ملف 360 درجة الخاص بالمعلم (Teacher 360 Profile) */}
      {isTeacherProfileOpen && selectedTeacher && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsTeacherProfileOpen(false)}></div>
           
           <div className="bg-white rounded-[2rem] w-full max-w-5xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
              
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Target className="w-6 h-6"/></div>
                    <div>
                       <h2 className="text-lg font-black text-slate-800 leading-tight">الملف التحليلي للمعلم (360 درجة)</h2>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">تقرير تفصيلي خاص وموجّه للإدارة فقط.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={exportTeacherPDF} disabled={isExportingTeacherPDF} className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-black text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                       {isExportingTeacherPDF ? <Loader2 className="w-4 h-4 animate-spin"/> : <DownloadCloud className="w-4 h-4"/>} طباعة التقرير الفردي
                    </button>
                    <button onClick={() => setIsTeacherProfileOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm transition-colors active:scale-90"><X className="w-5 h-5"/></button>
                 </div>
              </div>

              {/* المنطقة التي سيتم تحويلها لـ PDF */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50" ref={teacherPdfRef}>
                 
                 {/* 1. الهيدر التعريفي للمعلم */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-6 mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0">
                       {selectedTeacher.avatar ? <img src={selectedTeacher.avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-300 p-2"/>}
                    </div>
                    <div className="flex-1 text-center sm:text-right">
                       <h2 className="text-2xl font-black text-slate-800">{selectedTeacher.name}</h2>
                       <p className="text-xs font-bold text-slate-500 mt-1 bg-slate-100 px-3 py-1 rounded-lg w-fit mx-auto sm:mx-0 border border-slate-200">{selectedTeacher.subject}</p>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-4 text-center">
                       <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-500 uppercase">إجمالي الأصوات</p>
                          <p className="text-2xl font-black text-indigo-700">{selectedTeacher.total_evals}</p>
                       </div>
                       <div className="bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
                          <p className="text-[10px] font-black text-amber-600 uppercase">المتوسط العام</p>
                          <p className="text-2xl font-black text-amber-600 flex items-center justify-center gap-1">{selectedTeacher.overall_avg.toFixed(2)} <Star className="w-4 h-4 fill-amber-500"/></p>
                       </div>
                    </div>
                 </div>

                 {/* 2. شبكة التحليل (Charts & Progress) */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    
                    {/* الرادار الخاص بالمعلم */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                       <h3 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500"/> البصمة الأكاديمية (رادار الأداء)</h3>
                       <div className="flex-1 min-h-[250px]" dir="ltr">
                          <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="70%" data={selectedTeacher.dynamic_avgs}>
                               <PolarGrid stroke="#e2e8f0" />
                               <PolarAngleAxis dataKey="subject" tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                               <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                               <Radar name="أداء المعلم" dataKey="A" stroke="#10b981" fill="#34d399" fillOpacity={0.4} />
                             </RadarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* تفصيل البنود الديناميكية */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                       <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-500"/> تفصيل المحاور</h3>
                       <div className="space-y-6">
                          {selectedTeacher.dynamic_avgs.map((item: any, idx: number) => {
                             const percentage = (item.A / 5) * 100;
                             const color = percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                             return (
                               <div key={idx}>
                                  <div className="flex justify-between items-center mb-2 text-[10px] font-bold text-slate-500">
                                     <span className="truncate w-48 text-slate-700">{item.subject}</span>
                                     <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.A.toFixed(1)} / 5</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                                     <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${percentage}%` }}></div>
                                  </div>
                               </div>
                             );
                          })}
                       </div>
                    </div>
                 </div>

                 {/* 3. صندوق التعليقات */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-500"/> الرسائل والملاحظات المكتوبة ({selectedTeacher.feedbacks.length})</h3>
                    {selectedTeacher.feedbacks.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTeacher.feedbacks.map((fb: any, i: number) => (
                             <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">"{fb.text}"</p>
                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                                   <span className="bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm truncate max-w-[150px]">{fb.student} ({fb.class})</span>
                                   <span dir="ltr">{format(new Date(fb.date), 'dd/MM/yyyy')}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-xs font-bold text-slate-400">لم يكتب الطلاب أي تعليقات أو رسائل إضافية لهذا المعلم.</p>
                       </div>
                    )}
                 </div>

              </div>
           </div>
        </div>
      )}

      <style jsx global>{` 
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } 
        @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
