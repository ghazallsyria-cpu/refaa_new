/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle2, Timer, BookOpen, AlertTriangle, Lock, UploadCloud, Eye, ShieldAlert, FileText, Check } from 'lucide-react';
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
  const { user, userRole, authRole, isChecking } = useAuth() as any; 
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

  useEffect(() => { 
    if (!isChecking) fetchQuiz(); 
  }, [fetchQuiz, isChecking]);

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

  // 🚀 شاشات الحماية والتحميل بالثيم الملكي
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <ShieldAlert className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري التحقق وتأمين الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090b14] font-cairo text-slate-100">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
             <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
             <FileText className="absolute h-8 w-8 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-indigo-400 font-black animate-pulse tracking-widest drop-shadow-md">جاري تحميل بيئة الاختبار...</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) return (
    <div className="min-h-screen bg-[#090b14] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0f1423] p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-md w-full text-center space-y-6 border border-indigo-500/30">
        <div className="inline-flex p-5 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner"><Lock className="h-12 w-12 drop-shadow-md" /></div>
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">لقد قمت بتقديم هذا الاختبار مسبقاً</h2>
        <p className="text-slate-400 font-bold text-sm sm:text-base leading-relaxed">لقد استنفدت الحد الأقصى للمحاولات المسموحة.</p>
        <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-95 border border-indigo-400/50">العودة لقائمة الاختبارات</button>
      </motion.div>
    </div>
  );

  if (!questions || questions.length === 0) return (
    <div className="min-h-screen bg-[#090b14] flex items-center justify-center p-4 font-cairo" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0f1423] p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-md w-full text-center space-y-6 border border-amber-500/30">
        <div className="inline-flex p-5 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner"><AlertCircle className="h-12 w-12 drop-shadow-md" /></div>
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">الاختبار غير مكتمل</h2>
        <p className="text-slate-400 font-bold text-sm sm:text-base leading-relaxed">عذراً، هذا الاختبار لا يحتوي على أي أسئلة مضافة حتى الآن.</p>
        <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-6 bg-[#02040a]/80 text-white py-4 rounded-2xl font-black border border-white/10 hover:bg-white/5 transition-all active:scale-95 shadow-inner">العودة للرئيسية</button>
      </motion.div>
    </div>
  );

  const hasManualQuestions = questions.some(q => !isAutoGradedType(q.type as string));

  if (isFinished) return (
    <div className="min-h-screen bg-[#090b14] flex items-center justify-center p-4 font-cairo relative overflow-hidden" dir="rtl">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#0f1423]/90 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] max-w-lg w-full text-center space-y-6 border border-emerald-500/30 relative z-10">
        <div className="inline-flex p-5 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner"><CheckCircle2 className="h-12 w-12 drop-shadow-md" /></div>
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm">تم إرسال الاختبار بنجاح!</h2>
        <div className="text-slate-400 font-bold text-sm sm:text-base leading-relaxed space-y-4">
            <p>{isPreviewMode ? "لقد أنهيت المعاينة بنجاح (لم يتم حفظ أي إجابات)." : "لقد استلمنا إجاباتك وتم تسجيلها بشكل آمن في قاعدة البيانات."}</p>
            {!isPreviewMode && hasManualQuestions && <span className="block mt-4 text-amber-400 font-black bg-amber-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-inner">ستظهر نتيجتك النهائية بعد تصحيح المعلم للأسئلة المقالية.</span>}
            {!isPreviewMode && !hasManualQuestions && <span className="block mt-4 text-emerald-400 font-black bg-emerald-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 shadow-inner">تم تصحيح الاختبار آلياً، ستظهر النتيجة بعد انتهاء وقت الاختبار للجميع.</span>}
        </div>
        {timeTakenInfo > 0 && !isPreviewMode && (
          <div className="inline-flex items-center justify-center w-full gap-2 bg-[#02040a]/60 text-slate-300 px-5 py-3.5 rounded-2xl font-black mt-2 border border-white/5 shadow-inner text-sm sm:text-base">
            <Clock className="w-5 h-5 text-indigo-400" /><span>الوقت المستغرق: <span dir="ltr">{formatTime(timeTakenInfo)}</span></span>
          </div>
        )}
        <button onClick={() => { window.location.href = '/exams'; }} className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-500 text-[#090b14] py-4 sm:py-5 rounded-2xl font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50 hover:opacity-90 transition-all active:scale-95 text-base sm:text-lg">العودة للرئيسية</button>
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
    <div className={cn("min-h-screen bg-[#090b14] flex flex-col relative font-cairo text-slate-200 overflow-x-hidden", (exam?.settings?.prevent_copy && !isPreviewMode) && "select-none print:hidden")} dir="rtl">
      
      {/* 🚀 الخلفية الزجاجية */}
      <div className="fixed top-1/4 left-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {isPreviewMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-400 px-4 py-2 sm:py-3 text-center text-[10px] sm:text-sm font-black flex justify-center items-center gap-2 backdrop-blur-md shadow-inner relative z-50 uppercase tracking-widest">
           <Eye className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> أنت تتصفح الاختبار كمعلم (وضع المعاينة). لن يتم حفظ الإجابات أو تفعيل قيود المراقبة.
        </div>
      )}
      
      <AnimatePresence>
        {showCheatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040a]/90 p-4 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0f1423] rounded-[2.5rem] p-8 sm:p-12 max-w-lg w-full text-center shadow-[0_30px_60px_rgba(225,29,72,0.4)] border border-rose-500/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/20 blur-[80px] rounded-full pointer-events-none"></div>
              <div className="inline-flex p-5 rounded-3xl bg-rose-500/10 text-rose-400 mb-6 shadow-inner border border-rose-500/20 relative z-10 animate-pulse"><AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-md" /></div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4 drop-shadow-sm relative z-10">إنذار بمحاولة غش!</h2>
              <p className="text-slate-300 font-bold text-sm sm:text-lg leading-relaxed mb-8 relative z-10">لقد اكتشف النظام قيامك بالخروج من شاشة الاختبار أو تبديل النوافذ.<br/><br/><span className="text-rose-400 font-black bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">هذا هو الإنذار الأول والأخير، التكرار سيسحب الورقة.</span></p>
              <button onClick={() => setShowCheatModal(false)} className="w-full bg-gradient-to-r from-rose-600 to-red-600 text-white py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:opacity-90 transition-all active:scale-95 border border-rose-400/50 relative z-10">أتعهد بعدم الخروج من الشاشة</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 الهيدر العلوي المظلم والمثبت */}
      <header className="bg-[#02040a]/80 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-indigo-500/10 rounded-xl sm:rounded-2xl border border-indigo-500/20 shadow-inner shrink-0"><BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 drop-shadow-sm" /></div>
            <div className="min-w-0 pr-1">
              <h1 className="text-base sm:text-lg lg:text-xl font-black text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md drop-shadow-sm leading-tight">{exam?.title}</h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 sm:mt-1">سؤال {currentQuestionIdx + 1} <span className="opacity-50">من</span> {questions.length}</p>
            </div>
          </div>
          {timeLeft !== null && (
            <div className={cn("flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border shadow-inner transition-colors shrink-0", timeLeft < 60 ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.3)] animate-pulse" : "bg-[#0f1423] text-slate-300 border-white/10")}>
              <Timer className="h-4 w-4 sm:h-5 sm:w-5" /><span dir="ltr" className="font-black text-sm sm:text-lg tracking-tight font-mono drop-shadow-sm">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-[#0f1423]"><motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" initial={{ width: 0 }} animate={{ width: `${progress}%` }} /></div>
      </header>

      {/* 🚀 محتوى الاختبار الملكي */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion?.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 p-6 sm:p-8 lg:p-12 space-y-8 sm:space-y-10 relative overflow-hidden bg-[#0f1423]/60">
            <div className="absolute top-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 text-indigo-400 font-black text-xs sm:text-sm tracking-widest uppercase bg-[#02040a]/40 w-fit px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-white/5 shadow-inner">
                <span>سؤال {currentQuestionIdx + 1}</span><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span>{currentQuestion?.points} نقاط</span>
              </div>
              <div className="prose prose-invert max-w-none text-xl sm:text-2xl lg:text-3xl font-black text-white leading-relaxed drop-shadow-sm overflow-hidden">
                <Latex>{currentQuestion?.content || currentQuestion?.text || ''}</Latex>
              </div>
              {(currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl) && (
                <div className="relative w-full flex justify-center bg-[#02040a]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-2 sm:p-3 mt-6 shadow-inner">
                  <img src={currentQuestion?.media_url || (currentQuestion as any)?.mediaUrl} alt="صورة السؤال" className="max-h-[300px] sm:max-h-[400px] w-auto object-contain rounded-xl sm:rounded-2xl" />
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 relative z-10">
              {isAutoCurrent && isSingleChoice && currentQuestion.options?.map((option: any) => {
                const isSelected = String(answers[currentQuestion.id]) === String(option.id);
                return (
                  <button key={option.id} onClick={() => handleAnswerChange(currentQuestion.id, option.id)} className={cn("w-full flex items-center gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-[1.5rem] border-2 text-right transition-all group active:scale-[0.98]", isSelected ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-[#02040a]/60 border-white/5 hover:border-indigo-500/30 hover:bg-[#0f1423]/80 text-slate-300 shadow-inner")}>
                    <div className={cn("h-6 w-6 sm:h-7 sm:w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors shadow-inner", isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-500 bg-[#0f1423]")}>
                      <CheckCircle2 className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                    </div>
                    <span className="text-base sm:text-lg lg:text-xl font-bold drop-shadow-sm leading-relaxed overflow-hidden"><Latex>{option.content}</Latex></span>
                  </button>
                );
              })}

              {isAutoCurrent && isMultiChoice && currentQuestion.options?.map((option: any) => {
                const isSelected = (answers[currentQuestion.id] || []).map(String).includes(String(option.id));
                return (
                  <button key={option.id} onClick={() => {
                    const current = (answers[currentQuestion.id] || []).map(String);
                    handleAnswerChange(currentQuestion.id, isSelected ? current.filter((id: string) => id !== String(option.id)) : [...current, String(option.id)]);
                  }} className={cn("w-full flex items-center gap-4 sm:gap-5 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-[1.5rem] border-2 text-right transition-all active:scale-[0.98]", isSelected ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-[#02040a]/60 border-white/5 hover:border-indigo-500/30 hover:bg-[#0f1423]/80 text-slate-300 shadow-inner")}>
                    <div className={cn("h-6 w-6 sm:h-7 sm:w-7 rounded-lg sm:rounded-xl border-2 flex items-center justify-center shrink-0 transition-colors shadow-inner", isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-500 bg-[#0f1423]")}>
                      <CheckCircle2 className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                    </div>
                    <span className="text-base sm:text-lg lg:text-xl font-bold drop-shadow-sm leading-relaxed overflow-hidden"><Latex>{option.content}</Latex></span>
                  </button>
                );
              })}

              {isFileUploadType && (
                <div className="bg-indigo-500/10 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-indigo-500/20 shadow-inner text-center sm:text-right">
                  <label className="flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base font-black text-indigo-300 mb-4 sm:mb-5 drop-shadow-sm"><UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" /> قم برفع صورة حلك لهذه المسألة هنا:</label>
                  <div className="bg-[#02040a]/60 rounded-xl sm:rounded-2xl overflow-hidden p-2 sm:p-3 shadow-inner border border-white/5">
                    <ImageUpload initialImageUrl={answers[currentQuestion.id] || ''} onUploadSuccess={(url) => handleAnswerChange(currentQuestion.id, url)} label="انقر هنا لإرفاق الحل (صورة)" />
                  </div>
                </div>
              )}

              {!isAutoCurrent && !isFileUploadType && (
                <div className="bg-[#02040a]/60 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-inner overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all p-1">
                  <textarea 
                    value={answers[currentQuestion.id] || ''} 
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} 
                    placeholder="اكتب إجابتك هنا بالتفصيل..." 
                    className="w-full min-h-[200px] sm:min-h-[250px] p-5 sm:p-6 bg-transparent border-none outline-none text-base sm:text-lg leading-relaxed font-bold text-white placeholder:text-slate-600 custom-scrollbar resize-none" 
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 🚀 الفوتر والأزرار السفلية الثابتة */}
      <footer className="bg-[#02040a]/80 backdrop-blur-2xl border-t border-white/10 p-4 sm:p-6 sticky bottom-0 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))} className="flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-8 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-slate-300 bg-[#0f1423] border border-white/5 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all active:scale-95 shadow-inner w-full sm:w-auto">
             <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden sm:inline">السابق</span>
          </button>
          
          {currentQuestionIdx === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center justify-center gap-2 px-6 sm:px-10 h-12 sm:h-14 bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base hover:opacity-90 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 border border-emerald-400/50 active:scale-95 transition-all w-full sm:w-auto">
              {isSubmitting ? <span className="animate-pulse">جاري المعالجة...</span> : <><Send className="h-4 w-4 sm:h-5 sm:w-5" /> {isPreviewMode ? 'إنهاء المعاينة' : 'إرسال الاختبار النهائي'}</>}
            </button>
          ) : (
            <button onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))} className="flex items-center justify-center gap-1.5 sm:gap-2 px-6 sm:px-10 h-12 sm:h-14 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 active:scale-95 transition-all w-full sm:w-auto">
              <span className="hidden sm:inline">التالي</span> <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; border: 1px solid #02040a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}} />
    </div>
  );
}
