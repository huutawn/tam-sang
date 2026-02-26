import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, parseJwt } from '@/lib/auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Gọi BE: POST /identity/auth/token (theo endpoint.md)
    const backendRes = await fetch(`${BACKEND_URL}/identity/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || data.code !== 1000) {
      return NextResponse.json(
        { success: false, message: data.message || 'Thông tin đăng nhập không hợp lệ' },
        { status: 401 }
      );
    }

    // BE trả về: { code, message, result: { token, refreshToken, expiryTime } }
    const { token, refreshToken } = data.result;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Không nhận được token từ server' },
        { status: 500 }
      );
    }

    // Decode JWT để lấy thông tin user (sub, email, role)
    const userPayload = parseJwt(token);

    // Lưu tokens vào HttpOnly Cookie
    const cookieStore = await cookies();

    cookieStore.set(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 giờ
    });

    if (refreshToken) {
      cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 ngày
      });
    }

    // Trả về thông tin user cho FE store (Zustand)
    return NextResponse.json({
      success: true,
      user: userPayload,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
