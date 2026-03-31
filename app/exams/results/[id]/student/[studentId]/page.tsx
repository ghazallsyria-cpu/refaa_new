'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle, Save, Clock, MinusCircle, ShieldCheck, LockKeyhole } from 'lucide-react';
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
             if (existing) return prev.map(a => a.question_id === questionId ? { ...a, points_earned: newPoints } : a);
             return [...prev, { question_id: questionId, points_earned: newPoints, text_answer: 'تم التقييم يدوياً' }];
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
  
  const calculatedQuestionsScore = (questions || []).reduce((sum, q) => sum + (q?.points || 0), 0);
  let maxScore = exam?.total_marks || exam?.max_score;
  if (!maxScore || maxScore === 0) maxScore = calculatedQuestionsScore;
  if (!maxScore || maxScore === 0) maxScore = 100;

  // 🚀 نظام القفل الزمني (Time Vault Logic) لمنع الغش
  const now = new Date();
  let isExamActive = false;
  let endDateTimeStr = '';

  if (exam?.exam_date && exam?.end_time) {
    const examDate = new Date(exam.exam_date);
    const [hours, minutes] = (exam.end_time || '23:59').split(':').map(Number);
    examDate.setHours(hours, minutes, 0, 0);

    isExamActive = now < examDate; // إذا كان الوقت الحالي قبل وقت النهاية، فالاختبار ما زال نشطاً
    endDateTimeStr = examDate.toLocaleString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // 🔒 حجب النتائج عن الطالب فقط إذا كان الاختبار لم ينتهِ
  const isLockedForStudent = !isTeacherOrAdmin && isExamActive;

  const renderStudentAnswerText = (answer: any, question: any) => {
    if (!answer || !question) return null; 
    let rawText = answer.text_answer || answer.answer || answer.selected_option_id;
    if (rawText === undefined || rawText === null || rawText === '') return null;

    if (typeof rawText === 'object') {
       try {
         if (Array.isArray(rawText)) {
            const matchedOptions = question.options?.filter((o:any) => rawText.includes(o.id)).map((o:any)=>o.content);
            if (matchedOptions && matchedOptions.length > 0) return matchedOptions.join('، ');
            return rawText.join('، ');
         }
         rawText = JSON.stringify(rawText);
       } catch { return 'إجابة مركبة'; }
    }

    if (typeof rawText === 'string' && (rawText.startsWith('[') || rawText.startsWith('{'))) {
      try {
         const parsed = JSON.parse(rawText);
         if (Array.isArray(parsed)) {
            const matchedOptions = question.options?.filter((o:any) => parsed.includes(o.id)).map((o:any)=>o.content);
            if (matchedOptions && matchedOptions.length > 0) return matchedOptions.join('، ');
            return parsed.join('، ');
         }
      } catch(e) {} 
    }

    const qType = (question.type || '').toLowerCase();
    if (isAutoGradedType(qType)) {
      const selected = question.options?.find((o: any) => o.id === answer.selected_option_id || o.id === rawText || o.content === rawText);
      return selected?.content || String(rawText);
    }
    
    return String(rawText);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ArrowRight className="h-5 w-5" /> العودة
        </button>
      </div>

      {/* 🛡️ إشعار للمعلم أن النتائج محجوبة عن الطلاب حالياً */}
      {isTeacherOrAdmin && isExamActive && (
        <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-indigo-200/50 p-3 rounded-2xl text-indigo-600 shrink-0"><LockKeyhole className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-indigo-800 mb-1">نتائج الطلاب محجوبة حالياً (حماية من الغش)</h3>
              <p className="text-indigo-700 font-bold text-sm leading-relaxed">
                وقت الاختبار لم ينتهِ بعد. أنت فقط من يرى هذه الصفحة الآن لتتمكن من التصحيح. لن يتمكن الطلاب من استعراض الإجابات قبل: <strong className="text-indigo-900" dir="ltr">{endDateTimeStr}</strong>
              </p>
           </div>
        </div>
      )}

      {isPendingGrading && attempt && !isLockedForStudent && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-600 shrink-0"><Clock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-amber-800 mb-1">الاختبار قيد التقييم</h3>
              <p className="text-amber-700 font-bold text-sm leading-relaxed">
                {isTeacherOrAdmin 
                  ? 'هذا الاختبار يحتوي على إجابات بانتظار مراجعتك. يرجى وضع الدرجات في الأسفل لتكتمل النتيجة.' 
                  : 'لقد تم استلام إجاباتك! نتيجتك محجوبة مؤقتاً حتى يقوم المعلم بتصحيح باقي الأسئلة.'}
              </p>
           </div>
        </div>
      )}

      {(!attempt || !attempt.id) && !isLockedForStudent && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-red-200/50 p-3 rounded-2xl text-red-600 shrink-0"><AlertCircle className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-red-800 mb-1">تنبيه الإدارة</h3>
              <p className="text-red-700 font-bold text-sm leading-relaxed">
                هذا الطالب لم يقم بإنهاء الاختبار. يمكنك وضع الدرجة التقديرية بالأسفل ليتم حفظها.
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
              
              {!isLockedForStudent && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isPendingGrading ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                  {isPendingGrading ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  <span>{isPendingGrading ? 'قيد المراجعة' : 'مكتمل التصحيح'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔒 إخفاء النتيجة عن الطالب إذا كان الاختبار مغلقاً */}
        <div className={`p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-white relative overflow-hidden transition-all duration-500 ${isLockedForStudent ? 'bg-slate-800 shadow-slate-300' : isPendingGrading ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-indigo-600 to-purple-700 shadow-indigo-200'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          {isLockedForStudent ? (
             <>
               <LockKeyhole className="h-10 w-10 text-slate-300 mb-3 relative z-10" />
               <div className="text-sm font-bold text-white/70 mb-2 relative z-10">النتيجة النهائية</div>
               <div className="text-3xl font-black tracking-tighter relative z-10 text-white drop-shadow-md">محجوبة سرياً</div>
             </>
          ) : (
             <>
               <Trophy className="h-10 w-10 text-yellow-300 mb-3 relative z-10" />
               <div className="text-sm font-bold text-white/90 mb-2 relative z-10">النتيجة النهائية</div>
               <div className="text-4xl sm:text-5xl font-black tracking-tighter relative z-10 flex items-baseline gap-2">
                 {isPendingGrading && !isTeacherOrAdmin ? (
                    <span className="text-3xl text-white drop-shadow-md">يتم التقييم</span>
                 ) : (
                    <>{totalEarned} <span className="text-2xl text-white/70 font-bold">/ {maxScore}</span></>
                 )}
               </div>
             </>
          )}
        </div>
      </div>

      <div className="space-y-8 mt-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          تفاصيل الإجابات {isTeacherOrAdmin && '(صلاحيات الإدارة)'}
        </h2>

        {/* 🔒 الستار الحديدي: إخفاء الأسئلة تماماً عن الطالب واستبدالها برسالة الـ Vault */}
        {isLockedForStudent ? (
           <div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-sm text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <LockKeyhole className="w-12 h-12 text-slate-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">حفاظاً على مصداقية الاختبار</h2>
              <p className="text-lg text-slate-600 font-bold max-w-lg leading-relaxed mb-6">
                 لا يمكنك استعراض الإجابات التفصيلية والأسئلة إلا بعد انتهاء الموعد الرسمي للاختبار لجميع الطلاب.
              </p>
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-6 py-3 rounded-2xl font-black flex items-center gap-3">
                 <Clock className="w-5 h-5" />
                 تُفتح النتائج: <span dir="ltr">{endDateTimeStr}</span>
              </div>
           </div>
        ) : (
          questions && Array.isArray(questions) && questions.length > 0 ? questions.map((question, index) => {
            const answer = (answers || []).find(a => a.question_id === question.id);
            const studentTextAnswer = renderStudentAnswerText(answer, question);
            const qType = (question?.type || '').toLowerCase();
            const isManualQuestion = !isAutoGradedType(qType);
            
            const isCorrect = isManualQuestion ? ((answer?.points_earned || 0) > 0) : (answer ? answer.is_correct : false);
            const isUnanswered = studentTextAnswer === null || studentTextAnswer === undefined || studentTextAnswer === '';

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
                      <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{isManualQuestion && isPendingGrading && !isTeacherOrAdmin ? '؟' : (answer?.points_earned || 0)}</span>
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
                       {isUnanswered ? 'لم يقم الطالب بالإجابة على هذا السؤال' : studentTextAnswer}
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                      <span className="text-sm font-black text-slate-500 uppercase tracking-widest">الإجابة النموذجية</span>
                    </div>
                    <p className="text-lg font-bold text-slate-700 leading-relaxed">
                      {!isManualQuestion ? (question?.options?.find((o:any)=>o.is_correct)?.content || 'لا يوجد خيار صحيح محدد') : 'يُقيّم يدوياً بواسطة المعلم (سؤال مقالي)'}
                    </p>
                  </div>

                  {isTeacherOrAdmin && gradingState[question.id] !== undefined && (
                    <div className="mt-4 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-4 justify-between">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <Trophy className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                           <label className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">تعديل الدرجة</label>
                           <div className="flex items-center gap-2">
                             <input type="number" min="0" max={question.points} value={gradingState[question.id].points} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-xl border border-indigo-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-black text-xl text-indigo-700 outline-none bg-white transition-all" />
                             <span className="text-sm text-slate-500 font-bold">من {question.points}</span>
                           </div>
                        </div>
                      </div>
                      
                      <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id].isSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 hover:shadow-lg active:scale-95 shrink-0">
                        {gradingState[question.id].isSubmitting ? 'جاري الحفظ...' : 'حفظ التقييم'} {!gradingState[question.id].isSubmitting && <Save className="w-5 h-5" />}
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
          )
        )}
      </div>
    </div>
  );
}


