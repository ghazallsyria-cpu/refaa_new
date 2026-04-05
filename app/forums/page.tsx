'use client';

import { useState, useEffect } from 'react';

// --- الاستيرادات الأصلية الخاصة بمشروعك (جاهزة لـ Netlify) ---
// ملاحظة: قد تظهر رسالة خطأ في بيئة العرض هنا، لكن الكود سليم 100% للنسخ لمشروعك.
import { useAuth } from '@/context/auth-context';
import { useForums, StructuredCategory } from '@/hooks/useForums'; 
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import Link from 'next/link';
// -------------------------------------------------------------

import { 
  MessageSquare, Plus, Hash, ChevronLeft, Search, 
  Loader2, Sparkles, BookOpen, Layers, Globe, Target, Save, XCircle, Image as ImageIcon, Trash2, Lock, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForumsPage() {
  const { userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';

  const { categories, structuredCategories, schoolClasses, loading, fetchCategoriesAndClasses, createCategory } = useForums();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [parentId, setParentId] = useState<string | 'none'>('none');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  
  const [postPerm, setPostPerm] = useState('all');
  const [replyPerm, setReplyPerm] = useState('all');

  const [coverUrl, setCoverUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCategoriesAndClasses(); }, [fetchCategoriesAndClasses]);

  const toggleClass = (classId: string) => {
    if (targetClasses.includes(classId)) setTargetClasses(targetClasses.filter(id => id !== classId));
    else setTargetClasses([...targetClasses, classId]);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) setCoverUrl(data.secure_url);
    } catch (error) { alert('خطأ في رفع الصورة'); } 
    finally { setIsUploading(false); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    
    const payload = {
      name: newCatName,
      description: newCatDesc,
      parent_id: parentId === 'none' ? null : parentId,
      target_classes: targetClasses.length === 0 ? null : targetClasses,
      icon: coverUrl || null,
      post_permission: postPerm as any, 
      reply_permission: replyPerm as any 
    };

    const result = await createCategory(payload);
    if (result.success) {
      setIsModalOpen(false); 
      setNewCatName(''); 
      setNewCatDesc(''); 
      setParentId('none'); 
      setTargetClasses([]); 
      setCoverUrl('');
      setPostPerm('all');
      setReplyPerm('all');
    } else {
      alert(`خطأ: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (categoryId: string, categoryIconUrl: string | null) => {
      if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المواضيع والردود بداخله.')) return;
      try {
          if (categoryIconUrl) await deleteFromCloudinary(categoryIconUrl);
          await supabase.from('forum_categories').delete().eq('id', categoryId);
          fetchCategoriesAndClasses();
      } catch(e) {
          alert("خطأ في الحذف");
      }
  }

  const filterHierarchy = (cats: StructuredCategory[], query: string): StructuredCategory[] => {
    if (!query) return cats;
    return cats.map(main => {
      const mainMatches = main.name.includes(query) || (main.description && main.description.includes(query));
      const matchingSubs = (main.subcategories || []).filter(sub => sub.name.includes(query) || (sub.description && sub.description.includes(query)));
      if (mainMatches || matchingSubs.length > 0) return { ...main, subcategories: matchingSubs.length > 0 ? matchingSubs : main.subcategories };
      return null;
    }).filter(Boolean) as StructuredCategory[];
  };

  const displayedCategories = filterHierarchy(structuredCategories, searchQuery);

  const CategoryCard = ({ cat }: { cat: StructuredCategory }) => {
    const targetNames = cat.target_classes && cat.target_classes.length > 0 
      ? cat.target_classes.map(id => schoolClasses.find(c => c.id === id)?.name || 'غير معروف').join('، ') 
      : null;

    return (
      <div className="relative group h-full">
        {isAdmin && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(cat.id, cat.icon); }} className="absolute top-2 left-2 z-20 bg-white/80 backdrop-blur-sm p-2 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-100 transition-all shadow-sm border border-rose-100">
                <Trash2 className="w-4 h-4" />
            </button>
        )}
        <Link href={`/forums/${cat.id}`} className="block h-full">
            <motion.div whileHover={{ y: -5, scale: 1.01 }} className="bg-white rounded-[1.5rem] shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-200 transition-all flex flex-col h-full relative overflow-hidden">
            
            {cat.icon ? (
                <div className="h-36 w-full relative bg-slate-50 flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.icon} alt="cover" className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-sm" />
                </div>
            ) : (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            )}
            
            <div className={`p-5 flex flex-col flex-1`}>
                <div className="flex items-start justify-between mb-3">
                    {!cat.icon && (
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100 shrink-0">
                            <Hash className="w-6 h-6" />
                        </div>
                    )}
                    
                    <div className={`flex flex-col gap-2 ${cat.icon ? 'w-full flex-row-reverse justify-between items-center' : 'items-end'}`}>
                        <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <MessageSquare className="w-3.5 h-3.5" /> {cat.topics_count || 0} موضوع
                        </div>
                        
                        {targetNames ? (
                        <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 max-w-[150px]">
                            <Target className="w-3 h-3 shrink-0" />
                            <span className="truncate" dir="ltr" title={targetNames}>{targetNames}</span>
                        </div>
                        ) : (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                            <Globe className="w-3 h-3" /> عام للجميع
                        </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mb-2">
                    {cat.post_permission === 'admin_only' && (
                        <span className="bg-red-50 border border-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> قسم رسمي
                        </span>
                    )}
                    {cat.reply_permission === 'none' && (
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" /> للقراءة فقط
                        </span>
                    )}
                </div>
                
                <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors line-clamp-1">{cat.name}</h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 leading-relaxed line-clamp-2">
                        {cat.description || 'مساحة مخصصة لتبادل النقاشات.'}
                    </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                    <span>دخول القسم</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
            </div>
            </motion.div>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 pt-12 pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-md">المنتديات والنقاشات</h1>
            <p className="text-indigo-100/80 text-xs sm:text-sm md:text-lg font-bold max-w-2xl leading-relaxed">مكان يجمع الطلاب والمعلمين لتبادل الأفكار ببيئة آمنة.</p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="ابحث عن قسم..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-indigo-200/50 rounded-2xl py-3.5 pr-12 pl-4 focus:ring-2 focus:ring-blue-400 outline-none transition-all font-bold text-sm" />
            </div>
            
            {isAdmin && (
              <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border border-emerald-400 text-sm">
                <Layers className="w-5 h-5" /> بناء هيكل المنتدى
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-20 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" /></div>
        ) : displayedCategories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
             <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد أقسام حالياً</h3>
          </div>
        ) : (
          displayedCategories.map((mainCat) => (
            <motion.div key={mainCat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-[2rem] p-5 sm:p-8">
              
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-slate-100">
                <Link href={`/forums/${mainCat.id}`} className="flex items-center gap-4 group flex-1">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                        {mainCat.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mainCat.icon} alt={mainCat.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
                        ) : (
                            <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">{mainCat.name}</h2>
                        {mainCat.description && <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">{mainCat.description}</p>}
                    </div>
                </Link>
                {isAdmin && (
                    <button onClick={() => handleDeleteCategory(mainCat.id, mainCat.icon)} className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100 shrink-0" title="حذف القسم الرئيسي">
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
              </div>

              {mainCat.subcategories && mainCat.subcategories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {mainCat.subcategories.map(subCat => <CategoryCard key={subCat.id} cat={subCat} />)}
                </div>
              ) : (
                 <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-black text-slate-400">لا توجد أقسام فرعية داخل "{mainCat.name}" حتى الآن.</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">اضغط على اسم القسم بالأعلى للدخول إليه أو أضف أقساماً فرعية.</p>
                 </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl border border-slate-100 my-auto">
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900">إضافة قسم للمنتدى</h2>
                    <p className="text-xs font-bold text-slate-500">يمكنك إنشاء قسم رئيسي أو تفريعه.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleCreateCategory} className="p-6 space-y-5">
                
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt="cover" className="w-full h-full object-contain p-1" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">صورة غلاف القسم (اختياري)</label>
                        <label className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors border ${isUploading ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            {isUploading ? 'جاري الرفع...' : 'اختر صورة للغلاف'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploading} />
                        </label>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                  <input type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">تفرع القسم</label>
                  <select value={parentId} onChange={e => setParentId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none">
                    <option value="none">🌟 قسم رئيسي (مستقل)</option>
                    <optgroup label="تفريعه تحت:">
                      {categories.filter(c => !c.parent_id).map(main => <option key={main.id} value={main.id}>↳ يتبع لـ: {main.name}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
                  <label className="flex items-center gap-2 text-xs font-black text-indigo-700 mb-3"><Target className="w-4 h-4" /> الفئة المستهدفة</label>
                  <button type="button" onClick={() => setTargetClasses([])} className={`w-full py-2 mb-2 rounded-xl text-sm font-black border-2 ${targetClasses.length === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-white'}`}>🌍 عام للجميع</button>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {schoolClasses.map(cls => (
                      <button key={cls.id} type="button" onClick={() => toggleClass(cls.id)} className={`py-2 rounded-xl text-xs font-black border-2 ${targetClasses.includes(cls.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`}>{cls.name}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-[1.5rem] border border-amber-100">
                  <label className="flex items-center gap-2 text-xs font-black text-amber-700 mb-3"><ShieldAlert className="w-4 h-4" /> صلاحيات القسم (مهم)</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">من يمكنه كتابة مواضيع؟</label>
                      <select value={postPerm} onChange={e => setPostPerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
                        <option value="all">الجميع (طلاب، معلمون، إدارة)</option>
                        <option value="teachers_admin">المعلمون والإدارة فقط</option>
                        <option value="admin_only">الإدارة فقط (قسم رسمي)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">من يمكنه الرد؟</label>
                      <select value={replyPerm} onChange={e => setReplyPerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
                        <option value="all">الجميع</option>
                        <option value="teachers_admin">المعلمون والإدارة فقط</option>
                        <option value="admin_only">الإدارة فقط</option>
                        <option value="none">مغلق للجميع (للقراءة فقط)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">وصف القسم</label>
                  <textarea rows={2} value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none" />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black text-sm flex justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} اعتماد القسم</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl font-black text-sm bg-slate-100">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
