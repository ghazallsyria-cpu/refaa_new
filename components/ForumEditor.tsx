'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table, 
  Heading1, Heading2, TerminalSquare, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Palette, Type, X, Calculator, BarChart3, FileText, Files, Check, ShieldCheck, ShieldAlert
} from 'lucide-react';

// استيراد دالة دمج الكلاسات بأمان
import { cn } from '@/lib/utils';

// استيراد مكتبة الرياضيات الشهيرة LaTeX لرسم المعادلات المعقدة
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// ==========================================
// 📦 تعريف خصائص المحرر (Props)
// ==========================================
interface ForumEditorProps {
  content: string; // المحتوى الحالي للمحرر (HTML String)
  setContent: (content: string) => void; // دالة تحديث المحتوى عند الكتابة
  canUploadImage: boolean; // هل يُسمح لهذا المستخدم برفع صور/ملفات؟
  placeholder?: string; // النص التوضيحي الذي يظهر عندما يكون المحرر فارغاً
  isCompact?: boolean; // خاصية تجعل المحرر مضغوطاً (صغيراً) ليناسب شاشات الدردشة (الرسائل)
}

export default function ForumEditor({ 
  content, 
  setContent, 
  canUploadImage, 
  placeholder = "اكتب مقالك الاحترافي هنا...",
  isCompact = false 
}: ForumEditorProps) {
  
  // ==========================================
  // 🎛️ المراجع (Refs) للوصول للعناصر بشكل مباشر
  // ==========================================
  const editorRef = useRef<HTMLDivElement>(null); // مرجع منطقة الكتابة (ContentEditable)
  const fileInputRef = useRef<HTMLInputElement>(null); // مرجع زر اختيار الصور الخفي
  const pdfInputRef = useRef<HTMLInputElement>(null); // مرجع زر اختيار الـ PDF الخفي
  const savedSelection = useRef<Range | null>(null); // مرجع لحفظ مكان المؤشر (Cursor) قبل فتح القوائم المنبثقة

  // ==========================================
  // ⚡ حالات المحرر (States)
  // ==========================================
  const [isUploading, setIsUploading] = useState(false); // حالة رفع الصور العادية
  
  // حالات معالجة الـ PDF (تقطيع الصفحات وتحويلها لصور)
  const [isProcessingPdf, setIsProcessingPdf] = useState(false); 
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  
  // حالات العلامة المائية للـ PDF (حماية حقوق المعلم)
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('منصة الرفعة الرقمية');

  // حالات فتح وإغلاق القوائم العائمة (Dropdowns) في شريط الأدوات
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showMathUI, setShowMathUI] = useState(false); // واجهة إدخال المعادلات
  const [linkUrl, setLinkUrl] = useState('');
  const [latexInput, setLatexInput] = useState('');

  // ==========================================
  // ⚙️ محرك قراءة الـ PDF (PDF.js)
  // تحميل المكتبة بشكل ديناميكي (Lazy Load) فقط عندما يفتح المستخدم المحرر
  // لتسريع تحميل الموقع بأكمله.
  // ==========================================
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

  // ==========================================
  // 🎯 التحكم في المؤشر (Cursor)
  // مشكلة شائعة في المحررات: عند النقر على لون، يفقد المؤشر مكانه في النص!
  // هذه الدوال تحفظ مكان المؤشر وتعيده بعد النقر على الأدوات.
  // ==========================================
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

  // ==========================================
  // 🔄 مزامنة المحتوى بين Component State و DOM
  // إذا تغير المحتوى من الخارج (مثلاً تعديل رسالة قديمة)، يتم تحديث المحرر
  // ==========================================
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = content || '';
    }
  }, [content]);

  // دالة تعمل مع كل حرف يتم كتابته لتحديث الـ State الخارجي
  const handleInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  // ==========================================
  // 🛠️ المحرك التنفيذي لأوامر التنسيق
  // ==========================================
  const execCommand = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value); // دالة المتصفح الأصلية للتنسيق
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  };

  // إدراج رابط تشعبي (Hyperlink)
  const addLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  // ==========================================
  // ☁️ رفع الصور (Cloudinary Upload)
  // يرفع الصورة ويعيد الرابط ويدرجه داخل النص كعنصر <img> أنيق
  // ==========================================
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
        // ستايل مضمن يضمن عدم تشوه الصورة (Responsive)
        const imgHTML = `<br/><img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" /><br/>`;
        
        let inserted = false;
        try { inserted = document.execCommand('insertHTML', false, imgHTML); } catch(e) {}
        
        if (!inserted && editorRef.current) {
           editorRef.current.innerHTML += imgHTML;
        }
        
        if (editorRef.current) setContent(editorRef.current.innerHTML);
      }
    } catch (error) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // 📄 محرك تفكيك ومعالجة الـ PDF (السحر الحقيقي!)
  // يفكك صفحات الـ PDF إلى صور -> يضيف علامة مائية -> يرفعها -> يدمجها في المحرر
  // ==========================================
  const executePdfProcessing = async () => {
    if (!pendingPdfFile) return;
    
    setShowWatermarkModal(false);
    const file = pendingPdfFile;

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return alert("جاري تحميل مكتبة قراءة الملفات، يرجى المحاولة بعد قليل...");

    setIsProcessingPdf(true);
    setPdfProgressText("جاري تهيئة الملف...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const imageUrls: string[] = [];
      const blobs: Blob[] = [];

      // الخطوة 1: تقطيع الـ PDF إلى صور Canvas
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setPdfProgressText(`جاري تحويل الصفحة ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // جودة عالية
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        // الخطوة 2: رسم العلامة المائية (إذا اختار المعلم ذلك)
        if (applyWatermark && watermarkText.trim() !== '') {
          ctx.save();
          ctx.globalAlpha = 0.20; // الشفافية
          const fontSize = Math.floor(canvas.width / 12);
          ctx.font = `bold ${fontSize}px Arial, sans-serif`; 
          ctx.fillStyle = "#4f46e5"; // لون أزرق نيلي
          ctx.translate(canvas.width / 2, canvas.height / 2); // نقل نقطة الرسم للمنتصف
          ctx.rotate(-Math.PI / 4); // تدوير النص بزاوية 45 درجة
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore(); 
        }

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8)); 
        if (blob) blobs.push(blob);
      }

      // الخطوة 3: رفع الصور السحابي لـ Cloudinary
      for (let i = 0; i < blobs.length; i++) {
         setPdfProgressText(`رفع الصفحة ${i + 1}...`);
         const formData = new FormData();
         formData.append('file', blobs[i]);
         formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
         const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
         const data = await res.json();
         if (data.secure_url) imageUrls.push(data.secure_url);
      }

      setPdfProgressText("جاري الإدراج...");
      
      // الخطوة 4: دمج الصور المرفوعة كأكواد HTML متتابعة داخل المحرر
      let htmlToInsert = '<br/>';
      imageUrls.forEach((url, idx) => {
         htmlToInsert += `<div style="text-align: center; margin-bottom: 24px;"><img src="${url}" alt="صفحة ${idx + 1}" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" /></div>`;
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
        if (!inserted) editorRef.current.innerHTML += htmlToInsert; // خطة بديلة للإدراج
        setContent(editorRef.current.innerHTML);
      }

    } catch (error) {
      alert("حدث خطأ أثناء معالجة ملف الـ PDF.");
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressText("");
      setPendingPdfFile(null); 
    }
  };

  // التراجع عن رفع الـ PDF
  const handleCancelPdf = () => {
    setShowWatermarkModal(false);
    setPendingPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // ==========================================
  // 📋 ميزة اللصق الذكي (Smart Paste)
  // يسمح للمعلم بنسخ صورة (Ctrl+C) من أي مكان، ثم لصقها (Ctrl+V) داخل المحرر مباشرة!
  // ==========================================
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    saveSelection(); 
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 && canUploadImage) {
        e.preventDefault(); // منع المتصفح من اللصق العشوائي 
        const file = items[i].getAsFile();
        if (file) await uploadImageFile(file); // رفع الصورة أولاً ثم إدراجها
        return; 
      }
    }
  };

  // إدراج جدول جاهز ومنسق
  const insertTable = () => {
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"><tbody><tr><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 1</td><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 2</td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 1</td><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 2</td></tr></tbody></table><br/>`;
    execCommand('insertHTML', tableHTML);
  };

  // إدراج رمز رياضي بشكل أنيق
  const insertMathSymbol = (symbol: string) => {
     execCommand('insertHTML', `&nbsp;<span style="background: #fdf2f8; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #db2777; font-weight: bold;" dir="ltr">${symbol}</span>&nbsp;`);
  };

  // مكون مصغر لزر شريط الأدوات يمنع فقدان التركيز (onMouseDown)
  const ToolbarButton = ({ icon: Icon, onClick, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
      className="p-1.5 sm:p-2 rounded-lg transition-all bg-transparent text-slate-600 hover:bg-slate-200 hover:text-indigo-600 shrink-0"
      title={title}
    >
      <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
    </button>
  );

  return (
    // 🚀 الحاوية الرئيسية للمحرر، تتأثر بحجم المحرر (Compact للمحادثات أو كامل للمقالات)
    <div className={cn("w-full border border-slate-200 rounded-[1.5rem] bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all font-sans flex flex-col overflow-visible", isCompact ? "min-h-[100px]" : "min-h-[300px]")} dir="rtl">
      
      {/* ==========================================
          🌊 نافذة العلامة المائية للـ PDF (Modal)
          ========================================== */}
      {showWatermarkModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                 <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><ShieldCheck className="h-6 w-6" /></div>
                 <div>
                   <h3 className="text-xl font-black text-slate-900">حماية الملف (اختياري)</h3>
                   <p className="text-xs font-bold text-slate-500">هل تريد إضافة علامة مائية لصور الـ PDF؟</p>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-3">
                  <button onClick={() => setApplyWatermark(true)} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${applyWatermark ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300'}`}>
                    <Check className="w-4 h-4" /> نعم، أضف علامة
                  </button>
                  <button onClick={() => setApplyWatermark(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${!applyWatermark ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300'}`}>
                    <X className="w-4 h-4" /> لا، بدون علامة
                  </button>
                </div>

                {applyWatermark && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">اكتب نص العلامة المائية:</label>
                    <input 
                      type="text" 
                      value={watermarkText} 
                      onChange={(e) => setWatermarkText(e.target.value)} 
                      placeholder="أ. محمد (فيزياء)" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-center"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                <button onClick={handleCancelPdf} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all text-sm">
                  إلغاء
                </button>
                <button onClick={executePdfProcessing} className="flex-1 px-6 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                  <Files className="w-4 h-4" /> معالجة الملف
                </button>
              </div>
           </div>
        </div>
      )}

      {/* ==========================================
          🧰 شريط أدوات التنسيق (Toolbar)
          ========================================== */}
      <div className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 relative shrink-0 z-20 rounded-t-[1.5rem]">
        
        {/* مجموعة التنسيق الأساسي (غامق، مائل، تسطير) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="مائل" />
          {!isCompact && <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="تسطير" />}
        </div>

        {/* مجموعة العناوين (تختفي في المحادثات المصغرة) */}
        {!isCompact && (
          <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1 hidden sm:flex">
            <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'H3')} title="عنوان كبير" />
            <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'H4')} title="عنوان متوسط" />
          </div>
        )}

        {/* مجموعة المحاذاة (يمين، وسط، يسار) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1">
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="يمين" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="وسط" />
          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="يسار" />
        </div>

        {/* مجموعة الألوان وحجم الخط */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1 relative">
          
          {/* زر اختيار اللون */}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowColorPicker(!showColorPicker); setShowFontSize(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-1.5 sm:p-2 rounded-lg ${showColorPicker ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="لون النص">
            <Palette className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          
          {/* قائمة الألوان المنبثقة */}
          {showColorPicker && (
            <div className="absolute top-full mt-2 right-0 sm:right-auto bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex flex-wrap gap-2 z-50 w-48">
              {['#000000', '#ef4444', '#f97316', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'].map(color => (
                <button key={color} onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color); setShowColorPicker(false); }} className="w-8 h-8 rounded-full border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          {/* زر اختيار حجم الخط */}
          {!isCompact && (
            <>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontSize(!showFontSize); setShowColorPicker(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-1.5 sm:p-2 rounded-lg ${showFontSize ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="حجم الخط">
                <Type className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* قائمة الأحجام المنبثقة */}
              {showFontSize && (
                <div className="absolute top-full mt-2 right-0 sm:right-auto bg-white border border-slate-200 shadow-xl rounded-xl p-2 flex flex-col z-50 w-32">
                  <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '2'); setShowFontSize(false); }} className="px-3 py-2 text-sm text-right hover:bg-slate-100 rounded">صغير</button>
                  <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '3'); setShowFontSize(false); }} className="px-3 py-2 text-base text-right hover:bg-slate-100 rounded">عادي</button>
                  <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '5'); setShowFontSize(false); }} className="px-3 py-2 text-lg font-semibold text-right hover:bg-slate-100 rounded">كبير</button>
                  <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '7'); setShowFontSize(false); }} className="px-3 py-2 text-2xl font-bold text-right hover:bg-slate-100 rounded">ضخم</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* مجموعة القوائم (النقطية والرقمية) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1">
          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="قائمة نقطية" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="قائمة رقمية" />
        </div>

        {/* مجموعة الإدراج (رابط، جدول، رياضيات) */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-1 sm:pl-2 ml-1 relative">
          <ToolbarButton icon={LinkIcon} onClick={() => { saveSelection(); setShowLinkInput(!showLinkInput); setShowMathUI(false); setShowColorPicker(false); setShowFontSize(false); }} title="إضافة رابط" />
          {!isCompact && <ToolbarButton icon={Table} onClick={insertTable} title="إدراج جدول" />}
          
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowMathUI(!showMathUI); setShowLinkInput(false); setShowColorPicker(false); setShowFontSize(false); }} className={`p-1.5 sm:p-2 rounded-lg ${showMathUI ? 'bg-pink-100 text-pink-700' : 'text-slate-600 hover:bg-slate-200'}`} title="معادلات">
            <Calculator className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* مربع إدخال الرابط */}
          {showLinkInput && (
             <div className="absolute top-full mt-2 right-0 sm:right-auto bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-2 z-50 w-64 sm:w-72">
                <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addLink(); } }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 font-bold text-left" dir="ltr" />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">إدراج</button>
             </div>
          )}

          {/* 🧮 المحرر الرياضي المتطور (LaTeX) */}
          {showMathUI && (
            <div className="absolute top-full mt-2 right-0 sm:-right-24 bg-white border border-slate-200 shadow-2xl rounded-3xl p-5 z-50 w-[300px] sm:w-[400px] animate-in fade-in zoom-in" dir="rtl">
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <span className="font-black text-sm text-pink-600 flex items-center gap-2">
                  <Calculator className="w-5 h-5"/> إدراج معادلة (LaTeX)
                </span>
                <button onMouseDown={(e) => { e.preventDefault(); setShowMathUI(false); }} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-all"><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-4">
                {/* رموز رياضية سريعة الإدراج */}
                <div>
                  <div className="grid grid-cols-6 gap-2" dir="ltr">
                    {['½','¾','√','∛','x²','x³','π','∞','∑','∫','≠','≈'].map(sym => (
                      <button key={sym} onMouseDown={(e) => { e.preventDefault(); insertMathSymbol(sym); }} className="p-2 border border-slate-200 rounded-xl hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600 font-mono font-bold text-slate-600 transition-all shadow-sm flex items-center justify-center">{sym}</button>
                    ))}
                  </div>
                </div>

                {/* حقل إدخال معادلة الـ LaTeX (مثل الكسور والجذور المعقدة) */}
                <div className="border-t border-slate-100 pt-4">
                   <textarea
                      value={latexInput}
                      onChange={(e) => setLatexInput(e.target.value)}
                      placeholder="\frac{1}{2} mv^2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-left focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold text-slate-700 transition-all"
                      dir="ltr"
                      rows={2}
                   />
                </div>

                {/* المعاينة الحية للمعادلة الرياضية */}
                {latexInput && (
                   <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-center overflow-x-auto min-h-[60px] items-center text-white shadow-inner">
                       <Latex>{`$${latexInput}$`}</Latex>
                   </div>
                )}

                {/* إدراج المعادلة في المحرر */}
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
                   className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-sm py-4 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-pink-200 flex items-center justify-center gap-2"
                >
                   إدراج المعادلة <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* مسح جميع التنسيقات عن النص المحدد */}
        <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="إزالة التنسيق" />

        {/* ==========================================
            📤 أزرار الرفع المتطورة (صور و PDF)
            ========================================== */}
        {canUploadImage && (
          <div className="mr-auto flex items-center gap-1 sm:gap-2">
             {/* أزرار الإدخال المخفية (Input type="file") التي يتم النقر عليها برمجياً */}
             <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async(e) => { const file = e.target.files?.[0]; if(file) await uploadImageFile(file); if(fileInputRef.current) fileInputRef.current.value = ''; }} />
             
             <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={(e) => { 
                const file = e.target.files?.[0]; 
                if(file) {
                  setPendingPdfFile(file);
                  setShowWatermarkModal(true); // استدعاء نافذة العلامة المائية
                }
             }} />
             
             <button type="button" disabled={isUploading || isProcessingPdf} onMouseDown={(e) => { e.preventDefault(); saveSelection(); fileInputRef.current?.click(); }} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0">
               <ImageIcon className="w-4 h-4 text-indigo-500" />
               <span className="hidden sm:inline">صورة</span>
             </button>

             {/* زر تفكيك الـ PDF للصور (يختفي في الدردشة) */}
             {!isCompact && (
               <button type="button" disabled={isUploading || isProcessingPdf} onMouseDown={(e) => { e.preventDefault(); saveSelection(); pdfInputRef.current?.click(); }} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs sm:text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50 shrink-0" title="استخراج من PDF">
                 <Files className="w-4 h-4 text-indigo-600" />
                 <span className="hidden sm:inline">PDF</span>
               </button>
             )}
          </div>
        )}
      </div>

      {/* ==========================================
          ✍️ جسم المحرر (منطقة الكتابة الحقيقية ContentEditable)
          ========================================== */}
      <div className="relative flex-1 flex flex-col min-h-0 bg-transparent rounded-b-[1.5rem]">
        
        {/* شاشة تحميل شفافة أثناء رفع الصور والملفات */}
        {(isUploading || isProcessingPdf) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px] flex items-center justify-center z-20 rounded-b-[1.5rem]">
             <div className="bg-white px-6 py-4 rounded-[2rem] shadow-xl border border-indigo-100 flex flex-col items-center justify-center gap-3 font-bold text-sm text-indigo-700 max-w-[80%] text-center">
               <Loader2 className="w-8 h-8 animate-spin text-indigo-500" /> 
               <span>{isProcessingPdf ? pdfProgressText : 'جاري الرفع...'}</span>
             </div>
          </div>
        )}
        
        {/* حقل الكتابة المرن الذي يأخذ المساحة المتبقية كاملة دون أن يتم قصه */}
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste} // استدعاء ميزة اللصق الذكي للصور
          onBlur={saveSelection} 
          className={cn("flex-1 w-full overflow-y-auto p-4 sm:p-6 outline-none prose prose-sm sm:prose-base prose-slate max-w-none text-slate-800 leading-loose rounded-b-[1.5rem]", isCompact ? "min-h-[100px]" : "min-h-[180px] lg:min-h-[280px]")}
          data-placeholder={placeholder}
          dir="auto"
          style={{ WebkitUserModify: 'read-write', maxHeight: 'none' } as any}
        />
      </div>

      {/* ==========================================
          🎨 تعديلات بصرية خاصة (CSS Injection)
          تخصيص الـ Placeholder والجدول والصور المدرجة داخل النص
          ========================================== */}
      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; display: block; font-weight: 500; }
        [contenteditable]:focus:empty:before { opacity: 0.5; }
        .prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .prose td, .prose th { border: 1px solid #e2e8f0; padding: 0.75rem; vertical-align: top; }
        .prose img { display: inline-block; max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      `}} />
    </div>
  );
}
