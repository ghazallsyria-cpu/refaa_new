'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, Check, AlertCircle, Save, Clock } from 'lucide-react';
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
  const [attempt, setAttempt] = useState<any>({});
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]); // حالة الأسئلة الجديدة
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentExamResult(examId, studentId);
      if (data) {
        setExam(data.exam || {});
        setStudent(data.student || {});
        setAttempt(data.attempt || {});
        setAnswers(data.answers || []);
        setQuestions(data.questions || []); // الاعتماد على الأسئلة
        
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
    if (!attempt?.id) {
       alert("الطالب لم يبدأ المحاولة أصلاً!");
       return;
    }
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      if(gradeAnswer) {
          await gradeAnswer(attempt.id, questionId, newPoints);
          await fetchData(); 
          alert('تم حفظ الدرجة بنجاح!');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const isPendingGrading = attempt?.status !== 'graded';
  
  const totalEarned = attempt?.score || 0;
  const maxScore = exam?.total_marks || exam?.max_score || questions.reduce((sum, q) => sum + (q.points || 0), 0) || 0;

  // استخراج النص من إجابة الطالب
  const renderStudentAnswerText = (answer: any, question: any) => {
    if (!answer) return 'لم يجب الطالب على هذا السؤال';
    
    const qType = (question.type || '').toLowerCase();

    if (qType.includes('multiple_choice') || qType.includes('true_false')) {
      const selected = question.options?.find((o: any) => o.id === answer.selected_option_id || o.content === answer.text_answer);
      return selected?.content || answer.text_answer || 'لم يجب الطالب على هذا السؤال';
    }
    
    if (qType.includes('multi_select') || qType.includes('checkbox')) {
      try {
        const selectedIds = JSON.parse(answer.text_answer || '[]');
        return question.options?.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.content).join('، ') || answer.text_answer || 'لم يجب الطالب على هذا السؤال';
      } catch { return answer.text_answer || 'لم يجب الطالب على هذا السؤال'; }
    }
    
    return answer.text_answer || 'لم يجب الطالب على هذا السؤال';
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
          <ArrowRight className="h-5 w-5" /> العودة للنتائج
        </button>
      </div>

      {isPendingGrading && attempt && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-amber-200/50 p-3 rounded-2xl text-amber-600 shrink-0"><Clock className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-amber-800 mb-1">الاختبار قيد المراجعة والتصحيح</h3>
              <p className="text-amber-700 font-bold text-sm leading-relaxed">
                {currentRole === 'teacher' 
                  ? 'هناك أسئلة في هذا الاختبار تتطلب تصحيحاً وإدخال الدرجة يدوياً من قبلك لتكتمل النتيجة.' 
                  : 'لقد تم استلام إجاباتك بنجاح، ولكن الاختبار يحتوي على أسئلة مقالية. نتيجتك محجوبة حتى يقوم المعلم بتصحيحها.'}
              </p>
           </div>
        </div>
      )}

      {/* تنبيه إذا دخل المعلم ولا يوجد محاولة أصلاً */}
      {!attempt && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center gap-4 animate-in fade-in shadow-sm">
           <div className="bg-red-200/50 p-3 rounded-2xl text-red-600 shrink-0"><AlertCircle className="w-8 h-8" /></div>
           <div>
              <h3 className="text-xl font-black text-red-800 mb-1">تنبيه هام!</h3>
              <p className="text-red-700 font-bold text-sm leading-relaxed">
                هذا الطالب لم يقم بإنهاء الاختبار أو لم تحفظ محاولته في النظام. يمكنك تقييم أسئلته أدناه كإجراء استثنائي وإعطائه درجة صفر أو إجباره على الإعادة.
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
          <div className="text-sm font-bold text-white/90 mb-1 relative z-10">النتيجة النهائية</div>
          <div className="text-5xl font-black tracking-tighter relative z-10 flex items-baseline gap-2">
            {isPendingGrading && currentRole === 'student' ? (
               <span className="text-2xl text-white">قيد المراجعة</span>
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

        {/* السحر هنا: نعرض الأسئلة دائماً، حتى لو لم يجب الطالب! */}
        {questions && questions.length > 0 ? questions.map((question, index) => {
          
          // نبحث عن إجابة الطالب لهذا السؤال
          const answer = answers.find(a => a.question_id === question.id);
          
          const qType = (question?.type || '').toLowerCase();
          const isManual = qType.includes('essay') || qType.includes('open') || qType.includes('text') || qType.includes('paragraph') || qType.includes('fill_in');
          
          // هل أجاب الطالب بشكل صحيح؟ (إذا كان السؤال مقالي وكان الطالب له إجابة، فالصحة تعتمد على النقاط)
          const isCorrect = isManual ? (answer?.points_earned > 0) : (answer ? answer.is_correct : false);
          
          // حالة عدم وجود إجابة نهائياً
          const isUnanswered = !answer;

          return (
            <div key={question.id || index} className={`bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-100 border transition-all ${
                isUnanswered ? 'border-slate-200 border-r-4 border-r-slate-400' :
                isManual && attempt?.status !== 'graded' ? 'border-amber-200 border-r-4 border-r-amber-400' :
                isCorrect ? 'border-emerald-100 border-r-4 border-r-emerald-500' : 
                'border-red-100 border-r-4 border-r-red-500'
              }`}>
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <span className="flex items-center justify-center bg-slate-100 w-10 h-10 rounded-xl text-indigo-600 text-sm">{index + 1}</span>
                    {question?.content || 'نص السؤال غير متوفر'}
                  </h3>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 rounded-xl font-black text-sm text-slate-600 border border-slate-100">
                    <span>{isManual && isPendingGrading && currentRole === 'student' ? '؟' : (answer?.points_earned || 0)}</span>
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
                  {/* صندوق إجابة الطالب */}
                  <div className={`p-5 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200' : isManual && attempt?.status !== 'graded' ? 'bg-amber-50/30 border-amber-100' : isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {isUnanswered ? <AlertCircle className="h-5 w-5 text-slate-400" /> : isManual && attempt?.status !== 'graded' ? <Clock className="h-5 w-5 text-amber-500" /> : isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                      <span className={`text-sm font-black ${isUnanswered ? 'text-slate-500' : isManual && attempt?.status !== 'graded' ? 'text-amber-700' : isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>إجابة الطالب</span>
                    </div>
                    <p className={`text-lg font-bold leading-relaxed whitespace-pre-wrap ${isUnanswered ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                       {renderStudentAnswerText(answer, question)}
                    </p>
                  </div>

                  {/* صندوق المعلم / الإجابة النموذجية */}
                  <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-5 w-5 text-slate-500" />
                      <span className="text-sm font-black text-slate-700">{isManual ? 'تقييم المعلم' : 'الإجابة النموذجية'}</span>
                    </div>
                    
                    {!isManual && <p className="text-lg font-bold text-slate-800 leading-relaxed">{question?.options?.find((o:any)=>o.is_correct)?.content || 'لا يوجد خيار صحيح محدد'}</p>}

                    {isManual && currentRole === 'teacher' && gradingState[question.id] && (
                      <div className="mt-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 flex items-center gap-3">
                          <label className="text-sm font-bold text-slate-600 whitespace-nowrap">الدرجة المستحقة:</label>
                          <input type="number" min="0" max={question.points} value={gradingState[question.id].points} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 font-bold" />
                          <span className="text-sm text-slate-500 font-medium">من {question.points}</span>
                        </div>
                        <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id].isSubmitting || !attempt} className="flex justify-center items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                          {gradingState[question.id].isSubmitting ? 'جاري الحفظ...' : 'حفظ الدرجة'} {!gradingState[question.id].isSubmitting && <Save className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    
                    {isManual && currentRole === 'student' && (
                      <p className="text-base font-bold text-amber-600 mt-2 flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                         <Clock className="w-5 h-5"/> بانتظار تصحيح المعلم ووضع الدرجة.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">حدث خطأ في تحميل أسئلة الاختبار</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              لم نستطع العثور على الأسئلة الأساسية لهذا الاختبار. يرجى التأكد من أن الاختبار غير محذوف.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


