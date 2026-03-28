'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Award, AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params?.id as string;

  const [status, setStatus] = useState<'loading' | 'not_started' | 'expired' | 'taking' | 'submitted' | 'already_taken' | 'cheating' | 'error'>('loading');
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // حفظ رسالة الخطأ القادمة من الداتابيز لعرضها للمطور
  const [dbError, setDbError] = useState<string>('');

  const fetchExamData = useCallback(async () => {
    if (!user?.id || !examId) return;

    try {
      setStatus('loading');

      // 1. التحقق من وجود محاولة سابقة
      const { data: attemptData } = await supabase
        .from('exam_attempts')
        .select('score')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (attemptData) {
        setFinalScore(attemptData.score);
        setStatus('already_taken');
        return; 
      }

      // 2. جلب الاختبار
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', examId)
        .single();

      if (examError || !examData) throw new Error('Exam not found');

      // التحقق من الوقت
      const now = new Date().getTime();
      const startTime = examData.start_time ? new Date(examData.start_time).getTime() : 0;
      const endTime = examData.end_time ? new Date(examData.end_time).getTime() : Infinity;

      if (startTime > now) {
        setExam(examData);
        setStatus('not_started');
        return;
      }
      if (endTime < now) {
        setStatus('expired');
        return;
      }

      // 3. جلب الأسئلة
      const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true });

      if (qError || !questionsData || questionsData.length === 0) {
        throw new Error('No questions found');
      }

      // === الحل السحري لمشكلة الخيارات (Smart Parser) ===
      const safeQuestions = questionsData.map(q => {
        let parsedOptions: any[] = [];
        
        if (q.options) {
          try {
            // محاولة أولى: إذا كان مصفوفة جاهزة
            if (Array.isArray(q.options)) {
              parsedOptions = q.options;
            } 
            // محاولة ثانية: إذا كان نص JSON
            else if (typeof q.options === 'string') {
              let parsed = JSON.parse(q.options);
              // أحياناً يكون JSON بداخل JSON، نعيد الفك
              if (typeof parsed === 'string') parsed = JSON.parse(parsed);
              
              if (Array.isArray(parsed)) {
                parsedOptions = parsed;
              } else {
                throw new Error("Not an array"); // للذهاب للـ catch
              }
            }
          } catch (e) {
            // محاولة ثالثة: إذا كان بنية PostgreSQL Array مثل {أ, ب, ج}
            let str = String(q.options).trim();
            if (str.startsWith('{') && str.endsWith('}')) {
              str = str.slice(1, -1);
              // فصل الخيارات بالفاصلة وإزالة علامات التنصيص
              parsedOptions = str.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            } else {
              // محاولة أخيرة: وضع النص بالكامل كخيار واحد لمنع الانهيار
              parsedOptions = [str];
            }
          }
        }
        
        // خلط الخيارات إذا طلب المعلم ذلك
        if (examData.randomize_questions && parsedOptions.length > 0) {
           parsedOptions.sort(() => Math.random() - 0.5);
        }

        return { ...q, options: parsedOptions };
      });

      // خلط الأسئلة
      let finalQuestions = safeQuestions;
      if (examData.randomize_questions) {
        finalQuestions = [...safeQuestions].sort(() => Math.random() - 0.5);
      }

      const durationMinutes = Number(examData.duration_minutes) || 30;
      setTimeLeft(durationMinutes * 60);
      
      setExam(examData);
      setQuestions(finalQuestions);
      setStatus('taking');

    } catch (error: any) {
      console.error("Error fetching exam:", error);
      setDbError(error.message || 'خطأ غير معروف');
      setStatus('error');
    }
  }, [examId, user]);

  useEffect(() => { fetchExamData(); }, [fetchExamData]);

  // المؤقت
  useEffect(() => {
    if (status !== 'taking' || timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleSubmit(false, true); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [status, timeLeft]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // === حل مشكلة الإرسال ===
  const handleSubmit = async (isCheating = false, isTimeout = false) => {
    if (isSubmitting || status === 'submitted' || status === 'already_taken') return;
    if (!user?.id) {
      alert("معرف المستخدم غير موجود، يرجى تسجيل الدخول مجدداً.");
      return;
    }

    const answeredCount = Object.keys(answers).length;
    if (!isCheating && !isTimeout && answeredCount < questions.length) {
      const confirmSubmit = window.confirm(`لقد أجبت على ${answeredCount} من أصل ${questions.length} أسئلة.\nهل أنت متأكد من التسليم؟`);
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    setStatus('loading'); 

    try {
      let earnedMarks = 0;
      let totalMarks = 0;

      questions.forEach(q => {
        const mark = Number(q.marks) || 1;
        totalMarks += mark;
        if (answers[q.id] === q.correct_answer) {
          earnedMarks += mark;
        }
      });

      const percentageScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

      // الإرسال لقاعدة البيانات
      const { error } = await supabase.from('exam_attempts').insert([{
        exam_id: examId,
        student_id: user.id,
        score: percentageScore,
        answers: answers // التأكد من إرسال كائن JSON نظيف
      }]);

      if (error) {
        console.error("Supabase Error Details:", error);
        throw error;
      }

      setFinalScore(percentageScore);
      if (!isCheating) setStatus('submitted');

    } catch (error: any) {
      console.error("Submit Exception:", error);
      // إظهار سبب الرفض القادم من قاعدة البيانات
      alert(`فشل الإرسال!\nالسبب من السيرفر: ${error.message || error.details || 'خطأ غير معروف'}\n\nيرجى تصوير هذه الرسالة للمسؤول.`);
      setStatus('taking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ---------------------------------------------------------
  // واجهات العرض المتعددة
  // ---------------------------------------------------------

  if (status === 'loading') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-r-4 border-transparent"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">جاري التحميل...</p>
    </div>
  );

  if (status === 'error') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <AlertTriangle className="h-20 w-20 text-red-400 mb-6" />
      <h2 className="text-2xl font-black text-slate-900 mb-2">عذراً، حدث خطأ!</h2>
      <p className="text-slate-500 mb-4">تعذر تحميل بيانات الاختبار. قد يكون غير متاح أو به خلل.</p>
      {dbError && <p className="text-xs bg-red-50 text-red-600 p-3 rounded-lg font-mono mb-6" dir="ltr">{dbError}</p>}
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">العودة للوحة التحكم</button>
    </div>
  );

  if (status === 'not_started') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <div className="h-24 w-24 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-6"><Clock size={40} /></div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">الاختبار لم يبدأ بعد</h2>
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black mt-4">العودة للوحة التحكم</button>
    </div>
  );

  if (status === 'expired') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <div className="h-24 w-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6"><AlertTriangle size={40} /></div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">انتهى وقت إتاحة الاختبار</h2>
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black mt-4">العودة للرئيسية</button>
    </div>
  );

  if (status === 'submitted' || status === 'already_taken') {
    const passingScore = Number(exam?.passing_score) || 50;
    const isPassed = finalScore >= passingScore;

    return (
      <div className="max-w-2xl mx-auto py-16 px-4" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-12 text-center">
          <div className="h-28 w-28 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
            <Award className="h-14 w-14 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {status === 'already_taken' ? 'تم تقديم الاختبار مسبقاً' : 'تم تسليم الاختبار بنجاح!'}
          </h1>
          <p className="text-slate-500 font-bold mb-10">درجة النجاح المطلوبة: {passingScore}%</p>
          <div className={`rounded-[30px] p-8 mb-10 border-2 ${isPassed ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">النتيجة النهائية</p>
            <p className={`text-7xl font-black ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
              {finalScore}%
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/student')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg">العودة للوحة التحكم</button>
        </motion.div>
      </div>
    );
  }

  // --- شاشة تقديم الأسئلة ---
  const q = questions[currentQIndex];
  const isLastQuestion = currentQIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" dir="rtl">
      {/* Header & Timer */}
      <div className="bg-white rounded-[30px] p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900">{exam?.title}</h1>
          </div>
          <p className="text-slate-500 font-bold text-sm mt-1">{exam?.subject?.name}</p>
        </div>
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xl border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
          <Clock className="h-6 w-6" />
          <span dir="ltr">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
        <div className="flex justify-between text-xs font-black text-slate-400 uppercase mb-4">
          <span>السؤال {currentQIndex + 1} من {questions.length}</span>
          <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">مُجاب: {answeredCount}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      {q && (
        <div className="bg-white rounded-[40px] shadow-xl border border-slate-50 p-8 md:p-12 mb-8 min-h-[400px] flex flex-col">
          <div className="flex items-start gap-5 mb-10">
            <div className="h-12 w-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
              {currentQIndex + 1}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-relaxed mt-2 select-none">
              {q.question_text}
            </h2>
          </div>

          <div className="space-y-4 flex-1">
            {q.options && q.options.length > 0 ? (
              q.options.map((option: string, idx: number) => (
                <label key={idx} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all select-none ${answers[q.id] === option ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
                  <input type="radio" name={`q-${q.id}`} className="hidden" onChange={() => handleAnswerSelect(q.id, option)} />
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${answers[q.id] === option ? 'border-indigo-600 bg-white' : 'border-slate-300 bg-white'}`}>
                    {answers[q.id] === option && <div className="h-3 w-3 bg-indigo-600 rounded-full" />}
                  </div>
                  <span className={`font-bold text-lg ${answers[q.id] === option ? 'text-indigo-900' : 'text-slate-700'}`}>{option}</span>
                </label>
              ))
            ) : <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl font-bold text-sm">عذراً، لم يتم إدخال خيارات صحيحة لهذا السؤال في لوحة التحكم.</div>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[30px] border border-slate-100 shadow-sm">
        <button onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))} disabled={currentQIndex === 0} className="px-6 py-4 flex items-center gap-2 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-30">
          <ChevronRight className="h-5 w-5" /> السابق
        </button>

        {isLastQuestion ? (
          <button onClick={() => handleSubmit(false, false)} disabled={isSubmitting} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
            {isSubmitting ? 'جاري التسليم...' : 'إنهاء وتسليم'} <CheckCircle2 className="h-6 w-6" />
          </button>
        ) : (
          <button onClick={() => setCurrentQIndex(p => Math.min(questions.length - 1, p + 1))} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95">
            التالي <ChevronLeft className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}


