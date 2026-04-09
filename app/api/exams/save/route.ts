import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizePayload } from '@/lib/utils';

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

    const rawPayload = {
      ...examData,
      teacher_id: realTeacherId, 
    };

    const savedSectionIds = rawPayload.section_ids || [];
    delete rawPayload.section_ids;

    const payload = normalizePayload(rawPayload);
    let finalExamId = payload.id;

    // 1. حفظ أو تحديث بيانات الاختبار الأساسية
    if (isNew || !finalExamId) {
      const { data: newEx, error: insertErr } = await adminSupabase.from('exams').insert([payload]).select().single();
      if (insertErr) throw new Error('DB_INSERT_EXAM: ' + insertErr.message);
      finalExamId = newEx.id;
    } else {
      const { error: updateErr } = await adminSupabase.from('exams').update(payload).eq('id', finalExamId);
      if (updateErr) throw new Error('DB_UPDATE_EXAM: ' + updateErr.message);
      // 🚨 تم إزالة السطر المدمر الذي كان يحذف جميع الأسئلة هنا!
    }

    // 2. تحديث فصول الاختبار (لا تؤثر على إجابات الطلاب)
    if (savedSectionIds && savedSectionIds.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = savedSectionIds.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      await adminSupabase.from('exam_sections').insert(sections);
    }

    // 3. 🚀 المعالجة الذكية للأسئلة (Upsert) للحفاظ على إجابات الطلاب
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
          // في حال حذف المعلم جميع الأسئلة
          await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
      }

      // ب- تحديث وإدراج الأسئلة الجديدة
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // تجهيز بيانات السؤال
        const qPayload = {
          id: q.id || undefined, // الحفاظ على الـ ID القديم إذا كان موجوداً
          exam_id: finalExamId,
          type: q.type || 'open',
          content: q.content || '',
          media_url: q.mediaUrl || q.media_url || null,
          points: q.points || 1,
          order_index: i
        };

        // Upsert: تحديث إذا كان موجوداً، إدراج إذا كان جديداً
        const { data: savedQ, error: qErr } = await adminSupabase
          .from('questions')
          .upsert([qPayload], { onConflict: 'id' })
          .select()
          .single();

        if (qErr) {
            console.error('Question Save Error:', qErr);
            continue; // تجاوز الخطأ وإكمال الباقي
        }

        // ج- معالجة الخيارات المرتبطة بالسؤال
        if (savedQ && q.options?.length > 0) {
          // حذف الخيارات التي تمت إزالتها فقط
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

          // إدراج أو تحديث الخيارات
          const optsPayload = q.options.map((opt: any, idx: number) => ({
            id: opt.id || undefined,
            question_id: savedQ.id,
            content: opt.content || '',
            is_correct: opt.is_correct || false,
            order_index: idx
          }));

          await adminSupabase
            .from('question_options')
            .upsert(optsPayload, { onConflict: 'id' });
            
        } else if (savedQ && (!q.options || q.options.length === 0)) {
           // إذا تم تغيير نوع السؤال إلى مقالي مثلاً ولم يعد له خيارات
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
