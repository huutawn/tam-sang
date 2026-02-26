"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, ChevronLeft, ChevronRight, Heart, MapPin, CheckCircle } from "lucide-react";
import { usePagedCampaigns } from "@/hooks/use-campaigns";
import { CampaignPageItem } from "@/services/campaign.service";
import { AppLayout } from "@/components/layout";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

const CATEGORIES = [
    { value: "ALL", label: "Tất Cả", icon: "🌍" },
    { value: "HEALTHCARE", label: "Y Tế", icon: "🏥" },
    { value: "EDUCATION", label: "Giáo Dục", icon: "📚" },
    { value: "ENVIRONMENT", label: "Môi Trường", icon: "🌿" },
    { value: "DISASTER_RELIEF", label: "Cứu Trợ", icon: "🆘" },
    { value: "COMMUNITY", label: "Cộng Đồng", icon: "🏘️" },
    { value: "CHILDREN", label: "Trẻ Em", icon: "👶" },
];

function formatVND(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function getDaysLeft(endDate: string | null): string | null {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Đã kết thúc";
    if (diff === 0) return "Hôm nay";
    return `${diff} ngày còn lại`;
}

function getStatusBadge(status: string): { text: string; color: string } | null {
    switch (status) {
        case "COMPLETED":
            return { text: "Hoàn thành", color: "bg-emerald-500" };
        case "ACTIVE":
            return null;
        case "PAUSED":
            return { text: "Tạm dừng", color: "bg-yellow-500" };
        default:
            return null;
    }
}

function CampaignGridCard({ campaign }: { campaign: CampaignPageItem }) {
    const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
    const daysLeft = getDaysLeft(campaign.endDate);
    const statusBadge = getStatusBadge(campaign.status);
    const isCompleted = campaign.status === "COMPLETED" || progress >= 100;

    return (
        <Link href={`/campaigns/${campaign.id}`}>
            <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-all duration-300 h-full"
            >
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-muted">
                    {campaign.images?.[0] ? (
                        <img
                            src={campaign.images[0]}
                            alt={campaign.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800">
                            <span className="text-5xl">🌿</span>
                        </div>
                    )}

                    {/* Status badge */}
                    {statusBadge && (
                        <span className={`absolute top-3 left-3 rounded-full ${statusBadge.color} px-3 py-1 text-xs font-semibold text-white shadow-md flex items-center gap-1`}>
                            {statusBadge.text === "Hoàn thành" && <CheckCircle className="h-3 w-3" />}
                            {statusBadge.text}
                        </span>
                    )}

                    {/* Completed badge */}
                    {isCompleted && !statusBadge && (
                        <span className="absolute top-3 left-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-md flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Hoàn thành
                        </span>
                    )}

                    {/* Verified badge */}
                    {campaign.status === "ACTIVE" && (
                        <span className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                            <CheckCircle className="h-4 w-4" />
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-2 p-5">
                    {/* Title */}
                    <h3 className="text-lg font-bold leading-snug text-foreground line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {campaign.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {campaign.content}
                    </p>

                    {/* Progress */}
                    <div className="mt-auto pt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Đã quyên góp</span>
                            <span className="font-semibold text-emerald-700">
                                {formatVND(campaign.currentAmount)} / {formatVND(campaign.targetAmount)}
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />

                        {/* Footer stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <Heart className="h-3.5 w-3.5" />
                                    {campaign.likeCount}
                                </span>
                            </div>
                            {isCompleted ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Hoàn thành
                                </span>
                            ) : daysLeft ? (
                                <span>⏳ {daysLeft}</span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

export default function CampaignsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const { data, isLoading } = usePagedCampaigns(page, 18);

    const campaigns = data?.data ?? [];
    const totalPages = data?.totalPages ?? 1;
    const totalElements = data?.totalElements ?? 0;

    // Client-side search filter (ideally this would be server-side)
    const filtered = campaigns.filter((c) => {
        const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.content?.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    return (
        <AppLayout>
            {/* Hero */}
            <section className="relative bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIGZpbGwtcnVsZT0ibm9uemVybyI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzRoLTZ2LTZoNnYtNmg2djZoNnY2aC02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                <div className="container px-4 md:px-6 py-16 md:py-24 text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
                    >
                        Khám Phá Chiến Dịch
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-4 text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto leading-relaxed"
                    >
                        Mỗi chiến dịch được xác minh bởi AI và theo dõi trên blockchain. Sự quyên góp của bạn tạo nên tác động thực sự, minh bạch.
                    </motion.p>

                    {/* Search */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8 max-w-xl mx-auto"
                    >
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm chiến dịch theo tên..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-full bg-white/95 backdrop-blur-sm pl-12 pr-6 py-4 text-foreground shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-muted-foreground"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Filters + Content */}
            <section className="container px-4 md:px-6 py-10">
                {/* Category pills */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 border ${selectedCategory === cat.value
                                    ? "bg-emerald-700 text-white border-emerald-700 shadow-md"
                                    : "bg-card text-foreground border-border hover:bg-muted hover:border-emerald-300"
                                }`}
                        >
                            <span>{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Count */}
                <p className="text-sm text-muted-foreground mb-6">
                    Hiển thị <span className="font-semibold text-emerald-700">{totalElements}</span> chiến dịch
                </p>

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    </div>
                )}

                {/* Empty */}
                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-xl text-muted-foreground">Không tìm thấy chiến dịch nào.</p>
                        <p className="text-sm text-muted-foreground mt-2">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                )}

                {/* Grid */}
                {!isLoading && filtered.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((c, i) => (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <CampaignGridCard campaign={c} />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .map((p, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && p - prev > 1;

                                return (
                                    <span key={p} className="flex items-center gap-1">
                                        {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                                        <button
                                            onClick={() => setPage(p)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${page === p
                                                    ? "bg-emerald-700 text-white shadow-md"
                                                    : "border border-border bg-card hover:bg-muted"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                );
                            })}

                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
