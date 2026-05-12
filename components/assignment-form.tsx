'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Send, Columns, UploadCloud, Circle, Square, X, Loader2, Image as ImageIcon, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
// استدعاء مكون رفع الصور المستقل
import ImageUpload from '@/components/ImageUpload';
import imageCompression from 'browser-image-compression';

// استيراد مكتبات المعادلات الرياضية
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { cn } from '@/lib/utils';

// =========================================================================
// 🧮 محرك تنسيق المعادلات والجداول (Gemini Dark Format Engine)
// =========================================================================
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   
   let html = String(content)
     .replace(/\\\\n/g, '<br/>')
     .replace(/\\n/g, '<br/>')
     .replace(/\\r\\n/g, '<br/>')
     .replace(/\n/g, '<br/>')
     .replace(/\\\$/g, '$'); 
     
   // تحويل الـ LaTeX إلى توهج فضائي يناسب الوضع الليلي
   html = html.replace(/\$\$?([\s\S]*?)\$\$?/g, (match, mathContent) => {
       return `<span class="math-tex text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-lg font-mono font-bold mx-1 inline-block max-w-full break-words whitespace-pre-wrap shadow-inner backdrop-blur-sm" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">\\(${mathContent}\\)</span>`;
   });

   // تنسيق الجداول الزجاجية الشفافة
   html = html.replace(/<table/g, '<div class="table-responsive-wrapper"><table class="w-full text-right border-collapse my-4 min-w-[600px] border border-white/10 rounded-xl overflow-hidden shadow-sm"');
   html = html.replace(/<\/table>/g, '</table></div>');
   html = html.replace(/<th/g, '<th class="bg-indigo-500/20 backdrop-blur-md p-4 border border-white/10 font-black text-indigo-300 text-sm"');
   html = html.replace(/<td/g, '<td class="p-4 border border-white/10 bg-[#02040a]/40 text-slate-200 font-bold backdrop-blur-sm"');
   
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
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1280, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST', body: formData,
        });

        const data = await res.json();
        if (data.secure_url) uploadedUrls.push(data.secure_url);
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
    <div className="bg-black/30 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-inner mt-5">
      <div className="space-y-6">
        
        {/* مساحة وصف المشروع */}
        <div>
          <label className="text-sm font-black text-indigo-300 mb-3 flex items-center gap-2 drop-shadow-sm">
            <FileText className="w-5 h-5 text-indigo-400" /> وصف المشروع، أبحاثك، والملاحظات (اختياري)
          </label>
          <textarea
            disabled={readOnly}
            rows={4}
            value={text}
            onChange={handleTextChange}
            placeholder="اكتب تفاصيل بحثك، أو إجاباتك النظرية هنا..."
            className="glass-input w-full p-4 resize-none disabled:opacity-70"
          />
        </div>

        {/* مساحة إرفاق صور المشروع */}
        <div>
          <label className="text-sm font-black text-indigo-300 mb-3 flex items-center gap-2 drop-shadow-sm">
            <ImageIcon className="w-5 h-5 text-indigo-400" /> مرفقات المشروع المرئية (حد أقصى 8 صور)
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg group bg-[#02040a]">
                <img src={img} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover" />
                {!readOnly && (
                  <button type="button" onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500/80 backdrop-blur-md text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.5)]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {!readOnly && images.length < 8 && (
              <label className={cn("aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all shadow-inner backdrop-blur-md", isUploading ? "border-indigo-500/50 bg-indigo-500/10" : "border-white/20 bg-white/5 hover:border-indigo-400/50 hover:bg-indigo-500/10")}>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2 drop-shadow-sm" />
                    <span className="text-xs font-bold text-slate-300 text-center px-2">إضافة صور<br/>({8 - images.length} متبقية)</span>
                  </>
                )}
              </label>
            )}
          </div>
          <p className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 backdrop-blur-sm p-3 rounded-xl border border-emerald-500/20 inline-flex items-center gap-2 w-full shadow-inner">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            النظام يدعم ضغط الصور تلقائياً للحفاظ على باقة الإنترنت لديك.
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 📝 المكون الرئيسي: واجهة الإجابة عن الواجبات (Assignment Form)
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

  // ==========================================
  // 🖼️ العارض الذكي للمرفقات (Smart Media Renderer - Glassy)
  // ==========================================
  const renderSmartMedia = (url: string) => {
    if (!url) return null;
    const isPdf = url.toLowerCase().includes('.pdf');

    if (isPdf) {
      const downloadUrl = (url.includes('cloudinary.com') && url.includes('/upload/'))
        ? url.replace('/upload/', '/upload/fl_attachment/')
        : url;

      return (
        <div className="mt-6 glass-panel border-indigo-500/30 overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.1)] p-8 flex flex-col items-center justify-center text-center gap-4 relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none mix-blend-screen group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 p-5 bg-indigo-500/20 text-indigo-400 rounded-full shadow-inner border border-indigo-500/30 group-hover:scale-110 transition-transform">
            <FileText className="w-12 h-12 drop-shadow-md" />
          </div>
          <div className="relative z-10">
            <p className="font-black text-indigo-300 text-xl drop-shadow-md">ملف تعليمات المشروع (PDF)</p>
            <p className="text-sm font-bold text-slate-300 mt-2 max-w-sm mx-auto">انقر على الزر أدناه لتنزيل الملف مباشرة إلى جهازك وقراءته بوضوح.</p>
          </div>
          <a href={downloadUrl} download target="_blank" rel="noopener noreferrer" className="relative z-10 mt-4 px-8 py-4 bg-indigo-600/80 backdrop-blur-md hover:bg-indigo-500 text-white font-black text-base rounded-2xl transition-all shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 flex items-center gap-3 border border-indigo-400/50">
            <Download className="w-5 h-5 animate-bounce" /> تحميل الملف الآن
          </a>
        </div>
      );
    }

    return <img src={url} className="mt-6 max-h-[500px] w-auto rounded-[1.5rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] object-contain" alt="توضيح المرفق" />;
  };

  // ==========================================
  // 🧩 مولد أنواع الأسئلة (Gemini Styled Inputs)
  // ==========================================
  const renderQuestionInput = (q: any) => {
    const ans = answers[q.id];

    if (q.type === 'project_submission') {
      let projectData = { text: '', images: [] };
      if (ans && typeof ans === 'string') {
        try { projectData = JSON.parse(ans); } catch(e) { projectData.text = ans; }
      } else if (ans && typeof ans === 'object') {
        projectData = ans;
      }
      return <ProjectSubmissionComponent initialData={projectData} readOnly={readOnly} onChange={(data) => handleAnswerChange(q.id, JSON.stringify(data))} />;
    }

    if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'radio') {
      const safeOptions = q.options && Array.isArray(q.options) && q.options.length > 0 
          ? q.options 
          : (q.type === 'true_false' ? ['صح', 'خطأ'] : []);

      return (
        <div className="space-y-3 mt-6">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : String(opt.id || optContent);
            const isSelected = String(ans) === optId || String(ans) === optContent;
            
            return (
              <label key={idx} className={cn("flex items-center gap-4 p-5 rounded-[1.5rem] cursor-pointer transition-all duration-300 border-2 shadow-inner backdrop-blur-sm group", isSelected ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-[#02040a]/40 hover:border-indigo-500/30 hover:bg-[#02040a]/60')}>
                <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors shadow-inner", isSelected ? 'border-indigo-400 bg-indigo-500 text-[#02040a]' : 'border-white/20 bg-black/40')}>
                   {isSelected && <Circle className="h-2.5 w-2.5 fill-current" />}
                </div>
                <input type="radio" className="hidden" disabled={readOnly} checked={isSelected} onChange={() => handleAnswerChange(q.id, optId)} />
                <span className={cn("font-bold text-lg w-full block transition-colors", isSelected ? 'text-indigo-300 drop-shadow-sm' : 'text-slate-300 group-hover:text-white')} dangerouslySetInnerHTML={renderContentWithMath(optContent)} />
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
        <div className="space-y-3 mt-6">
          {safeOptions.map((opt: any, idx: number) => {
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optId = typeof opt === 'string' ? opt : String(opt.id || optContent);
            const isSelected = selectedArray.includes(optId) || selectedArray.includes(optContent);
            
            return (
              <label key={idx} className={cn("flex items-center gap-4 p-5 rounded-[1.5rem] cursor-pointer transition-all duration-300 border-2 shadow-inner backdrop-blur-sm group", isSelected ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-white/5 bg-[#02040a]/40 hover:border-indigo-500/30 hover:bg-[#02040a]/60')}>
                <div className={cn("h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors shadow-inner", isSelected ? 'border-indigo-400 bg-indigo-500 text-[#02040a]' : 'border-white/20 bg-black/40')}>
                   {isSelected && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <input type="checkbox" className="hidden" disabled={readOnly} checked={isSelected} onChange={() => {
                   if (readOnly) return;
                   const newArr = isSelected ? selectedArray.filter((i: string) => i !== optId && i !== optContent) : [...selectedArray, optId];
                   handleAnswerChange(q.id, newArr);
                }} />
                <span className={cn("font-bold text-lg w-full block transition-colors", isSelected ? 'text-indigo-300 drop-shadow-sm' : 'text-slate-300 group-hover:text-white')} dangerouslySetInnerHTML={renderContentWithMath(optContent)} />
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === 'file_upload') {
       return (
         <div className="mt-6 bg-[#02040a]/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-inner">
           <label className="block text-base font-black text-slate-300 mb-4 flex items-center gap-2 drop-shadow-sm">
             <UploadCloud className="h-6 w-6 text-indigo-400" /> إرفاق صورة الحل:
           </label>
           <div className="bg-white/5 p-3 rounded-2xl border border-white/10 shadow-inner">
             {readOnly ? (
               ans ? <img src={ans} className="max-h-64 rounded-xl object-contain mx-auto shadow-md" alt="مرفق الطالب" /> : <p className="text-slate-400 italic text-center py-6 font-bold">لم يتم إرفاق ملف</p>
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
        <div className="mt-6 glass-panel rounded-[1.5rem] overflow-hidden shadow-lg p-1">
          <div className="table-responsive-wrapper">
            <table className="w-full text-right border-collapse min-w-[600px] m-0 rounded-[1rem] overflow-hidden">
              <thead>
                <tr className="bg-indigo-500/20 backdrop-blur-md border-b border-white/10">
                  {tableData.headers?.map((h: string, i: number) => (
                    <th key={i} className="p-4 border-l border-white/10 font-black text-indigo-300 text-sm text-center last:border-l-0">
                      <div dangerouslySetInnerHTML={renderContentWithMath(h)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows?.map((row: string[], rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 bg-[#02040a]/40">
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className={cn("p-3 border-l border-white/5 align-middle text-center last:border-l-0", cIdx === 0 ? 'bg-white/5 font-bold text-slate-300' : 'bg-transparent')}>
                        {cIdx === 0 ? (
                          <div className="prose max-w-none text-slate-200 font-bold text-center" dangerouslySetInnerHTML={renderContentWithMath(cell)} />
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
                            className="glass-input w-full p-2 text-center text-sm resize-none" 
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
          <div className="mt-6 glass-panel rounded-[1.5rem] overflow-hidden shadow-lg p-1">
            <div className="table-responsive-wrapper">
              <table className="w-full text-right border-collapse min-w-[600px] m-0 rounded-[1rem] overflow-hidden">
                <thead>
                  <tr className="bg-indigo-500/20 backdrop-blur-md border-b border-white/10">
                    <th className="p-4 border-l border-white/10 font-black text-indigo-300 text-sm w-1/3 text-center">وجه المقارنة</th>
                    <th className="p-4 border-b border-l border-white/10 font-black text-indigo-300 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party1)} /></th>
                    <th className="p-4 font-black text-indigo-300 text-sm text-center w-1/3"><div dangerouslySetInnerHTML={renderContentWithMath(party2)} /></th>
                  </tr>
                </thead>
                <tbody>
                  {aspects.map((aspect: string, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 bg-[#02040a]/40">
                      <td className="p-4 border-l border-white/5 font-bold text-slate-200 bg-white/5 align-middle leading-relaxed text-center">
                         <div className="prose max-w-none text-slate-200 font-bold" dangerouslySetInnerHTML={renderContentWithMath(aspect)} />
                      </td>
                      <td className="p-3 border-l border-white/5 align-top bg-transparent">
                         <textarea 
                           disabled={readOnly} rows={3} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[0] || ''} 
                           onChange={(e) => { 
                             const newAns = parsedAns.map(arr => Array.isArray(arr) ? [...arr] : ['', '']); 
                             if (!newAns[idx]) newAns[idx] = ['', '']; 
                             newAns[idx][0] = e.target.value; 
                             handleAnswerChange(q.id, newAns); 
                           }} 
                           className="glass-input w-full p-3 resize-none" 
                         />
                      </td>
                      <td className="p-3 align-top bg-transparent">
                         <textarea 
                           disabled={readOnly} rows={3} placeholder="أدخل إجابتك..." value={parsedAns[idx]?.[1] || ''} 
                           onChange={(e) => { 
                             const newAns = parsedAns.map(arr => Array.isArray(arr) ? [...arr] : ['', '']); 
                             if (!newAns[idx]) newAns[idx] = ['', '']; 
                             newAns[idx][1] = e.target.value; 
                             handleAnswerChange(q.id, newAns); 
                           }} 
                           className="glass-input w-full p-3 resize-none" 
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
        className="glass-input mt-6 w-full p-5 sm:text-lg resize-y leading-relaxed disabled:opacity-70"
        value={ans || ''}
        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
      />
    );
  };

  // ==========================================
  // 🎨 الواجهة الرئيسية للنموذج
  // ==========================================
  return (
    <form id="assignment-form-container" onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      
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

        // 🖼️ إذا كان العنصر عبارة عن (عنوان) فقط
        if (isHeader) {
          return (
            <div key={q.id} className="pt-10 pb-4 border-b border-indigo-500/30 mb-8">
               <div className="prose max-w-none text-2xl sm:text-3xl font-black text-indigo-300 leading-relaxed text-right drop-shadow-md" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
               {showModelAnswer && modelAnswerText && (
                 <div className="mt-4 p-5 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/30 text-base font-bold shadow-inner backdrop-blur-md" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
               )}
               {renderSmartMedia(q.media_url)}
            </div>
          );
        }

        // 📝 إذا كان العنصر عبارة عن (سؤال) 
        return (
          <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none mix-blend-screen opacity-50 transition-transform duration-700 group-hover:scale-150"></div>
             
             <div className="flex flex-col sm:flex-row gap-5 items-start relative z-10">
                <div className="shrink-0 w-14 h-14 rounded-[1.25rem] bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-2xl shadow-inner border border-indigo-500/30 drop-shadow-sm">
                   {idx + 1}
                </div>
                
                <div className="flex-1 w-full pt-1 text-right overflow-hidden">
                   <div className="flex items-start gap-2 justify-between">
                     <div className="prose max-w-none text-xl font-bold text-white leading-relaxed w-full drop-shadow-sm" dangerouslySetInnerHTML={renderContentWithMath(questionText)} />
                     {q.is_required && <span className="text-rose-500 text-2xl font-black mt-1 shrink-0 drop-shadow-md" title="مطلوب">*</span>}
                   </div>
                   
                   {showModelAnswer && modelAnswerText && (
                     <div className="mt-5 p-5 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/30 text-base font-bold shadow-inner backdrop-blur-md" dangerouslySetInnerHTML={renderContentWithMath(modelAnswerText)} />
                   )}

                   {renderSmartMedia(q.media_url)}
                   {renderQuestionInput(q)}
                </div>
             </div>
             
             {errors[q.id] && (
               <div className="mt-6 flex items-center gap-2 text-rose-300 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/30 text-sm font-bold shadow-inner backdrop-blur-sm relative z-10">
                 <AlertCircle className="h-5 w-5 shrink-0" /> <span>{errors[q.id]}</span>
               </div>
             )}
          </div>
        );
      })}
      
      {children}

      {/* 📤 زر الإرسال النهائي */}
      {!readOnly && (
        <div className="pt-10">
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-3 rounded-[2rem] bg-gradient-to-r from-indigo-500/80 to-blue-600/80 backdrop-blur-md border border-indigo-400/50 px-8 py-5 text-lg font-black text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="h-6 w-6 drop-shadow-md" />}
            {isSubmitting ? 'جاري التشفير والإرسال السحابي...' : 'تأكيد وإرسال الإجابات'}
          </button>
        </div>
      )}
    </form>
  );
}
