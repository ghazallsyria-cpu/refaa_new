import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. تمرير الطلب لضمان التعامل مع الـ Headers بشكل صحيح
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          
          // تحديث كائن الاستجابة
          supabaseResponse = NextResponse.next({
            request,
          });
          
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 🚀 الحل الذكي: بدلاً من جلب المستخدم بالكامل من السيرفر وإضاعة الوقت، 
  // نتحقق من وجود "جلسة" (Session) مخزنة في الكوكيز محلياً. 
  // هذا أسرع بـ 10 أضعاف ويمنع حدوث (Timeout / AbortError) في Netlify.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = request.nextUrl.pathname;

  const isPublicRoute =
    path.startsWith('/login') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/live');

  // 🚀 نستخدم session بدلاً من user لتخفيف الطلب
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && path === '/login') {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
