"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    CheckCircle, Share2, Heart, ShieldCheck, Link as LinkIcon,
    ArrowLeft, Loader2, Eye, MessageCircle
} from "lucide-react";
import { useCampaignDetail } from "@/hooks/use-campaigns";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CampaignDetailResponse } from "@/services/campaign.service";

type TabType = "story" | "transparency" | "updates";

function formatVND(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        ACTIVE: "Đang hoạt động",
        COMPLETED: "Hoàn thành",
        PAUSED: "Tạm dừng",
        CANCELLED: "Đã hủy",
        DRAFT: "Bản nháp",
        PENDING_APPROVAL: "Chờ duyệt",
        REJECTED: "Bị từ chối",
    };
    return map[status] || status;
}

/* ─── Tab Components ─── */

function StoryTab({ campaign }: { campaign: CampaignDetailResponse }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground mb-6">Câu Chuyện</h2>

            <div className="prose prose-emerald max-w-none text-foreground leading-relaxed space-y-4">
                {campaign.content ? (
                    campaign.content.split("\n").map((paragraph, i) => (
                        <p key={i} className="text-muted-foreground leading-relaxed">
                            {paragraph}
                        </p>
                    ))
                ) : (
                    <p className="text-muted-foreground italic">Chưa có nội dung mô tả.</p>
                )}
            </div>

            {/* Campaign info */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Ngày bắt đầu</p>
                    <p className="font-semibold text-foreground mt-1">{formatDate(campaign.startDate) || "Chưa xác định"}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Ngày kết thúc</p>
                    <p className="font-semibold text-foreground mt-1">{formatDate(campaign.endDate) || "Chưa xác định"}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Mục tiêu</p>
                    <p className="font-semibold text-emerald-700 mt-1">{formatVND(campaign.targetAmount)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 border border-border">
                    <p className="text-xs text-muted-foreground">Đã quyên góp</p>
                    <p className="font-semibold text-emerald-700 mt-1">{formatVND(campaign.currentAmount)}</p>
                </div>
            </div>
        </div>
    );
}

function TransparencyTab({ campaign }: { campaign: CampaignDetailResponse }) {
    const totalDonations = campaign.currentAmount;
    const platformFee = totalDonations * 0.03;
    const toBeneficiary = totalDonations - platformFee;
    const deliveredPercent = totalDonations > 0 ? ((toBeneficiary / totalDonations) * 100).toFixed(1) : "0";

    return (
        <div className="space-y-6">
            {/* Money Flow Visualization */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-900 p-6 md:p-8 text-white shadow-lg">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    💰 Dòng Tiền Minh Bạch
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/30 text-emerald-300">⬇</span>
                            <span className="text-xs text-emerald-200">Tổng quyên góp</span>
                        </div>
                        <p className="text-xl font-bold">{formatVND(totalDonations)}</p>
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
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-400/30 text-green-300">⬆</span>
                            <span className="text-xs text-emerald-200">Đến người thụ hưởng</span>
                        </div>
                        <p className="text-xl font-bold">{formatVND(toBeneficiary)}</p>
                        <p className="text-xs text-emerald-300 mt-1">{deliveredPercent}% được chuyển</p>
                    </div>
                </div>
            </div>

            {/* Wallet Info */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-bold text-foreground mb-4">Thông Tin Ví</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/50 p-4 border border-border">
                        <p className="text-xs text-muted-foreground">Số dư ví chiến dịch</p>
                        <p className="font-semibold text-emerald-700 mt-1 text-lg">{formatVND(campaign.walletBalance)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4 border border-border">
                        <p className="text-xs text-muted-foreground">Tổng quyên góp</p>
                        <p className="font-semibold text-emerald-700 mt-1 text-lg">{formatVND(campaign.currentAmount)}</p>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Mọi giao dịch được ghi nhận trên blockchain, đảm bảo tính minh bạch và không thể thay đổi. Bạn có thể kiểm tra bất kỳ giao dịch nào trên sổ cái blockchain.
                </p>
            </div>
        </div>
    );
}

function UpdatesTab({ campaign }: { campaign: CampaignDetailResponse }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground mb-6">Cập Nhật Chiến Dịch</h2>

            <div className="text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Chưa có cập nhật nào cho chiến dịch này.</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Các cập nhật từ người tổ chức sẽ xuất hiện tại đây.
                </p>
            </div>

            {/* Campaign stats */}
            <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Thống Kê</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-700">{campaign.likeCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Lượt thích</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-700">{campaign.viewCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Lượt xem</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-700">{campaign.commentCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Bình luận</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Content Component ─── */

export function CampaignDetailContent({ id }: { id: string }) {
    const { data: campaign, isLoading } = useCampaignDetail(id);
    const [activeTab, setActiveTab] = useState<TabType>("story");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-xl text-muted-foreground">Không tìm thấy chiến dịch.</p>
                <Link href="/campaigns">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại danh sách
                    </Button>
                </Link>
            </div>
        );
    }

    const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
    const isCompleted = campaign.status === "COMPLETED" || progress >= 100;

    return (
        <>
            {/* Hero Header */}
            <section className="relative bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 text-white overflow-hidden">
                {/* Background image */}
                {campaign.images?.[0] && (
                    <div className="absolute inset-0">
                        <img
                            src={campaign.images[0]}
                            alt=""
                            className="h-full w-full object-cover opacity-20"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/80 via-emerald-800/90 to-emerald-700" />
                    </div>
                )}

                <div className="container px-4 md:px-6 py-12 md:py-16 relative z-10">
                    {/* Back button */}
                    <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors mb-6 text-sm">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại
                    </Link>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="rounded-full bg-emerald-600/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium">
                            {getStatusLabel(campaign.status)}
                        </span>
                        <span className="rounded-full bg-emerald-500/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4" />
                            Xác minh AI
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight max-w-3xl">
                        {campaign.title}
                    </h1>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-emerald-200 text-sm">
                        {campaign.startDate && (
                            <span className="flex items-center gap-1">
                                📅 {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {campaign.viewCount} lượt xem
                        </span>
                        <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {campaign.likeCount} lượt thích
                        </span>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="container px-4 md:px-6 py-10">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Content with Tabs */}
                    <div className="lg:col-span-2">
                        {/* Tab buttons */}
                        <div className="flex bg-muted/50 rounded-2xl p-1.5 mb-8 border border-border">
                            {(["story", "transparency", "updates"] as TabType[]).map((tab) => {
                                const labels: Record<TabType, { icon: string; label: string }> = {
                                    story: { icon: "📖", label: "Câu Chuyện" },
                                    transparency: { icon: "🔍", label: "Minh Bạch" },
                                    updates: { icon: "📢", label: "Cập Nhật" },
                                };
                                const info = labels[tab];
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all duration-200 ${activeTab === tab
                                            ? "bg-emerald-700 text-white shadow-md"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <span>{info.icon}</span>
                                        {info.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "story" && <StoryTab campaign={campaign} />}
                            {activeTab === "transparency" && <TransparencyTab campaign={campaign} />}
                            {activeTab === "updates" && <UpdatesTab campaign={campaign} />}
                        </motion.div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-6">
                            {/* Donation Card */}
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
                                        <span>{Math.round(progress)}% đạt được</span>
                                        {isCompleted ? (
                                            <span className="text-emerald-600 font-medium">Hoàn thành</span>
                                        ) : (
                                            <span>{getStatusLabel(campaign.status)}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Buttons */}
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
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Xác Minh AI</p>
                                            <p className="text-xs text-muted-foreground">Danh tính & hồ sơ đã xác nhận</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <LinkIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Blockchain</p>
                                            <p className="text-xs text-muted-foreground">Mọi giao dịch được ghi nhận</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <CheckCircle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">100% Minh Bạch</p>
                                            <p className="text-xs text-muted-foreground">Theo dõi dòng tiền thời gian thực</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Campaign images */}
                            {campaign.images && campaign.images.length > 1 && (
                                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                    <h3 className="font-semibold text-foreground mb-3">Hình Ảnh</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {campaign.images.slice(0, 4).map((img, i) => (
                                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                                                <img src={img} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
