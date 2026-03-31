'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, XCircle, Trophy, User, AlertCircle, Save, Clock, MinusCircle, ShieldCheck, Lightbulb, Lock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

// Helper function
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
  const [isExamTimeFinished, setIsExamTimeFinished] = useState(true);

  // 🚀 المحرك الجبار: بدون API، جلب مباشر وبسيط جداً يمنع أي خطأ
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("1. بدء جلب البيانات للاختبار:", examId, "والطالب:", studentId);

      // 1. جلب الاختبار
      const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single();
      
      // 2. جلب الطالب
      let studentData = null;
      const { data: s1 } = await supabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
      if (s1) studentData = s1;
      else {
        const { data: s2 } = await supabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
        if (s2) studentData = s2;
      }
      const realStudentId = studentData?.id || studentId;

      // 3. جلب الأسئلة (ببساطة تامة)
      const { data: rawQuestions } = await supabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
      
      // 4. جلب الخيارات ودمجها يدوياً (لمنع فشل Supabase Joins)
      let finalQuestions = rawQuestions || [];
      if (finalQuestions.length > 0) {
          const qIds = finalQuestions.map(q => q.id);
          const { data: rawOptions } = await supabase.from('question_options').select('*').in('question_id', qIds);
          
          finalQuestions = finalQuestions.map(q => ({
              ...q,
              options: (rawOptions || []).filter(o => o.question_id === q.id)
          }));
      }

      // 5. جلب المحاولة
      const { data: attempts } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', realStudentId).order('created_at', { ascending: false });
      const bestAttempt = attempts?.[0] || null;

      // 6. جلب الإجابات
      let finalAnswers: any[] = [];
      if (bestAttempt) {
          const { data: ans } = await supabase.from('student_answers').select('*').eq('attempt_id', bestAttempt.id);
          finalAnswers = ans || [];
      }

      console.log("نجاح! عدد الأسئلة:", finalQuestions.length, "عدد الإجابات:", finalAnswers.length);

      // 7. ضبط حالة الحماية
      if (examData && examData.exam_date) {
          const now = new Date();
          const examDate = new Date(examData.exam_date);
          const endTimeParts = (examData.end_time || '23:59').split(':');
          examDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
          setIsExamTimeFinished(now > examDate);
      }

      // 8. تجهيز الدرجات
      const initialGrading: any = {};
      finalQuestions.forEach(q => {
         const studentAns = finalAnswers.find(a => a.question_id === q.id);
         initialGrading[q.id] = { points: Number(studentAns?.points_earned) || 0, isSubmitting: false };
      });

      setExam(examData || {});
      setStudent(studentData || { users: { full_name: 'طالب' } });
      setAttempt(bestAttempt);
      setAnswers(finalAnswers);
      setQuestions(finalQuestions);
      setGradingState(initialGrading);

    } catch (err) {
      console.error('خطأ جسيم في جلب البيانات:', err);
      alert('حدث خطأ في الاتصال بقاعدة البيانات.');
    } finally {
      setLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 🚀 حفظ التقييم مباشرة لقاعدة البيانات
  const handleSaveGrade = async (questionId: string) => {
    const newPoints = gradingState[questionId].points;
    setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: true } }));
    
    try {
      if (!attempt?.id) throw new Error("لا توجد محاولة للطالب");

      const existingAns = answers.find(a => a.question_id === questionId);
      if (existingAns) {
          await supabase.from('student_answers').update({ points_earned: newPoints, is_correct: newPoints > 0 }).eq('id', existingAns.id);
      } else {
          await supabase.from('student_answers').insert({ attempt_id: attempt.id, question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' });
      }

      // حساب المجموع الجديد
      const { data: allAns } = await supabase.from('student_answers').select('points_earned').eq('attempt_id', attempt.id);
      const newTotal = (allAns || []).reduce((sum, a) => sum + (Number(a.points_earned) || 0), 0);
      await supabase.from('exam_attempts').update({ score: newTotal, status: 'graded' }).eq('id', attempt.id);

      // تحديث الواجهة فوراً
      setAnswers(prev => {
         const exists = prev.find(a => a.question_id === questionId);
         if (exists) return prev.map(a => a.question_id === questionId ? { ...a, points_earned: newPoints, is_correct: newPoints > 0 } : a);
         return [...prev, { question_id: questionId, points_earned: newPoints, is_correct: newPoints > 0, text_answer: 'تقييم يدوي' }];
      });
      
      setAttempt(prev => ({ ...prev, score: newTotal, status: 'graded' }));

    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الدرجة');
    } finally {
      setGradingState(prev => ({ ...prev, [questionId]: { ...prev[questionId], isSubmitting: false } }));
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div><p className="font-bold text-slate-500">جاري تجميع بيانات الاختبار...</p></div>;

  const isPendingGrading = !attempt || attempt.status !== 'graded';
  const totalEarned = Number(attempt?.score) || 0;
  
  // حساب العلامة الكاملة بدقة
  const calculatedQuestionsScore = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
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
              <p className="text-slate-600 font-bold text-sm leading-relaxed">وقت الاختبار لم ينتهِ بعد. أنت فقط من يرى هذه الصفحة الآن لتتأكد من تسليمك.</p>
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

          {questions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد أسئلة لعرضها</h3>
              <p className="text-slate-500">تأكد أن هذا الاختبار يحتوي على أسئلة مسجلة في قاعدة البيانات.</p>
            </div>
          ) : (
            questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              const qType = (question.type || '').toLowerCase();
              const isAuto = isAutoGradedType(qType);
              
              let pointsEarned = Number(answer?.points_earned) || 0;
              let isCorrect = Boolean(answer?.is_correct) || pointsEarned > 0;
              let studentAnswerText = null;
              let isUnanswered = true;

              // 🚀 فك تشفير إجابة الطالب بذكاء شديد
              if (answer) {
                  let rawVal = answer.selected_option_id || answer.text_answer || answer.answer;
                  
                  if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
                      isUnanswered = false;
                      if (isAuto) {
                          // محاولة مطابقة rawVal مع معرفات الخيارات (id)
                          const selectedOpt = question.options?.find((o: any) => String(o.id) === String(rawVal) || o.content === String(rawVal));
                          if (selectedOpt) {
                              studentAnswerText = selectedOpt.content;
                              // تحديث الصح والخطأ للمسجل قديماً
                              if(selectedOpt.is_correct) isCorrect = true;
                          } else {
                              studentAnswerText = String(rawVal);
                          }
                      } else {
                          studentAnswerText = String(rawVal);
                      }
                  } else if (pointsEarned > 0 || isCorrect) {
                      isUnanswered = false;
                      studentAnswerText = "✅ إجابة مسجلة";
                  }
              }

              // الإجابة النموذجية
              let correctAnswerText = 'يعتمد على تقييم المعلم.';
              if (isAuto) {
                  const correctOpts = question.options?.filter((o:any) => o.is_correct).map((o:any) => o.content);
                  if (correctOpts && correctOpts.length > 0) correctAnswerText = correctOpts.join('، ');
                  else correctAnswerText = 'لم يحدد المعلم إجابة صحيحة لهذا السؤال.';
              }

              return (
                <div key={question.id} className={`bg-white rounded-[2rem] overflow-hidden shadow-lg shadow-slate-100/50 border transition-all ${
                    isUnanswered ? 'border-slate-200 border-r-[6px] border-r-slate-400' :
                    isCorrect ? 'border-emerald-100 border-r-[6px] border-r-emerald-500' : 
                    'border-red-100 border-r-[6px] border-r-red-500'
                  }`}>
                  
                  <div className="p-6 sm:p-8 bg-slate-50/30 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="font-black text-xl text-slate-800 flex items-start sm:items-center gap-4">
                        <span className="flex items-center justify-center bg-white shadow-sm border border-slate-100 w-12 h-12 rounded-2xl text-indigo-600 text-lg shrink-0">{index + 1}</span>
                        <span className="leading-relaxed mt-1 sm:mt-0">{question.content}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 bg-white shadow-sm px-5 py-2.5 rounded-2xl font-black text-sm text-slate-600 border border-slate-100 shrink-0">
                        <span className={isCorrect ? 'text-emerald-600' : 'text-slate-900'}>{!isAuto && isPendingGrading && !isTeacherOrAdmin ? '؟' : pointsEarned}</span>
                        <span className="text-slate-300">/</span>
                        <span>{Number(question.points) || 0} نقطة</span>
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
                      <p className="text-lg font-bold text-slate-800 leading-relaxed">{correctAnswerText}</p>
                    </div>

                    {isTeacherOrAdmin && (
                      <div className="mt-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                            <Trophy className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="flex flex-col">
                             <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">تعديل الدرجة يدوياً</label>
                             <div className="flex items-center gap-2">
                               <input type="number" min="0" max={question.points} value={gradingState[question.id]?.points ?? 0} onChange={(e) => setGradingState(prev => ({ ...prev, [question.id]: { ...prev[question.id], points: Number(e.target.value) } }))} className="w-20 p-2 text-center rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-black text-xl text-indigo-700 outline-none bg-white transition-all" />
                               <span className="text-sm text-slate-500 font-bold">من {Number(question.points) || 0}</span>
                             </div>
                          </div>
                        </div>
                        
                        <button onClick={() => handleSaveGrade(question.id)} disabled={gradingState[question.id]?.isSubmitting} className="w-full sm:w-auto flex justify-center items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 hover:shadow-lg active:scale-95 shrink-0">
                          {gradingState[question.id]?.isSubmitting ? 'جاري الحفظ...' : 'حفظ الدرجة'} {!gradingState[question.id]?.isSubmitting && <Save className="w-5 h-5" />}
                        </button>
                      </div>
                   )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}


