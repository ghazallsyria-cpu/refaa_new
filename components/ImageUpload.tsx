'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
// استخدام مكون الصورة من Next.js لتحسين الأداء وسرعة التحميل
import Image from 'next/image';

// ==========================================
// 📦 تعريف خصائص المكون (Props)
// ==========================================
interface ImageUploadProps {
  initialImageUrl?: string; // الرابط الأولي للصورة (إذا كنا في وضع التعديل)
  onUploadSuccess: (url: string) => void; // دالة تُرسل الرابط النهائي للأب (Component) بعد نجاح الرفع
  label?: string; // النص التوضيحي داخل المربع (مثال: "ارفع صورة الطالب")
}

export default function ImageUpload({ initialImageUrl, onUploadSuccess, label = 'ارفع صورة' }: ImageUploadProps) {
  
  // ==========================================
  // 🎛️ حالات المكون (States & Refs)
  // ==========================================
  const [imageUrl, setImageUrl] = useState<string>(initialImageUrl || ''); // تخزين رابط الصورة النهائي
  const [isUploading, setIsUploading] = useState(false); // حالة التحميل (لإظهار أيقونة الدوران)
  const [error, setError] = useState<string | null>(null); // تخزين رسائل الخطأ لعرضها للمستخدم
  
  // مرجع للوصول إلى عنصر <input type="file"> المخفي لفتحه برمجياً عند النقر على المربع
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 🪄 خوارزمية ضغط الصور الذكية (Client-Side Compression)
  // هذه الدالة تعمل داخل متصفح المستخدم لتقليل حجم الصورة قبل إرسالها للسيرفر
  // مما يقلل استهلاك باقة الإنترنت، ويسرع الرفع، ويوفر مساحة Cloudinary
  // ==========================================
  const compressImage = async (file: File): Promise<File> => {
    // إذا كان الملف ليس صورة (مثل PDF أو Word)، نرجعه كما هو بدون ضغط
    if (!file.type.startsWith('image/')) return file;
    
    // الحد الأقصى للحجم قبل تدخل خوارزمية الضغط (1 ميجابايت)
    const MAX_SIZE = 1 * 1024 * 1024; 
    // إذا كانت الصورة أصغر من 1 ميجا، لا داعي لضغطها
    if (file.size <= MAX_SIZE) return file;

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file); // إنشاء رابط مؤقت للصورة في الذاكرة
      
      img.onload = () => {
        URL.revokeObjectURL(url); // تحرير الذاكرة فور تحميل الصورة
        
        // إنشاء لوحة رسم مخفية (Canvas) لإعادة رسم الصورة بحجم أصغر
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // أقصى أبعاد مسموحة للصورة (Full HD)
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        // حساب الأبعاد الجديدة مع الحفاظ على نسبة العرض إلى الارتفاع (Aspect Ratio)
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

        // تعيين أبعاد الـ Canvas الجديدة ورسم الصورة بداخلها
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // تحويل الـ Canvas مرة أخرى إلى ملف صورة (Blob) بصيغة JPEG وبجودة 70%
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // إنشاء ملف جديد من البيانات المضغوطة وتغيير امتداده إلى jpg
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile); // إعادة الملف المضغوط
            } else {
              reject(new Error('فشل ضغط الصورة'));
            }
          },
          'image/jpeg',
          0.7 // الجودة (70% تعتبر ممتازة للويب)
        );
      };
      
      // في حال فشل قراءة الملف من جهاز المستخدم
      img.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
      img.src = url;
    });
  };

  // ==========================================
  // 🚀 المحرك الرئيسي لرفع الملف (Upload Handler)
  // ==========================================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // التقاط الملف الذي اختاره المستخدم
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // 1. تمرير الملف عبر خوارزمية الضغط (إذا كان صورة كبيرة)
      const processedFile = await compressImage(file);

      // 2. تجهيز البيانات لإرسالها إلى Cloudinary
      const formData = new FormData();
      formData.append('file', processedFile);
      // استخدام مفتاح الرفع الخاص بمشروعك (متغير بيئة)
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

      // 3. إرسال الطلب (POST) مباشرة إلى سيرفرات Cloudinary
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      // 4. التحقق من النتيجة وتحديث الحالات
      if (data.secure_url) {
        setImageUrl(data.secure_url); // عرض الصورة في الواجهة
        onUploadSuccess(data.secure_url); // إرسال الرابط للأب (لحفظه في قاعدة بيانات Supabase مثلاً)
      } else {
        throw new Error(data.error?.message || 'فشل رفع الملف');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false); // إيقاف علامة التحميل
      // تصفير حقل الإدخال ليتمكن المستخدم من اختيار نفس الملف مرة أخرى إذا أراد
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ==========================================
  // 🗑️ دالة إزالة الملف (Remove Handler)
  // ==========================================
  const handleRemove = () => {
    setImageUrl(''); // إزالة الرابط من الواجهة
    onUploadSuccess(''); // إخبار الأب أن الرابط أصبح فارغاً
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 🔍 تحقق بسيط لمعرفة ما إذا كان الملف المرفوع صورة أو ملف آخر (مثل PDF) لعرض المعاينة المناسبة
  const isImage = imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || imageUrl.includes('cloudinary.com/image');

  return (
    // الواجهة المرئية للمكون (UI)
    <div className="w-full">
      
      {/* 📥 الحالة الأولى: لم يتم رفع أي ملف (يظهر مربع السحب والإفلات / النقر) */}
      {!imageUrl ? (
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()} // يفتح نافذة اختيار الملفات
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px]
            ${isUploading ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'}`}
        >
          {/* أثناء الرفع يظهر مؤشر الدوران */}
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-indigo-600">جاري معالجة ورفع الملف...</p>
            </div>
          ) : (
            // قبل الرفع تظهر أيقونة السحابة والنص
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
        
        {/* 🖼️ الحالة الثانية: تم رفع الملف (تظهر المعاينة) */}
        <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group shadow-sm">
          
          {/* إذا كان الملف صورة، نعرضها بكامل المساحة */}
          {isImage ? (
            // 🚀 استخدام object-cover لتغطية المساحة بجمالية بدون تشوه أبعاد الصورة
            <div className="relative w-full h-56 flex items-center justify-center bg-slate-100">
              <Image 
                src={imageUrl} 
                alt="Uploaded" 
                fill 
                className="object-cover" 
                unoptimized // تعطيل تحسينات Next.js لأن الصورة قادمة من سيرفر خارجي (Cloudinary)
              />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            // إذا كان الملف PDF أو ملف آخر، نعرض بطاقة نصية بها رابط
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
          
          {/* ❌ زر حذف الملف المرفوع (يظهر دائماً فوق المعاينة) */}
          <div className="absolute top-3 right-3 flex gap-2 transition-opacity z-10">
            <button
              onClick={(e) => {
                e.stopPropagation(); // منع النقر من الانتقال للعناصر الأم
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

      {/* ⚠️ نافذة عرض الأخطاء (إن وجدت) */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 🕳️ عنصر إدخال الملفات المخفي (الذي يقوم بفتح نافذة الكمبيوتر/الجوال) */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
        accept="image/*,.pdf,.doc,.docx" // تحديد أنواع الملفات المسموحة
      />
    </div>
  );
}
