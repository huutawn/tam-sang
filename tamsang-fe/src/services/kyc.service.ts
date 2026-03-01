import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

// KYC Status enum
export type KYCStatus = "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED";

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

export interface KycSubmitResponse {
  kycId: string;
  userId: string;
  status: KYCStatus;
  createdAt: string;
}

export interface ValidKycResponse {
  userId: string;
  isValid: boolean;
  message: string;
  status: string;
  isError: boolean;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const KYCService = {
  /**
   * Gửi yêu cầu xác minh eKYC (upload ảnh CCCD)
   * @param frontImage - File ảnh mặt trước CCCD
   * @param backImage - File ảnh mặt sau CCCD
   */
  submitKYC: async (frontImage: File, backImage: File): Promise<KycSubmitResponse> => {
    const formData = new FormData();
    formData.append("frontImage", frontImage);
    formData.append("backImage", backImage);

    const response = await apiClient.post<ApiResponse<KycSubmitResponse>>(
      API_ENDPOINTS.KYC.SUBMIT,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data.result;
  },

  /**
   * Lấy trạng thái KYC hiện tại của user
   */
  getKYCStatus: async (): Promise<KYCResult | null> => {
    const response = await apiClient.get<KYCResult>(API_ENDPOINTS.KYC.STATUS);
    return response.data;
  },

  /**
   * Kiểm tra KYC có hợp lệ không
   * @param userId - ID của user cần kiểm tra
   */
  checkKycValid: async (userId: string): Promise<ValidKycResponse> => {
    const response = await apiClient.get<ApiResponse<ValidKycResponse>>(
      API_ENDPOINTS.KYC.VALID(userId)
    );
    return response.data.result;
  },
};
