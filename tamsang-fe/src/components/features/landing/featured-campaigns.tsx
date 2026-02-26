"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { CampaignCard } from "@/components/features/campaigns/campaign-card";
import { useFeaturedCampaigns } from "@/hooks/use-campaigns";

export function FeaturedCampaigns() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const { data, isLoading } = useFeaturedCampaigns(1, 20);
    const campaigns = data?.data ?? [];

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    const scroll = (direction: "left" | "right") => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = direction === "left" ? -380 : 380;
        el.scrollBy({ left: amount, behavior: "smooth" });
        setTimeout(checkScroll, 350);
    };

    return (
        <section className="py-16 md:py-24 bg-muted/30">
            <div className="container px-4 md:px-6">
                {/* Section header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                        >
                            Chiến Dịch Nổi Bật
                        </motion.h2>
                        <p className="mt-2 text-muted-foreground max-w-lg">
                            Những chiến dịch cần sự quan tâm và hỗ trợ ngay từ cộng đồng.
                        </p>
                    </div>

                    {/* Navigation arrows */}
                    <div className="hidden sm:flex gap-2">
                        <button
                            onClick={() => scroll("left")}
                            disabled={!canScrollLeft}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Cuộn sang trái"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => scroll("right")}
                            disabled={!canScrollRight}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Cuộn sang phải"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && campaigns.length === 0 && (
                    <p className="text-center text-muted-foreground py-16">
                        Chưa có chiến dịch nào.
                    </p>
                )}

                {/* Horizontal scroll row */}
                {!isLoading && campaigns.length > 0 && (
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {campaigns.map((c) => (
                            <div key={c.id} className="snap-start">
                                <CampaignCard
                                    imageUrl={c.images?.[0]}
                                    title={c.title}
                                    description={c.content || ""}
                                    location=""
                                    currentAmount={c.currentAmount}
                                    targetAmount={c.targetAmount}
                                    badge={c.status === "URGENT" ? "Khẩn cấp" : undefined}
                                    isVerified={c.status === "ACTIVE"}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
