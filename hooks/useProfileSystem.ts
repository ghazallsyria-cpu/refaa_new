import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; 

const withCache = async <T>(key: string, fetcher: () => Promise<T>, forceRefresh = false): Promise<T> => {
  if (!forceRefresh && profileCache.has(key)) {
    const cached = profileCache.get(key)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  }
  const data = await fetcher();
  profileCache.set(key, { data, timestamp: Date.now() }); 
  return data;
};

export function useProfileSystem() {
  const [loading, setLoading] = useState(false);

  // 1. جلب بيانات المعلم (بما فيها مساحته الإبداعية)
  const fetchTeacherProfile = useCallback(async (teacherId: string, forceRefresh = false) => {
    setLoading(true);
    try {
      return await withCache(`teacher_profile_${teacherId}`, async () => {
        const { data: teacher, error } = await supabase
          .from('teachers')
          .select(`
            *,
            users!teachers_id_fkey (full_name, email, phone, avatar_url, last_seen),
            department_heads (subject_id, stage_name, subjects(name)),
            teacher_sections (section:sections(name, classes(name)), subjects(name))
          `)
          .eq('id', teacherId)
          .single();

        if (error) throw error;

        const [ { count: examsCount }, { count: assignmentsCount } ] = await Promise.all([
          supabase.from('exams').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
          supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId)
        ]);

        return { ...teacher, stats: { exams: examsCount || 0, assignments: assignmentsCount || 0 } };
      }, forceRefresh);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. تحديث المساحة الإبداعية للمعلم (Themes, Bio, Links)
  const updateTeacherProfileSettings = useCallback(async (teacherId: string, newSettings: any) => {
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ profile_settings: newSettings })
        .eq('id', teacherId);

      if (error) throw error;
      profileCache.delete(`teacher_profile_${teacherId}`); // مسح الكاش ليتحدث فوراً
      return true;
    } catch (error) {
      console.error('Error updating profile settings:', error);
      return false;
    }
  }, []);

  // 3. جلب بيانات المدير
  const fetchAdminProfile = useCallback(async (userId: string, forceRefresh = false) => {
    setLoading(true);
    try {
      return await withCache(`admin_profile_${userId}`, async () => {
        const [ { data: admin }, { data: settings } ] = await Promise.all([
          supabase.from('users').select('*').eq('id', userId).single(),
          supabase.from('platform_settings').select('message, school_name, logo_url').limit(1).single()
        ]);
        return { admin, schoolSettings: settings };
      }, forceRefresh);
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. تحديث كلمة المدير
  const updateAdminVision = useCallback(async (newMessage: string) => {
    try {
      await supabase.from('platform_settings').update({ message: newMessage }).neq('id', '00000000-0000-0000-0000-000000000000'); 
      profileCache.clear(); 
      return true;
    } catch (error) {
      console.error('Error updating vision:', error);
      return false;
    }
  }, []);

  return { loading, fetchTeacherProfile, updateTeacherProfileSettings, fetchAdminProfile, updateAdminVision };
}
