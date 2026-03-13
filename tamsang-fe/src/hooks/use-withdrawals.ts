import { useQuery } from "@tanstack/react-query";
import { WithdrawalService, Withdrawal } from "@/services/withdrawal.service";
import { ProofService, Proof } from "@/services/proof.service";

/**
 * Hook lấy danh sách withdrawals của một chiến dịch
 */
export function useCampaignWithdrawals(campaignId: string) {
    return useQuery({
        queryKey: ["withdrawals", "campaign", campaignId],
        queryFn: () =>
            WithdrawalService.getWithdrawals({ campaignId }),
        enabled: !!campaignId,
    });
}

/**
 * Hook lấy danh sách proofs của một withdrawal
 */
export function useWithdrawalProofs(withdrawalId: string | undefined) {
    return useQuery<Proof[]>({
        queryKey: ["proofs", "withdrawal", withdrawalId],
        queryFn: () => ProofService.getProofsByWithdrawal(withdrawalId!),
        enabled: !!withdrawalId,
    });
}
