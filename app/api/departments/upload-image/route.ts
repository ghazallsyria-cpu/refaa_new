import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// إعدادات كلاودينري (تأكد من وجودها في ملف .env)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { image, departmentId } = await req.json();

    if (!image || !departmentId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    // 1. الرفع إلى مجلد مخصص في كلاودينري مع تحسين تلقائي
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'alrefaa_departments_v2',
      transformation: [
        { width: 1200, height: 400, crop: "fill", gravity: "center" },
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const imageUrl = uploadResponse.secure_url;

    // 2. تحديث الرابط في قاعدة البيانات باستخدام Service Role لتجاوز سياسات الحماية
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('academic_departments')
      .update({ image_url: imageUrl })
      .eq('id', departmentId);

    if (error) throw error;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
