import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// نظام كاش بسيط لمنع تكرار التحميل عند التنقل
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

  // 1. جلب السيرة الذاتية الأكاديمية للمعلم
  const fetchTeacherProfile = useCallback(async (teacherId: string) => {
    setLoading(true);
    try {
      return await withCache(`teacher_profile_${teacherId}`, async () => {
        // جلب بيانات المعلم، مناصبه، فصوله، ورئيس قسمه إن وجد
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

        // جلب إحصائيات سريعة لإنتاجية المعلم (الواجبات والاختبارات التي أنشأها)
        const [ { count: examsCount }, { count: assignmentsCount } ] = await Promise.all([
          supabase.from('exams').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
          supabase.from('assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId)
        ]);

        return { ...teacher, stats: { exams: examsCount || 0, assignments: assignmentsCount || 0 } };
      });
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. جلب صفحة مدير المدرسة ورؤيته
  const fetchAdminProfile = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      return await withCache(`admin_profile_${userId}`, async () => {
        const [ { data: admin }, { data: settings } ] = await Promise.all([
          supabase.from('users').select('*').eq('id', userId).single(),
          // نستخدم platform_settings لتخزين كلمة المدير ورؤية المدرسة!
          supabase.from('platform_settings').select('message, school_name, logo_url').limit(1).single()
        ]);

        return { admin, schoolSettings: settings };
      });
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. تحديث كلمة/فلسفة المدير
  const updateAdminVision = useCallback(async (newMessage: string) => {
    try {
      await supabase.from('platform_settings').update({ message: newMessage }).neq('id', '00000000-0000-0000-0000-000000000000'); // يحدّث الصف الموجود
      profileCache.clear(); // مسح الكاش ليظهر التحديث
      return true;
    } catch (error) {
      console.error('Error updating vision:', error);
      return false;
    }
  }, []);

  return { loading, fetchTeacherProfile, fetchAdminProfile, updateAdminVision };
}
