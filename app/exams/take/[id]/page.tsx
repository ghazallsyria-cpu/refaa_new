'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Award, AlertTriangle, ShieldAlert, XCircle, CalendarX2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// دالة لخلط المصفوفة (عشوائية الأسئلة)
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = params?.id as string;

  // الحالات المتعددة للشاشة
  const [status, setStatus] = useState<'loading' | 'not_started' | 'expired' | 'taking' | 'submitted' | 'already_taken' | 'cheating_detected' | 'error'>('loading');
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExamData = useCallback(async () => {
    if (!user?.id || !examId) return;

    try {
      setStatus('loading');

      // 1. التحقق من المحاولات السابقة
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

      // 2. جلب بيانات الاختبار والإعدادات
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, subject:subjects(name)')
        .eq('id', examId)
        .single();

      if (examError || !examData) throw new Error('Exam not found');

      // === تطبيق إعدادات المعلم ===

      // أ) التحقق من أوقات الإتاحة
      const now = new Date();
      if (examData.start_time && new Date(examData.start_time) > now) {
        setExam(examData);
        setStatus('not_started');
        return;
      }
      
      if (examData.end_time && new Date(examData.end_time) < now) {
        setExam(examData);
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
        throw new Error('No questions');
      }

      // ب) تطبيق إعداد العشوائية (Randomize)
      let finalQuestions = questionsData;
      if (examData.randomize_questions) {
        finalQuestions = shuffleArray(questionsData);
      }

      // تجهيز الخيارات (التأكد من أنها مصفوفة) وتطبيق عشوائية الخيارات إن وجدت
      const safeQuestions = finalQuestions.map(q => {
        let parsedOptions = [];
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch (e) { parsedOptions = []; }
        
        let optionsArray = Array.isArray(parsedOptions) ? parsedOptions : [];
        // خلط الخيارات إذا كان المعلم قد حدد ذلك
        if (examData.randomize_questions) {
            optionsArray = shuffleArray(optionsArray);
        }

        return { ...q, options: optionsArray };
      });

      setExam(examData);
      setQuestions(safeQuestions);
      setTimeLeft((examData.duration_minutes || 30) * 60);
      setStatus('taking');

    } catch (error) {
      console.error("Error fetching exam:", error);
      setStatus('error');
    }
  }, [examId, user]);

  useEffect(() => { fetchExamData(); }, [fetchExamData]);

  // === ج) تطبيق الوضع الصارم (Strict Mode) - مكافحة الغش ===
  useEffect(() => {
    if (status !== 'taking' || !exam?.strict_mode) return;

    // منع النسخ والنقر بزر الماوس الأيمن
    const preventCopy = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', preventCopy);
    document.addEventListener('copy', preventCopy);

    // اكتشاف خروج الطالب من الشاشة (تبديل التبويبات)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus('cheating_detected');
        // إرسال الاختبار فوراً بسبب الغش
        handleSubmit(true); 
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('contextmenu', preventCopy);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, exam]);

  // المؤقت الزمني
  useEffect(() => {
    if (status !== 'taking' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(false, true); // تسليم تلقائي لانتهاء الوقت
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async (isCheating = false, isTimeout = false) => {
    if (isSubmitting || status === 'submitted' || status === 'already_taken') return;
    setIsSubmitting(true);

    try {
      let earnedMarks = 0;
      let totalMarks = 0;

      questions.forEach(q => {
        const mark = q.marks || 1;
        totalMarks += mark;
        if (answers[q.id] === q.correct_answer) {
          earnedMarks += mark;
        }
      });

      // إذا كان غش، يمكننا تصفير درجته أو خصم نقاط (هنا نحسب ما أجابه فقط حتى لحظة الغش)
      let percentageScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
      
      if (isCheating) {
         // كعقاب، نخصم منه 50% من الدرجة أو نترك درجته كما هي مع علامة
         // في هذا المثال سنترك الدرجة كما هي ونكتفي بالإنهاء القسري
      }

      await supabase.from('exam_attempts').insert([{
        exam_id: examId,
        student_id: user!.id,
        score: percentageScore,
        answers: answers
      }]);

      setFinalScore(percentageScore);
      if (!isCheating) setStatus('submitted');

    } catch (error) {
      console.error("Submit error:", error);
      if (!isCheating && !isTimeout) {
         alert("حدث خطأ أثناء الإرسال. تأكد من اتصالك بالإنترنت.");
         setStatus('taking');
      }
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
  // الشاشات الخاصة بالإعدادات والحماية
  // ---------------------------------------------------------

  if (status === 'loading') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-r-4 border-transparent"></div>
    </div>
  );

  if (status === 'not_started') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <div className="h-24 w-24 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-6"><Clock size={40} /></div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">الاختبار لم يبدأ بعد</h2>
      <p className="text-slate-500 font-bold mb-6 text-lg">
        تاريخ ووقت البدء المبرمج: <br/>
        <span className="text-indigo-600" dir="ltr">{new Date(exam?.start_time).toLocaleString('ar-SA')}</span>
      </p>
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">العودة للوحة التحكم</button>
    </div>
  );

  if (status === 'expired') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <div className="h-24 w-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6"><CalendarX2 size={40} /></div>
      <h2 className="text-3xl font-black text-slate-900 mb-4">انتهى وقت الاختبار</h2>
      <p className="text-slate-500 font-bold mb-6 text-lg">عذراً، لقد انتهت صلاحية هذا الاختبار ولم يعد متاحاً للتقديم.</p>
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">العودة للرئيسية</button>
    </div>
  );

  if (status === 'cheating_detected') return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center" dir="rtl">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-red-50 rounded-[40px] p-12 border-2 border-red-200">
        <ShieldAlert className="h-24 w-24 text-red-600 mx-auto mb-6 animate-pulse" />
        <h1 className="text-3xl font-black text-red-700 mb-4">تم اكتشاف محاولة غش!</h1>
        <p className="text-red-600/80 font-bold mb-8 leading-relaxed text-lg">
          لقد قمت بمغادرة شاشة الاختبار أو محاولة تبديل التبويبات.<br/>الوضع الصارم مفعّل في هذا الاختبار، لذلك تم سحب ورقتك وإنهاء الاختبار قسرياً.
        </p>
        <button onClick={() => router.push('/dashboard/student')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-red-700">مغادرة القاعة</button>
      </motion.div>
    </div>
  );

  if (status === 'error') return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4" dir="rtl">
      <AlertTriangle className="h-20 w-20 text-slate-300 mb-6" />
      <h2 className="text-2xl font-black text-slate-900 mb-2">عذراً، حدث خطأ!</h2>
      <button onClick={() => router.push('/dashboard/student')} className="px-8 py-3 mt-4 bg-indigo-600 text-white rounded-xl font-bold">العودة للرئيسية</button>
    </div>
  );

  if (status === 'submitted' || status === 'already_taken') {
    // د) تطبيق درجة النجاح المحددة من المعلم (الافتراضي 50)
    const passingScore = exam?.passing_score || 50;
    const isPassed = finalScore >= passingScore;

    return (
      <div className="max-w-2xl mx-auto py-16 px-4" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-12 text-center">
          <div className={`h-28 w-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ${isPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {isPassed ? <Award className="h-14 w-14" /> : <XCircle className="h-14 w-14" />}
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            {status === 'already_taken' ? 'تم تقديم الاختبار مسبقاً' : 'تم تسليم الاختبار بنجاح!'}
          </h1>
          
          <p className="text-slate-500 font-bold mb-10">
            {isPassed ? 'تهانينا، لقد اجتزت الاختبار بنجاح!' : 'حظاً أوفر في المرات القادمة.'}
            <br />
            <span className="text-xs text-slate-400 mt-2 block">(درجة النجاح المطلوبة: {passingScore}%)</span>
          </p>
          
          <div className={`rounded-[30px] p-8 mb-10 border-2 ${isPassed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">النتيجة النهائية</p>
            <p className={`text-7xl font-black ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
              {finalScore}%
            </p>
          </div>

          <button onClick={() => router.push('/dashboard/student')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all active:scale-95 text-lg">
            العودة للوحة التحكم
          </button>
        </motion.div>
      </div>
    );
  }

  // --- واجهة تقديم الاختبار ---
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
            {exam?.strict_mode && (
              <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-100">
                <Lock size={12} /> وضع صارم
              </span>
            )}
          </div>
          <p className="text-slate-500 font-bold text-sm mt-1">{exam?.subject?.name}</p>
        </div>
        
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xl border shadow-inner ${
          timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'
        }`}>
          <Clock className="h-6 w-6" />
          <span dir="ltr">{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
        <div className="flex justify-between text-xs font-black text-slate-400 uppercase mb-4">
          <span>السؤال {currentQIndex + 1} من {questions.length}</span>
          <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">تمت الإجابة: {answeredCount}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 rounded-full"
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {q && (
        <div className="bg-white rounded-[40px] shadow-xl border border-slate-50 p-8 md:p-12 mb-8 min-h-[400px] flex flex-col relative overflow-hidden">
          {/* Decorative watermark */}
          <div className="absolute -left-10 -bottom-10 text-[150px] font-black text-slate-50/50 pointer-events-none select-none">
            {currentQIndex + 1}
          </div>

          <div className="flex items-start gap-5 mb-10 relative z-10">
            <div className="h-12 w-12 shrink-0 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100">
              {currentQIndex + 1}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-relaxed mt-2 select-none">
              {q.question_text}
            </h2>
          </div>

          <div className="space-y-4 flex-1 relative z-10">
            {q.options && q.options.length > 0 ? (
              q.options.map((option: string, idx: number) => (
                <label 
                  key={idx}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                    answers[q.id] === option 
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-md scale-[1.01]' 
                      : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name={`q-${q.id}`} 
                    className="hidden" 
                    onChange={() => handleAnswerSelect(q.id, option)}
                  />
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${
                    answers[q.id] === option ? 'border-indigo-600 bg-white' : 'border-slate-300 bg-white'
                  }`}>
                    {answers[q.id] === option && <div className="h-3 w-3 bg-indigo-600 rounded-full" />}
                  </div>
                  <span className={`font-bold text-lg ${answers[q.id] === option ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {option}
                  </span>
                </label>
              ))
            ) : <p className="text-slate-400 font-bold">لا توجد خيارات.</p>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[30px] border border-slate-100 shadow-sm">
        <button
          onClick={() => setCurrentQIndex(p => Math.max(0, p - 1))}
          disabled={currentQIndex === 0}
          className="px-6 py-4 flex items-center gap-2 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" /> السابق
        </button>

        {isLastQuestion ? (
          <button
            onClick={() => handleSubmit(false, false)}
            disabled={answeredCount < questions.length || isSubmitting}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSubmitting ? 'جاري التسليم...' : 'إنهاء وتسليم'} <CheckCircle2 className="h-6 w-6" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentQIndex(p => Math.min(questions.length - 1, p + 1))}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95"
          >
            التالي <ChevronLeft className="h-6 w-6" />
          </button>
        )}
      </div>
      
    </div>
  );
}


