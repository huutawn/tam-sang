import apiClient from "./api-client";

// KYC Status enum
export type KYCStatus = "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED";

export interface KYCRequest {
  frontImageUrl: string;
  backImageUrl: string;
  selfieImageUrl?: string;
}

export interface KYCResult {
  id: string;
  userId: string;
  status: KYCStatus;
  fullName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const KYCService = {
  /**
   * Gửi yêu cầu xác minh eKYC
   * @param data - Dữ liệu KYC bao gồm các URL ảnh
   */
  submitKYC: async (data: KYCRequest): Promise<KYCResult> => {
    const response = await apiClient.post<KYCResult>("/kyc/submit", data);
    return response.data;
  },

  /**
   * Lấy trạng thái KYC hiện tại của user
   */
  getKYCStatus: async (): Promise<KYCResult | null> => {
    const response = await apiClient.get<KYCResult>("/kyc/status");
    return response.data;
  },

  /**
   * Upload ảnh CMND/CCCD mặt trước
   * @param file - File ảnh để upload
   */
  uploadFrontImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "kyc-front");

    const response = await apiClient.post<{ url: string }>("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  },

  /**
   * Upload ảnh CMND/CCCD mặt sau
   * @param file - File ảnh để upload
   */
  uploadBackImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "kyc-back");

    const response = await apiClient.post<{ url: string }>("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  },
};
