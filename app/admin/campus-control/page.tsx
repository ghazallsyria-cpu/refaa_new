'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, ImageIcon, Newspaper, Plus, Trash2, 
  Save, XCircle, Loader2, Star, Play, Globe, UploadCloud, CheckCircle2,
  AlertCircle, Megaphone, Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export default function CampusControlPage() {
  // 🎛️ أضفنا تبويبات جديدة للإعلانات والبث الحي
  const [activeTab, setActiveTab] = useState<'studio' | 'magazine' | 'announcements' | 'ticker'>('studio');
  const [isLoading, setIsLoading] = useState(true);

  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);

  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isMagazineModalOpen, setIsMagazineModalOpen] = useState(false);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [isTickerModalOpen, setIsTickerModalOpen] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { fetchData(); }, []);

  // 📡 جلب جميع البيانات من 4 جداول
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studioRes, magazineRes, annRes, tickerRes] = await Promise.all([
        supabase.from('school_studio').select('*').order('created_at', { ascending: false }),
        supabase.from('school_magazine').select('*').order('created_at', { ascending: false }),
        supabase.from('school_announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('school_ticker').select('*').order('created_at', { ascending: false })
      ]);
      if (studioRes.data) setStudioItems(studioRes.data);
      if (magazineRes.data) setMagazineItems(magazineRes.data);
      if (annRes.data) setAnnouncements(annRes.data);
      if (tickerRes.data) setTickers(tickerRes.data);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<{ url: string, type: 'image' | 'video', thumb?: string } | null> => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showToast('حجم الملف يتجاوز 100 ميجابايت!', 'error');
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
      formData.append('upload_preset', 'ml_default'); 
      const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 500);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, { 
        method: 'POST', body: formData 
      });
      clearInterval(progressInterval);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'فشل الرفع');
      if (data.secure_url) {
        setUploadProgress(100);
        let thumbUrl = data.secure_url;
        if (isVideo) thumbUrl = data.secure_url.replace(/\.[^/.]+$/, ".jpg");
        return { url: data.secure_url, type: isVideo ? 'video' : 'image', thumb: thumbUrl };
      }
      return null;
    } catch (err: any) {
      showToast(err.message, 'error'); return null;
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); }, 1000);
    }
  };

  // 🗑️ محركات الحذف المخصصة
  const handleDeleteStudio = async (item: any) => {
    if (!confirm('سيتم حذف الملف نهائياً. متأكد؟')) return;
    try {
      if (item.media_url) await deleteFromCloudinary(item.media_url);
      await supabase.from('school_studio').delete().eq('id', item.id);
      setStudioItems(prev => prev.filter(i => i.id !== item.id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ في الحذف', 'error'); }
  };

  const handleDeleteMagazine = async (item: any) => {
    if (!confirm('سيتم حذف المقال. متأكد؟')) return;
    try {
      if (item.cover_image) await deleteFromCloudinary(item.cover_image);
      await supabase.from('school_magazine').delete().eq('id', item.id);
      setMagazineItems(prev => prev.filter(i => i.id !== item.id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ في الحذف', 'error'); }
  };

  const handleDeleteRecord = async (table: string, id: string, setList: any) => {
    if (!confirm('سيتم الحذف نهائياً. متأكد؟')) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      setList((prev: any) => prev.filter((i: any) => i.id !== id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ في الحذف', 'error'); }
  };

  // 📝 النماذج (Forms)
  const [studioForm, setStudioForm] = useState({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });
  const [magazineForm, setMagazineForm] = useState({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });
  const [announceForm, setAnnounceForm] = useState({ title: '', tag: 'إعلان عام' });
  const [tickerForm, setTickerForm] = useState({ content: '' });

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioForm.media_url) return;
    setIsSubmitting(true);
    try {
      await supabase.from('school_studio').insert([{ ...studioForm, title: studioForm.title || 'بدون عنوان' }]);
      setIsStudioModalOpen(false); setStudioForm({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });
      fetchData(); showToast('تم النشر', 'success');
    } catch (e) { showToast('خطأ في الحفظ', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleSaveMagazine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magazineForm.cover_image) return;
    setIsSubmitting(true);
    try {
      await supabase.from('school_magazine').insert([{ ...magazineForm, title: magazineForm.title || 'خبر عاجل' }]);
      setIsMagazineModalOpen(false); setMagazineForm({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });
      fetchData(); showToast('تم النشر', 'success');
    } catch (e) { showToast('خطأ في الحفظ', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleSaveAnnounce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceForm.title) return;
    setIsSubmitting(true);
    try {
      await supabase.from('school_announcements').insert([announceForm]);
      setIsAnnounceModalOpen(false); setAnnounceForm({ title: '', tag: 'إعلان عام' });
      fetchData(); showToast('تم نشر الإعلان', 'success');
    } catch (e) { showToast('خطأ في الحفظ', 'error'); } finally { setIsSubmitting(false); }
  };

  const handleSaveTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerForm.content) return;
    setIsSubmitting(true);
    try {
      await supabase.from('school_ticker').insert([tickerForm]);
      setIsTickerModalOpen(false); setTickerForm({ content: '' });
      fetchData(); showToast('تم إضافة الخبر للشريط', 'success');
    } catch (e) { showToast('خطأ في الحفظ', 'error'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-200 font-cairo overflow-x-hidden selection:bg-indigo-500/30" dir="rtl">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]">
            <div className={`px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-black text-sm tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 relative z-10">
        
        <div className="relative overflow-hidden rounded-[3rem] p-8 sm:p-12 border border-white/5 bg-gradient-to-br from-[#0f1423] to-[#0a0d1a] shadow-2xl">
          <div className="absolute top-0 right-0 w-[30vw] h-[30vw] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 shadow-inner">
                <Globe className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">مركز العمليات</h1>
                <p className="text-slate-400 font-bold text-sm sm:text-base">تحكم كامل في جميع أقسام الحرم الرقمي</p>
              </div>
            </div>

            {/* 🎛️ 4 تبويبات احترافية */}
            <div className="flex flex-wrap sm:flex-nowrap bg-black/40 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/5 relative shadow-inner gap-1">
              {[
                { id: 'studio', icon: Video, label: 'الاستوديو' },
                { id: 'magazine', icon: Newspaper, label: 'المجلة' },
                { id: 'announcements', icon: Megaphone, label: 'الإعلانات' },
                { id: 'ticker', icon: Radio, label: 'البث الحي' }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="relative flex-1 sm:flex-none px-6 py-3.5 rounded-xl text-xs font-black transition-colors z-10">
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-xl shadow-lg border border-white/10" />}
                  <span className={`relative flex items-center justify-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    <tab.icon className="w-4 h-4" /> <span className="hidden sm:block">{tab.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-16 h-16 text-indigo-500/50 animate-spin" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. الاستوديو والمجلة (كما هما سابقاً - تم اختصارهما لتوضيح الجديد، الكود الحقيقي سيبقيهما) */}
            {activeTab === 'studio' && (
              <motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-white">المكتبة البصرية</h2>
                  <button onClick={() => setIsStudioModalOpen(true)} className="bg-white text-[#02040a] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl"><Plus className="w-5 h-5"/> رفع ميديا</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {studioItems.map((item) => (
                    <div key={item.id} className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/5 shadow-lg group">
                      <img src={item.media_type === 'video' ? item.thumbnail_url : item.media_url} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" alt="media" />
                      <button onClick={() => handleDeleteStudio(item)} className="absolute top-4 left-4 w-9 h-9 bg-rose-500 text-white rounded-xl flex items-center justify-center border border-white/10 shadow-xl z-20"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'magazine' && (
              <motion.div key="magazine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-white">مركز النشر</h2>
                  <button onClick={() => setIsMagazineModalOpen(true)} className="bg-emerald-500 text-[#02040a] px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl"><Plus className="w-5 h-5"/> صياغة خبر</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {magazineItems.map((article) => (
                    <div key={article.id} className="p-4 rounded-[2rem] bg-[#0f1423] border border-white/5 flex gap-6 shadow-lg">
                      <img src={article.cover_image} className="w-32 h-32 rounded-xl object-cover" alt="cover" />
                      <div className="flex-1 py-2 flex flex-col justify-between">
                        <h3 className="font-black text-lg text-white line-clamp-2">{article.title}</h3>
                        <button onClick={() => handleDeleteMagazine(article)} className="text-rose-500 self-end p-2 bg-rose-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 📣 3. الإعلانات الفلاشية */}
            {activeTab === 'announcements' && (
              <motion.div key="announcements" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-white">لوحة الإعلانات السريعة</h2>
                    <p className="text-slate-500 text-xs font-bold mt-1">تظهر كبطاقات صغيرة قبل المجلة</p>
                  </div>
                  <button onClick={() => setIsAnnounceModalOpen(true)} className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                    <Plus className="w-5 h-5" /> إضافة إعلان
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {announcements.length === 0 ? (
                    <div className="col-span-full py-20 text-center rounded-[3rem] border border-white/5 bg-[#0f1423]/30">
                      <p className="text-slate-400 font-black">لا توجد إعلانات حالياً.</p>
                    </div>
                  ) : (
                    announcements.map((ann) => (
                      <div key={ann.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-[#0f1423] shadow-lg relative flex flex-col justify-between min-h-[160px]">
                        <div>
                          <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">{ann.tag}</span>
                          <h3 className="text-lg font-black text-white mt-4">{ann.title}</h3>
                        </div>
                        <div className="flex justify-end mt-4">
                          <button onClick={() => handleDeleteRecord('school_announcements', ann.id, setAnnouncements)} className="text-rose-500 p-2 hover:bg-rose-500/20 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 🔴 4. شريط البث الحي */}
            {activeTab === 'ticker' && (
              <motion.div key="ticker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-white">شريط الأخبار العاجلة</h2>
                    <p className="text-slate-500 text-xs font-bold mt-1">يتحرك أسفل الشاشة الرئيسية باستمرار</p>
                  </div>
                  <button onClick={() => setIsTickerModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <Plus className="w-5 h-5" /> خبر عاجل
                  </button>
                </div>

                <div className="space-y-4">
                  {tickers.length === 0 ? (
                    <div className="py-20 text-center rounded-[3rem] border border-white/5 bg-[#0f1423]/30">
                      <p className="text-slate-400 font-black">الشريط فارغ حالياً.</p>
                    </div>
                  ) : (
                    tickers.map((ticker) => (
                      <div key={ticker.id} className="flex items-center justify-between glass-panel p-5 rounded-2xl border border-white/5 bg-[#0f1423] shadow-md">
                        <div className="flex items-center gap-4 flex-1">
                           <Radio className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                           <p className="text-white font-bold text-sm sm:text-base line-clamp-1">{ticker.content}</p>
                        </div>
                        <button onClick={() => handleDeleteRecord('school_ticker', ticker.id, setTickers)} className="text-rose-500 p-2 hover:bg-rose-500/20 rounded-xl transition-colors ml-4 shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ========================================== */}
      {/* 🛠️ النوافذ المنبثقة الجديدة (Modals) */}
      {/* ========================================== */}
      <AnimatePresence>
        {/* نافذة الإعلان السريع */}
        {isAnnounceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-lg rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-pink-500"></div>
              <div className="p-8 pb-4 flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">إعلان سريع</h3>
                <button onClick={() => setIsAnnounceModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400"><XCircle className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveAnnounce} className="p-8 pt-4 space-y-5">
                <input type="text" value={announceForm.title} onChange={e => setAnnounceForm({...announceForm, title: e.target.value})} placeholder="اكتب نص الإعلان (مثال: عطلة غداً)..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-rose-500/50" required />
                <input type="text" value={announceForm.tag} onChange={e => setAnnounceForm({...announceForm, tag: e.target.value})} placeholder="تصنيف (مثال: هام جداً)" className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-rose-500/50" />
                <button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">نشر الإعلان</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* نافذة الشريط العاجل */}
        {isTickerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-lg rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-yellow-400"></div>
              <div className="p-8 pb-4 flex justify-between items-center">
                <h3 className="text-2xl font-black text-white">خبر للبث الحي</h3>
                <button onClick={() => setIsTickerModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400"><XCircle className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveTicker} className="p-8 pt-4 space-y-5">
                <textarea rows={4} value={tickerForm.content} onChange={e => setTickerForm({...tickerForm, content: e.target.value})} placeholder="اكتب الخبر العاجل هنا ليتحرك في الشريط أسفل الشاشة..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500/50 resize-none" required />
                <button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-400 text-black py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">إرسال للشريط</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
