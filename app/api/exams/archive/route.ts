import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { examId, userId } = await req.json();

    if (!userId || !examId) {
      return NextResponse.json({ error: 'بيانات مفقودة أو غير مصرح بها' }, { status: 400 });
    }

    // 1. تغيير حالة الاختبار إلى "مؤرشف"
    const { error: updateError } = await adminSupabase
      .from('exams')
      .update({ status: 'archived' })
      .eq('id', examId);

    if (updateError) throw updateError;

    // 2. مسح روابط الصور من قاعدة البيانات لأسئلة هذا الاختبار (حتى لا تظهر كصور مكسورة)
    const { error: questionsError } = await adminSupabase
      .from('questions')
      .update({ media_url: null, media_type: null })
      .eq('exam_id', examId)
      .not('media_url', 'is', null);

    if (questionsError) throw questionsError;

    return NextResponse.json({ success: true, message: 'تمت أرشفة الاختبار وتفريغ وسائطه بنجاح' });

  } catch (error: any) {
    console.error('Exam Archive Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

