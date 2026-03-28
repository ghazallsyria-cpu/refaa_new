'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [hasAttempted, setHasAttempted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const fetchExamData = useCallback(async () => {
    if (!user || !examId) return;

    try {
      setLoading(true);
      
      // 1. التحقق مما إذا كان الطالب قد أجرى الاختبار مسبقاً
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('score')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .single();

      if (attempt) {
        setHasAttempted(true);
        setFinalScore(attempt.score);
        setLoading(false);
        return; // نوقف التنفيذ هنا لمنعه من رؤية الأسئلة
      }

      // 2. جلب تفاصيل الاختبار
      const { data: examData } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', examId)
        .single();

      if (examData) {
        setExam(examData);
        // تحويل المدة من دقائق إلى ثواني
        setTimeLeft((examData.duration_minutes || 30) * 60);
      }

      // 3. جلب الأسئلة
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: true });

      setQuestions(questionsData || []);

    } catch (error) {
      console.error("Error fetching exam:", error);
    } finally {
      setLoading(false);
    }
  }, [examId, user]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  // مؤقت الاختبار (Timer) - تم تصميمه ليكون آمناً ولا يسبب تسريع الشاشة
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || hasAttempted || finalScore !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // تسليم تلقائي عند انتهاء الوقت
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, hasAttempted, finalScore]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || !user) return;
    setIsSubmitting(true);

    try {
      // 1. حساب الدرجة محلياً (ويمكن نقلها للسيرفر لاحقاً للأمان)
      let correctAnswers = 0;
      let totalMarks = 0;
      let earnedMarks = 0;

      questions.forEach(q => {
        const mark = q.marks || 1;
        totalMarks += mark;
        if (answers[q.id] === q.correct_answer) {
          correctAnswers++;
          earnedMarks += mark;
        }
      });

      const percentageScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

      // 2. حفظ النتيجة في قاعدة البيانات
      const { error } = await supabase.from('exam_attempts').insert([
        {
          exam_id: examId,
          student_id: user.id,
          score: percentageScore,
          answers: answers // حفظ إجابات الطالب للرجوع إليها
        }
      ]);

      if (error) throw error;

      // 3. عرض النتيجة للطالب
      setFinalScore(percentageScore);
      setHasAttempted(true);

    } catch (error) {
      console.error("Submit error:", error);
      alert("حدث خطأ أثناء تسليم الاختبار. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
      </div>
    );
  }

  // --- الشاشة 1: الطالب امتحن سابقاً أو للتو أنهى الاختبار ---
  if (hasAttempted && finalScore !== null) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl p-10 text-center border border-slate-100">
          <div className="h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
            <Award className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">تم تسجيل نتيجتك</h1>
          <p className="text-slate-500 font-medium mb-8">لقد قمت بتقديم هذا الاختبار بالفعل.</p>
          
          <div className="bg-slate-50 rounded-3xl p-8 max-w-sm mx-auto mb-8 border border-slate-100">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">درجتك النهائية</p>
            <p className={`text-6xl font-black ${finalScore >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
              {finalScore}%
            </p>
          </div>

          <button onClick={() => router.push('/dashboard/student')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
            العودة للوحة التحكم
          </button>
        </motion.div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return <div className="text-center py-20 text-slate-500 font-bold" dir="rtl">الاختبار غير متاح أو لا يحتوي على أسئلة.</div>;
  }

  const q = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  // --- الشاشة 2: واجهة تقديم الاختبار ---
  return (
    <div className="max-w-4xl mx-auto py-8 px-4" dir="rtl">
      
      {/* Exam Header & Timer */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{exam.title}</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">{exam.subject?.name}</p>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-lg ${
          (timeLeft || 0) < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-700'
        }`}>
          <Clock className="h-6 w-6" />
          <span dir="ltr">{formatTime(timeLeft || 0)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-xs font-black text-slate-400 uppercase">
          <span>سؤال {currentQuestion + 1} من {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 20, opacity: 0 }}
          className="bg-white rounded-[40px] shadow-xl border border-slate-50 p-8 md:p-12 mb-8"
        >
          <div className="flex items-start gap-4 mb-8">
            <div className="h-10 w-10 shrink-0 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
              {currentQuestion + 1}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-relaxed mt-1">
              {q.question_text}
            </h2>
          </div>

          <div className="space-y-4 pr-14">
            {/* نفترض أن الخيارات محفوظة كمصفوفة في JSONB */}
            {Array.isArray(q.options) && q.options.map((option: string, idx: number) => (
              <label 
                key={idx}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  answers[q.id] === option 
                    ? 'border-indigo-600 bg-indigo-50/50' 
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  answers[q.id] === option ? 'border-indigo-600' : 'border-slate-300'
                }`}>
                  {answers[q.id] === option && <div className="h-3 w-3 bg-indigo-600 rounded-full" />}
                </div>
                <span className={`font-medium ${answers[q.id] === option ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
          disabled={currentQuestion === 0}
          className="px-6 py-4 flex items-center gap-2 font-bold text-slate-500 hover:bg-white rounded-2xl transition-all disabled:opacity-50"
        >
          <ChevronRight className="h-5 w-5" /> السابق
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length < questions.length}
            className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? 'جاري التسليم...' : 'إنهاء وتسليم'} <CheckCircle2 className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(p => Math.min(questions.length - 1, p + 1))}
            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
          >
            التالي <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}


