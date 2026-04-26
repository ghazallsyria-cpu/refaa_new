// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/auth-context'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ChevronRight, Sparkles, 
  Lightbulb, ArrowRight, BrainCircuit, Trophy, RefreshCcw, CheckSquare, Target, Quote
} from 'lucide-react';

import katex from 'katex';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// دالة تنظيف الرياضيات
const renderHTMLWithMath = (html: string) => {
  if (!html) return '';
  let parsed = html;
  const renderMath = (match: string, mathString: string, isDisplay: boolean) => {
    try {
      let cleanMath = mathString.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cleanMath = cleanMath.replace(/\\mu_o/g, '\\mu_0').replace(/mu_o/g, '\\mu_0').replace(/\\pi\\0\.001/g, '0.001\\pi').replace(/\\ /g, ' ');
      return katex.renderToString(cleanMath, { displayMode: isDisplay, throwOnError: false, direction: 'ltr' });
    } catch (e) { return match; }
  };
  parsed = parsed.replace(/\$\$(.*?)\$\$/gs, (m, math) => renderMath(m, math, true));
  parsed = parsed.replace(/\$(.*?)\$/gs, (m, math) => renderMath(m, math, false));
  return parsed;
};

// 🚀 تم إصلاح مكون الاحتفال (Confetti) ليتوافق مع القواعد الصارمة لـ React 19
const CelebrationConfetti = () => {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    const generatedPieces = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      scale: Math.random() * 1.5 + 0.5,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      rotate: Math.random() * 360,
      isCircle: Math.random() > 0.5
    }));
    setPieces(generatedPieces);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: p.scale, x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ 
            position: 'absolute', 
            width: '10px', 
            height: '10px', 
            backgroundColor: p.color, 
            borderRadius: p.isCircle ? '50%' : '2px' 
          }}
        />
      ))}
    </div>
  );
};

