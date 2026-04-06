'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useTopics } from '@/hooks/useTopics';
import { useForums } from '@/hooks/useForums'; // 🚀 استيراد هوك المنتديات لإنشاء القسم الفرعي
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ForumEditor from '@/components/ForumEditor';
import { 
  ArrowRight, MessageSquare, Plus, Search, Loader2, 
  Pin, Lock, User, Clock, Send, XCircle, ShieldCheck, GraduationCap, BookOpen, Layers, Hash,
  Target, ShieldAlert, Image as ImageIcon, Save // 🚀 استيرادات أيقونات نافذة القسم الفرعي
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';
  const canUploadImage = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management';

  const { topics, categoryInfo, loading, fetchTopicsAndCategory, createTopic } = useTopics(categoryId);
  const { createCategory, schoolClasses } = useForums(); // 🚀 استخدام دوال إنشاء القسم والصفوف

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🚀 حالات حفظ وإنشاء الأقسام الفرعية
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatDesc, setNewSubCatDesc] = useState('');
  const [subTargetClasses, setSubTargetClasses] = useState<string[]>([]);
  const [subPostPerm, setSubPostPerm] = useState('all');
  const [subReplyPerm, setSubReplyPerm] = useState('all');
  const [subCoverUrl, setSubCoverUrl] = useState('');
  const [isSubUploading, setIsSubUploading] = useState(false);
  const [isSubSubmitting, setIsSubSubmitting] = useState(false);

  useEffect(() => {
    fetchTopicsAndCategory();
    fetchSubcategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*, forum_topics(count)')
        .eq('parent_id', categoryId)
        .order('created_at', { ascending: true });

      if (data) {
        const formatted = data.map((cat: any) => ({
          ...cat,
          topics_count: cat.forum_topics?.[0]?.count || 0
        }));
        setSubcategories(formatted);
      }
    } catch (err) {
      console.error('Error fetching subcategories:', err);
    }
  };

  const checkPostPermission = () => {
    if (!currentRole || !categoryInfo) return false;
    const perm = categoryInfo.post_permission;
    
    if (perm === 'all' || !perm) return true;
    if (perm === 'admin_only' && (currentRole === 'admin' || currentRole === 'management')) return true;
    if (perm === 'teachers_admin' && (currentRole === 'admin' || currentRole === 'management' || currentRole === 'teacher')) return true;
    
    return false;
  };

  const canPost = checkPostPermission();

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = newContent.replace(/<[^>]+>/g, '').trim();
    if (!newTitle.trim() || (!strippedContent && !newContent.includes('<img'))) {
      alert("الرجاء كتابة عنوان ومحتوى للموضوع.");
      return;
    }
    
    setIsSubmitting(true);
    const result = await createTopic(newTitle, newContent, user.id);

    if (result.success) {
      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
    } else {
      alert(`خطأ في النشر: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  // 🚀 دوال إنشاء القسم الفرعي الجديد
  const toggleSubClass = (classId: string) => {
    if (subTargetClasses.includes(classId)) setSubTargetClasses(subTargetClasses.filter(id => id !== classId));
    else setSubTargetClasses([...subTargetClasses, classId]);
  };

  const handleSubCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSubUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) setSubCoverUrl(data.secure_url);
    } catch (error) { alert('خطأ في رفع الصورة'); } 
    finally { setIsSubUploading(false); }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatName.trim()) return;
    setIsSubSubmitting(true);
    
    const payload = {
      name: newSubCatName,
      description: newSubCatDesc,
      parent_id: categoryId, // 🚀 تحديد القسم الحالي كقسم أب للقسم الجديد
      target_classes: subTargetClasses.length === 0 ? null : subTargetClasses,
      icon: subCoverUrl || null,
      post_permission: subPostPerm as any, 
      reply_permission: subReplyPerm as any 
    };

    const result = await createCategory(payload);
    if (result.success) {
      setIsSubCatModalOpen(false); 
      setNewSubCatName(''); 
      setNewSubCatDesc(''); 
      setSubTargetClasses([]); 
      setSubCoverUrl('');
      setSubPostPerm('all');
      setSubReplyPerm('all');
      fetchSubcategories(); // 🚀 تحديث قائمة الأقسام الفرعية فوراً
    } else {
      alert(`خطأ في إنشاء القسم: ${result.error}`);
    }
    setIsSubSubmitting(false);
  };

  const filteredTopics = topics.filter((t: any) => 
    t.title.includes(searchQuery) || t.content.includes(searchQuery)
  );

  const getSnippet = (html: string) => {
    if (typeof document === 'undefined') return '';
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || "";
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  if (loading && !categoryInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">جاري تحميل بيانات القسم والمواضيع...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/forums')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowRight className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{categoryInfo?.name || 'جاري التحميل...'}</h1>
              <p className="text-xs sm:text-sm font-bold text-slate-500 hidden sm:block">{categoryInfo?.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 🚀 زر إضافة القسم الفرعي (للمدير فقط) */}
            {isAdmin && (
              <button 
                onClick={() => setIsSubCatModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <Layers className="w-4 h-4" /> <span className="hidden sm:inline">قسم فرعي</span>
              </button>
            )}
            
            {canPost && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">موضوع جديد</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {subcategories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> الأقسام الفرعية داخل {categoryInfo?.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subcategories.map(subCat => (
                <Link key={subCat.id} href={`/forums/${subCat.id}`} className="block h-full">
                  <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition-all p-4 flex items-start gap-4 h-full">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 overflow-hidden">
                       {subCat.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={subCat.icon} alt={subCat.name} className="w-full h-full object-contain p-1 bg-white" />
                       ) : (
                          <Hash className="w-6 h-6" />
                       )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 text-sm">{subCat.name}</h3>
                      <p className="text-[11px] font-bold text-slate-500 mt-1 line-clamp-2">{subCat.description || 'قسم فرعي'}</p>
                      <div className="flex gap-2 mt-3">
                         <span className="text-[10px] font-black bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg flex items-center gap-1">
                           <MessageSquare className="w-3 h-3" /> {subCat.topics_count || 0}
                         </span>
                         {subCat.reply_permission === 'none' && (
                            <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Lock className="w-3 h-3" /> للقراءة
                            </span>
                         )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!canPost && !loading && (
           <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-slate-600 text-sm font-bold">
              <Lock className="w-5 h-5 text-slate-400" /> لا تملك صلاحية لإنشاء مواضيع في هذا القسم.
           </div>
        )}

        <div className="relative w-full max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في مواضيع القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 focus:ring-2 focus:ring-indigo-400 outline-none transition-all font-bold text-sm shadow-sm"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" /></div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد مواضيع هنا</h3>
            <p className="text-slate-500 font-bold text-sm mb-6">لم يتم نشر أي مواضيع في هذا القسم بعد.</p>
            {canPost && (
              <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-black bg-indigo-50 px-6 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                كتابة موضوع جديد
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filteredTopics.map((topic: any) => {
              const isStaff = topic.author_role === 'teacher' || topic.author_role === 'admin' || topic.author_role === 'management';
              
              return (
              <Link key={topic.id} href={`/forums/topic/${topic.id}`} className="block hover:bg-slate-50 transition-colors group p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {topic.author_avatar ? (
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-sm border-2 ${isStaff ? 'border-amber-400' : 'border-slate-200'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={topic.author_avatar} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm border-2 ${isStaff ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {isStaff ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {topic.is_pinned && <Pin className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" />}
                      {topic.is_locked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {topic.title}
                      </h3>
                    </div>
                    
                    <p className="text-xs sm:text-sm font-bold text-slate-500 line-clamp-1 mb-3">
                      {getSnippet(topic.content)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                      <span className="flex items-center gap-1 font-black text-slate-700">
                         {isStaff && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                         {topic.author_name}
                      </span>
                      
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold border ${isStaff ? 'bg-amber-50/50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {isStaff ? <BookOpen className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                        {topic.author_badge}
                      </span>

                      {topic.author_gamification_badges && topic.author_gamification_badges.length > 0 && (
                        <div className="flex items-center gap-1 border-r-2 border-indigo-100 pr-2">
                          {topic.author_gamification_badges.map((badge: any, idx: number) => (
                            <div key={idx} className="relative group/badge flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={badge.image_url} 
                                alt={badge.name} 
                                className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-sm hover:scale-110 hover:-translate-y-1 transition-all cursor-help" 
                              />
                              <div className="absolute bottom-full mb-1 px-2 py-1 bg-slate-900 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover/badge:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 shadow-lg border border-slate-700">
                                {badge.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="flex items-center gap-1 text-slate-400 font-bold sm:border-r border-slate-300 sm:pr-2 ml-auto">
                        <Clock className="w-3.5 h-3.5" /> 
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-slate-400">
                    <div className="flex items-center gap-1.5 text-sm font-black bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <span>{topic.replies_count}</span> <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        )}
      </div>

      {/* 🚀 نافذة إضافة موضوع جديد */}
      <AnimatePresence>
        {isModalOpen && canPost && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 my-auto"
            >
              <div className="bg-slate-50 p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">كتابة موضوع جديد</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">أنت تنشر في: <span className="text-indigo-600">{categoryInfo?.name}</span></p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTopic} className="p-5 sm:p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">عنوان الموضوع</label>
                  <input 
                    type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="اكتب عنواناً واضحاً ومختصراً..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-base font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">التفاصيل والمحتوى</label>
                  <ForumEditor 
                    content={newContent} 
                    setContent={setNewContent} 
                    canUploadImage={canUploadImage} 
                  />
                </div>
                
                <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-200 active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} نشر الموضوع
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة إضافة قسم فرعي جديد (خاصة بالمدير) */}
      <AnimatePresence>
        {isSubCatModalOpen && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl border border-slate-100 my-auto">
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900">إضافة قسم فرعي جديد</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">هذا القسم سيتبع مباشرة لـ: <span className="text-indigo-600 font-black">{categoryInfo?.name}</span></p>
                </div>
                <button onClick={() => setIsSubCatModalOpen(false)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleCreateSubCategory} className="p-6 space-y-5">
                
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {subCoverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={subCoverUrl} alt="cover" className="w-full h-full object-contain p-1" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">صورة غلاف القسم (اختياري)</label>
                        <label className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors border ${isSubUploading ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {isSubUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            {isSubUploading ? 'جاري الرفع...' : 'اختر صورة للغلاف'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleSubCoverUpload} disabled={isSubUploading} />
                        </label>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                  <input type="text" required value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-indigo-500 outline-none" />
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100">
                  <label className="flex items-center gap-2 text-xs font-black text-indigo-700 mb-3"><Target className="w-4 h-4" /> الفئة المستهدفة</label>
                  <button type="button" onClick={() => setSubTargetClasses([])} className={`w-full py-2 mb-2 rounded-xl text-sm font-black border-2 ${subTargetClasses.length === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-white'}`}>🌍 عام للجميع</button>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {schoolClasses.map(cls => (
                      <button key={cls.id} type="button" onClick={() => toggleSubClass(cls.id)} className={`py-2 rounded-xl text-xs font-black border-2 ${subTargetClasses.includes(cls.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'}`}>{cls.name}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/50 p-4 rounded-[1.5rem] border border-amber-100">
                  <label className="flex items-center gap-2 text-xs font-black text-amber-700 mb-3"><ShieldAlert className="w-4 h-4" /> صلاحيات القسم الفرعي (مهم)</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">من يمكنه كتابة مواضيع؟</label>
                      <select value={subPostPerm} onChange={e => setSubPostPerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
                        <option value="all">الجميع (طلاب، معلمون، إدارة)</option>
                        <option value="teachers_admin">المعلمون والإدارة فقط</option>
                        <option value="admin_only">الإدارة فقط (قسم رسمي)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">من يمكنه الرد؟</label>
                      <select value={subReplyPerm} onChange={e => setSubReplyPerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400">
                        <option value="all">الجميع</option>
                        <option value="teachers_admin">المعلمون والإدارة فقط</option>
                        <option value="admin_only">الإدارة فقط</option>
                        <option value="none">مغلق للجميع (للقراءة فقط)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">وصف القسم الفرعي</label>
                  <textarea rows={2} value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none" />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSubSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm flex justify-center gap-2">{isSubSubmitting ? <Loader2 className="animate-spin" /> : <Save />} إنشاء القسم الفرعي</button>
                  <button type="button" onClick={() => setIsSubCatModalOpen(false)} className="px-6 py-3.5 rounded-xl font-black text-sm bg-slate-100">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
