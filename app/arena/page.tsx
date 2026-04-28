
/* eslint-disable react/no-unescaped-entities */
// @ts-nocheck

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, FileText, ChevronLeft, Sparkles, BrainCircuit, 
  Clock, CheckCircle2, MessageSquareHeart, RefreshCcw, BookOpen, Layers, Filter
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function StudentArenaDashboard() {
  const router = useRouter();
  const { user } = useAuth() as any;
  
  const [groupedMissions, setGroupedMissions] = useState<any>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('الكل');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchArenaData = async () => {
      try {
        // 1. جلب فصل الطالب الحالي لمعرفة الدروس المخصصة له
        const { data: studentData, error: studentErr } = await supabase
          .from('students')
          .select('section_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!studentData?.section_id) {
          console.warn("الطالب غير مسجل في أي فصل.");
          setLoading(false);
          return;
        }

        // 2. جلب أرقام الدروس (الواجبات) المربوطة بفصل الطالب
        const { data: sectionAssignments } = await supabase
          .from('assignment_sections_v2')
          .select('assignment_id')
          .eq('section_id', studentData.section_id);

        const assignmentIds = (sectionAssignments || []).map(sa => sa.assignment_id);

        if (assignmentIds.length === 0) {
           setGroupedMissions({});
           setSubjects(['الكل']);
           setLoading(false);
           return;
        }

        // 3. جلب بيانات الدروس "المنشورة" فقط والخاصة بهذا الطالب
        const { data: assignmentsData, error: assignErr } = await supabase
          .from('assignments_v2')
          .select('*')
          .in('id', assignmentIds)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (assignErr) throw assignErr;

        if (!assignmentsData || assignmentsData.length === 0) {
           setGroupedMissions({});
           setSubjects(['الكل']);
           setLoading(false);
           return;
        }

        // 4. جلب أسماء المواد بشكل منفصل وآمن (لتجنب أخطاء الـ Joins)
        const { data: subjectsData } = await supabase.from('subjects').select('id, name');

        // 5. جلب الأسئلة لحساب العدد الإجمالي لكل درس
        const { data: questionsData } = await supabase
          .from('assignment_questions_v2')
          .select('id, assignment_id')
          .in('assignment_id', assignmentIds);

        // 6. جلب تقدم الطالب في هذه الدروس
        const { data: progressData, error: progErr } = await supabase
          .from('student_progress_v2')
          .select('*')
          .eq('student_id', user.id);

        // 7. دمج وتجميع البيانات الذكي
        const allMissions = assignmentsData.map(assign => {
          const subject = (subjectsData || []).find(s => s.id === assign.subject_id);
          const totalQuestions = (questionsData || []).filter(q => q.assignment_id === assign.id).length || 1;
          const userProgress = (progressData || []).find((p: any) => p.assignment_id === assign.id);
          
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
            status,
            subject_name: subject?.name || 'مادة عامة'
          };
        });

        // 8. التجميع حسب المادة لعرضها كعلامات تبويب (Tabs)
        const groups = allMissions.reduce((acc: any, mission: any) => {
          const sName = mission.subject_name;
          if (!acc[sName]) acc[sName] = [];
          acc[sName].push(mission);
          return acc;
        }, {});

        setGroupedMissions(groups);
        setSubjects(['الكل', ...Object.keys(groups)]);
      } catch (err) {
        console.error('Error fetching arena data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArenaData();
  }, [user?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-500 font-bold flex flex-col items-center gap-2"><Sparkles className="w-8 h-8"/> جاري تجهيز مناهجك الدراسية...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-cairo" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-right">
              <div className="inline-flex p-3 bg-white/10 backdrop-blur-xl rounded-2xl mb-4 border border-white/20">
                <Layers className="w-8 h-8 text-indigo-300" />
              </div>
              <h1 className="text-3xl font-black mb-2">مناهج التحدي الذكية</h1>
              <p className="text-indigo-100 font-bold text-sm max-w-lg leading-relaxed">
                تصفح بنوك الأسئلة المنظمة حسب مادتك العلمية وتابع تقدمك في كل وحدة دراسية.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 flex gap-6 text-center">
              <div>
                <div className="text-2xl font-black text-indigo-300">{subjects.length > 0 ? subjects.length - 1 : 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">مواد نشطة</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <div className="text-2xl font-black text-emerald-400">
                  {Object.values(groupedMissions).flat().filter((m: any) => m.status === 'completed').length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">دروس مكتملة</div>
              </div>
            </div>
          </div>
          <BrainCircuit className="absolute -left-10 -bottom-10 w-64 h-64 text-white opacity-5" />
        </div>

        {subjects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub)}
                className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all border-2 
                  ${activeSubject === sub 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                    : 'bg-white text-slate-500 border-transparent hover:border-slate-200'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-12">
          {subjects.filter(s => s !== 'الكل' && (activeSubject === 'الكل' || activeSubject === s)).map((subjectName) => (
            <motion.section 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              key={subjectName} 
              className="space-y-4"
            >
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  {subjectName}
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {groupedMissions[subjectName]?.length} بنوك دروس
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedMissions[subjectName].map((mission: any) => (
                  <motion.div 
                    whileHover={{ y: -8 }}
                    key={mission.id} 
                    onClick={() => router.push(`/practice/${mission.id}`)}
                    className={`group bg-white rounded-[2rem] p-6 shadow-sm border-2 cursor-pointer transition-all hover:shadow-2xl flex flex-col h-full relative overflow-hidden
                      ${mission.status === 'completed' ? 'border-emerald-200 shadow-emerald-50' : 
                        mission.status === 'in_progress' ? 'border-amber-200 shadow-amber-50' : 'border-slate-100 hover:border-indigo-200'}`}
                  >
                    {mission.status !== 'new' && (
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                        <div className={`h-full transition-all duration-1000 ${mission.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${mission.percentage}%` }} />
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${mission.is_practice_mode ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                        {mission.is_practice_mode ? <Gamepad2 className="w-6 h-6"/> : <FileText className="w-6 h-6"/>}
                      </div>
                      {mission.status === 'completed' && <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full"><CheckCircle2 className="w-5 h-5"/></div>}
                    </div>

                    <h3 className="font-black text-slate-800 text-lg mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{mission.title}</h3>
                    <p className="text-xs font-bold text-slate-500 line-clamp-2 mb-6 flex-1">{mission.description}</p>
                    
                    {mission.progress?.teacher_feedback && (
                      <div className="mb-6 bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2 ring-4 ring-white">
                        <MessageSquareHeart className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-700 leading-snug line-clamp-2">{mission.progress.teacher_feedback}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الحالة</span>
                        <span className={`text-xs font-black ${mission.status === 'completed' ? 'text-emerald-600' : mission.status === 'in_progress' ? 'text-amber-600' : 'text-slate-400'}`}>
                          {mission.status === 'completed' ? 'مكتمل' : mission.status === 'in_progress' ? `${mission.percentage}% منجز` : 'لم يبدأ'}
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl transition-all ${mission.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white group-hover:bg-indigo-600 shadow-lg'}`}>
                        <ChevronLeft className="w-5 h-5" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {subjects.length <= 1 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="font-black text-slate-400">لا توجد بنوك دروس مفعلة لمنهجك حالياً.</p>
            <p className="text-xs text-slate-400 mt-2">تأكد أن المعلم قام باختيار فصلك عند إنشاء الدرس واختار "نشر للطلاب".</p>
          </div>
        )}

      </div>
    </div>
  );
}
