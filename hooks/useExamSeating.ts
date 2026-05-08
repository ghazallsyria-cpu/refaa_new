/**
 * ============================================================================
 * 🏗️ التوثيق الهندسي (Engineering Documentation)
 * ============================================================================
 * @file        hooks/useExamSeating.ts
 * @version     2.1.0 (The Alphabetical Sanitizer Update)
 * @description محرك التوزيع الذكي للجان الامتحانات (السحّاب الأبجدي).
 * ============================================================================
 */

'use client';

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

  // 🚀 خوارزمية السحّاب الأبجدي والتطهير (The Alphabetical Zipper & Sanitizer)
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

      setProgressMsg('جاري تطهير الأسماء والفرز الأبجدي...');
      
      // 🛡️ فلتر تطهير الأسماء لضمان ترتيب أبجدي صارم
      const cleanNameForSort = (name: string) => {
        if (!name) return '';
        return name
          .replace(/^[\s\.\-\_]+/, '') // مسح أي مسافات أو نقاط في بداية الاسم
          .replace(/[أإآ]/g, 'ا')      // توحيد الهمزات لضمان الترتيب الدقيق
          .trim();
      };

      const sortArabic = (a: any, b: any) => {
        const nameA = cleanNameForSort(a.fullName);
        const nameB = cleanNameForSort(b.fullName);
        return nameA.localeCompare(nameB, 'ar');
      };

      grade10.sort(sortArabic);
      grade11.sort(sortArabic);

      grade10 = grade10.map((s, index) => ({ ...s, seatNumber: `10${String(index + 1).padStart(3, '0')}` }));
      grade11 = grade11.map((s, index) => ({ ...s, seatNumber: `11${String(index + 1).padStart(3, '0')}` }));

      setProgressMsg('جاري الدمج بطريقة السحّاب الأبجدي (عاشر - حادي عشر)...');
      
      const zippedStudents: any[] = [];
      const maxLength = Math.max(grade10.length, grade11.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (i < grade10.length) zippedStudents.push(grade10[i]);
        if (i < grade11.length) zippedStudents.push(grade11[i]);
      }

      setProgressMsg('جاري توزيع الطلاب على اللجان المتاحة...');
      const allocations: any[] = [];
      let studentPointer = 0;

      for (const committee of committees) {
        if (committee.name.includes('لجنة الفائض')) continue;

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

      if (studentPointer < zippedStudents.length) {
        setProgressMsg('توليد لجنة الفائض للطلاب المتبقين...');
        let overflowCommittee = committees.find(c => c.name.includes('لجنة الفائض'));
        
        if (!overflowCommittee) {
          const { data: newOverflowCommittee, error: overflowError } = await supabase.from('exam_committees').insert({
            name: 'لجنة الفائض (للتوزيع اليدوي)',
            capacity: zippedStudents.length - studentPointer,
            academic_year: academicYear,
            semester: semester,
            location: 'قيد الانتظار'
          }).select('id, name, capacity').single();

          if (overflowError) throw overflowError;
          overflowCommittee = newOverflowCommittee;
        }

        while (studentPointer < zippedStudents.length) {
          allocations.push({
            student_id: zippedStudents[studentPointer].id,
            committee_id: overflowCommittee.id,
            seat_number: zippedStudents[studentPointer].seatNumber,
            academic_year: academicYear,
            semester: semester
          });
          studentPointer++;
        }
      }

      setProgressMsg('جاري مسح التوزيع القديم وحفظ التوزيع الجديد...');
      
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

      setProgressMsg('تحديث الهويات الرقمية للطلاب...');
      for (const alloc of allocations) {
        await supabase.from('users')
          .update({ last_seen: new Date().toISOString() })
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
