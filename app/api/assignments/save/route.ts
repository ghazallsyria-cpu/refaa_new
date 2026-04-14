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

    // 🚀 الإصلاح الجذري: تنظيف البحث عن المعلم ليستخدم id فقط بدون تعقيدات
    let realTeacherId = userId;
    const { data: tProfile, error: tError } = await adminSupabase
      .from('teachers')
      .select('id')
      .eq('id', userId) // ✅ التصحيح هنا: استخدام id
      .maybeSingle();
      
    if (tProfile?.id) {
      realTeacherId = tProfile.id;
    } else if (tError) {
      console.warn("لم يتم العثور على المعلم أو حدث خطأ:", tError.message);
    }

    const safePayload = {
      title: payload.title || 'واجب بدون عنوان',
      description: payload.description || '',
      subject_id: (payload.subject_id && payload.subject_id.trim() !== '') ? payload.subject_id : null,
      teacher_id: realTeacherId,
      due_date: payload.due_date || new Date().toISOString(),
      file_url: payload.file_url || null,
      status: payload.status || 'published',
      section_ids: sectionIds || []
    };

    let finalAssignmentId = assignmentId;

    if (finalAssignmentId) {
      const { error: updErr } = await adminSupabase.from('assignments').update(safePayload).eq('id', finalAssignmentId);
      if (updErr) {
          const fallbackPayload = { ...safePayload };
          delete (fallbackPayload as any).status;
          const { error: retryErr } = await adminSupabase.from('assignments').update(fallbackPayload).eq('id', finalAssignmentId);
          if (retryErr) throw new Error('فشل تحديث الواجب: ' + retryErr.message);
      }
      
      // 🚨 تم حذف السطر المدمر الذي يحذف الأسئلة هنا!
      
      if (sectionIds && sectionIds.length > 0) {
         await adminSupabase.from('assignment_sections').delete().eq('assignment_id', finalAssignmentId);
      }
    } else {
      const { data: newAss, error: insErr } = await adminSupabase.from('assignments').insert([safePayload]).select('id').single();
      if (insErr) {
          const fallbackPayload = { ...safePayload };
          delete (fallbackPayload as any).status;
          const { data: retryAss, error: retryErr } = await adminSupabase.from('assignments').insert([fallbackPayload]).select('id').single();
          if (retryErr) throw new Error('فشل إضافة الواجب: ' + retryErr.message);
          finalAssignmentId = retryAss.id;
      } else {
          finalAssignmentId = newAss.id;
      }
    }

    if (!finalAssignmentId) throw new Error('لم نتمكن من الحصول على معرف الواجب');

    // 🚀 المعالجة الذكية لأسئلة الواجب (Upsert) للحفاظ على إجابات الطلاب
    if (questions && questions.length > 0) {
      // 1. حذف الأسئلة التي تم إزالتها فعلياً من الواجهة فقط
      const incomingQuestionIds = questions.map((q: any) => q.id).filter(Boolean);
      if (incomingQuestionIds.length > 0) {
         await adminSupabase
           .from('assignment_questions')
           .delete()
           .eq('assignment_id', finalAssignmentId)
           .not('id', 'in', `(${incomingQuestionIds.join(',')})`);
      } else {
         await adminSupabase.from('assignment_questions').delete().eq('assignment_id', finalAssignmentId);
      }

      // 2. تحديث الأسئلة الحالية أو إدراج الأسئلة الجديدة
      const qPayload = questions.map((q: any, idx: number) => ({
        id: q.id || undefined, // ✅ هذا السطر السحري يحافظ على الـ ID القديم ليربط الإجابات!
        assignment_id: finalAssignmentId,
        question_text: q.content || q.text || q.question_text || 'سؤال',
        question_type: q.type || q.question_type || 'text',
        options: q.options || null, // خيارات الواجبات تخزن كـ JSON مباشرة في هذا الجدول
        points: q.type === 'section_header' ? 0 : (q.points || 0), 
        is_required: q.type === 'section_header' ? false : (q.isRequired || q.is_required || false),
        order: idx,
        media_url: q.media_url || q.mediaUrl || null 
      }));
      
      // نستخدم upsert بدلاً من insert
      const { error: qErr } = await adminSupabase.from('assignment_questions').upsert(qPayload, { onConflict: 'id' });
      if (qErr) throw new Error('فشل حفظ الأسئلة: ' + qErr.message);
      
    } else {
      // إذا حذف المعلم جميع الأسئلة
      await adminSupabase.from('assignment_questions').delete().eq('assignment_id', finalAssignmentId);
    }

    // ربط الفصول الدراسية
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
