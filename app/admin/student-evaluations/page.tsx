// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Users, Star, MessageSquare, Loader2, Search, 
  TrendingUp, TrendingDown, Trophy, AlertTriangle, Eye, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';

export default function StudentEvaluationsDashboard() {
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [teacherStats, setTeacherStats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حالات قراءة التعليقات
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  useEffect(() => {
    const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
        // 1. جلب التقييمات من الجدول الجديد
        const { data, error } = await supabase
          .from('student_evaluations_of_teachers')
          .select(`
            *,
            teachers(users(full_name, avatar_url))
          `)
          .eq('academic_year', currentYear)
          .eq('semester', currentSemester);

        if (error) throw error;

        // 2. معالجة البيانات وتجميعها لكل معلم (Aggregation)
        const groupedData = (data || []).reduce((acc: any, curr: any) => {
          const tId = curr.teacher_id;
          if (!acc[tId]) {
            acc[tId] = {
              teacher_id: tId,
              name: curr.teachers?.users?.full_name || 'معلم غير معروف',
              avatar: curr.teachers?.users?.avatar_url,
              subject: curr.subject_name,
              total_evals: 0,
              sci_sum: 0,
              mgt_sum: 0,
              hum_sum: 0,
              feedbacks: []
            };
          }
          
          acc[tId].total_evals += 1;
          acc[tId].sci_sum += curr.scientific_rating;
          acc[tId].mgt_sum += curr.management_rating;
          acc[tId].hum_sum += curr.humanity_rating;
          
          if (curr.feedback && curr.feedback.trim() !== '') {
            acc[tId].feedbacks.push({ text: curr.feedback, date: curr.created_at });
          }
          
          return acc;
        }, {});

        // 3. حساب المتوسطات الحسابية (Averages)
        const finalStats = Object.values(groupedData).map((t: any) => {
          const sci_avg = t.sci_sum / t.total_evals;
          const mgt_avg = t.mgt_sum / t.total_evals;
          const hum_avg = t.hum_sum / t.total_evals;
          const overall = (sci_avg + mgt_avg + hum_avg) / 3;

          return {
            ...t,
            sci_avg: Number(sci_avg.toFixed(1)),
            mgt_avg: Number(mgt_avg.toFixed(1)),
            hum_avg: Number(hum_avg.toFixed(1)),
            overall_avg: Number(overall.toFixed(1))
          };
        });

        // ترتيب المعلمين من الأعلى تقييماً إلى الأقل
        finalStats.sort((a: any, b: any) => b.overall_avg - a.overall_avg);
        
        setTeacherStats(finalStats);
      } catch (err) {
        console.error('Error fetching evaluations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (['admin', 'management'].includes(currentRole)) {
      fetchEvaluations();
    }
  }, [currentRole]);

  if (!['admin', 'management'].includes(currentRole)) return null;

  const topTeachers = teacherStats.slice(0, 3);
  const bottomTeachers = teacherStats.filter(t => t.overall_avg < 3.5).slice(-3).reverse(); // المعلمين اللي تقييمهم أقل من 3.5
  
  const filteredTeachers = teacherStats.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const StarDisplay = ({ val }: { val: number }) => (
    <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black text-sm border border-amber-500/20 shadow-inner w-fit">
      <Star className="w-3.5 h-3.5 fill-amber-500 drop-shadow-sm" /> {val}
    </div>
  );

  const ProgressBar = ({ value, label, colorClass }: { value: number, label: string, colorClass: string }) => {
    const percentage = (value / 5) * 100;
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
          <span>{label}</span>
          <span className="text-slate-800">{value} / 5</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 shadow-inner">
          <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full", colorClass)}></motion.div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 font-cairo text-slate-800 pb-32" dir="rtl">
      
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-indigo-600">
            <Loader2 className="w-12 h-12 animate-spin" />
            <span className="font-black text-lg">جاري معالجة وتقييم البيانات...</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
        
        {/* 📋 الهيدر الإداري */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] pointer-events-none rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart2 className="w-8 h-8" /></div> 
                مؤشرات التقييم الأكاديمي للطلاب
              </h1>
              <p className="text-slate-500 font-bold text-sm">قياس جودة الشرح وإدارة الفصول بناءً على تصويت الطلاب السري.</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 text-center shadow-inner min-w-[150px]">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">إجمالي التقييمات المسجلة</p>
              <p className="text-3xl font-black text-indigo-600">{teacherStats.reduce((acc, curr) => acc + curr.total_evals, 0)}</p>
            </div>
          </div>
        </div>

        {/* 🏆 لوحة الشرف ومؤشرات الخطر */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* لوحة الشرف */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-700">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-2xl rounded-full"></div>
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 relative z-10"><Trophy className="w-6 h-6 text-amber-400"/> أفضل 3 معلمين (حسب تقييم الطلاب)</h2>
            <div className="space-y-4 relative z-10">
              {topTeachers.map((t, idx) => (
                <div key={t.teacher_id} className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center font-black text-indigo-900 text-xl shadow-inner shrink-0 relative">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black truncate text-sm sm:text-base">{t.name}</p>
                    <p className="text-indigo-200 text-[10px] font-bold">{t.subject}</p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/30">
                      <Star className="w-4 h-4 fill-amber-400"/> {t.overall_avg}
                    </div>
                  </div>
                </div>
              ))}
              {topTeachers.length === 0 && <p className="text-indigo-300 font-bold text-sm text-center py-4">لم يتم تسجيل تقييمات كافية بعد.</p>}
            </div>
          </div>

          {/* مؤشرات التدخل */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingDown className="w-6 h-6 text-rose-500"/> مؤشرات تحتاج لتدخل (تقييم أقل من 3.5)</h2>
            <div className="space-y-4">
              {bottomTeachers.map(t => (
                <div key={t.teacher_id} className="flex items-center gap-4 bg-rose-50 p-3 rounded-2xl border border-rose-100">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner"><AlertTriangle className="w-6 h-6"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-black truncate text-sm sm:text-base">{t.name}</p>
                    <p className="text-slate-500 text-[10px] font-bold">{t.subject}</p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="flex items-center gap-1 bg-white text-rose-600 px-3 py-1.5 rounded-xl font-black border border-rose-200 shadow-sm">
                      {t.overall_avg} / 5
                    </div>
                  </div>
                </div>
              ))}
              {bottomTeachers.length === 0 && (
                 <div className="text-center py-8">
                   <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-8 h-8 text-emerald-500"/></div>
                   <p className="text-emerald-600 font-black">أداء ممتاز! لا يوجد معلمين دون المستوى.</p>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* 📊 الجدول التفصيلي للتقييمات */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
             <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> السجل الشامل لتقييم المعلمين</h3>
             <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm" placeholder="ابحث عن معلم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTeachers.map(t => (
              <div key={t.teacher_id} className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 transition-colors shadow-sm flex flex-col group">
                 <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                         {t.avatar ? <img src={t.avatar} crossOrigin="anonymous" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black">{t.name.charAt(0)}</div>}
                       </div>
                       <div>
                         <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{t.name}</h4>
                         <p className="text-[10px] font-bold text-slate-500">{t.subject} • {t.total_evals} تقييم</p>
                       </div>
                    </div>
                    <StarDisplay val={t.overall_avg} />
                 </div>

                 <div className="flex-1 mb-4">
                   <ProgressBar value={t.sci_avg} label="المحور العلمي (الشرح)" colorClass="bg-blue-500" />
                   <ProgressBar value={t.mgt_avg} label="المحور الإداري (إدارة الفصل)" colorClass="bg-emerald-500" />
                   <ProgressBar value={t.hum_avg} label="المحور الإنساني (التعامل)" colorClass="bg-purple-500" />
                 </div>

                 <button onClick={() => { setSelectedTeacher(t); setIsFeedbackModalOpen(true); }} disabled={t.feedbacks.length === 0} className="w-full mt-auto py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-black text-xs rounded-xl transition-all border border-slate-200 hover:border-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                   <MessageSquare className="w-4 h-4"/> عرض التعليقات ({t.feedbacks.length})
                 </button>
              </div>
            ))}
            {filteredTeachers.length === 0 && <p className="col-span-full text-center py-10 font-bold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">لا يوجد بيانات تقييم مطابقة.</p>}
          </div>
        </div>
      </div>

      {/* 🚀 نافذة قراءة تعليقات الطلاب (Feedback Modal) */}
      <AnimatePresence>
        {isFeedbackModalOpen && selectedTeacher && (
          <Dialog.Root open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-[2rem] w-[95%] max-w-xl shadow-2xl z-50 p-6 sm:p-8" dir="rtl">
                
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 shrink-0"><MessageSquare className="w-5 h-5"/></div>
                     <div>
                       <Dialog.Title className="text-lg font-black text-slate-800">صندوق الأسرار والتعليقات</Dialog.Title>
                       <p className="text-[10px] font-bold text-slate-500 mt-1">الخاصة بالمعلم: <span className="text-indigo-600">{selectedTeacher.name}</span></p>
                     </div>
                  </div>
                  <Dialog.Close className="text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors active:scale-90"><X className="w-5 h-5"/></Dialog.Close>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                  {selectedTeacher.feedbacks.map((fb: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                       <div className="absolute top-4 right-4 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">👤</div>
                       <p className="text-sm font-bold text-slate-700 leading-relaxed pr-8 whitespace-pre-wrap">"{fb.text}"</p>
                       <p className="text-[9px] font-bold text-slate-400 mt-3 border-t border-slate-200 pt-2 text-left" dir="ltr">{format(new Date(fb.date), 'dd MMM yyyy - hh:mm a')}</p>
                    </div>
                  ))}
                </div>

              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
