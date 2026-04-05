import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// تعريف أنواع البيانات (Types)
export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  target_level: number[] | null; // 🚀 التحديث هنا: أصبح مصفوفة أرقام
  icon: string | null;
  topics_count?: number;
}

export interface StructuredCategory extends ForumCategory {
  subcategories?: StructuredCategory[]; // لدعم الهيكلة الشجرية
}

export function useForums() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [structuredCategories, setStructuredCategories] = useState<StructuredCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚀 دالة جلب الأقسام وبناء الهيكلة الشجرية
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('forum_categories')
        .select(`
          id, name, description, parent_id, target_level, icon,
          forum_topics (count)
        `)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        // تنسيق عدد المواضيع
        const formattedData: ForumCategory[] = data.map((cat: any) => ({
          ...cat,
          topics_count: cat.forum_topics?.[0]?.count || 0
        }));

        setCategories(formattedData);

        // 🧠 بناء الهيكلية الشجرية (Main & Subcategories)
        const mainCategories: StructuredCategory[] = formattedData.filter(c => !c.parent_id);
        const subCategories: StructuredCategory[] = formattedData.filter(c => c.parent_id);

        mainCategories.forEach(main => {
          main.subcategories = subCategories.filter(sub => sub.parent_id === main.id);
        });

        // حماية: إذا كان هناك قسم فرعي يتيم (تم حذف أبيه)، نظهره كقسم رئيسي
        const orphanedSubs = subCategories.filter(sub => !mainCategories.some(main => main.id === sub.parent_id));
        
        setStructuredCategories([...mainCategories, ...orphanedSubs]);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 دالة إنشاء قسم جديد
  const createCategory = async (payload: Partial<ForumCategory>) => {
    try {
      const { error: insertError } = await supabase
        .from('forum_categories')
        .insert([payload]);

      if (insertError) throw insertError;
      
      // تحديث البيانات فوراً بعد الإضافة
      await fetchCategories(); 
      return { success: true };
    } catch (err: any) {
      console.error('Error creating category:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    categories,
    structuredCategories,
    loading,
    error,
    fetchCategories,
    createCategory
  };
}
