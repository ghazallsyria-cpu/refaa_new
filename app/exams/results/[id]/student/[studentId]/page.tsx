'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

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
  
  // دالة جلب البيانات من الـ API الجديد
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams/get-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId, studentId })
      });
      
      const result = await res.json();
      if (result.success) {
          setData(result);
          
          // تحضير صناديق التقييم
          const initialGrading: any = {};
          result.questions.forEach((q: any) => {
             const ans = result.answers.find((a: any) => String(a.question_id) === String(q.id));
             initialGrading[q.id] = { points: Number(ans?.points_earned) || 0, isSubmitting: false };
          });
          setGradingState(initialGrading);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [examId, studentId]);

  // حفظ الدرجة باستخدام API بسيط
  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      const res = await fetch('/api/exams/grade-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId: data.attempt?.id, questionId, pointsEarned: newPoints, examId, studentId })
      });
      
      if (res.ok) {
          // تحديث الواجهة فوراً
          setData(prev => {
              const updatedAnswers = [...prev.answers];
              const ansIndex = updatedAnswers.findIndex(a => String(a.question_id) === String(questionId));
              if (ansIndex >= 0) {
                  updatedAnswers[ansIndex].points_earned = newPoints;
                  updatedAnswers[ansIndex].is_correct = newPoints > 0;
              } else {
                  updatedAnswers.push({ question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' });
              }
              
              const newTotal = updatedAnswers.reduce((sum, a) => sum + (Number(a.points_earned) || 0), 0);
              return { ...prev, answers: updatedAnswers, attempt: { ...prev.attempt, score: newTotal, status: 'graded' } };
          });
      } else {
          alert('فشل حفظ الدرجة');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

  const { exam, student, attempt, answers, questions } = data;
  
  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  let maxScore = Number(exam?.total_marks) || Number(exam?.max_score) || questions.reduce((sum:number, q:any) => sum + (Number(q.points) || 0), 0) || 100;

  // حماية الغش للطالب
  let isLockedForStudent = false;
  if (!isTeacherOrAdmin && exam?.exam_date) {
      const examDate = new Date(exam.exam_date);
      const [hours, minutes] = (exam.end_time || '23:59').split(':');
      examDate.setHours(Number(hours), Number(minutes), 0);
      isLockedForStudent = new Date() <= examDate;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

      {isLockedForStudent ? (
        <div className="bg-slate-100 border border-slate-200 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
           <Lock className="w-8 h-8 text-slate-500" />
           <div>
              <h3 className="text-xl font-black text-slate-800">نتائج الطلاب محجوبة حالياً</h3>
              <p className="text-slate-600 font-bold text-sm">لن يتم عرض التفاصيل إلا بعد انتهاء وقت الاختبار الرسمي.</p>
           </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100">
              <h1 className="text-3xl font-black text-slate-900 leading-tight">{exam?.title || 'نتيجة الاختبار'}</h1>
              <div className="flex gap-4 mt-6">
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border font-bold text-slate-600">
                  <User className="w-5 h-5 text-indigo-500" /> {student?.users?.full_name || student?.full_name || 'طالب غير محدد'}
                </div>
              </div>
            </div>

            <div className={`p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center text-white ${isPendingGrading ? 'bg-amber-500' : 'bg-indigo-600'}`}>
              <Trophy className="h-10 w-10 text-white/80 mb-3" />
              <div className="text-sm font-bold mb-2">النتيجة النهائية</div>
              <div className="text-4xl sm:text-5xl font-black">
                {isPendingGrading && !isTeacherOrAdmin ? 'التقييم مستمر' : <>{totalEarned} <span className="text-2xl opacity-70">/ {maxScore}</span></>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-600" /> تفاصيل الإجابات
            </h2>

            {questions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border shadow-sm">لا توجد أسئلة لعرضها</div>
            ) : questions.map((question: any, index: number) => {
              // البحث عن إجابة الطالب
              const answer = answers.find((a: any) => String(a.question_id) === String(question.id));
              
              let studentAnswerText = null;
              let isCorrect = false;
              let pointsEarned = answer ? Number(answer.points_earned) || 0 : 0;

              // منطق استخراج الإجابة المباشر والبسيط
              if (answer) {
                  if (answer.selected_option_id) {
                      const selectedOpt = question.options?.find((o:any) => String(o.id) === String(answer.selected_option_id));
                      studentAnswerText = selectedOpt ? selectedOpt.content : 'إجابة مسجلة (الخيار محذوف)';
                      if (selectedOpt?.is_correct) isCorrect = true;
                  } else if (answer.text_answer || answer.answer) {
                      studentAnswerText = answer.text_answer || answer.answer;
                  } else {
                      studentAnswerText = "إجابة مسجلة بالمحاولة";
                  }
                  
                  if (pointsEarned > 0) isCorrect = true;
              }

              const isUnanswered = !studentAnswerText;

              return (
                <div key={question.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 ${isUnanswered ? 'border-slate-200' : isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
                  <div className="p-6 bg-slate-50/50 border-b">
                    <h3 className="font-black text-lg flex items-center gap-3">
                      <span className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border text-indigo-600 shadow-sm">{index + 1}</span>
                      {question.content}
                    </h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className={`p-4 rounded-2xl border ${isUnanswered ? 'bg-slate-50' : isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="text-sm font-black mb-2 flex items-center gap-2">
                        {isCorrect ? <CheckCircle2 className="text-emerald-600 w-5 h-5"/> : <XCircle className="text-red-600 w-5 h-5"/>}
                        إجابة الطالب
                      </div>
                      <p className="text-lg font-bold text-slate-800">{isUnanswered ? 'لم يجب الطالب على هذا السؤال' : studentAnswerText}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                      <div className="text-sm font-black text-indigo-600 mb-2 flex items-center gap-2"><Lightbulb className="w-5 h-5"/> الإجابة النموذجية</div>
                      <p className="text-lg font-bold text-slate-800">
                        {question.options?.filter((o:any)=>o.is_correct).map((o:any)=>o.content).join('، ') || 'سؤال مقالي (يعتمد على المعلم)'}
                      </p>
                    </div>

                    {isTeacherOrAdmin && (
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                        <div className="flex items-center gap-3">
                           <span className="font-black text-sm">الدرجة:</span>
                           <input type="number" min="0" max={question.points} value={gradingState[question.id]?.points ?? 0} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-xl border focus:ring-2 font-black text-lg outline-none" />
                           <span className="font-bold text-slate-500">من {question.points}</span>
                        </div>
                        <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id]?.isSubmitting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50">
                          {gradingState[question.id]?.isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}


