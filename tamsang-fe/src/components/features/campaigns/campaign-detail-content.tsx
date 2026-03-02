"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck, Eye, Heart } from "lucide-react";
import { useCampaignDetail } from "@/hooks/use-campaigns";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { StoryTab } from "./tabs/story-tab";
import { TransparencyTab } from "./tabs/transparency-tab";
import { UpdatesTab } from "./tabs/updates-tab";
import { CampaignSidebar } from "./campaign-sidebar";

type TabType = "story" | "transparency" | "updates";

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

    return (
        <>
            {/* Hero Header */}
            <section className="relative bg-linear-to-b from-emerald-900 via-emerald-800 to-emerald-700 text-white overflow-hidden">
                {campaign.images?.[0] && (
                    <div className="absolute inset-0">
                        <img
                            src={campaign.images[0]}
                            alt=""
                            className="h-full w-full object-cover opacity-20"
                        />
                        <div className="absolute inset-0 bg-linear-to-b from-emerald-900/80 via-emerald-800/90 to-emerald-700" />
                    </div>
                )}

                <div className="container px-4 md:px-6 py-12 md:py-16 relative z-10">
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
                    {/* Left: Tabs */}
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

                        {/* Tab content */}
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
                        <CampaignSidebar campaign={campaign} />
                    </div>
                </div>
            </section>
        </>
    );
}
