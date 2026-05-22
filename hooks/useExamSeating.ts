/**
 * ============================================================================
 * @file      hooks/useExamSeating.ts
 * @version   7.0.0 (Strict Mutually Exclusive Zipping - No Overflow)
 * @description محرك التوزيع الذكي: يمنع اجتماع 3 مراحل، يفصل العلمي عن الأدبي، ويلغي الفائض
 * ============================================================================
 */

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 🚀 دالة التقسيم العادل رياضياً 
const distributeEvenly = (array: any[], numChunks: number): any[][] => {
  if (numChunks <= 0 || !array.length) return Array.from({ length: numChunks }, () => []);
  const chunks: any[][] = [];
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

      setProgressMsg('إلغاء تكاليف المراقبين...');
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

  // 🚀 3. السحّاب الذكي المفصول (بدون لجنة فائض، وبدون دمج 3 مراحل)
  const generateSeatingAndDistribute = useCallback(async (academicYear: string, semester: string) => {
    setIsLoading(true);
    try {
      setProgressMsg('جاري قراءة اللجان المتاحة...');
      const { data: fetchedCommittees, error: commError } = await supabase.from('exam_committees')
        .select('id, name, capacity')
        .eq('academic_year', academicYear).eq('semester', semester);

      if (commError || !fetchedCommittees || fetchedCommittees.length === 0) throw new Error('لا توجد لجان! الرجاء البناء أولاً.');

      // تجاهل لجنة الفائض القديمة إن وُجدت
      const regularComms = fetchedCommittees.filter(c => !c.name.includes('الفائض')).sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      if (regularComms.length === 0) throw new Error('يرجى بناء لجان أساسية أولاً!');

      setProgressMsg('جاري سحب وتصنيف بيانات الطلاب...');
      const { data: studentsData } = await supabase.from('students').select(`id, next_year_track, users!inner(full_name), sections!inner(name, classes!inner(name, level))`);
      
      let grade10: any[] = []; 
      let grade11_sci: any[] = []; 
      let grade11_lit: any[] = [];

      (studentsData || []).forEach((s: any) => {
        const secObj = Array.isArray(s.sections) ? s.sections[0] : s.sections;
        const classObj = Array.isArray(secObj?.classes) ? secObj.classes[0] : secObj?.classes;
        
        const level = classObj?.level;
        const className = classObj?.name || '';
        const sectionName = secObj?.name || '';
        const track = s.next_year_track || ''; 
        const obj = { id: s.id, fullName: s.users?.full_name || '' };

        if (level === 10) {
            grade10.push(obj);
        } else if (level === 11) {
            if (track === 'literary' || className.includes('أدبي') || className.includes('ادبي') || sectionName.includes('أدبي') || sectionName.includes('ادبي')) {
                grade11_lit.push(obj);
            } else {
                grade11_sci.push(obj);
            }
        }
      });

      setProgressMsg('الفرز الأبجدي وإصدار أرقام الجلوس...');
      const clean = (name: string) => name.replace(/^[\s\.\-\_]+/, '').replace(/[أإآ]/g, 'ا').trim();
      const sortAr = (a: any, b: any) => clean(a.fullName).localeCompare(clean(b.fullName), 'ar');
      
      grade10.sort(sortAr); 
      grade11_sci.sort(sortAr); 
      grade11_lit.sort(sortAr);

      grade10 = grade10.map((s, idx) => ({ ...s, seatNumber: `10${String(idx + 1).padStart(3, '0')}` }));
      grade11_sci = grade11_sci.map((s, idx) => ({ ...s, seatNumber: `111${String(idx + 1).padStart(3, '0')}` }));
      grade11_lit = grade11_lit.map((s, idx) => ({ ...s, seatNumber: `112${String(idx + 1).padStart(3, '0')}` }));

      setProgressMsg('الحساب الرياضي لتخصيص اللجان...');
      
      const totalCommsCount = regularComms.length;
      const totalG11 = grade11_sci.length + grade11_lit.length;
      
      // 🚀 الهندسة الذكية: كم لجنة يحتاج العلمي؟ وكم لجنة يحتاج الأدبي؟ (بالنسبة والتناسب)
      let numSciComms = Math.round(totalCommsCount * (grade11_sci.length / totalG11));
      if (grade11_sci.length > 0 && numSciComms === 0) numSciComms = 1;
      if (grade11_lit.length > 0 && numSciComms === totalCommsCount) numSciComms = totalCommsCount - 1;
      
      const numLitComms = totalCommsCount - numSciComms;

      // 🚀 التقسيم: العاشر يتوزع على الكل، العلمي على لجانه، والأدبي على لجانه
      const chunks10 = distributeEvenly(grade10, totalCommsCount);
      const chunks11Sci = distributeEvenly(grade11_sci, numSciComms);
      const chunks11LitTarget = distributeEvenly(grade11_lit, numLitComms);
      
      // تجهيز مصفوفة أدبي لتطابق ترتيب اللجان (الأدبي دائماً في اللجان الأخيرة)
      const chunks11Lit: any[][] = Array.from({ length: totalCommsCount }, () => []);
      for (let i = 0; i < numLitComms; i++) {
         chunks11Lit[numSciComms + i] = chunks11LitTarget[i];
      }

      const allocations: any[] = [];

      setProgressMsg('ترصيص اللجان بالسحّاب المتناوب الذكي...');
      
      for (let i = 0; i < totalCommsCount; i++) {
         const comm = regularComms[i];
         const c10 = chunks10[i] || [];
         
         // إذا كانت لجنة علمي سنسحب من مصفوفة العلمي، وإلا سنسحب من الأدبي
         const isLitComm = i >= numSciComms;
         const c11 = isLitComm ? (chunks11Lit[i] || []) : (chunks11Sci[i] || []);

         let p10 = 0, p11 = 0;
         const committeeZipped = [];

         // 🚀 السحّاب (عاشر - علمي) أو (عاشر - أدبي) ولن يجتمع الثلاثة أبداً
         while (p10 < c10.length || p11 < c11.length) {
            if (p10 < c10.length) committeeZipped.push(c10[p10++]);
            if (p11 < c11.length) committeeZipped.push(c11[p11++]);
         }

         // 🚀 إجبار التوزيع: بدون لجنة فائض، كل من في المصفوفة يدخل لجنته حتى لو تجاوز السعة قليلاً
         for (const student of committeeZipped) {
            allocations.push({
               student_id: student.id,
               committee_id: comm.id,
               seat_number: student.seatNumber,
               academic_year: academicYear,
               semester: semester
            });
         }
      }

      setProgressMsg('اعتماد التوزيع النهائي في قاعدة البيانات...');
      await supabase.from('student_seat_allocations').delete().eq('academic_year', academicYear).eq('semester', semester);
      
      const chunkSize = 100;
      for (let i = 0; i < allocations.length; i += chunkSize) {
        await supabase.from('student_seat_allocations').insert(allocations.slice(i, i + chunkSize));
      }

      setProgressMsg('تحديث سجلات الطلاب...');
      for (const a of allocations) {
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', a.student_id);
      }

      return { success: true };
    } catch (e: any) { alert(e.message); return { success: false }; } finally { setIsLoading(false); setProgressMsg(''); }
  }, []);

  return { isLoading, progressMsg, buildCommittees, nukeEverything, generateSeatingAndDistribute };
}
