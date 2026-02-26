import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

export interface LiveDonation {
  id: string;
  donorFullName: string;
  campaignTitle: string;
  amount: number;
  createdAt: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

export const DonationService = {
  /**
   * Lấy 10 quyên góp hoàn thành mới nhất (Public endpoint)
   */
  getRecentDonations: async (): Promise<LiveDonation[]> => {
    const response = await apiClient.get<ApiResponse<LiveDonation[]>>(
      API_ENDPOINTS.DONATIONS.RECENT
    );
    return response.data.result;
  },
};
