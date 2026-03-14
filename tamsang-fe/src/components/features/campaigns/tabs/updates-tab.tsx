"use client";

import {
    AlertTriangle,
    BadgeCheck,
    Camera,
    ChevronDown,
    Clock3,
    Loader2,
    Receipt,
    ShieldAlert,
    Sparkles,
    ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useCampaignWithdrawals, useWithdrawalProofs } from "@/hooks/use-withdrawals";
import { CampaignDetailResponse } from "@/services/campaign.service";
import { Proof, ProofService } from "@/services/proof.service";
import { Withdrawal } from "@/services/withdrawal.service";

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatCurrency(amount: number): string {
    return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

function getAiHighlights(aiAnalysis?: string): string[] {
    if (!aiAnalysis) {
        return [];
    }

    return aiAnalysis
        .split(/\r?\n/)
        .flatMap((line) => line.split(" | "))
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4);
}

function getAiStatusMeta(status: Proof["aiStatus"]) {
    if (status === "VERIFIED") {
        return {
            label: "AI đã xác minh",
            icon: BadgeCheck,
            badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
            panelClass: "border-emerald-200 bg-emerald-50/70",
        };
    }

    if (status === "REJECTED") {
        return {
            label: "AI gắn cờ nghi vấn",
            icon: ShieldAlert,
            badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
            panelClass: "border-rose-200 bg-rose-50/70",
        };
    }

    return {
        label: "AI đang xử lý",
        icon: Clock3,
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        panelClass: "border-amber-200 bg-amber-50/70",
    };
}

interface UpdatesTabProps {
    campaign: CampaignDetailResponse;
}

