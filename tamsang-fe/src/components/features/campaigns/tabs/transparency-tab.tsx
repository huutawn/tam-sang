"use client";

import { useState, useMemo } from "react";
import { ArrowDown, ArrowUp, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import { CampaignDetailResponse } from "@/services/campaign.service";
import { useCampaignWallet, useTransactionHistory, useVerifiedBalance } from "@/hooks/use-blockchain";
import { ParsedTransaction } from "@/services/blockchain.service";

function formatVND(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

type LedgerFilter = "all" | "donations" | "withdrawals";

interface TransparencyTabProps {
    campaign: CampaignDetailResponse;
}

export function TransparencyTab({ campaign }: TransparencyTabProps) {
    const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");

    // Fetch wallet → then transactions
    const { data: wallet, isLoading: walletLoading } = useCampaignWallet(campaign.id);
    const { data: txData, isLoading: txLoading } = useTransactionHistory(wallet?.id);
    const { data: verifiedBalance } = useVerifiedBalance(wallet?.id);

    const transactions = txData?.parsed ?? [];

    const filteredTx = useMemo(() => {
        if (ledgerFilter === "all") return transactions;
        if (ledgerFilter === "donations") return transactions.filter((t) => t.type === "DONATION");
        return transactions.filter((t) => t.type === "WITHDRAWAL");
    }, [transactions, ledgerFilter]);

    // Money flow calculations
    const totalDeposits = wallet?.total_deposits ?? campaign.currentAmount;
    const totalWithdrawals = wallet?.total_withdrawals ?? 0;
    const platformFee = totalDeposits * 0.03;
    const toBeneficiary = totalDeposits - platformFee;
    const deliveredPercent = totalDeposits > 0 ? ((toBeneficiary / totalDeposits) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6">
            {/* Money Flow Visualization */}
            <div className="rounded-2xl bg-linear-to-br from-emerald-800 to-emerald-900 p-6 md:p-8 text-white shadow-lg">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    💰 Dòng Tiền Minh Bạch
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/30 text-emerald-300">
                                <ArrowDown className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs text-emerald-200">Tổng quyên góp</span>
                        </div>
                        <p className="text-xl font-bold">{formatVND(totalDeposits)}</p>
                        {verifiedBalance && (
                            <p className="text-xs text-emerald-300 mt-1">
                                {verifiedBalance.transaction_count} giao dịch
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400/30 text-yellow-300">%</span>
                            <span className="text-xs text-emerald-200">Phí nền tảng (3%)</span>
                        </div>
                        <p className="text-xl font-bold">-{formatVND(platformFee)}</p>
                        <p className="text-xs text-emerald-300 mt-1">Vận hành blockchain & hệ thống</p>
                    </div>

                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-400/30 text-green-300">
                                <ArrowUp className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs text-emerald-200">Đến người thụ hưởng</span>
                        </div>
                        <p className="text-xl font-bold">{formatVND(toBeneficiary)}</p>
                        <p className="text-xs text-emerald-300 mt-1">{deliveredPercent}% được chuyển</p>
                    </div>
                </div>

                {/* Flow diagram */}
                <div className="mt-6 flex items-center justify-between px-4">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20">
                            <span className="text-lg">👥</span>
                        </div>
                        <span className="text-xs text-emerald-200">Nhà hảo tâm</span>
                    </div>
                    <div className="flex-1 mx-3 h-1 rounded-full bg-emerald-500/50 relative">
                        <div className="absolute inset-0 rounded-full bg-emerald-400" style={{ width: "100%" }} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20">
                            <ShieldCheck className="h-5 w-5 text-emerald-300" />
                        </div>
                        <span className="text-xs text-emerald-200">Blockchain</span>
                    </div>
                    <div className="flex-1 mx-3 h-1 rounded-full bg-emerald-500/50 relative">
                        <div className="absolute inset-0 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, parseFloat(deliveredPercent))}%` }} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 border border-white/20">
                            <span className="text-lg">🤝</span>
                        </div>
                        <span className="text-xs text-emerald-200">Người thụ hưởng</span>
                    </div>
                </div>
            </div>

            {/* Transaction Ledger */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-foreground">Sổ Cái Giao Dịch</h2>

                    {/* Filter tabs */}
                    <div className="flex bg-muted/50 rounded-full p-1 border border-border">
                        {(["all", "donations", "withdrawals"] as LedgerFilter[]).map((filter) => {
                            const labels: Record<LedgerFilter, string> = {
                                all: "Tất cả",
                                donations: "Quyên góp",
                                withdrawals: "Rút tiền",
                            };
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setLedgerFilter(filter)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${ledgerFilter === filter
                                        ? "bg-emerald-700 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {labels[filter]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Loading */}
                {(walletLoading || txLoading) && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                )}

                {/* Empty */}
                {!walletLoading && !txLoading && filteredTx.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Chưa có giao dịch nào.</p>
                    </div>
                )}

                {/* Transaction list */}
                {!walletLoading && !txLoading && filteredTx.length > 0 && (
                    <div className="space-y-3">
                        {filteredTx.map((tx) => (
                            <TransactionRow key={tx.id} tx={tx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Transaction Row ─── */

function TransactionRow({ tx }: { tx: ParsedTransaction }) {
    const isDonation = tx.type === "DONATION";

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
            {/* Icon */}
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDonation
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                }`}>
                {isDonation
                    ? <ArrowDown className="h-5 w-5" />
                    : <ArrowUp className="h-5 w-5" />
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isDonation ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                        {isDonation ? "+" : "-"}{formatVND(tx.amount)}
                    </span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                        <ShieldCheck className="h-2.5 w-2.5 text-white" />
                    </span>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {isDonation
                        ? `Từ ${tx.donorName || "Ẩn danh"}`
                        : `Cho ${tx.reason || "Chi tiêu chiến dịch"}`
                    }
                </p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</span>
                    <button className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                        Xem trên Blockchain
                    </button>
                </div>
            </div>

            {/* Verified badge */}
            <span className="text-xs text-emerald-600 flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
            </span>
        </div>
    );
}
