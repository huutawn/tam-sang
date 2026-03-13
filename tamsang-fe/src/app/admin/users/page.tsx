"use client";

import { useEffect, useState } from "react";
import { AdminService, AdminUser } from "@/services/admin.service";
import { Search } from "lucide-react";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        AdminService.getAllUsers()
            .then(setUsers)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = users.filter(
        (u) =>
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
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
                    <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
                    <p className="text-sm text-gray-500 mt-1">{users.length} người dùng</p>
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
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Họ tên</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Vai trò</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">KYC</th>
                                <th className="text-left px-5 py-3 font-semibold text-gray-600">Blacklist</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: "#f0f4ec" }}>
                            {filtered.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3.5 font-medium text-gray-900">{user.email}</td>
                                    <td className="px-5 py-3.5 text-gray-600">
                                        {user.firstName} {user.lastName}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex gap-1.5">
                                            {user.roles?.map((r) => (
                                                <span
                                                    key={r.name}
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.name === "ADMIN"
                                                            ? "bg-slate-100 text-slate-700"
                                                            : r.name === "ORGANIZER"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-blue-50 text-blue-700"
                                                        }`}
                                                >
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.KycStatus === "VERIFIED"
                                                    ? "bg-green-50 text-green-700"
                                                    : user.KycStatus === "PENDING"
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-gray-100 text-gray-500"
                                                }`}
                                        >
                                            {user.KycStatus || "N/A"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {user.isBlackList ? (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                Có
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Không</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-400">
                                        Không tìm thấy người dùng nào.
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
