'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns, UploadCloud, Circle, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';

interface AssignmentFormProps {
  questions: any[];
  onSubmit: (answers: Record<string, any>) => void;
  onChange?: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
  initialAnswers?: Record<string, any>;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function AssignmentForm({ 
  questions, 
  onSubmit, 
  onChange,
  isSubmitting, 
  initialAnswers = {}, 
  readOnly = false, 
  children 
}: AssignmentFormProps) {
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

  const handleComparisonGridChange = (questionId: string, rowIndex: number, colIndex: number, value: string) => {
     if (readOnly) return;
     try {
       const currentGrid = answers[questionId] ? JSON.parse(answers[questionId]) : [];
       while (currentGrid.length <= rowIndex) currentGrid.push(["", ""]);
       currentGrid[rowIndex][colIndex] = value;
       handleAnswerChange(questionId, JSON.stringify(currentGrid));
     } catch(e) {
       const newGrid = [];
       for(let i=0; i<=rowIndex; i++) newGrid.push(["", ""]);
       newGrid[rowIndex][colIndex] = value;
       handleAnswerChange(questionId, JSON.stringify(newGrid));
     }
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
      return (
        <div className="space-y-3 mt-4">
          {q.options?.map((opt: any, idx: number) => {
            const optContent = opt.content || opt;
            const optId = opt.id || optContent;
            const isSelected = ans === optId || ans === optContent;
            
            return (
              <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-indigo-300'}`}>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>
                   {isSelected && <Circle className="h-2.5 w-2.5 fill-current" />}
                </div>
                <input type="radio" className="hidden" disabled={readOnly} checked={isSelected} onChange={() => handleAnswerChange(q.id, optId)} />
                <span className={`font-bold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{optContent}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === 'checkbox' || q.type === 'multi_select') {
      const selectedArray = Array.isArray(ans) ? ans : [];
      return (
        <div className="space-y-3 mt-4">
          {q.options?.map((opt: any, idx: number) => {
            const optContent = opt.content || opt;
            const optId = opt.id || optContent;
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
                <span className={`font-bold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{optContent}</span>
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
               ans ? (
                  <img src={ans} className="max-h-64 rounded-lg object-contain mx-auto" alt="مرفق الطالب" />
               ) : (
                  <p className="text-slate-400 italic text-center py-4 font-bold">لم تقم بإرفاق ملف</p>
               )
             ) : (
               <ImageUpload 
                 initialImageUrl={ans || ''} 
                 onUploadSuccess={(url) => handleAnswerChange(q.id, url)} 
                 label="انقر أو اسحب صورة ورقة الحل هنا" 
               />
             )}
           </div>
         </div>
       );
    }

    if (q.type === 'comparison') {
        const aspects = q.options?.slice(2) || [];
        const party1 = q.options?.[0] || 'الطرف الأول';
        const party2 = q.options?.[1] || 'الطرف الثاني';
        const parsedAns = Array.isArray(ans) ? ans : [];

        return (
          <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-indigo-50">
                    <th className="p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-sm w-1/3">وجه المقارنة</th>
                    <th className="p-4 border-b border-l border-slate-200 font-black text-indigo-900 text-sm text-center w-1/3">{party1}</th>
                    <th className="p-4 border-b border-slate-200 font-black text-indigo-900 text-sm text-center w-1/3">{party2}</th>
                  </tr>
                </thead>
                <tbody>
                  {aspects.map((aspect: string, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 border-b border-l border-slate-200 font-bold text-slate-700 bg-slate-50 align-top leading-relaxed">
                         <div dangerouslySetInnerHTML={{__html: aspect}} className="prose max-w-none text-slate-700 font-bold" />
                      </td>
                      <td className="p-4 border-b border-l border-slate-200 align-top">
                         <textarea 
                           disabled={readOnly}
                           rows={2}
                           placeholder="أدخل إجابتك..."
                           value={parsedAns[idx]?.[0] || ''}
                           onChange={(e) => {
                             const newAns = [...parsedAns];
                             if (!newAns[idx]) newAns[idx] = ['', ''];
                             newAns[idx][0] = e.target.value;
                             handleAnswerChange(q.id, newAns);
                           }}
                           className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-300"
                         />
                      </td>
                      <td className="p-4 border-b border-slate-200 align-top">
                         <textarea 
                           disabled={readOnly}
                           rows={2}
                           placeholder="أدخل إجابتك..."
                           value={parsedAns[idx]?.[1] || ''}
                           onChange={(e) => {
                             const newAns = [...parsedAns];
                             if (!newAns[idx]) newAns[idx] = ['', ''];
                             newAns[idx][1] = e.target.value;
                             handleAnswerChange(q.id, newAns);
                           }}
                           className="w-full bg-transparent border-0 focus:ring-0 p-0 text-slate-900 font-bold resize-none outline-none placeholder:text-slate-300"
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
        className="mt-4 block w-full rounded-2xl border-0 py-4 px-5 text-slate-900 bg-slate-50 ring-1 ring-inset ring-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-600 sm:text-lg font-bold transition-all resize-y disabled:opacity-70 disabled:bg-slate-100 outline-none leading-relaxed"
        value={ans || ''}
        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {questions.map((q, idx) => {
        const isHeader = q.type === 'section_header';
        
        if (isHeader) {
          return (
            <div key={q.id} className="pt-8 pb-2 border-b-2 border-indigo-100">
               <div 
                 className="prose max-w-none text-2xl font-black text-indigo-900 leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: q.content || q.text || q.question_text || '' }} 
               />
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
                <div className="flex-1 pt-2">
                   <div className="flex items-start gap-1">
                     <div 
                       className="prose max-w-none text-xl font-bold text-slate-800 leading-relaxed"
                       dangerouslySetInnerHTML={{ __html: q.content || q.text || q.question_text || '' }} 
                     />
                     {q.is_required && <span className="text-rose-500 text-xl font-black mt-1">*</span>}
                   </div>
                   
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
