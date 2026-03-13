"use client";

import { useEffect, useState } from "react";
import { AdminService } from "@/services/admin.service";
import {
    Users,
    Megaphone,
    Wallet,
    FileCheck,
} from "lucide-react";

interface StatCard {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    bg: string;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<StatCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [users, withdrawalsRes, proofsRes] = await Promise.all([
                    AdminService.getAllUsers().catch(() => []),
                    AdminService.getWithdrawals(0, 1).catch(() => ({ result: { totalElements: 0 } })),
                    AdminService.getProofs(0, 1).catch(() => ({ result: { totalElements: 0 } })),
                ]);

                setStats([
                    {
                        label: "Tổng người dùng",
                        value: Array.isArray(users) ? users.length : 0,
                        icon: Users,
                        color: "text-blue-600",
                        bg: "bg-blue-50",
                    },
                    {
                        label: "Chiến dịch hoạt động",
                        value: "—",
                        icon: Megaphone,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                    },
                    {
                        label: "Yêu cầu rút tiền",
                        value: (withdrawalsRes as any)?.result?.totalElements ?? 0,
                        icon: Wallet,
                        color: "text-amber-600",
                        bg: "bg-amber-50",
                    },
                    {
                        label: "Bằng chứng cần duyệt",
                        value: (proofsRes as any)?.result?.totalElements ?? 0,
                        icon: FileCheck,
                        color: "text-purple-600",
                        bg: "bg-purple-50",
                    },
                ]);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Tổng quan hệ thống</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Theo dõi và quản lý nền tảng Tam Sang
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderColor: "#e8f0e4" }}
                    >
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bg}`}
                        >
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-xl border p-6 shadow-sm" style={{ borderColor: "#e8f0e4" }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Hướng dẫn nhanh</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sử dụng menu bên trái để điều hướng giữa các mục quản lý.
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Duyệt yêu cầu rút tiền trong mục &ldquo;Yêu cầu rút tiền&rdquo;.
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Kiểm tra bằng chứng chi tiêu trong mục &ldquo;Bằng chứng&rdquo;.
                    </li>
                </ul>
            </div>
        </div>
    );
}
