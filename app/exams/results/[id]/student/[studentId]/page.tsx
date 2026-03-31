'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle, Save, Clock, MinusCircle } from 'lucide-react';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
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
      // 🚀 إضافة توقيت وهمي لتدمير الـ Cache وإجبار المتصفح على جلب الدرجة الجديدة
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
          
          // 🚀 السحر: التحديث البصري الفوري (Optimistic Update) لتغيير الدرجة دون انتظار!
          setAnswers(prev => {
             const existing = prev.find(a => a.question_id === questionId);
             if (existing) {
                return prev.map(a => a.question_id === questionId ? { ...a, points_earned: newPoints } : a);
             } else {
                return [...prev, { question_id: questionId, points_earned: newPoints, text_answer: 'تم التقييم' }];
             }
          });
          
          setAttempt((prev: any) => {
             const oldPoints = answers.find(a => a.question_id === questionId)?.points_earned || 0;
             const currentScore = prev?.score || 0;
             return { ...prev, score: (currentScore - oldPoints) + newPoints, status: 'graded' };
          });

          alert('تم الحفظ بنجاح!');
          
          // تحديث البيانات في الخلفية
          await fetchData();
          router.refresh(); // إجبار النظام على الإنعاش
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
  const maxScore = exam?.total_marks || exam?.max_score || questions.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

  // 🚀 تحسين استخراج إجابة الطالب (لن تظهر فارغة بعد اليوم)
  const renderStudentAnswerText = (answer: any, question: any) => {
    if (!answer) return null; 
    const rawText = answer.text_answer || answer.answer || answer.selected_option_id;
    if (rawText === undefined || rawText === null || rawText === '') return null;

    const qType = (question.type || '').toLowerCase();
    if (qType.includes('choice') || qType.includes('true_false') || qType.includes('select')) {
      const selected = question.options?.find((o: any) => o.id === answer.selected_option_id || o.id === rawText || o.content === rawText);
      return selected?.content || rawText;
    }
    return rawText;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ArrowRight className="h-5 w-5" /> العودة
        </button>
      </div>

      {isPendingGrading && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-600 shrink-0"><Clock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-amber-800 mb-1">الاختبار قيد التقييم</h3>
              <p className="text-amber-700 font-bold text-sm leading-relaxed">
                {currentRole === 'teacher' 
                  ? 'هذا الاختبار يحتوي على إجابات بانتظار تصحيحك اليدوي. يرجى وضع الدرجات في الأسفل لتكتمل النتيجة.' 
                  : 'لقد تم استلام إجاباتك! نتيجتك محجوبة مؤقتاً حتى يقوم المعلم بتصحيح الأسئلة.'}
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
            {isPendingGrading && currentRole === 'student' ? (
               <span className="text-3xl text-white drop-shadow-md">يتم التقييم</span>
            ) : (
               <>{totalEarned} <span className="text-2xl text-white/70 font-bold">/ {maxScore}</span></>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          تفاصيل الإجابات {currentRole === 'teacher' && '(وضع التصحيح)'}
        </h2>

        {questions && questions.length > 0 ? questions.map((question, index) => {
          const answer = answers.find(a => a.question_id === question.id);
          const studentTextAnswer = renderStudentAnswerText(answer, question);
          const qType = (question?.type || '').toLowerCase();
          const isManualQuestion = ['essay', 'open', 'text', 'paragraph', 'fill_in'].some(t => qType.includes(t));
          
          const isCorrect = isManualQuestion ? (answer?.points_earned > 0) : (answer ? answer.is_correct : false);
          const isUnanswered = !studentTextAnswer;

          return (
            <div key={question.id || index} className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border transition-all ${
                isUnanswered ? 'border-slate-200 border-r-4 border-r-slate-400' :
                isCorrect ? 'border-emerald-100 border-r-4 border-r-emerald-500' : 
                'border-red-100 border-r-4 border-r-red-500'
              }`}>
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <span className="flex items-center justify-center bg-slate-100 w-10 h-10 rounded-xl text-indigo-600 text-sm shrink-0">{index + 1}</span>
                    <span className="leading-relaxed">{question?.content || 'نص السؤال غير متوفر'}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 rounded-xl font-black text-sm text-slate-600 border border-slate-100 shrink-0">
                    <span>{isManualQuestion && isPendingGrading && currentRole === 'student' ? '؟' : (answer?.points_earned || 0)}</span>
                    <span className="text-slate-400">/</span>
                    <span>{question?.points || 0} نقطة</span>
                  </div>
                </div>

                {(question?.mediaUrl || question?.media_url) && (
                  <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 flex justify-center p-2">
                    <img src={question.mediaUrl || question.media_url} alt="مرفق السؤال" className="max-h-80 w-auto object-contain rounded-xl shadow-sm" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-5 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200 border-dashed' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isUnanswered ? <MinusCircle className="h-5 w-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                      <span className={`text-sm font-black ${isUnanswered ? 'text-slate-500' : isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>إجابة الطالب</span>
                    </div>
                    <p className={`text-lg font-bold leading-relaxed whitespace-pre-wrap ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                       {isUnanswered ? 'لم يقم الطالب بالإجابة على هذا السؤال' : studentTextAnswer}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-black text-slate-700">الإجابة النموذجية</span>
                      </div>
                      <p className="text-lg font-bold text-slate-800 leading-relaxed">
                        {!isManualQuestion ? (question?.options?.find((o:any)=>o.is_correct)?.content || 'لا يوجد خيار صحيح محدد') : 'يُقيّم يدوياً بواسطة المعلم'}
                      </p>
                    </div>

                    {currentRole === 'teacher' && gradingState[question.id] !== undefined && (
                      <div className="mt-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 flex items-center justify-between sm:justify-start gap-3 w-full">
                          <label className="text-sm font-black text-indigo-700 whitespace-nowrap">الدرجة:</label>
                          <input type="number" min="0" max={question.points} value={gradingState[question.id].points} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-lg border-2 border-indigo-200 focus:border-indigo-600 focus:ring-0 font-black text-lg text-indigo-700 outline-none" />
                          <span className="text-sm text-slate-500 font-bold">من {question.points}</span>
                        </div>
                        <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id].isSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0">
                          {gradingState[question.id].isSubmitting ? 'جاري الحفظ...' : 'حفظ'} {!gradingState[question.id].isSubmitting && <Save className="w-5 h-5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">حدث خطأ في تحميل الأسئلة</h3>
          </div>
        )}
      </div>
    </div>
  );
}


