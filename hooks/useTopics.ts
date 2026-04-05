import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 واجهة جديدة لأوسمة التميز (الصور)
export interface GamificationBadge {
  name: string;
  image_url: string;
}

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
  author_badge: string; // الوسام النصي (طالب صف كذا / معلم كذا)
  author_gamification_badges: GamificationBadge[]; // 🚀 أوسمة الإنجازات (الصور)
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
      const { data: catData, error: catError } = await supabase
        .from('forum_categories')
        .select('id, name, description')
        .eq('id', categoryId)
        .single();

      if (catError) throw catError;
      setCategoryInfo(catData);

      const { data: topicsData, error: topicsError } = await supabase
        .from('forum_topics')
        .select(`id, title, content, created_at, views_count, is_pinned, is_locked, author_id`)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (topicsError) throw topicsError;

      if (topicsData && topicsData.length > 0) {
        const authorIds = [...new Set(topicsData.map(t => t.author_id))];
        
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, role, avatar_url')
          .in('id', authorIds);

        const studentIds = usersData?.filter(u => u.role === 'student').map(u => u.id) || [];
        let studentsMeta: any[] = [];
        let gamificationData: any[] = []; // 🚀 مصفوفة لحفظ بيانات الأوسمة الحقيقية
        
        if (studentIds.length > 0) {
          // جلب بيانات الصفوف
          const { data: sData } = await supabase
            .from('students')
            .select('id, sections(name, classes(name))')
            .in('id', studentIds);
          studentsMeta = sData || [];

          // 🚀 جلب أوسمة الإنجازات (Gamification)
          const { data: gData } = await supabase
            .from('student_badges')
            .select('student_id, badges(name, image_url)')
            .in('student_id', studentIds);
          gamificationData = gData || [];
        }

        const teacherIds = usersData?.filter(u => u.role === 'teacher').map(u => u.id) || [];
        let teachersMeta: any[] = [];
        if (teacherIds.length > 0) {
          const { data: tData } = await supabase
            .from('teachers')
            .select('id, subjects(name)')
            .in('id', teacherIds);
          teachersMeta = tData || [];
        }

        const topicIds = topicsData.map(t => t.id);
        const { data: repliesData } = await supabase
          .from('forum_replies')
          .select('id, topic_id')
          .in('topic_id', topicIds);

        const formattedTopics: Topic[] = topicsData.map((t: any) => {
          const author = usersData?.find(u => u.id === t.author_id);
          const repliesCount = repliesData?.filter(r => r.topic_id === t.id).length || 0;
          
          let badgeText = 'مستخدم';
          let gBadges: GamificationBadge[] = []; // 🚀 مصفوفة أوسمة الكاتب

          if (author?.role === 'student') {
            const sMeta = studentsMeta.find(s => s.id === author.id);
            const section = Array.isArray(sMeta?.sections) ? sMeta?.sections[0] : sMeta?.sections;
            const cls = Array.isArray(section?.classes) ? section?.classes[0] : section?.classes;
            const className = cls?.name || '';
            const sectionName = section?.name || '';
            badgeText = className ? `طالب | ${className} - ${sectionName}` : 'طالب';

            // 🚀 ربط الأوسمة المكتسبة بالطالب
            gBadges = gamificationData
              .filter(g => g.student_id === author.id)
              .map(g => {
                const bInfo = Array.isArray(g.badges) ? g.badges[0] : g.badges;
                return { name: bInfo?.name, image_url: bInfo?.image_url };
              })
              .filter(b => b.name && b.image_url); // تأكد من وجود البيانات

          } else if (author?.role === 'teacher') {
            const tMeta = teachersMeta.find(tc => tc.id === author.id);
            const subject = Array.isArray(tMeta?.subjects) ? tMeta?.subjects[0] : tMeta?.subjects;
            badgeText = subject?.name ? `معلم ${subject.name}` : 'معلم';
          } else if (author?.role === 'admin' || author?.role === 'management') {
            badgeText = 'إدارة المدرسة 👑';
          }

          return {
            ...t,
            author_name: author?.full_name || 'مستخدم غير معروف',
            author_role: author?.role || 'student',
            author_avatar: author?.avatar_url || null,
            author_badge: badgeText,
            author_gamification_badges: gBadges, // 🚀 دمج الأوسمة مع الموضوع
            replies_count: repliesCount
          };
        });

        setTopics(formattedTopics);
      } else {
        setTopics([]); 
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
      
      await fetchTopicsAndCategory(); 
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
