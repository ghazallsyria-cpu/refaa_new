'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';
import { deleteFromCloudinary } from '@/lib/cloudinary';

interface Props {
  initialImageUrl?: string | null;
  onUploadSuccess: (url: string | null) => void;
  onRemove?: () => void; // تم إضافة هذا السطر لحل مشكلة الـ Build
  label?: string;
}

export default function ImageUpload({ initialImageUrl, onUploadSuccess, onRemove, label = "اختر صورة" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);

  useEffect(() => {
    if (initialImageUrl !== undefined) {
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('حجم الملف يجب أن يكون أقل من 1 ميجابايت');
      return;
    }

    setError(null);
    setUploading(true);

    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      setError('يرجى إعداد Cloudinary Cloud Name');
      setUploading(false);
      return;
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        fileType: 'image/webp',
        initialQuality: 0.7,
      });

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'فشل الرفع');

      setImageUrl(data.secure_url);
      onUploadSuccess(data.secure_url);
      
      if (imageUrl && imageUrl !== data.secure_url) {
        await deleteFromCloudinary(imageUrl);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!imageUrl ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
          {uploading ? (
            <Loader2 className="animate-spin text-indigo-600" />
          ) : (
            <>
              <Upload className="text-slate-400 mb-2" size={24} />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
          <Image 
            src={imageUrl} 
            alt="Uploaded" 
            fill 
            className="object-contain" 
            unoptimized 
          />
          <button 
            type="button"
            onClick={async (e) => { 
              e.preventDefault();
              const oldUrl = imageUrl;
              setImageUrl(null); 
              onUploadSuccess(null); 
              if (onRemove) onRemove(); // استدعاء دالة الحذف من الأب
              if (oldUrl) await deleteFromCloudinary(oldUrl);
            }} 
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all z-10"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

