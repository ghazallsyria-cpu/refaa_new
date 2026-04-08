'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useForums, StructuredCategory } from '@/hooks/useForums'; 
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { 
  MessageSquare, Plus, Hash, ChevronLeft, Search, 
  Loader2, Sparkles, BookOpen, Layers, Globe, Target, Save, XCircle, Image as ImageIcon, Trash2, Lock, ShieldAlert,
  Compass, LayoutGrid, Users, ArrowUpRight, Quote, Trophy, Crown, Upload, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// خريطة الأيقونات
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

export default function ForumsPage() {
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';
  const isTeacher = currentRole === 'teacher';

  const { categories, structuredCategories, schoolClasses, loading, fetchCategoriesAndClasses, createCategory, updateCategory } = useForums();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [parentId, setParentId] = useState<string | 'none'>('none');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  
  const [postPerm, setPostPerm] = useState('all');
  const [replyPerm, setReplyPerm] = useState('all');

  const [coverUrl, setCoverUrl] = useState('');
  const [removeIcon, setRemoveIcon] = useState(false); // 🚀 للتحكم الذكي بحذف الصورة القديمة
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 7000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => { fetchCategoriesAndClasses(); }, [fetchCategoriesAndClasses]);

  const openEditCategoryModal = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setTargetClasses(cat.target_classes || []);
    setCoverUrl(cat.icon || '');
    setPostPerm(cat.post_permission || 'all');
    setReplyPerm(cat.reply_permission || 'all');
    setParentId(cat.parent_id || 'none');
    setRemoveIcon(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingCatId(null);
    setNewCatName(''); 
    setNewCatDesc(''); 
    setParentId('none'); 
    setTargetClasses([]); 
    setCoverUrl('');
    setRemoveIcon(false);
    setPostPerm('all');
    setReplyPerm('all');
  };

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
      if (data.secure_url) {
         setCoverUrl(data.secure_url);
         setRemoveIcon(false);
      }
    } catch (error) { alert('خطأ في رفع الصورة'); } 
    finally { setIsUploading(false); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    
    const payload: any = {
      name: newCatName,
      description: newCatDesc,
      parent_id: parentId === 'none' ? null : parentId,
      target_classes: targetClasses.length === 0 ? null : targetClasses,
      post_permission: postPerm as any, 
      reply_permission: replyPerm as any 
    };

    // 🚀 السر الذكي: لا نرسل `icon` إذا لم يرفع المدير صورة جديدة، ليحتفظ النظام بالصورة القديمة
    if (coverUrl) {
       payload.icon = coverUrl;
    } else if (removeIcon || !editingCatId) {
       payload.icon = null;
    }

    let result;
    if (editingCatId) {
      result = await updateCategory(editingCatId, payload);
    } else {
      result = await createCategory(payload);
    }

    if (result.success) {
      setIsModalOpen(false); 
      resetForm();
      fetchCategoriesAndClasses();
    } else {
      alert(`خطأ: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (categoryId: string, categoryIconUrl: string | null) => {
      if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المواضيع والردود بداخله. هذا الإجراء لا يمكن التراجع عنه.')) return;
      try {
          if (categoryIconUrl) await deleteFromCloudinary(categoryIconUrl);
          await supabase.from('forum_categories').delete().eq('id', categoryId);
          fetchCategoriesAndClasses();
      } catch(e) {
          alert("خطأ في الحذف");
      }
  }

  const getDisplayedCategories = () => {
    if (!searchQuery) return structuredCategories;
    
    return structuredCategories.map(main => {
      const mainMatches = main.name.includes(searchQuery) || (main.description && main.description.includes(searchQuery));
      const matchingSubs = (main.subcategories || []).filter(sub => sub.name.includes(searchQuery) || (sub.description && sub.description.includes(searchQuery)));
      
      if (mainMatches || matchingSubs.length > 0) {
        return { ...main, subcategories: matchingSubs.length > 0 ? matchingSubs : main.subcategories };
      }
      return null;
    }).filter(Boolean) as StructuredCategory[];
  };

  const displayedCategories = getDisplayedCategories();

  const CategoryCard = ({ cat }: { cat: StructuredCategory }) => {
    const targetNames = cat.target_classes && cat.target_classes.length > 0 
      ? cat.target_classes.map(id => schoolClasses.find(c => c.id === id)?.name || 'غير معروف').join('، ') 
      : null;

    return (
      <div className="relative group h-full">
        {isAdmin && (
            <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditCategoryModal(cat); }} className="bg-white/90 backdrop-blur-sm p-2.5 rounded-full text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg hover:scale-110" title="تعديل">
                    <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategory(cat.id, cat.icon); }} className="bg-white/90 backdrop-blur-sm p-2.5 rounded-full text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg hover:scale-110" title="حذف">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        )}
        <Link href={`/forums/${cat.id}`} className="block h-full outline-none focus:ring-4 focus:ring-indigo-500/50 rounded-[2.5rem]">
            <motion.div 
              whileHover={{ y: -8, scale: 1.02 }} 
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white/70 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(99,102,241,0.15)] border border-white/80 rounded-[2.5rem] flex flex-col h-full relative overflow-hidden group/card"
            >
            
            <div className="h-40 w-full relative bg-gradient-to-br from-indigo-50 to-blue-50/50 flex items-center justify-center overflow-hidden border-b border-slate-100/50">
                {cat.icon ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.icon} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover/card:scale-110 transition-transform duration-700 ease-out" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                    </>
                ) : (
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                )}
                
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-black px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-lg">
                      <MessageSquare className="w-3.5 h-3.5" /> {cat.topics_count || 0}
                    </div>
                </div>

                <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 z-10">
                    {targetNames ? (
                      <div className="bg-amber-400/90 backdrop-blur-md text-amber-950 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-amber-300/50">
                          <Target className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{targetNames}</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-400/90 backdrop-blur-md text-emerald-950 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-emerald-300/50">
                          <Globe className="w-3.5 h-3.5" /> مشاركة للجميع
                      </div>
                    )}
                    
                    {cat.post_permission === 'admin_only' && (
                        <span className="bg-rose-500/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-rose-400/50">
                            <ShieldAlert className="w-3.5 h-3.5" /> رسمي
                        </span>
                    )}
                    {cat.reply_permission === 'none' && (
                        <span className="bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-slate-600/50">
                            <Lock className="w-3.5 h-3.5" /> للقراءة
                        </span>
                    )}
                </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1 bg-white/50 relative">
                {!cat.icon && (
                    <div className="absolute -top-8 right-6 w-16 h-16 bg-white rounded-[1.5rem] shadow-xl flex items-center justify-center border border-slate-100 group-hover/card:bg-indigo-600 group-hover/card:text-white transition-colors duration-300 z-10">
                        <Hash className="w-7 h-7 text-indigo-600 group-hover/card:text-white" />
                    </div>
                )}
                
                <div className={`flex-1 ${!cat.icon ? 'mt-6' : ''}`}>
                    <h3 className="text-xl font-black text-slate-900 mb-2 group-hover/card:text-indigo-700 transition-colors line-clamp-1">{cat.name}</h3>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed line-clamp-2">
                        {cat.description || 'مساحة مخصصة لتبادل النقاشات والأفكار.'}
                    </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-indigo-600 font-black text-xs uppercase tracking-widest group/btn">
                    <span className="flex items-center gap-2">تصفح القسم <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 translate-y-2 group-hover/card:opacity-100 group-hover/card:translate-x-0 group-hover/card:translate-y-0 transition-all duration-300" /></span>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover/card:bg-indigo-600 group-hover/card:text-white transition-colors">
                      <ChevronLeft className="w-4 h-4 group-hover/card:-translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
            </motion.div>
        </Link>
      </div>
    );
  };

  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-indigo-500 selection:text-white" dir="rtl">
      
      {/* الواجهة العلوية الديناميكية */}
      <div className="relative pt-24 pb-48 overflow-hidden bg-[#0F172A] rounded-b-[3rem] sm:rounded-b-[4rem] z-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 mix-blend-screen pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 h-full min-h-[220px] flex items-center justify-center">
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
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs sm:text-sm font-black mb-6 backdrop-blur-md shadow-sm">
                  <SlideIcon className="w-4 h-4" />
                  {currentSlideData.badge_text}
                </div>
              )}

              <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentSlideData.color_gradient || 'from-white to-slate-300'} tracking-tight mb-6 drop-shadow-lg`}>
                {currentSlideData.title}
              </h1>

              {currentSlideData.description && (
                <p className="text-slate-300 text-sm sm:text-lg font-bold max-w-2xl leading-relaxed mb-8">
                  {currentSlideData.description}
                </p>
              )}

              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-2">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-3 pr-4 shadow-xl"
                    >
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-400 drop-shadow-md z-10 rotate-12" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={student.img} alt={student.name} className="w-12 h-12 rounded-full border-2 border-white/50 shadow-inner bg-white/50 object-cover" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{student.name}</p>
                        <p className="text-[10px] font-bold text-slate-300">{student.grade}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {currentSlideData.type === 'media' && currentSlideData.media_url && (
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    className="mt-6 w-full max-w-2xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-white/20"
                 >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentSlideData.media_url} alt="Media" className="w-full h-auto max-h-80 object-cover" />
                 </motion.div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* مؤشرات التبديل السفلية */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {heroSlides.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* شريط البحث والإجراءات */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-30 mb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/80 backdrop-blur-2xl border border-white p-3 rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_40px_rgb(0,0,0,0.08)] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full flex-1">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث عن قسم، موضوع، أو استفسار..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 rounded-full py-4 sm:py-5 pr-14 pl-6 outline-none font-bold text-sm sm:text-base transition-all focus:bg-slate-50/50" 
            />
          </div>
          
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2.5rem] font-black shadow-lg shadow-indigo-600/30 transition-all active:scale-95 text-sm sm:text-base">
              <Plus className="w-5 h-5" /> إنشاء قسم جديد
            </button>
          )}
        </motion.div>
      </div>

      {/* محتوى الأقسام */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20 space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
        ) : displayedCategories.length === 0 ? (
          <div className="text-center py-32 bg-white/50 backdrop-blur-md rounded-[3rem] border border-slate-200/50 shadow-sm">
             <Compass className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد أقسام حالياً</h3>
            <p className="text-slate-500 font-bold">لم يتم العثور على أي منتديات تطابق بحثك.</p>
          </div>
        ) : (
          displayedCategories.map((mainCat, index) => (
            <motion.div key={mainCat.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ delay: index * 0.1 }} className="mb-12">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pl-4">
                <div className="flex items-center gap-5 group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 blur-xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[2rem] shadow-md border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {mainCat.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mainCat.icon} alt={mainCat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <LayoutGrid className="w-8 h-8 text-indigo-600" />
                        )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">{mainCat.name}</h2>
                    {mainCat.description && <p className="text-sm sm:text-base font-bold text-slate-500 max-w-2xl leading-relaxed">{mainCat.description}</p>}
                  </div>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => openEditCategoryModal(mainCat)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-xs sm:text-sm transition-colors shadow-sm" title="تعديل القسم الرئيسي">
                            <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">تعديل</span>
                        </button>
                        <button onClick={() => handleDeleteCategory(mainCat.id, mainCat.icon)} className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-xs sm:text-sm transition-colors shadow-sm" title="حذف القسم الرئيسي بالكامل">
                            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">حذف</span>
                        </button>
                    </div>
                )}
              </div>

              {mainCat.subcategories && mainCat.subcategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {mainCat.subcategories.map(subCat => <CategoryCard key={subCat.id} cat={subCat} />)}
                </div>
              ) : (
                 <div className="text-center py-16 bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-slate-300">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                    <p className="text-base font-black text-slate-500 mb-1">هذا القسم فارغ حالياً.</p>
                    <p className="text-xs font-bold text-slate-400">لا توجد منتديات فرعية لتبادل النقاشات هنا.</p>
                 </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* نافذة الإضافة/التعديل */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_30px_60px_rgb(0,0,0,0.15)] w-full max-w-2xl border border-white/20 my-auto overflow-hidden">
              
              <div className="bg-gradient-to-l from-slate-50 to-white p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{editingCatId ? 'تعديل بيانات القسم' : 'بناء قسم جديد'}</h2>
                    <p className="text-sm font-bold text-slate-500">صمم مساحة نقاش تناسب احتياجات المنصة.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="relative z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-100 transition-all active:scale-95"><XCircle className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleCreateCategory} className="p-6 sm:p-8 space-y-6 bg-slate-50/30">
                
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                        {coverUrl && !removeIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt="cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-indigo-300" />
                        )}
                        <div className="absolute inset-0 bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="flex-1 text-center sm:text-right w-full">
                        <label className="block text-sm font-black text-slate-800 mb-1">أيقونة أو غلاف القسم</label>
                        <p className="text-xs font-bold text-slate-500 mb-4">صورة تعبر عن محتوى القسم وتجذب الانتباه.</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black cursor-pointer transition-all border shadow-sm active:scale-95 ${isUploading ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'}`}>
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isUploading ? 'جاري الرفع...' : 'تصفح الملفات'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploading} />
                            </label>
                            {coverUrl && !removeIcon && (
                                <button type="button" onClick={() => { setCoverUrl(''); setRemoveIcon(true); }} className="px-4 py-3 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl text-sm font-black transition-colors border border-rose-100">
                                    إزالة الصورة
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                    <div className="relative">
                      <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="text" required placeholder="مثال: نقاشات مادة الرياضيات" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">وصف القسم</label>
                    <textarea rows={2} placeholder="نبذة مختصرة عن المواضيع التي ستُطرح هنا..." value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-slate-400 resize-none leading-relaxed" />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">التصنيف الهيكلي</label>
                    <select 
                      value={parentId} 
                      onChange={e => setParentId(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-4 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                    >
                      <option value="none">🌟 إنشاء كقسم رئيسي ضخم (مستقل)</option>
                      {structuredCategories.filter(main => main.id !== editingCatId).map(main => (
                        <option key={main.id} value={main.id}>
                          ↳ إدراجه كقسم فرعي داخل: {main.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm">
                      <label className="flex items-center gap-2 text-sm font-black text-indigo-900 mb-1"><Users className="w-5 h-5 text-indigo-600" /> الفصول المصرح لها بالمشاركة</label>
                      <p className="text-[10px] font-bold text-indigo-700/70 mb-4 leading-relaxed">ملاحظة: الأقسام مرئية للجميع. التحديد هنا يسمح للطلاب المحددين فقط بكتابة المواضيع والردود (المعلمون والإدارة يتمتعون بصلاحية كاملة دائماً).</p>
                      
                      <button type="button" onClick={() => setTargetClasses([])} className={`w-full py-3 mb-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${targetClasses.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>🌍 فتح المشاركة لجميع الطلاب</button>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {schoolClasses.map(cls => (
                          <button key={cls.id} type="button" onClick={() => toggleClass(cls.id)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${targetClasses.includes(cls.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{cls.name}</button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100 shadow-sm flex flex-col justify-between">
                      <label className="flex items-center gap-2 text-sm font-black text-amber-900 mb-4"><ShieldAlert className="w-5 h-5 text-amber-600" /> الصلاحيات والقيود العامة</label>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-amber-800/70 mb-1.5">من يملك حق نشر مواضيع؟</label>
                          <select value={postPerm} onChange={e => setPostPerm(e.target.value)} className="w-full bg-white border border-amber-200/50 text-amber-950 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all cursor-pointer appearance-none">
                            <option value="all">الجميع (حسب الفصول المحددة أعلاه)</option>
                            <option value="teachers_admin">المعلمون والإدارة فقط</option>
                            <option value="admin_only">الإدارة فقط (إعلانات)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-800/70 mb-1.5">من يملك حق الرد والمشاركة؟</label>
                          <select value={replyPerm} onChange={e => setReplyPerm(e.target.value)} className="w-full bg-white border border-amber-200/50 text-amber-950 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition-all cursor-pointer appearance-none">
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
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm sm:text-base flex justify-center items-center gap-2 shadow-xl shadow-slate-900/20 transition-all active:scale-95">
                      {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} {editingCatId ? 'حفظ التعديلات' : 'اعتماد وبناء القسم'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-1/3 py-4 rounded-2xl font-black text-sm sm:text-base bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95">إلغاء الأمر</button>
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
