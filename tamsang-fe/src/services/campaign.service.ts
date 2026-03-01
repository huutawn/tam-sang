import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string;
  deadline: string;
  section?: string;
}

export interface ImpactStats {
  totalDonations: number;
  totalCampaigns: number;
}

export interface CampaignPageItem {
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

export interface PagedCampaignsResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalElements: number;
  data: CampaignPageItem[];
}

export interface CampaignDetailResponse {
  id: string;
  title: string;
  content: string;
  targetAmount: number;
  currentAmount: number;
  walletBalance: number;
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

export interface CreateCampaignRequest {
  title: string;
  content?: string;
  targetAmount: number;
  images?: string[];
  startDate?: string;
  endDate?: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const CampaignService = {
  /**
   * Lấy thống kê tổng quan (Public endpoint)
   */
  getStats: async (): Promise<ImpactStats> => {
    const response = await apiClient.get<ImpactStats>("/core/statistics/impact");
    return response.data;
  },

  /**
   * Lấy danh sách chiến dịch nổi bật (Public endpoint)
   */
  getFeaturedCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>(API_ENDPOINTS.CAMPAIGNS.FEATURED, {
      params: { limit: 3 },
    });
    return response.data;
  },

  /**
   * Lấy chi tiết một chiến dịch (Public endpoint)
   */
  getCampaignById: async (id: string): Promise<CampaignDetailResponse> => {
    const response = await apiClient.get<ApiResponse<CampaignDetailResponse>>(
      API_ENDPOINTS.CAMPAIGNS.DETAIL(id)
    );
    return response.data.result;
  },

  /**
   * Lấy danh sách chiến dịch của tôi (Cần auth)
   */
  getMyCampaigns: async (page: number = 1, size: number = 10): Promise<PagedCampaignsResponse> => {
    const response = await apiClient.get<PagedCampaignsResponse>(
      API_ENDPOINTS.CAMPAIGNS.MY_CAMPAIGNS,
      { params: { page, size } }
    );
    return response.data;
  },

  /**
   * Lấy tất cả chiến dịch với filter (Public endpoint)
   */
  getAllCampaigns: async (params?: Record<string, unknown>): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>(API_ENDPOINTS.CAMPAIGNS.LIST, {
      params,
    });
    return response.data;
  },

  /**
   * Lấy danh sách chiến dịch phân trang (Public endpoint)
   */
  getPagedCampaigns: async (page: number = 1, size: number = 18): Promise<PagedCampaignsResponse> => {
    const response = await apiClient.get<PagedCampaignsResponse>(API_ENDPOINTS.CAMPAIGNS.LIST, {
      params: { page, size },
    });
    return response.data;
  },

  /**
   * Tạo chiến dịch mới (Cần auth + KYC)
   */
  createCampaign: async (data: CreateCampaignRequest): Promise<ApiResponse<unknown>> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      API_ENDPOINTS.CAMPAIGNS.CREATE,
      data
    );
    return response.data;
  },
};
