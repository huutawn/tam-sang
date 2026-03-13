"use client";

import { Heart, MessageCircle, Share2, Loader2, ThumbsUp, AlertTriangle } from "lucide-react";
import { CampaignDetailResponse } from "@/services/campaign.service";
import { useCampaignWithdrawals, useWithdrawalProofs } from "@/hooks/use-withdrawals";
import { Withdrawal } from "@/services/withdrawal.service";
import { ProofService, Proof } from "@/services/proof.service";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

interface UpdatesTabProps {
    campaign: CampaignDetailResponse;
}

export function UpdatesTab({ campaign }: UpdatesTabProps) {
    const { data: withdrawalsData, isLoading } = useCampaignWithdrawals(campaign.id);
    const withdrawals = withdrawalsData ?? [];

    // Show approved/waiting_proof/completed withdrawals as "updates"
    const updates = withdrawals.filter(
        (w) => w.status === "APPROVED" || w.status === "WAITING_PROOF" || w.status === "COMPLETED"
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (updates.length === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground mb-6">Cập Nhật Chiến Dịch</h2>
                <div className="text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                        <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Chưa có cập nhật nào cho chiến dịch này.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Các cập nhật từ người tổ chức sẽ xuất hiện tại đây khi có hoạt động rút tiền và bằng chứng chi tiêu.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {updates.map((withdrawal) => (
                <UpdateCard key={withdrawal.id} withdrawal={withdrawal} />
            ))}
        </div>
    );
}

/* ─── Update Card (per withdrawal) ─── */

function UpdateCard({ withdrawal }: { withdrawal: Withdrawal }) {
    const { data: proofs } = useWithdrawalProofs(withdrawal.id);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const queryClient = useQueryClient();

    const handleUpvote = async (proof: Proof) => {
        setActionLoading((prev) => ({ ...prev, [proof.id]: true }));
        try {
            await ProofService.upvoteProof(proof.id);
            toast.success("Đã đồng tình với bằng chứng");
            queryClient.invalidateQueries({ queryKey: ["proofs", "withdrawal", withdrawal.id] });
        } catch (error) {
            console.error("Failed to upvote:", error);
            toast.error("Vui lòng đăng nhập để thực hiện chức năng này");
        } finally {
            setActionLoading((prev) => ({ ...prev, [proof.id]: false }));
        }
    };

    const handleReport = async (proof: Proof) => {
        if (!confirm("Bạn có chắc chắn muốn báo cáo bằng chứng này vi phạm/không hợp lệ?")) return;

        setActionLoading((prev) => ({ ...prev, [proof.id]: true }));
        try {
            await ProofService.reportProof(proof.id);
            toast.success("Đã báo cáo bằng chứng");
            queryClient.invalidateQueries({ queryKey: ["proofs", "withdrawal", withdrawal.id] });
        } catch (error) {
            console.error("Failed to report:", error);
            toast.error("Vui lòng đăng nhập để thực hiện chức năng này");
        } finally {
            setActionLoading((prev) => ({ ...prev, [proof.id]: false }));
        }
    };

    const ownerInitial = "O"; // Organizer initial

    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-700 text-white text-sm font-bold">
                        {ownerInitial}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{withdrawal.reason}</h3>
                        <p className="text-xs text-muted-foreground">
                            Người tổ chức • {formatDate(withdrawal.createdAt)}
                        </p>
                    </div>
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(withdrawal.createdAt)}</span>
            </div>

            {/* Amount info */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-foreground">
                    Số tiền rút: <span className="font-semibold text-emerald-700">
                        {new Intl.NumberFormat("vi-VN").format(withdrawal.amount)}₫
                    </span>
                </p>

            </div>

            {/* Proof images */}
            {proofs && proofs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {proofs.flatMap((proof) => [
                        ...(proof.sceneImageUrls ?? []).map((url, i) => (
                            <div key={`${proof.id}-scene-${i}`} className="aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                                <img src={url} alt={`Ảnh hiện trường ${i + 1}`} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                        )),
                        ...(proof.billImageUrls ?? []).map((url, i) => (
                            <div key={`${proof.id}-bill-${i}`} className="aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                                <img src={url} alt={`Hóa đơn ${i + 1}`} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                        )),
                    ])}
                </div>
            )}

            {/* Proof descriptions */}
            {proofs && proofs.length > 0 && (
                <div className="mb-4 space-y-2">
                    {proofs.filter(p => p.description).map((proof) => (
                        <p key={proof.id} className="text-sm text-muted-foreground leading-relaxed">
                            {proof.description}
                        </p>
                    ))}
                </div>
            )}

            {/* AI verification status */}
            {proofs && proofs.some(p => p.aiStatus === "VERIFIED") && (
                <div className="mb-4 flex items-center gap-2 text-xs text-emerald-600">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">✓</span>
                    Bằng chứng đã được AI xác minh
                </div>
            )}

            {/* Footer actions (for the overall update) */}
            <div className="flex flex-col gap-3 pt-3 border-t border-border">
                {proofs && proofs.length > 0 && proofs.map((proof) => (
                    <div key={`actions-${proof.id}`} className="flex items-center justify-between text-sm w-full bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleUpvote(proof)}
                                disabled={actionLoading[proof.id]}
                                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {actionLoading[proof.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                                <span>Đồng tình ({proof.upvoteCount || 0})</span>
                            </button>
                            <button
                                onClick={() => handleReport(proof)}
                                disabled={actionLoading[proof.id]}
                                className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 transition-colors font-medium disabled:opacity-50"
                            >
                                {actionLoading[proof.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                                <span>Báo cáo ({proof.reportCount || 0})</span>
                            </button>
                        </div>
                    </div>
                ))}

                <div className="flex items-center gap-6 mt-2">
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Heart className="h-4 w-4" />
                        <span>Thích</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <MessageCircle className="h-4 w-4" />
                        <span>Bình luận</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Share2 className="h-4 w-4" />
                        <span>Chia sẻ</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
