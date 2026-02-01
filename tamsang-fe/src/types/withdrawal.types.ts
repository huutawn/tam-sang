// Withdrawal Types
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
  organizerName?: string;
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
  transactionHash?: string;
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
  organizerId?: string;
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface WithdrawalSummary {
  totalWithdrawals: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
}
