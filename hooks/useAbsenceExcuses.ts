import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAbsenceExcuses() {
  const [loading, setLoading] = useState(false);

  // 1. وظيفة تقديم طلب عذر جديد
  const submitExcuse = useCallback(async (payload: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absence_excuses')
        .insert([payload])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. وظيفة الحذف الشامل (داتا بيز + كلاودينري) للمدير
  const deleteExcuseCompletely = useCallback(async (id: string, publicId?: string) => {
    try {
      // أ: الحذف من كلاودينري عبر الـ API المركزي الخاص بك (مع تمرير المصادقة)
      if (publicId) {
        const { data: { session } } = await supabase.auth.getSession();
        
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}` // 👈 الأمان الذي يتطلبه ملفك
          },
          body: JSON.stringify({ publicId, resourceType: 'image' }),
        });
      }

      // ب: الحذف من قاعدة البيانات
      const { error } = await supabase
        .from('absence_excuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  return { submitExcuse, deleteExcuseCompletely, loading };
}
