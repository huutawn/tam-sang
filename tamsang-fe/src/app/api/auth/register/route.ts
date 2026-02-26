import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password } = body;

    // Gọi BE: POST /identity/users (theo endpoint.md)
    const backendRes = await fetch(`${BACKEND_URL}/identity/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName,
        phone,
      }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || data.code !== 1000) {
      return NextResponse.json(
        { success: false, message: data.message || 'Đăng ký thất bại' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công',
    });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
