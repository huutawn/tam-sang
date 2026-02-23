"use client";

import { motion } from "framer-motion";
import { MapPin, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CampaignCardProps {
    imageUrl?: string;
    title: string;
    description: string;
    location: string;
    currentAmount: number;
    targetAmount: number;
    badge?: string;       // e.g. "Đạt mục tiêu trong 12 ngày"
    isVerified?: boolean;
}

export function CampaignCard({
    imageUrl,
    title,
    description,
    location,
    currentAmount,
    targetAmount,
    badge,
    isVerified = false,
}: CampaignCardProps) {
    const progress = Math.min((currentAmount / targetAmount) * 100, 100);

    const formatVND = (amount: number) =>
        new Intl.NumberFormat("vi-VN").format(amount) + "₫";

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-xl transition-shadow duration-300 w-full max-w-sm shrink-0"
        >
            {/* Image */}
            <div className="relative h-52 overflow-hidden bg-muted">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800">
                        <span className="text-4xl">🌿</span>
                    </div>
                )}

                {/* Badge (top‑left) */}
                {badge && (
                    <span className="absolute top-3 left-3 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow">
                        {badge}
                    </span>
                )}

                {/* Verified (top‑right) */}
                {isVerified && (
                    <span className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                        <CheckCircle className="h-4 w-4" />
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 p-5">
                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {location}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold leading-snug text-foreground line-clamp-1">{title}</h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{description}</p>

                {/* Progress */}
                <div className="mt-auto pt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-muted-foreground">Tiến độ</span>
                        <span className="font-semibold text-foreground">
                            {formatVND(currentAmount)} / {formatVND(targetAmount)}
                        </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </div>
        </motion.div>
    );
}
