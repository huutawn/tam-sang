import apiClient from "./api-client";
import { API_ENDPOINTS } from "@/lib/constants";

/* ─── Types ─── */

export interface WalletResponse {
    id: string;
    campaign_id: string;
    address: string;
    public_key: string;
    balance: number;
    total_deposits: number;
    total_withdrawals: number;
    currency: string;
    status: string;
    is_verified: boolean;
    last_verified_at: string | null;
    created_at: string;
}

export interface TransactionBlock {
    id: string;
    block_index: number;
    transaction_id: string;
    previous_hash: string;
    current_hash: string;
    transaction_data: string; // JSON encoded
    created_at: string;
}

export interface TransactionHistoryResponse {
    wallet_id: string;
    blocks: TransactionBlock[];
    total: number;
    offset: number;
    limit: number;
}

export interface WalletBalanceResponse {
    wallet_id: string;
    campaign_id: string;
    cached_balance: number;
    calculated_balance: number;
    total_deposits: number;
    total_withdrawals: number;
    transaction_count: number;
    currency: string;
    is_verified: boolean;
    balance_match: boolean;
    calculated_at: string;
}

/** Parsed transaction data from blockchain block */
export interface ParsedTransaction {
    id: string;
    block_index: number;
    transaction_id: string;
    current_hash: string;
    created_at: string;
    // Parsed from transaction_data JSON
    type: "DONATION" | "WITHDRAWAL" | "UNKNOWN";
    amount: number;
    donorName?: string;
    reason?: string;
    message?: string;
}

interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

/* ─── Service ─── */

export const BlockchainService = {
    /**
     * Lấy thông tin ví theo campaignId
     */
    getWalletByCampaign: async (campaignId: string): Promise<WalletResponse> => {
        const response = await apiClient.get<ApiResponse<WalletResponse>>(
            API_ENDPOINTS.BLOCKCHAIN.WALLET_BY_CAMPAIGN(campaignId)
        );
        return response.data.result;
    },

    /**
     * Lấy lịch sử giao dịch blockchain
     */
    getTransactionHistory: async (
        walletId: string,
        offset: number = 0,
        limit: number = 20
    ): Promise<TransactionHistoryResponse> => {
        const response = await apiClient.get<ApiResponse<TransactionHistoryResponse>>(
            API_ENDPOINTS.BLOCKCHAIN.AUDIT_HISTORY(walletId),
            { params: { offset, limit } }
        );
        return response.data.result;
    },

    /**
     * Lấy số dư đã xác minh từ chain
     */
    getVerifiedBalance: async (walletId: string): Promise<WalletBalanceResponse> => {
        const response = await apiClient.get<ApiResponse<WalletBalanceResponse>>(
            API_ENDPOINTS.BLOCKCHAIN.VERIFIED_BALANCE(walletId)
        );
        return response.data.result;
    },

    /**
     * Parse transaction_data JSON từ block
     */
    parseTransactionData: (block: TransactionBlock): ParsedTransaction => {
        let type: ParsedTransaction["type"] = "UNKNOWN";
        let amount = 0;
        let donorName: string | undefined;
        let reason: string | undefined;
        let message: string | undefined;

        try {
            const data = JSON.parse(block.transaction_data);
            amount = data.amount || 0;

            if (data.type === "DONATION" || data.donor_name || data.donorName) {
                type = "DONATION";
                donorName = data.donor_name || data.donorName || "Ẩn danh";
                message = data.message;
            } else if (data.type === "WITHDRAWAL" || data.reason) {
                type = "WITHDRAWAL";
                reason = data.reason;
            }
        } catch {
            // Failed to parse, keep defaults
        }

        return {
            id: block.id,
            block_index: block.block_index,
            transaction_id: block.transaction_id,
            current_hash: block.current_hash,
            created_at: block.created_at,
            type,
            amount,
            donorName,
            reason,
            message,
        };
    },
};
