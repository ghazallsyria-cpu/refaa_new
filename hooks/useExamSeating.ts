import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useExamSeating() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 🚀 دالة توليد اللجان لأول مرة فقط (بدون حذف المدخلات السابقة)
  const generateDefaultCommittees = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    setProgressMsg('جاري بناء اللجان الافتراضية...');
    try {
      const newCommittees = Array.from({ length: 22 }).map((_, i) => ({
        name: `لجنة ${i + 1}`,
        capacity: 14,
        academic_year: academicYear,
        semester: semester,
      }));

      const { error } = await supabase.from('exam_committees').insert(newCommittees);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error initializing committees:', error);
      alert('حدث خطأ أثناء بناء اللجان: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  // 🚀 الفرز والتوزيع (يتعامل فقط مع أرقام الجلوس ولا يمسح اللجان أو المراقبين)
  const generateSeatingAndDistribute = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    try {
      setProgressMsg('جاري قراءة اللجان المتاحة...');
      const { data: committees, error: commError } = await supabase.from('exam_committees')
        .select('id, name, capacity')
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .order('name', { ascending: true });

      if (commError || !committees || committees.length === 0) {
        throw new Error('لم يتم العثور على لجان! يرجى إنشاء اللجان أولاً.');
      }

      setProgressMsg('جاري سحب بيانات الطلاب من السيرفر...');
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`id, users!inner(full_name), sections!inner(classes!inner(level))`);

      if (studentsError) throw studentsError;

      let grade10: any[] = [];
      let grade11: any[] = [];

      studentsData.forEach((s: any) => {
        const level = s.sections?.classes?.level;
        const studentObj = { id: s.id, fullName: s.users?.full_name || '' };
        if (level === 10) grade10.push(studentObj);
        else if (level === 11) grade11.push(studentObj);
      });

      setProgressMsg('جاري الفرز الأبجدي وتوليد أرقام الجلوس...');
      const sortArabic = (a: any, b: any) => a.fullName.localeCompare(b.fullName, 'ar');
      grade10.sort(sortArabic);
      grade11.sort(sortArabic);

      grade10 = grade10.map((s, index) => ({ ...s, seatNumber: `10${String(index + 1).padStart(3, '0')}` }));
      grade11 = grade11.map((s, index) => ({ ...s, seatNumber: `11${String(index + 1).padStart(3, '0')}` }));

      setProgressMsg('جاري الدمج والتوزيع الذكي على اللجان...');
      const allocations: any[] = [];
      let g10Index = 0;
      let g11Index = 0;

      for (const committee of committees) {
        let addedG10 = 0;
        let addedG11 = 0;
        const halfCapacity = Math.floor(committee.capacity / 2);

        while (addedG10 < halfCapacity && g10Index < grade10.length) {
          allocations.push({ student_id: grade10[g10Index].id, committee_id: committee.id, seat_number: grade10[g10Index].seatNumber, academic_year: academicYear, semester: semester });
          g10Index++; addedG10++;
        }
        while (addedG11 < halfCapacity && g11Index < grade11.length) {
          allocations.push({ student_id: grade11[g11Index].id, committee_id: committee.id, seat_number: grade11[g11Index].seatNumber, academic_year: academicYear, semester: semester });
          g11Index++; addedG11++;
        }
      }

      let remainingStudents = [...grade10.slice(g10Index), ...grade11.slice(g11Index)];
      let committeeIndex = 0;
      
      for (const student of remainingStudents) {
         if(committeeIndex >= committees.length) committeeIndex = 0;
         allocations.push({ student_id: student.id, committee_id: committees[committeeIndex].id, seat_number: student.seatNumber, academic_year: academicYear, semester: semester });
         committeeIndex++;
      }

      setProgressMsg('جاري حفظ التوزيعات في قاعدة البيانات...');
      // نحذف التوزيعات القديمة (أرقام الجلوس) فقط، وليس اللجان!
      await supabase.from('student_seat_allocations')
        .delete()
        .eq('academic_year', academicYear)
        .eq('semester', semester);

      const chunkSize = 100;
      for (let i = 0; i < allocations.length; i += chunkSize) {
        const chunk = allocations.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('student_seat_allocations').insert(chunk);
        if (insertError) throw insertError;
      }

      return { success: true, totalAllocated: allocations.length, totalCommittees: committees.length };

    } catch (error: any) {
      console.error('Error distributing students:', error);
      alert('فشل التوزيع: ' + error.message);
      return { success: false };
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgressMsg(''), 2000);
    }
  }, []);

  return { isLoading, progressMsg, generateDefaultCommittees, generateSeatingAndDistribute };
}
