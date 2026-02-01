# Hướng Dẫn Sử Dụng BFF (Backend For Frontend)

## Tổng Quan

Dự án TamSang sử dụng mô hình **BFF (Backend For Frontend)** để bảo vệ Access Token bằng **HttpOnly Cookies**.

### Luồng hoạt động

```
Client (Browser)  →  Next.js BFF (Port 3000)  →  Java Backend (Port 8080)
                      ↑ Đọc token từ Cookie
                      ↓ Đính kèm vào Header
```

---

## Cấu Trúc

### 1. Generic Proxy Route
**File:** `src/app/api/[...path]/route.ts`

Đây là file **duy nhất** bạn cần để chuyển tiếp TẤT CẢ các API từ FE sang BE.

**Cách hoạt động:**
- Client gọi: `GET /api/core/campaigns/featured`
- BFF nhận được `path = ["core", "campaigns", "featured"]`
- BFF chuyển tiếp tới: `http://localhost:8080/core/campaigns/featured`
- BFF tự động đính kèm `Authorization: Bearer <token>` từ Cookie

---

## Cách Sử Dụng

### Bước 1: Định nghĩa Service (FE)

```typescript
// src/services/campaign.service.ts
import apiClient from "./api-client";

export const CampaignService = {
  getFeaturedCampaigns: async () => {
    // Gọi tới BFF, BFF sẽ forward sang BE
    const response = await apiClient.get("/core/campaigns/featured");
    return response.data;
  },
};
```

### Bước 2: Sử dụng trong Component

```tsx
// src/components/features/campaigns/campaign-list.tsx
"use client";

import { useCampaigns } from "@/hooks/use-campaigns";

export function CampaignList() {
  const { data, isLoading } = useCampaigns();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {data?.map(campaign => (
        <div key={campaign.id}>{campaign.title}</div>
      ))}
    </div>
  );
}
```

---

## Public vs Protected Endpoints

### Public Endpoints (Không cần token)
Các endpoint này ai cũng có thể gọi mà không cần đăng nhập:

```typescript
// src/app/api/[...path]/route.ts
const PUBLIC_ENDPOINTS = [
  "/core/campaigns/featured",
  "/core/campaigns/public",
  "/core/statistics/impact",
];
```

**Ví dụ:**
```typescript
// Không cần đăng nhập
CampaignService.getFeaturedCampaigns(); // ✅ OK
```

### Protected Endpoints (Cần token)
Các endpoint này yêu cầu user phải đăng nhập:

```typescript
// Cần đăng nhập
CampaignService.getMyCampaigns(); // ✅ Tự động lấy token từ Cookie
```

Nếu chưa đăng nhập, BFF sẽ trả về:
```json
{
  "success": false,
  "message": "Unauthorized - No access token",
  "status": 401
}
```

---

## Thêm Endpoint Mới

### Nếu endpoint là Public:
Thêm vào danh sách `PUBLIC_ENDPOINTS` trong 2 file:

1. **`src/app/api/[...path]/route.ts`**
2. **`src/lib/constants.ts`**

```typescript
const PUBLIC_ENDPOINTS = [
  "/core/campaigns/featured",
  "/core/campaigns/public",
  "/core/statistics/impact",
  "/core/users/public",  // ← Thêm mới
];
```

### Nếu endpoint cần Auth:
Không cần làm gì cả! BFF sẽ tự động đính kèm token.

---

## Xử Lý Lỗi

### 401 Unauthorized
Khi token hết hạn, `api-client.ts` sẽ tự động:
1. Gọi `/api/auth/refresh` để làm mới token
2. Retry lại request ban đầu
3. Nếu refresh thất bại → Logout user

### 500 Internal Server Error
BFF sẽ log lỗi ra console và trả về:
```json
{
  "success": false,
  "message": "Internal Server Error",
  "error": "Chi tiết lỗi"
}
```

---

## Best Practices

### ✅ Nên làm
- Luôn gọi API qua BFF (`/api/core/...`)
- Định nghĩa TypeScript types trong `/types`
- Sử dụng TanStack Query hooks để cache dữ liệu

### ❌ Không nên làm
- **Không** gọi trực tiếp tới `localhost:8080` từ Client
- **Không** lưu token vào `localStorage`
- **Không** tự tay thêm header `Authorization` ở FE

---

## Ví Dụ Hoàn Chỉnh

### 1. Tạo Service
```typescript
// src/services/donation.service.ts
import apiClient from "./api-client";

export const DonationService = {
  create: async (data: { campaignId: string; amount: number }) => {
    const response = await apiClient.post("/core/donations", data);
    return response.data;
  },
};
```

### 2. Tạo Hook
```typescript
// src/hooks/use-donations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DonationService } from "@/services/donation.service";

export function useCreateDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DonationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
```

### 3. Sử dụng trong Component
```tsx
// src/components/features/donations/donation-form.tsx
"use client";

import { useCreateDonation } from "@/hooks/use-donations";
import { Button } from "@/components/ui/button";

export function DonationForm({ campaignId }: { campaignId: string }) {
  const createDonation = useCreateDonation();

  const handleDonate = () => {
    createDonation.mutate({ campaignId, amount: 100000 });
  };

  return (
    <Button onClick={handleDonate} disabled={createDonation.isPending}>
      {createDonation.isPending ? "Đang xử lý..." : "Quyên góp 100.000đ"}
    </Button>
  );
}
```

---

## Debugging

### Kiểm tra request đi qua BFF
Mở DevTools → Network → Xem request tới `/api/core/...`

### Kiểm tra Cookie
DevTools → Application → Cookies → `access_token`

**Lưu ý:** Bạn sẽ **không thể** đọc giá trị của `access_token` vì nó là HttpOnly.

### Log ở BFF
Mở terminal chạy `npm run dev`, mọi lỗi sẽ hiện ở đây:
```
BFF Proxy Error: fetch failed
```

---

## Câu Hỏi Thường Gặp

### Q: Tại sao không gọi thẳng tới Backend?
**A:** Vì token được lưu trong HttpOnly Cookie, JavaScript không thể đọc được để đính kèm vào Header.

### Q: Latency có bị tăng không?
**A:** Có, nhưng rất nhỏ (~1ms) vì BFF và Backend thường nằm cùng mạng nội bộ.

### Q: Có thể dùng cho file upload không?
**A:** Có! Chỉ cần thay đổi `Content-Type` thành `multipart/form-data` trong BFF.

---

## Kết Luận

Mô hình BFF giúp TamSang đạt được:
- ✅ **Bảo mật tối đa:** Token không bao giờ bị lộ ra ngoài
- ✅ **Code sạch:** FE không cần quan tâm token
- ✅ **Dễ bảo trì:** Chỉ cần 1 file proxy cho tất cả API

Nếu có thắc mắc, hãy tham khảo `DEVELOPMENT_GUIDE.md` hoặc liên hệ team leader.
