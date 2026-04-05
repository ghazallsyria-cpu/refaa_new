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
  author_name?: string;
  replies_count?: number;
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
      // 1. جلب تفاصيل القسم (العنوان والوصف)
      const { data: catData, error: catError } = await supabase
        .from('forum_categories')
        .select('id, name, description')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;
      setCategoryInfo(catData);

      // 2. جلب المواضيع داخل هذا القسم مع اسم الكاتب وعدد الردود
      const { data: topicsData, error: topicsError } = await supabase
        .from('forum_topics')
        .select(`
          id, title, content, created_at, views_count, is_pinned, is_locked, author_id,
          author:users!author_id (full_name),
          replies:forum_replies (count)
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false }) // المثبت أولاً
        .order('created_at', { ascending: false }); // ثم الأحدث

      if (topicsError) throw topicsError;

      if (topicsData) {
        const formattedTopics = topicsData.map((t: any) => ({
          ...t,
          author_name: Array.isArray(t.author) ? t.author[0]?.full_name : t.author?.full_name || 'مستخدم',
          replies_count: Array.isArray(t.replies) ? t.replies[0]?.count : t.replies?.count || 0
        }));
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
      
      await fetchTopicsAndCategory(); // تحديث القائمة بعد النشر
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
