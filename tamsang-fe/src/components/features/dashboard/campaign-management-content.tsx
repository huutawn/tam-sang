"use client"

import { useState, useEffect } from "react"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import {
    FolderOpen,
    Activity,
    Clock,
    CheckCircle2,
    Plus,
    Search,
    Eye,
    Pencil,
    Trash2,
    Loader2,
    AlertCircle,
    AlertTriangle,
} from "lucide-react"
import { CampaignService, CampaignPageItem, PagedCampaignsResponse, CreateCampaignRequest } from "@/services/campaign.service"
import { KYCService, ValidKycResponse } from "@/services/kyc.service"
import { useAuthStore } from "@/store/auth-store"

type CampaignStatusType = "ACTIVE" | "PENDING" | "CLOSED" | "COMPLETED" | "REJECTED"

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "warning" | "destructive" | "purple" }> = {
    ACTIVE: { label: "Đang chạy", variant: "info" },
    PENDING: { label: "Chờ duyệt", variant: "warning" },
    CLOSED: { label: "Đã đóng", variant: "destructive" },
    COMPLETED: { label: "Hoàn thành", variant: "success" },
    REJECTED: { label: "Bị từ chối", variant: "destructive" },
}

export function CampaignManagementContent() {
    const [campaigns, setCampaigns] = useState<CampaignPageItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState("Tất cả")
    const [searchQuery, setSearchQuery] = useState("")
    const [pageData, setPageData] = useState<PagedCampaignsResponse | null>(null)

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [kycChecking, setKycChecking] = useState(false)
    const [kycError, setKycError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Form state
    const [formData, setFormData] = useState<CreateCampaignRequest>({
        title: "",
        content: "",
        targetAmount: 0,
        images: [],
    })

    const user = useAuthStore((s) => s.user)

    useEffect(() => {
        fetchCampaigns()
    }, [])

    const fetchCampaigns = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await CampaignService.getMyCampaigns(1, 50)
            setCampaigns(data.data || [])
            setPageData(data)
        } catch (err) {
            console.error("Failed to fetch campaigns:", err)
            setError("Không thể tải danh sách chiến dịch. Vui lòng thử lại.")
        } finally {
            setLoading(false)
        }
    }

    const handleOpenDialog = async () => {
        setDialogOpen(true)
        setKycError(null)
        setShowForm(false)
        setSubmitMessage(null)
        setFormData({ title: "", content: "", targetAmount: 0, images: [] })

        // Check KYC validity
        if (!user?.sub) {
            setKycError("Không thể xác định người dùng. Vui lòng đăng nhập lại.")
            return
        }

        try {
            setKycChecking(true)
            const kycResult: ValidKycResponse = await KYCService.checkKycValid(user.sub)
            if (kycResult.isValid) {
                setShowForm(true)
            } else {
                setKycError("Bạn cần upload CCCD và hoàn tất xác minh danh tính trước khi tạo chiến dịch. Vui lòng vào trang \"Thông tin cá nhân\" để thực hiện xác minh.")
            }
        } catch (err) {
            console.error("Failed to check KYC:", err)
            setKycError("Bạn cần upload CCCD và hoàn tất xác minh danh tính trước khi tạo chiến dịch. Vui lòng vào trang \"Thông tin cá nhân\" để thực hiện xác minh.")
        } finally {
            setKycChecking(false)
        }
    }

    const handleSubmitCampaign = async () => {
        if (!formData.title || !formData.targetAmount) {
            setSubmitMessage({ type: "error", text: "Vui lòng điền đầy đủ tiêu đề và số tiền mục tiêu." })
            return
        }

        try {
            setSubmitting(true)
            setSubmitMessage(null)
            await CampaignService.createCampaign(formData)
            setSubmitMessage({ type: "success", text: "Tạo chiến dịch thành công!" })
            // Refresh campaigns list
            await fetchCampaigns()
            // Close dialog after short delay
            setTimeout(() => {
                setDialogOpen(false)
            }, 1500)
        } catch (err) {
            console.error("Failed to create campaign:", err)
            setSubmitMessage({ type: "error", text: "Tạo chiến dịch thất bại. Vui lòng thử lại." })
        } finally {
            setSubmitting(false)
        }
    }

    // Compute stats from real data
    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length
    const pendingCampaigns = campaigns.filter((c) => c.status === "PENDING").length
    const completedCampaigns = campaigns.filter((c) => c.status === "COMPLETED" || c.status === "CLOSED").length

    const statsCards = [
        {
            label: "Tổng chiến dịch",
            value: totalCampaigns,
            icon: FolderOpen,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
        },
        {
            label: "Đang hoạt động",
            value: activeCampaigns,
            icon: Activity,
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
        },
        {
            label: "Chờ duyệt",
            value: pendingCampaigns,
            icon: Clock,
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
        },
        {
            label: "Hoàn thành",
            value: completedCampaigns,
            icon: CheckCircle2,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
        },
    ]

    // Build dynamic filter tabs
    const statusCounts = campaigns.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const filterTabs = [
        { label: "Tất cả", count: totalCampaigns },
        ...Object.entries(statusCounts).map(([status, count]) => ({
            label: statusConfig[status]?.label || status,
            count,
            status,
        })),
    ]

    const filteredCampaigns = campaigns.filter((c) => {
        const matchFilter = activeFilter === "Tất cả" ||
            statusConfig[c.status]?.label === activeFilter
        const matchSearch =
            !searchQuery ||
            c.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchFilter && matchSearch
    })

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("vi-VN").format(amount) + "₫"
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—"
        try {
            return new Date(dateStr).toLocaleDateString("vi-VN")
        } catch {
            return dateStr
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm text-gray-500">Đang tải chiến dịch...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-red-500">{error}</p>
                    <Button onClick={fetchCampaigns} variant="outline" size="sm">
                        Thử lại
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Quản lý chiến dịch
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Theo dõi và quản lý tất cả chiến dịch của bạn
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-5 rounded-lg shadow-sm"
                            onClick={handleOpenDialog}
                        >
                            <Plus className="w-4 h-4" />
                            Đăng ký chiến dịch
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                            <DialogTitle className="text-lg">Đăng ký chiến dịch mới</DialogTitle>
                        </DialogHeader>

                        {kycChecking ? (
                            <div className="flex flex-col items-center gap-3 py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                                <p className="text-sm text-gray-500">Đang kiểm tra xác minh danh tính...</p>
                            </div>
                        ) : kycError ? (
                            <div className="py-6 space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-800">Chưa xác minh danh tính</p>
                                        <p className="text-sm text-amber-700 mt-1">{kycError}</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Đóng</Button>
                                    </DialogClose>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => {
                                            setDialogOpen(false)
                                            window.location.href = "/dashboard/thong-tin-ca-nhan"
                                        }}
                                    >
                                        Đi tới xác minh
                                    </Button>
                                </DialogFooter>
                            </div>
                        ) : showForm ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Tiêu đề chiến dịch *</Label>
                                    <Input
                                        placeholder="VD: Nước sạch cho vùng cao"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Nội dung mô tả</Label>
                                    <Textarea
                                        placeholder="Mô tả chi tiết về chiến dịch..."
                                        value={formData.content || ""}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Số tiền mục tiêu (VNĐ) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="VD: 50000000"
                                        value={formData.targetAmount || ""}
                                        onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                                        className="h-10"
                                        min={1}
                                    />
                                </div>

                                {submitMessage && (
                                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${submitMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-red-50 text-red-700 border border-red-200"
                                        }`}>
                                        {submitMessage.type === "success" ? (
                                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                        )}
                                        {submitMessage.text}
                                    </div>
                                )}

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Hủy</Button>
                                    </DialogClose>
                                    <Button
                                        onClick={handleSubmitCampaign}
                                        disabled={submitting || !formData.title || !formData.targetAmount}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Đang tạo...
                                            </>
                                        ) : (
                                            "Tạo chiến dịch"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsCards.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-4 py-5">
                            <div
                                className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.iconBg}`}
                            >
                                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stat.value}
                                </p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.label}
                            onClick={() => setActiveFilter(tab.label)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${activeFilter === tab.label
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {tab.label}{" "}
                            <span
                                className={
                                    activeFilter === tab.label
                                        ? "text-emerald-100"
                                        : "text-gray-400"
                                }
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm chiến dịch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 w-64 text-sm"
                    />
                </div>
            </div>

            {/* Campaign table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Chiến dịch
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Tiến độ
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Quyên góp
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Ngày tạo
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <FolderOpen className="w-10 h-10 text-gray-300" />
                                            <p className="text-sm text-gray-400">
                                                {campaigns.length === 0
                                                    ? "Bạn chưa có chiến dịch nào. Hãy tạo chiến dịch đầu tiên!"
                                                    : "Không tìm thấy chiến dịch phù hợp."
                                                }
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((campaign) => {
                                    const progress = campaign.targetAmount > 0
                                        ? Math.round((campaign.currentAmount / campaign.targetAmount) * 100)
                                        : 0
                                    const config = statusConfig[campaign.status] || { label: campaign.status, variant: "info" as const }

                                    return (
                                        <tr
                                            key={campaign.id}
                                            className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors"
                                        >
                                            {/* Campaign name */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                                        {campaign.images && campaign.images.length > 0 ? (
                                                            <img
                                                                src={campaign.images[0]}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            "📋"
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate max-w-[200px]">
                                                            {campaign.title}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Progress */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${progress >= 100
                                                                ? "bg-emerald-500"
                                                                : progress > 50
                                                                    ? "bg-emerald-400"
                                                                    : progress > 0
                                                                        ? "bg-amber-400"
                                                                        : "bg-gray-300"
                                                                }`}
                                                            style={{
                                                                width: `${Math.min(100, progress)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        {progress}%
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Raised */}
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {formatAmount(campaign.currentAmount)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        / {formatAmount(campaign.targetAmount)}
                                                    </p>
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="py-3 px-4">
                                                <Badge variant={config.variant}>
                                                    {config.label}
                                                </Badge>
                                            </td>
                                            {/* Dates */}
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="text-xs text-gray-700">
                                                        {formatDate(campaign.startDate)}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        Kết thúc: {formatDate(campaign.endDate)}
                                                    </p>
                                                </div>
                                            </td>
                                            {/* Actions */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-end px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                    Hiển thị {filteredCampaigns.length} / {campaigns.length} chiến dịch
                </div>
            </Card>
        </div>
    )
}
