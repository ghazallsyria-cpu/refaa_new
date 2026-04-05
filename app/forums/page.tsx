'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, Users, Plus, Hash, ShieldCheck, 
  ChevronLeft, Search, Loader2, Sparkles, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string;
  target_level: number | null;
  icon: string | null;
  topics_count?: number;
}

export default function ForumsPage() {
  const { userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isAdmin = currentRole === 'admin' || currentRole === 'management';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات نافذة إضافة قسم جديد (للمدراء فقط)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // نجلب الأقسام مع عدد المواضيع بداخل كل قسم
      const { data, error } = await supabase
        .from('forum_categories')
        .select(`
          id, name, description, target_level, icon,
          forum_topics (count)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedData = data.map((cat: any) => ({
          ...cat,
          topics_count: cat.forum_topics[0]?.count || 0
        }));
        setCategories(formattedData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('forum_categories')
        .insert([{ name: newCatName, description: newCatDesc }]);

      if (error) throw error;

      setIsModalOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories(); // تحديث القائمة
    } catch (error) {
      console.error('Error creating category:', error);
      alert('حدث خطأ أثناء إنشاء القسم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.includes(searchQuery) || (c.description && c.description.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      {/* 🚀 الهيدر والبانر الرئيسي */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">
              <Sparkles className="w-4 h-4 text-amber-300" /> المجتمع المدرسي التفاعلي
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-md">
              ساحة النقاشات والتبادل المعرفي
            </h1>
            <p className="text-indigo-100/80 text-sm md:text-lg font-bold max-w-2xl leading-relaxed">
              مكان يجمع الطلاب والمعلمين لتبادل الأفكار، طرح الأسئلة، ومناقشة المناهج ببيئة آمنة ومراقبة.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن قسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-indigo-200/50 rounded-2xl py-3.5 pr-12 pl-4 focus:ring-2 focus:ring-blue-400 outline-none transition-all font-bold text-sm"
              />
            </div>
            
            {/* زر الإدارة فقط */}
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 border border-emerald-400"
              >
                <Plus className="w-5 h-5" /> إنشاء قسم جديد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 شبكة الأقسام */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">جاري تحميل المجتمعات...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">لا توجد أقسام حالياً</h3>
            <p className="text-slate-500 font-bold text-sm">
              {isAdmin ? 'قم بإنشاء القسم الأول باستخدام الزر أعلاه.' : 'لم يتم إضافة أي منتديات حتى الآن.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
              <Link key={category.id} href={`/forums/${category.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-[2rem] p-6 shadow-sm hover:shadow-xl border border-slate-100 transition-all group flex flex-col h-full cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100 shrink-0">
                      <Hash className="w-7 h-7" />
                    </div>
                    <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {category.topics_count} نقاش
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {category.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed line-clamp-2">
                      {category.description || 'مساحة مخصصة لتبادل النقاشات والأسئلة حول هذا القسم.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-black text-xs uppercase tracking-widest">
                    <span>دخول الساحة</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 نافذة الإدارة (إنشاء قسم) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Plus className="w-6 h-6" /></div>
                <h2 className="text-xl font-black text-slate-900">إنشاء مجتمع جديد</h2>
              </div>
              
              <form onSubmit={handleCreateCategory} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">اسم القسم</label>
                  <input 
                    type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="مثال: نقاشات الصف العاشر"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">وصف القسم (اختياري)</label>
                  <textarea 
                    rows={3} value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)}
                    placeholder="اكتب وصفاً قصيراً يوضح الهدف من هذا القسم..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} حفظ القسم
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
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
