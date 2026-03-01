// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8080",
  TIMEOUT: 30000,
} as const;

// Public Endpoints (không cần token)
// Lưu ý: Không bao gồm /api prefix
export const PUBLIC_ENDPOINTS = [
  "/core/campaigns/featured",
  "/core/campaigns/public",
  "/core/statistics/impact",
  "/core/statistics/global",
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/identity/auth/login",
    LOGOUT: "/identity/auth/logout",
    REFRESH: "/identity/auth/refresh",
    REGISTER: "/identity/auth/register",
  },
  // Users
  USERS: {
    ME: "/identity/users/me",
    ME_KYC: "/identity/users/me/kyc",
    PROFILE: (id: string) => `/identity/users/${id}`,
    PUBLIC: (id: string) => `/identity/users/${id}/public`,
    CHANGE_PASSWORD: "/identity/users/me/change-password",
  },
  // Campaigns
  CAMPAIGNS: {
    LIST: "/core/campaigns",
    DETAIL: (id: string) => `/core/campaigns/${id}`,
    FEATURED: "/core/campaigns/featured",
    MY_CAMPAIGNS: "/core/campaigns/me",
    CREATE: "/core/campaigns",
    UPDATE: (id: string) => `/core/campaigns/${id}`,
    DELETE: (id: string) => `/core/campaigns/${id}`,
    STATS: (id: string) => `/core/campaigns/${id}/stats`,
    ACTIVITIES: (id: string) => `/core/campaigns/${id}/activities`,
  },
  // Donations
  DONATIONS: {
    RECENT: "/core/donations/recent",
  },
  // KYC
  KYC: {
    SUBMIT: "/identity/kyc/submit",
    STATUS: "/identity/kyc/status",
    VALID: (userId: string) => `/identity/kyc/valid/${userId}`,
  },
  // Withdrawals
  WITHDRAWALS: {
    LIST: "/core/withdrawals",
    DETAIL: (id: string) => `/core/withdrawals/${id}`,
    MY_WITHDRAWALS: "/core/withdrawals/me",
    CREATE: "/core/withdrawals",
    APPROVE: (id: string) => `/core/withdrawals/${id}/approve`,
    REJECT: (id: string) => `/core/withdrawals/${id}/reject`,
  },
  // Proofs
  PROOFS: {
    UPLOAD: "/core/proofs/upload",
    BY_WITHDRAWAL: (id: string) => `/core/proofs/withdrawal/${id}`,
    DETAIL: (id: string) => `/core/proofs/${id}`,
    VERIFY: (id: string) => `/core/proofs/${id}/verify`,
    VERIFICATION: (id: string) => `/core/proofs/${id}/verification`,
  },
  // Files
  FILES: {
    UPLOAD: "/files/upload",
  },
  // Statistics
  STATISTICS: {
    IMPACT: "/statistics/impact",
    GLOBAL: "/statistics/global",
  },
} as const;

// App Routes
export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  CAMPAIGNS: "/campaigns",
  CAMPAIGN_DETAIL: (slug: string) => `/campaigns/${slug}`,
  ABOUT: "/about",
  PROFILE: "/profile",
  // Donor
  DONOR: {
    DASHBOARD: "/profile",
    DONATIONS: "/profile/donations",
    SETTINGS: "/profile/settings",
  },
  // Organizer
  ORGANIZER: {
    DASHBOARD: "/campaign-manager",
    CAMPAIGNS: "/campaign-manager/campaigns",
    CREATE: "/campaign-manager/campaigns/create",
    WITHDRAWALS: "/campaign-manager/withdrawals",
  },
  // Admin
  ADMIN: {
    DASHBOARD: "/admin",
    USERS: "/admin/users",
    CAMPAIGNS: "/admin/campaigns",
    WITHDRAWALS: "/admin/withdrawals",
    KYC: "/admin/kyc",
    REPORTS: "/admin/reports",
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOC_TYPES: ["application/pdf", "image/jpeg", "image/png"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm"],
} as const;

// Campaign Categories (Vietnamese)
export const CAMPAIGN_CATEGORIES = [
  { value: "EDUCATION", label: "Giáo dục" },
  { value: "HEALTHCARE", label: "Y tế" },
  { value: "DISASTER_RELIEF", label: "Cứu trợ thiên tai" },
  { value: "ENVIRONMENT", label: "Môi trường" },
  { value: "COMMUNITY", label: "Cộng đồng" },
  { value: "CHILDREN", label: "Trẻ em" },
  { value: "ELDERLY", label: "Người cao tuổi" },
  { value: "OTHER", label: "Khác" },
] as const;

// Status Labels (Vietnamese)
export const STATUS_LABELS = {
  // Campaign Status
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  REJECTED: "Bị từ chối",
  // Withdrawal Status
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  PROCESSING: "Đang xử lý",
  FAILED: "Thất bại",
  // KYC Status
  VERIFIED: "Đã xác minh",
  // Proof Status
  AI_PROCESSING: "AI đang xử lý",
} as const;

// Role Labels (Vietnamese)
export const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  ORGANIZER: "Nhà tổ chức",
  DONOR: "Nhà hảo tâm",
} as const;
