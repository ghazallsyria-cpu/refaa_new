/**
 * ============================================================================
 * @file        hooks/useExamSeating.ts
 * @version     3.1.0 (TypeScript Strict Type Fix)
 * @description محرك التوزيع وبناء اللجان مع الهدم الآمن (Cascading Delete).
 * ============================================================================
 */

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useExamSeating() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 🚀 1. بناء اللجان الديناميكي (بناءً على طلب المدير)
  const buildCommittees = useCallback(async (academicYear: string, semester: string, count: number, capacity: number) => {
    setIsLoading(true);
    setProgressMsg('جاري صب القواعد وبناء اللجان...');
    try {
      const newCommittees = Array.from({ length: count }).map((_, i) => ({
        name: `لجنة ${i + 1}`,
        capacity: capacity,
        academic_year: academicYear,
        semester: semester,
      }));

      const { error } = await supabase.from('exam_committees').insert(newCommittees);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error(error);
      alert('خطأ في البناء: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  // 🚀 2. الهدم الشامل الآمن (Cascading Delete)
  const nukeEverything = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    setProgressMsg('بدء بروتوكول الهدم الشامل...');
    try {
      // 1. جلب اللجان الحالية
      const { data: comms } = await supabase.from('exam_committees').select('id').eq('academic_year', academicYear).eq('semester', semester);
      if (!comms || comms.length === 0) return true;
      const commIds = comms.map(c => c.id);

      setProgressMsg('إخلاء مقاعد الطلاب...');
      await supabase.from('student_seat_allocations').delete().eq('academic_year', academicYear).eq('semester', semester);

      setProgressMsg('إلغاء تكاليف المراقبين والحضور...');
      await supabase.from('invigilator_attendance').delete().in('committee_id', commIds);
      await supabase.from('exam_attendance').delete().in('committee_id', commIds);
      await supabase.from('committee_invigilators').delete().in('committee_id', commIds);

      setProgressMsg('إلغاء تكاليف رؤساء اللجان...');
      const { data: timetables } = await supabase.from('exam_timetables').select('id').eq('academic_year', academicYear).eq('semester', semester);
      if (timetables && timetables.length > 0) {
        await supabase.from('exam_committee_heads').delete().in('timetable_id', timetables.map(t => t.id));
      }

      setProgressMsg('هدم جدران اللجان...');
      const { error } = await supabase.from('exam_committees').delete().eq('academic_year', academicYear).eq('semester', semester);
      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error(error);
      alert('فشل الهدم لوجود ارتباطات قوية: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  // 🚀 3. السحّاب الأبجدي للتوزيع
  const generateSeatingAndDistribute = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    try {
      setProgressMsg('جاري قراءة اللجان المتاحة...');
      const { data: fetchedCommittees, error: commError } = await supabase.from('exam_committees')
        .select('id, name, capacity')
        .eq('academic_year', academicYear).eq('semester', semester);

      if (commError || !fetchedCommittees || fetchedCommittees.length === 0) throw new Error('لا يوجد لجان!');

      const committees = fetchedCommittees.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setProgressMsg('جاري سحب بيانات العاشر والحادي عشر...');
      const { data: studentsData } = await supabase.from('students').select(`id, users!inner(full_name), sections!inner(classes!inner(level))`);
      let grade10: any[] = []; let grade11: any[] = [];

      (studentsData || []).forEach((s: any) => {
        const level = s.sections?.classes?.level;
        const obj = { id: s.id, fullName: s.users?.full_name || '' };
        if (level === 10) grade10.push(obj);
        else if (level === 11) grade11.push(obj);
      });

      setProgressMsg('التطهير والفرز الأبجدي...');
      const clean = (name: string) => name.replace(/^[\s\.\-\_]+/, '').replace(/[أإآ]/g, 'ا').trim();
      const sortAr = (a: any, b: any) => clean(a.fullName).localeCompare(clean(b.fullName), 'ar');
      grade10.sort(sortAr); grade11.sort(sortAr);

      grade10 = grade10.map((s, idx) => ({ ...s, seatNumber: `10${String(idx + 1).padStart(3, '0')}` }));
      grade11 = grade11.map((s, idx) => ({ ...s, seatNumber: `11${String(idx + 1).padStart(3, '0')}` }));

      const zipped: any[] = [];
      const max = Math.max(grade10.length, grade11.length);
      for (let i = 0; i < max; i++) {
        if (i < grade10.length) zipped.push(grade10[i]);
        if (i < grade11.length) zipped.push(grade11[i]);
      }

      setProgressMsg('جاري التوزيع بالتبادل...');
      const allocations: any[] = [];
      let pointer = 0;

      for (const comm of committees) {
        if (comm.name.includes('الفائض')) continue;
        let c = 0;
        while (c < comm.capacity && pointer < zipped.length) {
          allocations.push({ student_id: zipped[pointer].id, committee_id: comm.id, seat_number: zipped[pointer].seatNumber, academic_year: academicYear, semester: semester });
          c++; pointer++;
        }
      }

      if (pointer < zipped.length) {
        setProgressMsg('إنشاء لجنة الفائض...');
        let overflow = committees.find(c => c.name.includes('الفائض'));
        if (!overflow) {
          // 🚀 الحل: إضافة name و capacity في أمر الـ select
          const { data: newO, error: err } = await supabase.from('exam_committees')
            .insert({ name: 'لجنة الفائض (للتوزيع اليدوي)', capacity: zipped.length - pointer, academic_year: academicYear, semester: semester, location: 'الانتظار' })
            .select('id, name, capacity').single();
          if (err) throw err;
          overflow = newO;
        }
        while (pointer < zipped.length) {
          allocations.push({ student_id: zipped[pointer].id, committee_id: overflow.id, seat_number: zipped[pointer].seatNumber, academic_year: academicYear, semester: semester });
          pointer++;
        }
      }

      await supabase.from('student_seat_allocations').delete().eq('academic_year', academicYear).eq('semester', semester);
      
      const chunkSize = 100;
      for (let i = 0; i < allocations.length; i += chunkSize) {
        await supabase.from('student_seat_allocations').insert(allocations.slice(i, i + chunkSize));
      }

      setProgressMsg('تحديث هويات الطلاب...');
      for (const a of allocations) {
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', a.student_id);
      }

      return { success: true };
    } catch (e: any) { alert(e.message); return { success: false }; } finally { setIsLoading(false); setProgressMsg(''); }
  }, []);

  return { isLoading, progressMsg, buildCommittees, nukeEverything, generateSeatingAndDistribute };
}
