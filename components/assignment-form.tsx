'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns, UploadCloud, Circle, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';

// 🚀 محرك تنسيق المعادلات والجداول للطالب (النسخة المضيئة Light Theme)
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = String(content)
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$'); 
     
   // تلوين المعادلات
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono font-bold mx-1 inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   // تنسيق الجداول المستخرجة من الذكاء الاصطناعي
   html = html.replace(/<table/g, '<table class="w-full text-right border-collapse my-4 min-w-[500px] border border-slate-200"');
   html = html.replace(/<th/g, '<th class="bg-indigo-50 p-3 border border-slate-200 font-black text-indigo-900 text-sm"');
   html = html.replace(/<td/g, '<td class="p-3 border border-slate-200 bg-white text-slate-700 font-bold"');
   
   return { __html: html };
};

interface AssignmentFormProps {
  questions: any[];
  onSubmit: (answers: Record<string, any>) => void;
  onChange?: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  showModelAnswer?: boolean; 
  children?: React.ReactNode;
}

export default function AssignmentForm({ 
  questions, 
  onSubmit, 
  onChange,
  isSubmitting, 
  initialAnswers = {}, 
  readOnly = false,
  showModelAnswer = false, 
  children 
}: AssignmentFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🚀 حقن مكتبة KaTeX لمعالجة المعادلات بامتياز
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const renderMath = () => {
        if ((window as any).renderMathInElement) {
          (window as any).renderMathInElement(document.body, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
          });
        }
      };

      if (!document.getElementById('katex-css-form')) {
        const link = document.createElement('link');
        link.id = 'katex-css-form';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('katex-js-form')) {
        const script = document.createElement('script');
        script.id = 'katex-js-form';
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.onload = () => {
          const autoRender = document.createElement('script');
          autoRender.id = 'katex-auto-render-form';
          autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
          autoRender.onload = () => setTimeout(renderMath, 100);
          document.head.appendChild(autoRender);
        };
        document.head.appendChild(script);
      } else {
        setTimeout(renderMath, 500);
      }
    }
  }, [questions]);

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
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: value };
      if (onChange) onChange(newAnswers);
      return newAnswers;
    });
    if (errors[questionId]) setErrors(prev => { const n = {...prev}; delete n[questionId]; return n; });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    questions.forEach(q => {
      if (q.isRequired && q.type !== 'section_header') {
        const ans = answers[q.id];
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (q.type === 'comparison' && ans === '[]')) {
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

  const renderQuestionInput = (q: any) => {
    const ans = answers[q.id];

    if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'radio') {
      const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 
          ? q.options 
          : (q.type === 'true_false' ? ['صح', 'خطأ'] : []);

      return (
        <div className="space-y-3 mt-4">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : (opt.id || optContent);
            const isSelected = ans === optId || ans === optContent;
            
            return (
              <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-300'}`}>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                   {isSelected && <Circle className="h-2.5 w-2.5 fill-current" />}
                </div>
                <input type="radio" className="hidden" disabled={readOnly} checked={isSelected} onChange={() => handleAnswerChange(q.id, optId)} />
                <span className={`font-bold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-700'} w-full block`} dangerouslySetInnerHTML={renderContentWithMath(optContent)} />
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === 'checkbox' || q.type === 'multi_select') {
      const selectedArray = Array.isArray(ans) ? ans : [];
      const safeOptions = q.options && Array.isArray(q.options) ? q.options : [];

      return (
        <div className="space-y-3 mt-4">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : (opt.id || optContent);
            const isSelected = selectedArray.includes(optId) || selectedArray.includes(optContent);
            
            return (
              <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-300'}`}>
                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                   {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
                <input type="checkbox" className="hidden" disabled={readOnly} checked={isSelected} onChange={() => {
                   if (readOnly) return;
                   const newArr = isSelected ? selectedArray.filter((i: string) => i !== optId && i !== optContent) : [...selectedArray, optId];
                   handleAnswerChange(q.id, newArr);
                }} />
                <span className={`font-bold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-700'} w-full block`} dangerouslySetInnerHTML={renderContentWithMath(optContent)} />
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === 'file_upload') {
       return (
         <div className="mt-4 bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100">
           <label className="block text-sm font-black text-indigo-800 mb-3 flex items-center gap-2">
             <UploadCloud className="h-5 w-5 text-indigo-600" /> يرجى إرفاق صورة الحل الخاص بك هنا:
           </label>
           <div className="bg-white p-2 rounded-xl border border-slate-200">
             {readOnly ? (
               ans ? <img src={ans} className="max-h-64 rounded-lg object-contain mx-auto" alt="مرفق الطالب" /> : <p className="text-slate-400 italic text-center py-4 font-bold">لم تقم بإرفاق ملف</p>
             ) : (
               <ImageUpload initialImageUrl={ans || ''} onUploadSuccess={(url) => handleAnswerChange(q.id, url)} label="انقر أو اسحب صورة ورقة الحل هنا" />
             )}
           </div>
         </div>
       );
    }

    let tableData = q.table;
    if (!tableData && q.type === 'data_table' && q.options && q.options.length > 0) {
      try {
        const optContent = typeof q.options[0] === 'string' ? q.options[0] : (q.options[0].content || q.options[0].text);
        tableData = JSON.parse(optContent);
      } catch (e) {}
    }

    if (q.type === 'data_table' && tableData) {
      const parsedAns = Array.isArray(ans) ? ans : [];

      return (
        <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse min-w-[600px] m-0">
              <thead>
                <tr className="bg-indigo-50">
                  {tableData.headers?.map((h: string, i: number) => (
                    <th key={i} className="p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-sm text-center last:border-l-0">
                      <div dangerouslySetInnerHTML={renderContentWithMath(h)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows?.map((row: string[], rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className={`p-4 border-b border-l border-slate-200 align-middle text-center last:border-l-0 ${cIdx === 0 ? 'bg-slate-50 font-bold text-slate-700' : ''}`}>
                        {cIdx === 0 ? (
                          <div className="prose max-w-none text-slate-700 font-bold text-center" dangerouslySetInnerHTML={renderContentWithMath(cell)} />
                        ) : (
                          <textarea 
                            disabled={readOnly} 
                            rows={1} 
                            placeholder="..." 
                            value={parsedAns[rIdx]?.[cIdx] || ''} 
                            onChange={(e) => { 
                              const newAns = [...parsedAns]; 
                              if (!newAns[rIdx]) newAns[rIdx] = Array(tableData.headers.length).fill(''); 
                              newAns[rIdx][cIdx] = e.target.value; 
                              handleAnswerChange(q.id, newAns); 
                            }} 
                            className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-300 text-center" 
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (q.type === 'comparison') {
        const getOptValue = (opt: any, fallback: string) => {
          if (!opt) return fallback;
          return typeof opt === 'string' ? opt : (opt.content || opt.text || fallback);
        };
        const aspects = q.options?.slice(2)?.map((o: any) => getOptValue(o, '')) || [];
        const party1 = getOptValue(q.options?.[0], 'الطرف الأول');
        const party2 = getOptValue(q.options?.[1], 'الطرف الثاني');
        const parsedAns = Array.isArray(ans) ? ans : [];

        return (
          <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-indigo-50">
                    <th className="p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-sm w-1/3">وجه المقارنة</th>
                    <th className="p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party1)} /></th>
                    <th className="p-4 border-b border-slate-200 font-black text-indigo-900 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party2)} /></th>
                  </tr>
                </thead>
                <tbody>
                  {aspects.map((aspect: string, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border-b border-l border-slate-200 font-bold text-slate-700 bg-slate-50 align-top leading-relaxed">
                         <div className="prose max-w-none text-slate-700 font-bold" dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                      </td>
                      <td className="p-4 border-b border-l border-slate-200 align-top">
                         <textarea disabled={readOnly} rows={2} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[0] || ''} onChange={(e) => { const newAns = [...parsedAns]; if (!newAns[idx]) newAns[idx] = ['', '']; newAns[idx][0] = e.target.value; handleAnswerChange(q.id, newAns); }} className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-300" />
                      </td>
                      <td className="p-4 border-b border-slate-200 align-top">
                         <textarea disabled={readOnly} rows={2} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[1] || ''} onChange={(e) => { const newAns = [...parsedAns]; if (!newAns[idx]) newAns[idx] = ['', '']; newAns[idx][1] = e.target.value; handleAnswerChange(q.id, newAns); }} className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }

    return (
      <textarea
        disabled={readOnly}
        rows={4}
        placeholder="اكتب إجابتك هنا بالتفصيل..."
        className="mt-4 block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-lg font-bold transition-all resize-y disabled:opacity-70 disabled:bg-slate-100 outline-none leading-relaxed"
        value={ans || ''}
        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      {questions.map((q, idx) => {
        const isHeader = q.type === 'section_header';
        
        let rawContent = q.content || q.text || q.question_text || '';
        let questionText = rawContent;
        let modelAnswerText = '';
        
        const answerIndex = rawContent.indexOf('[الإجابة النموذجية');
        if (answerIndex !== -1) {
          questionText = rawContent.substring(0, answerIndex).trim();
          modelAnswerText = rawContent.substring(answerIndex).trim();
        }

        if (isHeader) {
          return (
            <div key={q.id} className="pt-8 pb-2 border-b-2 border-indigo-100">
               <div className="prose max-w-none text-2xl font-black text-indigo-900 leading-relaxed text-right" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
               {showModelAnswer && modelAnswerText && (
                 <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm font-bold" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
               )}
               {q.media_url && <img src={q.media_url} className="mt-4 max-h-64 rounded-xl border border-slate-200 shadow-sm" alt="توضيح" />}
            </div>
          );
        }

        return (
          <div key={q.id} className="glass-card p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm bg-white transition-all hover:shadow-md hover:border-indigo-100">
             <div className="flex gap-4 items-start">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shadow-sm border border-indigo-100">
                   {idx + 1}
                </div>
                <div className="flex-1 pt-2 text-right">
                   <div className="flex items-start gap-1">
                     <div className="prose max-w-none text-xl font-bold text-slate-800 leading-relaxed w-full" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
                     {q.is_required && <span className="text-rose-500 text-xl font-black mt-1 shrink-0">*</span>}
                   </div>
                   
                   {showModelAnswer && modelAnswerText && (
                     <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm font-bold" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
                   )}

                   {q.media_url && <img src={q.media_url} className="mt-4 max-h-72 rounded-xl border border-slate-200 shadow-sm" alt="صورة توضيحية" />}
                   
                   {renderQuestionInput(q)}
                </div>
             </div>
             {errors[q.id] && (
               <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-sm font-bold animate-in fade-in">
                 <AlertCircle className="h-4 w-4 shrink-0" /> <span>{errors[q.id]}</span>
               </div>
             )}
          </div>
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
