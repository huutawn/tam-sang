"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminService, AdminProof } from "@/services/admin.service";
import { Filter, ExternalLink, Image as ImageIcon } from "lucide-react";

const aiStatusColor: Record<string, string> = {
    PROCESSING: "bg-amber-50 text-amber-700",
    VERIFIED: "bg-green-50 text-green-700",
    REJECTED: "bg-red-50 text-red-700",
};

const aiStatusLabel: Record<string, string> = {
    PROCESSING: "AI đang xử lý",
    VERIFIED: "Đã xác minh",
    REJECTED: "Bị từ chối",
};

function formatDate(d: string) {
    return new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminProofsPage() {
    const [proofs, setProofs] = useState<AdminProof[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [filter, setFilter] = useState("");
    const [selectedProof, setSelectedProof] = useState<AdminProof | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleApprove = async (id: string) => {
        if (!confirm("Xác nhận duyệt bằng chứng này? Hệ thống sẽ ghi nhận chiến dịch đã hoàn thành giải ngân một phần.")) return;
        setActionLoading(true);
        try {
            await AdminService.approveProof(id);
            alert("Duyệt thành công");
            setSelectedProof(null);
            fetchData();
        } catch (error) {
            alert("Có lỗi xảy ra khi duyệt");
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Xác nhận từ chối bằng chứng này?")) return;
        setActionLoading(true);
        try {
            await AdminService.rejectProof(id);
            alert("Từ chối thành công");
            setSelectedProof(null);
            fetchData();
        } catch (error) {
            alert("Có lỗi xảy ra khi từ chối");
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await AdminService.getProofs(page, 10, filter || undefined);
            setProofs(res.result?.content || []);
            setTotalPages(res.result?.totalPages ?? 1);
        } catch {
            setProofs([]);
        } finally {
            setLoading(false);
        }
    }, [page, filter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quản lý bằng chứng</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Xem và duyệt bằng chứng chi tiêu từ các chiến dịch
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(0);
                        }}
                        className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        style={{ borderColor: "#e8f0e4" }}
                    >
                        <option value="">Tất cả</option>
                        <option value="PROCESSING">AI đang xử lý</option>
                        <option value="VERIFIED">Đã xác minh</option>
                        <option value="REJECTED">Bị từ chối</option>
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
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Withdrawal ID</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Ảnh hóa đơn</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Ảnh hiện trường</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">AI Status</th>
                                    <th className="text-right px-5 py-3 font-semibold text-gray-600">AI Score</th>
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Ngày tạo</th>
                                    <th className="text-center px-5 py-3 font-semibold text-gray-600">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: "#f0f4ec" }}>
                                {proofs.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                                            {p.id.substring(0, 8)}...
                                        </td>
                                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                                            {p.withdrawalRequestId.substring(0, 8)}...
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                {p.billImageUrls?.length ?? 0} ảnh
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            <span className="flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                {p.sceneImageUrls?.length ?? 0} ảnh
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${aiStatusColor[p.aiStatus] ?? "bg-gray-100 text-gray-500"
                                                    }`}
                                            >
                                                {aiStatusLabel[p.aiStatus] ?? p.aiStatus}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-mono">
                                            {p.aiScore != null ? `${p.aiScore}%` : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500 text-xs">
                                            {formatDate(p.createdAt)}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <button
                                                onClick={() => setSelectedProof(p)}
                                                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {proofs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-gray-400">
                                            Không có bằng chứng nào.
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

            {/* Detail Modal */}
            {selectedProof && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Chi tiết bằng chứng</h3>
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Proof ID:</span>
                                <p className="font-mono text-xs mt-0.5">{selectedProof.id}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Withdrawal ID:</span>
                                <p className="font-mono text-xs mt-0.5">{selectedProof.withdrawalRequestId}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">AI Status:</span>
                                <p className="mt-0.5">
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${aiStatusColor[selectedProof.aiStatus] ?? "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {aiStatusLabel[selectedProof.aiStatus] ?? selectedProof.aiStatus}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">AI Score:</span>
                                <p className="font-mono mt-0.5">
                                    {selectedProof.aiScore != null ? `${selectedProof.aiScore}%` : "—"}
                                </p>
                            </div>
                        </div>

                        {selectedProof.aiAnalysis && (
                            <div>
                                <span className="text-sm text-gray-500">Phân tích AI:</span>
                                <p className="text-sm bg-gray-50 rounded-lg p-3 mt-1 text-gray-700 whitespace-pre-wrap">
                                    {selectedProof.aiAnalysis}
                                </p>
                            </div>
                        )}

                        {selectedProof.description && (
                            <div>
                                <span className="text-sm text-gray-500">Mô tả:</span>
                                <p className="text-sm mt-1 text-gray-700">{selectedProof.description}</p>
                            </div>
                        )}

                        {/* Image galleries */}
                        {selectedProof.billImageUrls?.length > 0 && (
                            <div>
                                <span className="text-sm text-gray-500 mb-2 block">Ảnh hóa đơn:</span>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedProof.billImageUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={url}
                                                alt={`Bill ${i + 1}`}
                                                className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                                style={{ borderColor: "#e8f0e4" }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedProof.sceneImageUrls?.length > 0 && (
                            <div>
                                <span className="text-sm text-gray-500 mb-2 block">Ảnh hiện trường:</span>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedProof.sceneImageUrls.map((url, i) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={url}
                                                alt={`Scene ${i + 1}`}
                                                className="w-24 h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                                style={{ borderColor: "#e8f0e4" }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t mt-6" style={{ borderColor: "#e8f0e4" }}>
                            <button
                                onClick={() => handleReject(selectedProof.id)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Từ chối
                            </button>
                            <button
                                onClick={() => handleApprove(selectedProof.id)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? "Đang xử lý..." : "Duyệt bằng chứng"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
