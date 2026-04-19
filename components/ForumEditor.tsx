'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table, 
  Heading1, Heading2, TerminalSquare, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Palette, Type, X, Calculator, BarChart3, FileText, Files, Check, ShieldCheck, ShieldAlert
} from 'lucide-react';

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';
import { cn } from '@/lib/utils';

interface ForumEditorProps {
  content: string;
  setContent: (content: string) => void;
  canUploadImage: boolean;
  placeholder?: string;
  minHeight?: string;
}

export default function ForumEditor({ 
  content, 
  setContent, 
  canUploadImage, 
  placeholder = "اكتب رسالتك أو مقالك هنا...",
  minHeight = "120px"
}: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null); 
  
  const [isUploading, setIsUploading] = useState(false);
  
  // حالات معالجة الـ PDF
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('منصة الرفعة الرقمية');

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showMathUI, setShowMathUI] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // حالة معادلة الـ LaTeX
  const [latexInput, setLatexInput] = useState('');
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (!document.getElementById('pdfjs-script')) {
      const script = document.createElement('script');
      script.id = 'pdfjs-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      };
      document.head.appendChild(script);
    }
  }, []);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0);
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelection.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection.current);
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = content || '';
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  const addLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        editorRef.current?.focus();
        restoreSelection(); 
        const imgHTML = `<br/><img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; height: auto; border-radius: 16px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);" /><br/>`;
        
        let inserted = false;
        try { inserted = document.execCommand('insertHTML', false, imgHTML); } catch(e) {}
        if (!inserted && editorRef.current) editorRef.current.innerHTML += imgHTML;
        if (editorRef.current) setContent(editorRef.current.innerHTML);
      }
    } catch (error) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  const executePdfProcessing = async () => {
    if (!pendingPdfFile) return;
    
    setShowWatermarkModal(false);
    const file = pendingPdfFile;

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      alert("جاري تحميل مكتبة قراءة الملفات، يرجى المحاولة بعد قليل...");
      return;
    }

    setIsProcessingPdf(true);
    setPdfProgressText("جاري تهيئة الملف وقراءة الصفحات...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const imageUrls: string[] = [];
      const blobs: Blob[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setPdfProgressText(`جاري تحويل الصفحة ${pageNum} من ${totalPages} ${applyWatermark ? 'وطباعة العلامة المائية' : ''}...`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); 
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        if (applyWatermark && watermarkText.trim() !== '') {
          ctx.save();
          ctx.globalAlpha = 0.20; 
          const fontSize = Math.floor(canvas.width / 12);
          ctx.font = `bold ${fontSize}px Arial, sans-serif`; 
          ctx.fillStyle = "#6366f1"; 
          
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4); 
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore(); 
        }

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8)); 
        if (blob) blobs.push(blob);
      }

      for (let i = 0; i < blobs.length; i++) {
         setPdfProgressText(`جاري الرفع الآمن للصفحة ${i + 1} من ${blobs.length}...`);
         const formData = new FormData();
         formData.append('file', blobs[i]);
         formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
         
         const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
           method: 'POST', body: formData
         });
         const data = await res.json();
         if (data.secure_url) imageUrls.push(data.secure_url);
      }

      setPdfProgressText("جاري الترتيب النهائي وإدراج الصفحات...");
      
      let htmlToInsert = '<br/>';
      imageUrls.forEach((url, idx) => {
         htmlToInsert += `<div style="text-align: center; margin-bottom: 24px;">
            <img src="${url}" alt="صفحة ${idx + 1}" style="max-width: 100%; height: auto; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
         </div>`;
      });
      htmlToInsert += '<br/>';

      if (editorRef.current) {
        editorRef.current.focus();
        let inserted = false;
        try {
          if (savedSelection.current) {
            restoreSelection();
            inserted = document.execCommand('insertHTML', false, htmlToInsert);
          }
        } catch(e) {}
        if (!inserted) editorRef.current.innerHTML += htmlToInsert;
        setContent(editorRef.current.innerHTML);
      }

    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء معالجة ملف الـ PDF. يرجى التأكد من أن الملف سليم.");
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressText("");
      setPendingPdfFile(null); 
    }
  };

  const handleCancelPdf = () => {
    setShowWatermarkModal(false);
    setPendingPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    saveSelection(); 
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 && canUploadImage) {
        e.preventDefault(); 
        const file = items[i].getAsFile();
        if (file) await uploadImageFile(file);
        return; 
      }
    }
  };

  const insertTable = () => {
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;"><tbody><tr><td style="border: 1px solid rgba(255,255,255,0.1); padding: 12px; background: rgba(2,4,10,0.4); font-weight: bold; color: white;">عنوان 1</td><td style="border: 1px solid rgba(255,255,255,0.1); padding: 12px; background: rgba(2,4,10,0.4); font-weight: bold; color: white;">عنوان 2</td></tr><tr><td style="border: 1px solid rgba(255,255,255,0.1); padding: 12px; color: #cbd5e1;">خلية 1</td><td style="border: 1px solid rgba(255,255,255,0.1); padding: 12px; color: #cbd5e1;">خلية 2</td></tr></tbody></table><br/>`;
    execCommand('insertHTML', tableHTML);
  };

  const insertMathSymbol = (symbol: string) => {
     execCommand('insertHTML', `&nbsp;<span style="background: rgba(99,102,241,0.1); padding: 2px 6px; border-radius: 6px; font-family: monospace; color: #818cf8; font-weight: bold; border: 1px solid rgba(99,102,241,0.2);" dir="ltr">${symbol}</span>&nbsp;`);
  };

  const ToolbarButton = ({ icon: Icon, onClick, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
      className="p-2 rounded-lg transition-all bg-transparent text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400 active:scale-95"
      title={title}
    >
      <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-transparent font-sans relative" dir="rtl">
      
      {showWatermarkModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#02040a]/80 backdrop-blur-md p-4">
           <div className="bg-[#0f1423] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-6">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-500/20"><ShieldCheck className="h-6 w-6" /></div>
                 <div>
                   <h3 className="text-xl font-black text-white">حماية الملف (اختياري)</h3>
                   <p className="text-xs font-bold text-slate-400 mt-1">هل تريد إضافة علامة مائية لصور الـ PDF؟</p>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-3">
                  <button onClick={() => setApplyWatermark(true)} className={`flex-1 py-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${applyWatermark ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-inner' : 'border-white/5 bg-[#02040a] text-slate-400 hover:border-white/20'}`}>
                    <Check className="w-4 h-4" /> نعم، أضف علامة
                  </button>
                  <button onClick={() => setApplyWatermark(false)} className={`flex-1 py-3 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${!applyWatermark ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-inner' : 'border-white/5 bg-[#02040a] text-slate-400 hover:border-white/20'}`}>
                    <X className="w-4 h-4" /> لا، بدون علامة
                  </button>
                </div>

                {applyWatermark && (
                  <div className="animate-in fade-in slide-in-from-top-2 bg-[#02040a]/60 p-4 rounded-2xl border border-white/5 shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">اكتب نص العلامة المائية:</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={(e) => setWatermarkText(e.target.value)} 
                      placeholder="أ. محمد (فيزياء)" 
                      className="w-full bg-[#0f1423] border border-white/5 rounded-xl px-4 py-3 font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-center shadow-inner"
                    />
                    <p className="text-[9px] text-slate-500 mt-3 text-center font-bold leading-relaxed">ستتم طباعتها بشكل شفاف ومائل في منتصف كل صفحة لضمان عدم تشويه المسائل.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
                <button onClick={handleCancelPdf} className="px-6 py-3 rounded-xl font-black text-slate-400 bg-[#02040a] border border-white/5 hover:bg-white/5 transition-all text-xs">
                  إلغاء الأمر
                </button>
                <button onClick={executePdfProcessing} className="flex-1 px-6 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400/50 transition-all active:scale-95 text-xs flex items-center justify-center gap-2">
                  <Files className="w-4 h-4" /> ابدأ معالجة الملف
                </button>
              </div>
           </div>
        </div>
      )}

      {/* 🚀 شريط الأدوات العلوي المظلم */}
      <div className="bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 p-1.5 sm:p-2 flex flex-wrap items-center gap-0.5 sm:gap-1 sticky top-0 z-20 shrink-0">
        
        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="مائل" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="تسطير" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
          <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'H3')} title="عنوان كبير" />
          <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'H4')} title="عنوان متوسط" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="يمين" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="وسط" />
          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="يسار" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1 relative">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowColorPicker(!showColorPicker); setShowFontSize(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-2 rounded-lg transition-colors ${showColorPicker ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-indigo-400'}`} title="لون النص">
            <Palette className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full mt-2 right-0 bg-[#0f1423] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-3 flex flex-wrap gap-2 z-50 w-48">
              {['#ffffff', '#94a3b8', '#ef4444', '#f97316', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'].map(color => (
                <button key={color} onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color); setShowColorPicker(false); }} className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-inner" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontSize(!showFontSize); setShowColorPicker(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-2 rounded-lg transition-colors ${showFontSize ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-indigo-400'}`} title="حجم الخط">
            <Type className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {showFontSize && (
            <div className="absolute top-full mt-2 right-0 bg-[#0f1423] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-2 flex flex-col z-50 w-32">
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '2'); setShowFontSize(false); }} className="px-3 py-2 text-sm text-right hover:bg-white/5 text-slate-300 rounded-lg font-bold transition-colors">صغير</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '3'); setShowFontSize(false); }} className="px-3 py-2 text-base text-right hover:bg-white/5 text-slate-300 rounded-lg font-bold transition-colors">عادي</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '5'); setShowFontSize(false); }} className="px-3 py-2 text-lg text-right hover:bg-white/5 text-white rounded-lg font-black transition-colors">كبير</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '7'); setShowFontSize(false); }} className="px-3 py-2 text-2xl text-right hover:bg-white/5 text-white rounded-lg font-black transition-colors">ضخم</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1 relative">
          <ToolbarButton icon={LinkIcon} onClick={() => { saveSelection(); setShowLinkInput(!showLinkInput); setShowMathUI(false); setShowColorPicker(false); setShowFontSize(false); }} title="إضافة رابط" />
          <ToolbarButton icon={Table} onClick={insertTable} title="إدراج جدول" />
          
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowMathUI(!showMathUI); setShowLinkInput(false); setShowColorPicker(false); setShowFontSize(false); }} className={`p-2 rounded-lg transition-colors ${showMathUI ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:bg-white/5 hover:text-pink-400'}`} title="كتابة معادلات رياضية">
            <Calculator className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {showLinkInput && (
             <div className="absolute top-full mt-2 right-0 bg-[#0f1423] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-3 flex gap-2 z-50 w-72">
                <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addLink(); } }} className="flex-1 bg-[#02040a]/60 border border-white/5 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 font-bold text-left text-white placeholder:text-slate-600 shadow-inner" dir="ltr" />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-500 transition-colors shadow-inner">إدراج</button>
             </div>
          )}

          {/* 🚀 لوحة الـ LaTeX الملكية */}
          {showMathUI && (
            <div className="absolute top-full mt-2 right-0 bg-[#0f1423] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-[2rem] p-5 z-50 w-[320px] sm:w-[400px] animate-in fade-in zoom-in-95" dir="rtl">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                <span className="font-black text-sm text-pink-400 flex items-center gap-2 drop-shadow-sm">
                  <Calculator className="w-4 h-4 sm:w-5 sm:h-5"/> إدراج معادلة (LaTeX)
                </span>
                <button onMouseDown={(e) => { e.preventDefault(); setShowMathUI(false); }} className="text-slate-400 hover:text-white bg-[#02040a] border border-white/5 hover:bg-rose-500/20 rounded-xl p-1.5 transition-all shadow-inner"><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">رموز سريعة:</p>
                  <div className="grid grid-cols-6 gap-2" dir="ltr">
                    {['½','¾','√','∛','x²','x³','π','∞','∑','∫','≠','≈'].map(sym => (
                      <button key={sym} onMouseDown={(e) => { e.preventDefault(); insertMathSymbol(sym); }} className="p-2 border border-white/5 bg-[#02040a]/60 rounded-xl hover:bg-pink-500/20 hover:border-pink-500/40 hover:text-pink-400 font-mono font-bold text-slate-300 transition-all shadow-inner">{sym}</button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                   <label className="block text-[10px] sm:text-xs font-black text-slate-400 mb-2 pl-1">اكتب المعادلة بصيغة LaTeX:</label>
                   <textarea
                      value={latexInput}
                      onChange={(e) => setLatexInput(e.target.value)}
                      placeholder="\frac{1}{2} mv^2"
                      className="w-full bg-[#02040a]/80 border border-white/5 rounded-2xl p-4 font-mono text-left focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none text-xs sm:text-sm font-bold text-pink-100 transition-all shadow-inner custom-scrollbar"
                      dir="ltr"
                      rows={2}
                   />
                </div>

                {latexInput && (
                   <div className="bg-[#02040a] border border-white/5 rounded-2xl p-4 flex justify-center overflow-x-auto min-h-[60px] items-center text-white shadow-inner custom-scrollbar">
                       <Latex>{`$${latexInput}$`}</Latex>
                   </div>
                )}

                <button
                   type="button"
                   onMouseDown={(e) => {
                      e.preventDefault();
                      if(latexInput.trim()) {
                         execCommand('insertText', ` $${latexInput}$ `);
                         setLatexInput('');
                         setShowMathUI(false);
                      }
                   }}
                   className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)] border border-pink-400/50 flex items-center justify-center gap-2"
                >
                   إدراج المعادلة في النص <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="إزالة التنسيق" />

        {canUploadImage && (
          <div className="mr-auto flex flex-wrap items-center gap-2 pr-1 sm:pr-2">
             <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async(e) => { const file = e.target.files?.[0]; if(file) await uploadImageFile(file); if(fileInputRef.current) fileInputRef.current.value = ''; }} />
             <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={(e) => { 
                const file = e.target.files?.[0]; 
                if(file) {
                  setPendingPdfFile(file);
                  setShowWatermarkModal(true);
                }
             }} />
             
             <button type="button" disabled={isUploading || isProcessingPdf} onMouseDown={(e) => { e.preventDefault(); saveSelection(); fileInputRef.current?.click(); }} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#02040a]/80 text-slate-300 font-bold text-[10px] sm:text-xs border border-white/5 hover:bg-white/5 transition-colors disabled:opacity-50 shadow-inner">
               <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
               <span className="hidden sm:inline">صورة</span>
             </button>

             <button type="button" disabled={isUploading || isProcessingPdf} onMouseDown={(e) => { e.preventDefault(); saveSelection(); pdfInputRef.current?.click(); }} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-300 font-bold text-[10px] sm:text-xs border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 shadow-inner" title="استخراج الصفحات من ملف PDF كصور">
               <Files className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
               <span className="hidden sm:inline">من PDF</span>
             </button>
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
        {(isUploading || isProcessingPdf) && (
          <div className="absolute inset-0 bg-[#02040a]/60 backdrop-blur-md flex items-center justify-center z-20">
             <div className="bg-[#0f1423] px-6 sm:px-8 py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-indigo-500/30 flex flex-col items-center justify-center gap-3 sm:gap-4 font-black text-xs sm:text-sm text-indigo-400 max-w-[80%] text-center">
               <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" /> 
               <span>{isProcessingPdf ? pdfProgressText : 'جاري الرفع الآمن...'}</span>
             </div>
          </div>
        )}
        
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={saveSelection} 
          className="flex-1 w-full overflow-y-auto p-4 sm:p-5 lg:p-6 outline-none prose prose-invert max-w-none text-slate-200 leading-relaxed sm:leading-loose text-sm sm:text-base custom-scrollbar"
          style={{ minHeight, WebkitUserModify: 'read-write' } as any}
          data-placeholder={placeholder}
          dir="auto"
        />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #475569; pointer-events: none; display: block; font-weight: 700; }
        [contenteditable]:focus:empty:before { opacity: 0.5; }
        .prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; background: rgba(2, 4, 10, 0.4); border-radius: 12px; overflow: hidden; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); border: 1px solid rgba(255,255,255,0.05); }
        .prose td, .prose th { border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; vertical-align: top; color: #cbd5e1; }
        .prose img { display: inline-block; max-width: 100%; height: auto; border-radius: 16px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .prose a { color: #818cf8; text-decoration: underline; font-weight: 900; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
}
