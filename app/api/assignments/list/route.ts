import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { userId, role } = await req.json();

    // 1. استخدام مفتاح الإدارة لتخطي كل حواجز قاعدة البيانات
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 2. جلب كل الواجبات بدون فلاتر معقدة (لنجلب البيانات الخام أولاً)
    const { data: rawAssignments, error } = await adminSupabase
      .from('assignments')
      .select(`
        *,
        subject:subjects(name),
        teacher:teachers(user_id, users(full_name)),
        assignment_sections(section_id, sections(name, classes(name)))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    let assignments = rawAssignments || [];

    // 3. الفلترة الفولاذية داخل الجافاسكريبت (مضادة لأخطاء Supabase)
    const cleanUserId = String(userId).trim().toLowerCase();

    if (role === 'teacher') {
        // جلب معرفات المعلم (سواء Profile ID أو Auth User ID)
        const { data: tProfiles } = await adminSupabase.from('teachers').select('id, user_id').or(`user_id.eq.${cleanUserId},id.eq.${cleanUserId}`);
        const validTeacherIds = tProfiles ? tProfiles.flatMap(t => [String(t.id).toLowerCase(), String(t.user_id).toLowerCase()]) : [cleanUserId];

        assignments = assignments.filter(a => {
            const aTeacherId = String(a.teacher_id).toLowerCase();
            return validTeacherIds.includes(aTeacherId) || aTeacherId === cleanUserId;
        });
    } 
    else if (role === 'student') {
        // جلب شعبة الطالب
        const { data: sProfiles } = await adminSupabase.from('students').select('section_id').or(`user_id.eq.${cleanUserId},id.eq.${cleanUserId}`);
        const studentSectionId = sProfiles && sProfiles.length > 0 ? String(sProfiles[0].section_id).toLowerCase() : null;

        assignments = assignments.filter(a => {
            if (a.status !== 'published') return false; // الطالب يرى المنشور فقط
            if (!studentSectionId) return false; // لا يرى شيئاً إذا لم يكن مسجلاً في فصل

            // التحقق من مصفوفة section_ids المحفوظة مباشرة، أو من الجدول الوسيط
            const sectionIdsArray = Array.isArray(a.section_ids) ? a.section_ids.map((id: any) => String(id).toLowerCase()) : [];
            const relationSectionIds = Array.isArray(a.assignment_sections)
                ? a.assignment_sections.map((sec: any) => String(sec.section_id).toLowerCase())
                : [];

            return sectionIdsArray.includes(studentSectionId) || relationSectionIds.includes(studentSectionId);
        });
    }

    return NextResponse.json({ data: assignments });
  } catch (error: any) {
    console.error('List Assignments API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
