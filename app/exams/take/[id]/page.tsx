'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, ChevronRight, Send, 
  CheckCircle2, Timer, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { Question } from '@/types/question';
import Image from 'next/image';

export default function TakeQuiz() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamForStudent, submitExam } = useExamsSystem();
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetchExamForStudent(params.id as string);
      setExam(res.exam);
      setQuestions(res.questions);
      if (res.exam.duration) setTimeLeft(res.exam.duration * 60);
    } catch (err) {
      router.push('/exams');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, fetchExamForStudent]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let totalScore = 0;
      const formattedAnswers: Record<string, any> = {};
      for (const q of questions) {
        const studentAnswer = answers[q.id];
        let isCorrect = false;
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
          isCorrect = studentAnswer === q.options.find(o => o.is_correct)?.id;
        } else if (q.type === 'multi_select') {
          const correctOpts = q.options.filter(o => o.is_correct).map(o => o.id);
          const studentOpts = (studentAnswer as string[]) || [];
          isCorrect = correctOpts.length === studentOpts.length && correctOpts.every(id => studentOpts.includes(id));
        }
        totalScore += isCorrect ? q.points : 0;
        formattedAnswers[q.id] = { optionId: (q.type !== 'multi_select' && q.type !== 'essay') ? studentAnswer : null, text: q.type === 'multi_select' ? JSON.stringify(studentAnswer) : studentAnswer, isCorrect, pointsEarned: isCorrect ? q.points : 0 };
      }
      const timeSpent = exam?.duration ? (exam.duration * 60) - (timeLeft || 0) : 0;
      await submitExam(params.id as string, formattedAnswers, totalScore, 'completed', timeSpent);
      setIsFinished(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, params.id, submitExam, exam, timeLeft]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      timerRef.current = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    } else if (timeLeft === 0 && !isFinished) handleSubmit();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished, handleSubmit]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-12 w-12 border-t-4 border-indigo-600 rounded-full"></div></div>;

  if (isFinished) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center space-y-8">
        <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto" />
        <h2 className="text-3xl font-black text-slate-900">تم الإرسال بنجاح!</h2>
        <button onClick={() => router.push('/exams')} className="w-full bg-indigo-600 text-white py-5 rounded-[20px] font-black">العودة للرئيسية</button>
      </motion.div>
    </div>
  );

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <div><h1 className="text-xl font-black text-slate-900">{exam?.title}</h1><p className="text-xs text-slate-400 font-black">سؤال {currentQuestionIdx + 1} من {questions.length}</p></div>
          </div>
          {timeLeft !== null && <div className={cn("px-6 py-3 rounded-2xl border-2 font-black transition-all", timeLeft < 60 ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-slate-50 border-slate-100 text-slate-700")}><Timer className="h-5 w-5 inline mr-2" />{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100"><motion.div className="h-full bg-indigo-600" animate={{ width: `${progress}%` }} /></div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion?.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
            {currentQuestion?.media_url && (
              <div className="relative w-full aspect-video rounded-[40px] overflow-hidden border-4 border-white shadow-2xl bg-slate-100">
                <Image src={currentQuestion.media_url} alt="Question" fill className="object-contain" unoptimized />
              </div>
            )}
            <h2 className="text-3xl font-black text-slate-900">{currentQuestion?.content}</h2>
            <div className="space-y-4">
              {currentQuestion.options.map((option) => {
                const isSelected = Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]).includes(option.id) : answers[currentQuestion.id] === option.id;
                return (
                  <button key={option.id} onClick={() => currentQuestion.type === 'multi_select' ? setAnswers({ ...answers, [currentQuestion.id]: isSelected ? ((answers[currentQuestion.id] as string[]) || []).filter(id => id !== option.id) : [...((answers[currentQuestion.id] as string[]) || []), option.id] }) : setAnswers({ ...answers, [currentQuestion.id]: option.id })} className={cn("w-full flex items-center gap-6 p-6 rounded-[28px] border-2 text-right transition-all", isSelected ? "bg-indigo-50 border-indigo-600 shadow-xl" : "bg-white border-slate-100")}>
                    <div className={cn("h-8 w-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-indigo-600 text-white" : "border-slate-200")}><CheckCircle2 className="h-5 w-5" /></div>
                    <span className="text-xl font-bold text-slate-700">{option.content}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="bg-white border-t border-slate-200 p-6 sticky bottom-0 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => prev - 1)} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-500 disabled:opacity-30"><ChevronRight className="h-5 w-5" /> السابق</button>
          {currentQuestionIdx === questions.length - 1 ? <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-[20px] font-black disabled:opacity-50">{isSubmitting ? "جاري الإرسال..." : "تسليم الاختبار"}</button> : <button onClick={() => setCurrentQuestionIdx(prev => prev + 1)} className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-[20px] font-black transition-all">التالي <ChevronLeft className="h-5 w-5" /></button>}
        </div>
      </footer>
    </div>
  );
}

