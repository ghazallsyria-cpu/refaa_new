// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/auth-context';
import { motion } from 'framer-motion';
// 🚀 تم إضافة RefreshCcw هنا
import { Gamepad2, FileText, ChevronLeft, Sparkles, BrainCircuit, Clock, PlayCircle, CheckCircle2, MessageSquareHeart, RefreshCcw } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function StudentArenaDashboard() {
  const router = useRouter();
  const { user } = useAuth() as any;
  
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchArenaData = async () => {
      try {
        const { data: assignmentsData, error: assignErr } = await supabase
          .from('assignments_v2')
          .select(`
            id, title, description, is_practice_mode, created_at,
            subjects ( name ),
            assignment_questions_v2 ( id )
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (assignErr) throw assignErr;

        const { data: progressData, error: progErr } = await supabase
          .from('student_progress_v2')
          .select('*')
          .eq('student_id', user.id);

        if (progErr) throw progErr;

        const mergedMissions = assignmentsData?.map(assign => {
          const totalQuestions = assign.assignment_questions_v2?.length || 1;
          const userProgress = progressData?.find(p => p.assignment_id === assign.id);
          
          let percentage = 0;
          let status = 'new'; 

          if (userProgress) {
            if (userProgress.is_completed) {
              percentage = 100;
              status = 'completed';
            } else {
              percentage = Math.round((userProgress.current_index / totalQuestions) * 100);
              status = 'in_progress';
            }
          }

          return {
            ...assign,
            total_questions: totalQuestions,
            progress: userProgress || null,
            percentage,
            status
          };
        });

        setMissions(mergedMissions || []);
      } catch (err) {
        console.error('Error fetching arena data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArenaData();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-500 font-bold flex flex-col items-center gap-2"><Sparkles className="w-8 h-8"/> جاري تحميل الساحة التفاعلية...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-4">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black mb-2">ساحة التدريب الخاصة بك</h1>
            <p className="text-indigo-100 font-bold text-sm max-w-lg leading-relaxed">
              استأنف تدريباتك من حيث توقفت، راقب إنجازاتك، وشاهد ملاحظات معلمك هنا!
            </p>
          </div>
          <BrainCircuit className="absolute -left-10 -bottom-10 w-64 h-64 text-white opacity-5" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 px-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> التحديات المتاحة ({missions.length})
          </h2>
          
          {missions.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-200">
              <p className="font-bold text-slate-500">لا توجد تحديات متاحة حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {missions.map((mission) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={mission.id} 
                  onClick={() => router.push(`/practice/${mission.id}`)}
                  className={`bg-white rounded-3xl p-5 shadow-sm border-2 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between h-full relative overflow-hidden
                    ${mission.status === 'completed' ? 'border-emerald-300' : 
                      mission.status === 'in_progress' ? 'border-amber-300' : 'border-indigo-100'}`}
                >
                  
                  {mission.status !== 'new' && (
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${mission.percentage}%` }} 
                        className={`h-full ${mission.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1 
                        ${mission.is_practice_mode ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                        {mission.is_practice_mode ? <Gamepad2 className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                        {mission.is_practice_mode ? 'بنك تدريب' : 'واجب رسمي'}
                      </span>
                      {mission.subjects?.name && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{mission.subjects.name}</span>
                      )}
                    </div>

                    <h3 className="font-black text-slate-800 text-lg mb-2">{mission.title}</h3>
                    <p className="text-xs font-bold text-slate-500 line-clamp-2 mb-4">{mission.description}</p>
                    
                    {mission.progress?.teacher_feedback && (
                      <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                        <MessageSquareHeart className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-black text-amber-800 block mb-0.5">رسالة من المعلم:</span>
                          <span className="text-xs font-bold text-amber-700 leading-snug">{mission.progress.teacher_feedback}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-auto">
                    <div className="flex items-center gap-2">
                      {mission.status === 'completed' ? (
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl"><CheckCircle2 className="w-4 h-4"/> مكتمل بنجاح</span>
                      ) : mission.status === 'in_progress' ? (
                        <span className="text-xs font-black text-amber-600 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl"><RefreshCcw className="w-4 h-4"/> مكتمل {mission.percentage}%</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> جديد</span>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl transition-colors
                      ${mission.status === 'completed' ? 'text-emerald-700 bg-emerald-100' : 
                        mission.status === 'in_progress' ? 'text-amber-700 bg-amber-100' : 'text-white bg-slate-900 hover:bg-slate-800'}`}>
                      {mission.status === 'completed' ? 'مراجعة' : mission.status === 'in_progress' ? 'إكمال التحدي' : 'ابدأ الآن'} <ChevronLeft className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
