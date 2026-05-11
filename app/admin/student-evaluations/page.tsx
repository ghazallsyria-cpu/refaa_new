// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, Users, Star, MessageSquare, Loader2, Search, 
  TrendingUp, TrendingDown, Trophy, AlertTriangle, X, Power, Trash2, Settings, Plus, Layers, UserCircle, CheckCircle2, List, Eye, Filter, Save, PrinterIcon, DownloadCloud
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
// 🚀 استيراد مكتبات الرسوم البيانية والـ PDF
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const StarDisplay = ({ val }: { val: number }) => (
  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-sm border border-amber-500/20 shadow-inner w-fit">
    <Star className="w-3.5 h-3.5 fill-amber-500 drop-shadow-sm" /> {(val || 0).toFixed(1)}
  </div>
);

// 🚀 مخصص التلميحات للرسم البياني
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
        <p className="font-black text-white text-sm mb-1">{label}</p>
        <p className="text-amber-400 font-bold text-xs">متوسط التقييم: {payload[0].value.toFixed(2)} / 5</p>
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
  const [activeTab, setActiveTab] = useState<'stats' | 'details'>('stats');
  
  // الفلترة السحابية والفصول
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  
  // بيانات التقييمات
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [allRawEvaluations, setAllRawEvaluations] = useState<any[]>([]);
  
  // فلاتر الواجهة
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchClass, setSearchClass] = useState('');

  // إعدادات المنصة
  const [settingsId, setSettingsId] = useState<any>(null);
  const [isMiddleActive, setIsMiddleActive] = useState(false);
  const [isHighActive, setIsHighActive] = useState(false);
  const [criteria, setCriteria] = useState<string[]>([]);
  
  // النوافذ (Modals)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);

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
          query = query.limit(500); 
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const formattedRaw = (data || []).map((ev: any) => {
         const tUser = Array.isArray(ev.teachers?.users) ? ev.teachers.users[0] : ev.teachers?.users;
         const sUser = Array.isArray(ev.students?.users) ? ev.students.users[0] : ev.students?.users;
         const sClass = Array.isArray(ev.students?.sections?.classes) ? ev.students.sections.classes[0]?.name : ev.students?.sections?.classes?.name;
         
         let avg = 0;
         try {
             if (ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object' && Object.keys(ev.dynamic_ratings).length > 0) {
                const vals = Object.values(ev.dynamic_ratings).map(Number).filter(n => !isNaN(n));
                if (vals.length > 0) avg = vals.reduce((a, b) => a + b, 0) / vals.length;
             } else {
                avg = ((Number(ev.scientific_rating)||0) + (Number(ev.management_rating)||0) + (Number(ev.humanity_rating)||0)) / 3;
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
            dynamic_ratings: ev.dynamic_ratings
         };
      });
      setAllRawEvaluations(formattedRaw);

      const groupedData = formattedRaw.reduce((acc: any, curr: any) => {
        const tId = curr.teacher_id;
        if (!acc[tId]) {
          acc[tId] = {
            teacher_id: tId, name: curr.teacher_name, avatar: curr.teacher_avatar, subject: curr.subject,
            total_evals: 0, sum_score: 0, feedbacks: []
          };
        }
        acc[tId].total_evals += 1;
        acc[tId].sum_score += curr.avg_score;
        if (curr.feedback && curr.feedback.trim() !== '') {
            acc[tId].feedbacks.push({ text: curr.feedback, date: curr.date, student: curr.student_name, class: curr.class_name });
        }
        return acc;
      }, {});

      const finalStats = Object.values(groupedData).map((t: any) => ({
        ...t, overall_avg: t.total_evals > 0 ? (t.sum_score / t.total_evals) : 0
      })).sort((a: any, b: any) => b.overall_avg - a.overall_avg);

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
  
  const removeCriterion = (c: string) => { 
      setCriteria(prev => prev.filter(item => item !== c)); 
  };

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

  // 🚀 دالة تصدير تقرير PDF
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
      pdf.save(`تقرير_تقييم_المعلمين_${new Date().toLocaleDateString()}.pdf`);
    } catch (e) {
      alert('حدث خطأ أثناء تصدير التقرير.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  const topTeachers = teacherStats.slice(0, 3);
  const bottomTeachers = teacherStats.filter(t => t.overall_avg < 3.5).slice(-3).reverse();
  const filteredTeacherStats = teacherStats.filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase()));
  const filteredRaw = allRawEvaluations.filter(ev => ev.teacher_name.toLowerCase().includes(searchTeacher.toLowerCase()) && ev.class_name.toLowerCase().includes(searchClass.toLowerCase()));

  // 🚀 بيانات الرسم البياني
  const chartData = teacherStats.map(t => ({
     name: t.name,
     score: Number(t.overall_avg.toFixed(2))
  })).slice(0, 10); // عرض أفضل 10 معلمين في الرسم البياني لمنع الازدحام

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-indigo-600"><Loader2 className="w-12 h-12 animate-spin" /><span className="font-black text-lg">تحميل النظام...</span></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
        
        {/* الهيدر الإداري */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-indigo-600" /> مركز الرقابة والتقييم
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-2">متابعة أداء المعلمين من وجهة نظر الطلاب.</p>
              <div className="text-slate-500 font-bold text-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-3">
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة المتوسط: <strong className={isMiddleActive ? 'text-emerald-500' : 'text-rose-500'}>{isMiddleActive ? 'مفتوحة' : 'مغلقة'}</strong></span>
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة الثانوي: <strong className={isHighActive ? 'text-emerald-500' : 'text-rose-500'}>{isHighActive ? 'مفتوحة' : 'مغلقة'}</strong></span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* 🚀 زر تصدير التقرير PDF */}
              <button onClick={exportToPDF} disabled={isExportingPDF} className="w-full md:w-auto px-6 py-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                 {isExportingPDF ? <Loader2 className="w-6 h-6 animate-spin"/> : <DownloadCloud className="w-6 h-6" />} تقرير PDF
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="w-full md:w-auto px-6 py-4 rounded-2xl border bg-slate-800 border-slate-700 text-white hover:bg-slate-900 font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                 <Settings className="w-6 h-6" /> إعدادات البوابة
              </button>
            </div>
          </div>
        </div>

        {/* الفلتر السحابي */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Filter className="w-5 h-5"/></div>
              <div><p className="font-black text-sm text-slate-700">تحديد نطاق البحث:</p></div>
           </div>
           <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="w-full sm:w-80 bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all">
              <option value="all">كل الفصول (أحدث 500 تقييم)</option>
              {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.full_name}</option>)}
           </select>
        </div>

        {/* התבويبات */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto sm:mx-0">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><TrendingUp className="w-4 h-4"/> الإحصائيات</button>
           <button onClick={() => setActiveTab('details')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><List className="w-4 h-4"/> سجل الرقابة</button>
        </div>

        {activeTab === 'stats' ? (
          <div className="space-y-6" ref={pdfRef}>
              
              {/* 🚀 الرسم البياني الجديد (Chart) */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                 <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart2 className="w-6 h-6 text-indigo-500"/> مؤشر جودة الأداء (أفضل 10 معلمين)</h2>
                 <div className="h-[300px] w-full mt-4" dir="ltr">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                          <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dx={-10} />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                          <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={50}>
                            {chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 3.5 ? '#f59e0b' : '#f43f5e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">لا توجد بيانات كافية للرسم البياني</div>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-700">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-2xl rounded-full"></div>
                  <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 relative z-10"><Trophy className="w-6 h-6 text-amber-400"/> أفضل 3 معلمين (في هذا النطاق)</h2>
                  <div className="space-y-4 relative z-10">
                    {topTeachers.map((t, idx) => (
                      <div key={t.teacher_id} className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/10">
                        <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center font-black text-indigo-900 text-xl shadow-inner shrink-0 relative">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                        <div className="flex-1 min-w-0"><p className="text-white font-black truncate">{t.name}</p><p className="text-indigo-200 text-[10px] font-bold">{t.subject}</p></div>
                        <div className="text-center shrink-0"><div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/30"><Star className="w-4 h-4 fill-amber-400"/> {t.overall_avg.toFixed(1)}</div></div>
                      </div>
                    ))}
                    {topTeachers.length === 0 && <p className="text-indigo-300 font-bold text-sm text-center py-4">لم يتم تسجيل تقييمات.</p>}
                  </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingDown className="w-6 h-6 text-rose-500"/> مؤشرات تحتاج لتدخل (أقل من 3.5)</h2>
                  <div className="space-y-4">
                    {bottomTeachers.map(t => (
                      <div key={t.teacher_id} className="flex items-center gap-4 bg-rose-50 p-3 rounded-2xl border border-rose-100">
                        <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner"><AlertTriangle className="w-6 h-6"/></div>
                        <div className="flex-1 min-w-0"><p className="text-slate-800 font-black truncate">{t.name}</p><p className="text-slate-500 text-[10px] font-bold">{t.subject}</p></div>
                        <div className="text-center shrink-0"><div className="flex items-center gap-1 bg-white text-rose-600 px-3 py-1.5 rounded-xl font-black border border-rose-200 shadow-sm">{t.overall_avg.toFixed(1)} / 5</div></div>
                      </div>
                    ))}
                    {bottomTeachers.length === 0 && <div className="text-center py-8"><div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-8 h-8 text-emerald-500"/></div><p className="text-emerald-600 font-black">أداء ممتاز! لا يوجد معلمين دون المستوى.</p></div>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> ملخص تقييمات المعلمين (في هذا النطاق)</h3>
                  <div className="relative w-full sm:w-72 print:hidden"><div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div><input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-11 pl-4 text-sm font-bold text-slate-800 focus:border-indigo-500 shadow-sm outline-none" placeholder="ابحث عن معلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} /></div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeacherStats.map(t => (
                    <div key={t.teacher_id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 transition-colors shadow-sm flex flex-col group">
                      <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">{t.avatar ? <img src={t.avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-400"/>}</div>
                            <div><h4 className="font-black text-slate-800 text-sm">{t.name}</h4><p className="text-[10px] font-bold text-slate-500">{t.subject} • {t.total_evals} تقييم</p></div>
                          </div>
                          <StarDisplay val={t.overall_avg} />
                      </div>
                      <button onClick={() => { setSelectedTeacher(t); setIsFeedbackModalOpen(true); }} disabled={t.feedbacks.length === 0} className="w-full mt-auto py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-black text-xs rounded-xl transition-all border border-slate-200 hover:border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 print:hidden">
                        <MessageSquare className="w-4 h-4"/> عرض التعليقات ({t.feedbacks.length})
                      </button>
                    </div>
                  ))}
                  {filteredTeacherStats.length === 0 && <p className="col-span-full text-center py-10 font-bold text-slate-500">لا يوجد بيانات.</p>}
                </div>
              </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row items-center justify-between gap-4">
                 <h3 className="font-black text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> تتبع الطلاب</h3>
                 <div className="flex gap-3 w-full sm:w-auto">
                    <input type="text" className="w-full sm:w-48 border rounded-xl py-2 px-4 text-sm font-bold" placeholder="بحث بمعلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} />
                    <input type="text" className="w-full sm:w-48 border rounded-xl py-2 px-4 text-sm font-bold" placeholder="بحث بفصل..." value={searchClass} onChange={(e) => setSearchClass(e.target.value)} />
                 </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                   <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                      <tr>
                         <th className="p-5">الطالب / الفصل</th>
                         <th className="p-5">المعلم / المادة</th>
                         <th className="p-5">التقييم</th>
                         <th className="p-5">التعليق</th>
                         <th className="p-5 text-center">إجراء</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredRaw.map(ev => (
                         <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                            <td className="p-5">
                               <p className="font-black text-slate-800 text-sm">{ev.student_name}</p>
                               <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-indigo-100">{ev.class_name}</span>
                            </td>
                            <td className="p-5">
                               <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">{ev.teacher_avatar ? <img src={ev.teacher_avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-400"/>}</div>
                                 <div><p className="font-bold text-slate-700 text-sm">{ev.teacher_name}</p><p className="text-[10px] text-slate-400">{ev.subject}</p></div>
                               </div>
                            </td>
                            <td className="p-5">
                               <div className="flex flex-col gap-1 w-48">
                                 {ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object' && Object.keys(ev.dynamic_ratings).length > 0 ? Object.entries(ev.dynamic_ratings).map(([k, v]) => (
                                    <div key={k} className="flex justify-between items-center text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                                       <span className="truncate w-24">{k}</span>
                                       <span className="font-black flex items-center gap-0.5">{v} <Star className="w-3 h-3 fill-amber-500"/></span>
                                    </div>
                                 )) : <span className="text-[10px] text-slate-400 italic">قديم: {ev.avg_score.toFixed(1)}⭐</span>}
                               </div>
                            </td>
                            <td className="p-5">
                               <p className="text-xs font-bold text-slate-600 max-w-[200px] leading-relaxed">{ev.feedback || '-'}</p>
                            </td>
                            <td className="p-5 text-center">
                               <button onClick={() => deleteEvaluation(ev.id, ev.student_name)} className="p-2 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 active:scale-90"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* 🚀 نافذة الإعدادات النقية والمحمية من الانهيار (Pure Modal) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsSettingsOpen(false)}></div>
           
           <div className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl" dir="rtl">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner border border-indigo-200"><Settings className="w-5 h-5"/></div>
                     <div>
                       <h2 className="text-lg font-black text-slate-800 leading-tight">إعدادات بوابة التقييم</h2>
                       <p className="text-[10px] font-bold text-slate-500 mt-0.5">التحكم بالمراحل وبنود الاستبيان</p>
                     </div>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm transition-colors active:scale-90"><X className="w-5 h-5"/></button>
               </div>

               <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                     <p className="text-sm font-black text-slate-800 flex items-center gap-2"><Power className="w-4 h-4 text-indigo-500"/> تفعيل البوابة الإلزامية</p>
                     <div className="flex gap-4">
                        <button onClick={() => setIsMiddleActive(!isMiddleActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isMiddleActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100")}>
                           <span>المتوسطة</span>
                           <span className="text-[10px] opacity-80">{isMiddleActive ? 'شغّال' : 'مُعطّل'}</span>
                        </button>
                        <button onClick={() => setIsHighActive(!isHighActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isHighActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100")}>
                           <span>الثانوية</span>
                           <span className="text-[10px] opacity-80">{isHighActive ? 'شغّال' : 'مُعطّل'}</span>
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
                              <button onClick={() => removeCriterion(c)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors border border-rose-100"><Trash2 className="w-4 h-4"/></button>
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

      {/* نافذة التعليقات */}
      {isFeedbackModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsFeedbackModalOpen(false)}></div>
           <div className="bg-white rounded-[2rem] w-full max-w-xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner border border-indigo-200"><MessageSquare className="w-6 h-6"/></div>
                    <div>
                       <h2 className="text-lg font-black text-slate-800 leading-tight">صندوق الأسرار</h2>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">المعلم المستهدف: <span className="text-indigo-600 font-black">{selectedTeacher.name}</span></p>
                    </div>
                 </div>
                 <button onClick={() => setIsFeedbackModalOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-rose-500 shadow-sm transition-colors active:scale-90"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-white">
                {selectedTeacher.feedbacks.map((fb: any, i: number) => (
                  <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative shadow-sm">
                     <p className="text-sm font-bold text-slate-700 leading-relaxed pr-2 whitespace-pre-wrap">"{fb.text}"</p>
                     <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                        <span className="bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">بواسطة: {fb.student} ({fb.class})</span>
                        <span dir="ltr">{format(new Date(fb.date), 'dd/MM/yyyy')}</span>
                     </div>
                  </div>
                ))}
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
