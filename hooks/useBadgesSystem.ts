import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  color_theme: string;
  points: number;
  created_at: string;
}

export interface GrantedBadge {
  id: string;
  student_id: string;
  badge_id: string;
  granted_by: string;
  reason: string | null;
  granted_at: string;
  badge?: Badge;
}

export function useBadgesSystem() {
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);

  // 1️⃣ جلب جميع الأوسمة المتاحة في النظام (الكاتالوج)
  const fetchAvailableBadges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAvailableBadges(data || []);
    } catch (error) {
      console.error('Error fetching available badges:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2️⃣ إنشاء وسام جديد (خاص بالمدير)
  const createBadge = async (badgeData: Partial<Badge>) => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .insert([badgeData])
        .select()
        .single();
        
      if (error) throw error;
      
      // تحديث الحالة محلياً فوراً
      setAvailableBadges(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 3️⃣ تعديل وسام موجود (خاص بالمدير)
  const updateBadge = async (id: string, updates: Partial<Badge>) => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // تحديث الحالة محلياً
      setAvailableBadges(prev => prev.map(b => b.id === id ? data : b));
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 4️⃣ حذف وسام نهائياً من الكاتالوج (خاص بالمدير)
  const deleteAdminBadge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setAvailableBadges(prev => prev.filter(b => b.id !== id));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 5️⃣ 🚀 منح وسام لطالب أو معلم (التتويج)
  const grantBadge = async (recipientId: string, granterId: string, badgeId: string, reason?: string) => {
    try {
      const { data, error } = await supabase
        .from('student_badges')
        .insert([{
          student_id: recipientId,
          badge_id: badgeId,
          granted_by: granterId,
          reason: reason || null
        }])
        .select()
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // 6️⃣ 🚀 سحب أو إلغاء وسام تم منحه مسبقاً (الحذف من ملف الطالب)
  const revokeBadge = async (studentBadgeId: string) => {
    try {
      const { error } = await supabase
        .from('student_badges')
        .delete()
        .eq('id', studentBadgeId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error revoking badge:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    availableBadges,
    loading,
    fetchAvailableBadges,
    createBadge,
    updateBadge,
    deleteAdminBadge,
    grantBadge,
    revokeBadge // 👈 تأكدنا من إرجاع هذه الدالة ليتم استخدامها في الصفحات
  };
}
