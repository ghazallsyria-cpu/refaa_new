// @ts-nocheck
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, XCircle, ChevronRight, Sparkles, 
  Lightbulb, ArrowRight, BrainCircuit, Trophy, RefreshCcw, CheckSquare
} from 'lucide-react';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function PracticeArena() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 حالات التدريب التفاعلي
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchArena = async () => {
      try {
        // جلب الواجب مرة واحدة فقط
        const { data: assignData } = await supabase.from('assignments_v2').select('*').eq('id', id).single();
        const { data: qData } = await supabase.from('assignment_questions_v2').select('*').eq('assignment_id', id).order('order_index', { ascending: true });
        
        setAssignment(assignData);
        setQuestions(qData || []);
      } catch (error) {
        console.error("Error loading arena:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArena();
  }, [id]);

  const currentQ = questions[currentIndex];

  // 🚀 دالة اختيار الإجابة (للاختياري)
  const handleOptionClick = (opt: any) => {
    if (isAnswered) return; // منع التغيير بعد الإجابة
    setSelectedOptionId(opt.id);
    setIsAnswered(true);
    
    if (opt.is_correct) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }

    // إظهار الإجابة النموذجية تلقائياً إذا أخطأ (أو إذا كان المعلم وضع شرحاً)
    if (currentQ.model_answer_html) {
      setTimeout(() => setShowModelAnswer(true), 500);
    }
  };

  // 🚀 دالة الانتقال للسؤال التالي
  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
      setShowModelAnswer(false);
    } else {
      setIsFinished(true);
    }
  };

  // 🚀 دالة التقييم الذاتي (للمقالي)
  const handleSelfEvaluation = (understood: boolean) => {
    if (understood) {
      setScore(s => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }
    nextQuestion();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-pulse flex flex-col items-center gap-4"><BrainCircuit className="w-12 h-12 text-indigo-400" /><p className="text-white font-bold font-cairo">جاري تجهيز ساحة التدريب...</p></div></div>;
  if (!assignment || questions.length === 0) return <div className="p-10 text-center font-cairo">لا يوجد تدريب متاح هنا.</div>;

  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-100 font-cairo text-slate-800 flex flex-col" dir="rtl">
      
      {/* CSS التنسيق الإجباري للجداول والرياضيات (نفس الذي في V2) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-container { direction: rtl !important; unicode-bidi: embed !important; display: inline-block; max-width: 100%; overflow-wrap: break-word; }
        .katex { direction: rtl !important; text-align: right !important; }
        .katex-display { display: flex !important; justify-content: center !important; margin: 0.5rem 0 !important; width: 100% !important; overflow-x: auto; direction: rtl !important; }
        .tiptap-content table { border-collapse: collapse !important; width: 100% !important; margin: 15px 0 !important; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .tiptap-content td, .tiptap-content th { border: 2px solid #94a3b8 !important; padding: 12px !important; text-align: center !important; vertical-align: middle !important; min-width: 2em; }
        .tiptap-content th { background-color: #f1f5f9 !important; font-weight: 900 !important; }
        .tiptap-content img { max-width: 100% !important; height: auto !important; border-radius: 8px !important; margin: 10px auto !important; display: block !important; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1) !important; }
        .tiptap-content p { margin-bottom: 0.5em !important; }
      `}} />

      {/* شريط التقدم العلوي */}
      <div className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100"><ArrowRight className="w-5 h-5" /></button>
          <div className="flex-1 mx-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${isFinished ? 100 : progress}%` }} className="h-full bg-indigo-600 rounded-full" />
            </div>
            <div className="text-[10px] font-black text-slate-400 mt-1 text-center">{currentIndex + 1} من {questions.length}</div>
          </div>
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {score.correct}</span>
            <span className="text-rose-500 flex items-center gap-1"><XCircle className="w-4 h-4"/> {score.wrong}</span>
          </div>
        </div>
      </div>

      {/* ساحة البطاقات التفاعلية */}
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!isFinished ? (
            <motion.div 
              key={currentQ.id}
              initial={{ opacity: 0, x: 50 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
            >
              
              {/* هيدر البطاقة */}
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-slate-700 text-sm">{currentQ.type === 'section_header' ? 'معلومة للقراءة' : 'تحدي التدريب'}</h3>
              </div>

              {/* نص السؤال */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="tiptap-content prose prose-slate max-w-none font-bold text-slate-800 leading-loose text-lg" dangerouslySetInnerHTML={{ __html: currentQ.content_html }}></div>
                
                {/* 🚀 حالة 1: الاختيار من متعدد */}
                {currentQ.type === 'multiple_choice' && (
                  <div className="mt-8 space-y-3">
                    {currentQ.options?.map((opt: any) => {
                      const isSelected = selectedOptionId === opt.id;
                      const isCorrect = opt.is_correct;
                      
                      // تحديد لون الزر بناءً على الإجابة
                      let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50";
                      if (isAnswered) {
                        if (isCorrect) btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-emerald-100/50 shadow-lg scale-[1.02]";
                        else if (isSelected && !isCorrect) btnStyle = "bg-rose-50 border-rose-400 text-rose-800 opacity-70";
                        else btnStyle = "bg-white border-slate-100 text-slate-400 opacity-50";
                      }

                      return (
                        <button 
                          key={opt.id} 
                          onClick={() => handleOptionClick(opt)}
                          disabled={isAnswered}
                          className={`w-full p-4 rounded-2xl border-2 font-bold text-base text-right transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <div className="katex-container flex-1"><Latex>{opt.content}</Latex></div>
                          {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                          {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 🚀 حالة 2: سؤال مقالي أو جدول (التصحيح الذاتي) */}
                {currentQ.type === 'essay' && !showModelAnswer && (
                  <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-slate-500 mb-4">حل المسألة في ورقة خارجية، ثم اضغط لرؤية الحل النموذجي.</p>
                    <button onClick={() => setShowModelAnswer(true)} className="w-full bg-indigo-50 text-indigo-700 border-2 border-dashed border-indigo-300 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                      <Lightbulb className="w-6 h-6" /> اكشف لي الإجابة النموذجية
                    </button>
                  </div>
                )}

                {/* 🚀 عرض الإجابة النموذجية (إذا تم كشفها أو إذا أخطأ الطالب) */}
                <AnimatePresence>
                  {showModelAnswer && currentQ.model_answer_html && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-2 text-emerald-800 font-black mb-4 border-b border-emerald-100 pb-2">
                        <CheckSquare className="w-5 h-5" /> خطوات الحل والإجابة الصحيحة:
                      </div>
                      <div className="tiptap-content prose prose-slate max-w-none font-bold text-emerald-950 leading-loose" dangerouslySetInnerHTML={{ __html: currentQ.model_answer_html }}></div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Footer Buttons */}
              <div className="p-4 bg-white border-t border-slate-100">
                {currentQ.type === 'section_header' ? (
                  <button onClick={nextQuestion} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                    فهمت، التالي <ChevronRight className="w-5 h-5" />
                  </button>
                ) : currentQ.type === 'multiple_choice' ? (
                  <AnimatePresence>
                    {isAnswered && (
                      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={nextQuestion} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                        السؤال التالي <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                ) : currentQ.type === 'essay' && showModelAnswer ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <p className="text-center text-sm font-black text-slate-600">كن صادقاً.. هل كانت إجابتك مطابقة للحل؟</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleSelfEvaluation(true)} className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-2xl flex flex-col items-center gap-1 active:scale-95 transition-all">
                        <CheckCircle2 className="w-6 h-6" /> نعم، أتقنتها!
                      </button>
                      <button onClick={() => handleSelfEvaluation(false)} className="flex-1 bg-rose-500 text-white font-black py-3 rounded-2xl flex flex-col items-center gap-1 active:scale-95 transition-all">
                        <RefreshCcw className="w-6 h-6" /> لا، أحتاج تدريباً
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </div>

            </motion.div>
          ) : (
            /* 🚀 شاشة النهاية والاحتفال */
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8 text-center"
            >
              <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">رائع! أكملت التدريب</h2>
              <p className="text-slate-500 font-bold mb-8">لقد أنهيت هذا البنك بنجاح. الممارسة تصنع المستحيل!</p>
              
              <div className="flex justify-center gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-500">{score.correct}</div>
                  <div className="text-xs font-bold text-slate-400">إجابات صحيحة</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-rose-500">{score.wrong}</div>
                  <div className="text-xs font-bold text-slate-400">تحتاج مراجعة</div>
                </div>
              </div>

              <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                العودة للمنصة الرئيسية <Sparkles className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
