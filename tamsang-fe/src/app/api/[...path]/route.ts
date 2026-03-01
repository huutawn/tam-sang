import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-utils";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// Danh sách các endpoint KHÔNG cần token (public endpoints)
// Lưu ý: Path ở đây là KHÔNG bao gồm /api prefix
const PUBLIC_ENDPOINTS = [
  "/campaigns/featured",
  "/campaigns/public",
  "/statistics/impact",
  "/statistics/global",
  "/core/donations/recent",
  "/core/campaigns",
];

/**
 * Generic BFF Proxy - Chuyển tiếp mọi request từ FE sang BE
 * Tự động đính kèm Access Token từ HttpOnly Cookie
 * 
 * Luồng:
 * FE gọi: GET /api/campaigns/featured
 * BFF nhận: path = ["campaigns", "featured"]
 * BFF forward: GET http://localhost:8080/api/campaigns/featured
 */
async function handleRequest(
  request: NextRequest,
  method: string,
  pathSegments: string[]
) {
  try {
    // Xây dựng đường dẫn đầy đủ (KHÔNG BAO GỒM /api prefix vì Gateway tự định tuyến theo service name)
    const path = pathSegments.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const backendPath = `${BACKEND_URL}/${path}${searchParams ? `?${searchParams}` : ""}`;

    // Kiểm tra xem endpoint có cần token không
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      `/${path}`.startsWith(endpoint)
    );

    // Lấy token từ Cookie (nếu cần)
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    // Nếu endpoint cần auth mà không có token -> trả lỗi 401
    if (!isPublicEndpoint && !accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - No access token" },
        { status: 401 }
      );
    }

    // Chuẩn bị headers
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    
    if (contentType) {
      headers.set("content-type", contentType);
    }

    // Đính kèm token nếu có
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    // Xử lý Body (Hỗ trợ cả JSON, FormData, Multipart...)
    let body: any = undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      // Nếu là multipart/form-data (upload file), ta lấy raw body để forward
      // Không dùng request.json() vì sẽ lỗi nếu không phải JSON
      if (contentType?.includes("multipart/form-data")) {
        body = await request.blob();
      } else {
        // Với JSON hoặc các loại text khác
        const textData = await request.text();
        if (textData) body = textData;
      }
    }

    // Gọi tới Backend
    const backendResponse = await fetch(backendPath, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    // Kiểm tra xem phản hồi có phải là JSON không
    const responseContentType = backendResponse.headers.get("content-type");
    if (responseContentType?.includes("application/json")) {
      const data = await backendResponse.json();
      return NextResponse.json(data, { status: backendResponse.status });
    } else {
      // Nếu Backend trả về file, text hoặc các loại khác
      const data = await backendResponse.blob();
      return new NextResponse(data, { 
        status: backendResponse.status,
        headers: { "content-type": responseContentType || "application/octet-stream" }
      });
    }
  } catch (error) {
    console.error("BFF Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Export các HTTP methods
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, "GET", path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, "POST", path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, "PUT", path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, "PATCH", path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleRequest(request, "DELETE", path);
}
