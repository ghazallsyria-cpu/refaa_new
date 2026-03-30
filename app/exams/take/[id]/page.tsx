'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle2, Timer, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { Question } from '@/types/question';

type Exam = { id: string; title: string; description: string; duration: number; exam_date: string; start_time: string; end_time: string; settings: any; };

export default function TakeQuiz() {
  const params = useParams();
  const router = useRouter();
  const { fetchExamForStudent, submitExam } = useExamsSystem();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuiz = useCallback(async () => {
    try {
      const { exam: examData, questions: questionsData } = await fetchExamForStudent(params.id as string);
      
      const now = new Date();
      const examDate = new Date(examData.exam_date);
      const startTimeParts = (examData.start_time || '00:00').split(':');
      const endTimeParts = (examData.end_time || '23:59').split(':');
      
      const startDateTime = new Date(examDate);
      startDateTime.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0);
      const endDateTime = new Date(examDate);
      endDateTime.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
      
      if (now < startDateTime) {
        showNotification('error', `الاختبار يبدأ في ${examData.start_time} بتاريخ ${examData.exam_date}`);
        setTimeout(() => router.push('/exams'), 3000);
        return;
      }
      
      if (now > endDateTime) {
        showNotification('error', 'انتهى الوقت المخصص لهذا الاختبار.');
        setTimeout(() => router.push('/exams'), 3000);
        return;
      }

      setExam({ ...examData, description: examData.description ?? "", settings: {} });
      setQuestions(questionsData || []);

      if (examData.duration) {
        const finalTimeLeft = Math.min(examData.duration * 60, Math.floor((endDateTime.getTime() - now.getTime()) / 1000));
        setTimeLeft(finalTimeLeft > 0 ? finalTimeLeft : 0);
      }
    } catch (err) {
      showNotification('error', 'حدث خطأ أثناء تحميل الاختبار');
      setTimeout(() => router.push('/exams'), 3000);
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
      let requiresManualGrading = false; // 🔍 البحث عن أسئلة مقالية

      for (const q of questions) {
        const studentAnswer = answers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;

        if (q.type === 'essay' || q.type === 'fill_in_blank' || q.type === 'open' || q.type === 'paragraph') {
           requiresManualGrading = true; // وجدنا سؤال مقالي
        } else if (q.type === 'multiple_choice' || q.type === 'true_false') {
          const correctOpt = q.options.find((o: any) => o.is_correct);
          isCorrect = studentAnswer === correctOpt?.id;
          pointsEarned = isCorrect ? (q.points || 0) : 0;
        } else if (q.type === 'multi_select') {
          const correctOpts = q.options.filter((o: any) => o.is_correct).map((o: any) => o.id);
          const studentOpts = studentAnswer || [];
          isCorrect = correctOpts.length === studentOpts.length && correctOpts.every((id: any) => studentOpts.includes(id));
          pointsEarned = isCorrect ? (q.points || 0) : 0;
        }

        totalScore += pointsEarned;

        formattedAnswers[q.id] = {
          optionId: (q.type === 'multiple_choice' || q.type === 'true_false') ? studentAnswer : null,
          text: (q.type === 'essay' || q.type === 'fill_in_blank') ? studentAnswer : q.type === 'multi_select' ? JSON.stringify(studentAnswer) : (typeof studentAnswer === 'string' ? studentAnswer : ""),
          isCorrect,
          pointsEarned
        };
      }

      const timeSpent = exam?.duration ? (exam.duration * 60) - (timeLeft || 0) : 0;
      // 💡 تحديد حالة الاختبار بناءً على نوع الأسئلة
      const attemptStatus = requiresManualGrading ? 'submitted' : 'graded';

      await submitExam(params.id as string, formattedAnswers, totalScore, attemptStatus, timeSpent);
      setIsFinished(true);
    } catch (err: any) {
      showNotification('error', err.message || 'حدث خطأ أثناء إرسال الاختبار');
      alert("الرجاء تصوير هذه الرسالة للمعلم:\n" + err.message); 
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, params.id, submitExam, exam, timeLeft]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished) {
      timerRef.current = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    } else if (timeLeft === 0 && !isFinished) {
      handleSubmit();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished, handleSubmit]);

  const handleAnswerChange = (questionId: string, value: any) => setAnswers(prev => ({ ...prev, [questionId]: value }));
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-12 w-12" /></div>
          <h2 className="text-2xl font-bold text-slate-900">تم إرسال الاختبار بنجاح!</h2>
          <p className="text-slate-600">شكراً لك. تم حفظ إجاباتك بنجاح في النظام.</p>
          <button onClick={() => router.push(`/exams`)} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">العودة للرئيسية</button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative" dir="rtl">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 font-bold max-w-sm w-full text-center ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800 border-2 border-red-200'}`}>
          <div className="flex-1">{notification.message}</div>
          <button onClick={() => setNotification(null)}><X className="h-5 w-5" /></button>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl"><BookOpen className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">{exam?.title}</h1>
              <p className="text-xs text-slate-500">سؤال {currentQuestionIdx + 1} من {questions.length}</p>
            </div>
          </div>
          {timeLeft !== null && (
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold transition-all", timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-700")}>
              <Timer className="h-4 w-4" /><span dir="ltr">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100"><motion.div className="h-full bg-indigo-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion?.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-wider">
                <span>سؤال {currentQuestionIdx + 1}</span><span className="w-1 h-1 rounded-full bg-slate-300" /><span>{currentQuestion?.points} نقاط</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">{currentQuestion?.content}</h2>
              {(currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl) && (
                <div className="relative w-full flex justify-center bg-slate-50 rounded-2xl border border-slate-100 p-2 mt-4">
                  <img src={currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl} alt="صورة السؤال" className="max-h-[350px] w-auto object-contain rounded-xl shadow-sm" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(currentQuestion?.type === 'multiple_choice' || currentQuestion?.type === 'true_false') && currentQuestion.options.map((option) => (
                <button key={option.id} onClick={() => handleAnswerChange(currentQuestion.id, option.id)} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all group", answers[currentQuestion.id] === option.id ? "bg-indigo-50 border-indigo-600 text-indigo-900" : "bg-white border-slate-100 hover:border-slate-300")}>
                  <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0", answers[currentQuestion.id] === option.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200")}><CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-100" /></div>
                  <span className="text-lg font-medium">{option.content}</span>
                </button>
              ))}

              {currentQuestion?.type === 'multi_select' && currentQuestion.options.map((option) => {
                const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                return (
                  <button key={option.id} onClick={() => {
                    const current = answers[currentQuestion.id] || [];
                    handleAnswerChange(currentQuestion.id, isSelected ? current.filter((id: string) => id !== option.id) : [...current, option.id]);
                  }} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all", isSelected ? "bg-indigo-50 border-indigo-600" : "bg-white border-slate-100")}>
                    <div className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200")}><CheckCircle2 className="h-4 w-4 opacity-0" /></div>
                    <span className="text-lg font-medium">{option.content}</span>
                  </button>
                );
              })}

              {(currentQuestion?.type === 'essay' || currentQuestion?.type === 'open' || currentQuestion?.type === 'paragraph') && (
                <textarea value={answers[currentQuestion.id] || ''} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} placeholder="اكتب إجابتك هنا بالتفصيل..." className="w-full min-h-[200px] p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-lg leading-relaxed" />
              )}
              {currentQuestion?.type === 'fill_in_blank' && (
                <input type="text" value={answers[currentQuestion.id] || ''} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} placeholder="أدخل الكلمة المفقودة..." className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-lg font-bold text-center" />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => prev - 1)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronRight className="h-5 w-5" />السابق</button>
          {currentQuestionIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50"><Send className="h-5 w-5" />إرسال الاختبار</button>
          ) : (
            <button onClick={() => setCurrentQuestionIdx(prev => prev + 1)} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">التالي<ChevronLeft className="h-5 w-5" /></button>
          )}
        </div>
      </footer>
    </div>
  );
}


