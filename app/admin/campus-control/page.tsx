'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, ImageIcon, Newspaper, Plus, Trash2, 
  Save, XCircle, Loader2, Star, Play, Globe, UploadCloud, CheckCircle2,
  AlertCircle, Megaphone, Radio, Bookmark
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export default function CampusControlPage() {
  const [activeTab, setActiveTab] = useState<'studio' | 'magazine' | 'announcements' | 'ticker' | 'ribbon'>('studio');
  const [isLoading, setIsLoading] = useState(true);

  const [studioItems, setStudioItems] = useState<any[]>([]);
  const [magazineItems, setMagazineItems] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [tickers, setTickers] = useState<any[]>([]);
  const [ribbonUrl, setRibbonUrl] = useState<string | null>(null); // 🎀 حالة الوشاح

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studioRes, magazineRes, annRes, tickerRes, ribbonRes] = await Promise.all([
        supabase.from('school_studio').select('*').order('created_at', { ascending: false }),
        supabase.from('school_magazine').select('*').order('created_at', { ascending: false }),
        supabase.from('school_announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('school_ticker').select('*').order('created_at', { ascending: false }),
        supabase.from('school_ribbon').select('*').eq('id', 1).maybeSingle() // جلب الوشاح
      ]);
      if (studioRes.data) setStudioItems(studioRes.data);
      if (magazineRes.data) setMagazineItems(magazineRes.data);
      if (annRes.data) setAnnouncements(annRes.data);
      if (tickerRes.data) setTickers(tickerRes.data);
      if (ribbonRes.data) setRibbonUrl(ribbonRes.data.image_url);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<{ url: string, type: 'image' | 'video', thumb?: string } | null> => {
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) { showToast('حجم الملف ضخم!', 'error'); return null; }
    setIsUploading(true); setUploadProgress(10);
    try {
      const fileName = file.name.toLowerCase();
      const isVideo = file.type.startsWith('video/') || fileName.endsWith('.mov') || fileName.endsWith('.mp4');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default'); 
      const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 90)), 500);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'auto'}/upload`, { method: 'POST', body: formData });
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

  const handleDeleteStudio = async (item: any) => {
    if (!confirm('سيتم الحذف نهائياً. متأكد؟')) return;
    try {
      if (item.media_url) await deleteFromCloudinary(item.media_url);
      await supabase.from('school_studio').delete().eq('id', item.id);
      setStudioItems(prev => prev.filter(i => i.id !== item.id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ', 'error'); }
  };

  const handleDeleteMagazine = async (item: any) => {
    if (!confirm('سيتم الحذف نهائياً. متأكد؟')) return;
    try {
      if (item.cover_image) await deleteFromCloudinary(item.cover_image);
      await supabase.from('school_magazine').delete().eq('id', item.id);
      setMagazineItems(prev => prev.filter(i => i.id !== item.id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ', 'error'); }
  };

  const handleDeleteRecord = async (table: string, id: string, setList: any) => {
    if (!confirm('سيتم الحذف نهائياً. متأكد؟')) return;
    try {
      await supabase.from(table).delete().eq('id', id);
      setList((prev: any) => prev.filter((i: any) => i.id !== id)); showToast('تم الحذف', 'success');
    } catch (e) { showToast('خطأ', 'error'); }
  };

  // 🎀 رفع وحذف الوشاح
  const onRibbonFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await handleFileUpload(file);
    if (uploaded && uploaded.type === 'image') {
      await supabase.from('school_ribbon').upsert({ id: 1, image_url: uploaded.url });
      setRibbonUrl(uploaded.url);
      showToast('تم تركيب الوشاح بنجاح', 'success');
    } else if (uploaded?.type === 'video') {
      showToast('يرجى رفع صورة فقط للوشاح', 'error');
    }
  };

  const handleDeleteRibbon = async () => {
    if (!confirm('هل تريد سحب الوشاح من الشاشة الرئيسية؟')) return;
    if (ribbonUrl) await deleteFromCloudinary(ribbonUrl);
    await supabase.from('school_ribbon').update({ image_url: null }).eq('id', 1);
    setRibbonUrl(null);
    showToast('تم سحب الوشاح بنجاح', 'success');
  };

  const [studioForm, setStudioForm] = useState({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' });
  const [magazineForm, setMagazineForm] = useState({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false });
  const [announceForm, setAnnounceForm] = useState({ title: '', tag: 'إعلان عام' });
  const [tickerForm, setTickerForm] = useState({ content: '' });

  const handleSaveStudio = async (e: React.FormEvent) => { e.preventDefault(); if (!studioForm.media_url) return; setIsSubmitting(true); try { await supabase.from('school_studio').insert([{ ...studioForm, title: studioForm.title || 'بدون عنوان' }]); setIsStudioModalOpen(false); setStudioForm({ title: '', media_type: 'image', media_url: '', thumbnail_url: '' }); fetchData(); showToast('تم النشر', 'success'); } catch (e) { showToast('خطأ', 'error'); } finally { setIsSubmitting(false); } };
  const handleSaveMagazine = async (e: React.FormEvent) => { e.preventDefault(); if (!magazineForm.cover_image) return; setIsSubmitting(true); try { await supabase.from('school_magazine').insert([{ ...magazineForm, title: magazineForm.title || 'خبر عاجل' }]); setIsMagazineModalOpen(false); setMagazineForm({ title: '', excerpt: '', author_name: '', cover_image: '', is_pinned: false }); fetchData(); showToast('تم النشر', 'success'); } catch (e) { showToast('خطأ', 'error'); } finally { setIsSubmitting(false); } };
  const handleSaveAnnounce = async (e: React.FormEvent) => { e.preventDefault(); if (!announceForm.title) return; setIsSubmitting(true); try { await supabase.from('school_announcements').insert([announceForm]); setIsAnnounceModalOpen(false); setAnnounceForm({ title: '', tag: 'إعلان عام' }); fetchData(); showToast('تم النشر', 'success'); } catch (e) { showToast('خطأ', 'error'); } finally { setIsSubmitting(false); } };
  const handleSaveTicker = async (e: React.FormEvent) => { e.preventDefault(); if (!tickerForm.content) return; setIsSubmitting(true); try { await supabase.from('school_ticker').insert([tickerForm]); setIsTickerModalOpen(false); setTickerForm({ content: '' }); fetchData(); showToast('تم الإرسال', 'success'); } catch (e) { showToast('خطأ', 'error'); } finally { setIsSubmitting(false); } };

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
              <div className="p-5 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 shadow-inner"><Globe className="w-10 h-10 text-indigo-400" /></div>
              <div><h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">مركز العمليات</h1><p className="text-slate-400 font-bold text-sm sm:text-base">تحكم كامل في الحرم الرقمي</p></div>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap bg-black/40 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/5 relative shadow-inner gap-1">
              {[
                { id: 'studio', icon: Video, label: 'الاستوديو' },
                { id: 'magazine', icon: Newspaper, label: 'المجلة' },
                { id: 'announcements', icon: Megaphone, label: 'الإعلانات' },
                { id: 'ticker', icon: Radio, label: 'البث الحي' },
                { id: 'ribbon', icon: Bookmark, label: 'الوشاح' } // 🎀 التبويب الجديد
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="relative flex-1 sm:flex-none px-5 py-3.5 rounded-xl text-xs font-black transition-colors z-10">
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
            
            {/* 🎀 5. تبويب الوشاح (The Ribbon) */}
            {activeTab === 'ribbon' && (
              <motion.div key="ribbon" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3"><Bookmark className="text-rose-500" /> الوشاح المتدلي</h2>
                    <p className="text-slate-500 text-xs font-bold mt-1">بانر طولي يتدلى من أعلى الشاشة الرئيسية (للمناسبات والأعياد).</p>
                  </div>
                  <label className={`cursor-pointer ${isUploading ? 'bg-slate-800 text-slate-500 pointer-events-none' : 'bg-rose-600 hover:bg-rose-500 text-white'} px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 border border-rose-400/50`}>
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />} 
                    {isUploading ? `جاري الرفع ${uploadProgress}%` : 'تركيب وشاح جديد'}
                    <input type="file" accept="image/*" className="hidden" onChange={onRibbonFileSelect} disabled={isUploading} />
                  </label>
                </div>

                <div className="flex justify-center py-10">
                  {ribbonUrl ? (
                    <div className="relative group w-40 sm:w-48 h-80 sm:h-96 shadow-2xl rounded-b-xl border-b-2 border-x-2 border-white/10 bg-[#0f1423]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
                      <img src={ribbonUrl} alt="Ribbon" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button onClick={handleDeleteRibbon} className="bg-rose-500 text-white px-4 py-2 rounded-xl font-black flex items-center gap-2 shadow-xl hover:scale-110 transition-transform"><Trash2 className="w-4 h-4" /> سحب الوشاح</button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-40 sm:w-48 h-80 sm:h-96 border-2 border-dashed border-white/10 bg-white/5 rounded-b-xl flex flex-col items-center justify-center opacity-50" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 90%, 0 100%, 0 0)' }}>
                      <Bookmark className="w-12 h-12 text-slate-500 mb-2" />
                      <p className="text-slate-400 font-bold text-xs text-center px-4">لا يوجد وشاح معلق حالياً</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* باقي التبويبات (نفس الكود السابق تماماً) */}
            {activeTab === 'studio' && (<motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">المكتبة البصرية</h2><button onClick={() => setIsStudioModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95"><Plus className="w-5 h-5"/> رفع ميديا</button></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{studioItems.length === 0 ? <div className="col-span-full py-20 text-center rounded-[3rem] border border-white/5 bg-[#0f1423]/30"><p className="text-slate-400 font-black">فارغ حالياً.</p></div> : studioItems.map((item) => (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-[#0f1423] border border-white/5 shadow-lg"><img src={item.media_type === 'video' ? item.thumbnail_url : item.media_url} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" alt="media" /><div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-transparent opacity-90"></div>{item.media_type === 'video' && <div className="absolute inset-0 flex items-center justify-center"><Play className="w-14 h-14 text-white/80 fill-current drop-shadow-2xl" /></div>}<div className="absolute top-4 right-4 flex gap-2"><span className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black text-white shadow-sm flex items-center gap-1.5">{item.media_type === 'video' ? <Video className="w-3.5 h-3.5 text-amber-400" /> : <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />} {item.media_type === 'video' ? 'فيديو' : 'صورة'}</span></div><button onClick={() => handleDeleteStudio(item)} className="absolute top-4 left-4 w-10 h-10 bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center backdrop-blur-md transition-all border border-white/10 active:scale-95 shadow-xl z-20"><Trash2 className="w-5 h-5" /></button><div className="absolute bottom-0 left-0 w-full p-6"><h3 className="font-black text-base text-white line-clamp-2 drop-shadow-md leading-snug">{item.title}</h3></div></motion.div>))}</div></motion.div>)}
            {activeTab === 'magazine' && (<motion.div key="magazine" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">مركز النشر</h2><button onClick={() => setIsMagazineModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-[#02040a] px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"><Plus className="w-5 h-5"/> صياغة خبر</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{magazineItems.length === 0 ? <div className="col-span-full py-20 text-center rounded-[3rem] border border-white/5 bg-[#0f1423]/30"><p className="text-slate-400 font-black">فارغ حالياً.</p></div> : magazineItems.map((article) => (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={article.id} className="group p-4 rounded-[2.5rem] bg-[#0f1423] border border-white/5 hover:border-white/10 transition-colors flex gap-6 shadow-lg"><div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[1.5rem] overflow-hidden bg-black relative shrink-0"><img src={article.cover_image} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" alt="cover" />{article.is_pinned && <div className="absolute top-2 right-2 bg-amber-500 text-black p-1.5 rounded-lg shadow-lg"><Star className="w-3.5 h-3.5 fill-current" /></div>}</div><div className="flex-1 min-w-0 py-2 flex flex-col justify-between"><div><h3 className="font-black text-lg text-white mb-2 line-clamp-2 leading-snug">{article.title}</h3><p className="text-xs text-slate-400 font-bold line-clamp-2">{article.excerpt}</p></div><div className="flex items-center justify-between mt-4"><span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg">{article.author_name}</span><button onClick={() => handleDeleteMagazine(article)} className="text-rose-500 p-2.5 hover:bg-rose-500/20 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button></div></div></motion.div>))}</div></motion.div>)}
            {activeTab === 'announcements' && (<motion.div key="announcements" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">إعلانات سريعة</h2><button onClick={() => setIsAnnounceModalOpen(true)} className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all active:scale-95"><Plus className="w-5 h-5" /> إضافة</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{announcements.map((ann) => (<div key={ann.id} className="glass-panel p-6 rounded-[2rem] border border-white/5 bg-[#0f1423] shadow-lg relative flex flex-col justify-between min-h-[160px]"><div><span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">{ann.tag || 'إعلان'}</span><h3 className="text-lg font-black text-white mt-4">{ann.title}</h3></div><div className="flex justify-end mt-4"><button onClick={() => handleDeleteRecord('school_announcements', ann.id, setAnnouncements)} className="text-rose-500 p-2 hover:bg-rose-500/20 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button></div></div>))}</div></motion.div>)}
            {activeTab === 'ticker' && (<motion.div key="ticker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8"><div className="flex justify-between items-center"><h2 className="text-2xl font-black text-white">البث الحي</h2><button onClick={() => setIsTickerModalOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95"><Plus className="w-5 h-5" /> خبر عاجل</button></div><div className="space-y-4">{tickers.map((ticker) => (<div key={ticker.id} className="flex items-center justify-between glass-panel p-5 rounded-2xl border border-white/5 bg-[#0f1423] shadow-md"><div className="flex items-center gap-4 flex-1"><Radio className="w-5 h-5 text-amber-500 animate-pulse shrink-0" /><p className="text-white font-bold text-sm sm:text-base line-clamp-1">{ticker.content}</p></div><button onClick={() => handleDeleteRecord('school_ticker', ticker.id, setTickers)} className="text-rose-500 p-2 hover:bg-rose-500/20 rounded-xl transition-colors ml-4 shrink-0"><Trash2 className="w-4 h-4" /></button></div>))}</div></motion.div>)}
          </AnimatePresence>
        )}
      </div>

      {/* نوافذ الرفع والإضافة المخفية */}
      <AnimatePresence>
        {isStudioModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative"><div className="p-8 pb-4 flex justify-between items-center"><h3 className="text-2xl font-black text-white">إضافة للمكتبة</h3><button onClick={() => !isUploading && setIsStudioModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400 hover:bg-white/10"><XCircle className="w-6 h-6" /></button></div><form onSubmit={handleSaveStudio} className="p-8 pt-4 space-y-6"><div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full h-56 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${studioForm.media_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10'}`}><input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={onStudioFileSelect} />{isUploading ? (<div className="text-center px-10 w-full"><Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" /><div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${uploadProgress}%` }} /></div><p className="text-indigo-400 font-black text-xs mt-3">جاري المعالجة... {uploadProgress}%</p></div>) : studioForm.media_url ? (<div className="text-center z-10"><CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-2" /><p className="text-emerald-400 font-black text-sm">تم التجهيز بنجاح</p></div>) : (<div className="text-center z-10"><UploadCloud className="w-14 h-14 text-indigo-400 mx-auto mb-3 opacity-80" /><p className="text-white font-black text-sm">انقر لاختيار ملف</p></div>)}{studioForm.thumbnail_url && <img src={studioForm.thumbnail_url} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />}</div><input type="text" value={studioForm.title} onChange={e => setStudioForm({...studioForm, title: e.target.value})} placeholder="العنوان (اختياري)" className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-5 text-white font-bold outline-none focus:border-indigo-500/50" /><button type="submit" disabled={isSubmitting || !studioForm.media_url} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">اعتماد ونشر للرئيسية</button></form></motion.div></div>)}
        {isMagazineModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl overflow-y-auto"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-2xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative my-auto"><div className="p-8 pb-4 flex justify-between items-center"><h3 className="text-2xl font-black text-white">صياغة خبر جديد</h3><button onClick={() => !isUploading && setIsMagazineModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400 hover:bg-white/10"><XCircle className="w-6 h-6" /></button></div><form onSubmit={handleSaveMagazine} className="p-8 pt-4 space-y-6"><div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-full h-40 rounded-[2rem] border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative ${magazineForm.cover_image ? 'border-emerald-500/50' : 'border-white/10 hover:border-white/20'}`}><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onMagazineFileSelect} />{isUploading ? <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /> : magazineForm.cover_image ? <img src={magazineForm.cover_image} className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" /><p className="text-slate-400 text-sm font-black">رفع صورة الغلاف</p></div>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" value={magazineForm.title} onChange={e => setMagazineForm({...magazineForm, title: e.target.value})} placeholder="عنوان الخبر..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50" /><input type="text" value={magazineForm.author_name} onChange={e => setMagazineForm({...magazineForm, author_name: e.target.value})} placeholder="الكاتب" className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50" /></div><textarea rows={3} value={magazineForm.excerpt} onChange={e => setMagazineForm({...magazineForm, excerpt: e.target.value})} placeholder="مقتطف قصير..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 resize-none" /><label className="flex items-center gap-3 cursor-pointer p-5 bg-[#02040a] rounded-2xl border border-white/5 hover:border-white/10 transition-colors"><input type="checkbox" checked={magazineForm.is_pinned} onChange={e => setMagazineForm({...magazineForm, is_pinned: e.target.checked})} className="w-5 h-5 accent-emerald-500" /><span className="text-sm font-black text-white flex items-center gap-2"><Star className="w-4 h-4 text-emerald-400" /> تثبيت كخبر رئيسي</span></label><button type="submit" disabled={isSubmitting || !magazineForm.cover_image} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">نشر في المجلة</button></form></motion.div></div>)}
        {isAnnounceModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-lg rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative"><div className="p-8 pb-4 flex justify-between items-center"><h3 className="text-2xl font-black text-white">إعلان سريع</h3><button onClick={() => setIsAnnounceModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400"><XCircle className="w-6 h-6" /></button></div><form onSubmit={handleSaveAnnounce} className="p-8 pt-4 space-y-5"><input type="text" value={announceForm.title} onChange={e => setAnnounceForm({...announceForm, title: e.target.value})} placeholder="نص الإعلان..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-rose-500/50" required /><input type="text" value={announceForm.tag} onChange={e => setAnnounceForm({...announceForm, tag: e.target.value})} placeholder="تصنيف" className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-rose-500/50" /><button type="submit" disabled={isSubmitting} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">نشر الإعلان</button></form></motion.div></div>)}
        {isTickerModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040a]/90 backdrop-blur-2xl"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0f1423] w-full max-w-lg rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative"><div className="p-8 pb-4 flex justify-between items-center"><h3 className="text-2xl font-black text-white">خبر للبث الحي</h3><button onClick={() => setIsTickerModalOpen(false)} className="bg-white/5 p-2 rounded-full text-slate-400"><XCircle className="w-6 h-6" /></button></div><form onSubmit={handleSaveTicker} className="p-8 pt-4 space-y-5"><textarea rows={4} value={tickerForm.content} onChange={e => setTickerForm({...tickerForm, content: e.target.value})} placeholder="الخبر العاجل..." className="w-full bg-[#02040a] border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-amber-500/50 resize-none" required /><button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-400 text-black py-5 rounded-2xl font-black shadow-lg disabled:opacity-50">إرسال للشريط</button></form></motion.div></div>)}
      </AnimatePresence>
    </div>
  );
}
