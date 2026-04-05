'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  ArrowRight, Loader2, User, Clock, ShieldCheck, 
  MessageSquare, Send, Reply, Eye, BadgeCheck, Lock,
  Heart, MoreVertical, Pin, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import ForumEditor from '@/components/ForumEditor';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function TopicDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;
  
  const { user, userRole, authRole } = useAuth() as any;
  const currentRole = authRole || userRole;
  const isStaff = currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'management';

  const [topic, setTopic] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<string[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTopicData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select('*, category:forum_categories(name)')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;

      const { data: authorData } = await supabase.from('users').select('full_name, role, avatar_url').eq('id', topicData.author_id).single();
      
      let badgeText = authorData?.role === 'student' ? 'طالب' : (authorData?.role === 'teacher' ? 'معلم' : 'إدارة');
      
      setTopic({ ...topicData, author: authorData, author_badge: badgeText });

      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('topic_id', topicId)
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: true });

      let formattedReplies: any[] = [];
      if (repliesData && repliesData.length > 0) {
        const authorIds = [...new Set(repliesData.map(r => r.author_id))];
        const { data: usersData } = await supabase.from('users').select('id, full_name, role, avatar_url').in('id', authorIds);
        
        formattedReplies = repliesData.map(reply => {
          const author = usersData?.find(u => u.id === reply.author_id);
          return { ...reply, users: author || { full_name: 'مجهول', role: 'student' } };
        });
      }
      setReplies(formattedReplies);

      if (user) {
        const { data: votes } = await supabase.from('forum_votes').select('reply_id').eq('user_id', user.id);
        setUserVotes(votes?.map(v => v.reply_id) || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => {
    fetchTopicData();
  }, [fetchTopicData]);

  const sendNotification = async (targetUserId: string, title: string, content: string, link: string) => {
    if (!targetUserId || targetUserId === user?.id) return;
    await supabase.from('notifications').insert([{
      user_id: targetUserId,
      title,
      content,
      type: 'forum',
      link
    }]);
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = replyContent.replace(/<[^>]+>/g, '').trim();
    if (!user || (!strippedContent && !replyContent.includes('<img'))) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('forum_replies').insert([{
        topic_id: topicId,
        author_id: user.id,
        content: replyContent
      }]);

      if (error) throw error;
      
      await sendNotification(
        topic.author_id, 
        'رد جديد على موضوعك', 
        `قام ${user.user_metadata?.full_name || 'مستخدم'} بالرد على موضوعك: ${topic.title}`, 
        `/forums/topic/${topicId}`
      );

      setReplyContent('');
      await fetchTopicData();
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الرد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVote = async (replyId: string, currentCount: number) => {
    if (!user) return;
    const hasVoted = userVotes.includes(replyId);
    
    // 🚀 إعطاء Types صريحة (string[]) و (any[])
    setUserVotes((prev: string[]) => hasVoted ? prev.filter(id => id !== replyId) : [...prev, replyId]);
    setReplies((prev: any[]) => prev.map((r: any) => r.id === replyId ? { ...r, upvotes_count: r.upvotes_count + (hasVoted ? -1 : 1) } : r));

    try {
      if (hasVoted) {
        await supabase.from('forum_votes').delete().eq('reply_id', replyId).eq('user_id', user.id);
        await supabase.from('forum_replies').update({ upvotes_count: currentCount - 1 }).eq('id', replyId);
      } else {
        await supabase.from('forum_votes').insert([{ reply_id: replyId, user_id: user.id }]);
        await supabase.from('forum_replies').update({ upvotes_count: currentCount + 1 }).eq('id', replyId);
      }
    } catch (error) {
      console.error('Vote error:', error);
      fetchTopicData();
    }
  };

  const toggleVerify = async (replyId: string, currentStatus: boolean, authorId: string) => {
    try {
      await supabase.from('forum_replies').update({ is_verified: !currentStatus }).eq('id', replyId);
      
      if (!currentStatus) {
        await sendNotification(
          authorId, 
          'إجابة معتمدة! ⭐️', 
          `تم اعتماد إجابتك كحل صحيح في موضوع: ${topic.title}`, 
          `/forums/topic/${topicId}`
        );
      }
      fetchTopicData();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTopicAttribute = async (field: 'is_pinned' | 'is_locked', currentValue: boolean) => {
    try {
      await supabase.from('forum_topics').update({ [field]: !currentValue }).eq('id', topicId);
      // 🚀 إعطاء Type صريح هنا (any)
      setTopic((prev: any) => ({ ...prev, [field]: !currentValue }));
    } catch (error) { console.error(error); }
  };

  const handleDeleteTopic = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الموضوع نهائياً؟')) return;
    try {
      await supabase.from('forum_topics').delete().eq('id', topicId);
      router.push(`/forums/${topic.category_id}`);
    } catch (error) { alert('خطأ في الحذف'); }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرد؟')) return;
    try {
      await supabase.from('forum_replies').delete().eq('id', replyId);
      // 🚀 إعطاء Type صريح هنا (any[])
      setReplies((prev: any[]) => prev.filter((r: any) => r.id !== replyId));
    } catch (error) { alert('خطأ في الحذف'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  if (!topic) return <div className="text-center mt-20"><h2 className="text-xl font-bold">الموضوع غير موجود</h2></div>;

  const canModerate = isStaff || user?.id === topic.author_id;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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

          {isStaff && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl outline-none transition-colors">
                <MoreVertical className="w-5 h-5" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[200px] z-50 text-sm font-bold animate-in fade-in zoom-in duration-200" align="end" sideOffset={5}>
                  <DropdownMenu.Item onClick={() => toggleTopicAttribute('is_pinned', topic.is_pinned)} className="flex items-center gap-2 p-3 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl cursor-pointer outline-none transition-colors">
                    <Pin className={`w-4 h-4 ${topic.is_pinned ? 'fill-current' : ''}`} /> {topic.is_pinned ? 'إلغاء التثبيت' : 'تثبيت الموضوع'}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => toggleTopicAttribute('is_locked', topic.is_locked)} className="flex items-center gap-2 p-3 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-xl cursor-pointer outline-none transition-colors">
                    <Lock className={`w-4 h-4 ${topic.is_locked ? 'fill-current' : ''}`} /> {topic.is_locked ? 'فتح الموضوع (للمناقشة)' : 'إغلاق الموضوع (منع الردود)'}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
                  <DropdownMenu.Item onClick={handleDeleteTopic} className="flex items-center gap-2 p-3 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer outline-none transition-colors">
                    <Trash2 className="w-4 h-4" /> حذف الموضوع نهائياً
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
          {topic.is_pinned && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500 to-rose-400 rounded-bl-[3rem] flex items-start justify-end p-3"><Pin className="w-5 h-5 text-white fill-white shadow-sm" /></div>}
          
          <div className="bg-slate-50/50 border-b border-slate-100 p-5 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {topic.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topic.author.avatar_url} alt="avatar" className={`w-12 h-12 rounded-2xl object-cover border-2 ${topic.author.role !== 'student' ? 'border-amber-400' : 'border-slate-200'}`} />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 bg-slate-100 text-slate-400 border-slate-200"><User className="w-6 h-6" /></div>
              )}
              <div>
                <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                  {topic.author?.full_name || 'مجهول'}
                  {topic.author?.role !== 'student' && <BadgeCheck className="w-4 h-4 text-amber-500" />}
                </h3>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {topic.views_count || 0} مشاهدة</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 prose max-w-none text-slate-800 leading-loose" dangerouslySetInnerHTML={{ __html: topic.content }} />
        </motion.div>

        <div className="flex items-center gap-3 mt-12 mb-6 px-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-900">الردود والمناقشات <span className="text-slate-400 text-sm">({replies.length})</span></h2>
        </div>

        <div className="space-y-4">
          {replies.map((reply) => {
            const isReplyStaff = reply.users?.role === 'teacher' || reply.users?.role === 'admin';
            const isLiked = userVotes.includes(reply.id);

            return (
              <motion.div key={reply.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white rounded-[2rem] shadow-sm border ${reply.is_verified ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-slate-200'} overflow-hidden relative`}>
                
                {reply.is_verified && (
                  <div className="bg-emerald-500 text-white text-xs font-black px-4 py-1.5 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> تم اعتماد هذه الإجابة لحل المشكلة
                  </div>
                )}

                <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="shrink-0 flex items-center sm:items-start sm:flex-col gap-3">
                    {reply.users?.avatar_url ? (
                       // eslint-disable-next-line @next/next/no-img-element
                      <img src={reply.users.avatar_url} alt="avatar" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-slate-100" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div>
                    )}
                    <div>
                      <h4 className="font-black text-sm text-slate-900 flex items-center gap-1">
                        {reply.users?.full_name} {isReplyStaff && <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: arSA })}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: reply.content }} />
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
                      
                      <button onClick={() => toggleVote(reply.id, reply.upvotes_count)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isLiked ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}>
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} /> 
                        <span dir="ltr">{reply.upvotes_count}</span>
                      </button>

                      {canModerate && (
                        <button onClick={() => toggleVerify(reply.id, reply.is_verified, reply.author_id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${reply.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}>
                          {reply.is_verified ? <><XCircle className="w-4 h-4" /> إلغاء الاعتماد</> : <><CheckCircle className="w-4 h-4" /> اعتماد كحل</>}
                        </button>
                      )}

                      {(isStaff || user?.id === reply.author_id) && (
                        <button onClick={() => handleDeleteReply(reply.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mr-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {!topic.is_locked ? (
          <div className="mt-8 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Reply className="w-5 h-5" /></div>
              <h3 className="font-black text-slate-900">إضافة رد جديد</h3>
            </div>
            <form onSubmit={handleAddReply} className="p-4 sm:p-6 space-y-4">
              <ForumEditor content={replyContent} setContent={setReplyContent} canUploadImage={isStaff} />
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
            <p className="text-sm font-bold text-slate-500 mt-2">لا يمكن إضافة ردود جديدة على هذا الموضوع.</p>
          </div>
        )}

      </div>
    </div>
  );
}
