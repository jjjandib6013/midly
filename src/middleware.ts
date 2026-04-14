import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Use NextAuth to decrypt the session token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || "default_secret" });
  const { pathname } = request.nextUrl;

  // 1. Immediately redirect marketplace to dashboard (disabled feature)
  if (pathname.startsWith('/marketplace')) {
     return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Protect Authenticated Routes
  const isProtectedRoute = 
     pathname.startsWith('/dashboard') ||
     pathname.startsWith('/wallet') ||
     pathname.startsWith('/create-trade') ||
     pathname.startsWith('/trade') ||
     pathname.startsWith('/profile') ||
     pathname.startsWith('/kyc') ||
     pathname.startsWith('/admin');

  if (isProtectedRoute && !token) {
    // If user tries to access a protected route without a token, bounce to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Prevent logged-in users from viewing Login/Register pages
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
