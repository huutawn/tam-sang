import apiClient from "./api-client";

export type AiStatus = "PROCESSING" | "VERIFIED" | "REJECTED";

export interface Proof {
  id: string;
  withdrawalRequestId: string;
  billImageUrls: string[];
  sceneImageUrls: string[];
  description?: string;
  aiStatus: AiStatus;
  aiScore?: number;
  aiAnalysis?: string;
  createdAt: string;
}

export interface UploadProofRequest {
  withdrawalRequestId: string;
  billImages: File[];
  sceneImages: File[];
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
   * Gửi multipart form với billImages[] + sceneImages[] + description
   */
  uploadProof: async (data: UploadProofRequest): Promise<Proof> => {
    const formData = new FormData();
    formData.append("withdrawalRequestId", data.withdrawalRequestId);

    if (data.billImages) {
      data.billImages.forEach((file) => {
        formData.append("billImages", file);
      });
    }

    if (data.sceneImages) {
      data.sceneImages.forEach((file) => {
        formData.append("sceneImages", file);
      });
    }

    if (data.description) {
      formData.append("description", data.description);
    }

    const response = await apiClient.post<{ result: Proof }>("/core/proofs", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.result;
  },

  /**
   * Lấy danh sách bằng chứng của một withdrawal
   */
  getProofsByWithdrawal: async (withdrawalId: string): Promise<Proof[]> => {
    const response = await apiClient.get<{ result: Proof[] }>("/core/proofs", {
      params: { withdrawalId },
    });
    return response.data.result;
  },

  /**
   * Lấy chi tiết một proof
   */
  getProofById: async (proofId: string): Promise<Proof> => {
    const response = await apiClient.get<{ result: Proof }>(`/core/proofs/${proofId}`);
    return response.data.result;
  },
};
