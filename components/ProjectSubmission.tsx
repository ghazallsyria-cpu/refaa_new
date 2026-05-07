'use client';

import React, { useState } from 'react';
// استيراد مكتبة خارجية متخصصة في ضغط الصور داخل المتصفح (Client-side)
import imageCompression from 'browser-image-compression';
import { UploadCloud, X, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// 📦 تعريف الخصائص (Props) المدخلة للمكون
// ==========================================
interface ProjectSubmissionProps {
  // البيانات الأولية (تُستخدم في حالة التعديل على مشروع تم تسليمه مسبقاً)
  initialData?: { text: string; images: string[] };
  // دالة تُمرر من الأب (Parent Component) لتستقبل البيانات عند أي تغيير
  onChange: (data: { text: string; images: string[] }) => void;
  // خاصية للقراءة فقط (Read-only) تُستخدم عندما يريد المعلم عرض مشروع الطالب بدون السماح بتعديله
  readOnly?: boolean;
}

export default function ProjectSubmission({ initialData, onChange, readOnly }: ProjectSubmissionProps) {
  
  // ==========================================
  // 🎛️ حالات المكون (States)
  // ==========================================
  const [text, setText] = useState(initialData?.text || ''); // لتخزين النص المكتوب
  const [images, setImages] = useState<string[]>(initialData?.images || []); // لتخزين روابط الصور المرفوعة
  const [isUploading, setIsUploading] = useState(false); // لإظهار مؤشر التحميل أثناء الرفع

  // ==========================================
  // ✍️ معالج تغيير النص (Text Handler)
  // ==========================================
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // إرسال البيانات المحدثة للأب فوراً
    onChange({ text: e.target.value, images });
  };

  // ==========================================
  // ☁️ معالج رفع الصور وضغطها (Upload & Compress Handler)
  // ==========================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // تحويل الملفات المختارة (FileList) إلى مصفوفة (Array)
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // 🛡️ حماية: منع رفع أكثر من 8 صور إجمالاً
    if (images.length + files.length > 8) {
      alert('عذراً، الحد الأقصى المسموح به هو 8 صور للمشروع الواحد.');
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // المرور على كل صورة رفعها المستخدم (يدعم الرفع المتعدد Multiple Upload)
      for (const file of files) {
        // 🚀 السحر هنا: ضغط الصورة قبل رفعها باستخدام مكتبة browser-image-compression
        const options = {
          maxSizeMB: 0.2, // أقصى حجم للصورة بعد الضغط سيكون 200 كيلوبايت فقط!
          maxWidthOrHeight: 1280, // أقصى أبعاد مسموحة للصورة لضمان الوضوح دون حجم زائد
          useWebWorker: true, // استخدام الـ WebWorker لعدم تجميد واجهة المستخدم أثناء الضغط
        };
        const compressedFile = await imageCompression(file, options);

        // تجهيز بيانات الصورة المضغوطة لإرسالها لـ Cloudinary
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default_preset');

        // إرسال الطلب (POST) إلى السحابة
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        // إذا نجح الرفع، نحفظ الرابط الآمن (https) في مصفوفة الروابط المؤقتة
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      // دمج الصور القديمة مع الصور الجديدة المرفوعة للتو
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      // إرسال البيانات النهائية للمكون الأب
      onChange({ text, images: newImages });

    } catch (error) {
      alert('حدث خطأ أثناء ضغط أو رفع الصور. تأكد من اتصالك بالإنترنت.');
    } finally {
      setIsUploading(false); // إيقاف علامة التحميل بغض النظر عن النجاح أو الفشل
    }
  };

  // ==========================================
  // 🗑️ معالج حذف الصورة المرفوعة (Remove Handler)
  // ==========================================
  const removeImage = (index: number) => {
    // منع الحذف إذا كان المكون في وضع (القراءة فقط)
    if (readOnly) return; 
    
    // فلترة المصفوفة لحذف الصورة ذات الـ Index المحدد
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onChange({ text, images: newImages }); // تحديث الأب
  };

  return (
    // 🎨 حاوية المكون بتصميم ينسجم مع هوية النظام
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner mt-4">
      <div className="space-y-6">
        
        {/* ==========================================
            📝 منطقة إدخال النص (Text Area)
            ========================================== */}
        <div>
          <label className="block text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> وصف المشروع أو البحث (اختياري)
          </label>
          <textarea
            disabled={readOnly} // تعطيل الإدخال إذا كان في وضع عرض المعلم
            rows={4}
            value={text}
            onChange={handleTextChange}
            placeholder="اكتب تفاصيل مشروعك، أبحاثك، أو أي ملاحظات للمعلم هنا..."
            className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl p-4 text-slate-800 font-bold outline-none resize-none shadow-sm transition-all"
          />
        </div>

        {/* ==========================================
            🖼️ منطقة الصور (Images Grid)
            ========================================== */}
        <div>
          <label className="block text-sm font-black text-indigo-900 mb-2 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-500" /> صور المشروع (الحد الأقصى 8 صور)
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            
            {/* 1. حلقة تكرارية لعرض الصور المرفوعة مسبقاً */}
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm group bg-white">
                <img src={img} alt={`مرفق ${idx + 1}`} className="w-full h-full object-cover" />
                
                {/* إظهار زر الحذف فقط في وضع التعديل (يظهر عند مرور الماوس Hover) */}
                {!readOnly && (
                  <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-md">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* 2. زر إضافة صور جديدة (يظهر فقط إذا كان عدد الصور أقل من 8 وفي وضع التعديل) */}
            {!readOnly && images.length < 8 && (
              <label className={cn("aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all", isUploading ? "border-indigo-300 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50")}>
                {/* حقل ملف مخفي ومزود بخاصية multiple للسماح برفع أكثر من صورة معاً */}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                
                {isUploading ? (
                  // أيقونة الدوران أثناء الرفع
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                ) : (
                  // شكل زر الإضافة قبل الرفع
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-500 text-center px-2">اضغط لإضافة صور<br/>({8 - images.length} متبقية)</span>
                  </>
                )}
              </label>
            )}
          </div>
          
          {/* رسالة توضيحية ذكية */}
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100 inline-block">
            💡 يتم ضغط الصور تلقائياً للحفاظ على باقة الإنترنت لديك.
          </p>
        </div>
      </div>
    </div>
  );
}
