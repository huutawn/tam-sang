"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface Testimonial {
    quote: string;
    name: string;
    role: string;
}

interface StatBadge {
    icon: React.ReactNode;
    value: string;
    label: string;
}

interface FeatureCard {
    icon: React.ReactNode;
    title: string;
    description: string;
    tags?: string[];
}

interface AuthLayoutProps {
    children: React.ReactNode;
    backgroundImage: string;
    testimonial: Testimonial;
    stats?: StatBadge[];
    featureCards?: FeatureCard[];
}

export function AuthLayout({
    children,
    backgroundImage,
    testimonial,
    stats,
    featureCards,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen">
            {/* ── Left: Form ── */}
            <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2 lg:px-20 xl:px-28">
                {children}
            </div>

            {/* ── Right: Image + Overlay ── */}
            <div className="relative hidden lg:flex lg:w-1/2 items-end">
                {/* Background image */}
                <Image
                    src={backgroundImage}
                    alt="Tam Sang community"
                    fill
                    className="object-cover"
                    priority
                    quality={90}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-900/30 to-emerald-800/10" />

                {/* Content overlay */}
                <div className="relative z-10 flex flex-col gap-4 w-full p-8">
                    {/* Feature cards (top area) */}
                    {featureCards && featureCards.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="absolute top-8 right-8 left-8 flex flex-col gap-3"
                        >
                            {featureCards.map((card, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl bg-white/90 backdrop-blur-md p-4 shadow-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                                            {card.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm">
                                                {card.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                {card.description}
                                            </p>
                                            {card.tags && (
                                                <div className="flex gap-2 mt-2">
                                                    {card.tags.map((tag, j) => (
                                                        <span
                                                            key={j}
                                                            className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Stats row */}
                    {stats && stats.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="grid gap-3"
                            style={{
                                gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
                            }}
                        >
                            {stats.map((stat, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur-md px-4 py-3 shadow-lg"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stat.value}
                                        </p>
                                        <p className="text-[11px] text-gray-500">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Testimonial */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="rounded-2xl bg-white/90 backdrop-blur-md p-5 shadow-lg"
                    >
                        <div className="relative">
                            <span className="text-3xl text-emerald-500 leading-none font-serif">
                                &ldquo;&ldquo;
                            </span>
                            <p className="text-sm text-gray-700 italic leading-relaxed mt-1">
                                {testimonial.quote}
                            </p>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-bold">
                                {testimonial.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {testimonial.name}
                                </p>
                                <p className="text-xs text-gray-500">{testimonial.role}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
