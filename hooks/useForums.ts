import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 أضفنا واجهة بيانات الصفوف
export interface SchoolClass {
  id: string;
  name: string;
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  target_classes: string[] | null; // 🚀 أصبح يستقبل UUIDs للصفوف
  icon: string | null;
  topics_count?: number;
}

export interface StructuredCategory extends ForumCategory {
  subcategories?: StructuredCategory[];
}

export function useForums() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [structuredCategories, setStructuredCategories] = useState<StructuredCategory[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]); // 🚀 حالة حفظ الصفوف الحقيقية
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoriesAndClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. جلب الصفوف الحقيقية من المدرسة
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');
        
      if (classesError) throw classesError;
      if (classesData) setSchoolClasses(classesData);

      // 2. جلب أقسام المنتدى
      const { data, error: fetchError } = await supabase
        .from('forum_categories')
        .select(`
          id, name, description, parent_id, target_classes, icon,
          forum_topics (count)
        `)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        const formattedData: ForumCategory[] = data.map((cat: any) => ({
          ...cat,
          topics_count: cat.forum_topics?.[0]?.count || 0
        }));

        setCategories(formattedData);

        const mainCategories: StructuredCategory[] = formattedData.filter(c => !c.parent_id);
        const subCategories: StructuredCategory[] = formattedData.filter(c => c.parent_id);

        mainCategories.forEach(main => {
          main.subcategories = subCategories.filter(sub => sub.parent_id === main.id);
        });

        const orphanedSubs = subCategories.filter(sub => !mainCategories.some(main => main.id === sub.parent_id));
        setStructuredCategories([...mainCategories, ...orphanedSubs]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    categories,
    structuredCategories,
    schoolClasses, // 🚀 تصدير الصفوف للواجهة
    loading,
    error,
    fetchCategoriesAndClasses,
    createCategory
  };
}
