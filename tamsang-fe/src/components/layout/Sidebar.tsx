"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    User,
    FolderOpen,
    LogOut,
    Heart,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react"
import { useState } from "react"

const navItems = [
    {
        name: "Tổng quan",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Thông tin cá nhân",
        href: "/dashboard/thong-tin-ca-nhan",
        icon: User,
    },
    {
        name: "Quản lý chiến dịch",
        href: "/dashboard/quan-ly-chien-dich",
        icon: FolderOpen,
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={cn(
                "flex flex-col border-r transition-all duration-300 h-screen sticky top-0",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
            style={{
                backgroundColor: "#fafdf8",
                borderColor: "#e8f0e4",
            }}
        >
            {/* Logo */}
            <div
                className="flex items-center gap-3 px-5 py-5"
                style={{ borderBottom: "1px solid #e8f0e4" }}
            >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-700 shrink-0">
                    <Heart className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <span className="text-lg font-bold text-emerald-900 tracking-tight">
                        Tam Sang
                    </span>
                )}
            </div>

            {/* Collapse toggle */}
            <div className="flex justify-end px-3 py-2">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-md hover:bg-emerald-100 text-gray-500 transition-colors"
                    aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
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
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
                    )
                })}
            </nav>

            {/* User info */}
            <div className="px-3 py-4" style={{ borderTop: "1px solid #e8f0e4" }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold shrink-0">
                        NV
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                Nguyễn Văn A
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                nguyen.van.a@email.com
                            </p>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <button className="flex items-center gap-2 mt-3 text-sm text-gray-500 hover:text-red-600 transition-colors w-full">
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                    </button>
                )}
            </div>
        </aside>
    )
}
