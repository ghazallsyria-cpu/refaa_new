'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, Lightbulb, Lock, Database } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

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
  
  const [exam, setExam] = useState<any>({});
  const [student, setStudent] = useState<any>({});
  const [attempt, setAttempt] = useState<any>(null); 
  const [answers, setAnswers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [gradingState, setGradingState] = useState<Record<string, { points: number, isSubmitting: boolean }>>({});
  
  // 🚀 المحرك الجبار (استراتيجية الجرافة) - بدون APIs خارجية
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. جلب الاختبار
      const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single();
      
      // 2. جلب الطالب لمعرفة كل معرفاته
      const { data: st1 } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
      const { data: st2 } = await supabase.from('students').select('*').eq('user_id', studentId).maybeSingle();
      const stData = st1 || st2 || { id: studentId, users: { full_name: 'طالب' } };
      const validStudentIds = [studentId, stData.id, stData.user_id].filter(Boolean);

      // 3. جلب الأسئلة
      const { data: rawQuestions } = await supabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
      const qIds = (rawQuestions || []).map(q => q.id);
      
      // 4. جلب الخيارات منفصلة لضمان عدم الفشل
      let finalQuestions = rawQuestions || [];
      if (qIds.length > 0) {
          const { data: rawOptions } = await supabase.from('question_options').select('*').in('question_id', qIds);
          finalQuestions = finalQuestions.map(q => ({
              ...q, options: (rawOptions || []).filter(o => o.question_id === q.id)
          }));
      }

      // 5. جلب المحاولات (كل محاولات الاختبار)
      const { data: allAttempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId);
      
      // 6. البحث عن محاولة الطالب
      let myAttempt = allAttempts?.find(a => validStudentIds.includes(a.student_id) || validStudentIds.includes(a.user_id));
      
      // 🚨 (Fallback) إذا لم نجد محاولة بالاسم، وكان هناك محاولة وحيدة في النظام، خذها!
      if (!myAttempt && allAttempts?.length === 1) {
          myAttempt = allAttempts[0];
      }

      // 7. جلب الإجابات
      let finalAnswers: any[] = [];
      if (myAttempt) {
          const { data: ans } = await supabase.from('student_answers').select('*').eq('attempt_id', myAttempt.id);
          finalAnswers = ans || [];
      } else if (qIds.length > 0) {
          // 🚨 (Super Fallback) إذا لم نجد محاولة إطلاقاً، اجلب أي إجابات تخص هذه الأسئلة لإنقاذ الموقف!
          const { data: fallbackAns } = await supabase.from('student_answers').select('*').in('question_id', qIds);
          if (fallbackAns && fallbackAns.length > 0) finalAnswers = fallbackAns;
      }

      // تجهيز الدرجات للواجهة
      const initialGrading: any = {};
      finalQuestions.forEach(q => {
         const ans = finalAnswers.find(a => String(a.question_id) === String(q.id));
         initialGrading[q.id] = { points: Number(ans?.points_earned) || 0, isSubmitting: false };
      });

      setExam(examData || {});
      setStudent(stData);
      setAttempt(myAttempt || null);
      setAnswers(finalAnswers);
      setQuestions(finalQuestions);
      setGradingState(initialGrading);

    } catch (err) {
      console.error('Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // حفظ الدرجة
  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState((prev: any) => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      if (!attempt?.id) { alert('لا توجد محاولة صالحة لحفظ الدرجة.'); return; }

      const existingAns = answers.find(a => String(a.question_id) === String(questionId));
      if (existingAns) {
          await supabase.from('student_answers').update({ points_earned: newPoints, is_correct: newPoints > 0 }).eq('id', existingAns.id);
      } else {
          await supabase.from('student_answers').insert({ attempt_id: attempt.id, question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' });
      }

      // تحديث المجموع
      const { data: allAns } = await supabase.from('student_answers').select('points_earned').eq('attempt_id', attempt.id);
      const newTotal = (allAns || []).reduce((sum, a) => sum + (Number(a.points_earned) || 0), 0);
      await supabase.from('exam_attempts').update({ score: newTotal, status: 'graded' }).eq('id', attempt.id);

      setAnswers((prev: any[]) => {
         const exists = prev.find(a => String(a.question_id) === String(questionId));
         if (exists) return prev.map(a => String(a.question_id) === String(questionId) ? { ...a, points_earned: newPoints, is_correct: newPoints > 0 } : a);
         return [...prev, { question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' }];
      });
      setAttempt((prev: any) => ({ ...prev, score: newTotal, status: 'graded' }));

    } catch (err) {
      alert('حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState((prev: any) => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  
  const calculatedMax = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
  let displayMaxScore = Number(exam?.total_marks) || Number(exam?.max_score) || calculatedMax || 100;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24" dir="rtl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
        <ArrowRight className="h-5 w-5" /> العودة للنتائج
      </button>

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
          
          // 🚀 ربط الإجابات الصارم
          const answer = answers.find((a: any) => String(a.question_id).trim().toLowerCase() === String(question.id).trim().toLowerCase());
          
          const qType = (question.type || '').toLowerCase();
          const isAuto = isAutoGradedType(qType);
          
          let studentAnswerText = null;
          let isCorrect = false;
          let pointsEarned = answer ? Number(answer.points_earned) || 0 : 0;

          // استخراج النص وتحديد الصحة
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
                  studentAnswerText = "✅ إجابة مسجلة (النص مفقود من القاعدة)";
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

        {/* 🚨 شاشة الفحص السوداء (تظهر للإدارة فقط لتعقب الأخطاء) 🚨 */}
        {isTeacherOrAdmin && (
            <div className="bg-slate-900 text-green-400 p-6 rounded-3xl mt-12 font-mono text-sm text-left shadow-xl" dir="ltr">
               <div className="flex items-center gap-2 mb-4 border-b border-green-800 pb-2">
                   <Database className="w-5 h-5" /> <strong>Supabase Connection Debugger</strong>
               </div>
               <p>» Exam ID: {examId}</p>
               <p>» URL Student ID: {studentId}</p>
               <p>» Attempt Found: <span className={attempt ? "text-green-400" : "text-red-500"}>{attempt ? 'YES (ID: '+attempt.id+')' : 'NO'}</span></p>
               <p>» Questions Loaded: {questions.length}</p>
               <p>» Answers Loaded from DB: <span className={answers.length > 0 ? "text-green-400" : "text-red-500"}>{answers.length}</span></p>
               <div className="mt-4 border-t border-green-800 pt-4">
                   <p className="mb-2 text-white">Raw Answers Array:</p>
                   {answers.length === 0 ? <p className="text-red-500">[] Empty Array</p> : answers.map((a, i) => (
                       <p key={i} className="text-xs text-green-300">
                           [{i}] Q_ID: {a.question_id?.slice(0,8)}... | Ans: {a.selected_option_id || a.text_answer || 'null'} | Pts: {a.points_earned}
                       </p>
                   ))}
               </div>
            </div>
        )}
      </div>
    </div>
  );
}


