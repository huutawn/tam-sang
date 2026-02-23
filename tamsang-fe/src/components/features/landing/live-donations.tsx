"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Users, HeartHandshake, ShieldCheck, Activity } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DonationItem {
    id: number;
    donor: string;
    campaign: string;
    amount: string;
    timeAgo: string;
}

const MOCK_DONATIONS: DonationItem[] = [
    { id: 1, donor: "Ẩn danh", campaign: "Nước Sạch Cho Tây Nguyên", amount: "500.000₫", timeAgo: "2 giây trước" },
    { id: 2, donor: "Nguyễn Thị Hoa", campaign: "Giáo Dục Cho Trẻ Mồ Côi", amount: "1.000.000₫", timeAgo: "15 giây trước" },
    { id: 3, donor: "Trần Minh Khôi", campaign: "Hỗ Trợ Y Tế Ung Thư", amount: "2.500.000₫", timeAgo: "1 phút trước" },
    { id: 4, donor: "Lê Thu Hằng", campaign: "Xây Nhà Sau Bão Lũ", amount: "750.000₫", timeAgo: "2 phút trước" },
    { id: 5, donor: "Phạm Văn Đức", campaign: "Cứu Trợ Miền Trung", amount: "3.000.000₫", timeAgo: "3 phút trước" },
];

export function LiveDonations() {
    const [donations, setDonations] = useState<DonationItem[]>(MOCK_DONATIONS);

    // Simulate new donations arriving
    const rotateDonation = useCallback(() => {
        setDonations((prev) => {
            const newId = Date.now();
            const randomDonor = ["Ẩn danh", "Hoàng Anh", "Minh Tâm", "Bảo Ngọc", "Thanh Hà"][Math.floor(Math.random() * 5)];
            const randomCampaign = [
                "Nước Sạch Cho Tây Nguyên",
                "Giáo Dục Trẻ Em Vùng Cao",
                "Hỗ Trợ Y Tế Cộng Đồng",
                "Xây Trường Học Mới",
            ][Math.floor(Math.random() * 4)];
            const randomAmount = [
                "100.000₫", "250.000₫", "500.000₫", "1.000.000₫", "2.000.000₫",
            ][Math.floor(Math.random() * 5)];

            const newDonation: DonationItem = {
                id: newId,
                donor: randomDonor,
                campaign: randomCampaign,
                amount: randomAmount,
                timeAgo: "vừa xong",
            };

            return [newDonation, ...prev.slice(0, 4)];
        });
    }, []);

    useEffect(() => {
        const interval = setInterval(rotateDonation, 8000);
        return () => clearInterval(interval);
    }, [rotateDonation]);

    return (
        <section className="container px-4 py-16 md:px-6 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                {/* Left Column: Total Impact Summary */}
                <div className="flex flex-col gap-8">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
                        >
                            Tác Động <span className="text-emerald-600">Thực Tế</span>
                            <br />
                            Tạo Nên Thay Đổi Lớn
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="mt-4 text-lg text-muted-foreground leading-relaxed"
                        >
                            Sự đóng góp của cộng đồng đã và đang tiếp sức cho hàng trăm chiến dịch thiết thực, mang lại cuộc sống tốt đẹp hơn cho những hoàn cảnh khó khăn trên khắp cả nước.
                        </motion.p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {/* Stat 1 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex flex-col gap-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">15.000+</h3>
                                <p className="text-sm font-medium text-muted-foreground">Nhà Hảo Tâm</p>
                            </div>
                        </motion.div>

                        {/* Stat 2 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="rounded-2xl border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex flex-col gap-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                                <HeartHandshake className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">320</h3>
                                <p className="text-sm font-medium text-muted-foreground">Chiến Dịch Hoàn Thành</p>
                            </div>
                        </motion.div>

                        {/* Stat 3 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="rounded-2xl border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex flex-col gap-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">22.5 Tỷ ₫</h3>
                                <p className="text-sm font-medium text-muted-foreground">Được Giải Ngân An Toàn</p>
                            </div>
                        </motion.div>

                        {/* Stat 4 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                            className="rounded-2xl border border-border bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex flex-col gap-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">100%</h3>
                                <p className="text-sm font-medium text-muted-foreground">Minh Bạch Giao Dịch</p>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="pt-2"
                    >
                        <Link href="/about">
                            <Button size="lg" variant="outline" className="gap-2 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50 px-8">
                                Tìm Hiểu Thêm Về Tác Động
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* Right Column: Live Feed List */}
                <div className="bg-muted/30 p-6 md:p-8 rounded-3xl border border-border relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-foreground">Quyên Góp Trực Tiếp</h2>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">Cập nhật 2 giây trước</p>
                    </div>

                    {/* Feed list */}
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {donations.map((d) => (
                                <motion.div
                                    key={d.id}
                                    layout
                                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Avatar */}
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 text-emerald-800 text-sm font-bold">
                                        {d.donor.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground text-sm">{d.donor}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            đã quyên góp cho{" "}
                                            <span className="font-medium text-foreground">{d.campaign}</span>
                                        </p>
                                        <p className="text-xs text-emerald-600 mt-0.5">{d.timeAgo}</p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right shrink-0">
                                        <span className="text-lg font-bold text-emerald-600">{d.amount}</span>
                                    </div>

                                    {/* Border accent */}
                                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600 hidden sm:block" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="mt-8"
                    >
                        <Link href="/campaigns">
                            <Button className="w-full rounded-xl py-6 text-base font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-lg">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Tham gia cùng 2.847 nhà hảo tâm hôm nay
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
