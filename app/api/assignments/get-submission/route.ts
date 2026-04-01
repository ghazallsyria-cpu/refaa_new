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
    const { submissionId } = await req.json();

    if (!submissionId) {
       return NextResponse.json({ error: 'Missing submission ID', success: false }, { status: 400 });
    }

    const cleanSubmissionId = String(submissionId).trim();

    // 1. جلب تسليم الطالب بأمان
    const { data: subData, error: subErr } = await adminSupabase.from('assignment_submissions').select('*').eq('id', cleanSubmissionId).maybeSingle();
    if (subErr) throw new Error('DB Error: ' + subErr.message);
    if (!subData) {
        return NextResponse.json({ success: false, error: 'التسليم غير موجود' }, { status: 404 });
    }
    
    // 2. جلب باقي التفاصيل بأمان
    const { data: assignmentData } = await adminSupabase.from('assignments').select('*').eq('id', subData.assignment_id).maybeSingle();

    let subj = null;
    if (assignmentData?.subject_id && String(assignmentData.subject_id).trim() !== '') {
       try {
           const { data } = await adminSupabase.from('subjects').select('name').eq('id', String(assignmentData.subject_id).trim()).maybeSingle();
           subj = data;
       } catch(e) { console.warn("Subject fetch skipped"); }
    }

    const { data: qData } = await adminSupabase.from('assignment_questions').select('*').eq('assignment_id', subData.assignment_id).order('order');
    const { data: answersData } = await adminSupabase.from('assignment_answers').select('*').eq('submission_id', cleanSubmissionId);
    
    let stData = null, stUser = null, stSec = null, stClass = null;

    if (subData.student_id && String(subData.student_id).trim() !== '') {
        try {
            const { data } = await adminSupabase.from('students').select('*').eq('id', String(subData.student_id).trim()).maybeSingle();
            stData = data;

            if (stData?.user_id) {
                const { data: uData } = await adminSupabase.from('users').select('*').eq('id', String(stData.user_id).trim()).maybeSingle();
                stUser = uData;
            }

            if (stData?.section_id) {
                const { data: sData } = await adminSupabase.from('sections').select('*').eq('id', String(stData.section_id).trim()).maybeSingle();
                stSec = sData;
                if (stSec?.class_id) {
                    const { data: cData } = await adminSupabase.from('classes').select('*').eq('id', String(stSec.class_id).trim()).maybeSingle();
                    stClass = cData;
                }
            }
        } catch(e) { console.warn("Student data fetch skipped"); }
    }

    const enrichedAssignment = { ...assignmentData, subject: subj };
    const enrichedSubmission = {
        ...subData,
        student: { ...stData, users: stUser, section: { ...stSec, classes: stClass } }
    };

    return NextResponse.json({
        success: true,
        submission: enrichedSubmission,
        assignment: enrichedAssignment,
        questions: qData || [],
        answers: answersData || []
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
