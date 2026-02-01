import apiClient from "./api-client";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface Withdrawal {
  id: string;
  campaignId: string;
  campaignTitle: string;
  organizerId: string;
  amount: number;
  purpose: string;
  status: WithdrawalStatus;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
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
  purpose: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

export interface WithdrawalFilterParams {
  campaignId?: string;
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const WithdrawalService = {
  /**
   * Lấy danh sách yêu cầu rút tiền với phân trang và filter
   * @param params - Tham số filter và phân trang
   */
  getWithdrawals: async (
    params: WithdrawalFilterParams = {}
  ): Promise<PaginatedResponse<Withdrawal>> => {
    const response = await apiClient.get<PaginatedResponse<Withdrawal>>("/withdrawals", {
      params,
    });
    return response.data;
  },

  /**
   * Lấy chi tiết một yêu cầu rút tiền
   * @param id - ID của withdrawal
   */
  getWithdrawalById: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.get<Withdrawal>(`/withdrawals/${id}`);
    return response.data;
  },

  /**
   * Tạo yêu cầu rút tiền mới
   * @param data - Dữ liệu yêu cầu rút tiền
   */
  createWithdrawal: async (data: CreateWithdrawalRequest): Promise<Withdrawal> => {
    const response = await apiClient.post<Withdrawal>("/withdrawals", data);
    return response.data;
  },

  /**
   * Lấy danh sách yêu cầu rút tiền của organizer hiện tại
   */
  getMyWithdrawals: async (
    params: Omit<WithdrawalFilterParams, "organizerId"> = {}
  ): Promise<PaginatedResponse<Withdrawal>> => {
    const response = await apiClient.get<PaginatedResponse<Withdrawal>>("/withdrawals/me", {
      params,
    });
    return response.data;
  },

  /**
   * (Admin) Duyệt yêu cầu rút tiền
   * @param id - ID của withdrawal
   */
  approveWithdrawal: async (id: string): Promise<Withdrawal> => {
    const response = await apiClient.post<Withdrawal>(`/withdrawals/${id}/approve`);
    return response.data;
  },

  /**
   * (Admin) Từ chối yêu cầu rút tiền
   * @param id - ID của withdrawal
   * @param reason - Lý do từ chối
   */
  rejectWithdrawal: async (id: string, reason: string): Promise<Withdrawal> => {
    const response = await apiClient.post<Withdrawal>(`/withdrawals/${id}/reject`, {
      reason,
    });
    return response.data;
  },
};
