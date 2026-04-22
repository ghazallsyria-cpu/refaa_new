import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// إعدادات كلاودينري
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, departmentId } = body;

    if (!image) return NextResponse.json({ error: 'لم يتم استلام ملف الصورة' }, { status: 400 });
    if (!departmentId) return NextResponse.json({ error: 'لم يتم تحديد معرف القسم' }, { status: 400 });

    console.log('جاري الرفع لكلاودينري للقسم:', departmentId);

    // 1. الرفع إلى كلاودينري
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'alrefaa_departments',
      resource_type: 'auto',
    });

    const imageUrl = uploadResponse.secure_url;
    console.log('تم الرفع بنجاح، الرابط:', imageUrl);

    // 2. التحديث في Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // نستخدم مفتاح الخدمة لتخطي قيود RLS
    );

    const { error: dbError } = await supabase
      .from('academic_departments')
      .update({ image_url: imageUrl })
      .eq('id', departmentId);

    if (dbError) {
      console.error('خطأ في تحديث قاعدة البيانات:', dbError);
      return NextResponse.json({ error: 'فشل حفظ الرابط في قاعدة البيانات: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error: any) {
    console.error('خطأ غير متوقع في السيرفر:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع: ' + error.message }, { status: 500 });
  }
}
