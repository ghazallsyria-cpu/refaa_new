'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, Loader2, User, Clock, ShieldCheck, 
  MessageSquare, Send, Reply, Eye, BadgeCheck, Lock,
  Heart, MoreVertical, Pin, Trash2, CheckCircle, XCircle, Share2, Medal, BookOpen, Users,
  Sparkles, Quote, Trophy, Crown, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import ForumEditor from '@/components/ForumEditor';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// 🚀 خريطة الأيقونات للهيدر الذكي
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

const renderContentWithMath = (content: string) => {
   if (!content) return { __html: '' };
   let html = content.replace(
     /\$\$(.*?)\$\$/g, 
     '<span class="math-tex text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-mono font-bold mx-1 shadow-sm inline-block max-w-full break-words whitespace-pre-wrap" dir="ltr" style="word-break: break-word; overflow-wrap: anywhere;">$1</span>'
   );
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

  // 🚀 حالات السلايدر الديناميكي
  const [heroSlides, setHeroSlides] = useState<any[]>([DEFAULT_SLIDE]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 🚀 جلب شرائح الهيدر من قاعدة البيانات
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

  // 🚀 تأثير تقليب السلايدر تلقائياً
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000); 
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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

      const { data: authorData } = await supabase.from('users').select('id, full_name, role, avatar_url, created_at').eq('id', topicData.author_id).single();
      let badgeText = authorData?.role === 'student' ? 'طالب' : (authorData?.role === 'teacher' ? 'معلم' : 'إدارة');
      
      let authorRoleDetail = '';
      if (authorData?.role === 'teacher') {
         try {
            const { data: tsData } = await supabase.from('teacher_subjects').select('subjects(name)').eq('teacher_id', topicData.author_id).limit(1);
            if (tsData && tsData.length > 0 && (tsData[0] as any).subjects) authorRoleDetail = (tsData[0] as any).subjects.name || '';
            else {
               const { data: tData } = await supabase.from('teachers').select('specialization').eq('id', topicData.author_id).single();
               if (tData && tData.specialization) authorRoleDetail = tData.specialization;
            }
         } catch (e) {}
      } else if (authorData?.role === 'student') {
         try {
            const { data: stData } = await supabase.from('students').select('sections(name, classes(name))').eq('id', topicData.author_id).single();
            if (stData && stData.sections) {
               const sec: any = stData.sections;
               const className = sec.classes?.name || sec.class?.name || '';
               const secName = sec.name || '';
               authorRoleDetail = className ? `${className} - ${secName}` : secName;
            }
         } catch (e) {}
      }

      const { data: authorBadgesRaw } = await supabase
        .from('student_badges')
        .select(`badge_id, badges ( id, name, image_url )`)
        .eq('student_id', topicData.author_id);
      
      const parsedBadges = authorBadgesRaw?.map((b: any) => b.badges).filter(Boolean) || [];

      setTopic({ 
        ...topicData, 
        author: authorData, 
        author_badge: badgeText, 
        author_role_detail: authorRoleDetail,
        author_earned_badges: parsedBadges 
      });

      const { data: poll } = await supabase.from('forum_polls').select('*').eq('topic_id', topicId).single();
      if (poll) {
         const { data: options } = await supabase.from('forum_poll_options').select('*').eq('poll_id', poll.id);
         const { data: votes } = await supabase.from('forum_poll_votes').select('*').eq('poll_id', poll.id);
         setPollData({ ...poll, options: options || [], votes: votes || [] });
      }

      const { data: repliesData } = await supabase.from('forum_replies').select('*').eq('topic_id', topicId).order('is_verified', { ascending: false }).order('created_at', { ascending: true });

      let formattedReplies: any[] = [];
      if (repliesData && repliesData.length > 0) {
        const authorIds = [...new Set(repliesData.map((r: any) => r.author_id))];
        const { data: usersData } = await supabase.from('users').select('id, full_name, role, avatar_url, created_at').in('id', authorIds);
        
        let userRoleDetailsMap = new Map();
        
        const teacherIds = usersData?.filter((u: any) => u.role === 'teacher').map((u: any) => u.id) || [];
        if (teacherIds.length > 0) {
           try {
              const { data: tsData } = await supabase.from('teacher_subjects').select('teacher_id, subjects(name)').in('teacher_id', teacherIds);
              if (tsData) tsData.forEach((ts: any) => { if (ts.subjects?.name && !userRoleDetailsMap.has(ts.teacher_id)) userRoleDetailsMap.set(ts.teacher_id, ts.subjects.name); });
              const missingTeacherIds = teacherIds.filter(id => !userRoleDetailsMap.has(id));
              if (missingTeacherIds.length > 0) {
                  const { data: tData } = await supabase.from('teachers').select('id, specialization').in('id', missingTeacherIds);
                  tData?.forEach((t: any) => { if (t.specialization) userRoleDetailsMap.set(t.id, t.specialization); });
              }
           } catch (e) {}
        }

        const studentIds = usersData?.filter((u: any) => u.role === 'student').map((u: any) => u.id) || [];
        if (studentIds.length > 0) {
           try {
              const { data: stData } = await supabase.from('students').select('id, sections(name, classes(name))').in('id', studentIds);
              if (stData) {
                 stData.forEach((st: any) => {
                    if (st.sections) {
                       const className = st.sections.classes?.name || st.sections.class?.name || '';
                       const secName = st.sections.name || '';
                       const fullSec = className ? `${className} - ${secName}` : secName;
                       if (fullSec) userRoleDetailsMap.set(st.id, fullSec);
                    }
                 });
              }
           } catch (e) {}
        }

        const { data: allReplyBadgesRaw } = await supabase
          .from('student_badges')
          .select(`student_id, badge_id, badges ( id, name, image_url )`)
          .in('student_id', authorIds);

        formattedReplies = repliesData.map((reply: any) => {
          const author = usersData?.find((u: any) => u.id === reply.author_id);
          const roleDetail = userRoleDetailsMap.get(reply.author_id) || '';
          const userBadgeRows = allReplyBadgesRaw?.filter((b: any) => b.student_id === reply.author_id) || [];
          const replyBadges = userBadgeRows.map((b: any) => b.badges).filter(Boolean);

          return { 
            ...reply, 
            users: author || { full_name: 'مجهول', role: 'student' }, 
            role_detail: roleDetail,
            earned_badges: replyBadges 
          };
        });

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

  const UserProfileColumn = ({ author, badgeText, badges, roleDetail, isTopicAuthor = false }: any) => (
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
      
      <span className={`mt-2 text-[10px] font-black px-3 py-1 rounded-full border flex items-center gap-1 ${author?.role !== 'student' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {badgeText} 
        {roleDetail ? (
           <>
             <span className="opacity-50 mx-0.5">•</span> 
             {author?.role === 'teacher' ? <BookOpen className="w-3 h-3 inline"/> : <Users className="w-3 h-3 inline"/>} 
             <span className="mr-0.5">{roleDetail}</span>
           </>
        ) : ''}
      </span>
      
      {badges && badges.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {badges.map((badge: any, idx: number) => (
             <div key={idx} className="relative group/userbadge cursor-help">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img 
                  src={badge.image_url} 
                  alt={badge.name} 
                  className="w-7 h-7 object-contain drop-shadow-sm hover:scale-110 transition-transform" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
               />
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

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  if (!topic) return <div className="text-center mt-20"><h2 className="text-xl font-bold">الموضوع غير موجود</h2></div>;

  const canModerate = isStaff || user?.id === topic.author_id;
  const currentSlideData = heroSlides[currentSlide] || DEFAULT_SLIDE;
  const SlideIcon = ICON_MAP[currentSlideData.icon_name] || Sparkles;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-indigo-500 selection:text-white" dir="rtl">
      
      <style dangerouslySetInnerHTML={{__html: `
        .prose-container .prose table { display: block; max-width: 100%; overflow-x: auto; white-space: nowrap; }
        .prose-container .prose img { max-width: 100%; height: auto; border-radius: 1rem; }
      `}} />

      {/* 🌟 الواجهة العلوية الفاخرة المتقلبة الديناميكية */}
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

              {/* صور المتفوقين */}
              {currentSlideData.metadata?.students && (
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  {currentSlideData.metadata.students.map((student: any, i: number) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 sm:p-3 flex items-center gap-3 pr-4 shadow-xl">
                      <div className="relative">
                        <Crown className="absolute -top-3 -right-2 w-5 h-5 text-amber-400 drop-shadow-md z-10 rotate-12" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* 🌟 شريط التحكم الخاص بالموضوع (Glassmorphism & Sticky) */}
      <div className="sticky top-4 z-40 max-w-6xl mx-auto px-4 sm:px-6 -mt-10 mb-8 transition-all">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-3 sm:p-4 rounded-[2rem] shadow-[0_10px_30px_rgb(0,0,0,0.08)] flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <button onClick={() => router.push(`/forums/${topic.category_id}`)} className="p-2 sm:p-3 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors shrink-0">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 mb-1">
                <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 truncate max-w-[120px] sm:max-w-none">{topic.category?.name || 'قسم المنتدى'}</span>
                {topic.is_pinned && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 flex items-center gap-1 shrink-0"><Pin className="w-3 h-3" /> مثبت</span>}
                {topic.is_locked && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 shrink-0"><Lock className="w-3 h-3" /> مغلق</span>}
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 truncate w-full">{topic.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 sm:p-3 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors hidden sm:block" title="نسخ الرابط" onClick={() => navigator.clipboard.writeText(window.location.href)}><Share2 className="w-4 h-4" /></button>
            {isStaff && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger className="p-2 sm:p-3 bg-slate-900 hover:bg-black text-white rounded-xl outline-none transition-colors shadow-md">
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 prose-container relative z-20">
        
        {/* Main Topic Container */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row max-w-full w-full">
          
          <UserProfileColumn 
            author={topic.author} 
            badgeText={topic.author_badge} 
            badges={topic.author_earned_badges} 
            roleDetail={topic.author_role_detail} 
            isTopicAuthor={true} 
          />
          
          <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
             <div className="p-6 md:p-10 flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100 text-xs font-bold text-slate-400">
                   <Clock className="w-4 h-4" /> تم النشر: {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: arSA })}
                </div>
                
                <div 
                  className="prose prose-slate prose-indigo max-w-none text-slate-800 leading-loose font-medium w-full break-words overflow-x-auto overflow-y-hidden prose-p:text-lg prose-headings:font-black" 
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  dangerouslySetInnerHTML={renderContentWithMath(topic.content)} 
                />
                
                {pollData && (
                  <div className="mt-12 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] w-full">
                     <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-3">📊 {pollData.question}</h3>
                     <p className="text-xs font-bold text-slate-500 mb-8 bg-white inline-block px-3 py-1.5 rounded-lg border border-slate-200">إجمالي الأصوات: {pollData.votes.length} {pollData.allow_multiple && ' • يسمح باختيارات متعددة'}</p>
                     
                     <div className="space-y-4">
                       {pollData.options.map((opt: any) => {
                          const votesForOption = pollData.votes.filter((v: any) => v.option_id === opt.id).length;
                          const percentage = pollData.votes.length > 0 ? Math.round((votesForOption / pollData.votes.length) * 100) : 0;
                          const isMyVote = pollData.votes.some((v: any) => v.option_id === opt.id && v.user_id === user?.id);

                          return (
                            <div key={opt.id} className="relative w-full group/poll">
                              <button onClick={() => handlePollVote(opt.id)} className={`w-full relative z-10 flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-right overflow-hidden ${isMyVote ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-indigo-300 shadow-sm'}`}>
                                 <span className={`font-black z-20 relative text-sm sm:text-base ${isMyVote ? 'text-indigo-800' : 'text-slate-700'}`}>
                                   {isMyVote && <CheckCircle className="w-5 h-5 inline-block ml-3 text-indigo-600" />}{opt.option_text}
                                 </span>
                                 <span className="font-black text-slate-500 text-sm z-20 relative bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm">{percentage}% ({votesForOption})</span>
                                 <div className="absolute top-0 right-0 h-full bg-indigo-100/50 rounded-xl transition-all duration-700 ease-out z-0" style={{ width: `${percentage}%` }}></div>
                              </button>
                            </div>
                          );
                       })}
                     </div>
                  </div>
                )}
             </div>
             
             <div className="bg-slate-50/50 border-t border-slate-100 px-8 py-5 flex items-center justify-end gap-3 w-full">
                <button onClick={() => { document.getElementById('replyEditor')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-2 text-sm font-black text-slate-600 hover:text-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 active:scale-95">
                   <Reply className="w-5 h-5" /> أضف ردك الآن
                </button>
             </div>
          </div>
        </motion.div>

        {/* Replies Section */}
        {replies.length > 0 && (
          <div className="space-y-8 pt-8 w-full">
            <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3 px-4"><MessageSquare className="w-7 h-7 text-indigo-500" /> المشاركات والردود ({replies.length})</h3>
            
            {replies.map((reply) => {
              const isLiked = userVotes.includes(reply.id);
              const badgeText = reply.users?.role === 'student' ? 'طالب' : (reply.users?.role === 'teacher' ? 'معلم' : 'إدارة');

              return (
                <motion.div key={reply.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`bg-white rounded-[2.5rem] shadow-sm border ${reply.is_verified ? 'border-emerald-400 ring-4 ring-emerald-50' : 'border-slate-200'} overflow-hidden flex flex-col md:flex-row relative max-w-full w-full`}>
                  
                  {reply.is_verified && (
                    <div className="absolute top-4 left-4 z-20 bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-400">
                      <CheckCircle className="w-4 h-4" /> إجابة معتمدة كحل
                    </div>
                  )}

                  <UserProfileColumn 
                     author={reply.users} 
                     badgeText={badgeText} 
                     badges={reply.earned_badges} 
                     roleDetail={reply.role_detail} 
                  />
                  
                  <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
                    <div className="p-6 md:p-8 flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-400 mb-6 pb-4 border-b border-slate-100 flex justify-between items-center">
                         <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: arSA })}</span>
                         {reply.is_verified && <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg"><Medal className="w-4 h-4" /> أفضل إجابة</span>}
                      </div>
                      
                      <div 
                        className="prose prose-slate max-w-none text-slate-700 leading-loose w-full break-words overflow-x-auto overflow-y-hidden prose-p:text-base" 
                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        dangerouslySetInnerHTML={renderContentWithMath(reply.content)} 
                      />
                    </div>
                    
                    <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center gap-4 w-full">
                      <div className="relative group/like">
                        <button onClick={() => toggleVote(reply.id, reply.upvotes_count)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 ${isLiked ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                          <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} /> 
                          <span dir="ltr">{replyLikesData[reply.id]?.count !== undefined ? replyLikesData[reply.id].count : reply.upvotes_count}</span>
                        </button>
                        
                        {replyLikesData[reply.id] && replyLikesData[reply.id].names.length > 0 && (
                           <div className="absolute bottom-full right-0 mb-3 hidden group-hover/like:block w-max max-w-xs bg-slate-800/95 backdrop-blur-md text-white text-xs font-bold p-3 rounded-xl shadow-xl z-10 pointer-events-none transition-opacity duration-200 border border-slate-700">
                              أعجب بهذا: {replyLikesData[reply.id].names.slice(0, 5).join('، ')}
                              {replyLikesData[reply.id].names.length > 5 && ` و ${replyLikesData[reply.id].names.length - 5} آخرين`}
                           </div>
                        )}
                      </div>

                      {canModerate && (
                        <button onClick={() => toggleVerify(reply.id, reply.is_verified)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all border shadow-sm active:scale-95 ${reply.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}>
                          {reply.is_verified ? <><XCircle className="w-5 h-5" /> إلغاء الاعتماد</> : <><CheckCircle className="w-5 h-5" /> اعتماد كحل</>}
                        </button>
                      )}

                      {(isStaff || user?.id === reply.author_id) && (
                        <button onClick={() => handleDeleteReply(reply.id, reply.content)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mr-auto active:scale-95" title="حذف الرد">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Reply Box */}
        <div id="replyEditor" className="pt-10 w-full">
        {!topic.is_locked ? (
          canReply ? (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden w-full max-w-full">
               <div className="bg-gradient-to-l from-indigo-50 to-white border-b border-slate-100 p-6 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm border border-indigo-200"><Reply className="w-6 h-6" /></div>
                <div>
                    <h3 className="font-black text-xl text-slate-900 mb-1">أضف ردك للمناقشة</h3>
                    <p className="text-xs font-bold text-slate-500">شارك رأيك، ارفع صوراً، أو أضف معادلات رياضية (استخدم $$ حول المعادلة).</p>
                </div>
              </div>
              <form onSubmit={handleAddReply} className="p-6 md:p-8 space-y-6">
                <div className="max-w-full w-full overflow-hidden border border-slate-200 rounded-2xl focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                  <ForumEditor content={replyContent} setContent={setReplyContent} canUploadImage={true} />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex justify-center items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} نشر الرد الآن
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-300 p-16 text-center flex flex-col items-center justify-center w-full">
              <Lock className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-2xl font-black text-slate-700 mb-2">هذا القسم للقراءة فقط</h3>
              <p className="text-base font-bold text-slate-500">لا يُسمح بإضافة ردود في هذا القسم حسب إعدادات الإدارة.</p>
            </div>
          )
        ) : (
          <div className="bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-300 p-16 text-center flex flex-col items-center justify-center w-full">
            <Lock className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-2xl font-black text-slate-700 mb-2">هذا الموضوع مغلق</h3>
            <p className="text-base font-bold text-slate-500">تم إغلاق باب النقاش في هذا الموضوع من قِبل الإدارة.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
