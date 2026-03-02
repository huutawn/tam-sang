import { serverFetch } from "@/lib/server-fetch";
import { CampaignDetailResponse } from "./campaign.service";

/**
 * Server-side Campaign Service.
 * Chỉ dùng trong Server Components, generateMetadata, hoặc API routes.
 * Gọi trực tiếp đến backend (bypass BFF/axios client).
 */

interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

export const CampaignServerService = {
    /**
     * Lấy chi tiết chiến dịch (server-side, cho SEO metadata)
     */
    getCampaignById: async (id: string): Promise<CampaignDetailResponse> => {
        const data = await serverFetch<ApiResponse<CampaignDetailResponse>>(
            `/api/core/campaigns/${id}`
        );
        return data.result;
    },
};
