// lib/whatsapp/evolution.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
  // 1. تنظيف الرقم من أي مسافات أو رموز
  const cleanPhone = phone.replace(/\D/g, '');
  
  // 2. التحقق من وجود المفتاح الدولي لدولة الكويت (965) وإضافته إن لم يكن موجوداً
  const formattedPhone = cleanPhone.startsWith('965') ? cleanPhone : `965${cleanPhone}`;

  // 3. إرسال الطلب إلى سيرفر Evolution API
  const apiUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  
  // 🚀 الحقن المباشر لكلمة السر (استبدل الجملة العربية بكلمة السر الحقيقية الخاصة بك)
  const MY_API_KEY = 'Ehab@Gh870495ا';

  if (!apiUrl || !instance) {
    throw new Error('Evolution API environment variables are missing (URL or Instance).');
  }

  const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': MY_API_KEY,
      'Authorization': `Bearer ${MY_API_KEY}`
    },
    body: JSON.stringify({ 
      number: formattedPhone, 
      options: {
        delay: 1200,
        presence: "composing"
      },
      textMessage: {
        text: text
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Evolution API Error: ${response.statusText}`);
  }

  return response.json();
}
