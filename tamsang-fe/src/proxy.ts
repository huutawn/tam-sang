import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwt } from 'jose';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, UserPayload } from './lib/auth-utils';
import { protectedRoutes, publicRoutes, roleRoutes } from './lib/routes-config';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // 1. Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  
  // 2. Determine Authentication Status
  let user: UserPayload | null = null;
  if (accessToken) {
    try {
        const decoded = decodeJwt(accessToken);
        // Simple expiry check (in seconds)
        if (decoded.exp && decoded.exp * 1000 > Date.now()) {
            user = decoded as unknown as UserPayload;
        }
    } catch (e) {
        // Token invalid/expired
    }
  }

  // 3. Handle Protected Routes
  if (isProtectedRoute) {
    if (!user) {
        // If we have a refresh token but no valid access token, we might want to let the client logic handle the refresh
        // OR we can try to refresh here. For simplicity in BFF pattern often the CLIENT handles the 401 via interceptor
        // So we redirect to login, but if it's an API route we return 401.
        
        // HOWEVER, for page navigation, we want to redirect to login.
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.url));
        return NextResponse.redirect(url);
    }
    
  
    if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
         return NextResponse.redirect(new URL('/', request.url)); // Forbidden
    }
    if (pathname.startsWith('/campaign-manager') && user.role !== 'ORGANIZER') {
         return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 5. Redirect Authenticated Users away from Login/Register
  if (publicRoutes.includes(pathname) && user) {
     if (pathname === '/login' || pathname === '/register') {
         // Redirect to their dashboard
         const target = roleRoutes[user.role] || '/';
         return NextResponse.redirect(new URL(target, request.url));
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
