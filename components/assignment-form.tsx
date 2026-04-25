'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns, UploadCloud, Circle, Square, X, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUpload from '@/components/ImageUpload';
import imageCompression from 'browser-image-compression';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// 🚀 محرك تنسيق المعادلات والجداول للطالب
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   
   let html = String(content)
     .replace(/\\\\n/g, '<br/>')
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$'); 
     
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono font-bold mx-1 inline-block max-w-full break-words whitespace-pre-wrap shadow-sm" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   html = html.replace(/<table/g, '<div class="table-responsive-wrapper"><table class="w-full text-right border-collapse my-4 min-w-[600px] border border-slate-300 rounded-xl overflow-hidden shadow-sm"');
   html = html.replace(/<\/table>/g, '</table></div>');
   html = html.replace(/<th/g, '<th class="bg-indigo-50 p-4 border border-slate-300 font-black text-indigo-900 text-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-slate-300 bg-white text-slate-700 font-bold"');
   
   return { __html: html };
};

// =========================================================================
// 🚀 المكون الداخلي: تسليم المشاريع العلمية
// =========================================================================
interface ProjectSubmissionProps {
  initialData?: { text: string; images: string[] };
  onChange: (data: { text: string; images: string[] }) => void;
  readOnly?: boolean;
}

function ProjectSubmissionComponent({ initialData, onChange, readOnly }: ProjectSubmissionProps) {
  const [text, setText] = useState(initialData?.text || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onChange({ text: e.target.value, images });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      alert('عذراً، الحد الأقصى المسموح به هو 8 صور للمشروع الواحد.');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const options = {
          maxSizeMB: 0.2, 
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange({ text, images: newImages });

    } catch (error) {
      alert('حدث خطأ أثناء ضغط أو رفع الصور. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (readOnly) return;
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onChange({ text, images: newImages });
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-5">
      <div className="space-y-6">
        <div>
          <label className="text-sm font-black text-indigo-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> وصف المشروع، أبحاثك، والملاحظات (اختياري)
          </label>
          <textarea
            disabled={readOnly}
            rows={4}
            value={text}
            onChange={handleTextChange}
            placeholder="اكتب تفاصيل بحثك، أو إجاباتك النظرية هنا..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl p-4 text-slate-800 font-bold outline-none resize-none shadow-inner transition-all disabled:opacity-70"
          />
        </div>

        <div>
          <label className="text-sm font-black text-indigo-900 mb-3 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-500" /> مرفقات المشروع المرئية (حد أقصى 8 صور)
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group bg-slate-50">
                <img src={img} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover" />
                {!readOnly && (
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-md">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {!readOnly && images.length < 8 && (
              <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? "border-indigo-300 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"}`}>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-500 text-center px-2">إضافة صور<br/>({8 - images.length} متبقية)</span>
                  </>
                )}
              </label>
            )}
          </div>
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 inline-flex items-center gap-2 w-full shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            النظام يدعم ضغط الصور تلقائياً للحفاظ على باقة الإنترنت لديك.
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================================

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
        if (!ans || (Array.isArray(ans) && ans.length === 0) || (q.type === 'comparison' && ans === '[]') || (q.type === 'project_submission' && !ans)) {
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

  // 🚀 العارض الذكي للمرفقات (يفرق بين الـ PDF والصور)
  const renderSmartMedia = (url: string) => {
    if (!url) return null;
    const isPdf = url.toLowerCase().includes('.pdf');

    if (isPdf) {
      return (
        <div className="mt-6 rounded-3xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-slate-100 bg-slate-50 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0"><FileText className="w-6 h-6" /></div>
              <div>
                <p className="font-black text-slate-800 text-base">ملف PDF مرفق من المعلم</p>
                <p className="text-xs font-bold text-slate-500 mt-1">يحتوي على تعليمات المشروع أو المسألة</p>
              </div>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-sm active:scale-95 shrink-0">
              فتح الملف للتنزيل
            </a>
          </div>
          <iframe src={url} className="w-full h-[600px] border-none bg-slate-100" title="مرفق PDF" />
        </div>
      );
    }

    return <img src={url} className="mt-6 max-h-[500px] w-auto rounded-2xl border border-slate-200 shadow-md object-contain" alt="توضيح المرفق" />;
  };

  const renderQuestionInput = (q: any) => {
    const ans = answers[q.id];

    if (q.type === 'project_submission') {
      let projectData = { text: '', images: [] };
      if (ans && typeof ans === 'string') {
        try { projectData = JSON.parse(ans); } catch(e) { projectData.text = ans; }
      } else if (ans && typeof ans === 'object') {
        projectData = ans;
      }

      return (
        <ProjectSubmissionComponent 
          initialData={projectData}
          readOnly={readOnly}
          onChange={(data) => {
            handleAnswerChange(q.id, JSON.stringify(data));
          }}
        />
      );
    }

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
          <div className="table-responsive-wrapper">
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
            <div className="table-responsive-wrapper">
              <table className="w-full text-right border-collapse min-w-[600px] m-0">
                <thead>
                  <tr className="bg-indigo-50/80 border-b border-slate-200">
                    <th className="p-5 border-l border-slate-200 font-black text-indigo-950 text-base w-1/3">وجه المقارنة</th>
                    <th className="p-5 border-b border-l border-slate-200 font-black text-indigo-950 text-base text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party1)} /></th>
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
               {/* 🚀 هنا السحر: استدعاء العارض الذكي للمرفقات (صور أو PDF) */}
               {renderSmartMedia(q.media_url)}
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

                   {/* 🚀 استدعاء العارض الذكي في جسم السؤال أيضاً */}
                   {renderSmartMedia(q.media_url)}
                   
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
