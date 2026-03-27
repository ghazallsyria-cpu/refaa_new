import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export interface PlatformSettings {
  id: string;
  is_open: boolean;
  open_date: string;
  close_date: string;
  message: string;
  school_name: string;
  academic_year: string;
  semester: string;
  address: string;
  phone: string;
  email: string;
}

export interface ProfileSettings {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  zoom_link: string;
}

export function useSettingsSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return null;
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, email, phone, role')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;

      let zoomLink = '';
      if (userData.role === 'teacher') {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('zoom_link')
          .eq('id', user.id)
          .single();
        if (teacherData) {
          zoomLink = teacherData.zoom_link || '';
        }
      }

      return {
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || '',
        zoom_link: zoomLink
      } as ProfileSettings;
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
      return null;
    }
  }, [user]);

  const fetchPlatformSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

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
          email: data.email || 'info@alrifaa.edu'
        } as PlatformSettings;
      }
      return null;
    } catch (err: any) {
      console.error('Error fetching platform settings:', err);
      setError(err.message);
      return null;
    }
  }, []);

  const updateProfile = async (profile: ProfileSettings) => {
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
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePlatformSettings = async (settings: Partial<PlatformSettings>) => {
    if (!user) throw new Error('User not authenticated');
    setLoading(true);
    try {
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
    } catch (err: any) {
      console.error('Error updating platform settings:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  };

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
