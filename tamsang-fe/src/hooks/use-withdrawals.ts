"use client";

import { useQuery } from "@tanstack/react-query";

import { ProofService, Proof } from "@/services/proof.service";
import { WithdrawalService } from "@/services/withdrawal.service";

const PROCESSING_POLL_INTERVAL_MS = 7000;

function hasProcessingProofs(proofs: Proof[] | undefined): boolean {
    return (proofs ?? []).some((proof) => proof.aiStatus === "PROCESSING");
}

/**
 * Hook lay danh sach withdrawals cua mot chien dich
 */
export function useCampaignWithdrawals(campaignId: string) {
    return useQuery({
        queryKey: ["withdrawals", "campaign", campaignId],
        queryFn: () => WithdrawalService.getWithdrawals({ campaignId }),
        enabled: !!campaignId,
    });
}

/**
 * Hook lay danh sach proofs cua mot withdrawal.
 *
 * Neu con proof dang PROCESSING thi hook se tu dong poll theo chu ky ngan
 * de cap nhat ket qua AI tren giao dien ma khong can reload trang.
 */
export function useWithdrawalProofs(withdrawalId: string | undefined) {
    return useQuery<Proof[]>({
        queryKey: ["proofs", "withdrawal", withdrawalId],
        queryFn: () => ProofService.getProofsByWithdrawal(withdrawalId!),
        enabled: !!withdrawalId,
        staleTime: 2_000,
        refetchInterval: (query) => {
            const proofs = query.state.data as Proof[] | undefined;
            return hasProcessingProofs(proofs) ? PROCESSING_POLL_INTERVAL_MS : false;
        },
    });
}
