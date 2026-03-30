import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizePayload } from '@/lib/utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { payload, assignmentId, questions, sectionIds, subjects, userId } = body;

    // 1. إيجاد المعلم بقوة (لمنع ضياع الواجب)
    let realTeacherId = userId;
    const { data: tProfile } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
    if (tProfile) {
      realTeacherId = tProfile.id;
    } else {
      const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
      if (tProfile2) realTeacherId = tProfile2.id;
    }

    const normalizedPayload = normalizePayload({
      ...payload,
      teacher_id: realTeacherId
    });

    let finalAssignmentId = assignmentId;

    // 2. الحفظ الذكي (مع تجاوز خطأ عمود status إذا لم يكن موجوداً)
    if (finalAssignmentId) {
      let { error: updateErr } = await adminSupabase.from('assignments').update(normalizedPayload).eq('id', finalAssignmentId);
      
      // إذا اعترضت قاعدة البيانات على عمود status، نحذفه ونحاول مجدداً!
      if (updateErr && updateErr.message.includes('status')) {
        console.warn('Status column missing, retrying without it...');
        delete normalizedPayload.status;
        const retry = await adminSupabase.from('assignments').update(normalizedPayload).eq('id', finalAssignmentId);
        updateErr = retry.error;
      }
      
      if (updateErr) throw new Error('DB_UPDATE_ASSIGNMENT: ' + updateErr.message);
      await adminSupabase.from('assignment_questions').delete().eq('assignment_id', finalAssignmentId);
    } else {
      let { data: newAssignment, error: insertErr } = await adminSupabase.from('assignments').insert([normalizedPayload]).select().single();
      
      // التجاوز التلقائي لخطأ عمود status
      if (insertErr && insertErr.message.includes('status')) {
        console.warn('Status column missing, retrying without it...');
        delete normalizedPayload.status;
        const retry = await adminSupabase.from('assignments').insert([normalizedPayload]).select().single();
        insertErr = retry.error;
        newAssignment = retry.data;
      }

      if (insertErr) throw new Error('DB_INSERT_ASSIGNMENT: ' + insertErr.message);
      finalAssignmentId = newAssignment.id;

      // إرسال الإشعارات بهدوء
      try {
        if (sectionIds && sectionIds.length > 0) {
          const { data: students } = await adminSupabase.from('students').select('id, user_id').in('section_id', sectionIds);
          if (students && students.length > 0) {
            const subjectName = subjects?.find((s: any) => s.id === payload.subject_id)?.name || 'المادة';
            const notifs = students.map((st: any) => ({
              user_id: st.user_id || st.id,
              title: 'واجب جديد',
              content: `تم إضافة واجب في ${subjectName}: ${payload.title}`,
              type: 'assignment',
              link: `/assignments/${finalAssignmentId}`
            }));
            await adminSupabase.from('notifications').insert(notifs);
          }
        }
      } catch (e) {}
    }

    // 3. حفظ الأسئلة التفاعلية (بأمان)
    if (questions && questions.length > 0) {
      const qPayload = questions.map((q: any, idx: number) => ({
        assignment_id: finalAssignmentId,
        question_text: q.content || q.question_text || '',
        question_type: q.type || q.question_type || 'open',
        options: q.options || null,
        points: q.points || 0,
        is_required: q.isRequired || false,
        order: idx
      }));
      const { error: qErr } = await adminSupabase.from('assignment_questions').insert(qPayload);
      if (qErr) throw new Error('DB_INSERT_QUESTIONS: ' + qErr.message);
    }

    // 4. حفظ الفصول المستهدفة
    if (finalAssignmentId) {
      await adminSupabase.from('assignment_sections').delete().eq('assignment_id', finalAssignmentId);
      if (sectionIds && sectionIds.length > 0) {
        const sPayload = sectionIds.map((sId: string) => ({ assignment_id: finalAssignmentId, section_id: sId }));
        const { error: sErr } = await adminSupabase.from('assignment_sections').insert(sPayload);
        if (sErr) throw new Error('DB_INSERT_SECTIONS: ' + sErr.message);
      }
    }

    return NextResponse.json({ id: finalAssignmentId, success: true });
  } catch (error: any) {
    console.error('Save Assignment Error:', error);
    // إرسال الخطأ الحقيقي للواجهة!
    return NextResponse.json({ error: error.message || 'حدث خطأ مجهول أثناء الحفظ' }, { status: 500 });
  }
}


