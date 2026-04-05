'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, Loader2, User, Clock, ShieldCheck, 
  MessageSquare, Send, Reply, Eye, BadgeCheck, Lock // 🚀 تم إضافة Lock هنا
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import ForumEditor from '@/components/ForumEditor';

export default function TopicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const canUploadImage = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management';

  const [topic, setTopic] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالة محرر الردود
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // دالة جلب البيانات
  const fetchTopicData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. زيادة عدد المشاهدات
      await supabase.rpc('increment_topic_views', { topic_id: topicId }).catch(() => {});

      // 2. جلب الموضوع وصاحبه
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select(`
          *,
          category:forum_categories(name)
        `)
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;

      // 3. جلب بيانات صاحب الموضوع
      const { data: authorData } = await supabase
        .from('users')
        .select('full_name, role, avatar_url')
        .eq('id', topicData.author_id)
        .single();

      setTopic({
        ...topicData,
        author: authorData
      });

      // 4. جلب الردود
      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select(`
          *,
          users!author_id(full_name, role, avatar_url)
        `)
        .eq('topic_id', topicId)
        .order('is_verified', { ascending: false }) // الرد المعتمد أولاً
        .order('created_at', { ascending: true });

      setReplies(repliesData || []);

    } catch (error) {
      console.error('Error fetching topic details:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchTopicData();
  }, [fetchTopicData]);

  // دالة إضافة رد
  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = replyContent.replace(/<[^>]+>/g, '').trim();
    if (!user || (!strippedContent && !replyContent.includes('<img'))) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('forum_replies')
        .insert([{
          topic_id: topicId,
          author_id: user.id,
          content: replyContent
        }]);

      if (error) throw error;
      
      setReplyContent(''); // تصفير المحرر
      await fetchTopicData(); // تحديث الردود
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('حدث خطأ أثناء إضافة الرد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">جاري تحميل الموضوع...</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
        <h2 className="text-2xl font-black text-slate-800">الموضوع غير موجود</h2>
        <button onClick={() => router.push('/forums')} className="mt-4 text-indigo-600 font-bold hover:underline">العودة للمنتديات</button>
      </div>
    );
  }

  const isAuthorStaff = topic.author?.role === 'teacher' || topic.author?.role === 'admin' || topic.author?.role === 'management';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      {/* 🚀 Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 flex items-center gap-4">
          <button onClick={() => router.push(`/forums/${topic.category_id}`)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowRight className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-1">
              {topic.category?.name || 'قسم المنتدى'}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 line-clamp-1">{topic.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* 🚀 الموضوع الأساسي (Main Topic) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          {/* بيانات الكاتب */}
          <div className="bg-slate-50/50 border-b border-slate-100 p-5 sm:p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {topic.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topic.author.avatar_url} alt="avatar" className={`w-12 h-12 rounded-2xl object-cover border-2 ${isAuthorStaff ? 'border-amber-400 shadow-sm' : 'border-slate-200'}`} />
              ) : (
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${isAuthorStaff ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {isAuthorStaff ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
              )}
              <div>
                <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                  {topic.author?.full_name || 'مستخدم غير معروف'}
                  {isAuthorStaff && <BadgeCheck className="w-4 h-4 text-amber-500" />}
                </h3>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {topic.views_count || 0} مشاهدة</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* محتوى الموضوع (يتم عرضه كـ HTML ليدعم التنسيقات والصور) */}
          <div 
            className="p-5 sm:p-8 prose max-w-none text-slate-800 leading-loose"
            dangerouslySetInnerHTML={{ __html: topic.content }}
            style={{ wordBreak: 'break-word' }}
          />
        </motion.div>

        {/* 🚀 قسم التعليقات والردود */}
        <div className="flex items-center gap-3 mt-12 mb-6 px-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">الردود والمناقشات <span className="text-slate-400 text-sm">({replies.length})</span></h2>
        </div>

        <div className="space-y-4">
          {replies.map((reply) => {
            const isReplyStaff = reply.users?.role === 'teacher' || reply.users?.role === 'admin' || reply.users?.role === 'management';
            return (
              <motion.div key={reply.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white rounded-[2rem] shadow-sm border ${reply.is_verified ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'} overflow-hidden`}>
                {reply.is_verified && (
                  <div className="bg-emerald-500 text-white text-xs font-black px-4 py-1.5 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" /> إجابة معتمدة من المعلم
                  </div>
                )}
                <div className="p-5 sm:p-6 flex gap-4">
                  <div className="shrink-0">
                    {reply.users?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reply.users.avatar_url} alt="avatar" className={`w-10 h-10 rounded-xl object-cover border ${isReplyStaff ? 'border-amber-400' : 'border-slate-200'}`} />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isReplyStaff ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {isReplyStaff ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                        {reply.users?.full_name}
                        {isReplyStaff && <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: arSA })}
                      </span>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: reply.content }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 🚀 محرر إضافة رد جديد */}
        {!topic.is_locked ? (
          <div className="mt-8 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Reply className="w-5 h-5" /></div>
              <h3 className="font-black text-slate-900">إضافة رد جديد</h3>
            </div>
            <form onSubmit={handleAddReply} className="p-4 sm:p-6 space-y-4">
              <ForumEditor 
                content={replyContent} 
                setContent={setReplyContent} 
                canUploadImage={canUploadImage} 
              />
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} إرسال الرد
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-8 bg-slate-50 rounded-[2rem] border border-slate-200 p-8 text-center flex flex-col items-center justify-center">
            <Lock className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-700">هذا الموضوع مغلق</h3>
            <p className="text-sm font-bold text-slate-500 mt-2">لا يمكن إضافة ردود جديدة على هذا الموضوع بناءً على قرار الإدارة.</p>
          </div>
        )}

      </div>
    </div>
  );
}
