"use client";

import { useState, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProofService } from "@/services/proof.service";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    ImagePlus,
    FileText,
    X,
    Clock,
    Upload,
} from "lucide-react";

interface ProofUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawalRequestId: string;
    campaignTitle: string;
}

type Step = 1 | 2;

const MAX_FILES = 10;
const MAX_SIZE_MB = 5;

function ImageDropZone({
    id,
    label,
    description,
    icon: Icon,
    accentColor,
    files,
    onAdd,
    onRemove,
}: {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    accentColor: string;
    files: File[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList) return;
            const valid = Array.from(fileList).filter((f) => {
                if (!f.type.startsWith("image/")) return false;
                if (f.size > MAX_SIZE_MB * 1024 * 1024) return false;
                return true;
            });
            const remaining = MAX_FILES - files.length;
            onAdd(valid.slice(0, remaining));
        },
        [files.length, onAdd]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-800">
                {label} <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">{description}</p>

            {/* Dropzone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[130px] ${isDragging
                        ? `border-${accentColor}-400 bg-${accentColor}-50`
                        : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
                    }`}
            >
                <div
                    className={`p-3 rounded-xl ${accentColor === "emerald" ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                >
                    <Icon
                        className={`h-6 w-6 ${accentColor === "emerald" ? "text-emerald-600" : "text-amber-600"
                            }`}
                    />
                </div>
                <span className="text-sm text-gray-500">Kéo thả ảnh vào đây hoặc</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`rounded-lg text-xs font-semibold ${accentColor === "emerald"
                            ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            : "border-amber-300 text-amber-700 hover:bg-amber-50"
                        }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        inputRef.current?.click();
                    }}
                >
                    Chọn ảnh từ máy
                </Button>
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        handleFiles(e.target.files);
                        e.target.value = "";
                    }}
                />
            </div>

            {/* Thumbnails */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, idx) => (
                        <div
                            key={`${file.name}-${idx}`}
                            className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm"
                        >
                            <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(idx);
                                }}
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                {files.length}/{MAX_FILES} ảnh · Tối đa {MAX_SIZE_MB}MB/ảnh
            </p>
        </div>
    );
}

export function ProofUploadModal({
    isOpen,
    onClose,
    withdrawalRequestId,
    campaignTitle,
}: ProofUploadModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [sceneImages, setSceneImages] = useState<File[]>([]);
    const [billImages, setBillImages] = useState<File[]>([]);
    const [description, setDescription] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (sceneImages.length === 0 && billImages.length === 0) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            await ProofService.uploadProof({
                withdrawalRequestId,
                billImages,
                sceneImages,
                description: description || undefined,
            });
            setStep(2);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "Đã xảy ra lỗi khi gửi bằng chứng.";
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSceneImages([]);
        setBillImages([]);
        setDescription("");
        setSubmitError(null);
        onClose();
    };

    const isValid = sceneImages.length > 0 || billImages.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <DialogHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white text-left sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                Cập nhật bằng chứng
                            </DialogTitle>
                            <DialogDescription className="text-white/80 text-sm mt-0.5">
                                {campaignTitle}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Stepper */}
                <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center">
                        {[
                            { s: 1, label: "Upload bằng chứng" },
                            { s: 2, label: "Chờ xác thực" },
                        ].map(({ s, label }, idx) => (
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
                                        className={`text-xs font-medium ${step >= s ? "text-emerald-700" : "text-gray-400"
                                            }`}
                                    >
                                        {label}
                                    </span>
                                </div>
                                {idx < 1 && (
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
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Scene Images */}
                            <ImageDropZone
                                id="scene-images"
                                label="Ảnh hiện trường"
                                description="Tải lên ảnh chụp tại hiện trường hoạt động từ thiện (tối đa 10 ảnh, mỗi ảnh < 5MB)"
                                icon={ImagePlus}
                                accentColor="emerald"
                                files={sceneImages}
                                onAdd={(newFiles) =>
                                    setSceneImages((prev) => [...prev, ...newFiles].slice(0, MAX_FILES))
                                }
                                onRemove={(idx) =>
                                    setSceneImages((prev) => prev.filter((_, i) => i !== idx))
                                }
                            />

                            <div className="border-t border-dashed border-gray-200" />

                            {/* Bill Images */}
                            <ImageDropZone
                                id="bill-images"
                                label="Ảnh hóa đơn / Chứng từ"
                                description="Tải lên hóa đơn, biên lai, chứng từ chứng minh nguồn tiền sử dụng (tối đa 10 ảnh, mỗi ảnh < 5MB)"
                                icon={FileText}
                                accentColor="amber"
                                files={billImages}
                                onAdd={(newFiles) =>
                                    setBillImages((prev) => [...prev, ...newFiles].slice(0, MAX_FILES))
                                }
                                onRemove={(idx) =>
                                    setBillImages((prev) => prev.filter((_, i) => i !== idx))
                                }
                            />

                            <div className="border-t border-dashed border-gray-200" />

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="proof-desc" className="text-sm font-semibold text-gray-800">
                                    Mô tả chi tiết <span className="text-red-500">*</span>
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Mô tả hoạt động đã thực hiện và danh sách các bằng chứng đính kèm (tối thiểu 100 ký tự)
                                </p>
                                <Textarea
                                    id="proof-desc"
                                    placeholder="Ví dụ: Ngày 15/01/2025, chúng tôi đã tổ chức phát quà cho 50 hộ gia đình khó khăn tại xã Tân Phú. Các hóa đơn mua sắm đính kèm..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[100px] rounded-xl border-gray-200 focus-visible:ring-emerald-600 resize-none"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {description.length} ký tự
                                </p>
                            </div>

                            {submitError && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {submitError}
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !isValid}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-200"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Đang tải lên...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5 mr-2" />
                                        Gửi bằng chứng
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Waiting for AI */}
                    {step === 2 && (
                        <div className="text-center space-y-5 py-6 animate-in fade-in zoom-in duration-300">
                            <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                                <Clock className="h-10 w-10 text-emerald-600 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Bằng chứng đã được gửi!
                                </h3>
                                <p className="text-sm text-muted-foreground px-4">
                                    Hệ thống AI đang phân tích và xác thực bằng chứng của bạn.
                                    Kết quả sẽ được cập nhật trong vài phút.
                                </p>
                            </div>

                            <div className="bg-emerald-50 rounded-xl p-4 text-left space-y-2 mx-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Ảnh hiện trường:</span>
                                    <span className="font-bold text-gray-900">{sceneImages.length} ảnh</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Ảnh hóa đơn:</span>
                                    <span className="font-bold text-gray-900">{billImages.length} ảnh</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Trạng thái:</span>
                                    <span className="text-amber-600 font-medium">AI đang xử lý</span>
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
