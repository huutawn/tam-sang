"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { WithdrawalService, CreateWithdrawalRequest } from "@/services/withdrawal.service";
import {
    Loader2,
    Camera,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Clock,
    ArrowRight,
    ArrowLeft,
    SmilePlus,
    Zap,
} from "lucide-react";

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
    campaignTitle: string;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = [
    { step: 1, label: "Xác thực khuôn mặt" },
    { step: 2, label: "Thông tin rút tiền" },
    { step: 3, label: "Chờ xét duyệt" },
];

export function WithdrawalModal({
    isOpen,
    onClose,
    campaignId,
    campaignTitle,
}: WithdrawalModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    // Form state
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [isQuick, setIsQuick] = useState(false);

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup camera stream
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    // Start camera
    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 640, height: 480 },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsCameraActive(true);
        } catch {
            setCameraError("Không thể truy cập camera. Hãy cấp quyền cho trình duyệt.");
            setIsCameraActive(false);
        }
    }, []);

    // Capture selfie
    const captureSelfie = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Mirror horizontally for selfie
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelfieDataUrl(dataUrl);
        stopCamera();
    }, [stopCamera]);

    // Retake selfie
    const retakeSelfie = useCallback(() => {
        setSelfieDataUrl(null);
        startCamera();
    }, [startCamera]);

    // Submit withdrawal
    const handleSubmit = async () => {
        if (!selfieDataUrl) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const request: CreateWithdrawalRequest = {
                campaignId,
                amount: Number(amount),
                reason,
                quick: isQuick,
                selfieImageUrl: selfieDataUrl,
            };
            await WithdrawalService.createWithdrawal(request);
            setStep(3);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "Đã xảy ra lỗi khi tạo yêu cầu rút tiền.";
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cleanup on close
    const handleClose = () => {
        stopCamera();
        setSelfieDataUrl(null);
        setCameraError(null);
        setStep(1);
        setAmount("");
        setReason("");
        setIsQuick(false);
        setSubmitError(null);
        onClose();
    };

    // Stop camera when modal closes
    useEffect(() => {
        if (!isOpen) stopCamera();
    }, [isOpen, stopCamera]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                {/* Header */}
                <DialogHeader className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white text-left">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                            <SmilePlus className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                Yêu cầu rút tiền
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-sm mt-0.5">
                                {campaignTitle}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Stepper */}
                <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center justify-between">
                        {STEP_LABELS.map(({ step: s, label }, idx) => (
                            <div key={s} className="flex items-center flex-1">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                            : "bg-gray-100 text-gray-400"
                                            }`}
                                    >
                                        {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                                    </div>
                                    <span
                                        className={`text-xs font-medium hidden sm:inline ${step >= s ? "text-emerald-700" : "text-gray-400"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                </div>
                                {idx < STEP_LABELS.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mx-3 rounded transition-all ${step > s ? "bg-emerald-400" : "bg-gray-200"
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-3">
                    {/* Step 1: Camera Selfie */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <p className="text-sm text-muted-foreground text-center">
                                Để đảm bảo an toàn, vui lòng xác thực khuôn mặt của bạn
                            </p>

                            {/* Camera / Preview */}
                            <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden">
                                {!selfieDataUrl ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                        {!isCameraActive && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                                <Camera className="h-12 w-12 mb-2 opacity-50" />
                                                <span className="text-sm">Camera chưa được kích hoạt</span>
                                            </div>
                                        )}
                                        {/* Oval guide overlay */}
                                        {isCameraActive && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-48 h-60 border-2 border-white/50 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <img
                                        src={selfieDataUrl}
                                        alt="Selfie"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            <canvas ref={canvasRef} className="hidden" />

                            {cameraError && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {cameraError}
                                </div>
                            )}

                            {/* Instructions */}
                            {!selfieDataUrl && (
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                    <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> Hướng dẫn:
                                    </p>
                                    <ul className="text-xs text-amber-700 space-y-1 ml-6">
                                        <li>• Đặt khuôn mặt vào khung hình oval</li>
                                        <li>• Đảm bảo ảnh sáng đủ và không bị che khuất</li>
                                        <li>• Nhìn thẳng vào camera</li>
                                    </ul>
                                </div>
                            )}

                            {/* Buttons */}
                            {!selfieDataUrl ? (
                                <Button
                                    onClick={isCameraActive ? captureSelfie : startCamera}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg shadow-amber-200"
                                >
                                    <Camera className="h-5 w-5 mr-2" />
                                    {isCameraActive ? "Chụp ảnh" : "Bật camera"}
                                </Button>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={retakeSelfie}
                                        className="flex-1 h-12 rounded-xl border-gray-200"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Chụp lại
                                    </Button>
                                    <Button
                                        onClick={() => setStep(2)}
                                        className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                                    >
                                        Tiếp tục
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Withdrawal Form */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="w-amount" className="text-sm font-semibold">
                                    Số tiền rút (VNĐ) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="w-amount"
                                    type="number"
                                    placeholder="Ví dụ: 5000000"
                                    required
                                    min={10000}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-600 text-lg font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="w-reason" className="text-sm font-semibold">
                                    Lý do rút tiền <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="w-reason"
                                    placeholder="Mô tả chi tiết mục đích sử dụng số tiền..."
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="min-h-[100px] rounded-xl border-gray-200 focus-visible:ring-emerald-600 resize-none"
                                />
                            </div>

                            <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                                <div className="flex h-5 items-center mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={isQuick}
                                        onChange={(e) => setIsQuick(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                        <Zap className="h-4 w-4 text-amber-500" />
                                        Rút tiền khẩn cấp
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Chọn tùy chọn này nếu bạn cần xử lý yêu cầu ngay lập tức để ứng phó với tình huống khẩn cấp (chỉ áp dụng có giới hạn).
                                    </p>
                                </div>
                            </label>

                            {submitError && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {submitError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="h-12 rounded-xl px-6 border-gray-200"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Quay lại
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !amount || !reason}
                                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-200"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        "Gửi yêu cầu rút tiền"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success / Waiting */}
                    {step === 3 && (
                        <div className="text-center space-y-5 py-6 animate-in fade-in zoom-in duration-300">
                            <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                                <Clock className="h-10 w-10 text-emerald-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Yêu cầu đã được gửi!
                                </h3>
                                <p className="text-sm text-muted-foreground px-4">
                                    Hệ thống đang xác thực khuôn mặt và xét duyệt yêu cầu rút tiền của bạn.
                                    Bạn sẽ nhận được thông báo khi có kết quả.
                                </p>
                            </div>

                            <div className="bg-emerald-50 rounded-xl p-4 text-left space-y-2 mx-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Số tiền:</span>
                                    <span className="font-bold text-gray-900">
                                        {new Intl.NumberFormat("vi-VN").format(Number(amount))}₫
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <span className="text-amber-600 font-medium">Đang xét duyệt</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleClose}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                Đóng
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
