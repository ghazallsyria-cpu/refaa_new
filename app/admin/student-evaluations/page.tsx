// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Users, Star, MessageSquare, Loader2, Search, 
  TrendingUp, TrendingDown, Trophy, AlertTriangle, X, Power, Trash2, Settings, Plus, Layers, UserCircle, CheckCircle2, List, Eye, Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// مكونات صغيرة مساعدة
const StarDisplay = ({ val }: { val: number }) => (
  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-sm border border-amber-500/20 shadow-inner w-fit">
    <Star className="w-3.5 h-3.5 fill-amber-500" /> {(val || 0).toFixed(1)}
  </div>
);

export default function StudentEvaluationsDashboard() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'details'>('stats');
  
  // الفلترة السحابية
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

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  // 1. أداة كشف الأخطاء على الموبايل (vConsole)
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/vconsole@latest/dist/vconsole.min.js";
    script.onload = () => {
      if (typeof window !== 'undefined' && !window.vConsole) {
         window.vConsole = new window.VConsole();
      }
    };
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch(e) {} };
  }, []);

  // 2. جلب البيانات الأساسية (الإعدادات والفصول)
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

  // 3. جلب التقييمات (مع الفلترة السحابية)
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

      const formatted = (data || []).map((ev: any) => {
         const tU = Array.isArray(ev.teachers?.users) ? ev.teachers.users[0] : ev.teachers?.users;
         const sU = Array.isArray(ev.students?.users) ? ev.students.users[0] : ev.students?.users;
         const sC = Array.isArray(ev.students?.sections?.classes) ? ev.students.sections.classes[0]?.name : ev.students?.sections?.classes?.name;
         
         let avg = 0;
         if (ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object' && Object.keys(ev.dynamic_ratings).length > 0) {
            const vals = Object.values(ev.dynamic_ratings).map(Number).filter(n => !isNaN(n));
            if (vals.length > 0) avg = vals.reduce((a, b) => a + b, 0) / vals.length;
         } else {
            avg = ((Number(ev.scientific_rating)||0) + (Number(ev.management_rating)||0) + (Number(ev.humanity_rating)||0)) / 3;
         }
         return {
            id: ev.id, teacher_id: ev.teachers?.id, teacher_name: tU?.full_name || 'معلم', teacher_avatar: tU?.avatar_url,
            student_name: sU?.full_name || 'طالب', class_name: `${sC || ''} - ${ev.students?.sections?.name || ''}`.trim(),
            subject: ev.subject_name, feedback: ev.feedback, date: ev.created_at, avg_score: isNaN(avg) ? 0 : avg, dynamic_ratings: ev.dynamic_ratings
         };
      });
      setAllRawEvaluations(formatted);

      const grouped = formatted.reduce((acc: any, curr: any) => {
        const tId = curr.teacher_id;
        if (!acc[tId]) acc[tId] = { teacher_id: tId, name: curr.teacher_name, avatar: curr.teacher_avatar, subject: curr.subject, total_evals: 0, sum_score: 0, feedbacks: [] };
        acc[tId].total_evals += 1; acc[tId].sum_score += curr.avg_score;
        if (curr.feedback?.trim()) acc[tId].feedbacks.push({ text: curr.feedback, date: curr.date, student: curr.student_name, class: curr.class_name });
        return acc;
      }, {});

      setTeacherStats(Object.values(grouped).map((t: any) => ({ ...t, overall_avg: t.total_evals > 0 ? (t.sum_score / t.total_evals) : 0 })).sort((a: any, b: any) => b.overall_avg - a.overall_avg));
    } catch(err) { console.error(err); }
    finally { setIsFetchingData(false); }
  };

  useEffect(() => { if (['admin', 'management'].includes(currentRole)) fetchEvaluations(); }, [selectedSectionId, currentRole]);

  // 🚀 هذه هي الدوال التي نسيناها وتسببت في الانهيار!
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

  if (!['admin', 'management'].includes(currentRole)) return null;

  const topTeachers = teacherStats.slice(0, 3);
  const bottomTeachers = teacherStats.filter(t => t.overall_avg < 3.5).slice(-3).reverse();
  const filteredTeacherStats = teacherStats.filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase()));
  const filteredRaw = allRawEvaluations.filter(ev => ev.teacher_name.toLowerCase().includes(searchTeacher.toLowerCase()) && ev.class_name.toLowerCase().includes(searchClass.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-indigo-600"><Loader2 className="w-12 h-12 animate-spin" /><span className="font-black text-lg">تحميل النظام...</span></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* الهيدر */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-indigo-600" /> مركز الرقابة والتقييم
              </h1>
              <div className="text-slate-500 font-bold text-sm flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-4">
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة المتوسط: <strong className={isMiddleActive ? 'text-emerald-500' : 'text-rose-500'}>{isMiddleActive ? 'مفتوحة' : 'مغلقة'}</strong></span>
                 <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">حالة الثانوي: <strong className={isHighActive ? 'text-emerald-500' : 'text-rose-500'}>{isHighActive ? 'مفتوحة' : 'مغلقة'}</strong></span>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="w-full md:w-auto px-8 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
               <Settings className="w-5 h-5" /> إعدادات البوابة والبنود
            </button>
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

        {/* التبويبات */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto sm:mx-0">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>الإحصائيات</button>
           <button onClick={() => setActiveTab('details')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>سجل الرقابة</button>
        </div>

        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeacherStats.map(t => (
              <div key={t.teacher_id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col group hover:border-indigo-300 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                    {t.avatar ? <img src={t.avatar} className="w-full h-full object-cover" crossOrigin="anonymous" /> : <UserCircle className="w-full h-full text-slate-300"/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-800 truncate leading-tight">{t.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">{t.subject} • {t.total_evals} صوت</p>
                  </div>
                  <StarDisplay val={t.overall_avg} />
                </div>
                <button onClick={() => { setSelectedTeacher(t); setIsFeedbackModalOpen(true); }} disabled={t.feedbacks.length === 0} className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-black text-xs rounded-xl border border-slate-100 hover:border-indigo-200 transition-all disabled:opacity-50">
                  عرض التعليقات ({t.feedbacks.length})
                </button>
              </div>
            ))}
            {filteredTeacherStats.length === 0 && <p className="col-span-full text-center py-10 font-bold text-slate-500">لا يوجد بيانات.</p>}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                         <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-5">
                               <p className="font-black text-slate-800 text-sm">{ev.student_name}</p>
                               <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">{ev.class_name}</span>
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
                               <button onClick={() => deleteEvaluation(ev.id, ev.student_name)} className="p-2 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100"><Trash2 className="w-4 h-4"/></button>
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
           {/* Overlay بدون تأثير Blur لحماية الـ GPU */}
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsSettingsOpen(false)}></div>
           
           <div className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl" dir="rtl">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner"><Settings className="w-5 h-5"/></div>
                     <div>
                       <h2 className="text-lg font-black text-slate-800 leading-tight">إعدادات بوابة التقييم</h2>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">التحكم بالمراحل الدراسية وبنود الاستبيان</p>
                     </div>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white border border-slate-200 p-2 rounded-full transition-colors active:scale-90"><X className="w-5 h-5"/></button>
               </div>

               <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
                     <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><Power className="w-4 h-4 text-indigo-500"/> تشغيل البوابة الإلزامية</h4>
                     <div className="flex gap-4">
                        <button onClick={() => setIsMiddleActive(!isMiddleActive)} className={cn("flex-1 py-4 rounded-2xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isMiddleActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100")}>
                           <span>المتوسطة</span>
                           <span className="text-[10px] opacity-80">{isMiddleActive ? 'تعمل الآن' : 'موقفة'}</span>
                        </button>
                        <button onClick={() => setIsHighActive(!isHighActive)} className={cn("flex-1 py-4 rounded-2xl font-black text-sm transition-all border flex flex-col items-center gap-1 active:scale-95", isHighActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100")}>
                           <span>الثانوية</span>
                           <span className="text-[10px] opacity-80">{isHighActive ? 'تعمل الآن' : 'موقفة'}</span>
                        </button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                     <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2"><List className="w-4 h-4 text-indigo-500"/> بنود الاستبيان (المحاور)</h4>
                     <div className="flex gap-2 mb-4">
                        <input type="text" value={newCriterion} onChange={e=>setNewCriterion(e.target.value)} placeholder="أضف محوراً جديداً..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-colors" />
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
                    <div><h2 className="text-lg font-black text-slate-800 leading-tight">صندوق الأسرار</h2><p className="text-[10px] font-bold text-slate-500 mt-1">المعلم المستهدف: <span className="text-indigo-600 font-black">{selectedTeacher.name}</span></p></div>
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

      <style jsx global>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } `}</style>
    </div>
  );
}
