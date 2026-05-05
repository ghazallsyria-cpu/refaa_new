// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Loader2, RefreshCw, BookOpen, CheckCircle2, ShieldCheck, Clock, FileSignature, ArrowRightLeft, UploadCloud
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function ExamPipelineDashboard() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [pipelineData, setPipelineData] = useState<any[]>([]);

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchPipeline = async () => {
    setIsLoading(true);
    try {
      // جلب جميع الاختبارات مع حالة المسار الخاص بها
      const { data: exams } = await supabase
        .from('exam_timetables')
        .select(`
          id, class_level, exam_date,
          subjects(name),
          exam_pipeline(handover_status, coursework_status, ministry_sync_status)
        `)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('exam_date');

      const formatted = (exams || []).map(ex => {
        const pipe = Array.isArray(ex.exam_pipeline) ? ex.exam_pipeline[0] : ex.exam_pipeline;
        
        let progress = 0;
        if (pipe) {
          if (pipe.handover_status === 'with_hod') progress = 25;
          if (pipe.handover_status === 'returned_to_control') progress = 50;
          if (pipe.coursework_status) progress = 75;
          if (pipe.ministry_sync_status) progress = 100;
        }

        return {
          id: ex.id,
          subject: ex.subjects?.name,
          level: ex.class_level,
          date: ex.exam_date,
          pipeline: pipe || { handover_status: 'pending', coursework_status: false, ministry_sync_status: false },
          progress
        };
      });

      setPipelineData(formatted);
    } catch (error) {
      console.error('Pipeline Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'management'].includes(currentRole)) fetchPipeline();
  }, [currentRole]);

  // تحديث حالة أعمال السنة والوزارة (يضغط عليها المدير يدوياً)
  const toggleStatus = async (timetableId: string, field: 'coursework_status' | 'ministry_sync_status', currentValue: boolean) => {
    try {
      await supabase.from('exam_pipeline').upsert({ 
        timetable_id: timetableId, 
        [field]: !currentValue 
      }, { onConflict: 'timetable_id' });
      fetchPipeline(); // تحديث اللوحة
    } catch (error) { alert('خطأ في التحديث'); }
  };

  if (!['admin', 'management'].includes(currentRole)) return null;

  return (
    <div className="min-h-screen bg-[#0a0d16] p-4 sm:p-6 lg:p-8 font-cairo text-slate-200" dir="rtl">
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* هيدر اللوحة */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] p-8 border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">مسار إنجاز الكنترول (Pipeline)</h1>
              <p className="text-slate-400 font-bold mt-1">تتبع دورة حياة كل مادة من قاعة الامتحان حتى بوابة الوزارة.</p>
            </div>
          </div>
          <button onClick={fetchPipeline} className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all relative z-10">
            <RefreshCw className={cn("w-5 h-5 text-indigo-400", isLoading && "animate-spin")} />
          </button>
        </div>

        {/* شبكة المواد الدراسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pipelineData.map((item) => {
            const isDone = item.progress === 100;

            return (
              <div key={item.id} className={cn("bg-slate-900/60 backdrop-blur-md rounded-[1.5rem] p-6 border relative overflow-hidden transition-all duration-300", isDone ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-slate-800 hover:border-slate-600")}>
                
                {isDone && <div className="absolute top-0 right-0 w-full h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">{item.subject}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">الصف {item.level} | {item.date}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-black text-lg text-indigo-400 border border-slate-700">
                    {item.progress}%
                  </div>
                </div>

                {/* شريط التقدم 4 مراحل */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 mb-6 overflow-hidden flex">
                  <div className={cn("h-full transition-all duration-1000", item.progress >= 25 ? "bg-amber-500" : "bg-transparent")} style={{ width: '25%' }}></div>
                  <div className={cn("h-full transition-all duration-1000", item.progress >= 50 ? "bg-blue-500" : "bg-transparent")} style={{ width: '25%' }}></div>
                  <div className={cn("h-full transition-all duration-1000", item.progress >= 75 ? "bg-indigo-500" : "bg-transparent")} style={{ width: '25%' }}></div>
                  <div className={cn("h-full transition-all duration-1000", item.progress === 100 ? "bg-emerald-500" : "bg-transparent")} style={{ width: '25%' }}></div>
                </div>

                {/* المحطات (Checkpoints) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.progress >= 25 ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-500")}><ArrowRightLeft className="w-4 h-4"/></div>
                      <span className="text-sm font-bold text-slate-300">مظاريف التصحيح</span>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-900 px-2 py-1 rounded">
                      {item.progress >= 50 ? <span className="text-blue-400">تم الاسترجاع</span> : item.progress >= 25 ? <span className="text-amber-400">قيد التصحيح</span> : <span className="text-slate-500">في الكنترول</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.progress >= 75 ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500")}><FileSignature className="w-4 h-4"/></div>
                      <span className="text-sm font-bold text-slate-300">رصد أعمال السنة</span>
                    </div>
                    <button onClick={() => toggleStatus(item.id, 'coursework_status', item.pipeline.coursework_status)} className={cn("text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all", item.progress >= 75 ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600")}>
                      {item.progress >= 75 ? 'تم الرصد' : 'اعتماد الرصد'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.progress === 100 ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500")}><UploadCloud className="w-4 h-4"/></div>
                      <span className="text-sm font-bold text-slate-300">نظام الوزارة</span>
                    </div>
                    <button onClick={() => toggleStatus(item.id, 'ministry_sync_status', item.pipeline.ministry_sync_status)} className={cn("text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all", item.progress === 100 ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-400 hover:bg-slate-600")}>
                      {item.progress === 100 ? 'تم الرفع النهائي' : 'اعتماد الرفع'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
