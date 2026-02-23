"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Clock, ShieldCheck, CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

/* ──────────────────────────────────────────────────────────
   Sub‑component: Blockchain Stats Widget (overlay bên phải)
   ────────────────────────────────────────────────────────── */
function BlockchainStatsWidget() {
    const recentDonations = [
        { donor: "Ẩn danh", campaign: "Nước sạch cho Tây Nguyên", amount: "500.000₫" },
        { donor: "Nguyễn Văn A", campaign: "Xây trường học vùng cao", amount: "1.000.000₫" },
        { donor: "Trần Thị B", campaign: "Hỗ trợ y tế", amount: "200.000₫" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative hidden lg:block w-full max-w-md"
        >
            {/* Main card */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 shadow-2xl">
                {/* Title row */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-base">Blockchain Trực Tiếp</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
                        <Clock className="h-3 w-3" /> Thời gian thực
                    </span>
                </div>

                {/* Blockchain nodes (decorative) */}
                <div className="relative h-28 mb-4">
                    <svg viewBox="0 0 300 100" className="w-full h-full" fill="none">
                        {/* Lines */}
                        <line x1="50" y1="30" x2="120" y2="65" stroke="rgba(134,239,172,0.4)" strokeWidth="2" />
                        <line x1="120" y1="65" x2="190" y2="30" stroke="rgba(134,239,172,0.4)" strokeWidth="2" />
                        <line x1="190" y1="30" x2="260" y2="65" stroke="rgba(134,239,172,0.4)" strokeWidth="2" />
                        <line x1="50" y1="30" x2="120" y2="30" stroke="rgba(134,239,172,0.25)" strokeWidth="1.5" />
                        <line x1="120" y1="65" x2="190" y2="65" stroke="rgba(134,239,172,0.25)" strokeWidth="1.5" />

                        {/* Nodes */}
                        {[
                            { cx: 50, cy: 30 },
                            { cx: 120, cy: 30 },
                            { cx: 190, cy: 30 },
                            { cx: 260, cy: 30 },
                            { cx: 120, cy: 65 },
                            { cx: 190, cy: 65 },
                        ].map((pos, i) => (
                            <g key={i}>
                                <circle cx={pos.cx} cy={pos.cy} r="14" fill="rgba(16,185,129,0.15)" stroke="rgba(134,239,172,0.6)" strokeWidth="2" />
                                <motion.circle
                                    cx={pos.cx}
                                    cy={pos.cy}
                                    r="6"
                                    fill="#86efac"
                                    initial={{ scale: 0.8, opacity: 0.5 }}
                                    animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                                />
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Stat card: verified today */}
                <div className="rounded-xl bg-white/90 dark:bg-white/95 p-3 mb-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Lượt xác nhận hôm nay</span>
                        <motion.span
                            className="text-xl font-bold text-emerald-600"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                        >
                            2.847
                        </motion.span>
                    </div>
                </div>

                {/* Recent donation rows */}
                {recentDonations.slice(0, 2).map((d, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-white/90 dark:bg-white/95 p-2.5 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold shrink-0">
                            {d.donor.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700 truncate flex-1">{d.amount} → {d.campaign}</span>
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>
                ))}

                {/* Badges */}
                <div className="flex gap-2 mt-3">
                    <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-white/10 px-3 py-1.5 text-xs text-white/90">
                        <ShieldCheck className="h-3.5 w-3.5" /> AI Xác Minh
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-white/10 px-3 py-1.5 text-xs text-white/90">
                        <Lock className="h-3.5 w-3.5" /> Blockchain
                    </span>
                </div>
            </div>

            {/* Floating accent circle top‑right */}
            <motion.div
                className="absolute -top-4 -right-4 h-14 w-14 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.8 }}
            >
                <CheckCircle className="h-7 w-7 text-white" />
            </motion.div>
        </motion.div>
    );
}

/* ──────────────────────────────────────────────
   Main export: HeroSection
   ────────────────────────────────────────────── */
export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0a3d2a] via-[#145a3a] to-[#1a6f44]">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-[100px]" />
            </div>

            <div className="container relative px-4 py-20 md:px-6 md:py-28 lg:py-36">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    {/* Left content */}
                    <div className="flex flex-col gap-6">
                        {/* Badge */}
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-1.5 text-sm text-emerald-300"
                        >
                            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                            Nền tảng Blockchain + AI
                        </motion.span>

                        {/* Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
                        >
                            Mỗi Lượt Quyên Góp
                            <br className="hidden sm:inline" /> Đều Được Theo Dõi.
                            <br className="hidden sm:inline" /> Mỗi Lời Hứa
                            <br className="hidden sm:inline" /> Đều Được Giữ.
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="max-w-lg text-base leading-relaxed text-emerald-100/80 md:text-lg"
                        >
                            Theo dõi tác động của bạn theo thời gian thực thông qua sổ cái blockchain minh bạch.
                            Chiến dịch được AI xác minh. Không phí ẩn.
                        </motion.p>

                        {/* CTA buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex flex-wrap gap-3"
                        >
                            <Link href="/campaigns">
                                <Button
                                    size="lg"
                                    className="gap-2 bg-white text-emerald-800 hover:bg-emerald-50 font-semibold rounded-xl px-7 shadow-lg"
                                >
                                    Bắt Đầu Cho Đi <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/about">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="rounded-xl border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10 hover:text-white px-7"
                                >
                                    Xem Cách Hoạt Động
                                </Button>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Right – Blockchain widget */}
                    <BlockchainStatsWidget />
                </div>
            </div>
        </section>
    );
}
