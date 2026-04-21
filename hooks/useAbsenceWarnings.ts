import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface StudentWarning {
  id: string;
  name: string;
  sectionId: string;
  className: string;
  absenceCount: number;
  stage: 'middle' | 'high' | 'unassigned'; // 🚀 الحقل الجديد
  warningLevel: 'warning_1' | 'warning_2' | 'warning_3' | 'dismissal';
  warningLabel: string;
}

export function useAbsenceWarnings() {
  const [warningsData, setWarningsData] = useState<StudentWarning[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWarnings = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: studentsRaw, error: studentsErr },
        { data: absencesRaw, error: absencesErr }
      ] = await Promise.all([
        supabase.from('students').select('id, sections(id, name, classes(name)), users(full_name)'),
        supabase.from('attendance_records').select('student_id').eq('status', 'absent')
      ]);

      if (studentsErr) throw studentsErr;
      if (absencesErr) throw absencesErr;

      const absenceMap: Record<string, number> = {};
      (absencesRaw || []).forEach(record => {
        const sid = record.student_id;
        if (sid) {
          absenceMap[sid] = (absenceMap[sid] || 0) + 1;
        }
      });

      const processed: StudentWarning[] = [];

      (studentsRaw || []).forEach((student: any) => {
        const count = absenceMap[student.id] || 0;

        if (count >= 25) {
          let level: StudentWarning['warningLevel'] = 'warning_1';
          let label = 'إنذار أول';

          if (count >= 100) { level = 'dismissal'; label = 'إشعار فصل'; }
          else if (count >= 75) { level = 'warning_3'; label = 'إنذار ثالث'; }
          else if (count >= 50) { level = 'warning_2'; label = 'إنذار ثاني'; }

          const secObj = Array.isArray(student.sections) ? student.sections[0] : student.sections;
          const classObj = Array.isArray(secObj?.classes) ? secObj?.classes[0] : secObj?.classes;
          const className = `${classObj?.name || ''} - ${secObj?.name || ''}`;
          
          // 🚀 منطق تحديد المرحلة بذكاء (دستور الرفعة)
          let stage: 'middle' | 'high' | 'unassigned' = 'unassigned';
          const cName = className.toLowerCase();
          if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(cName)) stage = 'middle';
          else if (/(عاشر|حادي|ثاني|10|11|12)/.test(cName)) stage = 'high';

          const userObj = Array.isArray(student.users) ? student.users[0] : student.users;

          processed.push({
            id: student.id,
            name: userObj?.full_name || 'طالب غير معروف',
            sectionId: secObj?.id || '',
            className: className,
            absenceCount: count,
            stage: stage, // تمرير المرحلة
            warningLevel: level,
            warningLabel: label
          });
        }
      });

      processed.sort((a, b) => b.absenceCount - a.absenceCount);
      setWarningsData(processed);

    } catch (err) {
      console.error('Error fetching absence warnings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { warningsData, loading, fetchWarnings };
}
