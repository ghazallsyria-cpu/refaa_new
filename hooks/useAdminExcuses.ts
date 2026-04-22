import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminExcuses() {
  const [loading, setLoading] = useState(false);
  const [excuses, setExcuses] = useState<any[]>([]);

  // 1. جلب الأعذار حسب الحالة (قيد المراجعة، مقبولة، مرفوضة)
  const fetchExcuses = useCallback(async (statusFilter: string = 'pending') => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absence_excuses')
        .select(`
          *,
          students!absence_excuses_student_id_fkey(
            id, national_id,
            users!students_id_fkey(full_name, avatar_url),
            sections(name, classes(name))
          ),
          users!absence_excuses_submitted_by_fkey(full_name, role)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExcuses(data || []);
    } catch (error: any) {
      console.error('Error fetching excuses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. المحرك السحري: اعتماد العذر وتعديل الغياب
  const approveExcuse = async (excuse: any, adminId: string) => {
    setLoading(true);
    try {
      // أ: تحديث حالة الطلب إلى "مقبول"
      const { error: updateError } = await supabase
        .from('absence_excuses')
        .update({ status: 'approved', reviewed_by: adminId })
        .eq('id', excuse.id);

      if (updateError) throw updateError;

      // ب: البحث والتعديل في سجلات الغياب الأصلية
      let query = supabase
        .from('attendance_records')
        .update({ status: 'excused' }) // تحويل الحالة إلى مستأذن
        .eq('student_id', excuse.student_id)
        .eq('date', excuse.excuse_date)
        .eq('status', 'absent'); // نعدل فقط الحصص التي سُجلت كغياب (لا نلمس الحضور)

      // ج: إذا كان الغياب جزئياً، نعدل فقط الحصص المحددة
      if (excuse.duration_type === 'partial_day' && excuse.target_periods && excuse.target_periods.length > 0) {
        query = query.in('period', excuse.target_periods);
      }

      const { error: recordsError } = await query;
      if (recordsError) throw recordsError;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 3. رفض العذر
  const rejectExcuse = async (excuseId: string, adminNote: string, adminId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('absence_excuses')
        .update({ status: 'rejected', admin_note: adminNote, reviewed_by: adminId })
        .eq('id', excuseId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { excuses, loading, fetchExcuses, approveExcuse, rejectExcuse };
}
