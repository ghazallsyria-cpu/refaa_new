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
    const body = await req.json();
    const { assignmentId, userId, role } = body;

    if (!assignmentId) {
       return NextResponse.json({ error: 'Missing assignment ID', success: false }, { status: 400 });
    }

    // 🚀 تنظيف المعرف لتفادي أي فراغات خفية تدمر الاستعلام
    const cleanAssignmentId = String(assignmentId).trim();

    // 1. جلب الواجب الأساسي
    const { data: assignment, error: aErr } = await adminSupabase
        .from('assignments')
        .select('*')
        .eq('id', cleanAssignmentId)
        .maybeSingle();
    
    if (aErr) throw new Error('DB Error: ' + aErr.message);
    if (!assignment) {
        return NextResponse.json({ success: false, error: 'الواجب غير موجود في قاعدة البيانات' }, { status: 404 });
    }

    // 2. جلب البيانات المرتبطة يدوياً بأمان شديد (يتخطى الأخطاء إن وجدت)
    let subjects = null;
    if (assignment.subject_id && String(assignment.subject_id).trim() !== '') {
        try {
            const { data } = await adminSupabase.from('subjects').select('*').eq('id', String(assignment.subject_id).trim()).maybeSingle();
            subjects = data;
        } catch(e) { console.warn("Subject fetch skipped"); }
    }

    let teachers = null;
    let users = null;
    if (assignment.teacher_id && String(assignment.teacher_id).trim() !== '') {
        try {
            const { data } = await adminSupabase.from('teachers').select('*').eq('id', String(assignment.teacher_id).trim()).maybeSingle();
            teachers = data;
            // 🚀 الإصلاح الأول: الاعتماد على id المعلم لأنه هو نفسه id المستخدم
            if (teachers?.id) {
                const { data: uData } = await adminSupabase.from('users').select('*').eq('id', String(teachers.id).trim()).maybeSingle();
                users = uData;
            }
        } catch(e) { console.warn("Teacher fetch skipped"); }
    }

    const { data: aSecs } = await adminSupabase.from('assignment_sections').select('section_id').eq('assignment_id', cleanAssignmentId);

    const enrichedAssignment = {
        ...assignment,
        subject_name: subjects?.name || 'مادة غير محددة',
        teacher_name: users?.full_name || 'معلم غير محدد',
        subject: subjects,
        teacher: { ...teachers, users },
        assignment_sections: aSecs || []
    };

    // 3. جلب أسئلة الواجب
    const { data: questions } = await adminSupabase.from('assignment_questions').select('*').eq('assignment_id', cleanAssignmentId).order('order');

    let submission = null;
    let answers: any[] = [];
    let allSubmissions: any[] = [];

    // 4. جلب التسليمات بناءً على الصلاحية
    if (role === 'student' && userId) {
        // 🚀 الإصلاح الثاني: البحث عن الطالب بـ id فقط دون استخدام or مع user_id
        const { data: stData } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
        const stId = stData ? stData.id : userId;

        const { data: sub } = await adminSupabase.from('assignment_submissions').select('*').eq('assignment_id', cleanAssignmentId).eq('student_id', stId).maybeSingle();
        if (sub) {
            submission = sub;
            const { data: ans } = await adminSupabase.from('assignment_answers').select('*').eq('submission_id', sub.id);
            answers = ans || [];
        }
    } 
    else if (role && ['teacher', 'admin', 'management'].includes(role)) {
        const { data: subs } = await adminSupabase.from('assignment_submissions').select('*').eq('assignment_id', cleanAssignmentId).order('submitted_at', { ascending: false });
        
        if (subs && subs.length > 0) {
            const studentIds = [...new Set(subs.map(s => s.student_id).filter(Boolean))];
            
            let studentsData: any[] = [], sectionsData: any[] = [], classesData: any[] = [], stUsersData: any[] = [];
            
            if (studentIds.length > 0) {
                const [stRes, secRes, clsRes, usrRes] = await Promise.all([
                    adminSupabase.from('students').select('*').in('id', studentIds),
                    adminSupabase.from('sections').select('*'),
                    adminSupabase.from('classes').select('*'),
                    adminSupabase.from('users').select('*')
                ]);
                studentsData = stRes.data || [];
                sectionsData = secRes.data || [];
                classesData = clsRes.data || [];
                stUsersData = usrRes.data || [];
            }

            allSubmissions = subs.map(s => {
                const st = studentsData.find((x: any) => x.id === s.student_id);
                const sec = sectionsData.find((x: any) => x.id === st?.section_id);
                const cls = classesData.find((x: any) => x.id === sec?.class_id);
                // 🚀 الإصلاح الثالث: استخدام st?.id بدلاً من st?.user_id
                const stUser = stUsersData.find((x: any) => x.id === st?.id);

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
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
