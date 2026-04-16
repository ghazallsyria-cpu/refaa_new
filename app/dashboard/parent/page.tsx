/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, BookOpen, Calendar, CheckCircle2, Clock, FileText, 
  GraduationCap, TrendingUp, AlertTriangle, Award, MessageCircle,
  Play, Star, ShieldAlert, XCircle, Activity, Loader2, Heart, 
  ChevronDown, Send, UserCheck, ShieldCheck, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ParentDashboard() {
  const { user, authRole, isChecking } = useAuth() as any;
  const [parentData, setParentData] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // بيانات المواد والدرجات المدمجة
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // 1. جلب بيانات ولي الأمر وأبنائه
  const fetchParentData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: pData } = await supabase.from('parents').select('*, users(full_name, avatar_url)').eq('id', user.id).maybeSingle();
      if (pData) setParentData(pData);

      const { data: cData } = await supabase.from('students').select('*, users(full_name, avatar_url), sections(name, classes(name))').eq('parent_id', user.id);
      if (cData && cData.length > 0) {
        setChildren(cData);
        setActiveChildId(cData[0].id);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!isChecking) fetchParentData(); }, [fetchParentData, isChecking]);

  // 2. جلب الأداء الأكاديمي التفصيلي لكل مادة (الواجبات + الاختبارات)
  const fetchAcademicData = useCallback(async (childId: string) => {
    setChildLoading(true);
    try {
      // جلب جميع المواد المسجلة للطالب عبر فصله
      const activeChild = children.find(c => c.id === childId);
      if (!activeChild?.section_id) return;

      const { data: subjects } = await supabase
        .from('schedules')
        .select('subjects(id, name), teachers(id, users(full_name, avatar_url))')
        .eq('section_id', activeChild.section_id);

      // تنظيف المواد المكررة في الجدول
      const uniqueSubjects = Array.from(new Map(subjects?.map(item => [item.subjects.id, item])).values());

      // لكل مادة، نجلب الواجبات والاختبارات
      const performancePromises = uniqueSubjects.map(async (item: any) => {
        const subId = item.subjects.id;
        
        // جلب درجات الاختبارات لهذه المادة
        const { data: examScores } = await supabase
          .from('exam_attempts')
          .select('score, status, exams(title, total_marks, subjects(id))')
          .eq('student_id', childId)
          .eq('status', 'graded');
        
        // جلب درجات الواجبات لهذه المادة
        const { data: assignmentScores } = await supabase
          .from('assignment_submissions')
          .select('grade, status, assignments(title, total_marks, subjects(id))')
          .eq('student_id', childId)
          .eq('status', 'graded');

        const filteredExams = examScores?.filter((e: any) => e.exams.subjects.id === subId) || [];
        const filteredAssignments = assignmentScores?.filter((a: any) => a.assignments.subjects.id === subId) || [];

        return {
          ...item,
          exams: filteredExams,
          assignments: filteredAssignments,
          average: calculateAverage([...filteredExams, ...filteredAssignments])
        };
      });

      const results = await Promise.all(performancePromises);
      setSubjectPerformance(results);

    } catch (e) { console.error(e); } finally { setChildLoading(false); }
  }, [children]);

  useEffect(() => { if (activeChildId) fetchAcademicData(activeChildId); }, [activeChildId, fetchAcademicData]);

  const calculateAverage = (items: any[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => {
      const score = curr.score || curr.grade || 0;
      const max = curr.exams?.total_marks || curr.assignments?.total_marks || 100;
      return acc + (score / max);
    }, 0);
    return Math.round((total / items.length) * 100);
  };

  if (isChecking || loading) return <div className="flex h-[80vh] items-center justify-center font-cairo"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24 max-w-7xl mx-auto px-4 font-cairo pt-6" dir="rtl">
      
      {/* 🔝 الهيدر: اختيار الابن والترحيب */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
         <div className="text-center md:text-right">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">مرحباً، أ. {parentData?.users?.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 font-bold mt-1">تـابـع رحـلة أبـنائـك التعليمية في مدرسة الرفعة</p>
         </div>
         <div className="flex gap-3 overflow-x-auto p-2 pb-4 no-scrollbar">
            {children.map(child => (
              <button 
                key={child.id} onClick={() => setActiveChildId(child.id)}
                className={cn("flex items-center gap-3 px-5 py-3 rounded-2xl transition-all border-2 shrink-0 shadow-sm", activeChildId === child.id ? "bg-white border-indigo-600 ring-4 ring-indigo-50" : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200")}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">{child.users?.full_name?.charAt(0)}</div>
                <span className="font-black text-sm text-slate-700">{child.users?.full_name?.split(' ')[0]}</span>
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 📚 العمود الأيمن: لوحة التحكم الأكاديمية (8 أعمدة) */}
        <div className="lg:col-span-8 space-y-8">
          
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><BookOpen className="text-indigo-500"/> السجل الأكاديمي للمواد</h2>
              <span className="text-xs font-bold text-slate-400">آخر تحديث: اليوم</span>
            </div>

            {childLoading ? (
               <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-200" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectPerformance.map((item, idx) => (
                  <motion.div 
                    key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
                  >
                    {/* خلفية جمالية خفيفة */}
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:bg-indigo-100 transition-colors"></div>
                    
                    <div className="flex items-start justify-between relative z-10 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-200">{item.average}%</div>
                        <div>
                          <h3 className="font-black text-slate-800 text-lg">{item.subjects.name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">أ. {item.teachers?.users?.full_name}</p>
                        </div>
                      </div>
                      <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><MessageCircle className="w-5 h-5"/></button>
                    </div>

                    {/* تفاصيل الدرجات (Accordion-like) */}
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between text-xs font-black px-4 py-3 bg-slate-50 rounded-2xl">
                         <span className="text-slate-500">الواجبات المنجزة</span>
                         <span className="text-emerald-600">{item.assignments.length} سجلات</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-black px-4 py-3 bg-slate-50 rounded-2xl">
                         <span className="text-slate-500">الاختبارات المقيمة</span>
                         <span className="text-indigo-600">{item.exams.length} سجلات</span>
                      </div>
                    </div>

                    <button className="w-full mt-4 py-3 bg-white border border-slate-100 text-slate-600 font-black text-xs rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                       عرض السجل الكامل <ChevronDown className="w-4 h-4"/>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* سجل الغياب اليومي (نبض اليوم) */}
          <section className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><Activity className="text-rose-400 animate-pulse"/> التقرير السلوكي والحضور</h2>
                  <p className="text-indigo-200 font-bold text-sm">متابعة دقيقة لمستوى انضباط الطالب وحضوره للحصص.</p>
                </div>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-2xl font-black transition-all backdrop-blur-md">طلب تقرير مفصل</button>
             </div>
          </section>

        </div>

        {/* 💬 العمود الأيسر: جسر التواصل الموحد (4 أعمدة) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 sticky top-24">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Headphones className="w-6 h-6"/></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">جسر التواصل الموحد</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">تواصل مباشر مع المدرسة</p>
                </div>
             </div>

             <div className="space-y-4">
                <p className="text-sm font-bold text-slate-600 mb-4 px-1">لمن تريد توجيه رسالتك اليوم؟</p>
                
                {[
                  { label: 'مدير المدرسة', role: 'admin', icon: ShieldCheck, color: 'indigo' },
                  { label: 'الأخصائي الاجتماعي', role: 'staff', icon: Users, color: 'emerald' },
                  { label: 'المكتب الفني', role: 'management', icon: Star, color: 'amber' },
                  { label: 'طاقم المعلمين', role: 'teacher', icon: GraduationCap, color: 'rose' }
                ].map((target, i) => (
                  <button 
                    key={i} 
                    className={`w-full group flex items-center justify-between p-4 bg-slate-50 hover:bg-white hover:shadow-lg hover:ring-2 hover:ring-${target.color}-500/10 rounded-2xl transition-all border border-transparent hover:border-${target.color}-100`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-${target.color}-100 text-${target.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <target.icon className="w-5 h-5"/>
                      </div>
                      <span className="font-black text-slate-700 text-sm">{target.label}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors -rotate-90"/>
                  </button>
                ))}
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                  <h4 className="text-indigo-900 font-black text-sm mb-2 flex items-center gap-2"><Heart className="w-4 h-4 fill-indigo-200"/> ملاحظة من المعلم</h4>
                  {/* 🚀 تم حل الخطأ هنا باستخدام الأقواس {"..."} */}
                  <p className="text-indigo-700/80 text-xs font-bold leading-relaxed italic">
                    {"أحمد أظهر تميزاً لافتاً في مادة الفيزياء هذا الأسبوع، نرجو الاستمرار في تشجيعه على حل التجارب العملية."}
                  </p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
