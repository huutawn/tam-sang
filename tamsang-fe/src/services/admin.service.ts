import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────
export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isBlackList: boolean;
    KycStatus: string;
    roles: Array<{ name: string }>;
}

export interface AdminCampaign {
    id: string;
    title: string;
    content: string;
    targetAmount: number;
    currentAmount: number;
    usedAmount: number;
    images: string[];
    status: string;
    startDate: string | null;
    endDate: string | null;
    ownerId: string;
    hasUsedQuickWithdrawal: boolean;
    likeCount: number;
    viewCount: number;
    commentCount: number;
}

export interface AdminWithdrawal {
    id: string;
    campaignId: string;
    amount: number;
    reason: string;
    type: string;
    quick: boolean;
    aiAnalysisResult: string;
    selfieImageUrl: string;
    faceVerificationStatus: string;
    faceVerificationLog: string;
    status: string;
    createdAt: string;
}

export interface AdminProof {
    id: string;
    withdrawalRequestId: string;
    billImageUrls: string[];
    sceneImageUrls: string[];
    description: string;
    aiStatus: string;
    aiScore: number;
    aiAnalysis: string;
    createdAt: string;
}

export interface PagedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // current page (0-indexed)
    size: number;
}

interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

// ─── Service ─────────────────────────────────────────────────
export const AdminService = {
    // Users
    getAllUsers: async (): Promise<AdminUser[]> => {
        const response = await apiClient.get<ApiResponse<AdminUser[]>>("/identity/users");
        return response.data.result;
    },

    // Campaigns (paged)
    getAllCampaigns: async (page = 0, size = 10): Promise<PagedResponse<AdminCampaign>> => {
        const response = await apiClient.get<PagedResponse<AdminCampaign>>(
            API_ENDPOINTS.CAMPAIGNS.LIST,
            { params: { page, size } }
        );
        return response.data;
    },

    // Withdrawals (admin)
    getWithdrawals: async (
        page = 0,
        size = 10,
        faceStatus?: string
    ): Promise<ApiResponse<PagedResponse<AdminWithdrawal>>> => {
        const params: Record<string, unknown> = { page, size };
        if (faceStatus) params.faceStatus = faceStatus;
        const response = await apiClient.get<ApiResponse<PagedResponse<AdminWithdrawal>>>(
            "/core/withdrawals/admin",
            { params }
        );
        return response.data;
    },

    approveWithdrawal: async (id: string): Promise<AdminWithdrawal> => {
        const response = await apiClient.put<ApiResponse<AdminWithdrawal>>(
            API_ENDPOINTS.WITHDRAWALS.APPROVE(id)
        );
        return response.data.result;
    },

    rejectWithdrawal: async (id: string, reason: string): Promise<AdminWithdrawal> => {
        const response = await apiClient.put<ApiResponse<AdminWithdrawal>>(
            API_ENDPOINTS.WITHDRAWALS.REJECT(id),
            { reason }
        );
        return response.data.result;
    },

    // Proofs (admin)
    getProofs: async (
        page = 0,
        size = 10,
        aiStatus?: string
    ): Promise<ApiResponse<PagedResponse<AdminProof>>> => {
        const params: Record<string, unknown> = { page, size };
        if (aiStatus) params.aiStatus = aiStatus;
        const response = await apiClient.get<ApiResponse<PagedResponse<AdminProof>>>(
            "/core/proofs/admin",
            { params }
        );
        return response.data;
    },

    approveProof: async (id: string): Promise<AdminProof> => {
        const response = await apiClient.put<ApiResponse<AdminProof>>(
            `/core/proofs/admin/${id}/approve`
        );
        return response.data.result;
    },

    rejectProof: async (id: string): Promise<AdminProof> => {
        const response = await apiClient.put<ApiResponse<AdminProof>>(
            `/core/proofs/admin/${id}/reject`
        );
        return response.data.result;
    },

    // Donations
    getRecentDonations: async () => {
        const response = await apiClient.get<ApiResponse<unknown[]>>(
            API_ENDPOINTS.DONATIONS.RECENT
        );
        return response.data.result;
    },
};
