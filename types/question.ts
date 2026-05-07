// ==========================================
// 🧩 1. أنواع الأسئلة المدعومة (Question Types)
// هذا الـ Type يمثل "قائمة الحصر" لكل أنواع الأسئلة التي يفهمها النظام.
// إضافة أي نوع جديد مستقبلاً (مثل 'audio_response') تبدأ من هنا!
// ==========================================
export type QuestionType = 
  | 'multiple_choice' // خيارات متعددة (إجابة واحدة صحيحة عادة)
  | 'true_false'      // صح أم خطأ
  | 'multi_select'    // اختيار من متعدد (أكثر من إجابة صحيحة)
  | 'essay'           // مقال طويل
  | 'fill_in_blank'   // املأ الفراغ
  | 'matching'        // المزاوجة والتوصيل
  | 'ordering'        // الترتيب
  | 'text'            // إجابة نصية قصيرة
  | 'paragraph'       // فقرة (مشابه للـ Essay)
  | 'checkbox'        // صناديق اختيار (مشابه للـ multi_select)
  | 'file';           // رفع ملف (صورة، PDF، إلخ)

// ==========================================
// 🔘 2. واجهة خيارات الإجابة (Option Interface)
// تستخدم للأسئلة التي تحتوي على خيارات جاهزة للطالب
// ==========================================
export interface Option {
  id: string;          // معرّف فريد للخيار (مهم جداً للـ React Keys)
  content: string;     // نص الخيار (وقد يحتوي على HTML/LaTeX)
  is_correct: boolean; // هل هذا الخيار هو الإجابة الصحيحة؟ (يستخدم في التصحيح الآلي)
  order_index?: number;// ترتيب الخيار (إذا أراد المعلم تثبيت الترتيب وعدم خلطه عشوائياً)
}

// ==========================================
// 📝 3. واجهة السؤال الشاملة (Question Interface)
// هيكل البيانات الأساسي لأي سؤال في المنصة
// ==========================================
export interface Question {
  id: string;             // معرّف السؤال
  type: QuestionType;     // نوع السؤال (من القائمة أعلاه)
  content: string;        // نص السؤال نفسه (HTML أو نص عادي)
  points: number;         // الدرجة أو الوزن المخصص لهذا السؤال
  explanation?: string;   // التغذية الراجعة (Feedback) التي تظهر للطالب بعد الحل
  options: Option[];      // مصفوفة الخيارات (تكون فارغة في الأسئلة المقالية)
  
  // 🖼️ المرفقات المرئية أو الصوتية
  media_url?: string;     // رابط المرفق (صورة، فيديو، الخ)
  media_type?: 'image' | 'video' | 'pdf'; // نوع المرفق لتحديد طريقة العرض
  
  // ⚖️ التوافق الرجعي (Backward Compatibility)
  // تم تعريف كلا الاسمين لضمان عدم انهيار النظام إذا كان الكود القديم يستخدم isRequired
  // بينما قاعدة البيانات الحديثة تستخدم is_required (Snake Case).
  is_required?: boolean; 
  isRequired?: boolean;  
}

// ==========================================
// 🧹 4. محرك التنظيف والتوحيد (Data Normalizer)
// هذه الدالة السحرية تأخذ أي بيانات عشوائية أو غير مكتملة قادمة من الـ API
// وتجبرها على مطابقة القالب الصارم لـ (Question Interface).
// ==========================================
export const normalizeQuestion = (raw: Partial<Question> & { text?: string }): Question => {
  return {
    // إذا لم يكن هناك ID، اصنع واحداً لتجنب انهيار واجهة React
    id: raw.id || crypto.randomUUID(),
    // الافتراضي هو نص (text) إذا لم يحدد المعلم النوع
    type: raw.type || 'text',
    // توحيد جلب المحتوى (يدعم الأنظمة القديمة التي كانت تحفظ السؤال في حقل 'text')
    content: raw.content || raw.text || '',
    // الدرجة الافتراضية 0 إذا كانت مفقودة
    points: raw.points || 0,
    explanation: raw.explanation,
    
    // ⚙️ معالجة الخيارات (Options Sanitization)
    options: Array.isArray(raw.options) 
      // ترتيب الخيارات بناءً على الـ order_index إن وُجد
      ? raw.options
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          // إذا كانت الخيارات القديمة عبارة عن مصفوفة نصوص (Strings)، حولها إلى Objects
          .map((o) => typeof o === 'string' 
            ? { id: crypto.randomUUID(), content: o, is_correct: false } 
            : o) 
      : [], // إذا لم تكن مصفوفة، اجعلها فارغة بأمان
      
    media_url: raw.media_url,
    media_type: raw.media_type,
    
    // 🚀 الدمج المزدوج (Dual Sync) لحقلي الإلزامية
    // يأخذ القيمة من أي حقل متوفر، والافتراضي هو (True)
    is_required: raw.is_required !== undefined ? raw.is_required : (raw.isRequired !== undefined ? raw.isRequired : true),
    isRequired: raw.is_required !== undefined ? raw.is_required : (raw.isRequired !== undefined ? raw.isRequired : true),
  };
};

// ==========================================
// 🏭 5. مصنع الأسئلة (Question Factory)
// تُستخدم هذه الدالة عند قيام المعلم بالنقر على "إضافة سؤال جديد".
// تقوم بتوليد قالب جاهز بناءً على النوع، لكي لا يبدأ المعلم من الصفر.
// ==========================================
export const createQuestion = (type: QuestionType): Question => {
  // القالب الأساسي الفارغ
  const base: Question = {
    id: crypto.randomUUID(),
    type,
    content: '',
    points: 1, // الافتراضي درجة واحدة
    options: [],
    is_required: true,
    isRequired: true,
  };

  // 🪄 حقن خيارات افتراضية لتسهيل الأمر على المعلم بناءً على النوع المختار
  switch (type) {
    case 'multiple_choice':
    case 'multi_select':
      base.options = [
        { id: crypto.randomUUID(), content: 'الخيار الأول', is_correct: true }, // يفترض الخيار الأول صحيحاً كبداية
        { id: crypto.randomUUID(), content: 'الخيار الثاني', is_correct: false },
      ];
      break;
    case 'true_false':
      // في أسئلة الصح والخطأ، نجهز الخيارات نصياً ونثبتها
      base.options = [
        { id: crypto.randomUUID(), content: 'صح', is_correct: true },
        { id: crypto.randomUUID(), content: 'خطأ', is_correct: false },
      ];
      break;
  }

  return base; // إعادة السؤال الجاهز للحقن في الـ UI
};
