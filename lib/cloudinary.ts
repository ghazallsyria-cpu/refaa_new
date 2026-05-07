// ==========================================
// ☁️ مدير التخزين السحابي (Cloudinary Utilities)
// أدوات مساعدة للتعامل مع الملفات والصور المرفوعة على سيرفرات Cloudinary
// ==========================================

// ==========================================
// 🔍 1. خوارزمية استخراج المعرّف (Public ID Extractor)
// روابط Cloudinary معقدة وتحتوي على مجلدات، إصدارات، وامتدادات.
// هذه الدالة تفكك الرابط وتستخرج "المعرّف الصافي" الذي تحتاجه API الحذف.
// ==========================================
export function getPublicIdFromUrl(url: string): string | null {
  // حماية مبدئية: إذا كان الرابط فارغاً أو لا يتبع لـ Cloudinary، نرفض العملية
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    // 💡 بنية روابط Cloudinary المتوقعة:
    // https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/v<version>/<public_id>.<extension>
    // أو بدون رقم الإصدار (Version):
    // https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/<public_id>.<extension>
    
    // تقسيم الرابط بناءً على الشرطة المائلة (/)
    const parts = url.split('/');
    // البحث عن مجلد 'upload' ليكون هو نقطة الارتكاز
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null; // إذا لم نجده، الرابط غير صالح
    
    // ما بعد مجلد 'upload' هو مسار الملف (المعرّف + الامتداد + رقم الإصدار إن وجد)
    let publicIdWithExtension = parts.slice(uploadIndex + 1).join('/');
    
    // 🧹 تنظيف رقم الإصدار (Version Stripping):
    // إذا كان المقطع يبدأ بحرف 'v' ومتبوعاً بأرقام (مثال: v1690000000) نقوم بقصه وإزالته
    if (publicIdWithExtension.startsWith('v') && /v\d+/.test(publicIdWithExtension.split('/')[0])) {
      publicIdWithExtension = publicIdWithExtension.split('/').slice(1).join('/');
    }
    
    // 🧹 تنظيف الامتداد (Extension Stripping):
    // البحث عن النقطة الأخيرة (لأن اسم الملف قد يحتوي على نقاط) وإزالة ما بعدها (مثل .jpg أو .pdf)
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
    if (lastDotIndex === -1) return publicIdWithExtension; // إذا لم يكن هناك امتداد، نعيده كما هو
    
    // إرجاع المعرّف الصافي الجاهز لعملية الحذف
    return publicIdWithExtension.substring(0, lastDotIndex);
  } catch (error) {
    // التقاط الأخطاء الصامتة لمنع انهيار الواجهة
    console.error('Error extracting public_id from Cloudinary URL:', error);
    return null;
  }
}

// ==========================================
// 🗑️ 2. محرك الحذف السحابي الآمن (Secure Delete Engine)
// تقوم هذه الدالة بتمرير المعرّف للـ Backend ليقوم هو بالحذف،
// لضمان عدم تسريب الـ (API Secret) الخاص بـ Cloudinary في متصفح المستخدم.
// ==========================================
export async function deleteFromCloudinary(url: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  // 1. استخراج المعرّف باستخدام الخوارزمية السابقة
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return { success: false, error: 'Could not extract public_id from URL' };

  try {
    // 2. إرسال الطلب لمسار الـ API الخاص بنا (الذي يمتلك الصلاحيات الأمنية)
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    });

    const data = await res.json();
    
    // 3. التحقق من حالة الرد (HTTP Status)
    if (!res.ok) {
      console.error('Cloudinary deletion failed:', data.error);
      return { success: false, error: data.error };
    }

    // 4. إعادة النتيجة بنجاح للواجهة (UI) ليتم تحديث الـ State
    return { success: true, result: data.result };
  } catch (error: any) {
    console.error('Error calling Cloudinary delete API:', error);
    return { success: false, error: error.message };
  }
}
