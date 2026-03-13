"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Megaphone,
    Wallet,
    FileCheck,
    Heart,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Shield,
} from "lucide-react";
import { useState } from "react";

const adminNavItems = [
    { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { name: "Quản lý người dùng", href: "/admin/users", icon: Users },
    { name: "Quản lý chiến dịch", href: "/admin/campaigns", icon: Megaphone },
    { name: "Yêu cầu rút tiền", href: "/admin/withdrawals", icon: Wallet },
    { name: "Bằng chứng", href: "/admin/proofs", icon: FileCheck },
    { name: "Thống kê quyên góp", href: "/admin/donations", icon: Heart },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: "#f5f7f3" }}>
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col border-r transition-all duration-300 h-screen sticky top-0",
                    collapsed ? "w-[72px]" : "w-[260px]"
                )}
                style={{ backgroundColor: "#fafdf8", borderColor: "#e8f0e4" }}
            >
                {/* Logo */}
                <div
                    className="flex items-center gap-3 px-5 py-5"
                    style={{ borderBottom: "1px solid #e8f0e4" }}
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 shrink-0">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-bold text-slate-900 tracking-tight">
                            Admin Panel
                        </span>
                    )}
                </div>

                {/* Collapse toggle */}
                <div className="flex justify-end px-3 py-2">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-md hover:bg-emerald-100 text-gray-500 transition-colors"
                        aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="w-4 h-4" />
                        ) : (
                            <PanelLeftClose className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1">
                    {adminNavItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/admin" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "text-gray-600 hover:bg-emerald-50/60 hover:text-emerald-700"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-600 rounded-r-full" />
                                )}
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 shrink-0",
                                        isActive
                                            ? "text-emerald-600"
                                            : "text-gray-400 group-hover:text-emerald-500"
                                    )}
                                />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4" style={{ borderTop: "1px solid #e8f0e4" }}>
                    {!collapsed && (
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Về trang chủ</span>
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header
                    className="sticky top-0 z-40 flex items-center justify-between h-14 px-6 bg-white/80 backdrop-blur"
                    style={{ borderBottom: "1px solid #e8f0e4" }}
                >
                    <h1 className="text-sm font-semibold text-gray-700">
                        Bảng điều khiển quản trị
                    </h1>
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-800 text-white text-sm font-bold">
                        AD
                    </div>
                </header>
                <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
        </div>
    );
}
