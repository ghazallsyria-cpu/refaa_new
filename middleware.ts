import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Helper to create a redirect response that preserves cookies
  const redirect = (url: string) => {
    const redirectResponse = NextResponse.redirect(new URL(url, request.url));
    // Copy cookies from the current response object to the redirect response
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  };

  // Public routes
  if (!user && !path.startsWith('/login') && !path.startsWith('/reset-password')) {
    return redirect('/login');
  }

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, must_reset_password')
      .eq('id', user.id)
      .single();

    // Redirect to login if user not found
    if (!userData) {
      await supabase.auth.signOut();
      return redirect('/login');
    }

    // Force password reset
    if (userData.must_reset_password && !path.startsWith('/reset-password')) {
      return redirect('/reset-password');
    }

    // Redirect authenticated users away from login/reset-password
    if (path.startsWith('/login') || (path.startsWith('/reset-password') && !userData.must_reset_password)) {
      if (userData.role === 'admin') return redirect('/dashboard');
      if (userData.role === 'management') return redirect('/dashboard/management');
      if (userData.role === 'teacher') return redirect('/dashboard/teacher');
      if (userData.role === 'student') return redirect('/dashboard/student');
      if (userData.role === 'parent') return redirect('/dashboard/parent');
    }

    // Role-based access control
    if (path.startsWith('/dashboard')) {
      if (userData.role === 'admin' && path === '/dashboard') return response;
      if (userData.role === 'management' && path.startsWith('/dashboard/management')) return response;
      if (userData.role === 'teacher' && path.startsWith('/dashboard/teacher')) return response;
      if (userData.role === 'student' && path.startsWith('/dashboard/student')) return response;
      if (userData.role === 'parent' && path.startsWith('/dashboard/parent')) return response;
      
      // Redirect unauthorized dashboard access
      if (userData.role === 'admin') return redirect('/dashboard');
      if (userData.role === 'management') return redirect('/dashboard/management');
      if (userData.role === 'teacher') return redirect('/dashboard/teacher');
      if (userData.role === 'student') return redirect('/dashboard/student');
      if (userData.role === 'parent') return redirect('/dashboard/parent');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
