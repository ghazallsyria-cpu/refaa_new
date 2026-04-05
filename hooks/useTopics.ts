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

      // 2. جلب المواضيع (بدون ربط مباشر لتفادي خطأ auth.users)
      const { data: topicsData, error: topicsError } = await supabase
        .from('forum_topics')
        .select(`id, title, content, created_at, views_count, is_pinned, is_locked, author_id`)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;

      if (topicsData && topicsData.length > 0) {
        // 3. استخراج معرفات الكتاب الفريدة لجلب بياناتهم
        const authorIds = [...new Set(topicsData.map(t => t.author_id))];
        
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, role, avatar_url')
          .in('id', authorIds);

        // 4. جلب عدد الردود لكل موضوع
        const topicIds = topicsData.map(t => t.id);
        const { data: repliesData } = await supabase
          .from('forum_replies')
          .select('id, topic_id')
          .in('topic_id', topicIds);

        // 5. دمج البيانات بذكاء (Merge)
        const formattedTopics: Topic[] = topicsData.map((t: any) => {
          const author = usersData?.find(u => u.id === t.author_id);
          const repliesCount = repliesData?.filter(r => r.topic_id === t.id).length || 0;
          
          return {
            ...t,
            author_name: author?.full_name || 'مستخدم غير معروف',
            author_role: author?.role || 'student',
            author_avatar: author?.avatar_url || null,
            replies_count: repliesCount
          };
        });

        setTopics(formattedTopics);
      } else {
        setTopics([]); // لا توجد مواضيع
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
      
      await fetchTopicsAndCategory(); // تحديث فوري
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
