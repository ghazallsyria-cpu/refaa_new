// lib/whatsapp/resolver.ts
import { supabase } from '@/lib/supabase';

export interface AudienceTarget {
  id: string;
  phone: string;
}

export async function resolveAudience(audienceType: string, classId?: string): Promise<AudienceTarget[]> {
  let targets: AudienceTarget[] = [];

  // 1. إذا كان الهدف فئة عامة (المعلمين، الطلاب، أو أولياء الأمور)
  if (['teachers', 'parents', 'students'].includes(audienceType)) {
    const roleMap: Record<string, string> = { 
      'teachers': 'teacher', 
      'parents': 'parent', 
      'students': 'student' 
    };
    
    // بما أن جدول users لديك يحتوي على حقل role وحقل phone، فالاستعلام بسيط جداً
    const { data, error } = await supabase
      .from('users')
      .select('id, phone')
      .eq('role', roleMap[audienceType])
      .not('phone', 'is', null) // تجاهل المستخدمين الذين لم يسجلوا رقم هاتف
      .neq('phone', ''); // تجاهل الأرقام الفارغة
      
    if (error) throw new Error(`Database error fetching ${audienceType}: ${error.message}`);
    if (data) targets = data;
  } 
  
  // 2. إذا كان الهدف طلاب صف محدد (class)
  else if (audienceType === 'class' && classId) {
    // خطوة أ: جلب معرفات الطلاب (student_id) من جدول enrollments لهذا الصف
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId);

    if (enrollError) throw new Error(`Database error fetching enrollments: ${enrollError.message}`);

    if (enrollments && enrollments.length > 0) {
      const studentIds = enrollments.map(e => e.student_id);

      // خطوة ب: جلب أرقام هواتف هؤلاء الطلاب من جدول users (لأن student_id هو نفسه user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, phone')
        .in('id', studentIds)
        .not('phone', 'is', null)
        .neq('phone', '');

      if (usersError) throw new Error(`Database error fetching class students' phones: ${usersError.message}`);
      if (usersData) targets = usersData;
    }
  }

  // 3. تنظيف البيانات من الأرقام المكررة (إن وجدت) لضمان عدم إرسال الرسالة للشخص مرتين
  const uniqueTargets = Array.from(
    new Map(targets.map(item => [item.phone, item])).values()
  );

  return uniqueTargets;
}
