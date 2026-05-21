/**
 * ============================================================================
 * @file      hooks/useExamSeating.ts
 * @version   8.0.0 (Professional Refactor)
 * @description محرك التوزيع الذكي: TypeScript Strict، Batch Operations،
 *              Validation كامل، وZero `any`.
 * ============================================================================
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  ExamCommittee,
  SeatedStudent,
  AllocationPayload,
  DistributionResult,
  UseExamSeatingReturn,
} from '@/types/exam';
import { normalizeArabic } from '@/lib/exam-utils';

/* ────────────────────────────────────────────────────────────────────────── */
/* دوال مساعدة نقية                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function distributeEvenly<T>(array: T[], numChunks: number): T[][] {
  if (numChunks <= 0 || array.length === 0) {
    return Array.from({ length: Math.max(0, numChunks) }, () => []);
  }

  const chunks: T[][] = [];
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
}

function sortArabicNames(a: SeatedStudent, b: SeatedStudent): number {
  return normalizeArabic(a.fullName).localeCompare(normalizeArabic(b.fullName), 'ar');
}

function parseStudentRow(row: unknown): {
  id: string;
  fullName: string;
  level: number;
  className: string;
  sectionName: string;
  track: string | null;
} | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;

  const id = r.id;
  if (typeof id !== 'string') return null;

  // users relation
  const users = r.users;
  const userArray = Array.isArray(users) ? users : [users];
  const userObj = userArray.find((u) => u && typeof u === 'object') as Record<string, unknown> | undefined;
  const fullName = typeof userObj?.full_name === 'string' ? userObj.full_name : 'غير معروف';

  // sections relation
  const sections = r.sections;
  const secArray = Array.isArray(sections) ? sections : [sections];
  const secObj = secArray.find((s) => s && typeof s === 'object') as Record<string, unknown> | undefined;

  // classes relation inside sections
  const classes = secObj?.classes;
  const clsArray = Array.isArray(classes) ? classes : [classes];
  const clsObj = clsArray.find((c) => c && typeof c === 'object') as Record<string, unknown> | undefined;

  const level = typeof clsObj?.level === 'number' ? clsObj.level : Number(clsObj?.level || 0);
  const className = typeof clsObj?.name === 'string' ? clsObj.name : '';
  const sectionName = typeof secObj?.name === 'string' ? secObj.name : '';
  const trackRaw = r.next_year_track;
  const track = typeof trackRaw === 'string' ? trackRaw.toLowerCase() : null;

  if (!level) return null;

  return { id, fullName, level, className, sectionName, track };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* الـ Hook                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const BATCH_SIZE = 100;

export function useExamSeating(): UseExamSeatingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const abortRef = useRef(false);

  const setProgress = useCallback((msg: string) => {
    setProgressMsg(msg);
  }, []);

  /** ── 1. بناء اللجان ─────────────────────────────────────────────── */
  const buildCommittees = useCallback(
    async (
      academicYear: string,
      semester: string,
      count: number,
      capacity: number
    ): Promise<boolean> => {
      setIsLoading(true);
      setProgress('جاري صب القواعد وبناء اللجان...');

      try {
        const newCommittees: Omit<<ExamCommittee, 'id' | 'created_at'>[] = Array.from(
          { length: count },
          (_, i) => ({
            name: `لجنة ${i + 1}`,
            capacity,
            academic_year: academicYear,
            semester,
            location: null,
          })
        );

        const { error } = await supabase.from('exam_committees').insert(newCommittees);
        if (error) throw error;
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error('buildCommittees failed:', err);
        // TODO: استبدال alert بـ toast notification
        alert('خطأ في البناء: ' + message);
        return false;
      } finally {
        setIsLoading(false);
        setProgress('');
      }
    },
    [setProgress]
  );

  /** ── 2. الهدم الشامل الآمن ──────────────────────────────────────── */
  const nukeEverything = useCallback(
    async (academicYear: string, semester: string): Promise<boolean> => {
      setIsLoading(true);
      setProgress('بدء بروتوكول الهدم الشامل...');

      try {
        const { data: comms } = await supabase
          .from('exam_committees')
          .select('id')
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        if (!comms || comms.length === 0) return true;
        const commIds = comms.map((c: { id: string }) => c.id);

        setProgress('إخلاء مقاعد الطلاب...');
        const p1 = supabase
          .from('student_seat_allocations')
          .delete()
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        setProgress('إلغاء تكاليف المراقبين...');
        const p2 = supabase.from('committee_invigilators').delete().in('committee_id', commIds);

        setProgress('إلغاء تكاليف رؤساء اللجان...');
        const { data: timetables } = await supabase
          .from('exam_timetables')
          .select('id')
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        const p3 =
          timetables && timetables.length > 0
            ? supabase
                .from('exam_committee_heads')
                .delete()
                .in(
                  'timetable_id',
                  timetables.map((t: { id: string }) => t.id)
                )
            : Promise.resolve({ error: null } as { error: Error | null });

        await Promise.all([p1, p2, p3]);

        setProgress('هدم جدران اللجان...');
        const { error } = await supabase
          .from('exam_committees')
          .delete()
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        if (error) throw error;
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error('nukeEverything failed:', err);
        alert('فشل الهدم لوجود ارتباطات قوية: ' + message);
        return false;
      } finally {
        setIsLoading(false);
        setProgress('');
      }
    },
    [setProgress]
  );

  /** ── 3. السحّاب الذكي المفصول ───────────────────────────────────── */
  const generateSeatingAndDistribute = useCallback(
    async (academicYear: string, semester: string): Promise<DistributionResult> => {
      setIsLoading(true);
      abortRef.current = false;

      const result: DistributionResult = {
        success: false,
        allocatedCount: 0,
        committeesUsed: 0,
        overflowDetected: false,
      };

      try {
        /* 1. جلب اللجان */
        setProgress('جاري قراءة اللجان المتاحة...');
        const { data: fetchedCommittees, error: commError } = await supabase
          .from('exam_committees')
          .select('id, name, capacity')
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        if (commError) throw commError;
        if (!fetchedCommittees || fetchedCommittees.length === 0) {
          throw new Error('لا توجد لجان! الرجاء البناء أولاً.');
        }

        const regularComms = fetchedCommittees
          .filter((c: ExamCommittee) => !c.name.includes('الفائض'))
          .sort((a: ExamCommittee, b: ExamCommittee) => {
            const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });

        if (regularComms.length === 0) {
          throw new Error('يرجى بناء لجان أساسية أولاً!');
        }

        /* 2. جلب الطلاب */
        setProgress('جاري سحب وتصنيف بيانات الطلاب...');
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select(
            `id, next_year_track,
             users!inner(full_name),
             sections!inner(name, classes!inner(name, level))`
          );

        if (studentsError) throw studentsError;

        /* 3. تصنيف */
        const grade10: SeatedStudent[] = [];
        const grade11Sci: SeatedStudent[] = [];
        const grade11Lit: SeatedStudent[] = [];

        (studentsData || []).forEach((raw: unknown) => {
          const s = parseStudentRow(raw);
          if (!s) return;

          const base = { id: s.id, fullName: s.fullName, seatNumber: '' };

          if (s.level === 10) {
            grade10.push(base);
          } else if (s.level === 11) {
            if (s.track === 'literary') grade11Lit.push(base);
            else grade11Sci.push(base);
          }
        });

        /* 4. فرز + أرقام جلوس */
        setProgress('الفرز الأبجدي وإصدار أرقام الجلوس...');
        grade10.sort(sortArabicNames);
        grade11Sci.sort(sortArabicNames);
        grade11Lit.sort(sortArabicNames);

        const finalGrade10 = grade10.map((s, i) => ({
          ...s,
          seatNumber: `10${String(i + 1).padStart(3, '0')}`,
        }));
        const finalGrade11Sci = grade11Sci.map((s, i) => ({
          ...s,
          seatNumber: `111${String(i + 1).padStart(3, '0')}`,
        }));
        const finalGrade11Lit = grade11Lit.map((s, i) => ({
          ...s,
          seatNumber: `112${String(i + 1).padStart(3, '0')}`,
        }));

        /* 5. هندسة التخصيص */
        setProgress('الحساب الرياضي لتخصيص اللجان...');
        const totalCommsCount = regularComms.length;
        const totalG11 = finalGrade11Sci.length + finalGrade11Lit.length;

        let numSciComms =
          totalG11 > 0
            ? Math.round(totalCommsCount * (finalGrade11Sci.length / totalG11))
            : 0;

        if (finalGrade11Sci.length > 0 && numSciComms === 0) numSciComms = 1;
        if (finalGrade11Lit.length > 0 && numSciComms === totalCommsCount)
          numSciComms = totalCommsCount - 1;

        const numLitComms = totalCommsCount - numSciComms;

        /* 6. تقسيم */
        const chunks10 = distributeEvenly(finalGrade10, totalCommsCount);
        const chunks11Sci = distributeEvenly(finalGrade11Sci, numSciComms);
        const chunks11LitTarget = distributeEvenly(finalGrade11Lit, numLitComms);

        const chunks11Lit: SeatedStudent[][] = Array.from({ length: totalCommsCount }, () => []);
        for (let i = 0; i < numLitComms; i++) {
          chunks11Lit[numSciComms + i] = chunks11LitTarget[i];
        }

        /* 7. ترصيص + Validation */
        setProgress('ترصيص اللجان بالسحّاب المتناوب الذكي...');
        const allocations: AllocationPayload[] = [];

        for (let i = 0; i < totalCommsCount; i++) {
          if (abortRef.current) throw new Error('تم إلغاء العملية');

          const comm = regularComms[i];
          const c10 = chunks10[i] || [];
          const isLitComm = i >= numSciComms;
          const c11 = isLitComm ? chunks11Lit[i] || [] : chunks11Sci[i] || [];

          const totalInCommittee = c10.length + c11.length;
          const capacity = comm.capacity ?? 14;

          if (totalInCommittee > capacity) {
            result.overflowDetected = true;
            console.warn(`تجاوز سعة في ${comm.name}: ${totalInCommittee}/${capacity}`);
            // يمكن تشديد السياسة هنا لرفع خطأ:
            // throw new Error(`لجنة ${comm.name} ممتلئة (السعة ${capacity})`);
          }

          let p10 = 0,
            p11 = 0;
          const committeeZipped: SeatedStudent[] = [];

          while (p10 < c10.length || p11 < c11.length) {
            if (p10 < c10.length) committeeZipped.push(c10[p10++]);
            if (p11 < c11.length) committeeZipped.push(c11[p11++]);
          }

          for (const student of committeeZipped) {
            allocations.push({
              student_id: student.id,
              committee_id: comm.id,
              seat_number: student.seatNumber,
              academic_year: academicYear,
              semester,
            });
          }
        }

        /* 8. اعتماد في قاعدة البيانات */
        setProgress('اعتماد التوزيع النهائي في قاعدة البيانات...');

        const { error: deleteError } = await supabase
          .from('student_seat_allocations')
          .delete()
          .eq('academic_year', academicYear)
          .eq('semester', semester);

        if (deleteError) throw deleteError;

        for (let i = 0; i < allocations.length; i += BATCH_SIZE) {
          if (abortRef.current) throw new Error('تم إلغاء العملية');
          const chunk = allocations.slice(i, i + BATCH_SIZE);
          const { error: insertError } = await supabase
            .from('student_seat_allocations')
            .insert(chunk);
          if (insertError) throw insertError;
        }

        /* 9. تحديث last_seen (Batch) */
        setProgress('تحديث سجلات الطلاب...');
        const studentIds = allocations.map((a) => a.student_id);
        const now = new Date().toISOString();

        for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
          const chunkIds = studentIds.slice(i, i + BATCH_SIZE);
          const { error: updateError } = await supabase
            .from('users')
            .update({ last_seen: now })
            .in('id', chunkIds);
          if (updateError) console.warn('Batch update warning:', updateError);
        }

        result.success = true;
        result.allocatedCount = allocations.length;
        result.committeesUsed = totalCommsCount;
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error('generateSeatingAndDistribute failed:', err);
        alert(message);
        return result;
      } finally {
        setIsLoading(false);
        setProgress('');
      }
    },
    [setProgress]
  );

  return {
    isLoading,
    progressMsg,
    buildCommittees,
    nukeEverything,
    generateSeatingAndDistribute,
  };
}
