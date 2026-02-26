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
  section?: string; // For Bento Grid layout handling if needed
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
  getCampaignById: async (id: string): Promise<Campaign> => {
    const response = await apiClient.get<Campaign>(API_ENDPOINTS.CAMPAIGNS.DETAIL(id));
    return response.data;
  },

  /**
   * Lấy danh sách chiến dịch của tôi (Cần auth)
   */
  getMyCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>(API_ENDPOINTS.CAMPAIGNS.MY_CAMPAIGNS);
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
  getPagedCampaigns: async (page: number = 1, size: number = 20): Promise<PagedCampaignsResponse> => {
    const response = await apiClient.get<PagedCampaignsResponse>(API_ENDPOINTS.CAMPAIGNS.LIST, {
      params: { page, size },
    });
    return response.data;
  },
};

