import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );
    const { assignmentId, userId, role } = await req.json();

    if (!assignmentId) {
       return NextResponse.json({ error: 'Missing assignment ID' }, { status: 400 });
    }

    // 1. جلب الواجب الأساسي باستخدام maybeSingle لمنع الانهيار
    const { data: assignment, error: aErr } = await adminSupabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
    
    if (aErr) throw aErr;
    if (!assignment) throw new Error('الواجب غير موجود في قاعدة البيانات');

    // 2. جلب البيانات المرتبطة يدوياً لمنع أي انهيار بسبب العلاقات الفارغة
    let subjects = null;
    if (assignment.subject_id) {
        const { data } = await adminSupabase.from('subjects').select('*').eq('id', assignment.subject_id).maybeSingle();
        subjects = data;
    }

    let teachers = null;
    let users = null;
    if (assignment.teacher_id) {
        const { data } = await adminSupabase.from('teachers').select('*').eq('id', assignment.teacher_id).maybeSingle();
        teachers = data;
        if (teachers?.user_id) {
            const { data: uData } = await adminSupabase.from('users').select('*').eq('id', teachers.user_id).maybeSingle();
            users = uData;
        }
    }

    const { data: aSecs } = await adminSupabase.from('assignment_sections').select('section_id').eq('assignment_id', assignmentId);

    const enrichedAssignment = {
        ...assignment,
        subject_name: subjects?.name || '',
        teacher_name: users?.full_name || '',
        subject: subjects,
        teacher: { ...teachers, users },
        assignment_sections: aSecs || []
    };

    // 3. جلب أسئلة الواجب
    const { data: questions } = await adminSupabase.from('assignment_questions').select('*').eq('assignment_id', assignmentId).order('order');

    let submission = null;
    let answers: any[] = [];
    let allSubmissions: any[] = [];

    // 4. إذا كان طالباً: جلب إجابته هو فقط
    if (role === 'student') {
        const { data: stData } = await adminSupabase.from('students').select('id').or(`user_id.eq.${userId},id.eq.${userId}`).maybeSingle();
        const stId = stData ? stData.id : userId;

        const { data: sub } = await adminSupabase.from('assignment_submissions').select('*').eq('assignment_id', assignmentId).eq('student_id', stId).maybeSingle();
        if (sub) {
            submission = sub;
            const { data: ans } = await adminSupabase.from('assignment_answers').select('*').eq('submission_id', sub.id);
            answers = ans || [];
        }
    } 
    // 5. إذا كان معلماً: جلب كل تسليمات الطلاب
    else if (['teacher', 'admin', 'management'].includes(role)) {
        const { data: subs } = await adminSupabase.from('assignment_submissions').select('*').eq('assignment_id', assignmentId).order('submitted_at', { ascending: false });
        if (subs && subs.length > 0) {
            const studentIds = subs.map(s => s.student_id);
            const { data: students } = await adminSupabase.from('students').select('*').in('id', studentIds);
            const { data: sections } = await adminSupabase.from('sections').select('*');
            const { data: classes } = await adminSupabase.from('classes').select('*');
            const { data: stUsers } = await adminSupabase.from('users').select('*');

            allSubmissions = subs.map(s => {
                const st = students?.find(st => st.id === s.student_id);
                const sec = sections?.find(sec => sec.id === st?.section_id);
                const cls = classes?.find(c => c.id === sec?.class_id);
                const stUser = stUsers?.find(u => u.id === st?.user_id);

                return {
                    ...s,
                    student: {
                        ...st,
                        users: stUser,
                        section: { ...sec, class: cls, classes: cls }
                    }
                };
            });
        }
    }

    return NextResponse.json({
        success: true,
        assignment: enrichedAssignment,
        questions: questions || [],
        submission,
        answers,
        allSubmissions
    });

  } catch (error: any) {
    console.error('Get Assignment Details API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
