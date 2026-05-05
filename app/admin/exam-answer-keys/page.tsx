// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCheck2, UploadCloud, EyeOff, Eye, Trash2, 
  ShieldCheck, Loader2, BookOpen, Plus, FileText, CheckCircle2, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function ExamAnswerKeysAdmin() {
  const router = useRouter();
  const { user, authRole, userRole } = useAuth() as any;
  const currentRole = authRole || userRole;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);
  
  const [activeLevel, setActiveLevel] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject_id: '',
    class_level: 10,
    file_url: '',
    is_published: false
  });

  const currentYear = '2025-2026';
  const currentSemester = 'الفصل الدراسي الثاني';

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: subs } = await supabase.from('subjects').select('id, name').order('name');
      setSubjects(subs || []);

      const { data: keys } = await supabase.from('exam_answer_keys')
        .select(`*, subjects(name), users(full_name)`)
        .eq('academic_year', currentYear)
        .eq('semester', currentSemester)
        .order('created_at', { ascending: false });
        
      setAnswerKeys(keys || []);
    } catch (error) {
      console.error('Error fetching answer keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (currentRole === 'admin' || currentRole === 'management') {
      fetchData(); 
    }
  }, [currentRole]);

  // ☁️ دالة الرفع إلى Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, { 
        method: 'POST', body: uploadData 
      });
      const data = await res.json();
      
      if (data.secure_url) {
        setFormData({ ...formData, file_url: data.secure_url });
      } else {
        throw new Error('فشل رفع الملف');
      }
    } catch (err: any) {
      alert('خطأ أثناء الرفع: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.subject_id || !formData.file_url) {
      alert('يرجى تعبئة العنوان، اختيار المادة، وإرفاق الملف!');
      return;
    }

    setIsSaving(true);
    try {
      await supabase.from('exam_answer_keys').insert([{
        title: formData.title,
        subject_id: formData.subject_id,
        class_level: formData.class_level,
        file_url: formData.file_url,
        is_published: formData.is_published,
        academic_year: currentYear,
        semester: currentSemester,
        uploaded_by: user?.id
      }]);

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء حفظ النموذج');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishStatus = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('exam_answer_keys').update({ is_published: !currentStatus }).eq('id', id);
      fetchData(); // تحديث القائمة
    } catch (error) {
      alert('حدث خطأ أثناء تغيير حالة النشر');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النموذج نهائياً؟')) return;
    try {
      await supabase.from('exam_answer_keys').delete().eq('id', id);
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const openModal = () => {
    setFormData({ title: '', subject_id: '', class_level: activeLevel, file_url: '', is_published: false });
    setIsModalOpen(true);
  };

  // 🛡️ حماية الغرفة
  if (currentRole !== 'admin' && currentRole !== 'management') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-cairo" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck className="w-12 h-12 text-rose-500" /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">منطقة محظورة! 🛑</h1>
          <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">عذراً، هذه الغرفة مخصصة لمدير النظام والإدارة العليا فقط.</p>
          <button onClick={() => router.back()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-md active:scale-95">العودة للخلف</button>
        </div>
      </div>
    );
  }

  const filteredKeys = answerKeys.filter(k => k.class_level === activeLevel);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-cairo" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8 relative">
        
        {/* 🚀 الهيدر */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-emerald-50/50 pointer-events-none"><FileCheck2 className="w-64 h-64" /></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
              <FileCheck2 className="w-8 h-8 text-emerald-600" /> خزانة نماذج الإجابات
            </h1>
            <p className="text-slate-500 font-bold text-sm">ارفع نماذج الإجابات الرسمية واحتفظ بها سرية حتى انتهاء وقت الاختبار.</p>
          </div>
          <div className="relative z-10">
            <button onClick={openModal} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2">
              <UploadCloud className="w-5 h-5" /> إيداع نموذج جديد
            </button>
          </div>
        </div>

        {/* 🚀 تبويبات الصفوف */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
          <button onClick={() => setActiveLevel(10)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeLevel === 10 ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف العاشر
          </button>
          <button onClick={() => setActiveLevel(11)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeLevel === 11 ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            الصف الحادي عشر
          </button>
        </div>

        {/* 🚀 المحتوى */}
        {isLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 mb-2">الخزانة فارغة</h3>
            <p className="text-sm font-bold text-slate-500">لم يتم إيداع أي نماذج إجابة لهذا الصف بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKeys.map((keyObj, idx) => (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={keyObj.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-2 h-full ${keyObj.is_published ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 line-clamp-1" title={keyObj.title}>{keyObj.title}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3"/> {keyObj.subjects?.name}
                    </p>
                  </div>
                  <div className="flex gap-1">
                     <button onClick={() => window.open(keyObj.file_url, '_blank')} className="p-2 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-lg" title="عرض النموذج"><FileText className="w-4 h-4"/></button>
                     <button onClick={() => handleDelete(keyObj.id)} className="p-2 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 mb-6">
                  <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${keyObj.is_published ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="flex items-center gap-3">
                      {keyObj.is_published ? <Eye className="w-6 h-6 text-emerald-600"/> : <EyeOff className="w-6 h-6 text-rose-600"/>}
                      <div>
                        <p className={`text-sm font-black ${keyObj.is_published ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {keyObj.is_published ? 'مُعلن للطلاب' : 'سري (مخفي)'}
                        </p>
                        <p className={`text-[10px] font-bold mt-0.5 ${keyObj.is_published ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {keyObj.is_published ? 'يمكن للطلاب رؤيته الآن' : 'فقط الإدارة يمكنها رؤيته'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => togglePublishStatus(keyObj.id, keyObj.is_published)} className={`w-full py-3.5 rounded-xl font-black text-sm transition-all flex justify-center items-center gap-2 ${keyObj.is_published ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-900 text-white shadow-md hover:bg-slate-800'}`}>
                  {keyObj.is_published ? 'إخفاء النموذج' : 'نشر للطلاب والمعلمين'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 نافذة إيداع النموذج */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => !isSaving && !isUploading && setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UploadCloud className="w-6 h-6 text-emerald-600"/> إيداع نموذج إجابة
                </h3>
                <button onClick={() => !isSaving && !isUploading && setIsModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">عنوان النموذج</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:border-emerald-500" placeholder="مثال: نموذج إجابة فيزياء (الفترة الأولى)" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">المادة الدراسية</label>
                    <select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500">
                      <option value="">-- المادة --</option>
                      {subjects.map(s => ( <option key={s.id} value={s.id}>{s.name}</option> ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">الصف الدراسي</label>
                    <select value={formData.class_level} onChange={(e) => setFormData({...formData, class_level: Number(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500">
                      <option value={10}>العاشر</option>
                      <option value={11}>الحادي عشر</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">إرفاق الملف (PDF أو صورة)</label>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full p-6 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition-colors text-emerald-700">
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin"/> : <UploadCloud className="w-6 h-6"/>}
                    <span className="font-black text-sm">{isUploading ? 'جاري الرفع السحابي...' : (formData.file_url ? 'تم إرفاق الملف بنجاح! ✓' : 'اضغط لاختيار الملف من جهازك')}</span>
                  </button>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-amber-800">نشر مباشر للطلاب؟</p>
                    <p className="text-[10px] font-bold text-amber-600 mt-0.5">إذا تركته مغلقاً، سيبقى سرياً للإدارة فقط.</p>
                  </div>
                  <input type="checkbox" checked={formData.is_published} onChange={(e) => setFormData({...formData, is_published: e.target.checked})} className="w-6 h-6 accent-amber-600" />
                </div>

                <button onClick={handleSave} disabled={isSaving || isUploading} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors shadow-md mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                  {isSaving ? 'جاري الحفظ...' : 'حفظ النموذج في الخزانة'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
