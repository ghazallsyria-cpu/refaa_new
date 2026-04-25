/* eslint-disable react/no-unescaped-entities */
'use client';
// @ts-nocheck

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowRight, User, Calendar, Clock, CheckCircle, CheckCircle2, AlertCircle, Save, MessageSquare, Star, FileText, Link as LinkIcon, Eye, Edit, XCircle, Columns, MinusCircle, Lock, Trophy, Upload, Loader2, X, Award, AlignLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// 🚀 محرك تنسيق المعادلات والجداول المُحسّن بصرياً للمعلم (Light Theme)
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = String(content);
   
   // 1. إصلاح النزول للسطر (تحويل \n إلى <br/>)
   html = html.replace(/\\n/g, '<br/>').replace(/\\r\\n/g, '<br/>').replace(/\n/g, '<br/>').replace(/\\\$/g, '$');
   
   // 2. تلوين المعادلات الرياضية للثيم الفاتح
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-700 bg-indigo-50/80 border border-indigo-200 px-2.5 py-1 rounded-lg font-mono font-bold mx-1 shadow-sm inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   // 3. تنسيق الجداول للثيم الفاتح
   html = html.replace(/<table/g, '<table class="w-full text-right border-collapse my-4 min-w-[500px] border border-slate-300 rounded-xl overflow-hidden shadow-sm"');
   html = html.replace(/<th/g, '<th class="bg-indigo-50 p-4 border border-slate-300 font-black text-indigo-900 text-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-slate-300 bg-white text-slate-700 font-bold"');
   
   return { __html: html };
};

