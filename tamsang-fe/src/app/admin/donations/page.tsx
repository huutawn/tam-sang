"use client";

import { useEffect, useState } from "react";
import { AdminService } from "@/services/admin.service";
import { Heart, TrendingUp } from "lucide-react";

interface LiveDonation {
    id: string;
    donorFullName: string;
    campaignTitle: string;
    amount: number;
    createdAt: string;
}

function formatVND(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n);
}

function formatDate(d: string) {
    return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminDonationsPage() {
    const [donations, setDonations] = useState<LiveDonation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AdminService.getRecentDonations()
            .then((data) => setDonations(data as LiveDonation[]))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Thống kê quyên góp</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Các khoản quyên góp gần đây đã hoàn thành trên hệ thống
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div
                    className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm"
                    style={{ borderColor: "#e8f0e4" }}
                >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50">
                        <Heart className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Quyên góp gần đây</p>
                    </div>
                </div>
                <div
                    className="bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm"
                    style={{ borderColor: "#e8f0e4" }}
                >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{formatVND(totalAmount)} ₫</p>
                        <p className="text-xs text-gray-500 mt-0.5">Tổng tiền quyên góp gần đây</p>
                    </div>
                </div>
            </div>

            {/* Donations Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#e8f0e4" }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Người quyên góp</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Chiến dịch</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Số tiền (VND)</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#f0f4ec" }}>
                            {donations.map((d) => (
                                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-gray-900">{d.donorFullName}</td>
                                    <td className="px-5 py-3.5 text-gray-600 max-w-[260px] truncate">
                                        {d.campaignTitle}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-mono text-emerald-700 font-medium">
                                        {formatVND(d.amount)}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(d.createdAt)}</td>
                                </tr>
                            ))}
                            {donations.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-gray-400">
                                        Chưa có quyên góp nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
