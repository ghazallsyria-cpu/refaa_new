import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export function useGradebook() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const fetchGradebook = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // 1. جلب الصفوف والمواد المسندة للمعلم
      const { data: tSecs } = await supabase.from('teacher_sections').select('section:sections(id, name, classes(name))').eq('teacher_id', user.id);
      const fetchedSections = (tSecs || []).map((ts: any) => ({
        id: ts.section?.id,
        name: `${ts.section?.classes?.name || ''} - ${ts.section?.name || ''}`
      })).filter(s => s.id);
      setSections(fetchedSections);

      // 2. جلب الطلاب ونتائجهم
      const sectionIds = fetchedSections.map(s => s.id);
      if (sectionIds.length === 0) return;

      const { data: students } = await supabase.from('students').select('id, section_id, users(full_name)').in('section_id', sectionIds);
      const { data: attempts } = await supabase.from('exam_attempts').select('student_id, score').in('exam_id', 
        (await supabase.from('exams').select('id').eq('teacher_id', user.id)).data?.map(e => e.id) || []
      );

      // 3. تجميع البيانات
      const result = (students || []).map((s: any) => {
        const sAttempts = (attempts || []).filter(a => a.student_id === s.id);
        const avg = sAttempts.length > 0 ? Math.round(sAttempts.reduce((acc, curr) => acc + curr.score, 0) / sAttempts.length) : 0;
        return {
          id: s.id,
          name: s.users?.full_name || 'طالب غير معروف',
          section: fetchedSections.find(sec => sec.id === s.section_id)?.name || 'غير محدد',
          average: avg,
          status: avg >= 90 ? 'ممتاز' : avg >= 75 ? 'جيد' : avg >= 50 ? 'مقبول' : 'ضعيف'
        };
      });
      setData(result);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchGradebook(); }, [fetchGradebook]);
  return { loading, data, sections };
}

