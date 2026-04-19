/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowRight, User, Calendar, Clock, CheckCircle, CheckCircle2, AlertCircle, Save, MessageSquare, Star, FileText, Link as LinkIcon, Eye, Edit, XCircle, Columns, MinusCircle, Lock, Trophy, Upload, Loader2, X } from 'lucide-react';import Link from 'next/link';
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
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-14 h-14 text-indigo-500 animate-spin drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <p className="text-slate-400 font-bold animate-pulse tracking-widest font-cairo">جاري سحب بيانات الإجابة...</p>
      </div>
    </div>
  );

  const studentName = submission?.student?.users?.full_name || submission?.student?.user?.full_name || 'طالب غير معروف';
  const dueDateObj = new Date(assignment?.due_date);
  const isOverdue = dueDateObj < new Date(submission?.submitted_at);
  const isGraded = submission?.status === 'graded';

  return (
    <div className="min-h-screen bg-[#090b14] pb-24 font-cairo text-slate-200 relative overflow-x-hidden" dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية المضيئة */}
      <div className="fixed top-1/4 left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl font-bold text-white flex items-center gap-4 backdrop-blur-md border ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
            <div className="h-10 w-10 rounded-2xl bg-[#090b14]/50 flex items-center justify-center border border-white/5">
              {notification.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <span className="text-lg font-black tracking-tight text-white">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors mr-4 text-white"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#131836]/60 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/assignments/${assignmentId}`} className="p-3 bg-[#090b14]/50 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-xl transition-all text-slate-400 border border-white/5 shadow-inner">
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">تقييم إجابة الطالب</h1>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">{assignment?.title}</p>
            </div>
          </div>
          
          {canEdit && (
            <button onClick={handleSaveGrade} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 sm:px-8 py-3 sm:py-3.5 text-sm font-black text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/50">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} 
              <span className="hidden sm:inline">حفظ التقييم</span>
            </button>
          )}
        </div>
        
        {!canEdit && assignment && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 px-4 py-2.5 text-center text-sm font-bold flex justify-center items-center gap-2 w-full backdrop-blur-md">
             <Eye className="w-5 h-5 shrink-0" />
             أنت تتصفح تقييم الطالب في (وضع المعاينة). ليس لديك صلاحية لتعديل الدرجات.
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#131836]/60 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
             
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 relative z-10">
               <div className="flex items-center gap-4">
                 <div className="h-16 w-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 shadow-inner font-black text-2xl shrink-0">
                   {studentName.charAt(0)}
                 </div>
                 <div>
                   <h2 className="text-xl sm:text-2xl font-black text-white">{studentName}</h2>
                   <div className="flex items-center gap-2 mt-2">
                     <p className="text-xs sm:text-sm font-bold text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> تم التسليم: <span dir="ltr">{new Date(submission?.submitted_at || '').toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit' })}</span></p>
                     {isOverdue && <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30">متأخر</span>}
                   </div>
                 </div>
               </div>
             </div>

             <div className="mt-10 space-y-10 relative z-10">
               {questions.map((q, idx) => {
                 const isHeader = q.type === 'section_header';
                 const isComparison = q.type === 'comparison';
                 const studentAns = answers[q.id];
                 const qGrade = questionGrades[q.id] || { isCorrect: null, pointsEarned: 0, feedback: '' };
                 const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];

                 if (isHeader) {
                   return (
                     <div key={q.id} className="pt-8 pb-4 border-b border-indigo-500/20">
                        <h3 className="text-2xl sm:text-3xl font-black text-indigo-400 leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text)} />
                        {q.media_url && <img src={q.media_url} className="mt-6 max-h-72 rounded-2xl border border-white/10 shadow-lg object-contain bg-[#090b14]/50 p-2" alt="مرفق" />}
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
                   <div key={q.id} className={`bg-[#090b14]/50 rounded-[2.5rem] overflow-hidden shadow-inner border transition-all ${isUnanswered ? 'border-white/5 border-dashed' : qGrade.isCorrect ? 'border-emerald-500/30' : qGrade.isCorrect === false ? 'border-rose-500/30' : 'border-white/10 hover:border-indigo-500/30'}`}>
                     <div className="p-6 sm:p-8 bg-[#131836]/40 border-b border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                       <div className="flex gap-4 items-start">
                         <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border ${isUnanswered ? 'bg-white/5 text-slate-500 border-white/10' : qGrade.isCorrect ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : qGrade.isCorrect === false ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                             {idx + 1}
                         </div>
                         <div className="pt-2">
                             <div className="prose prose-invert max-w-none font-bold text-lg sm:text-xl text-white leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(q.content || q.text || q.question_text)} />
                             {q.media_url && <img src={q.media_url} className="mt-4 max-h-48 rounded-xl border border-white/10 shadow-sm" alt="صورة توضيحية" />}
                         </div>
                       </div>
                     </div>

                     <div className="p-6 sm:p-8 bg-transparent">
                        <div className="text-sm font-black text-slate-400 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> إجابة الطالب:</div>
                        
                        {isComparison ? (
                          <div className={`rounded-2xl border overflow-hidden shadow-inner ${isUnanswered ? 'border-white/5 bg-[#131836]/30' : qGrade.isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                              <table className="w-full text-right border-collapse min-w-[600px]">
                                <thead>
                                  <tr className={isUnanswered ? 'bg-[#090b14]' : qGrade.isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'}>
                                    <th className="p-4 border-b border-l border-white/5 font-black text-slate-300 text-sm w-1/3">وجه المقارنة</th>
                                    <th className="p-4 border-b border-l border-white/5 font-black text-slate-300 text-sm text-center w-1/3">{safeOptions[0] || 'الطرف الأول'}</th>
                                    <th className="p-4 border-b border-white/5 font-black text-slate-300 text-sm text-center w-1/3">{safeOptions[1] || 'الطرف الثاني'}</th>
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
                                        <td className="p-4 border-b border-l border-white/5 font-bold text-slate-300 bg-[#090b14]/50 align-top" dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                                        <td className="p-4 border-b border-l border-white/5 font-bold text-white align-top whitespace-pre-wrap">
                                          {parsedAns[rIdx]?.[0] ? <span dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][0])} /> : <span className="text-slate-500 italic">فارغ</span>}
                                        </td>
                                        <td className="p-4 border-b border-white/5 font-bold text-white align-top whitespace-pre-wrap">
                                          {parsedAns[rIdx]?.[1] ? <span dangerouslySetInnerHTML={renderContentWithMath(parsedAns[rIdx][1])} /> : <span className="text-slate-500 italic">فارغ</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : q.type === 'file_upload' && !isUnanswered ? (
                          <div className="mt-2 p-3 bg-[#131836] rounded-2xl border border-white/10 inline-block shadow-inner">
                            {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                               <img src={String(studentAnswerText)} alt="إجابة الطالب المرفقة" className="max-h-96 w-auto object-contain rounded-xl border border-white/5" />
                            ) : (
                               <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 font-bold hover:underline px-4 py-2">
                                  <FileText className="w-5 h-5" /> تحميل إجابة الطالب المرفقة
                               </a>
                            )}
                          </div>
                        ) : (
                          <div className={`p-6 rounded-2xl border font-bold text-lg leading-relaxed shadow-inner ${isUnanswered ? 'bg-[#131836]/30 border-white/5 border-dashed text-slate-500 italic' : qGrade.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-white' : qGrade.isCorrect === false ? 'bg-rose-500/10 border-rose-500/20 text-white' : 'bg-[#131836]/50 border-white/10 text-white'}`}>
                              {isUnanswered 
                                 ? 'لم تقم بتقديم إجابة لهذا السؤال.' 
                                 : <span dangerouslySetInnerHTML={renderContentWithMath(typeof studentAnswerText === 'object' && studentAnswerText !== null ? JSON.stringify(studentAnswerText) : String(studentAnswerText))} />
                              }
                          </div>
                        )}
                     </div>

                     <div className="p-6 sm:p-8 bg-[#131836]/40 border-t border-white/5">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                           <div className="xl:col-span-8 flex flex-col sm:flex-row items-center gap-3 bg-[#090b14]/50 p-2.5 rounded-2xl border border-white/10 shadow-inner">
                              <button 
                                disabled={!canEdit} 
                                onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: true, pointsEarned: Number(q.points) || 0}}))} 
                                className={`flex-1 w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${qGrade.isCorrect === true ? 'bg-emerald-500 text-[#090b14] shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400' : 'bg-[#131836] text-slate-400 border border-white/5'} ${canEdit ? 'hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30' : 'opacity-60 cursor-not-allowed'}`}
                              >
                                <CheckCircle2 className="w-5 h-5" /> إجابة صحيحة
                              </button>
                              <button 
                                disabled={!canEdit} 
                                onClick={() => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], isCorrect: false, pointsEarned: 0}}))} 
                                className={`flex-1 w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${qGrade.isCorrect === false ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border border-rose-500' : 'bg-[#131836] text-slate-400 border border-white/5'} ${canEdit ? 'hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30' : 'opacity-60 cursor-not-allowed'}`}
                              >
                                <XCircle className="w-5 h-5" /> إجابة خاطئة
                              </button>
                           </div>
                           <div className="xl:col-span-4 flex items-center justify-between bg-[#090b14]/80 p-3 rounded-2xl border border-white/10 shadow-inner">
                              <span className="text-xs font-black text-slate-400 px-2">الدرجة:</span>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={q.points} 
                                  disabled={!canEdit}
                                  value={qGrade.pointsEarned === 0 && qGrade.isCorrect !== true ? '' : qGrade.pointsEarned} 
                                  onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], pointsEarned: Number(e.target.value)}}))} 
                                  className={`w-20 bg-[#131836] border border-white/10 rounded-xl p-3 text-center font-black text-emerald-400 outline-none ${canEdit ? 'focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20' : 'opacity-60 cursor-not-allowed'}`} 
                                  placeholder="0"
                                />
                                <span className="text-sm font-black text-slate-500 pl-2">/ {q.points}</span>
                              </div>
                           </div>
                        </div>
                        <div className={`mt-4 bg-[#090b14]/50 rounded-2xl border border-white/5 overflow-hidden shadow-inner ${canEdit ? 'focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20' : ''}`}>
                           <textarea 
                             rows={2} 
                             disabled={!canEdit}
                             placeholder={canEdit ? "أضف ملاحظة مخصصة لتوضيح الخطأ للطالب (اختياري)..." : "لا توجد ملاحظات"} 
                             value={qGrade.feedback} 
                             onChange={e => setQuestionGrades(p => ({...p, [q.id]: {...p[q.id], feedback: e.target.value}}))} 
                             className={`w-full bg-transparent border-none focus:ring-0 p-4 text-sm font-bold text-white resize-none outline-none custom-scrollbar placeholder:text-slate-600 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`} 
                           />
                        </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

          {(submission?.content || submission?.file_url) && (
            <div className="bg-[#131836]/60 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-lg mt-8 relative overflow-hidden">
              <h3 className="text-xl sm:text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10">
                 <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 shadow-inner"><FileText className="h-6 w-6 text-indigo-400" /></div> المرفقات العامة التي أرسلها الطالب
              </h3>
              
              {submission?.content && (
                <div className="bg-[#090b14]/50 p-6 sm:p-8 rounded-3xl border border-white/5 mb-6 shadow-inner relative z-10">
                  <div className="text-white whitespace-pre-wrap font-bold text-lg leading-relaxed" dangerouslySetInnerHTML={renderContentWithMath(submission.content)} />
                </div>
              )}
              
              {submission?.file_url && (
                <div className="relative w-full h-auto min-h-[400px] bg-[#090b14]/80 rounded-3xl border border-white/5 overflow-hidden flex flex-col items-center justify-center p-4 shadow-inner z-10">
                  {submission.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || submission.file_url.includes('cloudinary.com/image') ? (
                    <img src={submission.file_url} alt="مرفق الطالب" className="max-h-[700px] w-auto object-contain rounded-xl shadow-md border border-white/10" />
                  ) : (
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 text-indigo-400 hover:text-indigo-300 transition-colors">
                       <div className="p-5 bg-indigo-500/20 rounded-full border border-indigo-500/30"><FileText className="h-12 w-12" /></div>
                       <span className="font-black text-lg underline">تحميل الملف المرفق</span>
                    </a>
                  )}
                </div>
              )}
              <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Grading Panel */}
        <div className="space-y-6">
          <div className="bg-[#131836]/80 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] sticky top-28">
            <h3 className="text-xl sm:text-2xl font-black text-white mb-8 flex items-center gap-3 border-b border-white/10 pb-6">
              <Star className="h-7 w-7 text-amber-400" /> النتيجة النهائية
            </h3>
            
            <div className="space-y-8">
              <div className="bg-[#090b14]/50 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-inner">
                <label className="block text-xs font-black text-slate-400 mb-3 uppercase tracking-widest relative z-10">المجموع (يُحسب تلقائياً)</label>
                <div className="relative z-10 flex items-center gap-4">
                  <input 
                    type="number" 
                    disabled={!canEdit}
                    className={`block w-full rounded-2xl border-2 border-indigo-500/50 py-5 px-4 text-emerald-400 text-4xl font-black text-center outline-none bg-[#131836] shadow-inner transition-all focus:border-emerald-500/80 ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`} 
                    value={grade} 
                    onChange={(e) => setGrade(e.target.value)} 
                  />
                  <div className="shrink-0 bg-gradient-to-br from-indigo-600 to-purple-600 px-5 py-4 rounded-2xl text-center shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50">
                    <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">من</span>
                    <span className="block font-black text-3xl text-white">{questions.reduce((acc, q) => acc + (Number(q.points)||0), 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-300 mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-400" /> التقييم العام (يظهر للطالب)
                </label>
                <div className={`bg-[#090b14]/50 rounded-[2rem] border border-white/10 overflow-hidden shadow-inner transition-all ${canEdit ? 'focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20' : ''}`}>
                   <textarea 
                     rows={5} 
                     disabled={!canEdit}
                     className={`block w-full bg-transparent border-none py-5 px-6 resize-none font-bold text-white outline-none leading-relaxed custom-scrollbar placeholder:text-slate-600 ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`} 
                     placeholder={canEdit ? "اكتب تقييماً عاماً لأداء الطالب وتشجيعاً له..." : "لا يوجد تقييم عام"} 
                     value={feedback} 
                     onChange={(e) => setFeedback(e.target.value)} 
                   />
                </div>
              </div>

              {canEdit && (
                <div className="pt-4">
                  <button onClick={handleSaveGrade} disabled={isSaving} className="w-full flex justify-center items-center gap-3 rounded-[2rem] bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400/50 px-8 py-5 text-lg font-black text-[#090b14] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50">
                    {isSaving ? <div className="h-6 w-6 border-4 border-[#090b14] border-t-transparent rounded-full animate-spin"></div> : <CheckCircle2 className="h-6 w-6" />}
                    اعتماد وحفظ النتيجة للطالب
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #090b14; border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 2px solid #090b14; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
}
