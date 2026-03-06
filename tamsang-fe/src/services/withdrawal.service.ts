import apiClient from "./api-client";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "WAITING_PROOF";

export type WithdrawalType = "STANDARD" | "QUICK";

export interface Withdrawal {
  id: string;
  campaignId: string;
  campaignTitle: string;
  organizerId: string;
  amount: number;
  reason: string;
  type: WithdrawalType;
  status: WithdrawalStatus;
  selfieImageUrl?: string;
  faceVerificationStatus?: string;
  faceVerificationScore?: number;
  proofCount: number;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalRequest {
  campaignId: string;
  amount: number;
  reason: string;
  type?: WithdrawalType;
  quick?: boolean;
  selfieImageUrl: string;
}

export const WithdrawalService = {
  /**
   * Lấy danh sách yêu cầu rút tiền theo campaign
   */
  getWithdrawals: async (
    params: { campaignId: string; status?: string }
  ): Promise<Withdrawal[]> => {
    const response = await apiClient.get<{ result: Withdrawal[] }>("/core/withdrawals", {
      params,
    });
    return response.data.result;
  },

  /**
   * Lấy chi tiết một yêu cầu rút tiền
   */
  getWithdrawalById: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.get<{ result: Withdrawal }>(`/core/withdrawals/${id}`);
    return response.data.result;
  },

  /**
   * Tạo yêu cầu rút tiền mới
   */
  createWithdrawal: async (data: CreateWithdrawalRequest): Promise<Withdrawal> => {
    const response = await apiClient.post<{ result: Withdrawal }>("/core/withdrawals", data);
    return response.data.result;
  },

  /**
   * (Admin) Duyệt yêu cầu rút tiền
   */
  approveWithdrawal: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.put<{ result: Withdrawal }>(`/core/withdrawals/${id}/approve`);
    return response.data.result;
  },

  /**
   * (Admin) Từ chối yêu cầu rút tiền
   */
  rejectWithdrawal: async (id: string, reason: string): Promise<Withdrawal> => {
    const response = await apiClient.put<{ result: Withdrawal }>(`/core/withdrawals/${id}/reject`, {
      reason,
    });
    return response.data.result;
  },
};
