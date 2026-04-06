'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table, 
  Heading1, Heading2, TerminalSquare
} from 'lucide-react';

interface ForumEditorProps {
  content: string;
  setContent: (content: string) => void;
  canUploadImage: boolean;
  placeholder?: string;
}

export default function ForumEditor({ 
  content, 
  setContent, 
  canUploadImage, 
  placeholder = "اكتب محتوى موضوعك هنا... يمكنك لصق (Ctrl+V) الصور مباشرة!" 
}: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // مزامنة المحتوى الأولي (مرة واحدة فقط لتجنب إعادة ضبط المؤشر أثناء الكتابة)
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = content || '';
    }
  }, [content]);

  // تحديث حالة المحتوى عند الكتابة
  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  // المفتاح السحري لإصلاح الأزرار: حفظ التحديد قبل الضغط على الزر
  const savedSelection = useRef<Range | null>(null);

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

  // دالة تنفيذ الأوامر (تتأكد من استعادة التحديد قبل التنفيذ)
  const execCommand = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  const checkActiveFormats = () => {
    const formats = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
    const active = formats.filter(format => document.queryCommandState(format));
    setActiveFormats(active);
  };

  const addLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const insertTable = () => {
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <tbody>
          <tr><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 1</td><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 2</td></tr>
          <tr><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 1</td><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 2</td></tr>
        </tbody>
      </table><br/>
    `;
    execCommand('insertHTML', tableHTML);
  };

  const insertMathBlock = () => {
     execCommand('insertHTML', `&nbsp;<span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #4f46e5; display: inline-block; direction: ltr;">$$ اكتب المعادلة هنا $$</span>&nbsp;`);
  };

  // رفع الصور إلى Cloudinary
  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.secure_url) {
        editorRef.current?.focus();
        restoreSelection(); // استعادة المكان الذي كان يقف فيه المؤشر قبل الرفع
        const imgHTML = `<br/><img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" /><br/>`;
        document.execCommand('insertHTML', false, imgHTML);
        if (editorRef.current) setContent(editorRef.current.innerHTML);
      }
    } catch (error) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
    }
  };

  // التعامل مع لصق الصور (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    saveSelection(); // حفظ مكان اللصق
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 && canUploadImage) {
        e.preventDefault(); // منع المتصفح من لصق الصورة كـ Base64
        const file = items[i].getAsFile();
        if (file) {
          await uploadImageFile(file);
        }
        return; // نتوقف بعد معالجة الصورة
      }
    }
    // السماح بلصق النصوص العادية كما هي
  };

  const handleImageUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // زر شريط الأدوات المعدل
  const ToolbarButton = ({ icon: Icon, onClick, isActive, title }: any) => (
    <button
      type="button"
      // onMouseDown يمنع المحرر من فقدان التركيز عند الضغط على الزر
      onMouseDown={(e) => { 
        e.preventDefault(); 
        onClick(); 
      }} 
      className={`p-2 rounded-lg transition-all ${
        isActive 
          ? 'bg-indigo-100 text-indigo-700 shadow-inner' 
          : 'bg-transparent text-slate-600 hover:bg-slate-200 hover:text-indigo-600'
      }`}
      title={title}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all font-sans" dir="rtl">
      
      {/* شريط الأدوات */}
      <div className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
        
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} isActive={activeFormats.includes('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} isActive={activeFormats.includes('italic')} title="مائل" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} isActive={activeFormats.includes('underline')} title="تسطير" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'H3')} title="عنوان كبير" />
          <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'H4')} title="عنوان متوسط" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} isActive={activeFormats.includes('insertUnorderedList')} title="قائمة نقطية" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} isActive={activeFormats.includes('insertOrderedList')} title="قائمة رقمية" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1 relative">
          <ToolbarButton 
            icon={LinkIcon} 
            onClick={() => {
              saveSelection(); // حفظ مكان التحديد قبل فتح نافذة الرابط
              setShowLinkInput(!showLinkInput);
            }} 
            isActive={showLinkInput} 
            title="إضافة رابط" 
          />
          <ToolbarButton icon={Table} onClick={insertTable} title="إدراج جدول" />
          <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="إزالة التنسيق" />
          
          {showLinkInput && (
             <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-2 z-50 w-72 animate-in fade-in zoom-in">
                <input 
                  type="url" 
                  placeholder="https://..." 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 font-bold text-left"
                  dir="ltr"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if(e.key === 'Enter') {
                       e.preventDefault();
                       addLink();
                    }
                  }}
                />
                <button type="button" onClick={addLink} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">إدراج</button>
             </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
           <ToolbarButton icon={TerminalSquare} onClick={insertMathBlock} title="إدراج معادلة رياضية (LaTeX)" />
        </div>

        {canUploadImage && (
          <div className="mr-auto flex items-center">
             <input 
               type="file" 
               accept="image/*" 
               className="hidden" 
               ref={fileInputRef}
               onChange={handleImageUploadChange}
             />
             <button
               type="button"
               disabled={isUploading}
               onMouseDown={(e) => {
                 e.preventDefault();
                 saveSelection(); // حفظ المكان قبل فتح متصفح الملفات
                 fileInputRef.current?.click();
               }}
               className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
               title="يمكنك أيضاً لصق الصورة مباشرة داخل النص بـ Ctrl+V"
             >
               {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
               <span className="hidden sm:inline">{isUploading ? 'جاري الرفع...' : 'إدراج صورة'}</span>
             </button>
          </div>
        )}
      </div>

      {/* مساحة المحرر */}
      <div className="relative">
        {isUploading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-b-[1.5rem]">
             <div className="bg-white px-5 py-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-3 font-bold text-sm text-indigo-600">
               <Loader2 className="w-5 h-5 animate-spin" /> جاري معالجة ورفع الصورة...
             </div>
          </div>
        )}
        
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyUp={checkActiveFormats}
          onMouseUp={checkActiveFormats}
          onPaste={handlePaste}
          onBlur={saveSelection} // حفظ التحديد دائماً عند الخروج من المحرر
          className="w-full min-h-[250px] max-h-[600px] overflow-y-auto p-6 outline-none prose prose-slate max-w-none text-slate-800 leading-loose text-base"
          data-placeholder={placeholder}
          dir="auto"
          style={{ WebkitUserModify: 'read-write' } as any}
        />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
          font-weight: 500;
        }
        [contenteditable]:focus:empty:before {
          opacity: 0.5;
        }
        .prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .prose td, .prose th { border: 1px solid #e2e8f0; padding: 0.75rem; vertical-align: top; }
        .prose img { display: inline-block; max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      `}} />
    </div>
  );
}
