// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

const ProgressBar = ({ value, label, colorClass }: { value: number, label: string, colorClass: string }) => {
  const percentage = ((value || 0) / 5) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
        <span>{label}</span><span className="text-slate-800">{(value || 0).toFixed(1)} / 5</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
        <div className={cn("h-full rounded-full transition-all duration-1000", colorClass)} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

export default function StudentEvaluationsDashboard() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'details'>('stats');
  
  // 🚀 الفلترة السحابية
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  
  // بيانات التقييمات
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [allRawEvaluations, setAllRawEvaluations] = useState<any[]>([]);
  
  // فلاتر الواجهة
  const [searchTeacher, setSearchTeacher] = useState('');

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

  // 🚀 1. أداة كشف الأخطاء على الموبايل (vConsole)
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

  // 2. جلب البيانات الأساسية
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
        setSections((sectionsData || []).map(s => ({ id: s.id, full_name: `${s.classes?.name || ''} - ${s.name}`.trim() })));
      } catch(e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    loadInitialData();
  }, [currentRole]);

  // 3. جلب التقييمات (فلترة سحابية)
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
         const tU = ev.teachers?.users;
         const sU = ev.students?.users;
         const sC = ev.students?.sections?.classes?.name;
         let avg = 0;
         if (ev.dynamic_ratings && typeof ev.dynamic_ratings === 'object') {
            const vals = Object.values(ev.dynamic_ratings).map(Number).filter(n => !isNaN(n));
            if (vals.length > 0) avg = vals.reduce((a, b) => a + b, 0) / vals.length;
         } else {
            avg = ((Number(ev.scientific_rating)||0) + (Number(ev.management_rating)||0) + (Number(ev.humanity_rating)||0)) / 3;
         }
         return {
            id: ev.id, teacher_id: ev.teachers?.id, teacher_name: tU?.full_name || 'معلم', teacher_avatar: tU?.avatar_url,
            student_name: sU?.full_name || 'طالب', class_name: `${sC || ''} - ${ev.students?.sections?.name || ''}`,
            subject: ev.subject_name, feedback: ev.feedback, date: ev.created_at, avg_score: avg, dynamic_ratings: ev.dynamic_ratings
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

      setTeacherStats(Object.values(grouped).map((t: any) => ({ ...t, overall_avg: t.sum_score / t.total_evals })).sort((a, b) => b.overall_avg - a.overall_avg));
    } catch(err) { console.error(err); }
    finally { setIsFetchingData(false); }
  };

  useEffect(() => { if (['admin', 'management'].includes(currentRole)) fetchEvaluations(); }, [selectedSectionId, currentRole]);

  const saveSettings = async () => {
     if (!settingsId || criteria.length === 0) return;
     setIsSavingSettings(true);
     try {
       await supabase.from('platform_settings').update({ evaluations_middle_active: isMiddleActive, evaluations_high_active: isHighActive, evaluation_criteria: criteria }).eq('id', settingsId);
       setIsSettingsOpen(false); alert('تم الحفظ بنجاح!');
     } catch(e) { alert('خطأ في الحفظ'); }
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* الهيدر */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
                <BarChart2 className="w-8 h-8 text-indigo-600" /> مركز الرقابة والتقييم
              </h1>
              <p className="text-slate-500 font-bold text-sm mt-2">متابعة أداء المعلمين من وجهة نظر الطلاب.</p>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-black transition-all flex items-center gap-2 shadow-lg active:scale-95">
               <Settings className="w-5 h-5" /> إعدادات البوابة والبنود
            </button>
          </div>
        </div>

        {/* الفلتر السحابي */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Filter className="w-5 h-5"/></div>
              <p className="font-black text-sm text-slate-700">تحديد نطاق البحث:</p>
           </div>
           <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className="w-full sm:w-80 bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all">
              <option value="all">كل الفصول (أحدث 500 تقييم)</option>
              {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.full_name}</option>)}
           </select>
        </div>

        {/* التبويبات */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
           <button onClick={() => setActiveTab('stats')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>الإحصائيات</button>
           <button onClick={() => setActiveTab('details')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>سجل الرقابة</button>
        </div>

        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherStats.filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase())).map(t => (
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
                <button onClick={() => { setSelectedTeacher(t); setIsFeedbackModalOpen(true); }} className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 font-black text-xs rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
                  عرض تعليقات الطلاب ({t.feedbacks.length})
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                   <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                      <tr>
                         <th className="p-5">الطالب / الفصل</th>
                         <th className="p-5">المعلم / المادة</th>
                         <th className="p-5">التقييم</th>
                         <th className="p-5">التعليق</th>
                         <th className="p-5 text-center">إجراءات</th>
                      </tr>
                   </thead>
                   <tbody>
                      {allRawEvaluations.map(ev => (
                         <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                               <p className="font-black text-slate-800 text-sm">{ev.student_name}</p>
                               <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">{ev.class_name}</span>
                            </td>
                            <td className="p-5">
                               <p className="font-bold text-slate-700 text-sm">{ev.teacher_name}</p>
                               <p className="text-[10px] text-slate-400 font-bold">{ev.subject}</p>
                            </td>
                            <td className="p-5">
                               <div className="flex flex-wrap gap-1 max-w-[200px]">
                                 {ev.dynamic_ratings ? Object.entries(ev.dynamic_ratings).map(([k, v]) => (
                                    <span key={k} className="text-[9px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100">{k}: {v}⭐</span>
                                 )) : <span className="text-[10px] font-bold text-slate-400 italic">نظام قديم</span>}
                               </div>
                            </td>
                            <td className="p-5">
                               <p className="text-xs font-bold text-slate-600 line-clamp-2 max-w-[250px]">{ev.feedback || '-'}</p>
                            </td>
                            <td className="p-5 text-center">
                               <button onClick={() => deleteEvaluation(ev.id, ev.student_name)} className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 active:scale-90"><Trash2 className="w-4 h-4"/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>

      {/* 🚀 نافذة الإعدادات (Lightweight Modal) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsSettingsOpen(false)}></div>
           <div className="bg-white rounded-[2rem] w-full max-w-lg relative z-10 flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                 <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-600"/> إعدادات التقييم الإجباري</h2>
                 <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white rounded-full border shadow-sm"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                 <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                    <p className="text-xs font-black text-slate-500">تفعيل البوابة الإلزامية حسب المرحلة:</p>
                    <div className="flex gap-3">
                       <button onClick={() => setIsMiddleActive(!isMiddleActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border", isMiddleActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400")}>المرحلة المتوسطة</button>
                       <button onClick={() => setIsHighActive(!isHighActive)} className={cn("flex-1 py-4 rounded-xl font-black text-sm transition-all border", isHighActive ? "bg-emerald-500 text-white border-emerald-600 shadow-md" : "bg-white text-slate-400")}>المرحلة الثانوية</button>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <p className="text-xs font-black text-slate-500">بنود الاستبيان (المحاور):</p>
                    <div className="flex gap-2">
                       <input type="text" value={newCriterion} onChange={e=>setNewCriterion(e.target.value)} placeholder="أضف محوراً جديداً..." className="flex-1 bg-slate-50 border rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500" />
                       <button onClick={addCriterion} className="p-3 bg-slate-900 text-white rounded-xl active:scale-95"><Plus className="w-6 h-6"/></button>
                    </div>
                    <div className="space-y-2">
                       {criteria.map((c, i) => (
                          <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm">
                             <span className="text-xs font-black text-slate-700">{c}</span>
                             <button onClick={() => removeCriterion(c)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 shrink-0">
                 <button onClick={saveSettings} disabled={isSavingSettings} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg active:scale-95 disabled:opacity-50">
                    {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ الإعدادات بالكامل'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* نافذة التعليقات */}
      {isFeedbackModalOpen && selectedTeacher && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/90" onClick={() => setIsFeedbackModalOpen(false)}></div>
           <div className="bg-white rounded-[2rem] w-full max-w-xl relative z-10 flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <h2 className="font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> تعليقات: {selectedTeacher.name}</h2>
                 <button onClick={() => setIsFeedbackModalOpen(false)} className="p-2"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {selectedTeacher.feedbacks.map((fb, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                     <p className="text-sm font-bold text-slate-700">"{fb.text}"</p>
                     <div className="mt-3 pt-2 border-t flex justify-between text-[9px] font-black text-slate-400 uppercase">
                        <span>بواسطة: {fb.student} ({fb.class})</span>
                        <span>{format(new Date(fb.date), 'dd/MM/yyyy')}</span>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      <style jsx global>{` .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } `}</style>
    </div>
  );
}
