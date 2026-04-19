/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock, Award, Target, Timer, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Latex from 'react-latex-next';

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return ['multiple_choice', 'true_false', 'multi_select', 'checkbox', 'radio'].includes(t);
};

const formatTimeTaken = (seconds: number) => {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = content.replace(
     /\$\$([\s\S]*?)\$\$/g, 
     '<span class="math-tex text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-mono font-bold mx-1 shadow-inner inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">$1</span>'
   );
   return { __html: html };
};

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isTeacherOrAdmin = ['teacher', 'admin', 'management'].includes(currentRole);
  
  const examId = params.id as string;
  const studentId = params.studentId as string; 
  
  const [data, setData] = useState<any>({ exam: {}, student: {}, attempt: null, answers: [], questions: [] });
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});
  const [isExamTimeFinished, setIsExamTimeFinished] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams/admin-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ examId, studentId })
      });
      
      const result = await res.json();
      
      if (result.success) {
          if (result.answers && result.questions) {
             const actualQuestions = result.questions.filter((q: any) => q.type !== 'section_header');
             const sortedAnswers = [...result.answers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
             result.answers = sortedAnswers.map((ans: any, index: number) => {
                 const exists = actualQuestions.find((q: any) => String(q.id) === String(ans.question_id));
                 if (!exists && actualQuestions[index]) {
                     return { ...ans, question_id: actualQuestions[index].id };
                 }
                 return ans;
             });
          }

          if (result.questions) {
              result.questions = result.questions.map((q: any) => {
                 let qContent = q.content || '';
                 let qType = q.type;
                 
                 const typeRegex = new RegExp('');
                 const globalTypeRegex = new RegExp('', 'g');
                 const typeMatch = qContent.match(typeRegex);
                 
                 if (typeMatch) {
                     qType = typeMatch[1];
                     qContent = qContent.replace(globalTypeRegex, '');
                 } else if (qContent.includes('') || qType === 'file_upload') {
                     qType = 'file';
                     qContent = qContent.replace(globalTypeRegex, '');
                 }
                 
                 return { ...q, type: qType, content: qContent.trim() };
              });
          }

          setData(result);

          if (result.exam?.exam_date) {
              const now = new Date();
              const examDate = new Date(result.exam.exam_date);
              const endTimeParts = (result.exam.end_time || '23:59').split(':');
              examDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
              setIsExamTimeFinished(now > examDate);
          }

          const initialGrading: any = {};
          result.questions.forEach((q: any) => {
             const ans = result.answers.find((a: any) => String(a.question_id) === String(q.id));
             initialGrading[q.id] = { points: Number(ans?.points_earned) || 0, isSubmitting: false };
          });
          setGradingState(initialGrading);
      }
    } catch (err) {
      console.error('Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState((prev: any) => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      if (!data.attempt?.id) { alert('لا توجد محاولة.'); return; }

      const res = await fetch('/api/exams/admin-grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: data.attempt.id, questionId, pointsEarned: newPoints })
      });
      
      const result = await res.json();

      if (result.success) {
          setData((prev: any) => {
              const newAnswers = prev.answers.map((a: any) => String(a.question_id) === String(questionId) ? { ...a, points_earned: newPoints, is_correct: newPoints > 0 } : a);
              if (!newAnswers.find((a: any) => String(a.question_id) === String(questionId))) {
                  newAnswers.push({ question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' });
              }
              return { ...prev, answers: newAnswers, attempt: { ...prev.attempt, score: result.newTotal, status: 'graded' } };
          });
      }
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setGradingState((prev: any) => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  // 🚀 شاشة التحميل (الثيم الملكي)
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-slate-100">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
           <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
           <Award className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
        </div>
        <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل النتائج وإحضار الإجابات...</p>
      </div>
    </div>
  );

  const { exam, student, attempt, answers, questions } = data;

  const isPendingGrading = attempt && attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  
  const calculatedMax = questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 1), 0);
  let displayMaxScore = Number(exam?.total_marks) || Number(exam?.max_score) || calculatedMax || 100;

  const isLockedForStudent = !isTeacherOrAdmin && !isExamTimeFinished;
  const hasManualQuestions = questions.some((q: any) => !isAutoGradedType(q.type));

  return (
    <div className="min-h-screen bg-transparent pb-24 font-cairo text-slate-100 relative overflow-x-hidden pt-6" dir="rtl">
      <link href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" rel="stylesheet" />
      
      {/* 🚀 الخلفية الزجاجية المضيئة المريحة للعين */}
      <div className="fixed top-1/4 left-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 font-bold glass-panel px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all active:scale-95 shadow-inner border border-white/5 hover:border-indigo-500/30 text-xs sm:text-sm">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" /> العودة للنتائج
          </button>
        </div>

        {isLockedForStudent && (
          <div className="glass-panel border-white/5 bg-[#02040a]/80 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-5 sm:gap-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl pointer-events-none"></div>
             <div className="bg-[#0f1423] p-4 rounded-full shadow-inner border border-white/10 shrink-0 relative z-10"><Lock className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 drop-shadow-md" /></div>
             <div className="text-center sm:text-right relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-sm">النتائج محجوبة مؤقتاً</h3>
                <p className="text-slate-400 font-bold text-xs sm:text-sm lg:text-base leading-relaxed">حفاظاً على نزاهة الاختبار، لن يتم عرض النتيجة النهائية أو تفاصيل إجاباتك إلا بعد انتهاء الوقت الرسمي للاختبار لجميع الطلاب.</p>
             </div>
          </div>
        )}

        {/* 🚀 Header Card (Royal Theme) */}
        <div className="glass-panel rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden relative bg-[#0f1423]/60">
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -ml-10 -mb-10"></div>
            
            <div className="p-6 sm:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-right space-y-3 sm:space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest border border-indigo-500/30 shadow-inner">
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {exam?.subject_name || 'اختبار عام'}
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg">{exam?.title || 'تقرير نتيجة الاختبار'}</h1>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 pt-2">
                        <div className="flex items-center gap-2 bg-[#02040a]/60 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-white/5 shadow-inner">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                            <span className="font-bold text-slate-300 text-xs sm:text-sm">{student?.users?.full_name || student?.full_name || 'طالب'}</span>
                        </div>
                        
                        {!isLockedForStudent && (
                          isPendingGrading ? (
                              <div className="flex items-center gap-2 bg-amber-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-amber-500/20 text-amber-400 shadow-inner">
                                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="font-bold text-xs sm:text-sm">بانتظار التصحيح</span>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-emerald-500/20 text-emerald-400 shadow-inner">
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="font-bold text-xs sm:text-sm">مكتمل التصحيح</span>
                              </div>
                          )
                        )}

                        {!isLockedForStudent && attempt?.time_taken > 0 && (
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-indigo-500/20 text-indigo-400 shadow-inner">
                                <Timer className="h-4 w-4 sm:h-5 sm:w-5" /> 
                                <span className="font-bold text-xs sm:text-sm">المستغرق: <span dir="ltr">{formatTimeTaken(attempt.time_taken)}</span></span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`shrink-0 w-40 h-40 sm:w-48 sm:h-48 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 ${isLockedForStudent ? 'bg-[#02040a]' : isPendingGrading ? 'bg-gradient-to-br from-amber-600 to-orange-700' : 'bg-gradient-to-br from-indigo-600 to-violet-700'}`}>
                    {isLockedForStudent ? <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 mb-2 drop-shadow-md" /> : <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white/90 mb-2 drop-shadow-md" />}
                    <div className="text-[10px] sm:text-xs font-black text-white/70 uppercase tracking-widest mb-1">الدرجة المكتسبة</div>
                    <div className="text-4xl sm:text-5xl font-black flex items-baseline gap-1 drop-shadow-md">
                        {isLockedForStudent ? (
                           <span className="text-2xl sm:text-3xl mt-2 text-slate-400">مغلق</span>
                        ) : isPendingGrading && !isTeacherOrAdmin ? (
                           '؟'
                        ) : (
                           totalEarned
                        )}
                        {!isLockedForStudent && <span className="text-lg sm:text-xl font-bold opacity-70">/{displayMaxScore}</span>}
                    </div>
                </div>
            </div>
        </div>

        {/* تنبيهات المعلم */}
        {isTeacherOrAdmin && (
            <div className="space-y-3 sm:space-y-4">
                {hasManualQuestions && (
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 text-blue-400 shadow-inner">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-md" />
                        <span className="font-bold text-xs sm:text-sm leading-relaxed">هذا الاختبار يحتوي على أسئلة مقالية تتطلب وضع الدرجات يدوياً للطلاب.</span>
                    </div>
                )}
                {(!attempt || attempt.id === null) && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 text-rose-400 shadow-inner">
                        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-md" />
                        <span className="font-bold text-xs sm:text-sm leading-relaxed">لم يتم العثور على تسليم صحيح من الطالب لهذا الاختبار. الإجابات بالأسفل قد تكون فارغة.</span>
                    </div>
                )}
            </div>
        )}

        {!isLockedForStudent && (
          <div className="space-y-6 sm:space-y-8 mt-8 sm:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-white/5">
              <Target className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-400 drop-shadow-sm" />
              <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">المراجعة التفصيلية للإجابات</h2>
            </div>

            {questions.length === 0 ? (
                <div className="text-center py-16 sm:py-20 glass-panel rounded-[2rem] sm:rounded-[3rem] border border-dashed border-white/10 shadow-inner px-4">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 bg-[#02040a]/80 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-white/5 shadow-inner">
                    <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 drop-shadow-md" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">لا توجد أسئلة مسجلة في هذا الاختبار</h3>
                </div>
            ) : questions.map((question: any, index: number) => {
              
              const answer = answers.find((a: any) => String(a.question_id) === String(question.id));
              const qType = (question.type || '').toLowerCase();
              const isAuto = isAutoGradedType(qType);
              
              const isFileUploadType = ['file_upload', 'file', 'upload', 'image'].includes(qType);
              
              let studentAnswerText = null;
              let isCorrect = false;
              let pointsEarned = answer ? Number(answer.points_earned) || 0 : 0;

              if (answer) {
                  let rawVal = answer.text_answer || answer.selected_option_id || answer.answer || answer.option_id;
                  
                  if (rawVal && typeof rawVal === 'string' && rawVal.startsWith('[')) {
                     try {
                       const parsed = JSON.parse(rawVal);
                       if (Array.isArray(parsed) && parsed.length > 0) {
                          rawVal = parsed[0];
                       }
                     } catch(e) {}
                  }

                  if (rawVal && rawVal !== 'null' && String(rawVal).trim() !== '') {
                      const selectedOpt = question.options?.find((o:any) => String(o.id) === String(rawVal) || String(o.content) === String(rawVal));
                      if (selectedOpt) {
                          studentAnswerText = selectedOpt.content;
                          isCorrect = selectedOpt.is_correct || pointsEarned > 0;
                      } else {
                          studentAnswerText = String(rawVal);
                          isCorrect = answer.is_correct || pointsEarned > 0;
                      }
                  } else if (pointsEarned > 0 || answer.is_correct) {
                      studentAnswerText = "تم تسجيل الإجابة بنجاح ✅";
                      isCorrect = true;
                  }
              }

              const isUnanswered = !studentAnswerText;
              const correctAnswerText = question.options?.filter((o:any)=>o.is_correct).map((o:any)=>o.content).join('، ') || 'يتم التقييم من قِبل المعلم';

              const isImageOrFile = typeof studentAnswerText === 'string' && !!(studentAnswerText.match(/\.(jpeg|jpg|gif|png|webp)$/i) || studentAnswerText.includes('cloudinary'));

              return (
                <div key={question.id} className={`glass-panel rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-lg border transition-all ${isUnanswered ? 'border-white/5' : isCorrect ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]'}`}>
                  <div className="p-5 sm:p-6 lg:p-8 bg-[#02040a]/40 border-b border-white/5 flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6">
                    <div className="flex gap-3 sm:gap-4 items-start w-full min-w-0">
                      <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shadow-inner border ${isUnanswered ? 'bg-[#0f1423] text-slate-500 border-white/10' : isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {index + 1}
                      </div>
                      <div className="pt-1 sm:pt-2 w-full min-w-0">
                         <div className="prose prose-invert max-w-none font-bold text-base sm:text-lg lg:text-xl text-white leading-relaxed overflow-hidden drop-shadow-sm">
                            <Latex>{question.content || question.text || ''}</Latex>
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-[#0f1423] px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm border border-white/5 shrink-0 self-start md:self-auto shadow-inner">
                      <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                      <span className={isCorrect ? 'text-emerald-400 drop-shadow-sm' : 'text-white'}>{!isAuto && isPendingGrading && !isTeacherOrAdmin ? '؟' : pointsEarned}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400">{Number(question.points) || 0} نقطة</span>
                    </div>
                  </div>

                  {(question?.mediaUrl || question?.media_url) && (
                    <div className="px-5 sm:px-6 lg:px-8 pt-5 sm:pt-6">
                        <div className="bg-[#02040a]/60 border border-white/5 rounded-xl sm:rounded-2xl p-2 flex justify-center shadow-inner">
                            <img src={question.mediaUrl || question.media_url} alt="مرفق" className="max-h-48 sm:max-h-72 w-auto object-contain rounded-lg sm:rounded-xl" />
                        </div>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
                    <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-inner ${isUnanswered ? 'bg-[#02040a]/40 border-white/5 border-dashed' : isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                      <div className="text-[10px] sm:text-xs font-black mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                        {isUnanswered ? <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" /> : isCorrect ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 drop-shadow-sm"/> : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 drop-shadow-sm"/>}
                        <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-400 drop-shadow-sm' : 'text-rose-400 drop-shadow-sm'}>إجابة الطالب:</span>
                      </div>
                      
                      {(isFileUploadType || isImageOrFile) && !isUnanswered ? (
                         <div className="mt-2 sm:mt-4 bg-[#0f1423] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/5 shadow-inner inline-block">
                            {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                               <img src={String(studentAnswerText)} alt="صورة إجابة الطالب" className="max-h-64 sm:max-h-96 w-auto rounded-lg object-contain" />
                            ) : (
                               <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 sm:gap-2 text-indigo-400 font-bold hover:underline p-3 sm:p-4 text-xs sm:text-sm">
                                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> تحميل إجابة الطالب
                               </a>
                            )}
                         </div>
                      ) : (
                         <div className={`text-sm sm:text-base lg:text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'text-slate-600 italic' : 'text-white'}`}>
                            {isUnanswered ? 'لم يقم الطالب بتقديم إجابة لهذا السؤال.' : <Latex>{String(studentAnswerText)}</Latex>}
                         </div>
                      )}
                    </div>

                    {!isFileUploadType && (
                      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                        <div className="text-[10px] sm:text-xs font-black text-indigo-400 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 drop-shadow-sm">
                            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5"/> الإجابة النموذجية المعتمدة:
                        </div>
                        <div className="text-sm sm:text-base lg:text-lg font-bold text-white leading-relaxed opacity-90">
                            <Latex>{String(correctAnswerText)}</Latex>
                        </div>
                      </div>
                    )}

                    {isTeacherOrAdmin && (
                      <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto bg-[#02040a]/60 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
                           <label className="font-black text-slate-400 text-[10px] sm:text-xs px-2 shrink-0">تقييم المعلم:</label>
                           <div className="flex items-center flex-1 md:flex-none">
                               <input 
                                  type="number" 
                                  min="0" 
                                  max={question.points} 
                                  value={gradingState[question.id]?.points ?? 0} 
                                  onChange={(e) => setGradingState((prev: any) => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} 
                                  className="w-16 sm:w-20 p-2 sm:p-2.5 text-center font-black text-base sm:text-lg text-emerald-400 bg-[#0f1423] outline-none rounded-lg sm:rounded-xl border border-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 shadow-inner transition-all" 
                               />
                               <span className="px-2 sm:px-3 text-[10px] sm:text-xs font-black text-slate-500 shrink-0">من {Number(question.points) || 0}</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleSaveGrade(question.id)} 
                          disabled={gradingState[question.id]?.isSubmitting} 
                          className="w-full md:w-auto bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400/50 active:scale-95 shrink-0"
                        >
                          {gradingState[question.id]?.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <>حفظ الدرجة <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
