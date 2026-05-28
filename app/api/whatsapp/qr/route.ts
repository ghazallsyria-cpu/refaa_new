// app/api/whatsapp/qr/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  const MY_API_KEY = 'Ehab@Gh870495'
    ; // 👈 ضع كلمة السر الخاصة بك
  const apiUrl = process.env.EVOLUTION_API_URL || 'https://refaanew-production.up.railway.app';
  const instanceName = 'refaa';

  try {
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': MY_API_KEY,
        'Authorization': `Bearer ${MY_API_KEY}`
      }
    });

    const data = await response.json();

    // إذا وجد الكود، سيعرضه لك كصورة في المتصفح!
    if (data.base64) {
      return new NextResponse(`
        <html dir="rtl">
          <body style="text-align: center; font-family: tahoma; margin-top: 50px; background-color: #f0f2f5;">
            <h1 style="color: #075e54;">مرحباً أستاذ إيهاب 🚀</h1>
            <h2>امسح الكود لربط الواتساب بنظام مدرسة الرفعة</h2>
            <div style="margin: 20px auto; padding: 20px; background: white; display: inline-block; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <img src="${data.base64}" alt="QR Code" style="width: 300px; height: 300px;" />
            </div>
            <p>افتح واتساب في هاتفك > الأجهزة المرتبطة > ربط جهاز</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } else {
      return NextResponse.json({ message: "لم يتم العثور على QR Code. قد يكون الواتساب متصلاً بالفعل!", data });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
