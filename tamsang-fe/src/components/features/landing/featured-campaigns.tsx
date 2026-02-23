"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { CampaignCard } from "@/components/features/campaigns/campaign-card";

// Mock data – sẽ được thay bằng API thật sau này
const MOCK_CAMPAIGNS = [
    {
        id: "1",
        imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=75",
        title: "Nước Sạch Cho Vùng Cao Hà Giang",
        description: "Xây dựng hệ thống lọc nước bền vững cho 500 hộ gia đình ở các bản làng vùng núi Hà Giang. Mỗi giọt nước đều quý giá.",
        location: "Tỉnh Hà Giang",
        currentAmount: 45000000,
        targetAmount: 45000000,
        badge: "Đạt mục tiêu trong 12 ngày",
        isVerified: true,
    },
    {
        id: "2",
        imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=75",
        title: "Giáo Dục Cho Trẻ Em TP.HCM",
        description: "Cung cấp đồ dùng học tập, đồng phục và bữa ăn trưa cho trẻ em có hoàn cảnh khó khăn tại thành phố Hồ Chí Minh.",
        location: "TP. Hồ Chí Minh",
        currentAmount: 28000000,
        targetAmount: 50000000,
        badge: undefined,
        isVerified: true,
    },
    {
        id: "3",
        imageUrl: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=75",
        title: "Hỗ Trợ Y Tế Bệnh Nhân Ung Thư",
        description: "Giúp đỡ chi phí điều trị cho bệnh nhân ung thư nghèo tại các bệnh viện lớn trên toàn quốc.",
        location: "Hà Nội",
        currentAmount: 120000000,
        targetAmount: 200000000,
        badge: undefined,
        isVerified: true,
    },
    {
        id: "4",
        imageUrl: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600&q=75",
        title: "Xây Cầu Bắc Qua Sông Cho Bản Làng",
        description: "Xây cầu bê tông kiên cố thay thế cầu treo cũ xuống cấp, đảm bảo an toàn cho hàng trăm người dân đi lại mỗi ngày.",
        location: "Tỉnh Lai Châu",
        currentAmount: 80000000,
        targetAmount: 150000000,
        badge: "Khẩn cấp",
        isVerified: false,
    },
    {
        id: "5",
        imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=75",
        title: "Cứu Trợ Lũ Lụt Miền Trung",
        description: "Hỗ trợ khẩn cấp lương thực, nước uống và nơi ở tạm cho người dân vùng lũ tại các tỉnh miền Trung Việt Nam.",
        location: "Tỉnh Quảng Bình",
        currentAmount: 350000000,
        targetAmount: 500000000,
        badge: undefined,
        isVerified: true,
    },
];

export function FeaturedCampaigns() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

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

                {/* Horizontal scroll row */}
                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {MOCK_CAMPAIGNS.map((c) => (
                        <div key={c.id} className="snap-start">
                            <CampaignCard
                                imageUrl={c.imageUrl}
                                title={c.title}
                                description={c.description}
                                location={c.location}
                                currentAmount={c.currentAmount}
                                targetAmount={c.targetAmount}
                                badge={c.badge}
                                isVerified={c.isVerified}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
