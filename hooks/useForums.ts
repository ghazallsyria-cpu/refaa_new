import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  target_classes: string[] | null;
  post_permission: 'all' | 'teachers_admin' | 'admin_only';
  reply_permission: 'all' | 'teachers_admin' | 'admin_only' | 'none';
  created_at: string;
  topics_count?: number;
}

export interface StructuredCategory extends ForumCategory {
  subcategories?: StructuredCategory[];
}

export function useForums() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [structuredCategories, setStructuredCategories] = useState<StructuredCategory[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoriesAndClasses = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب الأقسام مع عدد المواضيع
      const { data: catsData, error: catsError } = await supabase
        .from('forum_categories')
        .select('*, forum_topics(count)')
        .order('created_at', { ascending: true });

      if (catsError) throw catsError;

      // 2. جلب الصفوف المدرسية للفئة المستهدفة
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (classesError) throw classesError;

      const formattedCats = (catsData || []).map((cat: any) => ({
        ...cat,
        topics_count: cat.forum_topics?.[0]?.count || 0
      }));

      setCategories(formattedCats);
      setSchoolClasses(classesData || []);

      // 3. ترتيب الأقسام إلى رئيسية وفرعية
      const mains = formattedCats.filter((c: any) => !c.parent_id);
      const subs = formattedCats.filter((c: any) => c.parent_id);

      const structured = mains.map((main: any) => ({
        ...main,
        subcategories: subs.filter((sub: any) => sub.parent_id === main.id)
      }));

      setStructuredCategories(structured);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching forums data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // دالة إنشاء قسم جديد
  const createCategory = async (payload: Partial<ForumCategory>) => {
    try {
      const { error: insertError } = await supabase
        .from('forum_categories')
        .insert([payload]);

      if (insertError) throw insertError;
      
      await fetchCategoriesAndClasses(); 
      return { success: true };
    } catch (err: any) {
      console.error('Error creating category:', err);
      return { success: false, error: err.message };
    }
  };

  // دالة تحديث قسم موجود
  const updateCategory = async (id: string, payload: Partial<ForumCategory>) => {
    try {
      const { error: updateError } = await supabase
        .from('forum_categories')
        .update(payload)
        .eq('id', id);

      if (updateError) throw updateError;
      
      await fetchCategoriesAndClasses(); 
      return { success: true };
    } catch (err: any) {
      console.error('Error updating category:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    categories,
    structuredCategories,
    schoolClasses,
    loading,
    error,
    fetchCategoriesAndClasses,
    createCategory,
    updateCategory
  };
}
