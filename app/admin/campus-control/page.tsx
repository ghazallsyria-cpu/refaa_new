'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, ImageIcon, Newspaper, Plus, Trash2, 
  Save, XCircle, Loader2, Star, Play, Globe, UploadCloud, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ==========================================
// 🎛️ مركز تحكم الحرم الرقمي المتقدم (Pro Campus CMS)
// المسار: app/admin/campus-control/page.tsx
// ==========================================
export default function CampusControlPage() {
  const [activeTab, setActiveTab] = useState<'studio' | 'magazine'>('studio');
  const [isLoading, setIsLoading] = useState(true);

  // 🗃️ بيانات الجداول
  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);

  // 🗃️ حالة النوافذ المنبثقة
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isMagazineModalOpen, setIsMagazineModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ☁️ حالة الرفع إلى Cloudinary
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📡 جلب البيانات
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studioRes, magazineRes] = await Promise.all([
        supabase.from('school_studio').select('*').order('created_at', { ascending: false }),
        supabase.from('school_magazine').select('*').order('created_at', { ascending: false })
      ]);
      if (studioRes.data) setStudioItems(studioRes.data);
      if (magazineRes.data) setMagazineItems(magazineRes.data);
    } catch (error) {
      console.error('Error fetching campus data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 🚀 محرك الرفع الذكي إلى Cloudinary (Smart Uploader)
  // يتعرف على نوع الملف تلقائياً ويولد الغلاف للفيديوهات
  // ==========================================
// ==========================================
  // 🚀 محرك الرفع الذكي والمحصن إلى Cloudinary
  // ==========================================
// ==========================================
  // 🚀 محرك الرفع الذكي والمحصن (مضاد لمشاكل الآيفون)
  // ==========================================
  const handleFileUpload = async (file: File): Promise<{ url: string, type: 'image' | 'video', thumb?: string } | null> => {
    // 🛡️ حماية الحجم (100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('حجم الملف ضخم جداً! الحد الأقصى المسموح به هو 100 ميجابايت.');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // 💡 ذكاء اصطناعي للتعرف على الآيفون: نفحص امتداد الملف يدوياً إذا فشل المتصفح
      const fileName = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video/') || fileName.endsWith('.mov') || fileName.endsWith('.mp4');
      
      // توجيه صريح لـ Cloudinary: إذا كان فيديو، استخدم مسار الفيديو، وإلا دعه يكتشف تلقائياً
      const resourceType = isVideo ? 'video' : 'auto'; 

      const formData = new FormData();
      formData.append('file', file);
formData.append('upload_preset', 'ml_default');

      // محاكاة بصرية للتقدم
      const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 500);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { 
        method: 'POST', 
        body: formData 
      });
      
      clearInterval(progressInterval);
      const data = await res.json();

      if (!res.ok) {
        console.error("Cloudinary Error Details:", data);
        throw new Error(data.error?.message || 'فشل الرفع من المصدر.');
      }
      
      if (data.secure_url) {
        setUploadProgress(100);
        let thumbUrl = data.secure_url;
        
        // توليد الغلاف التلقائي للفيديوهات
        if (isVideo) {
           thumbUrl = data.secure_url.replace(/\.[^/.]+$/, ".jpg");
        }
        
        return { url: data.secure_url, type: isVideo ? 'video' : 'image', thumb: thumbUrl };
      }
      
      throw new Error('لم يتم إرجاع رابط آمن للملف.');
      
    } catch (err: any) {
      console.error('Upload Exception:', err);
      alert(`فشل الرفع: ${err.message}`);
      return null;
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1000);
    }
  };

  // ==========================================
  // 🎬 نماذج بيانات الاستوديو
  // ==========================================
  const [studioForm, setStudioForm] = useState({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });

  const onStudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await handleFileUpload(file);
    if (uploaded) {
      setStudioForm(prev => ({ 
        ...prev, 
        media_url: uploaded.url, 
        media_type: uploaded.type, 
        thumbnail_url: uploaded.thumb || uploaded.url 
      }));
    }
  };

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioForm.media_url) return alert('يجب رفع ملف ميديا أولاً.');
    
    setIsSubmitting(true);
    try {
      // إذا ترك العنوان فارغاً، نضع تاريخ اليوم كافتراضي
      const finalTitle = studioForm.title.trim() || `ميديا جديدة - ${new Date().toLocaleDateString('ar-SA')}`;
      
      const { error } = await supabase.from('school_studio').insert([{ ...studioForm, title: finalTitle }]);
      if (error) throw error;
      
      setIsStudioModalOpen(false);
      setStudioForm({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });
      fetchData(); 
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 📰 نماذج بيانات المجلة
  // ==========================================
  const [magazineForm, setMagazineForm] = useState({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });

  const onMagazineFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) return alert('المجلة تقبل الصور فقط للغلاف.');
    
    const uploaded = await handleFileUpload(file);
    if (uploaded) {
      setMagazineForm(prev => ({ ...prev, cover_image: uploaded.url }));
    }
  };

  const handleSaveMagazine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magazineForm.cover_image) return alert('يجب رفع صورة غلاف للمقال.');
    
    setIsSubmitting(true);
    try {
      const finalTitle = magazineForm.title.trim() || `خبر جديد - ${new Date().toLocaleDateString('ar-SA')}`;
      const finalExcerpt = magazineForm.excerpt.trim() || 'تفاصيل الخبر ستضاف قريباً...';
      const finalAuthor = magazineForm.author_name.trim() || 'إدارة المدرسة';

      const { error } = await supabase.from('school_magazine').insert([{ 
        ...magazineForm, 
        title: finalTitle, 
        excerpt: finalExcerpt, 
        author_name: finalAuthor 
      }]);
      if (error) throw error;
      
      setIsMagazineModalOpen(false);
      setMagazineForm({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async (table: string, id: string, setList: any) => {
    if (!confirm('هل أنت متأكد من الحذف النهائي؟')) return;
    await supabase.from(table).delete().eq('id', id);
    setList((prev: any[]) => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-cairo p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* 👑 الترويسة الرئيسية */}
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-5 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-[1.5rem] border border-indigo-500/30 shadow-inner">
              <Globe className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">محطة البث المركزية</h1>
              <p className="text-sm font-bold text-slate-400 mt-2">إدارة متطورة لمحتوى الحرم الرقمي الخاص بالرفعة</p>
            </div>
          </div>

          <div className="flex bg-[#0f1423]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 relative z-10 w-full md:w-auto shadow-inner">
            <button onClick={() => setActiveTab('studio')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-white'}`}>
              <Video className="w-4 h-4" /> استوديو المدرسة
            </button>
            <button onClick={() => setActiveTab('magazine')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === 'magazine' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}>
              <Newspaper className="w-4 h-4" /> المجلة الإخبارية
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-16 h-16 text-indigo-500 animate-spin drop-shadow-[0_0_20px_rgba(79,70,229,0.5)]" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ========================================== */}
            {/* 🎬 تبويب الاستوديو */}
            {/* ========================================== */}
            {activeTab === 'studio' && (
              <motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3"><Video className="text-indigo-500" /> معرض الوسائط الحالي</h2>
                  <button onClick={() => setIsStudioModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 border border-indigo-400/50">
                    <Plus className="w-5 h-5" /> رفع ميديا جديدة
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {studioItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center glass-panel rounded-[3rem] border border-white/5 border-dashed">
                      <UploadCloud className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-black text-lg">الاستوديو فارغ حالياً.</p>
                      <p className="text-slate-500 font-bold text-sm mt-2">قم برفع أول صورة أو فيديو ليظهر في الصفحة الرئيسية.</p>
                    </div>
                  ) : (
                    studioItems.map((item) => (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="glass-panel rounded-[2rem] overflow-hidden group border border-white/10 relative shadow-xl hover:shadow-indigo-500/20 transition-all">
                        <div className="h-56 relative bg-[#0f1423]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.media_type === 'video' ? item.thumbnail_url : item.media_url} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                          {item.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center"><Play className="w-12 h-12 text-white opacity-90 drop-shadow-lg" fill="currentColor" /></div>}
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-[10px] font-black text-white shadow-sm">
                            {item.media_type === 'video' ? <Video className="w-4 h-4 text-amber-400" /> : <ImageIcon className="w-4 h-4 text-indigo-400" />}
                            {item.media_type === 'video' ? 'فيديو' : 'صورة'}
                          </div>
                          <button onClick={() => deleteRecord('school_studio', item.id, setStudioItems)} className="absolute top-4 left-4 w-10 h-10 bg-rose-500/90 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-rose-400/50 active:scale-95">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-5 bg-white/[0.02] border-t border-white/5">
                          <h3 className="font-black text-base text-white line-clamp-1">{item.title}</h3>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================== */}
            {/* 📰 تبويب المجلة */}
            {/* ========================================== */}
            {activeTab === 'magazine' && (
              <motion.div key="magazine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3"><Newspaper className="text-emerald-500" /> المقالات والأخبار</h2>
                  <button onClick={() => setIsMagazineModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 border border-emerald-400/50">
                    <Plus className="w-5 h-5" /> صياغة خبر جديد
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {magazineItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center glass-panel rounded-[3rem] border border-white/5 border-dashed">
                      <Newspaper className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-black text-lg">المجلة فارغة حالياً.</p>
                      <p className="text-slate-500 font-bold text-sm mt-2">انشر أخبار المدرسة وإعلاناتها لتظهر للزوار.</p>
                    </div>
                  ) : (
                    magazineItems.map((article) => (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={article.id} className="glass-panel p-6 rounded-[2.5rem] flex flex-col sm:flex-row gap-6 items-center border border-white/5 group hover:bg-white/5 transition-colors shadow-lg">
                        <div className="w-full sm:w-40 h-40 rounded-[1.5rem] overflow-hidden shrink-0 bg-[#0f1423] border border-white/10 relative shadow-inner">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={article.cover_image} alt="cover" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
                          {article.is_pinned && <div className="absolute top-2 right-2 bg-amber-500 text-[#02040a] px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-md"><Star className="w-3 h-3" fill="currentColor" /> مميز</div>}
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <h3 className="font-black text-xl text-white mb-2 line-clamp-1">{article.title}</h3>
                          <p className="text-sm font-bold text-slate-400 mb-4 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-white/5 font-black">{article.author_name}</span>
                            <button onClick={() => deleteRecord('school_magazine', article.id, setMagazineItems)} className="text-rose-500 hover:bg-rose-500 hover:text-white p-2.5 rounded-xl transition-colors border border-transparent hover:border-rose-400/50 active:scale-95">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ========================================== */}
      {/* 🛠️ نوافذ الرفع والإضافة (Pro Modals with Cloudinary) */}
      {/* ========================================== */}
      
      {/* 1. استوديو المدرسة */}
      <AnimatePresence>
        {isStudioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-gradient-to-b from-[#0f1423] to-[#0a0d1a] w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.2)]">
              
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-indigo-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30"><UploadCloud className="w-6 h-6 text-indigo-400" /></div>
                  <h3 className="text-2xl font-black text-white">الرفع للاستوديو</h3>
                </div>
                <button onClick={() => !isUploading && setIsStudioModalOpen(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSaveStudio} className="p-8 space-y-6">
                
                {/* ☁️ منطقة رفع كلاودينري (Cloudinary Dropzone) */}
                <div className="relative group">
                  <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={onStudioFileSelect} disabled={isUploading} />
                  
                  <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full h-48 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative ${studioForm.media_url ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-indigo-500/30 bg-indigo-900/10 hover:bg-indigo-900/20'}`}>
                    
                    {isUploading ? (
                      <div className="text-center z-10 w-full px-12">
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                           <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-indigo-400 font-black text-sm">جاري الرفع لـ Cloudinary... {uploadProgress}%</p>
                      </div>
                    ) : studioForm.media_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={studioForm.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="preview" />
                        <div className="z-10 text-center bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                          <p className="text-emerald-400 font-black text-sm">تم الرفع بنجاح! ({studioForm.media_type === 'video' ? 'فيديو' : 'صورة'})</p>
                          <p className="text-slate-400 text-[10px] font-bold mt-1">انقر للتغيير</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center z-10">
                        <UploadCloud className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                        <p className="text-white font-black text-sm">انقر لاختيار صورة أو مقطع فيديو</p>
                        <p className="text-slate-500 text-[10px] font-bold mt-2">النظام سيتعرف على النوع ويستخرج الغلاف تلقائياً</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* الحقول الاختيارية */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 flex items-center justify-between">
                    <span>عنوان الميديا</span>
                    <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px]">اختياري</span>
                  </label>
                  <input type="text" value={studioForm.title} onChange={e => setStudioForm({...studioForm, title: e.target.value})} placeholder="اتركه فارغاً للتسمية التلقائية..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600" />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={isSubmitting || !studioForm.media_url || isUploading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} اعتماد الميديا
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. مجلة المعرفة */}
        {isMagazineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-xl overflow-y-auto py-10">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-gradient-to-b from-[#0f1423] to-[#0a0d1a] w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.2)] my-auto">
              
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-emerald-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30"><Newspaper className="w-6 h-6 text-emerald-400" /></div>
                  <h3 className="text-2xl font-black text-white">صياغة خبر للمجلة</h3>
                </div>
                <button onClick={() => !isUploading && setIsMagazineModalOpen(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSaveMagazine} className="p-8 space-y-6">
                
                {/* ☁️ منطقة رفع صورة الغلاف */}
                <div className="relative group">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onMagazineFileSelect} disabled={isUploading} />
                  <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden relative ${magazineForm.cover_image ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-600/50 bg-slate-800/30 hover:bg-slate-800/50'}`}>
                    {isUploading ? (
                      <div className="text-center z-10 w-full px-12">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
                        <p className="text-emerald-400 font-black text-xs">جاري رفع صورة الغلاف... {uploadProgress}%</p>
                      </div>
                    ) : magazineForm.cover_image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={magazineForm.cover_image} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="preview" />
                        <div className="z-10 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> <span className="text-white font-black text-xs">تم رفع الغلاف</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center z-10">
                        <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-80" />
                        <p className="text-white font-black text-sm"><span className="text-rose-500">*</span> انقر لرفع صورة الغلاف</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 flex justify-between"><span>عنوان الخبر</span><span className="text-slate-600 text-[10px]">اختياري</span></label>
                    <input type="text" value={magazineForm.title} onChange={e => setMagazineForm({...magazineForm, title: e.target.value})} placeholder="خبر عاجل..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 flex justify-between"><span>الكاتب</span><span className="text-slate-600 text-[10px]">اختياري</span></label>
                    <input type="text" value={magazineForm.author_name} onChange={e => setMagazineForm({...magazineForm, author_name: e.target.value})} placeholder="إدارة المدرسة" className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 flex justify-between"><span>مقتطف الخبر</span><span className="text-slate-600 text-[10px]">اختياري</span></label>
                  <textarea rows={3} value={magazineForm.excerpt} onChange={e => setMagazineForm({...magazineForm, excerpt: e.target.value})} placeholder="اكتب تفاصيل الخبر هنا ليقرأها الزوار..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500 resize-none custom-scrollbar" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-4 bg-amber-500/5 hover:bg-amber-500/10 rounded-2xl border border-amber-500/20 transition-colors">
                  <input type="checkbox" checked={magazineForm.is_pinned} onChange={e => setMagazineForm({...magazineForm, is_pinned: e.target.checked})} className="w-5 h-5 accent-amber-500 rounded bg-[#02040a]" />
                  <span className="text-sm font-black text-amber-500 flex items-center gap-2"><Star className="w-5 h-5" /> تثبيت كخبر رئيسي مميز (يظهر ضخماً في الواجهة)</span>
                </label>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button type="submit" disabled={isSubmitting || !magazineForm.cover_image || isUploading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} اعتماد النشر
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
}
