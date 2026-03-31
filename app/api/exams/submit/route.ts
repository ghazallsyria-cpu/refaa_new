import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { examId, studentId } = await req.json();

    // 1. جلب بيانات الاختبار
    const { data: examData } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. تحديد هوية الطالب بجميع المعرفات الممكنة (User ID & Profile ID) لمنع ضياع البيانات
    let studentProfile = null;
    let possibleStudentIds = [studentId];

    const { data: s1 } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
    if (s1) {
        studentProfile = s1;
        if (s1.user_id) possibleStudentIds.push(s1.user_id);
    } else {
        const { data: s2 } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
        if (s2) {
            studentProfile = s2;
            possibleStudentIds.push(s2.id);
        }
    }

    // إزالة المعرفات المكررة
    possibleStudentIds = [...new Set(possibleStudentIds.filter(Boolean))];

    // 3. جلب الأسئلة
    const { data: questions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

    // 4. 🌟 السحر هنا: جلب جميع المحاولات والبحث عن "المحاولة الذهبية" التي تحتوي على إجابات!
    let bestAttempt = null;
    let bestAnswers: any[] = [];

    const { data: allAttempts } = await adminSupabase.from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .in('student_id', possibleStudentIds)
        .order('created_at', { ascending: false });

    if (allAttempts && allAttempts.length > 0) {
        // فحص أي محاولة تمتلك إجابات مسجلة في جدول student_answers
        for (const att of allAttempts) {
            const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', att.id);
            if (ans && ans.length > 0) {
                bestAttempt = att;
                bestAnswers = ans;
                break; // وجدنا المحاولة الذهبية! نوقف البحث
            }
        }

        // إذا لم نجدها، نبحث في الجدول القديم exam_answers (تحسباً)
        if (!bestAttempt) {
            for (const att of allAttempts) {
                const { data: ansLegacy } = await adminSupabase.from('exam_answers').select('*').eq('attempt_id', att.id);
                if (ansLegacy && ansLegacy.length > 0) {
                    bestAttempt = att;
                    bestAnswers = ansLegacy.map(a => ({ ...a, text_answer: a.answer, selected_option_id: a.answer }));
                    break;
                }
            }
        }

        // إذا لم يكن لدى الطالب أي إجابات في أي محاولة، نأخذ أحدث محاولة له
        if (!bestAttempt) {
            bestAttempt = allAttempts[0];
        }
    }

    // في حال عدم وجود أي محاولة إطلاقاً (لحماية الواجهة من الانهيار)
    if (!bestAttempt) {
         bestAttempt = { id: null, exam_id: examId, student_id: possibleStudentIds[0], score: 0, status: 'pending' };
    }

    return NextResponse.json({
      exam: examData || {},
      student: studentProfile || { id: studentId, users: { full_name: 'طالب' } },
      attempt: bestAttempt,
      answers: bestAnswers,
      questions: questions || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


