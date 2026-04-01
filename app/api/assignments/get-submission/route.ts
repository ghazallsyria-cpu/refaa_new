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
       return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    // 1. جلب تسليم الطالب
    const { data: subData, error: subErr } = await adminSupabase.from('assignment_submissions').select('*').eq('id', submissionId).maybeSingle();
    if (subErr) throw subErr;
    if (!subData) throw new Error('التسليم غير موجود');
    
    // 2. جلب باقي التفاصيل
    const { data: assignmentData, error: aErr } = await adminSupabase.from('assignments').select('*').eq('id', subData.assignment_id).maybeSingle();
    if (aErr) throw aErr;

    let subj = null;
    if (assignmentData?.subject_id) {
       const { data } = await adminSupabase.from('subjects').select('name').eq('id', assignmentData.subject_id).maybeSingle();
       subj = data;
    }

    const { data: qData } = await adminSupabase.from('assignment_questions').select('*').eq('assignment_id', subData.assignment_id).order('order');
    const { data: answersData } = await adminSupabase.from('assignment_answers').select('*').eq('submission_id', submissionId);
    
    let stData = null;
    if (subData.student_id) {
        const { data } = await adminSupabase.from('students').select('*').eq('id', subData.student_id).maybeSingle();
        stData = data;
    }

    let stUser = null;
    if (stData?.user_id) {
        const { data } = await adminSupabase.from('users').select('*').eq('id', stData.user_id).maybeSingle();
        stUser = data;
    }

    let stSec = null;
    let stClass = null;
    if (stData?.section_id) {
        const { data } = await adminSupabase.from('sections').select('*').eq('id', stData.section_id).maybeSingle();
        stSec = data;
        if (stSec?.class_id) {
            const { data: cData } = await adminSupabase.from('classes').select('*').eq('id', stSec.class_id).maybeSingle();
            stClass = cData;
        }
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
    console.error('Get Submission API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
