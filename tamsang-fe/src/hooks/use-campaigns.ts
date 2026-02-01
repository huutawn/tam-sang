import { useQuery } from "@tanstack/react-query";
import { CampaignService } from "@/services/campaign.service";

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'featured'],
    queryFn: CampaignService.getFeaturedCampaigns,
  });
}

export function useImpactStats() {
    return useQuery({
        queryKey: ['impact-stats'],
        queryFn: CampaignService.getStats,
        refetchInterval: 30000,
    });
}
