import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  // Gọi BE logout để invalidate token (theo endpoint.md: POST /identity/auth/logout)
  if (accessToken) {
    try {
      await fetch(`${BACKEND_URL}/identity/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      });
    } catch (error) {
      console.error('Backend logout error:', error);
      // Vẫn tiếp tục xóa cookie dù BE lỗi
    }
  }

  // Xóa cookies
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);

  return NextResponse.json({ success: true });
}
