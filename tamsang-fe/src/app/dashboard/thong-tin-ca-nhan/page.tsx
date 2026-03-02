"use client"

import { useState, useEffect, useRef } from "react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    CheckCircle2,
    Circle,
    Shield,
    Upload,
    Save,
    Camera,
    BadgeCheck,
    Loader2,
    AlertCircle,
    CheckCircle,
} from "lucide-react"
import { UserService, UserWithKycResponse } from "@/services/user.service"
import { KYCService } from "@/services/kyc.service"

type KycDisplayStatus = "none" | "PENDING" | "PROCESSING" | "VERIFIED" | "APPROVED" | "COMPLETED" | "REJECTED"

const kycStatusConfig: Record<KycDisplayStatus, { label: string; color: string; bg: string }> = {
    none: { label: "Chưa xác minh", color: "text-gray-500", bg: "bg-gray-100" },
    PENDING: { label: "Đang chờ duyệt", color: "text-amber-600", bg: "bg-amber-100" },
    PROCESSING: { label: "Đang xử lý", color: "text-blue-600", bg: "bg-blue-100" },
    VERIFIED: { label: "Đã xác minh", color: "text-emerald-600", bg: "bg-emerald-100" },
    APPROVED: { label: "Đã xác minh", color: "text-emerald-600", bg: "bg-emerald-100" },
    COMPLETED: { label: "Đã xác minh", color: "text-emerald-600", bg: "bg-emerald-100" },
    REJECTED: { label: "Bị từ chối", color: "text-red-600", bg: "bg-red-100" },
}

