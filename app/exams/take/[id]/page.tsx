'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle2, Timer, BookOpen, AlertTriangle, Lock, UploadCloud, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useExamsSystem } from '@/hooks/useExamsSystem';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload'; 

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

type Exam = { id: string; title: string; description: string; duration: number; exam_date: string; start_time: string; end_time: string; settings: any; max_attempts?: number; };

const isAutoGradedType = (type: string) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === 'multiple_choice' || t === 'true_false' || t === 'multi_select' || t === 'checkbox' || t === 'radio';
};

export default function TakeQuiz() {
  const params = useParams();
  const router = useRouter();
  const { user, userRole, authRole } = useAuth() as any; 
  const currentRole = authRole || userRole;
  const isPreviewMode = ['teacher', 'admin', 'management'].includes(currentRole);

  const { fetchExamForStudent } = useExamsSystem();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeTakenInfo, setTimeTakenInfo] = useState<number>(0);

  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showCheatModal, setShowCheatModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuiz = useCallback(async () => {
    if (!user) return;

    try {
      const actualUserId = user.id || user.user_id;
      let validStudentId = actualUserId;

      if (!isPreviewMode) {
          const { data: sProfile } = await supabase.from('students').select('id').eq('id', actualUserId).maybeSingle();
          if (sProfile) validStudentId = sProfile.id;
          setStudentProfileId(validStudentId);

          const { count } = await supabase.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_id', params.id).eq('student_id', validStudentId);
          const { exam: examData } = await fetchExamForStudent(params.id as string);
          const maxAttempts = examData.max_attempts || 1;

          if (count !== null && count >= maxAttempts) {
            setAlreadySubmitted(true);
            setLoading(false);
            return;
          }
      }

      const { exam: examData, questions: questionsData } = await fetchExamForStudent(params.id as string);
      
      const now = new Date();
      const examDate = new Date(examData.exam_date);
      const startTimeParts = (examData.start_time || '00:00').split(':');
      const endTimeParts = (examData.end_time || '23:59').split(':');
      
      const startDateTime = new Date(examDate);
      startDateTime.setHours(parseInt(startTimeParts[0] || '0'), parseInt(startTimeParts[1] || '0'), 0);
      const endDateTime = new Date(examDate);
      endDateTime.setHours(parseInt(endTimeParts[0] || '23'), parseInt(endTimeParts[1] || '59'), 0);
      
      if (!isPreviewMode && (now < startDateTime || now > endDateTime)) {
        alert("هذا الاختبار غير متاح في الوقت الحالي.");
        window.location.href = '/exams';
        return;
      }

      setExam({ ...examData, description: examData.description ?? "", settings: examData.settings || {} });
      
      // 🚀 الهوك mapQuestionsWithMedia قام بكل العمل! ننسخ الأسئلة مباشرة
      let finalQuestions = [...(questionsData || [])].map((q: any) => ({...q}));
      
      if (examData.settings?.shuffle_questions && !isPreviewMode) finalQuestions.sort(() => Math.random() - 0.5);
      if (examData.settings?.shuffle_options && !isPreviewMode) {
         finalQuestions = finalQuestions.map(q => {
            if (q.options && q.options.length > 0 && q.type !== 'true_false') return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
            return q;
         });
      }

      setQuestions(finalQuestions);

      if (examData.duration) {
        if (isPreviewMode) {
          setTimeLeft(examData.duration * 60); 
        } else {
          const finalTimeLeft = Math.min(examData.duration * 60, Math.floor((endDateTime.getTime() - now.getTime()) / 1000));
          setTimeLeft(finalTimeLeft > 0 ? finalTimeLeft : 0);
        }
      }

      setStartTime(Date.now());
    } catch (err) {
      alert("حدث خطأ في تحميل الاختبار.");
      window.location.href = '/exams';
    } finally {
      setLoading(false);
    }
  }, [params.id, fetchExamForStudent, user, isPreviewMode]);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !questions || questions.length === 0 || !user) return;
    
    if (isPreviewMode) {
       setIsFinished(true);
       setIsSubmitting(false);
       return;
    }

    setIsSubmitting(true);

    try {
      const calculatedTimeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      setTimeTakenInfo(calculatedTimeTaken);

      let totalScore = 0;
      const formattedAnswers: Record<string, any> = {};
      let hasManual = false; 

      for (const q of questions) {
        const studentAnswer = answers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;
        
        const qType = (q.type as string || '').toLowerCase();
        const isAuto = isAutoGradedType(qType);
        if (!isAuto) hasManual = true; 

        let optionIdToSend = null;
        let textToSend = null;

        if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== "") {
            if (isAuto) {
              if (Array.isArray(studentAnswer)) {
                  textToSend = JSON.stringify(studentAnswer);
                  const correctOpts = q.options?.filter((o: any) => o.is_correct).map((o: any) => String(o.id)) || [];
                  const studentOpts = studentAnswer.map(String);
                  isCorrect = correctOpts.length > 0 && correctOpts.length === studentOpts.length && correctOpts.every((id: string) => studentOpts.includes(id));
                  pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
              } else {
                  optionIdToSend = String(studentAnswer);
                  textToSend = String(studentAnswer); 
                  const correctOpt = q.options?.find((o: any) => o.is_correct);
                  isCorrect = String(studentAnswer) === String(correctOpt?.id);
                  pointsEarned = isCorrect ? (Number(q.points) || 0) : 0;
              }
            } else {
              textToSend = String(studentAnswer);
            }
        }

        totalScore += pointsEarned;
        formattedAnswers[q.id] = { optionId: optionIdToSend, text: textToSend, isCorrect, pointsEarned };
      }

      const attemptStatus = hasManual ? 'completed' : 'graded';

      const response = await fetch('/api/exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: params.id, answers: formattedAnswers, score: totalScore, status: attemptStatus, userId: studentProfileId || user.id || user.user_id, timeTaken: calculatedTimeTaken })
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "فشل في إرسال الإجابات إلى السيرفر");

      setIsFinished(true); 
    } catch (err: any) {
      alert("خطأ أثناء تسليم الاختبار: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, questions, answers, params.id, exam, user, startTime, isPreviewMode, studentProfileId]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished && !alreadySubmitted) timerRef.current = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    else if (timeLeft === 0 && !isFinished && !alreadySubmitted) handleSubmit();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, isFinished, alreadySubmitted, handleSubmit]);

  useEffect(() => {
    if (isFinished || loading || !exam || alreadySubmitted || !exam.settings?.prevent_tab_switch || isPreviewMode) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount === 1) setShowCheatModal(true);
          else if (newCount >= 2) handleSubmit();
          return newCount;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFinished, loading, exam, alreadySubmitted, handleSubmit, isPreviewMode]);

  useEffect(() => {
    if (!exam?.settings?.prevent_copy || isPreviewMode) return;
    const preventCopyPaste = (e: Event) => e.preventDefault();
    const preventPrint = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'p') e.preventDefault(); };
    document.addEventListener('copy', preventCopyPaste); document.addEventListener('cut', preventCopyPaste); document.addEventListener('contextmenu', preventCopyPaste); document.addEventListener('keydown', preventPrint);
    return () => { document.removeEventListener('copy', preventCopyPaste); document.removeEventListener('cut', preventCopyPaste); document.removeEventListener('contextmenu', preventCopyPaste); document.removeEventListener('keydown', preventPrint); };
  }, [exam?.settings?.prevent_copy, isPreviewMode]);

  const handleAnswerChange = (questionId: string, value: any) => setAnswers(prev => ({ ...prev, [questionId]: value }));
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div></div>;

  if (alreadySubmitted) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6 border-t-4 border-indigo-600">
          <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-600"><Lock className="h-12 w-12" /></div>
          <h2 className="text-2xl font-black text-slate-900">لقد قمت بتقديم هذا الاختبار مسبقاً</h2>
          <p className="text-slate-600 font-medium">لقد استنفدت الحد الأقصى للمحاولات المسموحة.</p>
          <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md">العودة لقائمة الاختبارات</button>
        </motion.div>
      </div>
    );

  if (!questions || questions.length === 0) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6 border-t-4 border-amber-500">
          <div className="inline-flex p-4 rounded-full bg-amber-50 text-amber-500"><AlertCircle className="h-12 w-12" /></div>
          <h2 className="text-2xl font-bold text-slate-900">الاختبار غير مكتمل</h2>
          <p className="text-slate-600 font-medium">عذراً، هذا الاختبار لا يحتوي على أي أسئلة مضافة حتى الآن.</p>
          <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-4 bg-slate-800 text-white py-3 rounded-xl font-bold">العودة للرئيسية</button>
        </motion.div>
      </div>
    );

  const hasManualQuestions = questions.some(q => !isAutoGradedType(q.type as string));

  if (isFinished) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6 border-t-4 border-emerald-500">
          <div className="inline-flex p-4 rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-12 w-12" /></div>
          <h2 className="text-2xl font-bold text-slate-900">تم إرسال الاختبار بنجاح!</h2>
          <p className="text-slate-600 font-medium">
             {isPreviewMode ? "لقد أنهيت المعاينة بنجاح (لم يتم حفظ أي إجابات)." : "لقد استلمنا إجاباتك وتم تسجيلها في قاعدة البيانات."}
             {!isPreviewMode && hasManualQuestions && <span className="block mt-4 text-amber-700 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">ستظهر نتيجتك النهائية بعد تصحيح المعلم وانتهاء الوقت.</span>}
             {!isPreviewMode && !hasManualQuestions && <span className="block mt-4 text-emerald-700 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-100">تم تصحيح الاختبار، ستظهر نتيجتك بعد انتهاء وقت الاختبار.</span>}
          </p>
          {timeTakenInfo > 0 && !isPreviewMode && (
            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-3 rounded-2xl font-bold mt-2 border border-slate-200">
               <Clock className="w-5 h-5 text-slate-400" /><span>أنهيت الاختبار في: <span dir="ltr">{formatTime(timeTakenInfo)}</span></span>
            </div>
          )}
          <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md">العودة للرئيسية</button>
        </motion.div>
      </div>
    );

  const currentQuestion = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const currentQType = (currentQuestion?.type as string || '').toLowerCase();
  const isAutoCurrent = isAutoGradedType(currentQType);
  const isSingleChoice = currentQType === 'multiple_choice' || currentQType === 'true_false' || currentQType === 'radio';
  const isMultiChoice = currentQType === 'multi_select' || currentQType === 'checkbox';
  const isFileUploadType = ['file_upload', 'file', 'upload', 'image'].includes(currentQType);

  return (
    <div className={cn("min-h-screen bg-slate-50 flex flex-col relative", (exam?.settings?.prevent_copy && !isPreviewMode) && "select-none print:hidden")} dir="rtl">
      {isPreviewMode && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-4 py-2 text-center text-sm font-bold flex justify-center items-center gap-2">
           <Eye className="w-4 h-4" /> أنت تتصفح الاختبار كمعلم (وضع المعاينة). لن يتم حفظ الإجابات أو تفعيل قيود الغش/الوقت.
        </div>
      )}
      <AnimatePresence>
        {showCheatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-t-8 border-rose-600">
              <div className="inline-flex p-4 rounded-full bg-rose-100 text-rose-600 mb-4 animate-bounce"><AlertTriangle className="h-12 w-12" /></div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">إنذار بمحاولة غش!</h2>
              <p className="text-slate-600 font-bold text-lg leading-relaxed mb-6">لقد اكتشف النظام قيامك بالخروج من شاشة الاختبار.<br/><br/><span className="text-rose-600">هذا هو الإنذار الأول والأخير.</span></p>
              <button onClick={() => setShowCheatModal(false)} className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-lg">أتعهد بعدم الخروج من الشاشة</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold", timeLeft < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-700")}>
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
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-wider"><span>سؤال {currentQuestionIdx + 1}</span><span className="w-1 h-1 rounded-full bg-slate-300" /><span>{currentQuestion?.points} نقاط</span></div>
              <div className="prose max-w-none text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed"><Latex>{currentQuestion?.content || currentQuestion?.text || ''}</Latex></div>
              {(currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl) && (
                <div className="relative w-full flex justify-center bg-slate-50 rounded-2xl border border-slate-100 p-2 mt-4"><img src={currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl} alt="صورة السؤال" className="max-h-[350px] w-auto object-contain rounded-xl shadow-sm" /></div>
              )}
            </div>

            <div className="space-y-3">
              {isAutoCurrent && isSingleChoice && currentQuestion.options?.map((option: any) => (
                <button key={option.id} onClick={() => handleAnswerChange(currentQuestion.id, option.id)} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all group", String(answers[currentQuestion.id]) === String(option.id) ? "bg-indigo-50 border-indigo-600 text-indigo-900" : "bg-white border-slate-100 hover:border-slate-300")}>
                  <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0", String(answers[currentQuestion.id]) === String(option.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200")}><CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-100" /></div>
                  <span className="text-lg font-medium"><Latex>{option.content}</Latex></span>
                </button>
              ))}

              {isAutoCurrent && isMultiChoice && currentQuestion.options?.map((option: any) => {
                const isSelected = (answers[currentQuestion.id] || []).map(String).includes(String(option.id));
                return (
                  <button key={option.id} onClick={() => {
                    const current = (answers[currentQuestion.id] || []).map(String);
                    handleAnswerChange(currentQuestion.id, isSelected ? current.filter((id: string) => id !== String(option.id)) : [...current, String(option.id)]);
                  }} className={cn("w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all", isSelected ? "bg-indigo-50 border-indigo-600" : "bg-white border-slate-100")}>
                    <div className={cn("h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200")}><CheckCircle2 className="h-4 w-4 opacity-0" /></div>
                    <span className="text-lg font-medium"><Latex>{option.content}</Latex></span>
                  </button>
                );
              })}

              {isFileUploadType && (
                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                  <label className="block text-sm font-black text-indigo-800 mb-4 flex items-center gap-2"><UploadCloud className="h-5 w-5 text-indigo-600" /> قم برفع صورة حلك لهذه المسألة هنا:</label>
                  <div className="bg-white rounded-xl overflow-hidden p-2 shadow-sm border border-slate-200">
                    <ImageUpload initialImageUrl={answers[currentQuestion.id] || ''} onUploadSuccess={(url) => handleAnswerChange(currentQuestion.id, url)} label="انقر هنا لإرفاق الحل (صورة)" />
                  </div>
                </div>
              )}

              {!isAutoCurrent && !isFileUploadType && (
                <textarea value={answers[currentQuestion.id] || ''} onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} placeholder="اكتب إجابتك هنا بالتفصيل..." className="w-full min-h-[200px] p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-600 outline-none text-lg leading-relaxed font-bold" />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all"><ChevronRight className="h-5 w-5" />السابق</button>
          {currentQuestionIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50">
              {isSubmitting ? <span className="animate-pulse">جاري المعالجة...</span> : <><Send className="h-5 w-5" /> {isPreviewMode ? 'إنهاء المعاينة' : 'إرسال الاختبار'}</>}
            </button>
          ) : (
            <button onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))} className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">التالي<ChevronLeft className="h-5 w-5" /></button>
          )}
        </div>
      </footer>
    </div>
  );
}