export default function PracticeArena() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth() as any; 

  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  
  const [attempts, setAttempts] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);

  // جلب البيانات واستعادة التقدم
  useEffect(() => {
    if (!id || !user) return;
    
    const fetchArena = async () => {
      try {
        const { data: assignData } = await supabase.from('assignments_v2').select('*').eq('id', id).single();
        const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', id).order('order_index', { ascending: true });
        
        // جلب تقدم الطالب إن وجد
        const { data: progressData } = await supabase
          .from('student_progress_v2')
          .select('*')
          .eq('student_id', user.id)
          .eq('assignment_id', id)
          .single();

        setAssignment(assignData);
        setQuestions(qData || []);

        if (progressData) {
          if (progressData.is_completed) {
            setIsFinished(true);
            setScore({ correct: progressData.correct_score, wrong: progressData.wrong_score });
          } else {
            setCurrentIndex(progressData.current_index || 0);
            setScore({ correct: progressData.correct_score || 0, wrong: progressData.wrong_score || 0 });
          }
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchArena();
  }, [id, user]);

  // دالة حفظ التقدم الصامتة في السيرفر
  const saveProgressToDB = async (newIndex: number, newScore: { correct: number, wrong: number }, finished: boolean) => {
    if (!user) return;
    try {
      await supabase.from('student_progress_v2').upsert({
        student_id: user.id,
        assignment_id: id,
        current_index: newIndex,
        correct_score: newScore.correct,
        wrong_score: newScore.wrong,
        is_completed: finished,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_id, assignment_id' });
    } catch (err) { console.error("Error saving progress:", err); }
  };

  const currentQ = questions[currentIndex];
  const currentContextHeader = questions.slice(0, currentIndex + 1).reverse().find(q => q.type === 'section_header');

  const handleOptionClick = (opt: any) => {
    if (isSuccess) return; 
    setSelectedOptionId(opt.id);
    
    if (opt.is_correct) {
      setIsSuccess(true);
      setScore(s => {
        const newScore = { ...s, correct: s.correct + (attempts === 0 ? 1 : 0) };
        return newScore;
      });
      setShowHint(true); 
    } else {
      setAttempts(a => a + 1);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (attempts === 0) setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (questions[nextIdx].type === 'section_header' && nextIdx < questions.length - 1) nextIdx++;
      
      setCurrentIndex(nextIdx);
      setSelectedOptionId(null);
      setIsSuccess(false);
      setAttempts(0);
      setShowHint(false);
      
      saveProgressToDB(nextIdx, score, false);
    } else {
      setIsFinished(true);
      saveProgressToDB(currentIndex, score, true); 
    }
  };

  const handleSelfEvaluation = (understood: boolean) => {
    const newScore = { 
      correct: score.correct + (understood ? 1 : 0), 
      wrong: score.wrong + (!understood ? 1 : 0) 
    };
    setScore(newScore);
    
    if (currentIndex < questions.length - 1) {
      let nextIdx = currentIndex + 1;
      if (questions[nextIdx].type === 'section_header' && nextIdx < questions.length - 1) nextIdx++;
      setCurrentIndex(nextIdx);
      setSelectedOptionId(null);
      setShowHint(false);
      saveProgressToDB(nextIdx, newScore, false);
    } else {
      setIsFinished(true);
      saveProgressToDB(currentIndex, newScore, true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-pulse flex flex-col items-center gap-4"><BrainCircuit className="w-12 h-12 text-indigo-400" /><p className="text-white font-bold font-cairo">جاري تجهيز الساحة واسترجاع تقدمك...</p></div></div>;
  if (!assignment || questions.length === 0) return <div className="p-10 text-center font-cairo">لا يوجد تدريب متاح هنا.</div>;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isMCQ = currentQ.type === 'multiple_choice' && Array.isArray(currentQ.options) && currentQ.options.length > 0;
  const hasModelAnswer = !!currentQ.model_answer_html?.trim();
  const successMessages = ["أنت بطل! 🌟", "تفكير عبقري! 🧠", "عمل رائع جداً! 🎯", "دقة متناهية! 👏"];
  const randomSuccessMsg = successMessages[currentIndex % successMessages.length];

  return (
    <div className="min-h-screen bg-slate-100 font-cairo text-slate-800 flex flex-col overflow-hidden" dir="rtl">
      
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
          <div className="flex-1 mx-6">
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: `${isFinished ? 100 : progress}%` }} className="h-full bg-gradient-to-l from-indigo-500 to-indigo-600 rounded-full" />
            </div>
            <div className="text-[10px] font-black text-indigo-400 mt-1.5 text-center tracking-widest uppercase">التحدي {currentIndex + 1} / {questions.length}</div>
          </div>
          <div className="flex items-center gap-3 text-sm font-black bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">
            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {score.correct}</span>
            <span className="text-rose-500 flex items-center gap-1"><XCircle className="w-4 h-4"/> {score.wrong}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6 overflow-hidden h-[calc(100vh-70px)]">
        
        <AnimatePresence>
          {currentContextHeader && currentQ.type !== 'section_header' && !isFinished && (
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
            {!isFinished ? (
              <motion.div 
                key={currentQ.id}
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1, x: shake ? [-10, 10, -10, 10, 0] : 0 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className={`bg-white rounded-[2rem] shadow-xl border-2 overflow-hidden flex flex-col max-h-full ${isSuccess ? 'border-emerald-400 shadow-emerald-100' : 'border-slate-200'}`}
              >
                
                {isSuccess && <CelebrationConfetti />}

                <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <Target className={`w-5 h-5 ${isSuccess ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    <h3 className={`font-black text-sm ${isSuccess ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {isSuccess ? randomSuccessMsg : (currentQ.type === 'essay' ? 'تحدي مقالي' : 'تحدي اختياري')}
                    </h3>
                  </div>
                  {currentQ.points > 0 && <span className="bg-white px-3 py-1 rounded-lg text-xs font-black text-slate-500 border border-slate-200 shadow-sm">{currentQ.points} نقاط</span>}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-800 leading-loose text-lg" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentQ.content_html) }}></div>
                  
                  {isMCQ && (
                    <div className="mt-8 space-y-3">
                      {currentQ.options.map((opt: any) => {
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

                  <AnimatePresence>
                    {showHint && hasModelAnswer && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-800 font-black mb-4 border-b border-emerald-200/50 pb-3">
                          <CheckSquare className="w-5 h-5" /> {isMCQ ? "شرح وتوضيح الإجابة:" : "الإجابة النموذجية:"}
                        </div>
                        <div className="tiptap-content prose prose-slate max-w-none font-bold text-emerald-950 leading-loose" dangerouslySetInnerHTML={{ __html: renderHTMLWithMath(currentQ.model_answer_html) }}></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 mt-auto">
                  {isMCQ ? (
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={nextQuestion} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200">
                          عمل رائع! استمر <ChevronRight className="w-5 h-5" />
                        </motion.button>
                      ) : attempts > 0 && !isSuccess ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                          <div className="flex-1 bg-rose-100 text-rose-700 font-black py-4 rounded-xl flex items-center justify-center gap-2 border border-rose-200">
                            <RefreshCcw className="w-5 h-5" /> إجابة خاطئة، جرب مرة أخرى!
                          </div>
                          {hasModelAnswer && !showHint && (
                            <button onClick={() => setShowHint(true)} className="px-6 bg-amber-100 text-amber-700 font-black rounded-xl hover:bg-amber-200 transition-colors flex items-center gap-2 border border-amber-200">
                              <Lightbulb className="w-5 h-5" /> تلميح
                            </button>
                          )}
                        </motion.div>
                      ) : (
                         <div className="w-full bg-slate-200 text-slate-400 font-black py-4 rounded-xl flex items-center justify-center gap-2">
                           اختر الإجابة الصحيحة للتقدم
                         </div>
                      )}
                    </AnimatePresence>
                  ) : currentQ.type === 'essay' && showHint ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <p className="text-center text-sm font-black text-slate-600">تقييم ذاتي: هل كانت إجابتك مطابقة أو قريبة للحل؟</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleSelfEvaluation(true)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition-all shadow-md">
                          <CheckCircle2 className="w-5 h-5" /> نعم، فهمتها!
                        </button>
                        <button onClick={() => handleSelfEvaluation(false)} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition-all shadow-md">
                          <RefreshCcw className="w-5 h-5" /> لا، أحتاج مراجعة
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </div>

              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-8 text-center relative overflow-hidden">
                <CelebrationConfetti />
                <div className="w-28 h-28 bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                  <Trophy className="w-14 h-14" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">إنجاز رائع! 🚀</h2>
                <p className="text-slate-500 font-bold mb-8">لقد أكملت التدريب. كل خطأ ارتكبته هنا هو خطوة نحو التفوق في الاختبار الحقيقي.</p>
                
                <div className="flex justify-center gap-8 mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="text-center">
                    <div className="text-4xl font-black text-emerald-500 mb-1">{score.correct}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">نقاط القوة</div>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-rose-500 mb-1">{score.wrong}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">تحتاج مراجعة</div>
                  </div>
                </div>

                <button onClick={() => router.push('/arena')} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                  العودة للساحة الرئيسية <Sparkles className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
