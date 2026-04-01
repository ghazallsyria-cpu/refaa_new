import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { userId, role } = await req.json();
    
    // استخدام مفتاح الإدارة لتخطي أي RLS يمنع ظهور الواجبات
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );

    // 1. جلب الواجبات
    let query = adminSupabase.from('assignments').select(`
      *,
      subject:subjects(name),
      teacher:teachers(users(full_name)),
      assignment_sections(section_id, sections(name, classes(name)))
    `).order('created_at', { ascending: false });

    // 2. الفلترة الأساسية
    if (role === 'teacher') {
       const { data: tProfile } = await adminSupabase.from('teachers').select('id').or(`user_id.eq.${userId},id.eq.${userId}`).maybeSingle();
       if (tProfile) {
           query = query.eq('teacher_id', tProfile.id);
       } else {
           return NextResponse.json({ data: [] });
       }
    } else if (role === 'student') {
       query = query.eq('status', 'published');
    }

    const { data: assignments, error } = await query;
    if (error) throw error;

    let finalAssignments = assignments || [];

    // 3. التصفية النهائية للطالب (In-Memory Filter) لضمان دقة الشعبة
    if (role === 'student') {
        const { data: sProfile } = await adminSupabase.from('students').select('section_id').or(`user_id.eq.${userId},id.eq.${userId}`).maybeSingle();
        const studentSectionId = sProfile?.section_id;
        
        if (studentSectionId) {
            finalAssignments = finalAssignments.filter((a) => 
                (a.section_ids && a.section_ids.includes(studentSectionId)) || 
                (a.assignment_sections?.some((sec: any) => String(sec.section_id) === String(studentSectionId)))
            );
        } else {
            finalAssignments = [];
        }
    }

    return NextResponse.json({ data: finalAssignments });
  } catch (error: any) {
    console.error('List Assignments API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
