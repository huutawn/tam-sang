"use client";

import { useEffect, useState } from "react";
import { AdminService, AdminCampaign } from "@/services/admin.service";
import { Search } from "lucide-react";

const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700",
    COMPLETED: "bg-blue-50 text-blue-700",
    PAUSED: "bg-amber-50 text-amber-700",
    CANCELLED: "bg-red-50 text-red-700",
    PENDING_APPROVAL: "bg-yellow-50 text-yellow-700",
};

const statusLabel: Record<string, string> = {
    ACTIVE: "Hoạt động",
    COMPLETED: "Hoàn thành",
    PAUSED: "Tạm dừng",
    CANCELLED: "Đã hủy",
    PENDING_APPROVAL: "Chờ duyệt",
};

function formatVND(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n);
}

export default function AdminCampaignsPage() {
    const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchCampaigns = async (p: number) => {
        setLoading(true);
        try {
            const res = await AdminService.getAllCampaigns(p, 10);
            setCampaigns((res as any).data || (res as any).content || []);
            setTotalPages((res as any).totalPages ?? 1);
        } catch {
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns(page);
    }, [page]);

    const filtered = campaigns.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quản lý chiến dịch</h2>
                    <p className="text-sm text-gray-500 mt-1">Xem tất cả chiến dịch trên hệ thống</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        style={{ borderColor: "#e8f0e4" }}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#e8f0e4" }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Tên chiến dịch</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Mục tiêu (VND)</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Đã nhận (VND)</th>
                                <th className="text-right px-5 py-3 font-semibold text-gray-600">Đã dùng (VND)</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#f0f4ec" }}>
                            {filtered.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-gray-900 max-w-[260px] truncate">
                                        {c.title}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-gray-600 font-mono">
                                        {formatVND(c.targetAmount)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-emerald-700 font-mono font-medium">
                                        {formatVND(c.currentAmount)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-amber-700 font-mono">
                                        {formatVND(c.usedAmount ?? 0)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status] ?? "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {statusLabel[c.status] ?? c.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-400">
                                        Không có chiến dịch nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${page === i
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-gray-600 border hover:bg-gray-50"
                                }`}
                            style={page !== i ? { borderColor: "#e8f0e4" } : {}}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
