'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock, FileWarning } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return t.includes('choice') || t.includes('true_false') || t.includes('select') || t.includes('checkbox');
};

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  const isTeacherOrAdmin = ['teacher', 'admin', 'management'].includes(currentRole);
  
  const examId = params.id as string;
  const studentId = params.studentId as string; 
  
  const [exam, setExam] = useState<any>({});
  const [student, setStudent] = useState<any>({});
  const [attempt, setAttempt] = useState<any>(null); 
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});
  
  const [isExamTimeFinished, setIsExamTimeFinished] = useState(true);
  
  // 🚀 رادار كشف تلاعب الأسئلة
  const [mismatchWarning, setMismatchWarning] = useState(false);
  const [rawAnswers, setRawAnswers] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // 🚀 استدعاء خادم الاستخبارات V3
      const res = await fetch('/api/exams/student-result-v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
          body: JSON.stringify({ examId, studentId })
      });
      
      if (!res.ok) throw new Error('فشل جلب البيانات');
      const data = await res.json();
      
      if (data.success) {
        setExam(data.exam || {});
        setStudent(data.student || {});
        setAttempt(data.attempt || null); 
        setAnswers(data.answers || []);
        setRawAnswers(data.answers || []);
        setQuestions(data.questions || []); 
        
        // 🚀 رادار كشف تغيير الأسئلة: هل يمتلك الطالب إجابات لا تنتمي للأسئلة الحالية؟
        const isMismatch = (data.answers || []).length > 0 && (data.questions || []).length > 0 && !(data.answers || []).some((a:any) => (data.questions || []).some((q:any) => String(q.id).trim() === String(a.question_id).trim()));
        setMismatchWarning(isMismatch);

        if (data.exam && data.exam.exam_date) {
            const now = new Date();
            const examDate = new Date(data.exam.exam_date);
            const endTimeParts = (data.exam.end_time || '23:59').split(':');
            const endDateTime = new Date(examDate);
            endDateTime.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
            setIsExamTimeFinished(now > endDateTime);
        }
        
        const initialGrading: any = {};
        (data.questions || []).forEach((q: any) => {
           const qIdStr = String(q.id).trim();
           const studentAns = (data.answers || []).find((a: any) => String(a.question_id).trim() === qIdStr);
           initialGrading[q.id] = { points: Number(studentAns?.points_earned) || 0, isSubmitting: false };
        });
        setGradingState(initialGrading);
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      const res = await fetch('/api/exams/grade-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: attempt?.id, questionId, pointsEarned: newPoints, examId, studentId })
      });
      
      if (!res.ok) throw new Error('فشل الحفظ');
      
      setAnswers(prev => {
         const existing = prev.find(a => String(a.question_id) === String(questionId));
         if (existing) return prev.map(a => String(a.question_id) === String(questionId) ? { ...a, points_earned: newPoints, is_correct: newPoints > 0 } : a);
         return [...prev, { question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' }];
      });
      
      setAttempt((prev: any) => {
         const currentScore = Number(prev?.score) || 0;
         const oldPoints = Number(answers.find(a => String(a.question_id) === String(questionId))?.points_earned) || 0;
         return { ...(prev || { id: 'temp-id', status: 'graded', exam_id: examId, student_id: studentId }), score: (currentScore - oldPoints) + newPoints, status: 'graded' };
      });
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  
  const calculatedQuestionsScore = (questions || []).reduce((sum, q) => sum + (Number(q?.points) || 0), 0);
  let displayMaxScore = Number(exam?.total_marks) || Number(exam?.max_score) || 0;
  if (displayMaxScore <= 0) displayMaxScore = calculatedQuestionsScore;
  if (displayMaxScore <= 0) displayMaxScore = 100;

  const hasManualQuestions = questions.some(q => !isAutoGradedType(q.type));
  const isLockedForStudent = !isTeacherOrAdmin && !isExamTimeFinished;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ArrowRight className="h-5 w-5" /> العودة للنتائج
        </button>
      </div>

      {isLockedForStudent && (
        <div className="bg-slate-100 border-2 border-slate-200 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
           <div className="bg-white p-3 rounded-2xl text-slate-500 shrink-0"><Lock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-slate-800 mb-1">نتائج الطلاب محجوبة حالياً (حماية من الغش)</h3>
              <p className="text-slate-600 font-bold text-sm leading-relaxed">
                وقت الاختبار لم ينتهِ بعد. أنت فقط من يرى هذه الصفحة الآن لتتأكد من تسليمك.
              </p>
           </div>
        </div>
      )}

      {isPendingGrading && attempt && attempt.id && !isLockedForStudent && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-600 shrink-0"><Clock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-amber-800 mb-1">الاختبار قيد التقييم</h3>
              <p className="text-amber-700 font-bold text-sm leading-relaxed">
                {isTeacherOrAdmin ? 'هذا الاختبار يحتوي على إجابات بانتظار تصحيحك اليدوي.' : 'لقد تم استلام إجاباتك! نتيجتك محجوبة مؤقتاً.'}
              </p>
           </div>
        </div>
      )}

      {(!attempt || !attempt.id) && isTeacherOrAdmin && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-red-200/50 p-3 rounded-2xl text-red-600 shrink-0"><AlertCircle className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-red-800 mb-1">تنبيه الإدارة / المعلم</h3>
              <p className="text-red-700 font-bold text-sm leading-relaxed">
                هذا الطالب لم يقم بإنهاء الاختبار بشكل صحيح أو لم يُجب على الأسئلة.
              </p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{exam?.title || 'نتائج الاختبار'}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-6 text-slate-600 font-bold">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <User className="h-5 w-5 text-indigo-500" />
                <span>{student?.users?.full_name || student?.full_name || 'طالب غير محدد'}</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isPendingGrading ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                {isPendingGrading ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                <span>{isPendingGrading ? 'قيد المراجعة' : 'مكتمل التصحيح'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-white relative overflow-hidden transition-all duration-500 ${isPendingGrading ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-indigo-600 to-purple-700 shadow-indigo-200'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <Trophy className="h-10 w-10 text-yellow-300 mb-3 relative z-10" />
          <div className="text-sm font-bold text-white/90 mb-2 relative z-10">النتيجة النهائية</div>
          <div className="text-4xl sm:text-5xl font-black tracking-tighter relative z-10 flex items-baseline gap-2">
            {isPendingGrading && !isTeacherOrAdmin ? (
               <span className="text-3xl text-white drop-shadow-md">يتم التقييم</span>
            ) : (
               <>{totalEarned} <span className="text-2xl text-white/70 font-bold">/ {displayMaxScore}</span></>
            )}
          </div>
        </div>
      </div>

      {!isLockedForStudent && (
        <div className="space-y-8 mt-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            تفاصيل الإجابات {isTeacherOrAdmin && '(صلاحيات الإدارة)'}
          </h2>

          {isTeacherOrAdmin && (
             <div className={`p-4 rounded-2xl border flex items-center gap-3 font-bold text-sm ${hasManualQuestions ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {hasManualQuestions ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                {hasManualQuestions ? 'هذا الاختبار يحتوي على أسئلة مقالية تتطلب وضع الدرجة يدوياً.' : 'هذا الاختبار يصحح آلياً بالكامل.'}
             </div>
          )}

          {/* 🚨 صندوق الرادار: يظهر فقط إذا تم تغيير الأسئلة 🚨 */}
          {isTeacherOrAdmin && mismatchWarning && (
            <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                    <FileWarning className="w-8 h-8 text-red-600" />
                    <h3 className="text-xl font-black text-red-800">تنبيه خطير: تم تغيير أسئلة الاختبار!</h3>
                </div>
                <p className="text-red-700 font-bold mb-4 leading-relaxed">
                    لقد اكتشف النظام أن الطالب قام بالإجابة ({rawAnswers.length} إجابات)، ولكن المعلم قام <b>بحذف أو تغيير</b> الأسئلة بعد ذلك! الإجابات المعروضة في الأسفل فارغة لأن الأسئلة جديدة. إليك الإجابات القديمة المسجلة للطالب:
                </p>
                <div className="bg-white p-4 rounded-xl border border-red-100 shadow-inner overflow-y-auto max-h-48 text-sm font-bold text-slate-700">
                    {rawAnswers.map((ans, idx) => (
                        <div key={idx} className="mb-2 pb-2 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                            <span className="text-indigo-600 mr-2">إجابة {idx + 1}:</span> 
                            <span dir="ltr">{ans.text_answer || ans.selected_option_id || ans.answer || 'مفقودة'}</span>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {questions && Array.isArray(questions) && questions.length > 0 ? questions.map((question, index) => {
            
            const questionIdStr = String(question.id).trim();
            const answer = (answers || []).find(a => String(a.question_id).trim() === questionIdStr);
            
            const qType = (question?.type || '').toLowerCase();
            const isAuto = isAutoGradedType(qType);
            const isManualQuestion = !isAuto;
            
            let pointsEarned = Number(answer?.points_earned) || 0;
            let isCorrect = Boolean(answer?.is_correct) || pointsEarned > 0;
            
            let studentAnswerText = null;
            let isUnanswered = true;

            if (answer) {
                let rawData = answer.selected_option_id || answer.text_answer || answer.answer || answer.option_id;
                
                if (rawData !== undefined && rawData !== null && rawData !== '') {
                    isUnanswered = false;
                    
                    if (isAuto) {
                        let parsedData = rawData;
                        if (typeof rawData === 'string' && (rawData.startsWith('[') || rawData.startsWith('{'))) {
                            try { parsedData = JSON.parse(rawData); } catch(e){}
                        }
                        
                        if (Array.isArray(parsedData)) {
                            const matchedOptions = question.options?.filter((o:any) => parsedData.includes(String(o.id)) || parsedData.includes(o.content)).map((o:any)=>o.content);
                            studentAnswerText = matchedOptions && matchedOptions.length > 0 ? matchedOptions.join('، ') : parsedData.join('، ');
                        } else {
                            const selectedOpt = question.options?.find((o: any) => String(o.id) === String(parsedData) || o.content === String(parsedData));
                            studentAnswerText = selectedOpt ? selectedOpt.content : String(parsedData);
                        }
                    } else {
                        studentAnswerText = typeof rawData === 'object' ? JSON.stringify(rawData) : String(rawData);
                    }
                } else if (pointsEarned > 0 || isCorrect) {
                    isUnanswered = false;
                    studentAnswerText = "✅ إجابة مسجلة (بدون نص)";
                }
                
                if (isAuto && studentAnswerText && !isCorrect && pointsEarned === 0) {
                    const correctOpt = question.options?.find((o:any) => o.is_correct);
                    if (correctOpt && (correctOpt.content === studentAnswerText || String(correctOpt.id) === String(rawData))) {
                        isCorrect = true;
                        pointsEarned = Number(question.points) || 1;
                    }
                }
            }

            return (
              <div key={question.id || index} className={`bg-white rounded-[2rem] overflow-hidden shadow-lg shadow-slate-100/50 border transition-all ${
                  isUnanswered ? 'border-slate-200 border-r-[6px] border-r-slate-400' :
                  isCorrect ? 'border-emerald-100 border-r-[6px] border-r-emerald-500' : 
                  'border-red-100 border-r-[6px] border-r-red-500'
                }`}>
                
                <div className="p-6 sm:p-8 bg-slate-50/30 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-black text-xl text-slate-800 flex items-start sm:items-center gap-4">
                      <span className="flex items-center justify-center bg-white shadow-sm border border-slate-100 w-12 h-12 rounded-2xl text-indigo-600 text-lg shrink-0">{index + 1}</span>
                      <span className="leading-relaxed mt-1 sm:mt-0">{question?.content || 'نص السؤال غير متوفر'}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 bg-white shadow-sm px-5 py-2.5 rounded-2xl font-black text-sm text-slate-600 border border-slate-100 shrink-0">
                      <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{isManualQuestion && isPendingGrading && !isTeacherOrAdmin ? '؟' : pointsEarned}</span>
                      <span className="text-slate-300">/</span>
                      <span>{Number(question?.points) || 0} نقطة</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4 bg-white">
                  
                  <div className={`p-6 rounded-3xl border-2 transition-all ${
                    isUnanswered ? 'bg-slate-50 border-dashed border-slate-200' : 
                    isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isUnanswered ? <MinusCircle className="h-5 w-5 text-slate-400" /> : 
                       isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : 
                       <XCircle className="h-5 w-5 text-red-600" />}
                      <span className={`text-sm font-black uppercase tracking-widest ${
                        isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-red-700'
                      }`}>إجابة الطالب</span>
                    </div>
                    <p className={`text-lg font-bold leading-relaxed whitespace-pre-wrap ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                       {isUnanswered ? 'لم يقم الطالب بالإجابة على هذا السؤال' : studentAnswerText}
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl border border-indigo-100 bg-indigo-50/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-indigo-500" />
                      <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">الإجابة الصحيحة / النموذجية</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800 leading-relaxed">
                      {!isManualQuestion ? (question?.options?.filter((o:any)=>o.is_correct).map((o:any)=>o.content).join('، ') || 'لا يوجد خيار صحيح محدد') : 'هذا السؤال مقالي، يعتمد على تقييم المعلم.'}
                    </p>
                  </div>

                  {isTeacherOrAdmin && gradingState[question.id] !== undefined && (
                    <div className="mt-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                          <Trophy className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">تعديل الدرجة يدوياً</label>
                           <div className="flex items-center gap-2">
                             <input type="number" min="0" max={question.points} value={gradingState[question.id].points} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-black text-xl text-indigo-700 outline-none bg-white transition-all" />
                             <span className="text-sm text-slate-500 font-bold">من {Number(question.points) || 0}</span>
                           </div>
                        </div>
                      </div>
                      
                      <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id].isSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 hover:shadow-lg active:scale-95 shrink-0">
                        {gradingState[question.id].isSubmitting ? 'جاري الحفظ...' : 'حفظ الدرجة'} {!gradingState[question.id].isSubmitting && <Save className="w-5 h-5" />}
                      </button>
                    </div>
                 )}
                  
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد أسئلة لعرضها</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


