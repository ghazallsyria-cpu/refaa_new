import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
// 🚀 قمنا بإزالة normalizePayload لأننا سنبني البيانات يدوياً لضمان عدم ضياع الإعدادات

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examData, questions, isNew, userId } = body;

    let realTeacherId = userId;
    const { data: tProfile } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
    if (tProfile) {
        realTeacherId = tProfile.id;
    } else {
        const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
        if (tProfile2) realTeacherId = tProfile2.id;
    }

    // 🚀 1. بناء الـ Payload يدوياً وبدقة لضمان عدم ضياع أي حقل (الإعدادات، الدرجات، إلخ)
    const payload = {
      title: examData.title,
      description: examData.description,
      subject_id: examData.subject_id,
      teacher_id: realTeacherId,
      duration: Number(examData.duration) || 30,
      max_attempts: Number(examData.max_attempts) || 1,
      max_score: Number(examData.max_score) || 100,
      total_marks: Number(examData.max_score) || 100,
      exam_date: examData.exam_date,
      start_time: examData.start_time,
      end_time: examData.end_time,
      status: examData.status || 'draft',
      settings: examData.settings || {} // 👈 هنا يكمن الحل السحري لحفظ الإعدادات ومنع الغش!
    };

    let finalExamId = examData.id;

    // 2. حفظ أو تحديث بيانات الاختبار الأساسية
    if (isNew || !finalExamId) {
      const { data: newEx, error: insertErr } = await adminSupabase.from('exams').insert([payload]).select().single();
      if (insertErr) throw new Error('DB_INSERT_EXAM: ' + insertErr.message);
      finalExamId = newEx.id;
    } else {
      const { error: updateErr } = await adminSupabase.from('exams').update(payload).eq('id', finalExamId);
      if (updateErr) throw new Error('DB_UPDATE_EXAM: ' + updateErr.message);
    }

    // 3. تحديث فصول (شعب) الاختبار (لا تؤثر على إجابات الطلاب)
    if (examData.section_ids && examData.section_ids.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = examData.section_ids.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      await adminSupabase.from('exam_sections').insert(sections);
    }

    // 4. 🚀 المعالجة الذكية للأسئلة (Upsert)
    if (questions && questions.length > 0) {
      // أ- حذف الأسئلة التي قام المعلم بإزالتها فعلياً من الواجهة فقط
      const incomingQuestionIds = questions.map((q: any) => q.id).filter(Boolean);
      if (incomingQuestionIds.length > 0) {
          await adminSupabase
            .from('questions')
            .delete()
            .eq('exam_id', finalExamId)
            .not('id', 'in', `(${incomingQuestionIds.join(',')})`);
      } else {
          await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
      }

      // ب- تحديث وإدراج الأسئلة الجديدة
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // 🚀 تجهيز بيانات السؤال بدقة متناهية للحفاظ على النوع والدرجة
        const qPayload = {
          id: q.id || undefined, 
          exam_id: finalExamId,
          type: q.type || 'multiple_choice', // 👈 أخذ نوع السؤال بدقة
          content: q.content || '',
          media_url: q.mediaUrl || q.media_url || null,
          points: Number(q.points) || 1,     // 👈 تحويل الدرجة لرقم لضمان حفظها في قاعدة البيانات
          order_index: i,
          is_required: q.is_required !== false // 👈 حفظ خيار إجبارية السؤال (لم يكن موجوداً سابقاً)
        };

        const { data: savedQ, error: qErr } = await adminSupabase
          .from('questions')
          .upsert([qPayload], { onConflict: 'id' })
          .select()
          .single();

        if (qErr) {
            console.error('Question Save Error:', qErr);
            continue; 
        }

        // ج- معالجة الخيارات المرتبطة بالسؤال
        if (savedQ && q.options?.length > 0) {
          const incomingOptionIds = q.options.map((o: any) => o.id).filter(Boolean);
          if (incomingOptionIds.length > 0) {
              await adminSupabase
                .from('question_options')
                .delete()
                .eq('question_id', savedQ.id)
                .not('id', 'in', `(${incomingOptionIds.join(',')})`);
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

          await adminSupabase
            .from('question_options')
            .upsert(optsPayload, { onConflict: 'id' });
            
        } else if (savedQ && (!q.options || q.options.length === 0)) {
           // إذا تم تغيير نوع السؤال إلى مقالي أو ملف ولم يعد له خيارات
           await adminSupabase.from('question_options').delete().eq('question_id', savedQ.id);
        }
      }
    } else {
      // إذا أرسل المعلم مصفوفة فارغة تماماً (حذف كل شيء)
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    return NextResponse.json({ success: true, examId: finalExamId });
  } catch (error: any) {
    console.error('Save Exam Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
