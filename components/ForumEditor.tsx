'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Image as ImageIcon, 
  Loader2, AlignRight, AlignCenter, AlignLeft, Type, Palette,
  Strikethrough, Heading1, Heading2, List, ListOrdered
} from 'lucide-react';

interface ForumEditorProps {
  content: string;
  setContent: (val: string) => void;
  canUploadImage: boolean;
}

export default function ForumEditor({ content, setContent, canUploadImage }: ForumEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // إذا كان هناك محتوى مسبق (عند التعديل مثلاً)، ضعه في المحرر
    if (editorRef.current && content !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = content;
    }
  }, [content]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setContent(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canUploadImage) return;

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
        editorRef.current?.focus();
        // إدراج الصورة مع تنسيق أنيق ومسافة تحتها
        const imgHtml = `<img src="${data.secure_url}" alt="صورة مرفقة" style="max-width: 100%; border-radius: 12px; margin: 16px auto; display: block; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" /><br/>`;
        document.execCommand('insertHTML', false, imgHtml);
        setContent(editorRef.current?.innerHTML || '');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة. تأكد من إعدادات Cloudinary.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // إعادة تعيين الحقل
    }
  };

  if (!isMounted) return null; // منع أخطاء Hydration

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all flex flex-col relative">
      
      {/* 🚀 شريط الأدوات الاحترافي (Toolbar) */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1 sm:gap-2">
        {/* التنسيقات الأساسية */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button type="button" onClick={() => execCommand('bold')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="عريض"><Bold className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('italic')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="مائل"><Italic className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('underline')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="تسطير"><Underline className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('strikeThrough')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="يتوسطه خط"><Strikethrough className="w-4 h-4" /></button>
        </div>
        
        {/* المحاذاة */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button type="button" onClick={() => execCommand('justifyRight')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="محاذاة لليمين"><AlignRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('justifyCenter')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="محاذاة للوسط"><AlignCenter className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('justifyLeft')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="محاذاة لليسار"><AlignLeft className="w-4 h-4" /></button>
        </div>

        {/* القوائم */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="قائمة نقطية"><List className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="قائمة رقمية"><ListOrdered className="w-4 h-4" /></button>
        </div>

        {/* العناوين والألوان */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button type="button" onClick={() => execCommand('formatBlock', 'H2')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="عنوان كبير"><Heading1 className="w-4 h-4" /></button>
            <button type="button" onClick={() => execCommand('formatBlock', 'H3')} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors" title="عنوان متوسط"><Heading2 className="w-4 h-4" /></button>
            
            <div className="w-px h-4 bg-slate-200 mx-1"></div>

            <label className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition-colors cursor-pointer relative" title="لون النص">
            <Palette className="w-4 h-4" />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => execCommand('foreColor', e.target.value)} />
            </label>
        </div>

        {/* 🚀 رفع الصور (للمعلمين/المدراء فقط) */}
        {canUploadImage && (
          <div className="mr-auto">
            <label className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 font-bold text-xs shadow-sm border ${isUploading ? 'bg-indigo-50 border-indigo-200 text-indigo-400' : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'}`} title="إرفاق صورة للموضوع">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {isUploading ? 'جاري الرفع...' : 'إدراج صورة'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          </div>
        )}
      </div>

      {/* 🚀 مساحة التحرير (Editor Canvas) */}
      <div className="relative flex-1">
        {/* طبقة شفافة تظهر عند رفع الصورة لمنع الكتابة */}
        {isUploading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-indigo-100 flex items-center gap-3 text-indigo-600 font-bold text-sm">
               <Loader2 className="w-5 h-5 animate-spin" /> يتم الآن رفع وتشفير الصورة...
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
            .custom-editor-prose:empty:before {
            content: 'اكتب تفاصيل موضوعك هنا... يمكنك تنسيق النص، التلوين، وإضافة الصور.';
            color: #94a3b8;
            pointer-events: none;
            display: block;
            }
            .custom-editor-prose h2 { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem; color: #1e293b; }
            .custom-editor-prose h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #334155; }
            .custom-editor-prose ul { list-style-type: disc; margin-right: 1.5rem; margin-bottom: 1rem; }
            .custom-editor-prose ol { list-style-type: decimal; margin-right: 1.5rem; margin-bottom: 1rem; }
            .custom-editor-prose p { margin-bottom: 0.75rem; }
        `}} />
        
        <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className="w-full p-5 min-h-[250px] max-h-[500px] overflow-y-auto outline-none text-base font-medium text-slate-800 leading-relaxed custom-editor-prose"
            dir="auto"
        />
      </div>
    </div>
  );
}
