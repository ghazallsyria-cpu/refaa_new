// @ts-nocheck
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Image, Upload, CheckCircle2, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

export default function ManageReviewImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [document, setDocument] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const fetchReviewData = async () => {
    try {
      const { data: docData } = await supabase.from('review_documents').select('*').eq('id', documentId).single();
      setDocument(docData);

      const { data: qData } = await supabase.from('extracted_questions').select('*').eq('document_id', documentId).order('created_at', { ascending: true });
      setQuestions(qData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) fetchReviewData();
  }, [documentId]);

  // 🚀 دالة الرفع المباشر إلى Cloudinary
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(questionId);
    setStatus(null);

    try {
      // 1. تجهيز حزمة البيانات للإرسال إلى Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      // استخدام متغيرات البيئة الخاصة بكلاودينري الموجودة في مشروعك
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("يرجى التأكد من إضافة NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME في ملف .env");

      // 2. الرفع المباشر عبر API
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'حدث خطأ أثناء الرفع إلى Cloudinary.');

      // 3. أخذ الرابط الآمن المحسّن من Cloudinary
      const secureUrl = data.secure_url;

      // 4. ربط الرابط بالسؤال في قاعدة البيانات (Supabase)
      const { error: updateErr } = await supabase
        .from('extracted_questions')
        .update({ image_url: secureUrl })
        .eq('id', questionId);

      if (updateErr) throw updateErr;

      setStatus({ type: 'success', msg: 'تم رفع الصورة عبر Cloudinary وربطها بنجاح! ☁️' });
      await fetchReviewData(); // تحديث الواجهة لرؤية الصورة
      
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'فشل الرفع، تأكد من إعدادات Cloudinary.' });
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a]">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* الترويسة */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Image className="text-amber-400" /> مدير صور الأسئلة والرسومات (Cloudinary Edition)
            </h1>
            <p className="text-xs text-slate-400 mt-1">مستند: {document?.title}</p>
          </div>
          <button onClick={() => router.push('/reviews')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors">
            <ChevronRight className="w-4 h-4" /> العودة للمكتبة
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-xl font-bold text-xs flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <AlertCircle className="w-4 h-4" /> {status.msg}
          </div>
        )}

        {/* قائمة الأسئلة */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            // كشف ذكي إذا كان الذكاء الاصطناعي وضع تنبيهاً بوجود صورة
            const isMissingImage = q.question_text.includes('[يوجد رسم') || q.question_text.includes('[يوجد شكل');
            
            return (
              <div key={q.id} className={`glass-panel p-6 rounded-2xl border transition-all ${isMissingImage && !q.image_url ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5 bg-[#0f1423]/20'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  
                  {/* نص السؤال المقتطع للمعاينة */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-black/40 text-slate-400 font-black text-xs flex items-center justify-center shrink-0 mt-1">{idx + 1}</span>
                    <div className="text-sm font-bold text-white max-w-xl leading-relaxed overflow-hidden">
                      <Latex>{q.question_text}</Latex>
                    </div>
                  </div>

                  {/* أزرار الرفع المباشر */}
                  <div className="shrink-0 flex items-center gap-4 w-full md:w-auto justify-end border-t border-white/5 md:border-none pt-4 md:pt-0">
                    {q.image_url ? (
                      <div className="flex items-center gap-3">
                        {/* معاينة الصورة المرفوعة من كلاودينري */}
                        <img src={q.image_url} alt="معاينة" className="w-14 h-14 object-cover bg-white rounded-lg border border-white/20 shadow-md" />
                        <label className="cursor-pointer px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 transition-colors">
                          تغيير الصورة
                          <input type="file" accept="image/*" onChange={(e) => handleCloudinaryUpload(e, q.id)} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg ${uploadingId === q.id ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : isMissingImage ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'}`}>
                        {uploadingId === q.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingId === q.id ? 'جاري الرفع...' : isMissingImage ? 'رفع الرسم الناقص ⚠️' : 'إرفاق صورة اختيارية'}
                        <input type="file" accept="image/*" disabled={uploadingId === q.id} onChange={(e) => handleCloudinaryUpload(e, q.id)} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
