"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminService, AdminWithdrawal } from "@/services/admin.service";
import { CheckCircle, XCircle, Filter } from "lucide-react";

const statusColor: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    APPROVED: "bg-blue-50 text-blue-700",
    WAITING_PROOF: "bg-purple-50 text-purple-700",
    PROCESSING: "bg-indigo-50 text-indigo-700",
    COMPLETED: "bg-green-50 text-green-700",
    REJECTED: "bg-red-50 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
};

const statusLabel: Record<string, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    WAITING_PROOF: "Chờ bằng chứng",
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    REJECTED: "Từ chối",
    CANCELLED: "Đã hủy",
};

const faceStatusColor: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    VERIFIED: "bg-green-50 text-green-700",
    WARNING: "bg-amber-50 text-amber-700",
    FAILED: "bg-red-50 text-red-700",
};

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

export default function AdminWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [faceFilter, setFaceFilter] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await AdminService.getWithdrawals(page, 10, faceFilter || undefined);
            setWithdrawals(res.result?.content || []);
            setTotalPages(res.result?.totalPages ?? 1);
        } catch {
            setWithdrawals([]);
        } finally {
            setLoading(false);
        }
    }, [page, faceFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        try {
            await AdminService.approveWithdrawal(id);
            fetchData();
        } catch (e) {
            alert("Lỗi duyệt yêu cầu");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectId || !rejectReason.trim()) return;
        setActionLoading(rejectId);
        try {
            await AdminService.rejectWithdrawal(rejectId, rejectReason);
            setRejectId(null);
            setRejectReason("");
            fetchData();
        } catch {
            alert("Lỗi từ chối yêu cầu");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Yêu cầu rút tiền</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Duyệt hoặc từ chối yêu cầu rút tiền từ các chiến dịch
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={faceFilter}
                        onChange={(e) => {
                            setFaceFilter(e.target.value);
                            setPage(0);
                        }}
                        className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        style={{ borderColor: "#e8f0e4" }}
                    >
                        <option value="">Tất cả</option>
                        <option value="PENDING">Face: Pending</option>
                        <option value="VERIFIED">Face: Verified</option>
                        <option value="WARNING">Face: Warning</option>
                        <option value="FAILED">Face: Failed</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#e8f0e4" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">ID</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Số tiền</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Loại</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Khuôn mặt</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Trạng thái</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Ngày tạo</th>
                                    <th className="text-center px-5 py-3 font-semibold text-gray-600">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: "#f0f4ec" }}>
                                {withdrawals.map((w) => (
                                    <tr key={w.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                                            {w.id.substring(0, 8)}...
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono font-medium text-gray-900">
                                            {formatVND(w.amount)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.quick ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {w.quick ? "Nhanh" : "Tiêu chuẩn"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${faceStatusColor[w.faceVerificationStatus] ?? "bg-gray-100 text-gray-500"
                                                    }`}
                                            >
                                                {w.faceVerificationStatus}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[w.status] ?? "bg-gray-100 text-gray-500"
                                                    }`}
                                            >
                                                {statusLabel[w.status] ?? w.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                                            {formatDate(w.createdAt)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {w.status === "PENDING" ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleApprove(w.id)}
                                                        disabled={actionLoading === w.id}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectId(w.id)}
                                                        disabled={actionLoading === w.id}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Từ chối
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 block text-center">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {withdrawals.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">
                                            Không có yêu cầu rút tiền nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Từ chối yêu cầu rút tiền</h3>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do từ chối..."
                            className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            style={{ borderColor: "#e8f0e4" }}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setRejectId(null);
                                    setRejectReason("");
                                }}
                                className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
                                style={{ borderColor: "#e8f0e4" }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || actionLoading === rejectId}
                                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
