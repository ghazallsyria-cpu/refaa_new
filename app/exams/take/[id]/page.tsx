'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, ChevronRight, Send, 
  CheckCircle2, Timer, BookOpen, AlertTriangle, ShieldAlert, AlignRight, CheckSquare, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
import { Question } from '@/types/question';
import Image from 'next/image';

export default function TakeQuiz() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { fetchExamForStudent, submitExam } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const storageKey = `exam_progress_${params.id}_${user?.id || 'guest'}`;

  const shuffleArray = (array: any[]) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetchExamForStudent(params.id as string);
      
      setExam(res.exam);
      let loadedQuestions = res.questions || [];

      if (res.exam?.settings?.shuffle_questions) {
        loadedQuestions = shuffleArray(loadedQuestions);
      }
      
      if (res.exam?.settings?.shuffle_options) {
        loadedQuestions = loadedQuestions.map(q => ({
          ...q,
          options: q.options ? shuffleArray(q.options) : []
        }));
      }

      setQuestions(loadedQuestions);

      if (typeof window !== 'undefined' && user?.id) {
        const savedDataStr = localStorage.getItem(storageKey);
        
        if (savedDataStr) {
          const savedData = JSON.parse(savedDataStr);
          
          if (savedData.answers) {
            setAnswers(savedData.answers);
          }

          if (savedData.targetEndTime && res.exam?.duration) {
            const now = Date.now();
            const remainingSeconds = Math.floor((savedData.targetEndTime - now) / 1000);
            
            if (remainingSeconds <= 0) {
              setTimeLeft(0);
            } else {
              setTimeLeft(remainingSeconds);
            }
          } else if (res.exam?.duration) {
             setTimeLeft(res.exam.duration * 60);
          }

        } else if (res.exam?.duration) {
          setTimeLeft(res.exam.duration * 60);
          const targetEndTime = Date.now() + (res.exam.duration * 60 * 1000);
          localStorage.setItem(storageKey, JSON.stringify({ answers: {}, targetEndTime }));
        }
      }

    } catch (err) {
      console.error(err);
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, fetchExamForStudent, storageKey, user?.id]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id && !isFinished && exam) {
      const existingDataStr = localStorage.getItem(storageKey);
      let targetEndTime = null;
      
      if (existingDataStr) {
        const existingData = JSON.parse(existingDataStr);
        targetEndTime = existingData.targetEndTime;
      } else if (exam.duration) {
         targetEndTime = Date.now() + (exam.duration * 60 * 1000);
      }

      localStorage.setItem(storageKey, JSON.stringify({
        answers,
        targetEndTime
      }));
    }
  }, [answers, storageKey, user?.id, isFinished, exam]);

  useEffect(() => {
    if (!exam?.settings?.browser_lock || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarning('تحذير: لقد قمت بتبديل نافذة المتصفح! هذا الإجراء مسجل ويعتبر مخالفة لتعليمات الاختبار.');
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [exam, isFinished]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let totalScore = 0;
      const formattedAnswers: Record<string, any> = {};

      for (const q of questions) {
        const studentAnswer = answers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;

        if (q.type === 'essay') {
          isCorrect = false;
          pointsEarned = 0;
        } else if (q.type === 'multi_select') {
          const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => o.id);
          const studentOpts = (studentAnswer as string[]) || [];
          isCorrect = correctOpts.length > 0 && correctOpts.length === studentOpts.length && correctOpts.every(id => studentOpts.includes(id));
          pointsEarned = isCorrect ? q.points : 0;
        } else {
          const correctOpt = (q.options || []).find(o => o.is_correct);
          isCorrect = !!correctOpt && studentAnswer === correctOpt.id;
          pointsEarned = isCorrect ? q.points : 0;
        }

        totalScore += pointsEarned;

        formattedAnswers[q.id] = { 
          optionId: (q.type === 'multiple_choice' || q.type === 'true_false') ? (studentAnswer || null) : null, 
          text: q.type === 'essay' ? (studentAnswer || '') : (q.type === 'multi_select' ? JSON.stringify(studentAnswer || []) : null), 
          isCorrect, 
          pointsEarned 
        };
      }

      const timeSpent = exam?.duration ? (exam.duration * 60) - (timeLeft || 0) : 0;
      
      await submitExam(params.id as string, formattedAnswers, totalScore, 'completed', timeSpent);
      
      if (typeof window !== 'undefined') {
         localStorage.removeItem(storageKey);
      }

      setIsFinished(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الإجابات، سيقوم النظام بالاحتفاظ بإجاباتك، يرجى تحديث الصفحة والمحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, params.id, submitExam, exam, timeLeft, storageKey]);

  useEffect(() => {
    if (timeLeft === null || isFinished) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished, handleSubmit]);

  const handleMultiSelect = (qId: string, optionId: string) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[qId]) ? prev[qId] : [];
      if (current.includes(optionId)) {
        return { ...prev, [qId]: current.filter((id: string) => id !== optionId) };
      }
      return { ...prev, [qId]: [...current, optionId] };
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  if (isFinished) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center space-y-8">
        <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">تم تسليم الاختبار!</h2>
          <p className="text-slate-500 font-bold">تم حفظ إجاباتك بنجاح في النظام.</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
          العودة للوحة القيادة
        </button>
      </motion.div>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
      <AlertTriangle className="h-16 w-16 text-amber-500" />
      <h2 className="text-2xl font-black">عذراً، لا توجد أسئلة في هذا الاختبار.</h2>
      <button onClick={() => router.back()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">العودة</button>
    </div>
  );

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const allowBacktrack = exam?.settings?.allow_backtrack !== false;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" dir="rtl">
      
      <AnimatePresence>
        {warning && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-500 text-white px-6 py-3 flex items-center justify-between z-50">
            <div className="flex items-center gap-3 font-bold"><ShieldAlert className="h-5 w-5" /> {warning}</div>
            <button onClick={() => setWarning(null)} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none mb-1">{exam?.title}</h1>
              <p className="text-xs text-slate-400 font-black tracking-widest uppercase">سؤال {currentQuestionIdx + 1} من {questions.length}</p>
            </div>
          </div>
          
          {timeLeft !== null && (
            <div className={cn("px-6 py-3 rounded-2xl border-2 font-black transition-all flex items-center gap-2 shadow-inner", 
              timeLeft < 60 ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-slate-50 border-slate-200 text-slate-700"
            )}>
              <Timer className="h-5 w-5" />
              <span className="text-lg tracking-widest font-mono" dir="ltr">
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
          <motion.div className="h-full bg-indigo-600 rounded-r-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-10">
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest">
                  {currentQuestion.type === 'multiple_choice' ? 'اختيار من متعدد' : currentQuestion.type === 'multi_select' ? 'اختيار متعدد' : currentQuestion.type === 'true_false' ? 'صح أم خطأ' : 'سؤال مقالي'}
                </span>
                <span className="text-sm font-black text-slate-400">{currentQuestion.points} نقاط</span>
              </div>
              
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentQuestion.content}</h2>
              
              {currentQuestion.media_url && typeof currentQuestion.media_url === 'string' && currentQuestion.media_url.trim() !== '' && (
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100">
                  <Image src={currentQuestion.media_url} alt="Question Context" fill className="object-contain" unoptimized />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {currentQuestion.type === 'essay' ? (
                <div className="relative group">
                  <AlignRight className="absolute right-6 top-6 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    placeholder="اكتب إجابتك المقالية هنا بوضوح وتفصيل..."
                    className="w-full min-h-[250px] p-6 pr-14 rounded-[32px] border-2 border-slate-200 bg-white text-lg font-bold text-slate-700 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all resize-y shadow-sm"
                  />
                </div>
              ) : (
                (currentQuestion.options || []).map((option) => {
                  const isMulti = currentQuestion.type === 'multi_select';
                  const isSelected = isMulti 
                    ? (answers[currentQuestion.id] as string[] || []).includes(option.id) 
                    : answers[currentQuestion.id] === option.id;

                  return (
                    <button 
                      key={option.id} 
                      onClick={() => isMulti ? handleMultiSelect(currentQuestion.id, option.id) : setAnswers({ ...answers, [currentQuestion.id]: option.id })} 
                      className={cn(
                        "w-full flex items-center gap-6 p-6 rounded-[28px] border-2 text-right transition-all duration-300 outline-none group focus:ring-4 focus:ring-indigo-600/20", 
                        isSelected ? "bg-indigo-50 border-indigo-600 shadow-lg shadow-indigo-100/50" : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300", 
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-slate-50 group-hover:border-indigo-300",
                        isMulti ? "rounded-md" : "rounded-full"
                      )}>
                        {isMulti ? <CheckSquare className={cn("h-5 w-5 transition-transform", isSelected ? "scale-100" : "scale-0")} /> : <CheckCircle2 className={cn("h-5 w-5 transition-transform", isSelected ? "scale-100" : "scale-0")} />}
                      </div>
                      <span className={cn("text-xl font-bold transition-colors", isSelected ? "text-indigo-900" : "text-slate-700")}>
                        {option.content}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 p-6 sticky bottom-0 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          
          <div className="w-full sm:w-auto">
            {allowBacktrack && currentQuestionIdx > 0 && (
              <button 
                onClick={() => setCurrentQuestionIdx(prev => prev - 1)} 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200"
              >
                <ChevronRight className="h-5 w-5" /> السؤال السابق
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden md:inline-block">
               تمت الإجابة: {Object.keys(answers).length} / {questions.length}
             </span>

            {currentQuestionIdx === questions.length - 1 ? (
              <button 
                onClick={() => {
                  if (Object.keys(answers).length < questions.length) {
                     if(!window.confirm('هناك أسئلة لم تقم بالإجابة عليها. هل أنت متأكد من رغبتك في تسليم الاختبار؟')) return;
                  }
                  handleSubmit();
                }} 
                disabled={isSubmitting} 
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-[20px] font-black disabled:opacity-50 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                {isSubmitting ? "جاري الإرسال..." : "تسليم الاختبار النهائي"}
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button 
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)} 
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-[20px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                السؤال التالي <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>
          
        </div>
      </footer>
    </div>
  );
}


