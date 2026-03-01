import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export type UserRole = "ADMIN" | "ORGANIZER" | "DONOR";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isKYCVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KycProfile {
  kycId: string;
  frontImageUrl: string;
  backImageUrl: string;
  fullName: string;
  dob: string;
  idNumber: string;
  idType: string;
  address: string;
  status: string;
  rejectionReason: string;
}

export interface UserWithKycResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isBlackList: boolean;
  ICHash: string;
  KycStatus: string;
  roles: Array<{ name: string }>;
  kycProfile: KycProfile | null;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const UserService = {
  /**
   * Lấy thông tin profile của user hiện tại
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>(API_ENDPOINTS.USERS.ME);
    return response.data;
  },

  /**
   * Lấy thông tin profile kèm KYC của user hiện tại
   */
  getMyProfileWithKyc: async (): Promise<UserWithKycResponse> => {
    const response = await apiClient.get<ApiResponse<UserWithKycResponse>>(
      API_ENDPOINTS.USERS.ME_KYC
    );
    return response.data.result;
  },

  /**
   * Cập nhật thông tin profile
   * @param data - Dữ liệu cần cập nhật
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>(API_ENDPOINTS.USERS.ME, data);
    return response.data;
  },

  /**
   * Đổi mật khẩu
   * @param data - Mật khẩu cũ và mới
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.USERS.CHANGE_PASSWORD, data);
  },

  /**
   * Upload avatar mới
   * @param file - File ảnh avatar
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");

    const response = await apiClient.post<{ url: string }>("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  },

  /**
   * Lấy thông tin public của một user khác
   * @param userId - ID của user cần xem
   */
  getPublicProfile: async (userId: string): Promise<Partial<UserProfile>> => {
    const response = await apiClient.get<Partial<UserProfile>>(API_ENDPOINTS.USERS.PUBLIC(userId));
    return response.data;
  },
};
