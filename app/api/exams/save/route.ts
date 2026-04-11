import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examData, questions, isNew, userId } = body;

    let finalTeacherId = examData.teacher_id;
    if (!finalTeacherId) {
        const { data: tProfile } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
        if (tProfile) finalTeacherId = tProfile.id;
        else {
            const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
            if (tProfile2) finalTeacherId = tProfile2.id;
            else finalTeacherId = userId; 
        }
    }

    const payload = {
      title: examData.title,
      description: examData.description,
      subject_id: examData.subject_id,
      teacher_id: finalTeacherId,
      duration: Number(examData.duration) || 30,
      max_attempts: Number(examData.max_attempts) || 1,
      max_score: Number(examData.max_score) || 100,
      total_marks: Number(examData.max_score) || 100,
      exam_date: examData.exam_date,
      start_time: examData.start_time,
      end_time: examData.end_time,
      status: examData.status || 'draft',
      settings: examData.settings || {}
    };

    let finalExamId = examData.id;

    if (isNew || !finalExamId) {
      const { data: newEx, error: insertErr } = await adminSupabase.from('exams').insert([payload]).select().single();
      if (insertErr) throw new Error('DB_INSERT_EXAM: ' + insertErr.message);
      finalExamId = newEx.id;
    } else {
      const { error: updateErr } = await adminSupabase.from('exams').update(payload).eq('id', finalExamId);
      if (updateErr) throw new Error('DB_UPDATE_EXAM: ' + updateErr.message);
    }

    if (examData.section_ids && examData.section_ids.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = examData.section_ids.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      await adminSupabase.from('exam_sections').insert(sections);
    }

    if (questions && questions.length > 0) {
      const incomingQuestionIds = questions.map((q: any) => q.id).filter(Boolean);
      if (incomingQuestionIds.length > 0) {
          await adminSupabase.from('questions').delete().eq('exam_id', finalExamId).not('id', 'in', `(${incomingQuestionIds.join(',')})`);
      } else {
          await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        let frontendType = q.type || 'multiple_choice';
        if (frontendType === 'file_upload') frontendType = 'file';
        
        let qContent = q.content || '';
        
        // تنظيف العلامات القديمة من النص بطريقة آمنة
        qContent = qContent.split('').join('');
        const oldTypes = ['essay', 'fill_in_blank', 'file', 'multiple_choice', 'true_false', 'multi_select'];
        oldTypes.forEach(t => {
            qContent = qContent.split(``).join('');
        });

        let dbType = frontendType;
        
        // إخفاء النوع في النص إذا كان من الأنواع المعقدة
        if (['essay', 'fill_in_blank', 'file'].includes(frontendType)) {
            dbType = 'essay';
            qContent += ``;
        }

        const qPayload = {
          id: q.id || undefined, 
          exam_id: finalExamId,
          type: dbType,
          content: qContent,
          media_url: q.mediaUrl || q.media_url || null,
          points: Number(q.points) || 1,
          order_index: i
        };

        let { data: savedQ, error: qErr } = await adminSupabase.from('questions').upsert([qPayload], { onConflict: 'id' }).select().single();

        if (qErr) {
            const fallbacks = ['open', 'text', 'multiple_choice'];
            for (const fb of fallbacks) {
                if (fb === dbType) continue;
                qPayload.type = fb;
                const retry = await adminSupabase.from('questions').upsert([qPayload], { onConflict: 'id' }).select().single();
                if (!retry.error) {
                    savedQ = retry.data;
                    qErr = null as any;
                    break;
                }
            }
        }

        if (qErr) {
            console.error('Question Save Error:', qErr);
            continue; 
        }

        if (savedQ && q.options?.length > 0 && (frontendType === 'multiple_choice' || frontendType === 'true_false' || frontendType === 'multi_select')) {
          const incomingOptionIds = q.options.map((o: any) => o.id).filter(Boolean);
          if (incomingOptionIds.length > 0) {
              await adminSupabase.from('question_options').delete().eq('question_id', savedQ.id).not('id', 'in', `(${incomingOptionIds.join(',')})`);
          } else {
              await adminSupabase.from('question_options').delete().eq('question_id', savedQ.id);
          }

          const optsPayload = q.options.map((opt: any, idx: number) => ({
            id: opt.id || undefined,
            question_id: savedQ.id,
            content: opt.content || '',
            is_correct: Boolean(opt.is_correct),
            order_index: idx
          }));
          await adminSupabase.from('question_options').upsert(optsPayload, { onConflict: 'id' });
            
        } else if (savedQ) {
           await adminSupabase.from('question_options').delete().eq('question_id', savedQ.id);
        }
      }
    } else {
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    return NextResponse.json({ success: true, examId: finalExamId });
  } catch (error: any) {
    console.error('Save Exam Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
