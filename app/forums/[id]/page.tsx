'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowRight, MessageSquare, Plus, Search, Loader2, 
  Pin, Lock, User, Clock, Send, XCircle, ShieldCheck, GraduationCap, BookOpen, Layers, Hash,
  Target, ShieldAlert, Image as ImageIcon, Save, Edit2, Trash2, Globe,
  Sparkles, Quote, Trophy, Crown, Upload, Users
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

const ICON_MAP: Record<string, any> = {
  'Sparkles': Sparkles,
  'Trophy': Trophy,
  'Quote': Quote,
  'Image': ImageIcon
};

const DEFAULT_SLIDE = {
  id: 'default',
  icon_name: 'Sparkles',
  badge_text: 'القلب النابض للمنصة',
  title: 'مجتمع النقاشات المفتوحة',
  description: 'مساحة تفاعلية تجمع بين العقول المبدعة. شارك أفكارك، اطرح أسئلتك، وكن جزءاً من رحلة التعلم المستمرة.',
  color_gradient: 'from-indigo-400 to-blue-500',
  type: 'welcome'
};

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
  
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [studentClassId, setStudentClassId] = useState<string | null>(null); 
  
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

  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchHeroSlides = async () => {
      const { data, error } = await supabase
        .from('forum_hero_slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) setHeroSlides(data);
    };
    fetchHeroSlides();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    fetchTopicsAndCategory();
    fetchSubcategories();
    fetchCategoriesAndClasses();
    
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

  // 🚀 إظهار جميع الأقسام الفرعية للجميع (للقراءة)
  const visibleSubcategories = subcategories;

  // 🚀 فحص ذكي جداً لـ (من يحق له كتابة مواضيع؟)
  const checkPostPermission = () => {
    if (!currentRole || !categoryInfo) return false;
    
    // الإدارة يحق لها النشر دائماً
    if (currentRole === 'admin' || currentRole === 'management') return true;
    
    const perm = categoryInfo.post_permission;
    
    // إذا كان القسم للإدارة فقط، يمنع الباقين
    if (perm === 'admin_only') return false;
    
    // المعلم يحق له النشر في أي قسم ليس للإدارة فقط
    if (currentRole === 'teacher') return true;
    
    // إذا كان القسم للمعلمين والإدارة، يمنع الطلاب
    if (perm === 'teachers_admin') return false;
    
    // الطالب يحق له النشر إذا كان القسم مفتوحاً (all) وكان ضمن الفئة المستهدفة
    if (currentRole === 'student') {
       if (!categoryInfo.target_classes || categoryInfo.target_classes.length === 0) return true; // متاح للكل
       if (studentClassId && categoryInfo.target_classes.includes(studentClassId)) return true; // الطالب ينتمي للفصل
       return false; // الطالب لا ينتمي للفصل المستهدف
    }
    
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

  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  if (loading && !categoryInfo) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-indigo-500 selection:text-white" dir="rtl">
      
      {/* الواجهة العلوية الديناميكية */}
      <div className="relative pt-24 pb-40 overflow-hidden bg-[#0F172A] rounded-b-[3rem] sm:rounded-b-[4rem] z-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 mix-blend-screen pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 h-full min-h-[200px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlideData.id}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center text-center w-full"
            >
              {currentSlideData.badge_text && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs sm:text-sm font-black mb-4 backdrop-blur-md shadow-sm">
                  <SlideIcon className="w-4 h-4" />
                  {currentSlideData.badge_text}
                </div>
              )}

              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentSlideData.color_gradient || 'from-white to-slate-300'} tracking-tight mb-4 drop-shadow-lg line-clamp-2`}>
                {currentSlideData.title}
              </h1>

              {currentSlideData.description && (
                <p className="text-slate-300 text-sm sm:text-base font-bold max-w-2xl leading-relaxed mb-6 line-clamp-3">
                  {currentSlideData.description}
                </p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 sm:p-3 flex items-center gap-3 pr-4 shadow-xl">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-400 drop-shadow-md z-10 rotate-12" />
                        <img src={student.img} alt={student.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/50 shadow-inner bg-white/50 object-cover" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-black text-white">{student.name}</p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-300">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="mt-6 w-full max-w-2xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-white/20">
                    <img src={currentSlideData.media_url} alt="Media" className="w-full h-auto max-h-80 object-cover" />
                 </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {heroSlides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-6 sm:w-8 bg-white' : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/50'}`} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        )}
      </div>

      {/* شريط أدوات القسم (Glassmorphism & Sticky) */}
      <div className="sticky top-4 z-40 max-w-6xl mx-auto px-4 sm:px-6 -mt-10 mb-8 transition-all">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-3 sm:p-4 rounded-[2rem] shadow-[0_10px_30px_rgb(0,0,0,0.08)] flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <button onClick={() => router.push('/forums')} className="p-2 sm:p-3 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors shrink-0">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 mb-1">
                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1 shrink-0"><BookOpen className="w-3 h-3"/> قسم</span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 truncate w-full">{categoryInfo?.name || 'جاري التحميل...'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button 
                  onClick={() => openEditCategoryModal({ ...categoryInfo, id: categoryId, target_classes: (categoryInfo as any)?.target_classes, icon: (categoryInfo as any)?.icon })}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
                  title="تعديل هذا القسم"
                >
                  <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">إعدادات القسم</span>
                </button>
                <button 
                  onClick={() => { resetSubCatForm(); setIsSubCatModalOpen(true); }}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  <Layers className="w-4 h-4" /> <span className="hidden sm:inline">قسم فرعي</span>
                </button>
              </>
            )}
            
            {canPost && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">موضوع جديد</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-10 relative z-20">
        
        {/* 🚀 الأقسام الفرعية */}
        {visibleSubcategories.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-3 px-2">
              <Layers className="w-6 h-6 text-indigo-600" /> الأقسام الفرعية
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleSubcategories.map(subCat => {
                const targetNames = subCat.target_classes && subCat.target_classes.length > 0 
                  ? subCat.target_classes.map((id: string) => schoolClasses.find((c: any) => c.id === id)?.name || 'غير معروف').join('، ') 
                  : null;

                return (
                <div key={subCat.id} className="relative group h-full">
                  {isAdmin && (
                      <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditCategoryModal(subCat); }} className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700 shadow-md border border-indigo-100 transition-all active:scale-95" title="تعديل القسم الفرعي">
                              <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(subCat.id, subCat.icon); }} className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-rose-500 hover:bg-rose-100 hover:text-rose-600 shadow-md border border-rose-100 transition-all active:scale-95" title="حذف القسم الفرعي">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  <Link href={`/forums/${subCat.id}`} className="block h-full outline-none focus:ring-4 focus:ring-indigo-500/50 rounded-[2rem]">
                    <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(99,102,241,0.12)] border border-slate-200 hover:border-indigo-200 transition-all flex items-start gap-4 h-full relative overflow-hidden group/card p-5 sm:p-6">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 overflow-hidden relative">
                         {subCat.icon ? (
                            <img src={subCat.icon} alt={subCat.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500" />
                         ) : (
                            <Hash className="w-6 h-6 sm:w-7 sm:h-7 group-hover/card:scale-110 transition-transform" />
                         )}
                         <div className="absolute inset-0 bg-indigo-900/5 opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover/card:text-indigo-600 transition-colors line-clamp-1">{subCat.name}</h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 line-clamp-1">{subCat.description || 'قسم فرعي للمناقشة'}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                           <span className="text-[10px] font-black bg-slate-50 border border-slate-100 text-slate-500 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                             <MessageSquare className="w-3 h-3" /> {subCat.topics_count || 0}
                           </span>
                           {targetNames ? (
                             <span className="text-[10px] font-black bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded-lg flex items-center gap-1 truncate max-w-[100px]" title={targetNames}>
                               <Target className="w-3 h-3 shrink-0" /> {targetNames}
                             </span>
                           ) : (
                             <span className="text-[10px] font-black bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                               <Globe className="w-3 h-3" /> عام
                             </span>
                           )}
                           {subCat.post_permission === 'admin_only' && (
                              <span className="text-[10px] font-black bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                <ShieldAlert className="w-3 h-3" /> رسمي
                              </span>
                           )}
                           {subCat.reply_permission === 'none' && (
                              <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
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
           <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex items-center gap-3 text-slate-600 text-sm font-bold shadow-sm">
              <Lock className="w-5 h-5 text-slate-400 shrink-0" /> لا تملك صلاحية لكتابة مواضيع جديدة في هذا القسم، لكن يمكنك القراءة.
           </div>
        )}

        <div className="relative w-full max-w-md">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في مواضيع القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pr-14 pl-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-sm shadow-sm placeholder-slate-400"
          />
        </div>

        {/* 🚀 قائمة المواضيع */}
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" /></div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] shadow-sm border border-slate-200">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد مواضيع هنا</h3>
            <p className="text-slate-500 font-bold text-sm mb-8">لم يتم نشر أي مواضيع في هذا القسم بعد.</p>
            {canPost && (
              <button onClick={() => setIsModalOpen(true)} className="text-white font-black bg-indigo-600 px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95">
                كتابة أول موضوع
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filteredTopics.map((topic: any) => {
              const isStaff = topic.author_role === 'teacher' || topic.author_role === 'admin' || topic.author_role === 'management';
              
              return (
              <Link key={topic.id} href={`/forums/topic/${topic.id}`} className="block hover:bg-slate-50/80 transition-colors group p-6 sm:p-8">
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="shrink-0 pt-1">
                    {topic.author_avatar ? (
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] overflow-hidden shadow-sm border-2 ${isStaff ? 'border-amber-400' : 'border-slate-200'}`}>
                        <img src={topic.author_avatar} alt="avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] flex items-center justify-center shadow-sm border-2 ${isStaff ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {isStaff ? <ShieldCheck className="w-7 h-7" /> : <User className="w-7 h-7" />}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {topic.is_pinned && <Pin className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" />}
                      {topic.is_locked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {topic.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm font-bold text-slate-500 line-clamp-1 mb-4">
                      {getSnippet(topic.content)}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                         {isStaff && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                         {topic.author_name}
                      </span>
                      
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border ${isStaff ? 'bg-amber-50/50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {isStaff ? <BookOpen className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                        {topic.author_badge}
                      </span>

                      {topic.author_gamification_badges && topic.author_gamification_badges.length > 0 && (
                        <div className="flex items-center gap-1 border-r-2 border-slate-200 pr-3 ml-1">
                          {topic.author_gamification_badges.map((badge: any, idx: number) => (
                            <div key={idx} className="relative group/badge flex items-center justify-center">
                              <img 
                                src={badge.image_url} 
                                alt={badge.name} 
                                className="w-6 h-6 object-contain drop-shadow-sm hover:scale-110 hover:-translate-y-1 transition-all cursor-help" 
                              />
                              <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/badge:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 shadow-xl border border-slate-700">
                                {badge.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="flex items-center gap-1.5 text-slate-400 font-bold sm:border-r border-slate-200 sm:pr-3 ml-auto">
                        <Clock className="w-3.5 h-3.5" /> 
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end justify-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-sm font-black bg-white border border-slate-200 px-4 py-2 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] shadow-[0_30px_60px_rgb(0,0,0,0.15)] w-full max-w-4xl overflow-hidden border border-white/20 my-auto"
            >
              <div className="bg-gradient-to-l from-slate-50 to-white p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">كتابة موضوع جديد</h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">أنت تنشر في: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{categoryInfo?.name}</span></p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-all active:scale-95">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTopic} className="p-6 sm:p-8 space-y-8 bg-slate-50/30">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">عنوان الموضوع</label>
                  <input 
                    type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="اكتب عنواناً جذاباً وواضحاً..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-base font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder-slate-300"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">التفاصيل والمحتوى</label>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-indigo-50 focus-within:border-indigo-400 transition-all bg-white shadow-sm">
                     <ForumEditor 
                       content={newContent} 
                       setContent={setNewContent} 
                       canUploadImage={canUploadImage} 
                     />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={hasPoll} onChange={(e) => setHasPoll(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500" />
                        <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">إرفاق استطلاع رأي (تصويت)</span>
                     </label>
                  </div>
                  
                  <AnimatePresence>
                  {hasPoll && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-4 border-t border-slate-100 overflow-hidden">
                      <div>
                        <input type="text" placeholder="اكتب سؤال الاستطلاع هنا..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-50 outline-none transition-all" />
                      </div>
                      <div className="space-y-3">
                        {pollOptions.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input type="text" placeholder={`ال الخيار رقم ${i + 1}`} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-50 outline-none transition-all" />
                            {pollOptions.length > 2 && (
                              <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="w-12 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-colors"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-sm font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors">+ إضافة خيار آخر</button>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                           <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                           يسمح للمستخدم باختيار أكثر من إجابة
                        </label>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95">إلغاء الأمر</button>
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} انشر الموضوع الآن
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 نافذة إضافة/تعديل قسم فرعي */}
      <AnimatePresence>
        {isSubCatModalOpen && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[3rem] shadow-[0_30px_60px_rgb(0,0,0,0.15)] w-full max-w-2xl border border-white/20 my-auto overflow-hidden">
              <div className="bg-gradient-to-l from-slate-50 to-white p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{editingCatId ? 'تعديل بيانات القسم' : 'إضافة قسم فرعي جديد'}</h2>
                    <p className="text-sm font-bold text-slate-500">
                        {editingCatId ? 'قم بتحديث الإعدادات والصلاحيات.' : <>هذا القسم سيتبع مباشرة لـ: <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md">{categoryInfo?.name}</span></>}
                    </p>
                </div>
                <button onClick={() => setIsSubCatModalOpen(false)} className="relative z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-all active:scale-95"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleCreateSubCategory} className="p-6 sm:p-8 space-y-6 bg-slate-50/30">
                
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                        {subCoverUrl ? (
                            <img src={subCoverUrl} alt="cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-indigo-300" />
                        )}
                        <div className="absolute inset-0 bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="flex-1 text-center sm:text-right w-full">
                        <label className="block text-sm font-black text-slate-800 mb-1">أيقونة أو غلاف القسم</label>
                        <p className="text-xs font-bold text-slate-500 mb-4">صورة تعبر عن محتوى القسم وتجذب الانتباه.</p>
                        <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black cursor-pointer transition-all border w-full sm:w-auto shadow-sm active:scale-95 ${isSubUploading ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'}`}>
                            {isSubUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isSubUploading ? 'جاري الرفع...' : 'تصفح الملفات'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleSubCoverUpload} disabled={isSubUploading} />
                        </label>
                    </div>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                    <div className="relative">
                      <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="text" required value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">وصف القسم {editingCatId ? '' : 'الفرعي'}</label>
                    <textarea rows={2} value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm">
                      <label className="flex items-center gap-2 text-sm font-black text-indigo-900 mb-1"><Users className="w-5 h-5 text-indigo-600" /> الفصول المصرح لها بالمشاركة</label>
                      <p className="text-[10px] font-bold text-indigo-700/70 mb-4 leading-relaxed">ملاحظة: الأقسام مرئية للجميع. التحديد هنا يسمح للطلاب المحددين فقط بكتابة المواضيع والردود.</p>
                      
                      <button type="button" onClick={() => setSubTargetClasses([])} className={`w-full py-3 mb-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${subTargetClasses.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>🌍 فتح المشاركة لجميع الطلاب</button>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {schoolClasses.map((cls: any) => (
                          <button key={cls.id} type="button" onClick={() => toggleSubClass(cls.id)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${subTargetClasses.includes(cls.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{cls.name}</button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 shadow-sm flex flex-col justify-between">
                      <label className="flex items-center gap-2 text-sm font-black text-amber-900 mb-4"><ShieldAlert className="w-5 h-5 text-amber-600" /> الصلاحيات والقيود العامة</label>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-amber-800/70 mb-1.5">من يمكنه كتابة مواضيع؟</label>
                          <select value={subPostPerm} onChange={e => setSubPostPerm(e.target.value)} className="w-full bg-white border border-amber-200/50 text-amber-950 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all cursor-pointer appearance-none">
                            <option value="all">الجميع (حسب الفصول المحددة أعلاه)</option>
                            <option value="teachers_admin">المعلمون والإدارة فقط</option>
                            <option value="admin_only">الإدارة فقط (قسم رسمي)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-800/70 mb-1.5">من يمكنه الرد؟</label>
                          <select value={subReplyPerm} onChange={e => setSubReplyPerm(e.target.value)} className="w-full bg-white border border-amber-200/50 text-amber-950 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all cursor-pointer appearance-none">
                            <option value="all">الجميع (حسب الفصول المحددة أعلاه)</option>
                            <option value="teachers_admin">المعلمون والإدارة فقط</option>
                            <option value="admin_only">الإدارة فقط</option>
                            <option value="none">مغلق للجميع (للقراءة فقط)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                  <button type="submit" disabled={isSubSubmitting} className="flex-1 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm sm:text-base flex justify-center items-center gap-2 shadow-xl shadow-slate-900/20 transition-all active:scale-95">
                      {isSubSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} {editingCatId ? 'حفظ التعديلات' : 'إنشاء القسم الفرعي'}
                  </button>
                  <button type="button" onClick={() => setIsSubCatModalOpen(false)} className="w-full sm:w-1/3 py-4 rounded-2xl font-black text-sm sm:text-base bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
