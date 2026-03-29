import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { attemptId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'المستخدم غير مصرح له' }, { status: 401 });
    }

    if (!attemptId) {
      return NextResponse.json({ error: 'معرف المحاولة مفقود' }, { status: 400 });
    }

    // 1. مسح إجابات الطالب المرتبطة بهذه المحاولة لتجنب أخطاء العلاقات (Foreign Key Constraints)
    const { error: answersError } = await adminSupabase
      .from('student_answers')
      .delete()
      .eq('attempt_id', attemptId);

    if (answersError) {
      console.warn('تحذير: حدث خطأ أثناء مسح الإجابات (قد تكون ممسوحة بالفعل):', answersError.message);
    }

    // 2. مسح المحاولة نفسها
    const { error: attemptError } = await adminSupabase
      .from('exam_attempts')
      .delete()
      .eq('id', attemptId);
    
    if (attemptError) throw new Error(`فشل مسح المحاولة: ${attemptError.message}`);

    return NextResponse.json({ success: true, message: 'تم مسح المحاولة وإجاباتها بنجاح' });

  } catch (error: any) {
    console.error('Exam Attempt Delete Full Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع أثناء مسح المحاولة' }, { status: 500 });
  }
}

