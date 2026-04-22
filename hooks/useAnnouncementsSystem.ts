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

      // 🛡️ تطبيق جدار الرفعة الناري (مع التوافق مع الإعلانات القديمة التي لا تحتوي على فئة)
      if (authRole !== 'admin' && authRole !== 'management') {
        if (authRole) {
          // 🚀 الإصلاح: جلب الإعلانات المخصصة، أو للجميع، أو القديمة (null)
          query = query.or(`target_role.eq.${authRole},target_role.eq.all,target_role.is.null`);
        } else {
          // للزوار غير المعروفين
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

  const saveAnnouncement = useCallback(async (announcement: Partial<Announcement>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/announcements/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...announcement,
          // إذا لم يحدد الإداري فئة، نعتبرها للجميع افتراضياً
          target_role: announcement.target_role || 'all' 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save announcement');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      console.error('Error saving announcement:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id: string, imageUrl?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/announcements/delete?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete announcement');

      if (imageUrl) {
        await deleteFromCloudinary(imageUrl);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف';
      console.error('Error deleting announcement:', err);
      setError(errorMessage);
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
