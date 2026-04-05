'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useForums, StructuredCategory } from '@/hooks/useForums'; 
import { 
  MessageSquare, Plus, Hash, ChevronLeft, Search, 
  Loader2, Sparkles, BookOpen, Layers, Globe, Target, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ForumsPage() {
  const { userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';

  const { 
    categories, 
    structuredCategories, 
    loading, 
    fetchCategories, 
    createCategory 
  } = useForums();

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [parentId, setParentId] = useState<string | 'none'>('none');
  
  // 🚀 مصفوفة لتخزين الصفوف المحددة
  const [targetLevels, setTargetLevels] = useState<number[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // دالة لاختيار أو إلغاء اختيار صف معين
  const toggleGrade = (grade: number) => {
    if (targetLevels.includes(grade)) {
      setTargetLevels(targetLevels.filter(g => g !== grade));
    } else {
      setTargetLevels([...targetLevels, grade]);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    setIsSubmitting(true);
    
    const payload = {
      name: newCatName,
      description: newCatDesc,
      parent_id: parentId === 'none' ? null : parentId,
      target_level: targetLevels.length === 0 ? null : targetLevels // إذا كانت فارغة = للجميع
    };

    const result = await createCategory(payload);

    if (result.success) {
      setIsModalOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      setParentId('none');
      setTargetLevels([]); // تصفير المصفوفة
    } else {
      alert(`خطأ في إنشاء القسم: ${result.error}`);
    }
    
    setIsSubmitting(false);
  };

  const filterHierarchy = (cats: StructuredCategory[], query: string): StructuredCategory[] => {
    if (!query) return cats;
    return cats.map(main => {
      const mainMatches = main.name.includes(query) || (main.description && main.description.includes(query));
      const matchingSubs = (main.subcategories || []).filter(sub => 
        sub.name.includes(query) || (sub.description && sub.description.includes(query))
      );
      
      if (mainMatches || matchingSubs.length > 0) {
        return { ...main, subcategories: matchingSubs.length > 0 ? matchingSubs : main.subcategories };
      }
      return null;
    }).filter(Boolean) as StructuredCategory[];
  };

  const displayedCategories = filterHierarchy(structuredCategories, searchQuery);

  const CategoryCard = ({ cat }: { cat: StructuredCategory }) => (
    <Link href={`/forums/${cat.id}`} className="block h-full">
      <motion.div 
        whileHover={{ y: -5, scale: 1.01 }}
        className="bg-white rounded-[1.5rem] p-5 sm:p-6 shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-200 transition-all group flex flex-col h-full relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100 shrink-0">
            <Hash className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <MessageSquare className="w-3.5 h-3.5" />
              {cat.topics_count} موضوع
            </div>
            {/* 🚀 عرض الصفوف المستهدفة بشكل أنيق */}
            {cat.target_level && cat.target_level.length > 0 ? (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 max-w-[120px]">
                <Target className="w-3 h-3 shrink-0" />
                <span className="truncate" dir="ltr" title={`صفوف: ${cat.target_level.join(', ')}`}>
                  صف: {cat.target_level.join(', ')}
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                <Globe className="w-3 h-3" /> عام للجميع
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors line-clamp-1">
            {cat.name}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-slate-500 leading-relaxed line-clamp-2">
            {cat.description || 'مساحة مخصصة لتبادل النقاشات والأسئلة.'}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-black text-[10px] sm:text-xs uppercase tracking-widest">
          <span>دخول الساحة</span>
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">
              <Sparkles className="w-4 h-4 text-amber-300" /> المجتمع المدرسي التفاعلي
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-md">
              ساحة النقاشات والتبادل المعرفي
            </h1>
            <p className="text-indigo-100/80 text-xs sm:text-sm md:text-lg font-bold max-w-2xl leading-relaxed">
              مكان يجمع الطلاب والمعلمين لتبادل الأفكار، طرح الأسئلة، ومناقشة المناهج ببيئة آمنة ومنظمة.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن مجتمع أو قسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-indigo-200/50 rounded-2xl py-3.5 pr-12 pl-4 focus:ring-2 focus:ring-blue-400 outline-none transition-all font-bold text-sm"
              />
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border border-emerald-400 text-sm"
              >
                <Layers className="w-5 h-5" /> بناء هيكل المنتدى (الإدارة)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">جاري بناء خريطة المنتديات...</p>
          </div>
        ) : displayedCategories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد أقسام حالياً</h3>
            <p className="text-slate-500 font-bold text-sm max-w-md mx-auto">
              {isAdmin ? 'قم بإنشاء القسم الأول باستخدام الزر أعلاه وابدأ ببناء هيكلية المنتدى.' : 'لم يتم إضافة أي منتديات حتى الآن من قبل الإدارة.'}
            </p>
          </div>
        ) : (
          displayedCategories.map((mainCat) => (
            <motion.div 
              key={mainCat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-[1.5rem] border border-slate-200 shadow-sm">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-inner shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{mainCat.name}</h2>
                  {mainCat.description && (
                    <p className="text-sm font-bold text-slate-500 mt-1">{mainCat.description}</p>
                  )}
                </div>
                {(!mainCat.subcategories || mainCat.subcategories.length === 0) && (
                  <Link href={`/forums/${mainCat.id}`} className="hidden sm:flex shrink-0 items-center justify-center bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-colors">
                    دخول القسم <ChevronLeft className="w-4 h-4 mr-1" />
                  </Link>
                )}
              </div>

              {mainCat.subcategories && mainCat.subcategories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pr-4 sm:pr-8 border-r-4 border-indigo-100">
                  {mainCat.subcategories.map(subCat => (
                    <CategoryCard key={subCat.id} cat={subCat} />
                  ))}
                </div>
              ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pr-4 sm:pr-8 border-r-4 border-slate-200">
                    <CategoryCard cat={mainCat} />
                 </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-auto"
            >
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Layers className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">إضافة قسم للمنتدى</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">يمكنك إنشاء قسم رئيسي أو تفريعه داخل قسم موجود.</p>
                </div>
              </div>
              
              <form onSubmit={handleCreateCategory} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                  <input 
                    type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="مثال: قسم الفيزياء، النقاش العام، الخ..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">تفرع القسم (الهيكلية)</label>
                  <select 
                    value={parentId} onChange={e => setParentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="none">🌟 قسم رئيسي (مستقل)</option>
                    <optgroup label="تفريعه تحت قسم موجود:">
                      {categories.filter(c => !c.parent_id).map(main => (
                        <option key={main.id} value={main.id}>↳ يتبع لـ: {main.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 🎯 نظام اختيار الصفوف المتعددة الجديد */}
                <div className="bg-indigo-50/50 p-4 sm:p-5 rounded-[1.5rem] border border-indigo-100">
                  <label className="flex items-center gap-2 text-xs font-black text-indigo-700 uppercase tracking-widest mb-3">
                    <Target className="w-4 h-4" /> الفئة المستهدفة (الصفوف)
                  </label>
                  
                  <div className="mb-3">
                    <button 
                      type="button" 
                      onClick={() => setTargetLevels([])}
                      className={`w-full py-2.5 rounded-xl text-sm font-black transition-all border-2 ${
                        targetLevels.length === 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-100' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-200'
                      }`}
                    >
                      🌍 عام (متاح لجميع الصفوف)
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => {
                      const isSelected = targetLevels.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => toggleGrade(grade)}
                          className={`py-2 rounded-xl text-xs font-black transition-all border-2 flex flex-col items-center justify-center gap-1 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          صف {grade}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-bold text-indigo-500 mt-3 leading-relaxed">
                    يمكنك تحديد صف واحد أو عدة صفوف معاً. الصفوف غير المحددة لن تتمكن من رؤية هذا القسم.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">وصف القسم (اختياري)</label>
                  <textarea 
                    rows={2} value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)}
                    placeholder="اكتب وصفاً قصيراً..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} اعتماد القسم
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