export default function GradingPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: assignmentId, submissionId } = use(params);
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const { fetchSubmissionDetails, updateSubmissionGrade } = useAssignmentsSystem();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionGrades, setQuestionGrades] = useState<Record<string, { isCorrect: boolean | null, pointsEarned: number, feedback: string }>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const details = await fetchSubmissionDetails(submissionId);
      if (details.assignment) setAssignment(details.assignment);
      if (details.questions) setQuestions(details.questions);

      if (details.submission) {
        setSubmission(details.submission);
        setGrade(details.submission.grade?.toString() || '');
        setFeedback(details.submission.feedback || '');

        if (details.answers && details.questions) {
          const answersMap: Record<string, any> = {};
          const gradesMap: Record<string, any> = {};
          
          const processedAnswers = details.answers.map((a: any) => {
            let finalAns = a.answer_text;
            if (a.selected_options && (!Array.isArray(a.selected_options) || a.selected_options.length > 0)) {
               finalAns = a.selected_options;
            }
            
            let isCorrectVal = null;
            if (a.is_correct === true || a.is_correct === false) {
                isCorrectVal = a.is_correct;
            } else if (Number(a.points_earned) > 0) {
                isCorrectVal = true;
            }

            return {
               originalId: a.question_id,
               finalAns,
               gradeData: { 
                  isCorrect: isCorrectVal, 
                  pointsEarned: Number(a.points_earned) || 0, 
                  feedback: a.feedback || '' 
               }
            };
          });

          const actualQuestions = details.questions.filter((q:any) => q.type !== 'section_header'); 
          
          actualQuestions.forEach((q: any, index: number) => {
             let matchedAns = processedAnswers.find((pa: any) => pa.originalId === q.id);
             
             if (!matchedAns && processedAnswers[index]) {
                matchedAns = processedAnswers[index];
             }

             if (matchedAns) {
                answersMap[q.id] = matchedAns.finalAns;
                gradesMap[q.id] = matchedAns.gradeData;
             }
          });

          setAnswers(answersMap);
          setQuestionGrades(gradesMap);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [submissionId, fetchSubmissionDetails]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🚀 1. تحميل مكتبة KaTeX مرة واحدة لمنع تكرار التحميل والانهيار
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('katex-js-grading')) {
      const link = document.createElement('link');
      link.id = 'katex-css-grading';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.id = 'katex-js-grading';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRender = document.createElement('script');
        autoRender.id = 'katex-auto-render-grading';
        autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        document.head.appendChild(autoRender);
      };
      document.head.appendChild(script);
    }
  }, []);

  // 🚀 2. إعادة رسم المعادلات كلما تفاعل المعلم (تغيير الدرجة أو النقر)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }
    }, 100); 
    return () => clearTimeout(timer);
  }, [questions, answers, questionGrades, loading]); 

  useEffect(() => {
    if (questions.length > 0 && Object.keys(questionGrades).length > 0) {
      let total = 0;
      Object.values(questionGrades).forEach(g => { total += (Number(g.pointsEarned) || 0); });
      setGrade(total.toString());
    }
  }, [questionGrades, questions.length]);

  const canEdit = currentRole === 'admin' || currentRole === 'management' || assignment?.teacher_id === user?.id;

  const handleSaveGrade = async () => {
    if (!canEdit) {
      setNotification({ type: 'error', message: 'عذراً، ليس لديك صلاحية لتقييم هذا الواجب.' });
      return;
    }
    if (grade === '') { setNotification({ type: 'error', message: 'يرجى إدخال الدرجة' }); return; }
    
    setIsSaving(true);
    try {
      if (!user) throw new Error('Not authenticated');
      const numericGrade = parseFloat(grade);
      
      const answersGrading = Object.entries(questionGrades).map(([qId, data]) => ({
         questionId: qId, 
         isCorrect: data.isCorrect !== null ? data.isCorrect : false,
         pointsEarned: data.pointsEarned, 
         feedback: data.feedback
      }));

      await updateSubmissionGrade(submissionId, numericGrade, feedback, submission?.student_id || '', assignment?.title || '', answersGrading);
      setNotification({ type: 'success', message: 'تم حفظ التقييم بنجاح' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      setNotification({ type: 'error', message: 'خطأ في الحفظ: ' + error.message });
    } finally { setIsSaving(false); }
  };

  const normalizeUrl = (url?: string) => {
    if (!url) return '';
    const clean = url.trim();
    return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 shadow-[0_0_30px_rgba(99,102,241,0.2)]"></div>
           <Award className="absolute h-8 w-8 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-indigo-800 font-black animate-pulse tracking-widest drop-shadow-sm">جاري سحب بيانات الإجابة...</p>
      </div>
    </div>
  );

  const studentName = submission?.student?.users?.full_name || submission?.student?.user?.full_name || 'طالب غير معروف';
  const dueDateObj = new Date(assignment?.due_date);
  const isOverdue = dueDateObj < new Date(submission?.submitted_at);
  const isGraded = submission?.status === 'graded';

  let questionCounter = 1;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-cairo text-slate-800 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* الخلفية المضيئة */}
      <div className="fixed top-1/4 left-[-10%] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] bg-indigo-100/50 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] bg-emerald-100/50 rounded-full blur-[140px] pointer-events-none z-0" />

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl font-bold flex items-center gap-3 sm:gap-4 backdrop-blur-xl border w-[90%] sm:w-auto ${notification.type === 'success' ? 'bg-white/95 text-emerald-700 border-emerald-200 shadow-[0_20px_50px_rgba(16,185,129,0.15)]' : 'bg-white/95 text-rose-700 border-rose-200 shadow-[0_20px_50px_rgba(244,63,94,0.15)]'}`}>
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>
            <span className="text-sm sm:text-lg font-black tracking-tight">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg transition-colors mr-auto active:scale-90"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
        
        {/* ההيدر والتحكم */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 bg-white/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden border border-slate-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 relative z-10">
            <Link href={`/assignments/${assignmentId}`} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 shadow-sm text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shrink-0 active:scale-95">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 shadow-sm text-indigo-700">
                <Star className="w-3.5 h-3.5" /> تقييم إجابة الطالب
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight line-clamp-1">{assignment?.title}</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10 mt-2 md:mt-0">
            {!canEdit && assignment && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-center text-xs sm:text-sm font-bold flex justify-center items-center gap-2 w-full shadow-sm">
                 <Eye className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                 وضع المعاينة فقط.
              </div>
            )}
            {canEdit && (
              <button onClick={handleSaveGrade} disabled={isSaving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 shrink-0">
                {isSaving ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Save className="h-4 w-4 sm:h-5 sm:w-5" />} 
                <span>حفظ التقييم</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Content */}
          <div className="xl:col-span-2 space-y-6 sm:space-y-8">
            <div className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden border border-slate-200 shadow-sm">
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-200 relative z-10">
                 <div className="flex items-center gap-3 sm:gap-4">
                   <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm font-black text-xl sm:text-2xl shrink-0">
                     {studentName.charAt(0)}
                   </div>
                   <div>
                     <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900">{studentName}</h2>
                     <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:mt-2">
                       <p className="text-[10px] sm:text-xs font-bold text-slate-600 flex items-center gap-1 sm:gap-1.5 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                         <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                         <span dir="ltr">{new Date(submission?.submitted_at || '').toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                       </p>
                       {isOverdue && <span className="text-[9px] sm:text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-1 rounded-md border border-rose-200 shadow-sm">تسليم متأخر</span>}
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-8 sm:mt-10 space-y-8 sm:space-y-10 relative z-10">
                 {questions.map((q, idx) => {
                   const isHeader = q.type === 'section_header';
                   const isComparison = q.type === 'comparison';
                   const studentAns = answers[q.id];
                   const qGrade = questionGrades[q.id] || { isCorrect: null, pointsEarned: 0, feedback: '' };
                   const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];

                   if (isHeader) {
                     return (
                       <div key={q.id} className="mt-8 mb-4">
                         <div className="bg-indigo-50/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border-l-4 border-indigo-600 shadow-sm">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="p-2 bg-indigo-100 rounded-xl">
                               <AlignLeft className="w-5 h-5 text-indigo-700" />
                             </div>
                             <h4 className="text-sm font-black text-indigo-800 uppercase tracking-widest">سياق السؤال / اقرأ بتمعن</h4>
                           </div>
                           <div 
                             className="prose max-w-none text-xl sm:text-2xl font-black text-slate-900 leading-relaxed" 
                             dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text || '')} 
                           />
                           {q.media_url && (
                             <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2 text-center">
                               <img src={q.media_url} className="w-auto max-h-80 mx-auto rounded-xl object-contain inline-block" alt="مرفق تمهيدي" />
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   }

                   // تجهيز إجابة الطالب
                   let studentAnswerText = studentAns;
                   let isUnanswered = false;

                   if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'checkbox') {
                      if (studentAns === undefined || studentAns === null || studentAns === '' || (Array.isArray(studentAns) && studentAns.length === 0)) {
                         isUnanswered = true;
                      } else {
                         let normalizedAns: string[] = [];
                         if (Array.isArray(studentAns)) {
                           normalizedAns = studentAns.map(String);
                         } else if (typeof studentAns === 'string') {
                           try {
                             const parsed = JSON.parse(studentAns);
                             normalizedAns = Array.isArray(parsed) ? parsed.map(String) : [String(studentAns)];
                           } catch {
                             normalizedAns = [String(studentAns)];
                           }
                         } else {
                           normalizedAns = [String(studentAns)];
                         }

                         const matchedOptions = safeOptions.filter((o: any) => {
                           const optId = String(o.id || o.content || o);
                           const optContent = String(o.content || o.text || o);
                           return normalizedAns.includes(optId) || normalizedAns.includes(optContent) || normalizedAns.includes(String(o));
                         });

                         if (matchedOptions.length > 0) {
                           studentAnswerText = matchedOptions.map((o: any) => o.content || o.text || o).join('، ');
                         } else {
                           studentAnswerText = normalizedAns.join('، ');
                         }
                      }
                   } else if (isComparison) {
                      isUnanswered = !studentAnswerText || studentAnswerText === '[]' || studentAnswerText === '';
                   } else {
                      isUnanswered = !studentAnswerText || studentAnswerText === '';
                   }

                   const currentQNumber = questionCounter++;

                   // 🌟 بطاقة السؤال للتصحيح
                   return (
                     <div key={q.id} className={`bg-white rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-sm border transition-all hover:shadow-md hover:border-indigo-200 ${isUnanswered ? 'border-slate-200 border-dashed' : qGrade.isCorrect ? 'border-emerald-300' : qGrade.isCorrect === false ? 'border-rose-300' : 'border-slate-200'}`}>
                       
                       {/* رأس السؤال */}
                       <div className="p-5 sm:p-6 lg:p-8 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                         <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
                           <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] flex items-center justify-center font-black text-lg sm:text-xl shadow-sm border ${isUnanswered ? 'bg-slate-100 text-slate-500 border-slate-200' : qGrade.isCorrect ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : qGrade.isCorrect === false ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                               {currentQNumber}
                           </div>
                           <div className="pt-1 sm:pt-2 w-full min-w-0">
                               <div className="prose max-w-none font-bold text-base sm:text-lg lg:text-xl text-slate-800 leading-relaxed overflow-hidden" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text)} />
                               {q.media_url && (
                                 <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2 inline-block">
                                   <img src={q.media_url} className="max-h-40 sm:max-h-48 w-auto rounded-lg object-contain" alt="مرفق توضيحي" />
                                 </div>
                               )}
                           </div>
                         </div>
                         <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 rounded-2xl font-black text-sm sm:text-base border border-slate-200 shrink-0 self-start sm:self-auto shadow-sm">
                           <Award className={`w-5 h-5 ${qGrade.isCorrect ? 'text-emerald-500' : 'text-slate-400'}`} />
                           <span className={qGrade.isCorrect ? 'text-emerald-600 text-lg' : 'text-slate-800 text-lg'}>{qGrade.pointsEarned || 0}</span>
                           <span className="text-slate-400">/</span>
                           <span className="text-slate-500">{Number(q.points) || 0} نقطة</span>
                         </div>
                       </div>

                       {/* منطقة الإجابة */}
                       <div className="p-5 sm:p-6 lg:p-8 bg-transparent">
                          <div className="text-xs sm:text-sm font-black text-slate-500 mb-4 flex items-center gap-1.5 sm:gap-2"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> إجابة الطالب:</div>
                          
                          {/* الجداول */}
                          {isComparison ? (
                            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-sm ${isUnanswered ? 'border-slate-200 bg-slate-50' : qGrade.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                              <div className="table-responsive-wrapper overflow-x-auto custom-scrollbar-light pb-2">
                                <table className="w-full text-right border-collapse min-w-[500px] sm:min-w-[600px] m-0">
                                  <thead>
                                    <tr className={isUnanswered ? 'bg-slate-100' : qGrade.isCorrect ? 'bg-emerald-100/50' : 'bg-rose-100/50'}>
                                      <th className="p-3 sm:p-4 border-b border-l border-slate-200 font-black text-slate-700 text-xs sm:text-sm w-1/3">وجه المقارنة</th>
                                      <th className="p-3 sm:p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-xs sm:text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[0]?.content || safeOptions[0] || 'الطرف الأول')} /></th>
                                      <th className="p-3 sm:p-4 border-b border-slate-200 font-black text-indigo-900 text-xs sm:text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(safeOptions[1]?.content || safeOptions[1] || 'الطرف الثاني')} /></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {safeOptions.slice(2).map((opt: any, rIdx: number) => {
                                      const aspect = opt.content || opt || '';
                                      let parsedAns: any[] = [];
                                      try { 
                                        if (typeof studentAns === 'string') parsedAns = JSON.parse(studentAns || '[]'); 
                                        else if (Array.isArray(studentAns)) parsedAns = studentAns;
                                      } catch(e){}
                                      return (
                                        <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-200 last:border-0">
                                          <td className="p-3 sm:p-4 border-l border-slate-200 font-bold text-slate-800 bg-slate-50/80 align-middle">
                                            <div dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                                          </td>
                                          <td className="p-3 sm:p-4 border-l border-slate-200 font-bold text-slate-900 text-xs sm:text-sm align-middle whitespace-pre-wrap text-center bg-white">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-400 font-normal">فارغ</span>}</td>
                                          <td className="p-3 sm:p-4 font-bold text-slate-900 text-xs sm:text-sm align-middle whitespace-pre-wrap text-center bg-white">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-400 font-normal">فارغ</span>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : q.type === 'file_upload' && !isUnanswered ? (
                            <div className="mt-2 p-2 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 inline-block shadow-sm">
                              {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                                 <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-64 sm:max-h-96 w-auto object-contain rounded-lg sm:rounded-xl border border-slate-200 bg-white p-1" />
                              ) : (
                                 <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 font-black hover:underline text-xs sm:text-sm px-3 sm:px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب المرفقة
                                 </a>
                              )}
                            </div>
                          ) : (
                            <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-sm ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed text-slate-500 italic' : qGrade.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : qGrade.isCorrect === false ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                                <div className="text-xs sm:text-sm font-black mb-3 flex items-center gap-2">
                                  {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : qGrade.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                                  <span className={isUnanswered ? 'text-slate-500' : qGrade.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>إجابتك المسجلة:</span>
                                </div>
                                <div className={`text-base sm:text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'italic' : ''}`}>
                                    {isUnanswered ? 'لم يتم تقديم إجابة.' : <div dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />}
                                </div>
                            </div>
                          )}

                          {/* أزرار التقييم للمعلم */}
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
                               <div className="xl:col-span-8 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-slate-50 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-inner">
                                  <button 
                                    disabled={!canEdit} 
                                    onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: true, pointsEarned: Number(q.points) || 0}}))} 
                                    className={`flex-1 w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 border ${qGrade.isCorrect === true ? 'bg-emerald-500 text-white shadow-md border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'} ${!canEdit && 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> إجابة صحيحة
                                  </button>
                                  <button 
                                    disabled={!canEdit} 
                                    onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: false, pointsEarned: 0}}))} 
                                    className={`flex-1 w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 border ${qGrade.isCorrect === false ? 'bg-rose-500 text-white shadow-md border-rose-600' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-600'} ${!canEdit && 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> إجابة خاطئة
                                  </button>
                               </div>
                               <div className="xl:col-span-4 flex items-center justify-between bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                                  <span className="text-[10px] sm:text-xs font-black text-slate-500 px-2">الدرجة الممنوحة:</span>
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={q.points} 
                                      disabled={!canEdit}
                                      value={qGrade.pointsEarned === 0 && qGrade.isCorrect !== true ? '' : qGrade.pointsEarned} 
                                      onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], pointsEarned: Number(e.target.value)}}))} 
                                      className={`w-16 sm:w-20 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center font-black text-indigo-700 outline-none ${canEdit ? 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20' : 'opacity-60 cursor-not-allowed'} shadow-inner text-sm sm:text-base`} 
                                      placeholder="0"
                                    />
                                    <span className="text-xs sm:text-sm font-black text-slate-400 pl-1 sm:pl-2">/ {q.points}</span>
                                  </div>
                               </div>
                            </div>
                            
                            <div className={`mt-3 sm:mt-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-inner ${canEdit ? 'focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200' : ''}`}>
                               <textarea 
                                 rows={2} 
                                 disabled={!canEdit}
                                 placeholder={canEdit ? "أضف ملاحظة مخصصة لتوضيح الخطأ للطالب (اختياري)..." : "لا توجد ملاحظات"} 
                                 value={qGrade.feedback} 
                                 onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], feedback: e.target.value}}))} 
                                 className={`w-full bg-transparent border-none focus:ring-0 p-3 sm:p-4 text-xs sm:text-sm font-bold text-slate-800 resize-none outline-none custom-scrollbar-light placeholder:text-slate-400 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} 
                               />
                            </div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>

            {(submission?.content || submission?.file_url) && (
              <div className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] mt-6 sm:mt-8 relative overflow-hidden border border-slate-200 shadow-sm">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 relative z-10">
                   <div className="p-2 sm:p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm"><FileText className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" /></div> المرفقات والنصوص الإضافية
                </h3>
                
                {submission?.content && (
                  <div className="bg-slate-50 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 mb-5 sm:mb-6 shadow-inner relative z-10">
                    <div className="text-slate-800 whitespace-pre-wrap font-bold text-sm sm:text-base lg:text-lg leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(submission.content)} />
                  </div>
                )}
                
                {submission?.file_url && (
                  <div className="relative w-full h-auto min-h-[300px] sm:min-h-[400px] bg-slate-100 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 shadow-inner z-10">
                    {submission.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || submission.file_url.includes('cloudinary.com/image') ? (
                      <img src={submission.file_url} alt="مرفق الطالب" className="max-h-[500px] sm:max-h-[700px] w-auto object-contain rounded-xl sm:rounded-2xl border border-white shadow-sm" />
                    ) : (
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 sm:gap-4 text-indigo-600 hover:text-indigo-800 transition-colors bg-white p-8 rounded-3xl shadow-sm border border-indigo-100">
                         <div className="p-4 sm:p-5 bg-indigo-50 rounded-full border border-indigo-100 shadow-inner"><FileText className="h-10 w-10 sm:h-12 sm:w-12" /></div>
                         <span className="font-black text-base sm:text-lg underline">تحميل الملف المرفق</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column: Sticky Grading Panel */}
          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-lg sticky top-6 sm:top-28">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 border-b border-slate-200 pb-5 sm:pb-6">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" /> النتيجة النهائية
              </h3>
              
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-slate-50 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 relative overflow-hidden shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-500 mb-2 sm:mb-3 uppercase tracking-widest relative z-10 pl-1">المجموع (يُحسب تلقائياً)</label>
                  <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                    <input 
                      type="number" 
                      disabled={!canEdit}
                      className={`block w-full rounded-xl sm:rounded-2xl border border-slate-300 py-4 sm:py-5 px-3 sm:px-4 text-indigo-700 text-3xl sm:text-4xl font-black text-center outline-none bg-white shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${!canEdit ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} 
                      value={grade} 
                      onChange={(e) => setGrade(e.target.value)} 
                    />
                    <div className="shrink-0 bg-indigo-600 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-center shadow-md border border-indigo-700">
                      <span className="block text-[9px] sm:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-0.5 sm:mb-1">من</span>
                      <span className="block font-black text-2xl sm:text-3xl text-white drop-shadow-sm">{questions.reduce((acc, q) => acc + (Number(q.points)||0), 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-black text-slate-600 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 pl-1">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" /> التقييم العام (يظهر للطالب)
                  </label>
                  <div className={`bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 overflow-hidden shadow-inner transition-all ${canEdit ? 'focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 bg-white' : ''}`}>
                     <textarea 
                       rows={5} 
                       disabled={!canEdit}
                       className={`block w-full bg-transparent border-none py-4 sm:py-5 px-5 sm:px-6 resize-none font-bold text-slate-800 outline-none leading-relaxed custom-scrollbar-light placeholder:text-slate-400 text-xs sm:text-sm ${!canEdit ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`} 
                       placeholder={canEdit ? "اكتب تقييماً عاماً لأداء الطالب وتشجيعاً له..." : "لا يوجد تقييم عام"} 
                       value={feedback} 
                       onChange={(e) => setFeedback(e.target.value)} 
                     />
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-2 sm:pt-4">
                    <button onClick={handleSaveGrade} disabled={isSaving} className="w-full flex justify-center items-center gap-2 sm:gap-3 rounded-xl sm:rounded-[2rem] bg-indigo-600 border border-indigo-700 px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-black text-white shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:transform-none">
                      {isSaving ? <div className="h-5 w-5 sm:h-6 sm:w-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />}
                      اعتماد وحفظ النتيجة للطالب
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-light::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; border: 2px solid #f1f5f9; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .table-responsive-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 5px;
        }
      `}} />
    </div>
  );
}