export default function ThongTinCaNhanPage() {
    const [user, setUser] = useState<UserWithKycResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [bio, setBio] = useState("")

    // KYC upload state
    const [frontFile, setFrontFile] = useState<File | null>(null)
    const [backFile, setBackFile] = useState<File | null>(null)
    const [frontPreview, setFrontPreview] = useState<string | null>(null)
    const [backPreview, setBackPreview] = useState<string | null>(null)
    const [submittingKyc, setSubmittingKyc] = useState(false)
    const [kycMessage, setKycMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const frontInputRef = useRef<HTMLInputElement>(null)
    const backInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchUserProfile()
    }, [])

    const fetchUserProfile = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await UserService.getMyProfileWithKyc()
            setUser(data)
        } catch (err) {
            console.error("Failed to fetch user profile:", err)
            setError("Không thể tải thông tin người dùng. Vui lòng thử lại.")
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (side: "front" | "back", file: File) => {
        if (side === "front") {
            setFrontFile(file)
            setFrontPreview(URL.createObjectURL(file))
        } else {
            setBackFile(file)
            setBackPreview(URL.createObjectURL(file))
        }
    }

    const handleKycSubmit = async () => {
        if (!frontFile || !backFile) {
            setKycMessage({ type: "error", text: "Vui lòng tải lên cả mặt trước và mặt sau CCCD." })
            return
        }

        try {
            setSubmittingKyc(true)
            setKycMessage(null)
            await KYCService.submitKYC(frontFile, backFile)
            setKycMessage({ type: "success", text: "Gửi xác minh thành công! Hệ thống đang xử lý." })
            // Reload profile data to get updated KYC status
            await fetchUserProfile()
        } catch (err) {
            console.error("Failed to submit KYC:", err)
            setKycMessage({ type: "error", text: "Gửi xác minh thất bại. Vui lòng thử lại." })
        } finally {
            setSubmittingKyc(false)
        }
    }

    // Compute profile checklist based on real data
    const getProfileChecklist = () => {
        if (!user) return []
        return [
            { label: "Họ và tên", done: !!(user.firstName || user.lastName) },
            { label: "Email", done: !!user.email },
            { label: "Xác minh CCCD", done: user.KycStatus === "VERIFIED" || user.kycProfile?.status === "VERIFIED" || user.kycProfile?.status === "APPROVED" },
        ]
    }

    const profileChecklist = getProfileChecklist()
    const completedCount = profileChecklist.filter((i) => i.done).length
    const progressPercent = profileChecklist.length > 0
        ? Math.round((completedCount / profileChecklist.length) * 100)
        : 0

    const displayName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
        : ""
    const initials = user
        ? (user.firstName?.[0] || "").toUpperCase() + (user.lastName?.[0] || "").toUpperCase() || user.email?.[0]?.toUpperCase() || "?"
        : "?"

    const kycStatus: KycDisplayStatus = user?.kycProfile?.status as KycDisplayStatus
        || (user?.KycStatus as KycDisplayStatus)
        || "none"
    const kycConfig = kycStatusConfig[kycStatus] || kycStatusConfig.none

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <p className="text-sm text-gray-500">Đang tải thông tin...</p>
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
                    <Button onClick={fetchUserProfile} variant="outline" size="sm">
                        Thử lại
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Quản lý hồ sơ và xác minh danh tính của bạn
                </p>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Avatar & Progress */}
                <div className="space-y-6">
                    {/* Avatar card */}
                    <Card>
                        <CardContent className="flex flex-col items-center py-8">
                            <div className="relative group cursor-pointer mb-4">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {initials}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                                {kycStatus === "VERIFIED" && (
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                        <BadgeCheck className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mb-3 text-center">
                                Nhấn vào ảnh để thay đổi. JPG, PNG tối đa 5MB.
                            </p>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {displayName}
                            </h3>
                            <p className="text-sm text-gray-500">{user?.email}</p>
                            <div className={`flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full ${kycConfig.bg} text-xs ${kycConfig.color}`}>
                                <Shield className="w-3.5 h-3.5" />
                                <span>{kycConfig.label}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile completion */}
                    <Card>
                        <CardContent className="py-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700">
                                    Mức độ hoàn thiện hồ sơ
                                </h4>
                                <span className="text-sm font-bold text-emerald-600">
                                    {progressPercent}%
                                </span>
                            </div>
                            <Progress
                                value={progressPercent}
                                className="mb-5 h-2.5"
                            />
                            <ul className="space-y-2.5">
                                {profileChecklist.map((item) => (
                                    <li
                                        key={item.label}
                                        className="flex items-center gap-2.5 text-sm"
                                    >
                                        {item.done ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                                        )}
                                        <span
                                            className={
                                                item.done ? "text-gray-700" : "text-gray-400"
                                            }
                                        >
                                            {item.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column - Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic info form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <span className="text-lg">👤</span>
                                Thông tin cơ bản
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Họ
                                    </Label>
                                    <Input
                                        value={user?.firstName || ""}
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Tên
                                    </Label>
                                    <Input
                                        value={user?.lastName || ""}
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Email
                                    </Label>
                                    <Input
                                        value={user?.email || ""}
                                        type="email"
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                                {user?.kycProfile?.dob && (
                                    <div className="space-y-2">
                                        <Label className="text-gray-600 text-xs font-medium">
                                            Ngày sinh
                                        </Label>
                                        <Input
                                            value={user.kycProfile.dob}
                                            readOnly
                                            className="h-11 bg-gray-50"
                                        />
                                    </div>
                                )}
                            </div>
                            {user?.kycProfile?.address && (
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Địa chỉ
                                    </Label>
                                    <Input
                                        value={user.kycProfile.address}
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                            )}
                            {user?.kycProfile?.fullName && (
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Họ tên đầy đủ (từ CCCD)
                                    </Label>
                                    <Input
                                        value={user.kycProfile.fullName}
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                            )}
                            {user?.kycProfile?.idNumber && (
                                <div className="space-y-2">
                                    <Label className="text-gray-600 text-xs font-medium">
                                        Số CCCD
                                    </Label>
                                    <Input
                                        value={user.kycProfile.idNumber}
                                        readOnly
                                        className="h-11 bg-gray-50"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-gray-600 text-xs font-medium">
                                    Giới thiệu bản thân
                                </Label>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows={3}
                                    placeholder="Viết vài dòng giới thiệu về bạn..."
                                />
                                <div className="text-right text-xs text-gray-400">
                                    {bio.length}/500
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6 h-10 rounded-lg shadow-sm">
                                    <Save className="w-4 h-4" />
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Identity verification */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between w-full">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Shield className="w-5 h-5 text-gray-500" />
                                    Xác minh danh tính
                                </CardTitle>
                                <span className={`text-xs px-2.5 py-1 rounded-full ${kycConfig.bg} ${kycConfig.color}`}>
                                    {kycConfig.label}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Status message */}
                            {(kycStatus === "VERIFIED" || kycStatus === "COMPLETED" || kycStatus === "APPROVED") && (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800">Danh tính đã được xác minh</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">Bạn có thể tạo chiến dịch quyên góp.</p>
                                    </div>
                                </div>
                            )}

                            {(kycStatus === "PENDING" || kycStatus === "PROCESSING") && (
                                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                    <Loader2 className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Đang xử lý xác minh</p>
                                        <p className="text-xs text-amber-600 mt-0.5">Hệ thống đang xác minh thông tin CCCD của bạn. Vui lòng chờ.</p>
                                    </div>
                                </div>
                            )}

                            {kycStatus === "REJECTED" && user?.kycProfile?.rejectionReason && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800">Xác minh bị từ chối</p>
                                        <p className="text-xs text-red-600 mt-0.5">Lý do: {user.kycProfile.rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            {(kycStatus === "none" || kycStatus === "REJECTED") && (
                                <p className="text-sm text-gray-500">
                                    Tải lên CCCD để xác minh danh tính và tăng độ tin cậy cho chiến
                                    dịch của bạn.
                                </p>
                            )}

                            {/* Images Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Front CCCD */}
                                <div
                                    onClick={() => (kycStatus === "none" || kycStatus === "REJECTED") ? frontInputRef.current?.click() : undefined}
                                    className={`border-2 ${(kycStatus === "none" || kycStatus === "REJECTED") ? "border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer" : "border-solid border-gray-200 opacity-90 cursor-default"} rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors group overflow-hidden`}
                                >
                                    {(kycStatus === "none" || kycStatus === "REJECTED") && (
                                        <input
                                            type="file"
                                            ref={frontInputRef}
                                            accept="image/jpeg,image/png"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (f) handleFileSelect("front", f)
                                            }}
                                        />
                                    )}
                                    {(frontPreview || user?.kycProfile?.frontImageUrl) ? (
                                        <img src={frontPreview || user?.kycProfile?.frontImageUrl} alt="Mặt trước CCCD" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-700">Mặt trước CCCD</p>
                                                <p className="text-xs text-gray-400 mt-1">Kéo thả hoặc nhấn để tải lên</p>
                                                <p className="text-xs text-gray-300 mt-0.5">JPG, PNG — tối đa 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Back CCCD */}
                                <div
                                    onClick={() => (kycStatus === "none" || kycStatus === "REJECTED") ? backInputRef.current?.click() : undefined}
                                    className={`border-2 ${(kycStatus === "none" || kycStatus === "REJECTED") ? "border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer" : "border-solid border-gray-200 opacity-90 cursor-default"} rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors group overflow-hidden`}
                                >
                                    {(kycStatus === "none" || kycStatus === "REJECTED") && (
                                        <input
                                            type="file"
                                            ref={backInputRef}
                                            accept="image/jpeg,image/png"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (f) handleFileSelect("back", f)
                                            }}
                                        />
                                    )}
                                    {(backPreview || user?.kycProfile?.backImageUrl) ? (
                                        <img src={backPreview || user?.kycProfile?.backImageUrl} alt="Mặt sau CCCD" className="w-full h-32 object-cover rounded-lg" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-700">Mặt sau CCCD</p>
                                                <p className="text-xs text-gray-400 mt-1">Kéo thả hoặc nhấn để tải lên</p>
                                                <p className="text-xs text-gray-300 mt-0.5">JPG, PNG — tối đa 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {(kycStatus === "none" || kycStatus === "REJECTED") && (
                                <>
                                    {kycMessage && (
                                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${kycMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                            }`}>
                                            {kycMessage.type === "success" ? (
                                                <CheckCircle className="w-4 h-4 shrink-0" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                            )}
                                            {kycMessage.text}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleKycSubmit}
                                        disabled={submittingKyc || !frontFile || !backFile}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 rounded-lg shadow-sm text-sm font-medium disabled:opacity-50"
                                    >
                                        {submittingKyc ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Shield className="w-4 h-4 mr-2" />
                                        )}
                                        {submittingKyc ? "Đang gửi..." : "Gửi xác minh bằng AI"}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
