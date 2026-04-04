'use client';

import { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; 

// تعريف أنواع البيانات (Types)
export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string; 
  color_theme: string;
  points: number;
  created_at: string;
}

export interface StudentBadge {
  id: string;
  badge_id: string;
  student_id: string;
  teacher_id: string;
  reason: string | null;
  granted_at: string;
  badge?: Badge; 
  teacher_name?: string; 
}

export function useBadgesSystem() {
  const supabase = createClientComponentClient();
  
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [studentBadges, setStudentBadges] = useState<StudentBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // --- دوال العرض والجلب العامة ---
  // ==========================================

  // 1. جلب قائمة الأوسمة المتاحة (يستخدمها المدير للعرض، والمعلم للاختيار)
  const fetchAvailableBadges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('badges')
        .select('*')
        .order('points', { ascending: false });

      if (supabaseError) throw supabaseError;
      setAvailableBadges(data || []);
    } catch (err: any) {
      console.error('Error fetching badges:', err);
      setError(err.message || 'حدث خطأ أثناء جلب الأوسمة المتاحة');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. جلب الأوسمة الخاصة بطالب معين (يستخدمها الطالب في لوحته، أو المعلم في ملف الطالب)
  const fetchStudentBadges = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('student_badges')
        .select(`
          *,
          badge:badges (*)
        `)
        .eq('student_id', studentId)
        .order('granted_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      
      setStudentBadges(data || []);
      return data;
    } catch (err: any) {
      console.error('Error fetching student badges:', err);
      setError(err.message || 'حدث خطأ أثناء جلب أوسمة الطالب');
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ==========================================
  // --- دوال المعلم (منح وسحب الأوسمة) ---
  // ==========================================

  // 3. منح وسام لطالب
  const grantBadge = async (studentId: string, teacherId: string, badgeId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('student_badges')
        .insert([
          {
            student_id: studentId,
            teacher_id: teacherId,
            badge_id: badgeId,
            reason: reason || null,
          }
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;
      return { success: true, data };
    } catch (err: any) {
      console.error('Error granting badge:', err);
      setError(err.message || 'حدث خطأ أثناء منح الوسام');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 4. التراجع عن وسام (في حال أخطأ المعلم)
  const revokeBadge = async (studentBadgeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: supabaseError } = await supabase
        .from('student_badges')
        .delete()
        .eq('id', studentBadgeId);

      if (supabaseError) throw supabaseError;
      
      setStudentBadges(prev => prev.filter(b => b.id !== studentBadgeId));
      return { success: true };
    } catch (err: any) {
      console.error('Error revoking badge:', err);
      setError(err.message || 'حدث خطأ أثناء سحب الوسام');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // --- دوال المدير (إدارة كاتالوج الأوسمة) ---
  // ==========================================

  // 5. إضافة وسام جديد (للمدير)
  const createBadge = async (badgeData: Partial<Badge>) => {
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.from('badges').insert([badgeData]);
      if (supabaseError) throw supabaseError;
      await fetchAvailableBadges(); // تحديث القائمة بعد الإضافة
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 6. تحديث بيانات وسام (للمدير)
  const updateBadge = async (id: string, badgeData: Partial<Badge>) => {
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.from('badges').update(badgeData).eq('id', id);
      if (supabaseError) throw supabaseError;
      await fetchAvailableBadges(); // تحديث القائمة بعد التعديل
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // 7. حذف وسام نهائياً من الكاتالوج (للمدير)
  const deleteAdminBadge = async (id: string) => {
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.from('badges').delete().eq('id', id);
      if (supabaseError) throw supabaseError;
      await fetchAvailableBadges(); // تحديث القائمة بعد الحذف
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    availableBadges,
    studentBadges,
    loading,
    error,
    fetchAvailableBadges,
    fetchStudentBadges,
    grantBadge,
    revokeBadge,
    createBadge,
    updateBadge,
    deleteAdminBadge
  };
}
