import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { Assignment } from '@/types';

// النوع الموسّع للواجب مع البيانات المحسوبة
export interface AssignmentWithMeta extends Assignment {
  subject_name: string;
  teacher_name: string;
  assignment_sections: {
    section_id: string;
    sections: { id: string; name: string; classes: { name: string } };
  }[];
  submission_count: number;
  graded_count: number;
}

// ===== الاستعلام الأساسي مع كل البيانات المرتبطة =====
const ASSIGNMENT_SELECT = `
  id, title, description, subject_id, section_id, teacher_id,
  due_date, file_url, status, created_at, updated_at,
  subjects!inner(id, name),
  teachers!inner(id, users!inner(full_name)),
  assignment_sections(
    section_id,
    sections(id, name, classes(name))
  ),
  assignment_submissions(id, grade)
`;

async function fetchAssignments(
  userRole: string | null,
  userId: string | null
): Promise<AssignmentWithMeta[]> {
  if (!userId || !userRole) return [];

  let query = supabase
    .from('assignments')
    .select(ASSIGNMENT_SELECT)
    .order('created_at', { ascending: false });

  // ===== فلترة حسب الدور =====
  if (userRole === 'teacher') {
    // المعلم يرى واجباته فقط
    query = query.eq('teacher_id', userId);

  } else if (userRole === 'student') {
    // الطالب: جلب الفصل أولاً ثم الفلترة
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('section_id')
      .eq('id', userId)
      .single();

    if (studentError || !studentData?.section_id) return [];

    const sectionId = studentData.section_id;

    // يرى الواجبات المرتبطة بفصله عبر جدول assignment_sections
    // أو التي section_id مباشرة = فصله
    const { data: sectionAssignmentIds } = await supabase
      .from('assignment_sections')
      .select('assignment_id')
      .eq('section_id', sectionId);

    const ids = (sectionAssignmentIds || []).map(r => r.assignment_id);

    if (ids.length === 0) {
      // قد يكون section_id مباشرة في assignments
      query = query.eq('section_id', sectionId).eq('status', 'published');
    } else {
      query = query.in('id', ids).eq('status', 'published');
    }

  } else if (userRole === 'parent') {
    // ولي الأمر: يرى واجبات أبنائه
    const { data: childrenData } = await supabase
      .from('students')
      .select('section_id')
      .eq('parent_id', userId);

    const sectionIds = (childrenData || [])
      .map(c => c.section_id)
      .filter(Boolean) as string[];

    if (sectionIds.length === 0) return [];

    const { data: sectionAssignmentIds } = await supabase
      .from('assignment_sections')
      .select('assignment_id')
      .in('section_id', sectionIds);

    const ids = (sectionAssignmentIds || []).map(r => r.assignment_id);
    if (ids.length === 0) return [];

    query = query.in('id', ids).eq('status', 'published');

  }
  // admin / management يرون الكل (لا فلترة)

  const { data, error } = await query;
  if (error) throw error;

  // ===== تحويل البيانات للشكل المطلوب =====
  return (data || []).map((a: any) => {
    const subjects = Array.isArray(a.subjects) ? a.subjects[0] : a.subjects;
    const teachers = Array.isArray(a.teachers) ? a.teachers[0] : a.teachers;
    const teacherUsers = Array.isArray(teachers?.users) ? teachers?.users[0] : teachers?.users;
    const submissions: any[] = a.assignment_submissions || [];
    const sections: any[] = a.assignment_sections || [];

    return {
      ...a,
      subject_name: subjects?.name || '',
      teacher_name: teacherUsers?.full_name || '',
      assignment_sections: sections.map((s: any) => ({
        section_id: s.section_id,
        sections: Array.isArray(s.sections) ? s.sections[0] : s.sections,
      })),
      submission_count: submissions.length,
      graded_count: submissions.filter((s: any) => s.grade !== null && s.grade !== undefined).length,
    } as AssignmentWithMeta;
  });
}

// ===== الـ Hook النهائي =====
export function useAssignments() {
  const { user, userRole } = useAuth();

  return useQuery<AssignmentWithMeta[], Error>({
    queryKey: ['assignments', userRole, user?.id],
    queryFn: () => fetchAssignments(userRole, user?.id ?? null),
    enabled: !!user && !!userRole,
    staleTime: 1000 * 60 * 3, // 3 دقائق
    retry: 2,
  });
}
