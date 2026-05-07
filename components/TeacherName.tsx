import Link from 'next/link';
import { UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================
// 🧑‍🏫 المكون الذكي لاسم المعلم (Smart Teacher Name)
// المسار: components/TeacherName.tsx
// الهدف: تحويل اسم المعلم في أي مكان في النظام إلى رابط تفاعلي يوجه لملفه الشخصي.
// ==========================================

interface TeacherNameProps {
  id: string;               // معرّف المعلم (للتوجيه)
  name: string;             // اسم المعلم
  className?: string;       // كلاسات إضافية (Tailwind) لتغيير الحجم أو اللون حسب مكان الاستخدام
  showIcon?: boolean;       // هل تريد إظهار أيقونة صغيرة بجانب الاسم؟ (افتراضياً: لا)
}

export function TeacherName({ id, name, className, showIcon = false }: TeacherNameProps) {
  // حماية (Fallback): إذا لم يتم تمرير ID أو اسم صالح، نعرض نصاً عادياً حتى لا ينهار النظام
  if (!id || !name) {
    return <span className={cn("text-slate-400 font-bold", className)}>{name || 'غير معروف'}</span>;
  }

  return (
    <Link 
      href={`/teachers/${id}`}
      // نستخدم cn (clsx + tailwind-merge) لكي نسمح بتمرير كلاسات خارجية دون تعارض
      className={cn(
        "inline-flex items-center gap-1.5 font-black transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-amber-500/50 rounded-md",
        "text-white hover:text-amber-400", // الألوان الافتراضية (يمكن تجاوزها عبر className)
        className
      )}
      title={`زيارة الملف الشخصي للأستاذ ${name}`}
    >
      {/* الأيقونة تظهر فقط إذا طلبنا ذلك عبر showIcon={true} */}
      {showIcon && (
        <UserCheck className="w-3.5 h-3.5 opacity-70 group-hover:scale-110 transition-transform" />
      )}
      
      {/* تأثير التسطير الأنيق (Underline) عند المرور بالماوس */}
      <span className="group-hover:underline underline-offset-4 decoration-amber-500/40">
        {name}
      </span>
    </Link>
  );
}
