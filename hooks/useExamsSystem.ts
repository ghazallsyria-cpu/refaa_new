import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { deleteFromCloudinary } from '@/lib/cloudinary'; // تأكد من وجود هذه الدالة

export function useExamsSystem() {
  const { user, userRole } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ... (الدوال الأخرى تبقى كما هي)

  // دالة الحذف الذكي: تحذف الصور من Cloudinary ثم تحذف الاختبار من قاعدة البيانات
  const deleteExamWithMedia = useCallback(async (examId: string) => {
    try {
      // 1. جلب كافة الأسئلة التابعة للاختبار للحصول على روابط الصور
      const { data: questions } = await supabase
        .from('questions')
        .select('media_url')
        .eq('exam_id', examId);

      // 2. حذف كل صورة من Cloudinary إذا وجدت
      if (questions) {
        for (const q of questions) {
          if (q.media_url) {
            await deleteFromCloudinary(q.media_url);
          }
        }
      }

      // 3. حذف الاختبار (سيؤدي حذف الاختبار لحذف الأسئلة والخيارات تلقائياً بسبب Cascade)
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;

      // 4. تحديث القائمة
      setData(prev => prev.filter(e => e.id !== examId));
      return { success: true };
    } catch (err) {
      console.error('فشل حذف الاختبار والملفات:', err);
      throw err;
    }
  }, []);

  return {
    data,
    loading,
    deleteExamWithMedia,
    // ... باقي الدوال
    fetchExamForStudent: async (id: string) => { /* جلب بيانات الاختبار للطالب */ },
    fetchStudentExamResult: async (eid: string, sid: string) => { /* جلب النتيجة للمراجعة */ }
  };
}

