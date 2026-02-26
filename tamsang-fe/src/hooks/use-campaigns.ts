import { useQuery } from "@tanstack/react-query";
import { CampaignService } from "@/services/campaign.service";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "featured"],
    queryFn: CampaignService.getFeaturedCampaigns,
  });
}

export function useFeaturedCampaigns(page: number = 1, size: number = 20) {
  return useQuery({
    queryKey: ["campaigns", "paged", page, size],
    queryFn: () => CampaignService.getPagedCampaigns(page, size),
  });
}

export function usePagedCampaigns(page: number = 1, size: number = 18) {
  return useQuery({
    queryKey: ["campaigns", "list", page, size],
    queryFn: () => CampaignService.getPagedCampaigns(page, size),
  });
}

export function useCampaignDetail(id: string) {
  return useQuery({
    queryKey: ["campaigns", "detail", id],
    queryFn: () => CampaignService.getCampaignById(id),
    enabled: !!id,
  });
}

export function useImpactStats() {
  return useQuery({
    queryKey: ["impact-stats"],
    queryFn: CampaignService.getStats,
    refetchInterval: 30000,
  });
}
