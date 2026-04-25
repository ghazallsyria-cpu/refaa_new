'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns, UploadCloud, Circle, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';

// 🚀 محرك تنسيق المعادلات والجداول للطالب مع المعالجة الصارمة لأسطر \n
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   
   // 1. معالجة صارمة للنزول للسطر (تحويل \n إلى <br/>)
   let html = String(content)
     .replace(/\\\\n/g, '<br/>')
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$'); 
     
   // 2. تلوين المعادلات (النسخة المضيئة للطالب)
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono font-bold mx-1 inline-block max-w-full break-words whitespace-pre-wrap shadow-sm" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   // 3. تنسيق الجداول وحمايتها بحاوية السحب
   html = html.replace(/<table/g, '<div class="table-responsive-wrapper"><table class="w-full text-right border-collapse my-4 min-w-[600px] border border-slate-300 rounded-xl overflow-hidden shadow-sm"');
   html = html.replace(/<\/table>/g, '</table></div>');
   html = html.replace(/<th/g, '<th class="bg-indigo-50 p-4 border border-slate-300 font-black text-indigo-900 text-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-slate-300 bg-white text-slate-700 font-bold"');
   
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
    if (typeof window !== 'undefined' && !document.getElementById('katex-js-form')) {
      const link = document.createElement('link');
      link.id = 'katex-css-form';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.id = 'katex-js-form';
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
      script.onload = () => {
        const autoRender = document.createElement('script');
        autoRender.id = 'katex-auto-render-form';
        autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
        document.head.appendChild(autoRender);
      };
      document.head.appendChild(script);
    }
  }, []);

  // 🚀 المشغل الديناميكي محمي الآن بحاوية (assignment-form-container) لمنع الانهيار
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
        const container = document.getElementById('assignment-form-container');
        if (container) {
          (window as any).renderMathInElement(container, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
          });
        }
      }
    }, 100); 
    return () => clearTimeout(timer);
  }, [questions, answers, errors]);

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

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (readOnly) return;
    const current = (answers[questionId] as string[]) || [];
    handleAnswerChange(questionId, checked ? [...current, option] : current.filter(a => a !== option));
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
        <div className="space-y-3 mt-5">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : String(opt.id || optContent);
            const isSelected = String(ans) === optId || String(ans) === optContent;
            
            return (
              <label key={idx} className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50/80 shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
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
        <div className="space-y-3 mt-5">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : String(opt.id || optContent);
            const isSelected = selectedArray.includes(optId) || selectedArray.includes(optContent);
            
            return (
              <label key={idx} className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50/80 shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}>
                <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                   {isSelected && <CheckCircle2 className="h-4 w-4" />}
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
         <div className="mt-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
           <label className="block text-base font-black text-slate-800 mb-4 flex items-center gap-2">
             <UploadCloud className="h-6 w-6 text-indigo-500" /> إرفاق صورة الحل:
           </label>
           <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
             {readOnly ? (
               ans ? <img src={ans} className="max-h-64 rounded-xl object-contain mx-auto" alt="مرفق الطالب" /> : <p className="text-slate-400 italic text-center py-6 font-bold">لم يتم إرفاق ملف</p>
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
        <div className="mt-6 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="table-responsive-wrapper overflow-x-auto custom-scrollbar-light pb-2">
            <table className="w-full text-right border-collapse min-w-[600px] m-0">
              <thead>
                <tr className="bg-indigo-50/80 border-b border-slate-200">
                  {tableData.headers?.map((h: string, i: number) => (
                    <th key={i} className="p-5 border-l border-slate-200 font-black text-indigo-950 text-sm text-center last:border-l-0">
                      <div dangerouslySetInnerHTML={renderContentWithMath(h)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows?.map((row: string[], rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-200 last:border-0">
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className={`p-4 border-l border-slate-200 align-middle text-center last:border-l-0 ${cIdx === 0 ? 'bg-slate-50/80 font-bold text-slate-800' : 'bg-white'}`}>
                        {cIdx === 0 ? (
                          <div className="prose max-w-none text-slate-800 font-bold text-center" dangerouslySetInnerHTML={renderContentWithMath(cell)} />
                        ) : (
                          <textarea 
                            disabled={readOnly} 
                            rows={1} 
                            placeholder="..." 
                            value={parsedAns[rIdx]?.[cIdx] || ''} 
                            onChange={(e) => { 
                              const newAns = parsedAns.map(arr => Array.isArray(arr) ? [...arr] : Array(tableData.headers.length).fill('')); 
                              if (!newAns[rIdx]) newAns[rIdx] = Array(tableData.headers.length).fill(''); 
                              newAns[rIdx][cIdx] = e.target.value; 
                              handleAnswerChange(q.id, newAns); 
                            }} 
                            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-400 text-center transition-all shadow-inner" 
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
          <div className="mt-6 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm bg-white">
            <div className="table-responsive-wrapper overflow-x-auto custom-scrollbar-light pb-2">
              <table className="w-full text-right border-collapse min-w-[600px] m-0">
                <thead>
                  <tr className="bg-indigo-50/80 border-b border-slate-200">
                    <th className="p-5 border-l border-slate-200 font-black text-indigo-950 text-base w-1/3">وجه المقارنة</th>
                    <th className="p-5 border-l border-slate-200 font-black text-indigo-950 text-base text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party1)} /></th>
                    <th className="p-5 font-black text-indigo-950 text-base text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party2)} /></th>
                  </tr>
                </thead>
                <tbody>
                  {aspects.map((aspect: string, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-200 last:border-0">
                      <td className="p-5 border-l border-slate-200 font-bold text-slate-800 bg-slate-50/80 align-middle leading-relaxed">
                         <div className="prose max-w-none text-slate-800 font-bold" dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                      </td>
                      <td className="p-5 border-l border-slate-200 align-top bg-white">
                         <textarea 
                           disabled={readOnly} rows={3} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[0] || ''} 
                           onChange={(e) => { 
                             const newAns = parsedAns.map(arr => Array.isArray(arr) ? [...arr] : ['', '']); 
                             if (!newAns[idx]) newAns[idx] = ['', '']; 
                             newAns[idx][0] = e.target.value; 
                             handleAnswerChange(q.id, newAns); 
                           }} 
                           className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-400 transition-all shadow-inner" 
                         />
                      </td>
                      <td className="p-5 align-top bg-white">
                         <textarea 
                           disabled={readOnly} rows={3} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[1] || ''} 
                           onChange={(e) => { 
                             const newAns = parsedAns.map(arr => Array.isArray(arr) ? [...arr] : ['', '']); 
                             if (!newAns[idx]) newAns[idx] = ['', '']; 
                             newAns[idx][1] = e.target.value; 
                             handleAnswerChange(q.id, newAns); 
                           }} 
                           className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-400 transition-all shadow-inner" 
                         />
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
        className="mt-5 block w-full rounded-[1.5rem] border border-slate-200 p-5 text-slate-900 bg-slate-50 shadow-inner focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-lg font-bold transition-all resize-y disabled:opacity-70 disabled:bg-slate-100 outline-none leading-relaxed placeholder:text-slate-400"
        value={ans || ''}
        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
      />
    );
  };

  return (
    <form id="assignment-form-container" onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-light::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 12px; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 12px; border: 2px solid #f1f5f9; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />

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
            <div key={q.id} className="pt-10 pb-4 border-b-2 border-indigo-100 mb-8">
               <div className="prose max-w-none text-2xl font-black text-indigo-950 leading-relaxed text-right" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
               {showModelAnswer && modelAnswerText && (
                 <div className="mt-4 p-5 bg-emerald-50/80 text-emerald-900 rounded-2xl border border-emerald-200 text-base font-bold shadow-sm" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
               )}
               {q.media_url && <img src={q.media_url} className="mt-6 max-h-72 rounded-2xl border border-slate-200 shadow-md" alt="توضيح" />}
            </div>
          );
        }

        return (
          <div key={q.id} className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(99,102,241,0.08)] hover:border-indigo-100">
             <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="shrink-0 w-14 h-14 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-sm border border-indigo-100">
                   {idx + 1}
                </div>
                <div className="flex-1 w-full pt-1 text-right overflow-hidden">
                   <div className="flex items-start gap-2 justify-between">
                     <div className="prose max-w-none text-xl font-bold text-slate-800 leading-relaxed w-full" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
                     {q.is_required && <span className="text-rose-500 text-2xl font-black mt-1 shrink-0" title="مطلوب">*</span>}
                   </div>
                   
                   {showModelAnswer && modelAnswerText && (
                     <div className="mt-5 p-5 bg-emerald-50/80 text-emerald-900 rounded-2xl border border-emerald-200 text-base font-bold shadow-sm" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
                   )}

                   {q.media_url && <img src={q.media_url} className="mt-5 max-h-80 rounded-2xl border border-slate-200 shadow-md" alt="صورة توضيحية" /> }
                   
                   {renderQuestionInput(q)}
                </div>
             </div>
             {errors[q.id] && (
               <div className="mt-5 flex items-center gap-2 text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100 text-sm font-bold shadow-sm animate-in fade-in">
                 <AlertCircle className="h-5 w-5 shrink-0" /> <span>{errors[q.id]}</span>
               </div>
             )}
          </div>
        );
      })}
      
      {children}

      {!readOnly && (
        <div className="pt-10">
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-3 rounded-[2rem] bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-5 text-lg font-black text-white shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_35px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none">
            {isSubmitting ? <div className="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="h-6 w-6" />}
            {isSubmitting ? 'جاري التشفير والإرسال...' : 'تأكيد وإرسال الواجب النهائي'}
          </button>
        </div>
      )}
    </form>
  );
}
