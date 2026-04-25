'use client';

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { UploadCloud, X, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSubmissionProps {
  initialData?: { text: string; images: string[] };
  onChange: (data: { text: string; images: string[] }) => void;
  readOnly?: boolean;
}

export default function ProjectSubmission({ initialData, onChange, readOnly }: ProjectSubmissionProps) {
  const [text, setText] = useState(initialData?.text || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onChange({ text: e.target.value, images });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      alert('عذراً، الحد الأقصى المسموح به هو 8 صور للمشروع الواحد.');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        // 🚀 السحر هنا: ضغط الصورة قبل رفعها
        const options = {
          maxSizeMB: 0.2, // أقصى حجم 200 كيلوبايت
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);

        // رفع الصورة المضغوطة إلى Cloudinary
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onChange({ text, images: newImages });

    } catch (error) {
      alert('حدث خطأ أثناء ضغط أو رفع الصور. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (readOnly) return;
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onChange({ text, images: newImages });
  };

  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner mt-4">
      <div className="space-y-6">
        {/* حقل النص */}
        <div>
          <label className="block text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> وصف المشروع أو البحث (اختياري)
          </label>
          <textarea
            disabled={readOnly}
            rows={4}
            value={text}
            onChange={handleTextChange}
            placeholder="اكتب تفاصيل مشروعك، أبحاثك، أو أي ملاحظات للمعلم هنا..."
            className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl p-4 text-slate-800 font-bold outline-none resize-none shadow-sm transition-all"
          />
        </div>

        {/* حقل رفع الصور */}
        <div>
          <label className="block text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-500" /> صور المشروع (الحد الأقصى 8 صور)
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm group bg-white">
                <img src={img} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover" />
                {!readOnly && (
                  <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-md">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {!readOnly && images.length < 8 && (
              <label className={cn("aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all", isUploading ? "border-indigo-300 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50")}>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-500 text-center px-2">اضغط لإضافة صور<br/>({8 - images.length} متبقية)</span>
                  </>
                )}
              </label>
            )}
          </div>
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100 inline-block">
            💡 يتم ضغط الصور تلقائياً للحفاظ على باقة الإنترنت لديك.
          </p>
        </div>
      </div>
    </div>
  );
}
