'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, Loader2, User, Clock, ShieldCheck, 
  MessageSquare, Send, Reply, Eye, BadgeCheck, Lock,
  Heart, MoreVertical, Pin, Trash2, CheckCircle, XCircle, Share2, Medal
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';



// --- ✅ أزل التعليق (//) عن هذه الاستيرادات في مشروعك الفعلي ✅ ---
import { useParams, useRouter } from 'next/navigation';
 import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
 import ForumEditor from '@/components/ import { deleteFromCloudinary } from '@/lib// -------------------------------------------------------------------------------------

const extractUrlsFromHtml = (htmlStrings: string[]) => {
  const urls: string[] = [];
  const regex = /<img[^>]+src="([^">]+)"/g;
  htmlStrings.forEach(html => {
    if (!html) return;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1].includes('cloudinary.com')) urls.push(match[1]);
    }
  });
  return urls;
};

// 🚀 أداة دمج الرياضيات والمعادلات (تُعالج النص الذي يحتوي على $$)
const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   // هذه دالة بسيطة لاستبدال $$ بمعادلات مائلة كحل مبدئي، في المشروع الحقيقي 
   // يفضل استخدام مكتبة KaTeX عبر <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
   let html = content.replace(/\$\$(.*?)\$\$/g, '<span class="math-tex text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-mono font-bold mx-1 shadow-sm" dir="ltr">$1</span>');
   return { __html: html };
};

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
  const [replyLikesData, setReplyLikesData] = useState<Record<string, {count: number, names: string[]}>>({});
  const [pollData, setPollData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTopicData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select('*, category:forum_categories(name, reply_permission)')
        .eq('id', topicId)
        .single();
        
      if (topicError) throw topicError;

      const viewedTopics = JSON.parse(sessionStorage.getItem('viewed_topics') || '[]');
      if (!viewedTopics.includes(topicId)) {
         const newViewsCount = (topicData.views_count || 0) + 1;
         await supabase.from('forum_topics').update({ views_count: newViewsCount }).eq('id', topicId);
         topicData.views_count = newViewsCount;
         sessionStorage.setItem('viewed_topics', JSON.stringify([...viewedTopics, topicId]));
      }

      // جلب بيانات الكاتب
      const { data: authorData } = await supabase.from('users').select('id, full_name, role, avatar_url, created_at').eq('id', topicData.author_id).single();
      let badgeText = authorData?.role === 'student' ? 'طالب' : (authorData?.role === 'teacher' ? 'معلم' : 'إدارة');
      
      // 🚀 جلب أوسمة الكاتب الحقيقية من قاعدة البيانات
      const { data: authorBadges } = await supabase
        .from('user_badges')
        .select(`gamification_badges(id, name, image_url)`)
        .eq('user_id', topicData.author_id);
      
      const parsedBadges = authorBadges?.map((b: any) => b.gamification_badges).filter(Boolean) || [];

      setTopic({ ...topicData, author: authorData, author_badge: badgeText, author_earned_badges: parsedBadges });

      // جلب الاستطلاعات
      const { data: poll } = await supabase.from('forum_polls').select('*').eq('topic_id', topicId).single();
      if (poll) {
         const { data: options } = await supabase.from('forum_poll_options').select('*').eq('poll_id', poll.id);
         const { data: votes } = await supabase.from('forum_poll_votes').select('*').eq('poll_id', poll.id);
         setPollData({ ...poll, options: options || [], votes: votes || [] });
      }

      // جلب الردود
      const { data: repliesData } = await supabase.from('forum_replies').select('*').eq('topic_id', topicId).order('is_verified', { ascending: false }).order('created_at', { ascending: true });

      let formattedReplies: any[] = [];
      if (repliesData && repliesData.length > 0) {
        const authorIds = [...new Set(repliesData.map((r: any) => r.author_id))];
        const { data: usersData } = await supabase.from('users').select('id, full_name, role, avatar_url, created_at').in('id', authorIds);
        
        // 🚀 جلب أوسمة المعلقين
        const { data: allReplyBadges } = await supabase
          .from('user_badges')
          .select(`user_id, gamification_badges(id, name, image_url)`)
          .in('user_id', authorIds);

        formattedReplies = repliesData.map((reply: any) => {
          const author = usersData?.find((u: any) => u.id === reply.author_id);
          const replyBadges = allReplyBadges?.filter((b:any) => b.user_id === reply.author_id).map((b:any) => b.gamification_badges).filter(Boolean) || [];
          return { ...reply, users: author || { full_name: 'مجهول', role: 'student' }, earned_badges: replyBadges };
        });

        // جلب المعجبين
        const replyIds = repliesData.map((r: any) => r.id);
        const { data: allVotes } = await supabase.from('forum_votes').select('reply_id, user_id').in('reply_id', replyIds);
        
        if (allVotes && allVotes.length > 0) {
           const voterIds = [...new Set(allVotes.map((v: any) => v.user_id))];
           const { data: votersData } = await supabase.from('users').select('id, full_name').in('id', voterIds);
           
           const likesMap: Record<string, {count: number, names: string[]}> = {};
           replyIds.forEach((id: string) => {
              const votesForReply = allVotes.filter((v: any) => v.reply_id === id);
              const names = votesForReply.map((v: any) => {
                 const usr = votersData?.find((u: any) => u.id === v.user_id);
                 return usr ? usr.full_name : 'مستخدم';
              });
              likesMap[id] = { count: votesForReply.length, names };
           });
           setReplyLikesData(likesMap);
        }
      }
      setReplies(formattedReplies);

      if (user) {
        const { data: votes } = await supabase.from('forum_votes').select('reply_id').eq('user_id', user.id);
        setUserVotes(votes?.map((v: any) => v.reply_id) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => { fetchTopicData(); }, [fetchTopicData]);

  const checkReplyPermission = () => {
    if (!currentRole || !topic?.category) return false;
    const perm = topic.category.reply_permission;
    
    if (perm === 'none') return false;
    if (perm === 'all' || !perm) return true;
    if (perm === 'admin_only' && (currentRole === 'admin' || currentRole === 'management')) return true;
    if (perm === 'teachers_admin' && (currentRole === 'admin' || currentRole === 'management' || currentRole === 'teacher')) return true;
    
    return false;
  };

  const canReply = checkReplyPermission();

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const strippedContent = replyContent.replace(/<[^>]+>/g, '').trim();
    if (!user || (!strippedContent && !replyContent.includes('<img'))) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('forum_replies').insert([{ topic_id: topicId, author_id: user.id, content: replyContent }]);
      if (error) throw error;
      
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
    setUserVotes((prev: string[]) => hasVoted ? prev.filter(id => id !== replyId) : [...prev, replyId]);
    
    setReplyLikesData((prev: any) => {
       const currentNames = prev[replyId]?.names || [];
       const myName = user.user_metadata?.full_name || 'مستخدم';
       const newNames = hasVoted ? currentNames.filter((n: string) => n !== myName) : [...currentNames, myName];
       return { ...prev, [replyId]: { count: (prev[replyId]?.count || currentCount) + (hasVoted ? -1 : 1), names: newNames } };
    });
    
    setReplies((prev: any[]) => prev.map((r: any) => r.id === replyId ? { ...r, upvotes_count: r.upvotes_count + (hasVoted ? -1 : 1) } : r));

    try {
      if (hasVoted) {
        await supabase.from('forum_votes').delete().eq('reply_id', replyId).eq('user_id', user.id);
        await supabase.from('forum_replies').update({ upvotes_count: currentCount - 1 }).eq('id', replyId);
      } else {
        await supabase.from('forum_votes').insert([{ reply_id: replyId, user_id: user.id }]);
        await supabase.from('forum_replies').update({ upvotes_count: currentCount + 1 }).eq('id', replyId);
      }
    } catch (error) {}
  };

  const handlePollVote = async (optionId: string) => {
     if (!user || !pollData) return;
     const hasVoted = pollData.votes.some((v: any) => v.user_id === user.id && (!pollData.allow_multiple || v.option_id === optionId));
     
     if (hasVoted && !pollData.allow_multiple) {
        alert('لقد قمت بالتصويت مسبقاً في هذا الاستطلاع.');
        return;
     } else if (hasVoted && pollData.allow_multiple) {
        try {
           await supabase.from('forum_poll_votes').delete().eq('poll_id', pollData.id).eq('option_id', optionId).eq('user_id', user.id);
           setPollData({ ...pollData, votes: pollData.votes.filter((v: any) => !(v.option_id === optionId && v.user_id === user.id)) });
        } catch (error) {}
        return;
     }

     try {
        await supabase.from('forum_poll_votes').insert([{ poll_id: pollData.id, option_id: optionId, user_id: user.id }]);
        setPollData({ ...pollData, votes: [...pollData.votes, { poll_id: pollData.id, option_id: optionId, user_id: user.id }] });
     } catch (error) {}
  };

  const toggleVerify = async (replyId: string, currentStatus: boolean) => {
    try {
      await supabase.from('forum_replies').update({ is_verified: !currentStatus }).eq('id', replyId);
      fetchTopicData();
    } catch (error) { console.error(error); }
  };

  const toggleTopicAttribute = async (field: 'is_pinned' | 'is_locked', currentValue: boolean) => {
    try {
      await supabase.from('forum_topics').update({ [field]: !currentValue }).eq('id', topicId);
      setTopic((prev: any) => ({ ...prev, [field]: !currentValue }));
    } catch (error) { console.error(error); }
  };

  const handleDeleteTopic = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الموضوع نهائياً؟')) return;
    try {
      const urlsToDelete = extractUrlsFromHtml([topic.content, ...replies.map(r => r.content)]);
      if (urlsToDelete.length > 0) await Promise.all(urlsToDelete.map(url => deleteFromCloudinary(url)));
      await supabase.from('forum_replies').delete().eq('topic_id', topicId);
      await supabase.from('forum_topics').delete().eq('id', topicId);
      router.push(`/forums/${topic.category_id}`);
    } catch (error) {}
  };

  const handleDeleteReply = async (replyId: string, content: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرد؟')) return;
    try {
      const urlsToDelete = extractUrlsFromHtml([content]);
      if (urlsToDelete.length > 0) await Promise.all(urlsToDelete.map(url => deleteFromCloudinary(url)));
      await supabase.from('forum_replies').delete().eq('id', replyId);
      setReplies((prev: any[]) => prev.filter((r: any) => r.id !== replyId));
    } catch (error) {}
  };

  const UserProfileColumn = ({ author, badgeText, badges, isTopicAuthor = false }: any) => (
    <div className={`w-full md:w-64 shrink-0 flex flex-col items-center p-6 bg-slate-50/50 md:bg-transparent ${isTopicAuthor ? 'md:border-l' : 'md:border-l'} border-slate-100`}>
      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full p-1 bg-white shadow-sm border-2 ${author?.role !== 'student' ? 'border-amber-400' : 'border-slate-200'} mb-3`}>
        {author?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="w-10 h-10" /></div>
        )}
      </div>
      <h3 className="font-black text-base text-slate-900 text-center flex flex-col items-center gap-1">
        {author?.full_name || 'مستخدم مجهول'}
      </h3>
      <span className={`mt-2 text-[10px] font-black px-3 py-1 rounded-full border ${author?.role !== 'student' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {badgeText}
      </span>
      
      {/* 🚀 عرض الأوسمة التي حصل عليها المستخدم */}
      {badges && badges.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {badges.map((badge: any, idx: number) => (
             <div key={idx} className="relative group/userbadge cursor-help">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={badge.image_url} alt={badge.name} className="w-7 h-7 object-contain drop-shadow-sm hover:scale-110 transition-transform" />
               <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover/userbadge:opacity-100 pointer-events-none whitespace-nowrap z-20">
                 {badge.name}
               </div>
             </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 w-full text-xs font-bold text-slate-500 space-y-2 border-t border-slate-200/50 pt-4 hidden md:block">
         <div className="flex justify-between"><span>تاريخ التسجيل:</span> <span className="text-slate-700" dir="ltr">{author?.created_at ? format(new Date(author.created_at), 'yyyy/MM') : 'غير معروف'}</span></div>
         {isTopicAuthor && <div className="flex justify-between"><span>المشاهدات:</span> <span className="text-indigo-600 font-black">{topic.views_count}</span></div>}
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  if (!topic) return <div className="text-center mt-20"><h2 className="text-xl font-bold">الموضوع غير موجود</h2></div>;

  const canModerate = isStaff || user?.id === topic.author_id;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24" dir="rtl">
      
      {/* 🚀 Header Bar with Breadcrumbs & Actions */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/forums/${topic.category_id}`)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 mb-0.5">
                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{topic.category?.name || 'قسم المنتدى'}</span>
                {topic.is_pinned && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1"><Pin className="w-3 h-3" /> مثبت</span>}
                {topic.is_locked && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1"><Lock className="w-3 h-3" /> مغلق</span>}
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 line-clamp-1">{topic.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors hidden sm:block" title="مشاركة" onClick={() => navigator.clipboard.writeText(window.location.href)}><Share2 className="w-4 h-4" /></button>
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
                      <Lock className={`w-4 h-4 ${topic.is_locked ? 'fill-current' : ''}`} /> {topic.is_locked ? 'فتح الموضوع للمناقشة' : 'إغلاق الموضوع'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
                    <DropdownMenu.Item onClick={handleDeleteTopic} className="flex items-center gap-2 p-3 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer outline-none transition-colors">
                      <Trash2 className="w-4 h-4" /> حذف الموضوع
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* 🚀 Main Topic Container (New Architecture) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
          
          <UserProfileColumn author={topic.author} badgeText={topic.author_badge} badges={topic.author_earned_badges} isTopicAuthor={true} />
          
          <div className="flex-1 flex flex-col min-w-0">
             <div className="p-6 md:p-8 flex-1">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 text-xs font-bold text-slate-400">
                   <Clock className="w-4 h-4" /> تم النشر: {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}
                </div>
                
                <div className="prose prose-slate prose-indigo max-w-none text-slate-800 leading-loose font-medium" dangerouslySetInnerHTML={renderContentWithMath(topic.content)} />
                
                {pollData && (
                  <div className="mt-10 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                     <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">📊 {pollData.question}</h3>
                     <p className="text-xs font-bold text-slate-500 mb-6">إجمالي الأصوات: {pollData.votes.length} {pollData.allow_multiple && ' • يسمح باختيارات متعددة'}</p>
                     
                     <div className="space-y-3">
                       {pollData.options.map((opt: any) => {
                          const votesForOption = pollData.votes.filter((v: any) => v.option_id === opt.id).length;
                          const percentage = pollData.votes.length > 0 ? Math.round((votesForOption / pollData.votes.length) * 100) : 0;
                          const isMyVote = pollData.votes.some((v: any) => v.option_id === opt.id && v.user_id === user?.id);

                          return (
                            <div key={opt.id} className="relative w-full">
                              <button onClick={() => handlePollVote(opt.id)} className={`w-full relative z-10 flex items-center justify-between p-4 rounded-xl border-2 transition-all text-right ${isMyVote ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                                 <span className={`font-bold z-20 relative ${isMyVote ? 'text-indigo-800' : 'text-slate-700'}`}>
                                   {isMyVote && <CheckCircle className="w-4 h-4 inline-block ml-2 text-indigo-600" />}{opt.option_text}
                                 </span>
                                 <span className="font-black text-slate-500 text-sm z-20 relative">{percentage}% ({votesForOption})</span>
                                 <div className="absolute top-0 right-0 h-full bg-indigo-100/60 rounded-lg transition-all duration-500 z-0" style={{ width: `${percentage}%` }}></div>
                              </button>
                            </div>
                          );
                       })}
                     </div>
                  </div>
                )}
             </div>
             
             <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                <button onClick={() => { document.getElementById('replyEditor')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                   <Reply className="w-4 h-4" /> إضافة رد
                </button>
             </div>
          </div>
        </motion.div>

        {/* 🚀 Replies Section */}
        {replies.length > 0 && (
          <div className="space-y-6 pt-6">
            <h3 className="font-black text-xl text-slate-900 flex items-center gap-2 px-2"><MessageSquare className="w-6 h-6 text-indigo-500" /> الردود ({replies.length})</h3>
            
            {replies.map((reply) => {
              const isLiked = userVotes.includes(reply.id);
              const badgeText = reply.users?.role === 'student' ? 'طالب' : (reply.users?.role === 'teacher' ? 'معلم' : 'إدارة');

              return (
                <motion.div key={reply.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`bg-white rounded-3xl shadow-sm border ${reply.is_verified ? 'border-emerald-300 ring-4 ring-emerald-50' : 'border-slate-200'} overflow-hidden flex flex-col md:flex-row relative`}>
                  
                  {reply.is_verified && (
                    <div className="absolute top-4 left-4 z-20 bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                      <CheckCircle className="w-3.5 h-3.5" /> إجابة معتمدة
                    </div>
                  )}

                  <UserProfileColumn author={reply.users} badgeText={badgeText} badges={reply.earned_badges} />
                  
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-6 md:p-8 flex-1">
                      <div className="text-xs font-bold text-slate-400 mb-4 pb-3 border-b border-slate-100 flex justify-between items-center">
                         <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: arSA })}</span>
                         {reply.is_verified && <span className="text-emerald-600 flex items-center gap-1"><Medal className="w-4 h-4" /> أفضل إجابة</span>}
                      </div>
                      
                      <div className="prose prose-slate max-w-none text-slate-700 leading-loose" dangerouslySetInnerHTML={renderContentWithMath(reply.content)} />
                    </div>
                    
                    <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-3 flex items-center gap-4">
                      <div className="relative group/like">
                        <button onClick={() => toggleVote(reply.id, reply.upvotes_count)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all ${isLiked ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}>
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} /> 
                          <span dir="ltr">{replyLikesData[reply.id]?.count !== undefined ? replyLikesData[reply.id].count : reply.upvotes_count}</span>
                        </button>
                        
                        {replyLikesData[reply.id] && replyLikesData[reply.id].names.length > 0 && (
                           <div className="absolute bottom-full right-0 mb-2 hidden group-hover/like:block w-max max-w-xs bg-slate-800/95 backdrop-blur-sm text-white text-xs font-bold p-3 rounded-xl shadow-xl z-10 pointer-events-none transition-opacity duration-200">
                              أعجب بهذا: {replyLikesData[reply.id].names.slice(0, 5).join('، ')}
                              {replyLikesData[reply.id].names.length > 5 && ` و ${replyLikesData[reply.id].names.length - 5} آخرين`}
                           </div>
                        )}
                      </div>

                      {canModerate && (
                        <button onClick={() => toggleVerify(reply.id, reply.is_verified)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all border shadow-sm ${reply.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}>
                          {reply.is_verified ? <><XCircle className="w-4 h-4" /> إلغاء الاعتماد</> : <><CheckCircle className="w-4 h-4" /> اعتماد كحل</>}
                        </button>
                      )}

                      {(isStaff || user?.id === reply.author_id) && (
                        <button onClick={() => handleDeleteReply(reply.id, reply.content)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors mr-auto" title="حذف الرد">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 🚀 Reply Box */}
        <div id="replyEditor" className="pt-6">
        {!topic.is_locked ? (
          canReply ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Reply className="w-5 h-5" /></div>
                <h3 className="font-black text-lg text-slate-900">أضف رداً للمناقشة</h3>
              </div>
              <form onSubmit={handleAddReply} className="p-5 sm:p-6 space-y-5">
                <ForumEditor content={replyContent} setContent={setReplyContent} canUploadImage={true} />
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} نشر الرد
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-3xl border border-slate-200 p-10 text-center flex flex-col items-center justify-center">
              <Lock className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-xl font-black text-slate-700 mb-2">هذا القسم للقراءة فقط</h3>
              <p className="text-sm font-bold text-slate-500">لا يُسمح بإضافة ردود في هذا القسم.</p>
            </div>
          )
        ) : (
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-10 text-center flex flex-col items-center justify-center">
            <Lock className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-700 mb-2">هذا الموضوع مغلق</h3>
            <p className="text-sm font-bold text-slate-500">تم إغلاق النقاش في هذا الموضوع من قِبل الإدارة.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
