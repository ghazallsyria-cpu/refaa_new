
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// 🟢 نقوم باستيراد مكتبة Cloudinary الحقيقية الخاصة بـ Node.js
import { v2 as cloudinary } from 'cloudinary';

// 🟢 إعداد Cloudinary هنا داخل الخادم
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🟢 1. التحقق من الأمان (Auth Check) لمنع الحذف العشوائي
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    
    // دعم كلا الاسمين للمتغير (publicId أو public_id) لتجنب كسر أي كود قديم يعتمد عليه
    const publicId = body.publicId || body.public_id;
    const resourceType = body.resourceType || body.resource_type || 'image';

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // 🟢 2. تنفيذ الحذف عبر مكتبة Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error deleting image from Cloudinary:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}