export function UpdatesTab({ campaign }: UpdatesTabProps) {
    const { data: withdrawalsData, isLoading } = useCampaignWithdrawals(campaign.id);
    const withdrawals = withdrawalsData ?? [];

    const updates = withdrawals.filter(
        (withdrawal) =>
            withdrawal.status === "APPROVED" ||
            withdrawal.status === "WAITING_PROOF" ||
            withdrawal.status === "COMPLETED"
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
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                <h2 className="mb-6 text-2xl font-bold text-foreground">Cập nhật chiến dịch</h2>
                <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Chưa có cập nhật nào cho chiến dịch này.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Khi có đợt giải ngân và người tổ chức tải minh chứng lên, kết quả AI sẽ hiển thị tại đây.
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

function UpdateCard({ withdrawal }: { withdrawal: Withdrawal }) {
    const { data: proofs = [], isLoading: proofsLoading } = useWithdrawalProofs(withdrawal.id);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const queryClient = useQueryClient();

    const handleUpvote = async (proof: Proof) => {
        setActionLoading((prev) => ({ ...prev, [proof.id]: true }));
        try {
            await ProofService.upvoteProof(proof.id);
            alert("Đã đồng tình với bằng chứng");
            queryClient.invalidateQueries({ queryKey: ["proofs", "withdrawal", withdrawal.id] });
        } catch (error) {
            console.error("Failed to upvote:", error);
            alert("Vui lòng đăng nhập để sử dụng tính năng này");
        } finally {
            setActionLoading((prev) => ({ ...prev, [proof.id]: false }));
        }
    };

    const handleReport = async (proof: Proof) => {
        if (!confirm("Bạn có chắc muốn báo cáo bằng chứng này là không hợp lệ hoặc có dấu hiệu gian dối?")) {
            return;
        }

        setActionLoading((prev) => ({ ...prev, [proof.id]: true }));
        try {
            await ProofService.reportProof(proof.id);
            alert("Đã gửi báo cáo cho bằng chứng");
            queryClient.invalidateQueries({ queryKey: ["proofs", "withdrawal", withdrawal.id] });
        } catch (error) {
            console.error("Failed to report:", error);
            alert("Vui lòng đăng nhập để sử dụng tính năng này");
        } finally {
            setActionLoading((prev) => ({ ...prev, [proof.id]: false }));
        }
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-700 text-sm font-bold text-white">
                        O
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{withdrawal.reason}</h3>
                        <p className="text-xs text-muted-foreground">
                            Người tổ chức • {formatDateTime(withdrawal.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-700/70">Đợt giải ngân</p>
                    <p className="text-sm font-semibold text-emerald-800">{formatCurrency(withdrawal.amount)}</p>
                </div>
            </div>

            {proofsLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    Đang tải minh chứng và kết quả AI...
                </div>
            ) : proofs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                    Chưa có proof nào cho đợt giải ngân này.
                </div>
            ) : (
                <div className="space-y-4">
                    {proofs.map((proof) => (
                        <ProofCard
                            key={proof.id}
                            proof={proof}
                            isBusy={Boolean(actionLoading[proof.id])}
                            onUpvote={() => handleUpvote(proof)}
                            onReport={() => handleReport(proof)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProofCard({
    proof,
    isBusy,
    onUpvote,
    onReport,
}: {
    proof: Proof;
    isBusy: boolean;
    onUpvote: () => Promise<void> | void;
    onReport: () => Promise<void> | void;
}) {
    const statusMeta = getAiStatusMeta(proof.aiStatus);
    const StatusIcon = statusMeta.icon;
    const aiHighlights = getAiHighlights(proof.aiAnalysis);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Proof</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{proof.id}</p>
                        <p className="mt-2 text-sm text-slate-600">{formatDateTime(proof.createdAt)}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                        >
                            {proof.aiStatus === "PROCESSING" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <StatusIcon className="h-3.5 w-3.5" />
                            )}
                            {statusMeta.label}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            Điểm AI: {proof.aiScore != null ? `${proof.aiScore}/100` : "Đang tính"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-4">
                {proof.description && (
                    <p className="text-sm leading-relaxed text-slate-600">{proof.description}</p>
                )}

                <ProofAiPanel proof={proof} highlights={aiHighlights} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <ImageSection
                        title="Ảnh hiện trường"
                        icon={Camera}
                        emptyLabel="Chưa có ảnh hiện trường"
                        urls={proof.sceneImageUrls ?? []}
                    />
                    <ImageSection
                        title="Ảnh hóa đơn"
                        icon={Receipt}
                        emptyLabel="Chưa có ảnh hóa đơn"
                        urls={proof.billImageUrls ?? []}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <button
                            onClick={onUpvote}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 font-medium text-emerald-600 transition-colors hover:text-emerald-700 disabled:opacity-50"
                        >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                            Đồng tình ({proof.upvoteCount || 0})
                        </button>
                        <button
                            onClick={onReport}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 font-medium text-rose-500 transition-colors hover:text-rose-600 disabled:opacity-50"
                        >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                            Báo cáo ({proof.reportCount || 0})
                        </button>
                    </div>

                    {proof.aiStatus === "PROCESSING" && (
                        <span className="text-xs text-slate-500">
                            Hệ thống đang tự động làm mới để nhận kết quả AI.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProofAiPanel({ proof, highlights }: { proof: Proof; highlights: string[] }) {
    const statusMeta = getAiStatusMeta(proof.aiStatus);

    return (
        <div className={`rounded-2xl border p-4 ${statusMeta.panelClass}`}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kết quả AI</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-800">{statusMeta.label}</h4>
                </div>

                <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-right shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trust score</p>
                    <p className="text-lg font-bold text-slate-900">
                        {proof.aiScore != null ? `${proof.aiScore}/100` : "--"}
                    </p>
                </div>
            </div>

            {proof.aiStatus === "PROCESSING" ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-white/70 px-3 py-3 text-sm text-slate-700">
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-amber-600" />
                    <div>
                        <p className="font-medium">AI đang đối chiếu bill, ảnh hiện trường và tín hiệu chống giả mạo.</p>
                        <p className="mt-1 text-slate-600">
                            Kết quả sẽ tự cập nhật khi hệ thống xử lý xong.
                        </p>
                    </div>
                </div>
            ) : highlights.length > 0 ? (
                <div className="space-y-2">
                    {highlights.map((line, index) => (
                        <div
                            key={`${proof.id}-highlight-${index}`}
                            className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-sm text-slate-700 shadow-sm"
                        >
                            {line}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-3 text-sm text-slate-600 shadow-sm">
                    Chưa có bản phân tích chi tiết từ AI.
                </div>
            )}

            {proof.aiAnalysis && (
                <details className="group mt-3 rounded-xl border border-white/80 bg-white/80 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-medium text-slate-700">
                        <span>Xem phân tích AI đầy đủ</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-slate-200/70 px-3 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{proof.aiAnalysis}</p>
                    </div>
                </details>
            )}
        </div>
    );
}

function ImageSection({
    title,
    icon: Icon,
    emptyLabel,
    urls,
}: {
    title: string;
    icon: typeof Camera;
    emptyLabel: string;
    urls: string[];
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Icon className="h-4 w-4 text-slate-500" />
                {title}
            </div>

            {urls.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-6 text-center text-sm text-slate-500">
                    {emptyLabel}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {urls.map((url, index) => (
                        <a
                            key={`${title}-${index}-${url}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                            <div className="aspect-video overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt={`${title} ${index + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    onError={(event) => {
                                        (event.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
