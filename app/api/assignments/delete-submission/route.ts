import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'معرف التسليم مفقود', success: false }, { status: 400 });
    }

    // 1. جلب بيانات التسليم لمعرفة ما إذا كان هناك ملف مرفق (صورة)
    const { data: submission } = await adminSupabase
      .from('assignment_submissions')
      .select('file_url')
      .eq('id', submissionId)
      .maybeSingle();

    // 2. إذا كان هناك صورة مرفقة، قم بحذفها نهائياً من خوادم Cloudinary
    if (submission && submission.file_url) {
      try {
        await deleteFromCloudinary(submission.file_url);
        console.log('تم حذف الملف المرفق من Cloudinary بنجاح');
      } catch (cloudErr) {
        console.error('فشل حذف الملف من Cloudinary (سيستمر حذف التسليم):', cloudErr);
      }
    }

    // 3. حذف إجابات الأسئلة المرتبطة بهذا التسليم أولاً (تجنباً لمشاكل الربط)
    await adminSupabase.from('assignment_answers').delete().eq('submission_id', submissionId);
    
    // 4. حذف التسليم نفسه من قاعدة البيانات
    const { error } = await adminSupabase.from('assignment_submissions').delete().eq('id', submissionId);
    
    if (error) throw new Error('فشل الحذف من قاعدة البيانات: ' + error.message);

    return NextResponse.json({ success: true, message: 'تم حذف التسليم والمرفقات بنجاح' });

  } catch (error: any) {
    console.error('Delete Submission API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
