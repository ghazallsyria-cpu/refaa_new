import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { examId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'المستخدم غير مصرح له' }, { status: 401 });
    }

    if (!examId) {
      return NextResponse.json({ error: 'معرف الاختبار مفقود' }, { status: 400 });
    }

    // 1. جلب معرفات الأسئلة المرتبطة بالاختبار
    const { data: questions } = await adminSupabase
      .from('questions')
      .select('id')
      .eq('exam_id', examId);

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id);
      
      // 2. مسح الخيارات المرتبطة بالأسئلة أولاً
      await adminSupabase.from('question_options').delete().in('question_id', questionIds);
      
      // 3. مسح الأسئلة ذاتها
      await adminSupabase.from('questions').delete().in('id', questionIds);
    }

    // 4. جلب محاولات الطلاب لمسح إجاباتهم
    const { data: attempts } = await adminSupabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId);

    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id);
      
      // 5. مسح إجابات الطلاب
      await adminSupabase.from('student_answers').delete().in('attempt_id', attemptIds);
      
      // 6. مسح المحاولات ذاتها
      await adminSupabase.from('exam_attempts').delete().in('id', attemptIds);
    }

    // 7. إزالة ربط الفصول الدراسية
    await adminSupabase.from('exam_sections').delete().eq('exam_id', examId);

    // 8. مسح الاختبار بالكامل (الآن آمن لأننا نظفنا ما تحته)
    const { error } = await adminSupabase.from('exams').delete().eq('id', examId);
    
    if (error) throw new Error(`خطأ في مسح الاختبار من قاعدة البيانات: ${error.message}`);

    return NextResponse.json({ success: true, message: 'تم حذف الاختبار وجميع بياناته بنجاح' });

  } catch (error: any) {
    console.error('Exam Delete Full Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء مسح الاختبار' }, { status: 500 });
  }
}

