import Link from "next/link";
import { Heart, Mail, Phone, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

const footerLinks = {
    platform: [
        { name: "Trang chủ", href: "/" },
        { name: "Chiến dịch", href: "/campaigns" },
        { name: "Cách hoạt động", href: "/how-it-works" },
        { name: "Về chúng tôi", href: "/about" },
    ],
    support: [
        { name: "Trung tâm hỗ trợ", href: "/help" },
        { name: "Câu hỏi thường gặp", href: "/faq" },
        { name: "Liên hệ", href: "/contact" },
        { name: "Báo cáo vi phạm", href: "/report" },
    ],
    legal: [
        { name: "Điều khoản sử dụng", href: "/terms" },
        { name: "Chính sách bảo mật", href: "/privacy" },
        { name: "Quy chế hoạt động", href: "/regulations" },
    ],
};

const socialLinks = [
    { name: "Facebook", href: "https://facebook.com", icon: Facebook },
    { name: "Twitter", href: "https://twitter.com", icon: Twitter },
    { name: "Instagram", href: "https://instagram.com", icon: Instagram },
    { name: "Youtube", href: "https://youtube.com", icon: Youtube },
];

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t bg-muted/30">
            <div className="container px-4 py-12 md:px-6">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                    {/* Brand & Description */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-emerald-700">
                                <Heart className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-linear-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                                TamSang
                            </span>
                        </Link>
                        <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                            Hệ sinh thái thiện nguyện minh bạch, nơi mọi đóng góp được theo dõi, xác minh bởi AI và ghi lại trên blockchain.
                        </p>

                        {/* Contact Info */}
                        <div className="mt-6 space-y-2">
                            <a
                                href="mailto:support@tamsang.org"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                support@tamsang.org
                            </a>
                            <a
                                href="tel:+84123456789"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-600 transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                +84 123 456 789
                            </a>
                        </div>

                        {/* Social Links */}
                        <div className="mt-6 flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-emerald-100 hover:text-emerald-600"
                                    aria-label={social.name}
                                >
                                    <social.icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Nền tảng</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.platform.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground transition-colors hover:text-emerald-600"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Hỗ trợ</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground transition-colors hover:text-emerald-600"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Pháp lý</h3>
                        <ul className="mt-4 space-y-2">
                            {footerLinks.legal.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground transition-colors hover:text-emerald-600"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 border-t pt-8">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <p className="text-sm text-muted-foreground">
                            © {currentYear} TamSang. Tất cả quyền được bảo lưu.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Được xây dựng với{" "}
                            <Heart className="inline h-3 w-3 text-red-500" /> bởi đội ngũ
                            TamSang
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
