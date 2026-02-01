import apiClient from "./api-client";

export type ProofStatus = "PENDING" | "VERIFIED" | "REJECTED" | "AI_PROCESSING";

export type ProofType = "RECEIPT" | "INVOICE" | "PHOTO" | "VIDEO" | "DOCUMENT" | "OTHER";

export interface Proof {
  id: string;
  withdrawalId: string;
  type: ProofType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  description?: string;
  status: ProofStatus;
  aiVerificationScore?: number;
  aiVerificationDetails?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProofRequest {
  withdrawalId: string;
  type: ProofType;
  file: File;
  description?: string;
}

export interface ProofVerificationResult {
  proofId: string;
  isValid: boolean;
  score: number;
  details: string;
  verifiedAt: string;
}

export const ProofService = {
  /**
   * Upload bằng chứng chi tiêu cho một withdrawal
   * @param data - Dữ liệu bao gồm file và metadata
   */
  uploadProof: async (data: UploadProofRequest): Promise<Proof> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("withdrawalId", data.withdrawalId);
    formData.append("type", data.type);
    if (data.description) {
      formData.append("description", data.description);
    }

    const response = await apiClient.post<Proof>("/proofs/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Lấy danh sách bằng chứng của một withdrawal
   * @param withdrawalId - ID của withdrawal
   */
  getProofsByWithdrawal: async (withdrawalId: string): Promise<Proof[]> => {
    const response = await apiClient.get<Proof[]>(`/proofs/withdrawal/${withdrawalId}`);
    return response.data;
  },

  /**
   * Lấy chi tiết một proof
   * @param proofId - ID của proof
   */
  getProofById: async (proofId: string): Promise<Proof> => {
    const response = await apiClient.get<Proof>(`/proofs/${proofId}`);
    return response.data;
  },

  /**
   * Xóa một proof (chỉ khi status = PENDING)
   * @param proofId - ID của proof cần xóa
   */
  deleteProof: async (proofId: string): Promise<void> => {
    await apiClient.delete(`/proofs/${proofId}`);
  },

  /**
   * Lấy kết quả xác minh AI của proof
   * @param proofId - ID của proof
   */
  getVerificationResult: async (proofId: string): Promise<ProofVerificationResult> => {
    const response = await apiClient.get<ProofVerificationResult>(
      `/proofs/${proofId}/verification`
    );
    return response.data;
  },

  /**
   * (Admin) Xác minh thủ công một proof
   * @param proofId - ID của proof
   * @param approved - Duyệt hay từ chối
   * @param reason - Lý do (bắt buộc nếu từ chối)
   */
  manualVerify: async (
    proofId: string,
    approved: boolean,
    reason?: string
  ): Promise<Proof> => {
    const response = await apiClient.post<Proof>(`/proofs/${proofId}/verify`, {
      approved,
      reason,
    });
    return response.data;
  },
};
