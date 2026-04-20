import { NextResponse, type NextRequest } from 'next/server';

// 🚀 لاحظ: أزلنا كلمة async لأننا لن ننتظر أي شيء من الإنترنت أو قواعد البيانات
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. تحديد الصفحات العامة (التي لا تحتاج تسجيل دخول)
  const isPublicRoute =
    path.startsWith('/login') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/live');

  // 2. 🚀 التحقق الصاروخي (Optimistic Auth)
  // نبحث فقط عن وجود الكوكيز الخاصة بـ Supabase في المتصفح
  // هذا الفحص يستغرق 0.1 ملي ثانية ولن يسبب أي Timeout في Netlify
  const hasAuthCookie = request.cookies.getAll().some((cookie) => 
    cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-')
  );

  // 3. إذا لم يمتلك كوكيز ويحاول الدخول لصفحة خاصة -> طرده لصفحة الدخول
  if (!hasAuthCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. إذا كان يمتلك كوكيز ويحاول فتح صفحة الدخول -> توجيهه للرئيسية
  if (hasAuthCookie && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 5. السماح بالمرور
  return NextResponse.next();
}

// استبعاد الملفات الثابتة والصور من الفحص لتسريع الموقع أكثر
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
