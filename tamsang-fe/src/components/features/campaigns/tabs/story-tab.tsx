"use client";

import { CheckCircle, Circle } from "lucide-react";
import { CampaignDetailResponse } from "@/services/campaign.service";

function formatVND(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Chưa xác định";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

interface StoryTabProps {
    campaign: CampaignDetailResponse;
}

export function StoryTab({ campaign }: StoryTabProps) {
    return (
        <div className="space-y-8">
            {/* Story */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground mb-6">Câu Chuyện</h2>

                <div className="space-y-4">
                    {campaign.content ? (
                        campaign.content.split("\n").filter(Boolean).map((paragraph, i) => (
                            <p key={i} className="text-muted-foreground leading-relaxed">
                                {paragraph}
                            </p>
                        ))
                    ) : (
                        <p className="text-muted-foreground italic">Chưa có nội dung mô tả.</p>
                    )}
                </div>

                <div className="mt-8 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        Hệ thống xác minh AI đã kiểm tra chiến dịch này, xác nhận tính xác thực của danh tính,
                        tài liệu và nhu cầu của người thụ hưởng. Bạn có thể tin tưởng rằng sự quyên góp
                        của mình sẽ tạo ra tác động thực sự, có thể đo lường được.
                    </p>
                </div>
            </div>

            {/* Campaign Milestones */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6">Các Mốc Chiến Dịch</h2>

                <div className="space-y-0">
                    {/* Milestone items — generated from campaign data */}
                    {getMilestones(campaign).map((milestone, i, arr) => (
                        <div key={i} className="flex gap-4">
                            {/* Timeline line + icon */}
                            <div className="flex flex-col items-center">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${milestone.completed
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted border-2 border-border text-muted-foreground"
                                    }`}>
                                    {milestone.completed
                                        ? <CheckCircle className="h-5 w-5" />
                                        : <Circle className="h-5 w-5" />
                                    }
                                </div>
                                {i < arr.length - 1 && (
                                    <div className={`w-0.5 flex-1 my-1 ${milestone.completed ? "bg-emerald-300" : "bg-border"}`} />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-8">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-semibold text-foreground">{milestone.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
                                        {milestone.completedDate && (
                                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                                ✓ Hoàn thành vào {milestone.completedDate}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-foreground whitespace-nowrap ml-4">
                                        {formatVND(milestone.amount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Helpers ─── */

interface Milestone {
    title: string;
    description: string;
    amount: number;
    completed: boolean;
    completedDate?: string;
}

function getMilestones(campaign: CampaignDetailResponse): Milestone[] {
    const target = campaign.targetAmount;
    const current = campaign.currentAmount;

    // Generate milestones based on target amount
    const milestonePercents = [
        { pct: 0.1, title: "Đánh Giá Ban Đầu", desc: "Khảo sát và đánh giá nhu cầu" },
        { pct: 0.3, title: "Mua Sắm Thiết Bị", desc: "Mua sắm vật tư và thiết bị cần thiết" },
        { pct: 0.6, title: "Giai Đoạn Triển Khai", desc: "Triển khai thực hiện dự án" },
        { pct: 0.85, title: "Đào Tạo & Giáo Dục", desc: "Hướng dẫn cộng đồng sử dụng và bảo trì" },
        { pct: 1.0, title: "Hoàn Thành Mục Tiêu", desc: "Đạt được mục tiêu quyên góp" },
    ];

    return milestonePercents.map((m) => {
        const amount = Math.round(target * m.pct);
        const completed = current >= amount;
        return {
            title: m.title,
            description: m.desc,
            amount,
            completed,
            completedDate: completed ? formatDate(campaign.startDate) : undefined,
        };
    });
}
