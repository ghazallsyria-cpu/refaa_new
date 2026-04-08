'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Plus, FolderTree, Image as ImageIcon, 
  Trash2, Edit2, Save, XCircle, ChevronRight, 
  Layers, Globe, Target, ShieldAlert, Lock, 
  Upload, Search, CheckCircle2, AlertCircle,
  MoreVertical, LayoutGrid, Tag, ArrowLeft, Hash, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useForums } from '@/hooks/useForums';
import Link from 'next/link';
import ImageUpload from '@/components/ImageUpload';

export default function ForumsManagementPage() {
  const { structuredCategories, schoolClasses, fetchCategoriesAndClasses, createCategory, updateCategory } = useForums();
  
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'structure' | 'library'>('structure');
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({
    name: '', description: '', parent_id: 'none', 
    target_classes: [] as string[], post_perm: 'all', reply_perm: 'all', icon_url: ''
  });

  const [assetForm, setAssetForm] = useState({ name: '', url: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [removeIcon, setRemoveIcon] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchCategoriesAndClasses();
    const { data: assetData } = await supabase.from('forum_assets').select('*').order('created_at', { ascending: false });
    if (assetData) setAssets(assetData);
    setLoading(false);
  }, [fetchCategoriesAndClasses]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCatModal = (cat: any = null, parentId: string = 'none') => {
    if (cat) {
      setEditingCat(cat);
      setCatForm({
        name: cat.name, description: cat.description || '',
        parent_id: cat.parent_id || 'none',
        target_classes: cat.target_classes || [],
        post_perm: cat.post_permission || 'all',
        reply_perm: cat.reply_permission || 'all',
        icon_url: cat.icon || ''
      });
    } else {
      setEditingCat(null);
      setCatForm({
        name: '', description: '', parent_id: parentId, 
        target_classes: [], post_perm: 'all', reply_perm: 'all', icon_url: ''
      });
    }
    setRemoveIcon(false);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload: any = {
      name: catForm.name,
      description: catForm.description,
      parent_id: catForm.parent_id === 'none' ? null : catForm.parent_id,
      target_classes: catForm.target_classes.length === 0 ? null : catForm.target_classes,
      post_permission: catForm.post_perm as any,
      reply_permission: catForm.reply_perm as any
    };

    if (catForm.icon_url) {
       payload.icon = catForm.icon_url;
    } else if (removeIcon || !editingCat) {
       payload.icon = null;
    }

    const result = editingCat ? await updateCategory(editingCat.id, payload) : await createCategory(payload);
    if (result.success) { setIsCatModalOpen(false); loadData(); } else { alert("خطأ: " + result.error); }
    setIsSubmitting(false);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.url || !assetForm.name) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('forum_assets').insert([assetForm]);
    if (!error) { setIsAssetModalOpen(false); setAssetForm({ name: '', url: '' }); loadData(); }
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('سيتم حذف القسم وجميع المواضيع بداخله، هل أنت متأكد؟')) return;
    const { error } = await supabase.from('forum_categories').delete().eq('id', id);
    if (!error) loadData();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 p-4 sm:p-6 lg:p-8 font-sans" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center border border-indigo-100"><Settings className="h-8 w-8 text-indigo-600" /></div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">مركز إدارة المنتديات</h1>
            <p className="text-slate-500 mt-1 font-bold">إدارة الهيكل، الصلاحيات، ومكتبة الوسائط الذكية.</p>
          </div>
        </div>
        <div className="flex gap-3">
           <Link href="/forums" className="px-6 py-4 rounded-2xl bg-slate-50 text-slate-600 font-black text-sm flex items-center gap-2 hover:bg-slate-100 border border-slate-200"><ArrowLeft className="w-4 h-4" /> معاينة المنتدى</Link>
           <button onClick={() => handleOpenCatModal()} className="px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"><Plus className="w-5 h-5" /> قسم رئيسي جديد</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-3xl w-fit shadow-sm">
        <button onClick={() => setActiveTab('structure')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'structure' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><FolderTree className="w-4 h-4" /> هيكل المنتديات</button>
        <button onClick={() => setActiveTab('library')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><ImageIcon className="w-4 h-4" /> مكتبة الوسائط</button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>
            ) : structuredCategories.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200"><LayoutGrid className="w-20 h-20 text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold">لا توجد أقسام مبرمجة حالياً.</p></div>
            ) : (
              structuredCategories.map((main) => (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={main.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-sm relative flex items-center justify-center">
                        {main.icon ? <img src={main.icon} alt={main.name} className="w-full h-full object-cover" /> : <Layers className="w-6 h-6 text-indigo-600"/>}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-900">{main.name}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 line-clamp-1">{main.description || 'لا يوجد وصف.'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleOpenCatModal(null, main.id)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="إضافة فرع"><Plus className="w-5 h-5"/></button>
                      <button onClick={() => handleOpenCatModal(main)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-5 h-5"/></button>
                      <button onClick={() => handleDeleteCategory(main.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </div>
                  
                  {/* Subcategories */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {main.subcategories?.map(sub => (
                      <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 relative flex items-center justify-center">
                             {sub.icon ? <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" /> : <Hash className="w-5 h-5 m-auto text-slate-300"/>}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 text-sm truncate">{sub.name}</h4>
                            <div className="flex gap-1.5 mt-1">
                               {sub.target_classes?.length > 0 ? <Target className="w-3 h-3 text-amber-500" /> : <Globe className="w-3 h-3 text-emerald-500" />}
                               <span className="text-[9px] font-bold text-slate-400">
                                 {sub.target_classes?.length > 0 ? 'فصول محددة' : 'متاح للجميع'}
                               </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenCatModal(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                          <button onClick={() => handleDeleteCategory(sub.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </div>
                    ))}
                    {(!main.subcategories || main.subcategories.length === 0) && (
                      <p className="col-span-full text-center py-4 text-xs font-bold text-slate-300 italic">لا توجد أقسام فرعية لهذا التصنيف.</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Media Library Tab */}
        {activeTab === 'library' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 sm:p-10 shadow-sm min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-8">
               <div>
                  <h3 className="text-2xl font-black text-slate-900">مكتبة أيقونات المنتديات</h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">ارفع صور المواد مرة واحدة واستخدمها في أي مكان بالمنصة.</p>
               </div>
               <button onClick={() => setIsAssetModalOpen(true)} className="px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                 <Upload className="w-5 h-5" /> إضافة صورة للمكتبة
               </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {assets.map((asset) => (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={asset.id} className="group relative flex flex-col items-center">
                   <div className="w-full aspect-square rounded-[2rem] border-2 border-slate-100 bg-slate-50 overflow-hidden shadow-sm group-hover:border-indigo-400 group-hover:shadow-indigo-100 transition-all cursor-pointer relative">
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover p-2 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={async() => { if(confirm('حذف من المكتبة؟')) { await supabase.from('forum_assets').delete().eq('id', asset.id); loadData(); } }} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"><Trash2 className="w-4 h-4"/></button>
                      </div>
                   </div>
                   <p className="mt-3 text-xs font-black text-slate-700 truncate w-full text-center">{asset.name}</p>
                </motion.div>
              ))}
              {assets.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 font-bold">مكتبة الوسائط فارغة حالياً.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Category Edit/Add Modal */}
      <AnimatePresence>
        {isCatModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl border border-white/20 my-auto overflow-hidden">
              <div className="bg-slate-50 p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingCat ? 'تعديل القسم' : 'إنشاء قسم جديد'}</h2>
                   <p className="text-sm font-bold text-slate-500">تحكم بالبيانات، الأيقونات، وصلاحيات الوصول للطلاب.</p>
                </div>
                <button onClick={() => setIsCatModalOpen(false)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-all"><XCircle className="w-7 h-7" /></button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6 sm:p-10 space-y-8 bg-white max-h-[75vh] overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">اسم القسم</label><input type="text" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="مثال: قسم مادة الفيزياء" /></div>
                    <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">الوصف</label><textarea rows={3} value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" placeholder="نبذة مختصرة..." /></div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">التصنيف الأب</label>
                      <select value={catForm.parent_id} onChange={e => setCatForm({...catForm, parent_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none cursor-pointer">
                        <option value="none">🌟 قسم رئيسي (لا يتبع لأحد)</option>
                        {structuredCategories.filter(m => m.id !== editingCat?.id).map(m => (<option key={m.id} value={m.id}>↳ يتبع لـ: {m.name}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2 text-center">أيقونة القسم الذكية</label>
                    <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-6 relative group/icon">
                       <div className="h-28 w-28 rounded-[2.5rem] bg-white border-2 border-slate-100 shadow-inner flex items-center justify-center relative overflow-hidden">
                          {catForm.icon_url && !removeIcon ? <img src={catForm.icon_url} alt="Icon" className="w-full h-full object-cover p-2" /> : <ImageIcon className="w-12 h-12 text-slate-200" />}
                       </div>
                       
                       <div className="flex flex-col gap-3 w-full">
                          <button type="button" onClick={() => setShowAssetPicker(true)} className="w-full py-3.5 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><LayoutGrid className="w-4 h-4" /> اختيار من مكتبة المواد</button>
                          <div className="flex items-center gap-2"><div className="h-px bg-slate-200 flex-1"></div><span className="text-[10px] font-black text-slate-400">أو</span><div className="h-px bg-slate-200 flex-1"></div></div>
                          <button type="button" onClick={() => { setCatForm({...catForm, icon_url: ''}); setRemoveIcon(true); }} className="w-full py-3 bg-white text-rose-500 font-black text-xs rounded-2xl border border-rose-100 hover:bg-rose-50 transition-all">حذف الأيقونة الحالية</button>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                   <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-black text-indigo-900 mb-2"><Users className="w-5 h-5 text-indigo-600" /> الفصول المصرح لها بالمشاركة</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        {schoolClasses.map((cls: any) => (
                          <button key={cls.id} type="button" onClick={() => setCatForm(prev => ({ ...prev, target_classes: prev.target_classes.includes(cls.id) ? prev.target_classes.filter((i: string) => i !== cls.id) : [...prev.target_classes, cls.id] }))} className={`px-4 py-2 rounded-xl text-[11px] font-black border transition-all ${catForm.target_classes.includes(cls.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{cls.name}</button>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">اتركها فارغة ليكون القسم متاحاً للجميع.</p>
                   </div>

                   <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">من يملك حق نشر المواضيع؟</label>
                        <select value={catForm.post_perm} onChange={e => setCatForm({...catForm, post_perm: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none">
                          <option value="all">الجميع (حسب الفصول المحددة)</option><option value="teachers_admin">المعلمون والإدارة فقط</option><option value="admin_only">الإدارة فقط</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">من يملك حق الرد؟</label>
                        <select value={catForm.reply_perm} onChange={e => setCatForm({...catForm, reply_perm: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-black outline-none">
                          <option value="all">الجميع (حسب الفصول المحددة)</option><option value="teachers_admin">المعلمون والإدارة فقط</option><option value="none">مغلق للجميع (للقراءة فقط)</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 hover:bg-black text-white py-5 rounded-[1.5rem] font-black flex justify-center items-center gap-3 shadow-2xl active:scale-95 transition-all">
                      {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-6 h-6" />} {editingCat ? 'حفظ التغييرات' : 'اعتماد وبناء القسم'}
                  </button>
                  <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-10 py-5 rounded-[1.5rem] font-black bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Asset Picker Overlay */}
      <AnimatePresence>
        {showAssetPicker && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-12 bg-indigo-950/80 backdrop-blur-xl">
             <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl p-8 sm:p-12 overflow-hidden flex flex-col h-[80vh]">
                <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900">اختر أيقونة من المكتبة</h3>
                   </div>
                   <button onClick={() => setShowAssetPicker(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"><X className="w-7 h-7" /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                   <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                      {assets.map(asset => (
                        <div key={asset.id} onClick={() => { setCatForm({...catForm, icon_url: asset.url}); setRemoveIcon(false); setShowAssetPicker(false); }} className={`group flex flex-col items-center cursor-pointer transition-all ${catForm.icon_url === asset.url ? 'scale-105' : 'hover:scale-105'}`}>
                           <div className={`w-full aspect-square rounded-3xl bg-slate-50 border-4 transition-all flex items-center justify-center relative ${catForm.icon_url === asset.url ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl' : 'border-white group-hover:border-indigo-100'}`}>
                              <img src={asset.url} alt={asset.name} className="w-full h-full object-cover p-3" />
                              {catForm.icon_url === asset.url && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-lg"><CheckCircle2 className="w-4 h-4" /></div>}
                           </div>
                           <p className={`mt-3 text-xs font-black transition-colors ${catForm.icon_url === asset.url ? 'text-indigo-600' : 'text-slate-500'}`}>{asset.name}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {isAssetModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 sm:p-10 border border-white/20">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-slate-900">إضافة أصل جديد</h2>
                <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-all"><XCircle className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveAsset} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">اسم المادة / الصورة</label>
                  <div className="relative">
                     <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" required value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-11 pl-4 py-4 font-black outline-none focus:border-indigo-500 transition-all" placeholder="مثال: أيقونة الفيزياء" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 pr-2">رفع الملف</label>
                  <ImageUpload onUploadSuccess={(url) => setAssetForm({...assetForm, url: url || ''})} initialImageUrl={assetForm.url} label="ارفع شعار المادة الرسمي" />
                </div>
                <button type="submit" disabled={isSubmitting || !assetForm.url} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                  حفظ في المكتبة
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}
