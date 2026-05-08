'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, ImageIcon, Newspaper, Plus, Trash2, Edit2, 
  Save, XCircle, Loader2, Star, Play, Globe
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ==========================================
// 🎛️ مركز تحكم الحرم الرقمي (Campus CMS Control Panel)
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

  // 📡 جلب البيانات
  useEffect(() => {
    fetchData();
  }, []);

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

  // 🎬 نماذج بيانات الاستوديو
  const [studioForm, setStudioForm] = useState({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('school_studio').insert([studioForm]);
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

  const handleDeleteStudio = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسيط من الاستوديو؟')) return;
    await supabase.from('school_studio').delete().eq('id', id);
    setStudioItems(prev => prev.filter(item => item.id !== id));
  };

  // 📰 نماذج بيانات المجلة
  const [magazineForm, setMagazineForm] = useState({ title: '', excerpt: '', author_name: 'إدارة المدرسة', cover_image: '', is_pinned: false });

  const handleSaveMagazine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('school_magazine').insert([magazineForm]);
      if (error) throw error;
      
      setIsMagazineModalOpen(false);
      setMagazineForm({ title: '', excerpt: '', author_name: 'إدارة المدرسة', cover_image: '', is_pinned: false });
      fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMagazine = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    await supabase.from('school_magazine').delete().eq('id', id);
    setMagazineItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-cairo p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* 👑 الترويسة الرئيسية */}
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Globe className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">إدارة الحرم الرقمي</h1>
              <p className="text-sm font-bold text-slate-400 mt-1">إضافة صور وأخبار للصفحة الرئيسية</p>
            </div>
          </div>

          <div className="flex bg-[#0f1423] p-1.5 rounded-2xl border border-white/10 relative z-10 w-full md:w-auto">
            <button onClick={() => setActiveTab('studio')} className={`flex-1 md:flex-none flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Video className="w-4 h-4" /> استوديو الرفعة
            </button>
            <button onClick={() => setActiveTab('magazine')} className={`flex-1 md:flex-none flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'magazine' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <Newspaper className="w-4 h-4" /> المجلة
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 🎬 تبويب الاستوديو */}
            {activeTab === 'studio' && (
              <motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-black text-white">معرض الوسائط الحالي</h2>
                  <button onClick={() => setIsStudioModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> إضافة ميديا
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {studioItems.length === 0 ? (
                    <div className="col-span-full py-16 text-center glass-panel rounded-[2rem] border border-white/5">
                      <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-bold">الاستوديو فارغ.</p>
                    </div>
                  ) : (
                    studioItems.map((item) => (
                      <div key={item.id} className="glass-panel rounded-[2rem] overflow-hidden group border border-white/10 relative">
                        <div className="h-48 relative bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.media_type === 'video' ? item.thumbnail_url : item.media_url} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                          {item.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center"><Play className="w-10 h-10 text-white opacity-80" fill="currentColor" /></div>}
                          <button onClick={() => handleDeleteStudio(item.id)} className="absolute top-3 left-3 w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 bg-white/5"><h3 className="font-black text-sm text-white line-clamp-1">{item.title}</h3></div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 📰 تبويب المجلة */}
            {activeTab === 'magazine' && (
              <motion.div key="magazine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-black text-white">المقالات والأخبار</h2>
                  <button onClick={() => setIsMagazineModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                    <Plus className="w-4 h-4" /> مقال جديد
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {magazineItems.length === 0 ? (
                    <div className="col-span-full py-16 text-center glass-panel rounded-[2rem] border border-white/5">
                      <Newspaper className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-bold">المجلة فارغة.</p>
                    </div>
                  ) : (
                    magazineItems.map((article) => (
                      <div key={article.id} className="glass-panel p-5 rounded-[2.5rem] flex gap-5 items-center border border-white/5 group hover:bg-white/5">
                        <div className="w-32 h-32 rounded-[1.5rem] overflow-hidden shrink-0 bg-slate-900 border border-white/10 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={article.cover_image} alt="cover" className="w-full h-full object-cover opacity-80" />
                          {article.is_pinned && <div className="absolute top-2 right-2 bg-amber-500 text-black p-1 rounded-lg"><Star className="w-3 h-3" fill="currentColor" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-lg text-white mb-1 line-clamp-1">{article.title}</h3>
                          <p className="text-xs font-bold text-slate-400 mb-3 line-clamp-2">{article.excerpt}</p>
                          <button onClick={() => handleDeleteMagazine(article.id)} className="text-rose-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* نوافذ الإضافة (Modals) */}
      <AnimatePresence>
        {isStudioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f1423] w-full max-w-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-white">إضافة ميديا</h3><button onClick={() => setIsStudioModalOpen(false)}><XCircle className="w-6 h-6 text-slate-400" /></button></div>
              <form onSubmit={handleSaveStudio} className="p-6 space-y-4">
                <select value={studioForm.media_type} onChange={e => setStudioForm({...studioForm, media_type: e.target.value})} className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white">
                  <option value="image">صورة</option><option value="video">فيديو</option>
                </select>
                <input required type="text" value={studioForm.title} onChange={e => setStudioForm({...studioForm, title: e.target.value})} placeholder="العنوان..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" />
                <input required type="url" value={studioForm.media_url} onChange={e => setStudioForm({...studioForm, media_url: e.target.value})} placeholder="رابط الملف (URL)..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" dir="ltr" />
                {studioForm.media_type === 'video' && <input required type="url" value={studioForm.thumbnail_url} onChange={e => setStudioForm({...studioForm, thumbnail_url: e.target.value})} placeholder="رابط صورة الغلاف للفيديو..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" dir="ltr" />}
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-black mt-4">{isSubmitting ? 'جاري الحفظ...' : 'حفظ ونشر'}</button>
              </form>
            </motion.div>
          </div>
        )}

        {isMagazineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f1423] w-full max-w-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center"><h3 className="text-xl font-black text-emerald-400">كتابة خبر</h3><button onClick={() => setIsMagazineModalOpen(false)}><XCircle className="w-6 h-6 text-slate-400" /></button></div>
              <form onSubmit={handleSaveMagazine} className="p-6 space-y-4">
                <input required type="text" value={magazineForm.title} onChange={e => setMagazineForm({...magazineForm, title: e.target.value})} placeholder="عنوان الخبر..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" />
                <input required type="text" value={magazineForm.author_name} onChange={e => setMagazineForm({...magazineForm, author_name: e.target.value})} placeholder="اسم الكاتب..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" />
                <input required type="url" value={magazineForm.cover_image} onChange={e => setMagazineForm({...magazineForm, cover_image: e.target.value})} placeholder="رابط الصورة (URL)..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white" dir="ltr" />
                <textarea required rows={3} value={magazineForm.excerpt} onChange={e => setMagazineForm({...magazineForm, excerpt: e.target.value})} placeholder="مقتطف قصير..." className="w-full bg-[#02040a] border border-white/10 rounded-xl p-3 text-white resize-none" />
                <label className="flex items-center gap-2 text-sm text-amber-400 font-bold"><input type="checkbox" checked={magazineForm.is_pinned} onChange={e => setMagazineForm({...magazineForm, is_pinned: e.target.checked})} className="w-4 h-4" /> تثبيت كخبر رئيسي</label>
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-black mt-4">{isSubmitting ? 'جاري الحفظ...' : 'نشر الخبر'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
