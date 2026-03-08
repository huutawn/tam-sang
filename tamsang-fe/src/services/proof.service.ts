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
  upvoteCount?: number;
  reportCount?: number;
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

import { FileService } from "./file.service";

export const ProofService = {
  /**
   * Upload bằng chứng chi tiêu cho một withdrawal
   * Tải ảnh lên file-service trước, lấy URLs, sau đó gửi URLs lên core-service
   */
  uploadProof: async (data: UploadProofRequest): Promise<Proof> => {
    // 1. Upload files to File-Service
    let billImageUrls: string[] = [];
    if (data.billImages && data.billImages.length > 0) {
      billImageUrls = await FileService.uploadBatch(data.billImages);
    }

    let sceneImageUrls: string[] = [];
    if (data.sceneImages && data.sceneImages.length > 0) {
      sceneImageUrls = await FileService.uploadBatch(data.sceneImages);
    }

    // 2. Send URLs to Core-Service
    const payload = {
      withdrawalRequestId: data.withdrawalRequestId,
      billImageUrls,
      sceneImageUrls,
      description: data.description,
    };

    const response = await apiClient.post<{ result: Proof }>(
      "/core/proofs",
      payload
    );

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

  /**
   * Đồng tình với bằng chứng
   */
  upvoteProof: async (proofId: string): Promise<Proof> => {
    const response = await apiClient.put<{ result: Proof }>(`/core/proofs/${proofId}/upvote`);
    return response.data.result;
  },

  /**
   * Báo cáo bằng chứng
   */
  reportProof: async (proofId: string): Promise<Proof> => {
    const response = await apiClient.put<{ result: Proof }>(`/core/proofs/${proofId}/report`);
    return response.data.result;
  },
};
