import { useQuery } from "@tanstack/react-query";
import {
    BlockchainService,
    WalletResponse,
    TransactionHistoryResponse,
    WalletBalanceResponse,
    ParsedTransaction,
} from "@/services/blockchain.service";

/**
 * Hook lấy thông tin ví blockchain của một chiến dịch
 */
export function useCampaignWallet(campaignId: string) {
    return useQuery<WalletResponse>({
        queryKey: ["blockchain", "wallet", campaignId],
        queryFn: () => BlockchainService.getWalletByCampaign(campaignId),
        enabled: !!campaignId,
    });
}

/**
 * Hook lấy lịch sử giao dịch blockchain + parse transaction data
 */
export function useTransactionHistory(walletId: string | undefined, offset = 0, limit = 20) {
    return useQuery({
        queryKey: ["blockchain", "transactions", walletId, offset, limit],
        queryFn: async (): Promise<{ raw: TransactionHistoryResponse; parsed: ParsedTransaction[] }> => {
            const raw = await BlockchainService.getTransactionHistory(walletId!, offset, limit);
            const parsed = raw.blocks.map(BlockchainService.parseTransactionData);
            return { raw, parsed };
        },
        enabled: !!walletId,
    });
}

/**
 * Hook lấy số dư đã xác minh từ chain
 */
export function useVerifiedBalance(walletId: string | undefined) {
    return useQuery<WalletBalanceResponse>({
        queryKey: ["blockchain", "verified-balance", walletId],
        queryFn: () => BlockchainService.getVerifiedBalance(walletId!),
        enabled: !!walletId,
    });
}
