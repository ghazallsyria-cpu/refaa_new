// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, User, GraduationCap, Clock, CheckCircle2, AlertCircle, 
  BookOpen, FileText, Medal, Loader2, Activity, Target, ShieldAlert,
  MessageSquareHeart, Send, ShieldCheck, Database, XCircle
} from 'lucide-react';

export default function Student360Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  // 🚀 حالات البيانات
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'assignments' | 'attendance' | 'notes'>('overview');
  
  // 🚀 التخزين المؤقت للتبويبات (Lazy Load Cache)
  const [tabData, setTabData] = useState<Record<string, any>>({});
  const [isTabLoading, setIsTabLoading] = useState(false);

  // إرسال ملاحظة جديدة
  const [newNote, setNewNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);

  // 1. جلب البيانات الأساسية من الدالة המجمعة السريعة
  const fetchSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_student_360_summary', { p_student_id: studentId });
      if (error) throw error;
      setSummaryData(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (['admin', 'management', 'teacher', 'staff'].includes(currentRole)) {
      fetchSummary();
    }
  }, [currentRole, fetchSummary]);

  // 2. التحميل الكسول للتبويبات (Lazy Loading Tabs)
  const loadTabData = async (tab: string) => {
    if (tabData[tab]) return; // إذا كانت البيانات موجودة في الكاش، لا تفعل شيئاً
    if (tab === 'overview') return;

    setIsTabLoading(true);
    try {
      let data = null;
      if (tab === 'grades') {
        const { data: res } = await supabase.from('grades').select('*, subjects(name)').eq('student_id', studentId).order('created_at', { ascending: false });
        data = res;
      } else if (tab === 'assignments') {
        const { data: res } = await supabase.from('student_progress_v2').select('*, assignments_v2(title, max_points, is_practice_mode)').eq('student_id', studentId).order('updated_at', { ascending: false });
        data = res;
      } else if (tab === 'attendance') {
        const { data: res } = await supabase.from('attendance_records').select('*, subjects(name)').eq('student_id', studentId).order('date', { ascending: false });
        data = res;
      } else if (tab === 'notes') {
        const { data: res } = await supabase.from('private_student_notes').select('*, users!private_student_notes_teacher_id_fkey(full_name, avatar_url, role)').eq('student_id', studentId).order('created_at', { ascending: false });
        data = res;
      }
      
      setTabData(prev => ({ ...prev, [tab]: data || [] }));
    } catch (err) {
      console.error(`Error loading ${tab}:`, err);
    } finally {
      setIsTabLoading(false);
    }
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setIsSendingNote(true);
    try {
      const { data, error } = await supabase.from('private_student_notes').insert({
        student_id: studentId,
        teacher_id: user.id,
        content: newNote.trim()
      }).select('*, users!private_student_notes_teacher_id_fkey(full_name, avatar_url, role)').single();
      
      if (error) throw error;
      
      // تحديث الكاش فوراً
      setTabData(prev => ({
        ...prev,
        notes: [data, ...(prev.notes || [])]
      }));
      setNewNote('');
    } catch (err) {
      alert('خطأ في حفظ الملاحظة');
    } finally {
      setIsSendingNote(false);
    }
  };

  if (!['admin', 'management', 'teacher', 'staff'].includes(currentRole)) return null;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
           <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600 h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-indigo-900 animate-pulse tracking-widest">جاري تحميل ملف الطالب الشامل...</h2>
      </div>
    </div>
  );

  if (!summaryData?.basic_info) return <div className="p-10 text-center font-bold text-rose-500">حدث خطأ أو أن الطالب غير موجود.</div>;

  const { basic_info, academic_summary, attendance_summary, badges_count } = summaryData;
  const avgScore = Number(academic_summary?.average_score || 0).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 font-cairo pb-20 relative overflow-x-hidden" dir="rtl">
      
      {/* خلفية فخمة */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 overflow-hidden z-0">
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 sm:pt-12">
        
        {/* زر العودة */}
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 w-fit active:scale-95">
          <ArrowRight className="w-4 h-4" /> عودة للخلف
        </button>

        {/* 💳 البطاقة العلوية (Hero Card) */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none"></div>
           
           <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-[2rem] shadow-inner border-4 border-white flex items-center justify-center shrink-0 overflow-hidden text-indigo-600 font-black text-4xl">
                 {basic_info.avatar_url ? (
                    <img src={basic_info.avatar_url} className="w-full h-full object-cover" alt="Student" />
                 ) : (
                    basic_info.full_name.charAt(0)
                 )}
              </div>
              <div className="text-center md:text-right">
                 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{basic_info.full_name}</h1>
                 <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3">
                    <span className="bg-indigo-50 text-indigo-700 font-black text-xs px-3 py-1 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> الرقم المدني: {basic_info.national_id}</span>
                    <span className="bg-blue-50 text-blue-700 font-black text-xs px-3 py-1 rounded-lg border border-blue-100 shadow-sm flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/> {basic_info.class_name} - {basic_info.section_name}</span>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 sm:gap-6 relative z-10">
              <div className="text-center">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xl shadow-sm mb-2">{avgScore}%</div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">المعدل العام</p>
              </div>
              <div className="text-center">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black text-xl shadow-sm mb-2">{attendance_summary?.total_absences || 0}</div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">أيام الغياب</p>
              </div>
              <div className="text-center hidden sm:block">
                 <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 font-black text-xl shadow-sm mb-2"><Medal className="w-6 h-6"/></div>
                 <p className="text-[10px] sm:text-xs font-black text-slate-500 uppercase">{badges_count} وسام</p>
              </div>
           </div>
        </div>

        {/* 📑 شريط التبويبات */}
        <div className="mt-8 flex overflow-x-auto custom-scrollbar bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
           {[
             { id: 'overview', label: 'نظرة عامة', icon: Activity },
             { id: 'grades', label: 'السجل الأكاديمي', icon: FileText },
             { id: 'assignments', label: 'الواجبات والتسليم', icon: Target },
             { id: 'attendance', label: 'الغياب والانضباط', icon: ShieldAlert },
             { id: 'notes', label: 'الملاحظات السرية', icon: MessageSquareHeart },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => handleTabChange(tab.id)}
               className={cn(
                 "flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm transition-all duration-300",
                 activeTab === tab.id ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
               )}
             >
               <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
           ))}
        </div>

        {/* 📌 منطقة المحتوى (شاشة عرض التبويبات) */}
        <div className="mt-6">
           <AnimatePresence mode="wait">
              {isTabLoading ? (
                 <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center p-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                 </motion.div>
              ) : (
                 <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    
                    {/* التبويب 1: نظرة عامة */}
                    {activeTab === 'overview' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm col-span-1 md:col-span-2">
                             <h3 className="font-black text-lg text-slate-800 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500"/> ملخص النشاط</h3>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                  <div className="p-3 bg-white shadow-sm rounded-xl text-indigo-600"><FileText className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500">إجمالي الاختبارات</p>
                                    <p className="text-2xl font-black text-slate-800">{academic_summary?.total_exams_taken || 0}</p>
                                  </div>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                                  <div className="p-3 bg-white shadow-sm rounded-xl text-rose-500"><Clock className="w-6 h-6"/></div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500">تأخير صباحي</p>
                                    <p className="text-2xl font-black text-slate-800">{attendance_summary?.total_lates || 0}</p>
                                  </div>
                               </div>
                             </div>
                          </div>
                          
                          <div className="bg-gradient-to-br from-amber-500 to-orange-400 p-6 rounded-[2rem] shadow-md text-white relative overflow-hidden">
                             <Medal className="absolute -bottom-4 -left-4 w-32 h-32 text-white/20" />
                             <h3 className="font-black text-lg mb-2 relative z-10">صندوق الأوسمة</h3>
                             <p className="text-4xl font-black relative z-10 mt-4">{badges_count}</p>
                             <p className="text-xs font-bold text-amber-100 relative z-10 mt-1">وسام شرف أكاديمي وسلوكي</p>
                          </div>
                       </div>
                    )}

                    {/* التبويب 2: الدرجات والسجل الأكاديمي */}
                    {activeTab === 'grades' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                             <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Database className="w-5 h-5 text-indigo-500"/> سجل درجات الاختبارات والمهام</h3>
                          </div>
                          <div className="overflow-x-auto">
                             <table className="w-full text-right">
                                <thead>
                                   <tr className="bg-white text-slate-400 text-xs font-black uppercase tracking-wider border-b border-slate-100">
                                      <th className="p-4">المادة</th>
                                      <th className="p-4">التقييم / الاختبار</th>
                                      <th className="p-4 text-center">الدرجة المكتسبة</th>
                                      <th className="p-4">التاريخ</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                   {tabData['grades']?.length > 0 ? tabData['grades'].map((g: any) => (
                                      <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                         <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100">{g.subjects?.name || 'غير محدد'}</span></td>
                                         <td className="p-4">{g.title}</td>
                                         <td className="p-4 text-center">
                                            <span className="font-black text-lg text-slate-900">{g.score}</span> <span className="text-xs text-slate-400">/ {g.max_score}</span>
                                         </td>
                                         <td className="p-4 text-xs text-slate-500" dir="ltr">{new Date(g.created_at).toLocaleDateString('en-GB')}</td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={4} className="p-10 text-center text-slate-400">لا توجد درجات مسجلة حتى الآن.</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {/* التبويب 3: الواجبات والتسليم */}
                    {activeTab === 'assignments' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
                          {tabData['assignments']?.length > 0 ? tabData['assignments'].map((a: any) => {
                             const isGraded = a.teacher_feedback?.includes('[تم رصد الدرجة]');
                             return (
                                <div key={a.id} className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-200 transition-all">
                                   <div>
                                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                         {a.assignments_v2?.is_practice_mode ? <Target className="w-4 h-4 text-amber-500"/> : <FileText className="w-4 h-4 text-indigo-500"/>}
                                         {a.assignments_v2?.title || 'واجب بدون عنوان'}
                                      </h4>
                                      {a.teacher_feedback && !isGraded && <p className="text-xs font-bold text-indigo-600 mt-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm inline-block"><MessageSquareHeart className="w-3 h-3 inline mr-1"/> {a.teacher_feedback}</p>}
                                   </div>
                                   <div className="flex items-center gap-4 w-full md:w-auto">
                                      {isGraded ? (
                                         <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200 font-black text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4"/> مُصحح وتم رصد درجته
                                         </div>
                                      ) : a.is_completed ? (
                                         <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200 font-black text-sm flex items-center gap-2">
                                            <Clock className="w-4 h-4"/> بانتظار التصحيح
                                         </div>
                                      ) : (
                                         <div className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2">
                                            قيد الإنجاز
                                         </div>
                                      )}
                                   </div>
                                </div>
                             )
                          }) : (
                             <div className="p-10 text-center text-slate-400 font-bold">لا يوجد سجل للواجبات.</div>
                          )}
                       </div>
                    )}

                    {/* التبويب 4: الغياب */}
                    {activeTab === 'attendance' && (
                       <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                          <div className="overflow-x-auto">
                             <table className="w-full text-right">
                                <thead>
                                   <tr className="bg-slate-50 text-slate-500 text-xs font-black uppercase border-b border-slate-200">
                                      <th className="p-4">التاريخ</th>
                                      <th className="p-4">المادة / الحصة</th>
                                      <th className="p-4 text-center">الحالة</th>
                                   </tr>
                                </thead>
                                <tbody className="text-sm font-bold text-slate-700">
                                   {tabData['attendance']?.length > 0 ? tabData['attendance'].map((rec: any) => (
                                      <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                         <td className="p-4" dir="ltr">{new Date(rec.date).toLocaleDateString('en-GB')}</td>
                                         <td className="p-4"><span className="text-indigo-600">{rec.subjects?.name}</span> (حصة {rec.period})</td>
                                         <td className="p-4 text-center">
                                            {rec.status === 'absent' && <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-md text-xs font-black border border-rose-200">غائب</span>}
                                            {rec.status === 'late' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-xs font-black border border-amber-200">متأخر</span>}
                                            {rec.status === 'excused' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-black border border-blue-200">عذر مقبول</span>}
                                            {rec.status === 'present' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-black border border-emerald-200">حاضر</span>}
                                         </td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={3} className="p-10 text-center text-slate-400">سجل الانضباط ناصع البياض! لا توجد غيابات.</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {/* التبويب 5: الملاحظات السرية */}
                    {activeTab === 'notes' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-4">
                             {tabData['notes']?.length > 0 ? tabData['notes'].map((n: any) => (
                                <div key={n.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                                   <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-3">
                                         {n.users?.avatar_url ? <img src={n.users.avatar_url} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500">{String(n.users?.full_name).charAt(0)}</div>}
                                         <div>
                                            <p className="text-sm font-black text-slate-800">{n.users?.full_name} <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{n.users?.role === 'teacher' ? 'معلم' : 'إدارة'}</span></p>
                                         </div>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                                   </div>
                                   <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{n.content}</p>
                                </div>
                             )) : (
                                <div className="bg-white p-10 rounded-[2rem] border border-slate-200 text-center text-slate-400 font-bold">لا توجد ملاحظات سرية مسجلة لهذا الطالب.</div>
                             )}
                          </div>
                          
                          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 h-fit sticky top-6">
                             <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2"><MessageSquareHeart className="w-5 h-5"/> إضافة ملاحظة سرية</h3>
                             <textarea 
                               rows={4} 
                               value={newNote}
                               onChange={e => setNewNote(e.target.value)}
                               placeholder="اكتب ملاحظة حول سلوك أو أداء الطالب (لن يراها الطالب، بل الإدارة والمعلمين فقط)..."
                               className="w-full bg-white border border-indigo-200 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none shadow-sm mb-4"
                             />
                             <button onClick={handleAddNote} disabled={isSendingNote || !newNote.trim()} className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSendingNote ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>} حفظ الملاحظة
                             </button>
                          </div>
                       </div>
                    )}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html:`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}}/>
    </div>
  );
}
