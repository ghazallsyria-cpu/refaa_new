
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. تهيئة الاستجابة الافتراضية
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. إنشاء عميل Supabase الآمن
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 🚀 الحل السحري لتحديث الـ Cookies بأمان في Next.js 14+
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. 🚨 الأمان: استخدام getUser بدلاً من getSession للتحقق الحقيقي من السيرفر
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isPublicRoute =
    path.startsWith('/login') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/live');

  // 4. حماية المسارات (التوجيه)
  
  // إذا لم يسجل دخول وحاول دخول صفحة محمية -> اطرده لصفحة الدخول
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // إذا كان مسجل دخول وحاول الدخول لصفحة Login -> وجهه للوحة التحكم
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * استثناء المسارات التي لا تحتاج لمراقبة (لتقليل الضغط على السيرفر):
     * - ملفات الـ API
     * - ملفات النظام في Next.js
     * - الصور والخطوط والملفات الثابتة
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

