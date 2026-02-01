import apiClient from "./api-client";

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
    const response = await apiClient.get<UserProfile>("/users/me");
    return response.data;
  },

  /**
   * Cập nhật thông tin profile
   * @param data - Dữ liệu cần cập nhật
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>("/users/me", data);
    return response.data;
  },

  /**
   * Đổi mật khẩu
   * @param data - Mật khẩu cũ và mới
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post("/users/me/change-password", data);
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
    const response = await apiClient.get<Partial<UserProfile>>(`/users/${userId}/public`);
    return response.data;
  },
};
