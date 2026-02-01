import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-utils';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  try {
    // Call Backend to refresh using the refresh token
    const backendRes = await fetch('http://localhost:8080/api/identity/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!backendRes.ok) {
        // If refresh fails, clear cookies
        cookieStore.delete(ACCESS_TOKEN_COOKIE);
        cookieStore.delete(REFRESH_TOKEN_COOKIE);
        return NextResponse.json({ message: 'Refresh failed' }, { status: 401 });
    }

    const data = await backendRes.json();
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data || data;

    cookieStore.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15, 
    });

    // Optional: Update refresh token if rotated
    if (newRefreshToken) {
        cookieStore.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, 
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
     return NextResponse.json({ message: 'Internal Error' }, { status: 500 });
  }
}
