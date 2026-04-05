'use client';

import { useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, Image as ImageIcon, 
  Loader2, AlignRight, AlignCenter, AlignLeft, Type, Palette
} from 'lucide-react';

interface ForumEditorProps {
  content: string;
  setContent: (val: string) => void;
  canUploadImage: boolean;
}

export default function ForumEditor({ content, setContent, canUploadImage }: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setContent(editorRef.current?.innerHTML || '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary Cloud Name is missing");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        const imgHtml = `<img src="${data.secure_url}" alt="مرفق" style="max-width: 100%; border-radius: 12px; margin: 10px 0;" />`;
        execCommand('insertHTML', imgHtml);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sm:gap-2">
        <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors" title="عريض"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors" title="مائل"><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors" title="تسطير"><Underline className="w-4 h-4" /></button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        
        <button type="button" onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"><AlignRight className="w-4 h-4" /></button>
        <button type="button" onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"><AlignCenter className="w-4 h-4" /></button>
        <button type="button" onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"><AlignLeft className="w-4 h-4" /></button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        <button type="button" onClick={() => execCommand('formatBlock', 'H3')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1" title="عنوان كبير">
          <Type className="w-4 h-4" /> <span className="text-[10px] font-bold">كبير</span>
        </button>

        <label className="p-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer flex items-center gap-1" title="لون النص">
          <Palette className="w-4 h-4" />
          <input type="color" className="w-0 h-0 opacity-0 absolute" onChange={(e) => execCommand('foreColor', e.target.value)} />
        </label>

        {canUploadImage && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <label className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${isUploading ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'}`} title="إرفاق صورة">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <span className="text-[10px] font-black">{isUploading ? 'جاري الرفع...' : 'صورة'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          </>
        )}
      </div>

      {/* 🚀 تم إزالة placeholder وإضافة style و class بديل يعمل مع contentEditable */}
      <style dangerouslySetInnerHTML={{ __html: `
        .prose-editor:empty:before {
          content: 'اكتب محتوى موضوعك هنا...';
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
      `}} />
      <div 
        ref={editorRef}
        contentEditable
        onInput={(e) => setContent(e.currentTarget.innerHTML)}
        className="w-full p-4 min-h-[200px] outline-none text-sm font-bold text-slate-800 leading-loose prose max-w-none prose-editor"
        dir="auto"
        style={{ emptyCells: 'show' }}
      />
    </div>
  );
}
