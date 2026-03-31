'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock, Database } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const isAutoGradedType = (type: string) => {
  const t = (type || '').toLowerCase();
  return t.includes('choice') || t.includes('true_false') || t.includes('select') || t.includes('checkbox') || t.includes('radio');
};

export default function StudentExamResult() {
  const params = useParams();
  const router = useRouter();
  const { authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isTeacherOrAdmin = ['teacher', 'admin', 'management'].includes(currentRole);
  
  const examId = params.id as string;
  const studentId = params.studentId as string; 
  
  const [data, setData] = useState<any>({ exam: {}, student: {}, attempt: null, answers: [], questions: [], debugInfo: null });
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});
  const [isExamTimeFinished, setIsExamTimeFinished] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams/admin-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
          body: JSON.stringify({ examId, studentId })
      });
      
      const result = await res.json();
      
      if (result.success) {
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

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div><p className="font-bold text-slate-500">جاري كسر الحماية واستخراج البيانات...</p></div>;

  const { exam, student, attempt, answers, questions, debugInfo } = data;

  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  
  const calculatedMax = questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 1), 0);
  let displayMaxScore = Number(exam?.total_marks) || Number(exam?.max_score) || calculatedMax || 100;

  const isLockedForStudent = !isTeacherOrAdmin && !isExamTimeFinished;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      {debugInfo?.isForced && isTeacherOrAdmin && (
        <div className="bg-amber-100 border border-amber-300 p-6 rounded-3xl flex items-center gap-4 shadow-sm animate-pulse">
           <AlertCircle className="w-8 h-8 text-amber-600" />
           <div>
              <h3 className="text-xl font-black text-amber-900 mb-1">تم إجبار النظام على عرض هذه الإجابات!</h3>
              <p className="text-amber-800 font-bold text-sm">رقم الطالب في الرابط لا يتطابق مع رقم الطالب في قاعدة البيانات، لقد قمنا بسحب المحاولة بالقوة لكي تراها.</p>
           </div>
        </div>
      )}

      {isLockedForStudent && (
        <div className="bg-slate-100 border border-slate-200 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
           <Lock className="w-8 h-8 text-slate-500" />
           <div>
              <h3 className="text-xl font-black text-slate-800 mb-1">نتائج الطلاب محجوبة حالياً (حماية من الغش)</h3>
              <p className="text-slate-600 font-bold text-sm">وقت الاختبار لم ينتهِ بعد.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 leading-tight">{exam?.title || 'نتيجة الاختبار'}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-6 text-slate-600 font-bold">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <User className="h-5 w-5 text-indigo-500" />
                <span>{student?.users?.full_name || student?.full_name || 'طالب'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-white ${isPendingGrading ? 'bg-amber-500' : 'bg-indigo-600'}`}>
          <Trophy className="h-10 w-10 text-white/80 mb-3" />
          <div className="text-sm font-bold mb-2">النتيجة النهائية</div>
          <div className="text-4xl sm:text-5xl font-black">
            {totalEarned} <span className="text-2xl opacity-70">/ {displayMaxScore}</span>
          </div>
        </div>
      </div>

      {!isLockedForStudent && (
        <div className="space-y-6 mt-8">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-indigo-600" /> تفاصيل الإجابات
          </h2>

          {questions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border shadow-sm">
                <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-800">لا توجد أسئلة</h3>
              </div>
          ) : questions.map((question: any, index: number) => {
            
            const answer = answers.find((a: any) => String(a.question_id) === String(question.id));
            const qType = (question.type || '').toLowerCase();
            const isAuto = isAutoGradedType(qType);
            
            let studentAnswerText = null;
            let isCorrect = false;
            let pointsEarned = answer ? Number(answer.points_earned) || 0 : 0;

            if (answer) {
                let rawVal = answer.selected_option_id || answer.text_answer || answer.answer || answer.option_id;
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
                    studentAnswerText = "✅ إجابة مسجلة";
                    isCorrect = true;
                }
            }

            const isUnanswered = !studentAnswerText;
            const correctAnswerText = question.options?.filter((o:any)=>o.is_correct).map((o:any)=>o.content).join('، ') || 'يعتمد على المعلم';

            return (
              <div key={question.id} className={`bg-white rounded-[2rem] overflow-hidden shadow-sm border-2 ${isUnanswered ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
                <div className="p-6 bg-slate-50/50 border-b flex justify-between items-center gap-4">
                  <h3 className="font-black text-lg flex items-center gap-3">
                    <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border text-indigo-600 shadow-sm">{index + 1}</span>
                    {question.content}
                  </h3>
                  <div className="flex items-center gap-1.5 bg-white shadow-sm px-5 py-2.5 rounded-2xl font-black text-sm text-slate-600 border border-slate-100 shrink-0">
                    <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{pointsEarned}</span>
                    <span className="text-slate-300">/</span>
                    <span>{Number(question.points) || 0} نقطة</span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className={`p-4 rounded-2xl border ${isUnanswered ? 'bg-slate-50' : isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="text-sm font-black mb-2 flex items-center gap-2">
                      {isUnanswered ? <MinusCircle className="w-5 h-5 text-slate-400" /> : isCorrect ? <CheckCircle2 className="text-emerald-600 w-5 h-5"/> : <XCircle className="text-red-600 w-5 h-5"/>}
                      إجابة الطالب
                    </div>
                    <p className="text-lg font-bold text-slate-800">{isUnanswered ? 'لم يقم الطالب بالإجابة' : studentAnswerText}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <div className="text-sm font-black text-indigo-600 mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5"/> الإجابة النموذجية</div>
                    <p className="text-lg font-bold text-slate-800">{correctAnswerText}</p>
                  </div>

                  {isTeacherOrAdmin && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                      <div className="flex items-center gap-3">
                         <span className="font-black text-sm">تعديل الدرجة:</span>
                         <input type="number" min="0" max={question.points} value={gradingState[question.id]?.points ?? 0} onChange={(e) => setGradingState((prev: any) => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-xl border focus:ring-2 font-black text-lg outline-none" />
                      </div>
                      <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id]?.isSubmitting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50">
                        {gradingState[question.id]?.isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 🚨 شاشة الفحص السوداء (وضع الإله) 🚨 */}
          {isTeacherOrAdmin && debugInfo && (
              <div className="bg-slate-900 text-green-400 p-6 rounded-3xl mt-12 font-mono text-sm text-left shadow-xl" dir="ltr">
                 <div className="flex items-center gap-2 mb-4 border-b border-green-800 pb-2">
                     <Database className="w-5 h-5" /> <strong>God Mode Debugger</strong>
                 </div>
                 <p>» Exam ID: {examId}</p>
                 <p>» URL Student ID: <span className="text-yellow-400">{studentId}</span></p>
                 <p>» Total Attempts in DB for this Exam: {debugInfo.foundAttemptsCount}</p>
                 <p className="break-all">» Student IDs in DB: {JSON.stringify(debugInfo.attemptStudentIdsInDB)}</p>
                 
                 {debugInfo.isForced && (
                    <p className="text-red-400 mt-2 font-bold">» WARNING: URL Student ID did NOT match DB. Forced to load Attempt: {attempt?.id}</p>
                 )}
                 
                 <p className="mt-2">» Answers Fetched: <span className={answers.length > 0 ? "text-green-400" : "text-red-500"}>{answers.length}</span></p>
              </div>
          )}
        </div>
      )}
    </div>
  );
}


