'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

// 🚀 استيراد ديناميكي لمنع انهيار السيرفر (SSR Crash)
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  )
});

interface ForumEditorProps {
  content: string;
  setContent: (val: string) => void;
  canUploadImage: boolean;
}

export default function ForumEditor({ content, setContent, canUploadImage }: ForumEditorProps) {
  const quillRef = useRef<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const imageHandler = useCallback(() => {
    if (!canUploadImage) {
      alert('عذراً، رفع الصور متاح للمعلمين والإدارة فقط.');
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
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
          const quill = quillRef.current?.getEditor();
          const range = quill?.getSelection();
          if (quill && range) {
            quill.insertEmbed(range.index, 'image', data.secure_url);
            quill.setSelection({ index: range.index + 1, length: 0 });
          }
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('حدث خطأ أثناء رفع الصورة.');
      } finally {
        setIsUploading(false);
      }
    };
  }, [canUploadImage]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],        
        [{ 'color': [] }, { 'background': [] }],          
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', canUploadImage ? 'image' : ''],
        ['clean']                                         
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [canUploadImage, imageHandler]);

  return (
    <div className="relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .quill-custom .ql-toolbar {
          border-top-left-radius: 1rem;
          border-top-right-radius: 1rem;
          border-color: #e2e8f0;
          background: #f8fafc;
          padding: 12px;
          direction: ltr; 
        }
        .quill-custom .ql-container {
          border-bottom-left-radius: 1rem;
          border-bottom-right-radius: 1rem;
          border-color: #e2e8f0;
          min-height: 250px;
          font-family: inherit;
          font-size: 16px;
        }
        .quill-custom .ql-editor {
          min-height: 250px;
          direction: rtl; 
          text-align: right;
          padding: 20px;
        }
        .quill-custom .ql-editor img {
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          margin: 1rem auto;
          display: block;
          max-width: 100%;
        }
      `}} />
      
      {isUploading && (
        <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-2xl border border-indigo-100">
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin" /> جاري رفع الصورة...
          </div>
        </div>
      )}

      {/* @ts-expect-error - ReactQuill dynamic import typing workaround */}
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        value={content}
        onChange={setContent}
        modules={modules}
        className="quill-custom bg-white"
        placeholder="اكتب تفاصيل موضوعك هنا... يمكنك تنسيق النص وإضافة الألوان!"
      />
    </div>
  );
}
