'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';

interface AssignmentFormProps {
  questions: any[];
  onSubmit: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function AssignmentForm({ questions, onSubmit, isSubmitting, initialAnswers = {}, readOnly = false, children }: AssignmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      const timer = setTimeout(() => {
        setAnswers(prev => JSON.stringify(prev) === JSON.stringify(initialAnswers) ? prev : initialAnswers);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialAnswers]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (readOnly) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) setErrors(prev => { const n = {...prev}; delete n[questionId]; return n; });
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;
    const current = (answers[questionId] as string[]) || [];
    handleAnswerChange(questionId, checked ? [...current, option] : current.filter(a => a !== option));
  };

  // معالجة إجابة المقارنة (تحفظ كـ JSON String Array)
  const handleComparisonChange = (questionId: string, colIndex: number, value: string) => {
     if (readOnly) return;
     try {
       const currentArr = answers[questionId] ? JSON.parse(answers[questionId]) : ["", ""];
       currentArr[colIndex] = value;
       handleAnswerChange(questionId, JSON.stringify(currentArr));
     } catch(e) {
       const newArr = ["", ""];
       newArr[colIndex] = value;
       handleAnswerChange(questionId, JSON.stringify(newArr));
     }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    questions.forEach(q => {
      if (q.isRequired && q.type !== 'section_header') {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (q.type === 'comparison' && ans === '["",""]')) {
          newErrors[q.id] = 'هذا السؤال مطلوب للإرسال';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readOnly && validate()) onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((question, index) => {
        const isHeader = question.type === 'section_header';
        const isComparison = question.type === 'comparison';

        return (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            className={isHeader 
              ? "mt-12 mb-6 pb-4 border-b-2 border-indigo-100" 
              : `glass-card p-6 sm:p-8 rounded-[2rem] border-2 transition-all ${errors[question.id] ? 'border-red-300 shadow-red-100' : 'border-slate-100 hover:border-indigo-100 shadow-sm'}`
            }
          >
            <div className="flex flex-col gap-5">
              
              {/* رأس السؤال أو الترويسة */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 dir="auto" className={isHeader 
                    ? "text-2xl sm:text-3xl font-black text-indigo-900 tracking-tight leading-relaxed" 
                    : "text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-relaxed whitespace-pre-wrap"
                  }>
                    {question.content || question.text}
                    {question.isRequired && !isHeader && <span className="text-red-500 mx-1">*</span>}
                  </h3>
                </div>
                {!isHeader && (
                  <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-[11px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 shrink-0">
                    {question.points} نقاط
                  </div>
                )}
              </div>

              {/* 🚀 عرض الصورة المرفقة مع السؤال (إن وجدت) */}
              {question.media_url && (
                <div className="relative w-full rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2 shadow-inner">
                   <img src={question.media_url} alt="صورة توضيحية للسؤال" className="max-h-[400px] w-auto object-contain rounded-xl" />
                </div>
              )}

              {/* حقول الإجابة بناءً على نوع السؤال */}
              {!isHeader && (
                <div className="space-y-4 mt-2">
                  
                  {question.type === 'text' && (
                    <input type="text" dir="auto" placeholder="إجابتك..." disabled={readOnly}
                      className="w-full rounded-2xl border border-slate-200 py-4 px-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all font-bold disabled:opacity-60 outline-none"
                      value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  )}

                  {question.type === 'paragraph' && (
                    <textarea rows={5} dir="auto" placeholder="اكتب إجابتك بالتفصيل هنا..." disabled={readOnly}
                      className="w-full rounded-2xl border border-slate-200 py-4 px-5 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all font-bold resize-none disabled:opacity-60 outline-none leading-relaxed"
                      value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  )}

                  {/* 🚀 جدول المقارنة الفخم */}
                  {isComparison && (
                    <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                       <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-200">
                          <div className="bg-indigo-50/50 p-4 text-center border-b border-slate-200">
                            <span className="font-black text-indigo-900 text-sm">{(question.options && question.options[0]) || 'الطرف الأول'}</span>
                          </div>
                          <div className="bg-indigo-50/50 p-4 text-center border-b border-slate-200">
                            <span className="font-black text-indigo-900 text-sm">{(question.options && question.options[1]) || 'الطرف الثاني'}</span>
                          </div>
                          
                          <div className="p-0 h-full">
                            <textarea dir="auto" disabled={readOnly} placeholder="اكتب هنا..."
                              value={(() => { try { return JSON.parse(answers[question.id] || '["",""]')[0]; } catch(e){return '';} })()}
                              onChange={(e) => handleComparisonChange(question.id, 0, e.target.value)}
                              className="w-full h-full min-h-[150px] p-5 border-none resize-none bg-transparent outline-none focus:ring-0 text-slate-700 font-bold leading-relaxed disabled:bg-slate-50"
                            />
                          </div>
                          <div className="p-0 h-full">
                            <textarea dir="auto" disabled={readOnly} placeholder="اكتب هنا..."
                              value={(() => { try { return JSON.parse(answers[question.id] || '["",""]')[1]; } catch(e){return '';} })()}
                              onChange={(e) => handleComparisonChange(question.id, 1, e.target.value)}
                              className="w-full h-full min-h-[150px] p-5 border-none resize-none bg-transparent outline-none focus:ring-0 text-slate-700 font-bold leading-relaxed disabled:bg-slate-50"
                            />
                          </div>
                       </div>
                    </div>
                  )}

                  {/* خيارات متعددة وصح/خطأ */}
                  {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {question.options?.map((option: string, optIndex: number) => {
                        const isChecked = question.type === 'checkbox' 
                            ? (answers[question.id] || []).includes(option) 
                            : answers[question.id] === option;
                        
                        return (
                          <label key={optIndex} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${isChecked ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200'} ${readOnly ? 'cursor-default pointer-events-none' : ''}`}>
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                                {isChecked && <CheckCircle2 className="h-4 w-4" />}
                            </div>
                            <input
                              type={question.type === 'checkbox' ? 'checkbox' : 'radio'}
                              className="hidden"
                              checked={isChecked}
                              onChange={(e) => question.type === 'checkbox' ? handleCheckboxChange(question.id, option, e.target.checked) : handleAnswerChange(question.id, option)}
                              disabled={readOnly}
                            />
                            <span dir="auto" className={`text-sm font-bold transition-colors ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* تنبيه الخطأ */}
              {errors[question.id] && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-sm font-bold animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" /> <span>{errors[question.id]}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {children}

      {!readOnly && (
        <div className="pt-8">
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-3 rounded-[2rem] bg-indigo-600 px-8 py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
            {isSubmitting ? <div className="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="h-6 w-6" />}
            {isSubmitting ? 'جاري التشفير والإرسال...' : 'تأكيد وإرسال الواجب النهائي'}
          </button>
        </div>
      )}
    </form>
  );
}
