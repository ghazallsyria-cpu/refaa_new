// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ChevronRight, Sparkles, 
  Lightbulb, ArrowRight, BrainCircuit, Trophy, RefreshCcw, Target, Quote, Flame, Clock, Download, FileText
} from 'lucide-react';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import confetti from 'canvas-confetti'; 

// 🚀 استيراد مكتبات توليد الـ PDF من الباكج الخاص بك
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { supabase } from '@/lib/supabase';

const renderHTMLWithMath = (html: string) => {
  if (!html) return '';
  let parsed = html;
  const renderMath = (match: string, mathString: string, isDisplay: boolean) => {
    try {
      let cleanMath = mathString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cleanMath = cleanMath
        .replace(/\\mu_o/g, '\\mu_0')
        .replace(/mu_o/g, '\\mu_0')
        .replace(/\\pi\\0\.001/g, '0.001\\pi')
        .replace(/pi\\0\.001/g, '0.001\\pi') 
        .replace(/\\ /g, ' ');
      return katex.renderToString(cleanMath, { displayMode: isDisplay, throwOnError: false, direction: 'ltr' });
    } catch (e) { return match; }
  };
  parsed = parsed.replace(/\$\$(.*?)\$\$/gs, (m, math) => renderMath(m, math, true));
  parsed = parsed.replace(/\$(.*?)\$/gs, (m, math) => renderMath(m, math, false));
  return parsed;
};

const safeParseOptions = (optionsData: any) => {
  if (!optionsData) return [];
  let parsed = [];
  if (Array.isArray(optionsData)) parsed = optionsData;
  else if (typeof optionsData === 'string') {
    try { parsed = JSON.parse(optionsData); } catch (e) { return []; }
  }
  return parsed.map((opt: any) => ({
    ...opt,
    is_correct: opt.is_correct === true || opt.is_correct === 'true' || opt.isCorrect === true || opt.isCorrect === 'true'
  }));
};

