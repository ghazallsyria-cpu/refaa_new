'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table, 
  Heading1, Heading2, TerminalSquare, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Palette, Type, X, Calculator, BarChart3
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
  placeholder = "اكتب مقالك الاحترافي هنا..." 
}: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showMathUI, setShowMathUI] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
    const tableHTML = `<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"><tbody><tr><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 1</td><td style="border: 1px solid #e2e8f0; padding: 12px; background: #f8fafc; font-weight: bold;">عنوان 2</td></tr><tr><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 1</td><td style="border: 1px solid #e2e8f0; padding: 12px;">خلية 2</td></tr></tbody></table><br/>`;
    execCommand('insertHTML', tableHTML);
  };

  const insertMathSymbol = (symbol: string) => {
     execCommand('insertHTML', `&nbsp;<span style="background: #fdf2f8; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #db2777; font-weight: bold;" dir="ltr">${symbol}</span>&nbsp;`);
  };

  const ToolbarButton = ({ icon: Icon, onClick, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
      className="p-2 rounded-lg transition-all bg-transparent text-slate-600 hover:bg-slate-200 hover:text-indigo-600"
      title={title}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all font-sans" dir="rtl">
      
      <div className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sticky top-0 z-10">
        
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="مائل" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="تسطير" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'H3')} title="عنوان كبير" />
          <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'H4')} title="عنوان متوسط" />
        </div>

        {/* المحاذاة */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="يمين" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="وسط" />
          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="يسار" />
          <ToolbarButton icon={AlignJustify} onClick={() => execCommand('justifyFull')} title="ضبط النص" />
        </div>

        {/* الألوان والخطوط */}
        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1 relative">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowColorPicker(!showColorPicker); setShowFontSize(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-2 rounded-lg ${showColorPicker ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="لون النص">
            <Palette className="w-4.5 h-4.5" />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex flex-wrap gap-2 z-50 w-48">
              {['#000000', '#ef4444', '#f97316', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'].map(color => (
                <button key={color} onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', color); setShowColorPicker(false); }} className="w-8 h-8 rounded-full border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowFontSize(!showFontSize); setShowColorPicker(false); setShowMathUI(false); setShowLinkInput(false); }} className={`p-2 rounded-lg ${showFontSize ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`} title="حجم الخط">
            <Type className="w-4.5 h-4.5" />
          </button>

          {showFontSize && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-2 flex flex-col z-50 w-32">
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '2'); setShowFontSize(false); }} className="px-3 py-2 text-sm text-right hover:bg-slate-100 rounded">صغير</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '3'); setShowFontSize(false); }} className="px-3 py-2 text-base text-right hover:bg-slate-100 rounded">عادي</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '5'); setShowFontSize(false); }} className="px-3 py-2 text-lg font-semibold text-right hover:bg-slate-100 rounded">كبير</button>
              <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '7'); setShowFontSize(false); }} className="px-3 py-2 text-2xl font-bold text-right hover:bg-slate-100 rounded">ضخم</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="قائمة نقطية" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="قائمة رقمية" />
        </div>

        <div className="flex items-center gap-0.5 border-l border-slate-300 pl-2 ml-1 relative">
          <ToolbarButton icon={LinkIcon} onClick={() => { saveSelection(); setShowLinkInput(!showLinkInput); setShowMathUI(false); setShowColorPicker(false); setShowFontSize(false); }} title="إضافة رابط" />
          <ToolbarButton icon={Table} onClick={insertTable} title="إدراج جدول" />
          
          <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowMathUI(!showMathUI); setShowLinkInput(false); setShowColorPicker(false); setShowFontSize(false); }} className={`p-2 rounded-lg ${showMathUI ? 'bg-pink-100 text-pink-700' : 'text-slate-600 hover:bg-slate-200'}`} title="كتابة معادلات رياضية">
            <Calculator className="w-4.5 h-4.5" />
          </button>

          {showLinkInput && (
             <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-2 z-50 w-72">
                <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addLink(); } }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 font-bold text-left" dir="ltr" />
                <button type="button" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">إدراج</button>
             </div>
          )}

          {showMathUI && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 z-50 w-80 animate-in fade-in zoom-in">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                <span className="font-bold text-sm text-pink-600">لوحة الرموز الرياضية</span>
                <button onMouseDown={(e) => { e.preventDefault(); setShowMathUI(false); }} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4"/></button>
              </div>
              <div className="grid grid-cols-4 gap-2" dir="ltr">
                {['½','¾','√','∛','x²','x³','π','∞','∑','∫','≠','≈'].map(sym => (
                  <button key={sym} onMouseDown={(e) => { e.preventDefault(); insertMathSymbol(sym); }} className="p-2 border rounded hover:bg-pink-50 font-mono font-bold">{sym}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="إزالة التنسيق" />

        {canUploadImage && (
          <div className="mr-auto flex items-center">
             <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async(e) => { const file = e.target.files?.[0]; if(file) await uploadImageFile(file); if(fileInputRef.current) fileInputRef.current.value = ''; }} />
             <button type="button" disabled={isUploading} onMouseDown={(e) => { e.preventDefault(); saveSelection(); fileInputRef.current?.click(); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50">
               {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
               <span className="hidden sm:inline">{isUploading ? 'جاري الرفع...' : 'إدراج صورة'}</span>
             </button>
          </div>
        )}
      </div>

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
          onPaste={handlePaste}
          onBlur={saveSelection} 
          className="w-full min-h-[250px] max-h-[600px] overflow-y-auto p-6 outline-none prose prose-slate max-w-none text-slate-800 leading-loose text-base"
          data-placeholder={placeholder}
          dir="auto"
          style={{ WebkitUserModify: 'read-write' } as any}
        />
      </div>

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
