'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, 
  List, ListOrdered, RemoveFormatting, Loader2, Table, 
  Heading1, Heading2, Heading3
} from 'lucide-react';

interface ForumEditorProps {
  content: string;
  setContent: (content: string) => void;
  canUploadImage: boolean;
  placeholder?: string;
}

export default function ForumEditor({ content, setContent, canUploadImage, placeholder = "اكتب محتوى موضوعك هنا..." }: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  
  // 🚀 حالة لتحديث الأزرار النشطة (مثال: زر Bold يكون مفعلاً إذا كان النص المحدد عريضاً)
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // 🚀 مزامنة المحتوى الأولي فقط عند التحميل أو عند مسح الحقل خارجياً
  useEffect(() => {
    if (editorRef.current && content === '') {
      editorRef.current.innerHTML = '';
    } else if (editorRef.current && editorRef.current.innerHTML !== content && content) {
       // تجنب التحديث المستمر أثناء الكتابة
       if (!document.activeElement || document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = content;
       }
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setContent(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  const checkActiveFormats = () => {
    const formats = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
    const active = formats.filter(format => document.queryCommandState(format));
    setActiveFormats(active);
  };

  // 🚀 دالة إضافة رابط
  const addLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  // 🚀 دالة إضافة جدول
  const insertTable = () => {
    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">خلية 1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">خلية 2</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">خلية 3</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">خلية 4</td>
          </tr>
        </tbody>
      </table><br/>
    `;
    execCommand('insertHTML', tableHTML);
  };

  // 🚀 دالة رفع الصورة وإدراجها مباشرة داخل النص
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        // إدراج الصورة كـ HTML داخل المحرر
        const imgHTML = `<img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" /><br/>`;
        execCommand('insertHTML', imgHTML);
      }
    } catch (error) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 🚀 مكون زر شريط الأدوات
  const ToolbarButton = ({ icon: Icon, onClick, isActive, title }: any) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-lg transition-colors border ${
        isActive 
          ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-inner' 
          : 'bg-white text-slate-600 hover:bg-slate-100 border-transparent hover:border-slate-200'
      }`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
      
      {/* 🚀 شريط الأدوات العلوي */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 sticky top-0 z-10">
        
        {/* تنسيق النص الأساسي */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} isActive={activeFormats.includes('bold')} title="عريض" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} isActive={activeFormats.includes('italic')} title="مائل" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} isActive={activeFormats.includes('underline')} title="تسطير" />
        </div>

        {/* أحجام الخطوط (العناوين) */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'H3')} title="عنوان كبير" />
          <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'H4')} title="عنوان متوسط" />
          <ToolbarButton icon={Heading3} onClick={() => execCommand('formatBlock', 'H5')} title="عنوان صغير" />
        </div>

        {/* القوائم والجداول */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1">
          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} isActive={activeFormats.includes('insertUnorderedList')} title="قائمة نقطية" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} isActive={activeFormats.includes('insertOrderedList')} title="قائمة رقمية" />
          <ToolbarButton icon={Table} onClick={insertTable} title="إدراج جدول" />
        </div>

        {/* الروابط وإزالة التنسيق */}
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-1 relative">
          <ToolbarButton icon={LinkIcon} onClick={() => setShowLinkInput(!showLinkInput)} isActive={showLinkInput} title="إضافة رابط" />
          <ToolbarButton icon={RemoveFormatting} onClick={() => execCommand('removeFormat')} title="إزالة التنسيق" />
          
          {showLinkInput && (
             <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 shadow-xl rounded-xl p-3 flex gap-2 z-50 w-64">
                <input 
                  type="url" 
                  placeholder="https://..." 
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <button type="button" onClick={addLink} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700">إضافة</button>
             </div>
          )}
        </div>

        {/* 🚀 رفع الصور مباشرة داخل النص */}
        {canUploadImage && (
          <div className="mr-auto">
             <input 
               type="file" 
               accept="image/*" 
               className="hidden" 
               ref={fileInputRef}
               onChange={handleImageUpload}
             />
             <button
               type="button"
               disabled={isUploading}
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100 hover:bg-indigo-100 transition-colors disabled:opacity-50"
               title="إدراج صورة داخل النص"
             >
               {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
               {isUploading ? 'جاري الرفع...' : 'إدراج صورة'}
             </button>
          </div>
        )}
      </div>

      {/* 🚀 مساحة الكتابة التفاعلية */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={checkActiveFormats}
        onMouseUp={checkActiveFormats}
        className="w-full min-h-[250px] max-h-[500px] overflow-y-auto p-5 outline-none prose prose-slate max-w-none text-slate-800 leading-relaxed"
        data-placeholder={placeholder}
        dir="auto"
        style={{ WebkitUserModify: 'read-write-plaintext-only' }}
      />

      <style dangerouslySetContents={{__html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        .prose table { width: 100%; border-collapse: collapse; margin-top: 1em; margin-bottom: 1em; }
        .prose td, .prose th { border: 1px solid #cbd5e1; padding: 0.5rem; }
      `}} />
    </div>
  );
}
