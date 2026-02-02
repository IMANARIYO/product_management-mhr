import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './src/lib/auth';

export async function middleware(request: NextRequest) {
  // Check if the request is for a dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      // Redirect to login if no token
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = await verifyJWT(token);
      if (!payload) {
        // Redirect to login if token is invalid
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      // Redirect to login if token verification fails
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};