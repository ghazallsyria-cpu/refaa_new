import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { attemptId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
    }

    // 1. تنظيف الجدول الأول (student_answers)
    const { error: ansErr1 } = await adminSupabase
      .from('student_answers')
      .delete()
      .eq('attempt_id', attemptId);

    if (ansErr1) console.warn('Warning cleaning student_answers:', ansErr1);

    // 2. تنظيف الجدول الثاني الخفي (exam_answers) لفك الارتباط نهائياً
    const { error: ansErr2 } = await adminSupabase
      .from('exam_answers')
      .delete()
      .eq('attempt_id', attemptId);

    if (ansErr2) console.warn('Warning cleaning exam_answers:', ansErr2);

    // 3. الآن يمكننا حذف المحاولة بأمان تام وبدون انهيار قاعدة البيانات
    const { error: attemptError } = await adminSupabase
      .from('exam_attempts')
      .delete()
      .eq('id', attemptId);
    
    if (attemptError) throw attemptError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Exam Attempt Delete Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء الحذف' }, { status: 500 });
  }
}


