import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    // توحيد البيانات لتصبح مصفوفة دائماً لتسهيل التعامل معها
    const notificationsToProcess = Array.isArray(body) ? body : [body];

    // 1️⃣ حفظ الإشعارات في قاعدة البيانات الداخلية فقط (لتعمل داخل المنصة)
    const { error: dbError } = await adminSupabase
      .from('notifications')
      .insert(notificationsToProcess.map(n => ({
        user_id: n.user_id || n.userId, 
        title: n.title,
        content: n.content || n.body,
        type: n.type || 'system',
        link: n.link || n.url || null,
        is_read: false
      })));

    if (dbError) throw dbError;

    // 🚀 لا يوجد أي كود هنا للإشعارات الخارجية (web-push) لأننا استأصلناه بنجاح!

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
