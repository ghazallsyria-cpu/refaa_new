import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export type StudentPerformance = {
  student_id: string;
  full_name: string;
  section_name: string;
  exams_taken: number;
  exams_average: number;
  performance_status: 'excellent' | 'good' | 'warning' | 'danger';
};

export function useGradebook() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<StudentPerformance[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string; }[]>([]);

  const fetchGradebook = useCallback(async () => {
    if (!user || userRole !== 'teacher') return;
    setLoading(true);
    
    try {
      // 1. جلب صفوف المعلم
      const { data: teacherSecs } = await supabase
        .from('teacher_sections')
        .select('section:sections(id, name, classes(name))')
        .eq('teacher_id', user.id);

      // تم الإصلاح هنا: استخدام Type Guard صريح لإرضاء TypeScript أثناء الـ Build
      const fetchedSections = (teacherSecs || [])
        .map((ts: any) => {
          const s = ts.section;
          if (!s) return null;
          const className = Array.isArray(s.classes) ? s.classes[0]?.name : s.classes?.name;
          return { 
            id: String(s.id), 
            name: className ? `${className} - ${s.name}` : String(s.name) 
          };
        })
        .filter((item): item is { id: string; name: string } => item !== null);
      
      setSections(fetchedSections);

      const sectionIds = fetchedSections.map(s => s.id);
      if (sectionIds.length === 0) {
        setPerformanceData([]);
        setLoading(false);
        return;
      }

      // 2. جلب جميع الطلاب في هذه الصفوف
      const { data: students } = await supabase
        .from('students')
        .select('id, section_id, users(full_name)')
        .in('section_id', sectionIds);

      // 3. جلب جميع الاختبارات التي أنشأها هذا المعلم
      const { data: exams } = await supabase
        .from('exams')
        .select('id')
        .eq('teacher_id', user.id);
      
      const examIds = exams?.map(e => e.id) || [];

      // 4. جلب جميع محاولات الطلاب لهذه الاختبارات
      let attempts: any[] = [];
      if (examIds.length > 0) {
        const { data: att } = await supabase
          .from('exam_attempts')
          .select('student_id, score')
          .in('exam_id', examIds);
        attempts = att || [];
      }

      // 5. تجميع البيانات وحساب المتوسطات
      const aggregatedData: StudentPerformance[] = (students || []).map((student: any) => {
        const studentAttempts = attempts.filter(a => a.student_id === student.id);
        const examsTaken = studentAttempts.length;
        
        let average = 0;
        if (examsTaken > 0) {
          const totalScore = studentAttempts.reduce((sum, att) => sum + (att.score || 0), 0);
          average = Math.round(totalScore / examsTaken);
        }

        let status: 'excellent' | 'good' | 'warning' | 'danger' = 'danger';
        if (average >= 90) status = 'excellent';
        else if (average >= 75) status = 'good';
        else if (average >= 50) status = 'warning';

        const sectionInfo = fetchedSections.find(s => s.id === student.section_id);

        return {
          student_id: student.id,
          full_name: (student.users && Array.isArray(student.users)) 
            ? student.users[0]?.full_name 
            : (student.users?.full_name || 'طالب غير معروف'),
          section_name: sectionInfo?.name || 'غير محدد',
          exams_taken: examsTaken,
          exams_average: average,
          performance_status: status
        };
      });

      aggregatedData.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
      setPerformanceData(aggregatedData);

    } catch (error) {
      console.error('Error fetching gradebook:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchGradebook();
  }, [fetchGradebook]);

  return { loading, performanceData, sections, refetch: fetchGradebook };
}

