'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle, Save, Clock, MinusCircle, ShieldCheck, Lightbulb } from 'lucide-react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
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
  
  const { fetchStudentExamResult, gradeAnswer } = useExamsSystem();
  
  const [exam, setExam] = useState<any>({});
  const [student, setStudent] = useState<any>({});
  const [attempt, setAttempt] = useState<any>(null); 
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentExamResult(examId, studentId);
      if (data) {
        setExam(data.exam || {});
        setStudent(data.student || {});
        setAttempt(data.attempt || null); 
        setAnswers(data.answers || []);
        setQuestions(data.questions || []); 
        
        const initialGrading: any = {};
        (data.questions || []).forEach(q => {
           const studentAns = (data.answers || []).find(a => a.question_id === q.id);
           initialGrading[q.id] = { points: studentAns?.points_earned || 0, isSubmitting: false };
        });
        setGradingState(initialGrading);
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId, fetchStudentExamResult]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      if(gradeAnswer) {
          await gradeAnswer(attempt?.id || null, questionId, newPoints, examId, studentId);
          
          setAnswers(prev => {
             const existing = prev.find(a => a.question_id === questionId);
             if (existing) return prev.map(a => a.question_id === questionId ? { ...a, points_earned: newPoints, is_correct: newPoints > 0 } : a);
             return [...prev, { question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تم التقييم يدوياً' }];
          });
          
          setAttempt((prev: any) => {
             const currentScore = prev?.score || 0;
             const oldPoints = answers.find(a => a.question_id === questionId)?.points_earned || 0;
             return { ...(prev || { id: 'temp-id', status: 'graded', exam_id: examId, student_id: studentId }), score: (currentScore - oldPoints) + newPoints, status: 'graded' };
          });

          await fetchData();
          router.refresh();
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = attempt?.score || 0;
  
  // 🚀 حل مشكلة (10 / 0) نهائياً: حساب الدرجة الكاملة من مجموع نقاط الأسئلة كخيار أول
  const calculatedQuestionsScore = (questions || []).reduce((sum, q) => sum + (Number(q?.points) || 0), 0);
  let displayMaxScore = Number(exam?.total_marks) || Number(exam?.max_score) || 0;
  if (displayMaxScore === 0) displayMaxScore = calculatedQuestionsScore;
  if (displayMaxScore === 0) displayMaxScore = 100; // الدرجة الاحتياطية المطلقة

  // المترجم اللغوي الخارق 
  const getStudentAnswerInfo = (answer: any, question: any) => {
    if (!answer) return { text: null, hasAnswer: false };

    let rawText = answer.text_answer || answer.answer || answer.selected_option_id;
    let hasAnswer = true;

    if ((rawText === undefined || rawText === null || rawText === '') && (answer.points_earned > 0 || answer.is_correct)) {
        return { text: "أجاب الطالب (النص مفقود من السجل)", hasAnswer: true };
    }

    if (rawText === undefined || rawText === null || rawText === '') return { text: null, hasAnswer: false };

    if (typeof rawText === 'string' && (rawText.startsWith('[') || rawText.startsWith('{'))) {
      try { rawText = JSON.parse(rawText); } catch(e) {} 
    }

    if (typeof rawText === 'object') {
       try {
         if (Array.isArray(rawText)) {
            const matchedOptions = question.options?.filter((o:any) => rawText.includes(o.id)).map((o:any)=>o.content);
            if (matchedOptions && matchedOptions.length > 0) return { text: matchedOptions.join('، '), hasAnswer: true };
            return { text: rawText.join('، '), hasAnswer: true };
         }
         return { text: JSON.stringify(rawText), hasAnswer: true };
       } catch {
         return { text: 'إجابة مركبة', hasAnswer: true };
       }
    }

    const qType = (question.type || '').toLowerCase();
    
    if (isAutoGradedType(qType)) {
      const selected = question.options?.find((o: any) => String(o.id) === String(answer.selected_option_id) || String(o.id) === String(rawText) || o.content === rawText);
      if (selected) return { text: selected.content, hasAnswer: true };
    }
    
    return { text: String(rawText), hasAnswer: true };
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ArrowRight className="h-5 w-5" /> العودة للنتائج
        </button>
      </div>

      {isPendingGrading && attempt && attempt.id && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-600 shrink-0"><Clock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-amber-800 mb-1">الاختبار قيد التقييم</h3>
              <p className="text-amber-700 font-bold text-sm leading-relaxed">
                {isTeacherOrAdmin 
                  ? 'هذا الاختبار يحتوي على إجابات بانتظار تصحيحك اليدوي. يرجى وضع الدرجات في الأسفل لتكتمل النتيجة.' 
                  : 'لقد تم استلام إجاباتك! نتيجتك محجوبة مؤقتاً حتى يقوم المعلم بتصحيح الأسئلة.'}
              </p>
           </div>
        </div>
      )}

      {(!attempt || !attempt.id) && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-red-200/50 p-3 rounded-2xl text-red-600 shrink-0"><AlertCircle className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-red-800 mb-1">تنبيه المعلم / الإدارة</h3>
              <p className="text-red-700 font-bold text-sm leading-relaxed">
                هذا الطالب لم يقم بإنهاء الاختبار بشكل صحيح (أو أنه مجرد سجل فارغ). يمكنك وضع الدرجة التقديرية لكل سؤال بالأسفل ليتم بناء النتيجة وحفظها فوراً.
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

      <div className="space-y-8 mt-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          تفاصيل الإجابات {isTeacherOrAdmin && '(صلاحيات الإدارة والمعلم)'}
        </h2>

        {questions && Array.isArray(questions) && questions.length > 0 ? questions.map((question, index) => {
          const answer = (answers || []).find(a => a.question_id === question.id);
          const studentAnswerInfo = getStudentAnswerInfo(answer, question);
          const qType = (question?.type || '').toLowerCase();
          const isManualQuestion = !isAutoGradedType(qType);
          
          let pointsEarned = answer?.points_earned || 0;
          let isCorrect = answer?.is_correct || pointsEarned > 0;
          
          if (!isManualQuestion && studentAnswerInfo.hasAnswer) {
             const correctOpt = question.options?.find((o:any) => o.is_correct);
             if (correctOpt && (correctOpt.content === studentAnswerInfo.text || correctOpt.id === answer?.selected_option_id)) {
                 isCorrect = true;
                 if (pointsEarned === 0) pointsEarned = question.points || 1; 
             }
          }

          const isUnanswered = !studentAnswerInfo.hasAnswer;

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
                    <span>{question?.points || 0} نقطة</span>
                  </div>
                </div>

                {(question?.mediaUrl || question?.media_url) && (
                  <div className="mt-6 rounded-3xl overflow-hidden border border-slate-100 bg-white flex justify-center p-4 shadow-sm">
                    <img src={question.mediaUrl || question.media_url} alt="مرفق السؤال" className="max-h-80 w-auto object-contain rounded-2xl" />
                  </div>
                )}
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
                     {isUnanswered ? 'لم يقم الطالب بالإجابة على هذا السؤال' : studentAnswerInfo.text}
                  </p>
                </div>

                <div className="p-6 rounded-3xl border border-indigo-100 bg-indigo-50/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-indigo-500" />
                    <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">الإجابة الصحيحة / النموذجية</span>
                  </div>
                  <p className="text-lg font-bold text-slate-800 leading-relaxed">
                    {!isManualQuestion ? (question?.options?.find((o:any)=>o.is_correct)?.content || 'لا يوجد خيار صحيح محدد') : 'هذا السؤال مقالي، يعتمد على تقييم المعلم.'}
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
                           <span className="text-sm text-slate-500 font-bold">من {question.points}</span>
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
    </div>
  );
}


