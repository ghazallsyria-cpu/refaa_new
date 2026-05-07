import { z } from 'zod';
import * as validations from '../lib/validations';
import { Question } from './question';

// ==========================================
// 🔄 1. إعادة التصدير (Barrel Exports)
// هذه الطريقة تسمح باستيراد كل الأنواع من 'types' مباشرة 
// بدلاً من استيرادها من ملفات متفرقة، مما ينظف ترويسات الملفات الأخرى.
// ==========================================
export * from './question';
export * from '../lib/validations';
export type { UserRole } from '../lib/validations'; // تصدير نوع دور المستخدم لتسهيل الوصول إليه

// ==========================================
// 🌳 2. الأنواع الهيكلية المنظمة (Hierarchical Types)
// تُستخدم هذه الأنواع في واجهات المستخدم التي تتطلب عرضاً شجرياً (Tree View)
// مثل قائمة الفصول -> بداخلها الشعب -> بداخلها الطلاب.
// ==========================================

export interface OrganizedStudent {
  id: string;
  national_id: string;
  user: {
    full_name: string;
    email: string;
  };
}

export interface OrganizedSection extends validations.Section {
  students: OrganizedStudent[]; // الشعبة تحتوي على مصفوفة من الطلاب المنظمين
}

export interface OrganizedClass extends validations.Class {
  sections: OrganizedSection[]; // الصف يحتوي على مصفوفة من الشعب المنظمة
}

// ==========================================
// 🔗 3. الأنواع المعززة بالبيانات المرتبطة (Hydrated Types / With Meta)
// أنواع قاعدة البيانات الأساسية (Base Schema) لا تحتوي على العلاقات (Relations).
// عندما نقوم بعمل JOIN في Supabase (مثلاً جلب الواجب مع اسم المعلم)، 
// نحتاج إلى هذه الواجهات المعززة ليتعرف عليها الـ TypeScript بدون أخطاء.
// ==========================================

export interface AssignmentWithMeta extends validations.Assignment {
  subject_name?: string;               // اسم المادة (مجلوب من جدول Subjects)
  teacher_name?: string;               // اسم المعلم (مجلوب من جدول Users)
  submission_count?: number;           // عدد التسليمات الكلية
  graded_count?: number;               // عدد التسليمات التي تم تصحيحها
  
  // الكائنات المرتبطة (Relations Objects)
  subject?: validations.Subject;
  teacher?: validations.Teacher & {
    user?: {
      full_name: string;
    };
  };
  
  // الشعب المرتبطة بهذا الواجب (قد يكون الواجب مخصصاً لعدة شعب)
  assignment_sections?: {
    section_id: string;
    section?: validations.Section & {
      class?: validations.Class;
    };
  }[];
}

// واجهة تسليمة الطالب مع بياناته الشخصية وبيانات فصله
export interface SubmissionWithStudent extends validations.AssignmentSubmission {
  student?: validations.Student & {
    user?: {
      full_name: string;
      email: string;
    };
    section?: validations.Section & {
      class?: validations.Class;
    };
  };
}

// واجهة الاختبار المعززة بالإحصائيات وبيانات المادة
export interface ExamWithMeta extends validations.Exam {
  subject_name?: string;
  teacher_name?: string;
  section_name?: string;
  submission_status?: 'pending' | 'submitted' | 'graded'; // حالة تسليم الطالب المفتوح حسابه حالياً
  score?: number;                 // درجة الطالب
  submission_count?: number;      // كم طالب سلم الاختبار
  graded_count?: number;          // كم ورقة تم تصحيحها
  avg_score?: number;             // متوسط درجات الفصل (Analytics)
  question_count?: number;        // عدد أسئلة الاختبار
}

// ==========================================
// 📦 4. الكائنات المجمعة للصفحات المتخصصة (Composite Payloads)
// تُستخدم كنماذج للبيانات التي تحتاجها صفحة معينة بالكامل
// ==========================================

// تستخدم في صفحة "عرض تفاصيل الاختبار" (حيث نحتاج معلومات الاختبار + الأسئلة الخاصة به)
export interface ExamDetails {
  exam: validations.Exam & { section_ids: string[] }; // الاختبار مع معرفات الشعب المستهدفة
  questions: Question[]; // مصفوفة الأسئلة المرفقة
}

// تستخدم في صفحة "لوحة نتائج الاختبار" للمعلم أو الإدارة
export interface ExamResults {
  exam: validations.Exam;
  // قائمة مبسطة للطلاب الذين يحق لهم أداء الاختبار
  students: { id: string, full_name: string, email: string, section_name: string }[];
  // محاولات الطلاب (من دخل ومن سلم)
  attempts: validations.ExamAttempt[];
  questions: Question[];
  answers: any[]; // مسودة لإجابات الطلاب (يجب ربطها بواجهة ExamAnswer مستقبلاً إن وُجدت)
}
