import { NextResponse, type NextRequest } from 'next/server';

// ==========================================
// 🛡️ حارس التوجيه المركزي (Edge Middleware)
// ==========================================

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ==========================================
  // 🔓 1. تحديد المسارات العامة (Public Routes)
  // 🚀 التعديل الجوهري: أضفنا مسار الصفحة الرئيسية ( / ) ليصبح مفتوحاً للجمهور!
  // ==========================================
// ==========================================
  // 🔓 1. تحديد المسارات العامة (Public Routes)
  // ==========================================
  const isPublicRoute =
    path === '/' ||
    path === '' ||            // <--- إضافة لاحتمالات Netlify
    path === '/index' ||      // <--- إضافة لاحتمالات Netlify
    path.startsWith('/login') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/live');

  // ==========================================
  // ⚡ 2. التحقق الصاروخي (Optimistic Auth)
  // ==========================================
  const hasAuthCookie = request.cookies.getAll().some((cookie) => 
    cookie.name.includes('-auth-token') || cookie.name.startsWith('sb-')
  );

  // ==========================================
  // 🛑 3. جدار الحماية (Unauthorized Access)
  // ==========================================
  if (!hasAuthCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ==========================================
  // 🔄 4. منع التكرار (Authenticated Redirection)
  // ==========================================
  if (hasAuthCookie && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ==========================================
  // ✅ 5. السماح بالمرور (Pass Through)
  // ==========================================
  return NextResponse.next();
}

// ==========================================
// 🎯 6. إعدادات المطابقة (Matcher Configuration)
// ==========================================
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
