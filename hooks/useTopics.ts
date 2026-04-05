import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Topic {
  id: string;
  title: string;
  content: string;
  created_at: string;
  views_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar: string | null;
  replies_count: number;
}

export interface CategoryDetails {
  id: string;
  name: string;
  description: string;
}

export function useTopics(categoryId: string) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<CategoryDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTopicsAndCategory = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    
    try {
      // 1. جلب تفاصيل القسم
      const { data: catData, error: catError } = await supabase
        .from('forum_categories')
        .select('id, name, description')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;
      setCategoryInfo(catData);

      // 2. جلب المواضيع (معالجة قوية للأخطاء)
      const { data: topicsData, error: topicsError } = await supabase
        .from('forum_topics')
        .select(`
          id, title, content, created_at, views_count, is_pinned, is_locked, author_id,
          users (full_name, role, avatar_url),
          forum_replies (id)
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (topicsError) {
        console.error("DB Error:", topicsError);
        throw topicsError;
      }

      if (topicsData) {
        const formattedTopics: Topic[] = topicsData.map((t: any) => {
          // استخراج بيانات المستخدم بشكل آمن (سواء كان مصفوفة أو كائن)
          const userData = Array.isArray(t.users) ? t.users[0] : t.users;
          
          return {
            id: t.id,
            title: t.title,
            content: t.content,
            created_at: t.created_at,
            views_count: t.views_count,
            is_pinned: t.is_pinned,
            is_locked: t.is_locked,
            author_id: t.author_id,
            author_name: userData?.full_name || 'مستخدم غير معروف',
            author_role: userData?.role || 'student',
            author_avatar: userData?.avatar_url || null,
            replies_count: t.forum_replies ? t.forum_replies.length : 0
          };
        });
        setTopics(formattedTopics);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const createTopic = async (title: string, content: string, authorId: string) => {
    try {
      const { error } = await supabase
        .from('forum_topics')
        .insert([{
          category_id: categoryId,
          author_id: authorId,
          title,
          content
        }]);

      if (error) throw error;
      
      await fetchTopicsAndCategory(); // تحديث القائمة فوراً
      return { success: true };
    } catch (error: any) {
      console.error('Error creating topic:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    topics,
    categoryInfo,
    loading,
    fetchTopicsAndCategory,
    createTopic
  };
}
