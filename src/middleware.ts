import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
      console.error('[BOOT] NEXTAUTH_SECRET is absolutely required for Middleware security. Edge function continuing without auth.');
  }
  // Use NextAuth to decrypt the session token
  const token = secret ? await getToken({ req: request, secret }) : null;
  const { pathname } = request.nextUrl;



  // 2. Protect Authenticated Routes
  // Routes only regular users should use. Admins are redirected away from these to /admin.
  // Note: /trade/:id is intentionally NOT in this list — admins need forensic access to
  // individual trade hubs to investigate disputes and flagged transactions.
  const USER_ONLY_PREFIXES = [
     '/dashboard',
     '/wallet',
     '/create-trade',
     '/profile',
     '/kyc',
     '/marketplace',
     '/transactions',
  ];
  const isUserOnlyRoute = USER_ONLY_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isTradeRoute = pathname === '/trade' || pathname.startsWith('/trade/');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isProtectedRoute = isUserOnlyRoute || isTradeRoute || isAdminRoute;

  if (isProtectedRoute && !token) {
    // If user tries to access a protected route without a token, bounce to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2a. Role-based isolation
  // - Admins must NOT wander into user-only pages (redirect → /admin)
  //   but CAN view /trade/:id for forensic review.
  // - Non-admins must NOT enter the admin panel (redirect → /dashboard)
  if (token) {
     const role = (token as any).role;
     const isAdmin = role === 'admin';
     if (isAdmin && isUserOnlyRoute) {
        return NextResponse.redirect(new URL('/admin', request.url));
     }
     if (!isAdmin && isAdminRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
     }
  }

  // 3. Prevent logged-in users from viewing Login/Register pages
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  
  if (isAuthRoute && token) {
    // Admins land on /admin, everyone else on /dashboard
    const role = (token as any).role;
    const dest = role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

// Optimization: Only run middleware on pages, not API routes or static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
