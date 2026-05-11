/**
 * ============================================================================
 * @file      hooks/useExamSeating.ts
 * @version   5.0.0 (Smart Load Balancing & Chunked Triple Zipper)
 * @description محرك التوزيع المتوازن (توزيع عادل للأدبي والعلمي على جميع اللجان)
 * ============================================================================
 */

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 دالة التقسيم العادل رياضياً (لضمان توزيع الـ 19 طالب على 3 لجان بالتساوي 7, 6, 6)
const distributeEvenly = (array: any[], numChunks: number) => {
  const chunks = [];
  const baseSize = Math.floor(array.length / numChunks);
  let remainder = array.length % numChunks;
  let offset = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = baseSize + (remainder > 0 ? 1 : 0);
    chunks.push(array.slice(offset, offset + chunkSize));
    offset += chunkSize;
    if (remainder > 0) remainder--;
  }
  return chunks;
};

export function useExamSeating() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 1. بناء اللجان
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
      alert('خطأ في البناء: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  // 2. الهدم الشامل الآمن
  const nukeEverything = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    setProgressMsg('بدء بروتوكول الهدم الشامل...');
    try {
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
      alert('فشل الهدم لوجود ارتباطات قوية: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
      setProgressMsg('');
    }
  }, []);

  // 🚀 3. السحّاب المُقسم المتوازن (The Balanced Zipper)
  const generateSeatingAndDistribute = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    try {
      setProgressMsg('جاري قراءة اللجان المتاحة...');
      const { data: fetchedCommittees, error: commError } = await supabase.from('exam_committees')
        .select('id, name, capacity')
        .eq('academic_year', academicYear).eq('semester', semester);

      if (commError || !fetchedCommittees || fetchedCommittees.length === 0) throw new Error('لا يوجد لجان!');

      // فرز اللجان الأساسية واستبعاد لجنة الفائض للحسابات الرياضية
      const regularComms = fetchedCommittees.filter(c => !c.name.includes('الفائض')).sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      if (regularComms.length === 0) throw new Error('يرجى بناء لجان أساسية أولاً!');

      setProgressMsg('جاري سحب وتصنيف بيانات الطلاب...');
      const { data: studentsData } = await supabase.from('students').select(`id, next_year_track, users!inner(full_name), sections!inner(classes!inner(name, level))`);
      
      let grade10: any[] = []; 
      let grade11_sci: any[] = []; 
      let grade11_lit: any[] = [];

      (studentsData || []).forEach((s: any) => {
        const level = s.sections?.classes?.level;
        const className = s.sections?.classes?.name || '';
        const track = s.next_year_track || ''; 
        const obj = { id: s.id, fullName: s.users?.full_name || '' };

        if (level === 10) {
            grade10.push(obj);
        } else if (level === 11) {
            if (track === 'literary' || className.includes('أدبي')) grade11_lit.push(obj);
            else grade11_sci.push(obj);
        }
      });

      setProgressMsg('الفرز الأبجدي وإصدار أرقام الجلوس...');
      const clean = (name: string) => name.replace(/^[\s\.\-\_]+/, '').replace(/[أإآ]/g, 'ا').trim();
      const sortAr = (a: any, b: any) => clean(a.fullName).localeCompare(clean(b.fullName), 'ar');
      
      grade10.sort(sortAr); 
      grade11_sci.sort(sortAr); 
      grade11_lit.sort(sortAr);

      // الترقيم الجميل
      grade10 = grade10.map((s, idx) => ({ ...s, seatNumber: `10${String(idx + 1).padStart(3, '0')}` }));
      grade11_sci = grade11_sci.map((s, idx) => ({ ...s, seatNumber: `111${String(idx + 1).padStart(3, '0')}` }));
      grade11_lit = grade11_lit.map((s, idx) => ({ ...s, seatNumber: `112${String(idx + 1).padStart(3, '0')}` }));

      setProgressMsg('التقسيم العادل على اللجان (Load Balancing)...');
      // 🚀 هنا السحر: نقسم كل مرحلة إلى حصص متساوية بعدد اللجان!
      const chunks10 = distributeEvenly(grade10, regularComms.length);
      const chunks11Sci = distributeEvenly(grade11_sci, regularComms.length);
      const chunks11Lit = distributeEvenly(grade11_lit, regularComms.length);

      const allocations: any[] = [];
      const overflowQueue: any[] = [];

      setProgressMsg('ترصيص اللجان بالسحّاب المتداخل...');
      
      // نمر على كل لجنة ونعطيها حصتها من كل قسم
      for (let i = 0; i < regularComms.length; i++) {
         const comm = regularComms[i];
         const c10 = chunks10[i] || [];
         const c11S = chunks11Sci[i] || [];
         const c11L = chunks11Lit[i] || [];

         let p10 = 0, p11S = 0, p11L = 0;
         const committeeZipped = [];

         // 🚀 السحّاب الثلاثي (عاشر -> 11 أدبي -> 11 علمي) لمنع الغش تماماً
         while (p10 < c10.length || p11S < c11S.length || p11L < c11L.length) {
            if (p10 < c10.length) committeeZipped.push(c10[p10++]);
            if (p11L < c11L.length) committeeZipped.push(c11L[p11L++]);
            if (p11S < c11S.length) committeeZipped.push(c11S[p11S++]);
         }

         // التحقق من سعة اللجنة
         let seatsFilled = 0;
         for (const student of committeeZipped) {
            if (seatsFilled < comm.capacity) {
               allocations.push({ student_id: student.id, committee_id: comm.id, seat_number: student.seatNumber, academic_year: academicYear, semester: semester });
               seatsFilled++;
            } else {
               // إذا زاد العدد عن السعة، يذهبون لقائمة الانتظار (الفائض)
               overflowQueue.push(student);
            }
         }
      }

      // معالجة الفائض (إن وُجد)
      if (overflowQueue.length > 0) {
        setProgressMsg('إنشاء لجنة الفائض للاحتياط...');
        let overflowComm = fetchedCommittees.find(c => c.name.includes('الفائض'));
        if (!overflowComm) {
          const { data: newO, error: err } = await supabase.from('exam_committees')
            .insert({ name: 'لجنة الفائض (للتوزيع اليدوي)', capacity: overflowQueue.length, academic_year: academicYear, semester: semester, location: 'الانتظار' })
            .select('id, name, capacity').single();
          if (err) throw err;
          overflowComm = newO;
        }
        for (const student of overflowQueue) {
          allocations.push({ student_id: student.id, committee_id: overflowComm.id, seat_number: student.seatNumber, academic_year: academicYear, semester: semester });
        }
      }

      setProgressMsg('اعتماد التوزيع في قاعدة البيانات...');
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
