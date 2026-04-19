/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowRight, User, Calendar, Clock, CheckCircle, CheckCircle2, AlertCircle, Save, MessageSquare, Star, FileText, Link as LinkIcon, Eye, Edit, XCircle, Columns, MinusCircle, Lock, Trophy, Upload, Loader2, X, Award } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAssignmentsSystem } from '@/hooks/useAssignmentsSystem';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = content.replace(
     /\$\$([\s\S]*?)\$\$/g, 
     '<span class="math-tex text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-mono font-bold mx-1 shadow-inner inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">$1</span>'
   );
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
    <div className="min-h-screen bg-[#090b14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
           <Award className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
        </div>
        <p className="text-indigo-500 font-black animate-pulse tracking-widest drop-shadow-md">جاري سحب بيانات الإجابة...</p>
      </div>
    </div>
  );

  const studentName = submission?.student?.users?.full_name || submission?.student?.user?.full_name || 'طالب غير معروف';
  const dueDateObj = new Date(assignment?.due_date);
  const isOverdue = dueDateObj < new Date(submission?.submitted_at);
  const isGraded = submission?.status === 'graded';

  return (
    <div className="min-h-screen bg-[#090b14] pb-24 font-cairo text-slate-200 relative overflow-x-hidden pt-6" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة */}
      <div className="fixed top-1/4 left-[-10%] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl font-bold text-white flex items-center gap-3 sm:gap-4 backdrop-blur-3xl border w-[90%] sm:w-auto ${notification.type === 'success' ? 'bg-[#02040a]/90 text-emerald-400 border-emerald-500/50 shadow-[0_20px_50px_rgba(16,185,129,0.3)]' : 'bg-[#02040a]/90 text-rose-400 border-rose-500/50 shadow-[0_20px_50px_rgba(244,63,94,0.3)]'}`}>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>
            <span className="text-sm sm:text-lg font-black tracking-tight text-white drop-shadow-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-auto text-white active:scale-90"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6 sm:space-y-8">
        
        {/* 🚀 الهيدر والتحكم (Royal Theme) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 relative z-10">
            <Link href={`/assignments/${assignmentId}`} className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-[#090b14]/50 border border-white/5 shadow-inner text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all shrink-0 active:scale-95">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 shadow-inner text-indigo-400">
                <Star className="w-3.5 h-3.5" /> تقييم إجابة الطالب
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md line-clamp-1">{assignment?.title}</h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10 mt-2 md:mt-0">
            {!canEdit && assignment && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2.5 rounded-xl text-center text-xs sm:text-sm font-bold flex justify-center items-center gap-2 w-full shadow-inner">
                 <Eye className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                 وضع المعاينة فقط.
              </div>
            )}
            {canEdit && (
              <button onClick={handleSaveGrade} disabled={isSaving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/50 shrink-0">
                {isSaving ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Save className="h-4 w-4 sm:h-5 sm:w-5" />} 
                <span>حفظ التقييم</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: Content */}
          <div className="xl:col-span-2 space-y-6 sm:space-y-8">
            <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none"></div>
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-white/5 relative z-10">
                 <div className="flex items-center gap-3 sm:gap-4">
                   <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-[#02040a] flex items-center justify-center text-indigo-400 border border-white/5 shadow-inner font-black text-xl sm:text-2xl shrink-0">
                     {studentName.charAt(0)}
                   </div>
                   <div>
                     <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white drop-shadow-sm">{studentName}</h2>
                     <div className="flex flex-wrap items-center gap-2 mt-1.5 sm:mt-2">
                       <p className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1 sm:gap-1.5 bg-[#02040a]/60 px-2 sm:px-2.5 py-1 rounded-md border border-white/5 shadow-inner">
                         <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                         <span dir="ltr">{new Date(submission?.submitted_at || '').toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span>
                       </p>
                       {isOverdue && <span className="text-[9px] sm:text-[10px] font-black bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md border border-rose-500/20 shadow-inner">تسليم متأخر</span>}
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
                       <div key={q.id} className="pt-6 sm:pt-8 pb-3 sm:pb-4 border-b border-indigo-500/20">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-300 leading-relaxed drop-shadow-sm" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text)} />
                          {q.media_url && <img src={q.media_url} className="mt-4 sm:mt-6 max-h-64 sm:max-h-72 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner object-contain bg-[#02040a]/60 p-2" alt="مرفق" />}
                       </div>
                     );
                   }

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
                           const optId = String(o.id);
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

                   return (
                     <div key={q.id} className={`bg-[#0f1423]/40 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-inner border transition-all ${isUnanswered ? 'border-white/5 border-dashed' : qGrade.isCorrect ? 'border-emerald-500/30' : qGrade.isCorrect === false ? 'border-rose-500/30' : 'border-white/10 hover:border-indigo-500/30'}`}>
                       <div className="p-5 sm:p-6 lg:p-8 bg-[#02040a]/40 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                         <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
                           <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-inner border ${isUnanswered ? 'bg-[#0f1423] text-slate-500 border-white/5' : qGrade.isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : qGrade.isCorrect === false ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                               {idx + 1}
                           </div>
                           <div className="pt-1 sm:pt-2 w-full min-w-0">
                               <div className="prose prose-invert max-w-none font-bold text-base sm:text-lg lg:text-xl text-white leading-relaxed overflow-hidden" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text)} />
                               {q.media_url && <img src={q.media_url} className="mt-3 sm:mt-4 max-h-40 sm:max-h-48 rounded-xl border border-white/5 shadow-inner" alt="صورة توضيحية" />}
                           </div>
                         </div>
                       </div>

                       <div className="p-5 sm:p-6 lg:p-8 bg-transparent">
                          <div className="text-xs sm:text-sm font-black text-slate-400 mb-3 flex items-center gap-1.5 sm:gap-2"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> إجابة الطالب:</div>
                          
                          {isComparison ? (
                            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden shadow-inner ${isUnanswered ? 'border-white/5 bg-[#02040a]/40' : qGrade.isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                              <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-right border-collapse min-w-[500px] sm:min-w-[600px]">
                                  <thead>
                                    <tr className={isUnanswered ? 'bg-[#02040a]' : qGrade.isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}>
                                      <th className="p-3 sm:p-4 border-b border-l border-white/5 font-black text-slate-300 text-xs sm:text-sm w-1/3">وجه المقارنة</th>
                                      <th className="p-3 sm:p-4 border-b border-l border-white/5 font-black text-slate-300 text-xs sm:text-sm text-center w-1/3">{safeOptions[0] || 'الطرف الأول'}</th>
                                      <th className="p-3 sm:p-4 border-b border-white/5 font-black text-slate-300 text-xs sm:text-sm text-center w-1/3">{safeOptions[1] || 'الطرف الثاني'}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {safeOptions.slice(2).map((aspect: string, rIdx: number) => {
                                      let parsedAns: any[] = [];
                                      try { 
                                        if (typeof studentAns === 'string') parsedAns = JSON.parse(studentAns || '[]'); 
                                        else if (Array.isArray(studentAns)) parsedAns = studentAns;
                                      } catch(e){}
                                      return (
                                        <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                                          <td className="p-3 sm:p-4 border-b border-l border-white/5 font-bold text-slate-300 text-xs sm:text-sm bg-[#02040a]/40 align-top">
                                            <div dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                                          </td>
                                          <td className="p-3 sm:p-4 border-b border-l border-white/5 font-bold text-white text-xs sm:text-sm align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[0] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-500 italic">فارغ</span>}</td>
                                          <td className="p-3 sm:p-4 border-b border-white/5 font-bold text-white text-xs sm:text-sm align-top whitespace-pre-wrap">{parsedAns[rIdx]?.[1] ? <div dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-500 italic">فارغ</span>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : q.type === 'file_upload' && !isUnanswered ? (
                            <div className="mt-2 p-2 sm:p-3 bg-[#02040a]/60 rounded-xl sm:rounded-2xl border border-white/5 inline-block shadow-inner">
                              {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                                 <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-64 sm:max-h-96 w-auto object-contain rounded-lg sm:rounded-xl border border-white/5" />
                              ) : (
                                 <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 font-bold hover:underline text-xs sm:text-sm px-3 sm:px-4 py-2">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب المرفقة
                                 </a>
                              )}
                            </div>
                          ) : (
                            <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border mb-3 sm:mb-4 shadow-inner ${isUnanswered ? 'bg-[#02040a]/40 border-white/5 border-dashed text-slate-500 italic' : qGrade.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-white' : qGrade.isCorrect === false ? 'bg-rose-500/10 border-rose-500/20 text-white' : 'bg-[#02040a]/60 border-white/5 text-white'}`}>
                                {isUnanswered 
                                   ? 'لم تقم بتقديم إجابة لهذا السؤال.' 
                                   : <div className="text-sm sm:text-base lg:text-lg font-bold leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />
                                }
                            </div>
                          )}

                          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/5">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
                               <div className="xl:col-span-8 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-[#02040a]/60 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                                  <button 
                                    disabled={!canEdit} 
                                    onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: true, pointsEarned: Number(q.points) || 0}}))} 
                                    className={`flex-1 w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${qGrade.isCorrect === true ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400' : 'bg-[#0f1423] text-slate-400 border border-white/5'} ${canEdit ? 'hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30' : 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> إجابة صحيحة
                                  </button>
                                  <button 
                                    disabled={!canEdit} 
                                    onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: false, pointsEarned: 0}}))} 
                                    className={`flex-1 w-full py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${qGrade.isCorrect === false ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-500' : 'bg-[#0f1423] text-slate-400 border border-white/5'} ${canEdit ? 'hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30' : 'opacity-60 cursor-not-allowed'}`}
                                  >
                                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" /> إجابة خاطئة
                                  </button>
                               </div>
                               <div className="xl:col-span-4 flex items-center justify-between bg-[#02040a]/80 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                                  <span className="text-[10px] sm:text-xs font-black text-slate-400 px-2">الدرجة الممنوحة:</span>
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <input 
                                      type="number" 
                                      min="0" 
                                      max={q.points} 
                                      disabled={!canEdit}
                                      value={qGrade.pointsEarned === 0 && qGrade.isCorrect !== true ? '' : qGrade.pointsEarned} 
                                      onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], pointsEarned: Number(e.target.value)}}))} 
                                      className={`w-16 sm:w-20 bg-[#0f1423] border border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center font-black text-emerald-400 outline-none ${canEdit ? 'focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20' : 'opacity-60 cursor-not-allowed'} shadow-inner text-sm sm:text-base`} 
                                      placeholder="0"
                                    />
                                    <span className="text-xs sm:text-sm font-black text-slate-500 pl-1 sm:pl-2">/ {q.points}</span>
                                  </div>
                               </div>
                            </div>
                            <div className={`mt-3 sm:mt-4 bg-[#02040a]/40 rounded-xl sm:rounded-2xl border border-white/5 overflow-hidden shadow-inner ${canEdit ? 'focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/10' : ''}`}>
                               <textarea 
                                 rows={2} 
                                 disabled={!canEdit}
                                 placeholder={canEdit ? "أضف ملاحظة مخصصة لتوضيح الخطأ للطالب (اختياري)..." : "لا توجد ملاحظات"} 
                                 value={qGrade.feedback} 
                                 onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], feedback: e.target.value}}))} 
                                 className={`w-full bg-transparent border-none focus:ring-0 p-3 sm:p-4 text-xs sm:text-sm font-bold text-white resize-none outline-none custom-scrollbar placeholder:text-slate-600 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} 
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
              <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[2.5rem] mt-6 sm:mt-8 relative overflow-hidden border-white/10">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 relative z-10 drop-shadow-sm">
                   <div className="p-2 sm:p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner"><FileText className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" /></div> המرفقات والنصوص الإضافية التي أرسلتها الطالب
                </h3>
                
                {submission?.content && (
                  <div className="bg-[#02040a]/60 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 mb-5 sm:mb-6 shadow-inner relative z-10">
                    <div className="text-white whitespace-pre-wrap font-bold text-sm sm:text-base lg:text-lg leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(submission.content)} />
                  </div>
                )}
                
                {submission?.file_url && (
                  <div className="relative w-full h-auto min-h-[300px] sm:min-h-[400px] bg-[#02040a]/80 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4 shadow-inner z-10">
                    {submission.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || submission.file_url.includes('cloudinary.com/image') ? (
                      <img src={submission.file_url} alt="مرفق الطالب" className="max-h-[500px] sm:max-h-[700px] w-auto object-contain rounded-xl sm:rounded-2xl border border-white/5 shadow-inner" />
                    ) : (
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3 sm:gap-4 text-indigo-400 hover:text-indigo-300 transition-colors">
                         <div className="p-4 sm:p-5 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-inner"><FileText className="h-10 w-10 sm:h-12 sm:w-12" /></div>
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
            <div className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)] sticky top-6 sm:top-28">
              <h3 className="text-lg sm:text-xl font-black text-white mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 border-b border-white/5 pb-5 sm:pb-6 drop-shadow-sm">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" /> النتيجة النهائية
              </h3>
              
              <div className="space-y-6 sm:space-y-8">
                <div className="bg-[#02040a]/60 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 relative overflow-hidden shadow-inner">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest relative z-10 pl-1">المجموع (يُحسب تلقائياً)</label>
                  <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                    <input 
                      type="number" 
                      disabled={!canEdit}
                      className={`block w-full rounded-xl sm:rounded-2xl border border-indigo-500/40 py-4 sm:py-5 px-3 sm:px-4 text-emerald-400 text-3xl sm:text-4xl font-black text-center outline-none bg-[#0f1423] shadow-inner transition-all focus:border-emerald-500/60 ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`} 
                      value={grade} 
                      onChange={(e) => setGrade(e.target.value)} 
                    />
                    <div className="shrink-0 bg-gradient-to-br from-indigo-600 to-blue-600 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-center shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-indigo-400/50">
                      <span className="block text-[9px] sm:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-0.5 sm:mb-1">من</span>
                      <span className="block font-black text-2xl sm:text-3xl text-white drop-shadow-sm">{questions.reduce((acc, q) => acc + (Number(q.points)||0), 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-black text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 pl-1">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" /> التقييم العام (يظهر للطالب)
                  </label>
                  <div className={`bg-[#02040a]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden shadow-inner transition-all ${canEdit ? 'focus-within:border-indigo-500/30 focus-within:ring-1 focus-within:ring-indigo-500/10' : ''}`}>
                     <textarea 
                       rows={5} 
                       disabled={!canEdit}
                       className={`block w-full bg-transparent border-none py-4 sm:py-5 px-5 sm:px-6 resize-none font-bold text-white outline-none leading-relaxed custom-scrollbar placeholder:text-slate-600 text-xs sm:text-sm ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`} 
                       placeholder={canEdit ? "اكتب تقييماً عاماً لأداء الطالب وتشجيعاً له..." : "لا يوجد تقييم عام"} 
                       value={feedback} 
                       onChange={(e) => setFeedback(e.target.value)} 
                     />
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-2 sm:pt-4">
                    <button onClick={handleSaveGrade} disabled={isSaving} className="w-full flex justify-center items-center gap-2 sm:gap-3 rounded-xl sm:rounded-[2rem] bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400/50 px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                      {isSaving ? <div className="h-5 w-5 sm:h-6 sm:w-6 border-[3px] border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />}
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
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #02040a; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
