// ... existing code ...
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import cloudinary from '@/lib/cloudinary'; // افترض أن هذا مسار إعداد Cloudinary لديك

export async function POST(req: Request) {
  try {
    // 1. التحقق من الأمان (Auth Check) - أضفنا هذا الجزء لمنع الحذف العشوائي
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // نستخدم Service Role للتحقق الموثوق من الخادم
    );
    
    // استخراج التوكن من الهيدر (Authorization: Bearer <token>)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. استلام البيانات بعد التأكد من هوية المستخدم
    const { public_id } = await req.json();

    if (!public_id) {
      return NextResponse.json({ error: 'public_id is required' }, { status: 400 });
    }

    // 3. تنفيذ الحذف
    const result = await cloudinary.uploader.destroy(public_id);
    
// ... existing code ...
