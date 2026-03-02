"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DonationService } from "@/services/donation.service";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
    campaignTitle: string;
}

export function DonationModal({ isOpen, onClose, campaignId, campaignTitle }: DonationModalProps) {
    const [amount, setAmount] = useState<string>("");
    const [donorName, setDonorName] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await DonationService.initDonation({
                campaignId,
                amount: Number(amount),
                donorName,
                message: message || undefined,
            });
            setQrUrl(result);
        } catch (err: any) {
            setError(err.message || "Đã có lỗi xảy ra khi khởi tạo quyên góp.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setQrUrl(null);
        setAmount("");
        setDonorName("");
        setMessage("");
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                <DialogHeader className="bg-emerald-800 p-6 text-white text-left">
                    <DialogTitle className="text-2xl font-bold tracking-tight">Quyên Góp Ngay</DialogTitle>
                    <DialogDescription className="text-emerald-100/80 text-sm mt-1">
                        {campaignTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {!qrUrl ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-sm font-semibold text-foreground">
                                    Số tiền quyên góp (VNĐ)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="Ví dụ: 100000"
                                    required
                                    min={1000}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-12 rounded-xl border-emerald-100 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 transition-all text-lg font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="donorName" className="text-sm font-semibold text-foreground">
                                    Tên người gửi
                                </Label>
                                <Input
                                    id="donorName"
                                    placeholder="Nhập tên của bạn"
                                    required
                                    value={donorName}
                                    onChange={(e) => setDonorName(e.target.value)}
                                    className="h-12 rounded-xl border-emerald-100 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message" className="text-sm font-semibold text-foreground">
                                    Lời nhắn gửi (tùy chọn)
                                </Label>
                                <Textarea
                                    id="message"
                                    placeholder="Hãy gửi những lời chúc tốt đẹp nhất..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[100px] rounded-xl border-emerald-100 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 transition-all resize-none"
                                />
                                <div className="text-right text-xs text-muted-foreground">{message.length}/500</div>
                            </div>

                            {error && <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 text-lg font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-lg shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        "Tiếp Tục Quyên Góp"
                                    )}
                                </Button>
                            </div>

                            <div className="bg-emerald-50 rounded-2xl p-4 flex gap-4 items-start">
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-emerald-900">Quyên góp được bảo mật</h4>
                                    <ul className="text-xs text-emerald-700 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3" /> Giao dịch xác thực Blockchain
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3" /> 100% minh bạch dòng tiền
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-emerald-900">Quét mã QR để thanh toán</h3>
                                <p className="text-sm text-muted-foreground">
                                    Vui lòng sử dụng ứng dụng Ngân hàng để quét mã VietQR bên dưới.
                                </p>
                            </div>

                            <div className="relative mx-auto w-[280px] h-[280px] bg-white p-4 rounded-3xl shadow-xl border-2 border-emerald-50">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent -z-10" />
                                <Image
                                    src={qrUrl}
                                    alt="VietQR Code"
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-base font-bold text-emerald-800">
                                    Tổng cộng: {new Intl.NumberFormat("vi-VN").format(Number(amount))}₫
                                </p>
                                <p className="text-xs text-muted-foreground px-8">
                                    Sau khi thanh toán thành công, hệ thống sẽ tự động cập nhật trong giây lát.
                                </p>
                            </div>

                            <Button
                                onClick={handleClose}
                                variant="outline"
                                className="w-full h-12 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                                Đã Hoàn Tất Chuyển Khoản
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
