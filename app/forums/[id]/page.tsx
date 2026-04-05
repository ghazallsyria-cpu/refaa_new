'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useTopics } from '@/hooks/useTopics';
import { 
  ArrowRight, MessageSquare, Plus, Search, Loader2, 
  Pin, Lock, User, Clock, ChevronLeft, Send, XCircle, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import ForumEditor from '@/components/ForumEditor'; // 🚀 استيراد المحرر الملكي

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  
  // صلاحية رفع الصور للمعلم والمدير فقط
  const canUploadImage = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management';

  const { topics, categoryInfo, loading, fetchTopicsAndCategory, createTopic } = useTopics(categoryId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState(''); // محتوى المحرر المتقدم (HTML)
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTopicsAndCategory();
  }, [fetchTopicsAndCategory]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    // التحقق من أن المحتوى ليس فارغاً (حتى مع وجود مسافات HTML)
    const strippedContent = newContent.replace(/<[^>]+>/g, '').trim();
    if (!newTitle.trim() || !strippedContent || !user) {
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

  const filteredTopics = topics.filter(t => 
    t.title.includes(searchQuery) || t.content.includes(searchQuery)
  );

  // دالة لتنظيف المحتوى وعرض مقتطف (Snippet) بدون أكواد HTML
  const getSnippet = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || "";
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  if (loading && !categoryInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">جاري تحميل بيانات القسم...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      {/* 🚀 Header */}
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
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">موضوع جديد</span>
          </button>
        </div>
      </div>

      {/* 🚀 Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="relative w-full max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث في هذا القسم..."
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
            <p className="text-slate-500 font-bold text-sm mb-6">كن أول من يبدأ النقاش في هذا القسم!</p>
            <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-black bg-indigo-50 px-6 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
              كتابة موضوع جديد
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {filteredTopics.map((topic) => {
              const isStaff = topic.author_role === 'teacher' || topic.author_role === 'admin' || topic.author_role === 'management';
              
              return (
              <Link key={topic.id} href={`/forums/topic/${topic.id}`} className="block hover:bg-slate-50 transition-colors group p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  {/* 🚀 أيقونة الكاتب / الصورة الشخصية */}
                  <div className="shrink-0">
                    {topic.author_avatar ? (
                      <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-sm border-2 ${isStaff ? 'border-amber-400' : 'border-slate-200'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={topic.author_avatar} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border-2 ${isStaff ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {isStaff ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  
                  {/* تفاصيل الموضوع */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {topic.is_pinned && <Pin className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" />}
                      {topic.is_locked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {topic.title}
                      </h3>
                    </div>
                    
                    {/* مقتطف من المحتوى (بدون أكواد HTML) */}
                    <p className="text-xs sm:text-sm font-bold text-slate-500 line-clamp-1 mb-3">
                      {getSnippet(topic.content)}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-bold text-slate-500">
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${isStaff ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600'}`}>
                         {isStaff && <ShieldCheck className="w-3.5 h-3.5" />}
                         {topic.author_name}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> 
                        {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}
                      </span>
                    </div>
                  </div>

                  {/* الإحصائيات (ردود ومشاهدات) */}
                  <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 text-slate-400">
                    <div className="flex items-center gap-1.5 text-sm font-black bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-600">{topic.replies_count}</span> <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        )}
      </div>

      {/* 🚀 نافذة كتابة موضوع جديد */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-auto"
            >
              <div className="bg-slate-50 p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">كتابة موضوع جديد</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">أنت تنشر في: {categoryInfo?.name}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTopic} className="p-5 sm:p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">عنوان الموضوع</label>
                  <input 
                    type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="اكتب عنواناً واضحاً ومختصراً..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">التفاصيل والمحتوى</label>
                  {/* 🚀 دمج المحرر الملكي هنا */}
                  <ForumEditor 
                    content={newContent} 
                    setContent={setNewContent} 
                    canUploadImage={canUploadImage} 
                  />
                </div>
                
                <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-200 active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} نشر الموضوع
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
