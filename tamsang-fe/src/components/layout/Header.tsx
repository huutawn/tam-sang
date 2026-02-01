"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, ChevronDown, Heart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Trang chủ", href: "/" },
    { name: "Chiến dịch", href: "/campaigns" },
    { name: "Về chúng tôi", href: "/about" },
];

export function Header() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const { user, isAuthenticated } = useAuthStore();
    const logoutMutation = useLogout();

    const handleLogout = () => {
        logoutMutation.mutate();
        setUserMenuOpen(false);
    };

    const getDashboardLink = () => {
        switch (user?.role) {
            case "ADMIN":
                return "/admin";
            case "ORGANIZER":
                return "/campaign-manager";
            default:
                return "/profile";
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <nav className="container flex h-16 items-center justify-between px-4 md:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-emerald-700">
                        <Heart className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-linear-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                        TamSang
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex md:items-center md:gap-x-8">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-emerald-600",
                                pathname === item.href
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                            )}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Desktop User Actions */}
                <div className="hidden md:flex md:items-center md:gap-x-4">
                    {isAuthenticated && user ? (
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/80"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold">
                                    {user.email?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <span className="max-w-[100px] truncate">{user.email}</span>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", userMenuOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {userMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute right-0 mt-2 w-48 rounded-lg border bg-background p-1 shadow-lg"
                                    >
                                        <Link
                                            href={getDashboardLink()}
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <LayoutDashboard className="h-4 w-4" />
                                            Dashboard
                                        </Link>
                                        <Link
                                            href="/profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <User className="h-4 w-4" />
                                            Hồ sơ
                                        </Link>
                                        <hr className="my-1" />
                                        <button
                                            onClick={handleLogout}
                                            disabled={logoutMutation.isPending}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Đăng xuất
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    Đăng nhập
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                    Đăng ký
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <span className="sr-only">Toggle menu</span>
                    {mobileMenuOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t bg-background"
                    >
                        <div className="container space-y-1 px-4 pb-4 pt-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "block rounded-lg px-3 py-2 text-base font-medium transition-colors",
                                        pathname === item.href
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <hr className="my-2" />
                            {isAuthenticated && user ? (
                                <>
                                    <Link
                                        href={getDashboardLink()}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted"
                                    >
                                        <LayoutDashboard className="h-5 w-5" />
                                        Dashboard
                                    </Link>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted"
                                    >
                                        <User className="h-5 w-5" />
                                        Hồ sơ
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base font-medium text-destructive hover:bg-destructive/10"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Đăng xuất
                                    </button>
                                </>
                            ) : (
                                <div className="flex gap-2 pt-2">
                                    <Link href="/login" className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            Đăng nhập
                                        </Button>
                                    </Link>
                                    <Link href="/register" className="flex-1">
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                            Đăng ký
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
