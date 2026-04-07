'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRight, MessageSquare, Plus, Search, Loader2, 
  Pin, Lock, User, Clock, Send, XCircle, ShieldCheck, GraduationCap, BookOpen, Layers, Hash,
  Target, ShieldAlert, Image as ImageIcon, Save, Edit2, Trash2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';



 import { useParams, useRouter } from 'next/navigation';
 import { useAuth } from '@/context/auth-context';
 import { useTopics } from '@/hooks/useTopics';
 import { useForums } from '@/hooks/useForums';
 import { supabase } from '@/lib/supabase';
 import { deleteFromCloudinary } from '@/lib/cloudinary';
 import Link from 'next/link';
 import ForumEditor from '@/components/ForumEditor';


export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';
  const canUploadImage = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management';

  const { topics, categoryInfo, loading, fetchTopicsAndCategory } = useTopics(categoryId);
  const { createCategory, updateCategory, schoolClasses, fetchCategoriesAndClasses } = useForums(); 

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🚀 إضافات نظام الاستطلاعات
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [studentClassId, setStudentClassId] = useState<string | null>(null); // 🚀 حالة حفظ صف الطالب الحالي
  
  const [isSubCatModalOpen, setIsSubCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
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
    fetchCategoriesAndClasses();
    
    // 🚀 جلب معرف صف الطالب للإخفاء الذكي (Smart Visibility)
    if (currentRole === 'student' && user?.id) {
      const fetchStudentClass = async () => {
        try {
          const { data } = await supabase
            .from('students')
            .select('sections(class_id)')
            .eq('id', user.id)
            .single();
          
          const sec = Array.isArray(data?.sections) ? data?.sections[0] : data?.sections;
          if (sec?.class_id) setStudentClassId(sec.class_id);
        } catch (e) {
          console.error("Error fetching student class", e);
        }
      };
      fetchStudentClass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, currentRole, user?.id]);

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

  // 🚀 الفلترة الذكية للأقسام (Smart Visibility)
  const visibleSubcategories = subcategories.filter(subCat => {
    // 1. الإدارة والمعلمين يرون كل الأقسام دائماً لإدارتها
    if (['admin', 'management', 'teacher'].includes(currentRole)) return true;
    
    // 2. الأقسام العامة (بدون تخصيص فصول) تظهر للجميع
    if (!subCat.target_classes || subCat.target_classes.length === 0) return true;
    
    // 3. مطابقة صف الطالب مع صفوف القسم الفرعي
    if (currentRole === 'student' && studentClassId) {
      return subCat.target_classes.includes(studentClassId);
    }
    
    // 4. إخفاء القسم عن بقية الطلاب
    return false;
  });

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
    
    try {
      const { data: newTopicData, error: topicError } = await supabase
        .from('forum_topics')
        .insert([{
          category_id: categoryId,
          author_id: user.id,
          title: newTitle,
          content: newContent
        }])
        .select()
        .single();

      if (topicError) throw topicError;

      if (hasPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
        const { data: pollData, error: pollError } = await supabase
          .from('forum_polls')
          .insert([{
            topic_id: newTopicData.id,
            question: pollQuestion,
            allow_multiple: allowMultiple
          }])
          .select()
          .single();

        if (!pollError) {
          const validOptions = pollOptions.filter(o => o.trim()).map(opt => ({
            poll_id: pollData.id,
            option_text: opt
          }));
          if (validOptions.length > 0) {
            await supabase.from('forum_poll_options').insert(validOptions);
          }
        }
      }

      setIsModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setHasPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      await fetchTopicsAndCategory();
    } catch (error: any) {
      alert(`خطأ في النشر: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditCategoryModal = (cat: any) => {
    setEditingCatId(cat.id);
    setNewSubCatName(cat.name);
    setNewSubCatDesc(cat.description || '');
    setSubTargetClasses(cat.target_classes || []);
    setSubCoverUrl(cat.icon || '');
    setSubPostPerm(cat.post_permission || 'all');
    setSubReplyPerm(cat.reply_permission || 'all');
    setIsSubCatModalOpen(true);
  };

  const resetSubCatForm = () => {
    setEditingCatId(null);
    setNewSubCatName(''); 
    setNewSubCatDesc(''); 
    setSubTargetClasses([]); 
    setSubCoverUrl('');
    setSubPostPerm('all');
    setSubReplyPerm('all');
  };

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
      target_classes: subTargetClasses.length === 0 ? null : subTargetClasses,
      icon: subCoverUrl || null,
      post_permission: subPostPerm as any, 
      reply_permission: subReplyPerm as any 
    };

    let result;
    if (editingCatId) {
      result = await updateCategory(editingCatId, payload); 
    } else {
      result = await createCategory({ ...payload, parent_id: categoryId });
    }

    if (result.success) {
      setIsSubCatModalOpen(false); 
      resetSubCatForm();
      
      if (editingCatId === categoryId) {
         fetchTopicsAndCategory(); 
      }
      fetchSubcategories(); 
    } else {
      alert(`خطأ: ${result?.error || 'حدث خطأ'}`);
    }
    setIsSubSubmitting(false);
  };

  const handleDeleteCategory = async (catId: string, catIcon: string | null) => {
      if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المواضيع والردود بداخله. هذا الإجراء لا يمكن التراجع عنه.')) return;
      try {
          if (catIcon) await deleteFromCloudinary(catIcon);
          await supabase.from('forum_categories').delete().eq('id', catId);
          if (catId === categoryId) {
              router.push('/forums');
          } else {
              fetchSubcategories();
          }
      } catch(e) {
          alert("خطأ في الحذف");
      }
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
            {isAdmin && (
              <>
                <button 
                  onClick={() => openEditCategoryModal({ ...categoryInfo, id: categoryId, target_classes: (categoryInfo as any)?.target_classes, icon: (categoryInfo as any)?.icon })}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  title="تعديل هذا القسم"
                >
                  <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">إعدادات القسم</span>
                </button>
                <button 
                  onClick={() => { resetSubCatForm(); setIsSubCatModalOpen(true); }}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  <Layers className="w-4 h-4" /> <span className="hidden sm:inline">قسم فرعي</span>
                </button>
              </>
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
        
        {/* 🚀 يتم الآن عرض الأقسام المرئية فقط حسب صلاحيات الطالب (visibleSubcategories) */}
        {visibleSubcategories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" /> الأقسام الفرعية
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSubcategories.map(subCat => {
                const targetNames = subCat.target_classes && subCat.target_classes.length > 0 
                  ? subCat.target_classes.map((id: string) => schoolClasses.find((c: any) => c.id === id)?.name || 'غير معروف').join('، ') 
                  : null;

                return (
                <div key={subCat.id} className="relative group h-full">
                  {isAdmin && (
                      <div className="absolute top-2 left-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditCategoryModal(subCat); }} className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 shadow-sm border border-indigo-100" title="تعديل القسم الفرعي">
                              <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(subCat.id, subCat.icon); }} className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 shadow-sm border border-rose-100" title="حذف القسم الفرعي">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  <Link href={`/forums/${subCat.id}`} className="block h-full">
                    <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition-all p-4 flex items-start gap-4 h-full relative overflow-hidden">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 overflow-hidden">
                         {subCat.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={subCat.icon} alt={subCat.name} className="w-full h-full object-contain p-1 bg-white" />
                         ) : (
                            <Hash className="w-6 h-6" />
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 text-sm">{subCat.name}</h3>
                        <p className="text-[11px] font-bold text-slate-500 mt-1 line-clamp-2">{subCat.description || 'قسم فرعي'}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                           <span className="text-[10px] font-black bg-slate-50 border border-slate-100 text-slate-500 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                             <MessageSquare className="w-3 h-3" /> {subCat.topics_count || 0}
                           </span>
                           {targetNames ? (
                             <span className="text-[10px] font-black bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1 rounded-lg flex items-center gap-1 truncate max-w-[120px]" title={targetNames}>
                               <Target className="w-3 h-3 shrink-0" /> {targetNames}
                             </span>
                           ) : (
                             <span className="text-[10px] font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                               <Globe className="w-3 h-3" /> عام
                             </span>
                           )}
                           {subCat.post_permission === 'admin_only' && (
                              <span className="text-[10px] font-black bg-red-50 border border-red-100 text-red-700 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                <ShieldAlert className="w-3 h-3" /> رسمي
                              </span>
                           )}
                           {subCat.reply_permission === 'none' && (
                              <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                <Lock className="w-3 h-3" /> للقراءة
                              </span>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </div>
              )})}
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

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={hasPoll} onChange={(e) => setHasPoll(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                        <span className="font-bold text-slate-700">إرفاق استطلاع رأي (تصويت) مع الموضوع</span>
                     </label>
                  </div>
                  
                  {hasPoll && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <input type="text" placeholder="اكتب سؤال الاستطلاع هنا..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-2">
                        {pollOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" placeholder={`الخيار رقم ${i + 1}`} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }} className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none" />
                            {pollOptions.length > 2 && (
                              <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg"><XCircle className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">+ إضافة خيار آخر</button>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                           <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="rounded text-indigo-600" />
                           يسمح باختيار أكثر من إجابة
                        </label>
                      </div>
                    </div>
                  )}
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

      <AnimatePresence>
        {isSubCatModalOpen && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl border border-slate-100 my-auto">
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900">{editingCatId ? 'تعديل بيانات القسم' : 'إضافة قسم فرعي جديد'}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                        {editingCatId ? 'قم بتحديث الإعدادات والصلاحيات.' : <>هذا القسم سيتبع مباشرة لـ: <span className="text-indigo-600 font-black">{categoryInfo?.name}</span></>}
                    </p>
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
                    {schoolClasses.map((cls: any) => (
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">وصف القسم {editingCatId ? '' : 'الفرعي'}</label>
                  <textarea rows={2} value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none" />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSubSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm flex justify-center gap-2">{isSubSubmitting ? <Loader2 className="animate-spin" /> : <Save />} {editingCatId ? 'حفظ التعديلات' : 'إنشاء القسم الفرعي'}</button>
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
