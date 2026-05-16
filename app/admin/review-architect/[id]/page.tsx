// @ts-nocheck
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Image as ImageIcon, Upload, AlertCircle, ChevronRight, 
  Edit, Save, X, Trash2 
} from 'lucide-react';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

export default function ManageReviewImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [document, setDocument] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات الرفع والتنبيهات
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // 🚀 حالات التعديل المباشر (Inline Editing)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ question_text: '', model_answer: '' });

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

  // ==========================================
  // 1. نظام الرفع إلى Cloudinary
  // ==========================================
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(questionId);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("تأكد من إعدادات Cloudinary في ملف env");

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'خطأ في الرفع');

      const { error: updateErr } = await supabase
        .from('extracted_questions')
        .update({ image_url: data.secure_url })
        .eq('id', questionId);

      if (updateErr) throw updateErr;

      setStatus({ type: 'success', msg: 'تم رفع الصورة بنجاح! ☁️' });
      await fetchReviewData();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setUploadingId(null);
    }
  };

  // ==========================================
  // 2. نظام التعديل الحي (Inline Edit)
  // ==========================================
  const startEditing = (q: any) => {
    setEditingId(q.id);
    setEditForm({ question_text: q.question_text, model_answer: q.model_answer });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ question_text: '', model_answer: '' });
  };

  const saveEditing = async (questionId: string) => {
    try {
      setStatus(null);
      const { error } = await supabase
        .from('extracted_questions')
        .update({ 
          question_text: editForm.question_text, 
          model_answer: editForm.model_answer 
        })
        .eq('id', questionId);

      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'تم حفظ التعديلات بنجاح! ✨' });
      setEditingId(null);
      await fetchReviewData();
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'حدث خطأ أثناء حفظ التعديل.' });
    }
  };

  // ==========================================
  // 3. نظام الحذف (Delete)
  // ==========================================
  const deleteQuestion = async (questionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال نهائياً؟')) return;
    
    try {
      setStatus(null);
      const { error } = await supabase.from('extracted_questions').delete().eq('id', questionId);
      if (error) throw error;
      
      setStatus({ type: 'success', msg: 'تم حذف السؤال! 🗑️' });
      await fetchReviewData();
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'حدث خطأ أثناء الحذف.' });
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
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* الترويسة */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <ImageIcon className="text-amber-400 w-6 h-6" /> المحرر الشامل للكبسولات الوزارية
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-bold flex items-center gap-2">
              مستند: <span className="text-amber-400">{document?.title}</span>
            </p>
          </div>
          <button onClick={() => router.push('/reviews')} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors border border-white/10 shadow-inner">
            <ChevronRight className="w-4 h-4" /> العودة للمكتبة
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <AlertCircle className="w-5 h-5" /> {status.msg}
          </div>
        )}

        {/* قائمة الأسئلة (العرض / التعديل) */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const isMissingImage = q.question_text.includes('[يوجد رسم') || q.question_text.includes('[يوجد شكل');
            const isEditing = editingId === q.id;
            
            return (
              <div key={q.id} className={`glass-panel p-6 sm:p-8 rounded-[2rem] border transition-all ${isMissingImage && !q.image_url && !isEditing ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5 bg-[#0f1423]/40'}`}>
                
                {/* 📝 وضع التعديل (Edit Mode) */}
                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-indigo-400">نص السؤال (مع دعم LaTeX)</label>
                      <textarea 
                        rows={4} 
                        value={editForm.question_text} 
                        onChange={(e) => setEditForm({...editForm, question_text: e.target.value})} 
                        className="w-full bg-black/50 border border-indigo-500/30 rounded-xl p-4 text-white text-sm outline-none focus:border-indigo-500 custom-scrollbar"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-emerald-400">الإجابة النموذجية (مع دعم LaTeX)</label>
                      <textarea 
                        rows={4} 
                        value={editForm.model_answer} 
                        onChange={(e) => setEditForm({...editForm, model_answer: e.target.value})} 
                        className="w-full bg-black/50 border border-emerald-500/30 rounded-xl p-4 text-white text-sm outline-none focus:border-emerald-500 custom-scrollbar"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={() => saveEditing(q.id)} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95">
                        <Save className="w-4 h-4" /> حفظ التعديلات
                      </button>
                      <button onClick={cancelEditing} className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold rounded-xl transition-all border border-rose-500/30">
                        <X className="w-4 h-4" /> إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  
                  // 👁️ وضع العرض الطبيعي (View Mode)
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* محتوى السؤال المعروض */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black text-lg flex items-center justify-center shrink-0 shadow-lg">{idx + 1}</span>
                        <div className="space-y-4 w-full">
                          <div className="text-base font-bold text-white leading-relaxed">
                            <Latex>{q.question_text.replace(/\\\$/g, '$')}</Latex>
                          </div>
                          <div className="bg-emerald-500/10 border-r-4 border-emerald-500 p-4 rounded-xl text-sm font-bold text-slate-300">
                            <span className="text-emerald-400 block mb-1 text-xs uppercase tracking-widest">الإجابة المعتمدة:</span>
                            <Latex>{q.model_answer.replace(/\\\$/g, '$')}</Latex>
                          </div>
                        </div>
                      </div>

                      {/* ⚙️ أزرار التحكم الجانبية (تعديل / حذف) */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => startEditing(q)} className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20 transition-colors" title="تعديل النص">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors" title="حذف السؤال">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>

                    {/* 🖼️ شريط رفع الصور السفلي */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                      <span className="text-xs font-bold text-slate-500">
                        القسم: <span className="text-amber-400">{q.category}</span>
                      </span>
                      
                      <div className="flex items-center gap-4">
                        {q.image_url ? (
                          <div className="flex items-center gap-3">
                            <img src={q.image_url} alt="معاينة" className="w-16 h-16 object-cover bg-white rounded-lg border border-white/20 shadow-md" />
                            <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors">
                              تغيير الصورة
                              <input type="file" accept="image/*" onChange={(e) => handleCloudinaryUpload(e, q.id)} className="hidden" />
                            </label>
                          </div>
                        ) : (
                          <label className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg ${uploadingId === q.id ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : isMissingImage ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'}`}>
                            {uploadingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {uploadingId === q.id ? 'جاري الرفع...' : isMissingImage ? 'رفع الرسم الناقص ⚠️' : 'إرفاق صورة مساعدة'}
                            <input type="file" accept="image/*" disabled={uploadingId === q.id} onChange={(e) => handleCloudinaryUpload(e, q.id)} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
