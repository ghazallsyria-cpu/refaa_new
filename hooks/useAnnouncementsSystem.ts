import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { normalizeString } from '@/lib/utils';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_role: string | null; // 'all', 'teacher', 'student', 'parent'
  created_at: string;
  author_id?: string;
  image_url?: string;
  users?: { full_name: string };
}

export function useAnnouncementsSystem() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async (authRole: string | null) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          target_role,
          image_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      // 🛡️ تطبيق جدار الرفعة الناري
      if (authRole !== 'admin' && authRole !== 'management') {
        if (authRole) {
          query = query.or(`target_role.eq.${authRole},target_role.eq.all,target_role.is.null`);
        } else {
          query = query.or(`target_role.eq.all,target_role.is.null`);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const normalizedData: Announcement[] = (data || []).map((a) => ({
        ...a,
        image_url: normalizeString(a.image_url)
      }));

      setAnnouncements(normalizedData);
      return normalizedData;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع في جلب الإعلانات';
      console.error('Error fetching announcements:', err);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 المحرك الجديد للحفظ المباشر
  const saveAnnouncement = useCallback(async (announcement: Partial<Announcement>, userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        title: announcement.title,
        content: announcement.content,
        target_role: announcement.target_role || 'all',
        image_url: announcement.image_url || null,
      };

      if (announcement.id) {
        payload.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id);
        
        if (error) throw error;
      } else {
        if (!userId) throw new Error('يرجى تسجيل الدخول كإداري أولاً');
        payload.author_id = userId; // ربط الإعلان بكاتبه
        const { error } = await supabase
          .from('announcements')
          .insert([payload]);
          
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setError(err.message || 'حدث خطأ أثناء الحفظ');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 المحرك الجديد للحذف المباشر
  const deleteAnnouncement = useCallback(async (id: string, imageUrl?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;

      if (imageUrl) {
        await deleteFromCloudinary(imageUrl);
      }
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      setError(err.message || 'حدث خطأ أثناء الحذف');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    announcements,
    loading,
    error,
    fetchAnnouncements,
    saveAnnouncement,
    deleteAnnouncement
  };
}
