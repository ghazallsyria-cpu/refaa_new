import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
// 🚀 نراوغ TypeScript: نستورد النوع القديم ونضيف عليه الشعار
import { PlatformSettings as OriginalPlatformSettings } from '@/types'; 

export interface PlatformSettings extends OriginalPlatformSettings {
  logo_url?: string; // 🚀 أضفنا الشعار هنا ليتعرف عليه النظام
}

export interface ProfileSettings {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  zoom_link: string;
  avatar_url?: string;
}

export function useSettingsSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<ProfileSettings | null> => {
    if (!user) return null;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email, phone, role, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;

      let zoomLink = '';
      if (userData.role === 'teacher') {
        let teacherData = null;
        const { data: t1 } = await supabase.from('teachers').select('zoom_link').eq('user_id', user.id).maybeSingle();
        if (t1) teacherData = t1;
        else {
          const { data: t2 } = await supabase.from('teachers').select('zoom_link').eq('id', user.id).maybeSingle();
          if (t2) teacherData = t2;
        }

        if (teacherData) {
          zoomLink = teacherData.zoom_link || '';
        }
      }

      return {
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || '',
        zoom_link: zoomLink,
        avatar_url: userData.avatar_url || '' 
      } as ProfileSettings;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching profile';
      console.error('Error fetching profile:', err);
      setError(errorMessage);
      return null;
    }
  }, [user]);

  const fetchPlatformSettings = useCallback(async (): Promise<PlatformSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 

      if (data) {
        return {
          id: data.id,
          is_open: data.is_open,
          open_date: data.open_date ? new Date(data.open_date).toISOString().slice(0, 16) : '',
          close_date: data.close_date ? new Date(data.close_date).toISOString().slice(0, 16) : '',
          message: data.message || 'المنصة مغلقة حاليا للصيانة',
          school_name: data.school_name || 'مدرسة الرفعة النموذجية',
          academic_year: data.academic_year || '2025 - 2026',
          semester: data.semester || 'الفصل الدراسي الأول',
          address: data.address || 'شارع الملك فهد، حي الياسمين، الرياض',
          phone: data.phone || '0112345678',
          email: data.email || 'info@alrifaa.edu',
          logo_url: data.logo_url || '' // 🚀 هنا ساعي البريد يستلم الشعار من القاعدة ليعرضه لك
        } as PlatformSettings;
      }
      return null;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching platform settings';
      console.error('Error fetching platform settings:', err);
      setError(errorMessage);
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (profile: ProfileSettings): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    setLoading(true);
    try {
      const response = await fetch('/api/settings/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...profile
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating profile';
      console.error('Error updating profile:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePlatformSettings = useCallback(async (settings: Partial<PlatformSettings>): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    setLoading(true);
    try {
      // 🚀 هنا ساعي البريد يأخذ الإعدادات (وبداخلها الشعار) ويرسلها للـ API الذي أصلحناه
      const response = await fetch('/api/settings/update-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          settings
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update platform settings');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating platform settings';
      console.error('Error updating platform settings:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePassword = useCallback(async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  }, []);

  return {
    loading,
    error,
    fetchProfile,
    fetchPlatformSettings,
    updateProfile,
    updatePlatformSettings,
    updatePassword
  };
}
