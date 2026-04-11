'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock, Award, Target, Timer, FileText } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return t.includes('choice') || t.includes('true_false') || t.includes('select') || t.includes('checkbox') || t.includes('radio');
};

const formatTimeTaken = (seconds: number) => {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

          // 🚀 استخراج النوع الآمن لصفحة النتائج
          if (result.questions) {
              result.questions = result.questions.map((q: any) => {
                 let qType = q.type;
                 let qContent = q.content || '';
                 
                 if (qContent.includes('', startIndex);
                     if (startIndex > 9 && endIndex > startIndex) {
                         qType = qContent.substring(startIndex, endIndex);
                     }
                     qContent = qContent.split(``).join('');
                 } else if (qContent.includes('') || qType === 'file_upload') {
                     qType = 'file';
                     qContent = qContent.split('').join('');
                 } else if (qType === 'open') {
                     qType = 'essay';
                 }

                 return { ...q, type: qType, content: qContent };
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-indigo-600"></div>
        <p className="font-bold text-slate-500 animate-pulse">جاري تحميل النتائج وإحضار الإجابات...</p>
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
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <ArrowRight className="h-5 w-5" /> العودة للنتائج
        </button>
      </div>

      {isLockedForStudent && (
        <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
           <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 shrink-0"><Lock className="w-10 h-10 text-slate-400" /></div>
           <div className="text-center sm:text-right">
              <h3 className="text-2xl font-black text-slate-800 mb-2">النتائج محجوبة مؤقتاً</h3>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">حفاظاً على نزاهة الاختبار، لن يتم عرض النتيجة النهائية أو تفاصيل إجاباتك إلا بعد انتهاء الوقت الرسمي للاختبار لجميع الطلاب.</p>
           </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-60 -ml-20 -mb-20"></div>
          
          <div className="p-8 sm:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-right space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold">
                      <BookOpen className="w-4 h-4" /> {exam?.subject_name || 'اختبار عام'}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">{exam?.title || 'تقرير نتيجة الاختبار'}</h1>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                          <User className="h-5 w-5 text-slate-400" />
                          <span className="font-bold text-slate-700">{student?.users?.full_name || student?.full_name || 'طالب'}</span>
                      </div>
                      
                      {!isLockedForStudent && (
                        isPendingGrading ? (
                            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-700">
                                <Clock className="h-5 w-5" /> <span className="font-bold">بانتظار التصحيح</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700">
                                <CheckCircle2 className="h-5 w-5" /> <span className="font-bold">مكتمل التصحيح</span>
                            </div>
                        )
                      )}

                      {!isLockedForStudent && attempt?.time_taken > 0 && (
                          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700">
                              <Timer className="h-5 w-5" /> 
                              <span className="font-bold">الوقت المستغرق: <span dir="ltr">{formatTimeTaken(attempt.time_taken)}</span></span>
                          </div>
                      )}
                  </div>
              </div>

              <div className={`shrink-0 w-48 h-48 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-xl ${isLockedForStudent ? 'bg-slate-400 shadow-slate-200' : isPendingGrading ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200'}`}>
                  {isLockedForStudent ? <Lock className="h-10 w-10 text-white/90 mb-2" /> : <Trophy className="h-10 w-10 text-white/90 mb-2" />}
                  <div className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">الدرجة المكتسبة</div>
                  <div className="text-5xl font-black flex items-baseline gap-1">
                      {isLockedForStudent ? (
                         <span className="text-3xl mt-2">مغلق</span>
                      ) : isPendingGrading && !isTeacherOrAdmin ? (
                         '؟'
                      ) : (
                         totalEarned
                      )}
                      {!isLockedForStudent && <span className="text-xl font-bold opacity-70">/{displayMaxScore}</span>}
                  </div>
              </div>
          </div>
      </div>

      {isTeacherOrAdmin && (
          <div className="space-y-4">
              {hasManualQuestions && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 text-blue-800">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span className="font-bold text-sm">هذا الاختبار يحتوي على أسئلة مقالية تتطلب وضع الدرجات يدوياً للطلاب.</span>
                  </div>
              )}
              {(!attempt || attempt.id === null) && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-800">
                      <XCircle className="w-5 h-5 shrink-0" />
                      <span className="font-bold text-sm">لم يتم العثور على تسليم صحيح من الطالب لهذا الاختبار. الإجابات بالأسفل قد تكون فارغة.</span>
                  </div>
              )}
          </div>
      )}

      {!isLockedForStudent && (
        <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <Target className="h-7 w-7 text-indigo-600" />
            <h2 className="text-2xl font-black text-slate-900">المراجعة التفصيلية للإجابات</h2>
          </div>

          {questions.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-600">لا توجد أسئلة مسجلة في هذا الاختبار</h3>
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

            return (
              <div key={question.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all hover:shadow-md ${isUnanswered ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="flex gap-4 items-start">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${isUnanswered ? 'bg-slate-200 text-slate-600' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {index + 1}
                    </div>
                    <div className="pt-2">
                       <div className="prose max-w-none font-bold text-lg text-slate-800 leading-relaxed mt-1">
                          <Latex>{question.content || question.text || ''}</Latex>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-xl font-bold text-sm border border-slate-200 shrink-0 self-start sm:self-auto">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{!isAuto && isPendingGrading && !isTeacherOrAdmin ? '؟' : pointsEarned}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-500">{Number(question.points) || 0} نقطة</span>
                  </div>
                </div>

                {(question?.mediaUrl || question?.media_url) && (
                  <div className="px-6 pt-6">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2 flex justify-center">
                          <img src={question.mediaUrl || question.media_url} alt="مرفق" className="max-h-72 w-auto object-contain rounded-xl" />
                      </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 space-y-5">
                  <div className={`p-5 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                    <div className="text-sm font-black mb-3 flex items-center gap-2">
                      {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                      <span className={isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-rose-700'}>إجابة الطالب</span>
                    </div>
                    
                    {isFileUploadType && !isUnanswered ? (
                       <div className="mt-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm inline-block">
                          {String(studentAnswerText).match(/\.(jpeg|jpg|gif|png|webp)$/i) || String(studentAnswerText).includes('cloudinary') ? (
                             <img src={String(studentAnswerText)} alt="صورة إجابة الطالب" className="max-h-96 w-auto rounded-lg object-contain" />
                          ) : (
                             <a href={String(studentAnswerText)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 font-bold hover:underline p-4">
                                <FileText className="w-5 h-5" /> تحميل إجابة الطالب
                             </a>
                          )}
                       </div>
                    ) : (
                       <div className={`text-lg font-bold whitespace-pre-wrap leading-relaxed ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                          {isUnanswered ? 'لم يقم الطالب بتقديم إجابة لهذا السؤال.' : <Latex>{String(studentAnswerText)}</Latex>}
                       </div>
                    )}
                  </div>

                  {!isFileUploadType && (
                    <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                      <div className="text-sm font-black text-indigo-600 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5"/> الإجابة النموذجية المعتمدة
                      </div>
                      <div className="text-lg font-bold text-slate-800 leading-relaxed">
                          <Latex>{String(correctAnswerText)}</Latex>
                      </div>
                    </div>
                  )}

                  {isTeacherOrAdmin && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                         <label className="font-bold text-slate-600 text-sm">تقييم المعلم:</label>
                         <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                             <input 
                                type="number" 
                                min="0" 
                                max={question.points} 
                                value={gradingState[question.id]?.points ?? 0} 
                                onChange={(e) => setGradingState((prev: any) => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} 
                                className="w-20 p-2.5 text-center font-black text-lg text-indigo-700 bg-transparent outline-none" 
                             />
                             <span className="px-3 text-sm font-bold text-slate-400 border-r border-slate-200 bg-slate-100/50">من {Number(question.points) || 0}</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleSaveGrade(question.id)} 
                        disabled={gradingState[question.id]?.isSubmitting} 
                        className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {gradingState[question.id]?.isSubmitting ? 'جاري الحفظ...' : <>حفظ الدرجة <Save className="w-4 h-4" /></>}
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
  );
}
