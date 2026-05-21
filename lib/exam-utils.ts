/**
 * @file lib/exam-utils.ts
 * @description دوال مساعدة نقية (Pure Utilities) لمنطق الامتحانات.
 */

import type {
  UserMeta,
  SectionMeta,
  ClassMeta,
  StudentWithRelations,
  InvigilatorWithRelations,
  ExamCommitteeHead,
  ExamTimetable,
} from '@/types/exam';

/** تطبيع العلاقات: تحويل Array أو Object إلى Object واحد */
export function normalizeRelation<T>(data: T | T[] | null | undefined): T | null {
  if (data === null || data === undefined) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

/** استخلاص الاسم الآمن من كائن المستخدم */
export function getSafeName(userObj: UserMeta | UserMeta[] | null | undefined): string {
  const user = normalizeRelation(userObj);
  return user?.full_name?.trim() || 'غير معروف';
}

/** استخلاص الصورة الرمزية */
export function getSafeAvatar(userObj: UserMeta | UserMeta[] | null | undefined): string | null {
  const user = normalizeRelation(userObj);
  return user?.avatar_url ?? null;
}

/** توليد حرف أولي للأفاتار */
export function getInitials(name: string | null | undefined): string {
  return (name || '؟').charAt(0);
}

/** استخلاص اسم الصف الكامل من بيانات الطالب */
export function getFullClassName(studentData: StudentWithRelations | null | undefined): string {
  if (!studentData) return 'غير محدد';

  try {
    const section = normalizeRelation(studentData.sections);
    const cls = normalizeRelation(section?.classes);

    const level = Number(cls?.level || 0);
    const className = String(cls?.name || '');
    const sectionName = String(section?.name || '');
    const track = String(studentData.next_year_track || '').toLowerCase();

    const isLiterary =
      track === 'literary' ||
      className.includes('أدبي') ||
      className.includes('ادبي') ||
      sectionName.includes('أدبي') ||
      sectionName.includes('ادبي');

    const isScientific =
      track === 'scientific' ||
      className.includes('علمي') ||
      className.includes('علمى') ||
      sectionName.includes('علمي') ||
      sectionName.includes('علمى');

    let display = '';
    if (level === 10) display = 'العاشر';
    else if (level === 11)
      display = isLiterary ? 'الحادي عشر أدبي' : isScientific ? 'الحادي عشر علمي' : 'الحادي عشر';
    else if (level === 12)
      display = isLiterary ? 'الثاني عشر أدبي' : isScientific ? 'الثاني عشر علمي' : 'الثاني عشر';
    else display = className || 'صف غير محدد';

    const cleanSec = sectionName
      .replace(/أدبي|ادبي|علمي|علمى/g, '')
      .replace(/-/g, '')
      .trim();

    return `${display} ${cleanSec ? '- شعبة ' + cleanSec : ''}`.trim();
  } catch {
    return 'غير محدد';
  }
}

/** تقسيم مصفوفة إلى قطع بحجم محدد */
export function chunkArray<T>(arr: readonly T[], size: number): T[][] {
  if (!Array.isArray(arr) || size <= 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Fisher-Yates Shuffle — خلط عادل وموثوق إحصائياً */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** استخلاص الرقم من اسم اللجنة (للفرز) */
export function parseCommitteeNumber(name: string): number {
  return parseInt(name.replace(/\D/g, ''), 10) || 0;
}

/** فرز اللجان رقمياً */
export function sortCommittees<T extends { name: string }>(committees: readonly T[]): T[] {
  return [...committees].sort((a, b) => parseCommitteeNumber(a.name) - parseCommitteeNumber(b.name));
}

/** تنظيف الاسم العربي للفرز الأبجدي */
export function normalizeArabic(name: string): string {
  return name
    .replace(/^[\s.\-_]+/, '')
    .replace(/[أإآٱ]/g, 'ا')
    .trim();
}

/** تنسيق تاريخ الامتحان للعرض */
export function formatExamDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** التحقق مما إذا كان المعلم معفى أو رئيس لجنة */
export function isTeacherEligibleForInvigilation(teacher: FormattedTeacher): boolean {
  return !teacher.is_excluded_from_exams && !teacher.is_committee_head;
}

/** استخلاص تواريخ الامتحانات الفريدة من الجداول */
export function extractUniqueDates(timetables: ExamTimetable[]): string[] {
  const set = new Set<string>();
  timetables.forEach((t) => {
    if (t.exam_date) set.add(t.exam_date);
  });
  return Array.from(set).sort();
}

/** استخلاص رؤساء اللجان الفريدين ليوم محدد */
export function getUniqueHeadsForDate(
  heads: HeadWithRelations[],
  date: string,
  timetables: ExamTimetable[]
): HeadWithRelations[] {
  const targetIds = new Set(timetables.filter((t) => t.exam_date === date).map((t) => t.id));
  const map = new Map<string, HeadWithRelations>();

  heads.forEach((h) => {
    const tt = normalizeRelation(h.exam_timetables);
    if (tt && targetIds.has(tt.id) && h.head_teacher_id && !map.has(h.head_teacher_id)) {
      map.set(h.head_teacher_id, h);
    }
  });

  return Array.from(map.values());
}

/** استخلاص نطاق اللجان المُكلفة من رؤساء اللجان */
export function getAssignedCommitteeNames(heads: HeadWithRelations[]): string[] {
  const names = new Set<string>();
  heads.forEach((h) => {
    if (h.committees_range) {
      h.committees_range.split('،').forEach((n) => {
        const trimmed = n.trim();
        if (trimmed) names.add(trimmed);
      });
    }
  });
  return Array.from(names);
}
