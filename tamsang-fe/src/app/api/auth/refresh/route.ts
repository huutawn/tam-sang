import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken || !accessToken) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
    return NextResponse.json({ success: false, message: 'Không có token' }, { status: 401 });
  }

  try {
    // Gọi BE: POST /identity/auth/refresh (theo endpoint.md)
    // Body: { token: accessToken, refreshToken: refreshToken }
    const backendRes = await fetch(`${BACKEND_URL}/identity/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: accessToken, refreshToken }),
    });

    if (!backendRes.ok) {
      cookieStore.delete(ACCESS_TOKEN_COOKIE);
      cookieStore.delete(REFRESH_TOKEN_COOKIE);
      return NextResponse.json({ success: false, message: 'Làm mới token thất bại' }, { status: 401 });
    }

    const data = await backendRes.json();
    // BE trả về: { result: { token, refreshToken, expiryTime } }
    const { token: newToken, refreshToken: newRefreshToken } = data.result;

    cookieStore.set(ACCESS_TOKEN_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 giờ
    });

    if (newRefreshToken) {
      cookieStore.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 ngày
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống' }, { status: 500 });
  }
}
