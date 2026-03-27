import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useReportsSystem() {
  const [loading, setLoading] = useState(false);

  const fetchReportsData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        studentsRes, 
        teachersRes, 
        classesRes, 
        attendanceRes,
        classDistributionRes,
        attemptsRes
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('daily_attendance_summary').select('daily_status, date').gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase.from('classes').select('level, sections(students(id))'),
        supabase.from('exam_attempts').select('score, exam:exams(subject:subjects(name))')
      ]);

      return {
        studentsCount: studentsRes.count || 0,
        teachersCount: teachersRes.count || 0,
        classesCount: classesRes.count || 0,
        attendanceData: attendanceRes.data || [],
        classDistribution: classDistributionRes.data || [],
        attemptsData: attemptsRes.data || []
      };
    } catch (error) {
      console.error('Error fetching reports data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchReportsData
  };
}
