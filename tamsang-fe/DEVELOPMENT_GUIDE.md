# Hướng Dẫn Phát Triển TamSang Frontend

## Mục Lục
1. [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
2. [Quy Trình Tạo Page Mới](#quy-trình-tạo-page-mới)
3. [Quy Trình Tạo Service Mới](#quy-trình-tạo-service-mới)
4. [Quy Trình Tạo Hook Mới](#quy-trình-tạo-hook-mới)
5. [Xử Lý Authentication](#xử-lý-authentication)
6. [Best Practices](#best-practices)

---

## Cấu Trúc Dự Án

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route group cho auth pages
│   │   └── login/
│   ├── api/               # BFF Route Handlers
│   │   └── auth/
│   ├── globals.css        # Global styles & theme
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
│
├── components/
│   ├── layout/            # Header, Footer, AppLayout
│   ├── features/          # Components theo domain
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── landing/
│   │   └── ...
│   └── ui/                # shadcn/ui components
│
├── hooks/                 # Custom hooks (TanStack Query)
│   ├── use-auth.ts
│   └── use-campaigns.ts
│
├── lib/                   # Utilities
│   ├── auth-utils.ts
│   ├── constants.ts
│   ├── routes-config.ts
│   └── utils.ts
│
├── services/              # API calls (Axios)
│   ├── api-client.ts
│   ├── auth-service.ts
│   ├── campaign.service.ts
│   └── ...
│
├── store/                 # Zustand stores
│   └── auth-store.ts
│
├── types/                 # TypeScript interfaces
│   ├── index.ts
│   ├── campaign.types.ts
│   └── ...
│
└── middleware.ts          # Route protection
```

---

## Quy Trình Tạo Page Mới

### Bước 1: Tạo Route
Tạo thư mục và file trong `/app`:

```bash
# Ví dụ: Tạo trang chi tiết chiến dịch
src/app/campaigns/[slug]/page.tsx
```

### Bước 2: Tạo Page Component

```tsx
// src/app/campaigns/[slug]/page.tsx
import { AppLayout } from "@/components/layout";
import { CampaignDetail } from "@/components/features/campaigns/campaign-detail";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <AppLayout>
      <CampaignDetail slug={slug} />
    </AppLayout>
  );
}
```

### Bước 3: Tạo Feature Component
Tạo component trong `/components/features/<domain>`:

```tsx
// src/components/features/campaigns/campaign-detail.tsx
"use client";

import { useCampaignBySlug } from "@/hooks/use-campaigns";
import { Skeleton } from "@/components/ui/skeleton";

interface CampaignDetailProps {
  slug: string;
}

export function CampaignDetail({ slug }: CampaignDetailProps) {
  const { data: campaign, isLoading, error } = useCampaignBySlug(slug);

  if (isLoading) return <CampaignSkeleton />;
  if (error) return <ErrorMessage />;

  return (
    <div className="container py-8">
      <h1>{campaign?.title}</h1>
      {/* ... */}
    </div>
  );
}
```

### Bước 4: Cập nhật Routes Config (nếu cần protect)
Thêm route vào `/lib/routes-config.ts`:

```ts
export const protectedRoutes = [
  '/profile',
  '/dashboard',
  '/campaigns/create',  // <- Thêm nếu cần auth
];
```

---

## Quy Trình Tạo Service Mới

### Bước 1: Định nghĩa Types
Tạo file trong `/types`:

```ts
// src/types/donation.types.ts
export interface Donation {
  id: string;
  amount: number;
  campaignId: string;
  donorId: string;
  message?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface CreateDonationRequest {
  campaignId: string;
  amount: number;
  message?: string;
  isAnonymous?: boolean;
}
```

### Bước 2: Tạo Service
Tạo file trong `/services`:

```ts
// src/services/donation.service.ts
import apiClient from "./api-client";
import type { Donation, CreateDonationRequest } from "@/types";

export const DonationService = {
  create: async (data: CreateDonationRequest): Promise<Donation> => {
    const response = await apiClient.post<Donation>("/donations", data);
    return response.data;
  },

  getByUser: async (): Promise<Donation[]> => {
    const response = await apiClient.get<Donation[]>("/donations/me");
    return response.data;
  },
};
```

### Bước 3: Export từ types/index.ts

```ts
// src/types/index.ts
export * from "./donation.types";
```

---

## Quy Trình Tạo Hook Mới

### Bước 1: Tạo Hook với TanStack Query

```ts
// src/hooks/use-donations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DonationService } from "@/services/donation.service";
import type { CreateDonationRequest } from "@/types";

// Query hook
export function useMyDonations() {
  return useQuery({
    queryKey: ["donations", "me"],
    queryFn: DonationService.getByUser,
  });
}

// Mutation hook
export function useCreateDonation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDonationRequest) => DonationService.create(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
```

### Bước 2: Sử dụng trong Component

```tsx
"use client";

import { useMyDonations, useCreateDonation } from "@/hooks/use-donations";

export function DonationForm({ campaignId }: { campaignId: string }) {
  const { data: donations } = useMyDonations();
  const createDonation = useCreateDonation();

  const handleSubmit = (amount: number) => {
    createDonation.mutate({ campaignId, amount });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(100000); }}>
      <button disabled={createDonation.isPending}>
        {createDonation.isPending ? "Đang xử lý..." : "Quyên góp"}
      </button>
    </form>
  );
}
```

---

## Xử Lý Authentication

### Luồng Login (BFF Pattern)

```
Client                    BFF (Next.js)              Backend
  |                           |                         |
  |------ POST /api/auth/login ----------------------->|
  |                           |                         |
  |                           |<--- tokens -------------|
  |                           |                         |
  |<-- Set HttpOnly Cookies --|                         |
  |                           |                         |
  |<-- { success: true } -----|                         |
```

### Sử dụng Authentication

```tsx
"use client";

import { useAuthStore } from "@/store/auth-store";
import { useLogin, useLogout } from "@/hooks/use-auth";

export function AuthExample() {
  const { user, isAuthenticated } = useAuthStore();
  const login = useLogin();
  const logout = useLogout();

  if (isAuthenticated) {
    return (
      <div>
        <p>Xin chào, {user?.email}</p>
        <button onClick={() => logout.mutate()}>Đăng xuất</button>
      </div>
    );
  }

  return (
    <button onClick={() => login.mutate({ email: "...", password: "..." })}>
      Đăng nhập
    </button>
  );
}
```

---

## Best Practices

### 1. Sử dụng AppLayout cho mọi trang public

```tsx
// ✅ Đúng
export default function SomePage() {
  return (
    <AppLayout>
      <YourContent />
    </AppLayout>
  );
}

// ❌ Sai – thiếu Header/Footer
export default function SomePage() {
  return <YourContent />;
}
```

### 2. Tách biệt Server và Client Components

```tsx
// page.tsx (Server Component - có thể fetch data)
import { ClientComponent } from "./client-component";

export default async function Page() {
  const data = await fetchData(); // Server-side
  return <ClientComponent initialData={data} />;
}

// client-component.tsx
"use client";
export function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  // Interactive logic
}
```

### 3. Sử dụng Skeleton khi loading

```tsx
import { Skeleton } from "@/components/ui/skeleton";

if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

### 4. Format tiền tệ VND

```ts
// src/lib/utils.ts
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Sử dụng
formatVND(1000000); // "1.000.000 ₫"
```

### 5. Xử lý Error với Error Boundary

```tsx
// src/app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container py-12 text-center">
      <h2>Đã có lỗi xảy ra!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button onClick={reset}>Thử lại</button>
    </div>
  );
}
```

---

## Liên Hệ

Nếu có thắc mắc, vui lòng liên hệ team leader hoặc tạo issue trên GitHub repository.
