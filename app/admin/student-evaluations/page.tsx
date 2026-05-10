// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Users, Star, MessageSquare, Loader2, Search, 
  TrendingUp, TrendingDown, Trophy, AlertTriangle, X, Power, Trash2, Settings, Plus, Layers, UserCircle, CheckCircle2, List, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

const StarDisplay = ({ val }: { val: number }) => (
  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-sm border border-amber-500/20 shadow-inner w-fit">
    <Star className="w-3.5 h-3.5 fill-amber-500 drop-shadow-sm" /> {(val || 0).toFixed(1)}
  </div>
);

const ProgressBar = ({ value, label, colorClass }: { value: number, label: string, colorClass: string }) => {
  const percentage = ((value || 0) / 5) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
        <span>{label}</span><span className="text-slate-800">{(value || 0).toFixed(1)} / 5</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 shadow-inner">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full", colorClass)}></motion.div>
      </div>
    </div>
  );
};

export default function StudentEvaluationsDashboard() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'details'>('stats');
  
  // بيانات التقييمات
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [allRawEvaluations, setAllRawEvaluations] = useState<any[]>([]);
  
  // الفلاتر
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchClass, setSearchClass] = useState('');

  // 🚀 إعدادات المنصة (التحكم بالبوابة)
  const [settingsId, setSettingsId] = useState<any>(null);
  const [isMiddleActive, setIsMiddleActive] = useState(false);
  const [isHighActive, setIsHighActive] = useState(false);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCriterion, setNewCriterion] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. جلب إعدادات المنصة
      const { data: settingsData } = await supabase.from('platform_settings').select('id, evaluations_middle_active, evaluations_high_active, evaluation_criteria').limit(1).maybeSingle();
      if (settingsData) {
         setSettingsId(settingsData.id);
         setIsMiddleActive(settingsData.evaluations_middle_active || false);
         setIsHighActive(settingsData.evaluations_high_active || false);
         
         // 🚀 تأمين قراءة البنود (Safe Parse) لمنع الشاشة البيضاء
         let parsedCriteria = ["المحور العلمي", "المحور الإداري", "المحور الإنساني"];
         if (settingsData.evaluation_criteria) {
             if (Array.isArray(settingsData.evaluation_criteria)) {
                 parsedCriteria = settingsData.evaluation_criteria;
             } else if (typeof settingsData.evaluation_criteria === 'string') {
                 try { parsedCriteria = JSON.parse(settingsData.evaluation_criteria); } catch(e) {}
             }
         }
         setCriteria(parsedCriteria);
      }

      // 2. جلب التقييمات مع بيانات الطالب (للفضح) وبيانات المعلم
      const { data, error } = await supabase
        .from('student_evaluations_of_teachers')
        .select(`
          id, created_at, feedback, dynamic_ratings, scientific_rating, management_rating, humanity_rating, subject_name,
          teachers(id, users(full_name, avatar_url)),
          students(users(full_name), sections(name, classes(name)))
        `)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // تصفية البيانات للقائمة التفصيلية
      const formattedRaw = (data || []).map((ev: any) => {
         const tUser = Array.isArray(ev.teachers?.users) ? ev.teachers.users[0] : ev.teachers?.users;
         const sUser = Array.isArray(ev.students?.users) ? ev.students.users[0] : ev.students?.users;
         const sClass = Array.isArray(ev.students?.sections?.classes) ? ev.students.sections.classes[0]?.name : ev.students?.sections?.classes?.name;
         
         // حساب المتوسط بأمان تام
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

      // 3. التجميع (Aggregation) لمعرفة أفضل وأسوأ المعلمين
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
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchData();
  }, [currentRole]);

  // 🚀 حفظ الإعدادات في قاعدة البيانات
  const saveSettings = async () => {
     if (!settingsId) return;
     if (criteria.length === 0) { alert('يجب إضافة بند تقييم واحد على الأقل.'); return; }
     setIsSavingSettings(true);
     try {
       await supabase.from('platform_settings').update({
          evaluations_middle_active: isMiddleActive,
          evaluations_high_active: isHighActive,
          evaluation_criteria: criteria,
          is_evaluations_active: isMiddleActive || isHighActive 
       }).eq('id', settingsId);
       setIsSettingsOpen(false);
       alert('تم حفظ الإعدادات بنجاح!');
     } catch(e) { alert('حدث خطأ أثناء الحفظ.'); }
     finally { setIsSavingSettings(false); }
  };

  const addCriterion = () => {
      if (newCriterion.trim() && !criteria.includes(newCriterion.trim())) {
          setCriteria([...criteria, newCriterion.trim()]);
          setNewCriterion('');
      }
  };
  const removeCriterion = (c: string) => { setCriteria(criteria.filter(item => item !== c)); };

  // 🚀 دالة حذف التقييم للطلاب المتلاعبين
  const deleteEvaluation = async (id: string, studentName: string) => {
      if (!confirm(`هل أنت متأكد من حذف تقييم الطالب (${studentName}) نهائياً؟ لن يمكن التراجع عن هذا الإجراء.`)) return;
      try {
          const { error } = await supabase.from('student_evaluations_of_teachers').delete().eq('id', id);
          if (error) throw error;
          setAllRawEvaluations(prev => prev.filter(ev => ev.id !== id));
          fetchData(); 
          alert('تم حذف التقييم بنجاح.');
      } catch(e) { alert('فشل الحذف!'); }
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  const topTeachers = teacherStats.slice(0, 3);
  const bottomTeachers = teacherStats.filter(t => t.overall_avg < 3.5).slice(-3).reverse();
  const filteredTeacherStats = teacherStats.filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase()));
  
  const filteredRaw = allRawEvaluations.filter(ev => 
      ev.teacher_name.toLowerCase().includes(searchTeacher.toLowerCase()) &&
      ev.class_name.toLowerCase().includes(searchClass.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-indigo-600"><Loader2 className="w-12 h-12 animate-spin" /><span className="font-black text-lg">جاري تحميل البيانات...</span></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
        
        {/* 📋 الهيدر الإداري */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] pointer-events-none rounded-full"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart2 className="w-8 h-8" /></div> 
                مركز تقييمات الأداء والرقابة
              </h1>
              <div className="text-slate-500 font-bold text-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-3">
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة المتوسط: <strong className={isMiddleActive ? 'text-emerald-500' : 'text-rose-500'}>{isMiddleActive ? 'بوابة مفتوحة' : 'مغلقة'}</strong></span>
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة الثانوي: <strong className={isHighActive ? 'text-emerald-500' : 'text-rose-500'}>{isHighActive ? 'بوابة مفتوحة' : 'مغلقة'}</strong></span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 text-center shadow-inner flex-1 md:flex-none">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي التقييمات</p>
                <p className="text-3xl font-black text-indigo-600">{allRawEvaluations.length}</p>
              </div>
              <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-4 rounded-2xl border bg-slate-800 border-slate-700 text-white hover:bg-slate-900 font-black transition-all shadow-md active:scale-95 flex-1 md:flex-none flex items-center justify-center gap-2">
                 <Settings className="w-6 h-6" /> إعدادات التقييم
              </button>
            </div>
          </div>
        </div>

        {/* 🚀 التبويبات (Tabs) */}
        <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto sm:mx-0">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}><TrendingUp className="w-4 h-4"/> الإحصائيات العامة</button>
           <button onClick={() => setActiveTab('details')} className={`px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'details' ? 'bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}><List className="w-4 h-4"/> سجل الفحص والرقابة (الطلاب)</button>
        </div>

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-700">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-2xl rounded-full"></div>
                  <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 relative z-10"><Trophy className="w-6 h-6 text-amber-400"/> أفضل 3 معلمين (بالمتوسط)</h2>
                  <div className="space-y-4 relative z-10">
                    {topTeachers.map((t, idx) => (
                      <div key={t.teacher_id} className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
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
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> ملخص المعلمين</h3>
                  <div className="relative w-full sm:w-72"><div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div><input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-11 pl-4 text-sm font-bold text-slate-800 focus:border-indigo-500 shadow-sm outline-none" placeholder="ابحث عن معلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} /></div>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTeacherStats.map(t => (
                    <div key={t.teacher_id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 transition-colors shadow-sm flex flex-col group">
                      <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">{t.avatar ? <img src={t.avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-400"/>}</div>
                            <div><h4 className="font-black text-slate-800 text-sm">{t.name}</h4><p className="text-[10px] font-bold text-slate-500">{t.subject} • {t.total_evals} تقييم</p></div>
                          </div>
                          <StarDisplay val={t.overall_avg} />
                      </div>
                      <button onClick={() => { setSelectedTeacher(t); setIsFeedbackModalOpen(true); }} disabled={t.feedbacks.length === 0} className="w-full mt-auto py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-black text-xs rounded-xl transition-all border border-slate-200 hover:border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50">
                        <MessageSquare className="w-4 h-4"/> عرض التعليقات ({t.feedbacks.length})
                      </button>
                    </div>
                  ))}
                  {filteredTeacherStats.length === 0 && <p className="col-span-full text-center py-10 font-bold text-slate-500">لا يوجد بيانات.</p>}
                </div>
              </div>
          </motion.div>
        )}

        {/* 🚀 قسم السجل التفصيلي (الرقابة والمتابعة وحذف التقييمات) */}
        {activeTab === 'details' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-center justify-between gap-4">
                 <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> السجل الشامل (تتبع الطلاب)</h3>
                 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64"><div className="absolute inset-y-0 right-0 pr-4 flex items-center"><Search className="h-4 w-4 text-slate-400" /></div><input type="text" className="w-full border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold bg-white outline-none focus:border-indigo-500" placeholder="اسم المعلم..." value={searchTeacher} onChange={(e) => setSearchTeacher(e.target.value)} /></div>
                    <div className="relative flex-1 lg:w-64"><div className="absolute inset-y-0 right-0 pr-4 flex items-center"><Layers className="h-4 w-4 text-slate-400" /></div><input type="text" className="w-full border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold bg-white outline-none focus:border-indigo-500" placeholder="الفصل (مثال: 12 علمي)..." value={searchClass} onChange={(e) => setSearchClass(e.target.value)} /></div>
                 </div>
             </div>
             
             <div className="p-6 overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[800px]">
                   <thead>
                      <tr className="bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest">
                         <th className="p-4 rounded-r-xl w-1/4">الطالب والفصل</th>
                         <th className="p-4 w-1/4">المعلم والمادة</th>
                         <th className="p-4 w-1/4">التقييم (النجوم)</th>
                         <th className="p-4 min-w-[200px]">الرسالة/الملاحظة</th>
                         <th className="p-4 rounded-l-xl text-center w-16">إجراءات</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filteredRaw.map(ev => (
                         <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                               <p className="font-black text-slate-800 text-sm leading-tight">{ev.student_name}</p>
                               <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md mt-1 inline-block border border-indigo-100">{ev.class_name}</span>
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">{ev.teacher_avatar ? <img src={ev.teacher_avatar} className="w-full h-full object-cover" crossOrigin="anonymous"/> : <UserCircle className="w-full h-full text-slate-400"/>}</div>
                                 <div>
                                    <p className="font-bold text-slate-700 text-sm leading-tight">{ev.teacher_name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{ev.subject}</p>
                                 </div>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col gap-1.5">
                                 {ev.dynamic_ratings && Object.keys(ev.dynamic_ratings).length > 0 ? Object.entries(ev.dynamic_ratings).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center text-[10px] font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shadow-sm">
                                       <span className="text-slate-600 truncate w-24" title={key}>{key}</span>
                                       <span className="text-amber-600 font-black flex items-center gap-0.5">{val} <Star className="w-3 h-3 fill-amber-500"/></span>
                                    </div>
                                 )) : (
                                    <div className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">نظام قديم: المتوسط {ev.avg_score.toFixed(1)}</div>
                                 )}
                               </div>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 italic whitespace-pre-wrap leading-relaxed">
                               {ev.feedback ? `"${ev.feedback}"` : <span className="text-slate-400 not-italic">بدون تعليق</span>}
                            </td>
                            <td className="p-4 text-center">
                               <button onClick={() => deleteEvaluation(ev.id, ev.student_name)} className="p-2.5 bg-white text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-200 opacity-50 group-hover:opacity-100 focus:outline-none" title="حذف هذا التقييم نهائياً">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                         </tr>
                      ))}
                      {filteredRaw.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">لا يوجد سجلات مطابقة للبحث.</td></tr>}
                   </tbody>
                </table>
             </div>
          </motion.div>
        )}
      </div>

      {/* 🚀 نافذة إعدادات البوابة والبنود (بـ Framer Motion النقي لمنع الانهيار) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]" dir="rtl">
                 <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white shadow-inner"><Settings className="w-5 h-5"/></div>
                       <div>
                         <h2 className="text-lg font-black text-slate-800 leading-tight">إعدادات بوابة التقييم</h2>
                         <p className="text-[10px] font-bold text-slate-500 mt-1">التحكم بالمراحل الدراسية وبنود الاستبيان</p>
                       </div>
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors active:scale-90 border border-slate-200 shadow-sm"><X className="w-5 h-5"/></button>
                 </div>

                 <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* مفاتيح التشغيل المنفصلة */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                       <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><Power className="w-4 h-4 text-indigo-500"/> تشغيل البوابة الإلزامية للطلاب</h4>
                       <div className="flex gap-4">
                          <button onClick={() => setIsMiddleActive(!isMiddleActive)} className={cn("flex-1 py-3.5 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 shadow-sm active:scale-95", isMiddleActive ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-100")}>
                             <span>المرحلة المتوسطة</span>
                             <span className="text-[10px]">{isMiddleActive ? 'مُشغلة' : 'موقفة'}</span>
                          </button>
                          <button onClick={() => setIsHighActive(!isHighActive)} className={cn("flex-1 py-3.5 rounded-xl font-black text-sm transition-all border flex flex-col items-center gap-1 shadow-sm active:scale-95", isHighActive ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-100")}>
                             <span>المرحلة الثانوية</span>
                             <span className="text-[10px]">{isHighActive ? 'مُشغلة' : 'موقفة'}</span>
                          </button>
                       </div>
                    </div>

                    {/* البنود الديناميكية */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                       <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><List className="w-4 h-4 text-indigo-500"/> بنود الاستبيان (المحاور)</h4>
                       
                       <div className="flex gap-2 mb-4">
                          <input type="text" value={newCriterion} onChange={e=>setNewCriterion(e.target.value)} placeholder="أضف بند تقييم جديد..." className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 shadow-sm" />
                          <button onClick={addCriterion} className="bg-slate-800 text-white px-5 rounded-xl font-black hover:bg-slate-900 transition-colors shadow-sm active:scale-95"><Plus className="w-5 h-5"/></button>
                       </div>

                       <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                          {criteria.map((c, i) => (
                             <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-xs font-black text-slate-700">{c}</span>
                                <button onClick={() => removeCriterion(c)} className="text-rose-400 hover:text-rose-600 bg-rose-50 p-2 rounded-lg transition-colors border border-rose-100 active:scale-90"><Trash2 className="w-4 h-4"/></button>
                             </div>
                          ))}
                          {criteria.length === 0 && <p className="text-center text-xs font-bold text-rose-500 py-3 bg-rose-50 rounded-xl border border-rose-200 border-dashed">لا توجد بنود! لن يظهر الاستبيان للطلاب.</p>}
                       </div>
                    </div>
                 </div>

                 <div className="p-6 border-t border-slate-100 shrink-0">
                    <button onClick={saveSettings} disabled={isSavingSettings} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50">
                       {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> حفظ جميع الإعدادات</>}
                    </button>
                 </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة التعليقات القديمة (Pure Framer Motion) */}
      <AnimatePresence>
        {isFeedbackModalOpen && selectedTeacher && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)} />
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] w-full max-w-xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]" dir="rtl">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-inner"><MessageSquare className="w-5 h-5"/></div>
                     <div><h2 className="text-lg font-black text-slate-800 leading-tight">صندوق الأسرار</h2><p className="text-[10px] font-bold text-slate-500 mt-1">الخاصة بالمعلم: <span className="text-indigo-600">{selectedTeacher.name}</span></p></div>
                  </div>
                  <button onClick={() => setIsFeedbackModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors active:scale-90 border border-slate-200 shadow-sm"><X className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                  {selectedTeacher.feedbacks.map((fb: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative shadow-sm">
                       <p className="text-sm font-bold text-slate-700 leading-relaxed pr-2 whitespace-pre-wrap">"{fb.text}"</p>
                       <p className="text-[9px] font-bold text-slate-500 mt-3 border-t border-slate-200 pt-2 text-left" dir="ltr">{fb.student} ({fb.class}) - {format(new Date(fb.date), 'dd MMM yyyy', { locale: arSA })}</p>
                    </div>
                  ))}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } `}</style>
    </div>
  );
}
