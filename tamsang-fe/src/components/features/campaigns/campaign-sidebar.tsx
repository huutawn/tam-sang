"use client";

import { Heart, Share2, ShieldCheck, Link as LinkIcon, CheckCircle } from "lucide-react";
import { CampaignDetailResponse } from "@/services/campaign.service";
import { useRecentDonations } from "@/hooks/use-donations";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

function formatVND(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function getDaysLeft(endDate: string | null): number | null {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

interface CampaignSidebarProps {
    campaign: CampaignDetailResponse;
}

export function CampaignSidebar({ campaign }: CampaignSidebarProps) {
    const { data: recentDonations } = useRecentDonations();
    const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
    const daysLeft = getDaysLeft(campaign.endDate);
    const isCompleted = campaign.status === "COMPLETED" || progress >= 100;

    // Filter recent donations (show max 5)
    const donors = (recentDonations ?? []).slice(0, 5);

    return (
        <div className="sticky top-6 space-y-6">
            {/* Donation Progress Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                {/* Amount */}
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-700">
                            {formatVND(campaign.currentAmount)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / {formatVND(campaign.targetAmount)}
                        </span>
                    </div>
                    <Progress value={progress} className="h-2.5 mt-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{campaign.likeCount ?? 0} nhà hảo tâm</span>
                        {isCompleted ? (
                            <span className="text-emerald-600 font-medium">Hoàn thành</span>
                        ) : daysLeft !== null ? (
                            <span>{daysLeft} ngày còn lại</span>
                        ) : null}
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <Button className="w-full py-6 text-base font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-lg">
                        Quyên Góp Ngay
                    </Button>
                    <Button variant="outline" className="w-full py-5 rounded-xl gap-2 border-border">
                        <Share2 className="h-4 w-4" />
                        Chia Sẻ Chiến Dịch
                    </Button>
                </div>

                {/* Trust badges */}
                <div className="space-y-3 pt-2">
                    <TrustBadge
                        icon={<ShieldCheck className="h-4 w-4" />}
                        title="Xác Minh AI"
                        description="Danh tính & tài liệu đã xác nhận"
                    />
                    <TrustBadge
                        icon={<LinkIcon className="h-4 w-4" />}
                        title="Blockchain"
                        description="Mọi giao dịch được ghi nhận"
                    />
                    <TrustBadge
                        icon={<CheckCircle className="h-4 w-4" />}
                        title="100% Minh Bạch"
                        description="Theo dõi dòng tiền thời gian thực"
                    />
                </div>
            </div>

            {/* Recent Donors */}
            {donors.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-semibold text-foreground mb-4">Nhà Hảo Tâm Gần Đây</h3>
                    <div className="space-y-3">
                        {donors.map((donor) => (
                            <div key={donor.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold">
                                        {donor.donorFullName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {donor.donorFullName || "Ẩn danh"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {timeAgo(donor.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-emerald-700">
                                    {formatVND(donor.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */

function TrustBadge({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                {icon}
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
