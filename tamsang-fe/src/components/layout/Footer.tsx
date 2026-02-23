"use client";

import Link from "next/link";
import { Heart, Facebook, Instagram, Send } from "lucide-react";
import { useState } from "react";

const footerLinks = {
    platform: [
        { name: "Cách hoạt động", href: "/how-it-works" },
        { name: "Kiểm toán Blockchain", href: "/blockchain-audit" },
        { name: "Xác minh AI", href: "/ai-verification" },
        { name: "Bảng giá", href: "/pricing" },
    ],
    campaigns: [
        { name: "Xem tất cả", href: "/campaigns" },
        { name: "Y tế", href: "/campaigns?category=healthcare" },
        { name: "Giáo dục", href: "/campaigns?category=education" },
        { name: "Khẩn cấp", href: "/campaigns?category=emergency" },
        { name: "Tạo chiến dịch", href: "/campaigns/create" },
    ],
    support: [
        { name: "Trung tâm hỗ trợ", href: "/help" },
        { name: "Liên hệ", href: "/contact" },
        { name: "An toàn & Tin cậy", href: "/trust-safety" },
        { name: "Pháp lý", href: "/legal" },
    ],
};

const socialLinks = [
    { name: "Facebook", href: "https://facebook.com", icon: Facebook },
    { name: "Instagram", href: "https://instagram.com", icon: Instagram },
];

export function Footer() {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState("");

    return (
        <footer className="bg-gradient-to-b from-[#0d3622] to-[#0a2a1a] text-emerald-100">
            <div className="container px-4 py-14 md:px-6">
                <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
                    {/* Brand column */}
                    <div className="lg:col-span-2 space-y-5">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                                <Heart className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">TamSang</span>
                        </Link>

                        <p className="max-w-xs text-sm text-emerald-300/70 leading-relaxed">
                            Thiện nguyện minh bạch, được vận hành bởi công nghệ.
                        </p>

                        {/* Social icons */}
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800/50 text-emerald-300 transition-colors hover:bg-emerald-700 hover:text-white"
                                    aria-label={social.name}
                                >
                                    <social.icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>

                        {/* Email subscription */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setEmail("");
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email của bạn"
                                className="flex-1 rounded-lg bg-emerald-900/60 border border-emerald-700/40 px-3 py-2 text-sm text-white placeholder:text-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
                            >
                                Đăng ký
                            </button>
                        </form>
                    </div>

                    {/* Platform links */}
                    <div>
                        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Nền Tảng</h3>
                        <ul className="mt-4 space-y-2.5">
                            {footerLinks.platform.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-emerald-300/70 transition-colors hover:text-white"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Campaign links */}
                    <div>
                        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Chiến Dịch</h3>
                        <ul className="mt-4 space-y-2.5">
                            {footerLinks.campaigns.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-emerald-300/70 transition-colors hover:text-white"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support links */}
                    <div>
                        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Hỗ Trợ</h3>
                        <ul className="mt-4 space-y-2.5">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-emerald-300/70 transition-colors hover:text-white"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 border-t border-emerald-800/50 pt-6">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <p className="text-xs text-emerald-400/60">
                            © {currentYear} TamSang. Được xây dựng với{" "}
                            <Heart className="inline h-3 w-3 text-red-400" /> cho sự minh bạch.
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-emerald-400/60">
                            <Link href="/privacy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
                            <span>•</span>
                            <Link href="/terms" className="hover:text-white transition-colors">Điều khoản</Link>
                            <span>•</span>
                            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
