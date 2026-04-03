import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedPaths = new Set([
  '/',
  '/login',
  '/register',
  '/auth/mfa',
  '/auth/success',
  '/dashboard',
  '/dashboard/settings',
  '/dashboard/users',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (!allowedPaths.has(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('reset', '1');
    redirectUrl.searchParams.set('reason', 'invalid-path');
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
