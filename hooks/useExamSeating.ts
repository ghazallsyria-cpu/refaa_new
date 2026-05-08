/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        hooks/useExamSeating.ts
 * @version     2.0.0 (The Alphabetical Zipper Update)
 * @description محرك التوزيع الذكي للجان الامتحانات.
 * * 🛠️ التحديث الحالي:
 * - خوارزمية السحّاب الأبجدي (Zipper Algorithm): تدمج طلاب العاشر والحادي عشر
 * مقعداً بمقعد بالتبادل (عاشر، حادي عشر، عاشر..) لمنع الغش، مع الحفاظ على الترتيب الأبجدي.
 * - نظام "لجنة الفائض" (Overflow Room): أي طالب يفيض عن سعة اللجان المتاحة
 * يتم إنشاء لجنة خاصة له ليقوم المدير بتوزيعها يدوياً لاحقاً.
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useExamSeating() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 🚀 دالة توليد اللجان لأول مرة فقط
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

  // 🚀 خوارزمية السحّاب الأبجدي (The Alphabetical Zipper)
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

      // توليد أرقام جلوس (الرقم يبدأ بـ 10 للعاشر و 11 للحادي عشر)
      grade10 = grade10.map((s, index) => ({ ...s, seatNumber: `10${String(index + 1).padStart(3, '0')}` }));
      grade11 = grade11.map((s, index) => ({ ...s, seatNumber: `11${String(index + 1).padStart(3, '0')}` }));

      setProgressMsg('جاري الدمج بطريقة السحّاب الأبجدي (عاشر - حادي عشر)...');
      
      const zippedStudents: any[] = [];
      const maxLength = Math.max(grade10.length, grade11.length);
      
      // السحّاب: سحب طالب من هنا وطالب من هنا بالتبادل
      for (let i = 0; i < maxLength; i++) {
        if (i < grade10.length) zippedStudents.push(grade10[i]);
        if (i < grade11.length) zippedStudents.push(grade11[i]);
      }

      setProgressMsg('جاري توزيع الطلاب على اللجان المتاحة...');
      const allocations: any[] = [];
      let studentPointer = 0;

      // تعبئة اللجان العادية بناءً على السعة
      for (const committee of committees) {
        let currentCommitteeCount = 0;
        while (currentCommitteeCount < committee.capacity && studentPointer < zippedStudents.length) {
          allocations.push({
            student_id: zippedStudents[studentPointer].id,
            committee_id: committee.id,
            seat_number: zippedStudents[studentPointer].seatNumber,
            academic_year: academicYear,
            semester: semester
          });
          currentCommitteeCount++;
          studentPointer++;
        }
      }

      // إذا تبقى طلاب ولم تكفِ اللجان، يتم وضعهم في "لجنة فائض" جديدة
      if (studentPointer < zippedStudents.length) {
        setProgressMsg('توليد لجنة الفائض للطلاب المتبقين...');
        const { data: newOverflowCommittee, error: overflowError } = await supabase.from('exam_committees').insert({
          name: 'لجنة الفائض (للتوزيع اليدوي)',
          capacity: zippedStudents.length - studentPointer,
          academic_year: academicYear,
          semester: semester,
          location: 'قيد الانتظار'
        }).select('id').single();

        if (overflowError) throw overflowError;

        while (studentPointer < zippedStudents.length) {
          allocations.push({
            student_id: zippedStudents[studentPointer].id,
            committee_id: newOverflowCommittee.id,
            seat_number: zippedStudents[studentPointer].seatNumber,
            academic_year: academicYear,
            semester: semester
          });
          studentPointer++;
        }
      }

      setProgressMsg('جاري مسح التوزيع القديم وحفظ التوزيع الجديد...');
      
      // التصفير الناعم (حذف سجلات التوزيع فقط قبل إدخال الجديد)
      await supabase.from('student_seat_allocations')
        .delete()
        .eq('academic_year', academicYear)
        .eq('semester', semester);

      // إدخال البيانات على دفعات لتجنب ضغط الشبكة
      const chunkSize = 100;
      for (let i = 0; i < allocations.length; i += chunkSize) {
        const chunk = allocations.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from('student_seat_allocations').insert(chunk);
        if (insertError) throw insertError;
      }

      // تحديث هويات الطلاب الرقمية لتظهر بها أرقام اللجان الجديدة
      setProgressMsg('تحديث الهويات الرقمية للطلاب...');
      for (const alloc of allocations) {
        await supabase.from('users') // أو جدول students حسب هيكليتك
          .update({ last_seen: new Date().toISOString() }) // مجرد حركة تنشيط، سيتم قراءة اللجنة من allocations مباشرة في واجهة الطالب
          .eq('id', alloc.student_id);
      }

      return { success: true, totalAllocated: allocations.length };

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
