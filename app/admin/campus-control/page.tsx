'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, ImageIcon, Newspaper, Plus, Trash2, 
  Save, XCircle, Loader2, Star, Play, Globe, UploadCloud, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// ==========================================
// 🎛️ محطة البث المركزية لمدير النظام (Pro Campus CMS)
// المسار: app/admin/campus-control/page.tsx
// التوثيق: إدارة الاستوديو السينمائي والمجلة الأكاديمية مع حذف ذكي من السحابة
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

  // ==========================================
  // 📡 جلب البيانات الأولية
  // ==========================================
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
  // 🚀 محرك الرفع الذكي (المضاد لمشاكل الآيفون و Netlify)
  // ==========================================
  const handleFileUpload = async (file: File): Promise<{ url: string, type: 'image' | 'video', thumb?: string } | null> => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      alert('حجم الملف ضخم جداً! الحد الأقصى المسموح به هو 100 ميجابايت.');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const fileName = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video/') || fileName.endsWith('.mov') || fileName.endsWith('.mp4');
      const resourceType = isVideo ? 'video' : 'auto'; 

      const formData = new FormData();
      formData.append('file', file);
      // إجبار النظام على استخدام ml_default لضمان قبول الفيديوهات دائماً للمدير
      formData.append('upload_preset', 'ml_default');

      const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 500);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { 
        method: 'POST', 
        body: formData 
      });
      
      clearInterval(progressInterval);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'فشل الرفع من المصدر.');
      
      if (data.secure_url) {
        setUploadProgress(100);
        let thumbUrl = data.secure_url;
        if (isVideo) thumbUrl = data.secure_url.replace(/\.[^/.]+$/, ".jpg");
        
        return { url: data.secure_url, type: isVideo ? 'video' : 'image', thumb: thumbUrl };
      }
      return null;
    } catch (err: any) {
      alert(`فشل الرفع: ${err.message}`);
      return null;
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1000);
    }
  };

  // ==========================================
  // 🗑️ محرك الحذف الشامل (Database + Cloudinary)
  // ==========================================
  const handleDeleteStudio = async (item: any) => {
    if (!confirm('هل أنت متأكد من الحذف النهائي؟ سيتم مسح الملف من سحابة Cloudinary أيضاً لتوفير المساحة.')) return;
    try {
      if (item.media_url) await deleteFromCloudinary(item.media_url);
      await supabase.from('school_studio').delete().eq('id', item.id);
      setStudioItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  const handleDeleteMagazine = async (item: any) => {
    if (!confirm('هل أنت متأكد من حذف المقال؟ سيتم مسح صورة الغلاف من السحابة أيضاً.')) return;
    try {
      if (item.cover_image) await deleteFromCloudinary(item.cover_image);
      await supabase.from('school_magazine').delete().eq('id', item.id);
      setMagazineItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      alert('حدث خطأ أثناء الحذف.');
    }
  };

  // ==========================================
  // 🎬 معالجة نماذج الاستوديو
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
    if (!studioForm.media_url) return alert('يرجى رفع ملف أولاً.');
    setIsSubmitting(true);
    try {
      const finalTitle = studioForm.title.trim() || `لقطة جديدة - ${new Date().toLocaleDateString('ar-SA')}`;
      const { error } = await supabase.from('school_studio').insert([{ ...studioForm, title: finalTitle }]);
      if (error) throw error;
      setIsStudioModalOpen(false);
      setStudioForm({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });
      fetchData(); 
    } catch (error) {
      alert('خطأ في الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // 📰 معالجة نماذج المجلة
  // ==========================================
  const [magazineForm, setMagazineForm] = useState({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });

  const onMagazineFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await handleFileUpload(file);
    if (uploaded) setMagazineForm(prev => ({ ...prev, cover_image: uploaded.url }));
  };

  const handleSaveMagazine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magazineForm.cover_image) return alert('يرجى رفع غلاف للمقال.');
    setIsSubmitting(true);
    try {
      const finalTitle = magazineForm.title.trim() || `خبر عاجل - ${new Date().toLocaleDateString('ar-SA')}`;
      const { error } = await supabase.from('school_magazine').insert([{ 
        ...magazineForm, 
        title: finalTitle, 
        excerpt: magazineForm.excerpt || 'لا توجد تفاصيل إضافية.',
        author_name: magazineForm.author_name || 'إدارة المدرسة'
      }]);
      if (error) throw error;
      setIsMagazineModalOpen(false);
      setMagazineForm({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });
      fetchData();
    } catch (error) {
      alert('خطأ في الحفظ');
    } finally {
      setIsSubmitting(false);
    }
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
              <p className="text-sm font-bold text-slate-400 mt-2">تحكم كامل في واجهة الحرم الرقمي</p>
            </div>
          </div>

          <div className="flex bg-[#0f1423]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 relative z-10 w-full md:w-auto">
            <button onClick={() => setActiveTab('studio')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Video className="w-4 h-4" /> الاستوديو
            </button>
            <button onClick={() => setActiveTab('magazine')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-black transition-all ${activeTab === 'magazine' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Newspaper className="w-4 h-4" /> المجلة
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-16 h-16 text-indigo-500 animate-spin" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 🎬 تبويب الاستوديو */}
            {activeTab === 'studio' && (
              <motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black text-white">معرض الوسائط</h2>
                  <button onClick={() => setIsStudioModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Plus className="w-5 h-5" /> رفع ميديا
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {studioItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center glass-panel rounded-[3rem] border border-white/5 border-dashed">
                      <UploadCloud className="w-16 h-16 text-slate-600 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-black">الاستوديو بانتظار لقطاتك الأولى.</p>
                    </div>
                  ) : (
                    studioItems.map((item) => (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="glass-panel rounded-[2rem] overflow-hidden group border border-white/10 relative shadow-xl">
                        <div className="h-56 relative bg-[#0f1423]">
                          <img src={item.media_type === 'video' ? item.thumbnail_url : item.media_url} alt={item.title} className="w-full h-full object-cover opacity-80" />
                          {item.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center"><Play className="w-12 h-12 text-white fill-current" /></div>}
                          
                          {/* 🗑️ زر الحذف: ظاهر دائماً لسهولة الاستخدام على الجوال */}
                          <button onClick={() => handleDeleteStudio(item)} className="absolute top-4 left-4 w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-2xl active:scale-95 z-20 border border-white/10">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-5 bg-white/[0.02] border-t border-white/5">
                          <h3 className="font-black text-sm text-white line-clamp-1">{item.title}</h3>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 📰 تبويب المجلة */}
            {activeTab === 'magazine' && (
              <motion.div key="magazine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <h2 className="text-2xl font-black text-white">المقالات المنشورة</h2>
                  <button onClick={() => setIsMagazineModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    <Plus className="w-5 h-5" /> إضافة مقال
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {magazineItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center glass-panel rounded-[3rem] border border-white/5">
                      <p className="text-slate-400 font-black">لا توجد مقالات منشورة حالياً.</p>
                    </div>
                  ) : (
                    magazineItems.map((article) => (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={article.id} className="glass-panel p-6 rounded-[2.5rem] flex gap-6 items-center border border-white/5 relative">
                        <div className="w-32 h-32 rounded-[1.5rem] overflow-hidden shrink-0 bg-[#0f1423]">
                          <img src={article.cover_image} alt="cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-xl text-white line-clamp-1">{article.title}</h3>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{article.excerpt}</p>
                          <div className="flex items-center justify-between mt-4">
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg">بواسطة: {article.author_name}</span>
                            <button onClick={() => handleDeleteMagazine(article)} className="text-rose-500 p-2 hover:bg-rose-500/10 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {article.is_pinned && <Star className="absolute top-4 right-4 w-5 h-5 text-amber-500 fill-current" />}
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* 🛠️ نافذة رفع الاستوديو */}
      <AnimatePresence>
        {isStudioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f1423] w-full max-w-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-indigo-900/10">
                <h3 className="text-2xl font-black text-white">رفع ميديا جديدة</h3>
                <button onClick={() => !isUploading && setIsStudioModalOpen(false)}><XCircle className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveStudio} className="p-8 space-y-6">
                <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full h-48 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${studioForm.media_url ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-indigo-500/30 bg-indigo-900/10'}`}>
                  <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={onStudioFileSelect} />
                  {isUploading ? (
                    <div className="text-center px-10 w-full">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${uploadProgress}%` }} /></div>
                      <p className="text-indigo-400 font-black text-xs mt-2">جاري المعالجة... {uploadProgress}%</p>
                    </div>
                  ) : studioForm.media_url ? (
                    <div className="text-center"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" /><p className="text-emerald-400 font-black text-sm">تم الرفع بنجاح</p></div>
                  ) : (
                    <div className="text-center"><UploadCloud className="w-12 h-12 text-indigo-400 mx-auto mb-2 opacity-80" /><p className="text-white font-black text-sm">انقر لاختيار صورة أو فيديو</p></div>
                  )}
                </div>
                <input type="text" value={studioForm.title} onChange={e => setStudioForm({...studioForm, title: e.target.value})} placeholder="عنوان اختياري..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500" />
                <button type="submit" disabled={isSubmitting || !studioForm.media_url} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50">اعتماد ونشر</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 🛠️ نافذة إضافة المجلة */}
        {isMagazineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f1423] w-full max-w-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-emerald-900/10">
                <h3 className="text-2xl font-black text-emerald-400">إضافة خبر جديد</h3>
                <button onClick={() => !isUploading && setIsMagazineModalOpen(false)}><XCircle className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveMagazine} className="p-8 space-y-5">
                <div onClick={() => !isUploading && fileInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-emerald-500/30 flex items-center justify-center cursor-pointer overflow-hidden">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onMagazineFileSelect} />
                  {magazineForm.cover_image ? <img src={magazineForm.cover_image} className="w-full h-full object-cover" /> : <p className="text-emerald-500/50 font-black text-sm">رفع صورة الغلاف</p>}
                </div>
                <input type="text" value={magazineForm.title} onChange={e => setMagazineForm({...magazineForm, title: e.target.value})} placeholder="عنوان الخبر..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500" />
                <textarea rows={3} value={magazineForm.excerpt} onChange={e => setMagazineForm({...magazineForm, excerpt: e.target.value})} placeholder="مقتطف الخبر..." className="w-full bg-[#02040a] border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500 resize-none" />
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/10">
                  <input type="checkbox" checked={magazineForm.is_pinned} onChange={e => setMagazineForm({...magazineForm, is_pinned: e.target.checked})} className="w-5 h-5 accent-amber-500" />
                  <span className="text-sm font-black text-amber-500">تثبيت كخبر رئيسي مميز</span>
                </label>
                <button type="submit" disabled={isSubmitting || !magazineForm.cover_image} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50">نشر الخبر الآن</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
