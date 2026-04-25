import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminExcuses() {
  const [loading, setLoading] = useState(false);
  const [excuses, setExcuses] = useState<any[]>([]);

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

  // 🚀 المحرك السحري يستقبل الآن أمر التجاوز (overridePeriods)
  const approveExcuse = async (excuse: any, adminId: string, verifiedDates: string[], overridePeriods: boolean) => {
    setLoading(true);
    try {
      if (!verifiedDates || verifiedDates.length === 0) {
        throw new Error("لم يتم تحديد تواريخ لاعتمادها.");
      }

      const autoNote = overridePeriods 
        ? `تم مراجعة الطلب، واعتماد العذر الطبي وتحويل كافة سجلات الغياب إلى (مستأذن) للأيام: ${verifiedDates.join(' ، ')}.`
        : `تم مراجعة الطلب، واعتماد العذر الطبي للغياب الجزئي (حصص محددة) للأيام: ${verifiedDates.join(' ، ')}.`;

      // 1. تحديث حالة العذر
      const { error: updateError } = await supabase
        .from('absence_excuses')
        .update({ 
          status: 'approved', 
          reviewed_by: adminId,
          admin_note: autoNote 
        })
        .eq('id', excuse.id);

      if (updateError) throw updateError;

      // 2. تحديث سجلات الغياب (المنطق الجديد)
      let query = supabase
        .from('attendance_records')
        .update({ status: 'excused' }) 
        .eq('student_id', excuse.student_id)
        .in('date', verifiedDates) 
        .eq('status', 'absent'); 

      // 🚀 إذا كان الغياب جزئياً والإدارة لم تطلب التجاوز، نلتزم بحصص الطالب
      // أما إذا طلب التجاوز، سيقوم النظام بتحويل كل غيابات هذه الأيام لمستأذن متجاهلاً خطأ الطالب!
      if (!overridePeriods && excuse.duration_type === 'partial_day' && excuse.target_periods && excuse.target_periods.length > 0) {
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
