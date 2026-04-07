'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  initialImageUrl?: string;
  onUploadSuccess: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ initialImageUrl, onUploadSuccess, label = 'ارفع صورة' }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🚀 خوارزمية ضغط الصور السحرية (تعمل داخل متصفح المستخدم)
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    
    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size <= MAX_SIZE) return file;

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('فشل ضغط الصورة'));
            }
          },
          'image/jpeg',
          0.7
        );
      };
      
      img.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const processedFile = await compressImage(file);

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.secure_url) {
        setImageUrl(data.secure_url);
        onUploadSuccess(data.secure_url);
      } else {
        throw new Error(data.error?.message || 'فشل رفع الملف');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setImageUrl('');
    onUploadSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isImage = imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || imageUrl.includes('cloudinary.com/image');

  return (
    <div className="w-full">
      {!imageUrl ? (
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px]
            ${isUploading ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-indigo-600">جاري معالجة ورفع الملف...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black text-indigo-900">{label}</p>
                <p className="text-[10px] font-bold text-indigo-500 mt-1">سيتم ضغط الصور الكبيرة تلقائياً لتسريع الرفع</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group shadow-sm">
          {isImage ? (
            // 🚀 الحل هنا: استخدام object-cover وتغطية كامل المساحة
            <div className="relative w-full h-56 flex items-center justify-center bg-slate-100">
              <Image 
                src={imageUrl} 
                alt="Uploaded" 
                fill 
                className="object-cover" 
                unoptimized
              />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            <div className="flex items-center gap-4 p-6">
              <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                <FileText className="h-7 w-7" />
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-black text-slate-900 truncate">تم إرفاق الملف بنجاح</p>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate block mt-1" dir="ltr">
                  انقر هنا لعرض الملف
                </a>
              </div>
            </div>
          )}
          
          <div className="absolute top-3 right-3 flex gap-2 transition-opacity z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="h-10 w-10 bg-rose-100 backdrop-blur-md border-2 border-white rounded-full flex items-center justify-center text-rose-600 hover:bg-rose-500 hover:text-white shadow-xl transition-all hover:scale-110 active:scale-95"
              title="إزالة وتغيير الملف"
            >
              <X className="h-5 w-5 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
        accept="image/*,.pdf,.doc,.docx"
      />
    </div>
  );
}
