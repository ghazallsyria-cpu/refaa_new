import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useForumSystem() {
  const [loading, setLoading] = useState(false);

  // 1. جلب الأقسام (المجتمعات)
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. جلب المواضيع داخل قسم معين
  const fetchTopics = useCallback(async (categoryId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .select(`
          *,
          author:users(id, full_name, avatar_url, role),
          replies:forum_replies(count)
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. جلب تفاصيل موضوع واحد مع ردوده
  const fetchTopicDetails = useCallback(async (topicId: string) => {
    setLoading(true);
    try {
      // زيادة عدد المشاهدات أولاً
      await supabase.rpc('increment_topic_views', { t_id: topicId }); // دالة سننشئها لاحقاً لزيادة المشاهدات

      const { data: topic, error: topicError } = await supabase
        .from('forum_topics')
        .select('*, author:users(id, full_name, avatar_url, role, last_seen)')
        .eq('id', topicId)
        .single();
        
      if (topicError) throw topicError;

      const { data: replies, error: repliesError } = await supabase
        .from('forum_replies')
        .select('*, author:users(id, full_name, avatar_url, role, last_seen)')
        .eq('topic_id', topicId)
        .order('is_verified', { ascending: false }) // الإجابة المعتمدة تظهر أولاً
        .order('upvotes_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      return { topic, replies: replies || [] };
    } catch (error) {
      console.error('Error fetching topic details:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. إنشاء موضوع جديد
  const createTopic = async (categoryId: string, authorId: string, title: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .insert([{ category_id: categoryId, author_id: authorId, title, content }])
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 5. إضافة رد جديد
  const addReply = async (topicId: string, authorId: string, content: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_replies')
        .insert([{ topic_id: topicId, author_id: authorId, content }])
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 6. إضافة/إزالة إعجاب لرد (Upvote)
  const toggleUpvote = async (replyId: string, userId: string) => {
    try {
      // التحقق هل صوّت مسبقاً؟
      const { data: existingVote } = await supabase
        .from('forum_votes')
        .select('id')
        .eq('reply_id', replyId)
        .eq('user_id', userId)
        .single();

      if (existingVote) {
        // إذا كان مصوت، نحذف التصويت وننقص العداد
        await supabase.from('forum_votes').delete().eq('id', existingVote.id);
        // ملاحظة: يُفضل استخدام دالة RPC لتحديث العداد بأمان
        return { success: true, action: 'removed' };
      } else {
        // إضافة تصويت جديد وزيادة العداد
        await supabase.from('forum_votes').insert([{ reply_id: replyId, user_id: userId }]);
        return { success: true, action: 'added' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 7. اعتماد إجابة (بواسطة المعلم)
  const verifyReply = async (replyId: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from('forum_replies')
        .update({ is_verified: isVerified })
        .eq('id', replyId);
        
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    loading,
    fetchCategories,
    fetchTopics,
    fetchTopicDetails,
    createTopic,
    addReply,
    toggleUpvote,
    verifyReply
  };
}
