import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useExamSeating() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 🚀 دالة 1: تجهيز اللجان (إنشاء 22 لجنة بضغطة زر)
  const initializeCommittees = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    setProgressMsg('جاري تهيئة اللجان الامتحانية...');
    try {
      // 1. مسح اللجان القديمة لنفس الفصل (سيقوم الـ CASCADE بحذف المراقبين والتوزيع المرتبط بها تلقائياً)
      await supabase.from('exam_committees')
        .delete()
        .eq('academic_year', academicYear)
        .eq('semester', semester);

      // 2. تجهيز 22 لجنة بسعة 14 طالب
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

  // 🚀 دالة 2: الفرز الأبجدي وتوزيع أرقام الجلوس واللجان
  const generateSeatingAndDistribute = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    try {
      // 1. جلب اللجان المتاحة لهذا الفصل
      setProgressMsg('جاري قراءة اللجان...');
      const { data: committees, error: commError } = await supabase.from('exam_committees')
        .select('id, name, capacity')
        .eq('academic_year', academicYear)
        .eq('semester', semester)
        .order('name', { ascending: true }); // لضمان الترتيب: لجنة 1، 2..

      if (commError || !committees || committees.length === 0) {
        throw new Error('لم يتم العثور على لجان! يرجى تهيئة اللجان أولاً.');
      }

      // 2. جلب جميع الطلاب مع صفوفهم وأسمائهم
      setProgressMsg('جاري سحب بيانات الطلاب من السيرفر...');
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          users!inner(full_name),
          sections!inner(
            classes!inner(level)
          )
        `);

      if (studentsError) throw studentsError;

      // 3. فصل الطلاب وتصفيتهم (عاشر وحادي عشر فقط)
      let grade10: any[] = [];
      let grade11: any[] = [];

      studentsData.forEach((s: any) => {
        const level = s.sections?.classes?.level;
        const studentObj = { id: s.id, fullName: s.users?.full_name || '' };
        
        if (level === 10) grade10.push(studentObj);
        else if (level === 11) grade11.push(studentObj);
      });

      // 4. الفرز الأبجدي الدقيق باللغة العربية
      setProgressMsg('جاري الفرز الأبجدي وتوليد أرقام الجلوس...');
      const sortArabic = (a: any, b: any) => a.fullName.localeCompare(b.fullName, 'ar');
      grade10.sort(sortArabic);
      grade11.sort(sortArabic);

      // توليد أرقام الجلوس (عاشر يبدأ 10001 ، حادي عشر يبدأ 11001)
      grade10 = grade10.map((s, index) => ({ ...s, seatNumber: `10${String(index + 1).padStart(3, '0')}` }));
      grade11 = grade11.map((s, index) => ({ ...s, seatNumber: `11${String(index + 1).padStart(3, '0')}` }));

      // 5. التوزيع المدمج (7 من العاشر + 7 من الحادي عشر لكل لجنة)
      setProgressMsg('جاري الدمج والتوزيع الذكي على اللجان...');
      const allocations: any[] = [];
      let g10Index = 0;
      let g11Index = 0;

      // المرور على اللجان
      for (const committee of committees) {
        let addedG10 = 0;
        let addedG11 = 0;

        // سحب 7 من العاشر
        while (addedG10 < 7 && g10Index < grade10.length) {
          allocations.push({
            student_id: grade10[g10Index].id,
            committee_id: committee.id,
            seat_number: grade10[g10Index].seatNumber,
            academic_year: academicYear,
            semester: semester
          });
          g10Index++;
          addedG10++;
        }

        // سحب 7 من الحادي عشر
        while (addedG11 < 7 && g11Index < grade11.length) {
          allocations.push({
            student_id: grade11[g11Index].id,
            committee_id: committee.id,
            seat_number: grade11[g11Index].seatNumber,
            academic_year: academicYear,
            semester: semester
          });
          g11Index++;
          addedG11++;
        }
      }

      // 6. التعامل مع الطلاب المتبقين (إذا زاد العدد عن الاستيعاب)
      // سيتم توزيعهم بالتساوي على اللجان المتاحة بالترتيب
      let remainingStudents = [...grade10.slice(g10Index), ...grade11.slice(g11Index)];
      let committeeIndex = 0;
      
      for (const student of remainingStudents) {
         if(committeeIndex >= committees.length) committeeIndex = 0; // العودة للجنة الأولى
         allocations.push({
            student_id: student.id,
            committee_id: committees[committeeIndex].id,
            seat_number: student.seatNumber,
            academic_year: academicYear,
            semester: semester
         });
         committeeIndex++;
      }

      // 7. الحفظ النهائي في قاعدة البيانات (مسح القديم ثم إدراج الجديد لتجنب التكرار)
      setProgressMsg('جاري حفظ التوزيعات في قاعدة البيانات...');
      await supabase.from('student_seat_allocations')
        .delete()
        .eq('academic_year', academicYear)
        .eq('semester', semester);

      // نقوم بتقسيم الإرسال (Chunking) لحماية السيرفر من الانهيار إذا كان العدد كبيراً
      const chunkSize = 100;
      for (let i = 0; i < allocations.length; i += chunkSize) {
        const chunk = allocations.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('student_seat_allocations').insert(chunk);
        if (insertError) throw insertError;
      }

      setProgressMsg('تم التوزيع بنجاح!');
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

  return { isLoading, progressMsg, initializeCommittees, generateSeatingAndDistribute };
}