export default function PracticeArena() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, userName } = useAuth() as any; 

  const [assignment, setAssignment] = useState<any>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]); 
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  const [attempts, setAttempts] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [score, setScore] = useState({ correct: 0, wrong: 0, totalPoints: 0 });
  const [streak, setStreak] = useState(0); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  
  const [failedQuestionIds, setFailedQuestionIds] = useState<Set<string>>(new Set());
  
  const [isFinished, setIsFinished] = useState(false);
  const [mode, setMode] = useState<'normal' | 'retake_errors'>('normal');

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const fetchArena = async () => {
      try {
        const { data: assignData } = await supabase.from('assignments_v2').select('*').eq('id', id).single();
        const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', id).order('order_index', { ascending: true });
        
        const { data: progressData } = await supabase.from('student_progress_v2').select('*').eq('student_id', user.id).eq('assignment_id', id).maybeSingle();

        setAssignment(assignData);
        
        const formattedQs = (qData || []).map((q: any) => ({ ...q, type: q.question_type }));
        setAllQuestions(formattedQs);
        setActiveQuestions(formattedQs);

        const localSaveKey = `arena_save_${user.id}_${id}`;
        const localData = localStorage.getItem(localSaveKey);

        if (!progressData?.is_completed && localData) {
           const parsedLocal = JSON.parse(localData);
           setCurrentIndex(parsedLocal.currentIndex || 0);
           setScore(parsedLocal.score || { correct: 0, wrong: 0, totalPoints: 0 });
           setStreak(parsedLocal.streak || 0);
           setFailedQuestionIds(new Set(parsedLocal.failedQuestionIds || []));
        } else if (progressData) {
          if (progressData.is_completed) {
            setIsFinished(true); 
            setScore({ correct: progressData.correct_score, wrong: progressData.wrong_score, totalPoints: progressData.correct_score * 10 }); 
          } else {
            setCurrentIndex(progressData.current_index || 0); 
            setScore({ correct: progressData.correct_score || 0, wrong: progressData.wrong_score || 0, totalPoints: (progressData.correct_score || 0) * 10 });
          }
        }
        
        setStartTime(Date.now()); 
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchArena();
  }, [id, user]);

  useEffect(() => {
    if (loading || isFinished || !user) return;
    const localSaveKey = `arena_save_${user.id}_${id}`;
    const saveData = {
        currentIndex, score, streak, failedQuestionIds: Array.from(failedQuestionIds)
    };
    localStorage.setItem(localSaveKey, JSON.stringify(saveData));
  }, [currentIndex, score, streak, failedQuestionIds, loading, isFinished]);


  const saveProgressToDB = async (newIndex: number, newScore: { correct: number, wrong: number }, finished: boolean) => {
    if (!user) return;
    try {
      await supabase.from('student_progress_v2').upsert({
        student_id: user.id, assignment_id: id, current_index: newIndex, correct_score: newScore.correct,
        wrong_score: newScore.wrong, is_completed: finished, updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, assignment_id' });
      
      if (finished) localStorage.removeItem(`arena_save_${user.id}_${id}`);
    } catch (err) {}
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleFinish = (finalScore: any) => {
    setIsFinished(true);
    if (startTime) setTimeSpentSeconds(Math.floor((Date.now() - startTime) / 1000));
    
    if (finalScore.wrong === 0 || (finalScore.correct / (finalScore.correct + finalScore.wrong) > 0.8)) {
        triggerConfetti();
    }
    
    if (mode === 'normal') saveProgressToDB(currentIndex, finalScore, true);
  };

  const currentQ = activeQuestions[currentIndex];
  const currentContextHeader = activeQuestions.slice(0, currentIndex + 1).reverse().find(q => q.type === 'section_header');

  const handleOptionClick = (opt: any) => {
    if (isSuccess) return; 
    setSelectedOptionId(opt.id);
    
    if (opt.is_correct) {
      setIsSuccess(true);
      setShowHint(true); 

      const newStreak = streak + 1;
      setStreak(newStreak);
      
      const multiplier = newStreak >= 3 ? 1.5 : 1;
      const pointsEarned = (currentQ.points || 1) * multiplier * (attempts === 0 ? 1 : 0.5); 

      setScore(s => ({ 
          ...s, 
          correct: s.correct + (attempts === 0 ? 1 : 0),
          totalPoints: s.totalPoints + pointsEarned
      }));
      
    } else {
      setAttempts(a => a + 1);
      setStreak(0); 
      setFailedQuestionIds(prev => new Set(prev).add(currentQ.id)); 
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (attempts === 0) setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }
  };

  const nextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (activeQuestions[nextIdx].type === 'section_header' && nextIdx < activeQuestions.length - 1) nextIdx++;
      setCurrentIndex(nextIdx); setSelectedOptionId(null); setIsSuccess(false); setAttempts(0); setShowHint(false);
      if (mode === 'normal') saveProgressToDB(nextIdx, score, false);
    } else {
      handleFinish(score);
    }
  };

  const handleSelfEvaluation = (understood: boolean) => {
    const newScore = { 
        correct: score.correct + (understood ? 1 : 0), 
        wrong: score.wrong + (!understood ? 1 : 0),
        totalPoints: score.totalPoints + (understood ? (currentQ.points || 1) : 0)
    };
    
    if (understood) setStreak(s => s + 1);
    else { setStreak(0); setFailedQuestionIds(prev => new Set(prev).add(currentQ.id)); }

    setScore(newScore);
    if (currentIndex < activeQuestions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (activeQuestions[nextIdx].type === 'section_header' && nextIdx < activeQuestions.length - 1) nextIdx++;
      setCurrentIndex(nextIdx); setSelectedOptionId(null); setShowHint(false); 
      if (mode === 'normal') saveProgressToDB(nextIdx, newScore, false);
    } else {
      handleFinish(newScore);
    }
  };

  const handleRetakeFull = async () => {
    if (!user) return;
    try {
      await supabase.from('student_progress_v2').upsert({
        student_id: user.id, assignment_id: id, current_index: 0, correct_score: 0,
        wrong_score: 0, is_completed: false, updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, assignment_id' });

      setMode('normal');
      setActiveQuestions(allQuestions);
      setCurrentIndex(0);
      setScore({ correct: 0, wrong: 0, totalPoints: 0 });
      setIsFinished(false);
      setSelectedOptionId(null);
      setIsSuccess(false);
      setAttempts(0);
      setShowHint(false);
      setStreak(0);
      setFailedQuestionIds(new Set());
      setStartTime(Date.now());
    } catch (err) {}
  };

  const handleRetakeErrorsOnly = () => {
    const errorQs = allQuestions.filter(q => failedQuestionIds.has(q.id) || q.type === 'section_header');
    
    setMode('retake_errors');
    setActiveQuestions(errorQs);
    setCurrentIndex(0);
    setScore({ correct: 0, wrong: 0, totalPoints: 0 });
    setIsFinished(false);
    setSelectedOptionId(null);
    setIsSuccess(false);
    setAttempts(0);
    setShowHint(false);
    setStreak(0);
    setStartTime(Date.now());
  };

  // 🚀 دالة توليد وتحميل الـ PDF الاحترافي
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('pdf-export-container');
      if (!element) throw new Error("Element not found");

      // استخدام html2canvas لالتقاط صورة عالية الدقة للمحتوى
      const canvas = await html2canvas(element, {
        scale: 2, // دقة عالية
        useCORS: true, // للسماح بتحميل الصور الخارجية
        backgroundColor: '#f8fafc',
        windowWidth: 900 // تثبيت العرض لضمان التنسيق
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // التعامل مع تعدد الصفحات (Pagination) في الـ PDF
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`مراجعة_أخطائي_${assignment?.title || 'تدريب'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة لاحقاً.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-pulse flex flex-col items-center gap-4"><BrainCircuit className="w-12 h-12 text-indigo-400" /><p className="text-white font-bold font-cairo">جاري تجهيز الساحة...</p></div></div>;
  if (!assignment || allQuestions.length === 0) return <div className="p-10 text-center font-cairo">لا يوجد تدريب متاح هنا.</div>;

  const progress = ((currentIndex + 1) / activeQuestions.length) * 100;
  
  const safeOptions = currentQ ? safeParseOptions(currentQ.options) : [];
  const isMCQ = currentQ?.type === 'multiple_choice' && safeOptions.length > 0;
  
  const successMessages = ["أنت بطل! إجابة دقيقة 🌟", "تفكير عبقري! 🧠", "عمل رائع جداً! 🎯", "دقة متناهية، استمر! 👏"];
  const encourageMessages = ["لا بأس، الخطأ طريق التعلم! 💪", "اقتربت جداً، اقرأ الشرح بتركيز! 🎯", "أنت قادر عليها يا بطل! 🧠", "المحاولات تصنع النجاح! 🔄"];
  
  const randomSuccessMsg = successMessages[currentIndex % successMessages.length];
  const randomEncourageMsg = encourageMessages[currentIndex % encourageMessages.length];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} دقيقة و ${s} ثانية`;
  };

  // قائمة الأسئلة الخاطئة للـ PDF
  const failedQsForPDF = allQuestions.filter(q => failedQuestionIds.has(q.id) && q.type !== 'section_header');

  return (
    <div className="min-h-screen bg-slate-100 font-cairo text-slate-800 flex flex-col overflow-hidden relative" dir="rtl">
      
      {/* 🚀 هذه الحاوية المخفية مخصصة للطباعة بـ PDF فقط ولن تظهر في الشاشة */}
      <div className="absolute top-0 right-0 w-[900px] z-[-100] opacity-0 pointer-events-none bg-slate-50 p-10 font-cairo" id="pdf-export-container">
        <div className="text-center mb-10 border-b-4 border-indigo-600 pb-6">
          <h1 className="text-4xl font-black text-indigo-900 mb-3">ملخص المراجعة الشاملة</h1>
          <h2 className="text-2xl font-bold text-slate-700 mb-4">{assignment?.title}</h2>
          <div className="flex items-center justify-center gap-6 text-sm font-black text-slate-500 bg-white inline-flex px-6 py-2 rounded-xl shadow-sm border border-slate-200">
            <span>الطالب: {userName || 'مستخدم النظام'}</span>
            <span>|</span>
            <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>

        <div className="space-y-12">
          {failedQsForPDF.map((q, idx) => (
            <div key={q.id} className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 pb-4">
                <div className="bg-rose-100 text-rose-700 w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shrink-0">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-black text-slate-800">نص السؤال:</h3>
              </div>
              
              <div className="prose prose-slate max-w-none font-bold text-slate-800 mb-8 text-lg" 
                   dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.content_html) }} />

              <div className="bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl p-6">
                <h3 className="font-black text-indigo-800 mb-4 flex items-center gap-2 text-lg">
                  <BrainCircuit className="w-6 h-6" /> تحليل الإجابة النموذجية:
                </h3>
                {q.model_answer_html && q.model_answer_html.trim() !== '' ? (
                  <div className="prose prose-indigo max-w-none font-bold text-indigo-950 text-lg leading-loose" 
                       dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(q.model_answer_html) }} />
                ) : (
                  <p className="text-slate-500 font-bold italic">لا يوجد توضيح مفصل متوفر.</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center pt-6 border-t-2 border-slate-200 text-slate-400 font-bold">
          تم التوليد آلياً بواسطة المساعد الذكي - المركز العلمي السوري
        </div>
      </div>
      {/* 🚀 نهاية منطقة الطباعة */}


      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: ltr !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: ltr !important; text-align: left !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: ltr !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: white; }
        .tiptap-content td, .tiptap-content th { border: 2px solid #cbd5e1 !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; }
        .tiptap-content th { background-color: #f8fafc !important; font-weight: 900 !important; color: #334155; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 12px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important; }
        .tiptap-content p { margin-bottom: 0.5em !important; }
      `}} />

      <div className="bg-white shadow-sm z-20 shrink-0 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><ArrowRight className="w-5 h-5" /></button>
          
          <div className="flex-1 mx-4 sm:mx-6 flex items-center gap-4">
            <div className="flex-1">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${isFinished ? 100 : progress}%` }} className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 rounded-full" />
                </div>
                <div className="text-[10px] font-black text-indigo-400 mt-1.5 text-center tracking-widest uppercase">
                  {mode === 'retake_errors' ? 'تحدي تصحيح الأخطاء' : `التحدي ${currentIndex + 1} / ${activeQuestions.length}`}
                </div>
            </div>
            
            <AnimatePresence>
                {streak >= 2 && (
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1 bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 rounded-full border border-orange-200 shadow-sm shrink-0">
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                        <span className="text-xs font-black text-orange-700">{streak}x</span>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 text-sm font-black bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 shrink-0">
            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {score.correct}</span>
            <span className="text-rose-500 flex items-center gap-1"><XCircle className="w-4 h-4"/> {score.wrong}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6 overflow-hidden h-[calc(100vh-70px)]">
        
        <AnimatePresence>
          {currentContextHeader && currentQ?.type !== 'section_header' && !isFinished && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className="md:w-1/2 flex flex-col bg-indigo-50/50 rounded-[2rem] border border-indigo-100 shadow-sm overflow-hidden h-[30vh] md:h-full shrink-0"
            >
              <div className="bg-indigo-100/50 px-5 py-3 flex items-center gap-2 border-b border-indigo-100 shrink-0">
                <Quote className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-indigo-800 text-sm">اقرأ النص أو ادرس الشكل التالي:</h3>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <div className="tiptap-content prose prose-slate max-w-none font-bold text-indigo-950 leading-loose" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentContextHeader.content_html) }}></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 flex flex-col justify-center h-full ${currentContextHeader ? 'md:w-1/2' : 'w-full max-w-2xl mx-auto'}`}>
          <AnimatePresence mode="wait">
            {!isFinished && currentQ ? (
              <motion.div 
                key={currentQ.id}
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1, x: shake ? [-10, 10, -10, 10, 0] : 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className={`bg-white rounded-[2rem] shadow-xl border-2 overflow-hidden flex flex-col max-h-full ${isSuccess ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-200'}`}
              >
                
                <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <Target className={`w-5 h-5 ${isSuccess ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    <h3 className={`font-black text-sm ${isSuccess ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {isSuccess ? "إجابة صحيحة!" : (currentQ.type === 'essay' ? 'تحدي مقالي' : currentQ.type === 'section_header' ? 'معلومة للقراءة' : 'تحدي اختياري')}
                    </h3>
                  </div>
                  {currentQ.points > 0 && <span className="bg-white px-3 py-1 rounded-lg text-xs font-black text-slate-500 border border-slate-200 shadow-sm">{currentQ.points} نقاط</span>}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-800 leading-loose text-lg" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentQ.content_html) }}></div>
                  
                  {isMCQ && (
                    <div className="mt-8 space-y-3">
                      {safeOptions.map((opt: any) => {
                        const isSelected = selectedOptionId === opt.id;
                        const isCorrect = opt.is_correct;
                        let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md";
                        if (isSuccess) {
                          if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-lg scale-[1.02] ring-4 ring-emerald-100";
                          else btnStyle = "bg-white border-slate-100 text-slate-300 opacity-40";
                        } else if (attempts > 0 && isSelected && !isCorrect) {
                          btnStyle = "bg-rose-50 border-rose-300 text-rose-700 opacity-60"; 
                        }
                        return (
                          <button 
                            key={opt.id} 
                            onClick={() => handleOptionClick(opt)}
                            disabled={isSuccess || (attempts > 0 && isSelected && !isCorrect)} 
                            className={`w-full p-4 rounded-2xl border-2 font-bold text-base text-right transition-all duration-300 flex items-center justify-between ${btnStyle}`}
                          >
                            <div className="katex-container flex-1"><Latex>{opt.content}</Latex></div>
                            {isSuccess && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
                            {attempts > 0 && isSelected && !isCorrect && !isSuccess && <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'essay' && !showHint && (
                    <div className="mt-8 text-center bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed">
                      <p className="text-sm font-bold text-slate-500 mb-4">✍️ فكر جيداً وحل المسألة في ورقة خارجية...</p>
                      <button onClick={() => setShowHint(true)} className="w-full bg-white text-indigo-600 border-2 border-indigo-200 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm">
                        <Lightbulb className="w-5 h-5" /> تأكدت من حلي، اكشف لي الجواب!
                      </button>
                    </div>
                  )}

                  {showHint && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mt-8 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white shadow-lg">
                      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-white">
                        <div className="flex items-center gap-2 font-black text-sm">
                          <BrainCircuit className="w-5 h-5 animate-pulse" />
                          <span>المساعد الذكي: تحليل خطوات الحل</span>
                        </div>
                        <Sparkles className="w-4 h-4 opacity-70" />
                      </div>
                      
                      <div className="p-6 bg-indigo-50/30">
                        {currentQ.model_answer_html && currentQ.model_answer_html.trim() !== '' && currentQ.model_answer_html !== '<p></p>' ? (
                          <div className="tiptap-content prose prose-slate max-w-none font-bold text-indigo-950 leading-relaxed text-base" 
                               dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentQ.model_answer_html) }}>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-500 italic text-center">لا يوجد شرح تفصيلي متوفر لهذا السؤال.</p>
                        )}
                      </div>

                      <div className="px-6 py-3 bg-white border-t border-indigo-100 flex justify-center">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Syrian Science Center - AI Explainer</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100 shrink-0 mt-auto">
                  {isMCQ ? (
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-emerald-100 border-2 border-emerald-500 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-lg shadow-emerald-200/50">
                          <div className="font-black text-emerald-800 text-lg flex items-center gap-2">
                            <Sparkles className="w-6 h-6" /> {randomSuccessMsg}
                          </div>
                          <button onClick={nextQuestion} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-200">
                            متابعة التحدي <ChevronRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      ) : attempts > 0 && !isSuccess ? (
                        <motion.div key="wrong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                          <div className="bg-rose-100 text-rose-800 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 border-2 border-rose-300 text-center shadow-sm">
                            <RefreshCcw className="w-5 h-5" /> {randomEncourageMsg}
                          </div>
                          {currentQ.model_answer_html && !showHint && (
                            <button onClick={() => setShowHint(true)} className="w-full bg-indigo-100 text-indigo-700 font-black py-3 rounded-xl hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2 border border-indigo-300 shadow-sm">
                              <BrainCircuit className="w-5 h-5" /> تحليل الإجابة (المساعد الذكي)
                            </button>
                          )}
                        </motion.div>
                      ) : (
                         <div key="idle" className="w-full bg-slate-200/70 text-slate-500 font-black py-4 rounded-xl flex items-center justify-center gap-2 border border-slate-200 shadow-inner">
                           اختر إجابة للتقدم
                         </div>
                      )}
                    </AnimatePresence>
                  ) : currentQ.type === 'essay' ? (
                    showHint ? (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-center text-sm font-black text-slate-700">تقييم ذاتي: هل إجابتك صحيحة؟</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleSelfEvaluation(true)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition-all shadow-md">
                            <CheckCircle2 className="w-5 h-5" /> نعم، أتقنتها!
                          </button>
                          <button onClick={() => handleSelfEvaluation(false)} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition-all shadow-md">
                            <RefreshCcw className="w-5 h-5" /> لا، أخطأت
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-400">انقر على "اكشف لي الجواب" في الأعلى لتقييم نفسك.</span>
                        </div>
                    )
                  ) : currentQ.type === 'section_header' ? (
                    <button onClick={nextQuestion} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200">
                      تمت القراءة، متابعة <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button onClick={nextQuestion} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                      تخطي هذا السؤال (لا توجد خيارات) <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>

              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 sm:p-8 text-center relative overflow-hidden h-full flex flex-col justify-center">
                <div className="w-28 h-28 bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                  <Trophy className="w-14 h-14" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-800 mb-2">
                    {mode === 'retake_errors' ? 'تم إنهاء المراجعة! 🛡️' : 'إنجاز رائع! 🚀'}
                </h2>
                <p className="text-slate-500 font-bold mb-6">
                    {mode === 'retake_errors' ? 'لقد واجهت نقاط ضعفك بقوة. الاستمرارية هي مفتاح الإتقان.' : 'لقد أكملت التدريب. كل خطأ ارتكبته هنا هو خطوة نحو التفوق.'}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="text-center border-l border-slate-200">
                    <div className="text-4xl font-black text-emerald-500 mb-1">{score.correct}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">نقاط القوة</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-rose-500 mb-1">{score.wrong}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">تحتاج مراجعة</div>
                  </div>
                  <div className="col-span-2 mt-4 pt-4 border-t border-slate-200 text-center flex items-center justify-center gap-2 text-indigo-600 font-black">
                      <Clock className="w-4 h-4" /> استغرقت: {formatTime(timeSpentSeconds)}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  
                  {/* 🚀 الزر الجديد: تصدير الـ PDF للأخطاء والشروحات */}
                  {failedQuestionIds.size > 0 && (
                    <button 
                      onClick={generatePDF} 
                      disabled={isGeneratingPDF}
                      className="w-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200 font-black py-4 rounded-xl hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingPDF ? (
                        <>جاري تجهيز الملف... <span className="animate-spin text-xl">⏳</span></>
                      ) : (
                        <>تحميل ملخص أخطائي (مع الشرح PDF) <FileText className="w-5 h-5" /></>
                      )}
                    </button>
                  )}

                  {failedQuestionIds.size > 0 && mode === 'normal' && (
                    <button onClick={handleRetakeErrorsOnly} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200">
                        مراجعة أخطائي فقط 🎯
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleRetakeFull} className="bg-slate-100 text-slate-700 border border-slate-200 font-black py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                      إعادة بالكامل <RefreshCcw className="w-5 h-5" />
                    </button>
                    
                    <button onClick={() => router.push('/arena')} className="bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                      الساحة الرئيسية <Sparkles className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
