import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'مفاتيح السيرفر مفقودة' }, { status: 500 });
  }

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const { payload, assignmentId, questions, sectionIds, subjects, userId } = body;

    let realTeacherId = userId;
    const { data: tProfile1 } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
    if (tProfile1?.id) {
      realTeacherId = tProfile1.id;
    } else {
      const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
      if (tProfile2?.id) realTeacherId = tProfile2.id;
    }

    const safePayload: any = {
      title: payload.title || 'واجب بدون عنوان',
      description: payload.description || '',
      subject_id: (payload.subject_id && payload.subject_id.trim() !== '') ? payload.subject_id : null,
      teacher_id: realTeacherId,
      due_date: payload.due_date || new Date().toISOString(),
      file_url: payload.file_url || null, // 🚀 تأمين حفظ رابط الصورة
      status: payload.status || 'published'
    };

    let finalAssignmentId = assignmentId;

    if (finalAssignmentId) {
      const { error: updErr } = await adminSupabase.from('assignments').update(safePayload).eq('id', finalAssignmentId);
      if (updErr) {
          delete safePayload.status;
          const { error: retryErr } = await adminSupabase.from('assignments').update(safePayload).eq('id', finalAssignmentId);
          if (retryErr) throw new Error('فشل تحديث الواجب: ' + retryErr.message);
      }
      
      await adminSupabase.from('assignment_questions').delete().eq('assignment_id', finalAssignmentId);
      
      if (sectionIds && sectionIds.length > 0) {
         await adminSupabase.from('assignment_sections').delete().eq('assignment_id', finalAssignmentId);
      }
    } else {
      const { data: newAss, error: insErr } = await adminSupabase.from('assignments').insert([safePayload]).select('id').single();
      if (insErr) {
          delete safePayload.status;
          const { data: retryAss, error: retryErr } = await adminSupabase.from('assignments').insert([safePayload]).select('id').single();
          if (retryErr) throw new Error('فشل إضافة الواجب: ' + retryErr.message);
          finalAssignmentId = retryAss.id;
      } else {
          finalAssignmentId = newAss.id;
      }
    }

    if (!finalAssignmentId) throw new Error('لم نتمكن من الحصول على معرف الواجب');

    if (questions && questions.length > 0) {
      const qPayload = questions.map((q: any, idx: number) => ({
        assignment_id: finalAssignmentId,
        question_text: q.content || q.question_text || 'سؤال',
        question_type: q.type || q.question_type || 'open',
        options: q.options || null,
        points: q.points || 0,
        is_required: q.isRequired || false,
        order: idx
      }));
      const { error: qErr } = await adminSupabase.from('assignment_questions').insert(qPayload);
      if (qErr) throw new Error('فشل حفظ الأسئلة: ' + qErr.message);
    }

    if (sectionIds && sectionIds.length > 0) {
      const sPayload = sectionIds.map((sId: string) => ({
        assignment_id: finalAssignmentId,
        section_id: sId
      }));
      const { error: sErr } = await adminSupabase.from('assignment_sections').insert(sPayload);
      if (sErr) throw new Error('فشل ربط الواجب بالفصول: ' + sErr.message);
    }

    return NextResponse.json({ id: finalAssignmentId, success: true });
  } catch (error: any) {
    console.error('Save Assignment God Mode Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
